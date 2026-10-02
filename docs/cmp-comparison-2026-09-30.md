# CMP comparison in 60 seconds

## Known defects (2026-10-02)

Code review found collector and fixture defects that affect rows in the [full report](cmp-comparison-2026-09-30-details.md), which lists them and withdraws the affected rows pending a rerun. They do not change the c15t Next.js figures below. Both profiles attributed LCP to the article image in all 30 visits, both LCP comparisons were eligible, the byte defects concern other fixtures, and the c15t fixture loads no cross-site iframes.

## Results

These fixtures are not like-for-like, so cross-CMP numbers are not a ranking.

- c15t fixtures call a controlled local test backend on the same machine. The desktop profile adds 0 ms latency, so those calls return almost at once. Competitor fixtures call their vendors' remote services over the internet.
- c15t Next.js loads through its native `c15t/next` provider. Ketch and Osano load from a client effect after hydration. The proxy injects Didomi, Enzuzo and OneTrust at the start of `<head>`, iubenda at the end of `<head>`, and Cookie Control before `</body>`.

Differences between CMPs mix product cost with backend location and script placement. The CookieYes and Usercentrics fixtures, which also load from a client effect, are not in this batch.

c15t's main content appeared later on mobile. Desktop showed no clear extra delay, and mobile consent checks succeeded.

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

The machine was shared and mobile was emulated. These results cannot establish a fastest vendor or production performance.

[Full results and limitations](cmp-comparison-2026-09-30-details.md) preserve every result and failure.
