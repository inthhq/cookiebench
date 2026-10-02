import type { FixtureConfig, Measurement } from "@cookiebench/schema";
import type { CDPSession, Page } from "playwright";

import type { BrowserObservations, FixtureState } from "./browser-observer.ts";

export interface PublicStateEvidence {
  state?: FixtureState;
  ready: boolean;
  readinessSource: "public-state" | "selector";
  selectorReady?: boolean;
  observedAt: number;
  timeOrigin: number;
  matches: boolean;
  dismissed?: boolean;
  reason?: string;
}
interface PublicStateExpectation {
  consent: string;
  allowedCategories: readonly string[];
}

interface InspectionOptions {
  global: string;
  ready?: string;
  readinessSource?: "public-state";
  expected: PublicStateExpectation;
  waitForMatch?: boolean;
  requireDismissed?: boolean;
}
// Self-contained so Playwright can execute the same readiness check on each document.
export function inspectPublicState(
  options: InspectionOptions & { waitForMatch: true }
): PublicStateEvidence | false;
export function inspectPublicState(
  options: InspectionOptions
): PublicStateEvidence;
// oxlint-disable-next-line complexity -- The serialized browser predicate must keep state, readiness and optional action dismissal checks together.
export function inspectPublicState(
  options: InspectionOptions
): PublicStateEvidence | false {
  const state = (window as unknown as Record<string, FixtureState | undefined>)[
    options.global
  ];
  const readinessSource = options.readinessSource ?? "selector";
  const selectorReady =
    readinessSource === "public-state"
      ? undefined
      : !options.ready ||
        Boolean(
          window.__bench?.query(options.ready) ??
          document.querySelector(options.ready)
        );
  const ready =
    readinessSource === "public-state"
      ? state?.ready === true
      : Boolean(state && state.ready !== false && selectorReady);
  const action = options.requireDismissed
    ? window.__bench?.inspectAction()
    : undefined;
  const dismissed = action
    ? !action.bannerVisible &&
      !action.blockingOverlay &&
      !action.preferencesVisible
    : undefined;
  const matches =
    (!options.requireDismissed || dismissed === true) &&
    ready &&
    state?.consent === options.expected.consent &&
    state.allowedCategories?.toSorted().join(",") ===
      [...options.expected.allowedCategories].toSorted().join(",");
  let reason: string | undefined;
  if (!state) {
    reason = "public-state-unavailable";
  } else if (!ready) {
    reason = "public-state-not-ready";
  } else if (options.requireDismissed && !dismissed) {
    reason = "consent-ui-not-dismissed";
  } else if (!matches) {
    reason = "public-state-mismatch";
  }
  if (options.waitForMatch && !matches) {
    return false;
  }
  return {
    dismissed,
    matches,
    observedAt: performance.now(),
    readinessSource,
    ready,
    reason,
    ...(selectorReady === undefined ? {} : { selectorReady }),
    state,
    timeOrigin: performance.timeOrigin,
  };
}

/** The same declared readiness gate precedes fresh and returning-visitor input. */
export async function waitForFixtureReady(
  page: Page,
  adapter: FixtureConfig["adapter"],
  timeout: number
): Promise<void> {
  if (adapter.readinessSource === "public-state") {
    const handle = await page.waitForFunction(
      (global: string) =>
        (window as unknown as Record<string, { ready?: boolean } | undefined>)[
          global
        ]?.ready === true,
      adapter.stateGlobal,
      { polling: "raf", timeout }
    );
    await handle.dispose();
  } else if (adapter.ready) {
    await page.locator(adapter.ready).waitFor({ state: "attached", timeout });
  }
}

export async function waitForPublicState(
  page: Page,
  adapter: FixtureConfig["adapter"],
  expected: PublicStateExpectation,
  timeout: number,
  requireDismissed = false
): Promise<PublicStateEvidence> {
  const options = {
    expected,
    global: adapter.stateGlobal,
    readinessSource: adapter.readinessSource,
    ready: adapter.ready,
    requireDismissed,
  };
  try {
    const handle = await page.waitForFunction(
      inspectPublicState,
      { ...options, waitForMatch: true },
      { polling: "raf", timeout }
    );
    const evidence = (await handle.jsonValue()) as PublicStateEvidence;
    await handle.dispose();
    return evidence;
  } catch (error) {
    if (!(error instanceof Error) || error.name !== "TimeoutError") {
      throw error;
    }
    return page.evaluate(inspectPublicState, options);
  }
}

export interface DocumentEvidence {
  timeOrigin: number;
  capturedAt: number;
  reason: "input" | "beforeunload" | "pagehide";
  observations: BrowserObservations;
}

export async function captureDocuments(
  session: CDPSession,
  binding: string
): Promise<DocumentEvidence[]> {
  const evidence: DocumentEvidence[] = [];
  session.on("Runtime.bindingCalled", (event) => {
    if (event.name === binding) {
      evidence.push(JSON.parse(event.payload) as DocumentEvidence);
    }
  });
  await session.send("Runtime.enable");
  await session.send("Runtime.addBinding", { name: binding });
  return evidence;
}

// Capture input and beforeunload through the native binding. pagehide is best effort because its execution context may already be disappearing.
// The input snapshot is deferred past the interaction's next paint; beforeunload and pagehide still publish synchronously.
export function installNavigationCapture(
  binding: string,
  stateGlobal = "__cookiebench"
) {
  if (window !== window.top) {
    return;
  }
  let unloading = false;
  const send = (reason: DocumentEvidence["reason"]) => {
    const bench = window.__bench;
    if (reason !== "input") {
      unloading = true;
    }
    if (
      !bench ||
      (!bench.observations.input && bench.observations.inputs.length === 0)
    ) {
      return;
    }
    const observations =
      reason === "pagehide" ? bench.stop() : bench.observations;
    const publish = (
      window as unknown as Record<string, (evidence: string) => void>
    )[binding];
    const capturedAt = performance.now();
    const liveState = (
      window as unknown as Record<string, FixtureState | undefined>
    )[stateGlobal];
    const snapshot =
      reason !== "input" &&
      liveState &&
      capturedAt <= (observations.deadlineAt ?? Infinity)
        ? { ...observations, state: liveState }
        : observations;
    publish(
      JSON.stringify({
        capturedAt,
        observations: snapshot,
        reason,
        timeOrigin: performance.timeOrigin,
      })
    );
  };
  // The observer already holds the trusted input timestamp. The handler only schedules,
  // so serialization and the binding call cannot delay CMP handlers or the next paint.
  let inputPending = false;
  const flushInput = () => {
    inputPending = false;
    if (!unloading) {
      send("input");
    }
  };
  const afterPaint = () => {
    if (typeof requestIdleCallback === "function") {
      requestIdleCallback(flushInput, { timeout: 1000 });
    } else {
      flushInput();
    }
  };
  const scheduleInput = (input: Event) => {
    if (input.isTrusted && !inputPending) {
      inputPending = true;
      requestAnimationFrame(() => setTimeout(afterPaint, 0));
    }
  };
  for (const event of ["pointerdown", "keydown"]) {
    document.addEventListener(event, scheduleInput, {
      capture: true,
      passive: true,
    });
  }
  window.addEventListener("beforeunload", () => send("beforeunload"));
  window.addEventListener("pagehide", () => send("pagehide"));
}

export function navigationMeasurements(
  measurements: readonly Measurement[],
  originalDocumentRetained = true
): Measurement[] {
  return measurements.map((metric) =>
    !originalDocumentRetained ||
    /^(?:action|scripts|observation)\./u.test(metric.key)
      ? {
          key: metric.key,
          method: metric.method,
          reason:
            "Action navigated to a new document; the original document observer does not cover the complete action, so no cross-document timing is established",
          status: "unavailable",
          unit: metric.unit,
        }
      : metric
  );
}
