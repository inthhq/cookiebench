"use client";
import { installPageInteraction } from "@cookiebench/fixture-support";
import { useEffect } from "react";

export function Interaction() {
  useEffect(installPageInteraction, []);
  return null;
}
