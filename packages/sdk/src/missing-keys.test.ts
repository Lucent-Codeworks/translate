import { afterEach, describe, expect, it, vi } from "vitest";
import { createTranslateClient, type MissingKeyInfo } from "./index";
import { suggestKey } from "./missing-keys";

const options = { baseUrl: "https://t.example.com", project: "demo", apiKey: "lt_test", pollInterval: 0 };
const seeded = {
  en: { "home.title": "Welcome", "home.subtitle": "Hi", "checkout.pay": "Pay" },
  de: { "home.title": "Willkommen" },
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("missing key reporting", () => {
  it("reports unknown keys once, with a suggestion", () => {
    const reports: MissingKeyInfo[] = [];
    const client = createTranslateClient({ ...options, messages: seeded, onMissingKey: (i) => reports.push(i) });

    expect(client.t("de", "home.titel")).toBe("home.titel");
    client.t("de", "home.titel");
    client.t("en", "totally.unrelated.key");
    expect(reports).toEqual([
      { key: "home.titel", locale: "de", suggestion: "home.title" },
      { key: "totally.unrelated.key", locale: "en", suggestion: undefined },
    ]);
  });

  it("doesn't report keys that are merely untranslated in one locale", () => {
    const onMissingKey = vi.fn();
    const client = createTranslateClient({ ...options, messages: seeded, onMissingKey });
    expect(client.t("de", "checkout.pay")).toBe("checkout.pay"); // no fallback configured
    expect(onMissingKey).not.toHaveBeenCalled();
  });

  it("doesn't report before anything has loaded", () => {
    const onMissingKey = vi.fn();
    const client = createTranslateClient({ ...options, onMissingKey });
    client.t("de", "home.title");
    expect(onMissingKey).not.toHaveBeenCalled();
  });

  it("warns on the console in development by default", () => {
    vi.stubEnv("NODE_ENV", "development");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    createTranslateClient({ ...options, messages: seeded }).t("de", "home.titel");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Unknown key "home.titel"'));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Did you mean "home.title"?'));
  });

  it("stays quiet in production builds or when disabled", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("NODE_ENV", "production");
    createTranslateClient({ ...options, messages: seeded }).t("de", "home.titel");
    vi.stubEnv("NODE_ENV", "development");
    createTranslateClient({ ...options, messages: seeded, onMissingKey: false }).t("de", "home.titel");
    expect(warn).not.toHaveBeenCalled();
  });

  it("doesn't mistake built-in object properties for keys", () => {
    const client = createTranslateClient({ ...options, messages: seeded, fallbackLocale: "en", onMissingKey: false });
    expect(client.t("de", "constructor")).toBe("constructor");
    expect(client.t("de", "toString")).toBe("toString");
  });
});

describe("suggestKey", () => {
  const keys = ["home.title", "home.subtitle", "checkout.pay", "nav.settings"];
  it("finds close keys and ignores distant ones", () => {
    expect(suggestKey("home.titel", keys)).toBe("home.title");
    expect(suggestKey("chekout.pay", keys)).toBe("checkout.pay");
    expect(suggestKey("nav.setings", keys)).toBe("nav.settings");
    expect(suggestKey("profile.avatar", keys)).toBeUndefined();
    expect(suggestKey("x", [])).toBeUndefined();
  });
});
