import { createTranslateClient, type Messages } from "@lucent-translate/sdk";
import { defineNuxtPlugin, useCookie, useRuntimeConfig, useState } from "#app";
import { createTranslateState } from "@lucent-translate/vue";
import type { LucentTranslatePublicConfig } from "./types";

const YEAR = 60 * 60 * 24 * 365;

export default defineNuxtPlugin(async (nuxtApp) => {
  const config = useRuntimeConfig().public.lucentTranslate as LucentTranslatePublicConfig;
  for (const key of ["baseUrl", "project", "apiKey"] as const) {
    if (!config[key]) {
      const message =
        `[lucent-translate] Missing "${key}". Set lucentTranslate.${key} in nuxt.config ` +
        `or the NUXT_PUBLIC_LUCENT_TRANSLATE_${key.replace(/[A-Z]/g, (c) => "_" + c).toUpperCase()} env var.`;
      // Logged as well: in production Nuxt turns plugin errors into a bare 500.
      console.error(message);
      throw new Error(message);
    }
  }

  const cookie = config.cookie
    ? useCookie<string | null>(config.cookie, { maxAge: YEAR, sameSite: "lax" })
    : null;
  // useState values are serialized into the SSR payload and restored on the client.
  const locale = useState("lucent-translate:locale", () => cookie?.value || config.defaultLocale);
  const messages = useState<Record<string, Messages>>("lucent-translate:messages", () => ({}));

  const client = createTranslateClient({
    baseUrl: config.baseUrl,
    project: config.project,
    apiKey: config.apiKey,
    fallbackLocale: config.fallbackLocale || undefined,
    pollInterval: import.meta.server ? 0 : config.pollInterval,
    messages: messages.value,
  });

  const state = createTranslateState(client, locale, (next) => {
    if (cookie) cookie.value = next;
  });

  if (import.meta.server) {
    try {
      await client.load(locale.value);
    } catch (err) {
      // A stale cookie may name a locale the project no longer has.
      if (locale.value !== config.defaultLocale) {
        locale.value = config.defaultLocale;
        await client.load(locale.value).catch((e) => console.error("[lucent-translate]", e));
      } else {
        console.error("[lucent-translate]", err);
      }
    }
    messages.value = client.snapshot();
  } else {
    nuxtApp.hook("app:mounted", () => {
      client.load(locale.value).catch((err) => console.error("[lucent-translate]", err));
      client.start();
    });
  }

  return { provide: { lucentTranslate: state } };
});
