import { addImports, addPlugin, createResolver, defineNuxtModule } from "@nuxt/kit";
import { defu } from "defu";
import type { LucentTranslatePublicConfig } from "./runtime/types";

export interface ModuleOptions {
  /** Your Lucent Translate instance, e.g. https://translate.example.com */
  baseUrl?: string;
  /** Project slug. */
  project?: string;
  /** Project API key (read-only, safe to expose to the browser). */
  apiKey?: string;
  /** Locale used when the visitor hasn't chosen one. Default: "en". */
  defaultLocale?: string;
  /** Locale used for missing translations, usually the project's base language. */
  fallbackLocale?: string;
  /** How often the browser polls for updates, in ms. 0 disables. Default: 60s. */
  pollInterval?: number;
  /** Cookie that remembers the chosen locale, or false to disable. Default: "lt_locale". */
  cookie?: string | false;
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: "@lucent-translate/nuxt",
    configKey: "lucentTranslate",
    compatibility: { nuxt: ">=3.0.0" },
  },
  defaults: {
    baseUrl: "",
    project: "",
    apiKey: "",
    defaultLocale: "en",
    fallbackLocale: "",
    pollInterval: 60_000,
    cookie: "lt_locale",
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url);

    // Public runtime config, so every value can be overridden at runtime with
    // NUXT_PUBLIC_LUCENT_TRANSLATE_* env vars without rebuilding.
    const publicConfig = nuxt.options.runtimeConfig.public as Record<string, unknown>;
    publicConfig.lucentTranslate = defu(
      publicConfig.lucentTranslate as Partial<LucentTranslatePublicConfig> | undefined,
      options,
    ) satisfies Partial<LucentTranslatePublicConfig>;

    addPlugin(resolver.resolve("./runtime/plugin"));
    addImports({ name: "useTranslate", from: resolver.resolve("./runtime/composables") });
  },
});

declare module "#app" {
  interface NuxtApp {
    $lucentTranslate: import("./runtime/state").TranslateState;
  }
}
