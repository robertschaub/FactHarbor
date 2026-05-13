import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { migratePreparedStage1SnapshotToClaimContract } from "@/lib/analyzer-v2/claim-understanding/prepared-snapshot";

const fixturesDir = path.resolve(process.cwd(), "test/fixtures/analyzer-v2");

function readFixture<T>(relativePath: string): T {
  return JSON.parse(readFileSync(path.join(fixturesDir, relativePath), "utf8")) as T;
}

describe("analyzer-v2 prepared snapshot claim-contract migration", () => {
  const prepared = readFixture<Record<string, any>>("acs-prepared-stage1-v1.fixture.json");

  it("converts a selected ACS claim structurally without rewriting the statement", () => {
    const result = migratePreparedStage1SnapshotToClaimContract(prepared, ["AC_01"], {
      currentDate: "2026-05-13",
      acsSnapshotHash: "fixture-acs-snapshot-hash",
      inputGroundingSeedHash: "fixture-input-grounding-seed-hash",
    });

    expect(result.status).toBe("accepted");
    expect(result.claimContract?.input.selectedAtomicClaimIds).toEqual(["AC_01"]);
    expect(result.claimContract?.atomicClaims).toEqual([
      expect.objectContaining({
        id: "AC_01",
        selected: true,
        source: "acs_prepared_snapshot",
        statement: prepared.preparedUnderstanding.atomicClaims[0].statement,
      }),
    ]);
    expect(result.claimContract?.integrityEvents).toEqual([
      expect.objectContaining({
        type: "acs_snapshot_consumed",
        severity: "info",
        claimIds: ["AC_01"],
      }),
    ]);
  });

  it("blocks selected IDs that are absent from the prepared snapshot", () => {
    const result = migratePreparedStage1SnapshotToClaimContract(prepared, ["AC_missing"], {
      currentDate: "2026-05-13",
    });

    expect(result).toMatchObject({
      status: "blocked",
      claimContract: null,
      integrityEvents: [
        {
          type: "selected_claim_missing",
          severity: "error",
          claimIds: ["AC_missing"],
        },
      ],
    });
  });

  it("rejects duplicate selected IDs before migration", () => {
    const result = migratePreparedStage1SnapshotToClaimContract(prepared, ["AC_01", "AC_01"], {
      currentDate: "2026-05-13",
    });

    expect(result.status).toBe("blocked");
    expect(result.integrityEvents[0]).toMatchObject({
      type: "duplicate_selected_claim_id",
      severity: "error",
      claimIds: ["AC_01", "AC_01"],
    });
  });

  it("does not import V1 analyzer stage modules", () => {
    const sourcePath = path.resolve(
      process.cwd(),
      "src/lib/analyzer-v2/claim-understanding/prepared-snapshot.ts",
    );
    const source = readFileSync(sourcePath, "utf8");

    expect(source).not.toContain("claim-extraction-stage");
    expect(source).not.toContain("claimboundary-pipeline");
    expect(source).not.toContain("@/lib/analyzer/");
  });
});
