<script setup lang="ts">
import { installPageInteraction } from "@cookiebench/fixture-support";
import { pageHTML, pageCSS } from "@cookiebench/fixture-support/page";
import { onMounted } from "vue";

onMounted(installPageInteraction);
</script>
<template>
  <component is="style">{{ pageCSS }}</component>
  <div v-html="pageHTML"></div>
</template>
