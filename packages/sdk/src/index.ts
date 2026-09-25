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
  /** Custom fetch implementation (defaults to globalThis.fetch). */
  fetch?: typeof fetch;
}

type Listener = (locale: string, messages: Messages) => void;

/**
 * Fetches translations for a project from the server and keeps them up to
 * date. Uses ETags so polling is cheap when nothing has changed.
 *
 * Server endpoint: GET {baseUrl}/api/v1/projects/{project}/locales/{locale}
 */
export function createTranslateClient(options: TranslateClientOptions) {
  const { baseUrl, project, apiKey, pollInterval = 60_000 } = options;
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);

  const cache = new Map<string, { etag?: string; messages: Messages }>();
  const listeners = new Set<Listener>();
  let timer: ReturnType<typeof setInterval> | undefined;

  async function load(locale: string): Promise<Messages> {
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

  /** Looks up a key, interpolating `{name}` placeholders. Falls back to the key. */
  function t(locale: string, key: string, params?: Record<string, string | number>) {
    const template = cache.get(locale)?.messages[key] ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match,
    );
  }

  /** Starts polling every loaded locale for changes. */
  function start() {
    if (timer || pollInterval <= 0) return;
    timer = setInterval(() => {
      for (const locale of cache.keys()) load(locale).catch(() => {});
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

  return { load, t, start, stop, subscribe };
}

export type TranslateClient = ReturnType<typeof createTranslateClient>;
