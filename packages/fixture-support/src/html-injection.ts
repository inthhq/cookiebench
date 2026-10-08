/* oxlint-disable node/callback-return -- Node Transform callbacks are synchronous completion notifications. */
import { Transform } from "node:stream";
import type { TransformCallback } from "node:stream";
import { StringDecoder } from "node:string_decoder";

export interface Injection {
  marker: string;
  side: "before" | "after";
  html: string;
}

/** Insert once into a complete document, as HtmlInjection does for a stream. */
export function injectHtml(document: string, injection: Injection) {
  const index = document.indexOf(injection.marker);
  if (index === -1) {
    throw new Error(`Fixture HTML lacks bootstrap marker ${injection.marker}`);
  }
  const offset =
    index + (injection.side === "after" ? injection.marker.length : 0);
  return document.slice(0, offset) + injection.html + document.slice(offset);
}

/** Insert once without buffering a whole streamed framework document. */
export class HtmlInjection extends Transform {
  private pending = "";
  private injected = false;
  private readonly decoder = new StringDecoder("utf-8");
  private readonly injection: Injection;

  constructor(injection: Injection) {
    super();
    this.injection = injection;
  }

  override _transform(
    chunk: Buffer,
    _encoding: BufferEncoding,
    done: TransformCallback
  ) {
    this.pending += this.decoder.write(chunk);
    if (this.injected) {
      this.push(this.pending);
      this.pending = "";
      done();
      return;
    }
    const index = this.pending.indexOf(this.injection.marker);
    if (index === -1) {
      const keep = this.injection.marker.length - 1;
      let count = Math.max(0, this.pending.length - keep);
      // A UTF-8 decoder returns UTF-16 strings; never emit half a surrogate pair.
      const last = this.pending.codePointAt(count - 1);
      if (last !== undefined && last > 0xff_ff) {
        count -= 1;
      }
      this.push(this.pending.slice(0, count));
      this.pending = this.pending.slice(count);
    } else {
      const offset =
        index +
        (this.injection.side === "after" ? this.injection.marker.length : 0);
      this.push(
        this.pending.slice(0, offset) +
          this.injection.html +
          this.pending.slice(offset)
      );
      this.pending = "";
      this.injected = true;
    }
    done();
  }

  override _flush(done: TransformCallback) {
    if (!this.injected) {
      done(
        new Error(
          `Fixture HTML lacks bootstrap marker ${this.injection.marker}`
        )
      );
      return;
    }
    this.push(this.pending + this.decoder.end());
    done();
  }
}
