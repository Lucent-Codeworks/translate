const displayNames = new Intl.DisplayNames(["en"], { type: "language", fallback: "code" });

/** Human-readable English name for a locale code, e.g. "pt-BR" → "Brazilian Portuguese". */
export function localeName(code: string) {
  try {
    return displayNames.of(code) ?? code;
  } catch {
    return code;
  }
}
