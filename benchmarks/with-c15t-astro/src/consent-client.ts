import type { C15tClientOptionsExtension } from "@c15t/astro";
import {
  controlledWorkload,
  initializeBridge,
} from "@cookiebench/fixture-support";

initializeBridge();
export default {
  scripts: controlledWorkload(),
} satisfies C15tClientOptionsExtension;
