/**
 * Vitest config for the live test commands: test:llm, test:neutrality,
 * test:expensive, test:cb-integration and test:smoke.
 * These suites make real LLM calls, so vitest.config.ts excludes them from the
 * default run; under that config the commands would select no test files.
 */
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: [
      "test/unit/lib/llm-integration.test.ts",
      "test/unit/lib/input-neutrality.test.ts",
      "test/integration/claimboundary-integration.test.ts",
      "test/integration/hydrogen-smoke.test.ts",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@test": path.resolve(import.meta.dirname, "./test"),
    },
  },
});
