import type { Rule, RuleVisitors } from "../types.js";
import { NUXT_FETCH_ALTERNATIVES } from "../constants.js";

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
    return {
      CallExpression(node) {
        const callee = node.callee as { type: string; name?: string };

        if (callee.type === "Identifier" && callee.name === "defineComponent") {
          return;
        }

        if (callee.type === "Identifier" && callee.name && NUXT_FETCH_ALTERNATIVES.has(callee.name)) return;

        if (callee.type === "Identifier" && callee.name === "fetch") {
          const parent = (node as unknown as { parent?: { type?: string } }).parent;
          if (parent?.type === "AwaitExpression") {
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

    const isWithinClientGuard = (startNode: unknown): boolean => {
      let currentNode = startNode as { parent?: { type?: string; test?: unknown } } | undefined;
      while (currentNode?.parent) {
        const parentNode = currentNode.parent as {
          type?: string;
          test?: {
            type?: string;
            object?: { type?: string; name?: string; object?: { name?: string }; property?: { name?: string } };
            property?: { type?: string; name?: string };
            left?: unknown;
            right?: unknown;
            operator?: string;
          };
        };
        if (parentNode.type === "IfStatement" && parentNode.test) {
          const testNode = parentNode.test;
          if (
            testNode.type === "MemberExpression" &&
            testNode.object?.type === "Identifier" &&
            testNode.object.name === "process" &&
            testNode.property?.name === "client"
          ) {
            return true;
          }
          if (
            testNode.type === "MemberExpression" &&
            testNode.object?.type === "MetaProperty" &&
            testNode.object.object?.name === "import" &&
            testNode.object.property?.name === "meta" &&
            testNode.property?.name === "client"
          ) {
            return true;
          }
          const testSource = context.getSourceCode().getText(parentNode.test as { type: string });
          if (testSource.includes("import.meta.client") || testSource.includes("process.client")) {
            return true;
          }
        }
        currentNode = parentNode as { parent?: { type?: string; test?: unknown } };
      }
      return false;
    };

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

        if (isWithinClientGuard(node)) return;

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

/**
 * Detects Nuxt page files without definePageMeta usage.
 */
export const requireDefinePageMeta: Rule = {
  meta: {
    type: "suggestion",
    docs: { description: "Nuxt pages should define page metadata" },
    messages: {
      addPageMeta:
        "This page is missing definePageMeta(). Add it to define layout, middleware, and route behavior explicitly.",
    },
  },
  create(context) {
    const filename = context.getFilename?.() ?? context.filename ?? "";
    const isPageFile = filename.includes("/pages/") || filename.includes("\\pages\\");
    if (!isPageFile) return {} as RuleVisitors;

    let hasDefinePageMeta = false;
    return {
      CallExpression(node) {
        const callee = node.callee as { type: string; name?: string };
        if (callee.type === "Identifier" && callee.name === "definePageMeta") {
          hasDefinePageMeta = true;
        }
      },
      "Program:exit"(node) {
        if (!hasDefinePageMeta) {
          context.report({ node, messageId: "addPageMeta" });
        }
      },
    };
  },
};

/**
 * Detects server-only imports in client-rendered Nuxt files.
 */
export const noServerOnlyImportInClient: Rule = {
  meta: {
    type: "problem",
    docs: { description: "Avoid server-only imports in client-rendered files" },
    messages: {
      noServerImport:
        "Server-only module imported in a client-rendered file. Move this code to server routes/plugins or use runtime-safe alternatives.",
    },
  },
  create(context) {
    const filename = context.getFilename?.() ?? context.filename ?? "";
    const isServerFile =
      filename.includes("/server/") ||
      filename.includes("\\server\\") ||
      filename.endsWith(".server.ts") ||
      filename.endsWith(".server.js");
    if (isServerFile) return {} as RuleVisitors;

    const serverOnlyImports = new Set(["h3", "nitropack", "#internal/nitro", "node:fs", "node:child_process"]);

    return {
      ImportDeclaration(node) {
        const source = node.source as { value?: string };
        const importSource = source.value ?? "";
        if (serverOnlyImports.has(importSource)) {
          context.report({ node, messageId: "noServerImport" });
        }
      },
    };
  },
};

/**
 * Detects client-only composables used in Nuxt server routes.
 */
export const noClientComposableInServerRoute: Rule = {
  meta: {
    type: "problem",
    docs: { description: "Avoid client-only composables in server routes" },
    messages: {
      noClientComposable:
        "Client-only composable used in a server route. Use server-safe utilities in /server code.",
    },
  },
  create(context) {
    const filename = context.getFilename?.() ?? context.filename ?? "";
    const isServerRoute =
      filename.includes("/server/api/") ||
      filename.includes("/server/routes/") ||
      filename.includes("\\server\\api\\") ||
      filename.includes("\\server\\routes\\");
    if (!isServerRoute) return {} as RuleVisitors;

    const clientComposableNames = new Set(["useRoute", "useRouter", "onMounted", "useHead", "useSeoMeta"]);
    return {
      CallExpression(node) {
        const callee = node.callee as { type?: string; name?: string };
        if (callee.type === "Identifier" && callee.name && clientComposableNames.has(callee.name)) {
          context.report({ node, messageId: "noClientComposable" });
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
  "require-define-page-meta": requireDefinePageMeta,
  "no-server-only-import-in-client": noServerOnlyImportInClient,
  "no-client-composable-in-server-route": noClientComposableInServerRoute,
};
