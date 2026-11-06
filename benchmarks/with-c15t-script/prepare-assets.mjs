import { copyFile, mkdir } from "node:fs/promises";

// c15t.js is the only file on canary. From the two-stage script tag on, it is a
// small init script that loads c15t.hosted.js, c15t.commit.js and
// c15t.records.js from the same folder, so copy whichever of them the installed
// @c15t/browser exports. On canary the extra files are not in the package's
// exports map, so import.meta.resolve itself throws; keep it inside the try.
const files = ["c15t.js", "c15t.hosted.js", "c15t.commit.js", "c15t.records.js", "c15t.dialog.js"];

await mkdir(new URL("public/vendor", import.meta.url), { recursive: true });
for (const file of files) {
  let source;
  try {
    source = new URL(import.meta.resolve(`@c15t/browser/${file}`));
  } catch (error) {
    if (file === "c15t.js") throw error;
    continue;
  }
  await copyFile(source, new URL(`public/vendor/${file}`, import.meta.url));
}
