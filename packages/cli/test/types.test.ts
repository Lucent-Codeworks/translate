import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, it } from "vitest";
import { generate } from "../src/generate";
import { keysResponse } from "./fixture";

it("generated types make t() reject unknown keys and wrong params in every binding", () => {
  const dir = join(__dirname, "types");
  writeFileSync(join(dir, "translation-keys.d.ts"), generate(keysResponse, "ts"));
  try {
    execFileSync(join(__dirname, "../node_modules/.bin/tsc"), ["-p", join(dir, "tsconfig.json")], { encoding: "utf8" });
  } catch (err) {
    expect.fail((err as { stdout: string }).stdout);
  }
});
