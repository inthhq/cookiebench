import { pageCSS } from "@cookiebench/fixture-support/page";
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style>{pageCSS}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
