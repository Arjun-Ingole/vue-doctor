import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { SEPARATOR_LENGTH_CHARS } from "../constants.js";
import { copyToClipboard } from "./copy-to-clipboard.js";
import { highlighter } from "./highlighter.js";
import { logger } from "./logger.js";
import { prompts } from "./prompts.js";

const CLAUDE_CLI_RELEASES_URL = "https://github.com/anthropics/claude-code";
const CURSOR_DOWNLOAD_URL = "https://cursor.sh";

const FIX_PROMPT =
  "Run `npx -y vue-doctor@latest .` to diagnose issues, then fix all reported issues one by one. After applying fixes, run it again to verify the results improved.";
const VUE_DOCTOR_OUTPUT_LABEL = "vue-doctor output";
const SCAN_SUMMARY_SEPARATOR = "─".repeat(SEPARATOR_LENGTH_CHARS);

const isClaudeInstalled = (): boolean => {
  try {
    execSync("which claude", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

const isCursorInstalled = (): boolean => {
  if (process.platform === "darwin") {
    return (
      existsSync("/Applications/Cursor.app") ||
      existsSync(path.join(os.homedir(), "Applications", "Cursor.app"))
    );
  }

  if (process.platform === "win32") {
    const { LOCALAPPDATA, PROGRAMFILES } = process.env;
    return (
      Boolean(LOCALAPPDATA && existsSync(path.join(LOCALAPPDATA, "Programs", "Cursor", "Cursor.exe"))) ||
      Boolean(PROGRAMFILES && existsSync(path.join(PROGRAMFILES, "Cursor", "Cursor.exe")))
    );
  }

  try {
    execSync("which cursor", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

const openUrl = (url: string): void => {
  if (process.platform === "win32") {
    const cmdEscapedUrl = url.replace(/%/g, "%%");
    execSync(`start "" "${cmdEscapedUrl}"`, { stdio: "ignore" });
    return;
  }
  const openCommand = process.platform === "darwin" ? `open "${url}"` : `xdg-open "${url}"`;
  execSync(openCommand, { stdio: "ignore" });
};

const openClaudeWithPrompt = (directory: string): void => {
  const resolvedDirectory = path.resolve(directory);
  try {
    execSync(`claude "${FIX_PROMPT}"`, {
      cwd: resolvedDirectory,
      stdio: "inherit",
    });
    logger.success("Opened Claude Code with vue-doctor fix prompt.");
  } catch {
    logger.error("Failed to open Claude Code automatically.");
    copyPromptToClipboard(FIX_PROMPT, true);
  }
};

const buildPromptWithOutput = (vueDoctorOutput: string): string => {
  const summaryStartIndex = vueDoctorOutput.indexOf(SCAN_SUMMARY_SEPARATOR);
  const diagnosticsOutput =
    summaryStartIndex === -1
      ? vueDoctorOutput
      : vueDoctorOutput.slice(0, summaryStartIndex).trimEnd();
  const normalizedVueDoctorOutput = diagnosticsOutput.trim();
  const outputContent =
    normalizedVueDoctorOutput.length > 0 ? normalizedVueDoctorOutput : "No output captured.";
  return `${FIX_PROMPT}\n\n${VUE_DOCTOR_OUTPUT_LABEL}:\n\`\`\`\n${outputContent}\n\`\`\``;
};

export const copyPromptToClipboard = (vueDoctorOutput: string, shouldLogResult: boolean): void => {
  const promptWithOutput = buildPromptWithOutput(vueDoctorOutput);
  const didCopyPromptToClipboard = copyToClipboard(promptWithOutput);

  if (!shouldLogResult) {
    return;
  }

  if (didCopyPromptToClipboard) {
    logger.success("Copied latest scan output to clipboard");
    return;
  }

  logger.warn("Could not copy prompt to clipboard automatically. Use this prompt:");
  logger.info(promptWithOutput);
};

export const openAiToFix = (directory: string): void => {
  const hasClaude = isClaudeInstalled();
  const hasCursor = isCursorInstalled();

  if (hasClaude) {
    logger.log("Opening Claude Code to fix vue-doctor issues...");
    openClaudeWithPrompt(directory);
    return;
  }

  if (hasCursor) {
    logger.log("Cursor detected. Copying fix prompt to clipboard...");
    logger.dim("Paste the prompt in Cursor's chat to start fixing issues.");
    copyPromptToClipboard(FIX_PROMPT, true);
    return;
  }

  logger.log("No AI tool detected. Copying fix prompt to clipboard...");
  logger.dim("Install Claude Code or Cursor, then paste the prompt to fix issues.");
  logger.break();
  logger.dim(`Claude Code: ${highlighter.info(CLAUDE_CLI_RELEASES_URL)}`);
  logger.dim(`Cursor: ${highlighter.info(CURSOR_DOWNLOAD_URL)}`);
  copyPromptToClipboard(FIX_PROMPT, true);
};

export const maybePromptAiFix = async (directory: string): Promise<void> => {
  const hasClaude = isClaudeInstalled();
  const hasCursor = isCursorInstalled();

  logger.break();
  logger.log(`Fix these issues with an AI assistant?`);
  
  if (hasClaude) {
    logger.dim(`   Claude Code is detected and ready to use.`);
  } else if (hasCursor) {
    logger.dim(`   Cursor is detected. The fix prompt will be copied to clipboard.`);
  } else {
    logger.dim(`   The fix prompt will be copied to clipboard for use with any AI tool.`);
    logger.dim(`   Install Claude Code or Cursor for a better experience.`);
  }
  
  logger.break();

  const { shouldFix } = await prompts({
    type: "confirm",
    name: "shouldFix",
    message: hasClaude ? "Open Claude Code to fix?" : "Copy fix prompt to clipboard?",
    initial: true,
  });

  if (shouldFix) {
    openAiToFix(directory);
  }
};
