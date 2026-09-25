export interface MissingKeyInfo {
  key: string;
  locale: string;
  /** The closest existing key, if one is similar enough (likely a typo). */
  suggestion?: string;
}

export type MissingKeyHandler = (info: MissingKeyInfo) => void;

declare const process: { env: Record<string, string | undefined> } | undefined;

/**
 * True unless the bundler marked this a production build. `process.env.NODE_ENV`
 * is written out literally so Vite, webpack, Next.js etc. can replace it;
 * unbundled browser code without `process` counts as production (no warnings).
 */
export function isDevelopment(): boolean {
  try {
    // @ts-expect-error `process` may be replaced at build time or be undefined.
    return process.env.NODE_ENV !== "production";
  } catch {
    return false;
  }
}

export const warnOnMissingKey: MissingKeyHandler = ({ key, locale, suggestion }) => {
  console.warn(
    `[lucent-translate] Unknown key "${key}": it isn't in any loaded locale (asked for "${locale}").` +
      (suggestion ? ` Did you mean "${suggestion}"?` : ""),
  );
};

/** Closest key by edit distance, if within a typo-sized distance. */
export function suggestKey(key: string, candidates: Iterable<string>): string | undefined {
  const limit = Math.max(2, Math.floor(key.length / 4));
  let best: string | undefined;
  let bestDistance = limit + 1;
  for (const candidate of candidates) {
    if (Math.abs(candidate.length - key.length) >= bestDistance) continue;
    const distance = levenshtein(key, candidate, bestDistance);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

/** Edit distance, giving up early once it can't be below `max`. */
function levenshtein(a: string, b: string, max: number): number {
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      rowMin = Math.min(rowMin, current[j]);
    }
    if (rowMin >= max) return max;
    previous = current;
  }
  return previous[b.length];
}
