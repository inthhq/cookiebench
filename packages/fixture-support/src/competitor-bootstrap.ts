import { buildSync } from "esbuild";

import type { Competitor } from "./competitor.ts";

// CookieYes, Ketch, Osano and Usercentrics load from a client effect in their
// Next.js fixtures. On other frameworks they use their generic snippet, which
// each vendor places at the start of <head>. With `afterHydration`, the snippet
// still sits in the document but installs once the page has hydrated.
const placements = {
  "cookie-control": {
    exported: "installCookieControl",
    marker: "</body>",
    side: "before",
  },
  "cookie-yes": {
    exported: "installCookieYes",
    marker: "<head>",
    side: "after",
  },
  didomi: { exported: "installDidomi", marker: "<head>", side: "after" },
  enzuzo: { exported: "installEnzuzo", marker: "<head>", side: "after" },
  iubenda: { exported: "installIubenda", marker: "</head>", side: "before" },
  ketch: { exported: "installKetch", marker: "<head>", side: "after" },
  onetrust: { exported: "installOneTrust", marker: "<head>", side: "after" },
  osano: { exported: "installOsano", marker: "<head>", side: "after" },
  usercentrics: {
    exported: "installUsercentrics",
    marker: "<head>",
    side: "after",
  },
} as const satisfies Record<
  Competitor,
  { exported: string; marker: string; side: "before" | "after" }
>;

export type CompetitorInjection = NonNullable<
  ReturnType<typeof competitorBootstrap>
>;

export const competitors = Object.keys(placements) as Competitor[];

export function competitorBootstrap(
  name: string | undefined,
  { afterHydration = false } = {}
) {
  if (!name || !(name in placements)) {
    return;
  }
  const placement = placements[name as Competitor];
  const result = buildSync({
    bundle: true,
    format: "iife",
    legalComments: "none",
    minify: true,
    platform: "browser",
    stdin: {
      contents: afterHydration
        ? `import { ${placement.exported} } from './competitor.ts'; import { afterHydration } from './hydration.ts'; afterHydration(${placement.exported});`
        : `import { ${placement.exported} } from './competitor.ts'; ${placement.exported}();`,
      loader: "ts",
      resolveDir: import.meta.dirname,
      sourcefile: `cookiebench-${name}-bootstrap.ts`,
    },
    target: "es2022",
    write: false,
  });
  const source = result.outputFiles[0]?.text;
  if (!source) {
    throw new Error(`Empty ${name} bootstrap`);
  }
  return {
    ...placement,
    afterHydration,
    html: `<script data-cookiebench-bootstrap="${name}"${afterHydration ? ' data-cookiebench-timing="after-hydration"' : ""}>${source.replaceAll("</script", "<\\/script")}</script>`,
  };
}
