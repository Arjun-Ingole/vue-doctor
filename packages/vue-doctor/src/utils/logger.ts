import pc from "picocolors";
import type { LoggerCaptureState } from "../types.js";
import { stripAnsi } from "./strip-ansi.js";

const captureState: LoggerCaptureState = {
  isEnabled: false,
  lines: [],
};

const captureLogLine = (text: string): void => {
  if (!captureState.isEnabled) return;
  captureState.lines.push(stripAnsi(text));
};

const writeLogLine = (text: string): void => {
  console.log(text);
  captureLogLine(text);
};

export const startLoggerCapture = (): void => {
  captureState.isEnabled = true;
  captureState.lines = [];
};

export const stopLoggerCapture = (): string => {
  const capturedOutput = captureState.lines.join("\n");
  captureState.isEnabled = false;
  captureState.lines = [];
  return capturedOutput;
};

export const logger = {
  error(...args: unknown[]) {
    writeLogLine(pc.red(args.join(" ")));
  },
  warn(...args: unknown[]) {
    writeLogLine(pc.yellow(args.join(" ")));
  },
  info(...args: unknown[]) {
    writeLogLine(pc.cyan(args.join(" ")));
  },
  success(...args: unknown[]) {
    writeLogLine(pc.green(args.join(" ")));
  },
  dim(...args: unknown[]) {
    writeLogLine(pc.dim(args.join(" ")));
  },
  log(...args: unknown[]) {
    writeLogLine(args.join(" "));
  },
  break() {
    writeLogLine("");
  },
};
