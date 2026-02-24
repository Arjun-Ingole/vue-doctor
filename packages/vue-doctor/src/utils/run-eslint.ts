import fs from "node:fs";
import path from "node:path";
import { Linter } from "eslint";
import type { Diagnostic, Framework } from "../types.js";
import { vueDoctorPlugin } from "../plugin/index.js";
import { VUE_FILE_PATTERN } from "../constants.js";

// ─── Category & Help Maps ────────────────────────────────────────────────────

const RULE_CATEGORY_MAP: Record<string, string> = {
  // Composition API
  "vue-doctor/no-watch-as-computed": "Composition API",
  "vue-doctor/no-async-watcheffect": "Composition API",
  "vue-doctor/prefer-ref-over-reactive-primitive": "Composition API",
  "vue-doctor/no-mutation-in-computed": "Composition API",
  "vue-doctor/no-watch-immediate-fetch": "Composition API",
  "vue-doctor/no-reactive-destructure": "Composition API",
  "vue-doctor/no-ref-in-computed": "Composition API",
  "vue-doctor/no-async-computed": "Composition API",
  "vue-doctor/no-conditional-composable-call": "Composition API",

  // Performance
  "vue-doctor/no-index-as-key": "Performance",
  "vue-doctor/no-expensive-inline-expression": "Performance",
  "vue-doctor/require-key-for-v-for": "Performance",
  "vue-doctor/no-deep-watch": "Performance",
  "vue-doctor/no-template-method-call": "Performance",
  "vue-doctor/no-giant-component": "Architecture",

  // Security
  "vue-doctor/no-v-html": "Security",
  "vue-doctor/no-eval": "Security",
  "vue-doctor/no-secrets-in-client": "Security",

  // Architecture
  "vue-doctor/no-prop-mutation": "Architecture",
  "vue-doctor/require-emits-declaration": "Architecture",
  "vue-doctor/require-component-key": "Correctness",

  // Correctness
  "vue-doctor/no-direct-dom-manipulation": "Correctness",
  "vue-doctor/no-async-setup-without-note": "Correctness",
  "vue-doctor/no-this-in-setup": "Correctness",
  "vue-doctor/no-v-if-with-v-for": "Correctness",
  "vue-doctor/require-defineprops-types": "Correctness",

  // Nuxt
  "vue-doctor/use-usefetch-over-fetch": "Nuxt",
  "vue-doctor/require-server-route-error-handling": "Nuxt",
  "vue-doctor/no-window-in-ssr": "Nuxt",
  "vue-doctor/require-seo-meta": "Nuxt",
  "vue-doctor/no-process-env-in-client": "Nuxt",
  "vue-doctor/require-define-page-meta": "Nuxt",
  "vue-doctor/no-server-only-import-in-client": "Nuxt",
  "vue-doctor/no-client-composable-in-server-route": "Nuxt",

  // Bundle Size
  "vue-doctor/no-barrel-import": "Bundle Size",
  "vue-doctor/no-full-lodash-import": "Bundle Size",
  "vue-doctor/no-moment-import": "Bundle Size",
  "vue-doctor/prefer-async-component": "Bundle Size",
  "vue-doctor/no-heavy-library": "Bundle Size",

  // Accessibility
  "vue-doctor/no-autofocus": "Accessibility",
  "vue-doctor/no-positive-tabindex": "Accessibility",
  "vue-doctor/require-button-type": "Accessibility",
  "vue-doctor/require-img-alt": "Accessibility",
  "vue-doctor/require-accessible-form-control-name": "Accessibility",
  "vue-doctor/no-click-without-keyboard-handler": "Accessibility",
  "vue-doctor/require-media-captions": "Accessibility",
  "vue-doctor/no-aria-hidden-on-focusable": "Accessibility",
};

const RULE_HELP_MAP: Record<string, string> = {
  "no-watch-as-computed":
    "Replace watch() with computed(): `const derivedValue = computed(() => transform(source))`",
  "no-async-watcheffect":
    "Use watch() with the onCleanup parameter: `watch(source, async (val, oldVal, onCleanup) => { const controller = new AbortController(); onCleanup(() => controller.abort()); })`",
  "prefer-ref-over-reactive-primitive":
    "Use ref() for single values: `const count = ref(0)` instead of `reactive({ count: 0 })`",
  "no-mutation-in-computed":
    "Move mutations to methods or watch(): computed() must be a pure function with no side effects",
  "no-watch-immediate-fetch":
    "Use useFetch() or useAsyncData() for data fetching: `const { data } = useFetch('/api/items')`",
  "no-reactive-destructure":
    "Use toRefs(): `const { count, name } = toRefs(state)` to preserve reactivity after destructuring",
  "no-ref-in-computed":
    "Declare the ref outside: `const inner = ref(null)` then reference it in computed() as a dependency",
  "no-async-computed":
    "Keep computed getters synchronous; move async logic to watch()/onMounted() and update a ref",
  "no-conditional-composable-call":
    "Call composables unconditionally at setup top level to keep execution order predictable",
  "no-index-as-key":
    "Use a stable unique identifier: `:key=\"item.id\"` — index keys break rendering on reorder/filter",
  "no-expensive-inline-expression":
    "Extract to a computed property: `const filteredItems = computed(() => items.value.filter(...))`",
  "require-key-for-v-for":
    "Add a stable :key: `v-for=\"item in items\" :key=\"item.id\"` for efficient DOM reconciliation",
  "no-deep-watch":
    "Watch a specific path instead: `watch(() => obj.specificProp, handler)` to avoid traversing the whole object",
  "no-template-method-call":
    "Move to a computed: `const formattedItems = computed(() => items.value.map(formatItem))`",
  "no-giant-component":
    "Extract logical sections into focused components: `<ProductHeader />`, `<ProductActions />`, `<ProductReviews />`",
  "no-v-html":
    "Use v-text or {{ }} interpolation for safe content, or sanitize with DOMPurify: `v-html=\"sanitize(html)\"`",
  "no-eval": "Refactor to avoid dynamic code execution; use object maps for dispatch tables",
  "no-secrets-in-client":
    "Move secrets to server-side: use `useRuntimeConfig()` in Nuxt or server-side env vars. Only public keys like `VITE_PUBLIC_KEY` belong client-side",
  "no-prop-mutation":
    "Use emit for two-way binding: `emit('update:modelValue', newValue)` and `v-model` on the parent",
  "require-emits-declaration":
    "Add defineEmits: `const emit = defineEmits<{ change: [value: string]; update: [id: number] }>()`",
  "require-component-key":
    "Add :key to component: `<MyCard v-for=\"item in items\" :key=\"item.id\" />`",
  "no-direct-dom-manipulation":
    "Use Vue template refs: `<input ref=\"inputEl\" />` then `const inputEl = useTemplateRef('inputEl')`",
  "no-async-setup-without-note":
    "Wrap the component with <Suspense> in the parent, or use onMounted() with async logic to avoid suspending the component tree",
  "no-this-in-setup":
    "Access state directly by variable name in <script setup>: `count.value` instead of `this.count`",
  "no-v-if-with-v-for":
    "Use a wrapping `<template v-for>` and move v-if inside: `<template v-for=\"item in items\"><div v-if=\"item.active\" :key=\"item.id\">...</div></template>`",
  "require-defineprops-types":
    "Add TypeScript types: `const props = defineProps<{ title: string; count?: number }>()`",
  "use-usefetch-over-fetch":
    "Use `const { data, error } = await useFetch('/api/items')` for SSR-compatible data fetching with caching",
  "require-server-route-error-handling":
    "Add error handling: `try { ... } catch (err) { throw createError({ statusCode: 500, message: err.message }) }`",
  "no-window-in-ssr":
    "Wrap in onMounted: `onMounted(() => { window.scrollTo(0, 0) })` or check `import.meta.client` for conditional code",
  "require-seo-meta":
    "Add SEO meta: `useSeoMeta({ title: 'Page Title', description: 'Page description', ogTitle: 'Page Title' })`",
  "no-process-env-in-client":
    "Use `const config = useRuntimeConfig()` then `config.public.apiBase` for client-accessible config",
  "require-define-page-meta":
    "Add `definePageMeta({ ... })` in Nuxt page files to define layout and middleware behavior explicitly",
  "no-server-only-import-in-client":
    "Do not import server-only modules in client-rendered files; move logic to server routes or server plugins",
  "no-client-composable-in-server-route":
    "Do not call client-only composables in server route handlers",
  "no-barrel-import":
    "Import from the direct path: `import Button from './components/Button.vue'` instead of `./components`",
  "no-full-lodash-import":
    "Import specific functions: `import debounce from 'lodash/debounce'` or switch to `lodash-es` for full tree-shaking",
  "no-moment-import":
    "Switch to `import { format, parseISO } from 'date-fns'` (tree-shakeable) or `import dayjs from 'dayjs'` (2kb gzipped)",
  "prefer-async-component":
    "Use async loading: `const HeavyComponent = defineAsyncComponent(() => import('./HeavyComponent.vue'))`",
  "no-heavy-library": "Find a lighter alternative or use only the specific parts you need",
  "no-autofocus":
    "Remove autofocus and set focus only in response to user intent or controlled lifecycle logic",
  "no-positive-tabindex":
    "Use natural tab order or tabindex=\"0\"; avoid tabindex values greater than 0",
  "require-button-type":
    "Set an explicit button type: `type=\"button\"`, `type=\"submit\"`, or `type=\"reset\"`",
  "require-img-alt":
    "Add alt text to images, or use an empty alt (`alt=\"\"`) for decorative images",
  "require-accessible-form-control-name":
    "Add `aria-label`, `aria-labelledby`, or an associated `<label>` for form controls",
  "no-click-without-keyboard-handler":
    "Add keyboard handlers (keydown/keyup/keypress) for clickable non-interactive elements",
  "require-media-captions":
    "Add a `<track kind=\"captions\">` or `<track kind=\"subtitles\">` for video content",
  "no-aria-hidden-on-focusable":
    "Remove `aria-hidden=\"true\"` from focusable elements so assistive tech can access them",
};

// ─── Severity mapping ────────────────────────────────────────────────────────

const RULE_SEVERITY_MAP: Record<string, "error" | "warning"> = {
  // Errors — likely bugs or security issues
  "no-v-if-with-v-for": "error",
  "no-prop-mutation": "error",
  "no-eval": "error",
  "no-secrets-in-client": "error",
  "no-async-watcheffect": "error",
  "no-mutation-in-computed": "error",
  "no-this-in-setup": "error",
  "no-reactive-destructure": "error",
  "no-async-computed": "error",
  "no-conditional-composable-call": "error",
  "no-window-in-ssr": "error",
  "no-server-only-import-in-client": "error",
  "no-client-composable-in-server-route": "error",
  "no-autofocus": "error",
  "no-positive-tabindex": "error",
  "require-button-type": "error",
  "require-img-alt": "error",
  "require-accessible-form-control-name": "error",
  "no-click-without-keyboard-handler": "error",
  "require-media-captions": "error",
  "no-aria-hidden-on-focusable": "error",
  "require-define-page-meta": "warning",
  "use-usefetch-over-fetch": "warning",
  "require-server-route-error-handling": "warning",
};

const getRuleSeverity = (rule: string): "error" | "warning" =>
  RULE_SEVERITY_MAP[rule] ?? "warning";

// ─── File discovery ──────────────────────────────────────────────────────────

const IGNORED_DIRS = new Set([
  "node_modules",
  "dist",
  ".nuxt",
  ".output",
  ".git",
  "coverage",
  ".cache",
  "__pycache__",
]);

const collectVueFiles = (rootDirectory: string, includePaths?: string[]): string[] => {
  if (includePaths) return includePaths;

  const results: string[] = [];

  const walk = (dir: string): void => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name)) continue;

      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && VUE_FILE_PATTERN.test(entry.name)) {
        results.push(fullPath);
      }
    }
  };

  walk(rootDirectory);
  return results;
};

// ─── ESLint configuration ────────────────────────────────────────────────────

const buildRuleConfig = (framework: Framework, isNuxt: boolean) => {
  const rules: Record<string, "error" | "warn" | "off"> = {};

  // Always-on rules
  for (const ruleName of Object.keys(vueDoctorPlugin.rules)) {
    // Skip Nuxt-specific rules for non-Nuxt projects
    const isNuxtRule = ruleName.startsWith("use-usefetch") ||
      ruleName.startsWith("require-server-route") ||
      ruleName.startsWith("no-window-in-ssr") ||
      ruleName.startsWith("require-seo-meta") ||
      ruleName.startsWith("no-process-env-in-client");

    if (isNuxtRule && !isNuxt) continue;

    const severity = getRuleSeverity(ruleName);
    rules[`vue-doctor/${ruleName}`] = severity === "error" ? "error" : "warn";
  }

  return rules;
};

// ─── Message conversion ──────────────────────────────────────────────────────

const resolveCategory = (ruleId: string): string =>
  RULE_CATEGORY_MAP[ruleId] ?? "Other";

const resolveHelp = (ruleId: string): string => {
  const ruleName = ruleId.replace(/^vue-doctor\//, "");
  return RULE_HELP_MAP[ruleName] ?? "";
};

// ─── Main runner ─────────────────────────────────────────────────────────────

let cachedVueParser: unknown = null;

const getVueParser = async (): Promise<unknown> => {
  if (cachedVueParser) return cachedVueParser;
  try {
    cachedVueParser = await import("vue-eslint-parser");
    return cachedVueParser;
  } catch {
    return null;
  }
};

export const runEslint = async (
  rootDirectory: string,
  framework: Framework,
  hasTypeScript: boolean,
  includePaths?: string[],
): Promise<Diagnostic[]> => {
  if (includePaths !== undefined && includePaths.length === 0) return [];

  const isNuxt = framework === "nuxt";
  const files = collectVueFiles(rootDirectory, includePaths);
  if (files.length === 0) return [];

  const vueParser = await getVueParser();
  const linter = new Linter({ configType: "flat" });

  const ruleConfig = buildRuleConfig(framework, isNuxt);

  const allDiagnostics: Diagnostic[] = [];

  for (const filePath of files) {
    await new Promise<void>((resolve) => setImmediate(resolve));

    let content: string;
    try {
      content = fs.readFileSync(filePath, "utf-8");
    } catch {
      continue;
    }

    const isVue = filePath.endsWith(".vue");
    const relativePath = path.relative(rootDirectory, filePath);

    const configs: Linter.FlatConfig[] = [
      {
        files: ["**/*.vue", "**/*.ts", "**/*.tsx", "**/*.js", "**/*.mjs"],
        plugins: {
          "vue-doctor": vueDoctorPlugin as unknown as NonNullable<Linter.FlatConfig["plugins"]>[string],
        },
        rules: ruleConfig as Linter.RulesRecord,
        languageOptions: isVue && vueParser
          ? {
              parser: vueParser as Linter.Parser,
              parserOptions: {
                ecmaVersion: 2022,
                sourceType: "module",
              },
            }
          : {
              ecmaVersion: 2022,
              sourceType: "module",
            },
      },
    ];

    let messages: Linter.LintMessage[];
    try {
      messages = linter.verify(content, configs, filePath);
    } catch {
      continue;
    }

    for (const msg of messages) {
      if (!msg.ruleId) continue;

      const ruleId = msg.ruleId;
      const ruleName = ruleId.replace(/^vue-doctor\//, "");

      // Use the configured severity from our map rather than ESLint's
      const resolvedSeverity = getRuleSeverity(ruleName);

      allDiagnostics.push({
        filePath: relativePath,
        plugin: "vue-doctor",
        rule: ruleName,
        severity: resolvedSeverity,
        message: msg.message,
        help: resolveHelp(ruleId),
        line: msg.line ?? 0,
        column: msg.column ?? 0,
        category: resolveCategory(ruleId),
      });
    }
  }

  return allDiagnostics;
};
