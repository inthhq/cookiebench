import { c15tHandle } from "@c15t/svelte/kit";

// manifest() mode (the default): the server resolves each visitor from the
// policy consentManifest() bundled at build time. Saves go to the backend.
export const handle = c15tHandle({
  backendURL: "https://benchmarks-inth.inth.app",
});
