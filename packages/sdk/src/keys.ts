/**
 * Registry of the project's keys. Empty by default, so `t()` accepts any
 * string. `lucent-translate generate` writes a declaration that fills it in:
 *
 * ```ts
 * declare module "@lucent-translate/sdk" {
 *   interface TranslationKeys {
 *     "home.title": {};
 *     "home.greeting": { name: string | number };
 *   }
 * }
 * ```
 *
 * after which `t()` only accepts those keys and requires exactly the params
 * each one's text uses.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TranslationKeys {}

export type Params = Record<string, string | number>;

/** A known key, or any string while no keys have been generated. */
export type TranslationKey = [keyof TranslationKeys] extends [never]
  ? string
  : Extract<keyof TranslationKeys, string>;

/** The params argument `t()` takes for key `K`: required iff its text has placeholders. */
export type TranslationParams<K extends string> = K extends keyof TranslationKeys
  ? [keyof TranslationKeys[K]] extends [never]
    ? [params?: Record<string, never>]
    : [params: TranslationKeys[K]]
  : [params?: Params];

/** `t()` bound to a locale, as returned by the framework bindings. */
export type TranslateFunction = <K extends TranslationKey>(key: K, ...params: TranslationParams<K>) => string;
