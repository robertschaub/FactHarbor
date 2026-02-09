import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next"]
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@test": path.resolve(import.meta.dirname, "./test")
    }
  }
});
