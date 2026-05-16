import {
  buildEvidenceCorpusSourceMaterialGuard,
  type EvidenceCorpusSourceMaterialGuardStatus,
} from "@/lib/analyzer-v2/evidence-lifecycle/evidence-corpus/source-material-guard";
import {
  isSourceAcquisitionNetworkAuthority,
  readSourceAcquisitionNetworkAuthoritySnapshot,
  type SourceAcquisitionNetworkAuthority,
} from "@/lib/analyzer-v2-runtime/source-acquisition-network-authority";
import {
  validateSourceAcquisitionNetworkBudgetSnapshot,
  validateSourceAcquisitionNetworkEndpointSnapshot,
  type SourceAcquisitionNetworkBudgetSnapshot,
  type SourceAcquisitionNetworkEndpointSnapshot,
} from "@/lib/analyzer-v2-runtime/source-acquisition-network-envelope";

export const SOURCE_ACQUISITION_PROVIDER_NETWORK_READINESS_VERSION =
  "v2.source-acquisition.provider-network-readiness.x7c";

export type SourceAcquisitionProviderNetworkReadinessRequest = {
  readonly authority: SourceAcquisitionNetworkAuthority;
  readonly endpoint: SourceAcquisitionNetworkEndpointSnapshot;
  readonly budget: SourceAcquisitionNetworkBudgetSnapshot;
  readonly sourceMaterialInput: unknown;
};

type SourceAcquisitionProviderNetworkReadinessBlockedReason =
  | "authority_invalid"
  | "endpoint_invalid"
  | "budget_invalid"
  | "authority_endpoint_budget_mismatch"
  | "source_material_guard_invalid"
  | "source_material_guard_not_negative";

type ZeroCostProof = {
  readonly networkExecution: false;
  readonly providerCalls: 0;
  readonly networkCalls: 0;
  readonly bytesRead: 0;
  readonly candidateRecords: 0;
  readonly retries: 0;
  readonly cacheTouched: false;
  readonly sourceReliabilityTouched: false;
  readonly publicExposure: false;
  readonly liveJobs: false;
};

type NullOutputs = {
  readonly providerNetworkExecution: null;
  readonly candidateAcquisition: null;
  readonly sourceMaterial: null;
  readonly extractionInput: null;
  readonly evidenceCorpus: null;
};

export type SourceAcquisitionProviderNetworkReadinessDecision = ZeroCostProof & NullOutputs & (
  | {
      readonly decisionVersion: typeof SOURCE_ACQUISITION_PROVIDER_NETWORK_READINESS_VERSION;
      readonly visibility: "internal_only";
      readonly status: "not_executable_pre_live_gate";
      readonly executionStatus: "blocked_no_io";
      readonly blockedReason: null;
      readonly authorityVersion: string;
      readonly endpointSnapshotHash: string;
      readonly networkBudgetSnapshotHash: string;
      readonly sourceMaterialGuardStatus: "not_buildable_no_source_material";
    }
  | {
      readonly decisionVersion: typeof SOURCE_ACQUISITION_PROVIDER_NETWORK_READINESS_VERSION;
      readonly visibility: "internal_only";
      readonly status: "blocked_pre_execution";
      readonly executionStatus: "blocked_no_io";
      readonly blockedReason: SourceAcquisitionProviderNetworkReadinessBlockedReason;
      readonly authorityVersion: null;
      readonly endpointSnapshotHash: null;
      readonly networkBudgetSnapshotHash: null;
      readonly sourceMaterialGuardStatus: EvidenceCorpusSourceMaterialGuardStatus | null;
    }
);

function zeroCostProof(): ZeroCostProof {
  return {
    networkExecution: false,
    providerCalls: 0,
    networkCalls: 0,
    bytesRead: 0,
    candidateRecords: 0,
    retries: 0,
    cacheTouched: false,
    sourceReliabilityTouched: false,
    publicExposure: false,
    liveJobs: false,
  };
}

function nullOutputs(): NullOutputs {
  return {
    providerNetworkExecution: null,
    candidateAcquisition: null,
    sourceMaterial: null,
    extractionInput: null,
    evidenceCorpus: null,
  };
}

function blocked(
  blockedReason: SourceAcquisitionProviderNetworkReadinessBlockedReason,
  sourceMaterialGuardStatus: EvidenceCorpusSourceMaterialGuardStatus | null = null,
): SourceAcquisitionProviderNetworkReadinessDecision {
  return {
    decisionVersion: SOURCE_ACQUISITION_PROVIDER_NETWORK_READINESS_VERSION,
    visibility: "internal_only",
    status: "blocked_pre_execution",
    executionStatus: "blocked_no_io",
    blockedReason,
    authorityVersion: null,
    endpointSnapshotHash: null,
    networkBudgetSnapshotHash: null,
    sourceMaterialGuardStatus,
    ...zeroCostProof(),
    ...nullOutputs(),
  };
}

function hashesMatch(params: {
  readonly endpoint: SourceAcquisitionNetworkEndpointSnapshot;
  readonly budget: SourceAcquisitionNetworkBudgetSnapshot;
  readonly authoritySnapshot: ReturnType<typeof readSourceAcquisitionNetworkAuthoritySnapshot>;
}): boolean {
  return params.endpoint.endpointSnapshotHash === params.budget.endpointSnapshotHash
    && params.endpoint.endpointSnapshotHash === params.authoritySnapshot.endpointSnapshotHash
    && params.budget.networkBudgetSnapshotHash === params.authoritySnapshot.networkBudgetSnapshotHash
    && params.budget.candidateRuntimeConfigSnapshotHash
      === params.authoritySnapshot.candidateRuntimeConfigSnapshotHash
    && params.budget.candidateRuntimeProviderAllowlistSnapshotHash
      === params.authoritySnapshot.candidateRuntimeProviderAllowlistSnapshotHash
    && params.budget.candidateRuntimeBudgetSnapshotHash
      === params.authoritySnapshot.candidateRuntimeBudgetSnapshotHash;
}

export function buildSourceAcquisitionProviderNetworkReadiness(
  request: SourceAcquisitionProviderNetworkReadinessRequest,
): SourceAcquisitionProviderNetworkReadinessDecision {
  if (!isSourceAcquisitionNetworkAuthority(request.authority)) {
    return blocked("authority_invalid");
  }
  if (validateSourceAcquisitionNetworkEndpointSnapshot(request.endpoint).status !== "valid") {
    return blocked("endpoint_invalid");
  }
  if (validateSourceAcquisitionNetworkBudgetSnapshot(request.budget).status !== "valid") {
    return blocked("budget_invalid");
  }

  const authoritySnapshot = readSourceAcquisitionNetworkAuthoritySnapshot(request.authority);
  if (!hashesMatch({ endpoint: request.endpoint, budget: request.budget, authoritySnapshot })) {
    return blocked("authority_endpoint_budget_mismatch");
  }

  const sourceMaterialGuard = buildEvidenceCorpusSourceMaterialGuard(request.sourceMaterialInput);
  if (sourceMaterialGuard.status === "blocked_source_material_invalid") {
    return blocked("source_material_guard_invalid", sourceMaterialGuard.status);
  }
  if (sourceMaterialGuard.status !== "not_buildable_no_source_material") {
    return blocked("source_material_guard_not_negative", sourceMaterialGuard.status);
  }

  return {
    decisionVersion: SOURCE_ACQUISITION_PROVIDER_NETWORK_READINESS_VERSION,
    visibility: "internal_only",
    status: "not_executable_pre_live_gate",
    executionStatus: "blocked_no_io",
    blockedReason: null,
    authorityVersion: authoritySnapshot.authorityVersion,
    endpointSnapshotHash: request.endpoint.endpointSnapshotHash,
    networkBudgetSnapshotHash: request.budget.networkBudgetSnapshotHash,
    sourceMaterialGuardStatus: sourceMaterialGuard.status,
    ...zeroCostProof(),
    ...nullOutputs(),
  };
}
