import { spawn, execSync } from "node:child_process";

const isGloballyInstalled = (): boolean => {
  try {
    const globalBinPath = execSync("which vue-doctor", {
      stdio: "pipe",
      encoding: "utf-8",
    }).trim();
    return !globalBinPath.includes("/_npx/");
  } catch {
    return false;
  }
};

export const maybeInstallGlobally = (): void => {
  try {
    if (isGloballyInstalled()) return;

    const child = spawn("npm", ["install", "-g", "vue-doctor@latest"], {
      detached: true,
      stdio: "ignore",
    });
    child.on("error", () => {});
    child.unref();
  } catch {
    // noop
  }
};
