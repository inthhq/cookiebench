import { cp, mkdir } from "node:fs/promises";

await mkdir(new URL("dist/", import.meta.url), { recursive: true });
await Promise.all(
  ["index.html", "app.js", "style.css"].map((name) =>
    cp(new URL(name, import.meta.url), new URL(`dist/${name}`, import.meta.url))
  )
);
