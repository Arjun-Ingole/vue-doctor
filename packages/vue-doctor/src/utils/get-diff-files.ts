import { spawnSync } from "node:child_process";
import { VUE_FILE_PATTERN } from "../constants.js";
import type { DiffInfo } from "../types.js";

const DEFAULT_BASE_BRANCHES = ["main", "master", "develop", "dev"];

const getCurrentBranch = (directory: string): string | null => {
  const result = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], {
    cwd: directory,
    encoding: "utf-8",
  });

  if (result.error || result.status !== 0) return null;
  const branch = result.stdout.trim();
  return branch === "HEAD" ? null : branch;
};

const isMainBranch = (branch: string): boolean =>
  DEFAULT_BASE_BRANCHES.includes(branch.toLowerCase());

const findBaseBranch = (directory: string, currentBranch: string): string | null => {
  for (const baseBranch of DEFAULT_BASE_BRANCHES) {
    if (baseBranch === currentBranch) continue;
    const result = spawnSync("git", ["rev-parse", "--verify", baseBranch], {
      cwd: directory,
      encoding: "utf-8",
    });
    if (result.status === 0) return baseBranch;
  }
  return null;
};

const getChangedFiles = (
  directory: string,
  currentBranch: string,
  baseBranch: string,
): string[] => {
  const result = spawnSync("git", ["diff", "--name-only", `${baseBranch}...${currentBranch}`], {
    cwd: directory,
    encoding: "utf-8",
  });

  if (result.error || result.status !== 0) return [];

  return result.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
};

export const getDiffInfo = (
  directory: string,
  explicitBaseBranch?: string,
): DiffInfo | null => {
  const currentBranch = getCurrentBranch(directory);
  if (!currentBranch) return null;
  if (isMainBranch(currentBranch) && !explicitBaseBranch) return null;

  const baseBranch = explicitBaseBranch ?? findBaseBranch(directory, currentBranch);
  if (!baseBranch) return null;

  const changedFiles = getChangedFiles(directory, currentBranch, baseBranch);

  return { currentBranch, baseBranch, changedFiles };
};

export const filterSourceFiles = (filePaths: string[]): string[] =>
  filePaths.filter((filePath) => VUE_FILE_PATTERN.test(filePath));
