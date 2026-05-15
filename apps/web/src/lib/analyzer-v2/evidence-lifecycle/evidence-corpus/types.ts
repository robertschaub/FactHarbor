import type { ClaimContract } from "@/lib/analyzer-v2/claim-understanding/types";
import type {
  SourceAcquisitionRequest,
  SourceAcquisitionStartDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/types";
import type {
  EvidenceRetrievalPolicyCatalogEntry,
  EvidenceTaskPolicySnapshot,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-policy/types";

export const EVIDENCE_CORPUS_BUILD_DECISION_VERSION = "v2.evidence-lifecycle.evidence-corpus-build-decision.0";

export type EvidenceCorpusNotBuiltReason = "source_acquisition_not_executable";

export type EvidenceCorpusBuildBlockedReason =
  | "source_acquisition_blocked"
  | "source_acquisition_request_missing"
  | "claim_contract_missing"
  | "task_policy_provenance_missing"
  | "retrieval_policy_catalog_missing";

export type EvidenceCorpusBuildSourceAcquisitionTrace = {
  decisionVersion: SourceAcquisitionStartDecision["decisionVersion"];
  decisionStatus: SourceAcquisitionStartDecision["status"];
  requestVersion: SourceAcquisitionRequest["requestVersion"] | null;
  requestStatus: SourceAcquisitionRequest["sourceAcquisitionStatus"] | null;
  upstreamBlockedReason: SourceAcquisitionStartDecision["blockedReason"];
  sourceEvidenceLifecycleStatus: SourceAcquisitionStartDecision["sourceEvidenceLifecycleStatus"];
};

export type EvidenceCorpusBuildDecision =
  | {
    decisionVersion: typeof EVIDENCE_CORPUS_BUILD_DECISION_VERSION;
    visibility: "internal_only";
    executionScope: "contract_only_no_corpus_execution";
    status: "not_built_pre_execution";
    notBuiltReason: EvidenceCorpusNotBuiltReason;
    blockedReason: null;
    evidenceCorpus: null;
    claimContract: ClaimContract;
    taskPolicySnapshot: EvidenceTaskPolicySnapshot;
    retrievalPolicyCatalog: readonly EvidenceRetrievalPolicyCatalogEntry[];
    sourceAcquisition: EvidenceCorpusBuildSourceAcquisitionTrace & {
      requestVersion: SourceAcquisitionRequest["requestVersion"];
      requestStatus: SourceAcquisitionRequest["sourceAcquisitionStatus"];
      upstreamBlockedReason: null;
      sourceEvidenceLifecycleStatus: "intake_ready";
    };
  }
  | {
    decisionVersion: typeof EVIDENCE_CORPUS_BUILD_DECISION_VERSION;
    visibility: "internal_only";
    executionScope: "contract_only_no_corpus_execution";
    status: "blocked_pre_execution";
    notBuiltReason: null;
    blockedReason: EvidenceCorpusBuildBlockedReason;
    evidenceCorpus: null;
    claimContract: null;
    taskPolicySnapshot: null;
    retrievalPolicyCatalog: null;
    sourceAcquisition: EvidenceCorpusBuildSourceAcquisitionTrace;
  };
