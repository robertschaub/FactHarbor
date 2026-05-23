import type {
  AnalyzerV2CacheDimension,
  AnalyzerV2CachePolicy,
  AnalyzerV2PolicyApproval,
} from "@/lib/analyzer-v2/gateway/types";
import {
  ANALYZER_V2_7L1_CAPTAIN_APPROVAL,
  ANALYZER_V2_HJ78_CAPTAIN_APPROVAL,
  ANALYZER_V2_HJ19_CAPTAIN_APPROVAL,
  ANALYZER_V2_W6_C_CAPTAIN_APPROVAL,
  ANALYZER_V2_W7_B_CAPTAIN_APPROVAL,
  ANALYZER_V2_X7_W5_A_CAPTAIN_APPROVAL,
  ANALYZER_V2_X7_W5_B_CAPTAIN_APPROVAL,
} from "@/lib/analyzer-v2/gateway/approval-records";

const PENDING_APPROVAL: AnalyzerV2PolicyApproval = {
  status: "pending",
  reviewer: null,
  approvedAt: null,
};

export const ANALYZER_V2_BASE_SEMANTIC_CACHE_DIMENSIONS = [
  "promptProfile",
  "promptSectionId",
  "promptContentHash",
  "modelTask",
  "provider",
  "modelName",
  "temperature",
  "outputSchemaVersion",
  "configSnapshotHash",
  "resultSchemaVersion",
  "inputIdentityHash",
  "currentDateBucket",
] as const satisfies readonly AnalyzerV2CacheDimension[];

export const ANALYZER_V2_CONTEXTUAL_CACHE_DIMENSIONS = [
  "sourceIdentityHash",
  "languageContextHash",
  "searchContextHash",
  "adapterVersion",
] as const satisfies readonly AnalyzerV2CacheDimension[];

export const ANALYZER_V2_BASE_SEMANTIC_CACHE_POLICY: AnalyzerV2CachePolicy = {
  policyId: "v2.semantic.base",
  requiredDimensions: ANALYZER_V2_BASE_SEMANTIC_CACHE_DIMENSIONS,
  optionalDimensions: ANALYZER_V2_CONTEXTUAL_CACHE_DIMENSIONS,
  approval: PENDING_APPROVAL,
};

export const ANALYZER_V2_SOURCE_AWARE_CACHE_POLICY: AnalyzerV2CachePolicy = {
  policyId: "v2.semantic.source-aware",
  requiredDimensions: [
    ...ANALYZER_V2_BASE_SEMANTIC_CACHE_DIMENSIONS,
    "sourceIdentityHash",
  ],
  optionalDimensions: [
    "languageContextHash",
    "searchContextHash",
    "adapterVersion",
  ],
  approval: PENDING_APPROVAL,
};

export const ANALYZER_V2_CLAIM_UNDERSTANDING_CACHE_POLICY: AnalyzerV2CachePolicy = {
  policyId: "v2.semantic.claim-understanding",
  requiredDimensions: [
    ...ANALYZER_V2_BASE_SEMANTIC_CACHE_DIMENSIONS,
    "claimUnderstandingInputSource",
    "inputGroundingSeedHash",
  ],
  optionalDimensions: [
    "acsSnapshotHash",
    "languageContextHash",
    "searchContextHash",
    "adapterVersion",
  ],
  approval: ANALYZER_V2_X7_W5_B_CAPTAIN_APPROVAL,
};

export const ANALYZER_V2_EVIDENCE_QUERY_PLANNING_CACHE_POLICY: AnalyzerV2CachePolicy = {
  policyId: "v2.semantic.evidence-query-planning",
  requiredDimensions: [
    "promptProfile",
    "promptSectionId",
    "promptContentHash",
    "modelTask",
    "provider",
    "modelName",
    "temperature",
    "outputSchemaVersion",
    "configSnapshotHash",
    "resultSchemaVersion",
    "inputIdentityHash",
    "languageContextHash",
    "currentDateBucket",
  ],
  optionalDimensions: [
    "adapterVersion",
  ],
  approval: ANALYZER_V2_7L1_CAPTAIN_APPROVAL,
};

export const ANALYZER_V2_EVIDENCE_APPLICABILITY_CACHE_POLICY: AnalyzerV2CachePolicy = {
  policyId: "v2.semantic.evidence-applicability.hj78",
  requiredDimensions: [
    "promptProfile",
    "promptSectionId",
    "promptContentHash",
    "modelTask",
    "provider",
    "modelName",
    "temperature",
    "outputSchemaVersion",
    "configSnapshotHash",
    "resultSchemaVersion",
    "inputIdentityHash",
    "sourceIdentityHash",
    "languageContextHash",
    "currentDateBucket",
  ],
  optionalDimensions: [
    "adapterVersion",
  ],
  approval: ANALYZER_V2_HJ78_CAPTAIN_APPROVAL,
};

export const ANALYZER_V2_EVIDENCE_EXTRACTION_CACHE_POLICY: AnalyzerV2CachePolicy = {
  policyId: "v2.semantic.evidence-extraction.x7w5",
  requiredDimensions: [
    "promptProfile",
    "promptSectionId",
    "promptContentHash",
    "modelTask",
    "provider",
    "modelName",
    "temperature",
    "outputSchemaVersion",
    "configSnapshotHash",
    "resultSchemaVersion",
    "inputIdentityHash",
    "sourceIdentityHash",
    "languageContextHash",
    "currentDateBucket",
  ],
  optionalDimensions: [
    "adapterVersion",
  ],
  approval: ANALYZER_V2_X7_W5_A_CAPTAIN_APPROVAL,
};

export const ANALYZER_V2_EVIDENCE_SUFFICIENCY_CACHE_POLICY: AnalyzerV2CachePolicy = {
  policyId: "v2.semantic.evidence-sufficiency.w6c",
  requiredDimensions: [
    "promptProfile",
    "promptSectionId",
    "promptContentHash",
    "modelTask",
    "provider",
    "modelName",
    "temperature",
    "outputSchemaVersion",
    "configSnapshotHash",
    "resultSchemaVersion",
    "inputIdentityHash",
    "sourceIdentityHash",
    "currentDateBucket",
  ],
  optionalDimensions: [
    "adapterVersion",
  ],
  approval: ANALYZER_V2_W6_C_CAPTAIN_APPROVAL,
};

export const ANALYZER_V2_BOUNDARY_VERDICT_EXECUTION_CACHE_POLICY: AnalyzerV2CachePolicy = {
  policyId: "v2.semantic.boundary-verdict-execution.w7b",
  requiredDimensions: [
    "promptProfile",
    "promptSectionId",
    "promptContentHash",
    "modelTask",
    "provider",
    "modelName",
    "temperature",
    "outputSchemaVersion",
    "configSnapshotHash",
    "resultSchemaVersion",
    "inputIdentityHash",
    "sourceIdentityHash",
    "currentDateBucket",
  ],
  optionalDimensions: [
    "adapterVersion",
  ],
  approval: ANALYZER_V2_W7_B_CAPTAIN_APPROVAL,
};

export const ANALYZER_V2_AGGREGATION_NARRATIVE_CACHE_POLICY: AnalyzerV2CachePolicy = {
  policyId: "v2.semantic.aggregation-narrative.hj19",
  requiredDimensions: [
    "promptProfile",
    "promptSectionId",
    "promptContentHash",
    "modelTask",
    "provider",
    "modelName",
    "temperature",
    "outputSchemaVersion",
    "configSnapshotHash",
    "resultSchemaVersion",
    "inputIdentityHash",
    "sourceIdentityHash",
    "currentDateBucket",
  ],
  optionalDimensions: [
    "adapterVersion",
  ],
  approval: ANALYZER_V2_HJ19_CAPTAIN_APPROVAL,
};
