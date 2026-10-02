import { pageHTML } from "@cookiebench/fixture-support/page";

import { ConsentFixture } from "./consent.tsx";

export default function Page() {
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: pageHTML }} />
      <ConsentFixture />
    </>
  );
}
