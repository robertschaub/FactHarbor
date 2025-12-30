/**
 * Job Results Page - Enhanced for UN-3, UN-17, Article Verdict Problem
 * 
 * v2.2.2 - Fixed: Next.js 15 async params support
 * 
 * @version 2.2.2
 */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";

type Job = {
  jobId: string;
  status: string;
  progress: number;
  createdUtc: string;
  updatedUtc: string;
  inputType: string;
  inputValue: string;
  inputPreview: string | null;
  resultJson: any | null;
  reportMarkdown: string | null;
};

type EventItem = { id: number; tsUtc: string; level: string; message: string };

export default function JobPage() {
  // Use useParams hook for client components in Next.js 15
  const params = useParams();
  const jobId = params?.id as string;
  
  const [job, setJob] = useState<Job | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [tab, setTab] = useState<"report" | "json" | "events" | "summary" | "article">("report");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    
    let alive = true;

    const load = async () => {
      const res = await fetch(`/api/fh/jobs/${jobId}`, { cache: "no-store" });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as Job;
      if (alive) setJob(data);
    };

    load().catch((e: any) => setErr(e?.message ?? String(e)));

    const id = setInterval(() => {
      load().catch(() => {});
    }, 2000);

    return () => { alive = false; clearInterval(id); };
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;
    
    // SSE events
    const es = new EventSource(`/api/fh/jobs/${jobId}/events`);
    es.onmessage = (evt) => {
      try {
        const item = JSON.parse(evt.data) as EventItem;
        setEvents((prev) => {
          const exists = prev.some((p) => p.id === item.id);
          return exists ? prev : [...prev, item].sort((a, b) => a.id - b.id);
        });
      } catch {}
    };
    es.onerror = () => {};
    return () => es.close();
  }, [jobId]);

  const report = job?.reportMarkdown ?? "";
  const jsonText = useMemo(() => (job?.resultJson ? JSON.stringify(job.resultJson, null, 2) : ""), [job]);
  
  // Extract v2.2 components from resultJson
  const result = job?.resultJson;
  const hasV22Data = result?.meta?.schemaVersion?.startsWith("2.2");
  const twoPanelSummary = result?.twoPanelSummary;
  const articleAnalysis = result?.articleAnalysis;
  const claimVerdicts = result?.claimVerdicts || [];

  if (!jobId) {
    return <div style={{ padding: 20 }}>Loading job ID...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h1 style={{ margin: "8px 0 0" }}>FactHarbor Analysis</h1>

      {err && <div style={{ color: "#f88", padding: 12, backgroundColor: "#2a1a1a", borderRadius: 8 }}>Error: {err}</div>}

      {job ? (
        <div style={{ border: "1px solid #333", borderRadius: 10, padding: 12 }}>
          <div><b>ID:</b> <code>{job.jobId}</code></div>
          <div><b>Status:</b> <code>{job.status}</code> ({job.progress}%)</div>
          <div><b>Created:</b> {job.createdUtc}</div>
          <div><b>Updated:</b> {job.updatedUtc}</div>
          <div style={{ marginTop: 8 }}><b>Input:</b> <code>{job.inputType}</code> — {job.inputPreview ?? "—"}</div>
          {hasV22Data && (
            <div style={{ marginTop: 8 }}>
              <b>Schema:</b> <code>{result.meta.schemaVersion}</code>
              {result.meta.analysisId && <> — <b>Analysis ID:</b> <code>{result.meta.analysisId}</code></>}
            </div>
          )}
        </div>
      ) : (
        <div>Loading…</div>
      )}

      {/* Tab Navigation */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {hasV22Data && (
          <>
            <button 
              onClick={() => setTab("summary")} 
              style={tabStyle(tab === "summary")}
            >
              📊 Summary
            </button>
            <button 
              onClick={() => setTab("article")} 
              style={tabStyle(tab === "article")}
              disabled={!claimVerdicts.length}
            >
              📖 Article View
            </button>
          </>
        )}
        <button onClick={() => setTab("report")} style={tabStyle(tab === "report")}>📝 Report</button>
        <button onClick={() => setTab("json")} style={tabStyle(tab === "json")}>🔧 JSON</button>
        <button onClick={() => setTab("events")} style={tabStyle(tab === "events")}>📋 Events ({events.length})</button>
      </div>

      {/* Summary Tab (UN-3 + Article Verdict) */}
      {tab === "summary" && hasV22Data && (
        <div style={{ border: "1px solid #333", borderRadius: 10, padding: 16 }}>
          {/* Article Verdict Banner */}
          {articleAnalysis && (
            <ArticleVerdictBanner articleAnalysis={articleAnalysis} />
          )}
          
          {/* Two-Panel Summary (UN-3) */}
          {twoPanelSummary && (
            <TwoPanelSummary 
              articleSummary={twoPanelSummary.articleSummary}
              factharborAnalysis={twoPanelSummary.factharborAnalysis}
            />
          )}
          
          {/* Claims List */}
          {claimVerdicts.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h3 style={{ margin: "0 0 12px" }}>Claims Analyzed</h3>
              {claimVerdicts.map((cv: any) => (
                <ClaimCard key={cv.claimId} claim={cv} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Article View Tab (UN-17: Claim Highlighting) */}
      {tab === "article" && hasV22Data && (
        <div style={{ border: "1px solid #333", borderRadius: 10, padding: 16 }}>
          <h3 style={{ margin: "0 0 12px" }}>Article with Claim Highlighting</h3>
          <ClaimHighlighter 
            originalText={job?.inputValue || ""}
            claimVerdicts={claimVerdicts}
          />
        </div>
      )}

      {/* Report Tab */}
      {tab === "report" && (
        <div style={{ border: "1px solid #333", borderRadius: 10, padding: 12 }}>
          {report ? <ReactMarkdown>{report}</ReactMarkdown> : <div>No report yet.</div>}
        </div>
      )}

      {/* JSON Tab */}
      {tab === "json" && (
        <pre style={{ border: "1px solid #333", borderRadius: 10, padding: 12, overflowX: "auto" }}>
          {jsonText || "No result yet."}
        </pre>
      )}

      {/* Events Tab */}
      {tab === "events" && (
        <div style={{ border: "1px solid #333", borderRadius: 10, padding: 12 }}>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {events.map((e) => (
              <li key={e.id}>
                <code>{e.tsUtc}</code> <b style={{ color: getEventColor(e.level) }}>{e.level}</b> — {e.message}
              </li>
            ))}
            {events.length === 0 && <li>No events yet.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

// Helper function for tab styling
function tabStyle(active: boolean): React.CSSProperties {
  return {
    padding: "8px 14px",
    border: "1px solid #333",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: active ? 700 : 400,
    backgroundColor: active ? "#007bff" : "transparent",
    color: active ? "#fff" : "inherit",
  };
}

function getEventColor(level: string): string {
  switch (level.toLowerCase()) {
    case "info": return "#17a2b8";
    case "warn": return "#ffc107";
    case "error": return "#dc3545";
    default: return "#6c757d";
  }
}

// ============================================================================
// INLINE COMPONENTS (to avoid import issues)
// ============================================================================

// Article Verdict Banner Component
function ArticleVerdictBanner({ articleAnalysis }: { articleAnalysis: any }) {
  const verdictColors: Record<string, { bg: string; text: string; border: string }> = {
    "CREDIBLE": { bg: "#d4edda", text: "#155724", border: "#28a745" },
    "MOSTLY-CREDIBLE": { bg: "#d1ecf1", text: "#0c5460", border: "#17a2b8" },
    "MISLEADING": { bg: "#fff3cd", text: "#856404", border: "#ffc107" },
    "FALSE": { bg: "#f8d7da", text: "#721c24", border: "#dc3545" },
  };
  
  const color = verdictColors[articleAnalysis.articleVerdict] || verdictColors["MISLEADING"];
  const { claimPattern } = articleAnalysis;
  
  return (
    <div style={{ 
      border: `2px solid ${color.border}`, 
      borderRadius: 12, 
      marginBottom: 20,
      overflow: "hidden",
      backgroundColor: "#fff"
    }}>
      {/* Main Verdict */}
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#666", textTransform: "uppercase" }}>
            Article Verdict
          </span>
          <span style={{ 
            padding: "8px 16px", 
            borderRadius: 6, 
            fontSize: 18, 
            fontWeight: 700,
            backgroundColor: color.bg,
            color: color.text
          }}>
            {getVerdictEmoji(articleAnalysis.articleVerdict)} {articleAnalysis.articleVerdict}
          </span>
          <span style={{ fontSize: 14, color: "#666" }}>
            {articleAnalysis.articleConfidence}% confidence
          </span>
        </div>
        
        <div style={{ marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#666" }}>Main Thesis: </span>
          <span style={{ fontSize: 14, color: "#333" }}>{articleAnalysis.articleThesis}</span>
        </div>
        
        <div>
          <span style={{ fontSize: 13, color: "#666" }}>Thesis Supported: </span>
          <span style={{ 
            fontWeight: 600, 
            color: articleAnalysis.thesisSupported ? "#28a745" : "#dc3545" 
          }}>
            {articleAnalysis.thesisSupported ? "✓ Yes" : "✗ No"}
          </span>
        </div>
      </div>
      
      {/* Claim Pattern */}
      {claimPattern && (
        <div style={{ padding: "12px 16px", backgroundColor: "#f8f9fa", borderTop: "1px solid #eee" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 8, textTransform: "uppercase" }}>
            Claim Analysis
          </div>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            <span>Total: <b>{claimPattern.total}</b></span>
            <span style={{ color: "#28a745" }}>Supported: <b>{claimPattern.supported}</b></span>
            <span style={{ color: "#ffc107" }}>Uncertain: <b>{claimPattern.uncertain}</b></span>
            <span style={{ color: "#dc3545" }}>Refuted: <b>{claimPattern.refuted}</b></span>
            <span>🔑 Central: <b>{claimPattern.centralClaimsSupported}/{claimPattern.centralClaimsTotal}</b></span>
          </div>
        </div>
      )}
      
      {/* Warning if verdict differs */}
      {articleAnalysis.verdictDiffersFromClaimAverage && (
        <div style={{ padding: "12px 16px", backgroundColor: "#fff8e1", borderTop: "1px solid #ffe082" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#f57c00", marginBottom: 4 }}>
            ⚠️ Article Verdict Differs from Claim Average
          </div>
          {articleAnalysis.verdictDifferenceReason && (
            <div style={{ fontSize: 13, color: "#333" }}>
              {articleAnalysis.verdictDifferenceReason}
            </div>
          )}
        </div>
      )}
      
      {/* Logical Fallacies */}
      {articleAnalysis.logicalFallacies?.length > 0 && (
        <div style={{ padding: "12px 16px", backgroundColor: "#fff5f5", borderTop: "1px solid #feb2b2" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#c53030", marginBottom: 8 }}>
            🚨 Logical Issues Detected
          </div>
          {articleAnalysis.logicalFallacies.map((f: any, i: number) => (
            <div key={i} style={{ 
              padding: 10, 
              backgroundColor: "#fff", 
              borderRadius: 6, 
              border: "1px solid #feb2b2",
              marginBottom: 6
            }}>
              <div style={{ fontWeight: 600, color: "#c53030", fontSize: 13 }}>{f.type}</div>
              <div style={{ fontSize: 13, color: "#333" }}>{f.description}</div>
              <div style={{ fontSize: 11, color: "#888" }}>Affects: {f.affectedClaims?.join(", ")}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Two-Panel Summary Component (UN-3)
function TwoPanelSummary({ articleSummary, factharborAnalysis }: { 
  articleSummary: any; 
  factharborAnalysis: any;
}) {
  return (
    <div style={{ 
      display: "grid", 
      gridTemplateColumns: "1fr 1fr", 
      gap: 16, 
      marginBottom: 20 
    }}>
      {/* Left Panel: What the Article Claims */}
      <div style={{ border: "1px solid #ddd", borderRadius: 12, overflow: "hidden", backgroundColor: "#fff" }}>
        <div style={{ 
          padding: "10px 14px", 
          backgroundColor: "#f8f9fa", 
          borderBottom: "1px solid #ddd",
          display: "flex",
          alignItems: "center",
          gap: 8
        }}>
          <span>📄</span>
          <b>What the Article Claims</b>
        </div>
        <div style={{ padding: 14 }}>
          <FieldRow label="Title" value={articleSummary.title} />
          <FieldRow label="Source" value={articleSummary.source} />
          <FieldRow label="Main Argument" value={articleSummary.mainArgument} block />
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>
              Key Findings
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
              {articleSummary.keyFindings?.map((f: string, i: number) => (
                <li key={i} style={{ marginBottom: 4 }}>{f}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      
      {/* Right Panel: FactHarbor Analysis */}
      <div style={{ border: "2px solid #007bff", borderRadius: 12, overflow: "hidden", backgroundColor: "#fff" }}>
        <div style={{ 
          padding: "10px 14px", 
          backgroundColor: "#f8f9fa", 
          borderBottom: "1px solid #ddd",
          display: "flex",
          alignItems: "center",
          gap: 8
        }}>
          <span>🔍</span>
          <b>FactHarbor Analysis</b>
        </div>
        <div style={{ padding: 14 }}>
          <FieldRow label="Source Credibility" value={factharborAnalysis.sourceCredibility} />
          
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>
              Claim Verdicts
            </div>
            {factharborAnalysis.claimVerdicts?.map((cv: any, i: number) => (
              <div key={i} style={{ 
                display: "flex", 
                justifyContent: "space-between", 
                alignItems: "center",
                padding: 8,
                backgroundColor: "#f8f9fa",
                borderRadius: 6,
                marginBottom: 4,
                fontSize: 12
              }}>
                <span style={{ flex: 1 }}>{cv.claim}</span>
                <VerdictBadge verdict={cv.verdict} confidence={cv.confidence} />
              </div>
            ))}
          </div>
          
          <FieldRow label="Methodology" value={factharborAnalysis.methodologyAssessment} />
          
          <div style={{ 
            textAlign: "center", 
            padding: 12, 
            backgroundColor: "#f0f7ff", 
            borderRadius: 8,
            marginTop: 12
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#666", textTransform: "uppercase" }}>
              Overall Verdict
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#007bff" }}>
              {factharborAnalysis.overallVerdict}
            </div>
          </div>
          
          <div style={{ textAlign: "center", fontSize: 10, color: "#888", marginTop: 12 }}>
            Analysis ID: {factharborAnalysis.analysisId}
          </div>
        </div>
      </div>
    </div>
  );
}

// Claim Card Component
function ClaimCard({ claim }: { claim: any }) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    "WELL-SUPPORTED": { bg: "#d4edda", text: "#155724", border: "#28a745" },
    "PARTIALLY-SUPPORTED": { bg: "#fff3cd", text: "#856404", border: "#ffc107" },
    "UNCERTAIN": { bg: "#fff3cd", text: "#856404", border: "#ffc107" },
    "REFUTED": { bg: "#f8d7da", text: "#721c24", border: "#dc3545" },
  };
  const color = colors[claim.verdict] || colors["UNCERTAIN"];
  
  return (
    <div style={{ 
      padding: 14, 
      border: "1px solid #ddd", 
      borderLeft: `4px solid ${color.border}`,
      borderRadius: 8, 
      backgroundColor: "#fff",
      marginBottom: 10
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontWeight: 600, color: "#666" }}>{claim.claimId}</span>
        {claim.isCentral && (
          <span style={{ 
            padding: "2px 6px", 
            backgroundColor: "#e8f4fd", 
            borderRadius: 4, 
            fontSize: 11, 
            color: "#0056b3" 
          }}>
            🔑 Central
          </span>
        )}
        <VerdictBadge verdict={claim.verdict} confidence={claim.confidence} />
        <span style={{ fontSize: 11, color: "#888" }}>Risk: {claim.riskTier}</span>
      </div>
      <div style={{ fontSize: 14, fontStyle: "italic", color: "#333", marginBottom: 8 }}>
        "{claim.claimText}"
      </div>
      <div style={{ fontSize: 13, color: "#555", lineHeight: 1.5 }}>
        {claim.reasoning}
      </div>
    </div>
  );
}

// Claim Highlighter Component (UN-17)
function ClaimHighlighter({ originalText, claimVerdicts }: { 
  originalText: string; 
  claimVerdicts: any[];
}) {
  const [enabled, setEnabled] = useState(true);
  
  // For now, show a simplified view since we may not have exact positions
  const hasPositions = claimVerdicts.some(c => c.startOffset !== undefined);
  
  return (
    <div>
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        marginBottom: 12,
        padding: "8px 12px",
        backgroundColor: "#f8f9fa",
        borderRadius: 8
      }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input 
            type="checkbox" 
            checked={enabled} 
            onChange={(e) => setEnabled(e.target.checked)} 
          />
          Show claim highlighting
        </label>
        <div style={{ display: "flex", gap: 12, fontSize: 12 }}>
          <span><span style={{ display: "inline-block", width: 12, height: 12, backgroundColor: "#d4edda", borderRadius: "50%" }}></span> Supported</span>
          <span><span style={{ display: "inline-block", width: 12, height: 12, backgroundColor: "#fff3cd", borderRadius: "50%" }}></span> Uncertain</span>
          <span><span style={{ display: "inline-block", width: 12, height: 12, backgroundColor: "#f8d7da", borderRadius: "50%" }}></span> Refuted</span>
        </div>
      </div>
      
      {!hasPositions && enabled && (
        <div style={{ marginBottom: 12, padding: 10, backgroundColor: "#fff3cd", borderRadius: 6, fontSize: 13 }}>
          ℹ️ Claim positions not available. Showing claims list below the text.
        </div>
      )}
      
      <div style={{ 
        padding: 16, 
        border: "1px solid #ddd", 
        borderRadius: 8, 
        backgroundColor: "#fff",
        lineHeight: 1.8,
        whiteSpace: "pre-wrap"
      }}>
        {originalText}
      </div>
      
      {enabled && (
        <div style={{ marginTop: 16 }}>
          <h4 style={{ margin: "0 0 10px" }}>Claims in this article:</h4>
          {claimVerdicts.map((cv: any) => (
            <div key={cv.claimId} style={{ 
              display: "flex", 
              alignItems: "flex-start", 
              gap: 10, 
              padding: 10,
              marginBottom: 6,
              backgroundColor: getHighlightBg(cv.highlightColor),
              borderRadius: 6
            }}>
              <span style={{ fontWeight: 600, minWidth: 30 }}>{cv.claimId}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 500 }}>{cv.claimText}</div>
                <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
                  {cv.verdict} ({cv.confidence}%)
                  {cv.isCentral && " • 🔑 Central Claim"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper Components
function FieldRow({ label, value, block }: { label: string; value: string; block?: boolean }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#666", textTransform: "uppercase", marginBottom: 2 }}>
        {label}
      </div>
      {block ? (
        <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>{value}</p>
      ) : (
        <span style={{ fontSize: 13 }}>{value}</span>
      )}
    </div>
  );
}

function VerdictBadge({ verdict, confidence }: { verdict: string; confidence: number }) {
  const colors: Record<string, { bg: string; text: string }> = {
    "WELL-SUPPORTED": { bg: "#d4edda", text: "#155724" },
    "PARTIALLY-SUPPORTED": { bg: "#fff3cd", text: "#856404" },
    "UNCERTAIN": { bg: "#fff3cd", text: "#856404" },
    "REFUTED": { bg: "#f8d7da", text: "#721c24" },
  };
  const color = colors[verdict] || { bg: "#e9ecef", text: "#495057" };
  
  return (
    <span style={{ 
      padding: "2px 8px", 
      borderRadius: 4, 
      fontSize: 11, 
      fontWeight: 600,
      backgroundColor: color.bg,
      color: color.text,
      whiteSpace: "nowrap"
    }}>
      {verdict} ({confidence}%)
    </span>
  );
}

function getVerdictEmoji(verdict: string): string {
  switch (verdict) {
    case "CREDIBLE": return "✅";
    case "MOSTLY-CREDIBLE": return "🔵";
    case "MISLEADING": return "⚠️";
    case "FALSE": return "❌";
    default: return "❓";
  }
}

function getHighlightBg(color: string): string {
  switch (color) {
    case "green": return "#d4edda";
    case "yellow": return "#fff3cd";
    case "red": return "#f8d7da";
    default: return "#f8f9fa";
  }
}
