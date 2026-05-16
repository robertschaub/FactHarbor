import {
  SOURCE_ACQUISITION_PORT_CONTRACT_VERSION,
  type SourceAcquisitionPortContract,
  type SourceAcquisitionStructuralOutcomeKind,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition-port/types";

const STATIC_STRUCTURAL_OUTCOME_KINDS: readonly SourceAcquisitionStructuralOutcomeKind[] = [
  "not_executed",
  "provider_not_configured",
  "provider_failure",
  "search_failure",
  "rate_limited",
  "fetch_failure",
  "content_unavailable",
  "content_rejected_structurally",
  "success",
];

export function readStaticSourceAcquisitionStructuralOutcomeKinds(): SourceAcquisitionStructuralOutcomeKind[] {
  return [...STATIC_STRUCTURAL_OUTCOME_KINDS];
}

export function readStaticSourceAcquisitionPortContract(): SourceAcquisitionPortContract {
  return {
    contractVersion: SOURCE_ACQUISITION_PORT_CONTRACT_VERSION,
    source: "static_contract_only",
    contractStatus: "not_executable",
    queryPlanning: "hidden_internal_query_planning_available",
    semanticTaskExecution: "llm_task_not_wired",
    promptModelExecution: "not_approved",
    providerSearchFetchExecution: "not_wired",
    providerSdkImports: "forbidden",
    cachePolicy: "no_store_no_read",
    sourceReliabilityIntegration: "thin_port_pending",
    publicExposure: "forbidden",
    orchestratorProductWiring: "forbidden",
    acsDirectUrlExecution: "not_approved",
    structuralOutcomeKinds: readStaticSourceAcquisitionStructuralOutcomeKinds(),
  };
}
