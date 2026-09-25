import type { KeysResponse } from "../src/generate";

export const keysResponse: KeysResponse = {
  project: "demo-app",
  baseLocale: "en",
  locales: ["de", "en"],
  keys: [
    { key: "checkout.pay", description: null, placeholders: [] },
    { key: "home.greeting", description: "Shown on the dashboard.\nKeep it short */ really.", placeholders: ["name"] },
    { key: "home.title", description: "Page heading", placeholders: [] },
    { key: "items.count", description: null, placeholders: ["count", "0"] },
    { key: "legacy-key_name", description: null, placeholders: [] },
  ],
};
