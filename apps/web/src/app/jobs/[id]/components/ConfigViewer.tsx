"use client";

/**
 * ConfigViewer - Shows which configs were used for a job
 *
 * Displays search and calculation config versions with links to
 * open the config editor in a new tab.
 */

import { useState, useEffect } from "react";

interface ConfigUsage {
  id: number;
  configType: string;
  profileKey: string;
  contentHash: string;
  versionLabel: string;
  schemaVersion: string;
  loadedUtc: string;
  effectiveOverrides: Array<{
    envVar: string;
    fieldPath: string;
    appliedValue?: string | number | boolean;
  }> | null;
  hasOverrides: boolean;
}

interface Props {
  jobId: string;
}

const CONFIG_TYPE_LABELS: Record<string, string> = {
  search: "🔍 Search",
  calculation: "🧮 Calculation",
  prompt: "📝 Prompt",
};

export function ConfigViewer({ jobId }: Props) {
  const [configs, setConfigs] = useState<ConfigUsage[]>([]);
  const [expandedOverrides, setExpandedOverrides] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/fh/jobs/${jobId}/configs`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.configs) setConfigs(data.configs);
      })
      .catch(() => {});
  }, [jobId]);

  if (configs.length === 0) return null;

  const truncateHash = (hash: string) => {
    return `${hash.substring(0, 8)}...${hash.substring(hash.length - 4)}`;
  };

  const openConfigEditor = (configType: string, profileKey: string, contentHash: string) => {
    // Build URL with query params to open specific config version
    const url = `/admin/config?type=${configType}&profile=${profileKey}&hash=${contentHash}&tab=active`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#555" }}>
        Configurations Used
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {configs.map((c) => (
          <div
            key={c.id}
            style={{
              border: "1px solid #e0e0e0",
              borderRadius: 6,
              padding: "8px 12px",
              background: "#fafafa",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>
                  {CONFIG_TYPE_LABELS[c.configType] || c.configType}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontFamily: "monospace",
                    color: "#666",
                    background: "#e8e8e8",
                    padding: "2px 6px",
                    borderRadius: 3,
                  }}
                  title={c.contentHash}
                >
                  {truncateHash(c.contentHash)}
                </span>
                {c.hasOverrides && (
                  <span
                    style={{
                      fontSize: 10,
                      background: "#fff3cd",
                      color: "#856404",
                      padding: "2px 6px",
                      borderRadius: 3,
                      fontWeight: 500,
                    }}
                    title="Environment variable overrides were applied"
                  >
                    + overrides
                  </span>
                )}
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {c.hasOverrides && (
                  <button
                    onClick={() => setExpandedOverrides(
                      expandedOverrides === String(c.id) ? null : String(c.id)
                    )}
                    style={{
                      background: "none",
                      border: "1px solid #ccc",
                      borderRadius: 4,
                      padding: "3px 8px",
                      cursor: "pointer",
                      fontSize: 11,
                      color: "#666",
                    }}
                    title="View applied overrides"
                  >
                    {expandedOverrides === String(c.id) ? "Hide" : "Show"} overrides
                  </button>
                )}
                <button
                  onClick={() => openConfigEditor(c.configType, c.profileKey, c.contentHash)}
                  style={{
                    background: "#2563eb",
                    border: "none",
                    borderRadius: 4,
                    padding: "3px 10px",
                    cursor: "pointer",
                    fontSize: 11,
                    color: "#fff",
                    fontWeight: 500,
                  }}
                  title="Open this config version in the editor (new tab)"
                >
                  Open in Editor ↗
                </button>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
              {c.versionLabel} • {c.profileKey} • {c.schemaVersion}
            </div>

            {/* Expanded overrides */}
            {expandedOverrides === String(c.id) && c.effectiveOverrides && (
              <div
                style={{
                  marginTop: 8,
                  padding: 8,
                  background: "#fffbeb",
                  border: "1px solid #fde68a",
                  borderRadius: 4,
                  fontSize: 11,
                }}
              >
                <div style={{ fontWeight: 500, marginBottom: 4 }}>Applied Overrides:</div>
                {c.effectiveOverrides.map((o, i) => (
                  <div key={i} style={{ fontFamily: "monospace", marginBottom: 2 }}>
                    <span style={{ color: "#92400e" }}>{o.envVar}</span>
                    {" → "}
                    <span style={{ color: "#666" }}>{o.fieldPath}</span>
                    {o.appliedValue !== undefined && (
                      <>
                        {" = "}
                        <span style={{ color: "#059669" }}>{String(o.appliedValue)}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
