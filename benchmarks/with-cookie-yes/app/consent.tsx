"use client";

import { installCookieYes } from "@cookiebench/fixture-support/competitor";
import { useEffect } from "react";

export function ConsentFixture() {
  useEffect(installCookieYes, []);
  return (
    <button id="reopen-preferences" type="button">
      Privacy preferences
    </button>
  );
}
