import { z } from "zod";
import {
  EVIDENCE_APPLICABILITY_RESULT_SCHEMA_VERSION,
  EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
  EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION,
  EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION,
  type EvidenceApplicabilityResult,
  type EvidenceExtractionResult,
  type EvidenceQueryPlanningResult,
  type EvidenceSufficiencyResult,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";

const EvidenceLifecycleTaskBlockedReasonSchema = z.enum([
  "task_policy_not_executable",
  "prompt_not_approved",
  "input_contract_invalid",
  "source_acquisition_not_executable",
  "source_content_missing",
]);

const EvidenceLifecycleTaskDamagedReasonSchema = z.enum([
  "schema_validation_failed",
  "provider_unavailable",
  "task_contract_validation_failed",
]);

export const EvidenceLifecycleTaskEventSchema = z.object({
  type: z.enum([
    "task_policy_blocked",
    "prompt_not_approved",
    "input_contract_invalid",
    "source_acquisition_not_executable",
    "source_content_missing",
    "schema_validation_failed",
    "provider_unavailable",
    "task_contract_validation_failed",
  ]),
  severity: z.enum(["info", "warning", "error"]),
  message: z.string().min(1),
  references: z.array(z.string()),
}).strict();

const EvidenceRetrievalPolicyKeySchema = z.enum([
  "baseline_research",
  "primary_source_refinement",
  "contradiction_search",
  "supplementary_language_lane",
  "evidence_scarcity_handling",
]);

const EvidenceMissingDimensionSchema = z.enum([
  "source_diversity",
  "direct_evidence",
  "counter_evidence",
  "temporal_coverage",
  "method_quality",
  "source_access",
  "other",
]);

const EvidenceQueryPlanSchema = z.object({
  queryPlanId: z.string().min(1),
  sourceLanguagePolicy: z.object({
    primaryLanguage: z.string().min(1),
    supplementaryLanguageDecision: z.enum([
      "not_needed",
      "needed",
      "deferred",
      "blocked_not_executable",
    ]),
    rationale: z.string().min(1),
  }).strict(),
  queries: z.array(z.object({
    queryId: z.string().min(1),
    retrievalPolicyKey: EvidenceRetrievalPolicyKeySchema,
    queryText: z.string().min(1),
    targetAtomicClaimIds: z.array(z.string().min(1)).min(1),
    rationale: z.string().min(1),
  }).strict()).min(1),
}).strict();

const AcceptedQueryPlanningResultSchema = z.object({
  schemaVersion: z.literal(EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION),
  taskKey: z.literal("evidence_query_planning"),
  status: z.literal("accepted"),
  queryPlan: EvidenceQueryPlanSchema,
  integrityEvents: z.array(EvidenceLifecycleTaskEventSchema),
  blockedReason: z.null(),
  damagedReason: z.null(),
}).strict();

const BlockedQueryPlanningResultSchema = z.object({
  schemaVersion: z.literal(EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION),
  taskKey: z.literal("evidence_query_planning"),
  status: z.literal("blocked"),
  queryPlan: z.null(),
  integrityEvents: z.array(EvidenceLifecycleTaskEventSchema).min(1),
  blockedReason: EvidenceLifecycleTaskBlockedReasonSchema,
  damagedReason: z.null(),
}).strict();

const DamagedQueryPlanningResultSchema = z.object({
  schemaVersion: z.literal(EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION),
  taskKey: z.literal("evidence_query_planning"),
  status: z.literal("damaged"),
  queryPlan: z.null(),
  integrityEvents: z.array(EvidenceLifecycleTaskEventSchema).min(1),
  blockedReason: z.null(),
  damagedReason: EvidenceLifecycleTaskDamagedReasonSchema,
}).strict();

export const EvidenceQueryPlanningResultSchema = z.discriminatedUnion("status", [
  AcceptedQueryPlanningResultSchema,
  BlockedQueryPlanningResultSchema,
  DamagedQueryPlanningResultSchema,
]);

const EvidenceApplicabilityDecisionSchema = z.object({
  sourceRecordId: z.string().min(1),
  contentPacketId: z.string().min(1),
  targetAtomicClaimIds: z.array(z.string().min(1)).min(1),
  applicability: z.enum(["applicable", "not_applicable", "uncertain"]),
  rationale: z.string().min(1),
  missingDimensions: z.array(EvidenceMissingDimensionSchema),
}).strict();

const AcceptedApplicabilityResultSchema = z.object({
  schemaVersion: z.literal(EVIDENCE_APPLICABILITY_RESULT_SCHEMA_VERSION),
  taskKey: z.literal("evidence_applicability"),
  status: z.literal("accepted"),
  applicabilityDecisions: z.array(EvidenceApplicabilityDecisionSchema).min(1),
  integrityEvents: z.array(EvidenceLifecycleTaskEventSchema),
  blockedReason: z.null(),
  damagedReason: z.null(),
}).strict();

const BlockedApplicabilityResultSchema = z.object({
  schemaVersion: z.literal(EVIDENCE_APPLICABILITY_RESULT_SCHEMA_VERSION),
  taskKey: z.literal("evidence_applicability"),
  status: z.literal("blocked"),
  applicabilityDecisions: z.null(),
  integrityEvents: z.array(EvidenceLifecycleTaskEventSchema).min(1),
  blockedReason: EvidenceLifecycleTaskBlockedReasonSchema,
  damagedReason: z.null(),
}).strict();

const DamagedApplicabilityResultSchema = z.object({
  schemaVersion: z.literal(EVIDENCE_APPLICABILITY_RESULT_SCHEMA_VERSION),
  taskKey: z.literal("evidence_applicability"),
  status: z.literal("damaged"),
  applicabilityDecisions: z.null(),
  integrityEvents: z.array(EvidenceLifecycleTaskEventSchema).min(1),
  blockedReason: z.null(),
  damagedReason: EvidenceLifecycleTaskDamagedReasonSchema,
}).strict();

export const EvidenceApplicabilityResultSchema = z.discriminatedUnion("status", [
  AcceptedApplicabilityResultSchema,
  BlockedApplicabilityResultSchema,
  DamagedApplicabilityResultSchema,
]);

const EvidenceScopeContractSchema = z.object({
  scopeId: z.string().min(1),
  method: z.string().nullable(),
  temporalBounds: z.string().nullable(),
  populationOrDomain: z.string().nullable(),
  geographicScope: z.string().nullable(),
  limitations: z.array(z.string()),
}).strict();

const ExtractedEvidenceItemContractSchema = z.object({
  evidenceItemId: z.string().min(1),
  sourceRecordId: z.string().min(1),
  contentPacketId: z.string().min(1),
  statement: z.string().min(1),
  targetAtomicClaimIds: z.array(z.string().min(1)).min(1),
  claimDirection: z.enum(["supports", "opposes", "mixed", "contextual", "unclear"]),
  evidenceScope: EvidenceScopeContractSchema,
  probativeValue: z.enum(["high", "medium", "low", "insufficient"]),
  evidenceStrength: z.enum(["strong", "moderate", "limited", "unclear"]),
  extractionConfidence: z.enum(["high", "medium", "low"]),
  provenance: z.object({
    locator: z.string().min(1),
    rationale: z.string().min(1),
  }).strict(),
}).strict();

const AcceptedExtractionResultSchema = z.object({
  schemaVersion: z.literal(EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION),
  taskKey: z.literal("evidence_extraction"),
  status: z.literal("accepted"),
  evidenceItems: z.array(ExtractedEvidenceItemContractSchema).min(1),
  integrityEvents: z.array(EvidenceLifecycleTaskEventSchema),
  blockedReason: z.null(),
  damagedReason: z.null(),
}).strict();

const BlockedExtractionResultSchema = z.object({
  schemaVersion: z.literal(EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION),
  taskKey: z.literal("evidence_extraction"),
  status: z.literal("blocked"),
  evidenceItems: z.null(),
  integrityEvents: z.array(EvidenceLifecycleTaskEventSchema).min(1),
  blockedReason: EvidenceLifecycleTaskBlockedReasonSchema,
  damagedReason: z.null(),
}).strict();

const DamagedExtractionResultSchema = z.object({
  schemaVersion: z.literal(EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION),
  taskKey: z.literal("evidence_extraction"),
  status: z.literal("damaged"),
  evidenceItems: z.null(),
  integrityEvents: z.array(EvidenceLifecycleTaskEventSchema).min(1),
  blockedReason: z.null(),
  damagedReason: EvidenceLifecycleTaskDamagedReasonSchema,
}).strict();

export const EvidenceExtractionResultSchema = z.discriminatedUnion("status", [
  AcceptedExtractionResultSchema,
  BlockedExtractionResultSchema,
  DamagedExtractionResultSchema,
]);

const EvidenceSufficiencyAssessmentSchema = z.object({
  sufficiencyStatus: z.enum(["sufficient", "insufficient", "needs_refinement", "caveated"]),
  missingEvidenceDimensions: z.array(z.object({
    dimension: EvidenceMissingDimensionSchema,
    materiality: z.enum(["none", "minor", "material"]),
    rationale: z.string().min(1),
  }).strict()),
  recommendedNextAction: z.enum([
    "continue_to_boundary_formation",
    "refine_retrieval",
    "caveat_report",
    "damage_report",
  ]),
  materialScarcityCandidate: z.enum(["none", "possible", "material"]),
  rationale: z.string().min(1),
}).strict();

const AcceptedSufficiencyResultSchema = z.object({
  schemaVersion: z.literal(EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION),
  taskKey: z.literal("evidence_sufficiency"),
  status: z.literal("accepted"),
  sufficiencyAssessment: EvidenceSufficiencyAssessmentSchema,
  integrityEvents: z.array(EvidenceLifecycleTaskEventSchema),
  blockedReason: z.null(),
  damagedReason: z.null(),
}).strict();

const BlockedSufficiencyResultSchema = z.object({
  schemaVersion: z.literal(EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION),
  taskKey: z.literal("evidence_sufficiency"),
  status: z.literal("blocked"),
  sufficiencyAssessment: z.null(),
  integrityEvents: z.array(EvidenceLifecycleTaskEventSchema).min(1),
  blockedReason: EvidenceLifecycleTaskBlockedReasonSchema,
  damagedReason: z.null(),
}).strict();

const DamagedSufficiencyResultSchema = z.object({
  schemaVersion: z.literal(EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION),
  taskKey: z.literal("evidence_sufficiency"),
  status: z.literal("damaged"),
  sufficiencyAssessment: z.null(),
  integrityEvents: z.array(EvidenceLifecycleTaskEventSchema).min(1),
  blockedReason: z.null(),
  damagedReason: EvidenceLifecycleTaskDamagedReasonSchema,
}).strict();

export const EvidenceSufficiencyResultSchema = z.discriminatedUnion("status", [
  AcceptedSufficiencyResultSchema,
  BlockedSufficiencyResultSchema,
  DamagedSufficiencyResultSchema,
]);

export function parseEvidenceQueryPlanningResult(value: unknown): EvidenceQueryPlanningResult {
  return EvidenceQueryPlanningResultSchema.parse(value) as EvidenceQueryPlanningResult;
}

export function parseEvidenceApplicabilityResult(value: unknown): EvidenceApplicabilityResult {
  return EvidenceApplicabilityResultSchema.parse(value) as EvidenceApplicabilityResult;
}

export function parseEvidenceExtractionResult(value: unknown): EvidenceExtractionResult {
  return EvidenceExtractionResultSchema.parse(value) as EvidenceExtractionResult;
}

export function parseEvidenceSufficiencyResult(value: unknown): EvidenceSufficiencyResult {
  return EvidenceSufficiencyResultSchema.parse(value) as EvidenceSufficiencyResult;
}
