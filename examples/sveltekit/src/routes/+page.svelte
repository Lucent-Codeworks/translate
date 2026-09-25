<script lang="ts">
  import { getTranslator } from "@lucent-translate/svelte";

  const i18n = getTranslator();
  const languages = ["en", "de", "fr"];
</script>

<main>
  <h1>{i18n.t("home.title")}</h1>
  <p>{i18n.t("home.subtitle", { name: "Ada" })}</p>

  <nav>
    {#each languages as code (code)}
      <button disabled={i18n.locale === code || i18n.loading} onclick={() => i18n.setLocale(code)}>
        {code}
      </button>
    {/each}
  </nav>
</main>
