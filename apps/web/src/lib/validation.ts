import { z } from "zod";

/** A BCP 47 language tag, normalized to canonical casing (e.g. "pt-br" → "pt-BR"). */
export const localeCode = z
  .string()
  .trim()
  .transform((value, ctx) => {
    try {
      const [canonical] = Intl.getCanonicalLocales(value);
      if (canonical) return canonical;
    } catch {}
    ctx.addIssue({ code: "custom", message: "Use a language code like en, de or pt-BR" });
    return z.NEVER;
  });

/** Translation keys: dot/underscore/dash separated segments, e.g. "checkout.pay_button". */
export const translationKeyName = z
  .string()
  .trim()
  .min(1, "Key is required")
  .max(200)
  .regex(/^[A-Za-z0-9_-]+(\.[A-Za-z0-9_-]+)*$/, "Use letters, numbers, _ and -, separated by dots");
