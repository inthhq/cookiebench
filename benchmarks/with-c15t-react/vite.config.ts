import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rolldownOptions: {
      input: { baseline: "baseline.html", cmp: "index.html" },
    },
  },
  plugins: [react()],
});
