"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import commonStyles from "../../../styles/common.module.css";
import { useAdminAuth } from "../admin-auth-context";
import styles from "./preparation.module.css";

type AdminDraftSummary = {
  draftId: string;
  status: string;
  progress: number;
  isHidden: boolean;
  selectionMode: "interactive" | "automatic" | string;
  activeInputType: "text" | "url" | string;
  inputPreview: string | null;
  finalJobId: string | null;
  createdUtc: string;
  updatedUtc: string;
  expiresUtc: string;
  restartCount: number;
  restartedViaOther: boolean;
  hasPreparedStage1: boolean;
  lastErrorCode: string | null;
  eventSummary: string | null;
};

type AdminDraftListResponse = {
  items: AdminDraftSummary[];
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
  statusCounts: Record<string, number>;
};

const STATUS_ORDER = [
  "QUEUED",
  "PREPARING",
  "AWAITING_CLAIM_SELECTION",
  "FAILED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
];

function formatDateTime(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Unknown";
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(parsed);
}

function getStatusClassName(status: string): string {
  if (status === "FAILED" || status === "EXPIRED") return styles.statusDanger;
  if (status === "COMPLETED") return styles.statusSuccess;
  if (status === "CANCELLED") return styles.statusMuted;
  if (status === "PREPARING") return styles.statusActive;
  return styles.statusPending;
}

export default function AdminPreparationPage() {
  const { getHeaders } = useAdminAuth();
  const [scope, setScope] = useState("active");
  const [hidden, setHidden] = useState("include");
  const [linked, setLinked] = useState("any");
  const [selectionMode, setSelectionMode] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminDraftListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestParams = useMemo(() => {
    const params = new URLSearchParams({
      scope,
      hidden,
      linked,
      page: String(page),
      pageSize: "25",
    });
    if (selectionMode) params.set("selectionMode", selectionMode);
    if (status) params.set("status", status);
    if (query.trim()) params.set("q", query.trim());
    return params;
  }, [hidden, linked, page, query, scope, selectionMode, status]);

  const loadDrafts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/fh/claim-selection-drafts?${requestParams}`, {
        cache: "no-store",
        headers: getHeaders(),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? `Failed to load preparation sessions (${response.status})`);
      }
      setData(payload as AdminDraftListResponse);
    } catch (loadError: any) {
      setError(loadError?.message ?? "Failed to load preparation sessions");
    } finally {
      setLoading(false);
    }
  }, [getHeaders, requestParams]);

  useEffect(() => {
    void loadDrafts();
  }, [loadDrafts]);

  useEffect(() => {
    const shouldPoll = data?.items.some((item) => item.status === "QUEUED" || item.status === "PREPARING") ?? false;
    if (!shouldPoll) return;

    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        void loadDrafts();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [data?.items, loadDrafts]);

  const totalPages = data?.pagination.totalPages ?? 0;

  return (
    <div className={commonStyles.container}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={commonStyles.title}>Preparation Sessions</h1>
          <p className={commonStyles.subtitle}>Claim-selection drafts before report jobs exist.</p>
        </div>
        <button type="button" className={commonStyles.btnSecondary} onClick={() => void loadDrafts()} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className={styles.metricsRow}>
        {STATUS_ORDER.map((statusName) => (
          <div key={statusName} className={styles.metric}>
            <span className={styles.metricLabel}>{statusName}</span>
            <strong>{data?.statusCounts?.[statusName] ?? 0}</strong>
          </div>
        ))}
      </div>

      <form
        className={styles.filters}
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          void loadDrafts();
        }}
      >
        <label>
          Scope
          <select value={scope} onChange={(event) => { setPage(1); setScope(event.target.value); }}>
            <option value="active">Active</option>
            <option value="terminal">Terminal</option>
            <option value="all">All</option>
          </select>
        </label>
        <label>
          Status
          <select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }}>
            <option value="">Any</option>
            {STATUS_ORDER.map((statusName) => (
              <option key={statusName} value={statusName}>{statusName}</option>
            ))}
          </select>
        </label>
        <label>
          Hidden
          <select value={hidden} onChange={(event) => { setPage(1); setHidden(event.target.value); }}>
            <option value="include">Include</option>
            <option value="exclude">Exclude</option>
            <option value="only">Only</option>
          </select>
        </label>
        <label>
          Linked
          <select value={linked} onChange={(event) => { setPage(1); setLinked(event.target.value); }}>
            <option value="any">Any</option>
            <option value="withFinalJob">With final job</option>
            <option value="withoutFinalJob">Without final job</option>
          </select>
        </label>
        <label>
          Mode
          <select value={selectionMode} onChange={(event) => { setPage(1); setSelectionMode(event.target.value); }}>
            <option value="">Any</option>
            <option value="interactive">Interactive</option>
            <option value="automatic">Automatic</option>
          </select>
        </label>
        <label className={styles.searchField}>
          Search
          <input
            type="search"
            value={query}
            maxLength={120}
            onChange={(event) => { setPage(1); setQuery(event.target.value); }}
            placeholder="Input preview"
          />
        </label>
      </form>

      {error ? <div className={commonStyles.errorBox}>{error}</div> : null}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Session</th>
              <th>Status</th>
              <th>Progress</th>
              <th>Mode</th>
              <th>Input</th>
              <th>Updated</th>
              <th>Expires</th>
              <th>Final Job</th>
              <th>Diagnostics</th>
            </tr>
          </thead>
          <tbody>
            {loading && !data ? (
              <tr><td colSpan={9} className={styles.emptyCell}>Loading preparation sessions...</td></tr>
            ) : data?.items.length ? (
              data.items.map((draft) => (
                <tr key={draft.draftId}>
                  <td>
                    <code title={draft.draftId}>{draft.draftId.slice(0, 10)}...</code>
                    <div className={styles.flags}>
                      {draft.isHidden ? <span>hidden</span> : null}
                      {draft.restartedViaOther ? <span>restarted</span> : null}
                      {draft.hasPreparedStage1 ? <span>prepared</span> : null}
                    </div>
                  </td>
                  <td><span className={`${styles.statusBadge} ${getStatusClassName(draft.status)}`}>{draft.status}</span></td>
                  <td>{draft.progress}%</td>
                  <td>{draft.selectionMode}</td>
                  <td className={styles.inputCell}>
                    <span className={styles.inputType}>{draft.activeInputType}</span>
                    {draft.inputPreview ?? "No preview"}
                  </td>
                  <td>{formatDateTime(draft.updatedUtc)}</td>
                  <td>{formatDateTime(draft.expiresUtc)}</td>
                  <td>
                    {draft.finalJobId ? (
                      <Link href={`/jobs/${encodeURIComponent(draft.finalJobId)}`}>{draft.finalJobId.slice(0, 8)}...</Link>
                    ) : "None"}
                  </td>
                  <td>
                    {draft.lastErrorCode ? <code>{draft.lastErrorCode}</code> : draft.eventSummary ?? "None"}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={9} className={styles.emptyCell}>No preparation sessions match the current filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={styles.pagination}>
        <span>
          {data?.pagination.totalCount ?? 0} sessions
          {totalPages > 0 ? ` | page ${page} of ${totalPages}` : ""}
        </span>
        <div>
          <button
            type="button"
            className={commonStyles.btnSecondary}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1 || loading}
          >
            Previous
          </button>
          <button
            type="button"
            className={commonStyles.btnSecondary}
            onClick={() => setPage((current) => current + 1)}
            disabled={loading || totalPages === 0 || page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
