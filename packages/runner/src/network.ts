import { createHash } from "node:crypto";

import type { CDPSession, Page } from "playwright";

export interface NetworkRequest {
  id: string;
  url: string;
  hostname: string;
  party: "first-party" | "third-party" | "other";
  resourceType: string;
  method?: string;
  responseContentType?: string;
  startedAt: number;
  wallTimeMs: number;
  phase: "initial" | "deferred";
  status?: number;
  fromCache?: boolean;
  transferBytes?: number;
  // Raw CDP chunk-event sum; may include framing or omit encoded bytes.
  encodedDataBytes?: number;
  // Exact encoded body length, established only for completed uncached responses.
  encodedBodyBytes?: number;
  decodedBodyBytes?: number;
  decodedBodySha256?: string;
  // Text responses hash the protocol string re-encoded as UTF-8, not original charset bytes.
  bodyDigestEncoding?: "base64-bytes" | "utf8-text" | "empty-body";
  bodyDigestUnavailable?: string;
  failed?: string;
  finished: boolean;
}

export interface NetworkCoverage {
  scope: "page-target";
  complete: boolean;
  reasons: string[];
}

function hasNoBody(row: NetworkRequest): boolean {
  return row.method === "HEAD" || [204, 205, 304].includes(row.status ?? 0);
}

export function classifyHostname(
  url: string,
  pageUrl: string
): NetworkRequest["party"] {
  const target = new URL(url);
  if (!["http:", "https:"].includes(target.protocol)) {
    return "other";
  }
  return target.hostname === new URL(pageUrl).hostname
    ? "first-party"
    : "third-party";
}

export function partitionNetwork(
  requests: readonly NetworkRequest[],
  inputEpochMs?: number
): NetworkRequest[] {
  return requests.map((request) => ({
    ...request,
    phase:
      inputEpochMs !== undefined && request.wallTimeMs >= inputEpochMs
        ? "deferred"
        : "initial",
  }));
}

export interface NetworkRevision {
  at: number;
  request: NetworkRequest;
}

export function networkAtDeadline(
  revisions: readonly NetworkRevision[],
  deadlineEpochMs: number
): NetworkRequest[] {
  const latest = new Map<string, NetworkRequest>();
  for (const revision of revisions) {
    if (revision.at <= deadlineEpochMs) {
      latest.set(revision.request.id, { ...revision.request });
    }
  }
  return [...latest.values()];
}

export async function collectNetwork(page: Page, pageUrl: string) {
  const session: CDPSession = await page.context().newCDPSession(page);
  const gaps = new Set<string>();
  const workerGap = () =>
    gaps.add("Worker traffic is outside the attached page CDP target");
  const frameGap = () =>
    gaps.add(
      "Child-frame traffic has not been independently verified by the page-target collector"
    );
  const serviceWorkerGap = () =>
    gaps.add("Service-worker traffic is outside the attached page CDP target");
  page.on("worker", workerGap);
  page.on("frameattached", frameGap);
  page.context().on("serviceworker", serviceWorkerGap);
  page.context().on("page", (other) => {
    if (other !== page) {
      gaps.add(
        "Additional-page traffic is outside the attached page CDP target"
      );
    }
  });
  if (page.workers().length) {
    workerGap();
  }
  if (page.frames().some((frame) => frame !== page.mainFrame())) {
    frameGap();
  }
  if (page.context().serviceWorkers().length) {
    serviceWorkerGap();
  }
  // Playwright's worker event excludes SharedWorker. Discover those targets passively.
  try {
    const { targetInfo } = await session.send("Target.getTargetInfo");
    session.on("Target.targetCreated", ({ targetInfo: target }) => {
      if (
        target.type === "shared_worker" &&
        (!targetInfo.browserContextId ||
          !target.browserContextId ||
          target.browserContextId === targetInfo.browserContextId)
      ) {
        gaps.add(
          "Shared-worker traffic is outside the attached page CDP target"
        );
      }
    });
    await session.send("Target.setDiscoverTargets", {
      discover: true,
      filter: [{ exclude: false, type: "shared_worker" }, { exclude: true }],
    });
  } catch {
    gaps.add(
      "Shared-worker target discovery was unavailable; network coverage cannot be verified"
    );
  }
  const requests: NetworkRequest[] = [];
  const active = new Map<string, NetworkRequest>();
  const requestIds = new Map<string, string>();
  const contentLengths = new Map<string, number>();
  const identityEncoding = new Set<string>();
  const completed = new Set<string>();
  const revisions: NetworkRevision[] = [];
  const record = (row: NetworkRequest, monotonicSeconds: number) => {
    revisions.push({
      at: row.wallTimeMs + monotonicSeconds * 1000 - row.startedAt,
      request: { ...row },
    });
  };
  session.on("Network.requestWillBeSent", (event) => {
    if (event.redirectResponse) {
      const previous = active.get(event.requestId);
      if (previous) {
        previous.status = event.redirectResponse.status;
        previous.bodyDigestUnavailable =
          "Exact response body unavailable for redirected request hop";
        // CDP does not expose a complete redirect body/transfer breakdown here.
        previous.finished = true;
        record(previous, event.timestamp);
      }
    }
    const row: NetworkRequest = {
      finished: false,
      hostname: new URL(event.request.url).hostname,
      id: `${event.requestId}:${requests.length}`,
      method: event.request.method,
      party: classifyHostname(event.request.url, pageUrl),
      phase: "initial",
      resourceType: event.type ?? "Other",
      startedAt: event.timestamp * 1000,
      url: event.request.url,
      wallTimeMs: event.wallTime * 1000,
    };
    requestIds.set(row.id, event.requestId);
    active.set(event.requestId, row);
    requests.push(row);
    record(row, event.timestamp);
  });
  session.on("Network.responseReceived", (event) => {
    const row = active.get(event.requestId);
    if (!row) {
      return;
    }
    row.status = event.response.status;
    row.responseContentType = event.response.mimeType;
    row.fromCache = Boolean(
      row.fromCache ||
      event.response.fromDiskCache ||
      event.response.fromServiceWorker
    );
    const length = Object.entries(event.response.headers ?? {}).find(
      ([name]) => name.toLowerCase() === "content-length"
    )?.[1];
    if (
      typeof length === "string" &&
      /^\d+$/u.test(length) &&
      Number.isSafeInteger(Number(length))
    ) {
      contentLengths.set(row.id, Number(length));
    }
    const encoding = Object.entries(event.response.headers ?? {}).find(
      ([name]) => name.toLowerCase() === "content-encoding"
    )?.[1];
    if (
      encoding === undefined ||
      (typeof encoding === "string" &&
        ["", "identity"].includes(encoding.trim().toLowerCase()))
    ) {
      identityEncoding.add(row.id);
    }
    if (hasNoBody(row)) {
      row.encodedBodyBytes = 0;
      row.decodedBodyBytes = 0;
    }
    record(row, event.timestamp);
  });
  session.on("Network.requestServedFromCache", (event) => {
    const row = active.get(event.requestId);
    if (row) {
      row.fromCache = true;
    }
  });
  session.on("Network.dataReceived", (event) => {
    const row = active.get(event.requestId);
    if (!row) {
      return;
    }
    row.decodedBodyBytes = (row.decodedBodyBytes ?? 0) + event.dataLength;
    row.encodedDataBytes =
      (row.encodedDataBytes ?? 0) + event.encodedDataLength;
    record(row, event.timestamp);
  });
  session.on("Network.loadingFinished", (event) => {
    const row = active.get(event.requestId);
    if (!row) {
      return;
    }
    row.transferBytes = event.encodedDataLength;
    row.finished = true;
    completed.add(row.id);
    record(row, event.timestamp);
  });
  session.on("Network.loadingFailed", (event) => {
    const row = active.get(event.requestId);
    if (!row) {
      return;
    }
    row.failed = event.errorText;
    row.finished = true;
    record(row, event.timestamp);
  });
  await session.send("Network.enable");
  const snapshot = async (deadlineEpochMs?: number) => {
    const frozen =
      deadlineEpochMs === undefined
        ? requests.map((request) => ({ ...request }))
        : networkAtDeadline(revisions, deadlineEpochMs);
    for (const row of frozen) {
      if (!row.finished || row.failed) {
        continue;
      }
      const bodyless = hasNoBody(row);
      if (bodyless) {
        row.encodedBodyBytes = 0;
        row.decodedBodyBytes = 0;
      } else if (!row.fromCache && completed.has(row.id)) {
        // Chunk-event encoded counts can include framing or be partial. Content-Length
        // establishes the encoded body size; identity encoding also permits the complete
        // decoded byte count. Compressed bodies without an exact length stay unknown.
        row.encodedBodyBytes =
          contentLengths.get(row.id) ??
          (identityEncoding.has(row.id) ? row.decodedBodyBytes : undefined);
      }
      if (
        !(
          ["Script", "Stylesheet"].includes(row.resourceType) ||
          /javascript|json|css/iu.test(row.responseContentType ?? "")
        )
      ) {
        continue;
      }
      const requestId = requestIds.get(row.id);
      if (!requestId || active.get(requestId)?.id !== row.id) {
        row.bodyDigestUnavailable =
          "Exact response body unavailable for redirected request hop";
        continue;
      }
      try {
        // CDP identity, not URL/order matching, selects the completed response.
        // Reads remain passive and happen only after the frozen measurement window.
        let body = Buffer.alloc(0);
        row.bodyDigestEncoding = "empty-body";
        if (!bodyless) {
          // oxlint-disable-next-line no-await-in-loop -- Read completed protocol bodies serially after timing collection.
          const response = await session.send("Network.getResponseBody", {
            requestId,
          });
          body = Buffer.from(
            response.body,
            response.base64Encoded ? "base64" : "utf-8"
          );
          row.bodyDigestEncoding = response.base64Encoded
            ? "base64-bytes"
            : "utf8-text";
        }
        row.decodedBodySha256 = createHash("sha256").update(body).digest("hex");
      } catch (error) {
        row.bodyDigestUnavailable = String(error);
      }
    }
    return frozen;
  };
  return {
    coverage: (): NetworkCoverage => ({
      complete: gaps.size === 0,
      reasons: [...gaps].toSorted(),
      scope: "page-target",
    }),
    requests,
    session,
    snapshot,
  };
}
