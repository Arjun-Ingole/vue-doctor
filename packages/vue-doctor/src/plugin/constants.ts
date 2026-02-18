// Thresholds
export const GIANT_COMPONENT_LINE_THRESHOLD = 300;

// Composition API
export const WATCH_FUNCTIONS = new Set(["watch", "watchEffect", "watchPostEffect", "watchSyncEffect"]);
export const LIFECYCLE_HOOKS = new Set([
  "onMounted", "onUnmounted", "onBeforeMount", "onBeforeUnmount",
  "onUpdated", "onBeforeUpdate", "onActivated", "onDeactivated",
  "onErrorCaptured", "onRenderTracked", "onRenderTriggered",
]);
export const REACTIVITY_FUNCTIONS = new Set(["ref", "reactive", "computed", "readonly", "shallowRef", "shallowReactive"]);
export const SETUP_COMPOSABLES = new Set(["useFetch", "useAsyncData", "useLazyFetch", "useLazyAsyncData"]);

// Bundle size
export const HEAVY_PACKAGES = new Set(["lodash", "moment", "jquery", "underscore", "ramda"]);
export const LODASH_ESM_PACKAGES = new Set(["lodash-es", "lodash/fp"]);

// Security
export const SECRET_PATTERNS: RegExp[] = [
  /(?:api|app|auth|secret|token|key|password|passwd|pwd|jwt|bearer)[-_]?(?:key|secret|token|id)?["']?\s*[:=]\s*["'][a-zA-Z0-9_\-./+]{12,}/i,
  /["'](?:sk|pk|rk|ak|ek)-[a-zA-Z0-9]{20,}["']/,
  /["'][a-zA-Z0-9+/]{40,}={0,2}["']/,
  /PRIVATE\s+KEY/,
  /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY/,
];

// Nuxt
export const NUXT_FETCH_ALTERNATIVES = new Set(["useFetch", "useAsyncData", "useLazyFetch", "useLazyAsyncData", "$fetch"]);

// DOM
export const DOM_ACCESS_PROPERTIES = new Set(["querySelector", "querySelectorAll", "getElementById", "getElementsByClassName", "getElementsByTagName"]);

// Animation
export const ANIMATION_LIBRARIES = new Set(["gsap", "@gsap", "anime", "animejs", "motion", "@motionone/vue", "vue-motion"]);

// Performance
export const EXPENSIVE_ARRAY_METHODS = new Set(["filter", "map", "reduce", "find", "findIndex", "sort", "flatMap"]);
