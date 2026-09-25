import { describe, expect, it } from "vitest";
import { createTranslateClient, type Messages } from "./index";

/** In-memory stand-in for the server's delivery endpoint. */
function fakeServer(data: Record<string, Messages>) {
  const requests: { locale: string; status: number }[] = [];
  const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const locale = decodeURIComponent(String(input).split("/").pop()!);
    const messages = data[locale];
    const status = (code: number) => (requests.push({ locale, status: code }), code);
    if (!messages) return new Response(null, { status: status(404) });

    const etag = `"${JSON.stringify(messages).length}:${Object.keys(messages).join()}"`;
    const ifNoneMatch = new Headers(init?.headers).get("If-None-Match");
    if (ifNoneMatch === etag) return new Response(null, { status: status(304), headers: { ETag: etag } });
    return Response.json(messages, { status: status(200), headers: { ETag: etag } });
  };
  return { fetch: fetch as typeof globalThis.fetch, requests, data };
}

const options = { baseUrl: "https://t.example.com/", project: "demo", apiKey: "lt_test", pollInterval: 0 };

describe("createTranslateClient", () => {
  it("loads messages and interpolates params", async () => {
    const server = fakeServer({ de: { greeting: "Hallo {name}, {missing}" } });
    const i18n = createTranslateClient({ ...options, fetch: server.fetch });

    expect(await i18n.load("de")).toEqual({ greeting: "Hallo {name}, {missing}" });
    expect(i18n.t("de", "greeting", { name: "Ada" })).toBe("Hallo Ada, {missing}");
  });

  it("does not interpolate inherited object properties", async () => {
    const server = fakeServer({ de: { k: "{toString} {constructor}" } });
    const i18n = createTranslateClient({ ...options, fetch: server.fetch });
    await i18n.load("de");

    expect(i18n.t("de", "k", {})).toBe("{toString} {constructor}");
  });

  it("falls back to the key without a fallback locale", async () => {
    const server = fakeServer({ de: {}, en: { title: "Welcome" } });
    const i18n = createTranslateClient({ ...options, fetch: server.fetch });
    await i18n.load("de");

    expect(i18n.t("de", "title")).toBe("title");
    expect(server.requests.map((r) => r.locale)).toEqual(["de"]);
  });

  it("uses the fallback locale for missing keys, then the key", async () => {
    const server = fakeServer({
      de: { title: "Willkommen" },
      en: { title: "Welcome", subtitle: "Hello {name}" },
    });
    const i18n = createTranslateClient({ ...options, fallbackLocale: "en", fetch: server.fetch });
    await i18n.load("de");

    expect(i18n.t("de", "title")).toBe("Willkommen");
    expect(i18n.t("de", "subtitle", { name: "Ada" })).toBe("Hello Ada");
    expect(i18n.t("de", "nope")).toBe("nope");
  });

  it("fetches the fallback locale only once", async () => {
    const server = fakeServer({ de: {}, fr: {}, en: {} });
    const i18n = createTranslateClient({ ...options, fallbackLocale: "en", fetch: server.fetch });
    await i18n.load("de");
    await i18n.load("fr");
    await i18n.load("en");

    expect(server.requests.map((r) => r.locale)).toEqual(["de", "en", "fr", "en"]);
    expect(server.requests[server.requests.length - 1].status).toBe(304);
  });

  it("rejects when the fallback locale does not exist", async () => {
    const server = fakeServer({ de: {} });
    const i18n = createTranslateClient({ ...options, fallbackLocale: "en", fetch: server.fetch });

    await expect(i18n.load("de")).rejects.toThrow('"en": 404');
  });

  it("revalidates with ETags and notifies subscribers of changes", async () => {
    const server = fakeServer({ de: { title: "Willkommen" } });
    const i18n = createTranslateClient({ ...options, fetch: server.fetch });
    const updates: Messages[] = [];
    i18n.subscribe((_, m) => updates.push(m));

    await i18n.load("de");
    await i18n.load("de");
    server.data.de = { title: "Hallo" };
    await i18n.load("de");

    expect(server.requests.map((r) => r.status)).toEqual([200, 304, 200]);
    expect(updates).toEqual([{ title: "Willkommen" }, { title: "Hallo" }]);
    expect(i18n.t("de", "title")).toBe("Hallo");
  });

  it("polls every loaded locale, including the fallback", async () => {
    const server = fakeServer({ de: {}, en: {} });
    const i18n = createTranslateClient({
      ...options,
      pollInterval: 10,
      fallbackLocale: "en",
      fetch: server.fetch,
    });
    await i18n.load("de");
    i18n.start();
    await new Promise((r) => setTimeout(r, 35));
    i18n.stop();

    const polled = server.requests.slice(2);
    expect(polled.length).toBeGreaterThanOrEqual(2);
    expect(new Set(polled.map((r) => r.locale))).toEqual(new Set(["de", "en"]));
    expect(polled.every((r) => r.status === 304)).toBe(true);
  });

  it("seeds from initial messages and round-trips through snapshot()", async () => {
    const server = fakeServer({ de: { title: "Willkommen" }, en: { title: "Welcome" } });
    const serverSide = createTranslateClient({ ...options, fallbackLocale: "en", fetch: server.fetch });
    await serverSide.load("de");
    const snapshot = serverSide.snapshot();
    expect(snapshot).toEqual({ de: { title: "Willkommen" }, en: { title: "Welcome" } });

    const browser = createTranslateClient({ ...options, messages: snapshot, fetch: server.fetch });
    expect(browser.has("de")).toBe(true);
    expect(browser.has("fr")).toBe(false);
    expect(browser.t("de", "title")).toBe("Willkommen");
    expect(server.requests).toHaveLength(2); // seeding didn't fetch

    // Seeded entries have no ETag yet, so the first refresh is a full fetch.
    await browser.load("de");
    expect(server.requests[server.requests.length - 1].status).toBe(200);
  });
});
