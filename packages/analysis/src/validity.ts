import type {
  FixtureConfig,
  RunManifest,
  Sample,
  ScenarioConfig,
} from "@cookiebench/schema";

// Retained envelopes remain immutable. This policy applies when they are analyzed again.
export const INVALIDATED_COLLECTORS = {
  "2f50f05bdbdd9eeedd7b341f4e613d0409307e2f9823a80bcfc0a8a9ecb0011e": {
    encodedBody:
      "URL-based body matching and transfer-size fallback could assign another response or transfer overhead to encoded body bytes",
    remoteIdentity:
      "URL-based response matching could assign another response's artifact digest",
  },
  "7594c4d8eaad24aa17351adec7b62ac64f7a2ce902904b34d3e0c2cde010fb84": {
    encodedBody:
      "CDP encoded chunk counts can include HTTP framing and do not establish exact encoded body bytes",
    remoteIdentity: undefined,
  },
} as const;

const LEGACY_TIMING_COLLECTORS = new Set([
  ...Object.keys(INVALIDATED_COLLECTORS),
  "23c20f43c1361da063d0bb1806c16022bebc4ef82f083e331eaa8954b79fb2d3",
]);
const FRAME_TIMINGS = new Set([
  "banner.visible",
  "page.primary-visible",
  "action.acknowledgement",
  "action.dismissed",
  "action.consent-effective",
  "action.preferences-visible",
]);
const ACTION_WINDOW_METRICS = new Set([
  "action.local-persisted",
  "action.remote-persisted",
  "action.scripts-complete",
  "scripts.executions",
  "scripts.duplicates",
  "consent.resolution",
]);

export function measurementValidity(
  manifest: RunManifest,
  fixture: Pick<FixtureConfig, "artifactPolicy">,
  metricKey: string,
  scenario?: Pick<ScenarioConfig, "action">
): string[] {
  const hash = manifest.environment.collectorSourceHash;
  const invalidation =
    INVALIDATED_COLLECTORS[hash as keyof typeof INVALIDATED_COLLECTORS];
  const reasons: string[] = [];
  if (
    invalidation &&
    ["initial.encoded-body", "deferred.encoded-body"].includes(metricKey)
  ) {
    reasons.push(
      `Collector ${hash} invalidated for ${metricKey}: ${invalidation.encodedBody}. Retained values are historical evidence only.`
    );
  }
  if (
    fixture.artifactPolicy === "mutable-network" &&
    invalidation?.remoteIdentity
  ) {
    reasons.push(
      `Collector ${hash} cannot qualify remote artifact identity: ${invalidation.remoteIdentity}.`
    );
  }
  // Runner 3.0 retained these timing methods across earlier source revisions too.
  // Audit metrics have their own custom.audit.* methods and are not covered here.
  if (
    manifest.collectorVersion === "cookiebench-runner-3.0.0" ||
    (hash !== undefined && LEGACY_TIMING_COLLECTORS.has(hash))
  ) {
    let reason: string | undefined;
    if (FRAME_TIMINGS.has(metricKey)) {
      reason =
        "DOM state was timestamped with a potentially stale animation-frame callback timestamp";
    } else if (
      [
        "action.input-to-next-paint",
        "action.followup-input-to-next-paint",
      ].includes(metricKey)
    ) {
      reason =
        "a reportable click or keyup could be missed when the interaction's initial event was below the Event Timing reporting threshold";
    } else if (
      [
        "page.lcp",
        "page.fcp",
        "page.cls",
        "page.ttfb",
        "page.lab-inp",
      ].includes(metricKey)
    ) {
      reason =
        "web-vitals callback delivery and unfinished aggregation did not enforce a native entry-time cutoff";
    } else if (
      scenario?.action !== "load" &&
      ACTION_WINDOW_METRICS.has(metricKey)
    ) {
      reason =
        "action-state collection could continue beyond its configured observation deadline";
    }
    if (reason) {
      reasons.push(
        `Collector ${hash ?? manifest.collectorVersion} invalidated for ${metricKey}: ${reason}. Retained values are descriptive historical evidence only.`
      );
    }
  }
  return reasons;
}

export interface MetricContext {
  manifest: RunManifest;
  fixture: Pick<FixtureConfig, "artifactPolicy">;
  scenario?: Pick<ScenarioConfig, "action"> &
    Partial<Pick<ScenarioConfig, "observationMs">>;
}

/**
 * The runner stops observing an action at input + observationMs. When it
 * verifies completion only after that cutoff, it records
 * `observation-window-exceeded` and leaves these completion endpoints
 * unavailable. Such an endpoint is right-censored at the window, not missing.
 */
function censoredEndpoints(action: ScenarioConfig["action"]): string[] {
  if (action === "load") {
    return [];
  }
  return action === "preferences"
    ? ["action.preferences-visible"]
    : ["action.dismissed", "action.consent-effective"];
}

function collectorValidity(key: string, context?: MetricContext): string[] {
  return context
    ? measurementValidity(
        context.manifest,
        context.fixture,
        key,
        context.scenario
      )
    : [];
}

/** The observation window for a metric that can be right-censored, if any. */
export function censoringWindow(
  key: string,
  context?: MetricContext
): number | undefined {
  const scenario = context?.scenario;
  return scenario?.observationMs !== undefined &&
    censoredEndpoints(scenario.action).includes(key)
    ? scenario.observationMs
    : undefined;
}

/** Failures and attempt states that exclude a sample, apart from its own value. */
function sampleExclusions(
  sample: Sample,
  key: string,
  context?: MetricContext
): string[] {
  const reasons: string[] = [];
  const censorable = censoringWindow(key, context) !== undefined;
  const blockingFailures = sample.failures.filter(
    (failure) =>
      failure.code !== "required-measurement-unavailable" &&
      failure.code !== "followup:required-measurement-unavailable" &&
      // A late completion censors this endpoint; it does not invalidate it.
      !(censorable && failure.code === "observation-window-exceeded")
  );
  for (const failure of blockingFailures) {
    reasons.push(`Sample failure ${failure.code}: ${failure.message}`);
  }
  if (sample.status === "failed") {
    reasons.push("Failed attempts cannot contribute metric values.");
  } else if (sample.status === "incomplete" && sample.failures.length === 0) {
    reasons.push(
      "Incomplete attempt has no recorded reason establishing metric eligibility."
    );
  } else if (sample.status === "passed" && sample.failures.length > 0) {
    reasons.push("Passed attempt contains failures.");
  }
  return reasons;
}

/** Missing unrelated observations do not invalidate a recorded metric. */
export function metricEligibility(
  sample: Sample,
  key: string,
  context?: MetricContext
): string[] {
  const reasons = collectorValidity(key, context);
  const measurement = sample.measurements.find((item) => item.key === key);
  const window = censoringWindow(key, context);
  if (measurement?.status !== "measured") {
    reasons.push(`Metric ${key} is ${measurement?.status ?? "missing"}.`);
  } else if (window !== undefined && measurement.value > window) {
    reasons.push(`Metric ${key} exceeds the ${window} ms observation window.`);
  }
  reasons.push(...sampleExclusions(sample, key, context));
  return [...new Set(reasons)];
}

/**
 * True when the runner verified this completion endpoint only after the
 * observation window and nothing else excludes the sample. The value is
 * known only to exceed the window.
 */
export function isRightCensored(
  sample: Sample,
  key: string,
  context?: MetricContext
): boolean {
  const window = censoringWindow(key, context);
  if (
    window === undefined ||
    !sample.failures.some(
      (failure) => failure.code === "observation-window-exceeded"
    )
  ) {
    return false;
  }
  const measurement = sample.measurements.find((item) => item.key === key);
  if (measurement?.status === "measured" && measurement.value <= window) {
    return false;
  }
  return (
    collectorValidity(key, context).length === 0 &&
    sampleExclusions(sample, key, context).length === 0
  );
}
