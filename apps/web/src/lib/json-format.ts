import { translationKeyName } from "./validation";

export type Skipped = { key: string; reason: string };

/**
 * Turns flat (`{"a.b": "x"}`) or nested (`{"a": {"b": "x"}}`) translation JSON
 * into a flat key → value map. Anything that isn't a string or an object
 * (numbers, arrays, null) is skipped, as are invalid key names and empty values.
 */
export function flattenMessages(input: unknown) {
  const messages = new Map<string, string>();
  const skipped: Skipped[] = [];

  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new Error("The file must contain a JSON object");
  }

  const walk = (obj: Record<string, unknown>, prefix: string) => {
    for (const [part, value] of Object.entries(obj)) {
      const key = prefix ? `${prefix}.${part}` : part;
      if (typeof value === "string") {
        if (!translationKeyName.safeParse(key).success) {
          skipped.push({ key, reason: "invalid key name" });
        } else if (value === "") {
          skipped.push({ key, reason: "empty value" });
        } else if (messages.has(key)) {
          skipped.push({ key, reason: "defined more than once" });
        } else {
          messages.set(key, value);
        }
      } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        walk(value as Record<string, unknown>, key);
      } else {
        const type = Array.isArray(value) ? "array" : value === null ? "null" : typeof value;
        skipped.push({ key, reason: `unsupported value (${type})` });
      }
    }
  };
  walk(input as Record<string, unknown>, "");

  return { messages, skipped };
}

type Nested = { [key: string]: string | Nested };

/**
 * Builds nested JSON from dotted keys. Fails when a key is both a value and a
 * prefix of another key (e.g. "home" and "home.title"), which JSON can't express.
 */
export function nestMessages(entries: Iterable<[string, string]>): Nested {
  const root: Nested = {};
  for (const [key, value] of entries) {
    const parts = key.split(".");
    let node = root;
    parts.forEach((part, i) => {
      const isLeaf = i === parts.length - 1;
      const existing = node[part];
      if (isLeaf) {
        if (existing !== undefined) throw new NestingConflictError(key);
        node[part] = value;
      } else {
        if (typeof existing === "string") throw new NestingConflictError(key);
        node = (node[part] ??= {}) as Nested;
      }
    });
  }
  return root;
}

export class NestingConflictError extends Error {
  constructor(public key: string) {
    super(`"${key}" conflicts with another key, so it can't be exported as nested JSON`);
  }
}
