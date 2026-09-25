# @lucent-translate/sdk

Fetches translations from a Lucent Translate instance and keeps them up to date.

```ts
import { createTranslateClient } from "@lucent-translate/sdk";

const i18n = createTranslateClient({
  baseUrl: "https://translate.example.com",
  project: "my-app",          // project slug
  apiKey: "lt_…",             // Project → API keys
  pollInterval: 60_000,       // optional, 0 disables polling
});

await i18n.load("de");
i18n.t("de", "checkout.pay_button");                 // "Jetzt bezahlen"
i18n.t("de", "greeting", { name: "Ada" });           // "Hallo {name}" → "Hallo Ada"

i18n.subscribe((locale, messages) => rerender());    // fires when translations change
i18n.start();                                        // poll loaded locales for updates
```

Missing keys fall back to the key itself. Update checks send the last `ETag`, so
when nothing has changed the server answers `304 Not Modified` with no body.

## HTTP API

`GET /api/v1/projects/{slug}/locales/{locale}` with `Authorization: Bearer <key>`
returns `{ "key": "value", … }`. Responses: `200`, `304`, `401` (missing, invalid
or revoked key), `404` (locale not in project). CORS is enabled for all origins.
