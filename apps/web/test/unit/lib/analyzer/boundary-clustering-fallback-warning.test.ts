import { describe, expect, it, vi } from "vitest";
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
