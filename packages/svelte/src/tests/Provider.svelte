<script lang="ts">
  import { setTranslator, type TranslatorOptions } from "../lib/index.js";
  import Greeting from "./Greeting.svelte";

  let { options }: { options: TranslatorOptions } = $props();
  // svelte-ignore state_referenced_locally
  setTranslator(options);
</script>

<Greeting />
