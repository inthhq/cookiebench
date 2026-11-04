import { createConsentStateHandler } from "@c15t/tanstack-start/server";
import { createServerFn } from "@tanstack/react-start";

// lcp-fleet round 8: c15t canary's consentRequestMiddleware() wraps next()'s
// result as a request-middleware response, so on this server function (called
// during SSR) it throws "Cannot destructure property 'headers' of
// 'e.response'". The handler reads the request headers itself; the baseline
// route still never reads consent inputs.
export const getConsentState = createServerFn({ method: "GET" })
  .handler(createConsentStateHandler());
