import {
  createTranslateClient,
  type TranslateClientOptions,
} from "@lucent-translate/sdk";
import { inject, ref, type App, type InjectionKey, type Plugin } from "vue";
import { createTranslateState, type TranslateState } from "./state";

export { createTranslateState, type TranslateState } from "./state";
export type { Messages, TranslateClient, TranslateClientOptions } from "@lucent-translate/sdk";

export interface CreateTranslateOptions extends TranslateClientOptions {
  /** Locale to render initially. */
  locale: string;
  /** Called after each successful `setLocale`, e.g. to persist the choice. */
  onLocaleChange?: (locale: string) => void;
}

export type TranslatePlugin = TranslateState & Plugin;

const key: InjectionKey<TranslateState> = Symbol("lucent-translate");

/**
 * Creates the translation state and a Vue plugin that provides it:
 *
 * ```ts
 * const translate = createTranslate({ baseUrl, project, apiKey, locale: "en" });
 * app.use(translate);
 * ```
 *
 * The returned object is also the state itself (`translate.t(...)`), for use
 * outside components such as router guards. In the browser, installing it
 * loads the locale and starts polling until the app is unmounted.
 */
export function createTranslate(options: CreateTranslateOptions): TranslatePlugin {
  const { locale, onLocaleChange, ...clientOptions } = options;
  const client = createTranslateClient(clientOptions);
  const state = createTranslateState(client, ref(locale), onLocaleChange);

  return {
    ...state,
    install(app: App) {
      app.provide(key, state);
      if (typeof window === "undefined") return; // SSR: no fetching or timers
      client.load(state.locale.value).catch((err) => console.error("[lucent-translate]", err));
      client.start();
      app.onUnmount?.(() => client.stop());
    },
  };
}

/**
 * Translations for the current locale: `{ t, locale, loading, setLocale, client }`.
 * `t()` is reactive in templates and computed values.
 */
export function useTranslate(): TranslateState {
  const state = inject(key, null);
  if (!state) {
    throw new Error(
      "useTranslate() found no translations. Install the plugin: app.use(createTranslate({ ... })).",
    );
  }
  return state;
}
