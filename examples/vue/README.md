# Vue example

A Vite + Vue 3 app using `@lucent-translate/vue`. Translations update live and
the chosen language is remembered in `localStorage`.

```bash
cp .env.example .env   # fill in your instance URL, project slug and API key
pnpm --filter @lucent-translate/sdk --filter @lucent-translate/vue build
pnpm --filter example-vue dev
```

See `src/main.ts` (plugin setup) and `src/App.vue` (`useTranslate`).

## Typed keys

`translation-keys.d.ts` was generated from the demo project with
`pnpm keys` (needs `LUCENT_TRANSLATE_URL`, `LUCENT_TRANSLATE_PROJECT` and
`LUCENT_TRANSLATE_API_KEY`). Regenerate it for your own project; misspelled
keys then fail `pnpm typecheck`.
