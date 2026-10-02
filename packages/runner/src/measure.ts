import type {
  FixtureConfig,
  Measurement,
  MetricUnit,
  ScenarioConfig,
} from "@cookiebench/schema";

import type { BrowserObservations } from "./browser-observer.ts";
import type { NetworkCoverage, NetworkRequest } from "./network.ts";

const observed =
  "DOM observation v2; performance.now at inspection, frame-polled; not a paint timestamp";

export function missingRequiredMeasurements(
  measurements: readonly Measurement[],
  scenario: ScenarioConfig
): Measurement[] {
  const requiredKeys = new Set([
    // Input ends LCP observation, so action visits cannot require load vitals.
    ...(scenario.action === "load" ? ["page.lcp", "page.fcp", "page.cls"] : []),
    "initial.transfer",
    ...(scenario.expectedBanner ? ["banner.visible"] : []),
  ]);
  if (scenario.action === "preferences") {
    requiredKeys.add("action.preferences-visible");
  } else if (scenario.action !== "load") {
    requiredKeys.add("action.consent-effective");
    requiredKeys.add("action.dismissed");
  }
  return measurements.filter(
    (metric) => requiredKeys.has(metric.key) && metric.status !== "measured"
  );
}

export function measured(
  key: string,
  unit: MetricUnit,
  value: number | undefined,
  method: string,
  reason = "No qualifying observation before the declared deadline"
): Measurement {
  return value !== undefined && Number.isFinite(value) && value >= 0
    ? { key, method, status: "measured", unit, value }
    : { key, method, reason, status: "unavailable", unit };
}
export function interactionDuration(
  data: BrowserObservations,
  target?: string
): number | undefined {
  const input = target
    ? data.inputs.find((item) => item.target === target)
    : data.input;
  if (!input) {
    return undefined;
  }
  const relatedInputs = (data.inputEvents ?? [input]).filter(
    (item) => item.target === input.target && item.at >= input.at
  );
  const matching = data.events.filter(
    (event) =>
      event.interactionId > 0 &&
      relatedInputs.some(
        (item) =>
          item.type === event.name && Math.abs(event.startTime - item.at) <= 2
      ) &&
      ["pointerdown", "pointerup", "click", "keydown", "keyup"].includes(
        event.name
      )
  );
  if (!matching.length) {
    return undefined;
  }
  const [nearest] = matching.toSorted(
    (a, b) =>
      Math.abs(a.startTime - input.at) - Math.abs(b.startTime - input.at)
  );
  const interaction = data.events.filter(
    (event) => event.interactionId === nearest.interactionId
  );
  if (
    interaction.some(
      (event) =>
        event.startTime + event.duration > (data.deadlineAt ?? Infinity)
    )
  ) {
    return undefined;
  }
  return Math.max(...interaction.map((event) => event.duration));
}
export function longTaskBlocking(
  tasks: readonly { startTime: number; duration: number }[],
  start: number,
  end: number
): number {
  return tasks.reduce(
    (total, task) =>
      total +
      Math.max(
        0,
        Math.min(task.startTime + task.duration, end) -
          Math.max(task.startTime + 50, start)
      ),
    0
  );
}

/**
 * An LCP read at the cutoff is right-censored while the declared primary content
 * is missing, still loading, or unpainted: a later, larger candidate cannot be excluded.
 */
export function lcpCensoring(
  data: BrowserObservations,
  fixture: FixtureConfig
): string | undefined {
  const primary = data.primaryContentAtCutoff;
  if (!fixture.adapter.primaryContent || !primary) {
    return undefined;
  }
  const prefix = "LCP is right-censored at the cutoff:";
  if (!primary.present) {
    return `${prefix} the declared primary content was not in the document`;
  }
  if (primary.imageComplete === false) {
    return `${prefix} the declared primary image had not finished loading`;
  }
  if (
    primary.elementTiming &&
    data.supported.includes("element") &&
    data.primaryContentPaintAt === undefined
  ) {
    return `${prefix} the declared primary content had no Element Timing paint within the window`;
  }
  return undefined;
}

// oxlint-disable-next-line complexity -- Each registered metric keeps its availability branch beside its collection method.
export function measurementsFor(
  data: BrowserObservations,
  requests: NetworkRequest[],
  scenario: ScenarioConfig,
  fixture: FixtureConfig,
  networkCoverage?: NetworkCoverage
): Measurement[] {
  const metrics: Measurement[] = [];
  const input = data.input?.at;
  const missingActionWindow =
    scenario.action !== "load" && input === undefined
      ? "No trusted action input established a bounded observation window; raw page observations are diagnostic only"
      : undefined;
  const elapsed = (endpoint?: number) =>
    endpoint !== undefined && input !== undefined
      ? endpoint - input
      : undefined;
  const add = (
    key: string,
    unit: MetricUnit,
    value: number | undefined,
    method = observed,
    reason?: string
  ) => metrics.push(measured(key, unit, value, method, reason));
  add("banner.visible", "ms", data.visibleAt);
  add("banner.coverage", "ratio", data.coverage);
  add("page.primary-visible", "ms", data.primaryVisibleAt);
  add(
    "page.primary-content-paint",
    "ms",
    missingActionWindow ? undefined : data.primaryContentPaintAt,
    "Element Timing v2; native renderTime of primary-content image; bounded foreground observation; 250 ms presentation grace before drain",
    missingActionWindow
  );
  const censoredLcp = lcpCensoring(data, fixture);
  for (const [key, name, unit] of [
    ["page.lcp", "LCP", "ms"],
    ["page.fcp", "FCP", "ms"],
    ["page.ttfb", "TTFB", "ms"],
    ["page.cls", "CLS", "score"],
    ["page.lab-inp", "INP", "ms"],
  ] as const) {
    const withheld =
      missingActionWindow ?? (name === "LCP" ? censoredLcp : undefined);
    add(
      key,
      unit,
      withheld ? undefined : data.vitals[name]?.value,
      {
        CLS: "bounded native vitals v3; main-document foreground entry-time cutoff; maximum session window; owned PerformanceObserver queue drain after 250 ms presentation grace",
        FCP: "bounded native vitals v3; main-document foreground entry-time cutoff; owned PerformanceObserver queue drain after 250 ms presentation grace",
        INP: "INP withheld v2; web-vitals snapshot retained as an unfinalized diagnostic",
        LCP: "bounded native vitals v3; main-document foreground entry-time cutoff; owned PerformanceObserver queue drain after 250 ms presentation grace; withheld as right-censored when declared primary content is absent, loading or unpainted at cutoff",
        TTFB: "bounded navigation timing v2; native responseStart at or before cutoff; no foreground restriction",
      }[name],
      name === "INP"
        ? "Whole-visit INP is not finalized by this bounded collector; inspect primary interaction duration"
        : withheld
    );
  }
  const loadEnd =
    scenario.action === "load"
      ? scenario.observationMs
      : (input ?? scenario.observationMs);
  add(
    "initial.long-task-blocking",
    "ms",
    data.supported.includes("longtask")
      ? longTaskBlocking(data.longTasks, 0, loadEnd)
      : undefined,
    "PerformanceObserver longtask; navigation to input or configured load deadline; not TBT"
  );
  add(
    "action.long-task-blocking",
    "ms",
    data.supported.includes("longtask") && input !== undefined
      ? longTaskBlocking(data.longTasks, input, input + scenario.observationMs)
      : undefined,
    `PerformanceObserver longtask; input through input + ${scenario.observationMs} ms; not TBT`
  );
  for (const phase of ["initial", "deferred"] as const) {
    const rows = requests.filter(
      (request) => request.phase === phase && request.party !== "other"
    );
    add(
      `${phase}.requests`,
      "count",
      rows.length,
      "passive CDP Network.requestWillBeSent"
    );
    add(
      `${phase}.third-party-requests`,
      "count",
      rows.filter((row) => row.party === "third-party").length,
      "exact URL hostname comparison; no substring or registrable-domain inference"
    );
    for (const [key, field] of [
      ["transfer", "transferBytes"],
      ["encoded-body", "encodedBodyBytes"],
      ["decoded-body", "decodedBodyBytes"],
    ] as const) {
      const complete = rows.every(
        (row) => row.finished && !row.failed && row[field] !== undefined
      );
      add(
        `${phase}.${key}`,
        "bytes",
        complete
          ? rows.reduce((sum, row) => sum + Number(row[field]), 0)
          : undefined,
        {
          decodedBodyBytes: "network bytes v2; CDP dataReceived.dataLength sum",
          encodedBodyBytes:
            "network bytes v2; completed uncached Content-Length or identity decoded bytes",
          transferBytes:
            "network bytes v2; completed CDP loadingFinished.encodedDataLength",
        }[field],
        "One or more responses lack a complete byte observation; inspect raw requests"
      );
    }
  }
  add("consent.resolution", "ms", data.state?.resolvedAt);
  add(
    "action.input-to-next-paint",
    "ms",
    interactionDuration(data),
    "Event Timing attribution v2; trusted related event timestamps, native interactionId maximum duration, 8 ms quantization",
    data.supported.includes("event")
      ? "No matching reportable entry; values below 16 ms are censored, not zero"
      : "Browser does not support Event Timing"
  );
  add(
    "action.followup-input-to-next-paint",
    "ms",
    interactionDuration(data, fixture.adapter.pageAction),
    "Event Timing attribution v2; trusted related event timestamps; page input dispatched no earlier than declared followup offset",
    "No matching reportable entry; values below 16 ms are censored, not zero"
  );
  add("action.acknowledgement", "ms", elapsed(data.acknowledgedAt));
  add(
    "action.dismissal-started",
    "ms",
    elapsed(data.dismissalStartedAt),
    `${observed}; first post-input inspection where the banner, or the open preferences panel for save/withdraw, loses over 1% of its rendered footprint (effective opacity times viewport area), stops accepting pointer events, or is no longer visible`,
    "No consent surface was visible at arm, or it did not begin hiding before the cutoff"
  );
  add("action.dismissed", "ms", elapsed(data.dismissedAt));
  add(
    "action.consent-effective",
    "ms",
    elapsed(data.effectiveAt),
    `${observed}; public adapter state, checked against controlled executions`
  );
  add(
    "action.local-persisted",
    "ms",
    elapsed(data.persistedAt),
    "fixture bridge observes successful local persistence; restoration separately verified"
  );
  add(
    "action.remote-persisted",
    "ms",
    elapsed(data.remotePersistedAt),
    "fixture bridge records acknowledged successful backend response",
    data.state?.remoteError ??
      "Adapter did not report a backend acknowledgement"
  );
  add("action.preferences-visible", "ms", elapsed(data.preferencesVisibleAt));
  const scripts = data.state?.scripts;
  add(
    "scripts.executions",
    "count",
    scripts?.length,
    "controlled execution markers, not request starts"
  );
  add(
    "scripts.duplicates",
    "count",
    scripts
      ? scripts.length - new Set(scripts.map((script) => script.id)).size
      : undefined,
    "controlled execution markers"
  );
  const allowed = scripts?.filter((script) =>
    data.state?.allowedCategories.includes(script.category)
  );
  let expected = 0;
  if (scenario.action === "accept") {
    expected = scenario.workload.scriptCount;
  }
  if (scenario.action === "save") {
    expected = Math.ceil(
      scenario.workload.scriptCount / scenario.workload.categories.length
    );
  }
  add(
    "action.scripts-complete",
    "ms",
    expected > 0 && allowed?.length === expected
      ? elapsed(Math.max(...allowed.map((script) => script.at)))
      : undefined,
    "controlled execution count reached expected allowed count; last marker timestamp; IDs are checked for duplicates, not matched against a declared identity list"
  );
  add(
    "observation.frame-interval",
    "ms",
    data.frameIntervals.length ? Math.max(...data.frameIntervals) : undefined,
    "maximum interval between observer animation-frame callbacks"
  );
  add(
    "observation.callbacks",
    "count",
    data.observerCallbacks,
    "bounded animation-frame callback count"
  );
  add(
    "observation.callback-time",
    "ms",
    data.observerTimeMs,
    "summed performance.now duration of observer animation-frame and DOM mutation callbacks; includes style and layout they force; collector cost diagnostic"
  );
  const requirements: Record<string, string> = {
    "action.followup-input-to-next-paint": "event",
    "action.input-to-next-paint": "event",
    "action.long-task-blocking": "longtask",
    "initial.long-task-blocking": "longtask",
    "page.cls": "layout-shift",
    "page.fcp": "paint",
    "page.lab-inp": "event",
    "page.lcp": "largest-contentful-paint",
    "page.primary-content-paint": "element",
  };
  return metrics.map((metric) => {
    if (
      networkCoverage?.complete === false &&
      /^(?:initial|deferred)\.(?:requests|third-party-requests|transfer|encoded-body|decoded-body)$/u.test(
        metric.key
      )
    ) {
      return {
        key: metric.key,
        method: metric.method,
        reason: `Page-target network coverage is incomplete: ${networkCoverage.reasons.join("; ")}`,
        status: "unavailable" as const,
        unit: metric.unit,
      };
    }
    const entryType = requirements[metric.key];
    if (
      entryType &&
      !data.supported.includes(entryType) &&
      metric.status !== "measured"
    ) {
      return {
        ...metric,
        reason: `Browser does not support PerformanceObserver ${entryType} entries`,
        status: "unsupported",
      };
    }
    return metric;
  });
}
