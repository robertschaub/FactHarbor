import { describe, expect, it } from "vitest";
import {
  EVIDENCE_APPLICABILITY_RESULT_SCHEMA_VERSION,
  EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
  EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION,
  EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION,
  type EvidenceApplicabilityResult,
  type EvidenceExtractionResult,
  type EvidenceLifecycleTaskEvent,
  type EvidenceQueryPlanningResult,
  type EvidenceSufficiencyResult,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";
import {
  EvidenceApplicabilityResultSchema,
  EvidenceExtractionResultSchema,
  EvidenceQueryPlanningResultSchema,
  EvidenceSufficiencyResultSchema,
  parseEvidenceApplicabilityResult,
  parseEvidenceExtractionResult,
  parseEvidenceQueryPlanningResult,
  parseEvidenceSufficiencyResult,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/schemas";

const taskBlockedEvent: EvidenceLifecycleTaskEvent = {
  type: "task_policy_blocked",
  severity: "error",
  message: "Task policy is not executable for this Evidence Lifecycle task.",
  references: ["task-policy-snapshot"],
};

const schemaFailureEvent: EvidenceLifecycleTaskEvent = {
  type: "schema_validation_failed",
  severity: "error",
  message: "Provider output did not match the task result schema.",
  references: ["task-output"],
};

function withExtraField<T extends object>(value: T): T & { extraField: string } {
  return { ...value, extraField: "not allowed" };
}

describe("analyzer-v2 Evidence Lifecycle task output schemas", () => {
  it("validates query planning accepted, blocked, and damaged envelopes", () => {
    const accepted: EvidenceQueryPlanningResult = {
      schemaVersion: EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION,
      taskKey: "evidence_query_planning",
      status: "accepted",
      queryPlan: {
        queryPlanId: "EQP_001",
        sourceLanguagePolicy: {
          primaryLanguage: "und",
          supplementaryLanguageDecision: "deferred",
          rationale: "Supplementary language search requires approved task policy.",
        },
        queries: [
          {
            queryId: "EQ_001",
            retrievalPolicyKey: "baseline_research",
            queryText: "abstract query text",
            targetAtomicClaimIds: ["AC_001"],
            rationale: "Baseline retrieval should cover the selected assertion.",
          },
        ],
      },
      integrityEvents: [],
      blockedReason: null,
      damagedReason: null,
    };
    const blocked: EvidenceQueryPlanningResult = {
      schemaVersion: EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION,
      taskKey: "evidence_query_planning",
      status: "blocked",
      queryPlan: null,
      integrityEvents: [taskBlockedEvent],
      blockedReason: "task_policy_not_executable",
      damagedReason: null,
    };
    const damaged: EvidenceQueryPlanningResult = {
      schemaVersion: EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION,
      taskKey: "evidence_query_planning",
      status: "damaged",
      queryPlan: null,
      integrityEvents: [schemaFailureEvent],
      blockedReason: null,
      damagedReason: "schema_validation_failed",
    };

    expect(parseEvidenceQueryPlanningResult(accepted)).toEqual(accepted);
    expect(parseEvidenceQueryPlanningResult(blocked)).toEqual(blocked);
    expect(parseEvidenceQueryPlanningResult(damaged)).toEqual(damaged);
    expect(EvidenceQueryPlanningResultSchema.safeParse(withExtraField(accepted)).success).toBe(false);
    expect(EvidenceQueryPlanningResultSchema.safeParse({
      ...damaged,
      integrityEvents: [
        {
          eventType: "schema_validation_failed",
          severity: "error",
          message: "Provider output did not match the task result schema.",
        },
      ],
    }).success).toBe(false);
  });

  it("validates applicability accepted, blocked, and damaged envelopes", () => {
    const accepted: EvidenceApplicabilityResult = {
      schemaVersion: EVIDENCE_APPLICABILITY_RESULT_SCHEMA_VERSION,
      taskKey: "evidence_applicability",
      status: "accepted",
      applicabilityDecisions: [
        {
          sourceRecordId: "SRC_001",
          contentPacketId: "CONTENT_001",
          targetAtomicClaimIds: ["AC_001"],
          applicability: "applicable",
          rationale: "The content directly addresses the selected assertion.",
          missingDimensions: [],
        },
      ],
      integrityEvents: [],
      blockedReason: null,
      damagedReason: null,
    };
    const acceptedWithCategoricalMissingDimension: EvidenceApplicabilityResult = {
      ...accepted,
      applicabilityDecisions: [
        {
          ...accepted.applicabilityDecisions[0],
          applicability: "uncertain",
          missingDimensions: ["direct_evidence"],
        },
      ],
    };
    const blocked: EvidenceApplicabilityResult = {
      schemaVersion: EVIDENCE_APPLICABILITY_RESULT_SCHEMA_VERSION,
      taskKey: "evidence_applicability",
      status: "blocked",
      applicabilityDecisions: null,
      integrityEvents: [taskBlockedEvent],
      blockedReason: "source_content_missing",
      damagedReason: null,
    };
    const damaged: EvidenceApplicabilityResult = {
      schemaVersion: EVIDENCE_APPLICABILITY_RESULT_SCHEMA_VERSION,
      taskKey: "evidence_applicability",
      status: "damaged",
      applicabilityDecisions: null,
      integrityEvents: [schemaFailureEvent],
      blockedReason: null,
      damagedReason: "task_contract_validation_failed",
    };

    expect(parseEvidenceApplicabilityResult(accepted)).toEqual(accepted);
    expect(parseEvidenceApplicabilityResult(acceptedWithCategoricalMissingDimension)).toEqual(
      acceptedWithCategoricalMissingDimension,
    );
    expect(parseEvidenceApplicabilityResult(blocked)).toEqual(blocked);
    expect(parseEvidenceApplicabilityResult(damaged)).toEqual(damaged);
    expect(EvidenceApplicabilityResultSchema.safeParse(withExtraField(accepted)).success).toBe(false);
    expect(EvidenceApplicabilityResultSchema.safeParse({
      ...accepted,
      applicabilityDecisions: [
        {
          ...accepted.applicabilityDecisions[0],
          missingDimensions: ["free_text_missing_dimension"],
        },
      ],
    }).success).toBe(false);
  });

  it("validates extraction accepted, blocked, and damaged envelopes", () => {
    const accepted: EvidenceExtractionResult = {
      schemaVersion: EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
      taskKey: "evidence_extraction",
      status: "accepted",
      extractionStatus: "evidence_extracted",
      rationale: "One evidence item was extractable from the applicable source content.",
      evidenceItems: [
        {
          evidenceItemId: "EVI_001",
          sourceRecordId: "SRC_001",
          contentPacketId: "CONTENT_001",
          statement: "Entity A made assertion B in source content.",
          targetAtomicClaimIds: ["AC_001"],
          claimDirection: "supports",
          evidenceScope: {
            scopeId: "ESCOPE_001",
            method: "document analysis",
            temporalBounds: null,
            populationOrDomain: null,
            geographicScope: null,
            limitations: [],
          },
          probativeValue: "medium",
          evidenceStrength: "moderate",
          extractionConfidence: "high",
          provenance: {
            locator: "CONTENT_001#segment-1",
            rationale: "The cited segment contains the extracted assertion.",
          },
        },
      ],
      integrityEvents: [],
      blockedReason: null,
      damagedReason: null,
    };
    const acceptedWithNoExtractableEvidence: EvidenceExtractionResult = {
      ...accepted,
      extractionStatus: "no_extractable_evidence",
      rationale: "The applicable source content did not contain extractable evidence for the selected AtomicClaim.",
      evidenceItems: [],
    };
    const blocked: EvidenceExtractionResult = {
      schemaVersion: EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
      taskKey: "evidence_extraction",
      status: "blocked",
      extractionStatus: null,
      rationale: null,
      evidenceItems: null,
      integrityEvents: [taskBlockedEvent],
      blockedReason: "prompt_not_approved",
      damagedReason: null,
    };
    const damaged: EvidenceExtractionResult = {
      schemaVersion: EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
      taskKey: "evidence_extraction",
      status: "damaged",
      extractionStatus: null,
      rationale: null,
      evidenceItems: null,
      integrityEvents: [schemaFailureEvent],
      blockedReason: null,
      damagedReason: "provider_unavailable",
    };

    expect(parseEvidenceExtractionResult(accepted)).toEqual(accepted);
    expect(parseEvidenceExtractionResult(acceptedWithNoExtractableEvidence)).toEqual(
      acceptedWithNoExtractableEvidence,
    );
    expect(parseEvidenceExtractionResult(blocked)).toEqual(blocked);
    expect(parseEvidenceExtractionResult(damaged)).toEqual(damaged);
    expect(EvidenceExtractionResultSchema.safeParse(withExtraField(accepted)).success).toBe(false);
    expect(EvidenceExtractionResultSchema.safeParse({
      ...accepted,
      evidenceItems: [],
    }).success).toBe(false);
    expect(EvidenceExtractionResultSchema.safeParse({
      ...acceptedWithNoExtractableEvidence,
      evidenceItems: accepted.evidenceItems,
    }).success).toBe(false);
  });

  it("validates sufficiency accepted, blocked, and damaged envelopes", () => {
    const accepted: EvidenceSufficiencyResult = {
      schemaVersion: EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION,
      taskKey: "evidence_sufficiency",
      status: "accepted",
      sufficiencyAssessment: {
        sufficiencyStatus: "needs_refinement",
        missingEvidenceDimensions: [
          {
            dimension: "counter_evidence",
            materiality: "minor",
            rationale: "The corpus has limited directly opposing evidence.",
          },
        ],
        recommendedNextAction: "refine_retrieval",
        materialScarcityCandidate: "possible",
        rationale: "More directly opposing evidence would improve the corpus before boundary formation.",
      },
      integrityEvents: [],
      blockedReason: null,
      damagedReason: null,
    };
    const blocked: EvidenceSufficiencyResult = {
      schemaVersion: EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION,
      taskKey: "evidence_sufficiency",
      status: "blocked",
      sufficiencyAssessment: null,
      integrityEvents: [taskBlockedEvent],
      blockedReason: "source_acquisition_not_executable",
      damagedReason: null,
    };
    const damaged: EvidenceSufficiencyResult = {
      schemaVersion: EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION,
      taskKey: "evidence_sufficiency",
      status: "damaged",
      sufficiencyAssessment: null,
      integrityEvents: [schemaFailureEvent],
      blockedReason: null,
      damagedReason: "schema_validation_failed",
    };

    expect(parseEvidenceSufficiencyResult(accepted)).toEqual(accepted);
    expect(parseEvidenceSufficiencyResult(blocked)).toEqual(blocked);
    expect(parseEvidenceSufficiencyResult(damaged)).toEqual(damaged);
    expect(EvidenceSufficiencyResultSchema.safeParse(withExtraField(accepted)).success).toBe(false);
  });

  it("does not let accepted payloads masquerade across task schemas", () => {
    const queryAccepted: EvidenceQueryPlanningResult = {
      schemaVersion: EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION,
      taskKey: "evidence_query_planning",
      status: "accepted",
      queryPlan: {
        queryPlanId: "EQP_001",
        sourceLanguagePolicy: {
          primaryLanguage: "und",
          supplementaryLanguageDecision: "not_needed",
          rationale: "No supplementary lane was requested.",
        },
        queries: [
          {
            queryId: "EQ_001",
            retrievalPolicyKey: "baseline_research",
            queryText: "abstract query text",
            targetAtomicClaimIds: ["AC_001"],
            rationale: "Baseline retrieval should cover the selected assertion.",
          },
        ],
      },
      integrityEvents: [],
      blockedReason: null,
      damagedReason: null,
    };

    expect(EvidenceApplicabilityResultSchema.safeParse(queryAccepted).success).toBe(false);
    expect(EvidenceExtractionResultSchema.safeParse(queryAccepted).success).toBe(false);
    expect(EvidenceSufficiencyResultSchema.safeParse(queryAccepted).success).toBe(false);
  });
});
