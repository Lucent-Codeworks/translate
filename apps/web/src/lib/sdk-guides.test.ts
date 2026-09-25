import { describe, expect, it } from "vitest";
import { REDACTED_KEY, sdkGuides } from "./sdk-guides";

const ctx = {
  origin: "https://translate.example.com",
  project: "demo-app",
  baseLocale: "en",
  exampleLocale: "de",
  sampleKey: "home.title",
  paramSample: { key: "home.greeting", params: ["name"] },
};

describe("sdkGuides", () => {
  const guides = sdkGuides(ctx);

  it("covers every SDK plus typed keys", () => {
    expect(guides.map((g) => g.id)).toEqual(["js", "react", "svelte", "vue", "nuxt", "php", "rust", "typed-keys"]);
    for (const guide of guides) expect(guide.blocks[0].title).toBe("Install");
  });

  it("fills in the project and never a real key", () => {
    for (const guide of guides) {
      const all = guide.blocks.map((b) => b.code).join("\n");
      expect(all, guide.id).toContain("https://translate.example.com");
      expect(all, guide.id).toContain("demo-app");
      expect(all.match(/lt_[A-Za-z0-9_-]{6,}/), guide.id).toBeNull();
    }
    expect(guides.find((g) => g.id === "js")!.blocks[1].code).toContain(`apiKey: "${REDACTED_KEY}"`);
  });

  it("uses the project's own keys and params", () => {
    const js = guides.find((g) => g.id === "js")!.blocks[1].code;
    expect(js).toContain('i18n.t("de", "home.title");');
    expect(js).toContain('i18n.t("de", "home.greeting", { name: "…" });');
    const php = guides.find((g) => g.id === "php")!.blocks[1].code;
    expect(php).toContain("echo $t('home.greeting', ['name' => '…']);");
    const rust = guides.find((g) => g.id === "rust")!.blocks[1].code;
    expect(rust).toContain('client.t_with("de", "home.greeting", [("name", "…")]);');
    const typed = guides.find((g) => g.id === "typed-keys")!.blocks.at(-1)!.code;
    expect(typed).toMatch(/t\("home\.\w+"\); \/\/ ✗ error/);
    expect(typed).not.toContain('t("home.title"); // ✗');
  });

  it("omits param examples when the project has none", () => {
    const js = sdkGuides({ ...ctx, paramSample: undefined }).find((g) => g.id === "js")!.blocks[1].code;
    expect(js).not.toContain("greeting");
  });
});
