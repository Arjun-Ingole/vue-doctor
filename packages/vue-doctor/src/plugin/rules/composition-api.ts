import type { Rule } from "../types.js";
import {
  containsAwait,
  containsFetchCall,
  countRefAssignments,
  getBodyStatements,
  getWatchCallback,
  isCallTo,
  isSimpleExpression,
  walkAst,
} from "../helpers.js";

/**
 * Detects watch() used only to assign derived state — use computed() instead.
 * Pattern: watch(dep, (val) => { state.value = transform(val) })
 */
export const noWatchAsComputed: Rule = {
  meta: {
    type: "suggestion",
    docs: { description: "Prefer computed() over watch() for derived state" },
    messages: {
      useComputed:
        "watch() is only setting derived state. Use computed() instead: `const x = computed(() => transform(dep))`",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (!isCallTo(node, "watch")) return;

        const callback = getWatchCallback(node);
        if (!callback) return;

        const statements = getBodyStatements(callback);
        if (statements.length === 0) return;

        // All statements should be ref assignments for this to be a "watch as computed"
        const allAreAssignments = statements.every(
          (stmt) =>
            stmt.type === "ExpressionStatement" &&
            (stmt.expression as typeof stmt.expression & { type?: string })?.type === "AssignmentExpression",
        );

        if (!allAreAssignments) return;

        const refAssignCount = countRefAssignments(callback);
        if (refAssignCount === 0 || refAssignCount !== statements.length) return;

        // Make sure there are no side effects like fetch calls
        if (containsFetchCall(callback) || containsAwait(callback)) return;

        context.report({ node, messageId: "useComputed" });
      },
    };
  },
};

/**
 * Detects async watchEffect without cleanup registration.
 * Pattern: watchEffect(async () => { await fetch(...) })
 */
export const noAsyncWatchEffect: Rule = {
  meta: {
    type: "problem",
    docs: { description: "Avoid async watchEffect without cleanup" },
    messages: {
      useWatchWithCleanup:
        "Async watchEffect can cause race conditions. Use watch() with onCleanup, or use useFetch/useAsyncData instead.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (!isCallTo(node, "watchEffect")) return;

        const args = node.arguments as Array<{ type: string; async?: boolean }>;
        if (!args?.length) return;

        const callback = args[0];
        if (
          (callback.type === "ArrowFunctionExpression" ||
            callback.type === "FunctionExpression") &&
          callback.async
        ) {
          context.report({ node, messageId: "useWatchWithCleanup" });
        }
      },
    };
  },
};

/**
 * Detects reactive() used with a single primitive property.
 * Pattern: const state = reactive({ count: 0 }) where only one primitive field
 */
export const preferRefOverReactivePrimitive: Rule = {
  meta: {
    type: "suggestion",
    docs: { description: "Prefer ref() for single primitive values" },
    messages: {
      useRef:
        "reactive() with a single primitive is verbose. Use ref() instead: `const count = ref(0)`",
    },
  },
  create(context) {
    return {
      VariableDeclarator(node) {
        const init = node.init as { type: string; callee?: { type: string; name?: string }; arguments?: unknown[] } | null;
        if (!init) return;
        if (
          init.type !== "CallExpression" ||
          init.callee?.type !== "Identifier" ||
          init.callee?.name !== "reactive"
        )
          return;

        const args = init.arguments as Array<{ type: string; properties?: unknown[] }>;
        if (!args?.length) return;

        const firstArg = args[0];
        if (firstArg.type !== "ObjectExpression") return;

        const properties = firstArg.properties as Array<{
          type: string;
          value?: { type: string };
        }>;
        if (properties.length !== 1) return;

        const singleProp = properties[0];
        if (singleProp.type !== "Property") return;

        const valueType = singleProp.value?.type;
        const isPrimitive =
          valueType === "Literal" ||
          valueType === "UnaryExpression" || // e.g. -1
          valueType === "TemplateLiteral";

        if (isPrimitive) {
          context.report({ node, messageId: "useRef" });
        }
      },
    };
  },
};

/**
 * Detects side effects (ref assignments) inside computed() getter.
 * Pattern: const x = computed(() => { arr.value.push(...); return ... })
 */
export const noMutationInComputed: Rule = {
  meta: {
    type: "problem",
    docs: { description: "Avoid side effects in computed() getters" },
    messages: {
      noSideEffects:
        "computed() getter should be pure. Move mutations to methods, watch(), or event handlers.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (!isCallTo(node, "computed")) return;

        const args = node.arguments as Array<{ type: string }>;
        if (!args?.length) return;

        const firstArg = args[0];
        if (
          firstArg.type !== "ArrowFunctionExpression" &&
          firstArg.type !== "FunctionExpression"
        )
          return;

        // Check for .push, .pop, .splice, .shift, .unshift, or .value = assignment
        let hasSideEffect = false;
        walkAst(firstArg, (child) => {
          if (hasSideEffect) return;

          // Check for array mutation methods
          if (
            child.type === "CallExpression" &&
            (child.callee as { type: string; property?: { name?: string } })?.type === "MemberExpression"
          ) {
            const MUTATION_METHODS = new Set(["push", "pop", "splice", "shift", "unshift", "sort", "reverse", "fill"]);
            const prop = (child.callee as { property?: { name?: string } }).property;
            if (prop?.name && MUTATION_METHODS.has(prop.name)) {
              hasSideEffect = true;
            }
          }

          // Check for .value = assignment
          if (
            child.type === "AssignmentExpression" &&
            (child.left as { type: string; property?: { name?: string } })?.type === "MemberExpression"
          ) {
            const left = child.left as { property?: { name?: string } };
            if (left.property?.name === "value") {
              hasSideEffect = true;
            }
          }
        });

        if (hasSideEffect) {
          context.report({ node, messageId: "noSideEffects" });
        }
      },
    };
  },
};

/**
 * Detects watch() with immediate: true used to fetch data — use useFetch instead.
 */
export const noWatchImmediateFetch: Rule = {
  meta: {
    type: "suggestion",
    docs: { description: "Prefer useFetch/useAsyncData over watch with immediate fetch" },
    messages: {
      useDataFetcher:
        "watch() with immediate fetch is imperative. Use useFetch(), useAsyncData(), or @tanstack/vue-query instead.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (!isCallTo(node, "watch")) return;

        const args = node.arguments as Array<{ type: string; properties?: unknown[] }>;
        if (!args || args.length < 2) return;

        const callback = args[1];
        if (
          callback.type !== "ArrowFunctionExpression" &&
          callback.type !== "FunctionExpression"
        )
          return;

        // Check for options argument with immediate: true
        const optionsArg = args[2] as { type: string; properties?: Array<{ key?: { name?: string }; value?: { type: string; value?: unknown } }> } | undefined;
        const hasImmediate =
          optionsArg?.type === "ObjectExpression" &&
          optionsArg.properties?.some(
            (prop) =>
              prop.key?.name === "immediate" &&
              prop.value?.type === "Literal" &&
              prop.value.value === true,
          );

        if (!hasImmediate) return;

        if (containsFetchCall(callback as { type: string })) {
          context.report({ node, messageId: "useDataFetcher" });
        }
      },
    };
  },
};

/**
 * Detects destructuring of reactive() object which loses reactivity.
 * Pattern: const { count } = reactive({ count: 0 })
 */
export const noReactiveDestructure: Rule = {
  meta: {
    type: "problem",
    docs: { description: "Destructuring reactive() loses reactivity" },
    messages: {
      useToRefs:
        "Destructuring reactive() breaks reactivity. Use `const { count } = toRefs(state)` or access via `state.count`.",
    },
  },
  create(context) {
    return {
      VariableDeclarator(node) {
        const id = node.id as { type: string };
        if (id.type !== "ObjectPattern") return;

        const init = node.init as { type: string; callee?: { type: string; name?: string } } | null;
        if (!init) return;
        if (
          init.type !== "CallExpression" ||
          init.callee?.type !== "Identifier" ||
          init.callee?.name !== "reactive"
        )
          return;

        context.report({ node, messageId: "useToRefs" });
      },
    };
  },
};

/**
 * Detects creating new refs inside computed() which causes memory leaks.
 */
export const noRefInComputed: Rule = {
  meta: {
    type: "problem",
    docs: { description: "Avoid creating new refs inside computed()" },
    messages: {
      noNewRef:
        "Creating ref() inside computed() creates a new ref every time the computed runs. Move it outside.",
    },
  },
  create(context) {
    let insideComputed = false;

    return {
      "CallExpression[callee.name='computed']"() {
        insideComputed = true;
      },
      "CallExpression[callee.name='computed']:exit"() {
        insideComputed = false;
      },
      CallExpression(node) {
        if (!insideComputed) return;
        if (isCallTo(node, "ref") || isCallTo(node, "reactive")) {
          context.report({ node, messageId: "noNewRef" });
        }
      },
    };
  },
};

export const compositionApiRules = {
  "no-watch-as-computed": noWatchAsComputed,
  "no-async-watcheffect": noAsyncWatchEffect,
  "prefer-ref-over-reactive-primitive": preferRefOverReactivePrimitive,
  "no-mutation-in-computed": noMutationInComputed,
  "no-watch-immediate-fetch": noWatchImmediateFetch,
  "no-reactive-destructure": noReactiveDestructure,
  "no-ref-in-computed": noRefInComputed,
};
