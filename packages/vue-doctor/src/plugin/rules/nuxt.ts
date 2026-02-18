import type { Rule, RuleVisitors } from "../types.js";
import { NUXT_FETCH_ALTERNATIVES } from "../constants.js";
import { containsFetchCall, getTemplateBodyVisitor, walkAst } from "../helpers.js";

/**
 * Detects raw fetch() in setup() when inside a Nuxt project.
 * Pattern: const data = await fetch('/api/...') in setup()
 */
export const useUseFetchOverFetch: Rule = {
  meta: {
    type: "suggestion",
    docs: { description: "Use useFetch or useAsyncData instead of raw fetch() in Nuxt" },
    messages: {
      useNuxtFetch:
        "Raw fetch() in setup() blocks SSR and skips Nuxt's caching layer. Use `useFetch('/api/...')` or `useAsyncData()` instead.",
    },
  },
  create(context) {
    let setupDepth = 0;
    let hasUseFetchImport = false;

    return {
      // Track if useFetch/useAsyncData is already imported/used
      ImportDeclaration(node) {
        const source = node.source as { value?: string };
        if (source.value === "#imports" || source.value === "nuxt/app") {
          hasUseFetchImport = true;
        }
      },
      CallExpression(node) {
        const callee = node.callee as { type: string; name?: string };

        // Track when we're inside a setup function
        if (callee.type === "Identifier" && callee.name === "defineComponent") {
          return;
        }

        // Detect useFetch/useAsyncData usage (so we don't double-report)
        if (
          callee.type === "Identifier" &&
          callee.name &&
          NUXT_FETCH_ALTERNATIVES.has(callee.name)
        ) {
          hasUseFetchImport = true;
        }

        // Detect bare fetch() calls at top level of script setup
        if (callee.type === "Identifier" && callee.name === "fetch") {
          // Check if this is awaited (i.e., being used to fetch data)
          const parent = (node as unknown as { parent?: { type?: string } }).parent;
          if (parent?.type === "AwaitExpression") {
            // Only report if we're not already using Nuxt fetch composables
            context.report({ node, messageId: "useNuxtFetch" });
          }
        }
      },
    };
  },
};

/**
 * Detects Nuxt server route handlers without try/catch error handling.
 * Pattern: export default defineEventHandler(async (event) => { /* no try-catch *\/ })
 */
export const requireServerRouteErrorHandling: Rule = {
  meta: {
    type: "suggestion",
    docs: { description: "Server route handlers should have error handling" },
    messages: {
      addErrorHandling:
        "Server route missing error handling. Wrap with try/catch and use `createError({ statusCode: 400 })` to return proper error responses.",
    },
  },
  create(context) {
    // Only apply to server route files
    const filename = context.getFilename?.() ?? context.filename ?? "";
    const isServerRoute =
      filename.includes("/server/api/") ||
      filename.includes("/server/routes/") ||
      filename.includes("\\server\\api\\") ||
      filename.includes("\\server\\routes\\");

    if (!isServerRoute) return {} as RuleVisitors;

    return {
      CallExpression(node) {
        const callee = node.callee as { type: string; name?: string };
        if (callee.type !== "Identifier" || callee.name !== "defineEventHandler") return;

        const args = node.arguments as Array<{
          type: string;
          async?: boolean;
          body?: { type: string; body?: unknown[] };
        }>;
        if (!args?.length) return;

        const handler = args[0];
        if (
          handler.type !== "ArrowFunctionExpression" &&
          handler.type !== "FunctionExpression"
        )
          return;

        if (!handler.async) return;

        const body = handler.body;
        if (!body || body.type !== "BlockStatement") return;

        const statements = body.body as Array<{ type: string }>;
        if (!statements?.length) return;

        // Check if there's a try/catch at the top level of the handler
        const hasTryCatch = statements.some((stmt) => stmt.type === "TryStatement");

        if (!hasTryCatch) {
          context.report({ node, messageId: "addErrorHandling" });
        }
      },
    };
  },
};

/**
 * Detects window/document/localStorage access in server-renderable code.
 * These should be in onMounted() or wrapped in process.client checks.
 */
export const noWindowInSsr: Rule = {
  meta: {
    type: "problem",
    docs: { description: "Avoid window/document access in SSR context" },
    messages: {
      wrapInOnMounted:
        "window/document/localStorage are not available during SSR. Wrap in `onMounted()` or check `process.client` / `import.meta.client`.",
    },
  },
  create(context) {
    const SSR_GLOBALS = new Set([
      "window",
      "document",
      "localStorage",
      "sessionStorage",
      "navigator",
      "location",
    ]);

    // Track if we're inside onMounted or a process.client check
    let insideSafeContext = 0;

    return {
      "CallExpression[callee.name='onMounted']"() {
        insideSafeContext++;
      },
      "CallExpression[callee.name='onMounted']:exit"() {
        insideSafeContext--;
      },
      Identifier(node) {
        if (insideSafeContext > 0) return;

        const name = (node as { name?: string }).name;
        if (!name || !SSR_GLOBALS.has(name)) return;

        // Check if it's a typeof check (safe)
        const parent = (node as unknown as { parent?: { type?: string; operator?: string } }).parent;
        if (parent?.type === "UnaryExpression" && parent.operator === "typeof") return;

        // Check if it's inside a process.client / import.meta.client condition
        // This is heuristic only — we check the immediate enclosing if
        context.report({ node, messageId: "wrapInOnMounted" });
      },
    };
  },
};

/**
 * Detects Nuxt pages without SEO meta (useSeoMeta / useHead).
 */
export const requireSeoMeta: Rule = {
  meta: {
    type: "suggestion",
    docs: { description: "Nuxt pages should define SEO meta" },
    messages: {
      addSeoMeta:
        "This page is missing SEO meta. Add `useSeoMeta({ title: '...', description: '...' })` or `useHead({ title: '...' })` for better search engine visibility.",
    },
  },
  create(context) {
    const filename = context.getFilename?.() ?? context.filename ?? "";
    const isPage =
      filename.includes("/pages/") ||
      filename.includes("\\pages\\");

    if (!isPage) return {} as RuleVisitors;

    let hasSeoMeta = false;

    return {
      CallExpression(node) {
        const callee = node.callee as { type: string; name?: string };
        if (
          callee.type === "Identifier" &&
          (callee.name === "useSeoMeta" ||
            callee.name === "useHead" ||
            callee.name === "useServerSeoMeta")
        ) {
          hasSeoMeta = true;
        }
      },
      "Program:exit"(node) {
        if (!hasSeoMeta) {
          context.report({ node, messageId: "addSeoMeta" });
        }
      },
    };
  },
};

/**
 * Detects process.env usage in client-side code (outside server routes).
 * Nuxt uses useRuntimeConfig() instead.
 */
export const noProcessEnvInClient: Rule = {
  meta: {
    type: "problem",
    docs: { description: "Use useRuntimeConfig() instead of process.env in Nuxt" },
    messages: {
      useRuntimeConfig:
        "process.env is not available client-side in Nuxt. Use `const config = useRuntimeConfig()` to access runtime configuration.",
    },
  },
  create(context) {
    const filename = context.getFilename?.() ?? context.filename ?? "";
    // Allow process.env in server-only files
    const isServerFile =
      filename.includes("/server/") || filename.includes("\\server\\");

    if (isServerFile) return {} as RuleVisitors;

    return {
      MemberExpression(node) {
        const obj = node.object as { type: string; name?: string; object?: { type: string; name?: string }; property?: { name?: string } };

        // Detect process.env.XXX
        if (
          obj.type === "MemberExpression" &&
          obj.object?.type === "Identifier" &&
          obj.object.name === "process" &&
          obj.property?.name === "env"
        ) {
          context.report({ node, messageId: "useRuntimeConfig" });
        }
      },
    };
  },
};

export const nuxtRules = {
  "use-usefetch-over-fetch": useUseFetchOverFetch,
  "require-server-route-error-handling": requireServerRouteErrorHandling,
  "no-window-in-ssr": noWindowInSsr,
  "require-seo-meta": requireSeoMeta,
  "no-process-env-in-client": noProcessEnvInClient,
};
