import { describe, expect, it } from "vitest";
import { flattenMessages, nestMessages, NestingConflictError } from "./json-format";

describe("flattenMessages", () => {
  it("accepts flat and nested keys", () => {
    const { messages, skipped } = flattenMessages({
      "home.title": "Welcome",
      checkout: { pay: "Pay now", errors: { card: "Card declined" } },
    });
    expect(Object.fromEntries(messages)).toEqual({
      "home.title": "Welcome",
      "checkout.pay": "Pay now",
      "checkout.errors.card": "Card declined",
    });
    expect(skipped).toEqual([]);
  });

  it("skips unsupported values, invalid keys, empty values and duplicates", () => {
    const { messages, skipped } = flattenMessages({
      ok: "fine",
      count: 3,
      list: ["a"],
      nothing: null,
      "bad key": "x",
      empty: "",
      "a.b": "flat",
      a: { b: "nested" },
    });
    expect(Object.fromEntries(messages)).toEqual({ ok: "fine", "a.b": "flat" });
    expect(skipped).toEqual([
      { key: "count", reason: "unsupported value (number)" },
      { key: "list", reason: "unsupported value (array)" },
      { key: "nothing", reason: "unsupported value (null)" },
      { key: "bad key", reason: "invalid key name" },
      { key: "empty", reason: "empty value" },
      { key: "a.b", reason: "defined more than once" },
    ]);
  });

  it("rejects non-object JSON", () => {
    expect(() => flattenMessages(["a"])).toThrow("JSON object");
    expect(() => flattenMessages("a")).toThrow("JSON object");
    expect(() => flattenMessages(null)).toThrow("JSON object");
  });
});

describe("nestMessages", () => {
  it("nests dotted keys and round-trips through flattenMessages", () => {
    const flat = { "home.title": "Welcome", "home.subtitle": "Hi", "checkout.pay": "Pay", top: "Top" };
    const nested = nestMessages(Object.entries(flat));
    expect(nested).toEqual({
      home: { title: "Welcome", subtitle: "Hi" },
      checkout: { pay: "Pay" },
      top: "Top",
    });
    expect(Object.fromEntries(flattenMessages(nested).messages)).toEqual(flat);
  });

  it("throws when a key is both a value and a prefix", () => {
    expect(() => nestMessages([["home", "x"], ["home.title", "y"]])).toThrow(NestingConflictError);
    expect(() => nestMessages([["home.title", "y"], ["home", "x"]])).toThrow(NestingConflictError);
  });
});
