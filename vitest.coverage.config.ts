/**
 * Root vitest coverage configuration.
 * Run with: pnpm test:coverage
 * Aggregates coverage across all packages into coverage/
 */
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Discovers each package's own vitest config (e.g. @azmr/ui's jsdom
    // environment + setupFiles) rather than running every test under this
    // config's own defaults — a flat `include` here previously ran ui's
    // DOM-touching tests under plain Node with no jsdom, silently registering
    // 0% coverage for anything that actually touched the DOM.
    projects: ["packages/*"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "json-summary", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["packages/*/src/**/*.ts", "packages/*/src/**/*.tsx"],
      exclude: [
        "packages/*/src/**/*.test.ts",
        "packages/*/src/**/*.test.tsx",
        "packages/*/src/index.ts",
        "**/dist/**",
        "**/node_modules/**",
      ],
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 70,
        statements: 75,
      },
      all: true,
    },
  },
});
