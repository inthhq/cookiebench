<script lang="ts">
  import { page } from "$app/state";
  import Bridge from "#lib/bridge.svelte";
  import { controlledWorkload } from "#lib/workload.ts";
  import { ConsentBanner, ConsentDialog, ConsentRoot } from "@c15t/svelte";
  import { pageCSS } from "@cookiebench/fixture-support/page";

  let { children, data } = $props();
  const scripts = controlledWorkload(page.url);
</script>

<svelte:head><title>Field notes</title>{@html `<style>${pageCSS}</style>`}</svelte:head>
<ConsentRoot
  state={data.consent}
  consentCategories={["necessary", "measurement", "marketing"]}
  {scripts}
>
  {@render children()}
  <Bridge />
  <ConsentBanner />
  <ConsentDialog />
</ConsentRoot>
