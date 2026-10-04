/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      // Pure TypeScript, so plain Node + Babel. The jest-expo preset would install
      // Expo's native runtime globals (including its own fetch) on top of the mocks.
      // UI packages use jest-expo once they get component tests (Phase 5).
      displayName: "core",
      testEnvironment: "node",
      rootDir: "<rootDir>/packages/core",
      testMatch: ["<rootDir>/src/**/__tests__/**/*.test.ts"],
      transform: {
        "\\.ts$": ["babel-jest", { presets: ["babel-preset-expo"] }],
      },
    },
  ],
  collectCoverageFrom: [
    "packages/core/src/**/*.ts",
    "!**/__tests__/**",
    "!**/index.ts",
    "!**/types.ts",
  ],
  coverageThreshold: {
    global: { lines: 90, branches: 90, functions: 90, statements: 90 },
  },
};
