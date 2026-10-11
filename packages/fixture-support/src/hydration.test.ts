import { afterEach, describe, expect, it, vi } from "vitest";

import { afterHydration } from "./hydration.ts";

// A document whose #page-action the page's client effect marks on hydration.
function page() {
  let hydrated = false;
  const observers: { callback: () => void; disconnected: boolean }[] = [];
  vi.stubGlobal("document", {
    documentElement: {},
    querySelector: () => (hydrated ? {} : null),
  });
  vi.stubGlobal(
    "MutationObserver",
    class {
      entry: { callback: () => void; disconnected: boolean };
      constructor(notify: () => void) {
        this.entry = { callback: notify, disconnected: true };
        observers.push(this.entry);
      }
      // Mutations arrive through hydrate() and mutate() once observing.
      observe() {
        this.entry.disconnected = false;
      }
      disconnect() {
        this.entry.disconnected = true;
      }
    }
  );
  return {
    hydrate() {
      hydrated = true;
      for (const observer of observers) {
        if (!observer.disconnected) {
          observer.callback();
        }
      }
    },
    mutate() {
      for (const observer of observers) {
        if (!observer.disconnected) {
          observer.callback();
        }
      }
    },
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("afterHydration", () => {
  it("waits for the page to hydrate, then runs once", () => {
    const document = page();
    const run = vi.fn();
    afterHydration(run);
    document.mutate();
    expect(run).not.toHaveBeenCalled();
    document.hydrate();
    document.mutate();
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("runs at once on a page that has already hydrated", () => {
    const document = page();
    document.hydrate();
    const run = vi.fn();
    afterHydration(run);
    expect(run).toHaveBeenCalledTimes(1);
  });
});
