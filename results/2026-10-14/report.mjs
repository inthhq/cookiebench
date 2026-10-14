import fs from "node:fs";
import path from "node:path";

import { frameworks, here, profiles, readJson } from "./sources.mjs";

const frameworkNames = {
  astro: "Astro",
  nextjs: "Next.js",
  nuxt: "Nuxt / Vue",
  react: "React",
  script: "Script",
  "tanstack-start": "TanStack Start",
};
const productNames = {
  c15t: "c15t",
  "cookie-control": "Cookie Control",
  "cookie-yes": "CookieYes",
  didomi: "Didomi",
  enzuzo: "Enzuzo",
  iubenda: "iubenda",
  ketch: "Ketch",
  onetrust: "OneTrust",
  osano: "Osano",
  usercentrics: "Usercentrics",
};
const validation = readJson(path.join(here, "validation.json"));
const mobileSlowdowns = validation.profiles.mobile.cpuSlowdowns;
const mobileRates = `${mobileSlowdowns[0]}× to ${mobileSlowdowns.at(-1)}×`;
const matrices = Object.fromEntries(
  profiles.map((profile) => [
    profile,
    readJson(path.join(here, `matrix-${profile}.json`)),
  ])
);
const format = (value, decimals = 1) =>
  value === null || value === undefined
    ? "unavailable"
    : new Intl.NumberFormat("en-GB", {
        maximumFractionDigits: decimals,
      }).format(value);
const signed = (value) =>
  value === null || value === undefined
    ? "unavailable"
    : `${value > 0 ? "+" : ""}${format(value)}`;
const interval = (value) =>
  value.ci ? `${format(value.ci[0])} to ${format(value.ci[1])}` : "withheld";
const cpuRate = (row) => `${row.provenance.load.cpuSlowdown ?? 1}× CPU`;
const tables = [
  "# October 14 numeric tables",
  "",
  "c15t 3.0.0 and nine other CMPs, all measured on the same Vercel Sandbox type (Intel Xeon @ 2.90GHz, Linux), one sandbox per batch entry. Every paired delta uses the row's own no-CMP baseline. Mobile CPU is calibrated to Chrome's mid-tier phone on each sandbox; the CPU column shows the rate each load entry used. See [methodology and limits](README.md).",
  "",
];
const data = {};
for (const profile of profiles) {
  data[profile] = {};
  for (const framework of frameworks) {
    const rows = matrices[profile].frameworks[framework].products;
    tables.push(
      `## ${frameworkNames[framework]}, ${profile}`,
      "",
      "Times are ms. Transfer is bytes including headers. CIs retain their source adjustment. Consent actions show load / accept / reject / save.",
      "",
      "| CMP | CPU | Load passes | Banner | TTFB | FCP | Baseline LCP | CMP LCP | Paired LCP delta | Adjusted CI | Extra transfer | Blocking | CLS | Consent actions |",
      "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: | ---: | ---: | --- |"
    );
    for (const row of rows) {
      const m = row.medians;
      const lcp = row.paired["page.lcp"];
      const cpu = cpuRate(row);
      tables.push(
        `| ${productNames[row.product]} | ${cpu} | ${row.passed}/${row.visits} | ${format(m["banner.visible"])} | ${format(m["page.ttfb"])} | ${format(m["page.fcp"])} | ${format(row.baseline.medians["page.lcp"])} | ${format(m["page.lcp"])} | ${signed(lcp.medianDifference)} | ${interval(lcp)} | ${signed(row.paired["initial.transfer"].medianDifference)} | ${format(m["initial.long-task-blocking"])} | ${format(m["page.cls"], 4)} | ${["load", "accept", "reject", "save"].map((flow) => row.flows[flow]).join(" / ")} |`
      );
    }
    tables.push(
      "",
      "Recorded input-to-next-paint, one attempt per action. Missing values stay unavailable. These are not finalized INP scores.",
      "",
      "| CMP | Accept | Reject | Save | Accept follow-up | Reject follow-up | Save follow-up |",
      "| --- | ---: | ---: | ---: | ---: | ---: | ---: |"
    );
    for (const row of rows) {
      const ix = row.interactions;
      tables.push(
        `| ${productNames[row.product]} | ${["accept", "reject", "save"].map((flow) => format(ix[flow].inputToNextPaint)).join(" | ")} | ${["accept", "reject", "save"].map((flow) => format(ix[flow].followupInputToNextPaint)).join(" | ")} |`
      );
    }
    tables.push("");
    data[profile][framework] = rows.map((row) => ({
      baseline: row.baseline.medians,
      cpu: cpuRate(row),
      failureReasons: row.failureReasons,
      flows: row.flows,
      interactions: row.interactions,
      lcpEligibilityReasons:
        row.comparisonEvidence["page.lcp"].eligibilityReasons,
      medians: row.medians,
      name: productNames[row.product],
      paired: row.paired,
      passed: row.passed,
      product: row.product,
      version: row.version,
      visits: row.visits,
    }));
  }
}
const auditNames = {
  "custom.audit.layout-duration": "Layout duration",
  "custom.audit.lcp": "LCP",
  "custom.audit.observed-window": "Observed window",
  "custom.audit.script-duration": "Script duration",
  "custom.audit.task-duration": "Task duration",
};
tables.push(
  "## Collector overhead",
  "",
  "Minimal versus full collector on the reference page with no CMP, 15 pairs per profile. Report it beside the CMP rows; do not subtract it from them.",
  ""
);
for (const profile of profiles) {
  const reference = readJson(
    path.join(here, `reference-overhead-${profile}.json`)
  );
  tables.push(
    `### ${profile}, ${reference.cpuSlowdown ?? 1}× CPU`,
    "",
    "| Metric, ms | Minimal | Full | Paired delta | Adjusted CI |",
    "| --- | ---: | ---: | ---: | --- |",
    ...Object.entries(reference.audit).map(
      ([metric, value]) =>
        `| ${auditNames[metric]} | ${format(value.minimal)} | ${format(value.full)} | ${signed(value.paired.medianDifference)} | ${interval(value.paired)} |`
    ),
    ""
  );
}
fs.writeFileSync(path.join(here, "tables.md"), `${tables.join("\n")}\n`);

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cookiebench, October 14 matrix</title>
<style>
body{margin:0;background:var(--background,#fff);color:var(--foreground,#20252b);font:14px/1.5 var(--font-sans,system-ui,sans-serif)}p{margin:0 0 12px}h1{font-size:19px;font-weight:600;margin:0 0 10px}small,.muted{color:var(--muted-foreground,#626b78)}small{display:block;font-size:11px}.controls{display:flex;gap:12px;flex-wrap:wrap;margin:18px 0}label{font-size:12px;color:var(--muted-foreground,#626b78)}select{display:block;max-width:100%;padding:7px 25px 7px 8px;margin-top:4px;border:1px solid var(--border,#d9dee6);border-radius:4px;background:var(--background,#fff);color:var(--foreground,#20252b);font:inherit}select:focus-visible{outline:2px solid var(--ring,#566d80);outline-offset:2px}table{width:100%;border-collapse:collapse;font-size:12px;font-variant-numeric:tabular-nums}caption{text-align:left;margin-bottom:10px}th,td{padding:9px 5px;text-align:right;border-bottom:1px solid var(--border,#d9dee6);vertical-align:top}thead th{font-size:11px;font-weight:500;color:var(--muted-foreground,#626b78)}th:first-child{text-align:left;padding-left:0}tbody th{font-weight:500}tr.c15t{background:var(--muted,#f3f5f6)}.notes{font-size:12px;margin-top:16px}.notes p{margin-bottom:8px}details{font-size:12px;margin:12px 0}summary{cursor:pointer}details p{margin-top:8px}#gaps:empty{display:none}
@media(max-width:560px){caption{display:block;width:100%}thead{display:none}table,tbody{display:block}tr{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px 12px;padding:12px 0;border-bottom:1px solid var(--border,#d9dee6)}tr th{grid-column:1/-1}tr th,tr td{padding:0;border:0;text-align:left}td:before{content:attr(data-label);display:block;font-size:10px;color:var(--muted-foreground,#626b78)}.controls{gap:8px}label{max-width:100%}}
</style></head><body>
<h1>Cookiebench, October 14 matrix</h1>
<p>10 CMPs, six frameworks, desktop and mobile. c15t uses 3.0.0. Every row ran on the same Vercel Sandbox type in one scan.</p>
<p class="muted">Intel Xeon @ 2.90GHz, 8 vCPUs, Linux, one sandbox per batch entry. Each row keeps its own entry's no-CMP baseline. Compare each CMP with its baseline; raw medians vary between sandboxes.</p>
<div class="controls"><label>Profile<select id="profile"><option value="desktop">Desktop</option><option value="mobile">Mobile</option></select></label><label>Framework<select id="framework">${frameworks.map((fw) => `<option value="${fw}">${frameworkNames[fw]}</option>`).join("")}</select></label><label>Measurements<select id="view"><option value="load">Load and visibility</option><option value="vitals">Web vitals and blocking</option><option value="actions">Consent interactions</option></select></label></div>
<div id="table" aria-live="polite"></div><details id="gaps"><summary>Recorded failures and withheld comparisons</summary><div id="gap-list"></div></details>
<div class="notes"><p id="conditions"></p><p>Banner timing is a DOM visibility observation from navigation, not a paint timestamp. LCP deltas are medians of paired differences, so they can differ from subtracting displayed medians. Transfer includes headers and fixture assets.</p><p>Batch metrics form one Bonferroni family per profile, of ${matrices.desktop.frameworks.nextjs.products[0].comparisonEvidence["page.lcp"].multiplicity.comparisons} comparisons. TTFB and FCP form a separate family of ${matrices.desktop.frameworks.nextjs.products[0].comparisonEvidence["page.ttfb"].multiplicity.comparisons}. These are not intervals on differences between CMPs.</p><p>Input-to-next-paint comes from one recorded attempt per action. The runner withholds finalized INP. Missing Event Timing stays unavailable. Follow-up timings come from separate visits.</p><p>c15t desktop loads passed ${validation.profiles.desktop.c15tLoadPassed} and its consent checks verified ${validation.profiles.desktop.c15tCorrectnessVerified}. On mobile, loads passed ${validation.profiles.mobile.c15tLoadPassed} and checks verified ${validation.profiles.mobile.c15tCorrectnessVerified}.</p><p>Nuxt covers Vue. React and Script use hosted init; the other c15t integrations use build-time manifests. Next.js streams its server banner. Next.js CookieYes loads after hydration, and every CookieYes row keeps its registered-host baseline.</p></div>
<script>
const data=${JSON.stringify(data).replaceAll("<", "\\u003c")};
const frameworkNames=${JSON.stringify(frameworkNames)};
const fmt=(v,d=1)=>v==null?'unavailable':new Intl.NumberFormat('en-GB',{maximumFractionDigits:d}).format(v);
const delta=v=>v==null?'unavailable':(v>0?'+':'')+fmt(v);
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sub=(v,n)=>esc(v)+'<small>'+esc(n)+'</small>';
const ci=p=>p.ci?fmt(p.ci[0])+' to '+fmt(p.ci[1]):'CI withheld';
function render(){
 const profile=document.querySelector('#profile').value,framework=document.querySelector('#framework').value,view=document.querySelector('#view').value;
 const rows=data[profile][framework];let headers,cells;
 if(view==='load'){
  headers=['CMP / CPU rate','Banner, ms','LCP, ms','Paired LCP delta, ms','Extra transfer, bytes','Load passes'];
  cells=r=>[sub(r.name,r.cpu),esc(fmt(r.medians['banner.visible'])),sub(fmt(r.medians['page.lcp']),'baseline '+fmt(r.baseline['page.lcp'])),sub(delta(r.paired['page.lcp'].medianDifference),ci(r.paired['page.lcp'])),esc(delta(r.paired['initial.transfer'].medianDifference)),esc(r.passed+'/'+r.visits)];
 }else if(view==='vitals'){
  headers=['CMP / CPU rate','TTFB, ms','FCP, ms','LCP, ms','Blocking, ms','CLS'];
  cells=r=>[sub(r.name,r.cpu),sub(fmt(r.medians['page.ttfb']),'baseline '+fmt(r.baseline['page.ttfb'])+'; paired '+delta(r.paired['page.ttfb'].medianDifference)),sub(fmt(r.medians['page.fcp']),'baseline '+fmt(r.baseline['page.fcp'])+'; paired '+delta(r.paired['page.fcp'].medianDifference)),sub(fmt(r.medians['page.lcp']),'baseline '+fmt(r.baseline['page.lcp'])),esc(fmt(r.medians['initial.long-task-blocking'])),esc(fmt(r.medians['page.cls'],4))];
 }else{
  headers=['CMP / CPU rate','Accept, ms','Reject, ms','Save, ms','Load check'];
  cells=r=>[sub(r.name,r.cpu),...['accept','reject','save'].map(f=>{const i=r.interactions[f];return sub(fmt(i.inputToNextPaint),r.flows[f]+'; follow-up '+fmt(i.followupInputToNextPaint)+' ms, '+(i.followupVisit??'unrecorded'));}),esc(r.flows.load)];
 }
 document.querySelector('#table').innerHTML='<table><caption>'+esc(frameworkNames[framework]+' · '+profile+(view==='actions'?' · input-to-next-paint, not finalized INP':' · medians from 15 load attempts per CMP'))+'</caption><thead><tr>'+headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr class="'+(r.product==='c15t'?'c15t':'')+'">'+cells(r).map((c,i)=>i===0?'<th scope="row" title="'+esc(r.version)+'">'+c+'</th>':'<td data-label="'+esc(headers[i])+'">'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
 document.querySelector('#conditions').textContent=profile==='mobile'?'Mobile: CPU calibrated to Chrome’s mid-tier phone on each sandbox, ${mobileRates} across entries; 200,000 bytes/s download, 150 ms latency, 390 × 844 viewport, 10-second load window. This is browser emulation, not a measured phone.':'Desktop: no CPU slowdown; 12,500,000 bytes/s download, 0 ms added latency, 1365 × 768 viewport, 5-second load window. Chromium 153.';
 const gaps=rows.flatMap(r=>{const issues=[...r.failureReasons.map(f=>f.message+' in '+f.visits+' load visits'),...r.lcpEligibilityReasons,...['accept','reject','save'].filter(f=>r.flows[f]!=='verified').map(f=>f+': '+r.flows[f])];return issues.length?['<p>'+esc(r.name+': '+[...new Set(issues)].join('; '))+'</p>']:[];});
 document.querySelector('#gap-list').innerHTML=gaps.join('');document.querySelector('#gaps').hidden=gaps.length===0;
}
for(const select of document.querySelectorAll('select'))select.addEventListener('change',render);
let checked=0;for(const p of Object.keys(data))for(const f of Object.keys(data[p]))for(const v of ['load','vitals','actions']){document.querySelector('#profile').value=p;document.querySelector('#framework').value=f;document.querySelector('#view').value=v;render();if(document.querySelectorAll('tbody tr').length!==10)throw new Error('Missing rows: '+p+' '+f+' '+v);checked++;}
document.querySelector('#profile').value='desktop';document.querySelector('#framework').value='nextjs';document.querySelector('#view').value='load';render();console.log(JSON.stringify({viewsChecked:checked,rows:120,overflow:document.documentElement.scrollWidth>innerWidth}));
</script></body></html>`;
fs.writeFileSync(path.join(here, "report.html"), html);
console.log("Wrote report.html and tables.md");
