import type {
  AtomicClaim,
  CBResearchState,
  EvidenceItem,
} from "./types";
import type { PipelineConfig } from "@/lib/config-schemas";

/**
 * Find the claim with the fewest evidence items (for targeting).
 */
export function findLeastResearchedClaim(
  claims: AtomicClaim[],
  evidenceItems: EvidenceItem[],
): AtomicClaim | null {
  if (claims.length === 0) return null;

  let minCount = Infinity;
  let target: AtomicClaim | null = null;

  for (const claim of claims) {
    const count = evidenceItems.filter(
      (e) => e.relevantClaimIds?.includes(claim.id),
    ).length;
    if (count < minCount) {
      minCount = count;
      target = claim;
    }
  }

  return target;
}

/**
 * Find the claim with the fewest contradicting evidence items.
 */
export function findLeastContradictedClaim(
  claims: AtomicClaim[],
  evidenceItems: EvidenceItem[],
): AtomicClaim | null {
  if (claims.length === 0) return null;

  let minCount = Infinity;
  let target: AtomicClaim | null = null;

  for (const claim of claims) {
    const contradictionCount = evidenceItems.filter(
      (e) => e.relevantClaimIds?.includes(claim.id) && e.claimDirection === "contradicts",
    ).length;
    if (contradictionCount < minCount) {
      minCount = contradictionCount;
      target = claim;
    }
  }

  return target;
}

/**
 * Check if all claims have reached the sufficiency threshold.
 */
export function allClaimsSufficient(
  claims: AtomicClaim[],
  evidenceItems: EvidenceItem[],
  threshold: number,
  mainIterationsCompleted: number = 0,
  minMainIterations: number = 1,
  distinctEventCount: number = 0,
): boolean {
  // Empty claims: vacuously sufficient (no research loop runs anyway)
  if (claims.length === 0) return true;

  // MT-1: Require at least one complete main loop iteration before sufficiency
  // can fire. Prevents seeded preliminary evidence from short-circuiting real
  // Stage 2 research (e.g., stored run showing mainIterationsUsed: 0).
  // MT-3 coverage: When multiple distinct events were identified in Stage 1,
  // require proportionally more iterations so each event cluster has research
  // coverage opportunity before we declare the claim sufficient.
  const effectiveMinIterations = distinctEventCount > 1
    ? Math.max(minMainIterations, distinctEventCount - 1)
    : minMainIterations;
  if (mainIterationsCompleted < effectiveMinIterations) return false;

  return claims.every((claim) => {
    const count = evidenceItems.filter(
      // Count only fully-extracted evidence (not seeded/preliminary items).
      // Seeded items have isSeeded=true — they provide coverage baseline
      // but should not satisfy sufficiency to prevent skipping main research.
      (e) => e.relevantClaimIds?.includes(claim.id) && e.evidenceScope && !e.isSeeded,
    ).length;
    return count >= threshold;
  });
}

/**
 * Resolve per-claim shared query budget from config (B-4).
 * This budget is shared across all query sources for a claim.
 */
export function getPerClaimQueryBudget(pipelineConfig: PipelineConfig): number {
  return pipelineConfig.perClaimQueryBudget ?? 8;
}

/**
 * Read consumed query budget for a claim.
 */
export function getClaimQueryBudgetUsed(
  state: CBResearchState,
  claimId: string,
): number {
  if (!state.queryBudgetUsageByClaim) {
    state.queryBudgetUsageByClaim = {};
  }
  return state.queryBudgetUsageByClaim[claimId] ?? 0;
}

/**
 * Remaining shared query budget for a claim.
 */
export function getClaimQueryBudgetRemaining(
  state: CBResearchState,
  claimId: string,
  pipelineConfig: PipelineConfig,
): number {
  return Math.max(0, getPerClaimQueryBudget(pipelineConfig) - getClaimQueryBudgetUsed(state, claimId));
}

/**
 * Consume query budget for a claim.
 * Returns false when consumption would exceed the configured budget.
 */
export function consumeClaimQueryBudget(
  state: CBResearchState,
  claimId: string,
  pipelineConfig: PipelineConfig,
  amount = 1,
): boolean {
  if (amount <= 0) return true;
  if (!state.queryBudgetUsageByClaim) {
    state.queryBudgetUsageByClaim = {};
  }
  const used = getClaimQueryBudgetUsed(state, claimId);
  const budget = getPerClaimQueryBudget(pipelineConfig);
  if (used + amount > budget) return false;
  state.queryBudgetUsageByClaim[claimId] = used + amount;
  return true;
}
