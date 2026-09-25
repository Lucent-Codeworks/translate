import {
  createTranslateClient,
  type Messages,
  type Params,
  type TranslateClientOptions,
  type TranslateFunction,
} from "@lucent-translate/sdk";

export { createTranslateClient };
export type { Messages, TranslateClientOptions };


export interface LoadedTranslations {
  locale: string;
  /** Pass to `<TranslateProvider messages={…}>` to hydrate without a fetch. */
  messages: Record<string, Messages>;
  /** Server-side lookup, e.g. in Server Components or `generateMetadata`. */
  t: TranslateFunction;
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
    t: ((key: string, params?: Params) =>
      (client.t as (locale: string, key: string, params?: Params) => string)(locale, key, params)) as TranslateFunction,
  };
}
