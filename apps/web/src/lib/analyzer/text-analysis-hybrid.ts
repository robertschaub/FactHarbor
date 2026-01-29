/**
 * Hybrid Text Analysis Service
 *
 * Combines LLM and heuristic implementations with automatic fallback.
 * Uses LLM when enabled via feature flags, falls back to heuristics on failure.
 *
 * @module analyzer/text-analysis-hybrid
 * @version 1.0.0
 */

import {
  ITextAnalysisService,
  InputClassificationRequest,
  InputClassificationResult,
  EvidenceQualityRequest,
  EvidenceQualityResult,
  ScopeSimilarityRequest,
  ScopeSimilarityResult,
  VerdictValidationRequest,
  VerdictValidationResult,
  AnalysisPoint,
} from "./text-analysis-types";

import { HeuristicTextAnalysisService, heuristicTextAnalysisService } from "./text-analysis-heuristic";
import { LLMTextAnalysisService, llmTextAnalysisService } from "./text-analysis-llm";
import { isLLMEnabled, recordMetrics } from "./text-analysis-service";

// ============================================================================
// HYBRID TEXT ANALYSIS SERVICE
// ============================================================================

/**
 * Hybrid implementation of ITextAnalysisService.
 * Uses LLM when enabled, with automatic fallback to heuristics.
 */
export class HybridTextAnalysisService implements ITextAnalysisService {
  private llmService: ITextAnalysisService;
  private heuristicService: ITextAnalysisService;

  constructor(
    llmService: ITextAnalysisService = llmTextAnalysisService,
    heuristicService: ITextAnalysisService = heuristicTextAnalysisService
  ) {
    this.llmService = llmService;
    this.heuristicService = heuristicService;
  }

  /**
   * Execute with LLM if enabled, otherwise use heuristics.
   * Falls back to heuristics on LLM failure.
   */
  private async executeWithFallback<T>(
    analysisPoint: AnalysisPoint,
    llmCall: () => Promise<T>,
    heuristicCall: () => Promise<T>
  ): Promise<T> {
    // Check if LLM is enabled for this analysis point
    if (!isLLMEnabled(analysisPoint)) {
      console.log(`[TextAnalysis] LLM disabled for ${analysisPoint}, using heuristic`);
      return heuristicCall();
    }

    const startTime = Date.now();

    try {
      // Try LLM first
      const result = await llmCall();
      return result;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.warn(`[TextAnalysis] LLM failed for ${analysisPoint}: ${errorMsg}, falling back to heuristic`);

      // Record fallback metrics
      recordMetrics({
        analysisPoint,
        success: false,
        latencyMs: Date.now() - startTime,
        retryCount: 0,
        usedFallback: true,
        error: errorMsg,
      });

      // Fall back to heuristics
      try {
        const heuristicStartTime = Date.now();
        const result = await heuristicCall();

        recordMetrics({
          analysisPoint,
          success: true,
          latencyMs: Date.now() - heuristicStartTime,
          retryCount: 0,
          usedFallback: true,
        });

        return result;
      } catch (heuristicError) {
        // Both failed - this is unexpected
        const heuristicErrorMsg = heuristicError instanceof Error ? heuristicError.message : String(heuristicError);
        console.error(`[TextAnalysis] Both LLM and heuristic failed for ${analysisPoint}: ${heuristicErrorMsg}`);
        throw heuristicError;
      }
    }
  }

  /**
   * Call 1: Classify input and decompose into claims
   */
  async classifyInput(request: InputClassificationRequest): Promise<InputClassificationResult> {
    return this.executeWithFallback(
      "input",
      () => this.llmService.classifyInput(request),
      () => this.heuristicService.classifyInput(request)
    );
  }

  /**
   * Call 2: Assess evidence quality for filtering
   */
  async assessEvidenceQuality(request: EvidenceQualityRequest): Promise<EvidenceQualityResult[]> {
    return this.executeWithFallback(
      "evidence",
      () => this.llmService.assessEvidenceQuality(request),
      () => this.heuristicService.assessEvidenceQuality(request)
    );
  }

  /**
   * Call 3: Analyze scope similarity for merging
   */
  async analyzeScopeSimilarity(request: ScopeSimilarityRequest): Promise<ScopeSimilarityResult[]> {
    return this.executeWithFallback(
      "scope",
      () => this.llmService.analyzeScopeSimilarity(request),
      () => this.heuristicService.analyzeScopeSimilarity(request)
    );
  }

  /**
   * Call 4: Validate verdicts for inversion/harm/contestation
   */
  async validateVerdicts(request: VerdictValidationRequest): Promise<VerdictValidationResult[]> {
    return this.executeWithFallback(
      "verdict",
      () => this.llmService.validateVerdicts(request),
      () => this.heuristicService.validateVerdicts(request)
    );
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/** Default hybrid service instance */
export const hybridTextAnalysisService = new HybridTextAnalysisService();
