const path = require("path");

// Resolve workspace packages to their sources, so tests never depend on a prior `tsc -b`.
const workspaceSources = {
  "^@osm-navigator/(core|native-map|ui-navigation)$": path.join(__dirname, "packages/$1/src"),
};

/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      // Pure TypeScript, so plain Node + Babel. The jest-expo preset would install
      // Expo's native runtime globals (including its own fetch) on top of the mocks.
      // UI packages use jest-expo (below).
      displayName: "core",
      testEnvironment: "node",
      rootDir: "<rootDir>/packages/core",
      testMatch: ["<rootDir>/src/**/__tests__/**/*.test.ts"],
      transform: {
        "\\.ts$": ["babel-jest", { presets: ["babel-preset-expo"] }],
      },
    },
    {
      displayName: "ui-navigation",
      preset: "jest-expo",
      rootDir: "<rootDir>/packages/ui-navigation",
      testMatch: ["<rootDir>/src/**/__tests__/**/*.test.ts?(x)"],
      moduleNameMapper: workspaceSources,
    },
    {
      displayName: "navigation-example",
      preset: "jest-expo",
      rootDir: "<rootDir>/apps/navigation-example",
      testMatch: ["<rootDir>/src/**/__tests__/**/*.test.ts?(x)"],
      moduleNameMapper: workspaceSources,
    },
  ],
  collectCoverageFrom: [
    "packages/core/src/**/*.ts",
    "packages/ui-navigation/src/**/*.{ts,tsx}",
    "apps/navigation-example/src/**/*.{ts,tsx}",
    "!**/__tests__/**",
    "!**/index.ts",
    "!**/types.ts",
  ],
  coverageThreshold: {
    global: { lines: 90, branches: 90, functions: 90, statements: 90 },
  },
};
