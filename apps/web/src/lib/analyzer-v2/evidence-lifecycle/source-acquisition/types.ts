import type { ClaimContract } from "@/lib/analyzer-v2/claim-understanding/types";
import type { EvidenceLifecycleIntake, EvidenceLifecycleStartDecision } from "@/lib/analyzer-v2/evidence-lifecycle/types";
import type {
  EvidenceRetrievalPolicyCatalogEntry,
  EvidenceTaskPolicySnapshot,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-policy/types";

export const SOURCE_ACQUISITION_REQUEST_VERSION = "v2.evidence-lifecycle.source-acquisition-request.0";

export type SourceAcquisitionRequest = {
  requestVersion: typeof SOURCE_ACQUISITION_REQUEST_VERSION;
  visibility: "internal_only";
  executionScope: "contract_only_no_provider_execution";
  sourceAcquisitionStatus: "ready_not_executable";
  intake: {
    intakeVersion: EvidenceLifecycleIntake["intakeVersion"];
    selectedAtomicClaimIds: readonly string[];
    runId: string;
    currentDate: string;
    detectedLanguage: string;
  };
  policySnapshot: EvidenceTaskPolicySnapshot;
  retrievalPolicyCatalog: readonly EvidenceRetrievalPolicyCatalogEntry[];
  claimContract: ClaimContract;
};

export type SourceAcquisitionBlockedReason =
  | "evidence_lifecycle_blocked"
  | "evidence_lifecycle_intake_missing"
  | "claim_contract_missing";

export type SourceAcquisitionStartDecision =
  | {
    decisionVersion: typeof SOURCE_ACQUISITION_REQUEST_VERSION;
    visibility: "internal_only";
    status: "source_acquisition_ready_not_executable";
    request: SourceAcquisitionRequest;
    blockedReason: null;
    sourceEvidenceLifecycleStatus: "intake_ready";
  }
  | {
    decisionVersion: typeof SOURCE_ACQUISITION_REQUEST_VERSION;
    visibility: "internal_only";
    status: "blocked";
    request: null;
    blockedReason: SourceAcquisitionBlockedReason;
    sourceEvidenceLifecycleStatus: EvidenceLifecycleStartDecision["status"];
  };
