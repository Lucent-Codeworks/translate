import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { fileURLToPath } from "node:url";
import { $fetch, setup } from "@nuxt/test-utils/e2e";
import { afterAll, describe, expect, it } from "vitest";

// Minimal stand-in for a Lucent Translate instance.
const data: Record<string, Record<string, string>> = {
  en: { "home.title": "Welcome", "home.subtitle": "Hello {name}" },
  de: { "home.title": "Willkommen" },
};
const seenAuth = new Set<string>();
const translateServer: Server = createServer((req, res) => {
  seenAuth.add(req.headers.authorization ?? "");
  const match = req.url?.match(/^\/api\/v1\/projects\/demo\/locales\/([^/?]+)$/);
  const messages = match?.[1] ? data[decodeURIComponent(match[1])] : undefined;
  res.writeHead(messages ? 200 : 404, { "Content-Type": "application/json" });
  res.end(JSON.stringify(messages ?? { error: "not found" }));
});
await new Promise<void>((r) => translateServer.listen(0, "127.0.0.1", r));
process.env.NUXT_PUBLIC_LUCENT_TRANSLATE_BASE_URL = `http://127.0.0.1:${(translateServer.address() as AddressInfo).port}`;
afterAll(() => translateServer.close());

describe("SSR", async () => {
  await setup({ rootDir: fileURLToPath(new URL("./fixtures/basic", import.meta.url)) });

  const text = (html: string, selector: "h1" | "p" | "locale") => {
    const re = selector === "locale" ? /<span id="locale">([^<]*)<\/span>/ : new RegExp(`<${selector}>([^<]*)</${selector}>`);
    return html.match(re)?.[1];
  };

  it("renders the default locale", async () => {
    const html = await $fetch<string>("/");
    expect(text(html, "h1")).toBe("Welcome");
    expect(text(html, "p")).toBe("Hello Ada");
    expect(seenAuth.has("Bearer lt_test")).toBe(true);
  });

  it("renders the locale remembered in the cookie, falling back for missing keys", async () => {
    const html = await $fetch<string>("/", { headers: { cookie: "lt_locale=de" } });
    expect(text(html, "locale")).toBe("de");
    expect(text(html, "h1")).toBe("Willkommen");
    expect(text(html, "p")).toBe("Hello Ada");
    // Messages travel in the payload so hydration needs no fetch.
    expect(html).toContain("Willkommen");
    expect(html).toContain("lucent-translate:messages");
  });

  it("falls back to the default locale when the cookie names an unknown one", async () => {
    const html = await $fetch<string>("/", { headers: { cookie: "lt_locale=xx" } });
    expect(text(html, "locale")).toBe("en");
    expect(text(html, "h1")).toBe("Welcome");
  });
});
