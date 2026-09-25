<script setup lang="ts">
const { t, locale } = useTranslate();
</script>

<template>
  <main>
    <h1>{{ t("home.title") }}</h1>
    <p>{{ t("home.subtitle", { name: "Ada" }) }}</p>
    <span id="locale">{{ locale }}</span>
  </main>
</template>
