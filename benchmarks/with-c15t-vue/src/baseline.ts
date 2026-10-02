import { installPageInteraction } from "@cookiebench/fixture-support";
import { pageHTML, pageCSS } from "@cookiebench/fixture-support/page";
import { createApp, h, onMounted } from "vue";

createApp({
  setup() {
    onMounted(installPageInteraction);
    return () =>
      h("div", [h("style", pageCSS), h("div", { innerHTML: pageHTML })]);
  },
}).mount("#app");
