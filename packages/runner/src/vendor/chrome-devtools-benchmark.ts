/* oxlint-disable numeric-separators-style, no-plusplus, no-multi-assign -- Preserve the pinned Chrome workload unchanged. */
// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license in LICENSE.chromium.
// Copied from Chrome DevTools CalibrationController.ts at
// 933872b3f8520add8c43e30adf00c32622f6bdf4, Chromium 153.0.8010.12.
// https://github.com/ChromeDevTools/devtools-frontend/blob/933872b3f8520add8c43e30adf00c32622f6bdf4/front_end/panels/mobile_throttling/CalibrationController.ts
// Only the export keyword is added to the benchmark function.

/**
 * Lifted from Lighthouse.
 *
 * Computes a memory/CPU performance benchmark index to determine rough device class.
 * @see https://github.com/GoogleChrome/lighthouse/issues/9085
 * @see https://docs.google.com/spreadsheets/d/1E0gZwKsxegudkjJl8Fki_sOwHKpqgXwt8aBAfuUaB8A/edit?usp=sharing
 *
 * Historically (until LH 6.3), this benchmark created a string of length 100,000 in a loop, and returned
 * the number of times per second the string can be created.
 *
 * Changes to v8 in 8.6.106 changed this number and also made Chrome more variable w.r.t GC interupts.
 * This benchmark now is a hybrid of a similar GC-heavy approach to the original benchmark and an array
 * copy benchmark.
 *
 * As of Chrome m86...
 *
 *  - 1000+ is a desktop-class device, Core i3 PC, iPhone X, etc
 *  - 800+ is a high-end Android phone, Galaxy S8, low-end Chromebook, etc
 *  - 125+ is a mid-tier Android phone, Moto G4, etc
 *  - <125 is a budget Android phone, Alcatel Ideal, Galaxy J2, etc
 */
export function computeBenchmarkIndex(duration = 1000): number {
  const halfTime = duration / 2;

  /**
   * The GC-heavy benchmark that creates a string of length 10000 in a loop.
   * The returned index is the number of times per second the string can be created divided by 10.
   * The division by 10 is to keep similar magnitudes to an earlier version of BenchmarkIndex that
   * used a string length of 100000 instead of 10000.
   */
  function benchmarkIndexGC(): number {
    const start = Date.now();
    let iterations = 0;

    while (Date.now() - start < halfTime) {
      let s = '';
      for (let j = 0; j < 10000; j++) {
        s += 'a';
      }
      if (s.length === 1) {
        throw new Error('will never happen, but prevents compiler optimizations');
      }

      iterations++;
    }

    const durationInSeconds = (Date.now() - start) / 1000;
    return Math.round(iterations / 10 / durationInSeconds);
  }

  /**
   * The non-GC-dependent benchmark that copies integers back and forth between two arrays of length 100000.
   * The returned index is the number of times per second a copy can be made, divided by 10.
   * The division by 10 is to keep similar magnitudes to the GC-dependent version.
   */
  function benchmarkIndexNoGC(): number {
    const arrA = [];
    const arrB = [];
    for (let i = 0; i < 100000; i++) {
      arrA[i] = arrB[i] = i;
    }

    const start = Date.now();
    let iterations = 0;

    // Some Intel CPUs have a performance cliff due to unlucky JCC instruction alignment.
    // Two possible fixes: call Date.now less often, or manually unroll the inner loop a bit.
    // We'll call Date.now less and only check the duration on every 10th iteration for simplicity.
    // See https://bugs.chromium.org/p/v8/issues/detail?id=10954#c1.
    while (iterations % 10 !== 0 || Date.now() - start < halfTime) {
      const src = iterations % 2 === 0 ? arrA : arrB;
      const tgt = iterations % 2 === 0 ? arrB : arrA;

      for (let j = 0; j < src.length; j++) {
        tgt[j] = src[j];
      }

      iterations++;
    }

    const durationInSeconds = (Date.now() - start) / 1000;
    return Math.round(iterations / 10 / durationInSeconds);
  }

  // The final BenchmarkIndex is a simple average of the two components.
  return (benchmarkIndexGC() + benchmarkIndexNoGC()) / 2;
}
