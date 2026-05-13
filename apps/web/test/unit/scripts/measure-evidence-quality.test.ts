import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  calculateMetrics,
  extractEvidenceReadModel,
  getResultSchemaKind,
} from "../../../../../scripts/measure-evidence-quality";

const fixturesDir = path.resolve(process.cwd(), "test/fixtures/analyzer-v2");

function readFixture<T>(filename: string): T {
  return JSON.parse(fs.readFileSync(path.join(fixturesDir, filename), "utf8")) as T;
}

function sourceCountsFor(readModel: ReturnType<typeof extractEvidenceReadModel>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const sourceId of readModel.sourceIds) {
    counts.set(sourceId, 0);
  }
  for (const evidence of readModel.evidenceItems) {
    counts.set(evidence.sourceId, (counts.get(evidence.sourceId) ?? 0) + 1);
  }
  return counts;
}

describe("measure-evidence-quality result compatibility reads", () => {
  it("extracts canonical V2 evidence and sourceType for offline metrics", () => {
    const v2Fixture = readFixture<Record<string, any>>("report-result-v2.fixture.json");

    const readModel = extractEvidenceReadModel(v2Fixture);
    const metrics = calculateMetrics(readModel.evidenceItems, sourceCountsFor(readModel));

    expect(getResultSchemaKind(v2Fixture)).toBe("v2");
    expect(readModel.sourceIds).toEqual(["SRC_01"]);
    expect(readModel.evidenceItems).toHaveLength(1);
    expect(readModel.evidenceItems[0].evidenceScope?.sourceType).toBe("other");
    expect(metrics.totalEvidence).toBe(1);
    expect(metrics.totalSources).toBe(1);
    expect(metrics.probativeValueCoverage).toBe(100);
    expect(metrics.claimDirectionDistribution.neutral).toBe(1);
    expect(metrics.sourceTypeCoverage).toBe(100);
  });

  it("parses V2 resultJson wrappers without executing CLI behavior", () => {
    const v2Fixture = readFixture<Record<string, any>>("report-result-v2.fixture.json");
    const readModel = extractEvidenceReadModel({ resultJson: JSON.stringify(v2Fixture) });

    expect(readModel.evidenceItems.map((item) => item.id)).toEqual(["EV_01"]);
    expect(readModel.sourceIds).toEqual(["SRC_01"]);
  });

  it("keeps legacy V1 reads on the evidenceItems/sources path", () => {
    const legacyFixture = readFixture<Record<string, any>>("report-result-v1-legacy.fixture.json");
    legacyFixture.evidenceItems = [
      {
        id: "EV_LEGACY",
        fact: "Legacy structural evidence.",
        category: "evidence",
        sourceId: "SRC_LEGACY",
        sourceExcerpt: "Excerpt",
        claimDirection: "supports",
        evidenceScope: { name: "Legacy scope", sourceType: "other" },
        probativeValue: "high",
      },
    ];
    legacyFixture.sources = [{ id: "SRC_LEGACY" }];
    legacyFixture.facts = [
      {
        id: "EV_OLD_FACT",
        fact: "Should not be used for 3.2.0-cb.",
        category: "evidence",
        sourceId: "SRC_OLD",
        sourceExcerpt: "Excerpt",
      },
    ];

    const readModel = extractEvidenceReadModel(legacyFixture);

    expect(getResultSchemaKind(legacyFixture)).toBe("legacy-v1");
    expect(readModel.evidenceItems.map((item) => item.id)).toEqual(["EV_LEGACY"]);
    expect(readModel.sourceIds).toEqual(["SRC_LEGACY"]);
  });

  it("preserves unknown historical raw facts behavior", () => {
    const rawJob = {
      facts: [
        {
          id: "EV_RAW_FACT",
          fact: "Historical raw fact-shaped item.",
          category: "direct_evidence",
          sourceId: "SRC_RAW",
          sourceExcerpt: "Excerpt",
          claimDirection: "contradicts",
          probativeValue: "medium",
        },
      ],
      evidenceItems: [
        {
          id: "EV_RAW_EVIDENCE",
          fact: "Should not replace facts for unknown historical inputs.",
          category: "evidence",
          sourceId: "SRC_OTHER",
          sourceExcerpt: "Excerpt",
        },
      ],
      sources: [{ id: "SRC_RAW" }],
    };

    const readModel = extractEvidenceReadModel(rawJob);
    const metrics = calculateMetrics(readModel.evidenceItems, sourceCountsFor(readModel));

    expect(getResultSchemaKind(rawJob)).toBe("unknown");
    expect(readModel.evidenceItems.map((item) => item.id)).toEqual(["EV_RAW_FACT"]);
    expect(metrics.totalSources).toBe(1);
    expect(metrics.directEvidenceUsage).toBe(100);
  });
});
