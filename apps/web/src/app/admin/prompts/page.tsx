"use client";

/**
 * Admin Prompt Management Page
 *
 * View, edit, and manage prompt templates for all pipelines.
 * Includes version history and rollback functionality.
 */

import { useState, useEffect, useCallback } from "react";
import { useAdminAuth } from "../admin-auth-context";
import styles from "./prompts.module.css";

type Pipeline = "orchestrated" | "monolithic-canonical" | "monolithic-dynamic" | "source-reliability";

interface PromptData {
  pipeline: string;
  version: string;
  contentHash: string;
  tokenEstimate: number;
  sectionCount: number;
  sections: Array<{ name: string; lineCount: number; tokenEstimate: number }>;
  variables: string[];
  content: string;
  loadedAt: string;
  warnings: Array<{ type: string; message: string }>;
}

interface VersionEntry {
  contentHash: string;
  versionLabel: string;
  isActive: boolean;
  usageCount: number;
  previousHash: string | null;
  createdUtc: string;
  activatedUtc: string | null;
}

const PIPELINES: Pipeline[] = [
  "orchestrated",
  "monolithic-canonical",
  "monolithic-dynamic",
  "source-reliability",
];

export default function PromptsPage() {
  const { getHeaders } = useAdminAuth();
  const [pipeline, setPipeline] = useState<Pipeline>("orchestrated");
  const [tab, setTab] = useState<"editor" | "history">("editor");
  const [prompt, setPrompt] = useState<PromptData | null>(null);
  const [editContent, setEditContent] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [history, setHistory] = useState<VersionEntry[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);

  // Load prompt content
  const loadPrompt = useCallback(async () => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/admin/prompts/${pipeline}`, {
        headers: getHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const data: PromptData = await res.json();
      setPrompt(data);
      setEditContent(data.content);
      setIsDirty(false);
    } catch (err: any) {
      setStatusMsg({ type: "error", text: `Failed to load: ${err?.message}` });
    } finally {
      setLoading(false);
    }
  }, [pipeline, getHeaders]);

  // Load version history
  const loadHistory = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/prompts/${pipeline}/history?limit=50`, {
        headers: getHeaders(),
      });
      if (!res.ok) return;
      const data = await res.json();
      setHistory(data.versions || []);
      setHistoryTotal(data.total || 0);
    } catch {
      // Non-critical
    }
  }, [pipeline, getHeaders]);

  useEffect(() => {
    loadPrompt();
    loadHistory();
  }, [loadPrompt, loadHistory]);

  // Save prompt
  const handleSave = async () => {
    setSaving(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/admin/prompts/${pipeline}`, {
        method: "PUT",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: editContent,
          versionLabel: `manual-${new Date().toISOString().split("T")[0]}`,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const result = await res.json();
      setStatusMsg({
        type: "success",
        text: `Saved! Hash: ${result.contentHash?.substring(0, 12)}... | Tokens: ~${result.tokenEstimate}`,
      });
      setIsDirty(false);
      // Reload to get updated metadata
      await loadPrompt();
      await loadHistory();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: `Save failed: ${err?.message}` });
    } finally {
      setSaving(false);
    }
  };

  // Rollback to version
  const handleRollback = async (contentHash: string) => {
    if (!confirm(`Rollback to version ${contentHash.substring(0, 12)}...?`)) return;

    try {
      const res = await fetch(`/api/admin/prompts/${pipeline}/rollback`, {
        method: "POST",
        headers: {
          ...getHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contentHash }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setStatusMsg({ type: "success", text: "Rollback successful!" });
      await loadPrompt();
      await loadHistory();
    } catch (err: any) {
      setStatusMsg({ type: "error", text: `Rollback failed: ${err?.message}` });
    }
  };

  const handleEditorChange = (value: string) => {
    setEditContent(value);
    setIsDirty(value !== prompt?.content);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Prompt Management</h1>
      </div>

      {/* Pipeline Selector */}
      <div className={styles.pipelineSelector}>
        {PIPELINES.map((p) => (
          <button
            key={p}
            className={`${styles.pipelineBtn} ${pipeline === p ? styles.pipelineBtnActive : ""}`}
            onClick={() => { setPipeline(p); setTab("editor"); }}
          >
            {p}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loading}>Loading prompt...</div>
      ) : prompt ? (
        <>
          {/* Metadata Bar */}
          <div className={styles.metaBar}>
            <span className={styles.metaItem}>
              <strong>Version:</strong> {prompt.version}
            </span>
            <span className={styles.metaItem}>
              <strong>Hash:</strong>{" "}
              <code>{prompt.contentHash.substring(0, 12)}...</code>
            </span>
            <span className={styles.metaItem}>
              <strong>Tokens:</strong> ~{prompt.tokenEstimate.toLocaleString()}
            </span>
            <span className={styles.metaItem}>
              <strong>Sections:</strong> {prompt.sectionCount}
            </span>
            {isDirty && <span className={styles.dirtyBadge}>Unsaved changes</span>}
          </div>

          {/* Section Badges */}
          <div className={styles.sectionsList}>
            {prompt.sections.map((s) => (
              <span key={s.name} className={styles.sectionBadge}>
                {s.name} ({s.lineCount} lines, ~{s.tokenEstimate} tokens)
              </span>
            ))}
          </div>

          {/* Tabs */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${tab === "editor" ? styles.tabActive : ""}`}
              onClick={() => setTab("editor")}
            >
              Editor
            </button>
            <button
              className={`${styles.tab} ${tab === "history" ? styles.tabActive : ""}`}
              onClick={() => setTab("history")}
            >
              History ({historyTotal})
            </button>
          </div>

          {tab === "editor" ? (
            <div className={styles.editorWrapper}>
              <textarea
                className={styles.editor}
                value={editContent}
                onChange={(e) => handleEditorChange(e.target.value)}
                spellCheck={false}
              />
              <div className={styles.actions}>
                <button
                  className={styles.saveBtn}
                  onClick={handleSave}
                  disabled={!isDirty || saving}
                >
                  {saving ? "Saving..." : "Save Prompt"}
                </button>
                {isDirty && (
                  <button
                    className={styles.resetBtn}
                    onClick={() => {
                      setEditContent(prompt.content);
                      setIsDirty(false);
                    }}
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div>
              {history.length === 0 ? (
                <div className={styles.loading}>No version history yet</div>
              ) : (
                <ul className={styles.historyList}>
                  {history.map((v) => (
                    <li
                      key={v.contentHash}
                      className={`${styles.historyItem} ${v.isActive ? styles.historyItemActive : ""}`}
                    >
                      <div className={styles.historyMeta}>
                        <div className={styles.historyLabel}>
                          {v.versionLabel}
                          {v.isActive && (
                            <span className={styles.activeBadge}>ACTIVE</span>
                          )}
                        </div>
                        <div className={styles.historyHash}>
                          {v.contentHash.substring(0, 16)}...
                        </div>
                        <div className={styles.historyDate}>
                          Created: {new Date(v.createdUtc).toLocaleString()}
                          {v.activatedUtc && ` | Activated: ${new Date(v.activatedUtc).toLocaleString()}`}
                        </div>
                        <div className={styles.historyUsage}>
                          Used in {v.usageCount} analysis job{v.usageCount !== 1 ? "s" : ""}
                          {v.previousHash && ` | Previous: ${v.previousHash.substring(0, 8)}...`}
                        </div>
                      </div>
                      {!v.isActive && (
                        <button
                          className={styles.rollbackBtn}
                          onClick={() => handleRollback(v.contentHash)}
                        >
                          Rollback
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Status Message */}
          {statusMsg && (
            <div
              className={`${styles.statusMsg} ${
                statusMsg.type === "success" ? styles.statusSuccess : styles.statusError
              }`}
            >
              {statusMsg.text}
            </div>
          )}
        </>
      ) : (
        <div className={styles.loading}>No prompt data</div>
      )}
    </div>
  );
}
