# CMP comparison in 60 seconds

**Mobile page loading is the next focus.** c15t's main content appeared later on mobile. Desktop showed no clear extra delay, and mobile consent checks succeeded.

These are c15t Next.js results from September 30. Extra delay compares c15t with the same page without a consent manager.

| What we measured | Desktop | Emulated mobile |
| --- | --- | --- |
| Extra delay before main content appears | 4 ms; no clear difference | 436 ms |
| Banner appears after navigation | 125 ms | 2.41 seconds |
| Accept click to next paint | 64 ms | 108 ms |
| Reject click to next paint | 56 ms | 88 ms |

Values are medians. Load results use 30 paired visits per profile; clicks use 10 observations each. Mobile save took 36 ms to the next paint. These click timings measure the screen's response, not the whole consent-saving process.

Mobile consent correctness was verified in all 30 attempts. Three still lacked required measurements, so correctness does not mean every metric passed.

Later corrections passed Didomi's consent checks on both profiles. Enzuzo's mobile accept/reject buttons stayed outside the viewport in 20 attempts, leaving correctness unknown.

c15t used a local test backend, competitors used remote services, the machine was shared, and mobile was emulated. This cannot establish a fastest vendor or production performance.

[Full results and limitations](cmp-comparison-2026-09-30-details.md) preserve every result and failure.
