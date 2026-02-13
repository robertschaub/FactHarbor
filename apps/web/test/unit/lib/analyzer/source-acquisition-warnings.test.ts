/**
 * Source Acquisition Warning Tests
 *
 * Validates the warning type contracts for:
 * 1. `no_successful_sources` — emitted when uniqueSourceCount === 0
 * 2. `source_acquisition_collapse` — emitted when searches >= 10 but 0 fetched
 *
 * These are type-contract and structural tests. The warning emission logic
 * is inline in orchestrated.ts and exercised by integration/E2E runs.
 *
 * @module analyzer/source-acquisition-warnings.test
 */

import { describe, expect, it } from "vitest";
import type { AnalysisWarningType, AnalysisWarning } from "@/lib/analyzer/types";

describe("Source acquisition warning types", () => {
  it("no_successful_sources is a valid AnalysisWarningType", () => {
    const warningType: AnalysisWarningType = "no_successful_sources";
    expect(warningType).toBe("no_successful_sources");
  });

  it("source_acquisition_collapse is a valid AnalysisWarningType", () => {
    const warningType: AnalysisWarningType = "source_acquisition_collapse";
    expect(warningType).toBe("source_acquisition_collapse");
  });

  it("no_successful_sources warning has correct structure", () => {
    const warning: AnalysisWarning = {
      type: "no_successful_sources",
      severity: "error",
      message: "No sources were successfully fetched. Insufficient fetched evidence; results may be unreliable.",
      details: {
        uniqueSourceCount: 0,
        totalSearches: 38,
        totalSourceCandidates: 1,
      },
    };

    expect(warning.type).toBe("no_successful_sources");
    expect(warning.severity).toBe("error");
    expect(warning.details?.uniqueSourceCount).toBe(0);
    expect(warning.details?.totalSearches).toBe(38);
  });

  it("source_acquisition_collapse warning has correct structure", () => {
    const warning: AnalysisWarning = {
      type: "source_acquisition_collapse",
      severity: "error",
      message: "Source acquisition collapsed: 38 searches performed but 0 sources successfully fetched. Analysis quality is severely degraded.",
      details: {
        totalSearches: 38,
        totalSourceCandidates: 1,
        successfulFetches: 0,
        evidenceItemCount: 0,
      },
    };

    expect(warning.type).toBe("source_acquisition_collapse");
    expect(warning.severity).toBe("error");
    expect(warning.details?.totalSearches).toBe(38);
    expect(warning.details?.successfulFetches).toBe(0);
  });

  it("collapse warning is NOT emitted when searches < 10", () => {
    // Simulates the guard: totalSearchCount >= 10
    const totalSearchCount = 5;
    const uniqueSourceCount = 0;
    const warnings: AnalysisWarning[] = [];

    // Replicate the inline logic from orchestrated.ts
    if (uniqueSourceCount === 0) {
      warnings.push({
        type: "no_successful_sources",
        severity: "error",
        message: "No sources were successfully fetched. Insufficient fetched evidence; results may be unreliable.",
        details: { uniqueSourceCount: 0, totalSearches: totalSearchCount, totalSourceCandidates: 0 },
      });

      if (totalSearchCount >= 10) {
        warnings.push({
          type: "source_acquisition_collapse",
          severity: "error",
          message: `Source acquisition collapsed: ${totalSearchCount} searches performed but 0 sources successfully fetched. Analysis quality is severely degraded.`,
          details: { totalSearches: totalSearchCount, totalSourceCandidates: 0, successfulFetches: 0, evidenceItemCount: 0 },
        });
      }
    }

    expect(warnings).toHaveLength(1);
    expect(warnings[0].type).toBe("no_successful_sources");
  });

  it("both warnings emitted when searches >= 10 and sources === 0", () => {
    const totalSearchCount = 38;
    const uniqueSourceCount = 0;
    const warnings: AnalysisWarning[] = [];

    if (uniqueSourceCount === 0) {
      warnings.push({
        type: "no_successful_sources",
        severity: "error",
        message: "No sources were successfully fetched. Insufficient fetched evidence; results may be unreliable.",
        details: { uniqueSourceCount: 0, totalSearches: totalSearchCount, totalSourceCandidates: 1 },
      });

      if (totalSearchCount >= 10) {
        warnings.push({
          type: "source_acquisition_collapse",
          severity: "error",
          message: `Source acquisition collapsed: ${totalSearchCount} searches performed but 0 sources successfully fetched. Analysis quality is severely degraded.`,
          details: { totalSearches: totalSearchCount, totalSourceCandidates: 1, successfulFetches: 0, evidenceItemCount: 0 },
        });
      }
    }

    expect(warnings).toHaveLength(2);
    expect(warnings[0].type).toBe("no_successful_sources");
    expect(warnings[1].type).toBe("source_acquisition_collapse");
  });

  it("neither warning emitted when uniqueSourceCount > 0", () => {
    const totalSearchCount = 38;
    const uniqueSourceCount = 3;
    const warnings: AnalysisWarning[] = [];

    if (uniqueSourceCount === 0) {
      warnings.push({
        type: "no_successful_sources",
        severity: "error",
        message: "test",
      });
    }

    expect(warnings).toHaveLength(0);
  });
});
