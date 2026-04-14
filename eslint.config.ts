// Flat ESLint config for the commoncast monorepo.
//
// The critical rule here is package-boundary enforcement:
//   - @commoncast/design-system   may NOT import from studio-engine, clasp-client,
//                                 or any apps/** store / composable.
//   - @commoncast/studio-engine   may NOT import vue or @vue/*.
//   - @commoncast/clasp-client    may NOT import vue or @vue/*.
//
// See CLAUDE.md §3 for the rationale.

import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import vue from "eslint-plugin-vue";
import importPlugin from "eslint-plugin-import-x";

export default defineConfig([
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.output/**",
      "**/.nuxt/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/playwright-report/**",
      "docs/mockups/**",
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs["flat/recommended"],

  // ---- design-system boundary ----
  {
    files: ["packages/design-system/**/*.{ts,vue}"],
    plugins: { "import-x": importPlugin },
    rules: {
      "import-x/no-restricted-paths": [
        "error",
        {
          zones: [
            {
              target: "./packages/design-system",
              from: "./packages/studio-engine",
              message:
                "design-system must not depend on studio-engine — it is pure presentational UI.",
            },
            {
              target: "./packages/design-system",
              from: "./packages/clasp-client",
              message:
                "design-system must not depend on clasp-client — it is pure presentational UI.",
            },
            {
              target: "./packages/design-system",
              from: "./apps",
              message:
                "design-system must not depend on apps/** — it is a leaf package.",
            },
          ],
        },
      ],
    },
  },

  // ---- studio-engine: no Vue ----
  {
    files: ["packages/studio-engine/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "vue", message: "studio-engine must stay framework-agnostic." },
            { name: "@vue/reactivity", message: "studio-engine must stay framework-agnostic." },
            { name: "@vue/runtime-core", message: "studio-engine must stay framework-agnostic." },
            { name: "pinia", message: "studio-engine must stay framework-agnostic." },
          ],
          patterns: ["@vue/*", "vue/*"],
        },
      ],
    },
  },

  // ---- clasp-client: no Vue ----
  {
    files: ["packages/clasp-client/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "vue", message: "clasp-client must stay framework-agnostic." },
            { name: "pinia", message: "clasp-client must stay framework-agnostic." },
          ],
          patterns: ["@vue/*", "vue/*"],
        },
      ],
    },
  },
]);
