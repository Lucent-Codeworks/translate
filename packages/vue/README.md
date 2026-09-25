# @lucent-translate/vue

Vue 3 bindings for Lucent Translate: reactive translations that update live.
Using Nuxt? Use [`@lucent-translate/nuxt`](../nuxt), which builds on this
package and adds server-side rendering.

```bash
pnpm add @lucent-translate/vue
```

```ts
// main.ts
import { createTranslate } from "@lucent-translate/vue";

const translate = createTranslate({
  baseUrl: "https://translate.example.com",
  project: "my-app",
  apiKey: "lt_…",
  locale: localStorage.getItem("lang") ?? "en",
  fallbackLocale: "en",
  onLocaleChange: (locale) => localStorage.setItem("lang", locale),
});

createApp(App).use(translate).mount("#app");
```

```vue
<script setup lang="ts">
import { useTranslate } from "@lucent-translate/vue";

const { t, locale, loading, setLocale } = useTranslate();
</script>

<template>
  <h1>{{ t("home.title") }}</h1>
  <p>{{ t("home.greeting", { name: "Ada" }) }}</p>
  <button :disabled="loading" @click="setLocale('de')">Deutsch</button>
</template>
```

## Typed keys and typo warnings

Run [`lucent-translate generate`](../cli) to type `t()` from your project's
keys: unknown keys and missing params become compile errors. In development,
unknown keys also log a warning with the closest match (see the core
[SDK README](../sdk#unknown-keys)).

## API

- `createTranslate(options)`: takes every `@lucent-translate/sdk` option
  plus `locale` and an optional `onLocaleChange`. Returns a Vue plugin that
  is also the translation state, so `translate.t(...)` works outside
  components (router guards, stores). In the browser, installing it loads the
  locale and polls for updates until the app unmounts.
- `useTranslate()` returns `{ t, locale, loading, setLocale, client }`.
  - `t(key, params?)`: reactive lookup in the current locale, then
    `fallbackLocale`, then the key itself.
  - `locale`, `loading`: readonly refs.
  - `setLocale(locale)`: loads the locale if needed, then switches. The latest
    call wins if several overlap.
- `createTranslateState(client, localeRef, onLocaleChange?)`: the underlying
  reactive state, for custom integrations.

Pass `messages` (e.g. bundled JSON) to render translated text before the
first fetch.

See [`examples/vue`](../../examples/vue) for a complete app.
