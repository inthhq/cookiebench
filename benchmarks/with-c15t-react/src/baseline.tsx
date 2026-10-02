import { createRoot } from "react-dom/client";

import { Page } from "./page.tsx";

const root = document.querySelector("#root");
if (!root) {
  throw new Error("Fixture root was not rendered.");
}
createRoot(root).render(<Page />);
