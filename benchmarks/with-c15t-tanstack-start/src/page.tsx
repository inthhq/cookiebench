import { installPageInteraction } from "@cookiebench/fixture-support";
import { pageHTML } from "@cookiebench/fixture-support/page";
import { useEffect } from "react";

export function Page() {
  useEffect(installPageInteraction, []);
  // Shared checked-in content is identical across framework baselines and consent pages.
  return <div dangerouslySetInnerHTML={{ __html: pageHTML }} />;
}
