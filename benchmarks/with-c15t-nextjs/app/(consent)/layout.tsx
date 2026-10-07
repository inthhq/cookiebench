import { resolveConsent } from "c15t/next/server";
import type { ReactNode } from "react";

import { consentOptions } from "../../c15t.server.ts";
import { ConsentFixture } from "../consent.tsx";

export default function ConsentLayout({ children }: { children: ReactNode }) {
  // Not awaited: the page renders while consent resolves.
  const state = resolveConsent(consentOptions);
  return <ConsentFixture state={state}>{children}</ConsentFixture>;
}
