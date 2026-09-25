# @lucent-translate/svelte

Svelte 5 bindings for Lucent Translate: reactive translations that update
live, with SvelteKit server-side rendering.

```bash
pnpm add @lucent-translate/svelte
```

## SvelteKit

Load translations on the server so the first render is already translated:

```ts
// src/routes/+layout.server.ts
import { createTranslateClient } from "@lucent-translate/svelte";

const config = {
  baseUrl: "https://translate.example.com",
  project: "my-app",
  apiKey: "lt_…",
  fallbackLocale: "en",
};

export const load = async ({ fetch }) => {
  const client = createTranslateClient({ ...config, fetch, pollInterval: 0 });
  await client.load("de");
  return { locale: "de", messages: client.snapshot() };
};
```

Provide a translator in the root layout, seeded with those messages:

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import { setTranslator } from "@lucent-translate/svelte";

  let { data, children } = $props();
  setTranslator({ ...config, locale: data.locale, messages: data.messages });
</script>

{@render children()}
```

Use it anywhere below:

```svelte
<script lang="ts">
  import { getTranslator } from "@lucent-translate/svelte";

  const i18n = getTranslator();
</script>

<h1>{i18n.t("home.title")}</h1>
<p>{i18n.t("home.greeting", { name: "Ada" })}</p>

<button disabled={i18n.loading} onclick={() => i18n.setLocale("fr")}>Français</button>
```

## Typed keys and typo warnings

Run [`lucent-translate generate`](../cli) to type `t()` from your project's
keys: unknown keys and missing params become compile errors. In development,
unknown keys also log a warning with the closest match (see the core
[SDK README](../sdk#unknown-keys)).

## API

- `setTranslator(options)`: creates a `Translator`, provides it to child
  components, and in the browser refreshes the current locale and polls for
  updates until the component is destroyed. Takes every option of
  `@lucent-translate/sdk` plus `locale`.
- `getTranslator()`: the nearest provided `Translator`.
- `translator.t(key, params?)`: reactive lookup in the current locale.
  Missing keys use `fallbackLocale`, then the key itself.
- `translator.setLocale(locale)`: loads the locale if needed, then switches.
  The UI keeps the old locale until the new one has arrived.
- `translator.locale`, `translator.loading`: reactive state.
- `translator.client`: the underlying core client.

Use a **server** load (`+layout.server.ts`). A universal `+layout.ts` also
works, but SvelteKit then requires allowing the `etag` header through
`filterSerializedResponseHeaders` in `hooks.server.ts`.

See [`examples/sveltekit`](../../examples/sveltekit) for a complete app.
