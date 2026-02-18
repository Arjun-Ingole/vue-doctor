import type { Rule, RuleVisitors } from "../types.js";
import { GIANT_COMPONENT_LINE_THRESHOLD } from "../constants.js";
import { getTemplateBodyVisitor, walkAst } from "../helpers.js";

/**
 * Detects Vue SFC files over GIANT_COMPONENT_LINE_THRESHOLD lines.
 */
export const noGiantComponent: Rule = {
  meta: {
    type: "suggestion",
    docs: { description: "Avoid giant Vue components" },
    messages: {
      splitComponent:
        "This component exceeds {{threshold}} lines. Extract logical sections into focused child components: `<UserHeader />`, `<UserActions />`, etc.",
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

/**
 * Detects direct mutation of props.
 * Pattern: props.title = "new value" or emit is not used
 */
export const noPropMutation: Rule = {
  meta: {
    type: "problem",
    docs: { description: "Avoid mutating props directly" },
    messages: {
      noPropMutation:
        "Props are read-only. Emit an event instead: `emit('update:title', newValue)` and use v-model on the parent.",
    },
  },
  create(context) {
    // Track defineProps result variable name
    let propsVariableName: string | null = null;
    const propNames = new Set<string>();

    return {
      VariableDeclarator(node) {
        const init = node.init as { type: string; callee?: { name?: string }; arguments?: Array<{ type: string; properties?: Array<{ key?: { name?: string } }> }> } | null;
        if (!init) return;
        if (
          init.type !== "CallExpression" ||
          init.callee?.name !== "defineProps"
        )
          return;

        const id = node.id as { type: string; name?: string };
        if (id.type === "Identifier" && id.name) {
          propsVariableName = id.name;
        }

        // Collect prop names from withDefaults(defineProps<{ ... }>(), ...) or defineProps({ ... })
        const args = init.arguments;
        if (args?.[0]?.type === "ObjectExpression") {
          for (const prop of args[0].properties ?? []) {
            if (prop.key?.name) propNames.add(prop.key.name);
          }
        }
      },

      AssignmentExpression(node) {
        const left = node.left as {
          type: string;
          object?: { type: string; name?: string };
          property?: { type: string; name?: string };
        };

        if (left.type !== "MemberExpression") return;

        // Check for props.xxx = ...
        if (
          left.object?.type === "Identifier" &&
          left.object.name === propsVariableName &&
          propsVariableName !== null
        ) {
          context.report({ node, messageId: "noPropMutation" });
        }
      },
    };
  },
};

/**
 * Detects using $emit without defineEmits declaration.
 */
export const requireEmitsDeclaration: Rule = {
  meta: {
    type: "suggestion",
    docs: { description: "Declare emits with defineEmits()" },
    messages: {
      declareEmits:
        "Use defineEmits() to declare emitted events: `const emit = defineEmits(['update:value', 'change'])`",
    },
  },
  create(context) {
    let hasDefineEmits = false;
    const emitCalls: Array<{ type: string }> = [];

    return {
      CallExpression(node) {
        const callee = node.callee as { type: string; name?: string };

        if (callee.type === "Identifier" && callee.name === "defineEmits") {
          hasDefineEmits = true;
        }

        // Detect emit('event') calls (setup emit usage)
        if (callee.type === "Identifier" && callee.name === "emit") {
          emitCalls.push(node);
        }
      },
      "Program:exit"() {
        if (!hasDefineEmits && emitCalls.length > 0) {
          for (const emitCall of emitCalls) {
            context.report({ node: emitCall, messageId: "declareEmits" });
          }
        }
      },
    };
  },
};

/**
 * Detects components in v-for without a :key attribute.
 */
export const requireComponentKey: Rule = {
  meta: {
    type: "problem",
    docs: { description: "Components in v-for require :key" },
    messages: {
      missingKey:
        "Vue components in v-for must have a :key. Add `:key=\"item.id\"` to ensure correct DOM reconciliation.",
    },
  },
  create(context) {
    const defineTemplateBodyVisitor = getTemplateBodyVisitor(context);
    if (!defineTemplateBodyVisitor) return {} as RuleVisitors;

    return defineTemplateBodyVisitor({
      VElement(node) {
        const el = node as unknown as {
          name?: string;
          rawName?: string;
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

        // Only check component elements (PascalCase or containing a hyphen)
        const name = el.rawName ?? el.name ?? "";
        const isComponent =
          /^[A-Z]/.test(name) || name.includes("-");
        if (!isComponent) return;

        const attrs = el.startTag?.attributes ?? [];

        const hasVFor = attrs.some((attr) => {
          if (!attr.directive) return false;
          const attrName =
            typeof attr.key?.name === "object" ? attr.key?.name?.name : attr.key?.name;
          return attrName === "for";
        });

        if (!hasVFor) return;

        const hasKey = attrs.some((attr) => {
          if (!attr.directive) return false;
          const attrName =
            typeof attr.key?.name === "object" ? attr.key?.name?.name : attr.key?.name;
          const argName =
            typeof attr.key?.argument === "object" ? attr.key?.argument?.name : null;
          return attrName === "bind" && argName === "key";
        });

        if (!hasKey) {
          context.report({ node: node as unknown as { type: string }, messageId: "missingKey" });
        }
      },
    });
  },
};

export const architectureRules = {
  "no-giant-component": noGiantComponent,
  "no-prop-mutation": noPropMutation,
  "require-emits-declaration": requireEmitsDeclaration,
  "require-component-key": requireComponentKey,
};
