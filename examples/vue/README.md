# Vue example

A Vite + Vue 3 app using `@lucent-translate/vue`. Translations update live and
the chosen language is remembered in `localStorage`.

```bash
cp .env.example .env   # fill in your instance URL, project slug and API key
pnpm --filter @lucent-translate/sdk --filter @lucent-translate/vue build
pnpm --filter example-vue dev
```

See `src/main.ts` (plugin setup) and `src/App.vue` (`useTranslate`).
