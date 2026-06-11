/**
 * F2 Surgical Contract Repair — Unit Tests
 *
 * Tests the deterministic merge/guard layer of the surgical per-claim
 * contract repair (split bundling / rewrite proxy drift / collapse
 * over-decomposition) and the structural flagged-assessment selector.
 * The LLM call itself is not tested here — only the bounded-merge contract:
 * unflagged claims pass through verbatim, every flagged claim must be
 * covered exactly once, and a no-op repair is rejected.
 *
 * @see apps/web/src/lib/analyzer/claim-extraction-stage.ts
 */

import { describe, it, expect } from "vitest";
import {
  normalizeSurgicalContractRepairSet,
  selectFlaggedContractAssessments,
  type ClaimContractValidationResult,
} from "@/lib/analyzer/claim-extraction-stage";
import type { AtomicClaim } from "@/lib/analyzer/types";

function makeClaim(id: string, statement: string): AtomicClaim {
  return {
    id,
    statement,
    category: "factual",
    centrality: "high",
    harmPotential: "low",
    isCentral: true,
    claimDirection: "supports_thesis",
    thesisRelevance: "direct",
    keyEntities: [],
    relevantGeographies: [],
    checkWorthiness: "high",
    specificityScore: 0.8,
    groundingQuality: "strong",
    expectedEvidenceProfile: {
      methodologies: [],
      expectedMetrics: [],
      expectedSourceTypes: [],
    },
  } as unknown as AtomicClaim;
}

// Replacement claims travel as Pass2-shaped objects; the merge layer treats
// them structurally, so the same factory works for both sides.
function makeReplacement(id: string, statement: string) {
  return makeClaim(id, statement) as unknown as never;
}

type RepairGroup = Parameters<typeof normalizeSurgicalContractRepairSet>[2][number];

function group(replacesClaimIds: string[], claims: AtomicClaim[]): RepairGroup {
  return {
    replacesClaimIds,
    reasoning: "test repair group",
    claims,
  } as unknown as RepairGroup;
}

const MAX_PER_GROUP = 4;

describe("normalizeSurgicalContractRepairSet", () => {
  const base = [
    makeClaim("AC_01", "Entity A performed action X."),
    makeClaim("AC_02", "Entity A's action X is viable in terms of dimension P."),
    makeClaim("AC_03", "Entity B reported on action X."),
  ];

  it("applies a 1:1 rewrite, keeps the replaced id, and passes locked claims through verbatim", () => {
    const result = normalizeSurgicalContractRepairSet(
      base,
      ["AC_02"],
      [group(["AC_02"], [makeClaim("AC_02", "Entity A's action X achieves outcome Q in terms of dimension P.")])],
      MAX_PER_GROUP,
    );
    expect(result.rejectionReason).toBeUndefined();
    const claims = result.repairedClaims!;
    expect(claims.map((c) => c.id)).toEqual(["AC_01", "AC_02", "AC_03"]);
    expect(claims[1].statement).toContain("outcome Q");
    // Locked claims are the same object references — never round-tripped.
    expect(claims[0]).toBe(base[0]);
    expect(claims[2]).toBe(base[2]);
  });

  it("splits one bundled claim into multiple claims at the parent's position with fresh ids", () => {
    const result = normalizeSurgicalContractRepairSet(
      base,
      ["AC_02"],
      [group(["AC_02"], [
        makeClaim("", "Entity A's action X achieves outcome Q1."),
        makeClaim("", "Entity A's action X achieves outcome Q2."),
      ])],
      MAX_PER_GROUP,
    );
    expect(result.rejectionReason).toBeUndefined();
    const claims = result.repairedClaims!;
    expect(claims).toHaveLength(4);
    expect(claims[0].id).toBe("AC_01");
    expect(claims[3].id).toBe("AC_03");
    // Fresh ids, no collisions with the surviving set.
    const ids = claims.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(claims[1].statement).toContain("Q1");
    expect(claims[2].statement).toContain("Q2");
  });

  it("collapses multiple flagged claims into one claim anchored at the first flagged position", () => {
    const flagged = ["AC_01", "AC_02"];
    const result = normalizeSurgicalContractRepairSet(
      base,
      flagged,
      [group(flagged, [makeClaim("", "Entity A performed action X as originally asserted.")])],
      MAX_PER_GROUP,
    );
    expect(result.rejectionReason).toBeUndefined();
    const claims = result.repairedClaims!;
    expect(claims).toHaveLength(2);
    expect(claims[0].statement).toContain("originally asserted");
    expect(claims[1].id).toBe("AC_03");
  });

  it("rejects when a flagged claim is left unrepaired", () => {
    const result = normalizeSurgicalContractRepairSet(
      base,
      ["AC_01", "AC_02"],
      [group(["AC_02"], [makeClaim("AC_02", "Rewritten statement.")])],
      MAX_PER_GROUP,
    );
    expect(result.repairedClaims).toBeUndefined();
    expect(result.rejectionReason).toContain("AC_01");
  });

  it("rejects when a group targets a non-flagged claim", () => {
    const result = normalizeSurgicalContractRepairSet(
      base,
      ["AC_02"],
      [group(["AC_03"], [makeClaim("", "Touched a locked claim.")])],
      MAX_PER_GROUP,
    );
    expect(result.rejectionReason).toContain("non-flagged");
  });

  it("rejects when two groups cover the same flagged id", () => {
    const result = normalizeSurgicalContractRepairSet(
      base,
      ["AC_02"],
      [
        group(["AC_02"], [makeClaim("AC_02", "First rewrite.")]),
        group(["AC_02"], [makeClaim("", "Second rewrite.")]),
      ],
      MAX_PER_GROUP,
    );
    expect(result.rejectionReason).toContain("more than once");
  });

  it("rejects an oversized repair group", () => {
    const replacements = Array.from({ length: MAX_PER_GROUP + 1 }, (_, i) =>
      makeClaim("", `Split branch ${i + 1}.`),
    );
    const result = normalizeSurgicalContractRepairSet(
      base,
      ["AC_02"],
      [group(["AC_02"], replacements)],
      MAX_PER_GROUP,
    );
    expect(result.rejectionReason).toContain("exceeding max");
  });

  it("rejects empty repair groups, empty statements, and empty repairs", () => {
    expect(
      normalizeSurgicalContractRepairSet(base, ["AC_02"], [], MAX_PER_GROUP).rejectionReason,
    ).toContain("no repair groups");
    expect(
      normalizeSurgicalContractRepairSet(
        base, ["AC_02"], [group(["AC_02"], [])], MAX_PER_GROUP,
      ).rejectionReason,
    ).toContain("no replacement claims");
    expect(
      normalizeSurgicalContractRepairSet(
        base, ["AC_02"], [group(["AC_02"], [makeClaim("AC_02", "   ")])], MAX_PER_GROUP,
      ).rejectionReason,
    ).toContain("without a statement");
  });

  it("rejects a no-op repair that returns the claim set unchanged", () => {
    const result = normalizeSurgicalContractRepairSet(
      base,
      ["AC_02"],
      [group(["AC_02"], [makeClaim("AC_02", base[1].statement)])],
      MAX_PER_GROUP,
    );
    expect(result.rejectionReason).toContain("unchanged");
  });

  it("never emits duplicate ids when an LLM-requested fresh id collides with a factory-generated id", () => {
    // Reviewer-reproduced collision: kept requested id "AC_04" + empty id in
    // the same group; the factory (seeded only from currentClaims) would also
    // emit "AC_04" without the collision-proof re-draw.
    const result = normalizeSurgicalContractRepairSet(
      base,
      ["AC_02"],
      [group(["AC_02"], [
        makeClaim("AC_04", "Entity A's action X achieves outcome Q1."),
        makeClaim("", "Entity A's action X achieves outcome Q2."),
      ])],
      MAX_PER_GROUP,
    );
    expect(result.rejectionReason).toBeUndefined();
    const ids = result.repairedClaims!.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("AC_04");
  });

  it("never emits duplicate ids when two groups request the same fresh id", () => {
    const result = normalizeSurgicalContractRepairSet(
      base,
      ["AC_02", "AC_03"],
      [
        group(["AC_02"], [makeClaim("AC_04", "Entity A's action X achieves outcome Q.")]),
        group(["AC_03"], [makeClaim("AC_04", "Entity B's report on action X was independent.")]),
      ],
      MAX_PER_GROUP,
    );
    expect(result.rejectionReason).toBeUndefined();
    const ids = result.repairedClaims!.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("rejects an id-relabelled but textually identical set as a no-op", () => {
    const result = normalizeSurgicalContractRepairSet(
      base,
      ["AC_02"],
      [group(["AC_02"], [makeClaim("", base[1].statement)])],
      MAX_PER_GROUP,
    );
    expect(result.rejectionReason).toContain("unchanged");
  });

  it("assigns a fresh id when a replacement requests an id owned by a locked claim", () => {
    const result = normalizeSurgicalContractRepairSet(
      base,
      ["AC_02"],
      [group(["AC_02"], [
        makeClaim("AC_03", "Entity A's action X achieves outcome Q."),
        makeClaim("", "Entity A's action X achieves outcome R."),
      ])],
      MAX_PER_GROUP,
    );
    expect(result.rejectionReason).toBeUndefined();
    const ids = result.repairedClaims!.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    // The locked AC_03 keeps its identity exactly once.
    expect(ids.filter((id) => id === "AC_03")).toHaveLength(1);
    expect(result.repairedClaims![result.repairedClaims!.length - 1].id).toBe("AC_03");
  });
});

describe("selectFlaggedContractAssessments", () => {
  const claims = [
    makeClaim("AC_01", "Entity A performed action X."),
    makeClaim("AC_02", "Entity A's action X is viable."),
  ];

  function critique(
    entries: Array<Partial<ClaimContractValidationResult["claims"][number]> & { claimId: string }>,
  ): ClaimContractValidationResult {
    return {
      inputAssessment: {
        preservesOriginalClaimContract: false,
        rePromptRequired: true,
        summary: "test",
      },
      claims: entries.map((entry) => ({
        preservesEvaluativeMeaning: true,
        usesNeutralDimensionQualifier: true,
        proxyDriftSeverity: "none",
        recommendedAction: "keep",
        reasoning: "",
        ...entry,
      })) as ClaimContractValidationResult["claims"],
    };
  }

  it("selects retry, material drift, and meaning-loss flags; skips clean claims", () => {
    const flagged = selectFlaggedContractAssessments(
      critique([
        { claimId: "AC_01", recommendedAction: "retry" },
        { claimId: "AC_02", proxyDriftSeverity: "material" },
      ]),
      claims,
    );
    expect(flagged.map((a) => a.claimId)).toEqual(["AC_01", "AC_02"]);

    const clean = selectFlaggedContractAssessments(
      critique([{ claimId: "AC_01" }, { claimId: "AC_02" }]),
      claims,
    );
    expect(clean).toHaveLength(0);

    const meaningLoss = selectFlaggedContractAssessments(
      critique([{ claimId: "AC_02", preservesEvaluativeMeaning: false }]),
      claims,
    );
    expect(meaningLoss.map((a) => a.claimId)).toEqual(["AC_02"]);
  });

  it("ignores critiques for claims not in the current set and handles missing critique", () => {
    const stale = selectFlaggedContractAssessments(
      critique([{ claimId: "AC_99", recommendedAction: "retry" }]),
      claims,
    );
    expect(stale).toHaveLength(0);
    expect(selectFlaggedContractAssessments(undefined, claims)).toHaveLength(0);
  });
});
