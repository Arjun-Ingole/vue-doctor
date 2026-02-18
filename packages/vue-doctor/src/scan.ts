import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import {
  MILLISECONDS_PER_SECOND,
  PERFECT_SCORE,
  SCORE_BAR_WIDTH_CHARS,
  SCORE_GOOD_THRESHOLD,
  SCORE_OK_THRESHOLD,
  SUMMARY_BOX_HORIZONTAL_PADDING_CHARS,
  SUMMARY_BOX_OUTER_INDENT_CHARS,
  VUE_FILE_PATTERN,
} from "./constants.js";
import type { Diagnostic, ScanOptions, ScoreResult } from "./types.js";
import { calculateScore } from "./utils/calculate-score.js";
import { discoverProject, formatFrameworkName } from "./utils/discover-project.js";
import { filterIgnoredDiagnostics } from "./utils/filter-diagnostics.js";
import { groupBy } from "./utils/group-by.js";
import { highlighter } from "./utils/highlighter.js";
import { indentMultilineText } from "./utils/indent-multiline-text.js";
import { loadConfig } from "./utils/load-config.js";
import { logger } from "./utils/logger.js";
import { runEslint } from "./utils/run-eslint.js";
import { runKnip } from "./utils/run-knip.js";
import { spinner } from "./utils/spinner.js";

interface FramedLine {
  plainText: string;
  renderedText: string;
}

interface ScoreBarSegments {
  filledSegment: string;
  emptySegment: string;
}

const SEVERITY_ORDER: Record<Diagnostic["severity"], number> = {
  error: 0,
  warning: 1,
};

const colorizeBySeverity = (text: string, severity: Diagnostic["severity"]): string =>
  severity === "error" ? highlighter.error(text) : highlighter.warn(text);

const sortBySeverity = (diagnosticGroups: [string, Diagnostic[]][]): [string, Diagnostic[]][] =>
  diagnosticGroups.toSorted(([, diagnosticsA], [, diagnosticsB]) => {
    const severityA = SEVERITY_ORDER[diagnosticsA[0].severity];
    const severityB = SEVERITY_ORDER[diagnosticsB[0].severity];
    return severityA - severityB;
  });

const collectAffectedFiles = (diagnostics: Diagnostic[]): Set<string> =>
  new Set(diagnostics.map((diagnostic) => diagnostic.filePath));

const buildFileLineMap = (diagnostics: Diagnostic[]): Map<string, number[]> => {
  const fileLines = new Map<string, number[]>();
  for (const diagnostic of diagnostics) {
    const lines = fileLines.get(diagnostic.filePath) ?? [];
    if (diagnostic.line > 0) {
      lines.push(diagnostic.line);
    }
    fileLines.set(diagnostic.filePath, lines);
  }
  return fileLines;
};

const printDiagnostics = (diagnostics: Diagnostic[], isVerbose: boolean): void => {
  const categoryGroups = groupBy(diagnostics, (d) => d.category);

  const sortedCategories = [...categoryGroups.entries()].toSorted(([, a], [, b]) => {
    const aWorst = a.some((d) => d.severity === "error") ? 0 : 1;
    const bWorst = b.some((d) => d.severity === "error") ? 0 : 1;
    return aWorst - bWorst;
  });

  for (const [category, categoryDiagnostics] of sortedCategories) {
    const errorCount = categoryDiagnostics.filter((d) => d.severity === "error").length;
    const warnCount = categoryDiagnostics.filter((d) => d.severity === "warning").length;
    const countParts: string[] = [];
    if (errorCount > 0) countParts.push(highlighter.error(`${errorCount} error${errorCount !== 1 ? "s" : ""}`));
    if (warnCount > 0) countParts.push(highlighter.warn(`${warnCount} warning${warnCount !== 1 ? "s" : ""}`));

    logger.log(
      `  ${highlighter.dim("──")} ${highlighter.bold(category)}  ${countParts.join("  ")}`,
    );
    logger.break();

    const ruleGroups = groupBy(categoryDiagnostics, (d) => `${d.plugin}/${d.rule}`);
    const sortedRuleGroups = sortBySeverity([...ruleGroups.entries()]);

    for (const [, ruleDiagnostics] of sortedRuleGroups) {
      const firstDiagnostic = ruleDiagnostics[0];
      const severitySymbol = firstDiagnostic.severity === "error" ? "✗" : "⚠";
      const icon = colorizeBySeverity(severitySymbol, firstDiagnostic.severity);
      const count = ruleDiagnostics.length;
      const countLabel = count > 1 ? colorizeBySeverity(` (${count})`, firstDiagnostic.severity) : "";
      const ruleId = highlighter.dim(`  vue-doctor/${firstDiagnostic.rule}`);

      logger.log(`  ${icon} ${firstDiagnostic.message}${countLabel}${ruleId}`);
      if (firstDiagnostic.help) {
        logger.dim(indentMultilineText(firstDiagnostic.help, "    "));
      }

      if (isVerbose) {
        const fileLines = buildFileLineMap(ruleDiagnostics);
        for (const [filePath, lines] of fileLines) {
          const lineLabel = lines.length > 0 ? `:${lines.join(", ")}` : "";
          logger.dim(`    ${filePath}${lineLabel}`);
        }
      }

      logger.break();
    }
  }
};

const formatElapsedTime = (elapsedMilliseconds: number): string => {
  if (elapsedMilliseconds < MILLISECONDS_PER_SECOND) {
    return `${Math.round(elapsedMilliseconds)}ms`;
  }
  return `${(elapsedMilliseconds / MILLISECONDS_PER_SECOND).toFixed(1)}s`;
};

const formatRuleSummary = (ruleKey: string, ruleDiagnostics: Diagnostic[]): string => {
  const firstDiagnostic = ruleDiagnostics[0];
  const fileLines = buildFileLineMap(ruleDiagnostics);

  const sections = [
    `Rule: ${ruleKey}`,
    `Severity: ${firstDiagnostic.severity}`,
    `Category: ${firstDiagnostic.category}`,
    `Count: ${ruleDiagnostics.length}`,
    "",
    firstDiagnostic.message,
  ];

  if (firstDiagnostic.help) {
    sections.push("", `Suggestion: ${firstDiagnostic.help}`);
  }

  sections.push("", "Files:");
  for (const [filePath, lines] of fileLines) {
    const lineLabel = lines.length > 0 ? `: ${lines.join(", ")}` : "";
    sections.push(`  ${filePath}${lineLabel}`);
  }

  return sections.join("\n") + "\n";
};

const writeDiagnosticsDirectory = (diagnostics: Diagnostic[]): string => {
  const outputDirectory = join(tmpdir(), `vue-doctor-${randomUUID()}`);
  mkdirSync(outputDirectory);

  const ruleGroups = groupBy(
    diagnostics,
    (diagnostic) => `${diagnostic.plugin}/${diagnostic.rule}`,
  );
  const sortedRuleGroups = sortBySeverity([...ruleGroups.entries()]);

  for (const [ruleKey, ruleDiagnostics] of sortedRuleGroups) {
    const fileName = ruleKey.replace(/\//g, "--") + ".txt";
    writeFileSync(join(outputDirectory, fileName), formatRuleSummary(ruleKey, ruleDiagnostics));
  }

  writeFileSync(join(outputDirectory, "diagnostics.json"), JSON.stringify(diagnostics, null, 2));

  return outputDirectory;
};

const colorizeByScore = (text: string, score: number): string => {
  if (score >= SCORE_GOOD_THRESHOLD) return highlighter.success(text);
  if (score >= SCORE_OK_THRESHOLD) return highlighter.warn(text);
  return highlighter.error(text);
};

const createFramedLine = (plainText: string, renderedText: string = plainText): FramedLine => ({
  plainText,
  renderedText,
});

const buildScoreBarSegments = (score: number): ScoreBarSegments => {
  const filledCount = Math.round((score / PERFECT_SCORE) * SCORE_BAR_WIDTH_CHARS);
  const emptyCount = SCORE_BAR_WIDTH_CHARS - filledCount;

  return {
    filledSegment: "█".repeat(filledCount),
    emptySegment: "░".repeat(emptyCount),
  };
};

const buildPlainScoreBar = (score: number): string => {
  const { filledSegment, emptySegment } = buildScoreBarSegments(score);
  return `${filledSegment}${emptySegment}`;
};

const buildScoreBar = (score: number): string => {
  const { filledSegment, emptySegment } = buildScoreBarSegments(score);
  return colorizeByScore(filledSegment, score) + highlighter.dim(emptySegment);
};

const printFramedBox = (framedLines: FramedLine[]): void => {
  if (framedLines.length === 0) {
    return;
  }

  const borderColorizer = highlighter.dim;
  const outerIndent = " ".repeat(SUMMARY_BOX_OUTER_INDENT_CHARS);
  const horizontalPadding = " ".repeat(SUMMARY_BOX_HORIZONTAL_PADDING_CHARS);
  const maximumLineLength = Math.max(
    ...framedLines.map((framedLine) => framedLine.plainText.length),
  );
  const borderLine = "─".repeat(maximumLineLength + SUMMARY_BOX_HORIZONTAL_PADDING_CHARS * 2);

  logger.log(`${outerIndent}${borderColorizer(`┌${borderLine}┐`)}`);

  for (const framedLine of framedLines) {
    const trailingSpaces = " ".repeat(maximumLineLength - framedLine.plainText.length);
    logger.log(
      `${outerIndent}${borderColorizer("│")}${horizontalPadding}${framedLine.renderedText}${trailingSpaces}${horizontalPadding}${borderColorizer("│")}`,
    );
  }

  logger.log(`${outerIndent}${borderColorizer(`└${borderLine}┘`)}`);
};

const printScoreGauge = (score: number, label: string): void => {
  const scoreDisplay = colorizeByScore(`${score}`, score);
  const labelDisplay = colorizeByScore(label, score);
  logger.log(`  ${scoreDisplay} / ${PERFECT_SCORE}  ${labelDisplay}`);
  logger.break();
  logger.log(`  ${buildScoreBar(score)}`);
  logger.break();
};

const getDoctorFace = (score: number): [string, string] => {
  if (score >= SCORE_GOOD_THRESHOLD) return ["◠ ◠", " ▽ "];
  if (score >= SCORE_OK_THRESHOLD) return ["• •", " ─ "];
  return ["x x", " ▽ "];
};

const printSummary = (
  diagnostics: Diagnostic[],
  elapsedMilliseconds: number,
  scoreResult: ScoreResult,
  totalSourceFileCount: number,
): void => {
  const errorCount = diagnostics.filter((d) => d.severity === "error").length;
  const warningCount = diagnostics.filter((d) => d.severity === "warning").length;
  const affectedFileCount = collectAffectedFiles(diagnostics).size;
  const elapsed = formatElapsedTime(elapsedMilliseconds);

  const summaryLineParts: string[] = [];
  const summaryLinePartsPlain: string[] = [];
  if (errorCount > 0) {
    const errorText = `✗ ${errorCount} error${errorCount === 1 ? "" : "s"}`;
    summaryLinePartsPlain.push(errorText);
    summaryLineParts.push(highlighter.error(errorText));
  }
  if (warningCount > 0) {
    const warningText = `⚠ ${warningCount} warning${warningCount === 1 ? "" : "s"}`;
    summaryLinePartsPlain.push(warningText);
    summaryLineParts.push(highlighter.warn(warningText));
  }
  const fileCountText =
    totalSourceFileCount > 0
      ? `across ${affectedFileCount}/${totalSourceFileCount} files`
      : `across ${affectedFileCount} file${affectedFileCount === 1 ? "" : "s"}`;
  const elapsedTimeText = `in ${elapsed}`;

  summaryLinePartsPlain.push(fileCountText);
  summaryLinePartsPlain.push(elapsedTimeText);
  summaryLineParts.push(highlighter.dim(fileCountText));
  summaryLineParts.push(highlighter.dim(elapsedTimeText));

  const [eyes, mouth] = getDoctorFace(scoreResult.score);
  const scoreColorizer = (text: string): string => colorizeByScore(text, scoreResult.score);

  const summaryFramedLines: FramedLine[] = [];
  summaryFramedLines.push(createFramedLine("┌─────┐", scoreColorizer("┌─────┐")));
  summaryFramedLines.push(createFramedLine(`│ ${eyes} │`, scoreColorizer(`│ ${eyes} │`)));
  summaryFramedLines.push(createFramedLine(`│ ${mouth} │`, scoreColorizer(`│ ${mouth} │`)));
  summaryFramedLines.push(createFramedLine("└─────┘", scoreColorizer("└─────┘")));
  summaryFramedLines.push(
    createFramedLine("Vue Doctor", "Vue Doctor"),
  );
  summaryFramedLines.push(createFramedLine(""));

  const scoreLinePlainText = `${scoreResult.score} / ${PERFECT_SCORE}  ${scoreResult.label}`;
  const scoreLineRenderedText = `${colorizeByScore(String(scoreResult.score), scoreResult.score)} / ${PERFECT_SCORE}  ${colorizeByScore(scoreResult.label, scoreResult.score)}`;
  summaryFramedLines.push(createFramedLine(scoreLinePlainText, scoreLineRenderedText));
  summaryFramedLines.push(createFramedLine(""));
  summaryFramedLines.push(
    createFramedLine(buildPlainScoreBar(scoreResult.score), buildScoreBar(scoreResult.score)),
  );
  summaryFramedLines.push(createFramedLine(""));

  summaryFramedLines.push(
    createFramedLine(summaryLinePartsPlain.join("  "), summaryLineParts.join("  ")),
  );
  printFramedBox(summaryFramedLines);

  try {
    const diagnosticsDirectory = writeDiagnosticsDirectory(diagnostics);
    logger.break();
    logger.dim(`  Detailed report → ${diagnosticsDirectory}`);
  } catch {
    logger.break();
  }
};

export const scan = async (directory: string, inputOptions: ScanOptions = {}): Promise<void> => {
  const startTime = performance.now();
  const projectInfo = discoverProject(directory);
  const userConfig = loadConfig(directory);

  const options = {
    lint: inputOptions.lint ?? userConfig?.lint ?? true,
    deadCode: inputOptions.deadCode ?? userConfig?.deadCode ?? true,
    verbose: inputOptions.verbose ?? userConfig?.verbose ?? false,
    scoreOnly: inputOptions.scoreOnly ?? false,
    includePaths: inputOptions.includePaths,
  };

  const includePaths = options.includePaths ?? [];
  const isDiffMode = includePaths.length > 0;

  if (!projectInfo.vueVersion) {
    throw new Error("No Vue dependency found in package.json");
  }

  if (!options.scoreOnly) {
    const frameworkLabel = formatFrameworkName(projectInfo.framework);
    const languageLabel = projectInfo.hasTypeScript ? "TypeScript" : "JavaScript";
    const sep = highlighter.dim(" · ");

    const projectParts = [
      highlighter.info(`Vue ${projectInfo.vueVersion}`),
      highlighter.info(frameworkLabel),
      highlighter.info(languageLabel),
    ];
    if (projectInfo.hasPinia) projectParts.push(highlighter.info("Pinia"));

    const fileCountStr = isDiffMode
      ? `${includePaths.length} changed file${includePaths.length !== 1 ? "s" : ""}`
      : `${projectInfo.sourceFileCount} file${projectInfo.sourceFileCount !== 1 ? "s" : ""}`;
    projectParts.push(highlighter.dim(fileCountStr));
    if (userConfig) projectParts.push(highlighter.dim("config loaded"));

    logger.log(`${highlighter.success("✔")} ${projectParts.join(sep)}`);
    logger.break();
  }

  const vueIncludePaths = isDiffMode
    ? includePaths.filter((filePath) => VUE_FILE_PATTERN.test(filePath))
    : undefined;

  const analysisSpinner = options.scoreOnly ? null : spinner("Analyzing...").start();

  let lintError: unknown = null;
  let deadCodeError: unknown = null;

  const [lintDiagnostics, deadCodeDiagnostics] = await Promise.all([
    options.lint
      ? runEslint(directory, projectInfo.framework, projectInfo.hasTypeScript, vueIncludePaths)
          .catch((err) => { lintError = err; return [] as Diagnostic[]; })
      : Promise.resolve<Diagnostic[]>([]),
    options.deadCode && !isDiffMode
      ? runKnip(directory)
          .catch((err) => { deadCodeError = err; return [] as Diagnostic[]; })
      : Promise.resolve<Diagnostic[]>([]),
  ]);

  if (lintError || deadCodeError) {
    analysisSpinner?.warn("Analysis complete (some checks failed).");
    if (lintError) {
      logger.error(lintError instanceof Error ? lintError.message : String(lintError));
      if (lintError instanceof Error && lintError.stack) logger.dim(lintError.stack);
    }
    if (deadCodeError) {
      logger.error(String(deadCodeError));
    }
  } else {
    analysisSpinner?.succeed("Analysis complete.");
  }
  const allDiagnostics = [...lintDiagnostics, ...deadCodeDiagnostics];
  const diagnostics = userConfig
    ? filterIgnoredDiagnostics(allDiagnostics, userConfig)
    : allDiagnostics;

  const elapsedMilliseconds = performance.now() - startTime;
  const scoreResult = calculateScore(diagnostics);

  if (options.scoreOnly) {
    logger.log(`${scoreResult.score}`);
    return;
  }

  if (diagnostics.length === 0) {
    logger.success("No issues found!");
    logger.break();
    const [eyes, mouth] = getDoctorFace(scoreResult.score);
    const colorize = (text: string) => colorizeByScore(text, scoreResult.score);
    logger.log(colorize("  ┌─────┐"));
    logger.log(colorize(`  │ ${eyes} │`));
    logger.log(colorize(`  │ ${mouth} │`));
    logger.log(colorize("  └─────┘"));
    logger.log("  Vue Doctor");
    logger.break();
    printScoreGauge(scoreResult.score, scoreResult.label);
    return;
  }

  printDiagnostics(diagnostics, options.verbose);

  const displayedSourceFileCount = isDiffMode ? includePaths.length : projectInfo.sourceFileCount;

  printSummary(
    diagnostics,
    elapsedMilliseconds,
    scoreResult,
    displayedSourceFileCount,
  );
};
