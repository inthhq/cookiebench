"use client";

import { installKetch } from "@cookiebench/fixture-support/competitor";
import { useEffect } from "react";

export function ConsentFixture() {
  useEffect(installKetch, []);
  return (
    <button id="reopen-preferences" type="button">
      Privacy preferences
    </button>
  );
}
