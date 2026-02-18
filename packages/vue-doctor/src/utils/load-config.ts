import fs from "node:fs";
import path from "node:path";
import { CONFIG_FILENAMES, PACKAGE_JSON_CONFIG_KEY } from "../constants.js";
import type { VueDoctorConfig } from "../types.js";

export const loadConfig = (directory: string): VueDoctorConfig | null => {
  for (const filename of CONFIG_FILENAMES) {
    const configPath = path.join(directory, filename);
    if (fs.existsSync(configPath)) {
      try {
        const content = fs.readFileSync(configPath, "utf-8");
        return JSON.parse(content) as VueDoctorConfig;
      } catch {
        return null;
      }
    }
  }

  const packageJsonPath = path.join(directory, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    try {
      const content = fs.readFileSync(packageJsonPath, "utf-8");
      const packageJson = JSON.parse(content) as Record<string, unknown>;
      if (packageJson[PACKAGE_JSON_CONFIG_KEY]) {
        return packageJson[PACKAGE_JSON_CONFIG_KEY] as VueDoctorConfig;
      }
    } catch {
      return null;
    }
  }

  return null;
};
