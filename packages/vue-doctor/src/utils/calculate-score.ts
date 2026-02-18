import {
  PERFECT_SCORE,
  SCORE_API_URL,
  SCORE_GOOD_THRESHOLD,
  SCORE_OK_THRESHOLD,
} from "../constants.js";
import type { Diagnostic, ScoreResult } from "../types.js";

const computeLocalScore = (diagnostics: Diagnostic[]): ScoreResult => {
  if (diagnostics.length === 0) {
    return { score: PERFECT_SCORE, label: "Perfect" };
  }

  const errorCount = diagnostics.filter((d) => d.severity === "error").length;
  const warningCount = diagnostics.filter((d) => d.severity === "warning").length;

  // Weighted penalty: errors cost more than warnings
  const penalty = Math.min(errorCount * 4 + warningCount * 1.5, 100);
  const score = Math.max(0, Math.round(PERFECT_SCORE - penalty));

  let label: string;
  if (score >= SCORE_GOOD_THRESHOLD) {
    label = "Good";
  } else if (score >= SCORE_OK_THRESHOLD) {
    label = "OK";
  } else {
    label = "Critical";
  }

  return { score, label };
};

export const calculateScore = async (diagnostics: Diagnostic[]): Promise<ScoreResult | null> => {
  const payload = diagnostics.map((diagnostic) => ({
    plugin: diagnostic.plugin,
    rule: diagnostic.rule,
    severity: diagnostic.severity,
  }));

  try {
    const response = await fetch(SCORE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diagnostics: payload }),
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) return computeLocalScore(diagnostics);

    return (await response.json()) as ScoreResult;
  } catch {
    // API unavailable — compute locally
    return computeLocalScore(diagnostics);
  }
};
