/**
 * ClaimBoundary Pipeline — Boundary Clustering Stage
 *
 * Stage 3 extracts unique EvidenceScopes, clusters them into
 * ClaimAssessmentBoundaries, then assigns evidence back to those boundaries.
 *
 * @module analyzer/boundary-clustering-stage
 */

import { generateText, Output } from "ai";
import { z } from "zod";

import type {
  AtomicClaim,
  CBResearchState,
  ClaimAssessmentBoundary,
  CoverageMatrix,
  EvidenceItem,
  EvidenceScope,
} from "./types";
import type { PipelineConfig } from "@/lib/config-schemas";

import { getModelForTask, extractStructuredOutput, getStructuredOutputProviderOptions, getPromptCachingOptions } from "./llm";
import { loadAndRenderSection } from "./prompt-loader";
import { normalizeScopeEquivalence, repointEvidenceScopes } from "./scope-normalization";
import { recordLLMCall } from "./metrics-integration";
import { loadPipelineConfig } from "@/lib/config-loader";
import {
  mergeBoundaryDescriptions,
  mergeBoundaryNames,
} from "@/lib/claim-boundary-display";

const BoundaryClusteringOutputSchema = z.object({
  claimBoundaries: z.array(z.object({
    id: z.string(),
    name: z.string(),
    shortName: z.string(),
    description: z.string(),
    methodology: z.string().optional(),
    boundaries: z.string().optional(),
    geographic: z.string().optional(),
    temporal: z.string().optional(),
    constituentScopeIndices: z.array(z.number()),
    internalCoherence: z.number(),
  })),
  scopeToBoundaryMapping: z.array(z.object({
    scopeIndex: z.number(),
    boundaryId: z.string(),
    rationale: z.string(),
  })),
  congruenceDecisions: z.array(z.object({
    scopeA: z.number(),
    scopeB: z.number(),
    congruent: z.boolean(),
    rationale: z.string(),
  })),
});

export interface UniqueScope {
  index: number;
  scope: EvidenceScope;
  originalIndices: number[];
}

/**
 * Stage 3: Organize evidence into ClaimBoundaries by clustering compatible EvidenceScopes.
 */
export async function clusterBoundaries(
  state: CBResearchState,
): Promise<ClaimAssessmentBoundary[]> {
  const [pipelineResult] = await Promise.all([
    loadPipelineConfig("default", state.jobId),
  ]);
  const pipelineConfig = pipelineResult.config;

  if (pipelineResult.contentHash === "__ERROR_FALLBACK__") {
    console.warn("[Pipeline] UCM pipeline config load failed in clusterBoundaries — using hardcoded defaults.");
  }

  const currentDate = new Date().toISOString().split("T")[0];

  const uniqueScopes = collectUniqueScopes(state.evidenceItems);

  if (uniqueScopes.length <= 1) {
    const boundary = createFallbackBoundary(uniqueScopes, state.evidenceItems);
    return finalizeClusterBoundaries(state, [boundary], uniqueScopes, pipelineConfig);
  }

  const scopeNormEnabled = pipelineConfig.scopeNormalizationEnabled ?? true;
  const scopeNormMinScopes = pipelineConfig.scopeNormalizationMinScopes ?? 5;
  let effectiveScopes = uniqueScopes;

  if (scopeNormEnabled && uniqueScopes.length >= scopeNormMinScopes) {
    try {
      const normResult = await normalizeScopeEquivalence(uniqueScopes, pipelineConfig);
      if (normResult.mergedCount > 0) {
        repointEvidenceScopes(state.evidenceItems, normResult);
        effectiveScopes = normResult.normalizedScopes;
        state.llmCalls++;
      }
    } catch (err) {
      console.info("[Stage3] Scope normalization failed (non-fatal), proceeding with original scopes:", err);
    }
  }

  let boundaries: ClaimAssessmentBoundary[];
  try {
    state.onEvent?.(`LLM call: clustering — ${getModelForTask("verdict", undefined, pipelineConfig).modelName}`, -1);
    boundaries = await runLLMClustering(
      effectiveScopes,
      state.evidenceItems,
      state.understanding?.atomicClaims ?? [],
      pipelineConfig,
      currentDate,
    );
    state.llmCalls++;
  } catch (err) {
    console.warn("[Stage3] LLM clustering failed, using fallback:", err);
    const boundary = createFallbackBoundary(uniqueScopes, state.evidenceItems);
    return finalizeClusterBoundaries(state, [boundary], uniqueScopes, pipelineConfig);
  }

  const coherenceMinimum = pipelineConfig.boundaryCoherenceMinimum ?? 0.3;
  for (const b of boundaries) {
    if (b.internalCoherence < coherenceMinimum) {
      console.warn(
        `[Stage3] Boundary "${b.name}" (${b.id}) has low coherence: ${b.internalCoherence} < ${coherenceMinimum}`,
      );
    }
  }

  boundaries = boundaries.filter(
    (b) => b.id && b.name && b.constituentScopes.length > 0,
  );

  if (boundaries.length === 0) {
    console.warn("[Stage3] All boundaries invalid after filtering — using fallback");
    const boundary = createFallbackBoundary(uniqueScopes, state.evidenceItems);
    return finalizeClusterBoundaries(state, [boundary], uniqueScopes, pipelineConfig);
  }

  const idSet = new Set<string>();
  for (const b of boundaries) {
    if (idSet.has(b.id)) {
      b.id = `${b.id}_${Date.now()}`;
    }
    idSet.add(b.id);
  }

  const assignedScopeIndices = new Set<number>();
  for (const b of boundaries) {
    for (const scope of b.constituentScopes) {
      const matchIdx = uniqueScopes.findIndex(
        (us) => scopeFingerprint(us.scope) === scopeFingerprint(scope),
      );
      if (matchIdx >= 0) assignedScopeIndices.add(matchIdx);
    }
  }

  const orphanedScopes = uniqueScopes.filter((_, idx) => !assignedScopeIndices.has(idx));
  if (orphanedScopes.length > 0) {
    let generalBoundary = boundaries.find((b) => b.id === "CB_GENERAL");
    if (!generalBoundary) {
      generalBoundary = {
        id: "CB_GENERAL",
        name: "General Evidence",
        shortName: "General",
        description: "Evidence not assigned to a specific methodology boundary",
        constituentScopes: [],
        internalCoherence: 0.5,
        evidenceCount: 0,
      };
      boundaries.push(generalBoundary);
    }
    for (const orphan of orphanedScopes) {
      generalBoundary.constituentScopes.push(orphan.scope);
    }
  }

  const maxBoundaries = pipelineConfig.maxClaimBoundaries ?? 6;
  while (boundaries.length > maxBoundaries) {
    boundaries = mergeClosestBoundaries(boundaries);
  }

  return finalizeClusterBoundaries(state, boundaries, uniqueScopes, pipelineConfig);
}

export function scopeFingerprint(scope: EvidenceScope): string {
  return JSON.stringify({
    m: (scope.methodology ?? "").trim().toLowerCase(),
    t: (scope.temporal ?? "").trim().toLowerCase(),
    g: (scope.geographic ?? "").trim().toLowerCase(),
    b: (scope.boundaries ?? "").trim().toLowerCase(),
    d: (scope.analyticalDimension ?? "").trim().toLowerCase(),
  });
}

function finalizeClusterBoundaries(
  state: Pick<CBResearchState, "evidenceItems" | "warnings">,
  boundaries: ClaimAssessmentBoundary[],
  uniqueScopes: UniqueScope[],
  pipelineConfig: PipelineConfig,
): ClaimAssessmentBoundary[] {
  assignEvidenceToBoundaries(state.evidenceItems, boundaries, uniqueScopes);

  for (const boundary of boundaries) {
    boundary.evidenceCount = state.evidenceItems.filter(
      (e) => e.claimBoundaryId === boundary.id,
    ).length;
  }

  const nonEmptyBoundaries = boundaries.filter((boundary) => boundary.evidenceCount > 0);
  const totalEvidence = state.evidenceItems.length;
  const concentrationThreshold =
    pipelineConfig.boundaryEvidenceConcentrationWarningThreshold ?? 0.8;

  if (nonEmptyBoundaries.length === 0) {
    return boundaries;
  }

  if (nonEmptyBoundaries.length > 1 && totalEvidence > 0) {
    const dominantBoundary = nonEmptyBoundaries.reduce((best, boundary) =>
      boundary.evidenceCount > best.evidenceCount ? boundary : best,
    );
    const evidenceShare = dominantBoundary.evidenceCount / totalEvidence;

    if (evidenceShare > concentrationThreshold) {
      state.warnings?.push({
        type: "boundary_evidence_concentration",
        severity: "info",
        message:
          `Boundary ${dominantBoundary.id} contains ${(evidenceShare * 100).toFixed(1)}% ` +
          `of assigned evidence (${dominantBoundary.evidenceCount}/${totalEvidence}).`,
        details: {
          boundaryId: dominantBoundary.id,
          boundaryName: dominantBoundary.name,
          evidenceCount: dominantBoundary.evidenceCount,
          totalEvidence,
          evidenceShare,
          threshold: concentrationThreshold,
        },
      });
    }
  }

  return nonEmptyBoundaries;
}

export function collectUniqueScopes(evidenceItems: EvidenceItem[]): UniqueScope[] {
  const seen = new Map<string, UniqueScope>();

  for (let i = 0; i < evidenceItems.length; i++) {
    const scope = evidenceItems[i].evidenceScope;
    if (!scope) continue;

    const fp = scopeFingerprint(scope);
    const existing = seen.get(fp);
    if (existing) {
      existing.originalIndices.push(i);
    } else {
      seen.set(fp, {
        index: seen.size,
        scope,
        originalIndices: [i],
      });
    }
  }

  return Array.from(seen.values());
}

export async function runLLMClustering(
  uniqueScopes: UniqueScope[],
  evidenceItems: EvidenceItem[],
  atomicClaims: AtomicClaim[],
  pipelineConfig: PipelineConfig,
  currentDate: string,
): Promise<ClaimAssessmentBoundary[]> {
  const rendered = await loadAndRenderSection("claimboundary", "BOUNDARY_CLUSTERING", {
    currentDate,
    evidenceScopes: JSON.stringify(
      uniqueScopes.map((us) => ({
        index: us.index,
        ...us.scope,
      })),
      null,
      2,
    ),
    evidenceItems: JSON.stringify(
      evidenceItems.map((ei, idx) => ({
        index: idx,
        statement: ei.statement.slice(0, 100),
        claimDirection: ei.claimDirection,
        scopeFingerprint: ei.evidenceScope ? scopeFingerprint(ei.evidenceScope) : null,
        relevantClaimIds: ei.relevantClaimIds,
      })),
      null,
      2,
    ),
    atomicClaims: JSON.stringify(
      atomicClaims.map((c) => ({
        id: c.id,
        statement: c.statement,
      })),
      null,
      2,
    ),
  });

  if (!rendered) {
    throw new Error("Stage 3: Failed to load BOUNDARY_CLUSTERING prompt section");
  }

  const model = getModelForTask("verdict", undefined, pipelineConfig);
  const llmCallStartedAt = Date.now();
  let result: any;
  try {
    result = await generateText({
      model: model.model,
      messages: [
        {
          role: "system",
          content: rendered.content,
          providerOptions: getPromptCachingOptions(pipelineConfig.llmProvider),
        },
        {
          role: "user",
          content: `Cluster ${uniqueScopes.length} unique EvidenceScopes into ClaimBoundaries based on methodological congruence.`,
        },
      ],
      temperature: pipelineConfig.boundaryClusteringTemperature ?? 0.05,
      output: Output.object({ schema: BoundaryClusteringOutputSchema }),
      providerOptions: getStructuredOutputProviderOptions(
        pipelineConfig.llmProvider ?? "anthropic",
      ),
    });

    const parsed = extractStructuredOutput(result);
    if (!parsed) {
      throw new Error("Stage 3: LLM returned no structured output");
    }

    const validated = BoundaryClusteringOutputSchema.parse(parsed);

    if (validated.claimBoundaries.length === 0) {
      throw new Error("Stage 3: LLM returned 0 boundaries");
    }

    recordLLMCall({
      taskType: "cluster",
      provider: model.provider,
      modelName: model.modelName,
      promptTokens: result.usage?.inputTokens ?? 0,
      completionTokens: result.usage?.outputTokens ?? 0,
      totalTokens: result.usage?.totalTokens ?? 0,
      durationMs: Date.now() - llmCallStartedAt,
      success: true,
      schemaCompliant: true,
      retries: 0,
      timestamp: new Date(),
    });

    return validated.claimBoundaries.map((cb) => ({
      id: cb.id,
      name: cb.name,
      shortName: cb.shortName,
      description: cb.description,
      methodology: cb.methodology,
      boundaries: cb.boundaries,
      geographic: cb.geographic,
      temporal: cb.temporal,
      constituentScopes: cb.constituentScopeIndices
        .filter((idx) => idx >= 0 && idx < uniqueScopes.length)
        .map((idx) => uniqueScopes[idx].scope),
      internalCoherence: Math.max(0, Math.min(1, cb.internalCoherence)),
      evidenceCount: 0,
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    recordLLMCall({
      taskType: "cluster",
      provider: model.provider,
      modelName: model.modelName,
      promptTokens: result?.usage?.inputTokens ?? 0,
      completionTokens: result?.usage?.outputTokens ?? 0,
      totalTokens: result?.usage?.totalTokens ?? 0,
      durationMs: Date.now() - llmCallStartedAt,
      success: false,
      schemaCompliant: false,
      retries: 0,
      errorMessage,
      timestamp: new Date(),
    });
    throw error;
  }
}

export function createFallbackBoundary(
  uniqueScopes: UniqueScope[],
  evidenceItems: EvidenceItem[],
): ClaimAssessmentBoundary {
  return {
    id: "CB_GENERAL",
    name: "General Evidence",
    shortName: "General",
    description: "All evidence analyzed together",
    constituentScopes: uniqueScopes.map((us) => us.scope),
    internalCoherence: 0.8,
    evidenceCount: evidenceItems.length,
  };
}

export function assignEvidenceToBoundaries(
  evidenceItems: EvidenceItem[],
  boundaries: ClaimAssessmentBoundary[],
  uniqueScopes: UniqueScope[],
): void {
  void uniqueScopes;

  const fpToBoundary = new Map<string, string>();
  for (const boundary of boundaries) {
    for (const scope of boundary.constituentScopes) {
      fpToBoundary.set(scopeFingerprint(scope), boundary.id);
    }
  }

  const unassigned: EvidenceItem[] = [];
  for (const item of evidenceItems) {
    if (item.evidenceScope) {
      const fp = scopeFingerprint(item.evidenceScope);
      const boundaryId = fpToBoundary.get(fp);
      if (boundaryId) {
        item.claimBoundaryId = boundaryId;
        continue;
      }
    }
    unassigned.push(item);
  }

  if (unassigned.length > 0) {
    if (boundaries.length === 1) {
      const sole = boundaries[0];
      for (const item of unassigned) {
        item.claimBoundaryId = sole.id;
      }
    } else {
      let generalBoundary = boundaries.find((b) => b.id === "CB_GENERAL");
      if (!generalBoundary) {
        generalBoundary = {
          id: "CB_GENERAL_UNSCOPED",
          name: "General / Unscoped Evidence",
          shortName: "Unscoped",
          description: "Evidence items without a matching scope fingerprint.",
          constituentScopes: [],
          internalCoherence: 0.0,
          evidenceCount: 0,
        };
        boundaries.push(generalBoundary);
      }
      for (const item of unassigned) {
        item.claimBoundaryId = generalBoundary.id;
      }
    }
  }
}

export function boundaryJaccardSimilarity(a: ClaimAssessmentBoundary, b: ClaimAssessmentBoundary): number {
  const setA = new Set(a.constituentScopes.map(scopeFingerprint));
  const setB = new Set(b.constituentScopes.map(scopeFingerprint));

  if (setA.size === 0 && setB.size === 0) return 1;

  let intersection = 0;
  for (const fp of setA) {
    if (setB.has(fp)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export function mergeClosestBoundaries(boundaries: ClaimAssessmentBoundary[]): ClaimAssessmentBoundary[] {
  if (boundaries.length <= 1) return boundaries;

  let bestI = 0;
  let bestJ = 1;
  let bestSim = -1;

  for (let i = 0; i < boundaries.length; i++) {
    for (let j = i + 1; j < boundaries.length; j++) {
      const sim = boundaryJaccardSimilarity(boundaries[i], boundaries[j]);
      if (sim > bestSim) {
        bestSim = sim;
        bestI = i;
        bestJ = j;
      }
    }
  }

  const a = boundaries[bestI];
  const b = boundaries[bestJ];

  const merged: ClaimAssessmentBoundary = {
    id: a.id,
    name: mergeBoundaryNames(a.name, b.name),
    shortName: a.shortName,
    description: mergeBoundaryDescriptions(a.description, b.description),
    methodology: a.methodology,
    boundaries: a.boundaries,
    geographic: a.geographic,
    temporal: a.temporal,
    constituentScopes: [
      ...a.constituentScopes,
      ...b.constituentScopes.filter(
        (s) => !a.constituentScopes.some(
          (as) => scopeFingerprint(as) === scopeFingerprint(s),
        ),
      ),
    ],
    internalCoherence: (a.internalCoherence + b.internalCoherence) / 2,
    evidenceCount: a.evidenceCount + b.evidenceCount,
  };

  const result = boundaries.filter((_, idx) => idx !== bestI && idx !== bestJ);
  result.push(merged);
  return result;
}

export function buildCoverageMatrix(
  claims: AtomicClaim[],
  boundaries: ClaimAssessmentBoundary[],
  evidence: EvidenceItem[],
): CoverageMatrix {
  const claimIds = claims.map(c => c.id);
  const boundaryIds = boundaries.map(b => b.id);

  const counts: number[][] = claimIds.map(() =>
    boundaryIds.map(() => 0),
  );

  for (const item of evidence) {
    const bIdx = boundaryIds.indexOf(item.claimBoundaryId ?? "");
    if (bIdx === -1) continue;

    const relevantClaims = item.relevantClaimIds ?? [];
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
