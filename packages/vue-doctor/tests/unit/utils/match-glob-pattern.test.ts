import { describe, expect, it } from "vitest";
import { matchGlobPattern } from "../../../src/utils/match-glob-pattern.js";

describe("matchGlobPattern", () => {
  it("matches exact file paths", () => {
    expect(matchGlobPattern("src/app.vue", "src/app.vue")).toBe(true);
    expect(matchGlobPattern("src/app.vue", "src/other.vue")).toBe(false);
  });

  it("matches single wildcard for filenames", () => {
    expect(matchGlobPattern("src/app.vue", "src/*.vue")).toBe(true);
    expect(matchGlobPattern("src/utils.ts", "src/*.vue")).toBe(false);
    expect(matchGlobPattern("src/nested/app.vue", "src/*.vue")).toBe(false);
  });

  it("matches double wildcard at the end", () => {
    expect(matchGlobPattern("src/generated/foo.vue", "src/generated/**")).toBe(true);
    expect(matchGlobPattern("src/generated/bar/baz.vue", "src/generated/**")).toBe(true);
    expect(matchGlobPattern("src/other/foo.vue", "src/generated/**")).toBe(false);
  });

  it("matches double wildcard with trailing slash and filename", () => {
    expect(matchGlobPattern("src/foo/test.vue", "src/**/test.vue")).toBe(true);
    expect(matchGlobPattern("src/foo/bar/test.vue", "src/**/test.vue")).toBe(true);
    expect(matchGlobPattern("src/test.vue", "src/**/test.vue")).toBe(true);
  });

  it("matches double wildcard at the start", () => {
    expect(matchGlobPattern("src/components/Button.vue", "**/*.vue")).toBe(true);
    expect(matchGlobPattern("Button.vue", "**/*.vue")).toBe(true);
    expect(matchGlobPattern("deep/nested/path/file.vue", "**/*.vue")).toBe(true);
    expect(matchGlobPattern("file.ts", "**/*.vue")).toBe(false);
  });

  it("matches question mark as single character", () => {
    expect(matchGlobPattern("src/a.vue", "src/?.vue")).toBe(true);
    expect(matchGlobPattern("src/ab.vue", "src/?.vue")).toBe(false);
  });

  it("escapes regex special characters in patterns", () => {
    expect(matchGlobPattern("src/file.test.vue", "src/*.test.vue")).toBe(true);
    expect(matchGlobPattern("src/filetestvue", "src/*.test.vue")).toBe(false);
  });

  it("normalizes backslashes to forward slashes", () => {
    expect(matchGlobPattern("src\\generated\\foo.vue", "src/generated/**")).toBe(true);
  });
});
