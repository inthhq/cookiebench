"use client";

import { installOsano } from "@cookiebench/fixture-support/competitor";
import { useEffect } from "react";

export function ConsentFixture() {
  useEffect(installOsano, []);
  return (
    <button id="reopen-preferences" type="button">
      Privacy preferences
    </button>
  );
}
