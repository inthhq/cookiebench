"use client";

import { installUsercentrics } from "@cookiebench/fixture-support/competitor";
import { useEffect } from "react";

export function ConsentFixture() {
  useEffect(installUsercentrics, []);
  return (
    <button id="reopen-preferences" type="button">
      Privacy preferences
    </button>
  );
}
