import type { Rule } from "../types.js";

/**
 * Detects importing from barrel/index files which prevents tree-shaking.
 * Pattern: import { Button } from './components'
 */
export const noBarrelImport: Rule = {
  meta: {
    type: "suggestion",
    docs: { description: "Avoid importing from barrel (index) files" },
    messages: {
      directImport:
        "Barrel imports prevent tree-shaking and increase bundle size. Import directly: `import { Button } from './components/Button.vue'`",
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const source = node.source as { value?: string };
        const importPath = source.value ?? "";

        // Skip node_modules
        if (!importPath.startsWith(".") && !importPath.startsWith("/")) return;

        // Detect imports ending with /index or directory-like paths with no extension
        const isBarrelImport =
          importPath.endsWith("/index") ||
          importPath.endsWith("/index.ts") ||
          importPath.endsWith("/index.js") ||
          importPath.endsWith("/index.vue") ||
          importPath.endsWith("/") ||
          (importPath.includes("/") &&
            !importPath.split("/").pop()?.includes(".") &&
            !importPath.endsWith(".."));

        if (isBarrelImport) {
          context.report({ node, messageId: "directImport" });
        }
      },
    };
  },
};

/**
 * Detects full lodash import which bundles the entire library (~70kb).
 * Pattern: import _ from 'lodash' or import { debounce } from 'lodash'
 */
export const noFullLodashImport: Rule = {
  meta: {
    type: "suggestion",
    docs: { description: "Avoid full lodash import" },
    messages: {
      useEsmLodash:
        "Full lodash import adds ~70kb. Use specific imports: `import debounce from 'lodash/debounce'` or use `lodash-es` for tree-shaking.",
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const source = node.source as { value?: string };
        if (source.value !== "lodash") return;

        const specifiers = node.specifiers as Array<{ type: string }>;

        // import _ from 'lodash' (default import of entire library)
        const hasDefaultImport = specifiers.some(
          (spec) => spec.type === "ImportDefaultSpecifier",
        );

        // import { debounce, throttle } from 'lodash' — better to use lodash/fn
        const hasNamedImports = specifiers.some(
          (spec) => spec.type === "ImportSpecifier",
        );

        if (hasDefaultImport || hasNamedImports) {
          context.report({ node, messageId: "useEsmLodash" });
        }
      },
    };
  },
};

/**
 * Detects moment.js imports which add ~230kb.
 * Pattern: import moment from 'moment'
 */
export const noMomentImport: Rule = {
  meta: {
    type: "suggestion",
    docs: { description: "Avoid moment.js — it adds ~230kb" },
    messages: {
      useDateFns:
        "moment.js adds ~230kb to your bundle. Replace with `import { format } from 'date-fns'` (tree-shakeable) or `import dayjs from 'dayjs'` (2kb).",
    },
  },
  create(context) {
    return {
      ImportDeclaration(node) {
        const source = node.source as { value?: string };
        if (source.value === "moment" || source.value === "moment-timezone") {
          context.report({ node, messageId: "useDateFns" });
        }
      },
    };
  },
};

/**
 * Detects large static imports that could be loaded asynchronously.
 * Pattern: import HeavyEditor from 'heavy-editor' at component level
 */
export const preferAsyncComponent: Rule = {
  meta: {
    type: "suggestion",
    docs: { description: "Use defineAsyncComponent for heavy components" },
    messages: {
      useAsyncComponent:
        "Consider using `defineAsyncComponent(() => import('./HeavyComponent.vue'))` for large components that are not immediately visible.",
    },
  },
  create(context) {
    const HEAVY_COMPONENT_INDICATORS = new Set([
      "editor",
      "chart",
      "map",
      "calendar",
      "video",
      "player",
      "pdf",
      "wysiwyg",
      "rich-text",
      "markdown",
      "code-mirror",
      "monaco",
    ]);

    return {
      ImportDeclaration(node) {
        const source = node.source as { value?: string };
        const importPath = source.value ?? "";

        // Only check local Vue component imports
        if (!importPath.startsWith(".") || !importPath.endsWith(".vue")) return;

        const componentName = importPath.split("/").pop()?.replace(".vue", "").toLowerCase() ?? "";

        if (
          HEAVY_COMPONENT_INDICATORS.has(componentName) ||
          [...HEAVY_COMPONENT_INDICATORS].some((indicator) => componentName.includes(indicator))
        ) {
          context.report({ node, messageId: "useAsyncComponent" });
        }
      },
    };
  },
};

/**
 * Detects importing from known heavy libraries without tree-shaking.
 */
export const noHeavyLibrary: Rule = {
  meta: {
    type: "suggestion",
    docs: { description: "Avoid importing from known heavy libraries" },
    messages: {
      findAlternative:
        "This library adds significant bundle size. Check if a lighter alternative or tree-shakeable version exists.",
    },
  },
  create(context) {
    const ALTERNATIVES: Record<string, string> = {
      jquery:
        "jQuery adds ~90kb. Use native DOM APIs or Vue's built-in reactivity instead.",
      underscore:
        "underscore.js is outdated. Use `lodash-es` for tree-shaking or native array/object methods.",
      ramda:
        "Ramda adds ~40kb. Consider using native JS methods or a lighter utility library.",
    };

    return {
      ImportDeclaration(node) {
        const source = node.source as { value?: string };
        const pkg = source.value ?? "";

        const alternative = ALTERNATIVES[pkg];
        if (alternative) {
          context.report({
            node,
            message: alternative,
          });
        }
      },
    };
  },
};

export const bundleSizeRules = {
  "no-barrel-import": noBarrelImport,
  "no-full-lodash-import": noFullLodashImport,
  "no-moment-import": noMomentImport,
  "prefer-async-component": preferAsyncComponent,
  "no-heavy-library": noHeavyLibrary,
};
