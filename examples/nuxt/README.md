# Nuxt example

Uses the `@lucent-translate/nuxt` module: translations render server-side,
update live in the browser, and the chosen language is remembered in a cookie.

```bash
cp .env.example .env   # fill in your instance URL, project slug and API key
pnpm --filter @lucent-translate/sdk --filter @lucent-translate/nuxt build
pnpm --filter example-nuxt dev
```

Everything lives in `nuxt.config.ts` and `app/pages/index.vue`.
