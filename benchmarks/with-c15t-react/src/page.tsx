import { installPageInteraction } from "@cookiebench/fixture-support";
import { pageCSS, pageHTML } from "@cookiebench/fixture-support/page";
import { useEffect } from "react";

export function Page() {
  useEffect(installPageInteraction, []);
  return (
    <>
      <style>{pageCSS}</style>
      <div dangerouslySetInnerHTML={{ __html: pageHTML }} />
    </>
  );
}
