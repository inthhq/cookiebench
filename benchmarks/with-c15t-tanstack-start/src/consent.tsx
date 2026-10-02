import {
  ConsentBanner,
  ConsentDialog,
  ConsentRoot,
  useSetActiveUI,
  useSnapshot,
  useScriptLoader,
} from "@c15t/tanstack-start";
import type { ConsentRootProps } from "@c15t/tanstack-start";
import { controlledWorkload, updateBridge } from "@cookiebench/fixture-support";
import { useEffect, useState } from "react";

import "@c15t/tanstack-start/styles.css";
import { Page } from "./page";

function Probe() {
  const snapshot = useSnapshot();
  const setActiveUI = useSetActiveUI();
  const [scripts, setScripts] = useState<ReturnType<typeof controlledWorkload>>(
    []
  );
  useEffect(() => {
    setScripts(controlledWorkload());
  }, []);
  useScriptLoader(scripts);
  useEffect(() => {
    updateBridge(snapshot);
  }, [snapshot]);
  return (
    <button
      id="reopen-preferences"
      type="button"
      onClick={() => setActiveUI("dialog")}
    >
      Privacy preferences
    </button>
  );
}
export function ConsentPage({ state }: { state: ConsentRootProps["state"] }) {
  return (
    <ConsentRoot
      backendURL="/api/consent"
      initRoute={false}
      state={state}
      options={{ consentCategories: ["necessary", "measurement", "marketing"] }}
    >
      <Page />
      <Probe />
      <ConsentBanner />
      <ConsentDialog />
    </ConsentRoot>
  );
}
