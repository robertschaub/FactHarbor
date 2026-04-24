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
import { CopyButton } from "@/components/CopyButton";
import {
  buildStoredClaimSelectionSessionLabel,
  buildDraftAccessHeaders,
  clearStoredDraftAccessToken,
  getSessionStorageItemSafely,
  removeStoredActiveClaimSelectionSession,
  upsertStoredActiveClaimSelectionSession,
} from "@/lib/claim-selection-client";
import { InputBanner } from "../../../jobs/[id]/components/InputBanner";
import {
  getClaimSelectionIdleRemainingMs,
  getClaimSelectionCap,
  isValidClaimSelection,
  normalizeClaimSelectionCap,
  normalizeClaimSelectionIdleAutoProceedMs,
  resolveIdleAutoProceedSelection,
  shouldAutoContinueWithoutSelection,
  shouldRequireClaimSelectionUi,
} from "@/lib/claim-selection-flow";
import commonStyles from "../../../../styles/common.module.css";
import jobStyles from "../../../jobs/[id]/page.module.css";
import { ClaimSelectionPanel } from "./ClaimSelectionPanel";
import {
  formatClaimCount,
  getDraftPageTitle,
  getStatusHeadline,
  getStatusSummary,
  type DraftStatus,
} from "./page-helpers";
import styles from "./page.module.css";

type DraftResponse = {
  draftId: string;
  status: DraftStatus;
  progress: number;
  isHidden: boolean;
  lastEventMessage: string | null;
  selectionMode: "interactive" | "automatic";
  originalInputType: string | null;
  originalInputValue: string | null;
  activeInputType: string | null;
  activeInputValue: string | null;
  restartedViaOther: boolean;
  restartCount: number;
  draftStateJson: string | null;
  finalJobId: string | null;
  createdUtc: string;
  updatedUtc: string;
  expiresUtc: string;
};

const POLL_INTERVAL_MS = 2000;
const COUNTDOWN_TICK_INTERVAL_MS = 1000;

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

function formatDateTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(parsed);
}

function formatCountdownDuration(durationMs: number | null | undefined): string | null {
  if (typeof durationMs !== "number" || !Number.isFinite(durationMs) || durationMs < 0) {
    return null;
  }

  const totalSeconds = Math.ceil(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
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
  const [isTogglingHidden, setIsTogglingHidden] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [autoContinueAttemptSeed, setAutoContinueAttemptSeed] = useState<string | null>(null);
  const [autoContinueFailed, setAutoContinueFailed] = useState(false);
  const [lastSelectionInteractionAtMs, setLastSelectionInteractionAtMs] = useState<number | null>(null);
  const [lastValidSelectedClaimIds, setLastValidSelectedClaimIds] = useState<string[]>([]);
  const [manualIdleAutoProceedAttemptSeed, setManualIdleAutoProceedAttemptSeed] = useState<string | null>(null);
  const [manualIdleInitializationSeed, setManualIdleInitializationSeed] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setAdminKey(getSessionStorageItemSafely("fh_admin_key"));
  }, []);

  useEffect(() => {
    if (!draft) return;

    if (draft.status === "CANCELLED" || draft.status === "EXPIRED") {
      removeStoredActiveClaimSelectionSession(draft.draftId);
      return;
    }

    const inputType = draft.activeInputType?.trim() || draft.originalInputType?.trim() || "text";
    const inputValue = draft.activeInputValue?.trim() || draft.originalInputValue?.trim() || draft.draftId;

    upsertStoredActiveClaimSelectionSession({
      draftId: draft.draftId,
      createdUtc: draft.createdUtc,
      inputType,
      inputPreview: buildStoredClaimSelectionSessionLabel(inputType),
      selectionMode: draft.selectionMode,
      lastKnownStatus: draft.status,
      lastKnownFinalJobId: draft.finalJobId ?? null,
      lastKnownUpdatedUtc: draft.updatedUtc,
      hidden: draft.isHidden,
    });
  }, [
    draft?.activeInputType,
    draft?.activeInputValue,
    draft?.createdUtc,
    draft?.draftId,
    draft?.finalJobId,
    draft?.isHidden,
    draft?.originalInputType,
    draft?.originalInputValue,
    draft?.selectionMode,
    draft?.status,
    draft?.updatedUtc,
  ]);

  useEffect(() => {
    if (!draftId) {
      setError("Missing session id");
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
          let message = `Failed to load session (${response.status})`;
          try {
            const data = await response.json();
            if (typeof data?.error === "string" && data.error.trim()) {
              message = data.error;
            }
          } catch {
            // Keep fallback message.
          }

          if (response.status === 401) {
            message = "Session access is no longer available in this browser profile. Reopen it from the original browser profile or use an admin key.";
          } else if (response.status === 410) {
            message = "Session expired before it could be confirmed.";
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
        setError(loadError?.message ?? "Failed to load session");
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

  const selectionThreshold = normalizeClaimSelectionCap(draftState?.selectionCap);
  const selectionCap = getClaimSelectionCap(candidateClaims.length, selectionThreshold);
  const requiresSelectionUi = shouldRequireClaimSelectionUi(candidateClaims.length, selectionThreshold);
  const idleAutoProceedMs =
    typeof draftState?.selectionIdleAutoProceedMs === "number"
      ? normalizeClaimSelectionIdleAutoProceedMs(draftState.selectionIdleAutoProceedMs)
      : 0;
  const persistedLastSelectionInteractionAtMs = useMemo(() => {
    const value = draftState?.lastSelectionInteractionUtc;
    if (!value) return null;
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }, [draftState?.lastSelectionInteractionUtc]);
  const effectiveLastSelectionInteractionAtMs =
    lastSelectionInteractionAtMs ?? persistedLastSelectionInteractionAtMs;
  const manualIdleAutoProceedEnabled =
    draft?.status === "AWAITING_CLAIM_SELECTION" && requiresSelectionUi && idleAutoProceedMs > 0;
  const autoContinueClaimIds = useMemo(
    () =>
      shouldAutoContinueWithoutSelection(candidateClaims.length, selectionThreshold)
        ? candidateClaims.map((claim) => claim.id).slice(0, selectionCap)
        : [],
    [candidateClaims, selectionCap, selectionThreshold],
  );
  const persistedSelectedClaimIds = draftState?.selectedClaimIds ?? [];
  const idleAutoProceedClaimIds = useMemo(
    () => resolveIdleAutoProceedSelection(selectedClaimIds, lastValidSelectedClaimIds, selectionCap),
    [lastValidSelectedClaimIds, selectedClaimIds, selectionCap],
  );
  const idleAutoProceedRemainingMs = manualIdleAutoProceedEnabled
    ? getClaimSelectionIdleRemainingMs(effectiveLastSelectionInteractionAtMs, idleAutoProceedMs, nowMs)
    : null;
  const idleAutoProceedCountdownLabel = formatCountdownDuration(idleAutoProceedRemainingMs);
  const hasPersistedValidSelection = isValidClaimSelection(persistedSelectedClaimIds, selectionCap);
  const manualIdleAutoProceedArmed =
    manualIdleAutoProceedEnabled &&
    (hasPersistedValidSelection || isValidClaimSelection(lastValidSelectedClaimIds, selectionCap));

  useEffect(() => {
    if (!draft || draft.status !== "AWAITING_CLAIM_SELECTION") {
      return;
    }

    const nextSeed = [
      draft.status,
      candidateClaims.map((claim) => claim.id).join("|"),
      draftState?.selectedClaimIds?.join("|") ?? "",
      draftState?.recommendedClaimIds?.join("|") ?? "",
      draftState?.lastSelectionInteractionUtc ?? "",
    ].join("::");

    if (selectionSeed === nextSeed) {
      return;
    }

    const defaultSelection = shouldRequireClaimSelectionUi(candidateClaims.length, selectionThreshold)
      ? (draftState?.selectedClaimIds?.length
          ? draftState.selectedClaimIds
          : draftState?.recommendedClaimIds ?? [])
          .filter((claimId) => candidateClaims.some((claim) => claim.id === claimId))
          .slice(0, selectionCap)
      : candidateClaims
          .map((claim) => claim.id)
          .slice(0, selectionCap);

    setSelectedClaimIds(defaultSelection);
    setLastValidSelectedClaimIds(
      isValidClaimSelection(draftState?.selectedClaimIds ?? [], selectionCap)
        ? [...(draftState?.selectedClaimIds ?? [])]
        : isValidClaimSelection(defaultSelection, selectionCap)
          ? defaultSelection
          : [],
    );
    setLastSelectionInteractionAtMs(persistedLastSelectionInteractionAtMs);
    setSelectionSeed(nextSeed);
  }, [
    candidateClaims,
    draft,
    draftState,
    persistedLastSelectionInteractionAtMs,
    selectionCap,
    selectionSeed,
    selectionThreshold,
  ]);

  useEffect(() => {
    if (!manualIdleAutoProceedEnabled || effectiveLastSelectionInteractionAtMs === null) {
      return;
    }

    setNowMs(Date.now());
    const intervalId = setInterval(() => {
      setNowMs(Date.now());
    }, COUNTDOWN_TICK_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [effectiveLastSelectionInteractionAtMs, manualIdleAutoProceedEnabled]);

  useEffect(() => {
    if (!draftId || draft?.status !== "AWAITING_CLAIM_SELECTION" || !requiresSelectionUi) {
      return;
    }
    if (idleAutoProceedMs <= 0 || persistedLastSelectionInteractionAtMs !== null) {
      return;
    }
    if (!isValidClaimSelection(selectedClaimIds, selectionCap)) {
      return;
    }

    const nextSeed = [
      draft.updatedUtc,
      selectedClaimIds.join("|"),
      selectionCap,
    ].join("::");
    if (manualIdleInitializationSeed === nextSeed) {
      return;
    }

    const interactionAtMs = Date.now();
    setManualIdleInitializationSeed(nextSeed);
    setLastSelectionInteractionAtMs(interactionAtMs);

    void persistSelectionInteraction(selectedClaimIds, interactionAtMs).catch((interactionError: any) => {
      setManualIdleInitializationSeed(null);
      setError(
        interactionError?.message
          ? `Failed to start inactivity auto-continue: ${interactionError.message}`
          : "Failed to start inactivity auto-continue",
      );
    });
  }, [
    adminKey,
    draft?.status,
    draft?.updatedUtc,
    draftId,
    idleAutoProceedMs,
    manualIdleInitializationSeed,
    persistedLastSelectionInteractionAtMs,
    requiresSelectionUi,
    router,
    selectedClaimIds,
    selectionCap,
  ]);

  const confirmDraft = async (claimIds: string[]) => {
    const response = await fetch(`/api/fh/claim-selection-drafts/${draftId}/confirm`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildDraftAccessHeaders(draftId, adminKey),
      },
      body: JSON.stringify({ selectedClaimIds: claimIds }),
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
  };

  const persistSelectionInteraction = async (claimIds: string[], interactionAtMs: number) => {
    if (!draftId) return;

    const response = await fetch(`/api/fh/claim-selection-drafts/${draftId}/selection-state`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...buildDraftAccessHeaders(draftId, adminKey),
      },
      body: JSON.stringify({
        selectedClaimIds: claimIds,
        interactionUtc: new Date(interactionAtMs).toISOString(),
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || `Failed to update selection activity (${response.status})`);
    }

    if (typeof data?.finalJobId === "string" && data.finalJobId) {
      clearStoredDraftAccessToken(draftId);
      router.replace(`/jobs/${data.finalJobId}`);
    }
  };

  useEffect(() => {
    if (!draftId || draft?.status !== "AWAITING_CLAIM_SELECTION" || requiresSelectionUi) {
      return;
    }
    if (autoContinueClaimIds.length === 0 || draft.finalJobId) {
      return;
    }

    const nextSeed = [draft.updatedUtc, autoContinueClaimIds.join("|")].join("::");
    if (autoContinueAttemptSeed === nextSeed || isConfirming) {
      return;
    }

    let cancelled = false;
    setAutoContinueAttemptSeed(nextSeed);
    setAutoContinueFailed(false);
    setIsConfirming(true);
    setError(null);

    void (async () => {
      try {
        await confirmDraft(autoContinueClaimIds);
      } catch (confirmError: any) {
        if (cancelled) return;
        setAutoContinueFailed(true);
        setError(
          confirmError?.message
            ? `Automatic continuation failed: ${confirmError.message}`
            : "Automatic continuation failed",
        );
      } finally {
        if (!cancelled) {
          setIsConfirming(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    adminKey,
    autoContinueAttemptSeed,
    autoContinueClaimIds,
    draft?.finalJobId,
    draft?.status,
    draft?.updatedUtc,
    draftId,
    isConfirming,
    requiresSelectionUi,
    router,
  ]);

  useEffect(() => {
    if (!draftId || draft?.status !== "AWAITING_CLAIM_SELECTION" || !requiresSelectionUi) {
      return;
    }
    if (!manualIdleAutoProceedArmed || draft.finalJobId || isConfirming) {
      return;
    }
    if (idleAutoProceedRemainingMs === null || idleAutoProceedRemainingMs > 0) {
      return;
    }
    if (idleAutoProceedClaimIds.length === 0) {
      return;
    }

    const nextSeed = [
      draft.updatedUtc,
      effectiveLastSelectionInteractionAtMs ?? "none",
      idleAutoProceedClaimIds.join("|"),
    ].join("::");
    if (manualIdleAutoProceedAttemptSeed === nextSeed) {
      return;
    }

    let cancelled = false;
    setManualIdleAutoProceedAttemptSeed(nextSeed);
    setIsConfirming(true);
    setError(null);

    void (async () => {
      try {
        await confirmDraft(idleAutoProceedClaimIds);
      } catch (confirmError: any) {
        if (cancelled) return;
        setError(
          confirmError?.message
            ? `Automatic continuation failed: ${confirmError.message}`
            : "Automatic continuation failed",
        );
      } finally {
        if (!cancelled) {
          setIsConfirming(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    adminKey,
    draft?.finalJobId,
    draft?.status,
    draft?.updatedUtc,
    draftId,
    effectiveLastSelectionInteractionAtMs,
    idleAutoProceedClaimIds,
    idleAutoProceedRemainingMs,
    isConfirming,
    manualIdleAutoProceedAttemptSeed,
    manualIdleAutoProceedArmed,
    requiresSelectionUi,
    router,
  ]);

  const pageTitle = draft ? getDraftPageTitle(draft.status, requiresSelectionUi) : "Preparing Analysis";
  const statusHeadline = draft ? getStatusHeadline(draft.status, requiresSelectionUi) : "Loading session";
  const statusSummary = draft
    ? getStatusSummary(
      draft.status,
      candidateClaims.length,
      draftState?.recommendedClaimIds.length ?? 0,
      selectionThreshold,
    )
      : "Loading session state.";
  const selectionLimitReached = selectedClaimIds.length >= selectionCap;
  const displayProgress = clampProgress(draft?.progress);
  const preparationObservability = draftState?.observability;
  const preparationTimingSummary = buildPreparationTimingSummary(preparationObservability);
  const livePreparationMessage = draft?.lastEventMessage ?? preparationObservability?.eventMessage ?? null;
  const rawDraftJson = useMemo(() => {
    if (!draft) return null;
    const payload = {
      draftId: draft.draftId,
      status: draft.status,
      progress: draft.progress,
      isHidden: draft.isHidden,
      lastEventMessage: draft.lastEventMessage,
      selectionMode: draft.selectionMode,
      originalInputType: draft.originalInputType,
      originalInputValue: draft.originalInputValue,
      activeInputType: draft.activeInputType,
      activeInputValue: draft.activeInputValue,
      restartedViaOther: draft.restartedViaOther,
      restartCount: draft.restartCount,
      createdUtc: draft.createdUtc,
      updatedUtc: draft.updatedUtc,
      expiresUtc: draft.expiresUtc,
      finalJobId: draft.finalJobId,
      draftState: draftState ?? null,
    };
    return JSON.stringify(payload, null, 2);
  }, [draft, draftState]);
  const activeInputValue = draft?.activeInputValue?.trim() || draft?.originalInputValue?.trim() || "";
  const formattedCreatedAt = formatDateTime(draft?.createdUtc);
  const canCancelSession = draft
    ? !["CANCELLED", "COMPLETED", "EXPIRED"].includes(draft.status)
    : false;
  const canRetryPreparation = draft?.status === "FAILED";
  const canToggleHidden = Boolean(draft && adminKey);
  const headerCardStatusClass =
    draft?.status === "FAILED" || draft?.status === "EXPIRED"
      ? jobStyles.statusFailed
      : draft?.status === "COMPLETED"
        ? jobStyles.statusSuccess
        : jobStyles.statusWarning;

  const handleToggleClaim = (claimId: string) => {
    setError(null);
    const interactionAtMs = Date.now();
    setLastSelectionInteractionAtMs(interactionAtMs);
    setSelectedClaimIds((current) => {
      let nextSelection: string[];
      if (current.includes(claimId)) {
        nextSelection = current.filter((id) => id !== claimId);
      } else if (current.length >= selectionCap) {
        void persistSelectionInteraction(current, interactionAtMs).catch((interactionError: any) => {
          setError(
            interactionError?.message
              ? `Failed to sync selection activity: ${interactionError.message}`
              : "Failed to sync selection activity",
          );
        });
        setError(
          selectionCap === 1
            ? "You can select exactly one claim."
            : `You can select at most ${selectionCap} claims.`,
        );
        return current;
      } else {
        nextSelection = [...current, claimId];
      }

      if (isValidClaimSelection(nextSelection, selectionCap)) {
        setLastValidSelectedClaimIds(nextSelection);
      }

      void persistSelectionInteraction(nextSelection, interactionAtMs).catch((interactionError: any) => {
        setError(
          interactionError?.message
            ? `Failed to sync selection activity: ${interactionError.message}`
            : "Failed to sync selection activity",
        );
      });

      return nextSelection;
    });
  };

  const handleConfirm = async () => {
    if (!draftId || selectedClaimIds.length < 1 || selectedClaimIds.length > selectionCap) {
      setError(
        selectionCap === 1
          ? "Select exactly one claim."
          : `Select between one and ${selectionCap} claims.`,
      );
      return;
    }

    setIsConfirming(true);
    setError(null);

    try {
      await confirmDraft(selectedClaimIds);
    } catch (confirmError: any) {
      setError(confirmError?.message ?? "Failed to confirm session");
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
        throw new Error(data?.error || `Failed to cancel session (${response.status})`);
      }

      clearStoredDraftAccessToken(draftId);
      removeStoredActiveClaimSelectionSession(draftId);
      setDraft((current) => current ? { ...current, status: data.status ?? "CANCELLED" } : current);
    } catch (cancelError: any) {
      setError(cancelError?.message ?? "Failed to cancel session");
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
        throw new Error(data?.error || `Failed to retry session (${response.status})`);
      }

      setDraft((current) => current ? { ...current, status: data.status ?? "QUEUED", progress: 0 } : current);
      setRefreshNonce((current) => current + 1);
      setIsLoading(true);
    } catch (retryError: any) {
      setError(retryError?.message ?? "Failed to retry session");
    } finally {
      setIsRetrying(false);
    }
  };

  const handleToggleHidden = async () => {
    if (!draftId || !draft || !adminKey) return;

    setIsTogglingHidden(true);
    setError(null);
    try {
      const endpoint = draft.isHidden ? "unhide" : "hide";
      const response = await fetch(`/api/fh/claim-selection-drafts/${draftId}/${endpoint}`, {
        method: "POST",
        headers: buildDraftAccessHeaders(draftId, adminKey),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || `Failed to ${endpoint} session (${response.status})`);
      }

      setDraft((current) => current ? { ...current, isHidden: Boolean(data?.isHidden) } : current);
    } catch (toggleError: any) {
      setError(toggleError?.message ?? "Failed to update session visibility");
    } finally {
      setIsTogglingHidden(false);
    }
  };

  return (
    <div className={`${commonStyles.container} ${styles.page}`}>
      <div className={jobStyles.pageHeader}>
        <h1 className={`${commonStyles.title} ${jobStyles.pageTitle}`}>{pageTitle}</h1>
      </div>

      <div className={jobStyles.tabsContainer}>
        <Link href="/analyze" className={jobStyles.backToList} aria-label="Back to analyze" title="Back to analyze">
          <span className={jobStyles.backToListIcon} aria-hidden="true">←</span>
        </Link>
        <button
          type="button"
          className={`${jobStyles.tab} ${showRawJson ? jobStyles.tabActive : ""}`}
          onClick={() => setShowRawJson((current) => !current)}
        >
          🔧 JSON
        </button>
        {draft && (
          <div className={jobStyles.exportButtons}>
            {canToggleHidden ? (
              <button
                type="button"
                className={`${jobStyles.tab} ${jobStyles.hideTab}`}
                onClick={handleToggleHidden}
                disabled={isTogglingHidden}
                title={
                  draft.isHidden
                    ? (isTogglingHidden ? "Unhiding" : "Unhide session")
                    : (isTogglingHidden ? "Hiding" : "Hide session")
                }
                aria-label={
                  draft.isHidden
                    ? (isTogglingHidden ? "Unhiding" : "Unhide session")
                    : (isTogglingHidden ? "Hiding" : "Hide session")
                }
              >
                {isTogglingHidden ? "⏳" : draft.isHidden ? "👁" : "🙈"}
              </button>
            ) : null}
            {canRetryPreparation ? (
              <button
                type="button"
                className={`${jobStyles.tab} ${jobStyles.hideTab}`}
                onClick={handleRetry}
                disabled={isRetrying}
                title={isRetrying ? "Retrying" : "Retry preparation"}
                aria-label={isRetrying ? "Retrying" : "Retry preparation"}
              >
                {isRetrying ? "⏳" : "↻"}
              </button>
            ) : null}
            {canCancelSession ? (
              <button
                type="button"
                className={`${jobStyles.tab} ${jobStyles.deleteTab}`}
                onClick={handleCancel}
                disabled={isCancelling}
                title={isCancelling ? "Cancelling" : "Cancel session"}
                aria-label={isCancelling ? "Cancelling" : "Cancel session"}
              >
                {isCancelling ? "⏳" : "🗑"}
              </button>
            ) : null}
          </div>
        )}
      </div>

      {draft ? (
        <div className={`${jobStyles.jobInfoCard} ${jobStyles.reportSurfaceCard} ${jobStyles.reportMetaCard}`}>
          <div className={jobStyles.metaInlineRow}>
            <span className={jobStyles.metaInlineItem}>
              <b>ID:</b>{" "}
              <code title={draft.draftId}>
                {draft.draftId.length > 10 ? `${draft.draftId.slice(0, 10)}...` : draft.draftId}
              </code>
              <CopyButton text={draft.draftId} title="Copy session id" className={jobStyles.metaCopyButton} />
            </span>
            <span className={jobStyles.metaInlineItem}>
              <b>Created:</b> <code>{formattedCreatedAt ?? "Unknown"}</code>
            </span>
          </div>
          <div className={styles.headerStatusRow}>
            <b>Status:</b>{" "}
            <code className={headerCardStatusClass}>{draft.status}</code> ({displayProgress}%)
            {draft.isHidden ? <span className={styles.headerStatusNote}>Hidden from default lists</span> : null}
            {draft.restartedViaOther ? <span className={styles.headerStatusNote}>Restarted via other input</span> : null}
          </div>
          <p className={styles.headerSummary}>{statusSummary}</p>
          {activeInputValue ? (
            <div className={styles.headerInputWrap}>
              <InputBanner
                inputType={draft.activeInputType ?? draft.originalInputType ?? "text"}
                inputValue={activeInputValue}
                textColor="#1565c0"
                textBackgroundColor="#e3f2fd"
                textBorderColor="#90caf9"
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {error && <div className={commonStyles.errorBox}>{error}</div>}

      {isLoading && !draft ? (
        <div className={styles.infoCard}>
          <h2 className={styles.infoTitle}>Loading session</h2>
          <p className={styles.infoText}>Fetching the current preparation state.</p>
        </div>
      ) : null}

      {draft && showRawJson && rawDraftJson ? (
        <div className={styles.infoCard}>
          <div className={styles.jsonHeader}>
            <h2 className={styles.infoTitle}>Session JSON</h2>
            <CopyButton text={rawDraftJson} title="Copy session JSON" />
          </div>
          <pre className={styles.jsonBlock}>{rawDraftJson}</pre>
        </div>
      ) : null}

      {draft?.status === "QUEUED" || draft?.status === "PREPARING" || (draft?.status === "COMPLETED" && !draft.finalJobId) ? (
        <div className={styles.infoCard}>
          <h2 className={styles.infoTitle}>{statusHeadline}</h2>
          {draft.status === "QUEUED" ? (
            <p className={styles.infoText}>
              This analysis session is waiting for a preparation slot. It remains on this session page and
              does not appear in the global reports list until preparation finishes and a real report job is created.
            </p>
          ) : (
            <p className={styles.infoText}>
              Progress: {displayProgress}%.
              {" "}Stage 1 prepares the final candidate set first.
              {" "}If the final claim count reaches the manual-review threshold ({formatClaimCount(selectionThreshold)}),
              FactHarbor then generates ranked claim-selection recommendations.
              {draft.selectionMode === "automatic"
                ? " After that recommendation step, FactHarbor continues automatically with the recommended claim set when safe; otherwise manual selection is required."
                : " The manual claim-selection screen appears only after that recommendation step."}
            </p>
          )}
          {livePreparationMessage ? (
            <p className={styles.infoText}>Current step: {livePreparationMessage}</p>
          ) : null}
        </div>
      ) : null}

      {draft?.status === "FAILED" ? (
        <div className={styles.infoCard}>
          <h2 className={styles.infoTitle}>Preparation failed</h2>
          <p className={styles.infoText}>
            {draftState?.lastError?.message ?? "FactHarbor could not finish preparing this session."}
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
          </div>
        </div>
      ) : null}

      {draft?.status === "CANCELLED" || draft?.status === "EXPIRED" ? (
        <div className={styles.infoCard}>
          <h2 className={styles.infoTitle}>
            {draft.status === "CANCELLED" ? "Session cancelled" : "Session expired"}
          </h2>
          <p className={styles.infoText}>
            {draft.status === "CANCELLED"
              ? "This session will not continue. Start a new analysis when you are ready."
              : "Sessions expire after 24 hours. Start a new analysis to prepare a fresh claim set."}
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
                    ? selectionCap === 1
                      ? "Keep exactly one claim. Recommendation order is already applied below, and the recommended claim is preselected."
                      : `Keep one to ${selectionCap} claims. Recommendation order is already applied below, and recommended claims are preselected.`
                    : autoContinueFailed
                      ? "Automatic continuation failed. Retry the continuation below or cancel the session."
                      : `Stage 1 stayed below the manual-review threshold (${formatClaimCount(selectionThreshold)}), so FactHarbor is continuing directly into the full analysis with all prepared claims.`}
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
            {manualIdleAutoProceedArmed && idleAutoProceedCountdownLabel ? (
              <p className={styles.idleAutoProceedNote}>
                Auto-continue in <strong>{idleAutoProceedCountdownLabel}</strong> without checkbox changes.
                FactHarbor will use the last valid saved selection even if the browser is closed.
              </p>
            ) : manualIdleAutoProceedEnabled ? (
              <p className={styles.idleAutoProceedNote}>
                Inactivity auto-continue is waiting for a valid saved selection. Select at least one claim to arm it.
              </p>
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
                Prepared session state is missing candidate claims. Cancel this session and start a fresh analysis.
              </div>
            )}

            <div className={styles.actions} style={{ marginTop: 16 }}>
              {requiresSelectionUi || autoContinueFailed ? (
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
                      : "Retry continuation"}
                </button>
              ) : isConfirming ? (
                <button type="button" className={styles.primaryButton} disabled>
                  Creating job...
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
