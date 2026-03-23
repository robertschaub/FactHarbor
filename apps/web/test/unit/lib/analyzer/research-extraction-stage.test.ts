import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
  classifyRelevance, 
  extractResearchEvidence, 
  assessEvidenceApplicability, 
  assessScopeQuality, 
  assessEvidenceBalance 
} from "@/lib/analyzer/research-extraction-stage";
import { 
  loadAndRenderSection, 
} from "@/lib/analyzer/prompt-loader";
import {
  getModelForTask, 
  extractStructuredOutput 
} from "@/lib/analyzer/llm";
import { generateText } from "ai";

// Mock modules
vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: { object: vi.fn(() => ({})) },
}));

vi.mock("@/lib/analyzer/llm", () => ({
  getModelForTask: vi.fn(() => ({ model: { id: "mock-model" }, modelName: "mock-model", provider: "anthropic" })),
  extractStructuredOutput: vi.fn((result) => result),
  getStructuredOutputProviderOptions: vi.fn(() => ({})),
  getPromptCachingOptions: vi.fn(() => ({})),
}));

vi.mock("@/lib/analyzer/prompt-loader", () => ({
  loadAndRenderSection: vi.fn(),
}));

vi.mock("@/lib/analyzer/metrics-integration", () => ({
  recordLLMCall: vi.fn(),
}));

vi.mock("@/lib/analyzer/pipeline-utils", () => ({
  debugLog: vi.fn(),
  mapCategory: vi.fn((c) => c),
  mapSourceType: vi.fn((s) => s),
  normalizeExtractedSourceType: vi.fn((s) => s),
}));

const mockLoadSection = vi.mocked(loadAndRenderSection);
const mockGenerateText = vi.mocked(generateText);
const mockExtractOutput = vi.mocked(extractStructuredOutput);

describe("Research Extraction Stage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("classifyRelevance", () => {
    it("should classify search results via LLM and filter by score", async () => {
      const claim = { id: "AC_01", statement: "Test claim" } as any;
      const searchResults = [
        { url: "https://example.com/1", title: "Source 1", snippet: "relevant" },
        { url: "https://example.com/2", title: "Source 2", snippet: "irrelevant" },
      ];

      mockLoadSection.mockResolvedValue({ content: "relevance prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        relevantSources: [
          { url: "https://example.com/1", relevanceScore: 0.85, jurisdictionMatch: "direct", reasoning: "relevant" },
          { url: "https://example.com/2", relevanceScore: 0.2, jurisdictionMatch: "direct", reasoning: "not relevant" },
        ],
      });

      const result = await classifyRelevance(claim, searchResults, {} as any, "2026-03-23");

      expect(result).toHaveLength(1);
      expect(result[0].url).toBe("https://example.com/1");
    });
  });

  describe("extractResearchEvidence", () => {
    it("should extract evidence items from sources", async () => {
      const claim = { id: "AC_01", statement: "Test claim" } as any;
      const sources = [{ url: "https://example.com/1", title: "Source 1", text: "text" }];

      mockLoadSection.mockResolvedValue({ content: "extraction prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        evidenceItems: [
          {
            statement: "extracted evidence",
            category: "factual",
            claimDirection: "supports",
            evidenceScope: { methodology: "Study", temporal: "2024" },
            probativeValue: "high",
            relevantClaimIds: ["AC_01"],
          },
        ],
      });

      const result = await extractResearchEvidence(claim, sources, {} as any, "2026-03-23");

      expect(result).toHaveLength(1);
      expect(result[0].statement).toBe("extracted evidence");
      expect(result[0].relevantClaimIds).toEqual(["AC_01"]);
    });
  });

  describe("assessEvidenceApplicability", () => {
    it("should classify evidence applicability", async () => {
      const claims = [{ id: "AC_01", statement: "Test" }] as any[];
      const evidence = [{ id: "EV_01", statement: "stmt", sourceUrl: "url", sourceTitle: "title", category: "factual" }] as any[];

      mockLoadSection.mockResolvedValue({ content: "applicability prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        assessments: [{ evidenceIndex: 0, applicability: "direct", reasoning: "ok" }],
      });

      const result = await assessEvidenceApplicability(claims, evidence, "US", {} as any);

      expect(result).toHaveLength(1);
      expect(result[0].applicability).toBe("direct");
    });
  });

  describe("assessScopeQuality", () => {
    it("should return 'complete' for well-populated scope", () => {
      const item = {
        evidenceScope: {
          methodology: "Standard analysis",
          temporal: "2024 data",
        },
      } as any;
      expect(assessScopeQuality(item)).toBe("complete");
    });

    it("should return 'incomplete' when methodology is missing", () => {
      const item = {
        evidenceScope: {
          temporal: "2024",
        },
      } as any;
      expect(assessScopeQuality(item)).toBe("incomplete");
    });
  });

  describe("assessEvidenceBalance", () => {
    it("should compute balanced ratio for even split", () => {
      const items = [
        { claimDirection: "supports" },
        { claimDirection: "contradicts" },
      ] as any[];
      const metrics = assessEvidenceBalance(items);
      expect(metrics.supporting).toBe(1);
      expect(metrics.contradicting).toBe(1);
      expect(metrics.balanceRatio).toBe(0.5);
      expect(metrics.isSkewed).toBe(false);
    });
  });
});
