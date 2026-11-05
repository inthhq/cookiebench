import { consentRequestMiddleware } from "@c15t/tanstack-start/middleware";
import { createConsentStateHandler } from "@c15t/tanstack-start/server";
import { createServerFn } from "@tanstack/react-start";

// Middleware stays on this server function so the baseline route never reads consent inputs.
export const getConsentState = createServerFn({ method: "GET" })
  .middleware([consentRequestMiddleware()])
  .handler(createConsentStateHandler());
