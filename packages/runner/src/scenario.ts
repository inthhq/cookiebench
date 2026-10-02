import { randomUUID } from "node:crypto";

import type {
  FixtureConfig,
  ScenarioConfig,
  Sample,
  DeviceProfile,
} from "@cookiebench/schema";
import { Effect } from "effect";
import type { Browser, BrowserContext, Page } from "playwright";

import {
  installObserver,
  installVitals,
  PAINT_GRACE_MS,
} from "./browser-observer.ts";
import type {
  ActionInspection,
  BrowserObservations,
} from "./browser-observer.ts";
import { attempt, BrowserService } from "./lifecycle.ts";
import { measurementsFor, missingRequiredMeasurements } from "./measure.ts";
import {
  captureDocuments,
  installNavigationCapture,
  navigationMeasurements,
  waitForFixtureReady,
  waitForPublicState,
} from "./navigation.ts";
import type { PublicStateEvidence } from "./navigation.ts";
import { collectNetwork, partitionNetwork } from "./network.ts";
import { readServerEvidence } from "./server-evidence.ts";
import { emulateProfile } from "./targets.ts";

function expectedChoice(scenario: ScenarioConfig) {
  if (scenario.action === "accept") {
    return {
      allowedCategories: scenario.workload.categories,
      consent: "accepted",
    };
  }
  if (scenario.action === "save") {
    return {
      allowedCategories: scenario.workload.categories.slice(0, 1),
      consent: "custom",
    };
  }
  return { allowedCategories: [], consent: "rejected" };
}
interface Failure {
  code: string;
  message: string;
}
async function act(
  page: Page,
  selector: string,
  input: ScenarioConfig["input"],
  preparation = false
) {
  const control = page.locator(selector).first();
  if (input === "keyboard") {
    await control.focus();
    await page.keyboard.press("Enter");
  } else {
    await control.click({ force: !preparation, noWaitAfter: true });
  }
}
async function waitUntil(
  page: Page,
  predicate: () => boolean,
  timeout: number
): Promise<boolean> {
  try {
    await page.waitForFunction(predicate, undefined, {
      polling: "raf",
      timeout,
    });
    return true;
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      return false;
    }
    throw error;
  }
}
const contextResource = (
  browser: Browser,
  profile: DeviceProfile,
  storageState?: Awaited<ReturnType<BrowserContext["storageState"]>>
) =>
  Effect.acquireRelease(
    attempt("browser-context", () =>
      browser.newContext({
        deviceScaleFactor: profile.deviceScaleFactor,
        hasTouch: profile.hasTouch,
        isMobile: profile.isMobile,
        locale: profile.locale,
        storageState,
        userAgent: profile.userAgent,
        viewport: profile.viewport,
      })
    ),
    (context) => Effect.promise(() => context.close())
  );
const visitorStorage =
  "cookies,local_storage,indexeddb,websql,service_workers,cache_storage";
// Runs after every priming page has closed, so no timer or late response can write afterwards.
async function clearVisitorStorage(context: BrowserContext, origin: string) {
  await context.clearCookies();
  const visited = await context.storageState({ indexedDB: true });
  const page = await context.newPage();
  try {
    const session = await context.newCDPSession(page);
    for (const target of new Set([
      origin,
      ...visited.origins.map((item) => item.origin),
    ])) {
      // oxlint-disable-next-line no-await-in-loop -- One CDP session clears each origin in turn.
      await session.send("Storage.clearDataForOrigin", {
        origin: target,
        storageTypes: visitorStorage,
      });
    }
    await session.detach();
  } finally {
    await page.close();
  }
  const remaining = await context.storageState({ indexedDB: true });
  const residue = [
    ...remaining.cookies.map((cookie) => `cookie ${cookie.name}`),
    ...remaining.origins.flatMap((item) => [
      ...item.localStorage.map(
        (entry) => `localStorage ${entry.name} at ${item.origin}`
      ),
      // Playwright returns IndexedDB snapshots here but omits them from the declared type.
      ...((item as { indexedDB?: { name: string }[] }).indexedDB ?? []).map(
        (database) => `IndexedDB ${database.name} at ${item.origin}`
      ),
    ]),
  ];
  if (residue.length) {
    throw new Error(
      `Fresh warm-cache preparation left visitor storage: ${residue.join(", ")}`
    );
  }
}
export async function prime(
  context: BrowserContext,
  fixture: FixtureConfig,
  scenario: ScenarioConfig
) {
  const page = await context.newPage();
  page.setDefaultTimeout(scenario.actionDeadlineMs);
  try {
    const url = new URL(fixture.url);
    url.searchParams.set("scripts", String(scenario.workload.scriptCount));
    await page.goto(url.href, {
      timeout: scenario.navigationTimeoutMs,
      waitUntil: "load",
    });
    if (scenario.visitor === "fresh") {
      // Closing the page also discards its sessionStorage namespace.
      await page.close();
      await clearVisitorStorage(context, new URL(fixture.url).origin);
    } else {
      if (
        fixture.adapter.readinessSource === "public-state" ||
        fixture.adapter.ready
      ) {
        await waitForFixtureReady(
          page,
          fixture.adapter,
          scenario.actionDeadlineMs
        );
      }
      for (const selector of scenario.visitor === "returning-accepted"
        ? (fixture.adapter.acceptPreparation ?? [])
        : (fixture.adapter.rejectPreparation ?? [])) {
        // oxlint-disable-next-line no-await-in-loop -- Native selection steps must precede the one final commit.
        await act(page, selector, "pointer");
      }
      await act(
        page,
        scenario.visitor === "returning-accepted"
          ? fixture.adapter.accept
          : fixture.adapter.reject,
        "pointer"
      );
      const expected = {
        allowedCategories:
          scenario.visitor === "returning-accepted"
            ? scenario.workload.categories
            : [],
        consent:
          scenario.visitor === "returning-accepted" ? "accepted" : "rejected",
      };
      const prepared = await waitForPublicState(
        page,
        fixture.adapter,
        expected,
        scenario.actionDeadlineMs
      );
      if (!prepared.matches) {
        throw new Error(`Visitor preparation failed: ${prepared.reason}`);
      }
      // A public state transition can precede asynchronous persistence. Give the
      // real operation its declared observation period before testing restoration.
      const persistenceDeadline =
        (await page.evaluate(() => performance.now())) + scenario.observationMs;
      await page.waitForFunction(
        (deadline) => performance.now() >= deadline,
        persistenceDeadline,
        { timeout: scenario.observationMs + scenario.actionDeadlineMs }
      );
      await page.reload({
        timeout: scenario.navigationTimeoutMs,
        waitUntil: "load",
      });
      const restored = await waitForPublicState(
        page,
        fixture.adapter,
        expected,
        scenario.actionDeadlineMs
      );
      if (!restored.matches) {
        throw new Error(`Visitor restoration failed: ${restored.reason}`);
      }
    }
  } finally {
    await page.close();
  }
}
export function runSample(options: {
  browser: Browser;
  fixture: FixtureConfig;
  scenario: ScenarioConfig;
  profile: DeviceProfile;
  runId: string;
  iteration: number;
  vitalsSource: string;
  probe?: "primary" | "followup";
}) {
  return Effect.scoped(
    Effect.gen(function* scenarioScope() {
      const { fixture, profile, runId, iteration, vitalsSource } = options;
      const { browser } = yield* BrowserService;
      const scenario: ScenarioConfig = fixture.baseline
        ? {
            ...options.scenario,
            action: "load",
            expectedBanner: false,
            visitor: "fresh",
          }
        : options.scenario;
      const sampleId = randomUUID();
      const context = yield* contextResource(browser, profile);
      let measuredContext = context;
      if (scenario.visitor !== "fresh" || scenario.cache === "warm") {
        yield* attempt("visitor-preparation", () =>
          prime(context, fixture, scenario)
        );
        if (scenario.cache === "cold") {
          const storage = yield* attempt("visitor-storage", () =>
            context.storageState()
          );
          measuredContext = yield* contextResource(browser, profile, storage);
        }
      }
      // oxlint-disable-next-line complexity -- Keep the serial browser lifecycle and every failure check in one scoped flow.
      return yield* attempt("sample-browser", async (signal) => {
        const page = await measuredContext.newPage();
        signal.addEventListener(
          "abort",
          () => {
            void page.close().catch(() => {
              /* Scoped context cleanup also owns this page. */
            });
          },
          { once: true }
        );
        page.setDefaultTimeout(scenario.actionDeadlineMs);
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        const url = new URL(fixture.url);
        url.searchParams.set("scripts", String(scenario.workload.scriptCount));
        url.searchParams.set("token", sampleId);
        const network = await collectNetwork(page, url.href);
        const unthrottledTargets = await emulateProfile(
          network.session,
          network.targets,
          profile
        );
        const documentEvidence = await captureDocuments(
          network.session,
          "__cookiebenchCapture"
        );
        await page.addInitScript({
          content: `(${installObserver.toString()})(${JSON.stringify({ ...fixture.adapter, actionObservationMs: scenario.observationMs, categories: scenario.workload.categories, fixedDeadlineMs: scenario.action === "load" ? scenario.observationMs : undefined, maxDurationMs: scenario.navigationTimeoutMs + scenario.actionDeadlineMs * 3 + scenario.observationMs + 1000, paintGraceMs: PAINT_GRACE_MS })});\n${vitalsSource}\nwindow.webVitals = webVitals;\n(${installVitals.toString()})();\n(${installNavigationCapture.toString()})("__cookiebenchCapture", ${JSON.stringify(fixture.adapter.stateGlobal)});`,
        });
        const failures: Failure[] = [];
        await page.goto(url.href, {
          timeout: scenario.navigationTimeoutMs,
          waitUntil: "domcontentloaded",
        });
        let available = true;
        if (scenario.expectedBanner && scenario.action !== "load") {
          available = await waitUntil(
            page,
            () => window.__bench.observations.visibleAt !== undefined,
            scenario.actionDeadlineMs
          );
          if (!available) {
            failures.push({
              code: "banner-missing",
              message:
                "Expected banner was not observed visible before the deadline",
            });
          }
        }
        const initialTimeOrigin = await page.evaluate(
          () => performance.timeOrigin
        );
        let actionStarted = false;
        let actionNavigation: PublicStateEvidence | undefined;
        let actionNavigated = false;
        let lateActionObservation:
          | (ActionInspection & { complete: boolean; deadlineAt: number })
          | undefined;
        let preparationStartedAt: number | undefined;
        const choicePreparation: {
          selector: string;
          startedAt: number;
          completedAt: number;
        }[] = [];
        let commitPreparation:
          | {
              selector: string;
              startedAt: number;
              completedAt: number;
              method: string;
            }
          | undefined;
        let followup: Promise<void> | undefined;
        if (scenario.action !== "load" && available) {
          if (
            scenario.readiness === "ready" &&
            (fixture.adapter.readinessSource === "public-state" ||
              fixture.adapter.ready)
          ) {
            try {
              await waitForFixtureReady(
                page,
                fixture.adapter,
                scenario.actionDeadlineMs
              );
            } catch {
              available = false;
              failures.push({
                code: "controls-not-ready",
                message: "Declared readiness condition did not become true",
              });
            }
          }
          if (available) {
            preparationStartedAt = await page.evaluate(() => performance.now());
            const selector = fixture.adapter[scenario.action];
            if (selector) {
              if (
                scenario.action === "save" ||
                scenario.action === "withdraw"
              ) {
                const open =
                  scenario.action === "withdraw"
                    ? fixture.adapter.reopen
                    : fixture.adapter.preferences;
                if (open) {
                  await act(page, open, scenario.input, true);
                  if (
                    scenario.action === "save" &&
                    fixture.adapter.categoryToggle &&
                    fixture.adapter.savePreparation === undefined
                  ) {
                    await page
                      .locator(fixture.adapter.categoryToggle)
                      .check({ timeout: scenario.actionDeadlineMs });
                  }
                } else {
                  failures.push({
                    code: "unsupported-preferences",
                    message: "Adapter lacks the preferences opening control",
                  });
                }
              }
              let selections: readonly string[] = [];
              if (scenario.action === "accept") {
                selections = fixture.adapter.acceptPreparation ?? [];
              }
              if (scenario.action === "reject") {
                selections = fixture.adapter.rejectPreparation ?? [];
              }
              if (scenario.action === "save") {
                selections = fixture.adapter.savePreparation ?? [];
              }
              if (scenario.action === "withdraw") {
                selections = fixture.adapter.withdrawPreparation ?? [];
              }
              /* oxlint-disable no-await-in-loop -- Declared native draft selections and their timestamps precede the single commit. */
              for (const selection of selections ?? []) {
                const startedAt = await page.evaluate(() => performance.now());
                await act(page, selection, scenario.input, true);
                choicePreparation.push({
                  completedAt: await page.evaluate(() => performance.now()),
                  selector: selection,
                  startedAt,
                });
              }
              /* oxlint-enable no-await-in-loop */
              if (
                scenario.readiness === "ready" &&
                (scenario.action === "save" ||
                  scenario.action === "withdraw" ||
                  selections.length > 0)
              ) {
                const startedAt = await page.evaluate(() => performance.now());
                await page
                  .locator(selector)
                  .first()
                  .click({ timeout: scenario.actionDeadlineMs, trial: true });
                commitPreparation = {
                  completedAt: await page.evaluate(() => performance.now()),
                  method: "actionability-trial-no-input",
                  selector,
                  startedAt,
                };
              }
              await page.evaluate(
                ({ selector: target, action }) =>
                  window.__bench.arm(target, action),
                { action: scenario.action, selector }
              );
              await act(page, selector, scenario.input);
              actionStarted = true;
              if (
                options.probe === "followup" &&
                fixture.adapter.pageAction &&
                ["accept", "reject", "save", "withdraw"].includes(
                  scenario.action
                )
              ) {
                followup = (async () => {
                  // Input evidence is published after the next paint, so read the original
                  // document's trusted timestamp directly while it is still loaded.
                  const capturedInput = () =>
                    documentEvidence.find(
                      (entry) => entry.timeOrigin === initialTimeOrigin
                    )?.observations.input?.at;
                  const liveInput = await page
                    .evaluate(
                      (origin) =>
                        performance.timeOrigin === origin
                          ? (window.__bench.observations.input?.at ?? null)
                          : null,
                      initialTimeOrigin
                    )
                    .catch(() => null);
                  const inputAt = capturedInput() ?? liveInput ?? undefined;
                  await page.waitForFunction(
                    ({ offset, capturedEpoch }) => {
                      const at = window.__bench.observations.input?.at;
                      const epoch =
                        capturedEpoch ??
                        (at === undefined
                          ? undefined
                          : performance.timeOrigin + at);
                      return (
                        epoch !== undefined &&
                        performance.timeOrigin + performance.now() >=
                          epoch + offset
                      );
                    },
                    {
                      capturedEpoch:
                        inputAt === undefined
                          ? undefined
                          : initialTimeOrigin + inputAt,
                      offset: scenario.followupOffsetMs,
                    },
                    { timeout: scenario.actionDeadlineMs }
                  );
                  await page.evaluate(
                    ({ origin, target }) => {
                      if (performance.timeOrigin !== origin) {
                        window.__bench.arm(target, "preferences");
                      }
                    },
                    {
                      origin: initialTimeOrigin,
                      target: fixture.adapter.pageAction ?? "body",
                    }
                  );
                  await act(
                    page,
                    fixture.adapter.pageAction ?? "body",
                    scenario.input
                  );
                })().catch((error: unknown) => {
                  failures.push({
                    code: "page-interaction-failed",
                    message: String(error),
                  });
                });
              }
              const successful = await page
                .waitForFunction(
                  ({ origin, preferences }) =>
                    performance.timeOrigin !== origin ||
                    (preferences
                      ? window.__bench.observations.preferencesVisibleAt !==
                        undefined
                      : window.__bench.observations.effectiveAt !== undefined &&
                        window.__bench.observations.dismissedAt !== undefined),
                  {
                    origin: initialTimeOrigin,
                    preferences: scenario.action === "preferences",
                  },
                  { polling: "raf", timeout: scenario.actionDeadlineMs }
                )
                .then(
                  () => true,
                  (error: unknown) => {
                    if (
                      error instanceof Error &&
                      error.name === "TimeoutError"
                    ) {
                      return false;
                    }
                    throw error;
                  }
                );
              actionNavigated = await page.evaluate(
                (origin) => performance.timeOrigin !== origin,
                initialTimeOrigin
              );
              if (actionNavigated) {
                actionNavigation = await waitForPublicState(
                  page,
                  fixture.adapter,
                  expectedChoice(scenario),
                  scenario.actionDeadlineMs,
                  true
                );
                if (!actionNavigation.matches) {
                  failures.push({
                    code: "first-input-failed",
                    message: `Action navigated but did not complete: ${actionNavigation.reason ?? "consent-ui-not-dismissed"}`,
                  });
                }
              }
              if (!successful && !actionNavigated) {
                const inspection = await page.evaluate(() => ({
                  ...window.__bench.inspectAction(),
                  deadlineAt: window.__bench.observations.deadlineAt,
                }));
                let expectedCategories: readonly string[] = [];
                if (scenario.action === "accept") {
                  expectedCategories = scenario.workload.categories;
                }
                if (scenario.action === "save") {
                  expectedCategories = scenario.workload.categories.slice(0, 1);
                }
                const consentComplete =
                  inspection.consent !== undefined &&
                  inspection.consent !== "unset" &&
                  inspection.allowedCategories
                    ?.filter((category) =>
                      scenario.workload.categories.includes(category)
                    )
                    .toSorted()
                    .join(",") === [...expectedCategories].toSorted().join(",");
                const dismissed =
                  !inspection.bannerVisible &&
                  !inspection.blockingOverlay &&
                  (!["save", "withdraw"].includes(scenario.action) ||
                    !inspection.preferencesVisible);
                const complete =
                  scenario.action === "preferences"
                    ? inspection.preferencesVisible
                    : consentComplete && dismissed;
                if (
                  inspection.deadlineAt !== undefined &&
                  inspection.observedAt > inspection.deadlineAt
                ) {
                  lateActionObservation = {
                    ...inspection,
                    complete,
                    deadlineAt: inspection.deadlineAt,
                  };
                }
                failures.push(
                  lateActionObservation?.complete
                    ? {
                        code: "observation-window-exceeded",
                        message:
                          "Action completion was verified only after the measurement cutoff; the late correctness snapshot does not establish a completion duration",
                      }
                    : {
                        code: "first-input-failed",
                        message:
                          "The first input did not produce a verified completed action before the correctness deadline; no retry was made",
                      }
                );
              }
            } else {
              failures.push({
                code: "unsupported-action",
                message: `Adapter does not declare the ${scenario.action} action`,
              });
            }
          }
        }
        // The trusted original input and its browser time origin survive a document reload in host memory.
        const originalDocument = () =>
          documentEvidence.findLast(
            (entry) => entry.timeOrigin === initialTimeOrigin
          );
        const retainedInput = originalDocument()?.observations.input;
        const inputEpoch = retainedInput
          ? initialTimeOrigin + retainedInput.at
          : undefined;
        await page.waitForFunction(
          ({ duration, actionStarted: hasInput, capturedEpoch, origin }) => {
            const { input } = window.__bench.observations;
            let anchor = capturedEpoch;
            if (anchor === undefined && input) {
              anchor = performance.timeOrigin + input.at;
            }
            if (anchor === undefined && !hasInput) {
              anchor = origin;
            }
            return (
              anchor === undefined ||
              performance.timeOrigin + performance.now() >= anchor + duration
            );
          },
          {
            actionStarted,
            capturedEpoch: inputEpoch,
            duration: scenario.observationMs,
            origin: initialTimeOrigin,
          },
          { timeout: scenario.observationMs + scenario.actionDeadlineMs }
        );
        await followup;
        const finalDocumentData: BrowserObservations = await page.evaluate(() =>
          window.__bench.settle()
        );
        const finalTimeOrigin = await page.evaluate(
          () => performance.timeOrigin
        );
        actionNavigated ||= finalTimeOrigin !== initialTimeOrigin;
        if (actionNavigated && !actionNavigation) {
          actionNavigation = await waitForPublicState(
            page,
            fixture.adapter,
            expectedChoice(scenario),
            scenario.actionDeadlineMs,
            true
          );
          if (!actionNavigation.matches) {
            failures.push({
              code: "first-input-failed",
              message: `Action navigation state failed: ${actionNavigation.reason}`,
            });
          }
        }
        if (actionNavigated) {
          const newScripts = finalDocumentData.state?.scripts ?? [];
          const duplicates =
            newScripts.length -
            new Set(newScripts.map((script) => script.id)).size;
          if (duplicates) {
            failures.push({
              code: "duplicate-script-execution",
              message: `${duplicates} repeated controlled script executions in the action's new document`,
            });
          }
          const expected = expectedChoice(scenario).allowedCategories;
          for (const [kind, markers] of [
            ["script-execution", finalDocumentData.state?.scripts],
            ["storage-write", finalDocumentData.state?.storageWrites],
            ["frame-load", finalDocumentData.state?.frames],
          ] as const) {
            for (const marker of markers ?? []) {
              if (
                scenario.workload.categories.includes(marker.category) &&
                !expected.includes(marker.category)
              ) {
                failures.push({
                  code: `forbidden-${kind}`,
                  message: `Forbidden ${marker.category} activity in the action's new document at ${marker.at} ms`,
                });
              }
            }
          }
        }
        const retained = originalDocument();
        const data: BrowserObservations =
          actionNavigated && retained
            ? retained.observations
            : finalDocumentData;
        const timeOrigin =
          actionNavigated && retained ? retained.timeOrigin : finalTimeOrigin;
        const windowEnd = (data.input?.at ?? 0) + scenario.observationMs;
        const frozenRequests = await network.snapshot(timeOrigin + windowEnd);
        const networkCoverage = network.coverage();
        const requests = partitionNetwork(
          frozenRequests,
          data.input ? timeOrigin + data.input.at : undefined
        );
        if (
          scenario.action === "load" &&
          scenario.expectedBanner &&
          data.visibleAt === undefined
        ) {
          failures.push({
            code: "banner-missing",
            message:
              "Expected banner was not observed visible within the fixed load observation window",
          });
        }
        const actionEndpoints = [
          data.dismissedAt,
          data.preferencesVisibleAt,
          data.effectiveAt,
        ];
        if (
          scenario.action !== "load" &&
          actionEndpoints.some((at) => at !== undefined && at > windowEnd)
        ) {
          failures.push({
            code: "observation-window-exceeded",
            message:
              "Action completion required observation beyond the declared window; extended raw observations cannot support performance comparison",
          });
        }
        const { state } = data;
        if (
          !scenario.expectedBanner &&
          data.visibleAt !== undefined &&
          (preparationStartedAt === undefined ||
            data.visibleAt < preparationStartedAt)
        ) {
          failures.push({
            code: "unexpected-banner",
            message: "Banner was visible in a scenario expecting no banner",
          });
        }
        if (!fixture.baseline && !state) {
          failures.push({
            code: "state-unavailable",
            message:
              "Adapter did not expose public consent state and controlled execution markers",
          });
        }
        if (state) {
          const initialAllowed =
            scenario.visitor === "returning-accepted"
              ? scenario.workload.categories
              : [];
          let finalAllowed: readonly string[] = initialAllowed;
          if (scenario.action === "accept") {
            finalAllowed = scenario.workload.categories;
          }
          if (scenario.action === "save") {
            finalAllowed = scenario.workload.categories.slice(0, 1);
          }
          if (scenario.action === "reject" || scenario.action === "withdraw") {
            finalAllowed = [];
          }
          const permitted = (at: number) =>
            data.input && at >= data.input.at ? finalAllowed : initialAllowed;
          for (const write of state.storageWrites ?? []) {
            if (
              scenario.workload.categories.includes(write.category) &&
              !permitted(write.at).includes(write.category)
            ) {
              failures.push({
                code: "forbidden-storage-write",
                message: `${write.key} was written in forbidden category ${write.category} at ${write.at} ms`,
              });
            }
          }
          for (const frame of state.frames ?? []) {
            if (
              scenario.workload.categories.includes(frame.category) &&
              !permitted(frame.at).includes(frame.category)
            ) {
              failures.push({
                code: "forbidden-frame-load",
                message: `${frame.id} loaded in forbidden category ${frame.category} at ${frame.at} ms`,
              });
            }
          }
          for (const script of state.scripts) {
            if (!permitted(script.at).includes(script.category)) {
              failures.push({
                code: "forbidden-script-execution",
                message: `${script.id} executed in forbidden category ${script.category} at ${script.at} ms`,
              });
            }
          }
          const duplicates =
            state.scripts.length -
            new Set(state.scripts.map((script) => script.id)).size;
          if (duplicates) {
            failures.push({
              code: "duplicate-script-execution",
              message: `${duplicates} repeated controlled script executions`,
            });
          }
          const expectedCount = Array.from(
            { length: scenario.workload.scriptCount },
            (_, i) =>
              scenario.workload.categories[
                i % scenario.workload.categories.length
              ]
          ).filter((category) => finalAllowed.includes(category)).length;
          if (
            !actionNavigated &&
            (actionStarted || scenario.visitor === "returning-accepted") &&
            state.scripts.length < expectedCount
          ) {
            failures.push({
              code: "missing-script-execution",
              message: `Expected ${expectedCount} controlled executions, observed ${state.scripts.length}`,
            });
          }
          if (
            actionStarted &&
            !actionNavigated &&
            scenario.action !== "preferences" &&
            state.allowedCategories
              .filter((category) =>
                scenario.workload.categories.includes(category)
              )
              .toSorted()
              .join(",") !== [...finalAllowed].toSorted().join(",")
          ) {
            failures.push({
              code: "incorrect-permissions",
              message: `Expected allowed categories by the measurement cutoff ${finalAllowed.join(",")}, observed ${state.allowedCategories.join(",")}`,
            });
          }
          if (state.remoteError) {
            failures.push({
              code: "backend-persistence-failed",
              message: state.remoteError,
            });
          }
          if (
            followup &&
            state.pageActionAt === undefined &&
            finalDocumentData.state?.pageActionAt === undefined
          ) {
            failures.push({
              code: "page-unresponsive",
              message: "Page control did not respond after the consent action",
            });
          }
        }
        let serverEvents: unknown;
        if (fixture.adapter.serverEventsUrl) {
          const endpoint = new URL(fixture.adapter.serverEventsUrl);
          endpoint.searchParams.set("token", sampleId);
          try {
            serverEvents = await readServerEvidence(endpoint, signal);
          } catch (error) {
            serverEvents = { unavailable: String(error) };
            failures.push({
              code: "server-evidence-unavailable",
              message: String(error),
            });
          }
          if (Array.isArray(serverEvents)) {
            for (const event of serverEvents as {
              type: string;
              category?: string;
              id?: string;
              timestamp: number;
            }[]) {
              if (
                event.type !== "script" ||
                !event.category ||
                event.timestamp > timeOrigin + windowEnd
              ) {
                continue;
              }
              const beforeInput =
                !data.input || event.timestamp < timeOrigin + data.input.at;
              let allowed: readonly string[] =
                scenario.visitor === "returning-accepted"
                  ? scenario.workload.categories
                  : [];
              if (!beforeInput) {
                allowed =
                  actionNavigation?.state?.allowedCategories ??
                  state?.allowedCategories ??
                  [];
              }
              if (!allowed.includes(event.category)) {
                failures.push({
                  code: "forbidden-server-egress",
                  message: `Controlled server confirmed ${event.id} in forbidden category ${event.category}`,
                });
              }
            }
          }
        }
        // Persistence reload is a correctness check outside the measurement window.
        let persistenceVerified: boolean | undefined;
        let restoration: PublicStateEvidence | undefined;
        if (actionStarted && scenario.action !== "preferences" && state) {
          const restorationExpected =
            actionNavigation?.state ??
            (lateActionObservation?.complete ? lateActionObservation : state);
          await page.reload({
            timeout: scenario.navigationTimeoutMs,
            waitUntil: "load",
          });
          restoration = await waitForPublicState(
            page,
            fixture.adapter,
            {
              allowedCategories: restorationExpected.allowedCategories ?? [],
              consent: restorationExpected.consent ?? "unset",
            },
            scenario.actionDeadlineMs
          );
          persistenceVerified = restoration.matches;
          if (!persistenceVerified) {
            failures.push({
              code: restoration.ready
                ? "choice-lost-on-reload"
                : "restoration-not-ready",
              message: `Public consent restoration failed: ${restoration.reason}`,
            });
          }
        }
        const observedMeasurements = measurementsFor(
          data,
          requests,
          scenario,
          fixture,
          networkCoverage
        );
        const measurements = actionNavigated
          ? navigationMeasurements(observedMeasurements, retained !== undefined)
          : observedMeasurements;
        const missingRequired = missingRequiredMeasurements(
          measurements,
          scenario
        );
        if (missingRequired.length && failures.length === 0) {
          failures.push({
            code: "required-measurement-unavailable",
            message: `Required observations unavailable: ${missingRequired.map((metric) => metric.key).join(", ")}`,
          });
        }
        const outcome = failures.length ? "failed" : "passed";
        const status: Sample["status"] = failures.some(
          (failure) =>
            failure.code === "state-unavailable" ||
            failure.code === "restoration-not-ready" ||
            failure.code === "server-evidence-unavailable" ||
            failure.code === "required-measurement-unavailable" ||
            failure.code === "observation-window-exceeded" ||
            failure.code.startsWith("unsupported")
        )
          ? "incomplete"
          : outcome;
        return {
          attempt: 1,
          diagnostics: {
            actionCorrectness: actionNavigation
              ? {
                  method:
                    "post-navigation public readiness, consent, exact category equality and dismissed controls; independent of timing availability",
                  reason: actionNavigation.reason,
                  verified: actionNavigation.matches,
                }
              : undefined,
            actionNavigated,
            actionNavigation,
            browserErrors: errors,
            cache: scenario.cache,
            choicePreparation,
            choicePreparationMethod:
              "automation bounds from browser performance.now before and after each declared selection; final commit uses captured trusted event.timeStamp",
            choicePreparationToDismissedMs:
              !actionNavigated &&
              choicePreparation[0] &&
              data.dismissedAt !== undefined
                ? data.dismissedAt - choicePreparation[0].startedAt
                : undefined,
            choicePreparationToEffectiveMs:
              !actionNavigated &&
              choicePreparation[0] &&
              data.effectiveAt !== undefined
                ? data.effectiveAt - choicePreparation[0].startedAt
                : undefined,
            commitPreparation,
            correctnessChecksCompleted:
              !actionNavigated ||
              Boolean(
                actionNavigation?.matches &&
                retained?.reason !== "input" &&
                retained &&
                finalDocumentData.state &&
                expectedChoice(scenario).allowedCategories.length === 0
              ),
            deviceEmulation: {
              hasTouch: profile.hasTouch ?? false,
              isMobile: profile.isMobile,
              unthrottledTargets,
              userAgent: await page.evaluate(() => navigator.userAgent),
            },
            documentEvidence,
            followupOffsetMs: scenario.followupOffsetMs,
            followupTiming: (() => {
              const captured = documentEvidence.find((entry) =>
                entry.observations.inputs.some(
                  (input) => input.target === fixture.adapter.pageAction
                )
              );
              const local = data.inputs.find(
                (input) => input.target === fixture.adapter.pageAction
              );
              const actual =
                local ??
                captured?.observations.inputs.find(
                  (input) => input.target === fixture.adapter.pageAction
                );
              const actualOrigin = local ? timeOrigin : captured?.timeOrigin;
              const planned = data.input
                ? data.input.at + scenario.followupOffsetMs
                : undefined;
              return {
                actualAt: actual?.at,
                actualTimeOrigin: actualOrigin,
                crossDocument:
                  actualOrigin !== undefined && actualOrigin !== timeOrigin,
                latenessMs:
                  actual !== undefined &&
                  planned !== undefined &&
                  actualOrigin === timeOrigin
                    ? actual.at - planned
                    : undefined,
                plannedAt: planned,
                plannedTimeOrigin: timeOrigin,
              };
            })(),
            inputPolicy:
              "one attempt; actual event.timeStamp; forced pointer dispatch avoids actionability waits",
            lateActionObservation,
            measurementWindowEnd: windowEnd,
            networkCoverage,
            observationMs: scenario.observationMs,
            observations: data,
            persistenceVerified,
            postNavigationObservations: actionNavigated
              ? finalDocumentData
              : undefined,
            probe: options.probe ?? "primary",
            readinessAt: data.readyAt,
            readinessSource: fixture.adapter.readinessSource ?? "selector",
            readinessToInputMs:
              data.readyAt !== undefined && data.input
                ? data.input.at - data.readyAt
                : undefined,
            requests,
            restoration,
            serverEvents: serverEvents ?? {
              unavailable: "Fixture has no controlled server event endpoint",
            },
            timeOrigin,
            visitor: scenario.visitor,
          },
          failures,
          fixtureId: fixture.id,
          id: sampleId,
          iteration,
          measurements,
          runId,
          scenarioId: scenario.id,
          status,
        } satisfies Sample;
      });
    })
  );
}
