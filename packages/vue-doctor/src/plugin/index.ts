import { accessibilityRules } from "./rules/accessibility.js";
import { architectureRules } from "./rules/architecture.js";
import { bundleSizeRules } from "./rules/bundle-size.js";
import { compositionApiRules } from "./rules/composition-api.js";
import { correctnessRules } from "./rules/correctness.js";
import { nuxtRules } from "./rules/nuxt.js";
import { performanceRules } from "./rules/performance.js";
import { securityRules } from "./rules/security.js";
import type { RulePlugin } from "./types.js";

export const vueDoctorPlugin: RulePlugin = {
  rules: {
    // Composition API rules
    ...compositionApiRules,

    // Performance rules
    ...performanceRules,

    // Security rules
    ...securityRules,

    // Architecture rules
    ...architectureRules,

    // Correctness rules
    ...correctnessRules,

    // Nuxt-specific rules
    ...nuxtRules,

    // Bundle size rules
    ...bundleSizeRules,

    // Accessibility rules
    ...accessibilityRules,
  },
};

export default vueDoctorPlugin;

// Named exports for programmatic use
export { accessibilityRules, architectureRules, bundleSizeRules, compositionApiRules, correctnessRules, nuxtRules, performanceRules, securityRules };
