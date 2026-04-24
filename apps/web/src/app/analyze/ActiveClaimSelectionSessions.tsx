"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import {
  buildClaimSelectionInputPreview,
  buildStoredClaimSelectionSessionLabel,
  getStoredActiveClaimSelectionSessions,
  removeStoredActiveClaimSelectionSession,
  setStoredActiveClaimSelectionSessions,
  type StoredClaimSelectionSessionRef,
} from "@/lib/claim-selection-client";

type DraftResponse = {
  draftId: string;
  status: string;
  progress: number;
  isHidden: boolean;
  lastEventMessage: string | null;
  selectionMode: "interactive" | "automatic";
  originalInputType: string | null;
  originalInputValue: string | null;
  activeInputType: string | null;
  activeInputValue: string | null;
  finalJobId: string | null;
  createdUtc: string;
  updatedUtc: string;
  expiresUtc: string;
};

type ActiveSessionItem = {
  ref: StoredClaimSelectionSessionRef;
  draft: DraftResponse | null;
  error: string | null;
  accessUnavailable: boolean;
};

const REFRESH_INTERVAL_MS = 10000;
const REFRESH_CONCURRENCY = 4;

function getStatusTone(status: string): { background: string; color: string } {
  switch (status) {
    case "AWAITING_CLAIM_SELECTION":
      return { background: "#d4edda", color: "#155724" };
    case "FAILED":
      return { background: "#f8d7da", color: "#721c24" };
    case "QUEUED":
      return { background: "#fff3cd", color: "#856404" };
    case "PREPARING":
      return { background: "#d1ecf1", color: "#0c5460" };
    case "COMPLETED":
      return { background: "#e2e3e5", color: "#383d41" };
    default:
      return { background: "#eef2ff", color: "#1f3c88" };
  }
}

export function getSessionStatusLabel(item: ActiveSessionItem): string {
  const finalJobId = item.draft?.finalJobId ?? item.ref.lastKnownFinalJobId;
  if (finalJobId) {
    return "REPORT PROCESSING";
  }

  const status = item.draft?.status ?? item.ref.lastKnownStatus;
  if (status === "AWAITING_CLAIM_SELECTION") {
    return "READY";
  }

  return status;
}

export function getResumeTarget(item: ActiveSessionItem): { destination: string; linkLabel: string } | null {
  const finalJobId = item.draft?.finalJobId ?? item.ref.lastKnownFinalJobId;
  if (finalJobId) {
    return {
      destination: `/jobs/${finalJobId}`,
      linkLabel: "Open report",
    };
  }

  if (item.accessUnavailable) {
    return null;
  }

  return {
    destination: `/analyze/select/${item.ref.draftId}`,
    linkLabel: "Open session",
  };
}

export function getSessionSummary(item: ActiveSessionItem): string {
  const finalJobId = item.draft?.finalJobId ?? item.ref.lastKnownFinalJobId;
  if (finalJobId) {
    return "Preparation has completed and the report job is processing.";
  }

  if (item.accessUnavailable) {
    return "Session access is no longer available in this browser profile.";
  }

  if (item.error) {
    return item.error;
  }

  const draft = item.draft;
  if (!draft) {
    return "Waiting for the next refresh.";
  }

  if (draft.finalJobId) {
    return "Preparation has completed and the report job is processing.";
  }

  switch (draft.status) {
    case "QUEUED":
      return "Waiting for a preparation slot.";
    case "PREPARING":
      return draft.lastEventMessage?.trim() || "Preparing the Stage 1 claim set.";
    case "AWAITING_CLAIM_SELECTION":
      return "Selection is ready. Reopen the session to choose claims.";
    case "FAILED":
      return "Preparation failed. Reopen the session to retry or inspect the failure.";
    default:
      return draft.lastEventMessage?.trim() || "Session state updated.";
  }
}

function shouldDropSessionFromRegistry(draft: DraftResponse | null): boolean {
  if (!draft) return false;
  return draft.status === "CANCELLED" || draft.status === "EXPIRED";
}

function mergeRefWithDraft(
  ref: StoredClaimSelectionSessionRef,
  draft: DraftResponse,
): StoredClaimSelectionSessionRef {
  const nextInputType = draft.activeInputType?.trim() || draft.originalInputType?.trim() || ref.inputType;

  return {
    ...ref,
    inputType: nextInputType,
    inputPreview: buildStoredClaimSelectionSessionLabel(nextInputType),
    selectionMode: draft.selectionMode,
    lastKnownStatus: draft.status,
    lastKnownFinalJobId: draft.finalJobId ?? null,
    lastKnownUpdatedUtc: draft.updatedUtc,
    hidden: draft.isHidden,
  };
}

function getDisplayInputPreview(item: ActiveSessionItem): string {
  const inputType =
    item.draft?.activeInputType?.trim()
    || item.draft?.originalInputType?.trim()
    || item.ref.inputType;
  const inputValue =
    item.draft?.activeInputValue?.trim()
    || item.draft?.originalInputValue?.trim();

  if (inputValue) {
    return buildClaimSelectionInputPreview(inputValue, inputType);
  }

  return item.ref.inputPreview;
}

async function fetchDraftSnapshot(
  draftId: string,
  adminKey: string | null,
): Promise<{
  draft: DraftResponse | null;
  error: string | null;
  accessUnavailable: boolean;
  remove: boolean;
}> {
  try {
    const headers: Record<string, string> = {};
    if (adminKey) {
      headers["x-admin-key"] = adminKey;
    }

    const response = await fetch(`/api/fh/claim-selection-drafts/${draftId}`, {
      method: "GET",
      cache: "no-store",
      headers,
    });

    if (response.status === 404 || response.status === 410) {
      return { draft: null, error: null, accessUnavailable: false, remove: true };
    }

    if (response.status === 401) {
      return { draft: null, error: null, accessUnavailable: true, remove: false };
    }

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      return {
        draft: null,
        error: typeof payload?.error === "string" ? payload.error : `Failed to load session (${response.status})`,
        accessUnavailable: false,
        remove: false,
      };
    }

    const draft = (await response.json()) as DraftResponse;
    return {
      draft,
      error: null,
      accessUnavailable: false,
      remove: shouldDropSessionFromRegistry(draft),
    };
  } catch (error: any) {
    return {
      draft: null,
      error: error?.message ?? "Failed to refresh session",
      accessUnavailable: false,
      remove: false,
    };
  }
}

export function ActiveClaimSelectionSessions({ adminKey }: { adminKey: string | null }) {
  const [sessionRefs, setSessionRefs] = useState<StoredClaimSelectionSessionRef[]>([]);
  const [itemsByDraftId, setItemsByDraftId] = useState<Record<string, ActiveSessionItem>>({});
  const [isRefreshing, setIsRefreshing] = useState(false);
  const sessionDraftIdsKey = useMemo(
    () => sessionRefs.map((ref) => ref.draftId).join("|"),
    [sessionRefs],
  );
  const sessionRefsRef = useRef(sessionRefs);

  useEffect(() => {
    sessionRefsRef.current = sessionRefs;
  }, [sessionRefs]);

  useEffect(() => {
    const syncFromStorage = () => {
      setSessionRefs(getStoredActiveClaimSelectionSessions());
    };

    syncFromStorage();
    window.addEventListener("storage", syncFromStorage);
    window.addEventListener("focus", syncFromStorage);

    return () => {
      window.removeEventListener("storage", syncFromStorage);
      window.removeEventListener("focus", syncFromStorage);
    };
  }, []);

  useEffect(() => {
    if (sessionRefs.length === 0) {
      setItemsByDraftId({});
      return;
    }

    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const refresh = async () => {
      setIsRefreshing(true);

      const currentRefs = sessionRefsRef.current;
      const results = new Map<string, ActiveSessionItem>();
      let nextRefs = [...currentRefs];

      for (let index = 0; index < currentRefs.length; index += REFRESH_CONCURRENCY) {
        const slice = currentRefs.slice(index, index + REFRESH_CONCURRENCY);
        const sliceResults = await Promise.all(
          slice.map(async (ref) => {
            const snapshot = await fetchDraftSnapshot(ref.draftId, adminKey);
            return { ref, snapshot };
          }),
        );

        for (const { ref, snapshot } of sliceResults) {
          if (snapshot.remove) {
            nextRefs = nextRefs.filter((entry) => entry.draftId !== ref.draftId);
            continue;
          }

          const mergedRef = snapshot.draft ? mergeRefWithDraft(ref, snapshot.draft) : ref;
          results.set(ref.draftId, {
            ref: mergedRef,
            draft: snapshot.draft,
            error: snapshot.error,
            accessUnavailable: snapshot.accessUnavailable,
          });
        }
      }

      if (cancelled) return;

      const currentRefsJson = JSON.stringify(sessionRefsRef.current);
      const nextRefsJson = JSON.stringify(nextRefs);
      if (currentRefsJson !== nextRefsJson) {
        setStoredActiveClaimSelectionSessions(nextRefs);
        setSessionRefs(nextRefs);
        sessionRefsRef.current = nextRefs;
      }
      setItemsByDraftId(Object.fromEntries(Array.from(results.entries())));
      setIsRefreshing(false);

      const shouldPoll = nextRefs.some((ref) => {
        const item = results.get(ref.draftId);
        if (!item) return false;
        if (item.accessUnavailable) return false;
        if (item.draft?.finalJobId) return false;
        return item.draft?.status === "QUEUED" || item.draft?.status === "PREPARING";
      });

      if (shouldPoll) {
        timeoutId = setTimeout(refresh, REFRESH_INTERVAL_MS);
      }
    };

    void refresh();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [adminKey, sessionDraftIdsKey, sessionRefs.length]);

  const orderedItems = useMemo(() => {
    return sessionRefs
      .map((ref) => itemsByDraftId[ref.draftId] ?? {
        ref,
        draft: null,
        error: null,
        accessUnavailable: false,
      })
      .sort((left, right) => right.ref.createdUtc.localeCompare(left.ref.createdUtc));
  }, [itemsByDraftId, sessionRefs]);

  const dismissSession = (draftId: string) => {
    removeStoredActiveClaimSelectionSession(draftId);
    setSessionRefs((current) => current.filter((entry) => entry.draftId !== draftId));
    setItemsByDraftId((current) => {
      const next = { ...current };
      delete next[draftId];
      return next;
    });
  };

  if (orderedItems.length === 0) {
    return null;
  }

  return (
    <section
      style={{
        marginTop: 28,
        padding: 20,
        borderRadius: 16,
        border: "1px solid #dbe3ef",
        background: "#fff",
        boxShadow: "0 10px 30px rgba(15, 23, 42, 0.06)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 28, color: "#11284b" }}>Resume Previous Sessions</h2>
          <p style={{ margin: "8px 0 0", color: "#5a6c84", lineHeight: 1.6 }}>
            Returning browser sessions can reopen queued, preparing, ready, or failed claim-selection sessions even after the browser was closed.
          </p>
        </div>
        {isRefreshing ? (
          <span style={{ color: "#5a6c84", fontSize: 13 }}>Refreshing…</span>
        ) : null}
      </div>

      <div style={{ display: "grid", gap: 12 }}>
        {orderedItems.map((item) => {
          const draft = item.draft;
          const status = draft?.status ?? item.ref.lastKnownStatus;
          const tone = getStatusTone(status);
          const resumeTarget = getResumeTarget(item);

          return (
            <div
              key={item.ref.draftId}
              style={{
                border: "1px solid #dde6f3",
                borderRadius: 14,
                padding: 16,
                background: item.accessUnavailable ? "#fff8f5" : "#f9fbff",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: 999,
                        fontSize: 12,
                        fontWeight: 700,
                        background: tone.background,
                        color: tone.color,
                        letterSpacing: "0.02em",
                      }}
                    >
                      {getSessionStatusLabel(item)}
                    </span>
                    <span style={{ color: "#7b8da6", fontSize: 12 }}>
                      {item.ref.selectionMode === "automatic" ? "Automatic mode" : "Interactive mode"}
                    </span>
                  </div>
                  <div style={{ marginTop: 10, color: "#12315d", fontSize: 22, lineHeight: 1.35, wordBreak: "break-word" }}>
                    {getDisplayInputPreview(item)}
                  </div>
                  <div style={{ marginTop: 8, color: "#5a6c84", lineHeight: 1.6 }}>
                    {getSessionSummary(item)}
                  </div>
                  <div style={{ marginTop: 8, color: "#7b8da6", fontSize: 12 }}>
                    Session {item.ref.draftId.slice(0, 10)}…
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                  {resumeTarget ? (
                    <Link
                      href={resumeTarget.destination}
                      onClick={() => {
                        if ((draft?.finalJobId ?? item.ref.lastKnownFinalJobId) !== null) {
                          dismissSession(item.ref.draftId);
                        }
                      }}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        minWidth: 120,
                        padding: "10px 14px",
                        borderRadius: 10,
                        background: "#1976d2",
                        color: "#fff",
                        textDecoration: "none",
                        fontWeight: 700,
                      }}
                    >
                      {resumeTarget.linkLabel}
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => dismissSession(item.ref.draftId)}
                    style={{
                      border: "1px solid #d0dae8",
                      background: "#fff",
                      color: "#36506e",
                      borderRadius: 10,
                      padding: "10px 14px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
