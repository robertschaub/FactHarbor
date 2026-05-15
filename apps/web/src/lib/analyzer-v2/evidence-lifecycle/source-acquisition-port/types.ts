export const SOURCE_ACQUISITION_PORT_CONTRACT_VERSION = "v2.evidence-lifecycle.source-acquisition-port-contract.0";

export type SourceAcquisitionStructuralOutcomeKind =
  | "not_executed"
  | "provider_not_configured"
  | "provider_failure"
  | "search_failure"
  | "rate_limited"
  | "fetch_failure"
  | "content_unavailable"
  | "content_rejected_structurally"
  | "success";

export type SourceAcquisitionPortContract = {
  contractVersion: typeof SOURCE_ACQUISITION_PORT_CONTRACT_VERSION;
  source: "static_contract_only";
  contractStatus: "not_executable";
  queryPlanning: "llm_task_not_wired";
  semanticTaskExecution: "llm_task_not_wired";
  promptModelExecution: "not_approved";
  providerSearchFetchExecution: "not_wired";
  providerSdkImports: "forbidden";
  cachePolicy: "no_store_no_read";
  sourceReliabilityIntegration: "thin_port_pending";
  publicExposure: "forbidden";
  orchestratorProductWiring: "forbidden";
  acsDirectUrlExecution: "not_approved";
  structuralOutcomeKinds: readonly SourceAcquisitionStructuralOutcomeKind[];
};
