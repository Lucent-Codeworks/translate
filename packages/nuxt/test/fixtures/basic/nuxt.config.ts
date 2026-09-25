import LucentTranslate from "../../../src/module";

export default defineNuxtConfig({
  modules: [LucentTranslate],
  lucentTranslate: {
    // baseUrl comes from NUXT_PUBLIC_LUCENT_TRANSLATE_BASE_URL (set by the test).
    project: "demo",
    apiKey: "lt_test",
    defaultLocale: "en",
    fallbackLocale: "en",
  },
});
