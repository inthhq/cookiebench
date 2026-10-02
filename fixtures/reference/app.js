(() => {
  const params = new URLSearchParams(location.search);
  const variant = params.get("variant") || "correct";
  const count = Number(params.get("scripts") || 2);
  const token = params.get("token") || "manual";
  const state = {
    allowedCategories: [],
    consent: "unset",
    frames: [],
    ready: false,
    scripts: [],
    storageWrites: [],
  };
  window.__cookiebench = state;
  let root = document;
  const banner = document.querySelector("#banner");
  if (variant === "shadow") {
    const host = document.querySelector("#banner-host");
    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent =
      "section{position:fixed;bottom:20px;left:20px;background:white;padding:24px;z-index:5;max-width:540px}button{padding:14px;margin:4px} [hidden]{display:none!important}";
    shadow.append(style, banner);
    root = shadow;
  }
  const find = (selector) =>
    root.querySelector(selector) || document.querySelector(selector);
  if (variant === "animated-dialog") {
    const choices = find("#choices");
    document.body.append(choices);
    choices.style.cssText =
      "position:fixed;bottom:20px;left:20px;background:white;padding:24px;z-index:6";
  }
  const overlay = document.createElement("div");
  overlay.id = "overlay";
  overlay.hidden = true;
  overlay.style.cssText =
    "position:fixed;inset:0;opacity:0;pointer-events:auto;z-index:20";
  document.body.append(overlay);
  const executed = new Set();
  const release = () => {
    for (let i = 0; i < count; i += 1) {
      const category = i % 2 === 0 ? "analytics" : "marketing";
      if (!state.allowedCategories.includes(category) && variant !== "leak") {
        continue;
      }
      const id = `script-${i}`;
      if (executed.has(id) && variant !== "duplicate") {
        continue;
      }
      executed.add(id);
      const script = document.createElement("script");
      script.src = `/controlled.js?id=${id}&category=${category}&token=${encodeURIComponent(token)}`;
      document.head.append(script);
    }
  };
  const show = () => {
    banner.hidden = false;
    find("#choices").hidden = false;
  };
  const apply = async (consent, categories) => {
    const consentDelayMs = Number(params.get("consentDelayMs") || 0);
    if (consentDelayMs > 0) {
      // oxlint-disable-next-line promise/avoid-new -- Controlled delay exercises consent applied after the measurement cutoff.
      await new Promise((resolve) => {
        setTimeout(resolve, consentDelayMs);
      });
    }
    state.consent = consent;
    state.allowedCategories = categories;
    state.effectiveAt = performance.now();
    if (variant === "transparent-overlay") {
      overlay.hidden = false;
      setTimeout(() => {
        overlay.hidden = true;
      }, 250);
    }
    find("#feedback").textContent = "Choice saved";
    state.acknowledgedAt = performance.now();
    if (variant === "delayed-local-persistence") {
      // oxlint-disable-next-line promise/avoid-new -- Browser timer models asynchronous storage completion.
      await new Promise((resolve) => {
        setTimeout(resolve, 250);
      });
    }
    localStorage.setItem(
      "reference-consent",
      JSON.stringify({ categories, consent })
    );
    state.persistedAt = performance.now();
    state.storageWrites.push({
      at: state.persistedAt,
      category: "necessary",
      key: "reference-consent",
    });
    release();
    if (variant === "duplicate") {
      release();
    }
    setTimeout(
      () => {
        banner.hidden = true;
        if (variant === "animated-dialog") {
          find("#choices").hidden = true;
        }
      },
      Number(
        params.get("dismissMs") || (variant === "animated-dialog" ? 250 : 0)
      )
    );
    try {
      const response = await fetch(
        `/consent?token=${encodeURIComponent(token)}&variant=${variant}`,
        { body: JSON.stringify({ categories, consent }), method: "POST" }
      );
      if (!response.ok) {
        throw new Error(`Consent endpoint returned ${response.status}`);
      }
      state.remotePersistedAt = performance.now();
    } catch (error) {
      state.remoteError = String(error);
    }
  };
  document.querySelector("#page-action").addEventListener("click", () => {
    state.pageActionAt = performance.now();
    state.pageActionCount = (state.pageActionCount || 0) + 1;
    document.querySelector("#page-result").textContent =
      `${state.pageActionCount} guides`;
  });
  document.querySelector("#reopen").addEventListener("click", show);
  if (variant === "baseline") {
    banner.remove();
    state.ready = true;
    document.documentElement.dataset.ready = "true";
    return;
  }
  if (variant === "missing") {
    banner.remove();
  }
  if (variant === "hidden") {
    banner.style.visibility = "hidden";
  }
  if (variant === "delayed") {
    banner.hidden = true;
    setTimeout(
      () => {
        banner.hidden = false;
      },
      Number(params.get("delayMs") || 150)
    );
  }
  if (variant === "leak") {
    release();
  }
  const stored = localStorage.getItem("reference-consent");
  if (stored) {
    try {
      const { consent, categories } = JSON.parse(stored);
      state.consent = consent;
      state.allowedCategories = categories;
      state.effectiveAt = performance.now();
      banner.hidden = true;
      release();
    } catch {
      state.restoreError = "Malformed stored consent";
    }
  }
  delete document.documentElement.dataset.storedConsent;
  const ready = () => {
    if (variant === "noninteractive" || variant === "missing") {
      return;
    }
    let draft;
    if (variant === "button-category") {
      const button = document.createElement("button");
      button.id = "select-analytics";
      button.textContent = "Allow analytics";
      button.addEventListener("click", () => {
        draft = { categories: ["analytics"], consent: "custom" };
        find("#save").disabled = true;
        setTimeout(() => {
          find("#save").disabled = false;
        }, 150);
      });
      button.disabled = true;
      find("#choices").append(button);
      find("#preferences").addEventListener("click", () => {
        setTimeout(() => {
          button.disabled = false;
        }, 150);
      });
    }
    const select = (consent, categories) => {
      if (variant === "draft-selection") {
        draft = { categories, consent };
        find("#choices").hidden = false;
      } else {
        apply(consent, categories);
      }
    };
    find("#accept").addEventListener("click", () =>
      select("accepted", ["analytics", "marketing"])
    );
    find("#reject").addEventListener("click", () => select("rejected", []));
    find("#preferences").addEventListener("click", () => {
      find("#choices").hidden = false;
      if (variant === "animated-dialog") {
        banner.hidden = true;
      }
    });
    find("#save").addEventListener("click", () => {
      if (draft) {
        apply(draft.consent, draft.categories);
      } else {
        apply("custom", find("#analytics").checked ? ["analytics"] : []);
      }
    });
    find("#withdraw").addEventListener("click", () => apply("rejected", []));
    state.ready = true;
    state.resolvedAt = performance.now();
    document.documentElement.dataset.ready = "true";
  };
  setTimeout(
    ready,
    variant === "hydration-delay" ? Number(params.get("hydrateMs") || 800) : 0
  );
  const asset = document.createElement("script");
  asset.src = `http://localhost:${location.port}/payload.js`;
  document.head.append(asset);
})();
