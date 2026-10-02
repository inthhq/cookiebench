import type { Sample } from "@cookiebench/schema";
import { Option, Schema } from "effect";

import type { MetricContext } from "./validity.ts";
import { metricEligibility } from "./validity.ts";

const decodeLcp = Schema.decodeUnknownOption(
  Schema.Struct({
    observations: Schema.Struct({
      lcpAttribution: Schema.optionalKey(
        Schema.Struct({
          id: Schema.optionalKey(Schema.String),
          role: Schema.Literals(["content", "banner", "other", "unavailable"]),
          size: Schema.Number,
          tag: Schema.optionalKey(Schema.String),
          url: Schema.optionalKey(Schema.String),
        })
      ),
      vitals: Schema.Struct({
        LCP: Schema.Struct({
          entries: Schema.Array(
            Schema.Struct({
              element: Schema.optionalKey(
                Schema.Struct({
                  id: Schema.optionalKey(Schema.String),
                  tag: Schema.optionalKey(Schema.String),
                })
              ),
              id: Schema.optionalKey(Schema.String),
              size: Schema.optionalKey(Schema.Number),
              url: Schema.optionalKey(Schema.String),
            })
          ),
        }),
      }),
    }),
  })
);

function lcpElement(sample: Sample) {
  const decoded = decodeLcp(sample.diagnostics);
  if (Option.isNone(decoded)) {
    return;
  }
  const { lcpAttribution: attribution, vitals } = decoded.value.observations;
  if (attribution) {
    return {
      id: attribution.id || null,
      role: attribution.role,
      size: attribution.size,
      tag: attribution.tag || null,
      url: attribution.url || null,
    };
  }
  const entry = vitals.LCP.entries.at(-1);
  if (!entry || (!entry.element && !entry.id && !entry.url)) {
    return;
  }
  return {
    id: entry.element?.id || entry.id || null,
    role: "unavailable" as const,
    size: entry.size ?? null,
    tag: entry.element?.tag || null,
    url: entry.url || null,
  };
}

/** Attribution uses the same eligible observations as the absolute LCP summary. */
export function summarizeLcpAttribution(
  samples: readonly Sample[],
  context?: MetricContext
) {
  const elements = new Map<
    string,
    {
      id: string | null;
      tag: string | null;
      url: string | null;
      samples: number;
      role: "content" | "banner" | "other" | "unavailable";
      size: number | null;
    }
  >();
  let missing = 0;
  for (const sample of samples) {
    if (metricEligibility(sample, "page.lcp", context).length > 0) {
      continue;
    }
    const element = lcpElement(sample);
    if (!element) {
      missing += 1;
      continue;
    }
    const key = JSON.stringify(element);
    const group = elements.get(key) ?? { ...element, samples: 0 };
    group.samples += 1;
    elements.set(key, group);
  }
  return {
    elements: [...elements.values()].toSorted(
      (a, b) =>
        b.samples - a.samples ||
        JSON.stringify(a).localeCompare(JSON.stringify(b))
    ),
    missing,
  };
}

export function lcpComparison(
  metricKey: string,
  baseline: readonly Sample[],
  candidate: readonly Sample[],
  contexts?: { baseline: MetricContext; candidate: MetricContext }
) {
  return metricKey === "page.lcp"
    ? {
        lcpAttribution: {
          baseline: summarizeLcpAttribution(baseline, contexts?.baseline),
          candidate: summarizeLcpAttribution(candidate, contexts?.candidate),
        },
      }
    : {};
}
