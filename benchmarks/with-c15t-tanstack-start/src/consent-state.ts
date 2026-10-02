import { consentRequestMiddleware } from "@c15t/tanstack-start/middleware";
import {
  mergeInitIntoConsentState,
  resolveConsent,
} from "@c15t/tanstack-start/server";
import { createServerFn } from "@tanstack/react-start";

// Keep direct init on every server request, including request cookies. This is part of measured SSR cost.
export const getConsentState = createServerFn({ method: "GET" })
  .middleware([consentRequestMiddleware()])
  .handler(async () => {
    const { getRequest } = await import("@tanstack/react-start/server");
    const request = getRequest();
    const state = await resolveConsent({ request });
    const response = await fetch("http://127.0.0.1:4316/api/consent/init", {
      cache: "no-store",
      headers: { cookie: request.headers.get("cookie") ?? "" },
    });
    if (!response.ok) {
      throw new Error(`Controlled consent init returned ${response.status}`);
    }
    const init: Parameters<typeof mergeInitIntoConsentState>[1] =
      await response.json();
    return mergeInitIntoConsentState(state, init);
  });
