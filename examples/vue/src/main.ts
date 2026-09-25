import { createTranslate } from "@lucent-translate/vue";
import { createApp } from "vue";
import App from "./App.vue";

const env = import.meta.env;
for (const name of ["VITE_TRANSLATE_URL", "VITE_TRANSLATE_PROJECT", "VITE_TRANSLATE_KEY"] as const) {
  if (!env[name]) throw new Error(`${name} is not set. Copy .env.example to .env and fill it in.`);
}

const translate = createTranslate({
  baseUrl: env.VITE_TRANSLATE_URL,
  project: env.VITE_TRANSLATE_PROJECT,
  apiKey: env.VITE_TRANSLATE_KEY,
  locale: localStorage.getItem("lang") ?? "en",
  fallbackLocale: "en",
  pollInterval: 10_000,
  onLocaleChange: (locale) => localStorage.setItem("lang", locale),
});

createApp(App).use(translate).mount("#app");
