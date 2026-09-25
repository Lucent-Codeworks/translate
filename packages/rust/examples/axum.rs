//! A small axum server rendering translated HTML that updates live.
//!
//! ```bash
//! TRANSLATE_URL=http://localhost:3000 TRANSLATE_PROJECT=demo-app TRANSLATE_KEY=lt_... \
//!     cargo run --example axum
//! ```
//! Then open http://localhost:8090/?lang=de

use std::collections::HashMap;
use std::time::Duration;

use axum::extract::{Query, State};
use axum::response::Html;
use axum::routing::get;
use lucent_translate::Client;

const LANGUAGES: [&str; 3] = ["en", "de", "fr"];

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let env = |name: &str| std::env::var(name).map_err(|_| format!("{name} is not set"));
    let client = Client::builder(env("TRANSLATE_URL")?, env("TRANSLATE_PROJECT")?, env("TRANSLATE_KEY")?)
        .fallback_locale("en")
        .on_error(|err| eprintln!("[lucent-translate] {err}"))
        .build()?;

    for lang in LANGUAGES {
        client.load(lang).await?;
    }
    // One background task keeps every handler's view of the translations fresh.
    let _polling = client.spawn_polling(Duration::from_secs(10));

    let app = axum::Router::new().route("/", get(page)).with_state(client);
    let port = std::env::var("PORT").unwrap_or_else(|_| "8090".into());
    let listener = tokio::net::TcpListener::bind(format!("127.0.0.1:{port}")).await?;
    println!("listening on http://{}", listener.local_addr()?);
    axum::serve(listener, app).await?;
    Ok(())
}

async fn page(State(client): State<Client>, Query(query): Query<HashMap<String, String>>) -> Html<String> {
    let lang = query
        .get("lang")
        .map(String::as_str)
        .filter(|l| LANGUAGES.contains(l))
        .unwrap_or("en");
    let t = client.translator(lang);
    let links: String = LANGUAGES
        .iter()
        .map(|code| format!(r#"<a href="?lang={code}">{code}</a> "#))
        .collect();

    Html(format!(
        r#"<!doctype html>
<html lang="{lang}">
<head><meta charset="utf-8"><title>{title}</title></head>
<body>
  <h1>{title}</h1>
  <p>{subtitle}</p>
  <nav>{links}</nav>
</body>
</html>"#,
        title = escape(&t.t("home.title")),
        subtitle = escape(&t.t_with("home.subtitle", [("name", "Ada")])),
    ))
}

fn escape(text: &str) -> String {
    text.replace('&', "&amp;").replace('<', "&lt;").replace('>', "&gt;").replace('"', "&quot;")
}
