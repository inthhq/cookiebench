import { hosted, init } from "@c15t/browser/headless";
import {
  controlledScript,
  initializeBridge,
  updateBridge,
} from "@cookiebench/fixture-support";

import { requiredElement } from "./dom.ts";
import { initializePage } from "./page.ts";

initializePage();
initializeBridge();
const style = document.createElement("style");
style.textContent =
  "#banner{position:fixed;bottom:16px;left:16px;right:16px;max-width:720px;padding:24px;background:white;border:1px solid #425b44;box-shadow:0 4px 24px #0002;z-index:10}#banner[hidden],#choices[hidden]{display:none}.actions{display:flex;flex-wrap:wrap;gap:12px}#choices label{display:flex;align-items:center;gap:12px;min-height:44px;cursor:pointer}input{font-size:16px;width:20px;height:20px}input:focus-visible{outline:3px solid #285fc2;outline-offset:4px}button,input{touch-action:manipulation;min-height:44px}button:active{filter:brightness(.9)}";
document.head.append(style);
const banner = requiredElement<HTMLElement>("#banner");
const choices = requiredElement<HTMLFormElement>("#choices");
const feedback = requiredElement<HTMLElement>("#feedback");
const client = init({
  consentCategories: ["necessary", "measurement", "marketing"],
  mode: hosted({ backendURL: "https://benchmarks-inth.inth.app" }),
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
let busy = false;
async function save(action: () => ReturnType<typeof client.acceptAll>) {
  if (busy) {
    return;
  }
  busy = true;
  feedback.textContent = "Saving your choice";
  const buttons = [...banner.querySelectorAll("button")];
  for (const button of buttons) {
    button.disabled = true;
  }
  try {
    const result = await action();
    if (!result.ok) {
      throw new Error("The consent service could not save your choice.");
    }
    feedback.textContent = "Choice saved";
  } catch (error) {
    feedback.textContent =
      error instanceof Error ? error.message : "Could not save your choice.";
    banner.hidden = false;
  } finally {
    busy = false;
    for (const button of buttons) {
      button.disabled = false;
    }
  }
}
client.subscribe((snapshot) => {
  updateBridge(snapshot);
  const wasVisible = !banner.hidden;
  banner.hidden =
    snapshot.activeUI !== "banner" && snapshot.activeUI !== "dialog";
  if (wasVisible && banner.hidden && banner.contains(document.activeElement)) {
    requiredElement("#reopen-preferences").focus();
  }
});
updateBridge(client.getSnapshot());
requiredElement("#accept").addEventListener("click", () => {
  void save(() => client.acceptAll());
});
requiredElement("#reject").addEventListener("click", () => {
  void save(() => client.rejectAll());
});
function openPreferences() {
  client.openDialog();
  banner.hidden = false;
  choices.hidden = false;
  requiredElement<HTMLInputElement>("#measurement").checked =
    client.has("measurement");
  requiredElement<HTMLInputElement>("#marketing").checked =
    client.has("marketing");
  requiredElement("#measurement").focus();
}
requiredElement("#preferences").addEventListener("click", openPreferences);
requiredElement("#reopen-preferences").addEventListener(
  "click",
  openPreferences
);
requiredElement("#withdraw-consent").addEventListener("click", () => {
  void save(() => client.rejectAll());
});
choices.addEventListener("submit", (event) => {
  event.preventDefault();
  void save(() =>
    client.save({
      marketing: requiredElement<HTMLInputElement>("#marketing").checked,
      measurement: requiredElement<HTMLInputElement>("#measurement").checked,
    })
  );
});
