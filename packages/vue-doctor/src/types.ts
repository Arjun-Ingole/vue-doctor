export type Framework = "nuxt" | "vite" | "quasar" | "vue-cli" | "unknown";

export interface ProjectInfo {
  rootDirectory: string;
  projectName: string;
  vueVersion: string | null;
  framework: Framework;
  hasTypeScript: boolean;
  hasPinia: boolean;
  hasVueRouter: boolean;
  sourceFileCount: number;
}

export interface Diagnostic {
  filePath: string;
  plugin: string;
  rule: string;
  severity: "error" | "warning";
  message: string;
  help: string;
  line: number;
  column: number;
  category: string;
  weight?: number;
}

export interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  workspaces?: string[] | { packages: string[] };
}

export interface DependencyInfo {
  vueVersion: string | null;
  framework: Framework;
  hasPinia: boolean;
  hasVueRouter: boolean;
}

export interface KnipIssue {
  filePath: string;
  symbol: string;
  type: string;
}

export interface KnipIssueRecords {
  [workspace: string]: {
    [filePath: string]: KnipIssue;
  };
}

export interface ScoreResult {
  score: number;
  label: string;
}

export interface ScanOptions {
  lint?: boolean;
  deadCode?: boolean;
  verbose?: boolean;
  scoreOnly?: boolean;
  includePaths?: string[];
}

export interface DiffInfo {
  currentBranch: string;
  baseBranch: string;
  changedFiles: string[];
}

export interface LoggerCaptureState {
  isEnabled: boolean;
  lines: string[];
}

export interface HandleErrorOptions {
  shouldExit: boolean;
}

export interface WorkspacePackage {
  name: string;
  directory: string;
}

export interface KnipResults {
  issues: {
    files: Set<string>;
    dependencies: KnipIssueRecords;
    devDependencies: KnipIssueRecords;
    unlisted: KnipIssueRecords;
    exports: KnipIssueRecords;
    types: KnipIssueRecords;
    duplicates: KnipIssueRecords;
  };
  counters: Record<string, number>;
}

export interface VueDoctorIgnoreConfig {
  rules?: string[];
  files?: string[];
}

export interface VueDoctorConfig {
  ignore?: VueDoctorIgnoreConfig;
  lint?: boolean;
  deadCode?: boolean;
  verbose?: boolean;
  diff?: boolean | string;
}

export interface PromptMultiselectChoiceState {
  selected?: boolean;
  disabled?: boolean;
}

export interface PromptMultiselectContext {
  maxChoices?: number;
  cursor: number;
  value: PromptMultiselectChoiceState[];
  bell: () => void;
  render: () => void;
}

export interface ClipboardCommand {
  command: string;
  args: string[];
}

export interface CleanedDiagnostic {
  message: string;
  help: string;
}
