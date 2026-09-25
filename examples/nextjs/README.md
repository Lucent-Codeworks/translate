# Next.js example

App Router example: translations load on the server (for SSR and metadata)
and update live in the browser.

```bash
cp .env.example .env   # fill in your instance URL, project slug and API key
pnpm --filter @lucent-translate/sdk --filter @lucent-translate/react build
pnpm --filter example-nextjs dev
```

- `i18n.ts`: config and a per-request cached `getTranslations()`.
- `app/[lang]/layout.tsx`: loads messages, sets the page title, and wraps the
  app in `<TranslateProvider>`.
- `components/home.tsx`: a client component using `useTranslate()`.

## Typed keys

`translation-keys.d.ts` was generated from the demo project with
`pnpm keys` (needs `LUCENT_TRANSLATE_URL`, `LUCENT_TRANSLATE_PROJECT` and
`LUCENT_TRANSLATE_API_KEY`). Regenerate it for your own project; misspelled
keys then fail `pnpm typecheck`.
