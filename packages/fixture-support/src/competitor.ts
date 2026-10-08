/* oxlint-disable promise/prefer-await-to-callbacks, node/callback-return -- Public CMP SDKs expose event callbacks; the adapter preserves those synchronous notification boundaries. */
import { controlledWorkload, initializeBridge } from "./browser.ts";
import { ketchSnapshot, normalizeCompetitorState } from "./competitor-state.ts";
import type { CompetitorSnapshot } from "./competitor-state.ts";

export type Competitor =
  | "cookie-control"
  | "cookie-yes"
  | "didomi"
  | "enzuzo"
  | "iubenda"
  | "ketch"
  | "onetrust"
  | "osano"
  | "usercentrics";
type Callback = () => void;
interface DidomiApi {
  getUserConsentStatusForPurpose: (purpose: string) => boolean | undefined;
  getCurrentUserStatus: () => { consent_string?: string | null };
  getUserStatus: () => { consent_string?: string | null };
  preferences: { show: () => void };
}
interface CookieControlApi {
  load: (configuration: Record<string, unknown>) => void;
  getCategoryConsent: (index: number) => boolean | null | undefined;
  open: () => void;
}
interface EnzuzoApi {
  consent: {
    getConsent: () => { analytics: boolean | null; marketing: boolean | null };
  };
  prefCenter: { show: () => void };
}
interface IubendaApi {
  getPreferences: () => { id?: number; purposes?: Record<string, boolean> };
  openPreferences: () => void;
}
interface OsanoApi {
  getConsent: () => Record<string, string>;
  addEventListener: (event: string, callback: Callback) => void;
  showDrawer: () => void;
}
interface OneTrustApi {
  OnConsentChanged: (callback: Callback) => void;
  IsAlertBoxClosedAndValid: () => boolean;
  ToggleInfoDisplay: () => void;
}
interface UsercentricsApi {
  isInitialized: () => Promise<boolean>;
  getConsentDetails: () => Promise<{
    consent: { type: "EXPLICIT" | "IMPLICIT" };
    services: Record<string, { consent?: { given: boolean } } | undefined>;
  }>;
  showSecondLayer: () => Promise<void>;
}
interface VendorWindow {
  CookieControl?: CookieControlApi;
  didomiConfig?: Record<string, unknown>;
  didomiOnReady?: ((api: DidomiApi) => void)[];
  didomiEventListeners?: { event: string; listener: Callback }[];
  Didomi?: DidomiApi;
  enzuzoEvents?: Record<string, Callback>;
  __enzuzoApi?: EnzuzoApi;
  _iub?: {
    csConfiguration?: Record<string, unknown>;
    cs?: { api: IubendaApi };
  };
  Osano?: { cm?: OsanoApi };
  OptanonWrapper?: Callback;
  OneTrust?: OneTrustApi;
  OnetrustActiveGroups?: string;
  semaphore?: unknown[][];
  ketch?: (...args: unknown[]) => void;
  __ucCmp?: UsercentricsApi;
  UC_AB_VARIANT?: string;
  getCkyConsent?: () => {
    isUserActionCompleted?: boolean;
    categories?: Record<string, boolean>;
  };
  revisitCkyConsent?: () => void;
}
interface Runtime {
  vendor: VendorWindow;
  /** Applies the vendor state; `ready` reports that its controls respond. */
  publish: (snapshot: CompetitorSnapshot, ready?: boolean) => void;
  reopen: (callback: Callback) => void;
  load: (
    url: string,
    attributes?: Record<string, string>,
    loaded?: Callback
  ) => void;
  waitFor: (callback: () => boolean) => void;
}

function civic(runtime: Runtime) {
  const { vendor, publish } = runtime;
  const sync = () => {
    const api = vendor.CookieControl;
    if (!api) {
      return;
    }
    const measurement = api.getCategoryConsent(0);
    const marketing = api.getCategoryConsent(1);
    publish({
      explicit:
        typeof measurement === "boolean" || typeof marketing === "boolean",
      permissions: {
        marketing: marketing === true,
        measurement: measurement === true,
      },
    });
  };
  const changed = () => {
    // Native callbacks precede the SDK persistence commit; read public state next frame.
    requestAnimationFrame(sync);
  };
  runtime.reopen(() => vendor.CookieControl?.open());
  runtime.load(
    "https://cc.cdn.civiccomputing.com/9/cookieControl-9.10.1.min.js",
    {},
    () => {
      vendor.CookieControl?.load({
        apiKey: "ce6586e299e7333a8c22432a32c1972fd859a49c",
        onLoad: sync,
        optionalCookies: [
          {
            cookies: [],
            description: "Measure use of the controlled benchmark page.",
            label: "Analytical Cookies",
            name: "analytics",
            onAccept: changed,
            onRevoke: changed,
          },
          {
            cookies: [],
            description:
              "Run the controlled marketing workload after permission.",
            label: "Marketing Cookies",
            name: "marketing",
            onAccept: changed,
            onRevoke: changed,
          },
        ],
        product: "COMMUNITY",
      });
    }
  );
}
function cookieYes(runtime: Runtime) {
  // getCkyConsent exists before the banner attaches its button handlers, and
  // an earlier click is ignored. Before then, revisitCkyConsent also throws for
  // a returning visitor. A stored choice applies at once, but readiness waits
  // for the banner.
  let bannerLoaded = false;
  const sync = () => {
    const snapshot = runtime.vendor.getCkyConsent?.();
    if (
      !snapshot ||
      !(bannerLoaded || snapshot.isUserActionCompleted === true)
    ) {
      return false;
    }
    runtime.publish(
      {
        explicit: snapshot.isUserActionCompleted === true,
        permissions: {
          marketing: snapshot.categories?.advertisement === true,
          measurement: snapshot.categories?.analytics === true,
        },
      },
      bannerLoaded
    );
    return true;
  };
  document.addEventListener("cookieyes_banner_load", () => {
    bannerLoaded = true;
    sync();
  });
  document.addEventListener("cookieyes_consent_update", sync);
  runtime.reopen(() => runtime.vendor.revisitCkyConsent?.());
  runtime.load(
    "https://cdn-cookieyes.com/client_data/830009093fab466a1ff5d9a1/script.js",
    { id: "cookieyes" },
    () => runtime.waitFor(sync)
  );
}
function didomi(runtime: Runtime) {
  const { vendor, publish } = runtime;
  const sync = () => {
    const api = vendor.Didomi;
    if (!api) {
      return;
    }
    const raw = api.getUserStatus();
    publish({
      explicit: Boolean(raw.consent_string),
      permissions: {
        marketing: api.getUserConsentStatusForPurpose("marketing") === true,
        measurement: api.getUserConsentStatusForPurpose("analytics") === true,
      },
    });
  };
  vendor.didomiConfig = {
    app: {
      apiKey: "7dd8ec4e-746c-455e-a610-99121b4148df",
      gdprAppliesGlobally: true,
    },
    user: { bots: { consentRequired: true } },
  };
  vendor.didomiOnReady = [...(vendor.didomiOnReady ?? []), sync];
  vendor.didomiEventListeners = [
    ...(vendor.didomiEventListeners ?? []),
    { event: "consent.changed", listener: sync },
  ];
  runtime.reopen(() => vendor.Didomi?.preferences.show());
  runtime.load(
    `https://sdk.privacy-center.org/7dd8ec4e-746c-455e-a610-99121b4148df/loader.js?target=${encodeURIComponent(location.hostname)}`
  );
}
function enzuzo(runtime: Runtime) {
  const { vendor, publish } = runtime;
  const sync = () => {
    const value = vendor.__enzuzoApi?.consent.getConsent();
    if (!value) {
      return;
    }
    publish({
      explicit:
        typeof value.analytics === "boolean" ||
        typeof value.marketing === "boolean",
      permissions: {
        marketing: value.marketing === true,
        measurement: value.analytics === true,
      },
    });
  };
  const changed = () => {
    // Native callbacks precede the SDK persistence commit; read public state next frame.
    requestAnimationFrame(sync);
  };
  vendor.enzuzoEvents = {
    onConsent: changed,
    onDecline: changed,
    onDismiss: changed,
    onInit: sync,
  };
  window.addEventListener("enzuzo_consent_update", changed);
  runtime.reopen(() => vendor.__enzuzoApi?.prefCenter.show());
  runtime.load(
    "https://app.enzuzo.com/scripts/cookiebar/ede431e2-968b-11eb-9cc0-2358d2c9e564",
    {},
    () =>
      runtime.waitFor(() => {
        if (!vendor.__enzuzoApi) {
          return false;
        }
        sync();
        return true;
      })
  );
}
function iubenda(runtime: Runtime) {
  const { vendor, publish } = runtime;
  const sync = () => {
    const value = vendor._iub?.cs?.api.getPreferences();
    if (!value) {
      return;
    }
    publish({
      explicit: value.id !== undefined,
      permissions: {
        marketing: value.purposes?.["5"] === true,
        measurement: value.purposes?.["4"] === true,
      },
    });
  };
  vendor._iub = {
    csConfiguration: {
      banner: {
        acceptButtonDisplay: true,
        closeButtonRejects: true,
        customizeButtonDisplay: true,
        rejectButtonDisplay: true,
      },
      callback: { onPreferenceExpressedOrNotNeeded: sync, onReady: sync },
      consentOnContinuedBrowsing: false,
      consentOnScroll: false,
      cookiePolicyId: 252_372,
      enableRemoteConsent: false,
      lang: "en",
      perPurposeConsent: true,
      siteId: 1,
    },
  };
  runtime.reopen(() => vendor._iub?.cs?.api.openPreferences());
  runtime.load("https://cdn.iubenda.com/cs/iubenda_cs.js", {
    charset: "utf-8",
  });
}
function ketch(runtime: Runtime) {
  const { vendor, publish } = runtime;
  vendor.semaphore ??= [];
  vendor.ketch = (...args) => {
    vendor.semaphore?.push(args);
  };
  vendor.ketch(
    "on",
    "consent",
    (value: Parameters<typeof ketchSnapshot>[0]) => {
      publish(ketchSnapshot(value));
    }
  );
  runtime.reopen(() => vendor.ketch?.("showPreferences"));
  runtime.load(
    "https://global.ketchcdn.com/web/v3/config/switchbitcorp/switchbit/boot.js"
  );
}
function oneTrust(runtime: Runtime) {
  const { vendor, publish } = runtime;
  let explicit = false;
  const sync = () => {
    if (!vendor.OneTrust) {
      return;
    }
    const groups = new Set((vendor.OnetrustActiveGroups ?? "").split(","));
    publish({
      explicit: explicit || vendor.OneTrust.IsAlertBoxClosedAndValid(),
      permissions: { marketing: groups.has("4"), measurement: groups.has("2") },
    });
  };
  vendor.OptanonWrapper = () => {
    sync();
    vendor.OneTrust?.OnConsentChanged(() => {
      explicit = true;
      sync();
    });
  };
  runtime.reopen(() => vendor.OneTrust?.ToggleInfoDisplay());
  runtime.load("https://cdn.cookielaw.org/scripttemplates/otSDKStub.js", {
    charset: "utf-8",
    "data-domain-script": "fff8df06-1dd2-491b-88f6-01cae248cd17-test",
  });
}
function osano(runtime: Runtime) {
  let explicit = false;
  const sync = () => {
    const value = runtime.vendor.Osano?.cm?.getConsent();
    if (!value) {
      return;
    }
    runtime.publish({
      explicit,
      permissions: {
        marketing: value.MARKETING === "ACCEPT",
        measurement: value.ANALYTICS === "ACCEPT",
      },
    });
  };
  runtime.reopen(() => runtime.vendor.Osano?.cm?.showDrawer());
  runtime.load(
    "https://cmp.osano.com/2sUBzx7wRdAfu6J2kkS/8e547744-886f-4a9b-a90f-7e96a47aa604/osano.js",
    {},
    () =>
      runtime.waitFor(() => {
        const api = runtime.vendor.Osano?.cm;
        if (!api) {
          return false;
        }
        api.addEventListener("osano-cm-initialized", sync);
        api.addEventListener("osano-cm-consent-changed", sync);
        // This public event also replays an existing saved choice on returning visits.
        api.addEventListener("osano-cm-consent-saved", () => {
          explicit = true;
          sync();
        });
        sync();
        return true;
      })
  );
}
function usercentrics(runtime: Runtime) {
  const sync = async () => {
    const api = runtime.vendor.__ucCmp;
    if (!(await api?.isInitialized())) {
      return;
    }
    const details = await api?.getConsentDetails();
    // IDs observed from this ruleset public API: Google Analytics 4 and Google Ads.
    const measurement = details?.services["87JYasXPF"]?.consent;
    const marketing = details?.services["ZNl-QzrhP"]?.consent;
    if (!details || !measurement || !marketing) {
      return;
    }
    runtime.publish({
      // The v3 SDK leaves service history empty; the consent type records a choice.
      explicit: details.consent.type === "EXPLICIT",
      permissions: {
        marketing: marketing.given,
        measurement: measurement.given,
      },
    });
  };
  const changed = async () => {
    try {
      await sync();
    } catch (error) {
      console.error("Usercentrics public snapshot failed", error);
    }
  };
  window.addEventListener("UC_UI_INITIALIZED", changed);
  // Dispatched for the initial state and after every consent change.
  window.addEventListener("UC_CONSENT", changed);
  runtime.reopen(() => runtime.vendor.__ucCmp?.showSecondLayer());
  // These settings use external A/B testing: the site names the variant, and
  // without one the SDK waits 2 s before requesting the banner.
  runtime.vendor.UC_AB_VARIANT = "variant0";
  runtime.load("https://web.cmp.usercentrics.eu/ui/loader.js", {
    "data-ruleset-id": "NFEcTLx7a",
    id: "usercentrics-cmp",
  });
}
function installCompetitor(
  name: Competitor,
  install: (runtime: Runtime) => void,
  classify?: (script: HTMLScriptElement, category: string) => void
): () => void {
  const page = window as unknown as { __cookiebenchInstalled?: Set<string> };
  page.__cookiebenchInstalled ??= new Set();
  if (page.__cookiebenchInstalled.has(name)) {
    return () => {
      /* The document bootstrap owns this installation. */
    };
  }
  page.__cookiebenchInstalled.add(name);
  const bridge = initializeBridge();
  const requested = new Set<string>();
  // Prepare native category annotations before SDK prototype interception begins.
  const workloadScripts = controlledWorkload().map((workload) => {
    const element = document.createElement("script");
    classify?.(element, workload.category);
    return { ...workload, element };
  });
  const scripts: HTMLScriptElement[] = [];
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let reopenButton: Element | null = null;
  let reopen: Callback | undefined;
  const open = () => reopen?.();
  const attachPage = () => {
    reopenButton = document.querySelector("#reopen-preferences");
    reopenButton?.addEventListener("click", open);
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachPage, { once: true });
  } else {
    attachPage();
  }
  const runtime: Runtime = {
    load: (url, attributes, loaded) => {
      const script = document.createElement("script");
      for (const [key, value] of Object.entries(attributes ?? {})) {
        script.setAttribute(key, value);
      }
      script.src = url;
      script.async = true;
      if (loaded) {
        script.addEventListener("load", loaded, { once: true });
      }
      document.head.append(script);
      scripts.push(script);
    },
    publish: (snapshot, ready = true) => {
      Object.assign(bridge, normalizeCompetitorState(snapshot));
      if (ready) {
        bridge.ready = true;
        document.documentElement.dataset.consentReady = "true";
      }
      for (const workload of workloadScripts) {
        if (
          !snapshot.permissions[workload.category] ||
          requested.has(workload.id)
        ) {
          continue;
        }
        requested.add(workload.id);
        const script = workload.element;
        script.src = workload.src;
        // This is callback-based integration, not a claim of native automatic blocking.
        document.head.append(script);
        scripts.push(script);
      }
    },
    reopen: (callback) => {
      reopen = callback;
    },
    vendor: window as unknown as VendorWindow,
    waitFor: (callback) => {
      const deadline = performance.now() + 15_000;
      const check = () => {
        if (callback() || performance.now() >= deadline) {
          return;
        }
        const timer = setTimeout(check, 100);
        timers.add(timer);
      };
      check();
    },
  };
  install(runtime);
  return () => {
    document.removeEventListener("DOMContentLoaded", attachPage);
    page.__cookiebenchInstalled?.delete(name);
    reopenButton?.removeEventListener("click", open);
    for (const timer of timers) {
      clearTimeout(timer);
    }
    for (const script of scripts) {
      script.remove();
    }
  };
}

export const installCookieControl = () =>
  installCompetitor("cookie-control", civic);

export const installCookieYes = () =>
  installCompetitor("cookie-yes", cookieYes);

export const installDidomi = () => installCompetitor("didomi", didomi);

export const installEnzuzo = () => installCompetitor("enzuzo", enzuzo);

export const installIubenda = () => installCompetitor("iubenda", iubenda);

export const installKetch = () => installCompetitor("ketch", ketch);

export const installOneTrust = () => installCompetitor("onetrust", oneTrust);

export const installOsano = () =>
  installCompetitor("osano", osano, (script, category) => {
    script.dataset.osano =
      category === "measurement" ? "ANALYTICS" : "MARKETING";
  });

export const installUsercentrics = () =>
  installCompetitor("usercentrics", usercentrics);
