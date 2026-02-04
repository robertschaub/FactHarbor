/**
 * Text Analysis Service Tests
 *
 * Validates the LLM-only text analysis service wiring.
 *
 * @module analyzer/text-analysis-service.test
 */

import { describe, it, expect } from "vitest";
import {
  getTextAnalysisService,
  isLLMEnabled,
  getServiceByType,
} from "@/lib/analyzer/text-analysis-service";
import { LLMTextAnalysisService } from "@/lib/analyzer/text-analysis-llm";

describe("Text Analysis Service", () => {
  it("returns true for all analysis points", () => {
    expect(isLLMEnabled("input")).toBe(true);
    expect(isLLMEnabled("evidence")).toBe(true);
    expect(isLLMEnabled("context")).toBe(true);
    expect(isLLMEnabled("verdict")).toBe(true);
  });

  it("returns the LLM service by default", () => {
    const service = getTextAnalysisService();
    expect(service).toBeInstanceOf(LLMTextAnalysisService);
  });

  it("returns a new LLM service when pipelineConfig is provided", () => {
    const service = getTextAnalysisService({ pipelineConfig: {} as any });
    expect(service).toBeInstanceOf(LLMTextAnalysisService);
  });

  it("returns the registry LLM service", () => {
    const service = getServiceByType("llm");
    expect(service).toBeInstanceOf(LLMTextAnalysisService);
  });
});
