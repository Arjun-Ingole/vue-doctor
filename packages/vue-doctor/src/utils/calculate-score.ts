import {
  PERFECT_SCORE,
  SCORE_GOOD_THRESHOLD,
  SCORE_OK_THRESHOLD,
} from "../constants.js";
import type { Diagnostic, ScoreResult } from "../types.js";

export const calculateScore = (diagnostics: Diagnostic[]): ScoreResult => {
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
