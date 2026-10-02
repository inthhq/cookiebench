/* oxlint-disable no-await-in-loop -- Exercise every stream split independently with deterministic assertions. */
import { Readable } from "node:stream";

import { describe, expect, it } from "vitest";

import { HtmlInjection } from "./html-injection.ts";

async function inject(
  chunks: Buffer[],
  marker: string,
  side: "before" | "after"
) {
  const stream = Readable.from(chunks).pipe(
    new HtmlInjection({ html: "<script>bootstrap()</script>", marker, side })
  );
  const output: Buffer[] = [];
  for await (const chunk of stream) {
    output.push(Buffer.from(chunk));
  }
  return Buffer.concat(output).toString();
}

describe("document bootstrap placement", () => {
  it("preserves UTF-8 and injects only once at every possible stream split", async () => {
    const html =
      "<html><head><title>Café 🌳</title></head><body>Story 🌿</body></html>";
    const bytes = Buffer.from(html);
    for (let split = 0; split <= bytes.length; split += 1) {
      const chunks = [bytes.subarray(0, split), bytes.subarray(split)];
      expect(await inject(chunks, "<head>", "after")).toBe(
        html.replace("<head>", "<head><script>bootstrap()</script>")
      );
      expect(await inject(chunks, "</head>", "before")).toBe(
        html.replace("</head>", "<script>bootstrap()</script></head>")
      );
      expect(await inject(chunks, "</body>", "before")).toBe(
        html.replace("</body>", "<script>bootstrap()</script></body>")
      );
    }
  });

  it("fails explicitly when the declared document position is absent", async () => {
    await expect(
      inject([Buffer.from("Not an HTML fixture")], "<head>", "after")
    ).rejects.toThrow("lacks bootstrap marker");
  });
});
