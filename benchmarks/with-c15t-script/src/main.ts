import type { ConsentClient, ConsentClientOptions } from "@c15t/browser";
import {
  controlledScript,
  initializeBridge,
  updateBridge,
} from "@cookiebench/fixture-support";

import { requiredElement } from "./dom.ts";
import { initializePage } from "./page.ts";

declare global {
  interface Window {
    c15t: { init: (options: ConsentClientOptions) => ConsentClient };
  }
}
initializePage();
initializeBridge();
const client = window.c15t.init({
  backendURL: "https://benchmarks-inth.inth.app",
  consentCategories: ["necessary", "measurement", "marketing"],
  mode: "hosted",
  scripts: Array.from(
    { length: Number(new URL(location.href).searchParams.get("scripts") ?? 2) },
    (_, index) => {
      const category = index % 2 === 0 ? "measurement" : "marketing";
      return {
        category,
        id: `script-${index}`,
        src: controlledScript(`script-${index}`, category),
      };
    }
  ),
});
client.subscribe(updateBridge);
updateBridge(client.getSnapshot());
requiredElement("#reopen-preferences").addEventListener("click", () =>
  client.openDialog()
);
requiredElement("#withdraw-consent").addEventListener("click", () => {
  void client.rejectAll();
});
