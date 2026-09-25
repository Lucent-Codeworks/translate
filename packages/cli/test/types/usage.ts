// Type-level checks against the generated translation-keys.d.ts.
// Each @ts-expect-error must be an error, or tsc fails ("unused directive").
import { createTranslateClient, type TranslateFunction } from "@lucent-translate/sdk";
import type { UseTranslateResult } from "@lucent-translate/react";
import { loadTranslations } from "@lucent-translate/react/server";
import type { Translator } from "@lucent-translate/svelte";
import type { TranslateState } from "@lucent-translate/vue";

const client = createTranslateClient({ baseUrl: "", project: "", apiKey: "" });
client.t("de", "home.title");
client.t("de", "home.greeting", { name: "Ada" });
client.t("de", "items.count", { count: 3, "0": "x" });
// @ts-expect-error unknown key
client.t("de", "home.titel");
// @ts-expect-error missing required params
client.t("de", "home.greeting");
// @ts-expect-error wrong param name
client.t("de", "home.greeting", { nme: "Ada" });
// @ts-expect-error params for a key without placeholders
client.t("de", "home.title", { name: "Ada" });

declare const react: UseTranslateResult;
declare const svelte: Translator;
declare const vue: TranslateState;
const server = await loadTranslations({ baseUrl: "", project: "", apiKey: "", locale: "de" });

for (const t of [react.t, svelte.t, vue.t, server.t] satisfies TranslateFunction[]) {
  t("checkout.pay");
  t("home.greeting", { name: 1 });
  // @ts-expect-error unknown key
  t("chekout.pay");
  // @ts-expect-error missing params
  t("home.greeting");
}

// Dynamic keys need an explicit assertion.
declare const dynamicKey: string;
// @ts-expect-error plain strings aren't known keys
client.t("de", dynamicKey);
