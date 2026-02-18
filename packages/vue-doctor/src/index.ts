import { performance } from "node:perf_hooks";
import { discoverProject } from "./utils/discover-project.js";
import { filterIgnoredDiagnostics } from "./utils/filter-diagnostics.js";
import { loadConfig } from "./utils/load-config.js";
import { runEslint } from "./utils/run-eslint.js";
import { runKnip } from "./utils/run-knip.js";
import { calculateScore } from "./utils/calculate-score.js";
import type {
  Diagnostic,
  ProjectInfo,
  ScoreResult,
  VueDoctorConfig,
} from "./types.js";

export type { Diagnostic, ProjectInfo, ScoreResult, VueDoctorConfig };

export interface DiagnoseResult {
  diagnostics: Diagnostic[];
  score: ScoreResult | null;
  project: ProjectInfo;
  elapsedMilliseconds: number;
}

export interface DiagnoseOptions {
  lint?: boolean;
  deadCode?: boolean;
  includePaths?: string[];
}

/**
 * Programmatically run vue-doctor diagnostics on a directory.
 *
 * @example
 * ```ts
 * import { diagnose } from 'vue-doctor/api'
 *
 * const result = await diagnose('./my-vue-app')
 * console.log(result.score)          // { score: 84, label: 'Good' }
 * console.log(result.diagnostics.length)  // 12
 * ```
 */
export const diagnose = async (
  directory: string,
  options: DiagnoseOptions = {},
): Promise<DiagnoseResult> => {
  const startTime = performance.now();

  const projectInfo = discoverProject(directory);
  const userConfig = loadConfig(directory);

  const lint = options.lint ?? userConfig?.lint ?? true;
  const deadCode = options.deadCode ?? userConfig?.deadCode ?? true;
  const includePaths = options.includePaths;

  const [lintDiagnostics, knipDiagnostics] = await Promise.all([
    lint
      ? runEslint(directory, projectInfo.framework, projectInfo.hasTypeScript, includePaths)
      : Promise.resolve<Diagnostic[]>([]),
    deadCode && !includePaths
      ? runKnip(directory).catch((): Diagnostic[] => [])
      : Promise.resolve<Diagnostic[]>([]),
  ]);

  const allDiagnostics = [...lintDiagnostics, ...knipDiagnostics];
  const diagnostics = userConfig
    ? filterIgnoredDiagnostics(allDiagnostics, userConfig)
    : allDiagnostics;

  const score = await calculateScore(diagnostics);
  const elapsedMilliseconds = performance.now() - startTime;

  return {
    diagnostics,
    score,
    project: projectInfo,
    elapsedMilliseconds,
  };
};
