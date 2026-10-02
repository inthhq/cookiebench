import { c15tVue } from "@c15t/vue/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: { input: { baseline: "baseline.html", main: "index.html" } },
  },
  plugins: [vue(), c15tVue()],
});
