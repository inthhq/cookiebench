import { c15tVue } from "@c15t/vue/vue-plugin";
import { createApp } from "vue";

import App from "./app.vue";

createApp(App)
  .use(c15tVue, {
    backendURL: "/api/consent",
    consentCategories: ["necessary", "measurement", "marketing"],
  })
  .mount("#app");
