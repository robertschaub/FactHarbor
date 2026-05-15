export const EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION = "v2.evidence_query_planning_result.0";
export const EVIDENCE_APPLICABILITY_RESULT_SCHEMA_VERSION = "v2.evidence_applicability_result.0";
export const EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION = "v2.evidence_extraction_result.0";
export const EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION = "v2.evidence_sufficiency_assessment.0";

export const EVIDENCE_TASK_PROMPT_SECTION_IDS = {
  evidence_query_planning: "V2_EVIDENCE_QUERY_PLANNING",
  evidence_applicability: "V2_EVIDENCE_APPLICABILITY",
  evidence_extraction: "V2_EVIDENCE_EXTRACTION",
  evidence_sufficiency: "V2_EVIDENCE_SUFFICIENCY_GATE",
} as const;

export const EVIDENCE_TASK_OUTPUT_SCHEMA_VERSIONS = {
  evidence_query_planning: EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION,
  evidence_applicability: EVIDENCE_APPLICABILITY_RESULT_SCHEMA_VERSION,
  evidence_extraction: EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
  evidence_sufficiency: EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION,
} as const;

export type EvidenceLifecycleTaskKey = keyof typeof EVIDENCE_TASK_PROMPT_SECTION_IDS;

export type EvidenceLifecycleTaskPromptSectionId =
  typeof EVIDENCE_TASK_PROMPT_SECTION_IDS[EvidenceLifecycleTaskKey];

export type EvidenceLifecycleTaskOutputSchemaVersion =
  typeof EVIDENCE_TASK_OUTPUT_SCHEMA_VERSIONS[EvidenceLifecycleTaskKey];

export type EvidenceLifecycleTaskBlockedReason =
  | "task_policy_not_executable"
  | "prompt_not_approved"
  | "input_contract_invalid"
  | "source_acquisition_not_executable"
  | "source_content_missing";

export type EvidenceLifecycleTaskDamagedReason =
  | "schema_validation_failed"
  | "provider_unavailable"
  | "task_contract_validation_failed";

export type EvidenceLifecycleTaskEvent = {
  type:
    | "task_policy_blocked"
    | "prompt_not_approved"
    | "input_contract_invalid"
    | "source_acquisition_not_executable"
    | "source_content_missing"
    | "schema_validation_failed"
    | "provider_unavailable"
    | "task_contract_validation_failed";
  severity: "info" | "warning" | "error";
  message: string;
  references: string[];
};

export type EvidenceRetrievalPolicyKey =
  | "baseline_research"
  | "primary_source_refinement"
  | "contradiction_search"
  | "supplementary_language_lane"
  | "evidence_scarcity_handling";

export type EvidenceMissingDimension =
  | "source_diversity"
  | "direct_evidence"
  | "counter_evidence"
  | "temporal_coverage"
  | "method_quality"
  | "source_access"
  | "other";

export type EvidenceQueryPlanEntry = {
  queryId: string;
  retrievalPolicyKey: EvidenceRetrievalPolicyKey;
  queryText: string;
  targetAtomicClaimIds: string[];
  rationale: string;
};

export type EvidenceQueryPlan = {
  queryPlanId: string;
  sourceLanguagePolicy: {
    primaryLanguage: string;
    supplementaryLanguageDecision: "not_needed" | "needed" | "deferred" | "blocked_not_executable";
    rationale: string;
  };
  queries: EvidenceQueryPlanEntry[];
};

export type EvidenceQueryPlanningResult =
  | {
    schemaVersion: typeof EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION;
    taskKey: "evidence_query_planning";
    status: "accepted";
    queryPlan: EvidenceQueryPlan;
    integrityEvents: EvidenceLifecycleTaskEvent[];
    blockedReason: null;
    damagedReason: null;
  }
  | {
    schemaVersion: typeof EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION;
    taskKey: "evidence_query_planning";
    status: "blocked";
    queryPlan: null;
    integrityEvents: EvidenceLifecycleTaskEvent[];
    blockedReason: EvidenceLifecycleTaskBlockedReason;
    damagedReason: null;
  }
  | {
    schemaVersion: typeof EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION;
    taskKey: "evidence_query_planning";
    status: "damaged";
    queryPlan: null;
    integrityEvents: EvidenceLifecycleTaskEvent[];
    blockedReason: null;
    damagedReason: EvidenceLifecycleTaskDamagedReason;
  };

export type EvidenceApplicabilityDecision = {
  sourceRecordId: string;
  contentPacketId: string;
  targetAtomicClaimIds: string[];
  applicability: "applicable" | "not_applicable" | "uncertain";
  rationale: string;
  missingDimensions: EvidenceMissingDimension[];
};

export type EvidenceApplicabilityResult =
  | {
    schemaVersion: typeof EVIDENCE_APPLICABILITY_RESULT_SCHEMA_VERSION;
    taskKey: "evidence_applicability";
    status: "accepted";
    applicabilityDecisions: EvidenceApplicabilityDecision[];
    integrityEvents: EvidenceLifecycleTaskEvent[];
    blockedReason: null;
    damagedReason: null;
  }
  | {
    schemaVersion: typeof EVIDENCE_APPLICABILITY_RESULT_SCHEMA_VERSION;
    taskKey: "evidence_applicability";
    status: "blocked";
    applicabilityDecisions: null;
    integrityEvents: EvidenceLifecycleTaskEvent[];
    blockedReason: EvidenceLifecycleTaskBlockedReason;
    damagedReason: null;
  }
  | {
    schemaVersion: typeof EVIDENCE_APPLICABILITY_RESULT_SCHEMA_VERSION;
    taskKey: "evidence_applicability";
    status: "damaged";
    applicabilityDecisions: null;
    integrityEvents: EvidenceLifecycleTaskEvent[];
    blockedReason: null;
    damagedReason: EvidenceLifecycleTaskDamagedReason;
  };

export type EvidenceScopeContract = {
  scopeId: string;
  method: string | null;
  temporalBounds: string | null;
  populationOrDomain: string | null;
  geographicScope: string | null;
  limitations: string[];
};

export type ExtractedEvidenceItemContract = {
  evidenceItemId: string;
  sourceRecordId: string;
  contentPacketId: string;
  statement: string;
  targetAtomicClaimIds: string[];
  claimDirection: "supports" | "opposes" | "mixed" | "contextual" | "unclear";
  evidenceScope: EvidenceScopeContract;
  probativeValue: "high" | "medium" | "low" | "insufficient";
  evidenceStrength: "strong" | "moderate" | "limited" | "unclear";
  extractionConfidence: "high" | "medium" | "low";
  provenance: {
    locator: string;
    rationale: string;
  };
};

export type EvidenceExtractionResult =
  | {
    schemaVersion: typeof EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION;
    taskKey: "evidence_extraction";
    status: "accepted";
    extractionStatus: "evidence_extracted";
    rationale: string;
    evidenceItems: [ExtractedEvidenceItemContract, ...ExtractedEvidenceItemContract[]];
    integrityEvents: EvidenceLifecycleTaskEvent[];
    blockedReason: null;
    damagedReason: null;
  }
  | {
    schemaVersion: typeof EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION;
    taskKey: "evidence_extraction";
    status: "accepted";
    extractionStatus: "no_extractable_evidence";
    rationale: string;
    evidenceItems: [];
    integrityEvents: EvidenceLifecycleTaskEvent[];
    blockedReason: null;
    damagedReason: null;
  }
  | {
    schemaVersion: typeof EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION;
    taskKey: "evidence_extraction";
    status: "blocked";
    extractionStatus: null;
    rationale: null;
    evidenceItems: null;
    integrityEvents: EvidenceLifecycleTaskEvent[];
    blockedReason: EvidenceLifecycleTaskBlockedReason;
    damagedReason: null;
  }
  | {
    schemaVersion: typeof EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION;
    taskKey: "evidence_extraction";
    status: "damaged";
    extractionStatus: null;
    rationale: null;
    evidenceItems: null;
    integrityEvents: EvidenceLifecycleTaskEvent[];
    blockedReason: null;
    damagedReason: EvidenceLifecycleTaskDamagedReason;
  };

export type EvidenceSufficiencyMissingDimension = {
  dimension: EvidenceMissingDimension;
  materiality: "none" | "minor" | "material";
  rationale: string;
};

export type EvidenceSufficiencyAssessment = {
  sufficiencyStatus: "sufficient" | "insufficient" | "needs_refinement" | "caveated";
  missingEvidenceDimensions: EvidenceSufficiencyMissingDimension[];
  recommendedNextAction:
    | "continue_to_boundary_formation"
    | "refine_retrieval"
    | "caveat_report"
    | "damage_report";
  materialScarcityCandidate: "none" | "possible" | "material";
  rationale: string;
};

export type EvidenceSufficiencyResult =
  | {
    schemaVersion: typeof EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION;
    taskKey: "evidence_sufficiency";
    status: "accepted";
    sufficiencyAssessment: EvidenceSufficiencyAssessment;
    integrityEvents: EvidenceLifecycleTaskEvent[];
    blockedReason: null;
    damagedReason: null;
  }
  | {
    schemaVersion: typeof EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION;
    taskKey: "evidence_sufficiency";
    status: "blocked";
    sufficiencyAssessment: null;
    integrityEvents: EvidenceLifecycleTaskEvent[];
    blockedReason: EvidenceLifecycleTaskBlockedReason;
    damagedReason: null;
  }
  | {
    schemaVersion: typeof EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION;
    taskKey: "evidence_sufficiency";
    status: "damaged";
    sufficiencyAssessment: null;
    integrityEvents: EvidenceLifecycleTaskEvent[];
    blockedReason: null;
    damagedReason: EvidenceLifecycleTaskDamagedReason;
  };

export type EvidenceLifecycleTaskResult =
  | EvidenceQueryPlanningResult
  | EvidenceApplicabilityResult
  | EvidenceExtractionResult
  | EvidenceSufficiencyResult;
