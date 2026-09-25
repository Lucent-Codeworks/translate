export default defineNuxtConfig({
  modules: ["@lucent-translate/nuxt"],
  // Values here are defaults; override any of them at runtime with
  // NUXT_PUBLIC_LUCENT_TRANSLATE_BASE_URL, _PROJECT, _API_KEY, ... (see .env.example).
  lucentTranslate: {
    defaultLocale: "en",
    fallbackLocale: "en",
    pollInterval: 10_000,
  },
  compatibilityDate: "2026-09-01",
});
