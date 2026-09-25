# SvelteKit example

Renders translations from a Lucent Translate project, server-side on first
load and live-updating in the browser.

```bash
cp .env.example .env   # fill in your instance URL, project slug and API key
pnpm --filter @lucent-translate/sdk --filter @lucent-translate/svelte build
pnpm --filter example-sveltekit dev
```

The interesting parts are `src/routes/+layout.server.ts` (server-side load and
`snapshot()`) and `src/routes/+layout.svelte` (`setTranslator`).

Load translations in a **server** load (`+layout.server.ts`). A universal
`+layout.ts` works too, but SvelteKit then requires allowing the `etag` header
via `filterSerializedResponseHeaders` in `hooks.server.ts`.
