import { useNuxtApp } from "#app";
import type { TranslateState } from "@lucent-translate/vue";

/**
 * Translations for the current locale: `{ t, locale, loading, setLocale, client }`.
 * `t()` is reactive in templates and computed values; `setLocale` loads the
 * locale first, then switches and remembers it in a cookie.
 */
export function useTranslate(): TranslateState {
  return useNuxtApp().$lucentTranslate as TranslateState;
}
