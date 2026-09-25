<script lang="ts">
  import { setTranslator } from "@lucent-translate/svelte";
  import { translateConfig } from "$lib/i18n";

  let { data, children } = $props();

  // svelte-ignore state_referenced_locally
  setTranslator({ ...translateConfig(), locale: data.locale, messages: data.messages });
</script>

{@render children()}
