import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { generate } from "../src/generate";
import { keysResponse } from "./fixture";

describe("generate", () => {
  it("writes a TypeScript augmentation of TranslationKeys", () => {
    const ts = generate(keysResponse, "ts");
    expect(ts).toContain('declare module "@lucent-translate/sdk" {');
    expect(ts).toContain('    "checkout.pay": {};');
    expect(ts).toContain('    "home.greeting": { name: string | number };');
    expect(ts).toContain('    "items.count": { count: string | number; "0": string | number };');
    expect(ts).toContain("     * Keep it short *\\/ really.");
    expect(ts).toContain("    /** Page heading */");
  });

  it("writes PHP constants that pass php -l", () => {
    const php = generate(keysResponse, "php", { phpNamespace: "App\\Translation", phpClass: "TranslationKeys" });
    expect(php).toContain("namespace App\\Translation;");
    expect(php).toContain("final class TranslationKeys");
    expect(php).toContain("public const HOME_GREETING = 'home.greeting';");
    expect(php).toContain("public const LEGACY_KEY_NAME = 'legacy-key_name';");
    const file = join(mkdtempSync(join(tmpdir(), "lt-php-")), "Keys.php");
    writeFileSync(file, php);
    expect(execFileSync("php", ["-l", file]).toString()).toContain("No syntax errors");
  });

  it("writes Rust constants that compile", () => {
    const rust = generate(keysResponse, "rust");
    expect(rust).toContain('pub const HOME_TITLE: &str = "home.title";');
    expect(rust).toContain("/// Params: {name}");
    const dir = mkdtempSync(join(tmpdir(), "lt-rs-"));
    writeFileSync(join(dir, "keys.rs"), rust);
    execFileSync("rustc", ["--edition", "2024", "--crate-type", "lib", "--emit", "metadata", "-D", "warnings", "--out-dir", dir, join(dir, "keys.rs")]);
  });

  it("refuses keys that collide as constant names", () => {
    const clash = { ...keysResponse, keys: [
      { key: "home.title", description: null, placeholders: [] },
      { key: "home_title", description: null, placeholders: [] },
    ] };
    expect(() => generate(clash, "php")).toThrow(/"home.title" and "home_title" both become the constant HOME_TITLE/);
  });
});
