import pc from "picocolors";

export const highlighter = {
  error: (text: string): string => pc.red(text),
  warn: (text: string): string => pc.yellow(text),
  success: (text: string): string => pc.green(text),
  info: (text: string): string => pc.cyan(text),
  dim: (text: string): string => pc.dim(text),
  bold: (text: string): string => pc.bold(text),
};
