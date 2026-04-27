"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import commonStyles from "../../../../styles/common.module.css";
import { useAdminAuth } from "../../admin-auth-context";
import styles from "../preparation.module.css";

type DraftResponse = {
  draftId: string;
  status: string;
  progress: number;
  isHidden: boolean;
  lastEventMessage: string | null;
  selectionMode: string;
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

type DraftEvent = {
  id: number;
  draftId: string;
  tsUtc: string;
  actorType: string;
  action: string;
  result: string;
  beforeStatus: string | null;
  afterStatus: string | null;
  sourceIp: string | null;
  message: string | null;
};

type DraftEventsResponse = {
  events: DraftEvent[];
};

type CandidateClaim = {
  id?: string;
  statement?: string;
};

type DraftState = {
  preparedStage1?: {
    preparedUnderstanding?: {
      atomicClaims?: CandidateClaim[];
    };
  };
  rankedClaimIds?: string[];
  recommendedClaimIds?: string[];
  selectedClaimIds?: string[];
  recommendationRationale?: string;
  lastError?: {
    code?: string;
    message?: string;
    failedUtc?: string;
  };
  failureHistory?: Array<{
    code?: string;
    message?: string;
    failedUtc?: string;
  }>;
};

function parseDraftState(draftStateJson: string | null): DraftState | null {
  if (!draftStateJson) return null;
  try {
    return JSON.parse(draftStateJson) as DraftState;
  } catch {
    return null;
  }
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "Unknown";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
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

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export default function AdminPreparationDetailPage() {
  const params = useParams<{ draftId: string }>();
  const draftId = typeof params?.draftId === "string" ? params.draftId : "";
  const { getHeaders } = useAdminAuth();
  const [draft, setDraft] = useState<DraftResponse | null>(null);
  const [events, setEvents] = useState<DraftEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const loadDraft = useCallback(async () => {
    if (!draftId) {
      setError("Missing session id");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [draftResponse, eventsResponse] = await Promise.all([
        fetch(`/api/fh/admin/claim-selection-drafts/${encodeURIComponent(draftId)}`, {
          cache: "no-store",
          headers: getHeaders(),
        }),
        fetch(`/api/fh/admin/claim-selection-drafts/${encodeURIComponent(draftId)}/events`, {
          cache: "no-store",
          headers: getHeaders(),
        }),
      ]);
      const draftPayload = await draftResponse.json().catch(() => null);
      if (!draftResponse.ok) {
        throw new Error(draftPayload?.error ?? `Failed to load preparation session (${draftResponse.status})`);
      }

      const eventsPayload = await eventsResponse.json().catch(() => null);
      if (!eventsResponse.ok) {
        throw new Error(eventsPayload?.error ?? `Failed to load audit trail (${eventsResponse.status})`);
      }

      setDraft(draftPayload as DraftResponse);
      setEvents(((eventsPayload as DraftEventsResponse | null)?.events ?? []) as DraftEvent[]);
    } catch (loadError: any) {
      setError(loadError?.message ?? "Failed to load preparation session");
    } finally {
      setLoading(false);
    }
  }, [draftId, getHeaders]);

  useEffect(() => {
    void loadDraft();
  }, [loadDraft]);

  const draftState = useMemo(() => parseDraftState(draft?.draftStateJson ?? null), [draft?.draftStateJson]);
  const candidateClaims = draftState?.preparedStage1?.preparedUnderstanding?.atomicClaims ?? [];
  const rankedClaimIds = readStringArray(draftState?.rankedClaimIds);
  const recommendedClaimIds = readStringArray(draftState?.recommendedClaimIds);
  const selectedClaimIds = readStringArray(draftState?.selectedClaimIds);
  const canCancel = draft !== null &&
    draft.finalJobId === null &&
    !["COMPLETED", "CANCELLED", "EXPIRED"].includes(draft.status);
  const canRetry = draft?.status === "FAILED";

  const runDraftAction = useCallback(async (action: "cancel" | "retry" | "hide" | "unhide") => {
    if (!draftId) return;
    setPendingAction(action);
    setActionError(null);
    setActionMessage(null);

    try {
      const response = await fetch(
        `/api/fh/claim-selection-drafts/${encodeURIComponent(draftId)}/${action}`,
        {
          method: "POST",
          headers: getHeaders(),
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? `Failed to ${action} preparation session (${response.status})`);
      }

      setActionMessage(`${action} succeeded`);
      await loadDraft();
    } catch (actionFailure: any) {
      setActionError(actionFailure?.message ?? `Failed to ${action} preparation session`);
    } finally {
      setPendingAction(null);
    }
  }, [draftId, getHeaders, loadDraft]);

  return (
    <div className={commonStyles.container}>
      <div className={styles.headerRow}>
        <div>
          <Link href="/admin/preparation" className={styles.backLink}>Back to preparation sessions</Link>
          <h1 className={commonStyles.title}>Preparation Session Detail</h1>
          <p className={commonStyles.subtitle}>{draftId}</p>
        </div>
      </div>

      {error ? <div className={commonStyles.errorBox}>{error}</div> : null}
      {loading && !draft ? <p className={commonStyles.loading}>Loading preparation session...</p> : null}

      {draft ? (
        <>
          <section className={styles.detailSection}>
            <h2>Session</h2>
            <dl className={styles.detailGrid}>
              <div><dt>Status</dt><dd>{draft.status} ({draft.progress}%)</dd></div>
              <div><dt>Mode</dt><dd>{draft.selectionMode}</dd></div>
              <div><dt>Hidden</dt><dd>{draft.isHidden ? "Yes" : "No"}</dd></div>
              <div><dt>Restart Count</dt><dd>{draft.restartCount}</dd></div>
              <div><dt>Created</dt><dd>{formatDateTime(draft.createdUtc)}</dd></div>
              <div><dt>Updated</dt><dd>{formatDateTime(draft.updatedUtc)}</dd></div>
              <div><dt>Expires</dt><dd>{formatDateTime(draft.expiresUtc)}</dd></div>
              <div>
                <dt>Final Job</dt>
                <dd>{draft.finalJobId ? <Link href={`/jobs/${encodeURIComponent(draft.finalJobId)}`}>{draft.finalJobId}</Link> : "None"}</dd>
              </div>
            </dl>
          </section>

          <section className={styles.detailSection}>
            <h2>Actions</h2>
            <div className={styles.actionsRow}>
              <button
                type="button"
                className={commonStyles.btnSecondary}
                disabled={!canCancel || pendingAction !== null}
                onClick={() => void runDraftAction("cancel")}
              >
                {pendingAction === "cancel" ? "Cancelling..." : "Cancel"}
              </button>
              <button
                type="button"
                className={commonStyles.btnSecondary}
                disabled={!canRetry || pendingAction !== null}
                onClick={() => void runDraftAction("retry")}
              >
                {pendingAction === "retry" ? "Retrying..." : "Retry"}
              </button>
              <button
                type="button"
                className={commonStyles.btnSecondary}
                disabled={draft.isHidden || pendingAction !== null}
                onClick={() => void runDraftAction("hide")}
              >
                {pendingAction === "hide" ? "Hiding..." : "Hide"}
              </button>
              <button
                type="button"
                className={commonStyles.btnSecondary}
                disabled={!draft.isHidden || pendingAction !== null}
                onClick={() => void runDraftAction("unhide")}
              >
                {pendingAction === "unhide" ? "Unhiding..." : "Unhide"}
              </button>
            </div>
            {draft.status === "PREPARING" ? (
              <p className={styles.actionHint}>Preparation is running. Cancelling prevents this session from creating a job.</p>
            ) : null}
            {actionError ? <div className={commonStyles.errorBox}>{actionError}</div> : null}
            {actionMessage ? <p className={styles.actionHint}>{actionMessage}</p> : null}
          </section>

          <section className={styles.detailSection}>
            <h2>Input</h2>
            <dl className={styles.detailGrid}>
              <div><dt>Active Type</dt><dd>{draft.activeInputType ?? "Unknown"}</dd></div>
              <div><dt>Original Type</dt><dd>{draft.originalInputType ?? "Unknown"}</dd></div>
            </dl>
            <pre className={styles.textBlock}>{draft.activeInputValue ?? draft.originalInputValue ?? "No input value"}</pre>
          </section>

          <section className={styles.detailSection}>
            <h2>Prepared Claims</h2>
            {draftState === null && draft.draftStateJson ? (
              <div className={commonStyles.errorBox}>Draft state JSON is malformed.</div>
            ) : candidateClaims.length > 0 ? (
              <ol className={styles.claimList}>
                {candidateClaims.map((claim, index) => (
                  <li key={claim.id ?? index}>
                    <code>{claim.id ?? `claim-${index + 1}`}</code>
                    <p>{claim.statement ?? "No statement"}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={commonStyles.textMuted}>No prepared candidate claims are stored yet.</p>
            )}
          </section>

          <section className={styles.detailSection}>
            <h2>Selection State</h2>
            <dl className={styles.detailGrid}>
              <div><dt>Ranked</dt><dd>{rankedClaimIds.length ? rankedClaimIds.join(", ") : "None"}</dd></div>
              <div><dt>Recommended</dt><dd>{recommendedClaimIds.length ? recommendedClaimIds.join(", ") : "None"}</dd></div>
              <div><dt>Selected</dt><dd>{selectedClaimIds.length ? selectedClaimIds.join(", ") : "None"}</dd></div>
            </dl>
            {draftState?.recommendationRationale ? (
              <pre className={styles.textBlock}>{draftState.recommendationRationale}</pre>
            ) : null}
          </section>

          <section className={styles.detailSection}>
            <h2>Diagnostics</h2>
            <dl className={styles.detailGrid}>
              <div><dt>Last Event</dt><dd>{draft.lastEventMessage ?? "None"}</dd></div>
              <div><dt>Last Error Code</dt><dd>{draftState?.lastError?.code ?? "None"}</dd></div>
              <div><dt>Last Error Time</dt><dd>{formatDateTime(draftState?.lastError?.failedUtc)}</dd></div>
              <div><dt>Failure History</dt><dd>{draftState?.failureHistory?.length ?? 0}</dd></div>
            </dl>
          </section>

          <section className={styles.detailSection}>
            <h2>Audit Trail</h2>
            {events.length > 0 ? (
              <div className={styles.tableWrap}>
                <table className={`${styles.table} ${styles.auditTable}`}>
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Actor</th>
                      <th>Action</th>
                      <th>Result</th>
                      <th>Status</th>
                      <th>Source</th>
                      <th>Message</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((event) => (
                      <tr key={event.id}>
                        <td>{formatDateTime(event.tsUtc)}</td>
                        <td>{event.actorType}</td>
                        <td>{event.action}</td>
                        <td>{event.result}</td>
                        <td>{event.beforeStatus ?? "-"} -&gt; {event.afterStatus ?? "-"}</td>
                        <td>{event.sourceIp ?? "-"}</td>
                        <td>{event.message ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className={commonStyles.textMuted}>No audit events recorded.</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
