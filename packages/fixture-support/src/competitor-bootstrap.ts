import { buildSync } from "esbuild";

const placements = {
  "cookie-control": {
    exported: "installCookieControl",
    marker: "</body>",
    side: "before",
  },
  didomi: { exported: "installDidomi", marker: "<head>", side: "after" },
  enzuzo: { exported: "installEnzuzo", marker: "<head>", side: "after" },
  iubenda: { exported: "installIubenda", marker: "</head>", side: "before" },
  onetrust: { exported: "installOneTrust", marker: "<head>", side: "after" },
} as const;

export function competitorBootstrap(name: string | undefined) {
  if (!name || !(name in placements)) {
    return;
  }
  const placement = placements[name as keyof typeof placements];
  const result = buildSync({
    bundle: true,
    format: "iife",
    legalComments: "none",
    minify: true,
    platform: "browser",
    stdin: {
      contents: `import { ${placement.exported} } from './competitor.ts'; ${placement.exported}();`,
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
    html: `<script data-cookiebench-bootstrap="${name}">${source.replaceAll("</script", "<\\/script")}</script>`,
  };
}
