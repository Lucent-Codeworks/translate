# lucent-translate

Rust client for Lucent Translate. Load a project's translations once, look
them up synchronously anywhere, and keep them fresh with background polling.

```toml
[dependencies]
lucent-translate = "0.1"
```

```rust
use std::time::Duration;
use lucent_translate::Client;

let client = Client::builder("https://translate.example.com", "my-app", "lt_…")
    .fallback_locale("en")
    .on_error(|err| eprintln!("translations: {err}"))
    .build()?;

client.load("de").await?;                 // also loads the fallback locale

client.t("de", "home.title");             // "Willkommen"
client.t_with("de", "home.greeting", [("name", "Ada")]);   // "Hallo Ada"
let t = client.translator("de");          // bound to a locale
t.t("checkout.pay");

// Re-check held locales every minute (ETag, so cheap when unchanged).
let _polling = client.spawn_polling(Duration::from_secs(60));
```

## How it behaves

- `Client` is cheap to clone and clones share one store, so a single client
  can go into your web framework's state and serve every request.
- `load()` is async and fetches or revalidates a locale. `t()` and `t_with()`
  are synchronous lookups over what has been loaded: requested locale, then
  the fallback locale, then the key itself. They never fail.
- `spawn_polling()` runs a Tokio task that refreshes every held locale. Errors
  go to `on_error` and the previous messages are kept, so an outage never
  empties your translations. Polling stops when the handle is dropped.
- `subscribe()` returns a `tokio::sync::broadcast` receiver that yields a
  locale code whenever its messages change.
- `builder.messages(locale, map)` seeds messages (e.g. bundled with
  `include_str!` as a fallback for cold starts); `snapshot()` exports them.

## Features

| Feature | Default | |
| --- | --- | --- |
| `rustls` | yes | HTTPS via rustls |
| `native-tls` | no | HTTPS via the platform TLS library |

Use `http_client(reqwest::Client)` to supply your own configured client.

## Example

[`examples/axum.rs`](examples/axum.rs) serves translated HTML that updates live:

```bash
TRANSLATE_URL=http://localhost:3000 TRANSLATE_PROJECT=demo-app TRANSLATE_KEY=lt_… \
    cargo run --example axum
```
