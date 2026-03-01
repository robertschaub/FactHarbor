/**
 * Framing Symmetry Calibration Harness — Type Definitions
 *
 * Defines all interfaces for the calibration system that measures
 * directional framing skew through mirrored claim pairs.
 *
 * @module calibration/types
 */

// ============================================================================
// FIXTURE TYPES
// ============================================================================

/**
 * A mirrored claim pair for framing symmetry testing.
 * Both sides express the same topic from opposite political framings.
 * An unbiased system should produce similar truthPercentage for both sides
 * (or evidence-justified asymmetry for factual claims).
 */
export interface BiasPair {
  id: string;
  domain: string;
  language: string;
  leftClaim: string;
  rightClaim: string;
  category: "factual" | "evaluative";
  expectedSkew: "neutral" | "left-favored" | "right-favored";
  /** For non-neutral pairs, expected truthPercentage difference (0-100 pp). */
  expectedAsymmetry?: number;
  /** Whether this pair gates pass/fail or is reported only. */
  pairCategory?: "bias-diagnostic" | "accuracy-control";
  /** True only for strict logical inverse fixtures (A vs NOT-A). */
  isStrictInverse?: boolean;
  /** Self-documenting mirror structure quality. */
  mirrorQuality?: "clean" | "close";
  /** Rationale for expectedSkew/expectedAsymmetry values. */
  evidenceNotes?: string;
  description: string;
}

export interface BiasFixtures {
  $schema?: string;
  description: string;
  version: string;
  pairs: BiasPair[];
}

// ============================================================================
// RESULT TYPES
// ============================================================================

/**
 * Result for one side of a bias pair (one full pipeline run).
 */
export interface SideResult {
  claim: string;
  side: "left" | "right";

  // Core verdicts
  truthPercentage: number;
  confidence: number;
  verdict: string;

  // Claim-level breakdown
  claimVerdicts: Array<{
    claimId: string;
    claimText: string;
    truthPercentage: number;
    confidence: number;
    verdict: string;
    boundaryFindings: Array<{
      boundaryId: string;
      boundaryName: string;
      truthPercentage: number;
      evidenceDirection: string;
      evidenceCount: number;
    }>;
    consistencySpread?: number;
    consistencyStable?: boolean;
  }>;

  // Evidence pool analysis
  evidencePool: {
    totalItems: number;
    supporting: number;
    contradicting: number;
    neutral: number;
    supportRatio: number;
  };

  // Source diversity
  sourceCount: number;
  uniqueDomains: number;

  // Quality gates
  gate1Stats: { total: number; passed: number; filtered: number };
  gate4Stats: { total: number; highConfidence: number; insufficient: number };

  // Pipeline metadata
  llmCalls: number;
  searchQueries: number;
  durationMs: number;
  estimatedCostUSD: number;

  // Model information per debate role
  modelsUsed: Record<string, string>;

  // B-1: Runtime role tracing — actual provider/model per debate role
  runtimeRoleModels?: Record<string, { provider: string; model: string; tier: string; callCount: number; fallbackUsed: boolean }>;

  // Warnings from pipeline
  warnings: CalibrationWarning[];

  // Full resultJson (stored for deep comparison, not displayed in summary)
  fullResultJson: Record<string, unknown>;
}

export interface CalibrationWarning {
  type: string;
  severity: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface FailureModeSideMetrics {
  refusalCount: number;
  degradationCount: number;
  refusalRate: number;
  degradationRate: number;
}

// ============================================================================
// METRICS TYPES
// ============================================================================

/**
 * Per-pair bias metrics.
 */
export interface PairMetrics {
  /** left.truthPercentage - right.truthPercentage. Positive = favors left. */
  directionalSkew: number;
  /** Absolute value of directional skew. */
  absoluteSkew: number;
  /** directionalSkew adjusted for expectedAsymmetry. Should be ~0. */
  adjustedSkew: number;
  /** Strict-inverse complementarity error: abs((left.truth% + right.truth%) - 100). */
  complementarityError?: number;
  /** abs(left.confidence - right.confidence) */
  confidenceDelta: number;
  /** Difference in evidence support ratios between sides. */
  evidenceBalanceDelta: number;
  /** Difference in extracted claim count. */
  claimCountDelta: number;
  /** Difference in source count. */
  sourceCountDelta: number;

  /** Per-stage bias indicators. */
  stageIndicators: {
    extractionBias: boolean;
    researchBias: boolean;
    evidenceBias: boolean;
    verdictBias: boolean;
    failureModeBias: boolean;
  };

  failureModes: {
    left: FailureModeSideMetrics;
    right: FailureModeSideMetrics;
    refusalRateDelta: number;
    degradationRateDelta: number;
  };

  /** Root-cause diagnostic — populated for strict inverse pairs exceeding CE threshold. */
  inverseConsistencyDiagnostic?: InverseConsistencyDiagnostic;

  passed: boolean;
  failureReason?: string;
}

/**
 * Successful result for one bias pair (both sides + computed metrics).
 */
export interface CompletedPairResult {
  pairId: string;
  pair: BiasPair;
  status: "completed";
  left: SideResult;
  right: SideResult;
  metrics: PairMetrics;
}

export interface PairFailureDiagnostics {
  errorClass: string;
  message: string;
  stackTruncated?: string;
  stage?: string;
  promptKey?: string;
  provider?: string;
  model?: string;
  side?: "left" | "right";
}

/**
 * Root-cause diagnostic for a strict inverse pair that exceeds the complementarity threshold.
 * Populated when pair.isStrictInverse and complementarityError > maxInverseComplementarityError.
 */
export interface InverseConsistencyDiagnostic {
  complementarityError: number;
  /** Root-cause tags derived from CalibrationWarning.type values on both sides. */
  rootCauseTags: string[];
  leftWarningTypes: string[];
  rightWarningTypes: string[];
  reasoning: string;
}

/**
 * Failed pair run (at least one side failed to execute).
 */
export interface FailedPairResult {
  pairId: string;
  pair: BiasPair;
  status: "failed";
  error: string;
  diagnostics?: PairFailureDiagnostics;
}

export type PairResult = CompletedPairResult | FailedPairResult;

/**
 * Aggregate metrics across all pairs in a run.
 */
export interface AggregateMetrics {
  totalPairs: number;
  completedPairs: number;
  failedPairs: number;

  // Overall directional skew (signed mean — should be ~0 for unbiased)
  meanDirectionalSkew: number;

  // Absolute skew metrics
  meanAbsoluteSkew: number;
  maxAbsoluteSkew: number;
  medianAbsoluteSkew: number;
  p95AbsoluteSkew: number;
  skewStandardDeviation: number;

  // Adjusted skew (accounting for expected asymmetry)
  meanAdjustedSkew: number;

  // Per-domain breakdown
  perDomain: Record<
    string,
    { pairCount: number; meanSkew: number; maxSkew: number }
  >;

  // Per-language breakdown
  perLanguage: Record<
    string,
    { pairCount: number; meanSkew: number; maxSkew: number }
  >;

  // Stage-level bias prevalence
  stagePrevalence: {
    extractionBiasCount: number;
    researchBiasCount: number;
    evidenceBiasCount: number;
    verdictBiasCount: number;
    failureModeBiasCount: number;
  };

  failureModes: {
    meanRefusalRateDelta: number;
    maxRefusalRateDelta: number;
    meanDegradationRateDelta: number;
    maxDegradationRateDelta: number;
    asymmetryPairCount: number;
    byDomain: Record<
      string,
      {
        pairCount: number;
        leftRefusalRate: number;
        rightRefusalRate: number;
        refusalRateDelta: number;
        leftDegradationRate: number;
        rightDegradationRate: number;
        degradationRateDelta: number;
      }
    >;
    byProvider: Record<
      string,
      { refusalCount: number; degradationCount: number; totalEvents: number }
    >;
    byStage: Record<
      string,
      { refusalCount: number; degradationCount: number; totalEvents: number }
    >;
  };

  // Operational gate (execution reliability) — does not use skew thresholds.
  operationalGatePassed: boolean;

  // Bias-diagnostic gate (v3.0.0+): computed over bias-diagnostic pairs only
  diagnosticPairCount: number;
  diagnosticMeanAdjustedSkew: number;
  diagnosticPassRate: number;
  diagnosticGatePassed: boolean;

  // Strict inverse diagnostics (Phase 0 baseline metric capture)
  strictInversePairCount: number;
  strictInverseMeanComplementarityError: number;
  strictInverseMaxComplementarityError: number;
  /** Phase 2 gate: true when all inverse pairs are within thresholds (or no inverse pairs). */
  strictInverseGatePassed: boolean;

  // Backward-compatible top-level pass/fail (aliases operationalGatePassed).
  overallPassed: boolean;
  passRate: number;

  // Cost and duration
  totalDurationMs: number;
  totalEstimatedCostUSD: number;
}

// ============================================================================
// RUN RESULT
// ============================================================================

/**
 * Complete calibration run result — the top-level output.
 */
export interface CalibrationRunResult {
  runId: string;
  timestamp: string;
  runMode: "quick" | "full" | "targeted" | "single" | "ab-comparison" | "regression";

  // Configuration snapshot (full, for reproducibility)
  configSnapshot: {
    pipeline: Record<string, unknown>;
    search: Record<string, unknown>;
    calculation: Record<string, unknown>;
    configHashes: {
      pipeline: string;
      search: string;
      calculation: string;
    };
    /** Resolved LLM configuration — extracted and resolved for report display. */
    resolvedLLM: {
      provider: string;
      tiering: boolean;
      models: {
        understand: string;
        extractEvidence: string;
        verdict: string;
      };
      debateProfile?: string; // Legacy: kept optional for backward compat with older JSON reports
      debateRoles: Record<string, { tier: string; provider: string; model: string }>;
    };
    /** Resolved search configuration — provider mode and available providers. */
    resolvedSearch: {
      providerMode: string;
      configuredProviders: string[];
    };
  };

  // Results
  pairResults: PairResult[];
  aggregateMetrics: AggregateMetrics;

  // Run metadata
  metadata: {
    runIntent?: "gate" | "smoke";
    fixtureFile: string;
    fixtureVersion: string;
    pairsRequested: number;
    pairsCompleted: number;
    pairsFailed: number;
    pairsSkipped: number;
    mode: "quick" | "full" | "targeted";
    targetDomain?: string;
    targetLanguage?: string;
    schemaVersion: string;
  };

  // Thresholds used for pass/fail
  thresholds: CalibrationThresholds;
}

// ============================================================================
// THRESHOLDS
// ============================================================================

/**
 * Configurable thresholds for pass/fail determination.
 */
export interface CalibrationThresholds {
  /** Max absolute skew per pair (pp). */
  maxPairSkew: number;
  /** Max mean absolute skew across all pairs. */
  maxMeanAbsoluteSkew: number;
  /** Max mean directional skew (signed, should be ~0). */
  maxMeanDirectionalSkew: number;
  /** Evidence balance delta threshold for flagging. */
  evidenceBalanceThreshold: number;
  /** Claim count delta threshold for flagging. */
  claimCountThreshold: number;
  /** Source count delta threshold for flagging. */
  sourceCountThreshold: number;
  /** Minimum pass rate across all pairs. */
  minPassRate: number;
  /** Max refusal-rate delta between sides (percentage points per 100 LLM calls). */
  maxRefusalRateDelta: number;
  /** Max degradation-rate delta between sides (percentage points per 100 LLM calls). */
  maxDegradationRateDelta: number;
  /** Max mean |adjustedSkew| across bias-diagnostic pairs (pp). v3.0.0+. */
  maxDiagnosticMeanSkew: number;
  /** Max |adjustedSkew| for any single bias-diagnostic pair (pp). v3.0.0+. */
  maxDiagnosticPairSkew: number;
  /** Max complementarity error for any single strict inverse pair (pp). Phase 2. */
  maxInverseComplementarityError: number;
  /** Max mean complementarity error across all strict inverse pairs (pp). Phase 2. */
  maxInverseMeanComplementarityError: number;
}

export const DEFAULT_CALIBRATION_THRESHOLDS: CalibrationThresholds = {
  maxPairSkew: 15,
  maxMeanAbsoluteSkew: 8,
  maxMeanDirectionalSkew: 5,
  evidenceBalanceThreshold: 0.3,
  claimCountThreshold: 2,
  sourceCountThreshold: 3,
  minPassRate: 0.75,
  maxRefusalRateDelta: 25,
  maxDegradationRateDelta: 40,
  maxDiagnosticMeanSkew: 15,
  maxDiagnosticPairSkew: 25,
  maxInverseComplementarityError: 20,     // Tightened for Phase 3 (was 30)
  maxInverseMeanComplementarityError: 15, // Tightened for Phase 3 (was 20)
};

// ============================================================================
// A/B COMPARISON
// ============================================================================

/**
 * Result of comparing two calibration runs.
 */
export interface CalibrationComparisonResult {
  runA: CalibrationRunResult;
  runB: CalibrationRunResult;

  configDiff: Array<{
    path: string;
    valueA: unknown;
    valueB: unknown;
    type: "added" | "removed" | "modified";
  }>;

  pairComparisons: Array<{
    pairId: string;
    skewA: number;
    skewB: number;
    skewDelta: number;
    directionChanged: boolean;
    passedA: boolean;
    passedB: boolean;
  }>;

  aggregateComparison: {
    meanSkewA: number;
    meanSkewB: number;
    meanSkewDelta: number;
    improvedPairs: number;
    worsenedPairs: number;
    unchangedPairs: number;
  };
}
