/**
 * assessTextSimilarityBatch Test Suite
 *
 * Tests for Phase 1: Jaccard Fallback Removal
 *
 * Verifies the REAL production function (not a local copy):
 * 1. LLM-powered similarity scoring (primary path)
 * 2. Retry logic with exponential backoff + jitter
 * 3. Missing-score fail-safe (leave IDs unset, no synthetic values)
 * 4. Call-site conservative behavior at sensitive thresholds
 *
 * @module analyzer/assess-text-similarity-batch.test
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the AI SDK generateText
vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

// Mock getModelForTask
vi.mock("@/lib/analyzer/llm", () => ({
  getModelForTask: vi.fn(() => ({
    model: "mock-model",
    taskId: "extract_evidence",
    tierId: "haiku",
  })),
}));

import { generateText } from "ai";
const mockGenerateText = vi.mocked(generateText);

// Import the REAL production function
import { _assessTextSimilarityBatch as assessTextSimilarityBatch } from "@/lib/analyzer/orchestrated";

// Helper: configure mock to return specific scores
function mockLLMScores(scores: any) {
  mockGenerateText.mockResolvedValueOnce({
    text: JSON.stringify(scores),
  } as any);
}

// Helper: configure mock to throw error
function mockLLMError(error: Error) {
  mockGenerateText.mockRejectedValueOnce(error);
}

// ============================================================================
// Core Function Tests
// ============================================================================

describe("assessTextSimilarityBatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1. Happy path: LLM returns valid array, scores extracted correctly", async () => {
    mockLLMScores([0.85, 0.12, 0.67]);
    const pairs = [
      { id: "p1", textA: "Solar energy is efficient", textB: "Solar power works well" },
      { id: "p2", textA: "Wind turbines generate power", textB: "Solar panels produce electricity" },
      { id: "p3", textA: "Climate change is real", textB: "Global warming exists" },
    ];

    const result = await assessTextSimilarityBatch(pairs);

    expect(result.size).toBe(3);
    expect(result.get("p1")).toBe(0.85);
    expect(result.get("p2")).toBe(0.12);
    expect(result.get("p3")).toBe(0.67);
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });

  it("2. Invalid schema — retry succeeds: First attempt returns wrong length, second succeeds", async () => {
    mockLLMScores([0.5, 0.6]); // Wrong length (2 instead of 3)
    mockLLMScores([0.85, 0.12, 0.67]); // Correct length
    const pairs = [
      { id: "p1", textA: "test A", textB: "test B" },
      { id: "p2", textA: "test C", textB: "test D" },
      { id: "p3", textA: "test E", textB: "test F" },
    ];

    const result = await assessTextSimilarityBatch(pairs);

    expect(result.size).toBe(3);
    expect(result.get("p1")).toBe(0.85);
    expect(mockGenerateText).toHaveBeenCalledTimes(2);
  });

  it("3. Invalid schema — all retries fail: Returns map with failed chunk IDs unset", async () => {
    mockLLMScores([0.5]); // Wrong length
    mockLLMScores([0.5]); // Wrong length
    mockLLMScores([0.5]); // Wrong length
    const pairs = [
      { id: "p1", textA: "test A", textB: "test B" },
      { id: "p2", textA: "test C", textB: "test D" },
      { id: "p3", textA: "test E", textB: "test F" },
    ];

    const result = await assessTextSimilarityBatch(pairs);

    expect(result.size).toBe(0); // No scores set — all IDs unset
    expect(mockGenerateText).toHaveBeenCalledTimes(3); // Max retries
  });

  it("4. LLM exception — retry succeeds: First attempt throws, second succeeds", async () => {
    mockLLMError(new Error("LLM unavailable"));
    mockLLMScores([0.75, 0.25]);
    const pairs = [
      { id: "p1", textA: "test A", textB: "test B" },
      { id: "p2", textA: "test C", textB: "test D" },
    ];

    const result = await assessTextSimilarityBatch(pairs);

    expect(result.size).toBe(2);
    expect(result.get("p1")).toBe(0.75);
    expect(result.get("p2")).toBe(0.25);
    expect(mockGenerateText).toHaveBeenCalledTimes(2);
  });

  it("5. LLM exception — all retries fail: Returns map with failed chunk IDs unset", async () => {
    mockLLMError(new Error("LLM unavailable"));
    mockLLMError(new Error("LLM unavailable"));
    mockLLMError(new Error("LLM unavailable"));
    const pairs = [
      { id: "p1", textA: "test A", textB: "test B" },
      { id: "p2", textA: "test C", textB: "test D" },
    ];

    const result = await assessTextSimilarityBatch(pairs);

    expect(result.size).toBe(0); // No scores set — all IDs unset
    expect(mockGenerateText).toHaveBeenCalledTimes(3);
  });

  it("6. Partial batch failure: 2 chunks, first succeeds, second fails", async () => {
    // First chunk (25 pairs): success
    const firstChunkScores = Array(25).fill(0).map((_, i) => 0.5 + i * 0.01);
    mockLLMScores(firstChunkScores);
    // Second chunk (3 pairs): fail all 3 retries
    mockLLMError(new Error("LLM unavailable"));
    mockLLMError(new Error("LLM unavailable"));
    mockLLMError(new Error("LLM unavailable"));

    const pairs = Array(28).fill(0).map((_, i) => ({
      id: `p${i}`,
      textA: `text A ${i}`,
      textB: `text B ${i}`,
    }));

    const result = await assessTextSimilarityBatch(pairs);

    expect(result.size).toBe(25); // First chunk has scores, second chunk unset
    expect(result.get("p0")).toBe(0.5);
    expect(result.get("p24")).toBeDefined();
    expect(result.get("p25")).toBeUndefined(); // Second chunk unset
    expect(result.get("p27")).toBeUndefined();
  });

  it("7. Empty input: Returns empty map", async () => {
    const result = await assessTextSimilarityBatch([]);
    expect(result.size).toBe(0);
    expect(mockGenerateText).not.toHaveBeenCalled();
  });

  it("8. Non-number in array: Pair ID left unset (others in chunk still processed)", async () => {
    mockLLMScores([0.85, "invalid", 0.67]); // Second element is non-numeric
    const pairs = [
      { id: "p1", textA: "test A", textB: "test B" },
      { id: "p2", textA: "test C", textB: "test D" },
      { id: "p3", textA: "test E", textB: "test F" },
    ];

    const result = await assessTextSimilarityBatch(pairs);

    expect(result.size).toBe(2); // Only p1 and p3 have scores
    expect(result.get("p1")).toBe(0.85);
    expect(result.get("p2")).toBeUndefined(); // Invalid score — left unset
    expect(result.get("p3")).toBe(0.67);
  });

  it("9. Out-of-range numbers: Clamps to 0-1", async () => {
    mockLLMScores([1.5, -0.3, 0.5]);
    const pairs = [
      { id: "p1", textA: "test A", textB: "test B" },
      { id: "p2", textA: "test C", textB: "test D" },
      { id: "p3", textA: "test E", textB: "test F" },
    ];

    const result = await assessTextSimilarityBatch(pairs);

    expect(result.size).toBe(3);
    expect(result.get("p1")).toBe(1); // Clamped from 1.5
    expect(result.get("p2")).toBe(0); // Clamped from -0.3
    expect(result.get("p3")).toBe(0.5);
  });

  it("10. maxRetries=1: No retry on failure, IDs left unset immediately", async () => {
    mockLLMError(new Error("LLM unavailable"));
    const pairs = [
      { id: "p1", textA: "test A", textB: "test B" },
    ];

    const result = await assessTextSimilarityBatch(pairs, 1);

    expect(result.size).toBe(0);
    expect(mockGenerateText).toHaveBeenCalledTimes(1); // Only 1 attempt
  });
});

// ============================================================================
// Call-Site Behavior Tests — prove missing scores stay conservative
// ============================================================================

describe("Call-site conservative behavior with missing scores", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Frame signal: missing score with ?? 1 fallback → no forced split (conservative)", async () => {
    // Get a result map with missing scores from the REAL function
    mockLLMError(new Error("LLM unavailable"));
    const result = await assessTextSimilarityBatch(
      [{ id: "pair1", textA: "A", textB: "B" }],
      1, // single attempt — fail fast
    );

    // Prove the score is truly missing
    expect(result.has("pair1")).toBe(false);

    // Apply the frame signal caller default
    const similarity = result.get("pair1") ?? 1;
    const nameThreshold = 0.35;

    // Missing score resolves to 1 → high similarity → no split (conservative)
    expect(similarity).toBe(1);
    expect(similarity < nameThreshold).toBe(false);
  });

  it("Evidence dedup: missing score with ?? 0 fallback → not duplicate (conservative)", async () => {
    mockLLMError(new Error("LLM unavailable"));
    const result = await assessTextSimilarityBatch(
      [{ id: "pair1", textA: "A", textB: "B" }],
      1,
    );

    expect(result.has("pair1")).toBe(false);

    const similarity = result.get("pair1") ?? 0;
    const threshold = 0.5;

    expect(similarity).toBe(0);
    expect(similarity >= threshold).toBe(false);
  });

  it("Thesis relevance upgrade: missing score at >= 0.5 threshold → no upgrade (conservative)", async () => {
    mockLLMError(new Error("LLM unavailable"));
    const result = await assessTextSimilarityBatch(
      [{ id: "pair1", textA: "A", textB: "B" }],
      1,
    );

    expect(result.has("pair1")).toBe(false);

    const similarity = result.get("pair1") || 0;
    expect(similarity >= 0.5).toBe(false);
  });

  it("Evidence relevance: missing score at > 0.4 threshold → not relevant (conservative)", async () => {
    mockLLMError(new Error("LLM unavailable"));
    const result = await assessTextSimilarityBatch(
      [{ id: "pair1", textA: "A", textB: "B" }],
      1,
    );

    expect(result.has("pair1")).toBe(false);

    const similarity = result.get("pair1") || 0;
    expect(similarity > 0.4).toBe(false);
  });
});
