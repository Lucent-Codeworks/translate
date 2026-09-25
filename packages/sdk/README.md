# @lucent-translate/sdk

Fetches translations from a Lucent Translate instance and keeps them up to date.

```ts
import { createTranslateClient } from "@lucent-translate/sdk";

const i18n = createTranslateClient({
  baseUrl: "https://translate.example.com",
  project: "my-app",          // project slug
  apiKey: "lt_…",             // Project → API keys
  fallbackLocale: "en",       // optional, used for missing translations
  pollInterval: 60_000,       // optional, 0 disables polling
});

await i18n.load("de");                               // also loads "en", the fallback
i18n.t("de", "checkout.pay_button");                 // "Jetzt bezahlen"
i18n.t("de", "greeting", { name: "Ada" });           // "Hallo {name}" → "Hallo Ada"
i18n.t("de", "new.feature");                         // not translated yet → English text

i18n.subscribe((locale, messages) => rerender());    // fires when translations change
i18n.start();                                        // poll loaded locales for updates
```

A missing translation falls back to `fallbackLocale` (usually the project's base
language), then to the key itself. Update checks send the last `ETag`, so
when nothing has changed the server answers `304 Not Modified` with no body.

## Server-side rendering

Load on the server, then seed the browser client so the first render needs no
fetch:

```ts
// server
await client.load("de");
const messages = client.snapshot(); // { de: {...}, en: {...} }

// browser
const i18n = createTranslateClient({ ...options, messages });
```

Framework bindings: [`@lucent-translate/svelte`](../svelte), [`@lucent-translate/react`](../react).

## HTTP API

`GET /api/v1/projects/{slug}/locales/{locale}` with `Authorization: Bearer <key>`
returns `{ "key": "value", … }`. Responses: `200`, `304`, `401` (missing, invalid
or revoked key), `404` (locale not in project). CORS is enabled for all origins.
