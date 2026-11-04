<script lang="ts">
  import { installPageInteraction } from "@cookiebench/fixture-support";
  import { pageHTML } from "@cookiebench/fixture-support/page";
  import { onMount } from "svelte";

  onMount(installPageInteraction);
</script>

{@html pageHTML}
