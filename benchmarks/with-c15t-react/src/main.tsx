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
} from "c15t/react";
import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import "c15t/react/styles.css";
import { Page } from "./page.tsx";

initializeBridge();
function Probe() {
  const snapshot = useSnapshot();
  const setActiveUI = useSetActiveUI();
  const saveConsents = useSaveConsents();
  const [scripts] = useState(() =>
    Array.from(
      {
        length: Number(new URL(location.href).searchParams.get("scripts") ?? 2),
      },
      (_, index) => {
        const category =
          index % 2 === 0 ? ("measurement" as const) : ("marketing" as const);
        return {
          category,
          id: `script-${index}`,
          src: controlledScript(`script-${index}`, category),
        };
      }
    )
  );
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
const root = document.querySelector("#root");
if (!root) {
  throw new Error("Fixture root was not rendered.");
}
createRoot(root).render(
  <ConsentProvider
    options={{
      consentCategories: ["necessary", "measurement", "marketing"],
      mode: hosted({ url: "https://benchmarks-inth.inth.app" }),
    }}
  >
    <Page />
    <Probe />
    <ConsentBanner />
    <ConsentDialog />
  </ConsentProvider>
);
