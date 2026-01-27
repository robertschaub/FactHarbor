"use client";

/**
 * PromptViewer - Shows which prompt version was used for a job
 *
 * Fetches prompt usage from /api/fh/jobs/:id/prompts and displays
 * hash + optional expandable content view.
 */

import { useState, useEffect } from "react";

interface PromptUsage {
  pipeline: string;
  contentHash: string;
  loadedUtc: string;
}

interface Props {
  jobId: string;
}

export function PromptViewer({ jobId }: Props) {
  const [prompts, setPrompts] = useState<PromptUsage[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/fh/jobs/${jobId}/prompts`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.prompts) setPrompts(data.prompts);
      })
      .catch(() => {});
  }, [jobId]);

  if (prompts.length === 0) return null;

  const handleToggle = async (pipeline: string) => {
    if (expanded === pipeline) {
      setExpanded(null);
      setContent(null);
      return;
    }
    setExpanded(pipeline);
    setLoading(true);
    try {
      const res = await fetch(
        `/api/fh/jobs/${jobId}/prompts?pipeline=${pipeline}&content=true`
      );
      if (res.ok) {
        const data = await res.json();
        setContent(data.content || null);
      }
    } catch {
      setContent(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: "#555" }}>
        Prompt Versions Used
      </div>
      {prompts.map((p) => (
        <div key={p.pipeline} style={{ marginBottom: 8 }}>
          <button
            onClick={() => handleToggle(p.pipeline)}
            style={{
              background: "none",
              border: "1px solid #ddd",
              borderRadius: 4,
              padding: "4px 8px",
              cursor: "pointer",
              fontSize: 12,
              fontFamily: "monospace",
              color: "#333",
            }}
          >
            {p.pipeline}: {p.contentHash.substring(0, 12)}...
            {expanded === p.pipeline ? " ▼" : " ▶"}
          </button>
          {expanded === p.pipeline && (
            <div
              style={{
                marginTop: 4,
                border: "1px solid #e0e0e0",
                borderRadius: 4,
                background: "#fafafa",
                maxHeight: 300,
                overflow: "auto",
              }}
            >
              {loading ? (
                <div style={{ padding: 8, color: "#999", fontSize: 12 }}>Loading...</div>
              ) : content ? (
                <pre style={{ padding: 8, margin: 0, fontSize: 11, whiteSpace: "pre-wrap" }}>
                  {content}
                </pre>
              ) : (
                <div style={{ padding: 8, color: "#999", fontSize: 12 }}>
                  Content not available
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
