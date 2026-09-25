import {
  createTranslateClient,
  type Messages,
  type TranslateClient,
  type TranslateClientOptions,
} from "@lucent-translate/sdk";
import { createContext, onMount } from "svelte";

export interface TranslatorOptions extends TranslateClientOptions {
  /** Locale to render initially. */
  locale: string;
}

type Params = Record<string, string | number>;

/**
 * Reactive wrapper around the core client. Reading `t()` or `locale` inside
 * markup or `$derived` re-runs when the locale changes or translations update.
 */
export class Translator {
  readonly client: TranslateClient;
  #locale = $state("");
  #version = $state(0);
  #loading = $state(false);

  constructor(options: TranslatorOptions) {
    this.client = createTranslateClient(options);
    this.#locale = options.locale;
    this.client.subscribe(() => {
      this.#version++;
    });
  }

  get locale() {
    return this.#locale;
  }

  /** True while `setLocale` is fetching a locale that isn't loaded yet. */
  get loading() {
    return this.#loading;
  }

  /** Translates `key` in the current locale, interpolating `{name}` params. */
  t = (key: string, params?: Params): string => {
    void this.#version; // track updates
    return this.client.t(this.#locale, key, params);
  };

  /**
   * Switches locale. Loads it first (if needed), so the UI never flashes
   * fallback text for a locale that is on its way.
   */
  setLocale = async (locale: string) => {
    if (!this.client.has(locale)) {
      this.#loading = true;
      try {
        await this.client.load(locale);
      } finally {
        this.#loading = false;
      }
    }
    this.#locale = locale;
  };

  /** Messages held for every locale, to pass from a server `load` to the page. */
  snapshot(): Record<string, Messages> {
    return this.client.snapshot();
  }
}

const [getContext, setContext, hasContext] = createContext<Translator>();

/**
 * Creates a Translator and makes it available to child components via
 * `getTranslator()`. Call it during component initialisation, typically in
 * the root `+layout.svelte`. In the browser it refreshes the current locale
 * and polls for updates until the component is destroyed.
 */
export function setTranslator(options: TranslatorOptions): Translator {
  const translator = new Translator(options);
  setContext(translator);

  onMount(() => {
    translator.client.load(translator.locale).catch((err) => {
      console.error("[lucent-translate]", err);
    });
    translator.client.start();
    return () => translator.client.stop();
  });

  return translator;
}

/** The Translator provided by the nearest `setTranslator()` call. */
export function getTranslator(): Translator {
  if (!hasContext()) {
    throw new Error(
      "No translator found. Call setTranslator() in a parent component, e.g. your root +layout.svelte.",
    );
  }
  return getContext();
}
