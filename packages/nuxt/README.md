# @lucent-translate/nuxt

Nuxt module for Lucent Translate: server-rendered translations, live updates
in the browser, and the visitor's language remembered in a cookie.

```bash
pnpm add @lucent-translate/nuxt
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  modules: ["@lucent-translate/nuxt"],
  lucentTranslate: {
    baseUrl: "https://translate.example.com",
    project: "my-app",
    apiKey: "lt_…",
    defaultLocale: "en",
    fallbackLocale: "en",
  },
});
```

```vue
<script setup lang="ts">
const { t, locale, loading, setLocale } = useTranslate();
useHead({ title: () => t("home.title"), htmlAttrs: { lang: locale } });
</script>

<template>
  <h1>{{ t("home.title") }}</h1>
  <p>{{ t("home.greeting", { name: "Ada" }) }}</p>
  <button :disabled="loading" @click="setLocale('de')">Deutsch</button>
</template>
```

## How it works

- On the server, the plugin loads the visitor's locale (from the cookie, else
  `defaultLocale`) before rendering and puts the messages in the payload, so
  hydration needs no fetch. Each request gets its own client.
- In the browser, it refreshes the locale after mount and polls for updates.
- `setLocale(locale)` loads the locale first, then switches and saves it in
  the cookie, so the next page load renders it server-side. The latest call
  wins if several overlap.
- If the cookie names a locale the project no longer has, the page renders
  `defaultLocale` instead.

## Options

| Option | Default | |
| --- | --- | --- |
| `baseUrl` | (required) | Your Lucent Translate instance |
| `project` | (required) | Project slug |
| `apiKey` | (required) | Project API key (read-only) |
| `defaultLocale` | `"en"` | Locale when the visitor hasn't chosen one |
| `fallbackLocale` | none | Locale used for missing translations |
| `pollInterval` | `60000` | Browser polling interval in ms, `0` disables |
| `cookie` | `"lt_locale"` | Cookie name, or `false` to not remember the locale |

Options live in public runtime config, so each can be set at runtime with
`NUXT_PUBLIC_LUCENT_TRANSLATE_*` env vars (e.g. `NUXT_PUBLIC_LUCENT_TRANSLATE_API_KEY`)
without rebuilding.

See [`examples/nuxt`](../../examples/nuxt) for a complete app.
