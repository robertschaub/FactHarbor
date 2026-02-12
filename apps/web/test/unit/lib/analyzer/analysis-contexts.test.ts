import { describe, it, expect } from "vitest";
import {
  generateContextDetectionHint,
  detectContexts,
  formatDetectedContextsHint,
  UNASSIGNED_CONTEXT_ID,
  canonicalizeInputForContextDetection,
} from "@/lib/analyzer/analysis-contexts";

describe("analysis-contexts (LLM-first)", () => {
  describe("generateContextDetectionHint", () => {
    it("returns empty hint for any input", () => {
      expect(generateContextDetectionHint("Bolsonaro case")).toBe("");
      expect(generateContextDetectionHint("Was Einstein right?")).toBe("");
      expect(generateContextDetectionHint("")).toBe("");
    });
  });

  describe("detectContexts", () => {
    it("returns null (no deterministic context pre-detection)", () => {
      expect(detectContexts("Hydrogen cars use more energy than EVs")).toBeNull();
      expect(detectContexts("The trial was fair and based on law")).toBeNull();
    });
  });

  describe("canonicalizeInputForContextDetection", () => {
    it("applies structural normalization only", () => {
      expect(canonicalizeInputForContextDetection("  Test input?  ")).toBe("Test input");
      expect(canonicalizeInputForContextDetection("A   B   C")).toBe("A B C");
    });
  });

  describe("formatDetectedContextsHint", () => {
    it("returns empty string for null/empty", () => {
      expect(formatDetectedContextsHint(null)).toBe("");
      expect(formatDetectedContextsHint([])).toBe("");
    });

    it("formats provided contexts", () => {
      const contexts = [
        { id: "CTX_A", name: "Context A", type: "legal" as const },
        { id: "CTX_B", name: "Context B", type: "methodological" as const },
      ];
      const hint = formatDetectedContextsHint(contexts, false);
      expect(hint).toContain("PRE-DETECTED CONTEXTS");
      expect(hint).toContain("Context A");
      expect(hint).toContain("Context B");
    });
  });

  describe("constants", () => {
    it("exports UNASSIGNED_CONTEXT_ID", () => {
      expect(UNASSIGNED_CONTEXT_ID).toBe("CTX_UNASSIGNED");
    });
  });
});
