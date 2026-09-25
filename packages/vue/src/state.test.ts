import { createTranslateClient, type Messages } from "@lucent-translate/sdk";
import { describe, expect, it } from "vitest";
import { computed, ref } from "vue";
import { createTranslateState } from "./state";

function fakeServer(data: Record<string, Messages>) {
  const gates = new Map<string, Promise<void>>();
  const fetch = (async (input: RequestInfo | URL) => {
    const locale = decodeURIComponent(String(input).split("/").pop()!);
    await gates.get(locale);
    return data[locale] ? Response.json(data[locale]) : new Response(null, { status: 404 });
  }) as typeof globalThis.fetch;
  const hold = (locale: string) => {
    let release!: () => void;
    gates.set(locale, new Promise((r) => (release = r)));
    return () => {
      gates.delete(locale);
      release();
    };
  };
  return { fetch, data, hold };
}

const setup = (data: Record<string, Messages>, initial = "de") => {
  const server = fakeServer(data);
  const client = createTranslateClient({
    baseUrl: "https://t.example.com",
    project: "demo",
    apiKey: "lt_test",
    pollInterval: 0,
    fetch: server.fetch,
  });
  const saved: string[] = [];
  const state = createTranslateState(client, ref(initial), (l) => saved.push(l));
  return { server, client, state, saved };
};

describe("createTranslateState", () => {
  it("t() is reactive to translation updates and locale changes", async () => {
    const { server, client, state } = setup({ de: { title: "Willkommen" }, fr: { title: "Bienvenue" } });
    const title = computed(() => state.t("title"));
    await client.load("de");
    expect(title.value).toBe("Willkommen");

    server.data.de = { title: "Hallo" };
    await client.load("de");
    expect(title.value).toBe("Hallo");

    await state.setLocale("fr");
    expect(title.value).toBe("Bienvenue");
  });

  it("keeps the current locale while the next one loads, then remembers it", async () => {
    const { server, client, state, saved } = setup({ de: { t: "de" }, fr: { t: "fr" } });
    await client.load("de");
    const release = server.hold("fr");
    const switching = state.setLocale("fr");
    expect(state.loading.value).toBe(true);
    expect(state.locale.value).toBe("de");
    release();
    await switching;
    expect(state.loading.value).toBe(false);
    expect(state.locale.value).toBe("fr");
    expect(saved).toEqual(["fr"]);
  });

  it("lets the latest switch win when an earlier one resolves late", async () => {
    const { server, client, state, saved } = setup({ de: { t: "de" }, fr: { t: "fr" } });
    await client.load("de");
    const release = server.hold("fr");
    const toFr = state.setLocale("fr");
    await state.setLocale("de");
    release();
    await toFr;
    expect(state.locale.value).toBe("de");
    expect(state.loading.value).toBe(false);
    expect(saved).toEqual(["de"]);
  });

  it("rejects and clears loading when a locale doesn't exist", async () => {
    const { state } = setup({ de: {} });
    await expect(state.setLocale("xx")).rejects.toThrow("404");
    expect(state.loading.value).toBe(false);
    expect(state.locale.value).toBe("de");
  });
});
