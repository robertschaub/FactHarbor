export const CLAIM_SELECTION_MODE_VALUES = ["interactive", "automatic"] as const;
export type ClaimSelectionMode = (typeof CLAIM_SELECTION_MODE_VALUES)[number];

export const CLAIM_SELECTION_BUDGET_FIT_MODE_VALUES = [
  "off",
  "explain_only",
  "allow_fewer_recommendations",
] as const;
export type ClaimSelectionBudgetFitMode = (typeof CLAIM_SELECTION_BUDGET_FIT_MODE_VALUES)[number];

export const CLAIM_SELECTION_ABSOLUTE_MAX = 5;
export const CLAIM_SELECTION_DEFAULT_CAP = 5;
export const CLAIM_SELECTION_IDLE_AUTO_PROCEED_DEFAULT_MS = 3600000;
export const CLAIM_SELECTION_IDLE_AUTO_PROCEED_MAX_MS = 3600000;
export const CLAIM_SELECTION_BUDGET_AWARENESS_DEFAULT_ENABLED = true;
export const CLAIM_SELECTION_BUDGET_FIT_DEFAULT_MODE: ClaimSelectionBudgetFitMode = "allow_fewer_recommendations";
export const CLAIM_SELECTION_MIN_RECOMMENDED_DEFAULT = 1;
export const CLAIM_SELECTION_ESTIMATED_MAIN_RESEARCH_MS_PER_CLAIM_DEFAULT = 160000;
export const CLAIM_SELECTION_ESTIMATED_MAIN_RESEARCH_MS_PER_CLAIM_MIN = 30000;
export const CLAIM_SELECTION_ESTIMATED_MAIN_RESEARCH_MS_PER_CLAIM_MAX = 600000;

export function normalizeClaimSelectionMode(
  configuredMode: string | null | undefined,
): ClaimSelectionMode {
  return configuredMode === "automatic" ? "automatic" : "interactive";
}

export function normalizeClaimSelectionBudgetFitMode(
  configuredMode: string | null | undefined,
): ClaimSelectionBudgetFitMode {
  return CLAIM_SELECTION_BUDGET_FIT_MODE_VALUES.includes(configuredMode as ClaimSelectionBudgetFitMode)
    ? (configuredMode as ClaimSelectionBudgetFitMode)
    : CLAIM_SELECTION_BUDGET_FIT_DEFAULT_MODE;
}

export function normalizeClaimSelectionMinRecommendedClaims(
  configuredMin: number | null | undefined,
): number {
  if (!Number.isFinite(configuredMin)) {
    return CLAIM_SELECTION_MIN_RECOMMENDED_DEFAULT;
  }

  const normalizedMin = configuredMin as number;
  return Math.max(
    1,
    Math.min(CLAIM_SELECTION_ABSOLUTE_MAX, Math.trunc(normalizedMin)),
  );
}

export function normalizeClaimSelectionEstimatedMainResearchMsPerClaim(
  configuredMs: number | null | undefined,
): number {
  if (!Number.isFinite(configuredMs)) {
    return CLAIM_SELECTION_ESTIMATED_MAIN_RESEARCH_MS_PER_CLAIM_DEFAULT;
  }

  const normalizedMs = configuredMs as number;
  return Math.max(
    CLAIM_SELECTION_ESTIMATED_MAIN_RESEARCH_MS_PER_CLAIM_MIN,
    Math.min(
      CLAIM_SELECTION_ESTIMATED_MAIN_RESEARCH_MS_PER_CLAIM_MAX,
      Math.trunc(normalizedMs),
    ),
  );
}

export function normalizeClaimSelectionCap(
  configuredCap: number | null | undefined,
): number {
  if (!Number.isFinite(configuredCap)) {
    return CLAIM_SELECTION_DEFAULT_CAP;
  }

  const normalizedCap = configuredCap as number;
  return Math.max(
    1,
    Math.min(CLAIM_SELECTION_ABSOLUTE_MAX, Math.trunc(normalizedCap)),
  );
}

export function normalizeClaimSelectionIdleAutoProceedMs(
  configuredMs: number | null | undefined,
): number {
  if (!Number.isFinite(configuredMs)) {
    return CLAIM_SELECTION_IDLE_AUTO_PROCEED_DEFAULT_MS;
  }

  const normalizedMs = configuredMs as number;
  return Math.max(
    0,
    Math.min(CLAIM_SELECTION_IDLE_AUTO_PROCEED_MAX_MS, Math.trunc(normalizedMs)),
  );
}

export function shouldAutoContinueWithoutSelection(
  candidateCount: number,
  configuredCap?: number | null,
): boolean {
  if (!Number.isFinite(candidateCount)) return false;
  return candidateCount > 0 && candidateCount < normalizeClaimSelectionCap(configuredCap);
}

export function shouldRequireClaimSelectionUi(
  candidateCount: number,
  configuredCap?: number | null,
): boolean {
  if (!Number.isFinite(candidateCount)) return false;
  return candidateCount >= normalizeClaimSelectionCap(configuredCap);
}

export function getClaimSelectionCap(
  candidateCount: number,
  configuredCap?: number | null,
): number {
  const normalizedCap = normalizeClaimSelectionCap(configuredCap);
  if (!Number.isFinite(candidateCount) || candidateCount <= 0) {
    return 1;
  }
  return Math.min(normalizedCap, Math.trunc(candidateCount));
}

export function getBudgetAwareClaimSelectionCap(options: {
  candidateCount: number;
  configuredCap?: number | null;
  budgetAwarenessEnabled?: boolean | null;
  budgetFitMode?: string | null;
  researchTimeBudgetMs?: number | null;
  contradictionProtectedTimeMs?: number | null;
  estimatedMainResearchMsPerClaim?: number | null;
  minRecommendedClaims?: number | null;
}): number {
  const structuralCap = getClaimSelectionCap(
    options.candidateCount,
    options.configuredCap,
  );
  if (
    options.budgetAwarenessEnabled !== true ||
    normalizeClaimSelectionBudgetFitMode(options.budgetFitMode) !== "allow_fewer_recommendations"
  ) {
    return structuralCap;
  }

  const researchBudgetMs = Number.isFinite(options.researchTimeBudgetMs)
    ? Math.max(0, Math.trunc(options.researchTimeBudgetMs as number))
    : 0;
  const protectedTimeMs = Number.isFinite(options.contradictionProtectedTimeMs)
    ? Math.max(0, Math.trunc(options.contradictionProtectedTimeMs as number))
    : 0;
  const availableMainResearchMs = Math.max(0, researchBudgetMs - protectedTimeMs);
  const estimatedPerClaimMs = normalizeClaimSelectionEstimatedMainResearchMsPerClaim(
    options.estimatedMainResearchMsPerClaim,
  );
  const budgetCap = Math.floor(availableMainResearchMs / estimatedPerClaimMs);
  const minRecommendedClaims = normalizeClaimSelectionMinRecommendedClaims(
    options.minRecommendedClaims,
  );

  return Math.max(
    1,
    Math.min(
      structuralCap,
      Math.max(minRecommendedClaims, budgetCap),
    ),
  );
}

export function isValidClaimSelection(
  selectedClaimIds: readonly string[] | null | undefined,
  configuredCap?: number | null,
): boolean {
  if (!Array.isArray(selectedClaimIds)) {
    return false;
  }

  if (selectedClaimIds.some((claimId) => typeof claimId !== "string" || claimId.trim().length === 0)) {
    return false;
  }

  if (new Set(selectedClaimIds).size !== selectedClaimIds.length) {
    return false;
  }

  const selectionCap = normalizeClaimSelectionCap(configuredCap);
  return selectedClaimIds.length >= 1 && selectedClaimIds.length <= selectionCap;
}

function filterCandidateSelection(
  claimIds: readonly string[] | null | undefined,
  candidateClaimIds: readonly string[],
  selectionCap: number,
): string[] {
  if (!Array.isArray(claimIds) || claimIds.length === 0) {
    return [];
  }

  const candidateClaimIdSet = new Set(candidateClaimIds);
  const selectedClaimIds: string[] = [];
  const seen = new Set<string>();

  for (const claimId of claimIds) {
    if (!candidateClaimIdSet.has(claimId) || seen.has(claimId)) {
      continue;
    }
    selectedClaimIds.push(claimId);
    seen.add(claimId);
    if (selectedClaimIds.length >= selectionCap) {
      break;
    }
  }

  return selectedClaimIds;
}

export function resolveInitialClaimSelection(options: {
  candidateClaimIds: readonly string[];
  persistedSelectedClaimIds?: readonly string[] | null;
  recommendedClaimIds?: readonly string[] | null;
  configuredCap?: number | null;
  requiresSelectionUi: boolean;
  hasUserSelectionInteraction?: boolean;
}): string[] {
  const selectionCap = getClaimSelectionCap(
    options.candidateClaimIds.length,
    options.configuredCap,
  );

  if (!options.requiresSelectionUi) {
    return options.candidateClaimIds.slice(0, selectionCap);
  }

  const persistedSelection = filterCandidateSelection(
    options.persistedSelectedClaimIds,
    options.candidateClaimIds,
    selectionCap,
  );

  if (
    options.hasUserSelectionInteraction &&
    isValidClaimSelection(persistedSelection, selectionCap)
  ) {
    return persistedSelection;
  }

  const recommendedSelection = filterCandidateSelection(
    options.recommendedClaimIds,
    options.candidateClaimIds,
    selectionCap,
  );

  if (isValidClaimSelection(recommendedSelection, selectionCap)) {
    return recommendedSelection;
  }

  if (isValidClaimSelection(persistedSelection, selectionCap)) {
    return persistedSelection;
  }

  return [];
}

export function resolveIdleAutoProceedSelection(
  currentSelectedClaimIds: readonly string[] | null | undefined,
  lastValidSelectedClaimIds: readonly string[] | null | undefined,
  configuredCap?: number | null,
): string[] {
  if (isValidClaimSelection(currentSelectedClaimIds, configuredCap)) {
    return Array.from(currentSelectedClaimIds ?? []);
  }

  if (isValidClaimSelection(lastValidSelectedClaimIds, configuredCap)) {
    return Array.from(lastValidSelectedClaimIds ?? []);
  }

  return [];
}

export function getClaimSelectionIdleRemainingMs(
  lastInteractionAtMs: number | null | undefined,
  configuredIdleTimeoutMs?: number | null,
  nowMs = Date.now(),
): number {
  const idleTimeoutMs = normalizeClaimSelectionIdleAutoProceedMs(configuredIdleTimeoutMs);
  if (idleTimeoutMs <= 0) {
    return 0;
  }

  if (!Number.isFinite(lastInteractionAtMs) || !Number.isFinite(nowMs)) {
    return idleTimeoutMs;
  }

  const elapsedMs = Math.max(0, nowMs - (lastInteractionAtMs as number));
  return Math.max(0, idleTimeoutMs - elapsedMs);
}
