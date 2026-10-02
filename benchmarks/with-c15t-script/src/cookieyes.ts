import {
  controlledScript,
  initializeBridge,
  updateBridge,
} from "@cookiebench/fixture-support";

import { requiredElement } from "./dom.ts";
import { initializePage } from "./page.ts";

declare global {
  interface Window {
    getCkyConsent?: () => {
      isUserActionCompleted?: boolean;
      categories?: Record<string, boolean>;
    };
    revisitCkyConsent?: () => void;
  }
}

initializePage();
initializeBridge();
const requested = new Set<string>();
const workloads = Array.from(
  { length: Number(new URL(location.href).searchParams.get("scripts") ?? 2) },
  (_, index) => {
    const category =
      index % 2 === 0 ? ("measurement" as const) : ("marketing" as const);
    const id = `script-${index}`;
    return { category, id, src: controlledScript(id, category) };
  }
);

function syncConsent(): boolean {
  const snapshot = window.getCkyConsent?.();
  if (!snapshot) {
    return false;
  }
  const permissions = {
    marketing: snapshot.categories?.advertisement === true,
    measurement: snapshot.categories?.analytics === true,
  };
  updateBridge({
    effectivePermissions: permissions,
    explicitChoice:
      snapshot.isUserActionCompleted === true
        ? {
            categories: {
              marketing: { value: permissions.marketing },
              measurement: { value: permissions.measurement },
            },
          }
        : null,
    resolution: { status: "matched" },
  });
  for (const workload of workloads) {
    if (!permissions[workload.category] || requested.has(workload.id)) {
      continue;
    }
    requested.add(workload.id);
    const script = document.createElement("script");
    script.src = workload.src;
    // Public-consent callback gating, not a test of CookieYes native automatic blocking.
    document.head.append(script);
  }
  return true;
}

document.addEventListener("cookieyes_consent_update", syncConsent);
const readinessDeadline = performance.now() + 15_000;
function readInitialConsent(): void {
  if (syncConsent() || performance.now() >= readinessDeadline) {
    return;
  }
  setTimeout(readInitialConsent, 100);
}
readInitialConsent();

function openPreferences(): void {
  window.revisitCkyConsent?.();
}
requiredElement("#reopen-preferences").addEventListener(
  "click",
  openPreferences
);
// Withdrawal uses CookieYes's native Reject All action in the preferences panel.
requiredElement("#withdraw-consent").addEventListener("click", openPreferences);
