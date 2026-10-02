/* oxlint-disable unicorn/consistent-function-scoping -- Playwright serializes installObserver as one function, including its DOM helpers. */
export interface FixtureState {
  consent: string;
  allowedCategories: string[];
  scripts: { id: string; category: string; at: number }[];
  storageWrites?: { key: string; category: string; at: number }[];
  frames?: { id: string; category: string; at: number; url?: string }[];
  ready?: boolean;
  effectiveAt?: number;
  resolvedAt?: number;
  acknowledgedAt?: number;
  persistedAt?: number;
  remotePersistedAt?: number;
  remoteError?: string;
  pageActionAt?: number;
}
export interface BrowserObservations {
  supported: string[];
  vitals: Record<string, { value: number; entries: unknown[] }>;
  webVitalsDiagnostics?: Record<string, { value: number; entries: unknown[] }>;
  lcpAttribution?: {
    role: "content" | "banner" | "other" | "unavailable";
    tag?: string;
    id?: string;
    url?: string;
    size: number;
  };
  firstHiddenAt?: number;
  visibleAt?: number;
  primaryVisibleAt?: number;
  readyAt?: number;
  readinessSource?: "public-state" | "selector";
  coverage?: number;
  preferencesVisibleAt?: number;
  dismissalStartedAt?: number;
  dismissedAt?: number;
  acknowledgedAt?: number;
  effectiveAt?: number;
  persistedAt?: number;
  remotePersistedAt?: number;
  input?: {
    at: number;
    handlerObservedAt: number;
    type: string;
    target: string;
  };
  inputs: {
    at: number;
    handlerObservedAt: number;
    type: string;
    target: string;
  }[];
  inputEvents?: {
    at: number;
    handlerObservedAt: number;
    type: string;
    target: string;
  }[];
  primaryContentPaintAt?: number;
  /** Declared primary content as inspected at the cutoff; absent from pre-cutoff snapshots. */
  primaryContentAtCutoff?: {
    present: boolean;
    elementTiming: boolean;
    imageComplete?: boolean;
  };
  events: {
    startTime: number;
    duration: number;
    interactionId: number;
    name: string;
    processingStart: number;
    processingEnd: number;
  }[];
  longTasks: { startTime: number; duration: number }[];
  state?: FixtureState;
  stateHistory: { at: number; consent: string; allowedCategories: string[] }[];
  probeStartedAt?: number;
  observationEndedAt?: number;
  deadlineAt?: number;
  frameIntervals: number[];
  observerCallbacks: number;
  /** Summed wall time inside the observer's own frame and mutation callbacks. */
  observerTimeMs?: number;
}
export interface ObserverConfig {
  banner: string;
  overlay?: string;
  acknowledgement?: string;
  preferencesPanel?: string;
  primaryContent?: string;
  ready?: string;
  readinessSource?: "public-state";
  pageAction?: string;
  stateGlobal: string;
  maxDurationMs: number;
  fixedDeadlineMs?: number;
  actionObservationMs?: number;
  /** Native observers stay connected this long after the cutoff before their queues drain. */
  paintGraceMs?: number;
  categories: readonly string[];
}
export interface ActionInspection {
  observedAt: number;
  bannerVisible: boolean;
  blockingOverlay: boolean;
  preferencesVisible: boolean;
  consent?: string;
  allowedCategories?: string[];
}
export interface BrowserBench {
  observations: BrowserObservations;
  query: (selector: string) => Element | null;
  visible: (element: Element | null) => boolean;
  arm: (selector: string, action: string) => void;
  stop: () => BrowserObservations;
  settle: () => Promise<BrowserObservations>;
  inspectAction: () => ActionInspection;
}
declare global {
  interface Window {
    __bench: BrowserBench;
    webVitals: Record<
      string,
      (
        callback: (metric: {
          name: string;
          value: number;
          entries: PerformanceEntry[];
        }) => void,
        options: { reportAllChanges: boolean }
      ) => void
    >;
  }
}

/** Bounded wait for paint entries that Chrome queues after frame presentation. */
export const PAINT_GRACE_MS = 250;

// Passed to addInitScript. Keep this function self-contained: it runs before fixture JavaScript.
// oxlint-disable-next-line unicorn/consistent-function-scoping -- Playwright serializes this entire function into the page; its helpers must remain inside.
export function installObserver(config: ObserverConfig) {
  if (window !== window.top) {
    return;
  }
  const observations: BrowserObservations = {
    events: [],
    frameIntervals: [],
    inputEvents: [],
    inputs: [],
    longTasks: [],
    observerCallbacks: 0,
    observerTimeMs: 0,
    stateHistory: [],
    supported: [...PerformanceObserver.supportedEntryTypes],
    vitals: {},
  };
  // Selector results stay valid until a DOM mutation, so idle frames repeat no query.
  // Observed selectors must depend on structure and attributes, not interaction state.
  let dirty = true;
  const watchOptions = { attributes: true, childList: true, subtree: true };
  const domWatch =
    typeof MutationObserver === "function"
      ? new MutationObserver(() => {
          const started = performance.now();
          // One record is enough to invalidate; reconnect at the next query.
          dirty = true;
          domWatch?.disconnect();
          observations.observerTimeMs =
            (observations.observerTimeMs ?? 0) + performance.now() - started;
        })
      : undefined;
  // Open shadow roots are registered by attachShadow and by whole-document walks at
  // install and readiness changes, which cover parser-created declarative roots.
  const shadowRoots = new Set<ShadowRoot>();
  const register = (root: ShadowRoot) => {
    shadowRoots.add(root);
    domWatch?.observe(root, watchOptions);
    dirty = true;
  };
  const discover = (root: Document | ShadowRoot) => {
    for (const element of root.querySelectorAll("*")) {
      if (element.shadowRoot && !shadowRoots.has(element.shadowRoot)) {
        register(element.shadowRoot);
        discover(element.shadowRoot);
      }
    }
  };
  const discoverDocument = () => {
    const started = performance.now();
    discover(document);
    observations.observerTimeMs =
      (observations.observerTimeMs ?? 0) + performance.now() - started;
  };
  discoverDocument();
  document.addEventListener("readystatechange", discoverDocument);
  if (typeof Element === "function") {
    const { attachShadow: nativeAttachShadow } = Element.prototype;
    // A shadow root attached to a connected host produces no light-DOM mutation record.
    // oxlint-disable-next-line no-extend-native -- Transparent wrapper; closed roots stay untraversed.
    Element.prototype.attachShadow = function attachShadow(
      this: Element,
      init: ShadowRootInit
    ) {
      const root = nativeAttachShadow.call(this, init);
      if (this.shadowRoot === root) {
        register(root);
      }
      return root;
    };
  }
  const cached = new Map<string, Element | null>();
  const cachedAll = new Map<string, Element[]>();
  const refresh = () => {
    if (!dirty) {
      return;
    }
    cached.clear();
    cachedAll.clear();
    dirty = !domWatch;
    domWatch?.observe(document, watchOptions);
    for (const root of shadowRoots) {
      domWatch?.observe(root, watchOptions);
    }
  };
  const roots = (): (Document | ShadowRoot)[] => [
    document,
    ...[...shadowRoots].filter((root) => root.host.isConnected),
  ];
  const query = (selector: string): Element | null => {
    refresh();
    let found = cached.get(selector);
    if (found === undefined) {
      found = null;
      for (const root of roots()) {
        found = root.querySelector(selector);
        if (found) {
          break;
        }
      }
      cached.set(selector, found);
    }
    return found;
  };
  // Visible means any rendered pixel: some opacity and some area inside the viewport.
  // The same pass yields the rendered footprint, effective opacity times viewport area.
  const presence = (element: Element | null, ignoreOpacity = false) => {
    const hidden = { area: 0, footprint: 0, intercepts: false, visible: false };
    if (!element || !element.isConnected) {
      return hidden;
    }
    let opacity = 1;
    let intercepts = true;
    let ancestor: Element | null = element;
    while (ancestor) {
      const style = getComputedStyle(ancestor);
      if (
        style.display === "none" ||
        style.visibility === "hidden" ||
        style.visibility === "collapse" ||
        (!ignoreOpacity && Number(style.opacity) === 0) ||
        style.contentVisibility === "hidden"
      ) {
        return hidden;
      }
      if (ancestor === element) {
        intercepts = style.pointerEvents !== "none";
      }
      opacity *= Number(style.opacity);
      ancestor =
        ancestor.parentElement ||
        (ancestor.getRootNode() instanceof ShadowRoot
          ? (ancestor.getRootNode() as ShadowRoot).host
          : null);
    }
    const rect = element.getBoundingClientRect();
    const shown =
      rect.width > 0 &&
      rect.height > 0 &&
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.left < innerWidth &&
      rect.top < innerHeight;
    const area = shown
      ? (Math.min(rect.right, innerWidth) - Math.max(rect.left, 0)) *
        (Math.min(rect.bottom, innerHeight) - Math.max(rect.top, 0))
      : 0;
    return { area, footprint: area * opacity, intercepts, visible: shown };
  };
  const visible = (element: Element | null, ignoreOpacity = false): boolean =>
    presence(element, ignoreOpacity).visible;
  const queryAll = (selector: string): Element[] => {
    refresh();
    let elements = cachedAll.get(selector);
    if (!elements) {
      elements = roots().flatMap((root) => [
        ...root.querySelectorAll(selector),
      ]);
      cachedAll.set(selector, elements);
    }
    return elements;
  };
  const blocking = (element: Element | null): boolean =>
    Boolean(
      element &&
      visible(element, true) &&
      getComputedStyle(element).pointerEvents !== "none"
    );
  let armedSelector: string | undefined;
  let armedAction: string | undefined;
  // The consent surface visible at arm, and its footprint at the latest inspection.
  let dismissalSurface: { selector: string; footprint: number } | undefined;
  let feedbackBefore: string | undefined;
  let lastFrame: number | undefined;
  // DOM state freezes at the cutoff; native observers stop after the presentation grace.
  let frozen = false;
  let stopped = false;
  let settling: Promise<BrowserObservations> | undefined;
  const cutoff = () =>
    observations.observationEndedAt ?? observations.deadlineAt ?? Infinity;
  const observers: {
    observer: PerformanceObserver;
    callback: (entries: PerformanceEntry[]) => void;
  }[] = [];
  const addObserver = (
    type: string,
    collectEntries: (entries: PerformanceEntry[]) => void,
    extra = {}
  ) => {
    if (!observations.supported.includes(type)) {
      return;
    }
    const collectWithinWindow = (entries: PerformanceEntry[]) =>
      collectEntries(entries.filter((entry) => entry.startTime <= cutoff()));
    const observer = new PerformanceObserver((list) =>
      collectWithinWindow(list.getEntries())
    );
    observer.observe({ buffered: true, type, ...extra });
    observers.push({ callback: collectWithinWindow, observer });
  };
  addObserver("longtask", (entries) => {
    for (const entry of entries) {
      observations.longTasks.push({
        duration: entry.duration,
        startTime: entry.startTime,
      });
    }
  });
  addObserver(
    "event",
    (entries) => {
      for (const entry of entries) {
        const event = entry as PerformanceEventTiming;
        observations.events.push({
          duration: event.duration,
          interactionId: event.interactionId,
          name: event.name,
          processingEnd: event.processingEnd,
          processingStart: event.processingStart,
          startTime: event.startTime,
        });
      }
    },
    { durationThreshold: 16 }
  );
  let firstHiddenAt = document.visibilityState === "hidden" ? 0 : Infinity;
  document.addEventListener(
    "visibilitychange",
    (event) => {
      if (document.visibilityState === "hidden" && firstHiddenAt === Infinity) {
        firstHiddenAt = event.timeStamp;
        observations.firstHiddenAt = firstHiddenAt;
      }
    },
    { capture: true }
  );
  const nativeEntry = (entry: PerformanceEntry) => {
    const item = entry as PerformanceEntry & {
      element?: Element;
      url?: string;
    };
    return {
      ...entry.toJSON(),
      element: item.element
        ? { id: item.element.id, tag: item.element.tagName }
        : undefined,
      url: item.url,
    };
  };
  let largestSession = { entries: [] as unknown[], value: 0 };
  addObserver("paint", (entries) => {
    for (const entry of entries) {
      if (
        entry.name === "first-contentful-paint" &&
        entry.startTime < firstHiddenAt
      ) {
        observations.vitals.FCP = {
          entries: [nativeEntry(entry)],
          value: entry.startTime,
        };
        if (observations.supported.includes("layout-shift")) {
          observations.vitals.CLS = { ...largestSession };
        }
      }
    }
  });
  addObserver("navigation", (entries) => {
    for (const entry of entries) {
      const navigation = entry as PerformanceNavigationTiming;
      if (
        navigation.responseStart > 0 &&
        navigation.responseStart <= (observations.deadlineAt ?? Infinity)
      ) {
        observations.vitals.TTFB = {
          entries: [nativeEntry(entry)],
          value: navigation.responseStart,
        };
      }
    }
  });
  addObserver("largest-contentful-paint", (entries) => {
    for (const entry of entries) {
      if (entry.startTime >= firstHiddenAt) {
        continue;
      }
      const candidate = entry as PerformanceEntry & {
        element?: Element;
        url?: string;
        size: number;
      };
      const { element } = candidate;
      const primary = config.primaryContent
        ? query(config.primaryContent)
        : null;
      const banner = query(config.banner);
      const panel = config.preferencesPanel
        ? query(config.preferencesPanel)
        : null;
      let role: "content" | "banner" | "other" | "unavailable" = "unavailable";
      if (element) {
        role = "other";
        if (element === primary || primary?.contains(element)) {
          role = "content";
        }
        if (
          element === banner ||
          banner?.contains(element) ||
          element === panel ||
          panel?.contains(element)
        ) {
          role = "banner";
        }
      }
      observations.lcpAttribution = {
        id: element?.id,
        role,
        size: candidate.size,
        tag: element?.tagName,
        url: candidate.url,
      };
      observations.vitals.LCP = {
        entries: [nativeEntry(entry)],
        value: entry.startTime,
      };
    }
  });
  let sessionValue = 0;
  let sessionFirst = 0;
  let sessionLast = 0;
  let sessionEntries: unknown[] = [];
  addObserver("layout-shift", (entries) => {
    for (const entry of entries) {
      const shift = entry as PerformanceEntry & {
        hadRecentInput: boolean;
        value: number;
      };
      if (shift.hadRecentInput || shift.startTime >= firstHiddenAt) {
        continue;
      }
      if (
        sessionValue > 0 &&
        shift.startTime - sessionLast < 1000 &&
        shift.startTime - sessionFirst < 5000
      ) {
        sessionValue += shift.value;
        sessionEntries.push(nativeEntry(shift));
      } else {
        sessionValue = shift.value;
        sessionFirst = shift.startTime;
        sessionEntries = [nativeEntry(shift)];
      }
      sessionLast = shift.startTime;
      if (sessionValue > largestSession.value) {
        largestSession = { entries: [...sessionEntries], value: sessionValue };
        if (observations.vitals.FCP) {
          observations.vitals.CLS = { ...largestSession };
        }
      }
    }
  });
  addObserver("element", (entries) => {
    for (const entry of entries) {
      const paint = entry as PerformanceEntry & {
        identifier: string;
        renderTime: number;
      };
      if (
        paint.identifier === "primary-content" &&
        paint.renderTime > 0 &&
        paint.renderTime <= cutoff() &&
        paint.renderTime < firstHiddenAt &&
        observations.primaryContentPaintAt === undefined
      ) {
        observations.primaryContentPaintAt = paint.renderTime;
      }
    }
  });
  // A primary image still loading or unpainted at cutoff can become a later, larger LCP candidate.
  const inspectPrimaryContent = ():
    | BrowserObservations["primaryContentAtCutoff"]
    | undefined => {
    if (!config.primaryContent) {
      return;
    }
    const primary = query(config.primaryContent);
    return {
      elementTiming:
        primary?.getAttribute("elementtiming") === "primary-content",
      imageComplete:
        primary?.tagName === "IMG"
          ? (primary as HTMLImageElement).complete &&
            (primary as HTMLImageElement).naturalWidth > 0
          : undefined,
      present: Boolean(primary),
    };
  };
  const freeze = () => {
    if (frozen) {
      return;
    }
    frozen = true;
    observations.observationEndedAt = Math.min(
      performance.now(),
      observations.deadlineAt ?? Infinity
    );
    // Timestamped append-only markers can be finalized without inventing a late permissions snapshot.
    const finalState = (window as unknown as Record<string, FixtureState>)[
      config.stateGlobal
    ];
    if (observations.state && finalState) {
      const endedAt = observations.observationEndedAt;
      observations.state.scripts = finalState.scripts
        .filter((item) => item.at <= endedAt)
        .map((item) => ({ ...item }));
      observations.state.storageWrites = finalState.storageWrites
        ?.filter((item) => item.at <= endedAt)
        .map((item) => ({ ...item }));
      observations.state.frames = finalState.frames
        ?.filter((item) => item.at <= endedAt)
        .map((item) => ({ ...item }));
      for (const key of [
        "persistedAt",
        "remotePersistedAt",
        "resolvedAt",
      ] as const) {
        const at = finalState[key];
        if (at !== undefined && at <= endedAt) {
          observations.state[key] = at;
          if (key !== "resolvedAt") {
            observations[key] = at;
          }
        }
      }
    }
    observations.primaryContentAtCutoff = inspectPrimaryContent();
    const navigation = performance.getEntriesByType?.("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (
      navigation &&
      navigation.responseStart > 0 &&
      navigation.responseStart <= observations.observationEndedAt
    ) {
      observations.vitals.TTFB = {
        entries: [nativeEntry(navigation)],
        value: navigation.responseStart,
      };
    }
  };
  // Synchronous stop drains only entries already queued; pagehide has no time for a grace period.
  const stop = () => {
    freeze();
    if (stopped) {
      return observations;
    }
    stopped = true;
    for (const { observer, callback: collectEntries } of observers) {
      collectEntries(observer.takeRecords());
      observer.disconnect();
    }
    return observations;
  };
  // Chrome queues paint entries after frame presentation, so a paint just before the cutoff
  // can arrive after it. Entries remain admitted by occurrence time, never by delivery time.
  const settle = () => {
    freeze();
    // oxlint-disable-next-line promise/avoid-new -- The page-side timer callback resolves the one shared settlement.
    settling ??= new Promise<BrowserObservations>((resolve) => {
      const drainAfterGrace = () => {
        const remaining =
          cutoff() + (config.paintGraceMs ?? 0) - performance.now();
        if (stopped || remaining <= 0) {
          resolve(stop());
          return;
        }
        setTimeout(drainAfterGrace, remaining);
      };
      drainAfterGrace();
    });
    return settling;
  };
  // Timers can fire marginally early; the cutoff never precedes the declared deadline.
  const settleAtDeadline = () => {
    const remaining = (observations.deadlineAt ?? 0) - performance.now();
    if (remaining > 0) {
      setTimeout(settleAtDeadline, remaining);
      return;
    }
    void settle();
  };
  let activeInput:
    | { target: string; key?: string; pointerId?: number }
    | undefined;
  // oxlint-disable-next-line complexity -- Trusted event admission checks identity, activation keys, deadlines and primary/followup ownership together.
  const inputListener = (event: Event) => {
    if (
      frozen ||
      !armedSelector ||
      !event.isTrusted ||
      performance.now() > (observations.deadlineAt ?? Infinity)
    ) {
      return;
    }
    if (
      ["keydown", "keyup"].includes(event.type) &&
      !["Enter", " "].includes((event as KeyboardEvent).key)
    ) {
      return;
    }
    const followup = config.pageAction ? query(config.pageAction) : null;
    const relatedKeyboard =
      activeInput?.key !== undefined &&
      ((event.type === "keyup" &&
        (event as KeyboardEvent).key === activeInput.key) ||
        (event.type === "click" && (event as MouseEvent).detail === 0));
    const relatedPointer =
      activeInput?.pointerId !== undefined &&
      ["pointerup", "click"].includes(event.type) &&
      (event as PointerEvent).pointerId === activeInput.pointerId;
    const related = relatedKeyboard || relatedPointer;
    const isFollowup = related
      ? activeInput?.target === config.pageAction
      : followup && event.composedPath().includes(followup);
    const control = query(armedSelector);
    if (
      !related &&
      !isFollowup &&
      (!control || !event.composedPath().includes(control))
    ) {
      return;
    }
    const input = {
      at: event.timeStamp,
      handlerObservedAt: performance.now(),
      target:
        isFollowup && config.pageAction ? config.pageAction : armedSelector,
      type: event.type,
    };
    const startsInput = ["pointerdown", "keydown"].includes(event.type);
    if (startsInput) {
      activeInput = {
        key:
          event.type === "keydown" ? (event as KeyboardEvent).key : undefined,
        pointerId:
          event.type === "pointerdown"
            ? (event as PointerEvent).pointerId
            : undefined,
        target: input.target,
      };
    } else if (
      event.type === "keyup" ||
      (event.type === "click" && relatedPointer)
    ) {
      activeInput = undefined;
    }
    observations.inputEvents?.push(input);
    if (!startsInput || (!isFollowup && observations.input)) {
      return;
    }
    if (!isFollowup) {
      observations.input = input;
      if (config.actionObservationMs !== undefined) {
        observations.deadlineAt = input.at + config.actionObservationMs;
        settleAtDeadline();
      }
    }
    observations.inputs.push(input);
  };
  for (const name of [
    "pointerdown",
    "pointerup",
    "click",
    "keydown",
    "keyup",
  ]) {
    document.addEventListener(name, inputListener, {
      capture: true,
      passive: true,
    });
  }
  // oxlint-disable-next-line complexity -- One bounded frame callback observes independent optional milestones without scheduling extra work.
  const tick = (frameAt: number) => {
    const at = performance.now();
    if (frozen) {
      return;
    }
    if (at > (observations.deadlineAt ?? Infinity)) {
      void settle();
      return;
    }
    observations.observerCallbacks += 1;
    if (lastFrame !== undefined && observations.frameIntervals.length < 1000) {
      observations.frameIntervals.push(frameAt - lastFrame);
    }
    lastFrame = frameAt;
    if (
      observations.readyAt === undefined &&
      (config.readinessSource === "public-state"
        ? (window as unknown as Record<string, FixtureState | undefined>)[
            config.stateGlobal
          ]?.ready === true
        : Boolean(config.ready && query(config.ready)))
    ) {
      observations.readyAt = at;
      observations.readinessSource = config.readinessSource ?? "selector";
    }
    // Banner layout is read only until it appears and while a timed dismissal is pending.
    const awaitingDismissal =
      observations.input !== undefined &&
      observations.dismissedAt === undefined;
    const banner = presence(
      observations.visibleAt === undefined || awaitingDismissal
        ? query(config.banner)
        : null
    );
    // Dismissal starts when the armed surface first loses rendered footprint, stops
    // taking pointer input, or disappears. Exit animations stay inside action.dismissed.
    if (
      dismissalSurface &&
      observations.input &&
      observations.dismissalStartedAt === undefined
    ) {
      const surface =
        dismissalSurface.selector === config.banner
          ? banner
          : presence(query(dismissalSurface.selector));
      if (
        !surface.visible ||
        !surface.intercepts ||
        surface.footprint < dismissalSurface.footprint * 0.99
      ) {
        observations.dismissalStartedAt = at;
      } else {
        dismissalSurface.footprint = surface.footprint;
      }
    }
    if (banner.visible) {
      if (observations.visibleAt === undefined) {
        observations.visibleAt = at;
        observations.coverage = banner.area / (innerWidth * innerHeight);
      }
    } else if (
      awaitingDismissal &&
      !(config.overlay && queryAll(config.overlay).some(blocking)) &&
      !(
        ["save", "withdraw"].includes(armedAction ?? "") &&
        visible(config.preferencesPanel ? query(config.preferencesPanel) : null)
      )
    ) {
      observations.dismissedAt = at;
    }
    if (
      config.primaryContent &&
      observations.primaryVisibleAt === undefined &&
      visible(query(config.primaryContent))
    ) {
      observations.primaryVisibleAt = at;
    }
    if (
      armedAction === "preferences" &&
      observations.input &&
      config.preferencesPanel &&
      observations.preferencesVisibleAt === undefined &&
      visible(query(config.preferencesPanel))
    ) {
      observations.preferencesVisibleAt = at;
    }
    if (
      observations.input &&
      config.acknowledgement &&
      observations.acknowledgedAt === undefined
    ) {
      const acknowledgement = query(config.acknowledgement);
      if (
        visible(acknowledgement) &&
        acknowledgement?.textContent !== feedbackBefore
      ) {
        observations.acknowledgedAt = at;
      }
    }
    const state = (window as unknown as Record<string, unknown>)[
      config.stateGlobal
    ] as FixtureState | undefined;
    if (
      state &&
      Array.isArray(state.allowedCategories) &&
      Array.isArray(state.scripts)
    ) {
      observations.state = {
        ...state,
        allowedCategories: [...state.allowedCategories],
        frames: state.frames?.map((frame) => ({ ...frame })),
        scripts: state.scripts.map((script) => ({ ...script })),
        storageWrites: state.storageWrites?.map((write) => ({ ...write })),
      };
      const previous = observations.stateHistory.at(-1);
      if (
        !previous ||
        previous.consent !== state.consent ||
        previous.allowedCategories.join(",") !==
          state.allowedCategories.join(",")
      ) {
        observations.stateHistory.push({
          allowedCategories: [...state.allowedCategories],
          at,
          consent: state.consent,
        });
      }
      let expectedCategories: readonly string[] | undefined;
      if (armedAction === "accept") {
        expectedCategories = config.categories;
      }
      if (armedAction === "reject" || armedAction === "withdraw") {
        expectedCategories = [];
      }
      if (armedAction === "save") {
        expectedCategories = config.categories.slice(0, 1);
      }
      const currentCategories = state.allowedCategories.filter((category) =>
        config.categories.includes(category)
      );
      if (
        observations.input &&
        expectedCategories &&
        state.consent !== "unset" &&
        [...currentCategories].toSorted().join(",") ===
          [...expectedCategories].toSorted().join(",") &&
        observations.effectiveAt === undefined
      ) {
        observations.effectiveAt = at;
      }
      if (state.persistedAt !== undefined) {
        observations.persistedAt = state.persistedAt;
      }
      if (state.remotePersistedAt !== undefined) {
        observations.remotePersistedAt = state.remotePersistedAt;
      }
    }
    observations.observerTimeMs =
      (observations.observerTimeMs ?? 0) + performance.now() - at;
    if (performance.now() <= config.maxDurationMs) {
      requestAnimationFrame(tick);
    } else {
      void settle();
    }
  };
  window.__bench = {
    arm: (selector, action) => {
      armedSelector = selector;
      armedAction = action;
      activeInput = undefined;
      observations.input = undefined;
      observations.inputEvents = [];
      observations.dismissedAt = undefined;
      observations.dismissalStartedAt = undefined;
      observations.effectiveAt = undefined;
      observations.acknowledgedAt = undefined;
      observations.preferencesVisibleAt = undefined;
      observations.probeStartedAt = performance.now();
      const surfaceSelector =
        ["save", "withdraw"].includes(action) && config.preferencesPanel
          ? config.preferencesPanel
          : config.banner;
      const surface = presence(query(surfaceSelector));
      dismissalSurface = surface.visible
        ? { footprint: surface.footprint, selector: surfaceSelector }
        : undefined;
      feedbackBefore = config.acknowledgement
        ? (query(config.acknowledgement)?.textContent ?? undefined)
        : undefined;
    },
    inspectAction: () => {
      const state = (
        window as unknown as Record<string, FixtureState | undefined>
      )[config.stateGlobal];
      return {
        allowedCategories: state?.allowedCategories
          ? [...state.allowedCategories]
          : undefined,
        bannerVisible: visible(query(config.banner)),
        blockingOverlay: Boolean(
          config.overlay && queryAll(config.overlay).some(blocking)
        ),
        consent: state?.consent,
        observedAt: performance.now(),
        preferencesVisible: Boolean(
          config.preferencesPanel && visible(query(config.preferencesPanel))
        ),
      };
    },
    observations,
    query,
    settle,
    stop,
    visible,
  };
  if (config.fixedDeadlineMs !== undefined) {
    observations.deadlineAt = config.fixedDeadlineMs;
    settleAtDeadline();
  }
  requestAnimationFrame(tick);
}

export function installVitals() {
  if (window !== window.top || !window.__bench) {
    return;
  }
  for (const [method, name] of [
    ["onCLS", "CLS"],
    ["onLCP", "LCP"],
    ["onINP", "INP"],
    ["onFCP", "FCP"],
    ["onTTFB", "TTFB"],
  ]) {
    window.webVitals[method]?.(
      (metric) => {
        const { observations } = window.__bench;
        if (
          observations.observationEndedAt !== undefined ||
          performance.now() > (observations.deadlineAt ?? Infinity)
        ) {
          return;
        }
        observations.webVitalsDiagnostics ??= {};
        observations.webVitalsDiagnostics[name] = {
          entries: metric.entries.map((entry) => {
            const item = entry as PerformanceEntry & {
              element?: Element;
              url?: string;
            };
            return {
              ...entry.toJSON(),
              element: item.element
                ? { id: item.element.id, tag: item.element.tagName }
                : undefined,
              url: item.url,
            };
          }),
          value: metric.value,
        };
      },
      { reportAllChanges: true }
    );
  }
}
