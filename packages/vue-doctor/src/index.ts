import path from "node:path";
import { performance } from "node:perf_hooks";
import { SOURCE_FILE_PATTERN } from "./constants.js";
import type { Diagnostic, DiffInfo, ProjectInfo, ScoreResult, VueDoctorConfig } from "./types.js";
import { calculateScore } from "./utils/calculate-score.js";
import { checkReducedMotion } from "./utils/check-reduced-motion.js";
import { discoverProject } from "./utils/discover-project.js";
import { filterIgnoredDiagnostics } from "./utils/filter-diagnostics.js";
import { filterSourceFiles, getDiffInfo } from "./utils/get-diff-files.js";
import { loadConfig } from "./utils/load-config.js";
import { runEslint } from "./utils/run-eslint.js";
import { runKnip } from "./utils/run-knip.js";

export type { Diagnostic, DiffInfo, ProjectInfo, ScoreResult, VueDoctorConfig };
export { getDiffInfo, filterSourceFiles } from "./utils/get-diff-files.js";

export interface DiagnoseOptions {
  lint?: boolean;
  deadCode?: boolean;
  includePaths?: string[];
}

export interface DiagnoseResult {
  diagnostics: Diagnostic[];
  score: ScoreResult | null;
  project: ProjectInfo;
  elapsedMilliseconds: number;
}

export const diagnose = async (
  directory: string,
  options: DiagnoseOptions = {},
): Promise<DiagnoseResult> => {
  const { includePaths = [] } = options;
  const isDiffMode = includePaths.length > 0;

  const startTime = performance.now();
  const resolvedDirectory = path.resolve(directory);
  const projectInfo = discoverProject(resolvedDirectory);
  const userConfig = loadConfig(resolvedDirectory);

  const effectiveLint = options.lint ?? userConfig?.lint ?? true;
  const effectiveDeadCode = options.deadCode ?? userConfig?.deadCode ?? true;

  if (!projectInfo.vueVersion) {
    throw new Error("No Vue dependency found in package.json");
  }

  const vueIncludePaths = isDiffMode
    ? includePaths.filter((filePath) => SOURCE_FILE_PATTERN.test(filePath))
    : undefined;

  const lintPromise = effectiveLint
    ? runEslint(resolvedDirectory, projectInfo.framework, projectInfo.hasTypeScript, vueIncludePaths)
        .catch((error: unknown) => {
          console.error("Lint failed:", error);
          return [] as Diagnostic[];
        })
    : Promise.resolve([] as Diagnostic[]);

  const deadCodePromise =
    effectiveDeadCode && !isDiffMode
      ? runKnip(resolvedDirectory).catch((error: unknown) => {
          console.error("Dead code analysis failed:", error);
          return [] as Diagnostic[];
        })
      : Promise.resolve([] as Diagnostic[]);

  const [lintDiagnostics, deadCodeDiagnostics] = await Promise.all([lintPromise, deadCodePromise]);
  const allDiagnostics = [
    ...lintDiagnostics,
    ...deadCodeDiagnostics,
    ...(isDiffMode ? [] : checkReducedMotion(resolvedDirectory)),
  ];
  const diagnostics = userConfig
    ? filterIgnoredDiagnostics(allDiagnostics, userConfig)
    : allDiagnostics;

  const elapsedMilliseconds = performance.now() - startTime;
  const score = await calculateScore(diagnostics);

  return {
    diagnostics,
    score,
    project: projectInfo,
    elapsedMilliseconds,
  };
};
