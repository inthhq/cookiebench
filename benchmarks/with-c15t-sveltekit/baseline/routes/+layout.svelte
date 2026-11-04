<script lang="ts">
  import { pageCSS } from "@cookiebench/fixture-support/page";

  let { children } = $props();
</script>

<svelte:head><title>Field notes</title>{@html `<style>${pageCSS}</style>`}</svelte:head>
{@render children()}
