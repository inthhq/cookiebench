import { consentLoaderOptions } from "@c15t/tanstack-start/server";
import { createFileRoute } from "@tanstack/react-router";

import { ConsentPage } from "../consent";
import { getConsentState } from "../consent-state";

function IndexPage() {
  // oxlint-disable-next-line no-use-before-define -- The file route exposes its own typed loader data.
  const state = Route.useLoaderData();
  return <ConsentPage state={state} />;
}
export const Route = createFileRoute("/")({
  ...consentLoaderOptions,
  component: IndexPage,
  loader: () => getConsentState(),
});
