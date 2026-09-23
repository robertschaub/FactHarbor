import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PIPELINE_CONFIG } from "@/lib/config-schemas";
vi.mock("ai", () => ({ generateText: vi.fn(), Output: { object: vi.fn(value => value) } }));
vi.mock("@/lib/analyzer/llm", () => ({
  getModelForTask: () => ({ provider: "anthropic", modelName: "claude-haiku-4-5-20251001", model: {} }),
  extractStructuredOutput: (result: any) => result.output,
  getPromptCachingOptions: () => undefined,
  getStructuredOutputProviderOptions: () => undefined,
}));
vi.mock("@/lib/analyzer/prompt-loader", () => ({ loadAndRenderSection: async () => ({ content: "" }) }));
vi.mock("@/lib/analyzer/metrics-integration", () => ({ recordLLMCall: vi.fn() }));
import { generateText } from "ai";
import { recordLLMCall } from "@/lib/analyzer/metrics-integration";
import { runSalienceCommitment } from "@/lib/analyzer/claim-extraction-stage";

describe("salience failed-attempt accounting", () => {
  beforeEach(() => vi.clearAllMocks());
  it("retains paid usage when local schema validation fails", async () => {
    const response = { output: [], usage: { inputTokens: 100, outputTokens: 20 } };
    vi.mocked(generateText).mockResolvedValue(response as any);
    const result = await runSalienceCommitment("Plastic recycling is pointless", DEFAULT_PIPELINE_CONFIG, { enabled: true, mode: "audit" }, undefined);
    expect(result.success).toBe(false);
    expect(recordLLMCall).toHaveBeenCalledTimes(1);
    expect(vi.mocked(recordLLMCall).mock.calls[0][0]).toMatchObject({ success: false, schemaCompliant: false });
    expect(vi.mocked(recordLLMCall).mock.calls[0][1]?.result).toBe(response);
  });
});
