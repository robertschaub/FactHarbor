import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ANALYZER_V2_SURFACE_LEDGER,
  getAnalyzerV2SurfaceLedgerEntry,
} from "@/lib/analyzer-v2/gateway/surface-ledger";

function readStageMapStageIds(): string[] {
  const stageMapPath = path.resolve(process.cwd(), "../../Docs/AGENTS/index/stage-map.json");
  const stageMap = JSON.parse(readFileSync(stageMapPath, "utf8")) as { stages: Record<string, unknown> };
  return Object.keys(stageMap.stages).sort();
}

describe("analyzer-v2 surface ledger", () => {
  it("classifies every current V1 analyzer stage surface", () => {
    const stageMapStageIds = readStageMapStageIds();
    const ledgerStageIds = ANALYZER_V2_SURFACE_LEDGER
      .map((entry) => entry.v1StageId)
      .filter((stageId): stageId is string => typeof stageId === "string")
      .sort();

    expect(ledgerStageIds).toEqual(stageMapStageIds);
  });

  it("marks quarantine/dead/deferred candidates as candidates requiring deputy approval", () => {
    const candidateEntries = ANALYZER_V2_SURFACE_LEDGER.filter((entry) =>
      entry.classification === "quarantine_candidate"
      || entry.classification === "dead_candidate"
      || entry.classification === "defer"
    );

    expect(candidateEntries.length).toBeGreaterThan(0);
    for (const entry of candidateEntries) {
      expect(entry.verifier).toBeTruthy();
      expect(entry.requiresDeputyApprovalForRemoval).toBe(true);
      expect(entry.notes).toMatch(/candidate|later|do not|until/i);
    }
  });

  it("looks up ledger entries by structural surface id", () => {
    expect(getAnalyzerV2SurfaceLedgerEntry("prompt.claimboundary.CLAIM_GROUPING")).toMatchObject({
      classification: "quarantine_candidate",
      requiresDeputyApprovalForRemoval: true,
    });
  });
});
