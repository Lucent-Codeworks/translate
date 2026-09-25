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

## Typed keys

Run [`lucent-translate generate`](../cli) to generate your project's keys.
`t()` then only accepts existing keys and requires exactly the params each
text uses, in this package and every framework binding.

## Unknown keys

In development builds, `t()` warns once when asked for a key that no loaded
locale has, with the closest match: `Unknown key "home.titel" … Did you mean
"home.title"?`. Production builds stay silent. Customize or disable it with
`onMissingKey: (info) => …` or `onMissingKey: false`.

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

Framework bindings: [`@lucent-translate/svelte`](../svelte), [`@lucent-translate/react`](../react), [`@lucent-translate/vue`](../vue), [`@lucent-translate/nuxt`](../nuxt).

## HTTP API

`GET /api/v1/projects/{slug}/locales/{locale}` with `Authorization: Bearer <key>`
returns `{ "key": "value", … }`. Responses: `200`, `304`, `401` (missing, invalid
or revoked key), `404` (locale not in project). CORS is enabled for all origins.
