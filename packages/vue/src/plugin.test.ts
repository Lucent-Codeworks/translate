import type { Messages } from "@lucent-translate/sdk";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick } from "vue";
import { createTranslate, useTranslate, type CreateTranslateOptions } from "./index";

function fakeServer(data: Record<string, Messages>) {
  const requests: string[] = [];
  const fetch = (async (input: RequestInfo | URL) => {
    const locale = decodeURIComponent(String(input).split("/").pop()!);
    requests.push(locale);
    return data[locale] ? Response.json(data[locale]) : new Response(null, { status: 404 });
  }) as typeof globalThis.fetch;
  return { fetch, data, requests };
}

const base = { baseUrl: "https://t.example.com", project: "demo", apiKey: "lt_test", pollInterval: 0 };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

const Greeting = defineComponent(() => {
  const { t, locale, loading, setLocale } = useTranslate();
  return () =>
    h("div", [
      h("h1", t("title")),
      h("p", t("greeting", { name: "Ada" })),
      h("span", { id: "state" }, `${locale.value}/${loading.value}`),
      h("button", { onClick: () => setLocale("fr") }, "fr"),
    ]);
});

const mountWith = (options: Partial<CreateTranslateOptions> & { locale: string }) => {
  const translate = createTranslate({ ...base, ...options });
  return { translate, wrapper: mount(Greeting, { global: { plugins: [translate] } }) };
};

describe("@lucent-translate/vue", () => {
  it("renders seeded messages immediately, then refreshes the locale", async () => {
    const server = fakeServer({ de: { title: "Willkommen", greeting: "Hallo {name}" } });
    const { wrapper } = mountWith({ locale: "de", fetch: server.fetch, messages: { de: { title: "Willkommen (seed)" } } });

    expect(wrapper.find("h1").text()).toBe("Willkommen (seed)");
    await wait(10);
    expect(server.requests).toEqual(["de"]);
    expect(wrapper.find("h1").text()).toBe("Willkommen");
    expect(wrapper.find("p").text()).toBe("Hallo Ada");
  });

  it("re-renders when polling picks up changed translations", async () => {
    const server = fakeServer({ de: { title: "Willkommen" } });
    const { wrapper } = mountWith({ locale: "de", fetch: server.fetch, pollInterval: 20 });
    await wait(10);
    server.data.de = { title: "Hallo!" };
    await wait(40);
    expect(wrapper.find("h1").text()).toBe("Hallo!");
  });

  it("switches locale after loading it and reports the change", async () => {
    const server = fakeServer({ de: { title: "Willkommen" }, fr: { title: "Bienvenue" } });
    const onLocaleChange = vi.fn();
    const { wrapper } = mountWith({ locale: "de", fetch: server.fetch, onLocaleChange });
    await wait(10);

    await wrapper.find("button").trigger("click");
    expect(wrapper.find("#state").text()).toBe("de/true");
    await wait(10);
    expect(wrapper.find("#state").text()).toBe("fr/false");
    expect(wrapper.find("h1").text()).toBe("Bienvenue");
    expect(onLocaleChange).toHaveBeenCalledWith("fr");
  });

  it("exposes the state outside components", async () => {
    const server = fakeServer({ de: { title: "Willkommen" } });
    const { translate, wrapper } = mountWith({ locale: "de", fetch: server.fetch });
    await wait(10);
    expect(translate.t("title")).toBe("Willkommen");
    expect(translate.locale.value).toBe("de");
    server.data.fr = { title: "Bienvenue" };
    await translate.setLocale("fr");
    await nextTick();
    expect(wrapper.find("h1").text()).toBe("Bienvenue");
  });

  it("stops polling when the app unmounts", async () => {
    const server = fakeServer({ de: { title: "Willkommen" } });
    const { wrapper } = mountWith({ locale: "de", fetch: server.fetch, pollInterval: 10 });
    await wait(35);
    wrapper.unmount();
    const count = server.requests.length;
    expect(count).toBeGreaterThan(1);
    await wait(40);
    expect(server.requests.length).toBe(count);
  });

  it("explains how to fix a missing plugin", () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(() => mount(Greeting)).toThrow(/app\.use\(createTranslate/);
  });
});
