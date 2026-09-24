import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.{ts,tsx}"],
    exclude: [
      "node_modules",
      ".next",
      // Makes REAL LLM API calls; run via npm run test:calibration:* (full pipeline x2 per pair)
      "test/calibration/framing-symmetry.test.ts",
    ]
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@test": path.resolve(import.meta.dirname, "./test")
    }
  }
});
