import { describe, expect, it } from "vitest";

import { pageResponseFailure } from "../src/scenario.ts";

const pageAction = "#page-action";
const reject = '[data-testid="consent-widget-reject-button"]';
const input = (target: string) => ({
  at: 447,
  target,
  type: "pointerdown",
});

describe("followup page response", () => {
  it("leaves responsiveness unknown when no document recorded an input sent across a navigation", () => {
    // A c15t withdraw reload: the original document recorded only the consent
    // click, and the new document recorded no input at all.
    const original = { inputs: [input(reject)], state: undefined };
    const reloaded = { inputs: [], state: undefined };
    expect(
      pageResponseFailure(
        pageAction,
        true,
        [original, reloaded],
        [original, reloaded]
      )
    ).toMatchObject({ code: "page-input-unobserved" });
  });

  it("keeps an unanswered input in the same document as unresponsive", () => {
    // The observer can decline the input in the same document, e.g. after its
    // deadline, so a missing record does not make responsiveness unknown.
    const original = { inputs: [input(reject)], state: undefined };
    expect(
      pageResponseFailure(pageAction, false, [original], [original])
    ).toMatchObject({ code: "page-unresponsive" });
  });

  it("keeps a recorded input without a handler response as unresponsive", () => {
    const reloaded = { inputs: [input(pageAction)], state: undefined };
    expect(
      pageResponseFailure(pageAction, true, [reloaded], [reloaded])
    ).toMatchObject({ code: "page-unresponsive" });
  });

  it("accepts a handler response", () => {
    const responded = {
      inputs: [input(pageAction)],
      state: { pageActionAt: 455 },
    };
    expect(
      pageResponseFailure(pageAction, true, [responded], [responded])
    ).toBeUndefined();
  });
});
