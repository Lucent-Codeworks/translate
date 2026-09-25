<script setup lang="ts">
import { useTranslate } from "@lucent-translate/vue";
import { watchEffect } from "vue";

const { t, locale, loading, setLocale } = useTranslate();
const languages = ["en", "de", "fr"];

watchEffect(() => {
  document.title = t("home.title");
  document.documentElement.lang = locale.value;
});
</script>

<template>
  <main>
    <h1>{{ t("home.title") }}</h1>
    <p>{{ t("home.subtitle", { name: "Ada" }) }}</p>
    <nav style="display: flex; gap: 8px">
      <button
        v-for="code in languages"
        :key="code"
        :disabled="code === locale || loading"
        @click="setLocale(code)"
      >
        {{ code }}
      </button>
    </nav>
  </main>
</template>
