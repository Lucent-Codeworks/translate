# @lucent-translate/cli

Generates typed translation keys from a Lucent Translate project, so a
misspelled key fails at compile time instead of rendering as raw text, and
editors autocomplete key names.

```bash
pnpm add -D @lucent-translate/cli
pnpm add @lucent-translate/sdk   # the generated types extend it

LUCENT_TRANSLATE_URL=https://translate.example.com \
LUCENT_TRANSLATE_PROJECT=my-app \
LUCENT_TRANSLATE_API_KEY=lt_… \
  pnpm lucent-translate generate --out src/translation-keys.d.ts
```

Settings come from flags, environment variables, or a `.env` file:

| Flag | Env var | |
| --- | --- | --- |
| `--url` | `LUCENT_TRANSLATE_URL` | Your instance |
| `--project` | `LUCENT_TRANSLATE_PROJECT` | Project slug |
| `--key` | `LUCENT_TRANSLATE_API_KEY` | Project API key |
| `--out` | | Output file (default `translation-keys.d.ts`) |
| `--format` | | `ts`, `php` or `rust` (default: from the `--out` extension) |
| `--php-namespace`, `--php-class` | | PHP namespace and class name (default `Keys`) |
| `--check` | | Don't write; exit 1 if the file is out of date |

Commit the generated file and run `lucent-translate generate --check` in CI,
so a key renamed or removed in Lucent Translate fails the build wherever the
old name is still used.

## TypeScript

The output augments `TranslationKeys` in `@lucent-translate/sdk`. Every JS
binding (core, React, Svelte, Vue, Nuxt) then types `t()`:

```ts
t("home.title");                         // ok
t("home.titel");                         // error: not a known key
t("home.greeting");                      // error: needs { name }
t("home.greeting", { name: "Ada" });     // ok
```

Descriptions from Lucent Translate appear as JSDoc when hovering a key. For
genuinely dynamic keys, assert the type: `t(key as TranslationKey)`.

The file must be inside your `tsconfig` `include`, and `@lucent-translate/sdk`
must be resolvable from your app. With pnpm, add it as a direct dependency;
the CLI warns if it isn't.

## PHP and Rust

```bash
lucent-translate generate --out src/Translation/Keys.php --php-namespace 'App\Translation'
lucent-translate generate --out src/translation_keys.rs
```

These write constants (`Keys::HOME_TITLE`, `translation_keys::HOME_TITLE`) to
use instead of string literals.
