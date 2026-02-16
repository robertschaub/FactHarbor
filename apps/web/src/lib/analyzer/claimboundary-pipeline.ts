/**
 * ClaimBoundary Pipeline — Main Entry Point
 *
 * Replaces the orchestrated pipeline with an evidence-emergent boundary model.
 * Claims drive research, evidence scopes determine boundaries, verdicts use
 * a 5-step LLM debate pattern.
 *
 * Pipeline stages:
 *   Stage 1: EXTRACT CLAIMS — Two-pass evidence-grounded claim extraction
 *   Stage 2: RESEARCH — Claim-driven evidence gathering with mandatory EvidenceScope
 *   Stage 3: CLUSTER BOUNDARIES — Group evidence into ClaimBoundaries by scope congruence
 *   Stage 4: VERDICT — 5-step LLM debate pattern (advocate, consistency, challenge, reconcile, validate)
 *   Stage 5: AGGREGATE — Weighted aggregation with triangulation and narrative
 *
 * @module analyzer/claimboundary-pipeline
 * @since ClaimBoundary pipeline v1
 * @see Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md
 */

import type {
  AtomicClaim,
  CBClaimUnderstanding,
  CBClaimVerdict,
  CBResearchState,
  ClaimBoundary,
  CoverageMatrix,
  EvidenceItem,
  FetchedSource,
  OverallAssessment,
  QualityGates,
  Gate1Stats,
  AnalysisInput,
} from "./types";

// Shared modules — reused from existing codebase (no orchestrated.ts imports)
import { filterByProbativeValue } from "./evidence-filter";
import { prefetchSourceReliability } from "./source-reliability";
import { getClaimWeight, calculateWeightedVerdictAverage } from "./aggregation";

// Verdict stage module (§8.4 — 5-step debate pattern)
import { runVerdictStage, type LLMCallFn } from "./verdict-stage";

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

/**
 * Run the ClaimBoundary analysis pipeline.
 *
 * This is the main entry point that orchestrates all 5 stages sequentially.
 * Each stage is an independently testable function.
 *
 * @param input - The analysis input (text or URL, with optional event callback)
 * @returns The result object with resultJson and reportMarkdown
 */
export async function runClaimBoundaryAnalysis(
  input: AnalysisInput
): Promise<{ resultJson: any; reportMarkdown: string }> {
  const onEvent = input.onEvent ?? (() => {});

  // Initialize research state
  const state: CBResearchState = {
    originalInput: input.inputValue,
    originalText: "",
    inputType: input.inputType,
    understanding: null,
    evidenceItems: [],
    sources: [],
    searchQueries: [],
    mainIterationsUsed: 0,
    contradictionIterationsReserved: 2, // UCM default
    contradictionIterationsUsed: 0,
    contradictionSourcesFound: 0,
    claimBoundaries: [],
    llmCalls: 0,
  };

  // Stage 1: Extract Claims
  onEvent("Extracting claims from input...", 10);
  const understanding = await extractClaims(state);
  state.understanding = understanding;

  // Stage 2: Research
  onEvent("Researching evidence for claims...", 30);
  await researchEvidence(state);

  // Stage 3: Cluster Boundaries
  onEvent("Clustering evidence into boundaries...", 60);
  const boundaries = await clusterBoundaries(state);
  state.claimBoundaries = boundaries;

  // Build coverage matrix (between Stage 3 and 4, per §8.5.1)
  const coverageMatrix = buildCoverageMatrix(
    understanding.atomicClaims,
    boundaries,
    state.evidenceItems
  );

  // Stage 4: Verdict
  onEvent("Generating verdicts...", 70);
  const claimVerdicts = await generateVerdicts(
    understanding.atomicClaims,
    state.evidenceItems,
    boundaries,
    coverageMatrix
  );

  // Stage 5: Aggregate
  onEvent("Aggregating final assessment...", 90);
  const assessment = await aggregateAssessment(
    claimVerdicts,
    boundaries,
    state.evidenceItems,
    coverageMatrix,
    state
  );

  onEvent("Analysis complete.", 100);

  // Wrap assessment in resultJson structure (no AnalysisContext references)
  const resultJson = {
    _schemaVersion: "3.0.0-cb", // ClaimBoundary pipeline schema
    meta: {
      schemaVersion: "3.0.0-cb",
      generatedUtc: new Date().toISOString(),
      pipeline: "claimboundary",
      inputType: input.inputType,
      detectedInputType: state.understanding?.detectedInputType ?? input.inputType,
      hasMultipleBoundaries: assessment.hasMultipleBoundaries,
      boundaryCount: boundaries.length,
      claimCount: understanding.atomicClaims.length,
      llmCalls: state.llmCalls,
      mainIterationsUsed: state.mainIterationsUsed,
      contradictionIterationsUsed: state.contradictionIterationsUsed,
      contradictionSourcesFound: state.contradictionSourcesFound,
    },
    // Core assessment data
    truthPercentage: assessment.truthPercentage,
    verdict: assessment.verdict,
    confidence: assessment.confidence,
    verdictNarrative: assessment.verdictNarrative,

    // ClaimBoundary-specific data (replaces analysisContexts)
    claimBoundaries: assessment.claimBoundaries,
    claimVerdicts: assessment.claimVerdicts,
    coverageMatrix: assessment.coverageMatrix,

    // Supporting data
    understanding: state.understanding,
    evidenceItems: state.evidenceItems,
    sources: state.sources.map((s: FetchedSource) => ({
      id: s.id,
      url: s.url,
      title: s.title,
      trackRecordScore: s.trackRecordScore,
      category: s.category,
      fetchSuccess: s.fetchSuccess,
      searchQuery: s.searchQuery,
    })),
    searchQueries: state.searchQueries,

    // Quality gates
    qualityGates: assessment.qualityGates,
  };

  // TODO: Generate markdown report (Phase 3 UI work)
  const reportMarkdown = "# ClaimBoundary Analysis Report\n\n(Report generation not yet implemented)";

  return { resultJson, reportMarkdown };
}

// ============================================================================
// STAGE 1: EXTRACT CLAIMS (§8.1)
// ============================================================================

/**
 * Stage 1: Extract atomic claims from input using two-pass evidence-grounded approach.
 *
 * Pass 1: Quick claim scan + preliminary search (Haiku tier)
 * Pass 2: Evidence-grounded claim extraction (Sonnet tier)
 * Then: Centrality filter + Gate 1 validation
 *
 * @param state - The mutable research state
 * @returns CBClaimUnderstanding with atomic claims
 */
export async function extractClaims(
  state: CBResearchState
): Promise<CBClaimUnderstanding> {
  // TODO (Phase 1b/1c): Implement two-pass extraction
  // Pass 1: Rapid claim scan + preliminary search (Haiku)
  // Pass 2: Evidence-grounded claim extraction (Sonnet)
  // Centrality filter: keep only high/medium
  // Gate 1: Claim validation (factual + specificity ≥ 0.6)
  throw new Error("Stage 1 (extractClaims) not yet implemented");
}

// ============================================================================
// STAGE 2: RESEARCH (§8.2)
// ============================================================================

/**
 * Stage 2: Gather evidence for each central claim using web search and LLM extraction.
 *
 * Claim-driven iteration: targets the claim with fewest evidence items.
 * Reserved contradiction iterations after main loop.
 * Each evidence item carries a mandatory EvidenceScope.
 *
 * @param state - The mutable research state (evidenceItems and sources populated)
 */
export async function researchEvidence(
  state: CBResearchState
): Promise<void> {
  // TODO (Phase 1b/1c): Implement claim-driven research loop
  // 1. Seed evidence pool from Stage 1 preliminary search
  // 2. Claim-driven query generation
  // 3. Web search + relevance classification
  // 4. Source fetch + reliability prefetch
  // 5. Evidence extraction with mandatory EvidenceScope
  // 6. EvidenceScope validation
  // 7. Evidence filter (LLM + deterministic safety net)
  // 8. Sufficiency check + contradiction search
  throw new Error("Stage 2 (researchEvidence) not yet implemented");
}

// ============================================================================
// STAGE 3: CLUSTER BOUNDARIES (§8.3)
// ============================================================================

/**
 * Stage 3: Organize evidence into ClaimBoundaries by clustering compatible EvidenceScopes.
 *
 * Single Sonnet-tier LLM call groups scopes with compatible methodology,
 * boundaries, geography, and temporal period. Deterministic post-clustering
 * validation ensures structural integrity.
 *
 * @param state - Research state with populated evidenceItems
 * @returns Array of ClaimBoundaries
 */
export async function clusterBoundaries(
  state: CBResearchState
): Promise<ClaimBoundary[]> {
  // TODO (Phase 1b/1c): Implement scope clustering
  // 1. Collect unique EvidenceScopes
  // 2. LLM clustering (Sonnet)
  // 3. Coherence assessment
  // 4. Post-clustering validation (deterministic)
  // 5. Fallback to single "General" boundary if needed
  throw new Error("Stage 3 (clusterBoundaries) not yet implemented");
}

// ============================================================================
// COVERAGE MATRIX (§8.5.1)
// ============================================================================

/**
 * Build the coverage matrix: claims × boundaries evidence distribution.
 * Computed after Stage 3, used by Stage 4 (verdict) and Stage 5 (aggregation).
 *
 * ~20 lines of deterministic code. Zero LLM cost.
 *
 * @param claims - Atomic claims from Stage 1
 * @param boundaries - ClaimBoundaries from Stage 3
 * @param evidence - All evidence items (boundary-assigned)
 * @returns CoverageMatrix
 */
export function buildCoverageMatrix(
  claims: AtomicClaim[],
  boundaries: ClaimBoundary[],
  evidence: EvidenceItem[]
): CoverageMatrix {
  const claimIds = claims.map(c => c.id);
  const boundaryIds = boundaries.map(b => b.id);

  // Initialize counts[claimIdx][boundaryIdx] = 0
  const counts: number[][] = claimIds.map(() =>
    boundaryIds.map(() => 0)
  );

  // Count evidence items per claim × boundary
  // Evidence items carry claimBoundaryId (assigned in Stage 3)
  // and relevantClaimIds (assigned in Stage 2)
  for (const item of evidence) {
    const bIdx = boundaryIds.indexOf(
      (item as EvidenceItem & { claimBoundaryId?: string }).claimBoundaryId ?? ""
    );
    if (bIdx === -1) continue;

    // Each evidence item may be relevant to multiple claims
    const relevantClaims = (item as EvidenceItem & { relevantClaimIds?: string[] }).relevantClaimIds ?? [];
    for (const claimId of relevantClaims) {
      const cIdx = claimIds.indexOf(claimId);
      if (cIdx !== -1) {
        counts[cIdx][bIdx]++;
      }
    }
  }

  return {
    claims: claimIds,
    boundaries: boundaryIds,
    counts,
    getBoundariesForClaim(claimId: string): string[] {
      const cIdx = claimIds.indexOf(claimId);
      if (cIdx === -1) return [];
      return boundaryIds.filter((_, bIdx) => counts[cIdx][bIdx] > 0);
    },
    getClaimsForBoundary(boundaryId: string): string[] {
      const bIdx = boundaryIds.indexOf(boundaryId);
      if (bIdx === -1) return [];
      return claimIds.filter((_, cIdx) => counts[cIdx][bIdx] > 0);
    },
  };
}

// ============================================================================
// STAGE 4: VERDICT (§8.4)
// ============================================================================

/**
 * Stage 4: Generate verdicts using the 5-step LLM debate pattern.
 *
 * Implemented as a separate module (verdict-stage.ts) per §22.
 * This function delegates to that module.
 *
 * Steps:
 *   1. Advocate Verdict (Sonnet)
 *   2. Self-Consistency Check (Sonnet × 2, parallel with Step 3)
 *   3. Adversarial Challenge (Sonnet, parallel with Step 2)
 *   4. Reconciliation (Sonnet)
 *   5. Verdict Validation (Haiku × 2) + Structural Consistency Check
 *   Gate 4: Confidence classification
 *
 * @param claims - Atomic claims from Stage 1
 * @param evidence - All evidence items (boundary-assigned)
 * @param boundaries - ClaimBoundaries from Stage 3
 * @param coverageMatrix - Claims × boundaries evidence distribution
 * @returns Array of CBClaimVerdicts
 */
export async function generateVerdicts(
  claims: AtomicClaim[],
  evidence: EvidenceItem[],
  boundaries: ClaimBoundary[],
  coverageMatrix: CoverageMatrix,
  llmCall?: LLMCallFn,
): Promise<CBClaimVerdict[]> {
  if (!llmCall) {
    // TODO (Phase 1c): Wire production LLM call function from UCM prompts
    throw new Error("Stage 4 (generateVerdicts): llmCall function required — production wiring not yet implemented");
  }

  return runVerdictStage(claims, evidence, boundaries, coverageMatrix, llmCall);
}

// ============================================================================
// STAGE 5: AGGREGATE (§8.5)
// ============================================================================

/**
 * Stage 5: Produce the overall assessment by weighted aggregation.
 *
 * Includes triangulation scoring, derivative weight reduction,
 * weighted average computation, and VerdictNarrative generation.
 *
 * @param claimVerdicts - Verdicts from Stage 4
 * @param boundaries - ClaimBoundaries from Stage 3
 * @param evidence - All evidence items
 * @param coverageMatrix - Claims × boundaries evidence distribution
 * @param state - Research state for metadata
 * @returns OverallAssessment
 */
export async function aggregateAssessment(
  claimVerdicts: CBClaimVerdict[],
  boundaries: ClaimBoundary[],
  evidence: EvidenceItem[],
  coverageMatrix: CoverageMatrix,
  state: CBResearchState
): Promise<OverallAssessment> {
  // TODO (Phase 1b): Implement aggregation
  // 1. Triangulation scoring per claim (§8.5.2)
  // 2. Derivative weight reduction (§8.5.3)
  // 3. Weighted average + confidence (§8.5.4-8.5.5)
  // 4. VerdictNarrative generation (§8.5.6, Sonnet call)
  // 5. Report assembly (§8.5.7)
  throw new Error("Stage 5 (aggregateAssessment) not yet implemented");
}
