import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateEvidenceSufficiency,
  type DiversitySufficiencyConfig,
} from "@/lib/analyzer/claimboundary-pipeline";
import type { ClaimAcquisitionIterationEntry, EvidenceItem } from "@/lib/analyzer/types";

type FixturePayload = {
  fixtureSetSha256: string;
  fixtures: StageFixture[];
};

type StageFixture = {
  job: {
    jobId: string;
    inputValue: string;
  };
  benchmarkFamily: {
    slug: string;
    inputValue: string;
  };
  result: {
    understanding?: {
      atomicClaims?: Array<{ id: string }>;
    };
    claimVerdicts: Array<{
      claimId: string;
      verdict: string;
      supportingEvidenceIds?: string[];
      contradictingEvidenceIds?: string[];
    }>;
    evidenceItems: Array<{
      id: string;
      sourceId: string;
      relevantClaimIds?: string[];
      applicability?: string;
    }>;
    sources: Array<{
      id: string;
      searchQuery?: string;
    }>;
    analysisWarnings: Array<{
      type: string;
    }>;
    claimAcquisitionLedger?: Record<string, {
      iterations: ClaimAcquisitionIterationEntry[];
    }>;
  };
  metrics?: {
    searchQueries?: unknown;
    failureModes?: unknown;
    gate1Stats?: unknown;
    gate4Stats?: unknown;
    outputQuality?: unknown;
    qualityHealth?: {
      d5?: {
        totalClaims: number;
        insufficientEvidenceClaims: number;
        insufficientDirectEvidenceClaims: number;
        directDirectionalEvidenceTotal: number;
        totalDirectionalEvidenceTotal: number;
      };
    };
    pipelineTelemetry?: unknown;
    telemetryContext?: unknown;
  };
  sourceHashes: {
    resultJsonSha256: string;
    metricsJsonSha256?: string;
  };
  stageContentSha256: string;
  fixtureSha256: string;
};

const fixturePath = path.resolve(
  process.cwd(),
  "test/fixtures/analysis-quality/phase2-current-failures.0396ea47.json",
);
const benchmarkPath = path.resolve(process.cwd(), "../../Docs/AGENTS/benchmark-expectations.json");

function loadJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function stableStringify(value: unknown): string {
  return JSON.stringify(stableValue(value));
}

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    const child = stableValue((value as Record<string, unknown>)[key]);
    if (child !== undefined) out[key] = child;
  }
  return out;
}

function stageContentForHash(fixture: StageFixture): unknown {
  return {
    benchmarkFamilySlug: fixture.benchmarkFamily.slug,
    inputValue: fixture.job.inputValue,
    metrics: fixture.metrics
      ? {
          failureModes: fixture.metrics.failureModes,
          gate1Stats: fixture.metrics.gate1Stats,
          gate4Stats: fixture.metrics.gate4Stats,
          outputQuality: fixture.metrics.outputQuality,
          pipelineTelemetry: fixture.metrics.pipelineTelemetry,
          qualityHealth: fixture.metrics.qualityHealth,
          searchQueries: fixture.metrics.searchQueries,
          telemetryContext: fixture.metrics.telemetryContext,
        }
      : null,
    result: fixture.result,
  };
}

function claimResearchRows(fixture: StageFixture): Array<{ claimId: string; linked: number; researched: number }> {
  const sourcesById = new Map(fixture.result.sources.map((source) => [source.id, source]));
  return fixture.result.claimVerdicts.map((verdict) => {
    const citedIds = new Set([
      ...(verdict.supportingEvidenceIds ?? []),
      ...(verdict.contradictingEvidenceIds ?? []),
    ]);
    const linked = fixture.result.evidenceItems.filter((item) => item.relevantClaimIds?.includes(verdict.claimId));
    const cited = fixture.result.evidenceItems.filter((item) => citedIds.has(item.id));
    const uniqueEvidence = new Map([...linked, ...cited].map((item) => [item.id, item]));
    const researched = [...uniqueEvidence.values()].filter((item) => sourcesById.get(item.sourceId)?.searchQuery).length;
    return { claimId: verdict.claimId, linked: linked.length, researched };
  });
}

function warnings(fixture: StageFixture): string[] {
  return fixture.result.analysisWarnings.map((warning) => warning.type);
}

function replayD5Projection(
  fixture: StageFixture,
  d5Config: DiversitySufficiencyConfig,
): Array<{
  claimId: string;
  sufficient: boolean;
  totalDirectionalCount: number;
  directDirectionalCount: number;
}> {
  return fixture.result.claimVerdicts.map((verdict) => {
    const claimEvidence = fixture.result.evidenceItems.filter((item) =>
      item.relevantClaimIds?.includes(verdict.claimId),
    );
    const sufficiency = evaluateEvidenceSufficiency(claimEvidence as EvidenceItem[], d5Config);
    return {
      claimId: verdict.claimId,
      sufficient: sufficiency.sufficient,
      totalDirectionalCount: sufficiency.totalDirectionalCount,
      directDirectionalCount: sufficiency.directionalCount,
    };
  });
}

function withSourceNativeNoopTelemetry(fixture: StageFixture): StageFixture {
  const clone = JSON.parse(JSON.stringify(fixture)) as StageFixture;
  const claimId = clone.result.claimVerdicts[0]?.claimId;
  if (!claimId) return clone;

  clone.result.claimAcquisitionLedger ??= {};
  clone.result.claimAcquisitionLedger[claimId] ??= {
    iterations: [],
  };
  clone.result.claimAcquisitionLedger[claimId].iterations.push({
    iteration: 999,
    iterationType: "main",
    languageLane: "source_native",
    generatedQueries: [],
    searchResults: 0,
    relevanceAccepted: 0,
    sourcesFetched: 0,
    rawEvidenceItems: 0,
    admittedEvidenceItems: 0,
    directionCounts: { supports: 0, contradicts: 0, neutral: 0 },
    losses: {
      relevanceRejected: 0,
      fetchRejected: 0,
      sourcesWithoutEvidence: 0,
      probativeFilteredOut: 0,
      perSourceCapDroppedNew: 0,
      perSourceCapEvictedExisting: 0,
    },
    laneReason: "source_native:planner_unavailable",
  });
  return clone;
}

describe("analysis stage isolation fixtures", () => {
  const payload = loadJson<FixturePayload>(fixturePath);
  const benchmark = loadJson<{ families: Array<{ slug: string; inputValue: string }> }>(benchmarkPath);
  const captainInputs = new Set(benchmark.families.map((family) => family.inputValue));

  it("keeps fixture and stage-content hashes reproducible", () => {
    const { fixtureSetSha256, ...fixtureSetBody } = payload;

    expect(sha256(stableStringify(fixtureSetBody))).toBe(fixtureSetSha256);
    expect(fixtureSetSha256).toBe("b94b0b683f913f8ba5a0895d50c5340572cdbd0c53ed42c1539ee2d1d17f0459");
    expect(payload.fixtures).toHaveLength(2);

    for (const fixture of payload.fixtures) {
      expect(captainInputs.has(fixture.job.inputValue)).toBe(true);
      expect(fixture.job.inputValue).toBe(fixture.benchmarkFamily.inputValue);
      expect(fixture.sourceHashes.resultJsonSha256).toMatch(/^[a-f0-9]{64}$/);
      expect(fixture.sourceHashes.metricsJsonSha256).toMatch(/^[a-f0-9]{64}$/);

      const { fixtureSha256, stageContentSha256, ...fixtureBody } = fixture;
      expect(sha256(stableStringify(fixtureBody))).toBe(fixtureSha256);
      expect(sha256(stableStringify(stageContentForHash(fixture)))).toBe(stageContentSha256);
    }
  });

  it("preserves source, evidence, and claim-link integrity for stage isolation", () => {
    for (const fixture of payload.fixtures) {
      const sourceIds = new Set(fixture.result.sources.map((source) => source.id));
      const evidenceIds = new Set(fixture.result.evidenceItems.map((item) => item.id));
      const claimIds = new Set([
        ...fixture.result.claimVerdicts.map((verdict) => verdict.claimId),
        ...(fixture.result.understanding?.atomicClaims ?? []).map((claim) => claim.id),
      ]);

      expect(sourceIds.size).toBe(fixture.result.sources.length);
      expect(evidenceIds.size).toBe(fixture.result.evidenceItems.length);

      for (const item of fixture.result.evidenceItems) {
        expect(sourceIds.has(item.sourceId)).toBe(true);
        for (const claimId of item.relevantClaimIds ?? []) {
          expect(claimIds.has(claimId)).toBe(true);
        }
      }

      for (const verdict of fixture.result.claimVerdicts) {
        for (const evidenceId of [
          ...(verdict.supportingEvidenceIds ?? []),
          ...(verdict.contradictingEvidenceIds ?? []),
        ]) {
          expect(evidenceIds.has(evidenceId)).toBe(true);
        }
      }
    }
  });

  it("captures current D5 and researched-evidence isolation surfaces", () => {
    const bySlug = new Map(payload.fixtures.map((fixture) => [fixture.benchmarkFamily.slug, fixture]));
    const asylum = bySlug.get("asylum-235000-de");
    const bolsonaro = bySlug.get("bolsonaro-en");

    expect(asylum).toBeDefined();
    expect(bolsonaro).toBeDefined();

    expect(asylum!.metrics?.qualityHealth?.d5).toMatchObject({
      totalClaims: 1,
      insufficientEvidenceClaims: 1,
      insufficientDirectEvidenceClaims: 0,
      directDirectionalEvidenceTotal: 1,
      totalDirectionalEvidenceTotal: 1,
    });
    expect(warnings(asylum!)).toContain("query_budget_exhausted");
    expect(claimResearchRows(asylum!)).toEqual([{ claimId: "AC_01", linked: 9, researched: 9 }]);

    expect(bolsonaro!.metrics?.qualityHealth?.d5).toMatchObject({
      totalClaims: 3,
      insufficientEvidenceClaims: 3,
      insufficientDirectEvidenceClaims: 0,
      directDirectionalEvidenceTotal: 0,
      totalDirectionalEvidenceTotal: 0,
    });
    expect(warnings(bolsonaro!).filter((type) => type === "source_fetch_failure")).toHaveLength(3);
    expect(claimResearchRows(bolsonaro!)).toEqual([
      { claimId: "AC_01", linked: 0, researched: 0 },
      { claimId: "AC_02", linked: 7, researched: 7 },
      { claimId: "AC_03", linked: 0, researched: 0 },
    ]);
  });

  it("replays D5 sufficiency from frozen claim-local evidence", () => {
    const d5Config: DiversitySufficiencyConfig = {
      minItems: 3,
      minSourceTypes: 2,
      minDistinctDomains: 3,
      minDirectionalItems: 1,
      authoritativeDirectionalMinItems: 2,
      authoritativeDirectionalSourceTypes: [],
      includeSeeded: true,
    };

    for (const fixture of payload.fixtures) {
      const d5 = fixture.metrics?.qualityHealth?.d5;
      expect(d5).toBeDefined();

      const sufficiencyByClaim = replayD5Projection(fixture, d5Config);

      expect(sufficiencyByClaim.every((row) => row.sufficient === false)).toBe(true);
      expect(
        sufficiencyByClaim.reduce((sum, row) => sum + row.totalDirectionalCount, 0),
      ).toBe(d5!.totalDirectionalEvidenceTotal);
      expect(
        sufficiencyByClaim.reduce((sum, row) => sum + row.directDirectionalCount, 0),
      ).toBe(d5!.directDirectionalEvidenceTotal);
    }
  });

  it("keeps source-native planner-unavailable telemetry non-contributing to D5 replay", () => {
    const d5Config: DiversitySufficiencyConfig = {
      minItems: 3,
      minSourceTypes: 2,
      minDistinctDomains: 3,
      minDirectionalItems: 1,
      authoritativeDirectionalMinItems: 2,
      authoritativeDirectionalSourceTypes: [],
      includeSeeded: true,
    };

    for (const fixture of payload.fixtures) {
      const withNoopTelemetry = withSourceNativeNoopTelemetry(fixture);

      expect(replayD5Projection(withNoopTelemetry, d5Config)).toEqual(
        replayD5Projection(fixture, d5Config),
      );
      expect(claimResearchRows(withNoopTelemetry)).toEqual(claimResearchRows(fixture));
      expect(warnings(withNoopTelemetry)).toEqual(warnings(fixture));
      expect(withNoopTelemetry.metrics?.qualityHealth?.d5).toEqual(fixture.metrics?.qualityHealth?.d5);
      expect(withNoopTelemetry.result.evidenceItems).toEqual(fixture.result.evidenceItems);
      expect(withNoopTelemetry.result.sources).toEqual(fixture.result.sources);
    }
  });
});
