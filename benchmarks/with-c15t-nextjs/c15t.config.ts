import { defineConsentConfig } from "c15t/next";

export const backendURL = "https://benchmarks-inth.inth.app";

export const consentConfig = defineConsentConfig({
  backendURL,
  manifestURL: "/api/c15t/manifest",
});
