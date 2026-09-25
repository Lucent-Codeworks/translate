import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { keysResponse } from "./fixture";

const cli = join(__dirname, "../dist/cli.js");
let data = keysResponse;
const server = createServer((req, res) => {
  if (req.headers.authorization !== "Bearer lt_test") {
    res.writeHead(401).end('{"error":"Invalid API key"}');
  } else if (req.url === "/api/v1/projects/demo-app/keys") {
    res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(data));
  } else {
    res.writeHead(404).end();
  }
});
let env: NodeJS.ProcessEnv;

beforeAll(async () => {
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  env = {
    ...process.env,
    LUCENT_TRANSLATE_URL: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    LUCENT_TRANSLATE_PROJECT: "demo-app",
    LUCENT_TRANSLATE_API_KEY: "lt_test",
  };
});
afterAll(() => server.close());

// Async spawn: the mock server lives in this process, so a blocking spawn would deadlock.
const run = (args: string[], cwd: string, extraEnv: NodeJS.ProcessEnv = {}) =>
  new Promise<{ code: number | null; out: string }>((done) => {
    const child = spawn(process.execPath, [cli, ...args], { cwd, env: { ...env, ...extraEnv } });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (out += d));
    child.on("close", (code) => done({ code, out }));
  });

describe("lucent-translate generate", () => {
  it("writes the file, then --check tracks whether it is current", async () => {
    const dir = mkdtempSync(join(tmpdir(), "lt-cli-"));
    const first = await run(["generate", "--out", "src/keys.d.ts"], dir);
    expect(first.code).toBe(0);
    expect(first.out).toContain('Wrote src/keys.d.ts: 5 keys from "demo-app".');
    const file = join(dir, "src/keys.d.ts");
    expect(readFileSync(file, "utf8")).toContain('"home.title": {};');

    const mtime = statSync(file).mtimeMs;
    expect((await run(["generate", "--out", "src/keys.d.ts"], dir)).out).toContain("Unchanged");
    expect(statSync(file).mtimeMs).toBe(mtime);
    expect((await run(["generate", "--out", "src/keys.d.ts", "--check"], dir)).code).toBe(0);

    data = { ...keysResponse, keys: [...keysResponse.keys, { key: "new.key", description: null, placeholders: [] }] };
    const stale = await run(["generate", "--out", "src/keys.d.ts", "--check"], dir);
    expect(stale.code).toBe(1);
    expect(stale.out).toContain("out of date");
    data = keysResponse;
  });

  it("infers the format from the extension", async () => {
    const dir = mkdtempSync(join(tmpdir(), "lt-cli-"));
    expect((await run(["generate", "--out", "Keys.php", "--php-namespace", "App"], dir)).code).toBe(0);
    expect(readFileSync(join(dir, "Keys.php"), "utf8")).toContain("namespace App;");
    expect((await run(["generate", "--out", "keys.rs"], dir)).code).toBe(0);
    expect(readFileSync(join(dir, "keys.rs"), "utf8")).toContain("pub const HOME_TITLE");
  });

  it("reads settings from .env", async () => {
    const dir = mkdtempSync(join(tmpdir(), "lt-cli-"));
    writeFileSync(join(dir, ".env"), `LUCENT_TRANSLATE_API_KEY=lt_test\n`);
    expect((await run(["generate"], dir, { LUCENT_TRANSLATE_API_KEY: undefined })).code).toBe(0);
  });

  it("explains auth failures and missing settings", async () => {
    const dir = mkdtempSync(join(tmpdir(), "lt-cli-"));
    const denied = await run(["generate", "--key", "lt_wrong"], dir);
    expect(denied.code).toBe(1);
    expect(denied.out).toContain("API key was rejected");

    const missing = await run(["generate"], dir, { LUCENT_TRANSLATE_URL: "", LUCENT_TRANSLATE_API_KEY: "" });
    expect(missing.code).toBe(1);
    expect(missing.out).toContain("Missing --url (or LUCENT_TRANSLATE_URL), --key (or LUCENT_TRANSLATE_API_KEY)");
  });

  it("warns when the generated types can't reach @lucent-translate/sdk", async () => {
    const dir = mkdtempSync(join(tmpdir(), "lt-cli-"));
    expect((await run(["generate"], dir)).out).toContain("isn't resolvable from here");
  });
});
