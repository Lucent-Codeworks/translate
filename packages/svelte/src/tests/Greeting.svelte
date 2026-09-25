<script lang="ts">
  import { getTranslator } from "../lib/index.js";

  const i18n = getTranslator();
</script>

<h1>{i18n.t("title")}</h1>
<p>{i18n.t("greeting", { name: "Ada" })}</p>
<span data-testid="locale">{i18n.locale}</span>
<span data-testid="loading">{i18n.loading}</span>
<button onclick={() => i18n.setLocale("fr")}>French</button>
