import { loadTranslations } from "@lucent-translate/react/server";
import { cache } from "react";
import "server-only";

export { languages } from "./i18n-shared";

function required(name: string, value: string | undefined) {
  if (!value) throw new Error(`${name} is not set. Copy .env.example to .env and fill it in.`);
  return value;
}

/** Plain, serializable options, so a Server Component can pass them to the provider. */
export function translateConfig() {
  return {
    baseUrl: required("NEXT_PUBLIC_TRANSLATE_URL", process.env.NEXT_PUBLIC_TRANSLATE_URL),
    project: required("NEXT_PUBLIC_TRANSLATE_PROJECT", process.env.NEXT_PUBLIC_TRANSLATE_PROJECT),
    apiKey: required("NEXT_PUBLIC_TRANSLATE_KEY", process.env.NEXT_PUBLIC_TRANSLATE_KEY),
    fallbackLocale: process.env.NEXT_PUBLIC_TRANSLATE_FALLBACK || "en",
    pollInterval: 10_000,
  };
}

/** One fetch per request, shared by the layout, the page and generateMetadata. */
export const getTranslations = cache((locale: string) =>
  loadTranslations({ ...translateConfig(), locale }),
);
