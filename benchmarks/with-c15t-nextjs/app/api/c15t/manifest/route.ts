import { createNextConsentRouteHandlers } from "c15t/next/api";

import { consentOptions } from "../../../../c15t.server.ts";

export const { manifestGET: GET } =
  createNextConsentRouteHandlers(consentOptions);
