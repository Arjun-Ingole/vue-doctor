export interface EsTreeNode {
  type: string;
  [key: string]: unknown;
}

export interface VueTemplateNode extends EsTreeNode {
  name?: string;
  rawName?: string;
  startTag?: EsTreeNode;
  endTag?: EsTreeNode | null;
  children?: VueTemplateNode[];
  parent?: VueTemplateNode;
}

export interface RuleContext {
  report: (options: { node: EsTreeNode; message?: string; messageId?: string; data?: Record<string, string> }) => void;
  getSourceCode: () => {
    getText: (node: EsTreeNode) => string;
    parserServices?: {
      defineTemplateBodyVisitor?: (
        templateVisitor: Record<string, (node: EsTreeNode) => void>,
        scriptVisitor?: Record<string, (node: EsTreeNode) => void>,
      ) => Record<string, (node: EsTreeNode) => void>;
    };
    lines: string[];
  };
  sourceCode: {
    getText: (node: EsTreeNode) => string;
    parserServices?: {
      defineTemplateBodyVisitor?: (
        templateVisitor: Record<string, (node: EsTreeNode) => void>,
        scriptVisitor?: Record<string, (node: EsTreeNode) => void>,
      ) => Record<string, (node: EsTreeNode) => void>;
    };
    lines: string[];
  };
  getFilename: () => string;
  filename?: string;
  options: unknown[];
}

export type RuleVisitorFn = (node: EsTreeNode) => void;
export type RuleVisitors = Record<string, RuleVisitorFn>;

export interface RuleMeta {
  type: "problem" | "suggestion" | "layout";
  docs?: {
    description?: string;
    category?: string;
    recommended?: boolean;
  };
  messages?: Record<string, string>;
  schema?: unknown[];
}

export interface Rule {
  meta?: RuleMeta;
  create: (context: RuleContext) => RuleVisitors;
}

export interface RulePlugin {
  rules: Record<string, Rule>;
}
