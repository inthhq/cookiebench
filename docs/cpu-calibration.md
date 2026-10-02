# CPU calibration

CookieBench can calibrate CPU throttling against Chrome DevTools' low-tier and mid-tier presets. The saved artifact replaces a host-relative guess such as `4x` with a measured slowdown for this machine and browser. These presets do not represent a current flagship or reproduce an actual phone.

Run calibration once before a comparison, with the same runner configuration and executable that the benchmark will use:

```sh
pnpm cookiebench cpu calibrate --config benchmarks/with-c15t-script/run.json --output artifacts/cpu-calibration.json
pnpm cookiebench run --config benchmarks/with-c15t-script/run.json --cpu-calibration artifacts/cpu-calibration.json --cpu-tier mid --scenario load --iterations 30 --warmups 3 --output artifacts/calibrated-run.json
```

`cpu calibrate` uses a separate browser page under the benchmark's machine lock. It does not start fixture servers or measure fixture visits. Its immutable JSON records both preset outcomes, every benchmark attempt, the Chrome source revision and SHA-256, host and browser identity, and independent validation samples. The upstream calibration controller is pinned to DevTools revision `933872b3f8520add8c43e30adf00c32622f6bdf4`, associated with Chrome `153.0.8010.12`. The score targets are 264 for low and 1000 for mid. Source and license are retained with the runner's vendored code.

CookieBench then measures three fresh unthrottled scores and three fresh scores at each numeric rate of at least 1. Baseline scores, including the upstream unthrottled attempts, must have a relative spread no greater than 15%. Each tier must meet that spread limit and put its median within 15% of its target. These checks are CookieBench's validation policy, separate from Chrome's calibration algorithm. The schema checks that the reported eligibility agrees with the recorded scores.

Calibration exits with code 2 if either tier is ineligible, but still saves all outcomes and evidence. An eligible tier in that artifact can be used. A device-too-weak result, a rate below 1, unstable baseline, or failed target validation cannot be applied. There is no fallback to `4x`. Existing output files are never overwritten.

`run`, `capabilities verify`, and `instrumentation audit` accept `--cpu-calibration`. The tier defaults to `mid`; `--cpu-tier` without an artifact is an error. Each run embeds the complete artifact, selected tier, and actual numeric slowdown in its profile. The runner checks the current host and browser before warmups and measured visits. Browser identity includes the reported product, revision and JavaScript engine version, plus the launch selection. An explicit executable records its resolved path; the default records `playwright:chromium:default-headless`, not an observed executable path. A changed host, browser identity or launch selection requires a new calibration. Comparison also requires identical profile metadata, so independently recalibrated runs cannot silently enter the same comparison.

Reuse the same artifact for every compared fixture. Do not recalibrate between arms or samples. Keep the machine idle during calibration and measurements. The result describes conditions at calibration time; it cannot prevent later thermal throttling or other host contention.

Calibration changes only CPU slowdown. Viewport, pixel density, touch, user agent and network settings remain those in the run configuration. The example above retains that configuration's desktop layout and network. A configured 150 ms CDP latency is a request-level approximation, not a measured mobile connection. Existing manual profiles and historical envelopes remain readable and retain their original meaning.

The batch helper accepts existing run configurations. Prepare new configuration copies that embed the same artifact before starting a batch:

```ts
import { readFile, writeFile } from "node:fs/promises";
import { applyCpuCalibration, decodeRunConfig } from "@cookiebench/runner";
import { decodeCpuCalibrationArtifact } from "@cookiebench/schema";

const artifact = decodeCpuCalibrationArtifact(
  JSON.parse(await readFile("artifacts/cpu-calibration.json", "utf8"))
);
const config = decodeRunConfig(
  JSON.parse(await readFile("benchmarks/with-c15t-script/run.json", "utf8"))
);
await writeFile(
  "artifacts/calibrated-script-run.json",
  JSON.stringify(
    {
      ...config,
      profile: applyCpuCalibration(config.profile, artifact, "mid"),
    },
    null,
    2
  ),
  { flag: "wx" }
);
```

Point the new batch plan entries at these configuration copies. Keep historical profiles, plans and result artifacts unchanged.
