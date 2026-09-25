import {
  createTranslateClient,
  type Params,
  type TranslateClient,
  type TranslateClientOptions,
  type TranslateFunction,
} from "@lucent-translate/sdk";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

export type {
  Messages,
  TranslateClient,
  TranslateClientOptions,
  TranslateFunction,
  TranslationKey,
  TranslationKeys,
} from "@lucent-translate/sdk";
type State = { locale: string; loading: boolean; version: number };

function createStore(options: TranslateClientOptions, initialLocale: string) {
  const client = createTranslateClient(options);
  const listeners = new Set<() => void>();
  let state: State = { locale: initialLocale, loading: false, version: 0 };
  // Only the most recent setLocale call may apply, so rapid switches can't
  // land out of order when responses arrive late.
  let latestRequest = 0;

  const set = (patch: Partial<State>) => {
    const next = { ...state, ...patch };
    if (next.locale === state.locale && next.loading === state.loading && next.version === state.version) {
      return;
    }
    state = next;
    for (const listener of listeners) listener();
  };
  client.subscribe(() => set({ version: state.version + 1 }));

  async function setLocale(locale: string) {
    const request = ++latestRequest;
    const isLatest = () => request === latestRequest;
    if (client.has(locale)) {
      // Also clears `loading` left by a superseded request that is still in flight.
      if (isLatest()) set({ locale, loading: false });
      return;
    }
    set({ loading: true });
    try {
      await client.load(locale);
      if (isLatest()) set({ locale, loading: false });
    } catch (err) {
      if (isLatest()) set({ loading: false });
      throw err;
    }
  }

  return {
    client,
    setLocale,
    getState: () => state,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

type Store = ReturnType<typeof createStore>;

const StoreContext = createContext<Store | null>(null);

/** The client's `t` without key typing, for forwarding already-checked calls. */
const untypedT = (client: TranslateClient) =>
  client.t as (locale: string, key: string, params?: Params) => string;

export type TranslateProviderProps = TranslateClientOptions & {
  /** Locale to render. Changing it switches locale once it has loaded. */
  locale: string;
  children?: ReactNode;
};

/**
 * Provides translations to `useTranslate()`. Pass `messages` (from
 * `loadTranslations()` in `@lucent-translate/react/server`) so server
 * rendering and hydration show translated text without a fetch.
 *
 * Client options are read once, on mount; only `locale` is reactive.
 */
export function TranslateProvider({ children, locale, ...options }: TranslateProviderProps) {
  const [store] = useState(() => createStore(options, locale));

  useEffect(() => {
    store.client.load(store.getState().locale).catch((err) => {
      console.error("[lucent-translate]", err);
    });
    store.client.start();
    return () => store.client.stop();
  }, [store]);

  useEffect(() => {
    store.setLocale(locale).catch((err) => console.error("[lucent-translate]", err));
  }, [store, locale]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export interface UseTranslateResult {
  /**
   * Translates `key` in the current locale, interpolating `{name}` params.
   * Typed from your generated keys when you run `lucent-translate generate`.
   */
  t: TranslateFunction;
  locale: string;
  /** True while `setLocale` is fetching a locale that isn't loaded yet. */
  loading: boolean;
  /** Loads the locale if needed, then switches to it. */
  setLocale: (locale: string) => Promise<void>;
  client: TranslateClient;
}

export function useTranslate(): UseTranslateResult {
  const store = useContext(StoreContext);
  if (!store) {
    throw new Error(
      "useTranslate() must be used inside <TranslateProvider>. Wrap your app (e.g. the root layout) in it.",
    );
  }
  const state = useSyncExternalStore(store.subscribe, store.getState, store.getState);
  const t = useCallback(
    ((key: string, params?: Params) => untypedT(store.client)(state.locale, key, params)) as TranslateFunction,
    // `state` changes whenever the locale or any messages change.
    [store, state],
  );
  return {
    t,
    locale: state.locale,
    loading: state.loading,
    setLocale: store.setLocale,
    client: store.client,
  };
}
