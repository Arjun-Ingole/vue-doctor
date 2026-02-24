import type { Rule, RuleVisitors } from "../types.js";
import { EXPENSIVE_ARRAY_METHODS } from "../constants.js";
import { GIANT_COMPONENT_LINE_THRESHOLD } from "../constants.js";
import { countChainedArrayMethods, getTemplateBodyVisitor } from "../helpers.js";

/**
 * Detects v-for with array index used as :key.
 * Pattern: v-for="(item, index) in items" :key="index"
 */
export const noIndexAsKey: Rule = {
  meta: {
    type: "suggestion",
    docs: { description: "Avoid using array index as :key in v-for" },
    messages: {
      useStableKey:
        "Using index as :key breaks rendering on reorder/filter. Use a stable unique ID: `:key=\"item.id\"`",
    },
  },
  create(context) {
    const defineTemplateBodyVisitor = getTemplateBodyVisitor(context);
    if (!defineTemplateBodyVisitor) return {} as RuleVisitors;

    return defineTemplateBodyVisitor({
      VAttribute(node) {
        // Find :key="index" or v-bind:key="index"
        const attr = node as unknown as {
          directive: boolean;
          key?: { name?: { name?: string } | string; argument?: { name?: string } | null };
          value?: { expression?: { type?: string; name?: string } };
        };

        if (!attr.directive) return;

        const keyName =
          typeof attr.key?.name === "object"
            ? attr.key?.name?.name
            : attr.key?.name;
        const argName =
          typeof attr.key?.argument === "object"
            ? attr.key?.argument?.name
            : null;

        if (keyName !== "bind" || argName !== "key") return;

        const expr = attr.value?.expression;
        if (!expr) return;

        // Check if the key expression is the index variable from v-for
        // This is detected by checking if the identifier is named "index" or "i" etc.
        if (expr.type === "Identifier") {
          const name = expr.name as string | undefined;
          if (name === "index" || name === "i" || name === "idx") {
            context.report({ node: node as unknown as { type: string }, messageId: "useStableKey" });
          }
        }
      },
    });
  },
};

/**
 * Detects complex chained array expressions in Vue templates that should be computed properties.
 * Pattern: {{ items.filter(x => x.active).map(x => x.name) }}
 */
export const noExpensiveInlineExpression: Rule = {
  meta: {
    type: "suggestion",
    docs: { description: "Move expensive template expressions to computed properties" },
    messages: {
      useComputed:
        "Complex template expression detected. Move to a computed property for better performance and readability.",
    },
  },
  create(context) {
    const defineTemplateBodyVisitor = getTemplateBodyVisitor(context);
    if (!defineTemplateBodyVisitor) return {} as RuleVisitors;

    return defineTemplateBodyVisitor({
      VExpressionContainer(node) {
        const container = node as unknown as { expression?: { type?: string } };
        const expr = container.expression;
        if (!expr) return;

        // Count chained array method calls
        const chainCount = countChainedArrayMethods(
          expr as { type: string },
          EXPENSIVE_ARRAY_METHODS,
        );
        if (chainCount >= 2) {
          context.report({
            node: node as unknown as { type: string },
            messageId: "useComputed",
          });
        }
      },
    });
  },
};

/**
 * Detects v-for used without :key attribute.
 */
export const requireKeyForVFor: Rule = {
  meta: {
    type: "problem",
    docs: { description: "v-for requires a :key attribute" },
    messages: {
      missingKey:
        "v-for without :key causes inefficient re-rendering. Add `:key=\"item.id\"` for stable diffing.",
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
              key?: {
                name?: { name?: string } | string;
                argument?: { name?: string } | null;
              };
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

        if (!hasVFor) return;

        const hasKey = attrs.some((attr) => {
          if (!attr.directive) return false;
          const name =
            typeof attr.key?.name === "object" ? attr.key?.name?.name : attr.key?.name;
          const arg =
            typeof attr.key?.argument === "object" ? attr.key?.argument?.name : null;
          return name === "bind" && arg === "key";
        });

        if (!hasKey) {
          context.report({ node: node as unknown as { type: string }, messageId: "missingKey" });
        }
      },
    });
  },
};

/**
 * Detects deep watching without explicit justification.
 * Pattern: watch(obj, handler, { deep: true })
 */
export const noDeepWatch: Rule = {
  meta: {
    type: "suggestion",
    docs: { description: "Avoid deep watching large objects without justification" },
    messages: {
      preferShallow:
        "Deep watching traverses the entire object tree on every change. Watch specific properties instead: `watch(() => obj.prop, handler)`",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee as { type: string; name?: string };
        if (callee.type !== "Identifier" || callee.name !== "watch") return;

        const args = node.arguments as Array<{
          type: string;
          properties?: Array<{
            key?: { name?: string };
            value?: { type: string; value?: unknown };
          }>;
        }>;
        if (!args || args.length < 3) return;

        const options = args[2];
        if (options.type !== "ObjectExpression") return;

        const hasDeepTrue = options.properties?.some(
          (prop) =>
            prop.key?.name === "deep" &&
            prop.value?.type === "Literal" &&
            prop.value.value === true,
        );

        if (hasDeepTrue) {
          context.report({ node, messageId: "preferShallow" });
        }
      },
    };
  },
};

/**
 * Detects method calls in templates that should be memoized as computed properties.
 * Pattern: {{ formatDate(item.date) }} called in v-for loops
 */
export const noTemplateMethodCall: Rule = {
  meta: {
    type: "suggestion",
    docs: { description: "Avoid calling methods in v-for templates; use computed" },
    messages: {
      useComputed:
        "Calling a method inside v-for re-runs on every render. Move to a computed property or precompute the array.",
    },
  },
  create(context) {
    const defineTemplateBodyVisitor = getTemplateBodyVisitor(context);
    if (!defineTemplateBodyVisitor) return {} as RuleVisitors;

    let vForDepth = 0;

    return defineTemplateBodyVisitor({
      "VElement[startTag.attributes]"(node) {
        const el = node as unknown as {
          startTag?: { attributes?: Array<{ directive?: boolean; key?: { name?: { name?: string } | string } }> };
        };
        const attrs = el.startTag?.attributes ?? [];
        const hasVFor = attrs.some((attr) => {
          if (!attr.directive) return false;
          const name =
            typeof attr.key?.name === "object" ? attr.key?.name?.name : attr.key?.name;
          return name === "for";
        });
        if (hasVFor) vForDepth++;
      },
      "VElement:exit"(node) {
        const el = node as unknown as {
          startTag?: { attributes?: Array<{ directive?: boolean; key?: { name?: { name?: string } | string } }> };
        };
        const attrs = el.startTag?.attributes ?? [];
        const hasVFor = attrs.some((attr) => {
          if (!attr.directive) return false;
          const name =
            typeof attr.key?.name === "object" ? attr.key?.name?.name : attr.key?.name;
          return name === "for";
        });
        if (hasVFor) vForDepth--;
      },
      "VExpressionContainer CallExpression"(node) {
        if (vForDepth === 0) return;

        const call = node as unknown as {
          callee?: { type: string; name?: string; property?: { name?: string } };
          arguments?: unknown[];
        };

        // Flag method calls with arguments in v-for contexts (not simple property access)
        if (
          call.callee?.type === "Identifier" &&
          call.arguments &&
          call.arguments.length > 0
        ) {
          context.report({
            node: node as unknown as { type: string },
            messageId: "useComputed",
          });
        }
      },
    });
  },
};

/**
 * Detects giant Vue SFC components (> 300 lines).
 */
export const noGiantComponent: Rule = {
  meta: {
    type: "suggestion",
    docs: { description: "Avoid giant Vue components" },
    messages: {
      splitComponent:
        "This component exceeds {{threshold}} lines. Extract logical sections into focused child components.",
    },
  },
  create(context) {
    return {
      Program(node) {
        const lines = context.getSourceCode().lines;
        if (lines.length > GIANT_COMPONENT_LINE_THRESHOLD) {
          context.report({
            node,
            messageId: "splitComponent",
            data: { threshold: String(GIANT_COMPONENT_LINE_THRESHOLD) },
          });
        }
      },
    };
  },
};

export const performanceRules = {
  "no-index-as-key": noIndexAsKey,
  "no-expensive-inline-expression": noExpensiveInlineExpression,
  "require-key-for-v-for": requireKeyForVFor,
  "no-deep-watch": noDeepWatch,
  "no-template-method-call": noTemplateMethodCall,
  "no-giant-component": noGiantComponent,
};
