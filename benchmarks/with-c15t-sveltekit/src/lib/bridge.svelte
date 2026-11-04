<script lang="ts">
  import { getConsentKernel } from "@c15t/svelte";
  import { installPageInteraction, updateBridge } from "@cookiebench/fixture-support";
  import { onMount } from "svelte";

  const kernel = getConsentKernel();
  onMount(() => {
    installPageInteraction();
    updateBridge(kernel.getSnapshot());
    const unsubscribe = kernel.subscribe(updateBridge);
    const reopen = document.querySelector("#reopen-preferences");
    const withdraw = document.querySelector("#withdraw-consent");
    const open = () => kernel.set.activeUI("dialog");
    const reject = () => void kernel.commands.save("none");
    reopen?.addEventListener("click", open);
    withdraw?.addEventListener("click", reject);
    return () => {
      unsubscribe();
      reopen?.removeEventListener("click", open);
      withdraw?.removeEventListener("click", reject);
    };
  });
</script>
