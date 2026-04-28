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
  invalidateConfigCache,
  loadCalcConfig,
  loadPromptConfig,
} from "@/lib/config-loader";
import {
  getActiveConfigHash,
  getConfigBlob,
  recordConfigUsage,
  refreshPromptFromFileIfSystemSeed,
} from "@/lib/config-storage";

describe("config-loader nested default backfill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateConfigCache();
    vi.mocked(recordConfigUsage).mockResolvedValue(undefined);
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

describe("config-loader prompt manifest refresh failures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateConfigCache();
  });

  it("fails closed when split-manifest refresh reports a manifest error", async () => {
    vi.mocked(refreshPromptFromFileIfSystemSeed).mockResolvedValue({
      refreshed: false,
      contentHash: "prompt-hash",
      error: "Manifest files vs frontmatter requiredSections mismatch",
      sourceKind: "manifest",
    } as any);

    const result = await loadPromptConfig("claimboundary", "job-123");

    expect(result).toBeNull();
    expect(vi.mocked(getActiveConfigHash)).not.toHaveBeenCalled();
    expect(vi.mocked(recordConfigUsage)).not.toHaveBeenCalled();
  });

  it("preserves existing active prompt behavior for non-manifest refresh errors", async () => {
    vi.mocked(refreshPromptFromFileIfSystemSeed).mockResolvedValue({
      refreshed: false,
      contentHash: "prompt-hash",
      error: "Prompt file not found",
      sourceKind: "monolith",
    } as any);
    vi.mocked(getActiveConfigHash).mockResolvedValue("prompt-hash");
    vi.mocked(getConfigBlob).mockResolvedValue({
      content: "stored prompt content",
    } as any);

    const result = await loadPromptConfig("claimboundary", "job-123");

    expect(result).toMatchObject({
      content: "stored prompt content",
      contentHash: "prompt-hash",
      fromCache: false,
      seededFromFile: false,
    });
    expect(vi.mocked(recordConfigUsage)).toHaveBeenCalledWith(
      "job-123",
      "prompt",
      "claimboundary",
      "prompt-hash",
    );
  });
});
