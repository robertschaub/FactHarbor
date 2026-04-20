import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  classifyRelevance,
  extractResearchEvidence,
  assessEvidenceApplicability,
  assessScopeQuality,
  assessEvidenceBalance,
  applyPerSourceCap,
} from "@/lib/analyzer/research-extraction-stage";
import {
  loadAndRenderSection,
} from "@/lib/analyzer/prompt-loader";
import { debugLog, debugLogFileOnly } from "@/lib/analyzer/debug";
import {
  getModelForTask,
  extractStructuredOutput
} from "@/lib/analyzer/llm";
import { generateText } from "ai";
import { mapCategory } from "@/lib/analyzer/pipeline-utils";

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

vi.mock("@/lib/analyzer/debug", () => ({
  debugLog: vi.fn(),
  debugLogFileOnly: vi.fn(),
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
const mockDebugLog = vi.mocked(debugLog);
const mockDebugLogFileOnly = vi.mocked(debugLogFileOnly);
const mockMapCategory = vi.mocked(mapCategory);

// ============================================================================
// HELPERS
// ============================================================================

function createClaim(overrides: Record<string, unknown> = {}) {
  return { id: "AC_01", statement: "Test claim", ...overrides } as any;
}

function createEvidence(overrides: Record<string, unknown> = {}) {
  return {
    id: "EV_01",
    statement: "Evidence statement.",
    category: "direct_evidence",
    specificity: "high",
    sourceId: "S1",
    sourceUrl: "https://example.com/source",
    sourceTitle: "Example Source",
    sourceExcerpt: "Excerpt.",
    claimDirection: "supports",
    probativeValue: "high",
    evidenceScope: { name: "STD", methodology: "standard analysis", temporal: "2020-2025" },
    relevantClaimIds: ["AC_01"],
    ...overrides,
  } as any;
}

describe("Research Extraction Stage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMapCategory.mockImplementation((category) => category as any);
  });

  // ============================================================================
  // classifyRelevance
  // ============================================================================

  describe("classifyRelevance", () => {
    const mockConfig = {} as any;

    it("should classify search results via LLM and filter by score", async () => {
      const claim = createClaim({ statement: "Test claim" });
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

      const result = await classifyRelevance(claim, searchResults, mockConfig, "2026-03-23");

      expect(result).toHaveLength(1);
      expect(result[0].url).toBe("https://example.com/1");
    });

    it("should accept all results with neutral score when prompt is missing", async () => {
      const claim = createClaim();
      const searchResults = [
        { url: "https://example.com/1", title: "Source 1", snippet: "text" },
      ];
      mockLoadSection.mockResolvedValue(null as any);

      const result = await classifyRelevance(claim, searchResults, mockConfig, "2026-03-23");

      expect(result).toHaveLength(1);
      expect(result[0].relevanceScore).toBe(0.5);
    });

    it("should cap foreign_reaction scores below the 0.4 threshold", async () => {
      const claim = createClaim({ statement: "Country A courts followed due process" });
      const searchResults = [
        { url: "https://example.com/domestic", title: "Domestic Court Ruling", snippet: "relevant" },
        { url: "https://example.com/sanctions", title: "Foreign Sanctions", snippet: "sanctions" },
        { url: "https://example.com/ngo", title: "International NGO Report", snippet: "report" },
      ];

      mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        relevantSources: [
          { url: "https://example.com/domestic", relevanceScore: 0.85, jurisdictionMatch: "direct", reasoning: "domestic court" },
          { url: "https://example.com/sanctions", relevanceScore: 0.75, jurisdictionMatch: "foreign_reaction", reasoning: "foreign sanctions" },
          { url: "https://example.com/ngo", relevanceScore: 0.7, jurisdictionMatch: "contextual", reasoning: "NGO analysis" },
        ],
      });

      const result = await classifyRelevance(claim, searchResults, mockConfig, "2026-03-23", "BR");

      // domestic and NGO pass; sanctions (foreign_reaction, capped to 0.35) filtered out
      expect(result).toHaveLength(2);
      expect(result.map(r => r.url)).toContain("https://example.com/domestic");
      expect(result.map(r => r.url)).toContain("https://example.com/ngo");
      expect(result.map(r => r.url)).not.toContain("https://example.com/sanctions");
    });

    it("should pass inferredGeography to the prompt template", async () => {
      const claim = createClaim({ statement: "Test" });
      mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        relevantSources: [
          { url: "https://example.com/1", relevanceScore: 0.8, jurisdictionMatch: "direct", reasoning: "ok" },
        ],
      });

      await classifyRelevance(claim, [{ url: "https://example.com/1", title: "T", snippet: "s" }], mockConfig, "2026-03-23", "DE");

      const renderCall = mockLoadSection.mock.calls.find(
        ([, section]) => section === "RELEVANCE_CLASSIFICATION"
      );
      expect(renderCall).toBeDefined();
      expect(renderCall![2]).toMatchObject({ inferredGeography: "DE" });
    });

    it("should pass multi-jurisdiction context to the prompt template", async () => {
      const claim = createClaim({ statement: "Test" });
      mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        relevantSources: [
          { url: "https://example.com/1", relevanceScore: 0.8, jurisdictionMatch: "direct", reasoning: "ok" },
        ],
      });

      await classifyRelevance(
        claim,
        [{ url: "https://example.com/1", title: "T", snippet: "s" }],
        mockConfig,
        "2026-03-23",
        "CH",
        ["CH", "DE"],
      );

      const renderCall = mockLoadSection.mock.calls.find(
        ([, section]) => section === "RELEVANCE_CLASSIFICATION"
      );
      expect(renderCall).toBeDefined();
      expect(renderCall![2]).toMatchObject({
        inferredGeography: "null",
        relevantGeographies: JSON.stringify(["CH", "DE"], null, 2),
      });
    });

    it("should use 'null' as inferredGeography when not provided (backwards compat)", async () => {
      const claim = createClaim({ statement: "Test" });
      mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        relevantSources: [
          { url: "https://example.com/1", relevanceScore: 0.8, jurisdictionMatch: "direct", reasoning: "ok" },
        ],
      });

      await classifyRelevance(claim, [{ url: "https://example.com/1", title: "T", snippet: "s" }], mockConfig, "2026-03-23");

      const renderCall = mockLoadSection.mock.calls.find(
        ([, section]) => section === "RELEVANCE_CLASSIFICATION"
      );
      expect(renderCall![2]).toMatchObject({ inferredGeography: "null" });
    });

    it("should pass claim freshnessRequirement to the prompt template", async () => {
      const claim = createClaim({
        statement: "Test",
        freshnessRequirement: "current_snapshot",
      });
      mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        relevantSources: [
          { url: "https://example.com/1", relevanceScore: 0.8, jurisdictionMatch: "direct", reasoning: "ok" },
        ],
      });

      await classifyRelevance(
        claim,
        [{ url: "https://example.com/1", title: "T", snippet: "s" }],
        mockConfig,
        "2026-03-23",
      );

      const renderCall = mockLoadSection.mock.calls.find(
        ([, section]) => section === "RELEVANCE_CLASSIFICATION",
      );
      expect(renderCall).toBeDefined();
      expect(renderCall![2]).toMatchObject({ freshnessRequirement: "current_snapshot" });
    });

    it("should respect foreignJurisdictionRelevanceCap from UCM config", async () => {
      const claim = createClaim({ statement: "Country A" });
      const searchResults = [
        { url: "https://example.com/foreign", title: "Foreign Gov Action", snippet: "sanctions" },
      ];

      // Set a higher cap (0.5) so foreign_reaction passes the 0.4 threshold
      const configWithHighCap = { foreignJurisdictionRelevanceCap: 0.5 } as any;

      mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        relevantSources: [
          { url: "https://example.com/foreign", relevanceScore: 0.9, jurisdictionMatch: "foreign_reaction", reasoning: "sanctions" },
        ],
      });

      const result = await classifyRelevance(claim, searchResults, configWithHighCap, "2026-03-23", "BR");

      // With cap at 0.5, score is capped to 0.5 which is >= 0.4 — passes
      expect(result).toHaveLength(1);
      expect(result[0].url).toBe("https://example.com/foreign");
    });

    it("should include originalRank from search results array order", async () => {
      const claim = createClaim({ statement: "Country A courts followed due process" });
      const searchResults = [
        { url: "https://example.com/first", title: "First", snippet: "first" },
        { url: "https://example.com/second", title: "Second", snippet: "second" },
        { url: "https://example.com/third", title: "Third", snippet: "third" },
      ];

      mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      // LLM returns items in a different order than search results
      mockExtractOutput.mockReturnValue({
        relevantSources: [
          { url: "https://example.com/third", relevanceScore: 0.9, jurisdictionMatch: "direct", reasoning: "ok" },
          { url: "https://example.com/first", relevanceScore: 0.8, jurisdictionMatch: "direct", reasoning: "ok" },
          { url: "https://example.com/second", relevanceScore: 0.7, jurisdictionMatch: "contextual", reasoning: "ok" },
        ],
      });

      const result = await classifyRelevance(claim, searchResults, mockConfig, "2026-03-23", "BR");

      expect(result).toHaveLength(3);
      const byUrl = new Map(result.map(r => [r.url, r.originalRank]));
      expect(byUrl.get("https://example.com/first")).toBe(0);
      expect(byUrl.get("https://example.com/second")).toBe(1);
      expect(byUrl.get("https://example.com/third")).toBe(2);
    });

    it("should expose raw and adjusted scores for foreign_reaction items (diagnostics)", async () => {
      const claim = createClaim({ statement: "Country A courts followed due process" });
      const searchResults = [
        { url: "https://example.com/domestic", title: "Domestic Court", snippet: "court ruling" },
        { url: "https://example.com/pbs", title: "PBS News: Country A sentencing", snippet: "sentenced" },
        { url: "https://example.com/sanctions", title: "Foreign Gov Sanctions", snippet: "sanctions" },
      ];

      mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        relevantSources: [
          { url: "https://example.com/domestic", relevanceScore: 0.9, jurisdictionMatch: "direct", reasoning: "domestic court ruling" },
          { url: "https://example.com/pbs", relevanceScore: 0.8, jurisdictionMatch: "contextual", reasoning: "foreign media reporting domestic proceedings" },
          { url: "https://example.com/sanctions", relevanceScore: 0.75, jurisdictionMatch: "foreign_reaction", reasoning: "foreign government sanctions" },
        ],
      });

      const result = await classifyRelevance(claim, searchResults, mockConfig, "2026-03-23", "BR");

      // domestic (direct, 0.9) and PBS (contextual, 0.8) pass; sanctions (foreign_reaction, capped to 0.35) filtered
      expect(result).toHaveLength(2);
      expect(result.map(r => r.url)).toContain("https://example.com/domestic");
      expect(result.map(r => r.url)).toContain("https://example.com/pbs");
      expect(result.map(r => r.url)).not.toContain("https://example.com/sanctions");

      // PBS (contextual foreign media) must NOT be capped
      const pbs = result.find(r => r.url === "https://example.com/pbs");
      expect(pbs!.relevanceScore).toBe(0.8);
    });

    it("should correctly classify: foreign media + domestic proceedings = contextual, not capped", async () => {
      const claim = createClaim({ statement: "Country A courts followed due process" });
      const searchResults = [
        { url: "https://pbs.org/newshour/world/country-a-sentenced", title: "Country A sentences leader", snippet: "The Supreme Court sentenced..." },
      ];

      mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        relevantSources: [
          { url: "https://pbs.org/newshour/world/country-a-sentenced", relevanceScore: 0.85, jurisdictionMatch: "contextual", reasoning: "Foreign media reporting domestic court sentencing" },
        ],
      });

      const result = await classifyRelevance(claim, searchResults, mockConfig, "2026-03-23", "BR");

      expect(result).toHaveLength(1);
      expect(result[0].relevanceScore).toBe(0.85); // NOT capped
      expect(result[0].originalRank).toBe(0);
    });

    it("should correctly classify: foreign media + foreign sanctions = foreign_reaction, capped", async () => {
      const claim = createClaim({ statement: "Country A courts followed due process" });
      const searchResults = [
        { url: "https://reuters.com/us-sanctions-country-a", title: "US imposes sanctions", snippet: "The State Department announced..." },
      ];

      mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        relevantSources: [
          { url: "https://reuters.com/us-sanctions-country-a", relevanceScore: 0.8, jurisdictionMatch: "foreign_reaction", reasoning: "Foreign sanctions" },
        ],
      });

      const result = await classifyRelevance(claim, searchResults, mockConfig, "2026-03-23", "BR");

      // foreign_reaction capped to 0.35 < 0.4 threshold — filtered out
      expect(result).toHaveLength(0);
    });
  });

  // ============================================================================
  // extractResearchEvidence
  // ============================================================================

  describe("extractResearchEvidence", () => {
    const mockConfig = {} as any;

    it("should extract evidence items from sources", async () => {
      const claim = createClaim({ id: "AC_01", statement: "Test claim" });
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

      const result = await extractResearchEvidence(claim, sources, mockConfig, "2026-03-23");

      expect(result).toHaveLength(1);
      expect(result[0].statement).toBe("extracted evidence");
      expect(result[0].relevantClaimIds).toEqual(["AC_01"]);
    });

    it("should extract evidence items with full EvidenceScope", async () => {
      const claim = createClaim({ id: "AC_01", statement: "Test claim" });
      const sources = [
        { url: "https://example.com/1", title: "Source 1", text: "Long text content..." },
      ];

      mockLoadSection.mockResolvedValue({ content: "extract prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        evidenceItems: [
          {
            statement: "Statistical data shows X increased by 30%",
            category: "statistic",
            claimDirection: "supports",
            evidenceScope: {
              methodology: "Government statistical survey",
              temporal: "2023-2024",
              geographic: "United States",
            },
            probativeValue: "high",
            sourceType: "government_report",
            isDerivative: false,
            derivedFromSourceUrl: null,
            relevantClaimIds: ["AC_01"],
          },
        ],
      });

      const result = await extractResearchEvidence(claim, sources, mockConfig, "2026-03-23");

      expect(result).toHaveLength(1);
      expect(result[0].statement).toBe("Statistical data shows X increased by 30%");
      expect(result[0].evidenceScope?.methodology).toBe("Government statistical survey");
      expect(result[0].evidenceScope?.temporal).toBe("2023-2024");
      expect(result[0].sourceType).toBe("government_report");
      expect(result[0].relevantClaimIds).toEqual(["AC_01"]);
      expect(result[0].isDerivative).toBe(false);
      expect(result[0].probativeValue).toBe("high");
    });

    it("should always use targetClaim.id for relevantClaimIds regardless of LLM output", async () => {
      const claim = createClaim({ id: "AC_02" });
      const sources = [{ url: "https://example.com/1", title: "S1", text: "text" }];

      mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        evidenceItems: [
          {
            statement: "Evidence with empty IDs",
            category: "evidence",
            claimDirection: "supports",
            evidenceScope: { methodology: "Study", temporal: "2024" },
            probativeValue: "medium",
            relevantClaimIds: [],
          },
        ],
      });

      const result = await extractResearchEvidence(claim, sources, mockConfig, "2026-03-23");

      expect(result[0].relevantClaimIds).toEqual(["AC_02"]);
    });

    it("should override wrong-format LLM claim IDs with targetClaim.id", async () => {
      const claim = createClaim({ id: "AC_01" });
      const sources = [{ url: "https://example.com/1", title: "S1", text: "text" }];

      mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        evidenceItems: [
          {
            statement: "Evidence with wrong claim ID format",
            category: "evidence",
            claimDirection: "supports",
            evidenceScope: { methodology: "Analysis", temporal: "2025" },
            probativeValue: "high",
            relevantClaimIds: ["claim_01"],
          },
          {
            statement: "Evidence with different wrong format",
            category: "evidence",
            claimDirection: "contextual",
            evidenceScope: { methodology: "Report review", temporal: "2025" },
            probativeValue: "medium",
            relevantClaimIds: ["claim_001"],
          },
        ],
      });

      const result = await extractResearchEvidence(claim, sources, mockConfig, "2026-03-23");

      expect(result).toHaveLength(2);
      expect(result[0].relevantClaimIds).toEqual(["AC_01"]);
      expect(result[1].relevantClaimIds).toEqual(["AC_01"]);
    });

    it("should return empty array when prompt is missing", async () => {
      const claim = createClaim();
      mockLoadSection.mockResolvedValue(null as any);

      const result = await extractResearchEvidence(claim, [], mockConfig, "2026-03-23");
      expect(result).toHaveLength(0);
    });

    it("should normalize non-canonical sourceType via mapSourceType", async () => {
      const claim = createClaim({ id: "AC_03", statement: "Test claim" });
      const sources = [
        { url: "https://example.com/1", title: "Source 1", text: "Long text content..." },
      ];

      mockLoadSection.mockResolvedValue({ content: "extract prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        evidenceItems: [
          {
            statement: "Evidence from non-canonical source type",
            category: "evidence",
            claimDirection: "supports",
            evidenceScope: { methodology: "Document analysis", temporal: "2024" },
            probativeValue: "medium",
            sourceType: "official_government_portal",
            isDerivative: false,
            derivedFromSourceUrl: null,
            relevantClaimIds: ["AC_03"],
          },
        ],
      });

      const result = await extractResearchEvidence(claim, sources, mockConfig, "2026-03-23");

      expect(result).toHaveLength(1);
      // mapSourceType mock returns identity — in production, non-canonical types are normalized
      expect(result[0].sourceType).toBeDefined();
    });

    it("should match sourceUrl to the correct source when LLM provides it", async () => {
      const claim = createClaim({ id: "AC_01" });
      const sources = [
        { url: "https://example.com/1", title: "Source 1", text: "text" },
        { url: "https://example.com/2", title: "Source 2", text: "text" },
      ];

      mockLoadSection.mockResolvedValue({ content: "extract prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        evidenceItems: [
          {
            statement: "Evidence from second source",
            category: "evidence",
            claimDirection: "supports",
            evidenceScope: { methodology: "Analysis", temporal: "2025" },
            probativeValue: "high",
            sourceType: "news_primary",
            sourceUrl: "https://example.com/2",
            relevantClaimIds: ["AC_01"],
          },
        ],
      });

      const result = await extractResearchEvidence(claim, sources as any, mockConfig, "2026-03-23");

      expect(result).toHaveLength(1);
      expect(result[0].sourceUrl).toBe("https://example.com/2");
      // sourceId is empty at extraction time; backfillMissingSourceIds populates it later
      expect(result[0].sourceId).toBe("");
    });

    it("should log structured extraction normalizations with honest counter semantics", async () => {
      const claim = createClaim({ id: "AC_01", statement: "Test claim" });
      const sources = [
        { url: "https://example.com/1", title: "Source 1", text: "text" },
        { url: "https://example.com/2", title: "Source 2", text: "text" },
      ];

      mockMapCategory.mockImplementation((category) => {
        const normalized = String(category).toLowerCase().replace(/[_\s-]+/g, "_");
        if (normalized === "expert_testimony") return "expert_quote" as any;
        if (normalized === "case_study") return "evidence" as any;
        if (normalized === "made_up_category") return "evidence" as any;
        return normalized as any;
      });

      mockLoadSection.mockResolvedValue({ content: "extract prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        evidenceItems: [
          {
            statement: "Alias category with missing source and contextual direction",
            category: "expert_testimony",
            claimDirection: "contextual",
            evidenceScope: { methodology: "Analysis", temporal: "2025" },
            probativeValue: "medium",
            relevantClaimIds: ["claim_01"],
          },
          {
            statement: "Unknown category with unmatched source",
            category: "made_up_category",
            claimDirection: "supports",
            evidenceScope: { methodology: "Analysis", temporal: "2025" },
            probativeValue: "high",
            sourceUrl: "https://example.com/missing",
            relevantClaimIds: ["AC_01"],
          },
          {
            statement: "Known alias to evidence with missing source",
            category: "case_study",
            claimDirection: "supports",
            evidenceScope: { methodology: "Analysis", temporal: "2025" },
            probativeValue: "low",
            relevantClaimIds: ["AC_01"],
          },
        ],
      });

      const result = await extractResearchEvidence(claim, sources as any, mockConfig, "2026-03-23");

      expect(result).toHaveLength(3);
      expect(result[0].claimDirection).toBe("neutral");
      expect(result[0].sourceUrl).toBe("https://example.com/1");
      expect(result[1].sourceUrl).toBe("https://example.com/1");
      expect(result[2].category).toBe("evidence");
      expect(mockDebugLogFileOnly).toHaveBeenCalledWith(
        "[Stage2] Extraction normalizations for AC_01",
        {
          claimIdMismatches: 1,
          categoryNormalizations: 3,
          categoryFallbackToEvidence: 1,
          missingSourceUrlAssignments: 2,
          unmatchedSourceUrlFallbacks: 1,
          contextualMappedToNeutral: 1,
        },
      );
      expect(mockDebugLog).not.toHaveBeenCalledWith(
        "[Stage2] Extraction normalizations for AC_01",
        expect.anything(),
      );
    });
  });

  // ============================================================================
  // assessEvidenceApplicability
  // ============================================================================

  describe("assessEvidenceApplicability", () => {
    const mockConfig = {} as any;

    it("should classify evidence and populate applicability field", async () => {
      const claims = [createClaim({ statement: "Country A courts followed due process" })];
      const evidence = [
        createEvidence({ id: "EV_01", statement: "Domestic ruling", sourceUrl: "https://example.com/domestic", sourceTitle: "Domestic Court" }),
        createEvidence({ id: "EV_02", statement: "Foreign sanctions", sourceUrl: "https://example.com/sanctions", sourceTitle: "Treasury" }),
        createEvidence({ id: "EV_03", statement: "NGO report", sourceUrl: "https://example.com/ngo", sourceTitle: "NGO" }),
      ];

      mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        assessments: [
          { evidenceIndex: 0, applicability: "direct", reasoning: "domestic court ruling" },
          { evidenceIndex: 1, applicability: "foreign_reaction", reasoning: "foreign sanctions" },
          { evidenceIndex: 2, applicability: "contextual", reasoning: "international NGO" },
        ],
      });

      const result = await assessEvidenceApplicability(claims, evidence, "BR", mockConfig);

      expect(result).toHaveLength(3);
      expect(result[0].applicability).toBe("direct");
      expect(result[1].applicability).toBe("foreign_reaction");
      expect(result[2].applicability).toBe("contextual");
    });

    it("should skip assessment when inferredGeography is null", async () => {
      const claims = [createClaim({ statement: "Generic claim" })];
      const evidence = [createEvidence({ id: "EV_01" })];

      const result = await assessEvidenceApplicability(claims, evidence, null, mockConfig);

      expect(result).toHaveLength(1);
      expect(result[0].applicability).toBeUndefined();
      expect(mockGenerateText).not.toHaveBeenCalled();
    });

    it("should skip assessment when applicabilityFilterEnabled is false", async () => {
      const claims = [createClaim({ statement: "Test" })];
      const evidence = [createEvidence({ id: "EV_01" })];
      const disabledConfig = { applicabilityFilterEnabled: false } as any;

      const result = await assessEvidenceApplicability(claims, evidence, "BR", disabledConfig);

      expect(result).toHaveLength(1);
      expect(mockGenerateText).not.toHaveBeenCalled();
    });

    it("should default unclassified items to 'direct' (fail-open for missing indices)", async () => {
      const claims = [createClaim({ statement: "Test" })];
      const evidence = [
        createEvidence({ id: "EV_01" }),
        createEvidence({ id: "EV_02" }),
      ];

      mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      // LLM only returns assessment for index 0
      mockExtractOutput.mockReturnValue({
        assessments: [
          { evidenceIndex: 0, applicability: "contextual", reasoning: "external observer" },
        ],
      });

      const result = await assessEvidenceApplicability(claims, evidence, "BR", mockConfig);

      expect(result).toHaveLength(2);
      expect(result[0].applicability).toBe("contextual");
      expect(result[1].applicability).toBe("direct"); // default for missing
    });

    it("should fail-open on LLM error — keeps all evidence without applicability", async () => {
      const claims = [createClaim({ statement: "Test" })];
      const evidence = [createEvidence({ id: "EV_01" })];

      mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
      mockGenerateText.mockRejectedValue(new Error("LLM timeout"));

      const result = await assessEvidenceApplicability(claims, evidence, "BR", mockConfig);

      expect(result).toHaveLength(1);
      expect(result[0].applicability).toBeUndefined();
    });

    it("should pass inferredGeography and claims to the prompt template", async () => {
      const claims = [createClaim({ id: "AC_01", statement: "Country A courts" })];
      const evidence = [createEvidence({ id: "EV_01", sourceUrl: "https://example.com/source" })];

      mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        assessments: [{ evidenceIndex: 0, applicability: "direct", reasoning: "ok" }],
      });

      await assessEvidenceApplicability(claims, evidence, "BR", mockConfig);

      const renderCall = mockLoadSection.mock.calls.find(
        ([, section]) => section === "APPLICABILITY_ASSESSMENT"
      );
      expect(renderCall).toBeDefined();
      expect(renderCall![2]).toMatchObject({ inferredGeography: "BR" });
      const claimsArg = renderCall![2].claims;
      expect(claimsArg).toContain("AC_01");
      expect(claimsArg).toContain("Country A courts");
    });

    it("should pass the union of relevant geographies to the applicability prompt", async () => {
      const claims = [
        createClaim({ id: "AC_01", statement: "Country A courts", relevantGeographies: ["CH"] }),
        createClaim({ id: "AC_02", statement: "Country B institutions", relevantGeographies: ["DE"] }),
      ];
      const evidence = [createEvidence({ id: "EV_01", sourceUrl: "https://example.com/source" })];

      mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        assessments: [{ evidenceIndex: 0, applicability: "contextual", reasoning: "comparative evidence" }],
      });

      await assessEvidenceApplicability(claims, evidence, "CH", mockConfig, ["CH", "DE"]);

      const renderCall = mockLoadSection.mock.calls.find(
        ([, section]) => section === "APPLICABILITY_ASSESSMENT"
      );
      expect(renderCall).toBeDefined();
      expect(renderCall![2]).toMatchObject({
        inferredGeography: "null",
        relevantGeographies: JSON.stringify(["CH", "DE"], null, 2),
      });
    });

    it("should handle empty evidence array", async () => {
      const claims = [createClaim({ statement: "Test" })];

      const result = await assessEvidenceApplicability(claims, [], "BR", mockConfig);

      expect(result).toHaveLength(0);
      expect(mockGenerateText).not.toHaveBeenCalled();
    });
  });

  // ============================================================================
  // assessScopeQuality
  // ============================================================================

  describe("assessScopeQuality", () => {
    it("should return 'complete' for well-populated scope", () => {
      const item = {
        evidenceScope: {
          methodology: "ISO 14040 lifecycle assessment",
          temporal: "2019-2023 data",
        },
      } as any;
      expect(assessScopeQuality(item)).toBe("complete");
    });

    it("should return 'partial' for vague scope fields", () => {
      const item = {
        evidenceScope: {
          methodology: "n/a",
          temporal: "2024",
        },
      } as any;
      expect(assessScopeQuality(item)).toBe("partial");
    });

    it("should return 'incomplete' when methodology is missing", () => {
      const item = {
        evidenceScope: {
          temporal: "2024",
        },
      } as any;
      expect(assessScopeQuality(item)).toBe("incomplete");
    });

    it("should return 'incomplete' when temporal is missing", () => {
      const item = {
        evidenceScope: {
          methodology: "Study method",
        },
      } as any;
      expect(assessScopeQuality(item)).toBe("incomplete");
    });

    it("should return 'incomplete' when evidenceScope is undefined", () => {
      const item = {} as any;
      expect(assessScopeQuality(item)).toBe("incomplete");
    });

    it("should return 'incomplete' for empty string fields", () => {
      const item = {
        evidenceScope: {
          methodology: "",
          temporal: "2024",
        },
      } as any;
      expect(assessScopeQuality(item)).toBe("incomplete");
    });
  });

  // ============================================================================
  // assessEvidenceBalance
  // ============================================================================

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

    it("should return NaN ratio for empty pool", () => {
      const metrics = assessEvidenceBalance([]);
      expect(metrics.supporting).toBe(0);
      expect(metrics.contradicting).toBe(0);
      expect(metrics.total).toBe(0);
      expect(metrics.balanceRatio).toBeNaN();
      expect(metrics.isSkewed).toBe(false);
    });

    it("should count neutral items separately", () => {
      const items = [
        { claimDirection: "supports" },
        { claimDirection: "neutral" },
        { claimDirection: "contradicts" },
        { claimDirection: "neutral" },
      ] as any[];
      const metrics = assessEvidenceBalance(items);
      expect(metrics.supporting).toBe(1);
      expect(metrics.contradicting).toBe(1);
      expect(metrics.neutral).toBe(2);
      expect(metrics.total).toBe(4);
    });

    it("should detect skewed pool when majority exceeds threshold", () => {
      const items = [
        { claimDirection: "supports" },
        { claimDirection: "supports" },
        { claimDirection: "supports" },
        { claimDirection: "supports" },
        { claimDirection: "contradicts" },
      ] as any[];
      const metrics = assessEvidenceBalance(items, 0.7);
      expect(metrics.supporting).toBe(4);
      expect(metrics.contradicting).toBe(1);
      expect(metrics.balanceRatio).toBe(0.8);
      expect(metrics.isSkewed).toBe(true);
    });

    it("should not flag skew when below minDirectional", () => {
      const items = [
        { claimDirection: "supports" },
        { claimDirection: "supports" },
      ] as any[];
      // 2 directional items < default minDirectional (3)
      const metrics = assessEvidenceBalance(items);
      expect(metrics.isSkewed).toBe(false);
    });
  });

  // ============================================================================
  // applyPerSourceCap (Fix 2 — single-source flooding mitigation)
  // ============================================================================

  describe("applyPerSourceCap", () => {
    it("should pass through items when all sources are within cap", () => {
      const items = [
        createEvidence({ id: "EV_01", sourceUrl: "https://a.com/1" }),
        createEvidence({ id: "EV_02", sourceUrl: "https://b.com/1" }),
        createEvidence({ id: "EV_03", sourceUrl: "https://c.com/1" }),
      ];
      const { kept, capped, evictedIds } = applyPerSourceCap(items, [], 5);
      expect(kept).toHaveLength(3);
      expect(capped).toBe(0);
      expect(evictedIds).toHaveLength(0);
    });

    it("should cap items from a single source exceeding the limit", () => {
      const items = Array.from({ length: 8 }, (_, i) =>
        createEvidence({ id: `EV_${i}`, sourceUrl: "https://verbose.org/article", probativeValue: "high" }),
      );
      const { kept, capped, evictedIds } = applyPerSourceCap(items, [], 5);
      expect(kept).toHaveLength(5);
      expect(capped).toBe(3);
      expect(evictedIds).toHaveLength(0);
    });

    it("should keep highest probativeValue items when capping", () => {
      const items = [
        createEvidence({ id: "EV_H1", sourceUrl: "https://a.com/1", probativeValue: "high" }),
        createEvidence({ id: "EV_L1", sourceUrl: "https://a.com/1", probativeValue: "low" }),
        createEvidence({ id: "EV_M1", sourceUrl: "https://a.com/1", probativeValue: "medium" }),
        createEvidence({ id: "EV_H2", sourceUrl: "https://a.com/1", probativeValue: "high" }),
        createEvidence({ id: "EV_L2", sourceUrl: "https://a.com/1", probativeValue: "low" }),
      ];
      const { kept, capped } = applyPerSourceCap(items, [], 3);
      expect(kept).toHaveLength(3);
      expect(capped).toBe(2);
      // Should keep: 2 high, 1 medium (sorted by probativeValue desc)
      const keptValues = kept.map((e: any) => e.probativeValue);
      expect(keptValues).toEqual(["high", "high", "medium"]);
    });

    it("should account for existing evidence and keep best-N across combined pool", () => {
      const existing = [
        createEvidence({ id: "EV_EXIST_1", sourceUrl: "https://a.com/1", probativeValue: "low" }),
        createEvidence({ id: "EV_EXIST_2", sourceUrl: "https://a.com/1", probativeValue: "low" }),
        createEvidence({ id: "EV_EXIST_3", sourceUrl: "https://a.com/1", probativeValue: "medium" }),
      ];
      const newItems = [
        createEvidence({ id: "EV_NEW_1", sourceUrl: "https://a.com/1", probativeValue: "high" }),
        createEvidence({ id: "EV_NEW_2", sourceUrl: "https://a.com/1", probativeValue: "high" }),
        createEvidence({ id: "EV_NEW_3", sourceUrl: "https://a.com/1", probativeValue: "low" }),
      ];
      // Cap=3: best-N should keep 2 high (new) + 1 medium (existing), evicting 2 existing low
      const { kept, capped, evictedIds } = applyPerSourceCap(newItems, existing, 3);
      expect(kept).toHaveLength(2); // 2 new high items retained
      expect(capped).toBe(1); // 1 new low item dropped
      expect(evictedIds).toHaveLength(2); // 2 existing low items evicted
      expect(evictedIds).toContain("EV_EXIST_1");
      expect(evictedIds).toContain("EV_EXIST_2");
    });

    it("should prefer existing items over new items at same probativeValue tier", () => {
      const existing = [
        createEvidence({ id: "EV_EXIST_1", sourceUrl: "https://a.com/1", probativeValue: "high" }),
        createEvidence({ id: "EV_EXIST_2", sourceUrl: "https://a.com/1", probativeValue: "high" }),
      ];
      const newItems = [
        createEvidence({ id: "EV_NEW_1", sourceUrl: "https://a.com/1", probativeValue: "high" }),
      ];
      // Cap=2: existing items should be preferred over new at same tier
      const { kept, capped, evictedIds } = applyPerSourceCap(newItems, existing, 2);
      expect(kept).toHaveLength(0); // new item dropped (existing preferred at same tier)
      expect(capped).toBe(1);
      expect(evictedIds).toHaveLength(0); // no evictions
    });

    it("should not cap items from different sources", () => {
      const items = [
        createEvidence({ id: "EV_A1", sourceUrl: "https://a.com/1" }),
        createEvidence({ id: "EV_A2", sourceUrl: "https://a.com/1" }),
        createEvidence({ id: "EV_B1", sourceUrl: "https://b.com/1" }),
        createEvidence({ id: "EV_B2", sourceUrl: "https://b.com/1" }),
        createEvidence({ id: "EV_C1", sourceUrl: "https://c.com/1" }),
      ];
      const { kept, capped, evictedIds } = applyPerSourceCap(items, [], 3);
      expect(kept).toHaveLength(5);
      expect(capped).toBe(0);
      expect(evictedIds).toHaveLength(0);
    });

    it("should evict weaker existing items when new high-quality item arrives", () => {
      const existing = Array.from({ length: 5 }, (_, i) =>
        createEvidence({ id: `EV_E${i}`, sourceUrl: "https://full.org/page", probativeValue: "low" }),
      );
      const newItems = [
        createEvidence({ id: "EV_NEW", sourceUrl: "https://full.org/page", probativeValue: "high" }),
      ];
      // Cap=5: new high should displace one existing low
      const { kept, capped, evictedIds } = applyPerSourceCap(newItems, existing, 5);
      expect(kept).toHaveLength(1);
      expect(kept[0].id).toBe("EV_NEW");
      expect(capped).toBe(0);
      expect(evictedIds).toHaveLength(1); // one existing low evicted
    });

    it("should return all items when maxPerSource is 0 (disabled)", () => {
      const items = Array.from({ length: 10 }, (_, i) =>
        createEvidence({ id: `EV_${i}`, sourceUrl: "https://same.org/page" }),
      );
      const { kept, capped, evictedIds } = applyPerSourceCap(items, [], 0);
      expect(kept).toHaveLength(10);
      expect(capped).toBe(0);
      expect(evictedIds).toHaveLength(0);
    });

    it("should handle empty new items gracefully", () => {
      const { kept, capped, evictedIds } = applyPerSourceCap([], [], 5);
      expect(kept).toHaveLength(0);
      expect(capped).toBe(0);
      expect(evictedIds).toHaveLength(0);
    });
  });

});
