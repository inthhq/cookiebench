import { resolveConsent } from "c15t/next/server";
import { Suspense } from "react";
import type { ReactNode } from "react";

import { consentOptions } from "../../c15t.server.ts";
import { ConsentFixture } from "../consent.tsx";

// Awaited so the banner arrives in the server HTML, already decided.
async function ResolvedConsent({ children }: { children: ReactNode }) {
  const state = await resolveConsent(consentOptions);
  return <ConsentFixture state={state}>{children}</ConsentFixture>;
}

export default function ConsentLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={null}>
      <ResolvedConsent>{children}</ResolvedConsent>
    </Suspense>
  );
}
