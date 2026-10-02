import {
  resolvePolicyRules,
  writePolicyResolutionWire,
} from "@c15t/schema/types";

export const translations = {
  common: {
    acceptAll: "Accept All",
    customize: "Customize",
    rejectAll: "Reject All",
    save: "Save",
  },
  consentManagerDialog: {
    description: "Choose which optional services may run.",
    title: "Privacy preferences",
  },
  consentTypes: {
    marketing: {
      description: "A controlled marketing workload.",
      title: "Marketing",
    },
    measurement: {
      description: "A controlled measurement workload.",
      title: "Measurement",
    },
    necessary: {
      description: "Required to provide the page.",
      title: "Necessary",
    },
  },
  cookieBanner: {
    description:
      "Choose whether this page may run optional measurement and marketing services.",
    title: "Your privacy choices",
  },
};
export const initResponse = {
  branding: "c15t",
  jurisdiction: "NONE",
  location: { countryCode: null, regionCode: null },
  policyResolution: writePolicyResolutionWire(
    resolvePolicyRules({
      countryCode: null,
      regionCode: null,
      rules: [
        {
          id: "cookiebench-strict-opt-in",
          match: { fallback: true, isDefault: true },
          model: "opt-in",
          prompt: "choice",
        },
      ],
    })
  ),
  translations: { language: "en", translations },
};
