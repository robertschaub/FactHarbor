import { describe, expect, it } from "vitest";

import type { ClaimContract } from "@/lib/analyzer-v2/claim-understanding/types";
import { buildBoundedExtractionInputAuthorization } from "@/lib/analyzer-v2/evidence-lifecycle/extraction-input/bounded-extraction-input-authorization";
import { buildEvidenceLifecycleExecutionReadinessDenial } from "@/lib/analyzer-v2/evidence-lifecycle/execution-readiness/execution-readiness-denial";
import {
  buildClaimBoundaryV2RunContext,
  QUERY_PLANNING_RUNTIME_ENABLED_HIDDEN_DIRECT_TEXT,
} from "@/lib/analyzer-v2/run-context";
import { runBoundedEvidenceExtractionDecision } from "@/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-owner";
import { markEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnedDecision } from "@/lib/analyzer-v2-runtime/evidence-lifecycle-extraction-input-authorization-provenance";
import { markEvidenceLifecycleExecutionReadinessRuntimeOwnedDecision } from "@/lib/analyzer-v2-runtime/evidence-lifecycle-execution-readiness-denial-provenance";
import { isBoundedEvidenceExtractionRuntimeOwnedDecision } from "@/lib/analyzer-v2-runtime/evidence-lifecycle-bounded-evidence-extraction-provenance";

const INPUT = "Using hydrogen for cars is more efficient than using electricity";

function context() {
  return buildClaimBoundaryV2RunContext({
    runIdHint: "job-v2-w5-owner",
    submitted: {
      kind: "text",
      value: INPUT,
    },
    preparedSeed: null,
    selectedAtomicClaimIds: ["AC_001"],
  }, {
    now: () => new Date("2026-05-19T18:00:00.000Z"),
    queryPlanningRuntimeActivationStatus: QUERY_PLANNING_RUNTIME_ENABLED_HIDDEN_DIRECT_TEXT,
  });
}

function claimContract(): ClaimContract {
  return {
    schemaVersion: "v2.claim_contract.0",
    input: {
      inputType: "text",
      inputValue: INPUT,
      resolvedInputText: INPUT,
      detectedLanguage: "en",
      selectedAtomicClaimIds: ["AC_001"],
    },
    inputGroundingSeed: {
      source: "direct_input",
      inputType: "text",
      inputValue: INPUT,
      resolvedInputText: INPUT,
      detectedLanguage: "en",
      currentDate: "2026-05-19",
      acsSnapshotHash: null,
      inputGroundingSeedHash: "seed-hash",
    },
    atomicClaims: [{
      id: "AC_001",
      statement: INPUT,
      selected: true,
      source: "v2_claim_understanding",
      gate1Status: {
        status: "passed",
        source: "v2_claim_understanding",
        summary: "accepted",
        reasons: [],
      },
      integrityEvents: [],
    }],
    integrityEvents: [],
    acsMigration: null,
  };
}

function structurallyBlockedW4h() {
  return buildBoundedExtractionInputAuthorization({
    boundedTextAuthorization: null,
    boundedTextRuntimeOwnership: "owned",
  });
}

function structurallyBlockedW4i() {
  return buildEvidenceLifecycleExecutionReadinessDenial({
    extractionInputAuthorization: null,
    extractionInputRuntimeOwnership: "not_owned",
  });
}

describe("bounded evidence extraction owner", () => {
  it("fails closed when parent decisions are not runtime-owned", async () => {
    const decision = await runBoundedEvidenceExtractionDecision({
      context: context(),
      claimContract: claimContract(),
      extractionInputAuthorization: structurallyBlockedW4h(),
      executionReadinessDenial: structurallyBlockedW4i(),
    });

    expect(decision.status).toBe("blocked_pre_execution");
    expect(decision.blockedReason).toBe("w4h_decision_missing");
    expect(decision.sideEffects.adapterCalled).toBe(false);
    expect(isBoundedEvidenceExtractionRuntimeOwnedDecision(decision)).toBe(true);
  });

  it("reads runtime-owned parent provenance before applying W5 pre-call checks", async () => {
    const extractionInputAuthorization = markEvidenceLifecycleExtractionInputAuthorizationRuntimeOwnedDecision(
      structurallyBlockedW4h(),
    );
    const executionReadinessDenial = markEvidenceLifecycleExecutionReadinessRuntimeOwnedDecision(
      structurallyBlockedW4i(),
    );
    const decision = await runBoundedEvidenceExtractionDecision({
      context: context(),
      claimContract: claimContract(),
      extractionInputAuthorization,
      executionReadinessDenial,
    });

    expect(decision.status).toBe("blocked_pre_execution");
    expect(decision.blockedReason).toBe("w4h_packet_invalid");
    expect(decision.parent.w4hRuntimeOwnership).toBe("owned");
    expect(decision.productExecution.evidenceItemGenerated).toBe(false);
    expect(isBoundedEvidenceExtractionRuntimeOwnedDecision(decision)).toBe(true);
  });
});
