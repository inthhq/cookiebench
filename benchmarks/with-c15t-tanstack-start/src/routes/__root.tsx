import { pageCSS } from "@cookiebench/fixture-support/page";
import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";

function Document() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
        <style>{pageCSS}</style>
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  );
}
export const Route = createRootRoute({
  component: Document,
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { content: "width=device-width, initial-scale=1", name: "viewport" },
      { title: "CookieBench TanStack Start" },
    ],
  }),
});
