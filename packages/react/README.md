# @lucent-translate/react

React bindings for Lucent Translate, with first-class Next.js App Router
support: server-side loading for SSR and metadata, and live updates in the
browser.

```bash
pnpm add @lucent-translate/react
```

## Next.js (App Router)

Load translations on the server, once per request:

```ts
// i18n.ts
import { loadTranslations } from "@lucent-translate/react/server";
import { cache } from "react";

export const config = {
  baseUrl: "https://translate.example.com",
  project: "my-app",
  apiKey: "lt_…",
  fallbackLocale: "en",
};

export const getTranslations = cache((locale: string) => loadTranslations({ ...config, locale }));
```

Seed the provider in your layout, and use the server `t()` for metadata:

```tsx
// app/[lang]/layout.tsx
import { TranslateProvider } from "@lucent-translate/react";

export async function generateMetadata({ params }) {
  const { t } = await getTranslations((await params).lang);
  return { title: t("home.title") };
}

export default async function Layout({ children, params }) {
  const { lang } = await params;
  const { messages } = await getTranslations(lang);
  return (
    <html lang={lang}>
      <body>
        <TranslateProvider {...config} locale={lang} messages={messages}>
          {children}
        </TranslateProvider>
      </body>
    </html>
  );
}
```

Use the hook in client components:

```tsx
"use client";
import { useTranslate } from "@lucent-translate/react";

export function Greeting() {
  const { t } = useTranslate();
  return <h1>{t("home.greeting", { name: "Ada" })}</h1>;
}
```

Text rendered with the server `t()` is fixed at request time. Text from
`useTranslate()` updates live when translations change.

## Plain React

```tsx
<TranslateProvider baseUrl="…" project="my-app" apiKey="lt_…" locale="de" fallbackLocale="en">
  <App />
</TranslateProvider>
```

Without `messages`, `t()` returns keys until the first fetch completes. Render a
loading state until `client.has(locale)` if that matters.

## API

- `<TranslateProvider locale … />`: takes every `@lucent-translate/sdk` option
  plus `locale`. Options are read once on mount; changing `locale` switches
  once the new locale has loaded. Polls for updates while mounted.
- `useTranslate()` returns `{ t, locale, loading, setLocale, client }`.
  - `t(key, params?)`: lookup in the current locale, then `fallbackLocale`,
    then the key itself.
  - `setLocale(locale)`: loads if needed, then switches. The latest call wins
    if several overlap.
- `loadTranslations({ ...options, locale })` (from `/server`) returns
  `{ locale, messages, t }`.

See [`examples/nextjs`](../../examples/nextjs) for a complete app.
