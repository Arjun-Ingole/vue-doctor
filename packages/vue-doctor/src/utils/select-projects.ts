import type { WorkspacePackage } from "../types.js";
import { discoverVueSubprojects, listWorkspacePackages } from "./discover-project.js";
import { logger } from "./logger.js";
import { prompts } from "./prompts.js";

export const selectProjects = async (
  rootDirectory: string,
  projectFlag: string | undefined,
  shouldSkipPrompts: boolean,
): Promise<string[]> => {
  const workspacePackages = listWorkspacePackages(rootDirectory);

  if (workspacePackages.length === 0) {
    const subprojects = discoverVueSubprojects(rootDirectory);
    if (subprojects.length === 0) {
      return [rootDirectory];
    }

    if (shouldSkipPrompts || projectFlag) {
      const selected = projectFlag
        ? filterByProjectFlag(subprojects, projectFlag)
        : subprojects;
      return selected.map((p) => p.directory);
    }

    return promptProjectSelection(subprojects);
  }

  if (shouldSkipPrompts) {
    if (projectFlag) {
      const selected = filterByProjectFlag(workspacePackages, projectFlag);
      return selected.length > 0
        ? selected.map((p) => p.directory)
        : workspacePackages.map((p) => p.directory);
    }
    return workspacePackages.map((p) => p.directory);
  }

  if (projectFlag) {
    const selected = filterByProjectFlag(workspacePackages, projectFlag);
    return selected.length > 0
      ? selected.map((p) => p.directory)
      : workspacePackages.map((p) => p.directory);
  }

  return promptProjectSelection(workspacePackages);
};

const filterByProjectFlag = (
  packages: WorkspacePackage[],
  projectFlag: string,
): WorkspacePackage[] => {
  const requestedNames = projectFlag.split(",").map((name) => name.trim());
  return packages.filter((pkg) => requestedNames.includes(pkg.name));
};

const promptProjectSelection = async (
  packages: WorkspacePackage[],
): Promise<string[]> => {
  if (packages.length === 1) {
    return [packages[0].directory];
  }

  logger.log("Multiple Vue projects found. Select projects to scan:");
  logger.break();

  const { selectedProjects } = await prompts({
    type: "multiselect",
    name: "selectedProjects",
    message: "Select projects to scan",
    choices: packages.map((pkg) => ({
      title: pkg.name,
      value: pkg.directory,
    })),
    min: 1,
  });

  return (selectedProjects as string[]) ?? packages.map((p) => p.directory);
};
