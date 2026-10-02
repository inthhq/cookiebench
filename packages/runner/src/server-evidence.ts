import { Schema } from "effect";

const ServerEvent = Schema.Struct({
  category: Schema.optionalKey(Schema.String),
  id: Schema.optionalKey(Schema.String),
  timestamp: Schema.Number.check(
    Schema.isFinite(),
    Schema.isGreaterThanOrEqualTo(0)
  ),
  type: Schema.String,
}).check(
  Schema.makeFilter(
    (event) => event.type !== "script" || Boolean(event.category && event.id)
  )
);
const decodeEvents = Schema.decodeUnknownSync(Schema.Array(ServerEvent));

/** A declared evidence endpoint must respond successfully with typed events. */
export async function readServerEvidence(endpoint: URL, signal: AbortSignal) {
  const response = await fetch(endpoint, {
    signal: AbortSignal.any([signal, AbortSignal.timeout(2000)]),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(
      `Controlled server evidence returned HTTP ${response.status}`
    );
  }
  return decodeEvents(await response.json());
}
