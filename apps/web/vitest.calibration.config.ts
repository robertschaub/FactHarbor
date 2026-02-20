/**
 * Vitest config for political bias calibration tests.
 * Used by test:calibration and test:calibration:full scripts.
 * Separate from vitest.config.ts so the calibration test is not excluded.
 */
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/calibration/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@test": path.resolve(import.meta.dirname, "./test"),
    },
  },
});
