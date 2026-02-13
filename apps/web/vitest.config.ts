import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.{ts,tsx}"],
    exclude: [
      "node_modules",
      ".next",
      // Expensive tests that make REAL LLM API calls (use dedicated npm scripts instead):
      // npm run test:llm           — LLM provider integration
      // npm run test:neutrality    — Input neutrality (full analysis x2 per pair)
      // npm run test:contexts      — Context preservation (full analysis)
      // npm run test:adversarial   — Adversarial context leak (full analysis)
      "test/unit/lib/llm-integration.test.ts",
      "test/unit/lib/input-neutrality.test.ts",
      "test/unit/lib/analyzer/context-preservation.test.ts",
      "test/unit/lib/analyzer/adversarial-context-leak.test.ts",
    ]
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@test": path.resolve(import.meta.dirname, "./test")
    }
  }
});
