/** Shown in place of a real API key; secrets are only displayed once, on creation. */
export const REDACTED_KEY = "lt_••••••••••••";

export interface GuideContext {
  /** Public URL of this instance. */
  origin: string;
  project: string;
  baseLocale: string;
  /** A locale to use in examples (a target locale when the project has one). */
  exampleLocale: string;
  /** An existing key without placeholders. */
  sampleKey: string;
  /** An existing key with placeholders, if the project has one. */
  paramSample?: { key: string; params: string[] };
}

export interface CodeBlock {
  title: string;
  language: "bash" | "ts" | "tsx" | "svelte" | "vue" | "php" | "rust" | "toml" | "env" | "json";
  code: string;
}

export interface SdkGuide {
  id: string;
  label: string;
  /** Package users install, shown under the tab label. */
  pkg: string;
  intro: string;
  blocks: CodeBlock[];
}

const q = JSON.stringify;

export function sdkGuides(ctx: GuideContext): SdkGuide[] {
  const { origin, project, baseLocale, exampleLocale, sampleKey, paramSample } = ctx;
  const key = REDACTED_KEY;

  /** JS object literal for the sample params, e.g. `{ name: "…" }`. */
  const jsParams = paramSample
    ? `{ ${paramSample.params.map((p) => `${/^[A-Za-z_$][\w$]*$/.test(p) ? p : q(p)}: "…"`).join(", ")} }`
    : "";
  const jsParamCall = (fn: string, prefix = "") =>
    paramSample ? `\n${prefix}${fn}(${q(paramSample.key)}, ${jsParams})` : "";

  const jsConfig = (indent: string) =>
    [
      `baseUrl: ${q(origin)},`,
      `project: ${q(project)},`,
      `apiKey: ${q(key)},`,
      `fallbackLocale: ${q(baseLocale)},`,
    ]
      .map((line) => indent + line)
      .join("\n");

  return [
    {
      id: "js",
      label: "JavaScript",
      pkg: "@lucent-translate/sdk",
      intro:
        "The framework-agnostic client. Works in browsers, Node, Deno, Bun and workers; the framework packages build on it.",
      blocks: [
        { title: "Install", language: "bash", code: "npm install @lucent-translate/sdk" },
        {
          title: "Load and translate",
          language: "ts",
          code: `import { createTranslateClient } from "@lucent-translate/sdk";

const i18n = createTranslateClient({
${jsConfig("  ")}
});

await i18n.load(${q(exampleLocale)}); // also loads the fallback locale
i18n.start(); // poll for live updates

i18n.t(${q(exampleLocale)}, ${q(sampleKey)});${paramSample ? `\ni18n.t(${q(exampleLocale)}, ${q(paramSample.key)}, ${jsParams});` : ""}`,
        },
      ],
    },
    {
      id: "react",
      label: "React / Next.js",
      pkg: "@lucent-translate/react",
      intro:
        "Loads translations on the server for SSR and metadata, then updates live in the browser. Shown for the Next.js App Router; in plain React, render <TranslateProvider> around your app.",
      blocks: [
        { title: "Install", language: "bash", code: "npm install @lucent-translate/react @lucent-translate/sdk" },
        {
          title: "i18n.ts",
          language: "ts",
          code: `import { loadTranslations } from "@lucent-translate/react/server";
import { cache } from "react";

export const translateConfig = {
${jsConfig("  ")}
};

// One fetch per request, shared by layouts, pages and generateMetadata.
export const getTranslations = cache((locale: string) =>
  loadTranslations({ ...translateConfig, locale }),
);`,
        },
        {
          title: "app/[lang]/layout.tsx",
          language: "tsx",
          code: `import { TranslateProvider } from "@lucent-translate/react";
import { getTranslations, translateConfig } from "@/i18n";

export default async function Layout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  const { messages } = await getTranslations(lang);

  return (
    <html lang={lang}>
      <body>
        <TranslateProvider {...translateConfig} locale={lang} messages={messages}>
          {children}
        </TranslateProvider>
      </body>
    </html>
  );
}`,
        },
        {
          title: "Any client component",
          language: "tsx",
          code: `"use client";

import { useTranslate } from "@lucent-translate/react";

export function Heading() {
  const { t } = useTranslate();
  return <h1>{t(${q(sampleKey)})}</h1>;
}`,
        },
      ],
    },
    {
      id: "svelte",
      label: "Svelte / SvelteKit",
      pkg: "@lucent-translate/svelte",
      intro: "Svelte 5 runes. Translations load in a server load for SSR, then update live in the browser.",
      blocks: [
        { title: "Install", language: "bash", code: "npm install @lucent-translate/svelte" },
        {
          title: "src/lib/i18n.ts",
          language: "ts",
          code: `export const translateConfig = {
${jsConfig("  ")}
};`,
        },
        {
          title: "src/routes/+layout.server.ts",
          language: "ts",
          code: `import { createTranslateClient } from "@lucent-translate/svelte";
import { translateConfig } from "$lib/i18n";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async ({ fetch }) => {
  const client = createTranslateClient({ ...translateConfig, fetch, pollInterval: 0 });
  await client.load(${q(exampleLocale)});
  return { locale: ${q(exampleLocale)}, messages: client.snapshot() };
};`,
        },
        {
          title: "src/routes/+layout.svelte",
          language: "svelte",
          code: `<script lang="ts">
  import { setTranslator } from "@lucent-translate/svelte";
  import { translateConfig } from "$lib/i18n";

  let { data, children } = $props();
  // Seeds the translator once; it keeps itself up to date after that.
  // svelte-ignore state_referenced_locally
  setTranslator({ ...translateConfig, locale: data.locale, messages: data.messages });
</script>

{@render children()}`,
        },
        {
          title: "Any component",
          language: "svelte",
          code: `<script lang="ts">
  import { getTranslator } from "@lucent-translate/svelte";

  const i18n = getTranslator();
</script>

<h1>{i18n.t(${q(sampleKey)})}</h1>${paramSample ? `\n<p>{i18n.t(${q(paramSample.key)}, ${jsParams})}</p>` : ""}`,
        },
      ],
    },
    {
      id: "vue",
      label: "Vue",
      pkg: "@lucent-translate/vue",
      intro: "A Vue 3 plugin and composable. For Nuxt, use the Nuxt module instead.",
      blocks: [
        { title: "Install", language: "bash", code: "npm install @lucent-translate/vue" },
        {
          title: "main.ts",
          language: "ts",
          code: `import { createTranslate } from "@lucent-translate/vue";
import { createApp } from "vue";
import App from "./App.vue";

const translate = createTranslate({
${jsConfig("  ")}
  locale: localStorage.getItem("lang") ?? ${q(baseLocale)},
  onLocaleChange: (locale) => localStorage.setItem("lang", locale),
});

createApp(App).use(translate).mount("#app");`,
        },
        {
          title: "Any component",
          language: "vue",
          code: `<script setup lang="ts">
import { useTranslate } from "@lucent-translate/vue";

const { t, setLocale } = useTranslate();
</script>

<template>
  <h1>{{ t(${q(sampleKey)}) }}</h1>${paramSample ? `\n  <p>{{ t(${q(paramSample.key)}, ${jsParams}) }}</p>` : ""}
  <button @click="setLocale('${exampleLocale}')">${exampleLocale}</button>
</template>`,
        },
      ],
    },
    {
      id: "nuxt",
      label: "Nuxt",
      pkg: "@lucent-translate/nuxt",
      intro:
        "A Nuxt module: server-rendered translations, live updates, and the visitor's language remembered in a cookie.",
      blocks: [
        { title: "Install", language: "bash", code: "npm install @lucent-translate/nuxt" },
        {
          title: "nuxt.config.ts",
          language: "ts",
          code: `export default defineNuxtConfig({
  modules: ["@lucent-translate/nuxt"],
  lucentTranslate: {
${jsConfig("    ")}
    defaultLocale: ${q(baseLocale)},
  },
});`,
        },
        {
          title: "Or set it at runtime (.env)",
          language: "env",
          code: `NUXT_PUBLIC_LUCENT_TRANSLATE_BASE_URL=${origin}
NUXT_PUBLIC_LUCENT_TRANSLATE_PROJECT=${project}
NUXT_PUBLIC_LUCENT_TRANSLATE_API_KEY=${key}`,
        },
        {
          title: "Any page or component",
          language: "vue",
          code: `<script setup lang="ts">
const { t, setLocale } = useTranslate(); // auto-imported
</script>

<template>
  <h1>{{ t(${q(sampleKey)}) }}</h1>
  <button @click="setLocale('${exampleLocale}')">${exampleLocale}</button>
</template>`,
        },
      ],
    },
    {
      id: "php",
      label: "PHP",
      pkg: "lucent-codeworks/translate",
      intro:
        "PHP 8.1+, no HTTP library needed. Translations are cached (any PSR-16 cache, e.g. Laravel's) and revalidated after the TTL.",
      blocks: [
        { title: "Install", language: "bash", code: "composer require lucent-codeworks/translate" },
        {
          title: "Usage",
          language: "php",
          code: `use Lucent\\Translate\\Cache\\FileCache;
use Lucent\\Translate\\Client;

$client = new Client(
    baseUrl: '${origin}',
    project: '${project}',
    apiKey: '${key}',
    fallbackLocale: '${baseLocale}',
    cache: new FileCache(__DIR__ . '/cache'), // or any PSR-16 cache
    ttl: 60,
);

$t = $client->translator('${exampleLocale}');
echo $t('${sampleKey}');${
            paramSample
              ? `\necho $t('${paramSample.key}', [${paramSample.params.map((p) => `'${p}' => '…'`).join(", ")}]);`
              : ""
          }`,
        },
      ],
    },
    {
      id: "rust",
      label: "Rust",
      pkg: "lucent-translate",
      intro:
        "Async client on Tokio. Load once, look up synchronously from any handler, and keep translations fresh in the background.",
      blocks: [
        { title: "Install", language: "bash", code: "cargo add lucent-translate" },
        {
          title: "Usage",
          language: "rust",
          code: `use std::time::Duration;
use lucent_translate::Client;

let client = Client::builder(${q(origin)}, ${q(project)}, ${q(key)})
    .fallback_locale(${q(baseLocale)})
    .build()?;

client.load(${q(exampleLocale)}).await?;
let _polling = client.spawn_polling(Duration::from_secs(60));

client.t(${q(exampleLocale)}, ${q(sampleKey)});${
            paramSample
              ? `\nclient.t_with(${q(exampleLocale)}, ${q(paramSample.key)}, [${paramSample.params.map((p) => `(${q(p)}, "…")`).join(", ")}]);`
              : ""
          }`,
        },
      ],
    },
    {
      id: "typed-keys",
      label: "Typed keys",
      pkg: "@lucent-translate/cli",
      intro:
        "Generate this project's keys so misspelled keys and missing params fail at compile time, and editors autocomplete key names. Works with every SDK above.",
      blocks: [
        { title: "Install", language: "bash", code: "npm install --save-dev @lucent-translate/cli" },
        {
          title: ".env",
          language: "env",
          code: `LUCENT_TRANSLATE_URL=${origin}
LUCENT_TRANSLATE_PROJECT=${project}
LUCENT_TRANSLATE_API_KEY=${key}`,
        },
        {
          title: "Generate",
          language: "bash",
          code: `# TypeScript (all JS SDKs): types t() from your keys
npx lucent-translate generate --out src/translation-keys.d.ts

# PHP / Rust: key constants
npx lucent-translate generate --out src/Translation/Keys.php --php-namespace 'App\\Translation'
npx lucent-translate generate --out src/translation_keys.rs

# CI: fail when the generated file is out of date
npx lucent-translate generate --out src/translation-keys.d.ts --check`,
        },
        {
          title: "Result",
          language: "ts",
          code: `t(${q(sampleKey)});${jsParamCall("t")}
t(${q(misspell(sampleKey))}); // ✗ error: not a known key`,
        },
      ],
    },
  ];
}

/** A plausible typo of a key, for the typed-keys example. */
function misspell(key: string): string {
  const i = key.search(/[a-z][a-z](?![^.]*\.)/i);
  if (i < 0 || i + 1 >= key.length) return `${key}x`;
  return key.slice(0, i) + key[i + 1] + key[i] + key.slice(i + 2);
}
