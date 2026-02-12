import { describe, expect, it } from "vitest";
import {
  applyRecencyEvidenceGuard,
  buildTemporalPromptGuard,
} from "@/lib/analyzer/temporal-guard";
import type { ClaimVerdict } from "@/lib/analyzer/types";

function makeVerdict(overrides: Partial<ClaimVerdict>): ClaimVerdict {
  return {
    claimId: "c1",
    claimText: "test claim",
    isCentral: true,
    verdict: 80,
    confidence: 78,
    truthPercentage: 80,
    riskTier: "B",
    reasoning: "Test reasoning",
    supportingEvidenceIds: [],
    highlightColor: "green",
    ...overrides,
  };
}

describe("buildTemporalPromptGuard", () => {
  it("includes explicit current date and stale-knowledge warning", () => {
    const guard = buildTemporalPromptGuard({
      currentDate: new Date(2026, 1, 12),
      recencyMatters: true,
      allowModelKnowledge: true,
    });

    expect(guard).toContain("CURRENT DATE: 2026-02-12");
    expect(guard).toContain("training knowledge as potentially stale");
    expect(guard).toContain("recency-sensitive");
  });

  it("switches guidance in evidence-only mode", () => {
    const guard = buildTemporalPromptGuard({
      currentDate: new Date(2026, 1, 12),
      recencyMatters: false,
      allowModelKnowledge: false,
    });

    expect(guard).toContain("evidence-only reasoning");
    expect(guard).toContain("not explicitly time-sensitive");
  });
});

describe("applyRecencyEvidenceGuard", () => {
  it("does nothing when recency does not matter", () => {
    const verdicts = [makeVerdict({ claimId: "c1", verdict: 82, truthPercentage: 82 })];
    const result = applyRecencyEvidenceGuard(verdicts, { recencyMatters: false });

    expect(result.adjustedClaimIds).toEqual([]);
    expect(result.verdicts[0].truthPercentage).toBe(82);
    expect(result.verdicts[0].confidence).toBe(78);
  });

  it("caps unsupported high verdicts to UNVERIFIED for recency-sensitive inputs", () => {
    const verdicts = [makeVerdict({ claimId: "c1", verdict: 84, truthPercentage: 84, confidence: 79 })];
    const result = applyRecencyEvidenceGuard(verdicts, { recencyMatters: true });

    expect(result.adjustedClaimIds).toEqual(["c1"]);
    expect(result.verdicts[0].truthPercentage).toBe(57);
    expect(result.verdicts[0].verdict).toBe(57);
    expect(result.verdicts[0].confidence).toBe(45);
  });

  it("keeps high verdicts when supporting evidence is linked", () => {
    const verdicts = [
      makeVerdict({
        claimId: "c1",
        verdict: 84,
        truthPercentage: 84,
        supportingEvidenceIds: ["e1"],
      }),
    ];
    const result = applyRecencyEvidenceGuard(verdicts, { recencyMatters: true });

    expect(result.adjustedClaimIds).toEqual([]);
    expect(result.verdicts[0].truthPercentage).toBe(84);
  });
});
