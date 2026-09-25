<script setup lang="ts">
const { t, locale, loading, setLocale } = useTranslate();
const languages = ["en", "de", "fr"];

useHead({ title: () => t("home.title"), htmlAttrs: { lang: locale } });
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
