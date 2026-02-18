import fs from "node:fs";
import type { PackageJson } from "../types.js";

export const readPackageJson = (filePath: string): PackageJson => {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as PackageJson;
  } catch {
    return {};
  }
};
