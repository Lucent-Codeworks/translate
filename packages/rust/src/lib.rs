//! Client for [Lucent Translate](https://lucentcodeworks.com): fetch a project's
//! translations, look them up synchronously, and keep them fresh in the
//! background.
//!
//! ```no_run
//! use std::time::Duration;
//! use lucent_translate::Client;
//!
//! # async fn run() -> Result<(), lucent_translate::Error> {
//! let client = Client::builder("https://translate.example.com", "my-app", "lt_…")
//!     .fallback_locale("en")
//!     .build()?;
//!
//! client.load("de").await?; // also loads the fallback locale
//! assert_eq!(client.t("de", "home.title"), "Willkommen");
//! let greeting = client.t_with("de", "home.greeting", [("name", "Ada")]);
//!
//! // Re-check loaded locales every minute; stops when `_polling` is dropped.
//! let _polling = client.spawn_polling(Duration::from_secs(60));
//! # Ok(()) }
//! ```
//!
//! [`Client`] is cheap to clone: clones share one store, so a single client can
//! be handed to every request handler of a web server.

use std::collections::HashMap;
use std::fmt::Display;
use std::sync::{Arc, RwLock};
use std::time::Duration;

use reqwest::header::{AUTHORIZATION, ETAG, IF_NONE_MATCH};
use reqwest::{StatusCode, Url};
use tokio::sync::broadcast;
use tokio::task::JoinHandle;

/// A locale's translations: key → text.
pub type Messages = HashMap<String, String>;

/// Errors from loading translations. Lookups ([`Client::t`]) never fail.
#[derive(Debug, thiserror::Error)]
pub enum Error {
    /// The base URL couldn't be parsed.
    #[error("invalid base URL: {0}")]
    InvalidBaseUrl(String),
    /// Network or HTTP client failure.
    #[error("request failed: {0}")]
    Http(#[from] reqwest::Error),
    /// The API key is missing, wrong or revoked.
    #[error("the API key was rejected (401); check it hasn't been revoked")]
    Unauthorized,
    /// The project has no such locale.
    #[error("locale `{0}` not found in the project (404)")]
    LocaleNotFound(String),
    /// Any other unexpected status.
    #[error("unexpected response status {0}")]
    Status(u16),
    /// The response wasn't a JSON object.
    #[error("invalid response body: {0}")]
    InvalidBody(#[from] serde_json::Error),
}

type ErrorHook = Arc<dyn Fn(&Error) + Send + Sync>;

struct Entry {
    messages: Arc<Messages>,
    etag: Option<String>,
}

struct Inner {
    http: reqwest::Client,
    base_url: Url,
    project: String,
    api_key: String,
    fallback_locale: Option<String>,
    store: RwLock<HashMap<String, Entry>>,
    updates: broadcast::Sender<String>,
    on_error: Option<ErrorHook>,
}

/// Configures a [`Client`]. Created with [`Client::builder`].
pub struct ClientBuilder {
    base_url: String,
    project: String,
    api_key: String,
    fallback_locale: Option<String>,
    timeout: Duration,
    messages: HashMap<String, Messages>,
    http: Option<reqwest::Client>,
    on_error: Option<ErrorHook>,
}

impl ClientBuilder {
    /// Locale used for keys missing in the requested one, usually the
    /// project's base language. [`Client::load`] fetches it alongside.
    pub fn fallback_locale(mut self, locale: impl Into<String>) -> Self {
        self.fallback_locale = Some(locale.into());
        self
    }

    /// Request timeout (default 10s). Ignored when [`http_client`](Self::http_client) is set.
    pub fn timeout(mut self, timeout: Duration) -> Self {
        self.timeout = timeout;
        self
    }

    /// Starts with messages for a locale, e.g. bundled with `include_str!`,
    /// so lookups work before (or without) the first fetch.
    pub fn messages(mut self, locale: impl Into<String>, messages: Messages) -> Self {
        self.messages.insert(locale.into(), messages);
        self
    }

    /// Use your own `reqwest::Client` (proxies, custom TLS, ...).
    pub fn http_client(mut self, client: reqwest::Client) -> Self {
        self.http = Some(client);
        self
    }

    /// Called for errors that background polling swallows, e.g. to log them.
    pub fn on_error(mut self, hook: impl Fn(&Error) + Send + Sync + 'static) -> Self {
        self.on_error = Some(Arc::new(hook));
        self
    }

    pub fn build(self) -> Result<Client, Error> {
        let base_url = Url::parse(&self.base_url)
            .ok()
            .filter(|url| !url.cannot_be_a_base())
            .ok_or_else(|| Error::InvalidBaseUrl(self.base_url.clone()))?;
        let http = match self.http {
            Some(http) => http,
            None => reqwest::Client::builder().timeout(self.timeout).build()?,
        };
        let store = self
            .messages
            .into_iter()
            .map(|(locale, messages)| (locale, Entry { messages: Arc::new(messages), etag: None }))
            .collect();

        Ok(Client {
            inner: Arc::new(Inner {
                http,
                base_url,
                project: self.project,
                api_key: self.api_key,
                fallback_locale: self.fallback_locale,
                store: RwLock::new(store),
                updates: broadcast::channel(64).0,
                on_error: self.on_error,
            }),
        })
    }
}

/// Fetches and holds a project's translations. Cheap to clone; clones share state.
#[derive(Clone)]
pub struct Client {
    inner: Arc<Inner>,
}

impl Client {
    /// Starts configuring a client for `project` on the instance at `base_url`.
    pub fn builder(
        base_url: impl Into<String>,
        project: impl Into<String>,
        api_key: impl Into<String>,
    ) -> ClientBuilder {
        ClientBuilder {
            base_url: base_url.into(),
            project: project.into(),
            api_key: api_key.into(),
            fallback_locale: None,
            timeout: Duration::from_secs(10),
            messages: HashMap::new(),
            http: None,
            on_error: None,
        }
    }

    /// Fetches (or revalidates, via ETag) a locale, plus the fallback locale
    /// the first time. Returns the locale's messages. On error, anything
    /// already held for the locale is kept.
    pub async fn load(&self, locale: &str) -> Result<Arc<Messages>, Error> {
        let fallback = self
            .inner
            .fallback_locale
            .as_deref()
            .filter(|fallback| *fallback != locale && !self.has(fallback));
        match fallback {
            Some(fallback) => {
                let (messages, fallback_result) = tokio::join!(self.fetch(locale), self.fetch(fallback));
                fallback_result?;
                messages
            }
            None => self.fetch(locale).await,
        }
    }

    /// Whether messages for `locale` are held (loaded or seeded).
    pub fn has(&self, locale: &str) -> bool {
        self.read().contains_key(locale)
    }

    /// Looks up `key` in `locale`, then in the fallback locale, then returns
    /// the key itself. Only uses messages already loaded.
    pub fn t(&self, locale: &str, key: &str) -> String {
        let store = self.read();
        store
            .get(locale)
            .and_then(|entry| entry.messages.get(key))
            .or_else(|| {
                let fallback = self.inner.fallback_locale.as_deref()?;
                store.get(fallback)?.messages.get(key)
            })
            .cloned()
            .unwrap_or_else(|| key.to_owned())
    }

    /// Like [`t`](Self::t), replacing `{name}` placeholders with `params`.
    /// Placeholders without a matching param are left as they are.
    pub fn t_with<I, K, V>(&self, locale: &str, key: &str, params: I) -> String
    where
        I: IntoIterator<Item = (K, V)>,
        K: AsRef<str>,
        V: Display,
    {
        let params: Vec<(K, String)> = params.into_iter().map(|(k, v)| (k, v.to_string())).collect();
        interpolate(&self.t(locale, key), |name| {
            params.iter().find(|(k, _)| k.as_ref() == name).map(|(_, v)| v.as_str())
        })
    }

    /// A handle bound to one locale, convenient for templates.
    pub fn translator(&self, locale: impl Into<String>) -> Translator {
        Translator { client: self.clone(), locale: locale.into() }
    }

    /// Copies of all held messages by locale, e.g. to cache on disk and seed
    /// a later [`ClientBuilder::messages`].
    pub fn snapshot(&self) -> HashMap<String, Messages> {
        self.read()
            .iter()
            .map(|(locale, entry)| (locale.clone(), (*entry.messages).clone()))
            .collect()
    }

    /// Receives the locale code whenever a locale's messages change.
    pub fn subscribe(&self) -> broadcast::Receiver<String> {
        self.inner.updates.subscribe()
    }

    /// Re-fetches every held locale every `interval` in a background Tokio
    /// task. Errors go to [`ClientBuilder::on_error`] and the previous
    /// messages are kept. Polling stops when the returned handle is dropped.
    ///
    /// # Panics
    /// Outside a Tokio runtime.
    pub fn spawn_polling(&self, interval: Duration) -> PollingHandle {
        let client = self.clone();
        let task = tokio::spawn(async move {
            let mut ticker = tokio::time::interval(interval);
            ticker.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
            ticker.tick().await; // the first tick completes immediately
            loop {
                ticker.tick().await;
                let locales: Vec<String> = client.read().keys().cloned().collect();
                for locale in locales {
                    if let Err(err) = client.fetch(&locale).await {
                        client.report(&err);
                    }
                }
            }
        });
        PollingHandle { task }
    }

    async fn fetch(&self, locale: &str) -> Result<Arc<Messages>, Error> {
        let mut url = self.inner.base_url.clone();
        url.path_segments_mut()
            .expect("base URL validated in build()")
            .pop_if_empty()
            .extend(["api", "v1", "projects", &self.inner.project, "locales", locale]);

        let etag = self.read().get(locale).and_then(|entry| entry.etag.clone());
        let mut request = self
            .inner
            .http
            .get(url)
            .header(AUTHORIZATION, format!("Bearer {}", self.inner.api_key));
        if let Some(etag) = etag {
            request = request.header(IF_NONE_MATCH, etag);
        }
        let response = request.send().await?;

        match response.status() {
            StatusCode::NOT_MODIFIED => {
                if let Some(entry) = self.read().get(locale) {
                    return Ok(entry.messages.clone());
                }
                Err(Error::Status(304))
            }
            StatusCode::OK => {
                let etag = response
                    .headers()
                    .get(ETAG)
                    .and_then(|value| value.to_str().ok())
                    .map(str::to_owned);
                let body = response.bytes().await?;
                let raw: HashMap<String, serde_json::Value> = serde_json::from_slice(&body)?;
                let messages: Messages = raw
                    .into_iter()
                    .filter_map(|(key, value)| match value {
                        serde_json::Value::String(text) => Some((key, text)),
                        _ => None,
                    })
                    .collect();
                let messages = Arc::new(messages);

                let changed = {
                    let mut store = self.write();
                    let changed = store.get(locale).is_none_or(|old| *old.messages != *messages);
                    store.insert(locale.to_owned(), Entry { messages: messages.clone(), etag });
                    changed
                };
                if changed {
                    // Err only means nobody is subscribed.
                    let _ = self.inner.updates.send(locale.to_owned());
                }
                Ok(messages)
            }
            StatusCode::UNAUTHORIZED => Err(Error::Unauthorized),
            StatusCode::NOT_FOUND => Err(Error::LocaleNotFound(locale.to_owned())),
            status => Err(Error::Status(status.as_u16())),
        }
    }

    fn report(&self, err: &Error) {
        if let Some(hook) = &self.inner.on_error {
            hook(err);
        }
    }

    fn read(&self) -> std::sync::RwLockReadGuard<'_, HashMap<String, Entry>> {
        // A poisoned lock only means a panic elsewhere mid-write; the map is still usable.
        self.inner.store.read().unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    fn write(&self) -> std::sync::RwLockWriteGuard<'_, HashMap<String, Entry>> {
        self.inner.store.write().unwrap_or_else(|poisoned| poisoned.into_inner())
    }
}

/// Translations for one locale. Created with [`Client::translator`].
#[derive(Clone)]
pub struct Translator {
    client: Client,
    locale: String,
}

impl Translator {
    pub fn locale(&self) -> &str {
        &self.locale
    }

    pub fn t(&self, key: &str) -> String {
        self.client.t(&self.locale, key)
    }

    pub fn t_with<I, K, V>(&self, key: &str, params: I) -> String
    where
        I: IntoIterator<Item = (K, V)>,
        K: AsRef<str>,
        V: Display,
    {
        self.client.t_with(&self.locale, key, params)
    }
}

/// Keeps background polling alive; polling stops when this is dropped.
#[must_use = "polling stops as soon as the handle is dropped"]
pub struct PollingHandle {
    task: JoinHandle<()>,
}

impl PollingHandle {
    /// Stops polling (same as dropping the handle).
    pub fn stop(self) {}
}

impl Drop for PollingHandle {
    fn drop(&mut self) {
        self.task.abort();
    }
}

/// Replaces `{name}` placeholders (name = letters, digits, `_`) using `lookup`.
fn interpolate<'a>(template: &str, lookup: impl Fn(&str) -> Option<&'a str>) -> String {
    let mut out = String::with_capacity(template.len());
    let mut rest = template;
    while let Some(start) = rest.find('{') {
        out.push_str(&rest[..start]);
        let after = &rest[start + 1..];
        let name_len = after
            .find(|c: char| !(c.is_alphanumeric() || c == '_'))
            .unwrap_or(after.len());
        let name = &after[..name_len];
        match (after[name_len..].starts_with('}'), name.is_empty()) {
            (true, false) => {
                match lookup(name) {
                    Some(value) => out.push_str(value),
                    None => {
                        out.push('{');
                        out.push_str(name);
                        out.push('}');
                    }
                }
                rest = &after[name_len + 1..];
            }
            _ => {
                out.push('{');
                rest = after;
            }
        }
    }
    out.push_str(rest);
    out
}

#[cfg(test)]
mod tests {
    use super::interpolate;

    #[test]
    fn interpolates_placeholders() {
        let lookup = |name: &str| match name {
            "name" => Some("Ada"),
            "n" => Some("3"),
            _ => None,
        };
        assert_eq!(interpolate("Hallo {name}!", lookup), "Hallo Ada!");
        assert_eq!(interpolate("{n} of {n}", lookup), "3 of 3");
        assert_eq!(interpolate("{missing} {name}", lookup), "{missing} Ada");
        assert_eq!(interpolate("{ {} {na me} {name", lookup), "{ {} {na me} {name");
        assert_eq!(interpolate("Grüße {name} 👋", lookup), "Grüße Ada 👋");
        assert_eq!(interpolate("", lookup), "");
    }
}
