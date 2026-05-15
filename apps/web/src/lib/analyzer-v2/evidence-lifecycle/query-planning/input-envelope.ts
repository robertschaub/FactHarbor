import { ClaimContractSchema } from "@/lib/analyzer-v2/claim-understanding/schemas";
import type { ClaimContract } from "@/lib/analyzer-v2/claim-understanding/types";
import {
  EVIDENCE_EXECUTION_READINESS_CONTRACT_VERSION,
  type EvidenceTaskBatchInputEnvelope,
} from "@/lib/analyzer-v2/evidence-lifecycle/execution-readiness/types";
import type {
  EvidenceRetrievalPolicyKey,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";
import { sha256Json } from "@/lib/analyzer-v2/util";

export const EVIDENCE_QUERY_PLANNING_INPUT_ENVELOPE_VERSION =
  "v2.evidence-query-planning.input-envelope.0";
export const EVIDENCE_QUERY_PLANNING_MAX_QUERY_ENTRIES = 6;

export const EVIDENCE_QUERY_PLANNING_RETRIEVAL_POLICY_CATALOG = [
  "baseline_research",
  "primary_source_refinement",
  "contradiction_search",
  "supplementary_language_lane",
  "evidence_scarcity_handling",
] as const satisfies readonly EvidenceRetrievalPolicyKey[];

export type EvidenceQueryPlanningInputEnvelopeBlockedReason =
  | "claim_contract_invalid"
  | "direct_text_claim_contract_required"
  | "language_signal_unavailable"
  | "selected_claim_ids_invalid";

export type EvidenceQueryPlanningPromptPackets = {
  claimContractJson: string;
  taskPolicySnapshotJson: string;
  retrievalPolicyCatalogJson: string;
  sourceAcquisitionTraceJson: string;
};

export type EvidenceQueryPlanningAcceptedInputEnvelope = {
  envelopeVersion: typeof EVIDENCE_QUERY_PLANNING_INPUT_ENVELOPE_VERSION;
  status: "accepted";
  claimContract: ClaimContract;
  selectedAtomicClaimIds: readonly string[];
  sourceLanguage: string;
  claimContractHash: string;
  batchInputEnvelope: EvidenceTaskBatchInputEnvelope;
  promptPackets: EvidenceQueryPlanningPromptPackets;
};

export type EvidenceQueryPlanningBlockedInputEnvelope = {
  envelopeVersion: typeof EVIDENCE_QUERY_PLANNING_INPUT_ENVELOPE_VERSION;
  status: "blocked";
  blockedReason: EvidenceQueryPlanningInputEnvelopeBlockedReason;
  message: string;
};

export type EvidenceQueryPlanningInputEnvelope =
  | EvidenceQueryPlanningAcceptedInputEnvelope
  | EvidenceQueryPlanningBlockedInputEnvelope;

export type BuildEvidenceQueryPlanningInputEnvelopeRequest = {
  claimContract: ClaimContract;
  selectedAtomicClaimIds: readonly string[];
  currentDate: string;
  taskPolicySnapshot: unknown;
  sourceAcquisitionTrace?: Record<string, unknown>;
};

function blocked(
  blockedReason: EvidenceQueryPlanningInputEnvelopeBlockedReason,
  message: string,
): EvidenceQueryPlanningBlockedInputEnvelope {
  return {
    envelopeVersion: EVIDENCE_QUERY_PLANNING_INPUT_ENVELOPE_VERSION,
    status: "blocked",
    blockedReason,
    message,
  };
}

function trimSelectedIds(selectedAtomicClaimIds: readonly string[]): string[] | null {
  const trimmed = selectedAtomicClaimIds.map((claimId) => claimId.trim());
  if (trimmed.length === 0 || trimmed.some((claimId) => claimId.length === 0)) {
    return null;
  }
  if (new Set(trimmed).size !== trimmed.length) {
    return null;
  }
  return trimmed;
}

function readSourceLanguage(claimContract: ClaimContract): string | null {
  for (const language of [
    claimContract.input.detectedLanguage,
    claimContract.inputGroundingSeed.detectedLanguage,
  ]) {
    const normalized = language.trim();
    if (normalized.length > 0 && normalized.toLowerCase() !== "und") {
      return normalized;
    }
  }
  return null;
}

function buildPromptClaimContract(
  claimContract: ClaimContract,
  selectedAtomicClaimIds: readonly string[],
): ClaimContract {
  const selectedIdSet = new Set(selectedAtomicClaimIds);

  return {
    ...claimContract,
    input: {
      ...claimContract.input,
      selectedAtomicClaimIds: [...selectedAtomicClaimIds],
    },
    atomicClaims: claimContract.atomicClaims.filter((atomicClaim) =>
      selectedIdSet.has(atomicClaim.id)
    ),
  };
}

function validateSelectedClaims(
  claimContract: ClaimContract,
  selectedAtomicClaimIds: readonly string[],
): string | null {
  const claimById = new Map(claimContract.atomicClaims.map((claim) => [claim.id, claim]));

  for (const claimId of selectedAtomicClaimIds) {
    const claim = claimById.get(claimId);
    if (!claim) {
      return `Selected AtomicClaim id is missing from ClaimContract: ${claimId}`;
    }
    if (!claim.selected || !claimContract.input.selectedAtomicClaimIds.includes(claimId)) {
      return `Selected AtomicClaim id is not marked selected in ClaimContract: ${claimId}`;
    }
  }

  return null;
}

export function buildEvidenceQueryPlanningInputEnvelope(
  request: BuildEvidenceQueryPlanningInputEnvelopeRequest,
): EvidenceQueryPlanningInputEnvelope {
  const parsedClaimContract = ClaimContractSchema.safeParse(request.claimContract);
  if (!parsedClaimContract.success) {
    return blocked("claim_contract_invalid", parsedClaimContract.error.message);
  }

  const claimContract = parsedClaimContract.data as ClaimContract;
  if (
    claimContract.input.inputType !== "text"
    || claimContract.inputGroundingSeed.inputType !== "text"
    || claimContract.inputGroundingSeed.source !== "direct_input"
    || claimContract.acsMigration !== null
  ) {
    return blocked(
      "direct_text_claim_contract_required",
      "Evidence query planning 7L-1 accepts only direct-text ClaimContract input.",
    );
  }

  const selectedAtomicClaimIds = trimSelectedIds(request.selectedAtomicClaimIds);
  if (!selectedAtomicClaimIds) {
    return blocked("selected_claim_ids_invalid", "Selected AtomicClaim ids must be non-empty and unique.");
  }

  const selectedClaimError = validateSelectedClaims(claimContract, selectedAtomicClaimIds);
  if (selectedClaimError) {
    return blocked("selected_claim_ids_invalid", selectedClaimError);
  }

  const sourceLanguage = readSourceLanguage(claimContract);
  if (!sourceLanguage) {
    return blocked(
      "language_signal_unavailable",
      "Evidence query planning 7L-1 requires a non-und source-language signal.",
    );
  }

  const promptClaimContract = buildPromptClaimContract(claimContract, selectedAtomicClaimIds);
  const claimContractHash = sha256Json(promptClaimContract);
  const batchInputEnvelope: EvidenceTaskBatchInputEnvelope = {
    envelopeVersion: EVIDENCE_EXECUTION_READINESS_CONTRACT_VERSION,
    taskKey: "evidence_query_planning",
    executionScope: "inert_contract_only_no_prompt_model_provider_execution",
    selectedAtomicClaimIds,
    claimContractHash,
    sourcePacketIds: [],
    previousTaskResultHashes: [],
  };
  const sourceAcquisitionTrace = {
    additionalContext: request.sourceAcquisitionTrace ?? null,
    status: "not_wired_in_7L1",
    currentDate: request.currentDate,
    maxQueryEntries: EVIDENCE_QUERY_PLANNING_MAX_QUERY_ENTRIES,
    selectedAtomicClaimIds,
  };

  return {
    envelopeVersion: EVIDENCE_QUERY_PLANNING_INPUT_ENVELOPE_VERSION,
    status: "accepted",
    claimContract: promptClaimContract,
    selectedAtomicClaimIds,
    sourceLanguage,
    claimContractHash,
    batchInputEnvelope,
    promptPackets: {
      claimContractJson: JSON.stringify(promptClaimContract),
      taskPolicySnapshotJson: JSON.stringify(request.taskPolicySnapshot),
      retrievalPolicyCatalogJson: JSON.stringify(EVIDENCE_QUERY_PLANNING_RETRIEVAL_POLICY_CATALOG),
      sourceAcquisitionTraceJson: JSON.stringify(sourceAcquisitionTrace),
    },
  };
}
