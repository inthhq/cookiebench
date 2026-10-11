import { resolveConsent } from "c15t/next/server";
import type { ReactNode } from "react";

import { ConsentFixture } from "../consent.tsx";

// Not awaited: the page renders while consent resolves, and the banner
// streams in a later chunk of the same response, as c15t recommends.
export default function ConsentLayout({ children }: { children: ReactNode }) {
  return <ConsentFixture state={resolveConsent()}>{children}</ConsentFixture>;
}
