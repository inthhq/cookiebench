import { pageHTML } from "@cookiebench/fixture-support/page";

import { Interaction } from "../interaction.tsx";

export default function Baseline() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: pageHTML }} />
      <Interaction />
    </>
  );
}
