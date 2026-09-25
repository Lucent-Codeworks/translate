import type { Params, TranslationKey, TranslationParams } from "./keys";
import { isDevelopment, suggestKey, warnOnMissingKey, type MissingKeyHandler } from "./missing-keys";

export type {
  Params,
  TranslateFunction,
  TranslationKey,
  TranslationKeys,
  TranslationParams,
} from "./keys";
export type { MissingKeyHandler, MissingKeyInfo } from "./missing-keys";

export type Messages = Record<string, string>;

export interface TranslateClientOptions {
  /** Base URL of your Lucent Translate instance, e.g. https://translate.example.com */
  baseUrl: string;
  /** Project slug. */
  project: string;
  /** Project API key (read-only). */
  apiKey: string;
  /** How often to poll for updates, in ms. Set to 0 to disable. Default: 60s. */
  pollInterval?: number;
  /**
   * Locale to use when a key has no translation in the requested locale,
   * typically the project's base language. It is loaded alongside the first
   * locale you load. Without it, missing keys render as the key itself.
   */
  fallbackLocale?: string;
  /**
   * Messages to start with, keyed by locale, e.g. from `snapshot()` on the
   * server. Lets server-rendered pages show translations without a fetch.
   */
  messages?: Record<string, Messages>;
  /** Custom fetch implementation (defaults to globalThis.fetch). */
  fetch?: typeof fetch;
  /**
   * Called (once per key) when `t()` is asked for a key that no loaded locale
   * has, which usually means a typo. Defaults to a console warning in
   * development builds and nothing in production. `false` disables it.
   */
  onMissingKey?: MissingKeyHandler | false;
}

type Listener = (locale: string, messages: Messages) => void;

/**
 * Fetches translations for a project from the server and keeps them up to
 * date. Uses ETags so polling is cheap when nothing has changed.
 *
 * Server endpoint: GET {baseUrl}/api/v1/projects/{project}/locales/{locale}
 */
export function createTranslateClient(options: TranslateClientOptions) {
  const { baseUrl, project, apiKey, fallbackLocale, pollInterval = 60_000 } = options;
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);

  const cache = new Map<string, { etag?: string; messages: Messages }>(
    Object.entries(options.messages ?? {}).map(([locale, messages]) => [locale, { messages }]),
  );
  const listeners = new Set<Listener>();
  const onMissingKey =
    options.onMissingKey === false
      ? undefined
      : (options.onMissingKey ?? (isDevelopment() ? warnOnMissingKey : undefined));
  const reportedKeys = new Set<string>();
  let timer: ReturnType<typeof setInterval> | undefined;

  async function fetchLocale(locale: string): Promise<Messages> {
    const cached = cache.get(locale);
    const url = `${baseUrl.replace(/\/$/, "")}/api/v1/projects/${encodeURIComponent(
      project,
    )}/locales/${encodeURIComponent(locale)}`;

    const res = await doFetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...(cached?.etag ? { "If-None-Match": cached.etag } : {}),
      },
    });

    if (res.status === 304 && cached) return cached.messages;
    if (!res.ok) {
      throw new Error(`Failed to load translations for "${locale}": ${res.status}`);
    }

    const messages = (await res.json()) as Messages;
    cache.set(locale, { etag: res.headers.get("ETag") ?? undefined, messages });
    for (const listener of listeners) listener(locale, messages);
    return messages;
  }

  /**
   * Fetches a locale (and the fallback locale, the first time) and returns
   * the locale's own messages.
   */
  async function load(locale: string): Promise<Messages> {
    const needsFallback =
      fallbackLocale !== undefined && fallbackLocale !== locale && !cache.has(fallbackLocale);
    const [messages] = await Promise.all([
      fetchLocale(locale),
      needsFallback ? fetchLocale(fallbackLocale) : undefined,
    ]);
    return messages;
  }

  /**
   * Looks up a key, interpolating `{name}` placeholders. Falls back to the
   * fallback locale, then to the key itself.
   */
  function t<K extends TranslationKey>(locale: string, key: K, ...[params]: TranslationParams<K>): string {
    const template =
      lookup(cache.get(locale)?.messages, key) ??
      (fallbackLocale !== undefined ? lookup(cache.get(fallbackLocale)?.messages, key) : undefined);
    if (template === undefined) {
      reportMissing(locale, key);
      return key;
    }
    return interpolate(template, params as Params | undefined);
  }

  function reportMissing(locale: string, key: string) {
    // Only when something is loaded (otherwise every key is "missing"), and
    // only if no loaded locale has the key: missing in just one locale means
    // untranslated, not a typo.
    if (!onMissingKey || cache.size === 0 || reportedKeys.has(key)) return;
    for (const entry of cache.values()) {
      if (lookup(entry.messages, key) !== undefined) return;
    }
    reportedKeys.add(key);
    const known = new Set<string>();
    for (const entry of cache.values()) for (const k of Object.keys(entry.messages)) known.add(k);
    onMissingKey({ key, locale, suggestion: suggestKey(key, known) });
  }

  /** Starts polling every loaded locale for changes. */
  function start() {
    if (timer || pollInterval <= 0) return;
    timer = setInterval(() => {
      for (const locale of cache.keys()) fetchLocale(locale).catch(() => {});
    }, pollInterval);
  }

  function stop() {
    clearInterval(timer);
    timer = undefined;
  }

  /** Called whenever a locale's messages change. Returns an unsubscribe function. */
  function subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  /** Whether messages for a locale are available (loaded or seeded). */
  function has(locale: string) {
    return cache.has(locale);
  }

  /** All currently held messages by locale; pass to `messages` to rehydrate. */
  function snapshot(): Record<string, Messages> {
    return Object.fromEntries([...cache].map(([locale, entry]) => [locale, entry.messages]));
  }

  return { load, t, has, snapshot, start, stop, subscribe };
}

export type TranslateClient = ReturnType<typeof createTranslateClient>;

const hasOwn = (object: object, key: string) => Object.prototype.hasOwnProperty.call(object, key);

/** Own-property lookup, so keys like "constructor" aren't found on the prototype. */
function lookup(messages: Messages | undefined, key: string): string | undefined {
  return messages && hasOwn(messages, key) ? messages[key] : undefined;
}

function interpolate(template: string, params?: Params) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    hasOwn(params, name) ? String(params[name]) : match,
  );
}
