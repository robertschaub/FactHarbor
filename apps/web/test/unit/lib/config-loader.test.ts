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
