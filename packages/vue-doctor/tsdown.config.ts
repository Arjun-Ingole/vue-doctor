import { defineConfig } from "tsdown";

export default defineConfig([
  {
    entry: {
      cli: "src/cli.ts",
    },
    format: ["esm"],
    target: "node18",
    platform: "node",
    dts: true,
    banner: {
      js: "#!/usr/bin/env node",
    },
    external: ["eslint", "vue-eslint-parser", "knip", "knip/session"],
  },
  {
    entry: {
      index: "src/index.ts",
    },
    format: ["esm"],
    target: "node18",
    platform: "node",
    dts: true,
    external: ["eslint", "vue-eslint-parser", "knip", "knip/session"],
  },
  {
    entry: {
      "vue-doctor-plugin": "src/plugin/index.ts",
    },
    format: ["esm"],
    target: "node18",
    platform: "node",
    dts: true,
    external: ["eslint", "vue-eslint-parser"],
  },
]);
