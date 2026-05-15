import { describe, expect, it } from "vitest";
import type { ClaimContract } from "@/lib/analyzer-v2/claim-understanding/types";
import {
  buildEvidenceQueryPlanningInputEnvelope,
  EVIDENCE_QUERY_PLANNING_MAX_QUERY_ENTRIES,
} from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/input-envelope";

function claimContract(overrides: Partial<ClaimContract> = {}): ClaimContract {
  const base: ClaimContract = {
    schemaVersion: "v2.claim_contract.0",
    input: {
      inputType: "text",
      inputValue: "Entity A made assertion B.",
      resolvedInputText: "Entity A made assertion B.",
      detectedLanguage: "en",
      selectedAtomicClaimIds: ["AC_001"],
    },
    inputGroundingSeed: {
      source: "direct_input",
      inputType: "text",
      inputValue: "Entity A made assertion B.",
      resolvedInputText: "Entity A made assertion B.",
      detectedLanguage: "en",
      currentDate: "2026-05-15",
      acsSnapshotHash: null,
      inputGroundingSeedHash: "seed-hash",
    },
    atomicClaims: [
      {
        id: "AC_001",
        statement: "Entity A made assertion B.",
        selected: true,
        source: "v2_claim_understanding",
        gate1Status: {
          status: "passed",
          source: "v2_claim_understanding",
          summary: "One selected assertion.",
          reasons: [],
        },
        integrityEvents: [],
      },
      {
        id: "AC_002",
        statement: "Entity C made assertion D.",
        selected: false,
        source: "v2_claim_understanding",
        gate1Status: {
          status: "passed",
          source: "v2_claim_understanding",
          summary: "Unselected assertion.",
          reasons: [],
        },
        integrityEvents: [],
      },
    ],
    integrityEvents: [],
    acsMigration: null,
  };

  return {
    ...base,
    ...overrides,
  };
}

describe("analyzer-v2 evidence query-planning input envelope", () => {
  it("accepts direct-text ClaimContract input and filters prompt packets to selected AtomicClaims", () => {
    const envelope = buildEvidenceQueryPlanningInputEnvelope({
      claimContract: claimContract(),
      selectedAtomicClaimIds: ["AC_001"],
      currentDate: "2026-05-15",
      taskPolicySnapshot: { policy: "snapshot" },
      sourceAcquisitionTrace: {
        status: "caller_override",
        selectedAtomicClaimIds: ["AC_999"],
      },
    });

    expect(envelope.status).toBe("accepted");
    if (envelope.status !== "accepted") {
      return;
    }

    const promptClaimContract = JSON.parse(envelope.promptPackets.claimContractJson) as ClaimContract;

    expect(envelope.sourceLanguage).toBe("en");
    expect(envelope.selectedAtomicClaimIds).toEqual(["AC_001"]);
    expect(envelope.claimContractHash).toHaveLength(64);
    expect(envelope.batchInputEnvelope).toMatchObject({
      envelopeVersion: "v2.evidence-lifecycle.execution-readiness.0",
      taskKey: "evidence_query_planning",
      selectedAtomicClaimIds: ["AC_001"],
      sourcePacketIds: [],
    });
    expect(promptClaimContract.atomicClaims.map((claim) => claim.id)).toEqual(["AC_001"]);
    expect(envelope.promptPackets.claimContractJson).not.toContain("Entity C made assertion D.");
    expect(JSON.parse(envelope.promptPackets.retrievalPolicyCatalogJson)).toContain("evidence_scarcity_handling");
    expect(JSON.parse(envelope.promptPackets.sourceAcquisitionTraceJson)).toMatchObject({
      status: "not_wired_in_7L1",
      maxQueryEntries: EVIDENCE_QUERY_PLANNING_MAX_QUERY_ENTRIES,
      selectedAtomicClaimIds: ["AC_001"],
      additionalContext: {
        status: "caller_override",
        selectedAtomicClaimIds: ["AC_999"],
      },
    });
  });

  it("rejects duplicate, empty, missing, and unselected AtomicClaim IDs", () => {
    for (const selectedAtomicClaimIds of [
      [],
      [""],
      ["AC_001", "AC_001"],
      ["AC_404"],
      ["AC_002"],
    ]) {
      const envelope = buildEvidenceQueryPlanningInputEnvelope({
        claimContract: claimContract(),
        selectedAtomicClaimIds,
        currentDate: "2026-05-15",
        taskPolicySnapshot: {},
      });

      expect(envelope).toMatchObject({
        status: "blocked",
        blockedReason: "selected_claim_ids_invalid",
      });
    }
  });

  it("requires direct-text input and a real non-und source-language signal", () => {
    expect(buildEvidenceQueryPlanningInputEnvelope({
      claimContract: claimContract({
        input: {
          ...claimContract().input,
          inputType: "url",
        },
      }),
      selectedAtomicClaimIds: ["AC_001"],
      currentDate: "2026-05-15",
      taskPolicySnapshot: {},
    })).toMatchObject({
      status: "blocked",
      blockedReason: "direct_text_claim_contract_required",
    });

    expect(buildEvidenceQueryPlanningInputEnvelope({
      claimContract: claimContract({
        inputGroundingSeed: {
          ...claimContract().inputGroundingSeed,
          inputType: "url",
        },
      }),
      selectedAtomicClaimIds: ["AC_001"],
      currentDate: "2026-05-15",
      taskPolicySnapshot: {},
    })).toMatchObject({
      status: "blocked",
      blockedReason: "direct_text_claim_contract_required",
    });

    expect(buildEvidenceQueryPlanningInputEnvelope({
      claimContract: claimContract({
        input: {
          ...claimContract().input,
          detectedLanguage: "und",
        },
        inputGroundingSeed: {
          ...claimContract().inputGroundingSeed,
          detectedLanguage: "und",
        },
      }),
      selectedAtomicClaimIds: ["AC_001"],
      currentDate: "2026-05-15",
      taskPolicySnapshot: {},
    })).toMatchObject({
      status: "blocked",
      blockedReason: "language_signal_unavailable",
    });
  });
});
