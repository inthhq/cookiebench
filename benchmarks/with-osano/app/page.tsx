import { pageHTML } from "@cookiebench/fixture-support/page";

import { ConsentFixture } from "./consent.tsx";
import { Interaction } from "./interaction.tsx";

export default function Page() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: pageHTML }} />
      <Interaction />
      <ConsentFixture />
    </>
  );
}
