// Bridge for the backend-served tag. The config is queued inline before the
// tag, as a site would; this module runs after c15t.js and only observes.
import { initializeBridge, updateBridge } from "@cookiebench/fixture-support";
import type { PublicSnapshot } from "@cookiebench/fixture-support";

import { requiredElement } from "./dom.ts";
import { initializePage } from "./page.ts";

interface Api {
  getSnapshot: () => PublicSnapshot;
  openDialog: () => void;
  rejectAll: () => Promise<void>;
  subscribe: (listener: (snapshot: PublicSnapshot) => void) => () => void;
}
const api = (window as unknown as { c15t: Api }).c15t;

initializePage();
initializeBridge();
api.subscribe(updateBridge);
updateBridge(api.getSnapshot());
requiredElement("#reopen-preferences").addEventListener("click", () =>
  api.openDialog()
);
requiredElement("#withdraw-consent").addEventListener("click", () => {
  void api.rejectAll();
});
