import { WATCH_FUNCTIONS } from "./constants.js";
import type { EsTreeNode, RuleContext } from "./types.js";

// Walk the AST tree, calling visitor on each node
export const walkAst = (node: EsTreeNode, visitor: (child: EsTreeNode) => void): void => {
  if (!node || typeof node !== "object") return;
  visitor(node);
  for (const key of Object.keys(node)) {
    if (key === "parent") continue;
    const child = node[key] as unknown;
    if (Array.isArray(child)) {
      for (const item of child) {
        if (item && typeof item === "object" && (item as EsTreeNode).type) {
          walkAst(item as EsTreeNode, visitor);
        }
      }
    } else if (child && typeof child === "object" && (child as EsTreeNode).type) {
      walkAst(child as EsTreeNode, visitor);
    }
  }
};

// Check if a CallExpression is a specific function call
export const isCallTo = (node: EsTreeNode, name: string | Set<string>): boolean =>
  node.type === "CallExpression" &&
  (node.callee as EsTreeNode)?.type === "Identifier" &&
  (typeof name === "string"
    ? (node.callee as EsTreeNode & { name: string }).name === name
    : (name as Set<string>).has((node.callee as EsTreeNode & { name: string }).name));

// Check if a CallExpression calls a method on an object: obj.method()
export const isMethodCall = (
  node: EsTreeNode,
  objectName: string,
  methodName: string,
): boolean => {
  if (node.type !== "CallExpression") return false;
  const callee = node.callee as EsTreeNode;
  if (callee.type !== "MemberExpression") return false;
  const obj = callee.object as EsTreeNode & { name?: string };
  const prop = callee.property as EsTreeNode & { name?: string };
  return obj.name === objectName && prop.name === methodName;
};

// Get the callback (first argument) from a watch/watchEffect call
export const getWatchCallback = (node: EsTreeNode): EsTreeNode | null => {
  const args = node.arguments as EsTreeNode[] | undefined;
  if (!args?.length) return null;
  const firstArg = args[0];
  // watchEffect: first arg is the callback
  if (isCallTo(node, "watchEffect")) {
    if (firstArg.type === "ArrowFunctionExpression" || firstArg.type === "FunctionExpression") {
      return firstArg;
    }
  }
  // watch: second arg is the callback
  if (isCallTo(node, "watch") && args.length >= 2) {
    const secondArg = args[1];
    if (
      secondArg.type === "ArrowFunctionExpression" ||
      secondArg.type === "FunctionExpression"
    ) {
      return secondArg;
    }
  }
  return null;
};

// Get statements from a function body
export const getBodyStatements = (callback: EsTreeNode): EsTreeNode[] => {
  const body = callback.body as EsTreeNode | undefined;
  if (body?.type === "BlockStatement") {
    return (body.body as EsTreeNode[]) ?? [];
  }
  return body ? [body] : [];
};

// Check if a node contains an await expression
export const containsAwait = (node: EsTreeNode): boolean => {
  let found = false;
  walkAst(node, (child) => {
    if (child.type === "AwaitExpression") found = true;
  });
  return found;
};

// Check if a node contains a fetch() or axios() call
export const containsFetchCall = (node: EsTreeNode): boolean => {
  const FETCH_NAMES = new Set(["fetch", "axios", "got", "ky", "request"]);
  let found = false;
  walkAst(node, (child) => {
    if (found || child.type !== "CallExpression") return;
    const callee = child.callee as EsTreeNode & { name?: string; object?: EsTreeNode & { name?: string }; property?: EsTreeNode & { name?: string } };
    if (callee.type === "Identifier" && callee.name && FETCH_NAMES.has(callee.name)) {
      found = true;
    }
    if (
      callee.type === "MemberExpression" &&
      callee.object?.name &&
      FETCH_NAMES.has(callee.object.name)
    ) {
      found = true;
    }
  });
  return found;
};

// Check if the node contains any .value assignment (ref mutation)
export const containsRefAssignment = (node: EsTreeNode): boolean => {
  let found = false;
  walkAst(node, (child) => {
    if (found) return;
    if (
      child.type === "AssignmentExpression" &&
      (child.left as EsTreeNode)?.type === "MemberExpression"
    ) {
      const left = child.left as EsTreeNode & {
        property?: EsTreeNode & { name?: string };
      };
      if (left.property?.name === "value") {
        found = true;
      }
    }
  });
  return found;
};

// Count ref assignments in a node
export const countRefAssignments = (node: EsTreeNode): number => {
  let count = 0;
  walkAst(node, (child) => {
    if (
      child.type === "AssignmentExpression" &&
      (child.left as EsTreeNode)?.type === "MemberExpression"
    ) {
      const left = child.left as EsTreeNode & {
        property?: EsTreeNode & { name?: string };
      };
      if (left.property?.name === "value") {
        count++;
      }
    }
  });
  return count;
};

// Get the defineTemplateBodyVisitor from context (handles both ESLint 8 & 9)
export const getTemplateBodyVisitor = (context: RuleContext) => {
  const parserServices =
    context.sourceCode?.parserServices ?? context.getSourceCode?.()?.parserServices;
  return parserServices?.defineTemplateBodyVisitor?.bind(parserServices);
};

// Check if a Vue template directive exists on a node
export const hasDirectiveOnNode = (
  node: EsTreeNode,
  directiveName: string,
): boolean => {
  const startTag = (node as EsTreeNode & { startTag?: EsTreeNode }).startTag;
  if (!startTag) return false;
  const attributes = (startTag as EsTreeNode & { attributes?: EsTreeNode[] }).attributes ?? [];
  return attributes.some((attr) => {
    if (attr.type !== "VAttribute" || !(attr as EsTreeNode & { directive?: boolean }).directive) {
      return false;
    }
    const key = (attr as EsTreeNode & { key?: EsTreeNode & { name?: EsTreeNode & { name?: string } } }).key;
    return key?.name?.name === directiveName;
  });
};

// Count chained array method calls in an expression (for template performance checks)
export const countChainedArrayMethods = (
  node: EsTreeNode,
  methods: Set<string>,
): number => {
  let count = 0;
  let current = node;
  while (
    current.type === "CallExpression" &&
    (current.callee as EsTreeNode)?.type === "MemberExpression"
  ) {
    const callee = current.callee as EsTreeNode & {
      property?: EsTreeNode & { name?: string };
      object?: EsTreeNode;
    };
    if (callee.property?.name && methods.has(callee.property.name)) {
      count++;
    }
    current = callee.object as EsTreeNode;
    if (!current) break;
  }
  return count;
};

// Check if a node is inside a function named "setup" or a <script setup> context
export const isInSetupContext = (node: EsTreeNode): boolean => {
  let parent = (node as EsTreeNode & { parent?: EsTreeNode }).parent;
  while (parent) {
    if (
      parent.type === "FunctionDeclaration" ||
      parent.type === "FunctionExpression" ||
      parent.type === "ArrowFunctionExpression"
    ) {
      const fnParent = parent as EsTreeNode & {
        parent?: EsTreeNode & { key?: EsTreeNode & { name?: string } };
      };
      if (fnParent.parent?.key?.name === "setup") return true;
    }
    parent = (parent as EsTreeNode & { parent?: EsTreeNode }).parent;
  }
  return false;
};

export const isSimpleExpression = (node: EsTreeNode | null): boolean => {
  if (!node) return false;
  switch (node.type) {
    case "Identifier":
    case "Literal":
    case "TemplateLiteral":
      return true;
    case "BinaryExpression":
      return (
        isSimpleExpression(node.left as EsTreeNode) &&
        isSimpleExpression(node.right as EsTreeNode)
      );
    case "UnaryExpression":
      return isSimpleExpression(node.argument as EsTreeNode);
    case "MemberExpression":
      return !(node.computed as boolean);
    case "ConditionalExpression":
      return (
        isSimpleExpression(node.test as EsTreeNode) &&
        isSimpleExpression(node.consequent as EsTreeNode) &&
        isSimpleExpression(node.alternate as EsTreeNode)
      );
    default:
      return false;
  }
};
