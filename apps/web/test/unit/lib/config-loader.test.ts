import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/config-storage", () => ({
  getActiveConfig: vi.fn(),
  getActiveConfigHash: vi.fn(),
  getConfigBlob: vi.fn(),
  recordConfigUsage: vi.fn(),
  refreshPromptFromFileIfSystemSeed: vi.fn(),
  seedPromptFromFile: vi.fn(),
}));

import {
  DEFAULT_CALC_CONFIG,
  DEFAULT_PIPELINE_CONFIG,
  invalidateConfigCache,
  loadCalcConfig,
  loadPipelineConfig,
} from "@/lib/config-loader";
import {
  getActiveConfigHash,
  getConfigBlob,
  recordConfigUsage,
} from "@/lib/config-storage";

describe("config-loader nested default backfill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateConfigCache();
  });

  it("rejects a stored partial candidate policy without silently loading baseline", async () => {
    vi.mocked(getActiveConfigHash).mockResolvedValue("old-candidate-hash");
    vi.mocked(getConfigBlob).mockResolvedValue({ content: JSON.stringify({
      llmTiering: true, modelVerdict: "claude-sonnet-5",
      modelPolicies: { "claude-sonnet-5": { thinking: { type: "adaptive", effort: "medium" },
        outputTokenCaps: { claimContractValidation: 8192 } } },
    }) } as any);
    await expect(loadPipelineConfig("default", "offline-invalid")).rejects.toThrow("outputTokenCaps.verdict");
    expect(recordConfigUsage).not.toHaveBeenCalled();
  });

  it.each([
    { modelClaimContractValidation: "claude-sonnet-5" },
    { modelClaimContractValidation: "claude-sonnet-5", llmTiering: false },
    { modelClaimContractValidation: "claude-sonnet-5", llmProvider: "openai" },
    { modelClaimContractValidation: "unsupported" },
    { modelPolicies: { "claude-sonnet-5": { thinking: { type: "adaptive", effort: "medium" },
      outputTokenCaps: { claimContractValidation: 8192 },
      structuredOutputModes: { claimContractValidation: "outputFormat" } } } },
  ])("does not backfill an incomplete or ineffective contract opt-in: %j", content => {
    expect(DEFAULT_PIPELINE_CONFIG.modelClaimContractValidation).toBeNull();
    expect(DEFAULT_PIPELINE_CONFIG.modelPolicies).toEqual({});
    vi.mocked(getActiveConfigHash).mockResolvedValue("invalid-contract-route");
    vi.mocked(getConfigBlob).mockResolvedValue({ content: JSON.stringify(content) } as any);
    return expect(loadPipelineConfig()).rejects.toThrow("Invalid model policy");
  });

  it("loads explicit narrow policy while old blobs inherit only inert defaults", async () => {
    vi.mocked(getActiveConfigHash).mockResolvedValue("legacy-contract-route");
    vi.mocked(getConfigBlob).mockResolvedValue({ content: JSON.stringify({ llmTiering: true, modelVerdict: "standard" }) } as any);
    const legacy = await loadPipelineConfig();
    expect(legacy.config.modelClaimContractValidation).toBeNull();
    expect(legacy.config.modelPolicies).toEqual({});
    invalidateConfigCache();
    vi.mocked(getActiveConfigHash).mockResolvedValue("native-contract-route");
    vi.mocked(getConfigBlob).mockResolvedValue({ content: JSON.stringify({
      llmTiering: true, modelClaimContractValidation: "claude-sonnet-5",
      modelPolicies: { "claude-sonnet-5": { thinking: { type: "adaptive", effort: "medium" },
        outputTokenCaps: { claimContractValidation: 8192 },
        structuredOutputModes: { claimContractValidation: "outputFormat" } } },
    }) } as any);
    const candidate = await loadPipelineConfig();
    expect(candidate.config.modelVerdict).toBe("standard");
    expect(candidate.config.modelPolicies!["claude-sonnet-5"].outputTokenCaps).toEqual({ claimContractValidation: 8192 });
    expect(candidate.contentHash).toBe("native-contract-route");
  });

  it("deep-merges nested sections so new default fields are backfilled", async () => {
    vi.mocked(getActiveConfigHash).mockResolvedValue("calc-hash");
    vi.mocked(getConfigBlob).mockResolvedValue({
      content: JSON.stringify({
        mixedConfidenceThreshold: 45,
        verdictStage: {
          spreadMultipliers: {
            unstable: 0.66,
          },
        },
      }),
    } as any);

    const result = await loadCalcConfig("default", "job-123");

    expect(result.fromDefault).toBe(false);
    expect(result.config.verdictStage.spreadMultipliers.unstable).toBe(0.66);
    expect(result.config.verdictStage.spreadMultipliers.highlyStable)
      .toBe(DEFAULT_CALC_CONFIG.verdictStage.spreadMultipliers.highlyStable);
    expect(result.config.verdictStage.institutionalSourceTypes)
      .toEqual(DEFAULT_CALC_CONFIG.verdictStage.institutionalSourceTypes);
    expect(result.config.verdictStage.generalSourceTypes)
      .toEqual(DEFAULT_CALC_CONFIG.verdictStage.generalSourceTypes);
    expect(vi.mocked(recordConfigUsage))
      .toHaveBeenCalledWith("job-123", "calculation", "default", "calc-hash");
  });

  it("keeps array overrides while still backfilling missing sibling fields", async () => {
    vi.mocked(getActiveConfigHash).mockResolvedValue("calc-hash");
    vi.mocked(getConfigBlob).mockResolvedValue({
      content: JSON.stringify({
        verdictStage: {
          institutionalSourceTypes: ["news_primary"],
        },
      }),
    } as any);

    const result = await loadCalcConfig("default");

    expect(result.config.verdictStage.institutionalSourceTypes).toEqual(["news_primary"]);
    expect(result.config.verdictStage.generalSourceTypes)
      .toEqual(DEFAULT_CALC_CONFIG.verdictStage.generalSourceTypes);
    expect(result.config.verdictStage.spreadMultipliers)
      .toEqual(DEFAULT_CALC_CONFIG.verdictStage.spreadMultipliers);
  });
});
