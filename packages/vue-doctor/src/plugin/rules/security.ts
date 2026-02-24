import type { Rule, RuleVisitors } from "../types.js";
import { SECRET_PATTERNS } from "../constants.js";
import { getTemplateBodyVisitor } from "../helpers.js";

/**
 * Detects usage of v-html directive which can cause XSS vulnerabilities.
 */
export const noVHtml: Rule = {
  meta: {
    type: "problem",
    docs: { description: "Avoid v-html to prevent XSS attacks" },
    messages: {
      noVHtml:
        "v-html renders raw HTML and is vulnerable to XSS. Use v-text, {{ }} interpolation, or sanitize with DOMPurify first.",
    },
  },
  create(context) {
    const defineTemplateBodyVisitor = getTemplateBodyVisitor(context);
    if (!defineTemplateBodyVisitor) return {} as RuleVisitors;

    return defineTemplateBodyVisitor({
      VAttribute(node) {
        const attr = node as unknown as {
          directive?: boolean;
          key?: { name?: { name?: string } | string };
        };

        if (!attr.directive) return;

        const name =
          typeof attr.key?.name === "object" ? attr.key?.name?.name : attr.key?.name;
        if (name === "html") {
          context.report({ node: node as unknown as { type: string }, messageId: "noVHtml" });
        }
      },
    });
  },
};

/**
 * Detects eval() and new Function() usage which are security risks.
 */
export const noEval: Rule = {
  meta: {
    type: "problem",
    docs: { description: "Avoid eval() and new Function()" },
    messages: {
      noEval:
        "eval() and new Function() execute arbitrary code and are security risks. Refactor to avoid dynamic code execution.",
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        const callee = node.callee as { type: string; name?: string };
        if (callee.type === "Identifier" && callee.name === "eval") {
          context.report({ node, messageId: "noEval" });
        }
      },
      NewExpression(node) {
        const callee = node.callee as { type: string; name?: string };
        if (callee.type === "Identifier" && callee.name === "Function") {
          context.report({ node, messageId: "noEval" });
        }
      },
    };
  },
};

/**
 * Detects hardcoded secrets and API keys in client-side code.
 */
export const noSecretsInClient: Rule = {
  meta: {
    type: "problem",
    docs: { description: "Avoid hardcoded secrets in client-side code" },
    messages: {
      noSecret:
        "Possible secret or API key detected. Move to server-side environment variables. Only `VITE_*` / `NUXT_PUBLIC_*` vars should be in client code, and should never contain secrets.",
    },
  },
  create(context) {
    return {
      VariableDeclarator(node) {
        const init = node.init as { type: string; value?: unknown } | null;

        if (!init || init.type !== "Literal" || typeof init.value !== "string") return;
        if (init.value.length < 12) return;

        const code = context.getSourceCode().getText(node);

        for (const pattern of SECRET_PATTERNS) {
          if (pattern.test(code)) {
            context.report({ node, messageId: "noSecret" });
            return;
          }
        }
      },
      Property(node) {
        const key = node.key as { type: string; name?: string };
        const value = node.value as { type: string; value?: unknown };

        if (!key || key.type !== "Identifier") return;
        if (!value || value.type !== "Literal" || typeof value.value !== "string") return;
        if (value.value.length < 12) return;

        const code = context.getSourceCode().getText(node);

        for (const pattern of SECRET_PATTERNS) {
          if (pattern.test(code)) {
            context.report({ node, messageId: "noSecret" });
            return;
          }
        }
      },
    };
  },
};

export const securityRules = {
  "no-v-html": noVHtml,
  "no-eval": noEval,
  "no-secrets-in-client": noSecretsInClient,
};
