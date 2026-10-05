import { afterEach, beforeEach, expect, it, vi } from "vitest";

import { installCookieYes } from "./competitor.ts";

let events: EventTarget;
let loadSdk: () => void;
const appended: { id?: string; src: string }[] = [];

beforeEach(() => {
  vi.useFakeTimers();
  events = new EventTarget();
  appended.length = 0;
  vi.stubGlobal("window", {
    location: { href: "http://localhost/?scripts=2&token=attempt-1" },
  });
  vi.stubGlobal("document", {
    addEventListener: events.addEventListener.bind(events),
    createElement: () => {
      const element = {
        addEventListener: (type: string, listener: () => void) => {
          if (type === "load") {
            loadSdk = listener;
          }
        },
        setAttribute(name: string, value: string) {
          Object.assign(element, { [name]: value });
        },
        src: "",
      };
      return element;
    },
    documentElement: { dataset: {} as Record<string, string> },
    head: { append: (element: { src: string }) => appended.push(element) },
    querySelector: () => null,
    readyState: "complete",
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it("applies a stored CookieYes choice at once but reports ready after the banner loads", () => {
  installCookieYes();
  Object.assign(window, {
    getCkyConsent: () => ({
      categories: { advertisement: true, analytics: true },
      isUserActionCompleted: true,
    }),
  });
  // The SDK script has loaded, but the banner has not attached its handlers.
  loadSdk();

  expect(window.__cookiebench).toMatchObject({
    allowedCategories: ["marketing", "measurement"],
    consent: "accepted",
  });
  expect(window.__cookiebench.ready).toBeUndefined();
  expect(document.documentElement.dataset.consentReady).toBeUndefined();
  expect(
    appended.filter((element) => element.src.includes("/controlled/"))
  ).toHaveLength(2);

  events.dispatchEvent(new Event("cookieyes_banner_load"));

  expect(window.__cookiebench.ready).toBe(true);
  expect(document.documentElement.dataset.consentReady).toBe("true");
});
