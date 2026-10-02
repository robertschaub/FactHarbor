import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadPipelineConfig } from "@/lib/config-loader";
import { normalizeScopeEquivalence } from "@/lib/analyzer/scope-normalization";
import { assessEvidenceApplicability, createEvidenceApplicabilityCapture } from "@/lib/analyzer/research-extraction-stage";
import type { CBResearchState, EvidenceItem } from "@/lib/analyzer/types";

// Stage 3 must surface its fallback: when LLM clustering fails, all evidence lands in a
// single CB_GENERAL boundary and per-boundary findings disappear. Before this warning
// existed the failure was visible only in the server console (observed on a live job
// whose clustering call hit its output ceiling).

vi.mock("ai", () => ({
  generateText: vi.fn(async () => {
    throw new Error("No output generated.");
  }),
  Output: { object: vi.fn(() => ({})) },
}));

vi.mock("@/lib/config-loader", () => ({
  loadPipelineConfig: vi.fn(async () => ({
    config: { scopeNormalizationEnabled: false },
    contentHash: "test-hash",
  })),
}));

vi.mock("@/lib/analyzer/prompt-loader", () => ({
  loadAndRenderSection: vi.fn(async () => ({ content: "clustering prompt" })),
}));

vi.mock("@/lib/analyzer/llm", () => ({
  getModelForTask: vi.fn(() => ({ model: {}, modelName: "test-model", provider: "anthropic" })),
  extractStructuredOutput: vi.fn(() => null),
  getStructuredOutputProviderOptions: vi.fn(() => undefined),
  getPromptCachingOptions: vi.fn(() => undefined),
}));

vi.mock("@/lib/analyzer/metrics-integration", () => ({
  recordLLMCall: vi.fn(),
}));

vi.mock("@/lib/analyzer/scope-normalization", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/analyzer/scope-normalization")>(),
  normalizeScopeEquivalence: vi.fn(),
}));

function evidence(id: string, methodology: string): EvidenceItem {
  return {
    id,
    statement: `${id} statement`,
    category: "evidence",
    specificity: "medium",
    sourceId: "",
    sourceUrl: `https://example.test/${id}`,
    sourceTitle: id,
    sourceExcerpt: `${id} statement`,
    claimDirection: "supports",
    relevantClaimIds: ["AC_01"],
    evidenceScope: { name: methodology, methodology, temporal: "2024", geographic: "CH" },
  } as EvidenceItem;
}

describe("clusterBoundaries — fallback warning", () => {
  beforeEach(() => {
    vi.mocked(loadPipelineConfig).mockResolvedValue({ config: { scopeNormalizationEnabled: false }, contentHash: "test-hash" } as any);
    vi.mocked(normalizeScopeEquivalence).mockReset();
  });
  afterEach(() => vi.restoreAllMocks());
  it("retains the late scope links for a 300-item pool after stage-body exhaustion", async () => {
    const { clusterBoundaries } = await import("@/lib/analyzer/boundary-clustering-stage");
    const capture = createEvidenceApplicabilityCapture("direct");
    const items = Array.from({ length: 300 }, (_, i) => ({ ...evidence(`EV_${i}`, `Method ${i}`),
      sourceId: `S_${Math.floor(i / 5)}`, sourceUrl: `https://example.test/${Math.floor(i / 5)}/`.padEnd(100, "u"),
      sourceTitle: `Source ${Math.floor(i / 5)}`.padEnd(80, "t"), statement: "ação 東京 😀".repeat(200) }));
    capture.record("seeded", () => ({ links: { ids: items.map(item => item.id) } }));
    // Real applicability input packing; the existing fake provider rejects its call.
    await assessEvidenceApplicability([], items, "CH", {} as any, undefined, [], capture);
    capture.record("applicability_request", () => ({ bodies: { promptVariables: "ação 東京 😀".repeat(30000) } }));
    vi.mocked(loadPipelineConfig).mockResolvedValue({ config: { scopeNormalizationEnabled: true, scopeNormalizationMinScopes: 2 }, contentHash: "scope-config" } as any);
    vi.mocked(normalizeScopeEquivalence).mockImplementation(async scopes => ({
      normalizedScopes: [{ ...scopes[0], originalIndices: scopes.map(s => s.index) }],
      mergeMap: Object.fromEntries(scopes.map(s => [s.index, 0])), mergedCount: scopes.length - 1,
    }));
    await clusterBoundaries({ evidenceItems: items, evidenceCapture: capture, warnings: [], llmCalls: 0, understanding: { atomicClaims: [] } } as any);
    const saved = capture.finish();
    const applicability = saved.stages.find(s => s.step === "applicability_input")!.links as any;
    expect(applicability.items).toHaveLength(300);
    expect(applicability.sourceTable).toHaveLength(60);
    const before = saved.stages.find(s => s.step === "scope_before")!.links as any;
    const after = saved.stages.find(s => s.step === "scope_after")!.links as any;
    expect(before.items).toHaveLength(300);
    expect(before.identityAccounting).toEqual({ unexplainedAddedIds: [], unexplainedRemovedIds: [] });
    expect(after.changedScopeHashes).toHaveLength(299);
    expect(Object.keys(after.mergeMap)).toHaveLength(300);
    expect(after.truncated).toBeUndefined();
    expect(saved.linkCoverage).toBe("complete");
    expect(Buffer.byteLength(JSON.stringify(saved))).toBeLessThanOrEqual(2_097_152);
  });
  it.each(["applied", "returned_unchanged", "thrown", "disabled", "below_minimum", "at_most_one_scope"])(
    "captures %s normalization with identical analytical behavior", async (outcome) => {
      const { clusterBoundaries } = await import("@/lib/analyzer/boundary-clustering-stage");
      vi.mocked(loadPipelineConfig).mockResolvedValue({ config: {
        scopeNormalizationEnabled: outcome !== "disabled",
        scopeNormalizationMinScopes: outcome === "below_minimum" ? 3 : 2,
      }, contentHash: "scope-config" } as any);
      vi.mocked(normalizeScopeEquivalence).mockImplementation(async scopes => {
        if (outcome === "thrown") throw new Error("fixture failure");
        return outcome === "applied"
          ? { normalizedScopes: [{ ...scopes[0], originalIndices: [0, 1] }], mergeMap: { 0: 0, 1: 0 }, mergedCount: 1 }
          : { normalizedScopes: scopes, mergeMap: { 0: 0, 1: 1 }, mergedCount: 0 };
      });
      const run = async (capture: boolean, faulty = false) => {
        const observer = createEvidenceApplicabilityCapture("direct");
        if (faulty) vi.spyOn(observer, "record").mockImplementation(() => { throw new Error("capture failed"); });
        const state = { evidenceItems: [evidence("EV_001", "Method A"),
          ...(outcome === "at_most_one_scope" ? [] : [evidence("EV_002", "Method B")])],
          warnings: [], llmCalls: 0, understanding: { atomicClaims: [] },
          ...(capture ? { evidenceCapture: observer } : {}),
        } as unknown as CBResearchState;
        const boundaries = await clusterBoundaries(state);
        return { boundaries, items: state.evidenceItems, warnings: state.warnings, calls: state.llmCalls, capture: observer.finish() };
      };
      const baseline = await run(false);
      const captured = await run(true);
      const { capture, ...result } = captured;
      const { capture: _unused, ...expected } = baseline;
      expect(result).toEqual(expected);
      const after = capture.stages.find(s => s.step === "scope_after")!;
      expect(after.links).toMatchObject(["disabled", "below_minimum", "at_most_one_scope"].includes(outcome)
        ? { outcome: "not_invoked", reason: outcome } : { outcome });
      if (outcome === "applied") {
        expect(capture.stages.find(s => s.step === "scope_before")!.bodies).toBeDefined();
        expect(after.bodies).toBeDefined();
        expect(captured.items[1].evidenceScope).toEqual(captured.items[0].evidenceScope);
      }
      const { capture: broken, ...faultyResult } = await run(true, true);
      expect(faultyResult).toEqual(expected);
      expect(broken.faults).toBeGreaterThan(0);
    },
  );
  it("records a boundary_clustering_failed warning when LLM clustering throws", async () => {
    const { clusterBoundaries } = await import("@/lib/analyzer/boundary-clustering-stage");
    const state = {
      jobId: undefined,
      evidenceItems: [evidence("EV_001", "Method A"), evidence("EV_002", "Method B")],
      warnings: [],
      llmCalls: 0,
      understanding: { atomicClaims: [] },
    } as unknown as CBResearchState;

    const boundaries = await clusterBoundaries(state);

    expect(boundaries).toHaveLength(1);
    expect(boundaries[0].id).toBe("CB_GENERAL");
    const warning = state.warnings.find((w) => w.type === "boundary_clustering_failed");
    expect(warning).toBeDefined();
    expect(warning?.severity).toBe("warning");
    expect(warning?.message).toContain("single fallback boundary");
    expect(warning?.details).toMatchObject({ stage: "boundary_clustering", evidenceCount: 2, uniqueScopeCount: 2 });
  });
});
