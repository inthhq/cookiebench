import { randomUUID } from "node:crypto";

import { decodeCpuCalibrationArtifact } from "@cookiebench/schema";
import type { CpuCalibrationArtifact } from "@cookiebench/schema";
import type { Browser } from "playwright";
import { describe, expect, it, vi } from "vitest";

import {
  CALIBRATION_TARGETS,
  CHROME_CALIBRATION_REVISION,
  runChromeCalibration,
  validateChromeCalibration,
} from "../src/chrome-calibration.ts";
import type {
  CalibrationMeasure,
  CalibrationSample,
} from "../src/chrome-calibration.ts";
import {
  applyCpuCalibration,
  assertCalibrationIdentity,
  calibrationBrowser,
} from "../src/cpu-calibration.ts";
import { desktopProfile } from "../src/reference.ts";

const host = {
  arch: "arm64",
  cpuModel: "Test CPU",
  hostname: "test-host",
  logicalCpus: 8,
  memoryBytes: 16_000_000_000,
  platform: "darwin",
  release: "25.0.0",
};
const browser = {
  headless: true as const,
  jsVersion: "15.3.0",
  launchExecutable: "playwright:chromium:default-headless",
  product: "Chrome/153.0.8010.12",
  revision: "test-browser-revision",
  version: "153.0.8010.12",
};

async function artifactFor(
  score: (rate: number, phase: CalibrationSample["phase"]) => number = (rate) =>
    4000 / Math.max(1, rate)
): Promise<CpuCalibrationArtifact> {
  const samples: CalibrationSample[] = [];
  const measure: CalibrationMeasure = (rate, phase, tier) => {
    const value = score(rate, phase);
    samples.push({ phase, rate, score: value, ...(tier ? { tier } : {}) });
    return Promise.resolve(value);
  };
  const results = await runChromeCalibration(measure);
  const validation = await validateChromeCalibration(
    results,
    measure,
    samples
      .filter((sample) => sample.phase === "calibration" && sample.rate === 1)
      .map((sample) => sample.score)
  );
  return decodeCpuCalibrationArtifact({
    browser,
    createdAt: "2026-10-01T00:00:00.000Z",
    host,
    id: randomUUID(),
    method: "chrome-devtools",
    results,
    samples,
    schemaVersion: 1,
    sourceRevision: CHROME_CALIBRATION_REVISION,
    sourceSha256:
      "f3835db080555d9850e2d058f8792eb6b74586d91545fbc88eefad0439cb7836",
    validation,
  });
}

describe("pinned Chrome CPU calibration", () => {
  it("finds both official target scores with Chrome's bounds and shared cache", async () => {
    const measure = vi.fn((rate: number) => Promise.resolve(4000 / rate));
    const result = await runChromeCalibration(measure);
    expect(measure.mock.calls.slice(0, 3).map(([rate]) => rate)).toEqual([
      1,
      1,
      (4000 / 264) * 1.5,
    ]);
    expect(measure.mock.calls.filter(([rate]) => rate === 1)).toHaveLength(2);
    expect(measure.mock.calls.length).toBeLessThanOrEqual(22);
    expect(typeof result.low).toBe("number");
    expect(typeof result.mid).toBe("number");
    expect(
      Math.abs(4000 / Number(result.low) - CALIBRATION_TARGETS.low)
    ).toBeLessThan(10);
    expect(
      Math.abs(4000 / Number(result.mid) - CALIBRATION_TARGETS.mid)
    ).toBeLessThan(10);
    const center = Number(result.low) / (1000 / 264);
    expect(measure.mock.calls.map(([rate]) => rate)).toContain(
      center - center / 4
    );
    expect(measure.mock.calls.map(([rate]) => rate)).toContain(
      center + center / 4
    );
  });

  it("retries a weak unthrottled score once and preserves unsupported outcomes", async () => {
    const measure = vi.fn(() => Promise.resolve(200));
    expect(await runChromeCalibration(measure)).toEqual({
      low: "DEVICE_TOO_WEAK",
      mid: "DEVICE_TOO_WEAK",
    });
    expect(measure).toHaveBeenCalledTimes(3);
  });

  it("can calibrate low-tier while mid-tier is unsupported", async () => {
    const result = await runChromeCalibration((rate) =>
      Promise.resolve(500 / Math.max(1, rate))
    );
    expect(result.mid).toBe("DEVICE_TOO_WEAK");
    expect(Number(result.low)).toBeGreaterThan(1);
  });

  it("preserves Chrome's below-one mid-tier result without clamping", async () => {
    const result = await runChromeCalibration((rate) =>
      Promise.resolve(rate <= 1 ? 1000 : 264 / rate)
    );
    expect(Number(result.mid)).toBeLessThan(1);
  });

  it("returns the final midpoint even when the search does not converge", async () => {
    const result = await runChromeCalibration(() => Promise.resolve(4000));
    expect(typeof result.low).toBe("number");
    expect(Number(result.low)).toBeGreaterThan(22);
  });

  it("rejects invalid scores and stops after a transport failure", async () => {
    await expect(
      runChromeCalibration(() => Promise.resolve(Number.NaN))
    ).rejects.toThrow("unexpected score");
    const measure = vi
      .fn()
      .mockResolvedValueOnce(4000)
      .mockRejectedValueOnce(new Error("canceled"));
    await expect(runChromeCalibration(measure)).rejects.toThrow("canceled");
    expect(measure).toHaveBeenCalledTimes(2);
  });
});

describe("CookieBench calibration validation", () => {
  it("reads browser identity when command-line introspection is unavailable", async () => {
    const send = vi.fn((method: string) => {
      if (method === "Browser.getBrowserCommandLine") {
        return Promise.reject(
          new Error(
            "Command line not returned because --enable-automation not set."
          )
        );
      }
      if (method === "Browser.getVersion") {
        return Promise.resolve({
          jsVersion: browser.jsVersion,
          product: browser.product,
          revision: browser.revision,
        });
      }
      return Promise.reject(new Error(`Unexpected CDP command: ${method}`));
    });
    const detach = vi.fn(() => Promise.resolve());
    const runningBrowser = {
      newBrowserCDPSession: () => Promise.resolve({ detach, send }),
      version: () => browser.version,
    } as unknown as Browser;
    expect(await calibrationBrowser(runningBrowser)).toEqual(browser);
    expect(send).toHaveBeenCalledExactlyOnceWith("Browser.getVersion");
    expect(detach).toHaveBeenCalledOnce();
  });

  it("uses the average middle pair for the baseline stability boundary", async () => {
    const measure = vi
      .fn()
      .mockResolvedValueOnce(1000)
      .mockResolvedValueOnce(1100)
      .mockResolvedValueOnce(1160);
    const validation = await validateChromeCalibration(
      { low: "DEVICE_TOO_WEAK", mid: "DEVICE_TOO_WEAK" },
      measure,
      [1000]
    );
    // Spread is 160 / 1050, not 160 / 1100. The former exceeds 15%.
    expect(validation.baselineStable).toBe(false);
  });

  it("records three fresh samples per baseline and tier and resolves exact rates", async () => {
    const artifact = await artifactFor();
    expect(artifact.validation.baselineScores).toHaveLength(3);
    expect(artifact.validation.low.scores).toHaveLength(3);
    expect(artifact.validation.mid.scores).toHaveLength(3);
    expect(artifact.validation.low.eligible).toBe(true);
    expect(artifact.validation.mid.eligible).toBe(true);
    const profile = applyCpuCalibration(desktopProfile, artifact, "mid");
    expect(profile.cpuSlowdown).toBe(artifact.results.mid);
    expect(profile.cpuCalibration).toEqual({ artifact, tier: "mid" });
    expect(() =>
      assertCalibrationIdentity(profile, { browser, host })
    ).not.toThrow();
  });

  it("rejects a stable baseline that shifted after Chrome's search", async () => {
    const artifact = await artifactFor((rate, phase) =>
      phase === "baseline-validation" ? 2000 : 4000 / Math.max(1, rate)
    );
    expect(artifact.validation.baselineStable).toBe(false);
    expect(artifact.validation.low.eligible).toBe(false);
    expect(() => applyCpuCalibration(desktopProfile, artifact, "low")).toThrow(
      "cannot be used"
    );
  });

  it("preserves unconverged Chrome output while rejecting it for benchmarking", async () => {
    const artifact = await artifactFor(() => 4000);
    expect(typeof artifact.results.mid).toBe("number");
    expect(artifact.validation.mid.eligible).toBe(false);
    expect(artifact.validation.mid.reasons.join(" ")).toContain("target");
    expect(() =>
      applyCpuCalibration(desktopProfile, artifact, "mid")
    ).toThrow();
    expect(() =>
      decodeCpuCalibrationArtifact({
        ...artifact,
        validation: {
          ...artifact.validation,
          mid: { ...artifact.validation.mid, eligible: true, reasons: [] },
        },
      })
    ).toThrow();
  });

  it("retains too-weak artifacts with empty tier validation samples", async () => {
    const artifact = await artifactFor(() => 200);
    expect(artifact.results.low).toBe("DEVICE_TOO_WEAK");
    expect(artifact.validation.low.scores).toEqual([]);
    expect(artifact.validation.low.eligible).toBe(false);
  });

  it("rejects another host, another browser, and an altered resolved rate", async () => {
    const artifact = await artifactFor();
    const profile = applyCpuCalibration(desktopProfile, artifact, "low");
    expect(() =>
      assertCalibrationIdentity(profile, {
        browser,
        host: { ...host, hostname: "other-host" },
      })
    ).toThrow("host mismatch");
    expect(() =>
      assertCalibrationIdentity(profile, {
        browser: { ...browser, version: "154.0.0.0" },
        host,
      })
    ).toThrow("browser mismatch");
    expect(() =>
      assertCalibrationIdentity(
        { ...profile, cpuSlowdown: 4 },
        { browser, host }
      )
    ).toThrow();
    expect(() =>
      assertCalibrationIdentity(desktopProfile, { browser, host })
    ).not.toThrow();
  });
});
