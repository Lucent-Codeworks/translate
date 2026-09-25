import type { Messages } from "@lucent-translate/sdk";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TranslateProvider, useTranslate, type TranslateProviderProps } from "./index";
import { loadTranslations } from "./server";

/** In-memory stand-in for the delivery endpoint; `hold(locale)` delays one locale's response. */
function fakeServer(data: Record<string, Messages>) {
  const requests: string[] = [];
  const gates = new Map<string, Promise<void>>();
  const fetch = (async (input: RequestInfo | URL) => {
    const locale = decodeURIComponent(String(input).split("/").pop()!);
    requests.push(locale);
    await gates.get(locale);
    const messages = data[locale];
    return messages ? Response.json(messages) : new Response(null, { status: 404 });
  }) as typeof globalThis.fetch;
  const hold = (locale: string) => {
    let release!: () => void;
    gates.set(locale, new Promise((r) => (release = r)));
    return () => {
      gates.delete(locale);
      release();
    };
  };
  return { fetch, data, requests, hold };
}

const base = { baseUrl: "https://t.example.com", project: "demo", apiKey: "lt_test" };
const wait = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)));

function Greeting() {
  const { t, locale, loading, setLocale } = useTranslate();
  return (
    <>
      <h1>{t("title")}</h1>
      <p>{t("greeting", { name: "Ada" })}</p>
      <span data-testid="state">
        {locale}/{String(loading)}
      </span>
      <button onClick={() => setLocale("fr")}>fr</button>
      <button onClick={() => setLocale("de")}>de</button>
    </>
  );
}

const renderApp = (props: Partial<TranslateProviderProps> & { locale: string }) =>
  render(
    <TranslateProvider {...base} pollInterval={0} {...props}>
      <Greeting />
    </TranslateProvider>,
  );

afterEach(() => cleanup());

describe("@lucent-translate/react", () => {
  it("server-renders seeded messages without fetching", () => {
    const fetch = vi.fn();
    const html = renderToString(
      <TranslateProvider {...base} locale="de" fetch={fetch} messages={{ de: { title: "Willkommen" } }}>
        <Greeting />
      </TranslateProvider>,
    );
    expect(html).toContain("<h1>Willkommen</h1>");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("renders seeded messages immediately, then refreshes the locale", async () => {
    const server = fakeServer({ de: { title: "Willkommen", greeting: "Hallo {name}" } });
    renderApp({ locale: "de", fetch: server.fetch, messages: { de: { title: "Willkommen (SSR)" } } });

    expect(screen.getByRole("heading").textContent).toBe("Willkommen (SSR)");
    await wait(10);
    expect(server.requests).toEqual(["de"]);
    expect(screen.getByRole("heading").textContent).toBe("Willkommen");
    expect(screen.getByText("Hallo Ada")).toBeTruthy();
  });

  it("re-renders when polling picks up changed translations", async () => {
    const server = fakeServer({ de: { title: "Willkommen" } });
    renderApp({ locale: "de", fetch: server.fetch, pollInterval: 20 });
    await wait(10);
    server.data.de = { title: "Hallo!" };
    await wait(40);
    expect(screen.getByRole("heading").textContent).toBe("Hallo!");
  });

  it("keeps the current locale until the new one has loaded", async () => {
    const server = fakeServer({ de: { title: "Willkommen" }, fr: { title: "Bienvenue" } });
    renderApp({ locale: "de", fetch: server.fetch });
    await wait(10);

    const release = server.hold("fr");
    fireEvent.click(screen.getByRole("button", { name: "fr" }));
    await wait(5);
    expect(screen.getByTestId("state").textContent).toBe("de/true");
    expect(screen.getByRole("heading").textContent).toBe("Willkommen");

    release();
    await wait(10);
    expect(screen.getByTestId("state").textContent).toBe("fr/false");
    expect(screen.getByRole("heading").textContent).toBe("Bienvenue");
  });

  it("lets the latest switch win when an earlier one resolves late", async () => {
    const server = fakeServer({ de: { title: "Willkommen" }, fr: { title: "Bienvenue" } });
    renderApp({ locale: "de", fetch: server.fetch });
    await wait(10);

    const release = server.hold("fr");
    fireEvent.click(screen.getByRole("button", { name: "fr" }));
    fireEvent.click(screen.getByRole("button", { name: "de" }));
    release();
    await wait(10);
    expect(screen.getByTestId("state").textContent).toBe("de/false");
    expect(screen.getByRole("heading").textContent).toBe("Willkommen");
  });

  it("follows changes to the locale prop", async () => {
    const server = fakeServer({ de: { title: "Willkommen" }, fr: { title: "Bienvenue" } });
    const view = renderApp({ locale: "de", fetch: server.fetch });
    await wait(10);
    view.rerender(
      <TranslateProvider {...base} pollInterval={0} locale="fr" fetch={server.fetch}>
        <Greeting />
      </TranslateProvider>,
    );
    await wait(10);
    expect(screen.getByRole("heading").textContent).toBe("Bienvenue");
  });

  it("stops polling on unmount", async () => {
    const server = fakeServer({ de: { title: "Willkommen" } });
    const view = renderApp({ locale: "de", fetch: server.fetch, pollInterval: 10 });
    await wait(35);
    view.unmount();
    const count = server.requests.length;
    expect(count).toBeGreaterThan(1);
    await new Promise((r) => setTimeout(r, 40));
    expect(server.requests.length).toBe(count);
  });

  it("explains how to fix a missing provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Greeting />)).toThrow(/inside <TranslateProvider>/);
  });
});

describe("loadTranslations", () => {
  it("returns messages for hydration and a server-side t()", async () => {
    const server = fakeServer({ fr: { title: "Bienvenue" }, en: { title: "Welcome", sub: "Hi {name}" } });
    const { locale, messages, t } = await loadTranslations({
      ...base,
      locale: "fr",
      fallbackLocale: "en",
      fetch: server.fetch,
    });
    expect(locale).toBe("fr");
    expect(messages).toEqual({ fr: { title: "Bienvenue" }, en: { title: "Welcome", sub: "Hi {name}" } });
    expect(t("title")).toBe("Bienvenue");
    expect(t("sub", { name: "Ada" })).toBe("Hi Ada");
  });
});
