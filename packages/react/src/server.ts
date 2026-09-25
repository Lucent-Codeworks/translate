import {
  createTranslateClient,
  type Messages,
  type TranslateClientOptions,
} from "@lucent-translate/sdk";

export { createTranslateClient };
export type { Messages, TranslateClientOptions };

type Params = Record<string, string | number>;

export interface LoadedTranslations {
  locale: string;
  /** Pass to `<TranslateProvider messages={…}>` to hydrate without a fetch. */
  messages: Record<string, Messages>;
  /** Server-side lookup, e.g. in Server Components or `generateMetadata`. */
  t: (key: string, params?: Params) => string;
}

/**
 * Fetches a locale (and the fallback locale) on the server. Use it in Server
 * Components, route handlers and `generateMetadata`; wrap it in React's
 * `cache()` to share one fetch per request.
 */
export async function loadTranslations(
  options: TranslateClientOptions & { locale: string },
): Promise<LoadedTranslations> {
  const { locale, ...clientOptions } = options;
  const client = createTranslateClient({ ...clientOptions, pollInterval: 0 });
  await client.load(locale);
  return {
    locale,
    messages: client.snapshot(),
    t: (key, params) => client.t(locale, key, params),
  };
}
