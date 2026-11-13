<script setup lang="ts">
import { installPageInteraction } from "@cookiebench/fixture-support";
import { pageHTML, pageCSS } from "@cookiebench/fixture-support/page";
import { onMounted } from "vue";

import { useHead } from "#imports";

// Server-rendered verbatim in <head>, like the other fixtures; a text child
// would be HTML-escaped and break selectors such as `.site-header>a`.
useHead({ style: [{ innerHTML: pageCSS }] });

onMounted(installPageInteraction);
</script>
<template>
  <div v-html="pageHTML"></div>
</template>
