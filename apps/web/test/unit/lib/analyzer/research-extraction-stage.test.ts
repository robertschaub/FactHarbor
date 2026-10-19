import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  classifyRelevance,
  extractResearchEvidence,
  assessEvidenceApplicability,
  assessScopeQuality,
  assessEvidenceBalance,
  applyPerSourceCap,
  createEvidenceApplicabilityCapture,
  observeEvidenceCapture,
  evidenceCaptureFingerprint,
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
  getPromptCachingOptions: vi.fn(() => undefined),
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

describe("opt-in evidence diagnostics", () => {
  const source = { url: "https://example.test/a", title: "Source A", text: "A source record: ä, ação, 東京 😀" };
  const item = () => ({ statement: "Entity A recorded an observation", category: "evidence",
    sourceUrl: "https://unmatched.test/", claimDirection: "supports", evidenceScope: { methodology: "Method A" },
    probativeValue: "high", sourceType: "news_primary", relevantClaimIds: ["WRONG_ID"] });
  const stateFor = (capture?: ReturnType<typeof createEvidenceApplicabilityCapture>) => ({
    nextEvidenceId: 1, evidenceCapture: capture,
    sources: [{ id: "S1", ...source, fullText: source.text + " rest of fetched document" }],
  }) as any;
  beforeEach(() => {
    vi.clearAllMocks();
    mockMapCategory.mockImplementation(category => category as any);
    mockLoadSection.mockResolvedValue({ content: "frozen system", contentHash: "prompt-hash", warnings: [], variables: {} } as any);
    mockGenerateText.mockResolvedValue({ usage: { inputTokens: 12, outputTokens: 5 }, finishReason: "stop", response: { modelId: "served-model" } } as any);
    mockExtractOutput.mockReturnValue({ evidenceItems: [item()] });
  });

  it.each(["Plastik recycling bringt nichts", "O processo judicial contra Jair Bolsonaro por tentativa de golpe de Estado respeitou o direito processual brasileiro e os requisitos constitucionais, e as sentencas proferidas foram justas"])(
    "preserves requests and outputs while recording exact extraction and source fallback: %s", async statement => {
      const claim = createClaim({ statement });
      const baseline = await extractResearchEvidence(claim, [source], {} as any, "2026-10-02", stateFor());
      const request = mockGenerateText.mock.calls[0][0];
      const capture = createEvidenceApplicabilityCapture("direct");
      const callId = capture.beginExtraction();
      const result = await extractResearchEvidence(claim, [source], {} as any, "2026-10-02", stateFor(capture), callId);
      expect(result).toEqual(baseline);
      expect(mockGenerateText.mock.calls[1][0]).toEqual(request);
      expect(mockGenerateText).toHaveBeenCalledTimes(2);
      const steps = capture.finish().extractions[0].steps as any;
      const actualSourceContent = mockLoadSection.mock.calls[1][2].sourceContent;
      expect(steps.extraction_input.bodies.sourceContent.content).toBe(actualSourceContent);
      expect(steps.extraction_input.bodies.sourceContent.sha256).toBe(evidenceCaptureFingerprint(actualSourceContent).sha256);
      expect(steps.extraction_request.links).toMatchObject({ promptContentHash: "prompt-hash", maxOutputTokens: 16384 });
      const mapping = steps.extraction_mapped.links;
      expect(Object.fromEntries(mapping.columns.map((key: string, i: number) => [key, mapping.items[0][i]]))).toMatchObject({
        id: result[0].id, returnedUrlIndex: mapping.urls.indexOf(item().sourceUrl), resolvedUrlIndex: mapping.urls.indexOf(source.url),
        matchedSourceId: "S1", assignedSourceId: "", returnedClaimIds: ["WRONG_ID"], assignedClaimIds: ["AC_01"] });
      expect(steps.extraction_result.links).toMatchObject({ outcome: "success", responseModel: "served-model", finishReason: "stop" });
      expect(JSON.stringify(request)).not.toContain("extraction_mapped");
    });

  it("captures post-SDK and application-parsed forms distinctly, including application schema failure", async () => {
    const capture = createEvidenceApplicabilityCapture("direct");
    const parsed = { evidenceItems: [{ ...item(), unrequested: true }], extra: "removed" };
    mockExtractOutput.mockReturnValue(parsed);
    await extractResearchEvidence(createClaim(), [source], {} as any, "2026-10-02", stateFor(capture), capture.beginExtraction());
    let steps = capture.finish().extractions[0].steps as any;
    expect(JSON.parse(steps.extraction_parsed.bodies.parsed.content)).toEqual(parsed);
    expect(JSON.parse(steps.extraction_validated.bodies.validated.content)).not.toHaveProperty("extra");
    mockExtractOutput.mockReturnValue({ evidenceItems: [{ statement: "incomplete" }] });
    expect(await extractResearchEvidence(createClaim(), [source], {} as any, "2026-10-02", stateFor(capture), capture.beginExtraction())).toEqual([]);
    steps = capture.finish().extractions[1].steps as any;
    expect(steps.extraction_parsed).toBeDefined();
    expect(steps.extraction_result.links).toMatchObject({ outcome: "failed", error: { name: "ZodError" }, applicationParseOutcome: "failed", schemaIssueCount: expect.any(Number) });
  });

  it("keeps an empty call's identity and cannot leak between concurrent analyses", async () => {
    mockExtractOutput.mockReturnValue({ evidenceItems: [] });
    const a = createEvidenceApplicabilityCapture("direct"), b = createEvidenceApplicabilityCapture("direct");
    await Promise.all([a, b].map(c => extractResearchEvidence(createClaim(), [source], {} as any, "2026-10-02", stateFor(c), c.beginExtraction())));
    expect(a.finish().extractions[0].callId).toBe(0);
    expect(b.finish().extractions[0].callId).toBe(0);
    expect((a.finish().extractions[0].steps as any).extraction_mapped.links.items).toEqual([]);
    a.record("pipeline", () => ({ links: { jobId: "a" } }));
    expect(b.finish().stages).toEqual([]);
  });

  it("isolates a broken observer and does not evaluate disabled diagnostic arguments", async () => {
    const builder = vi.fn(() => { throw Error("diagnostic failure"); });
    observeEvidenceCapture(undefined, builder);
    expect(builder).not.toHaveBeenCalled();
    const broken = { record: builder, markFault: builder } as any;
    const expected = await extractResearchEvidence(createClaim(), [source], {} as any, "2026-10-02", stateFor());
    expect(await extractResearchEvidence(createClaim(), [source], {} as any, "2026-10-02", stateFor(broken), 0)).toEqual(expected);
    const warnings: any[] = [];
    mockExtractOutput.mockReturnValue({ assessments: [{ evidenceIndex: 0, applicability: "direct" }] });
    const result = await assessEvidenceApplicability([], expected, "CH", {} as any, [], warnings, broken);
    expect(result[0].applicability).toBe("direct");
    expect(warnings).toEqual([]);
    const healthy = createEvidenceApplicabilityCapture("direct");
    observeEvidenceCapture(healthy, c => c.record("pipeline", builder));
    expect(healthy.finish().faults).toBe(1);
  });

  it("retains exact applicability inputs, pre-mutation scope and consumed duplicate/out-of-range classifications", async () => {
    const capture = createEvidenceApplicabilityCapture("direct");
    const evidence = [createEvidence({ statement: "ä".repeat(240) }), createEvidence({ id: "EV_02" })];
    const claims = [createClaim({ statement: "Plastik recycling bringt nichts" })];
    mockExtractOutput.mockReturnValue({ assessments: [
      { evidenceIndex: 0, applicability: "direct" }, { evidenceIndex: 0, applicability: "contextual" },
      { evidenceIndex: 99, applicability: "foreign_reaction" }, { evidenceIndex: 1 },
    ] });
    capture.record("seeded", () => ({ links: { ids: evidence.map(e => e.id) } }));
    const baseline = await assessEvidenceApplicability(claims, evidence, "CH", {} as any);
    const captured = await assessEvidenceApplicability(claims, evidence, "CH", {} as any, undefined, [], capture);
    expect(captured).toEqual(baseline);
    expect(mockGenerateText.mock.calls[1][0]).toEqual(mockGenerateText.mock.calls[0][0]);
    evidence[0].evidenceScope.methodology = "mutated";
    const events = capture.finish().stages as any[];
    const input = events.find(e => e.step === "applicability_input");
    expect(input.links.identityAccounting).toEqual({ unexplainedAddedIds: [], unexplainedRemovedIds: [] });
    expect(JSON.parse(input.bodies.items.content)[0].scope.methodology).toBe("standard analysis");
    const request = events.find(e => e.step === "applicability_request" && e.bodies);
    expect(JSON.parse(request.bodies.promptVariables.content)).toEqual(mockLoadSection.mock.calls[1][2]);
    const result = events.find(e => e.step === "applicability_result");
    expect(result.links.classificationMap).toEqual([[0, "contextual"], [99, "foreign_reaction"]]);
    expect(result.links.counts.unclassified).toBe(0); // preserve the existing map-size arithmetic
  });

  it.each(["disabled", "no_geography", "no_evidence", "missing_prompt", "provider_failure"])("records %s without changing fallback behavior", async reason => {
    const capture = createEvidenceApplicabilityCapture("direct");
    const evidence = reason === "no_evidence" ? [] : [createEvidence()];
    if (reason === "missing_prompt") mockLoadSection.mockResolvedValue(null as any);
    if (reason === "provider_failure") mockGenerateText.mockRejectedValue(Error("offline failure"));
    const result = await assessEvidenceApplicability([], evidence, reason === "no_geography" ? null : "CH",
      { applicabilityFilterEnabled: reason !== "disabled" } as any, undefined, [], capture);
    expect(result).toBe(evidence);
    const observation = capture.finish().stages.find(e => e.step === "applicability_result") as any;
    expect(observation.links).toMatchObject(reason === "provider_failure" ? { outcome: "failed" } : { outcome: "skipped", reason });
  });

  it("retains complete joins and the result for five realistic sources/25 items after body exhaustion", async () => {
    const sources = Array.from({ length: 5 }, (_, i) => ({ ...source, url: `https://example.test/source/${i}/document`.padEnd(100, "x"), title: `Source ${i}`.padEnd(80, "t"), text: source.text.repeat(40) }));
    const capture = createEvidenceApplicabilityCapture("direct");
    for (let i = 0; i < 4; i++) capture.record("extraction_input", () => ({ bodies: { sourceContent: "ação".repeat(100000) } }), capture.beginExtraction());
    const state = { nextEvidenceId: 1, evidenceCapture: capture, sources: sources.map((s, i) => ({ ...s, id: `S_${i}`, fullText: s.text + " full document suffix" })) } as any;
    mockGenerateText.mockResolvedValue({ usage: { inputTokens: 24000, outputTokens: 12000, inputTokenDetails: { noCacheTokens: 24000, cacheReadTokens: 0, cacheWriteTokens: 0 }, outputTokenDetails: { textTokens: 12000, reasoningTokens: 0 } }, finishReason: "stop", response: { modelId: "served-model" } } as any);
    mockExtractOutput.mockReturnValue({ evidenceItems: Array.from({ length: 25 }, (_, i) => ({ ...item(), sourceUrl: i < 5 ? `https://unmatched.test/${i}/`.padEnd(100, "u") : sources[i % 5].url, relevantClaimIds: ["AC_01"] })) });
    const callId = capture.beginExtraction();
    const result = await extractResearchEvidence(createClaim(), sources, {} as any, "2026-10-02", state, callId);
    capture.record("extraction_admission", () => ({ links: { rawIds: result.map(e => e.id), probativeKeptIds: result.map(e => e.id), keptIds: result.map(e => e.id), evictedIds: [] } }), callId);
    const saved = capture.finish();
    const steps = saved.extractions[4].steps as any;
    expect(saved.linkCoverage).toBe("complete");
    expect(steps.extraction_input.links.sources).toHaveLength(5);
    expect(steps.extraction_mapped.links.items).toHaveLength(25);
    expect(steps.extraction_result.links.outcome).toBe("success");
    expect(steps.extraction_admission.links.keptIds).toHaveLength(25);
    expect(steps.extraction_result.links.usage.outputTokens).toBe(12000);
    expect(Buffer.byteLength(JSON.stringify(saved))).toBeLessThanOrEqual(2_097_152);
  });

  it("accounts for known applicability removals before scope capture", () => {
    const capture = createEvidenceApplicabilityCapture("direct");
    capture.record("seeded", () => ({ links: { ids: ["EV_1", "EV_2"] } }));
    capture.record("applicability_input", () => ({ links: { items: [["EV_1", 0], ["EV_2", 1]] } }));
    capture.record("applicability_removed", () => ({ links: { removedIds: ["EV_2"] } }));
    capture.record("scope_before", () => ({ links: { items: [["EV_1", 0]] } }));
    expect((capture.finish().stages.at(-1)!.links as any).identityAccounting).toEqual({ unexplainedAddedIds: [], unexplainedRemovedIds: [] });
  });

  it("names omitted stages, preserves admission absence, and marks overflow explicitly", () => {
    const capture = createEvidenceApplicabilityCapture("direct");
    capture.beginExtraction();
    for (let i = 0; i < 300; i++) capture.record("pipeline", () => ({}));
    capture.record("scope_after", () => ({ links: { outcome: "returned_unchanged" } }));
    const saved = capture.finish();
    expect((saved.extractions[0].steps.extraction_admission as any).links.outcome).toBe("not_recorded");
    expect(saved.omittedStepCounts.scope_after).toBe(1);
    expect(saved.omittedSteps.length).toBeLessThanOrEqual(32);
    expect(saved.linkCoverage).toBe("partial");
    // Force the final guard independently of the running accounting (invalid direct caller).
    const overflow = createEvidenceApplicabilityCapture("x".repeat(2_097_152)).finish();
    expect(overflow.overflowBytes).toBeGreaterThan(2_097_152);
    expect(overflow.linkCoverage).toBe("partial");
    expect(Buffer.byteLength(JSON.stringify(overflow))).toBeLessThan(4096);
  });

  it("bounds bodies independently of late admission links and a 300-item multilingual stage", () => {
    const capture = createEvidenceApplicabilityCapture("direct");
    const body = 'ação 東京 😀 <>&"'.repeat(24_000);
    const started = performance.now();
    const heapBefore = process.memoryUsage().heapUsed;
    for (let i = 0; i < 64; i++) {
      const callId = capture.beginExtraction();
      capture.record("extraction_input", () => ({ links: { targetClaimId: "AC_01" }, bodies: { sourceContent: body } }), callId);
      capture.record("extraction_admission", () => ({ links: { keptIds: [`EV_${i}`], evictedIds: [] } }), callId);
    }
    expect(capture.beginExtraction()).toBeUndefined();
    capture.record("applicability_input", () => ({ links: { items: Array.from({ length: 300 }, (_, i) => ({ id: `EV_${i}` })) },
      bodies: { items: Array.from({ length: 300 }, (_, i) => ({ id: i, statement: body.slice(0, 300) })) } }));
    const result = capture.finish();
    expect(Buffer.byteLength(JSON.stringify(result))).toBeLessThanOrEqual(2_097_152);
    expect((result.extractions[63].steps.extraction_admission as any).links.keptIds).toEqual(["EV_63"]);
    expect(result.stages.some(e => e.step === "applicability_input")).toBe(true);
    expect(result.omittedCalls).toBe(1);
    for (const extraction of result.extractions) {
      for (const step of Object.values(extraction.steps) as any[]) {
        for (const retained of Object.values(step.bodies ?? {}) as any[]) {
          expect(Buffer.byteLength(JSON.stringify(retained))).toBeLessThanOrEqual(262_144);
          expect(retained.content).not.toMatch(/[\uD800-\uDBFF]$/);
        }
      }
    }
    console.info("capture offline stress measurement", { durationMs: performance.now() - started,
      heapDeltaBytes: process.memoryUsage().heapUsed - heapBefore, compactBytes: Buffer.byteLength(JSON.stringify(result)) });
  });
});

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
              analyticalDimension: "use-phase efficiency",
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
      // S4: analyticalDimension must survive the Stage-2 mapping (was dropped before; clustering reads it via scopeFingerprint)
      expect(result[0].evidenceScope?.analyticalDimension).toBe("use-phase efficiency");
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

    // ------------------------------------------------------------------
    // Evidence ID monotonic continuity (regression guard for the Phase A
    // unification of the EV_NNN mint scheme). Prevents anyone from
    // re-introducing a local Date.now() / length-based counter that would
    // collide with the per-analysis state.nextEvidenceId.
    // ------------------------------------------------------------------
    it("continues the EV_NNN sequence across multiple calls when state is shared", async () => {
      const claim = createClaim({ id: "AC_01", statement: "Test claim" });
      const sources = [{ url: "https://example.com/1", title: "Source 1", text: "text" }];
      const state = {
        nextEvidenceId: 1,
        evidenceItems: [],
        warnings: [],
      } as any;

      mockLoadSection.mockResolvedValue({ content: "extraction prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValueOnce({
        evidenceItems: [
          { statement: "first call evidence 1", category: "factual", claimDirection: "supports",
            evidenceScope: { methodology: "Study", temporal: "2024" }, probativeValue: "high",
            relevantClaimIds: ["AC_01"] },
          { statement: "first call evidence 2", category: "factual", claimDirection: "supports",
            evidenceScope: { methodology: "Study", temporal: "2024" }, probativeValue: "medium",
            relevantClaimIds: ["AC_01"] },
        ],
      });

      const firstCall = await extractResearchEvidence(claim, sources, mockConfig, "2026-03-23", state);

      expect(firstCall).toHaveLength(2);
      expect(firstCall[0].id).toBe("EV_001");
      expect(firstCall[1].id).toBe("EV_002");
      expect(state.nextEvidenceId).toBe(3);

      mockExtractOutput.mockReturnValueOnce({
        evidenceItems: [
          { statement: "second call evidence 1", category: "factual", claimDirection: "contradicts",
            evidenceScope: { methodology: "Study", temporal: "2025" }, probativeValue: "high",
            relevantClaimIds: ["AC_01"] },
          { statement: "second call evidence 2", category: "factual", claimDirection: "supports",
            evidenceScope: { methodology: "Study", temporal: "2025" }, probativeValue: "low",
            relevantClaimIds: ["AC_01"] },
        ],
      });

      const secondCall = await extractResearchEvidence(claim, sources, mockConfig, "2026-03-23", state);

      // Critical assertion: second call continues from where the first left off — no collision.
      expect(secondCall).toHaveLength(2);
      expect(secondCall[0].id).toBe("EV_003");
      expect(secondCall[1].id).toBe("EV_004");
      expect(state.nextEvidenceId).toBe(5);

      const allIds = [...firstCall, ...secondCall].map((e) => e.id);
      expect(new Set(allIds).size).toBe(allIds.length); // no duplicates
    });

    it("falls back to a local counter starting at EV_001 when state is omitted", async () => {
      const claim = createClaim({ id: "AC_01", statement: "Test claim" });
      const sources = [{ url: "https://example.com/1", title: "Source 1", text: "text" }];

      mockLoadSection.mockResolvedValue({ content: "extraction prompt", variables: {} });
      mockGenerateText.mockResolvedValue({ text: "" } as any);
      mockExtractOutput.mockReturnValue({
        evidenceItems: [
          { statement: "first item", category: "factual", claimDirection: "supports",
            evidenceScope: { methodology: "Study", temporal: "2024" }, probativeValue: "high",
            relevantClaimIds: ["AC_01"] },
          { statement: "second item", category: "factual", claimDirection: "supports",
            evidenceScope: { methodology: "Study", temporal: "2024" }, probativeValue: "medium",
            relevantClaimIds: ["AC_01"] },
        ],
      });

      // No state passed — should not throw, and should mint well-formed sequential IDs
      // scoped to this single invocation (legacy test path).
      const result = await extractResearchEvidence(claim, sources, mockConfig, "2026-03-23");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("EV_001");
      expect(result[1].id).toBe("EV_002");
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
      expect(result.every((item) => item.applicabilityAssessed === true)).toBe(true);
      expect(mockDebugLogFileOnly).toHaveBeenCalledWith(
        "[Fix3] Applicability: 1D/1C/1F (3 total, geography: BR)",
      );
      expect(mockDebugLog).not.toHaveBeenCalledWith(
        "[Fix3] Applicability: 1D/1C/1F (3 total, geography: BR)",
      );
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

    it("should leave unclassified items without direct applicability", async () => {
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
      expect(result[1].applicability).toBeUndefined();
      expect(result[1].applicabilityAssessed).toBe(true);
    });

    it("should fail-open on LLM error — keeps all evidence without applicability", async () => {
      const claims = [createClaim({ statement: "Test" })];
      const evidence = [createEvidence({ id: "EV_01" })];
      const warnings: any[] = [];

      mockLoadSection.mockResolvedValue({ content: "prompt", variables: {} });
      mockGenerateText.mockRejectedValue(new Error("LLM timeout"));

      const result = await assessEvidenceApplicability(claims, evidence, "BR", mockConfig, undefined, warnings);

      expect(result).toHaveLength(1);
      expect(result[0].applicability).toBeUndefined();
      // Fail-open: an infra failure leaves the item UNMARKED (not applicabilityAssessed),
      // so downstream legacy "missing = direct" treatment applies and the job is NOT
      // collapsed to non-direct/UNVERIFIED. Marking it assessed-but-unclassified was the
      // fail-closed inversion this fixes (a transient classifier failure must not
      // poison citations/sufficiency job-wide).
      expect(result[0].applicabilityAssessed).toBeUndefined();
      expect(warnings).toContainEqual(expect.objectContaining({
        type: "evidence_applicability_assessment_degraded",
        severity: "warning",
      }));
    });

    it("should emit a degrading warning when the applicability prompt section is unavailable", async () => {
      const claims = [createClaim({ statement: "Test" })];
      const evidence = [createEvidence({ id: "EV_01" })];
      const warnings: any[] = [];

      mockLoadSection.mockResolvedValue(null as any);

      const result = await assessEvidenceApplicability(claims, evidence, "BR", mockConfig, undefined, warnings);

      expect(result).toHaveLength(1);
      expect(result[0].applicability).toBeUndefined();
      // Fail-open on infra failure: item left UNMARKED → legacy "missing = direct"
      // downstream (no job-wide collapse when the prompt section is unavailable).
      expect(result[0].applicabilityAssessed).toBeUndefined();
      expect(warnings).toContainEqual(expect.objectContaining({
        type: "evidence_applicability_assessment_degraded",
        severity: "warning",
      }));
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
