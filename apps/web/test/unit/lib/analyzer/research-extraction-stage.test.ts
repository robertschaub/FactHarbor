import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import {
  classifyRelevance,
  extractResearchEvidence,
  assessEvidenceApplicability,
  ApplicabilityAssessmentOutputSchema,
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
  extractStructuredOutput,
  getPromptCachingOptions,
} from "@/lib/analyzer/llm";
import { recordLLMCall } from "@/lib/analyzer/metrics-integration";
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
  buildPromptRuntimeFields: vi.fn((rendered: any, options: any = {}) => ({
    promptProfile: options.promptProfile ?? rendered?.promptProfile,
    promptSection: options.promptSection ?? rendered?.promptSection,
    promptContentHash: options.promptContentHash ?? rendered?.contentHash,
    promptSectionHash: options.promptSectionHash ?? rendered?.promptSectionHash,
    renderedSystemChars: (options.renderedSystemContent ?? rendered?.content ?? "").length,
    renderedSystemEstimatedTokens: 1,
    dynamicPayloadChars: JSON.stringify(options.dynamicPayload ?? "")?.length ?? 0,
    dynamicPayloadEstimatedTokens: 1,
    retryCause: options.retryCause,
    retryBranch: options.retryBranch,
    outputBranch: options.outputBranch,
  })),
  classifyStructuralRetryCause: vi.fn(() => "unknown"),
  extractLLMUsageFields: vi.fn((usage: any = {}) => ({
    promptTokens: usage.inputTokens ?? 0,
    completionTokens: usage.outputTokens ?? 0,
    totalTokens: usage.totalTokens ?? 0,
    cacheReadInputTokens: usage.inputTokenDetails?.cacheReadTokens ?? 0,
    cacheCreationInputTokens: usage.inputTokenDetails?.cacheWriteTokens ?? 0,
  })),
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
const mockGetModelForTask = vi.mocked(getModelForTask);
const mockGetPromptCachingOptions = vi.mocked(getPromptCachingOptions);
const mockRecordLLMCall = vi.mocked(recordLLMCall);

const claimBoundaryPromptPath = path.resolve(
  __dirname,
  "../../../../prompts/claimboundary.prompt.md",
);

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

function extractPromptSection(content: string, sectionName: string): string {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((line) => line.trim() === `## ${sectionName}`);
  if (start < 0) {
    throw new Error(`Missing prompt section ${sectionName}`);
  }
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^## [A-Z][A-Z0-9_ ]+(?:\([^)]*\))?\s*$/.test(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start + 1, end).join("\n").trim();
}

function renderTemplate(content: string, variables: Record<string, string>): string {
  return content.replace(/\$\{(\w+)\}/g, (match, key) => variables[key] ?? match);
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

    it("passes expected evidence profile to the relevance prompt", async () => {
      const claim = createClaim({
        statement: "Reference-side comparison claim",
        expectedEvidenceProfile: {
          methodologies: ["source-native current-side route"],
          expectedMetrics: ["referenced-side metric", "comparator metric"],
          expectedSourceTypes: ["government_report"],
          primaryMetric: "comparison relation",
          componentMetrics: ["referenced-side anchor"],
          sourceNativeRoutes: ["publisher archive"],
        },
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
      const profile = JSON.parse(renderCall![2].expectedEvidenceProfile);
      expect(profile).toMatchObject({
        methodologies: ["source-native current-side route"],
        expectedMetrics: ["referenced-side metric", "comparator metric"],
        expectedSourceTypes: ["government_report"],
        primaryMetric: "comparison relation",
        componentMetrics: ["referenced-side anchor"],
        sourceNativeRoutes: ["publisher archive"],
      });
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

      mockLoadSection.mockResolvedValue({
        content: "extraction prompt",
        contentHash: "composite-hash",
        loadedAt: "2026-04-28T00:00:00.000Z",
        warnings: [],
        promptProfile: "claimboundary",
        promptSection: "EXTRACT_EVIDENCE",
        promptSectionHash: "section-hash",
        promptSectionEstimatedTokens: 11,
      });
      mockGenerateText.mockResolvedValue({
        text: "",
        usage: {
          inputTokens: 120,
          outputTokens: 30,
          totalTokens: 150,
          inputTokenDetails: {
            cacheReadTokens: 80,
            cacheWriteTokens: 40,
          },
        },
      } as any);
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
      expect(mockRecordLLMCall).toHaveBeenCalledWith(expect.objectContaining({
        promptProfile: "claimboundary",
        promptSection: "EXTRACT_EVIDENCE",
        promptContentHash: "composite-hash",
        promptSectionHash: "section-hash",
        renderedSystemChars: "extraction prompt".length,
        renderedSystemEstimatedTokens: expect.any(Number),
        dynamicPayloadChars: expect.any(Number),
        dynamicPayloadEstimatedTokens: expect.any(Number),
        cacheReadInputTokens: 80,
        cacheCreationInputTokens: 40,
        outputBranch: "initial",
      }));
    });

    it("keeps source payload out of the cache-controlled EXTRACT_EVIDENCE system message", async () => {
      const claim = createClaim({ id: "AC_01", statement: "Test claim" });
      const sourceText = "dynamic source payload that should not be cached as system content";
      const sources = [{ url: "https://example.com/1", title: "Source 1", text: sourceText }];
      const stableRules = "You are an evidence extraction engine.\n\n### Rules\n\n- Extract factual evidence.";

      mockLoadSection.mockResolvedValue({
        content: [
          stableRules,
          "",
          "### Input",
          "",
          "**Claim:**",
          "```",
          "Test claim",
          "```",
          "",
          "**Source Content:**",
          "```",
          sourceText,
          "```",
          "",
          "### Output Schema",
          "",
          "Return JSON.",
        ].join("\n"),
        contentHash: "composite-hash",
        loadedAt: "2026-04-28T00:00:00.000Z",
        warnings: [],
        promptProfile: "claimboundary",
        promptSection: "EXTRACT_EVIDENCE",
        promptSectionHash: "section-hash",
        promptSectionEstimatedTokens: 11,
      });
      mockGenerateText.mockResolvedValue({ text: "", usage: { inputTokens: 40, outputTokens: 10 } } as any);
      mockExtractOutput.mockReturnValue({ evidenceItems: [] });

      await extractResearchEvidence(claim, sources, mockConfig, "2026-03-23");

      const generateCall = mockGenerateText.mock.calls[0]?.[0] as any;
      expect(generateCall.messages[0]).toMatchObject({
        role: "system",
        content: stableRules,
      });
      expect(generateCall.messages[0].content).not.toContain(sourceText);
      expect(mockGetPromptCachingOptions).toHaveBeenCalledWith("anthropic");
      expect(generateCall.messages[1].role).toBe("user");
      expect(generateCall.messages[1].content).toContain(sourceText);
      expect(generateCall.messages[1].content).toContain("### Output Schema");

      expect(mockRecordLLMCall).toHaveBeenCalledWith(expect.objectContaining({
        renderedSystemChars: stableRules.length,
        dynamicPayloadChars: expect.any(Number),
        outputBranch: "initial",
      }));
    });

    it("does not enable prompt caching when EXTRACT_EVIDENCE cannot be split", async () => {
      const claim = createClaim({ id: "AC_01", statement: "Test claim" });
      const sourceText = "dynamic source payload";
      const unsplittableRenderedPrompt = `Rules without the expected delimiter\n\n${sourceText}`;
      const sources = [{ url: "https://example.com/1", title: "Source 1", text: sourceText }];

      mockLoadSection.mockResolvedValue({
        content: unsplittableRenderedPrompt,
        contentHash: "composite-hash",
        loadedAt: "2026-04-28T00:00:00.000Z",
        warnings: [],
        promptProfile: "claimboundary",
        promptSection: "EXTRACT_EVIDENCE",
        promptSectionHash: "section-hash",
        promptSectionEstimatedTokens: 11,
      });
      mockGenerateText.mockResolvedValue({ text: "", usage: { inputTokens: 40, outputTokens: 10 } } as any);
      mockExtractOutput.mockReturnValue({ evidenceItems: [] });

      await extractResearchEvidence(claim, sources, mockConfig, "2026-03-23");

      const generateCall = mockGenerateText.mock.calls[0]?.[0] as any;
      expect(generateCall.messages[0]).toMatchObject({
        role: "system",
        content: unsplittableRenderedPrompt,
      });
      expect(generateCall.messages[0].providerOptions).toBeUndefined();
      expect(mockGetPromptCachingOptions).not.toHaveBeenCalled();
      expect(generateCall.messages[1].content).toBe(
        'Extract evidence from these 1 sources relating to claim "AC_01": "Test claim"',
      );
    });

    it("splits the real EXTRACT_EVIDENCE prompt so sentinel source data is user-only", async () => {
      const promptContent = readFileSync(claimBoundaryPromptPath, "utf-8");
      const extractEvidenceSection = extractPromptSection(promptContent, "EXTRACT_EVIDENCE");
      const sentinelClaim = "SENTINEL_DYNAMIC_CLAIM_FOR_CACHE_TEST";
      const sentinelSource = [
        "SENTINEL_DYNAMIC_SOURCE_FOR_CACHE_TEST",
        "### Input",
        "```",
        "prompt-like fenced payload",
        "```",
      ].join("\n");
      const claim = createClaim({ id: "AC_01", statement: sentinelClaim });
      const sources = [{ url: "https://example.com/sentinel", title: "Sentinel Source", text: sentinelSource }];
      const renderedContent = renderTemplate(extractEvidenceSection, {
        claim: sentinelClaim,
        expectedEvidenceProfile: "{}",
        allClaims: JSON.stringify([{ id: "AC_01", statement: sentinelClaim, expectedEvidenceProfile: {} }], null, 2),
        sourceContent: `[Source 1: Sentinel Source]\nURL: https://example.com/sentinel\n${sentinelSource}`,
        sourceUrl: "https://example.com/sentinel",
      });

      mockLoadSection.mockResolvedValue({
        content: renderedContent,
        contentHash: "composite-hash",
        loadedAt: "2026-04-28T00:00:00.000Z",
        warnings: [],
        promptProfile: "claimboundary",
        promptSection: "EXTRACT_EVIDENCE",
        promptSectionHash: "section-hash",
        promptSectionEstimatedTokens: 11,
      });
      mockGenerateText.mockResolvedValue({ text: "", usage: { inputTokens: 40, outputTokens: 10 } } as any);
      mockExtractOutput.mockReturnValue({ evidenceItems: [] });

      await extractResearchEvidence(claim, sources, mockConfig, "2026-03-23");

      const generateCall = mockGenerateText.mock.calls[0]?.[0] as any;
      expect(generateCall.messages[0].role).toBe("system");
      expect(generateCall.messages[0].providerOptions).toEqual({});
      expect(generateCall.messages[0].content).toContain("You are an evidence extraction engine");
      expect(generateCall.messages[0].content).not.toContain(sentinelClaim);
      expect(generateCall.messages[0].content).not.toContain("SENTINEL_DYNAMIC_SOURCE_FOR_CACHE_TEST");
      expect(generateCall.messages[1].role).toBe("user");
      expect(generateCall.messages[1].content).toContain("### Input");
      expect(generateCall.messages[1].content).toContain("### Output Schema");
      expect(generateCall.messages[1].content).toContain(sentinelClaim);
      expect(generateCall.messages[1].content).toContain("SENTINEL_DYNAMIC_SOURCE_FOR_CACHE_TEST");
    });

    it("passes the expected evidence profile to the extraction prompt", async () => {
      const claim = createClaim({
        id: "AC_01",
        statement: "Entity A is close to benchmark B.",
        expectedEvidenceProfile: {
          methodologies: ["source-native comparator route"],
          expectedMetrics: ["current metric", "reference metric"],
          expectedSourceTypes: ["government_report"],
          primaryMetric: "current metric",
        },
      });
      const sources = [{ url: "https://example.com/1", title: "Source 1", text: "text" }];

      mockLoadSection.mockResolvedValue({ content: "extraction prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({ evidenceItems: [] });

      await extractResearchEvidence(claim, sources, mockConfig, "2026-03-23");

      const renderCall = mockLoadSection.mock.calls.find(
        ([, section]) => section === "EXTRACT_EVIDENCE",
      );
      expect(renderCall).toBeDefined();
      const profile = JSON.parse(renderCall![2].expectedEvidenceProfile);
      expect(profile).toMatchObject({
        methodologies: ["source-native comparator route"],
        expectedMetrics: ["current metric", "reference metric"],
        expectedSourceTypes: ["government_report"],
        primaryMetric: "current metric",
      });
      const allClaims = JSON.parse(renderCall![2].allClaims);
      expect(allClaims).toEqual([
        expect.objectContaining({
          id: "AC_01",
          statement: "Entity A is close to benchmark B.",
          expectedEvidenceProfile: expect.objectContaining({
            primaryMetric: "current metric",
          }),
        }),
      ]);
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
              analyticalDimension: "point-in-time stock total",
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
      expect(result[0].evidenceScope?.analyticalDimension).toBe("point-in-time stock total");
      expect(result[0].sourceType).toBe("government_report");
      expect(result[0].relevantClaimIds).toEqual(["AC_01"]);
      expect(result[0].isDerivative).toBe(false);
      expect(result[0].probativeValue).toBe("high");
    });

    it("should always include targetClaim.id for relevantClaimIds", async () => {
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

    it("should preserve valid companion claim IDs on contextual extraction output", async () => {
      const targetClaim = createClaim({ id: "AC_01", statement: "Current-side metric claim" });
      const companionClaim = createClaim({
        id: "AC_02",
        statement: "Comparison claim using the current-side metric",
        expectedEvidenceProfile: {
          expectedMetrics: ["current-side metric", "reference-side metric"],
        },
      });
      const sources = [{ url: "https://example.com/1", title: "S1", text: "text" }];

      mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        evidenceItems: [
          {
            statement: "Official source reports current-side metric.",
            category: "statistic",
            claimDirection: "contextual",
            evidenceScope: { methodology: "Official statistics", temporal: "current" },
            probativeValue: "high",
            relevantClaimIds: ["AC_02", "AC_UNKNOWN"],
          },
        ],
      });

      const result = await extractResearchEvidence(
        targetClaim,
        sources,
        mockConfig,
        "2026-03-23",
        [targetClaim, companionClaim],
      );

      expect(result[0].relevantClaimIds).toEqual(["AC_01", "AC_02"]);
      expect(result[0].claimDirection).toBe("neutral");
    });

    it("should preserve valid same-direction companion claim IDs on directional extraction output", async () => {
      const targetClaim = createClaim({
        id: "AC_01",
        statement: "Entity A's current metric M is about 100 units.",
      });
      const companionClaim = createClaim({
        id: "AC_02",
        statement: "Entity A's current metric M is about the same magnitude as reference metric N.",
        expectedEvidenceProfile: {
          primaryMetric: "approximate magnitude comparison",
          componentMetrics: ["Entity A current metric M", "reference metric N"],
        },
      });
      const sources = [{ url: "https://example.com/1", title: "S1", text: "text" }];

      mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        evidenceItems: [
          {
            statement: "Official source reports Entity A's current metric M at 100 units and reference metric N at 105 units.",
            category: "statistic",
            claimDirection: "supports",
            evidenceScope: { methodology: "Official statistics", temporal: "current" },
            probativeValue: "high",
            relevantClaimIds: ["AC_01", "AC_02"],
          },
        ],
      });

      const result = await extractResearchEvidence(
        targetClaim,
        sources,
        mockConfig,
        "2026-03-23",
        [targetClaim, companionClaim],
      );

      expect(result[0].claimDirection).toBe("supports");
      expect(result[0].relevantClaimIds).toEqual(["AC_01", "AC_02"]);
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
          directionalCompanionClaimRetained: 0,
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

    it("should require relevantClaimIds in structured applicability output", () => {
      expect(() => ApplicabilityAssessmentOutputSchema.parse({
        assessments: [
          { evidenceIndex: 0, applicability: "direct", reasoning: "missing mapping" },
        ],
      })).toThrow();
      expect(ApplicabilityAssessmentOutputSchema.parse({
        assessments: [
          { evidenceIndex: 0, applicability: "direct", relevantClaimIds: [], reasoning: "explicitly unmapped" },
        ],
      }).assessments[0].relevantClaimIds).toEqual([]);
      expect(ApplicabilityAssessmentOutputSchema.parse({
        assessments: [
          {
            evidenceIndex: 0,
            applicability: "direct",
            relevantClaimIds: ["AC_01"],
            claimDirectionByClaimId: [{ claimId: "AC_01", claimDirection: "supports" }],
            reasoning: "mapped with claim-local direction",
          },
        ],
      }).assessments[0].claimDirectionByClaimId).toEqual([
        { claimId: "AC_01", claimDirection: "supports" },
      ]);
    });

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
          { evidenceIndex: 0, applicability: "direct", relevantClaimIds: ["AC_01"], reasoning: "domestic court ruling" },
          { evidenceIndex: 1, applicability: "foreign_reaction", relevantClaimIds: [], reasoning: "foreign sanctions" },
          { evidenceIndex: 2, applicability: "contextual", relevantClaimIds: [], reasoning: "international NGO" },
        ],
      });

      const result = await assessEvidenceApplicability(claims, evidence, "BR", mockConfig);

      expect(result).toHaveLength(3);
      expect(result[0].applicability).toBe("direct");
      expect(result[1].applicability).toBe("foreign_reaction");
      expect(result[2].applicability).toBe("contextual");
      expect(mockDebugLogFileOnly).toHaveBeenCalledWith(
        "[Fix3] Applicability: 1D/1C/1F (3 total, geography: BR)",
      );
      expect(mockDebugLog).not.toHaveBeenCalledWith(
        "[Fix3] Applicability: 1D/1C/1F (3 total, geography: BR)",
      );
    });

    it("routes applicability direction decisions through the extraction model tier", async () => {
      const claims = [createClaim({ statement: "Entity A's current metric is comparable to reference metric B" })];
      const evidence = [createEvidence({ statement: "Source-native metric value for the reference side." })];

      mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        assessments: [
          { evidenceIndex: 0, applicability: "direct", relevantClaimIds: ["AC_01"], reasoning: "comparison-side evidence" },
        ],
      });

      await assessEvidenceApplicability(claims, evidence, "CH", mockConfig);

      expect(mockGetModelForTask).toHaveBeenCalledWith("extract_evidence", undefined, mockConfig);
    });

    it("uses the configurable statement cap for applicability evidence summaries", async () => {
      const claims = [createClaim({ statement: "Entity A complied with procedural standards" })];
      const qualifier = "QUALIFIER: the concern remains unproven after review.";
      const evidence = [
        createEvidence({
          statement: `${"Opening procedural concern. ".repeat(12)}${qualifier}`,
          claimDirection: "contradicts",
          relevantClaimIds: ["AC_01"],
        }),
      ];

      mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        assessments: [
          {
            evidenceIndex: 0,
            applicability: "direct",
            relevantClaimIds: ["AC_01"],
            claimDirectionByClaimId: [{ claimId: "AC_01", claimDirection: "neutral" }],
            reasoning: "qualifier shows the concern is not established",
          },
        ],
      });

      await assessEvidenceApplicability(
        claims,
        evidence,
        "BR",
        { applicabilityAssessmentEvidenceStatementMaxChars: 450 } as any,
      );

      const renderedVariables = mockLoadSection.mock.calls[0]?.[2] as Record<string, string>;
      const summaries = JSON.parse(renderedVariables.evidenceItems);
      expect(summaries[0].statement).toContain(qualifier);
      expect(summaries[0].statement.length).toBeLessThanOrEqual(450);
    });

    it("should preserve existing claim mappings and add LLM-assessed comparison claim mappings", async () => {
      const claims = [
        createClaim({ id: "AC_01", statement: "Entity A has current metric M" }),
        createClaim({
          id: "AC_02",
          statement: "Entity A's current metric M is approximately comparable to reference metric N",
          expectedEvidenceProfile: {
            componentMetrics: ["current metric M", "reference metric N"],
            expectedSourceTypes: ["official_record"],
          },
        }),
      ];
      const evidence = [
        createEvidence({
          id: "EV_01",
          statement: "Official source reports current metric M for Entity A.",
          claimDirection: "neutral",
          relevantClaimIds: ["AC_01"],
        }),
      ];

      mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        assessments: [
          {
            evidenceIndex: 0,
            applicability: "direct",
            relevantClaimIds: ["AC_01", "AC_02", "AC_UNKNOWN"],
            reasoning: "measures a side needed by the comparison claim",
          },
        ],
      });

      const result = await assessEvidenceApplicability(claims, evidence, "CH", mockConfig);

      expect(result).toHaveLength(1);
      expect(result[0].relevantClaimIds).toEqual(["AC_01", "AC_02"]);
      expect(result[0].applicability).toBe("direct");
      expect(mockDebugLogFileOnly).toHaveBeenCalledWith(
        expect.stringContaining("Claim mapping extensions: 1."),
      );
    });

    it("should clone directional evidence as neutral single-claim companion evidence when no claim-local direction is supplied", async () => {
      const claims = [
        createClaim({ id: "AC_01", statement: "Entity A has current metric M" }),
        createClaim({
          id: "AC_02",
          statement: "Entity A's current metric M is approximately comparable to reference metric N",
          expectedEvidenceProfile: {
            componentMetrics: ["current metric M", "reference metric N"],
          },
        }),
      ];
      const evidence = [
        createEvidence({
          id: "EV_01",
          statement: "Official source reports current metric M for Entity A.",
          claimDirection: "supports",
          relevantClaimIds: ["AC_01"],
        }),
      ];

      mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        assessments: [
          {
            evidenceIndex: 0,
            applicability: "direct",
            relevantClaimIds: ["AC_01", "AC_02"],
            reasoning: "measures a current-side component needed by the comparison claim",
          },
        ],
      });

      const result = await assessEvidenceApplicability(claims, evidence, "CH", mockConfig);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: "EV_01",
        claimDirection: "supports",
        relevantClaimIds: ["AC_01"],
        applicability: "direct",
      });
      expect(result[1]).toMatchObject({
        id: "EV_01__neutral_AC_02",
        claimDirection: "neutral",
        relevantClaimIds: ["AC_02"],
        applicability: "direct",
      });
      expect(result[1].statement).toBe(result[0].statement);
      expect(mockDebugLogFileOnly).toHaveBeenCalledWith(
        expect.stringContaining("Neutral companion clones: 1."),
      );
    });

    it("should clone LLM-mapped companion evidence with claim-local direction when supplied", async () => {
      const claims = [
        createClaim({ id: "AC_01", statement: "Entity A has current metric M" }),
        createClaim({
          id: "AC_02",
          statement: "Entity A's current metric M is approximately comparable to reference metric N",
          expectedEvidenceProfile: {
            componentMetrics: ["current metric M", "reference metric N"],
          },
        }),
      ];
      const evidence = [
        createEvidence({
          id: "EV_01",
          statement: "Official source reports current metric M for Entity A.",
          claimDirection: "supports",
          relevantClaimIds: ["AC_01"],
        }),
      ];

      mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        assessments: [
          {
            evidenceIndex: 0,
            applicability: "direct",
            relevantClaimIds: ["AC_01", "AC_02"],
            claimDirectionByClaimId: [
              { claimId: "AC_01", claimDirection: "supports" },
              { claimId: "AC_02", claimDirection: "supports" },
            ],
            reasoning: "current-side component directly supports the comparison claim",
          },
        ],
      });

      const result = await assessEvidenceApplicability(claims, evidence, "CH", mockConfig);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: "EV_01",
        claimDirection: "supports",
        relevantClaimIds: ["AC_01"],
        applicability: "direct",
      });
      expect(result[1]).toMatchObject({
        id: "EV_01__supports_AC_02",
        claimDirection: "supports",
        relevantClaimIds: ["AC_02"],
        applicability: "direct",
      });
      expect(result[1].statement).toBe(result[0].statement);
      expect(mockDebugLogFileOnly).toHaveBeenCalledWith(
        expect.stringContaining("Directional companion clones: 1."),
      );
    });

    it("should isolate EvidenceScope objects when cloning companion evidence", async () => {
      const claims = [
        createClaim({ id: "AC_01", statement: "Entity A has current metric M" }),
        createClaim({ id: "AC_02", statement: "Comparison claim" }),
      ];
      const evidence = [
        createEvidence({
          id: "EV_01",
          statement: "Official source reports current metric M for Entity A.",
          claimDirection: "supports",
          relevantClaimIds: ["AC_01"],
          evidenceScope: {
            name: "Official statistics",
            methodology: "Published statistical table",
            temporal: "2025",
            additionalDimensions: { route: "source-native side metric" },
          },
        }),
      ];

      mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        assessments: [
          {
            evidenceIndex: 0,
            applicability: "direct",
            relevantClaimIds: ["AC_01", "AC_02"],
            claimDirectionByClaimId: [
              { claimId: "AC_02", claimDirection: "supports" },
            ],
            reasoning: "side metric supports the comparison claim",
          },
        ],
      });

      const result = await assessEvidenceApplicability(claims, evidence, "CH", mockConfig);

      expect(result).toHaveLength(2);
      expect(result[0].evidenceScope).not.toBe(result[1].evidenceScope);
      expect(result[0].evidenceScope?.additionalDimensions)
        .not.toBe(result[1].evidenceScope?.additionalDimensions);

      (result[1].evidenceScope as any).methodology = "mutated companion scope";
      (result[1].evidenceScope!.additionalDimensions as any).route = "mutated route";

      expect(result[0].evidenceScope?.methodology).toBe("Published statistical table");
      expect(result[0].evidenceScope?.additionalDimensions?.route).toBe("source-native side metric");
    });

    it("should apply LLM claim-local direction to already-scoped neutral evidence", async () => {
      const claims = [
        createClaim({
          id: "AC_01",
          statement: "Entity A's current metric M is approximately comparable to reference metric N",
          expectedEvidenceProfile: {
            componentMetrics: ["current metric M", "reference metric N"],
          },
        }),
      ];
      const evidence = [
        createEvidence({
          id: "EV_01",
          statement: "Official source reports reference metric N.",
          claimDirection: "neutral",
          relevantClaimIds: ["AC_01"],
        }),
      ];

      mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        assessments: [
          {
            evidenceIndex: 0,
            applicability: "direct",
            relevantClaimIds: ["AC_01"],
            claimDirectionByClaimId: [
              { claimId: "AC_01", claimDirection: "contradicts" },
            ],
            reasoning: "reference-side value refutes the comparison relation",
          },
        ],
      });

      const result = await assessEvidenceApplicability(claims, evidence, "CH", mockConfig);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "EV_01__contradicts_AC_01",
        claimDirection: "contradicts",
        relevantClaimIds: ["AC_01"],
        applicability: "direct",
      });
      expect(result[0].statement).toBe(evidence[0].statement);
      expect(mockDebugLogFileOnly).toHaveBeenCalledWith(
        expect.stringContaining("Neutral claim-local direction clones: 1."),
      );
    });

    it("should not clone directional evidence for unknown or already-scoped claim IDs", async () => {
      const claims = [
        createClaim({ id: "AC_01", statement: "Entity A has current metric M" }),
        createClaim({ id: "AC_02", statement: "Comparison claim" }),
      ];
      const evidence = [
        createEvidence({
          id: "EV_01",
          claimDirection: "supports",
          relevantClaimIds: ["AC_01"],
        }),
      ];

      mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        assessments: [
          {
            evidenceIndex: 0,
            applicability: "direct",
            relevantClaimIds: ["AC_01", "AC_UNKNOWN"],
            reasoning: "only the existing claim is valid",
          },
        ],
      });

      const result = await assessEvidenceApplicability(claims, evidence, "CH", mockConfig);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "EV_01",
        claimDirection: "supports",
        relevantClaimIds: ["AC_01"],
      });
      expect(mockDebugLogFileOnly).toHaveBeenCalledWith(
        expect.stringContaining("Neutral companion clones: 0."),
      );
    });

    it("should apply LLM claim-local direction corrections to already-scoped directional evidence", async () => {
      const claims = [
        createClaim({ id: "AC_01", statement: "Entity A process complied with procedural requirements" }),
      ];
      const evidence = [
        createEvidence({
          id: "EV_01",
          statement: "A party criticized Entity A's process without providing an independent finding.",
          claimDirection: "contradicts",
          relevantClaimIds: ["AC_01"],
        }),
      ];

      mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        assessments: [
          {
            evidenceIndex: 0,
            applicability: "direct",
            relevantClaimIds: ["AC_01"],
            claimDirectionByClaimId: [
              { claimId: "AC_01", claimDirection: "neutral" },
            ],
            reasoning: "documented disagreement is not evidence-backed contestation",
          },
        ],
      });

      const result = await assessEvidenceApplicability(claims, evidence, "CH", mockConfig);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "EV_01",
        claimDirection: "neutral",
        relevantClaimIds: ["AC_01"],
        applicability: "direct",
      });
      expect(mockDebugLogFileOnly).toHaveBeenCalledWith(
        expect.stringContaining("Existing claim direction corrections: 1."),
      );
    });

    it("should preserve companion mapping after correcting the original claim direction", async () => {
      const claims = [
        createClaim({ id: "AC_01", statement: "Entity A process complied with procedural requirements" }),
        createClaim({ id: "AC_02", statement: "Entity A process met public-hearing requirements" }),
      ];
      const evidence = [
        createEvidence({
          id: "EV_01",
          statement: "A party criticized Entity A's process without providing an independent finding.",
          claimDirection: "contradicts",
          relevantClaimIds: ["AC_01"],
        }),
      ];

      mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        assessments: [
          {
            evidenceIndex: 0,
            applicability: "direct",
            relevantClaimIds: ["AC_01", "AC_02"],
            claimDirectionByClaimId: [
              { claimId: "AC_01", claimDirection: "neutral" },
              { claimId: "AC_02", claimDirection: "neutral" },
            ],
            reasoning: "documented disagreement is context for both claims",
          },
        ],
      });

      const result = await assessEvidenceApplicability(claims, evidence, "CH", mockConfig);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: "EV_01",
        claimDirection: "neutral",
        relevantClaimIds: ["AC_01", "AC_02"],
        applicability: "direct",
      });
    });

    it("should still run claim mapping when inferredGeography is null without applying applicability", async () => {
      const claims = [
        createClaim({ id: "AC_01", statement: "Generic side claim" }),
        createClaim({ id: "AC_02", statement: "Generic comparison claim" }),
      ];
      const evidence = [createEvidence({ id: "EV_01", claimDirection: "neutral", relevantClaimIds: ["AC_01"] })];

      mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        assessments: [
          { evidenceIndex: 0, applicability: "direct", relevantClaimIds: ["AC_01", "AC_02"], reasoning: "side evidence" },
        ],
      });

      const result = await assessEvidenceApplicability(claims, evidence, null, mockConfig);

      expect(result).toHaveLength(1);
      expect(result[0].applicability).toBeUndefined();
      expect(result[0].relevantClaimIds).toEqual(["AC_01", "AC_02"]);
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
    });

    it("should still run claim mapping when applicabilityFilterEnabled is false without applying applicability", async () => {
      const claims = [
        createClaim({ id: "AC_01", statement: "Side claim" }),
        createClaim({ id: "AC_02", statement: "Comparison claim" }),
      ];
      const evidence = [createEvidence({ id: "EV_01", claimDirection: "neutral", relevantClaimIds: ["AC_01"] })];
      const disabledConfig = { applicabilityFilterEnabled: false } as any;

      mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        assessments: [
          { evidenceIndex: 0, applicability: "foreign_reaction", relevantClaimIds: ["AC_01", "AC_02"], reasoning: "mapping still runs" },
        ],
      });

      const result = await assessEvidenceApplicability(claims, evidence, "BR", disabledConfig);

      expect(result).toHaveLength(1);
      expect(result[0].applicability).toBeUndefined();
      expect(result[0].relevantClaimIds).toEqual(["AC_01", "AC_02"]);
      expect(mockGenerateText).toHaveBeenCalledTimes(1);
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
          { evidenceIndex: 0, applicability: "contextual", relevantClaimIds: [], reasoning: "external observer" },
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

    it("should pass inferredGeography, claim evidence profiles, and evidence metadata to the prompt template", async () => {
      const claims = [createClaim({
        id: "AC_01",
        statement: "Country A courts",
        expectedEvidenceProfile: {
          methodologies: ["procedural record"],
          expectedMetrics: ["case-specific process"],
          expectedSourceTypes: ["legal_document"],
        },
      })];
      const evidence = [createEvidence({
        id: "EV_01",
        sourceUrl: "https://example.com/source",
        claimDirection: "neutral",
        evidenceScope: {
          name: "Comparator route",
          methodology: "source-native count",
          temporal: "reference period",
          analyticalDimension: "source-native comparator route",
        },
      })];

      mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        assessments: [{ evidenceIndex: 0, applicability: "direct", relevantClaimIds: [], reasoning: "ok" }],
      });

      await assessEvidenceApplicability(claims, evidence, "BR", mockConfig);

      const renderCall = mockLoadSection.mock.calls.find(
        ([, section]) => section === "APPLICABILITY_ASSESSMENT"
      );
      expect(renderCall).toBeDefined();
      expect(renderCall![2]).toMatchObject({ inferredGeography: "BR" });
      const claimsArg = JSON.parse(renderCall![2].claims);
      expect(claimsArg[0]).toMatchObject({
        id: "AC_01",
        statement: "Country A courts",
        expectedEvidenceProfile: {
          methodologies: ["procedural record"],
          expectedMetrics: ["case-specific process"],
          expectedSourceTypes: ["legal_document"],
        },
      });
      const evidenceArg = JSON.parse(renderCall![2].evidenceItems);
      expect(evidenceArg[0]).toMatchObject({
        index: 0,
        claimDirection: "neutral",
        evidenceScope: {
          methodology: "source-native count",
          temporal: "reference period",
          analyticalDimension: "source-native comparator route",
        },
      });
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
        assessments: [{ evidenceIndex: 0, applicability: "contextual", relevantClaimIds: [], reasoning: "comparative evidence" }],
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
