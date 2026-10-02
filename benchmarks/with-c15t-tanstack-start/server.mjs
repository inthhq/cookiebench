import path from "node:path";
import { pathToFileURL } from "node:url";

import { serve } from "srvx";
import { staticMiddleware } from "srvx/static";

const directory = import.meta.dirname;
const { default: app } = await import(
  pathToFileURL(path.join(directory, "dist/server/server.js")).href
);
const server = serve({
  fetch: app.fetch,
  gracefulShutdown: false,
  hostname: process.env.HOST ?? "127.0.0.1",
  middleware: [staticMiddleware({ dir: path.join(directory, "dist/client") })],
  port: Number(process.env.PORT ?? 4416),
});
await server.ready();
