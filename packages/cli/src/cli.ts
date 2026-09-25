import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative, resolve } from "node:path";
import { parseArgs } from "node:util";
import { fetchKeys } from "./fetch-keys";
import { generate, type Format } from "./generate";

const HELP = `Usage: lucent-translate generate [options]

Fetches your project's keys and writes typed definitions, so misspelled keys
fail at compile time and editors autocomplete them.

Options:
  --url <url>            Lucent Translate instance      (env LUCENT_TRANSLATE_URL)
  --project <slug>       Project slug                   (env LUCENT_TRANSLATE_PROJECT)
  --key <api key>        Project API key                (env LUCENT_TRANSLATE_API_KEY)
  --out <file>           Output file (default: translation-keys.d.ts)
  --format <ts|php|rust> Output format (default: from --out extension, else ts)
  --php-namespace <ns>   Namespace for the PHP class
  --php-class <name>     PHP class name (default: Keys)
  --check                Don't write; exit 1 if the file is out of date (for CI)
  -h, --help             Show this help

Environment variables are also read from a .env file in the current directory.`;

const DEFAULT_OUT: Record<Format, string> = {
  ts: "translation-keys.d.ts",
  php: "Keys.php",
  rust: "translation_keys.rs",
};

function inferFormat(out: string | undefined): Format {
  if (!out) return "ts";
  const ext = extname(out);
  return ext === ".php" ? "php" : ext === ".rs" ? "rust" : "ts";
}

async function main(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      url: { type: "string" },
      project: { type: "string" },
      key: { type: "string" },
      out: { type: "string" },
      format: { type: "string" },
      "php-namespace": { type: "string" },
      "php-class": { type: "string" },
      check: { type: "boolean", default: false },
      help: { type: "boolean", short: "h", default: false },
    },
  });

  if (values.help || positionals[0] !== "generate") {
    console.log(HELP);
    return values.help ? 0 : 1;
  }

  try {
    process.loadEnvFile?.(".env");
  } catch {
    // No .env file; flags and the real environment still apply.
  }

  const format = (values.format ?? inferFormat(values.out)) as Format;
  if (!["ts", "php", "rust"].includes(format)) {
    console.error(`Unknown --format "${format}". Use ts, php or rust.`);
    return 1;
  }
  const baseUrl = values.url ?? process.env.LUCENT_TRANSLATE_URL;
  const project = values.project ?? process.env.LUCENT_TRANSLATE_PROJECT;
  const apiKey = values.key ?? process.env.LUCENT_TRANSLATE_API_KEY;
  const missing = [
    !baseUrl && "--url (or LUCENT_TRANSLATE_URL)",
    !project && "--project (or LUCENT_TRANSLATE_PROJECT)",
    !apiKey && "--key (or LUCENT_TRANSLATE_API_KEY)",
  ].filter(Boolean);
  if (missing.length) {
    console.error(`Missing ${missing.join(", ")}.`);
    return 1;
  }

  const out = resolve(values.out ?? DEFAULT_OUT[format]);
  const shown = relative(process.cwd(), out) || out;
  const data = await fetchKeys({ baseUrl: baseUrl!, project: project!, apiKey: apiKey! });
  const content = generate(data, format, {
    phpNamespace: values["php-namespace"],
    phpClass: values["php-class"],
  });
  const current = await readFile(out, "utf8").catch(() => undefined);

  if (values.check) {
    if (current === content) {
      console.log(`${shown} is up to date (${data.keys.length} keys).`);
      return 0;
    }
    console.error(`${shown} is out of date. Run \`lucent-translate generate\` and commit the result.`);
    return 1;
  }

  if (current !== content) {
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, content);
  }
  console.log(`${current === content ? "Unchanged" : "Wrote"} ${shown}: ${data.keys.length} keys from "${data.project}".`);

  if (format === "ts") warnIfSdkUnresolvable(dirname(out));
  return 0;
}

/**
 * The generated types augment `@lucent-translate/sdk`. With strict installs
 * (pnpm), apps that only depend on a framework binding can't resolve it.
 */
function warnIfSdkUnresolvable(from: string) {
  // Walk up node_modules like TypeScript does. (Node's resolver would also
  // honour NODE_PATH, which pnpm sets for scripts but TypeScript ignores.)
  for (let dir = resolve(from); ; dir = dirname(dir)) {
    if (existsSync(join(dir, "node_modules/@lucent-translate/sdk/package.json"))) return;
    if (dirname(dir) === dir) break;
  }
  console.warn(
    "\nNote: @lucent-translate/sdk isn't resolvable from here, so the generated types won't apply.\n" +
      "Add it to your app's dependencies (e.g. `pnpm add @lucent-translate/sdk`).",
  );
}

main(process.argv.slice(2)).then(
  (code) => process.exit(code),
  (err: Error) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  },
);
