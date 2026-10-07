import { pageHTML } from "@cookiebench/fixture-support/page";

export default function Page() {
  return <div dangerouslySetInnerHTML={{ __html: pageHTML }} />;
}
