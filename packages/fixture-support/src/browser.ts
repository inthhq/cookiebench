export interface PublicSnapshot {
  explicitChoice: {
    categories: Readonly<Record<string, { value: boolean }>>;
  } | null;
  effectivePermissions: Readonly<Record<string, boolean>>;
  resolution: { status: string };
}
export interface FixtureBridge {
  consent: "unset" | "accepted" | "rejected" | "custom";
  allowedCategories: string[];
  scripts: { id: string; category: string; at: number }[];
  pageActionAt?: number;
  ready?: boolean;
  resolvedAt?: number;
}
declare global {
  interface Window {
    __cookiebench: FixtureBridge;
  }
}

export function initializeBridge(): FixtureBridge {
  window.__cookiebench ??= {
    allowedCategories: [],
    consent: "unset",
    scripts: [],
  };
  return window.__cookiebench;
}
export function updateBridge(snapshot: PublicSnapshot): void {
  const bridge = initializeBridge();
  bridge.allowedCategories = Object.entries(snapshot.effectivePermissions)
    .filter(([category, allowed]) => category !== "necessary" && allowed)
    .map(([category]) => category);
  const choices = Object.entries(snapshot.explicitChoice?.categories ?? {})
    .filter(([category]) => category !== "necessary")
    .map(([, choice]) => choice);
  bridge.consent = "unset";
  if (snapshot.explicitChoice && choices.length) {
    if (choices.every((choice) => choice.value)) {
      bridge.consent = "accepted";
    } else if (choices.every((choice) => !choice.value)) {
      bridge.consent = "rejected";
    } else {
      bridge.consent = "custom";
    }
  }
  bridge.ready = snapshot.resolution.status === "matched";
  if (bridge.ready && bridge.resolvedAt === undefined) {
    bridge.resolvedAt = performance.now();
  }
  document.documentElement.dataset.consentReady = String(bridge.ready);
}
export function controlledScript(id: string, category = "measurement"): string {
  const current = new URL(window.location.href);
  const query = new URLSearchParams({ category, id });
  query.set(
    "token",
    current.searchParams.get("token") ??
      current.searchParams.get("cbToken") ??
      "fixture"
  );
  return `/controlled/script?${query}`;
}
export function installPageInteraction(): void {
  initializeBridge();
  const action = document.querySelector<HTMLButtonElement>("#page-action");
  if (!action || action.dataset.interactionInstalled === "true") {
    return;
  }
  action.dataset.interactionInstalled = "true";
  action.addEventListener("click", () => {
    window.__cookiebench.pageActionAt = performance.now();
    const output = document.querySelector("#page-result");
    if (output) {
      output.textContent = "Reading list updated";
    }
  });
  const workload = document.createElement("script");
  workload.dataset.osano = "ESSENTIAL";
  workload.type = "module";
  workload.src = "/page-assets/reading-list.js";
  document.head.append(workload);
}

export function controlledWorkload() {
  const count = Number(
    new URL(window.location.href).searchParams.get("scripts") ?? "2"
  );
  if (!Number.isSafeInteger(count) || count < 0 || count > 1000) {
    throw new Error("Invalid controlled script count.");
  }
  return Array.from({ length: count }, (_, index) => {
    const category =
      index % 2 === 0 ? ("measurement" as const) : ("marketing" as const);
    const id = `controlled-${index}`;
    return { category, id, src: controlledScript(id, category) };
  });
}
