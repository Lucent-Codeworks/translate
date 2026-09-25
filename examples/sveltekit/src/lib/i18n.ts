import { env } from "$env/dynamic/public";

function required(name: "PUBLIC_TRANSLATE_URL" | "PUBLIC_TRANSLATE_PROJECT" | "PUBLIC_TRANSLATE_KEY") {
  const value = env[name];
  if (!value) throw new Error(`${name} is not set. Copy .env.example to .env and fill it in.`);
  return value;
}

// Read at request time (not import time) so `vite build` works without a .env.
export function translateConfig() {
  return {
    baseUrl: required("PUBLIC_TRANSLATE_URL"),
    project: required("PUBLIC_TRANSLATE_PROJECT"),
    apiKey: required("PUBLIC_TRANSLATE_KEY"),
    fallbackLocale: env.PUBLIC_TRANSLATE_FALLBACK || "en",
    pollInterval: 10_000,
  };
}
