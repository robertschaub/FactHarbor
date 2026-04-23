"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import type {
  AtomicClaim,
  ClaimSelectionDraftState,
  ClaimSelectionDraftObservability,
  ClaimSelectionRecommendationAssessment,
} from "@/lib/analyzer/types";
import {
  buildDraftAccessHeaders,
  clearStoredDraftAccessToken,
  getSessionStorageItemSafely,
} from "@/lib/claim-selection-client";
import {
  getClaimSelectionCap,
  shouldAutoContinueWithoutSelection,
  shouldRequireClaimSelectionUi,
} from "@/lib/claim-selection-flow";
import commonStyles from "../../../../styles/common.module.css";
import { ClaimSelectionPanel } from "./ClaimSelectionPanel";
import styles from "./page.module.css";

type DraftStatus =
  | "QUEUED"
  | "PREPARING"
  | "AWAITING_CLAIM_SELECTION"
  | "FAILED"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED"
  | string;

type DraftResponse = {
  draftId: string;
  status: DraftStatus;
  progress: number;
  lastEventMessage: string | null;
  selectionMode: "interactive" | "automatic";
  restartedViaOther: boolean;
  restartCount: number;
  draftStateJson: string | null;
  finalJobId: string | null;
  createdUtc: string;
  updatedUtc: string;
  expiresUtc: string;
};

const POLL_INTERVAL_MS = 2000;

function clampProgress(progress: number | null | undefined): number {
  if (typeof progress !== "number" || !Number.isFinite(progress)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.trunc(progress)));
}

function normalizeDraftResponse(draft: DraftResponse): DraftResponse {
  return {
    ...draft,
    progress: clampProgress(draft.progress),
  };
}

function parseDraftState(draftStateJson: string | null): ClaimSelectionDraftState | null {
  if (!draftStateJson) return null;
  try {
    return JSON.parse(draftStateJson) as ClaimSelectionDraftState;
  } catch {
    return null;
  }
}

function formatDurationMs(durationMs: number | null | undefined): string | null {
  if (typeof durationMs !== "number" || !Number.isFinite(durationMs) || durationMs < 0) {
    return null;
  }

  if (durationMs < 1000) {
    return `${Math.round(durationMs)} ms`;
  }

  const totalSeconds = durationMs / 1000;
  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(1)} s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds - minutes * 60;
  if (minutes < 60) {
    return `${minutes} m ${seconds.toFixed(seconds >= 10 ? 0 : 1)} s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours} h ${remainingMinutes} m`;
}

function buildPreparationTimingSummary(observability: ClaimSelectionDraftObservability | undefined): string | null {
  if (!observability) return null;

  const parts = [
    observability.stage1Ms ? `Stage 1 ${formatDurationMs(observability.stage1Ms)}` : null,
    observability.recommendationMs ? `recommendation ${formatDurationMs(observability.recommendationMs)}` : null,
    observability.totalPrepMs ? `total ${formatDurationMs(observability.totalPrepMs)}` : null,
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(" | ") : null;
}

function orderClaims(claims: AtomicClaim[], rankedClaimIds: string[]): AtomicClaim[] {
  if (claims.length <= 1 || rankedClaimIds.length === 0) return claims;

  const claimById = new Map(claims.map((claim) => [claim.id, claim]));
  const ordered: AtomicClaim[] = [];
  const seen = new Set<string>();

  for (const claimId of rankedClaimIds) {
    const claim = claimById.get(claimId);
    if (!claim || seen.has(claimId)) continue;
    ordered.push(claim);
    seen.add(claimId);
  }

  for (const claim of claims) {
    if (seen.has(claim.id)) continue;
    ordered.push(claim);
  }

  return ordered;
}

function shouldKeepPolling(draft: DraftResponse): boolean {
  if (draft.finalJobId) return false;
  return draft.status === "QUEUED" || draft.status === "PREPARING" || draft.status === "COMPLETED";
}

function getStatusHeadline(status: DraftStatus): string {
  switch (status) {
    case "QUEUED":
      return "Draft queued";
    case "PREPARING":
      return "Preparing atomic claims";
    case "AWAITING_CLAIM_SELECTION":
      return "Choose the atomic claims to continue";
    case "FAILED":
      return "Draft preparation failed";
    case "CANCELLED":
      return "Draft cancelled";
    case "EXPIRED":
      return "Draft expired";
    case "COMPLETED":
      return "Draft completed";
    default:
      return status;
  }
}

function getStatusSummary(draft: DraftResponse, candidateCount: number, recommendedCount: number): string {
  switch (draft.status) {
    case "QUEUED":
      return "FactHarbor has accepted the draft and is waiting for a runner slot.";
    case "PREPARING":
      return "FactHarbor is preparing the final Stage 1 claim set for this draft.";
    case "AWAITING_CLAIM_SELECTION":
      if (shouldRequireClaimSelectionUi(candidateCount)) {
        return "Stage 1 produced five or more candidate claims. Review the ranked list below and choose the final subset before analysis continues.";
      }
      if (shouldAutoContinueWithoutSelection(candidateCount)) {
        return "Stage 1 produced four or fewer candidate claims. FactHarbor can continue directly into the full analysis with all prepared claims.";
      }
      if (recommendedCount === 0) {
        return "The prepared draft is waiting for the next continuation step.";
      }
      return "The prepared draft is ready for continuation.";
    case "FAILED":
      return "The prepared Stage 1 snapshot was not accepted. You can retry preparation or cancel the draft.";
    case "CANCELLED":
      return "This draft will not create a job unless you start over from the analyze page.";
    case "EXPIRED":
      return "The 24-hour draft window elapsed before confirmation.";
    case "COMPLETED":
      return "The draft has already been confirmed and is handing off to the job runner.";
    default:
      return "FactHarbor is processing this draft.";
  }
}

export default function ClaimSelectionDraftPage() {
  const router = useRouter();
  const params = useParams<{ draftId: string }>();
  const draftId = typeof params?.draftId === "string" ? params.draftId : "";

  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftResponse | null>(null);
  const [selectedClaimIds, setSelectedClaimIds] = useState<string[]>([]);
  const [selectionSeed, setSelectionSeed] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [refreshNonce, setRefreshNonce] = useState(0);

  useEffect(() => {
    setAdminKey(getSessionStorageItemSafely("fh_admin_key"));
  }, []);

  useEffect(() => {
    if (!draftId) {
      setError("Missing draft id");
      setIsLoading(false);
      return;
    }

    let disposed = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const loadDraft = async () => {
      try {
        const response = await fetch(`/api/fh/claim-selection-drafts/${draftId}`, {
          method: "GET",
          cache: "no-store",
          headers: buildDraftAccessHeaders(draftId, adminKey),
        });

        if (disposed) return;

        if (!response.ok) {
          let message = `Failed to load draft (${response.status})`;
          try {
            const data = await response.json();
            if (typeof data?.error === "string" && data.error.trim()) {
              message = data.error;
            }
          } catch {
            // Keep fallback message.
          }

          if (response.status === 401) {
            message = "Draft access token missing or invalid. Reopen this draft from the original browser session or use an admin key.";
          } else if (response.status === 410) {
            message = "Draft expired before it could be confirmed.";
          }

          setError(message);
          setIsLoading(false);
          return;
        }

        const data = normalizeDraftResponse((await response.json()) as DraftResponse);
        setDraft(data);
        setError(null);
        setIsLoading(false);

        if (data.finalJobId) {
          clearStoredDraftAccessToken(draftId);
          router.replace(`/jobs/${data.finalJobId}`);
          return;
        }

        if (shouldKeepPolling(data)) {
          timeoutId = setTimeout(loadDraft, POLL_INTERVAL_MS);
        }
      } catch (loadError: any) {
        if (disposed) return;
        setError(loadError?.message ?? "Failed to load draft");
        setIsLoading(false);
      }
    };

    void loadDraft();

    return () => {
      disposed = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [adminKey, draftId, refreshNonce, router]);

  const draftState = useMemo(() => parseDraftState(draft?.draftStateJson ?? null), [draft?.draftStateJson]);
  const candidateClaims = useMemo(() => {
    const claims = draftState?.preparedStage1?.preparedUnderstanding.atomicClaims ?? [];
    return orderClaims(claims, draftState?.rankedClaimIds ?? []);
  }, [draftState]);
  const selectedClaimSet = useMemo(() => new Set(selectedClaimIds), [selectedClaimIds]);
  const recommendedClaimSet = useMemo(
    () => new Set(draftState?.recommendedClaimIds ?? []),
    [draftState?.recommendedClaimIds],
  );
  const assessmentsByClaimId = useMemo(() => {
    const entries = (draftState?.assessments ?? []).map((assessment) => [assessment.claimId, assessment]);
    return Object.fromEntries(entries) as Record<string, ClaimSelectionRecommendationAssessment | undefined>;
  }, [draftState?.assessments]);

  useEffect(() => {
    if (!draft || draft.status !== "AWAITING_CLAIM_SELECTION") {
      return;
    }

    const nextSeed = [
      draft.updatedUtc,
      draftState?.selectedClaimIds.join("|") ?? "",
      draftState?.recommendedClaimIds.join("|") ?? "",
    ].join("::");

    if (selectionSeed === nextSeed) {
      return;
    }

    const defaultSelection = shouldRequireClaimSelectionUi(candidateClaims.length)
      ? (draftState?.selectedClaimIds?.length
          ? draftState.selectedClaimIds
          : draftState?.recommendedClaimIds ?? [])
          .filter((claimId) => candidateClaims.some((claim) => claim.id === claimId))
          .slice(0, getClaimSelectionCap(candidateClaims.length))
      : candidateClaims
          .map((claim) => claim.id)
          .slice(0, getClaimSelectionCap(candidateClaims.length));

    setSelectedClaimIds(defaultSelection);
    setSelectionSeed(nextSeed);
  }, [candidateClaims, draft, draftState, selectionSeed]);

  const statusHeadline = draft ? getStatusHeadline(draft.status) : "Loading draft";
  const statusSummary = draft
    ? getStatusSummary(draft, candidateClaims.length, draftState?.recommendedClaimIds.length ?? 0)
    : "Loading draft state.";
  const selectionCap = getClaimSelectionCap(candidateClaims.length);
  const requiresSelectionUi = shouldRequireClaimSelectionUi(candidateClaims.length);
  const selectionLimitReached = selectedClaimIds.length >= selectionCap;
  const displayProgress = clampProgress(draft?.progress);
  const preparationObservability = draftState?.observability;
  const preparationTimingSummary = buildPreparationTimingSummary(preparationObservability);
  const livePreparationMessage = draft?.lastEventMessage ?? preparationObservability?.eventMessage ?? null;

  const handleToggleClaim = (claimId: string) => {
    setError(null);
    setSelectedClaimIds((current) => {
      if (current.includes(claimId)) {
        return current.filter((id) => id !== claimId);
      }
      if (current.length >= selectionCap) {
        setError(`You can select at most ${selectionCap} claim${selectionCap === 1 ? "" : "s"}.`);
        return current;
      }
      return [...current, claimId];
    });
  };

  const handleConfirm = async () => {
    if (!draftId || selectedClaimIds.length < 1 || selectedClaimIds.length > selectionCap) {
      setError(`Select between one and ${selectionCap} claim${selectionCap === 1 ? "" : "s"}.`);
      return;
    }

    setIsConfirming(true);
    setError(null);

    try {
      const response = await fetch(`/api/fh/claim-selection-drafts/${draftId}/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...buildDraftAccessHeaders(draftId, adminKey),
        },
        body: JSON.stringify({ selectedClaimIds }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || `Failed to confirm draft (${response.status})`);
      }

      if (typeof data?.finalJobId !== "string" || !data.finalJobId) {
        throw new Error("Draft confirmation did not return a job id");
      }

      clearStoredDraftAccessToken(draftId);
      router.replace(`/jobs/${data.finalJobId}`);
    } catch (confirmError: any) {
      setError(confirmError?.message ?? "Failed to confirm draft");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancel = async () => {
    if (!draftId) return;

    setIsCancelling(true);
    setError(null);
    try {
      const response = await fetch(`/api/fh/claim-selection-drafts/${draftId}/cancel`, {
        method: "POST",
        headers: buildDraftAccessHeaders(draftId, adminKey),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || `Failed to cancel draft (${response.status})`);
      }

      clearStoredDraftAccessToken(draftId);
      setDraft((current) => current ? { ...current, status: data.status ?? "CANCELLED" } : current);
    } catch (cancelError: any) {
      setError(cancelError?.message ?? "Failed to cancel draft");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRetry = async () => {
    if (!draftId) return;

    setIsRetrying(true);
    setError(null);
    try {
      const response = await fetch(`/api/fh/claim-selection-drafts/${draftId}/retry`, {
        method: "POST",
        headers: buildDraftAccessHeaders(draftId, adminKey),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || `Failed to retry draft (${response.status})`);
      }

      setDraft((current) => current ? { ...current, status: data.status ?? "QUEUED", progress: 0 } : current);
      setRefreshNonce((current) => current + 1);
      setIsLoading(true);
    } catch (retryError: any) {
      setError(retryError?.message ?? "Failed to retry draft");
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className={`${commonStyles.container} ${styles.page}`}>
      <div className={styles.heroCard}>
        <h1 className={commonStyles.title}>Atomic Claim Selection</h1>
        <p className={commonStyles.subtitle}>{statusHeadline}</p>
        <p className={styles.infoText}>{statusSummary}</p>
        <div className={styles.heroMeta}>
          {draft && (
            <>
              <span className={styles.metaBadge}>Draft {draft.draftId}</span>
              <span
                className={`${styles.metaBadge} ${
                  draft.status === "FAILED" || draft.status === "EXPIRED"
                    ? styles.statusBadgeError
                    : draft.status === "QUEUED" || draft.status === "PREPARING"
                      ? styles.statusBadgeWaiting
                      : styles.statusBadge
                }`}
              >
                {draft.status}
              </span>
            </>
          )}
        </div>
      </div>

      {error && <div className={commonStyles.errorBox}>{error}</div>}

      {isLoading && !draft ? (
        <div className={styles.infoCard}>
          <h2 className={styles.infoTitle}>Loading draft</h2>
          <p className={styles.infoText}>Fetching the current preparation state.</p>
        </div>
      ) : null}

      {draft && (
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>Candidate claims</div>
            <div className={styles.summaryValue}>{candidateClaims.length}</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>Recommended claims</div>
            <div className={styles.summaryValue}>{draftState?.recommendedClaimIds.length ?? 0}</div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>Restart count</div>
            <div className={styles.summaryValue}>{draft.restartCount}</div>
          </div>
        </div>
      )}

      {draft?.status === "QUEUED" || draft?.status === "PREPARING" || (draft?.status === "COMPLETED" && !draft.finalJobId) ? (
        <div className={styles.infoCard}>
          <h2 className={styles.infoTitle}>Preparation in progress</h2>
          <p className={styles.infoText}>
            Progress: {displayProgress}%.
            {" "}If Stage 1 yields four or fewer claims, FactHarbor continues automatically. If five or
            more survive, you will review the prepared claim set before analysis starts.
          </p>
          {livePreparationMessage ? (
            <p className={styles.infoText}>Current step: {livePreparationMessage}</p>
          ) : null}
          <div className={styles.actions} style={{ marginTop: 16 }}>
            <button
              type="button"
              className={styles.dangerButton}
              onClick={handleCancel}
              disabled={isCancelling}
            >
              {isCancelling ? "Cancelling..." : "Cancel draft"}
            </button>
          </div>
        </div>
      ) : null}

      {draft?.status === "FAILED" ? (
        <div className={styles.infoCard}>
          <h2 className={styles.infoTitle}>Preparation failed</h2>
          <p className={styles.infoText}>
            {draftState?.lastError?.message ?? "FactHarbor could not finish preparing this draft."}
          </p>
          {preparationTimingSummary ? (
            <p className={styles.infoText}>Preparation summary: {preparationTimingSummary}</p>
          ) : null}
          <div className={styles.actions} style={{ marginTop: 16 }}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={handleRetry}
              disabled={isRetrying}
            >
              {isRetrying ? "Retrying..." : "Retry preparation"}
            </button>
            <button
              type="button"
              className={styles.dangerButton}
              onClick={handleCancel}
              disabled={isCancelling}
            >
              {isCancelling ? "Cancelling..." : "Cancel draft"}
            </button>
          </div>
        </div>
      ) : null}

      {draft?.status === "CANCELLED" || draft?.status === "EXPIRED" ? (
        <div className={styles.infoCard}>
          <h2 className={styles.infoTitle}>
            {draft.status === "CANCELLED" ? "Draft cancelled" : "Draft expired"}
          </h2>
          <p className={styles.infoText}>
            {draft.status === "CANCELLED"
              ? "This draft will not continue. Start a new analysis when you are ready."
              : "Drafts expire after 24 hours. Start a new analysis to prepare a fresh claim set."}
          </p>
          <div className={styles.actions} style={{ marginTop: 16 }}>
            <Link href="/analyze" className={styles.linkButton}>
              Back to Analyze
            </Link>
          </div>
        </div>
      ) : null}

      {draft?.status === "AWAITING_CLAIM_SELECTION" ? (
        <div className={styles.selectionLayout}>
          <div className={styles.selectionCard}>
            <div className={styles.selectionHeader}>
              <div className={styles.selectionHeaderText}>
                <h2 className={styles.selectionTitle}>Prepared candidate claims</h2>
                <p className={styles.selectionSubtitle}>
                  {requiresSelectionUi
                    ? `Keep one to ${selectionCap} claim${selectionCap === 1 ? "" : "s"}. Recommendation order is already applied below, and recommended claims are preselected.`
                    : "Stage 1 produced four or fewer claims, so FactHarbor will analyze all of them directly without a manual selection step."}
                </p>
              </div>
              <div className={styles.counterBadge}>
                {requiresSelectionUi
                  ? `${selectedClaimIds.length} / ${selectionCap} selected`
                  : `${candidateClaims.length} / ${candidateClaims.length} prepared`}
              </div>
            </div>

            {draftState?.recommendationRationale && (
              <p className={styles.recommendationRationale}>{draftState.recommendationRationale}</p>
            )}
            {preparationTimingSummary ? (
              <p className={styles.infoText}>Preparation summary: {preparationTimingSummary}</p>
            ) : null}

            {candidateClaims.length > 0 && requiresSelectionUi ? (
              <ClaimSelectionPanel
                claims={candidateClaims}
                assessmentsByClaimId={assessmentsByClaimId}
                recommendedClaimIds={recommendedClaimSet}
                selectedClaimIds={selectedClaimSet}
                selectionLimitReached={selectionLimitReached}
                onToggleClaim={handleToggleClaim}
              />
            ) : candidateClaims.length > 0 ? (
              <ol className={styles.claimList} style={{ paddingLeft: 20 }}>
                {candidateClaims.map((claim) => (
                  <li key={claim.id} className={styles.claimStatement} style={{ marginBottom: 12 }}>
                    {claim.statement}
                  </li>
                ))}
              </ol>
            ) : (
              <div className={commonStyles.errorBox}>
                Prepared draft state is missing candidate claims. Cancel this draft and start a fresh analysis.
              </div>
            )}

            <div className={styles.actions} style={{ marginTop: 16 }}>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleConfirm}
                disabled={
                  isConfirming ||
                  selectedClaimIds.length < 1 ||
                  selectedClaimIds.length > selectionCap ||
                  candidateClaims.length === 0
                }
              >
                {isConfirming
                  ? "Creating job..."
                  : requiresSelectionUi
                    ? "Continue with selected claims"
                    : "Continue to analysis"}
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                onClick={handleCancel}
                disabled={isCancelling}
              >
                {isCancelling ? "Cancelling..." : "Cancel draft"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
