import { createTranslateClient } from "@lucent-translate/svelte";
import { translateConfig } from "$lib/i18n";
import type { LayoutServerLoad } from "./$types";

// Fetch on the server so the first HTML response is already translated; the
// snapshot is serialized into the page and seeds the browser-side translator.
export const load: LayoutServerLoad = async ({ fetch, url }) => {
  const config = translateConfig();
  const locale = url.searchParams.get("lang") ?? config.fallbackLocale;
  const client = createTranslateClient({ ...config, fetch, pollInterval: 0 });
  await client.load(locale);
  return { locale, messages: client.snapshot() };
};
