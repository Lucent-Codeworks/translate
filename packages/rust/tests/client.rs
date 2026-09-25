use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use lucent_translate::{Client, Error};
use serde_json::json;
use wiremock::matchers::{header, header_exists, method, path};
use wiremock::{Mock, MockServer, ResponseTemplate};

const KEY: &str = "lt_test";

fn locale_path(locale: &str) -> String {
    format!("/api/v1/projects/demo/locales/{locale}")
}

/// Serves `body` for a locale with an ETag, answering 304 when revalidated with it.
async fn serve(server: &MockServer, locale: &str, body: serde_json::Value) {
    let etag = format!("\"{}\"", body.to_string().len());
    Mock::given(method("GET"))
        .and(path(locale_path(locale)))
        .and(header("if-none-match", etag.as_str()))
        .respond_with(ResponseTemplate::new(304).insert_header("etag", etag.as_str()))
        .with_priority(1)
        .mount(server)
        .await;
    Mock::given(method("GET"))
        .and(path(locale_path(locale)))
        .and(header("authorization", format!("Bearer {KEY}").as_str()))
        .respond_with(ResponseTemplate::new(200).set_body_json(body).insert_header("etag", etag.as_str()))
        .with_priority(2)
        .mount(server)
        .await;
}

fn client(server: &MockServer) -> Client {
    Client::builder(server.uri(), "demo", KEY).fallback_locale("en").build().unwrap()
}

async fn requests_for(server: &MockServer, locale: &str) -> usize {
    let wanted = locale_path(locale);
    server
        .received_requests()
        .await
        .unwrap()
        .iter()
        .filter(|r| r.url.path() == wanted)
        .count()
}

#[tokio::test]
async fn loads_and_translates_with_fallback() {
    let server = MockServer::start().await;
    serve(&server, "de", json!({ "home.title": "Willkommen", "count": 3 })).await;
    serve(&server, "en", json!({ "home.title": "Welcome", "home.greeting": "Hello {name}, {missing}" })).await;
    let client = client(&server);

    let de = client.load("de").await.unwrap();
    assert_eq!(de.get("home.title").map(String::as_str), Some("Willkommen"));
    assert!(!de.contains_key("count"), "non-string values are ignored");
    assert!(client.has("en"), "fallback is loaded alongside");

    assert_eq!(client.t("de", "home.title"), "Willkommen");
    assert_eq!(client.t_with("de", "home.greeting", [("name", "Ada")]), "Hello Ada, {missing}");
    assert_eq!(client.t("de", "nope"), "nope");
    assert_eq!(client.t("fr", "home.title"), "Welcome", "unloaded locales use the fallback");

    let t = client.translator("de");
    assert_eq!(t.locale(), "de");
    assert_eq!(t.t_with("home.greeting", [("name", 42)]), "Hello 42, {missing}");

    // The fallback isn't fetched again for later locales.
    serve(&server, "fr", json!({})).await;
    client.load("fr").await.unwrap();
    assert_eq!(requests_for(&server, "en").await, 1);
}

#[tokio::test]
async fn revalidates_with_etag_and_notifies_only_on_change() {
    let server = MockServer::start().await;
    serve(&server, "de", json!({ "title": "Willkommen" })).await;
    let client = Client::builder(server.uri(), "demo", KEY).build().unwrap();
    let mut updates = client.subscribe();

    client.load("de").await.unwrap();
    assert_eq!(updates.try_recv().unwrap(), "de");

    client.load("de").await.unwrap(); // 304
    let last = server.received_requests().await.unwrap().pop().unwrap();
    assert!(last.headers.contains_key("if-none-match"));
    assert!(updates.try_recv().is_err(), "unchanged messages don't notify");
    assert_eq!(client.t("de", "title"), "Willkommen");

    server.reset().await;
    serve(&server, "de", json!({ "title": "Hallo" })).await;
    client.load("de").await.unwrap();
    assert_eq!(updates.try_recv().unwrap(), "de");
    assert_eq!(client.t("de", "title"), "Hallo");
}

#[tokio::test]
async fn reports_errors_and_keeps_previous_messages() {
    let server = MockServer::start().await;
    serve(&server, "de", json!({ "title": "Willkommen" })).await;
    let client = Client::builder(server.uri(), "demo", KEY).build().unwrap();
    client.load("de").await.unwrap();

    assert!(matches!(client.load("xx").await, Err(Error::LocaleNotFound(l)) if l == "xx"));

    server.reset().await;
    Mock::given(header_exists("authorization"))
        .respond_with(ResponseTemplate::new(500))
        .mount(&server)
        .await;
    assert!(matches!(client.load("de").await, Err(Error::Status(500))));
    assert_eq!(client.t("de", "title"), "Willkommen", "failed refresh keeps old messages");

    let wrong_key = Client::builder(server.uri(), "demo", "lt_wrong").build().unwrap();
    server.reset().await;
    Mock::given(header("authorization", "Bearer lt_wrong"))
        .respond_with(ResponseTemplate::new(401))
        .mount(&server)
        .await;
    assert!(matches!(wrong_key.load("de").await, Err(Error::Unauthorized)));
}

#[tokio::test]
async fn polling_picks_up_changes_and_stops_on_drop() {
    let server = MockServer::start().await;
    serve(&server, "de", json!({ "title": "Willkommen" })).await;
    let errors = Arc::new(Mutex::new(Vec::<String>::new()));
    let seen = errors.clone();
    let client = Client::builder(server.uri(), "demo", KEY)
        .on_error(move |e| seen.lock().unwrap().push(e.to_string()))
        .build()
        .unwrap();
    client.load("de").await.unwrap();
    let mut updates = client.subscribe();

    let polling = client.spawn_polling(Duration::from_millis(30));
    server.reset().await;
    serve(&server, "de", json!({ "title": "Hallo" })).await;
    let changed = tokio::time::timeout(Duration::from_secs(2), updates.recv()).await;
    assert_eq!(changed.unwrap().unwrap(), "de");
    assert_eq!(client.t("de", "title"), "Hallo");

    // Errors during polling go to the hook; messages survive.
    server.reset().await;
    Mock::given(header_exists("authorization"))
        .respond_with(ResponseTemplate::new(503))
        .mount(&server)
        .await;
    tokio::time::sleep(Duration::from_millis(100)).await;
    assert!(errors.lock().unwrap().iter().any(|e| e.contains("503")));
    assert_eq!(client.t("de", "title"), "Hallo");

    drop(polling);
    tokio::time::sleep(Duration::from_millis(20)).await;
    let before = server.received_requests().await.unwrap().len();
    tokio::time::sleep(Duration::from_millis(120)).await;
    assert_eq!(server.received_requests().await.unwrap().len(), before, "no requests after drop");
}

#[tokio::test]
async fn seeds_messages_and_snapshots() {
    let seeded: HashMap<String, String> = [("title".to_owned(), "Willkommen".to_owned())].into();
    let client = Client::builder("https://translate.invalid", "demo", KEY)
        .messages("de", seeded.clone())
        .build()
        .unwrap();

    assert!(client.has("de"));
    assert_eq!(client.t("de", "title"), "Willkommen");
    assert_eq!(client.snapshot(), HashMap::from([("de".to_owned(), seeded)]));
}

#[tokio::test]
async fn supports_base_urls_with_a_path_prefix() {
    let server = MockServer::start().await;
    Mock::given(path("/translate/api/v1/projects/demo/locales/de"))
        .respond_with(ResponseTemplate::new(200).set_body_json(json!({ "title": "Willkommen" })))
        .mount(&server)
        .await;
    let client = Client::builder(format!("{}/translate/", server.uri()), "demo", KEY).build().unwrap();
    client.load("de").await.unwrap();
    assert_eq!(client.t("de", "title"), "Willkommen");
}

#[test]
fn rejects_invalid_base_urls() {
    for url in ["not a url", "mailto:someone@example.com"] {
        assert!(matches!(Client::builder(url, "demo", KEY).build(), Err(Error::InvalidBaseUrl(_))), "{url}");
    }
}
