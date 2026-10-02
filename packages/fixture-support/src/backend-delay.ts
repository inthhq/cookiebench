import { setTimeout as sleep } from "node:timers/promises";

export function parseBackendDelay(value: string | undefined): number {
  if (value === undefined) {
    return 0;
  }
  const delay = Number(value);
  if (!/^\d+$/u.test(value) || !Number.isSafeInteger(delay) || delay > 60_000) {
    throw new Error(
      "Expected --backend-delay-ms to be an integer between 0 and 60000."
    );
  }
  return delay;
}

export async function waitForBackend(delayMs: number): Promise<void> {
  if (delayMs > 0) {
    await sleep(delayMs);
  }
}
