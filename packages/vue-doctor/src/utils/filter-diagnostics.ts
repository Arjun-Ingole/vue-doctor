import type { Diagnostic, VueDoctorConfig } from "../types.js";
import { matchGlobPattern } from "./match-glob-pattern.js";

const isRuleIgnored = (
  diagnostic: Diagnostic,
  ignoredRules: string[],
): boolean => {
  const fullRule = `${diagnostic.plugin}/${diagnostic.rule}`;
  return ignoredRules.some(
    (ignoredRule) => ignoredRule === fullRule || ignoredRule === diagnostic.rule,
  );
};

const isFileIgnored = (
  diagnostic: Diagnostic,
  ignoredFiles: string[],
): boolean =>
  ignoredFiles.some((pattern) => matchGlobPattern(diagnostic.filePath, pattern));

export const filterIgnoredDiagnostics = (
  diagnostics: Diagnostic[],
  config: VueDoctorConfig,
): Diagnostic[] => {
  const ignoredRules = config.ignore?.rules ?? [];
  const ignoredFiles = config.ignore?.files ?? [];

  if (ignoredRules.length === 0 && ignoredFiles.length === 0) {
    return diagnostics;
  }

  return diagnostics.filter(
    (diagnostic) =>
      !isRuleIgnored(diagnostic, ignoredRules) && !isFileIgnored(diagnostic, ignoredFiles),
  );
};
