import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { EvidenceItemHandoffDecision } from "@/lib/analyzer-v2/evidence-lifecycle/evidence-items/evidence-item-handoff";
import {
  buildSufficiencyIntakeDecision,
  SUFFICIENCY_INTAKE_DECISION_VERSION,
} from "@/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-intake";

const SENTINEL = "NICHT_OFFENTLICHER_BEWEISTEXT_DARF_NIE_ERSCHEINEN";

function handoff(
  overrides: Partial<EvidenceItemHandoffDecision> = {},
): EvidenceItemHandoffDecision {
  const base: EvidenceItemHandoffDecision = {
    decisionVersion: "v2.evidence-lifecycle.evidence-item-handoff.x7w5f",
    decisionId: "EVIDENCE_ITEM_HANDOFF_W6B_TEST",
    kind: "evidence_item_handoff",
    handoffStatus: "evidence_items_ready_for_downstream_internal_handoff",
    blockedReason: null,
    damagedReason: null,
    visibility: "internal_admin_only",
    publicPointerExposure: "forbidden",
    publicCutoverStatus: "blocked_precutover",
    defaultProjection: "hash_length_provenance_only",
    parentW5ArtifactId: "BOUNDED_EVIDENCE_EXTRACTION_W6B_TEST",
    w5eAdmissionStatus: "bounded_evidence_items_admitted_internal_consumption_pending",
    admittedEvidenceItemCount: 2,
    evidenceItemStatementHashes: ["1".repeat(64), "2".repeat(64)],
    evidenceItemStatementByteLengths: [41, 53],
    sourceMaterialLineageHash: "3".repeat(64),
    w4hPacketHash: "4".repeat(64),
    providerId: "wikimedia_core",
    modelId: "claude-haiku-4-5-20251001",
    w4iDisposition: "historical_same_ledger_evidence_merged",
    retiredW4iTrigger: "remove_or_merge_route_after_w5e_canary_and_next_evidence_handoff_owner",
    replacementW4iTrigger: "after_w5f_handoff_route_projection_verified",
    redaction: {
      evidenceItemTextReturned: false,
      sourceTextReturned: false,
      inputTextReturned: false,
    },
    sideEffects: {
      evidenceItemTextReturned: false,
      sourceTextReturned: false,
      inputTextReturned: false,
      parserExecuted: false,
      reportGenerated: false,
      verdictGenerated: false,
      warningGenerated: false,
      confidenceGenerated: false,
      publicSurfaceWritten: false,
      cacheRead: false,
      cacheWrite: false,
      sourceReliabilityRead: false,
      sourceReliabilityWrite: false,
      storageWrite: false,
    },
  };

  return {
    ...base,
    ...overrides,
  };
}

describe("sufficiency intake contract", () => {
  it("creates an internal contract-only sufficiency intake from an accepted W5-F handoff", () => {
    const intake = buildSufficiencyIntakeDecision(handoff());

    expect(intake).toMatchObject({
      decisionVersion: SUFFICIENCY_INTAKE_DECISION_VERSION,
      kind: "sufficiency_intake",
      intakeStatus: "sufficiency_intake_ready_for_contract_only_assessment",
      blockedReason: null,
      damagedReason: null,
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      publicCutoverStatus: "blocked_precutover",
      defaultProjection: "hash_length_provenance_only",
      parentEvidenceItemHandoffDecisionId: "EVIDENCE_ITEM_HANDOFF_W6B_TEST",
      parentEvidenceItemHandoffVersion: "v2.evidence-lifecycle.evidence-item-handoff.x7w5f",
      admittedEvidenceItemCount: 2,
      evidenceItemStatementHashes: ["1".repeat(64), "2".repeat(64)],
      evidenceItemStatementByteLengths: [41, 53],
      sourceMaterialLineageHash: "3".repeat(64),
      w4hPacketHash: "4".repeat(64),
      providerId: "wikimedia_core",
      modelId: "claude-haiku-4-5-20251001",
      assessmentExecution: "closed_contract_only",
    });
    expect(intake.lineageHash).toEqual(expect.any(String));
    expect(intake.redaction).toEqual({
      evidenceItemTextReturned: false,
      sourceTextReturned: false,
      inputTextReturned: false,
      summaryTextReturned: false,
      providerPayloadReturned: false,
    });
    expect(intake.sideEffects).toEqual({
      sufficiencyLlmCalled: false,
      reportGenerated: false,
      verdictGenerated: false,
      warningGenerated: false,
      confidenceGenerated: false,
      publicSurfaceWritten: false,
      cacheRead: false,
      cacheWrite: false,
      sourceReliabilityRead: false,
      sourceReliabilityWrite: false,
      storageWrite: false,
      providerCalled: false,
      parserExecuted: false,
    });
  });

  it("blocks missing, blocked, damaged, and not-ready handoff states without creating assessment output", () => {
    const missing = buildSufficiencyIntakeDecision(null);
    const blocked = buildSufficiencyIntakeDecision(handoff({
      handoffStatus: "evidence_item_handoff_blocked",
      blockedReason: "w5_result_not_accepted",
      admittedEvidenceItemCount: 0,
      evidenceItemStatementHashes: [],
      evidenceItemStatementByteLengths: [],
    }));
    const damaged = buildSufficiencyIntakeDecision(handoff({
      handoffStatus: "evidence_item_handoff_damaged",
      damagedReason: "lineage_mismatch",
      admittedEvidenceItemCount: 0,
      evidenceItemStatementHashes: [],
      evidenceItemStatementByteLengths: [],
    }));
    const notReady = buildSufficiencyIntakeDecision(handoff({
      handoffStatus: "unexpected" as EvidenceItemHandoffDecision["handoffStatus"],
    }));

    expect(missing.intakeStatus).toBe("sufficiency_intake_blocked");
    expect(missing.blockedReason).toBe("evidence_item_handoff_missing");
    expect(blocked.intakeStatus).toBe("sufficiency_intake_blocked");
    expect(blocked.blockedReason).toBe("evidence_item_handoff_blocked");
    expect(damaged.intakeStatus).toBe("sufficiency_intake_blocked");
    expect(damaged.blockedReason).toBe("evidence_item_handoff_damaged");
    expect(notReady.intakeStatus).toBe("sufficiency_intake_blocked");
    expect(notReady.blockedReason).toBe("evidence_item_handoff_not_ready");
    for (const decision of [missing, blocked, damaged, notReady]) {
      expect(decision.assessmentExecution).toBe("closed_contract_only");
      expect(decision.admittedEvidenceItemCount).toBe(0);
      expect(decision.evidenceItemStatementHashes).toEqual([]);
      expect(decision.evidenceItemStatementByteLengths).toEqual([]);
    }
  });

  it("fails closed on count, statement projection, lineage, and side-effect mismatches", () => {
    const countMismatch = buildSufficiencyIntakeDecision(handoff({
      admittedEvidenceItemCount: 0,
      evidenceItemStatementHashes: [],
      evidenceItemStatementByteLengths: [],
    }));
    const statementMismatch = buildSufficiencyIntakeDecision(handoff({
      evidenceItemStatementHashes: ["1".repeat(64)],
      evidenceItemStatementByteLengths: [41, 53],
    }));
    const lineageMissing = buildSufficiencyIntakeDecision(handoff({
      sourceMaterialLineageHash: null,
    }));
    const lineageMismatch = buildSufficiencyIntakeDecision(handoff({
      w4iDisposition: "retained_until_next_downstream_owner",
    }));
    const sideEffectOpen = buildSufficiencyIntakeDecision(handoff({
      sideEffects: {
        ...handoff().sideEffects,
        reportGenerated: true as false,
      },
    }));

    expect(countMismatch.intakeStatus).toBe("sufficiency_intake_damaged");
    expect(countMismatch.damagedReason).toBe("admitted_count_projection_mismatch");
    expect(statementMismatch.intakeStatus).toBe("sufficiency_intake_damaged");
    expect(statementMismatch.damagedReason).toBe("statement_projection_mismatch");
    expect(lineageMissing.intakeStatus).toBe("sufficiency_intake_blocked");
    expect(lineageMissing.blockedReason).toBe("evidence_item_handoff_lineage_missing");
    expect(lineageMismatch.intakeStatus).toBe("sufficiency_intake_damaged");
    expect(lineageMismatch.damagedReason).toBe("lineage_projection_mismatch");
    expect(sideEffectOpen.intakeStatus).toBe("sufficiency_intake_blocked");
    expect(sideEffectOpen.blockedReason).toBe("evidence_item_handoff_side_effects_not_closed");
  });

  it("ignores unsafe extra parent fields and keeps default projection text-free", () => {
    const parentWithExtraText = {
      ...handoff(),
      statement: SENTINEL,
      sourceText: SENTINEL,
      inputText: SENTINEL,
      summary: SENTINEL,
      providerPayload: { text: SENTINEL },
      hiddenLedgerId: SENTINEL,
      internalStatus: SENTINEL,
    } as unknown as EvidenceItemHandoffDecision;
    const intake = buildSufficiencyIntakeDecision(parentWithExtraText);
    const serialized = JSON.stringify(intake);

    expect(intake.intakeStatus).toBe("sufficiency_intake_ready_for_contract_only_assessment");
    expect(serialized).not.toContain(SENTINEL);
    expect(serialized).not.toContain("hiddenLedgerId");
    expect(serialized).not.toContain("internalStatus");
  });

  it("constructs the intake from allowlisted parent fields without embedding or returning the parent", () => {
    const parent = handoff();
    const intake = buildSufficiencyIntakeDecision(parent);

    expect(intake).not.toBe(parent);
    expect("parent" in intake).toBe(false);
    expect("evidenceItemHandoff" in intake).toBe(false);
    expect("parentW5ArtifactId" in intake).toBe(false);
    expect("w5eAdmissionStatus" in intake).toBe(false);
    expect("retiredW4iTrigger" in intake).toBe(false);

    const source = readFileSync(
      path.resolve(process.cwd(), "src/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-intake.ts"),
      "utf8",
    );
    expect(source).not.toContain("...evidenceItemHandoff");
    expect(source).not.toContain("...parent");
    expect(source).not.toContain("JSON.stringify(evidenceItemHandoff");
    expect(source).not.toContain("JSON.stringify(parent");
  });
});
