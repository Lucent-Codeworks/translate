/**
 * `{name}` placeholders in a translation, in order of first appearance. Uses
 * the same pattern as the SDKs' interpolation, so generated types match what
 * `t()` will actually replace.
 */
export function extractPlaceholders(text: string): string[] {
  return [...new Set(Array.from(text.matchAll(/\{(\w+)\}/g), (m) => m[1]))];
}
