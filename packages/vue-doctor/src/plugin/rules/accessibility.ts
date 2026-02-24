import type { Rule, RuleVisitors } from "../types.js";
import { getTemplateBodyVisitor } from "../helpers.js";

export const noAutofocus: Rule = {
  meta: {
    type: "problem",
    docs: { description: "Avoid autofocus in templates" },
    messages: {
      avoidAutofocus:
        "Avoid autofocus because it can disrupt keyboard and screen-reader users. Manage focus with user intent or lifecycle hooks.",
    },
  },
  create(context) {
    const defineTemplateBodyVisitor = getTemplateBodyVisitor(context);
    if (!defineTemplateBodyVisitor) return {} as RuleVisitors;

    return defineTemplateBodyVisitor({
      VAttribute(node) {
        const attribute = node as unknown as {
          directive?: boolean;
          key?: { name?: string | { name?: string } };
        };
        if (attribute.directive) return;
        const attributeName =
          typeof attribute.key?.name === "object"
            ? attribute.key?.name?.name
            : attribute.key?.name;
        if (attributeName === "autofocus") {
          context.report({ node: node as unknown as { type: string }, messageId: "avoidAutofocus" });
        }
      },
    });
  },
};

export const noPositiveTabindex: Rule = {
  meta: {
    type: "problem",
    docs: { description: "Avoid positive tabindex values" },
    messages: {
      avoidPositiveTabindex:
        "Avoid positive tabindex values. Use natural tab order or tabindex=\"0\" for custom focus targets.",
    },
  },
  create(context) {
    const defineTemplateBodyVisitor = getTemplateBodyVisitor(context);
    if (!defineTemplateBodyVisitor) return {} as RuleVisitors;

    return defineTemplateBodyVisitor({
      VAttribute(node) {
        const attribute = node as unknown as {
          directive?: boolean;
          key?: {
            name?: string | { name?: string };
            argument?: { name?: string } | null;
          };
          value?: {
            value?: string;
            expression?: { type?: string; value?: number | string };
          } | null;
        };

        const directiveName =
          typeof attribute.key?.name === "object"
            ? attribute.key?.name?.name
            : attribute.key?.name;
        const argumentName =
          typeof attribute.key?.argument === "object"
            ? attribute.key?.argument?.name
            : null;

        if (!attribute.directive && directiveName === "tabindex") {
          const rawValue = attribute.value?.value;
          const parsedValue = rawValue ? Number(rawValue) : Number.NaN;
          if (!Number.isNaN(parsedValue) && parsedValue > 0) {
            context.report({
              node: node as unknown as { type: string },
              messageId: "avoidPositiveTabindex",
            });
          }
          return;
        }

        if (attribute.directive && directiveName === "bind" && argumentName === "tabindex") {
          const boundExpression = attribute.value?.expression;
          if (boundExpression?.type === "Literal" && typeof boundExpression.value === "number" && boundExpression.value > 0) {
            context.report({
              node: node as unknown as { type: string },
              messageId: "avoidPositiveTabindex",
            });
          }
        }
      },
    });
  },
};

export const requireButtonType: Rule = {
  meta: {
    type: "problem",
    docs: { description: "Require explicit type on button elements" },
    messages: {
      requireType:
        "Buttons should declare an explicit type. Use `type=\"button\"`, `type=\"submit\"`, or `type=\"reset\"`.",
    },
  },
  create(context) {
    const defineTemplateBodyVisitor = getTemplateBodyVisitor(context);
    if (!defineTemplateBodyVisitor) return {} as RuleVisitors;

    return defineTemplateBodyVisitor({
      VElement(node) {
        const element = node as unknown as {
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

        const elementName = element.rawName ?? element.name ?? "";
        if (elementName !== "button") return;

        const attributes = element.startTag?.attributes ?? [];
        const hasTypeAttribute = attributes.some((attribute) => {
          if (attribute.directive) {
            const directiveName =
              typeof attribute.key?.name === "object"
                ? attribute.key?.name?.name
                : attribute.key?.name;
            const argumentName =
              typeof attribute.key?.argument === "object"
                ? attribute.key?.argument?.name
                : null;
            return directiveName === "bind" && argumentName === "type";
          }
          const attributeName =
            typeof attribute.key?.name === "object"
              ? attribute.key?.name?.name
              : attribute.key?.name;
          return attributeName === "type";
        });

        if (!hasTypeAttribute) {
          context.report({ node: node as unknown as { type: string }, messageId: "requireType" });
        }
      },
    });
  },
};

export const requireImgAlt: Rule = {
  meta: {
    type: "problem",
    docs: { description: "Require alt text on image elements" },
    messages: {
      requireAlt:
        "Image elements should include an alt attribute for screen readers. Use `alt=\"...\"` or `alt=\"\"` for decorative images.",
    },
  },
  create(context) {
    const defineTemplateBodyVisitor = getTemplateBodyVisitor(context);
    if (!defineTemplateBodyVisitor) return {} as RuleVisitors;

    return defineTemplateBodyVisitor({
      VElement(node) {
        const element = node as unknown as {
          name?: string;
          rawName?: string;
          startTag?: {
            attributes?: Array<{
              directive?: boolean;
              key?: { name?: { name?: string } | string };
            }>;
          };
        };
        const elementName = element.rawName ?? element.name ?? "";
        if (elementName !== "img") return;

        const attributes = element.startTag?.attributes ?? [];
        const hasAlt = attributes.some((attribute) => {
          if (attribute.directive) return false;
          const attributeName =
            typeof attribute.key?.name === "object"
              ? attribute.key?.name?.name
              : attribute.key?.name;
          return attributeName === "alt";
        });

        if (!hasAlt) {
          context.report({ node: node as unknown as { type: string }, messageId: "requireAlt" });
        }
      },
    });
  },
};

export const requireAccessibleFormControlName: Rule = {
  meta: {
    type: "problem",
    docs: { description: "Require accessible name for form controls" },
    messages: {
      requireAccessibleName:
        "Form controls should have an accessible name. Add `aria-label`, `aria-labelledby`, or an associated `<label>`.",
    },
  },
  create(context) {
    const defineTemplateBodyVisitor = getTemplateBodyVisitor(context);
    if (!defineTemplateBodyVisitor) return {} as RuleVisitors;

    return defineTemplateBodyVisitor({
      VElement(node) {
        const element = node as unknown as {
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
        const elementName = element.rawName ?? element.name ?? "";
        if (elementName !== "input" && elementName !== "textarea" && elementName !== "select") return;

        const attributes = element.startTag?.attributes ?? [];
        const hasAccessibleName = attributes.some((attribute) => {
          const keyName =
            typeof attribute.key?.name === "object"
              ? attribute.key?.name?.name
              : attribute.key?.name;
          const argumentName =
            typeof attribute.key?.argument === "object"
              ? attribute.key?.argument?.name
              : null;

          if (!attribute.directive) {
            return keyName === "aria-label" || keyName === "aria-labelledby";
          }
          return keyName === "bind" && (argumentName === "aria-label" || argumentName === "aria-labelledby");
        });

        if (!hasAccessibleName) {
          context.report({
            node: node as unknown as { type: string },
            messageId: "requireAccessibleName",
          });
        }
      },
    });
  },
};

export const noClickWithoutKeyboardHandler: Rule = {
  meta: {
    type: "problem",
    docs: { description: "Require keyboard handler with click on non-interactive elements" },
    messages: {
      requireKeyboardHandler:
        "Clickable non-interactive elements should also support keyboard interaction (keydown/keyup/keypress).",
    },
  },
  create(context) {
    const defineTemplateBodyVisitor = getTemplateBodyVisitor(context);
    if (!defineTemplateBodyVisitor) return {} as RuleVisitors;

    const interactiveElements = new Set(["button", "a", "input", "select", "textarea"]);

    return defineTemplateBodyVisitor({
      VElement(node) {
        const element = node as unknown as {
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
        const elementName = (element.rawName ?? element.name ?? "").toLowerCase();
        if (interactiveElements.has(elementName)) return;

        const attributes = element.startTag?.attributes ?? [];
        const hasClickHandler = attributes.some((attribute) => {
          if (!attribute.directive) return false;
          const keyName =
            typeof attribute.key?.name === "object"
              ? attribute.key?.name?.name
              : attribute.key?.name;
          const argumentName =
            typeof attribute.key?.argument === "object"
              ? attribute.key?.argument?.name
              : null;
          return keyName === "on" && argumentName === "click";
        });
        if (!hasClickHandler) return;

        const hasKeyboardHandler = attributes.some((attribute) => {
          if (!attribute.directive) return false;
          const keyName =
            typeof attribute.key?.name === "object"
              ? attribute.key?.name?.name
              : attribute.key?.name;
          const argumentName =
            typeof attribute.key?.argument === "object"
              ? attribute.key?.argument?.name
              : null;
          return keyName === "on" && (argumentName === "keydown" || argumentName === "keyup" || argumentName === "keypress");
        });

        if (!hasKeyboardHandler) {
          context.report({
            node: node as unknown as { type: string },
            messageId: "requireKeyboardHandler",
          });
        }
      },
    });
  },
};

export const requireMediaCaptions: Rule = {
  meta: {
    type: "problem",
    docs: { description: "Require captions/subtitles track for video elements" },
    messages: {
      requireCaptions:
        "Video elements should include a <track kind=\"captions|subtitles\"> for accessibility.",
    },
  },
  create(context) {
    const defineTemplateBodyVisitor = getTemplateBodyVisitor(context);
    if (!defineTemplateBodyVisitor) return {} as RuleVisitors;

    return defineTemplateBodyVisitor({
      VElement(node) {
        const element = node as unknown as {
          name?: string;
          rawName?: string;
          children?: Array<{
            type?: string;
            name?: string;
            rawName?: string;
            startTag?: {
              attributes?: Array<{
                directive?: boolean;
                key?: { name?: { name?: string } | string };
                value?: { value?: string } | null;
              }>;
            };
          }>;
        };
        const elementName = element.rawName ?? element.name ?? "";
        if (elementName !== "video") return;

        const hasCaptionTrack = (element.children ?? []).some((childElement) => {
          const childName = childElement.rawName ?? childElement.name ?? "";
          if (childElement.type !== "VElement" || childName !== "track") return false;
          const attributes = childElement.startTag?.attributes ?? [];
          return attributes.some((attribute) => {
            if (attribute.directive) return false;
            const attributeName =
              typeof attribute.key?.name === "object"
                ? attribute.key?.name?.name
                : attribute.key?.name;
            const attributeValue = attribute.value?.value ?? "";
            return attributeName === "kind" && (attributeValue === "captions" || attributeValue === "subtitles");
          });
        });

        if (!hasCaptionTrack) {
          context.report({ node: node as unknown as { type: string }, messageId: "requireCaptions" });
        }
      },
    });
  },
};

export const noAriaHiddenOnFocusable: Rule = {
  meta: {
    type: "problem",
    docs: { description: "Avoid aria-hidden on focusable elements" },
    messages: {
      noAriaHiddenFocusable:
        "Do not set aria-hidden=\"true\" on focusable elements because this hides focus targets from assistive technologies.",
    },
  },
  create(context) {
    const defineTemplateBodyVisitor = getTemplateBodyVisitor(context);
    if (!defineTemplateBodyVisitor) return {} as RuleVisitors;

    const inherentlyFocusable = new Set(["button", "input", "select", "textarea"]);

    return defineTemplateBodyVisitor({
      VElement(node) {
        const element = node as unknown as {
          name?: string;
          rawName?: string;
          startTag?: {
            attributes?: Array<{
              directive?: boolean;
              key?: {
                name?: { name?: string } | string;
                argument?: { name?: string } | null;
              };
              value?: { value?: string; expression?: { type?: string; value?: unknown } } | null;
            }>;
          };
        };
        const elementName = (element.rawName ?? element.name ?? "").toLowerCase();
        const attributes = element.startTag?.attributes ?? [];

        const hasAriaHiddenTrue = attributes.some((attribute) => {
          const keyName =
            typeof attribute.key?.name === "object"
              ? attribute.key?.name?.name
              : attribute.key?.name;
          const argumentName =
            typeof attribute.key?.argument === "object"
              ? attribute.key?.argument?.name
              : null;

          if (!attribute.directive) {
            return keyName === "aria-hidden" && attribute.value?.value === "true";
          }
          return keyName === "bind" && argumentName === "aria-hidden" && attribute.value?.expression?.type === "Literal" && attribute.value.expression.value === true;
        });
        if (!hasAriaHiddenTrue) return;

        const hasFocusableAttribute = attributes.some((attribute) => {
          const keyName =
            typeof attribute.key?.name === "object"
              ? attribute.key?.name?.name
              : attribute.key?.name;
          if (keyName === "href") return true;
          if (!attribute.directive && keyName === "tabindex") {
            const numericTabIndex = Number(attribute.value?.value ?? Number.NaN);
            return !Number.isNaN(numericTabIndex) && numericTabIndex >= 0;
          }
          return false;
        });

        if (inherentlyFocusable.has(elementName) || hasFocusableAttribute) {
          context.report({
            node: node as unknown as { type: string },
            messageId: "noAriaHiddenFocusable",
          });
        }
      },
    });
  },
};

export const accessibilityRules = {
  "no-autofocus": noAutofocus,
  "no-positive-tabindex": noPositiveTabindex,
  "require-button-type": requireButtonType,
  "require-img-alt": requireImgAlt,
  "require-accessible-form-control-name": requireAccessibleFormControlName,
  "no-click-without-keyboard-handler": noClickWithoutKeyboardHandler,
  "require-media-captions": requireMediaCaptions,
  "no-aria-hidden-on-focusable": noAriaHiddenOnFocusable,
};
