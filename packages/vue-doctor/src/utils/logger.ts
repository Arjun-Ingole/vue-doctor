import pc from "picocolors";
import type { LoggerCaptureState } from "../types.js";

const captureState: LoggerCaptureState = {
  isEnabled: false,
  lines: [],
};

const captureIfEnabled = (text: string): void => {
  if (captureState.isEnabled) {
    captureState.lines.push(text);
  }
};

export const startLoggerCapture = (): void => {
  captureState.isEnabled = true;
  captureState.lines = [];
};

export const stopLoggerCapture = (): string => {
  captureState.isEnabled = false;
  const output = captureState.lines.join("\n");
  captureState.lines = [];
  return output;
};

export const logger = {
  log: (message: string): void => {
    console.log(message);
    captureIfEnabled(message);
  },
  error: (message: string): void => {
    console.error(pc.red(message));
    captureIfEnabled(message);
  },
  warn: (message: string): void => {
    console.warn(pc.yellow(message));
    captureIfEnabled(message);
  },
  success: (message: string): void => {
    console.log(pc.green(message));
    captureIfEnabled(message);
  },
  info: (message: string): void => {
    console.log(pc.cyan(message));
    captureIfEnabled(message);
  },
  dim: (message: string): void => {
    console.log(pc.dim(message));
    captureIfEnabled(message);
  },
  break: (): void => {
    console.log("");
    captureIfEnabled("");
  },
};
