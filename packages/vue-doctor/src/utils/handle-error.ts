import type { HandleErrorOptions } from "../types.js";
import { logger } from "./logger.js";

export const handleError = (
  error: unknown,
  options: HandleErrorOptions = { shouldExit: true },
): void => {
  if (error instanceof Error) {
    logger.error(error.message);
    if (error.stack) {
      logger.dim(error.stack);
    }
  } else {
    logger.error(String(error));
  }
  if (options.shouldExit) {
    process.exit(1);
  }
};
