import type { Rule, RuleVisitors } from "../types.js";
import { DOM_ACCESS_PROPERTIES } from "../constants.js";
import { getTemplateBodyVisitor, walkAst } from "../helpers.js";

/**
 * Detects direct DOM manipulation in setup() or lifecycle hooks.
 * Pattern: document.querySelector('.foo') — should use useTemplateRef() or ref=""
 */
export const noDirectDomManipulation: Rule = {
  meta: {
    type: "suggestion",
    docs: { description: "Avoid direct DOM manipulation; use template refs" },
    messages: {
      useTemplateRef:
        "Direct DOM access bypasses Vue's reactivity. Use `const el = useTemplateRef('myEl')` and `ref=\"myEl\"` in the template instead.",
    },
  },
  create(context) {
    return {
      MemberExpression(node) {
        const obj = node.object as { type: string; name?: string };
        const prop = node.property as { type: string; name?: string };

        if (
          obj.type === "Identifier" &&
          (obj.name === "document" || obj.name === "window") &&
          prop.type === "Identifier" &&
          prop.name &&
          DOM_ACCESS_PROPERTIES.has(prop.name)
        ) {
          context.report({ node, messageId: "useTemplateRef" });
        }
      },
    };
  },
};

/**
 * Detects async setup() without Suspense wrapper.
 * Vue 3 requires components with async setup() to be wrapped in <Suspense>.
 */
export const noAsyncSetupWithoutNote: Rule = {
  meta: {
    type: "suggestion",
    docs: { description: "async setup() requires a Suspense parent" },
    messages: {
      needsSuspense:
        "Components with async setup() must be wrapped in <Suspense> by the parent. Consider using useAsyncData() or onMounted() with async logic instead.",
    },
  },
  create(context) {
    return {
      Property(node) {
        const key = node.key as { type: string; name?: string };
        if (key.type !== "Identifier" || key.name !== "setup") return;

        const value = node.value as {
          type: string;
          async?: boolean;
        };

        if (
          (value.type === "FunctionExpression" || value.type === "ArrowFunctionExpression") &&
          value.async
        ) {
          context.report({ node, messageId: "needsSuspense" });
        }
      },
    };
  },
};

/**
 * Detects using `this` inside <script setup>.
 * `this` is not available in <script setup>.
 */
export const noThisInSetup: Rule = {
  meta: {
    type: "problem",
    docs: { description: "Avoid using `this` in <script setup>" },
    messages: {
      noThis:
        "`this` is undefined in <script setup>. Access reactive state directly: use the variable name instead of `this.variableName`.",
    },
  },
  create(context) {
    // Only apply to .vue files
    const filename = context.getFilename?.() ?? context.filename ?? "";
    if (!filename.endsWith(".vue")) return {} as RuleVisitors;

    return {
      ThisExpression(node) {
        context.report({ node, messageId: "noThis" });
      },
    };
  },
};

/**
 * Detects v-if/v-else-if used together with v-for on the same element.
 * This is a common Vue anti-pattern — v-for has higher priority in Vue 2,
 * but v-if has higher priority in Vue 3, leading to confusion.
 */
export const noVIfWithVFor: Rule = {
  meta: {
    type: "problem",
    docs: { description: "Avoid v-if and v-for on the same element" },
    messages: {
      separateConcerns:
        "v-if and v-for on the same element is confusing (v-if has priority in Vue 3). Wrap with a `<template v-for>` and place v-if on the inner element.",
    },
  },
  create(context) {
    const defineTemplateBodyVisitor = getTemplateBodyVisitor(context);
    if (!defineTemplateBodyVisitor) return {} as RuleVisitors;

    return defineTemplateBodyVisitor({
      VElement(node) {
        const el = node as unknown as {
          startTag?: {
            attributes?: Array<{
              directive?: boolean;
              key?: { name?: { name?: string } | string };
            }>;
          };
        };

        const attrs = el.startTag?.attributes ?? [];

        const hasVFor = attrs.some((attr) => {
          if (!attr.directive) return false;
          const name =
            typeof attr.key?.name === "object" ? attr.key?.name?.name : attr.key?.name;
          return name === "for";
        });

        const hasVIf = attrs.some((attr) => {
          if (!attr.directive) return false;
          const name =
            typeof attr.key?.name === "object" ? attr.key?.name?.name : attr.key?.name;
          return name === "if" || name === "else-if";
        });

        if (hasVFor && hasVIf) {
          context.report({ node: node as unknown as { type: string }, messageId: "separateConcerns" });
        }
      },
    });
  },
};

/**
 * Detects defineProps usage without TypeScript type annotation.
 */
export const requireDefinePropsTypes: Rule = {
  meta: {
    type: "suggestion",
    docs: { description: "defineProps should use TypeScript types" },
    messages: {
      addTypes:
        "defineProps() without types loses type safety. Use TypeScript: `const props = defineProps<{ title: string; count: number }>()`",
    },
  },
  create(context) {
    // Only apply to TypeScript files
    const filename = context.getFilename?.() ?? context.filename ?? "";
    if (!filename.endsWith(".vue") && !filename.endsWith(".ts")) return {} as RuleVisitors;

    return {
      CallExpression(node) {
        const callee = node.callee as {
          type: string;
          name?: string;
          typeParameters?: unknown;
        };

        if (callee.type !== "Identifier" || callee.name !== "defineProps") return;

        const args = node.arguments as unknown[];
        const hasTypeParam = Boolean(
          (node as unknown as { typeParameters?: unknown }).typeParameters,
        );

        // No type parameter and no runtime validator argument
        if (!hasTypeParam && args.length === 0) {
          context.report({ node, messageId: "addTypes" });
        }
      },
    };
  },
};

export const correctnessRules = {
  "no-direct-dom-manipulation": noDirectDomManipulation,
  "no-async-setup-without-note": noAsyncSetupWithoutNote,
  "no-this-in-setup": noThisInSetup,
  "no-v-if-with-v-for": noVIfWithVFor,
  "require-defineprops-types": requireDefinePropsTypes,
};
