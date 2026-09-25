import { describe, expect, it } from "vitest";
import { extractPlaceholders } from "./placeholders";

describe("extractPlaceholders", () => {
  it("finds unique names in order", () => {
    expect(extractPlaceholders("Hi {name}, {count} new, {name}!")).toEqual(["name", "count"]);
  });

  it("ignores malformed braces", () => {
    expect(extractPlaceholders("{ } {} {na me} {ok_1} {unclosed")).toEqual(["ok_1"]);
    expect(extractPlaceholders("No placeholders")).toEqual([]);
  });
});
