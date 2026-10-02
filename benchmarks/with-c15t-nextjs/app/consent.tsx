"use client";
import {
  controlledScript,
  initializeBridge,
  updateBridge,
} from "@cookiebench/fixture-support";
import {
  ConsentProvider,
  ConsentBanner,
  ConsentDialog,
  hosted,
  useSnapshot,
  useSetActiveUI,
  useSaveConsents,
  useScriptLoader,
} from "c15t/next";
import { useEffect, useState } from "react";

import "c15t/next/styles.css";
import { Interaction } from "./interaction.tsx";

function Probe() {
  const snapshot = useSnapshot();
  const setActiveUI = useSetActiveUI();
  const saveConsents = useSaveConsents();
  const [scripts, setScripts] = useState<
    { id: string; category: "measurement" | "marketing"; src: string }[]
  >([]);
  useEffect(() => {
    initializeBridge();
    const count = Number(
      new URL(location.href).searchParams.get("scripts") ?? 2
    );
    setScripts(
      Array.from({ length: count }, (_, index) => {
        const category = index % 2 === 0 ? "measurement" : "marketing";
        return {
          category,
          id: `script-${index}`,
          src: controlledScript(`script-${index}`, category),
        };
      })
    );
  }, []);
  useScriptLoader(scripts);
  useEffect(() => {
    updateBridge(snapshot);
  }, [snapshot]);
  return (
    <div>
      <button
        id="reopen-preferences"
        type="button"
        onClick={() => setActiveUI("dialog")}
      >
        Privacy preferences
      </button>
      <button
        id="withdraw-consent"
        type="button"
        onClick={() => {
          void saveConsents("none");
        }}
      >
        Withdraw optional consent
      </button>
    </div>
  );
}
export function ConsentFixture() {
  return (
    <ConsentProvider
      options={{
        consentCategories: ["necessary", "measurement", "marketing"],
        mode: hosted({ url: "/api/consent" }),
      }}
    >
      <Interaction />
      <Probe />
      <ConsentBanner />
      <ConsentDialog />
    </ConsentProvider>
  );
}
