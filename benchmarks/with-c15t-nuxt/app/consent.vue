<script setup lang="ts">
import { createScriptLoader } from "@c15t/core/modules/script-loader";
import {
  controlledWorkload,
  installPageInteraction,
  updateBridge,
} from "@cookiebench/fixture-support";
import { pageHTML, pageCSS } from "@cookiebench/fixture-support/page";
import { onMounted, onUnmounted, watch } from "vue";

import { useConsentKernel, useConsentSnapshot } from "#c15t/composables";

const kernel = useConsentKernel();
const snapshot = useConsentSnapshot();
let loader: ReturnType<typeof createScriptLoader> | undefined;
onMounted(() => {
  installPageInteraction();
  updateBridge(snapshot.value);
  loader = createScriptLoader({ kernel, scripts: controlledWorkload() });
});
watch(snapshot, (value) => {
  if (import.meta.client) {
    updateBridge(value);
  }
});
onUnmounted(() => loader?.dispose());
</script>
<template>
  <component is="style">{{ pageCSS }}</component>
  <div v-html="pageHTML"></div>
  <button
    id="reopen-preferences"
    type="button"
    @click="kernel.set.activeUI('dialog')"
  >
    Privacy settings
  </button>
  <button
    id="withdraw-consent"
    type="button"
    @click="kernel.commands.save('none')"
  >
    Withdraw optional consent
  </button>
  <ConsentRoot />
</template>
