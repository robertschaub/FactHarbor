/**
 * Types, schemas, and shared utilities for Source Reliability Evaluation.
 *
 * @module source-reliability/sr-eval-types
 */

import { z } from "zod";
import type { SearchConfig } from "@/lib/config-schemas";
import type {
  EvidenceQualityAssessmentConfig,
  EvidenceQualityAssessmentMeta,
  EvidenceProbativeValue,
  EvidenceCategory,
  EvidencePackItemForQuality,
} from "@/lib/source-reliability/evidence-quality-assessment";

// ============================================================================
// REQUEST-SCOPED CONFIG (replaces 8 mutable module-level lets)
// ============================================================================

/**
 * Request-scoped configuration for SR evaluation.
 * Built once per request in the POST handler, threaded through function params.
 */
export interface SrEvalConfig {
  openaiModel: string;
  searchConfig: SearchConfig;
  evalUseSearch: boolean;
  evalMaxResultsPerQuery: number;
  evalMaxEvidenceItems: number;
  evalDateRestrict: "y" | "m" | "w" | null;
  rateLimitPerIp: number;
  domainCooldownSec: number;
  evidenceQualityAssessment: EvidenceQualityAssessmentConfig;
  requestStartedAtMs: number;
  requestBudgetMs: number | null;
}

// ============================================================================
// SCHEMAS
// ============================================================================

export const FactualRatingSchema = z
  .enum([
    "highly_reliable", // 0.86-1.00
    "reliable", // 0.72-0.85
    "leaning_reliable", // 0.58-0.71 (formerly generally_reliable)
    "mixed", // 0.43-0.57
    "leaning_unreliable", // 0.29-0.42 (formerly generally_unreliable)
    "unreliable", // 0.15-0.28
    "highly_unreliable", // 0.00-0.14
    "insufficient_data", // null score - Unknown source, no assessments exist
    // Legacy aliases (accept but normalize)
    "generally_reliable",
    "generally_unreliable",
  ])
  .transform((v) => {
    if (v === "generally_reliable") return "leaning_reliable";
    if (v === "generally_unreliable") return "leaning_unreliable";
    return v;
  });

export const EvaluationResultSchema = z.object({
  domain: z.string().optional(),
  evaluationDate: z.string().optional(),
  sourceType: z.string().min(1).default("unknown"),
  identifiedEntity: z.string().nullable().optional(), // The organization evaluated, or null if unknown
  evidenceQuality: z.object({
    independentAssessmentsCount: z.coerce.number().min(0).max(10).optional(),
    recencyWindowUsed: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
  score: z.number().min(0).max(1).nullable(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  factualRating: FactualRatingSchema,
  biasIndicator: z.string().optional(),
  bias: z
    .object({
      politicalBias: z.string(),
      otherBias: z.string().nullable().optional(),
    })
    .optional(),
  evidenceCited: z.array(z.object({
    claim: z.string(),
    basis: z.string(),
    recency: z.string().optional(),
    evidenceId: z.string().optional(),
    url: z.string().optional(),
  })).optional(),
  caveats: z.array(z.string()).optional(),
});

export type EvaluationResult = z.infer<typeof EvaluationResultSchema>;

export const RefinementResultSchema = z.object({
  crossCheckFindings: z.string(),
  entityRefinement: z.object({
    identifiedEntity: z.string().nullable(),
    organizationType: z.string(),
    isWellKnown: z.boolean(),
    notes: z.string(),
  }),
  scoreAdjustment: z.object({
    originalScore: z.number().nullable(),
    refinedScore: z.number().min(0).max(1).nullable(),
    adjustmentReason: z.string(),
  }),
  refinedRating: FactualRatingSchema,
  refinedConfidence: z.number().min(0).max(1),
  combinedReasoning: z.string(),
});

export type RefinementResult = z.infer<typeof RefinementResultSchema>;

// ============================================================================
// TYPES
// ============================================================================

export interface EvidenceItem {
  claim: string;
  basis: string;
  recency?: string;
}

export type EvidencePackItem = EvidencePackItemForQuality & {
  probativeValue?: EvidenceProbativeValue;
  evidenceCategory?: EvidenceCategory;
  enrichmentVersion?: 1;
};

export type EvidencePack = {
  enabled: boolean;
  providersUsed: string[];
  queries: string[];
  items: EvidencePackItem[];
  qualityAssessment?: EvidenceQualityAssessmentMeta;
};

export interface ResponsePayload {
  score: number | null;
  confidence: number;
  modelPrimary: string;
  modelSecondary: string | null;
  consensusAchieved: boolean;
  reasoning: string;
  category: string;
  sourceType?: string; // LLM-classified source type (e.g., propaganda_outlet, state_controlled_media)
  identifiedEntity?: string | null; // The organization evaluated, or null if unknown
  evidencePack?: {
    providersUsed: string[];
    queries: string[];
    items: EvidencePackItem[];
    qualityAssessment?: EvidenceQualityAssessmentMeta;
  };
  biasIndicator: string | null | undefined;
  bias?: {
    politicalBias: string;
    otherBias?: string | null;
  };
  evidenceCited?: EvidenceItem[];
  caveats?: string[];
  /** When consensus fails but primary (Claude) has higher confidence, we use its result */
  fallbackUsed?: boolean;
  fallbackReason?: string;
  /** Sequential refinement: Whether the second LLM adjusted the score */
  refinementApplied?: boolean;
  /** Sequential refinement: Notes from the cross-check process */
  refinementNotes?: string;
  /** Sequential refinement: Original score before refinement */
  originalScore?: number | null;
}

export interface EvaluationError {
  reason:
    | "primary_model_failed"
    | "no_consensus"
    | "evaluation_error"
    | "grounding_failed";
  details: string;
  primaryScore?: number | null;
  primaryConfidence?: number;
  secondaryScore?: number | null;
  secondaryConfidence?: number;
}

// ============================================================================
// SHARED UTILITY
// ============================================================================

export async function withTimeout<T>(
  operationName: string,
  timeoutMs: number,
  operation: () => Promise<T>,
): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(`${operationName} timeout after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation(), timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}
