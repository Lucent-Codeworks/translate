import type { Messages, TranslateClient } from "@lucent-translate/sdk";
import { readonly, ref, type Ref } from "vue";

type Params = Record<string, string | number>;

/**
 * Reactive translation state around a core client. Shared by the Vue plugin
 * and the Nuxt module; `onLocaleChange` lets hosts persist the choice
 * (e.g. Nuxt's cookie).
 */
export function createTranslateState(
  client: TranslateClient,
  locale: Ref<string>,
  onLocaleChange?: (locale: string) => void,
) {
  const version = ref(0);
  const loading = ref(false);
  // Only the most recent setLocale may apply, so a slow response can't
  // override a later switch.
  let latestRequest = 0;

  client.subscribe(() => {
    version.value++;
  });

  const apply = (next: string) => {
    locale.value = next;
    loading.value = false;
    onLocaleChange?.(next);
  };

  async function setLocale(next: string) {
    const request = ++latestRequest;
    const isLatest = () => request === latestRequest;
    if (client.has(next)) {
      if (isLatest()) apply(next);
      return;
    }
    loading.value = true;
    try {
      await client.load(next);
      if (isLatest()) apply(next);
    } catch (err) {
      if (isLatest()) loading.value = false;
      throw err;
    }
  }

  /** Translates `key` in the current locale; reactive when used in render. */
  function t(key: string, params?: Params): string {
    void version.value; // track translation updates
    return client.t(locale.value, key, params);
  }

  return {
    client,
    t,
    setLocale,
    locale: readonly(locale),
    loading: readonly(loading),
  };
}

export type TranslateState = ReturnType<typeof createTranslateState>;
export type { Messages };
