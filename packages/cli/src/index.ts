#!/usr/bin/env node
import { main } from "./cli.ts";

const controller = new AbortController();
let signalExitCode: number | undefined;
const interrupt = () => {
  signalExitCode = 130;
  controller.abort();
};
const terminate = () => {
  signalExitCode = 143;
  controller.abort();
};
process.on("SIGINT", interrupt);
process.on("SIGTERM", terminate);
try {
  const exitCode = await main(process.argv.slice(2), {
    env: process.env,
    signal: controller.signal,
    stderr: (text) => process.stderr.write(text),
    stdout: (text) => process.stdout.write(text),
  });
  process.exitCode = signalExitCode ?? exitCode;
} finally {
  process.off("SIGINT", interrupt);
  process.off("SIGTERM", terminate);
}
