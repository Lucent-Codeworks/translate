import type { Messages } from "@lucent-translate/sdk";
import { cleanup, fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import Greeting from "./Greeting.svelte";
import Provider from "./Provider.svelte";

/** In-memory stand-in for the delivery endpoint; `gate` lets tests hold a response. */
function fakeServer(data: Record<string, Messages>) {
  const requests: string[] = [];
  let gate: Promise<void> | undefined;
  const fetch = (async (input: RequestInfo | URL) => {
    const locale = decodeURIComponent(String(input).split("/").pop()!);
    requests.push(locale);
    await gate;
    const messages = data[locale];
    return messages ? Response.json(messages) : new Response(null, { status: 404 });
  }) as typeof globalThis.fetch;
  const hold = () => {
    let release!: () => void;
    gate = new Promise((r) => (release = r));
    return () => {
      gate = undefined;
      release();
    };
  };
  return { fetch, data, requests, hold };
}

const base = { baseUrl: "https://t.example.com", project: "demo", apiKey: "lt_test" };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

afterEach(() => cleanup());

describe("@lucent-translate/svelte", () => {
  it("renders seeded messages immediately, then refreshes the locale", async () => {
    const server = fakeServer({ de: { title: "Willkommen", greeting: "Hallo {name}" } });
    render(Provider, {
      options: {
        ...base,
        locale: "de",
        pollInterval: 0,
        fetch: server.fetch,
        messages: { de: { title: "Willkommen (SSR)", greeting: "Hallo {name}" } },
      },
    });

    expect(screen.getByRole("heading").textContent).toBe("Willkommen (SSR)");
    expect(screen.getByText("Hallo Ada")).toBeTruthy();
    await wait(10);
    expect(server.requests).toEqual(["de"]);
    expect(screen.getByRole("heading").textContent).toBe("Willkommen");
  });

  it("re-renders when polling picks up changed translations", async () => {
    const server = fakeServer({ de: { title: "Willkommen" } });
    render(Provider, { options: { ...base, locale: "de", pollInterval: 20, fetch: server.fetch } });

    await wait(10);
    expect(screen.getByRole("heading").textContent).toBe("Willkommen");
    server.data.de = { title: "Hallo!" };
    await wait(40);
    expect(screen.getByRole("heading").textContent).toBe("Hallo!");
  });

  it("loads a locale before switching to it", async () => {
    const server = fakeServer({
      de: { title: "Willkommen" },
      fr: { title: "Bienvenue" },
    });
    render(Provider, { options: { ...base, locale: "de", pollInterval: 0, fetch: server.fetch } });
    await wait(10);

    const release = server.hold();
    await fireEvent.click(screen.getByRole("button", { name: "French" }));
    // Still showing German while French loads.
    expect(screen.getByTestId("loading").textContent).toBe("true");
    expect(screen.getByTestId("locale").textContent).toBe("de");
    expect(screen.getByRole("heading").textContent).toBe("Willkommen");

    release();
    await wait(10);
    expect(screen.getByTestId("loading").textContent).toBe("false");
    expect(screen.getByTestId("locale").textContent).toBe("fr");
    expect(screen.getByRole("heading").textContent).toBe("Bienvenue");
  });

  it("lets the latest switch win when an earlier one resolves late", async () => {
    const server = fakeServer({ de: { title: "Willkommen" }, fr: { title: "Bienvenue" } });
    render(Provider, { options: { ...base, locale: "de", pollInterval: 0, fetch: server.fetch } });
    await wait(10);

    const release = server.hold();
    await fireEvent.click(screen.getByRole("button", { name: "French" }));
    await fireEvent.click(screen.getByRole("button", { name: "German" }));
    release();
    await wait(10);
    expect(screen.getByTestId("locale").textContent).toBe("de");
    expect(screen.getByTestId("loading").textContent).toBe("false");
    expect(screen.getByRole("heading").textContent).toBe("Willkommen");
  });

  it("stops polling when the provider is destroyed", async () => {
    const server = fakeServer({ de: { title: "Willkommen" } });
    const { unmount } = render(Provider, {
      options: { ...base, locale: "de", pollInterval: 10, fetch: server.fetch },
    });
    await wait(35);
    unmount();
    const count = server.requests.length;
    expect(count).toBeGreaterThan(1);
    await wait(40);
    expect(server.requests.length).toBe(count);
  });

  it("explains how to fix a missing provider", () => {
    expect(() => render(Greeting)).toThrow(/Call setTranslator\(\)/);
  });
});
