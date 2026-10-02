import { pageCSS, pageHTML } from "@cookiebench/fixture-support/page";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rolldownOptions: {
      input: {
        baseline: "baseline.html",
        cmp: "index.html",
        cookieyes: "cookieyes.html",
        headless: "headless.html",
      },
    },
  },
  plugins: [
    {
      name: "cookiebench-static-page",
      transformIndexHtml: {
        handler(html) {
          return {
            html: html.replace(
              '<div id="content"></div>',
              `<div id="content">${pageHTML}</div>`
            ),
            tags: [{ children: pageCSS, injectTo: "head", tag: "style" }],
          };
        },
        order: "pre",
      },
    },
  ],
});
