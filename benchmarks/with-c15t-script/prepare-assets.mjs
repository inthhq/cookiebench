import { copyFile, mkdir } from "node:fs/promises";

await mkdir(new URL("public/vendor", import.meta.url), { recursive: true });
await copyFile(
  new URL(import.meta.resolve("@c15t/browser/c15t.js")),
  new URL("public/vendor/c15t.js", import.meta.url)
);
