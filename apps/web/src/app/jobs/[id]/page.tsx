/**
 * Job Results Page v2.4.4
 * 
 * Fixes:
 * - Table rendering in Report (use remark-gfm)
 * - Export/Print functionality
 * - Better error display
 * 
 * @version 2.4.4
 */

"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
  const params = useParams();
  const jobId = params?.id as string;
  
  const [job, setJob] = useState<Job | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [tab, setTab] = useState<"summary" | "article" | "sources" | "report" | "json" | "events">("summary");
  const [err, setErr] = useState<string | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!jobId) return;
    let alive = true;
    const load = async () => {
      const res = await fetch(`/api/fh/jobs/${jobId}`, { cache: "no-store" });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`${res.status}: ${text}`);
      }
      const data = (await res.json()) as Job;
      if (alive) setJob(data);
    };
    load().catch((e: any) => setErr(e?.message ?? String(e)));
    const id = setInterval(() => { load().catch(() => {}); }, 2000);
    return () => { alive = false; clearInterval(id); };
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;
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
    es.onerror = () => {
      // Silently handle SSE errors
    };
    return () => es.close();
  }, [jobId]);

  const report = job?.reportMarkdown ?? "";
  const jsonText = useMemo(() => (job?.resultJson ? JSON.stringify(job.resultJson, null, 2) : ""), [job]);
  
  const result = job?.resultJson;
  const schemaVersion = result?.meta?.schemaVersion || "";
  const hasV22Data = schemaVersion.startsWith("2.");
  const twoPanelSummary = result?.twoPanelSummary;
  const articleAnalysis = result?.articleAnalysis;
  const claimVerdicts = result?.claimVerdicts || [];
  const questionAnswer = result?.questionAnswer;
  const isQuestion = result?.meta?.isQuestion || articleAnalysis?.isQuestion;
  const hasMultipleProceedings = result?.meta?.hasMultipleProceedings;
  const proceedings = result?.proceedings || [];
  const hasContestedFactors = result?.meta?.hasContestedFactors;
  const searchQueries = result?.searchQueries || [];
  const sources = result?.sources || [];
  const researchStats = result?.researchStats;

  // Export functions
  const handlePrint = () => {
    window.print();
  };

  const handleExportHTML = () => {
    const content = reportRef.current?.innerHTML || report;
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>FactHarbor Analysis - ${result?.meta?.analysisId || jobId}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; }
    table { border-collapse: collapse; width: 100%; margin: 16px 0; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background: #f5f5f5; }
    h1, h2, h3 { color: #333; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
  </style>
</head>
<body>
  <h1>FactHarbor Analysis Report</h1>
  <p><strong>Analysis ID:</strong> ${result?.meta?.analysisId || 'N/A'}</p>
  <p><strong>Generated:</strong> ${new Date().toISOString()}</p>
  <hr>
  ${content}
</body>
</html>`;
    
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factharbor-${result?.meta?.analysisId || jobId}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factharbor-${result?.meta?.analysisId || jobId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportMarkdown = () => {
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factharbor-${result?.meta?.analysisId || jobId}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!jobId) return <div style={{ padding: 20 }}>Loading job ID...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h1 style={{ margin: "8px 0 0" }}>FactHarbor Analysis</h1>

      {err && (
        <div style={{ color: "#721c24", padding: 12, backgroundColor: "#f8d7da", borderRadius: 8, border: "1px solid #f5c6cb" }}>
          <strong>Error:</strong> {err}
        </div>
      )}

      {job ? (
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, backgroundColor: "#fff" }}>
          <div><b>ID:</b> <code>{job.jobId}</code></div>
          <div><b>Status:</b> <code style={{ color: job.status === "SUCCEEDED" ? "#28a745" : job.status === "FAILED" ? "#dc3545" : "#ffc107" }}>{job.status}</code> ({job.progress}%)</div>
          <div style={{ marginTop: 8 }}><b>Input:</b> <code>{job.inputType}</code> — {job.inputPreview ?? "—"}</div>
          {hasV22Data && (
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <span><b>Schema:</b> <code>{schemaVersion}</code></span>
              {result.meta.analysisId && <span>— <b>ID:</b> <code>{result.meta.analysisId}</code></span>}
              {isQuestion && <Badge bg="#e3f2fd" color="#1565c0">📝 QUESTION</Badge>}
              {hasMultipleProceedings && <Badge bg="#fff3e0" color="#e65100">⚖️ {proceedings.length} PROCEEDINGS</Badge>}
              {hasContestedFactors && <Badge bg="#fce4ec" color="#c2185b">⚠️ CONTESTED</Badge>}
              {researchStats && <Badge bg="#e8f5e9" color="#2e7d32">🔍 {researchStats.totalSearches} searches</Badge>}
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: 20, textAlign: "center", color: "#666" }}>Loading...</div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        {hasV22Data && (
          <>
            <button onClick={() => setTab("summary")} style={tabStyle(tab === "summary")}>📊 Summary</button>
            <button onClick={() => setTab("article")} style={tabStyle(tab === "article")} disabled={!claimVerdicts.length}>📖 Article</button>
            <button onClick={() => setTab("sources")} style={tabStyle(tab === "sources")}>🔍 Sources ({sources.length})</button>
          </>
        )}
        <button onClick={() => setTab("report")} style={tabStyle(tab === "report")}>📝 Report</button>
        <button onClick={() => setTab("json")} style={tabStyle(tab === "json")}>🔧 JSON</button>
        <button onClick={() => setTab("events")} style={tabStyle(tab === "events")}>📋 Events ({events.length})</button>
        
        {/* Export dropdown */}
        {job?.status === "SUCCEEDED" && (
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button onClick={handlePrint} style={exportBtnStyle} title="Print">🖨️</button>
            <button onClick={handleExportHTML} style={exportBtnStyle} title="Export HTML">📄</button>
            <button onClick={handleExportMarkdown} style={exportBtnStyle} title="Export Markdown">📝</button>
            <button onClick={handleExportJSON} style={exportBtnStyle} title="Export JSON">💾</button>
          </div>
        )}
      </div>

      {/* Summary Tab */}
      {tab === "summary" && hasV22Data && (
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 16, backgroundColor: "#fff" }}>
          {isQuestion && questionAnswer && (
            hasMultipleProceedings 
              ? <MultiProceedingAnswerBanner questionAnswer={questionAnswer} proceedings={proceedings} />
              : <QuestionAnswerBanner questionAnswer={questionAnswer} />
          )}
          
          {!isQuestion && articleAnalysis && (
            <ArticleVerdictBanner 
              articleAnalysis={articleAnalysis} 
              fallbackThesis={twoPanelSummary?.articleSummary?.mainArgument || job?.inputValue}
            />
          )}
          
          {twoPanelSummary && (
            <TwoPanelSummary 
              articleSummary={twoPanelSummary.articleSummary}
              factharborAnalysis={twoPanelSummary.factharborAnalysis}
              isQuestion={isQuestion}
            />
          )}
          
          {claimVerdicts.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <h3 style={{ margin: "0 0 12px" }}>{isQuestion ? "Supporting Analysis" : "Claims Analyzed"}</h3>
              {hasMultipleProceedings ? (
                <ClaimsGroupedByProceeding claimVerdicts={claimVerdicts} proceedings={proceedings} />
              ) : (
                claimVerdicts.map((cv: any) => <ClaimCard key={cv.claimId} claim={cv} />)
              )}
            </div>
          )}
        </div>
      )}

      {/* Sources Tab */}
      {tab === "sources" && hasV22Data && (
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 16, backgroundColor: "#fff" }}>
          <SourcesPanel searchQueries={searchQueries} sources={sources} researchStats={researchStats} />
        </div>
      )}

      {/* Article View Tab */}
      {tab === "article" && hasV22Data && (
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 16, backgroundColor: "#fff" }}>
          <ClaimHighlighter originalText={job?.inputValue || ""} claimVerdicts={claimVerdicts} />
        </div>
      )}

      {/* Report Tab - Fixed with remark-gfm for tables */}
      {tab === "report" && (
        <div ref={reportRef} style={{ border: "1px solid #ddd", borderRadius: 10, padding: 16, backgroundColor: "#fff" }} className="markdown-body">
          {report ? (
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
                table: ({node, ...props}) => (
                  <table style={{ borderCollapse: "collapse", width: "100%", margin: "16px 0" }} {...props} />
                ),
                th: ({node, ...props}) => (
                  <th style={{ border: "1px solid #ddd", padding: "8px 12px", backgroundColor: "#f5f5f5", textAlign: "left" }} {...props} />
                ),
                td: ({node, ...props}) => (
                  <td style={{ border: "1px solid #ddd", padding: "8px 12px" }} {...props} />
                ),
              }}
            >
              {report}
            </ReactMarkdown>
          ) : (
            <div style={{ color: "#666", textAlign: "center", padding: 40 }}>No report yet.</div>
          )}
        </div>
      )}

      {/* JSON Tab */}
      {tab === "json" && (
        <pre style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, overflowX: "auto", fontSize: 11, backgroundColor: "#f8f9fa" }}>
          {jsonText || "No result yet."}
        </pre>
      )}

      {/* Events Tab */}
      {tab === "events" && (
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12, backgroundColor: "#fff" }}>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
            {events.map((e) => (
              <li key={e.id} style={{ marginBottom: 4 }}>
                <code style={{ fontSize: 10 }}>{e.tsUtc}</code>{" "}
                <b style={{ color: getEventColor(e.level) }}>{e.level}</b> — {e.message}
              </li>
            ))}
            {events.length === 0 && <li style={{ color: "#666" }}>No events yet.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

// Helper function to decode HTML entities
function decodeHtmlEntities(text: string): string {
  if (typeof document === 'undefined') return text;
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
}

// Export button style
const exportBtnStyle: React.CSSProperties = {
  padding: "6px 10px",
  border: "1px solid #ddd",
  borderRadius: 6,
  cursor: "pointer",
  backgroundColor: "#f8f9fa",
  fontSize: 14,
};

// ============================================================================
// Sources Panel
// ============================================================================

function SourcesPanel({ searchQueries, sources, researchStats }: { searchQueries: any[]; sources: any[]; researchStats: any }) {
  return (
    <div>
      <h3 style={{ margin: "0 0 16px" }}>🔍 Research Summary</h3>
      
      {researchStats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
          <StatCard label="Searches" value={researchStats.totalSearches} icon="🔍" />
          <StatCard label="Results Found" value={researchStats.totalResults} icon="📋" />
          <StatCard label="Sources Fetched" value={researchStats.sourcesFetched} icon="🌐" />
          <StatCard label="Fetch Success" value={researchStats.sourcesSuccessful} icon="✅" />
          <StatCard label="Facts Extracted" value={researchStats.factsExtracted} icon="📝" />
        </div>
      )}
      
      <h4 style={{ margin: "16px 0 8px", color: "#666" }}>Search Queries Performed</h4>
      {searchQueries.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {searchQueries.map((sq: any, i: number) => (
            <div key={i} style={{ 
              padding: 10, 
              backgroundColor: "#f8f9fa", 
              borderRadius: 6, 
              border: "1px solid #ddd",
              display: "flex",
              alignItems: "center",
              gap: 12
            }}>
              <span style={{ fontSize: 18 }}>🔍</span>
              <div style={{ flex: 1 }}>
                <code style={{ fontSize: 13, color: "#333" }}>{sq.query}</code>
                <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                  Focus: {sq.focus} | Iteration: {sq.iteration}
                </div>
              </div>
              <div style={{ 
                padding: "4px 10px", 
                backgroundColor: sq.resultsCount > 0 ? "#d4edda" : "#f8d7da", 
                borderRadius: 4,
                fontSize: 12,
                fontWeight: 600,
                color: sq.resultsCount > 0 ? "#155724" : "#721c24"
              }}>
                {sq.resultsCount} results
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: 16, backgroundColor: "#fff3cd", borderRadius: 8, color: "#856404" }}>
          No search queries recorded.
        </div>
      )}
      
      <h4 style={{ margin: "24px 0 8px", color: "#666" }}>Sources Fetched</h4>
      {sources.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {sources.map((s: any, i: number) => (
            <div key={i} style={{ 
              padding: 10, 
              backgroundColor: s.fetchSuccess ? "#fff" : "#fff5f5", 
              borderRadius: 6, 
              border: `1px solid ${s.fetchSuccess ? "#ddd" : "#feb2b2"}`,
              display: "flex",
              alignItems: "flex-start",
              gap: 12
            }}>
              <span style={{ fontSize: 16 }}>{s.fetchSuccess ? "✅" : "❌"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: "#333", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {decodeHtmlEntities(s.title || "Unknown")}
                </div>
                <a href={s.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "#007bff", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {s.url}
                </a>
                {s.searchQuery && (
                  <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>
                    Found via: "{s.searchQuery}"
                  </div>
                )}
              </div>
              <div style={{ textAlign: "right" }}>
                {s.trackRecordScore && (
                  <div style={{ 
                    padding: "2px 8px", 
                    backgroundColor: s.trackRecordScore >= 0.8 ? "#d4edda" : s.trackRecordScore >= 0.6 ? "#fff3cd" : "#f8d7da",
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 600,
                    color: s.trackRecordScore >= 0.8 ? "#155724" : s.trackRecordScore >= 0.6 ? "#856404" : "#721c24"
                  }}>
                    {(s.trackRecordScore * 100).toFixed(0)}%
                  </div>
                )}
                <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>{s.category}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ padding: 16, backgroundColor: "#f8d7da", borderRadius: 8, color: "#721c24" }}>
          No sources were fetched.
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div style={{ padding: 12, backgroundColor: "#f8f9fa", borderRadius: 8, textAlign: "center", border: "1px solid #ddd" }}>
      <div style={{ fontSize: 24 }}>{icon}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: "#333" }}>{value}</div>
      <div style={{ fontSize: 11, color: "#666", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

// ============================================================================
// Utility Components
// ============================================================================

function Badge({ children, bg, color }: { children: React.ReactNode; bg: string; color: string }) {
  return (
    <span style={{ padding: "2px 8px", backgroundColor: bg, color, borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
      {children}
    </span>
  );
}

function tabStyle(active: boolean): React.CSSProperties {
  return {
    padding: "8px 14px",
    border: "1px solid #ddd",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: active ? 700 : 400,
    backgroundColor: active ? "#007bff" : "#fff",
    color: active ? "#fff" : "#333",
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
// Multi-Proceeding Answer Banner
// ============================================================================

function MultiProceedingAnswerBanner({ questionAnswer, proceedings }: { questionAnswer: any; proceedings: any[] }) {
  const answerColors: Record<string, { bg: string; text: string; border: string }> = {
    "YES": { bg: "#d4edda", text: "#155724", border: "#28a745" },
    "NO": { bg: "#f8d7da", text: "#721c24", border: "#dc3545" },
    "PARTIALLY": { bg: "#fff3cd", text: "#856404", border: "#ffc107" },
    "INSUFFICIENT-EVIDENCE": { bg: "#e9ecef", text: "#495057", border: "#6c757d" },
  };
  
  const overallColor = answerColors[questionAnswer.answer] || answerColors["PARTIALLY"];
  
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ padding: "12px 16px", backgroundColor: "#f0f7ff", borderRadius: "12px 12px 0 0", border: "1px solid #90caf9", borderBottom: "none" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#0056b3", textTransform: "uppercase", marginBottom: 4 }}>
          📝 Question Asked
        </div>
        <div style={{ fontSize: 16, color: "#333", fontStyle: "italic" }}>
          "{questionAnswer.question}"
        </div>
      </div>
      
      <div style={{ padding: "10px 16px", backgroundColor: "#fff3e0", border: "1px solid #ffcc80", borderBottom: "none", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 18 }}>⚖️</span>
        <span style={{ fontSize: 13, color: "#e65100", fontWeight: 600 }}>
          {proceedings.length} distinct legal proceedings analyzed separately
        </span>
        {questionAnswer.hasContestedFactors && (
          <Badge bg="#fce4ec" color="#c2185b">⚠️ Contains contested factors</Badge>
        )}
      </div>
      
      <div style={{ padding: 16, border: `2px solid ${overallColor.border}`, backgroundColor: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#666", textTransform: "uppercase" }}>Overall Answer</span>
          <span style={{ padding: "10px 20px", borderRadius: 8, fontSize: 20, fontWeight: 700, backgroundColor: overallColor.bg, color: overallColor.text }}>
            {getAnswerEmoji(questionAnswer.answer)} {questionAnswer.answer}
          </span>
          <span style={{ fontSize: 14, color: "#666" }}>{questionAnswer.confidence}% confidence</span>
        </div>
        
        {questionAnswer.calibrationNote && (
          <div style={{ padding: 10, backgroundColor: "#fff8e1", borderRadius: 6, marginBottom: 12, border: "1px solid #ffe082" }}>
            <span style={{ fontSize: 13, color: "#f57c00" }}>⚠️ {questionAnswer.calibrationNote}</span>
          </div>
        )}
        
        {questionAnswer.proceedingSummary && (
          <div style={{ padding: 12, backgroundColor: "#f8f9fa", borderRadius: 8, marginBottom: 12, borderLeft: "4px solid #6c757d" }}>
            <div style={{ fontSize: 14, color: "#333" }}>{questionAnswer.proceedingSummary}</div>
          </div>
        )}
        
        <div style={{ padding: 12, backgroundColor: "#f8f9fa", borderRadius: 8, borderLeft: `4px solid ${overallColor.border}` }}>
          <div style={{ fontSize: 14, color: "#333", lineHeight: 1.5 }}>{questionAnswer.shortAnswer}</div>
        </div>
      </div>
      
      {questionAnswer.proceedingAnswers && questionAnswer.proceedingAnswers.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <h4 style={{ margin: "0 0 12px", fontSize: 14, color: "#666", textTransform: "uppercase" }}>
            ⚖️ Proceeding-by-Proceeding Analysis
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(proceedings.length, 2)}, 1fr)`, gap: 12 }}>
            {questionAnswer.proceedingAnswers.map((pa: any) => {
              const proc = proceedings.find((p: any) => p.id === pa.proceedingId);
              return <ProceedingCard key={pa.proceedingId} proceedingAnswer={pa} proceeding={proc} />;
            })}
          </div>
        </div>
      )}
      
      {questionAnswer.keyFactors?.length > 0 && (
        <div style={{ marginTop: 16, padding: 12, backgroundColor: "#f8f9fa", borderRadius: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#666", textTransform: "uppercase", marginBottom: 10 }}>Overall Key Factors</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {questionAnswer.keyFactors.map((factor: any, i: number) => (
              <KeyFactorRow key={i} factor={factor} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ProceedingCard({ proceedingAnswer, proceeding }: { proceedingAnswer: any; proceeding: any }) {
  const answerColors: Record<string, { bg: string; text: string; border: string }> = {
    "YES": { bg: "#d4edda", text: "#155724", border: "#28a745" },
    "NO": { bg: "#f8d7da", text: "#721c24", border: "#dc3545" },
    "PARTIALLY": { bg: "#fff3cd", text: "#856404", border: "#ffc107" },
    "INSUFFICIENT-EVIDENCE": { bg: "#e9ecef", text: "#495057", border: "#6c757d" },
  };
  
  const color = answerColors[proceedingAnswer.answer] || answerColors["PARTIALLY"];
  
  const factors = proceedingAnswer.keyFactors || [];
  const positiveCount = factors.filter((f: any) => f.supports === "yes").length;
  const negativeCount = factors.filter((f: any) => f.supports === "no").length;
  const neutralCount = factors.filter((f: any) => f.supports === "neutral").length;
  const contestedCount = factors.filter((f: any) => f.supports === "no" && f.isContested).length;
  
  return (
    <div style={{ border: `2px solid ${color.border}`, borderRadius: 12, overflow: "hidden", backgroundColor: "#fff" }}>
      <div style={{ padding: "10px 14px", backgroundColor: "#f8f9fa", borderBottom: "1px solid #ddd" }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#333" }}>
          {proceeding?.name || proceedingAnswer.proceedingName}
        </div>
        {proceeding && (
          <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
            {proceeding.court && <span>{proceeding.court} • </span>}
            <span>{proceeding.date}</span>
            {proceeding.status && <span> • {proceeding.status}</span>}
          </div>
        )}
      </div>
      
      <div style={{ padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ padding: "6px 12px", borderRadius: 6, fontSize: 14, fontWeight: 700, backgroundColor: color.bg, color: color.text }}>
            {getAnswerEmoji(proceedingAnswer.answer)} {proceedingAnswer.answer}
          </span>
          <span style={{ fontSize: 12, color: "#666" }}>{proceedingAnswer.confidence}%</span>
        </div>
        
        <div style={{ 
          display: "flex", 
          gap: 12, 
          marginBottom: 10, 
          padding: 8, 
          backgroundColor: contestedCount > 0 ? "#fff8e1" : "#f8f9fa", 
          borderRadius: 6,
          fontSize: 11
        }}>
          <span style={{ color: "#28a745" }}>✅ {positiveCount} positive</span>
          <span style={{ color: "#dc3545" }}>
            ❌ {negativeCount} negative
            {contestedCount > 0 && (
              <span style={{ color: "#c2185b" }}> ({contestedCount} contested)</span>
            )}
          </span>
          {neutralCount > 0 && <span style={{ color: "#6c757d" }}>➖ {neutralCount} neutral</span>}
        </div>
        
        <div style={{ fontSize: 13, color: "#333", lineHeight: 1.5, marginBottom: 10 }}>
          {proceedingAnswer.shortAnswer}
        </div>
        
        {factors.length > 0 && (
          <div style={{ borderTop: "1px solid #eee", paddingTop: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#888", textTransform: "uppercase", marginBottom: 6 }}>Key Factors ({factors.length})</div>
            {factors.map((f: any, i: number) => (
              <div key={i} style={{ 
                display: "flex", 
                alignItems: "flex-start", 
                gap: 6, 
                fontSize: 12, 
                marginBottom: 4,
                padding: 4,
                backgroundColor: f.isContested ? "#fff8e1" : "transparent",
                borderRadius: 4
              }}>
                <span style={{ fontSize: 11 }}>{f.supports === "yes" ? "✅" : f.supports === "no" ? "❌" : "➖"}</span>
                <span style={{ color: "#555" }}>
                  {f.factor}
                  {f.isContested && <span style={{ color: "#c2185b", fontSize: 10 }}> ⚠️ CONTESTED</span>}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KeyFactorRow({ factor }: { factor: any }) {
  const icon = factor.supports === "yes" ? "✅" : factor.supports === "no" ? "❌" : "➖";
  
  return (
    <div style={{ 
      display: "flex", 
      alignItems: "flex-start", 
      gap: 8, 
      padding: 10,
      backgroundColor: factor.isContested ? "#fff8e1" : "#fff",
      borderRadius: 6,
      border: factor.isContested ? "1px solid #ffe082" : "1px solid #ddd"
    }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600, fontSize: 13, color: "#333" }}>{factor.factor}</span>
          {factor.isContested && (
            <Badge bg="#fce4ec" color="#c2185b">⚠️ CONTESTED</Badge>
          )}
          {factor.factualBasis && factor.factualBasis !== "established" && (
            <Badge bg="#fff3e0" color="#e65100">{factor.factualBasis.toUpperCase()}</Badge>
          )}
        </div>
        <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>{factor.explanation}</div>
        {factor.isContested && factor.contestedBy && (
          <div style={{ fontSize: 11, color: "#c2185b", marginTop: 4, fontStyle: "italic" }}>
            Contested by: {factor.contestedBy}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Single Question Answer Banner
// ============================================================================

function QuestionAnswerBanner({ questionAnswer }: { questionAnswer: any }) {
  const answerColors: Record<string, { bg: string; text: string; border: string }> = {
    "YES": { bg: "#d4edda", text: "#155724", border: "#28a745" },
    "NO": { bg: "#f8d7da", text: "#721c24", border: "#dc3545" },
    "PARTIALLY": { bg: "#fff3cd", text: "#856404", border: "#ffc107" },
    "INSUFFICIENT-EVIDENCE": { bg: "#e9ecef", text: "#495057", border: "#6c757d" },
  };
  
  const color = answerColors[questionAnswer.answer] || answerColors["PARTIALLY"];
  
  return (
    <div style={{ border: `2px solid ${color.border}`, borderRadius: 12, marginBottom: 20, overflow: "hidden", backgroundColor: "#fff" }}>
      <div style={{ padding: "12px 16px", backgroundColor: "#f0f7ff", borderBottom: "1px solid #ddd" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#0056b3", textTransform: "uppercase", marginBottom: 4 }}>📝 Question</div>
        <div style={{ fontSize: 16, color: "#333", fontStyle: "italic" }}>"{questionAnswer.question}"</div>
      </div>
      
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span style={{ padding: "10px 20px", borderRadius: 8, fontSize: 20, fontWeight: 700, backgroundColor: color.bg, color: color.text }}>
            {getAnswerEmoji(questionAnswer.answer)} {questionAnswer.answer}
          </span>
          <span style={{ fontSize: 14, color: "#666" }}>{questionAnswer.confidence}%</span>
        </div>
        
        <div style={{ padding: 14, backgroundColor: "#f8f9fa", borderRadius: 8, borderLeft: `4px solid ${color.border}` }}>
          <div style={{ fontSize: 15, color: "#333", lineHeight: 1.5 }}>{questionAnswer.shortAnswer}</div>
        </div>
      </div>
      
      {questionAnswer.keyFactors?.length > 0 && (
        <div style={{ padding: "12px 16px", backgroundColor: "#f8f9fa", borderTop: "1px solid #eee" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#666", marginBottom: 10 }}>KEY FACTORS</div>
          {questionAnswer.keyFactors.map((factor: any, i: number) => (
            <KeyFactorRow key={i} factor={factor} />
          ))}
        </div>
      )}
    </div>
  );
}

function getAnswerEmoji(answer: string): string {
  switch (answer) {
    case "YES": return "✅";
    case "NO": return "❌";
    case "PARTIALLY": return "⚠️";
    default: return "❓";
  }
}

// ============================================================================
// Article Verdict Banner
// ============================================================================

function ArticleVerdictBanner({ articleAnalysis, fallbackThesis }: { articleAnalysis: any; fallbackThesis?: string }) {
  const verdictColors: Record<string, { bg: string; text: string; border: string }> = {
    "CREDIBLE": { bg: "#d4edda", text: "#155724", border: "#28a745" },
    "ANSWER-PROVIDED": { bg: "#e3f2fd", text: "#1565c0", border: "#2196f3" },
    "MOSTLY-CREDIBLE": { bg: "#d1ecf1", text: "#0c5460", border: "#17a2b8" },
    "MISLEADING": { bg: "#fff3cd", text: "#856404", border: "#ffc107" },
    "FALSE": { bg: "#f8d7da", text: "#721c24", border: "#dc3545" },
  };
  
  const color = verdictColors[articleAnalysis.articleVerdict] || verdictColors["MISLEADING"];
  
  // Use fallback if thesis is unknown or empty
  const thesis = (!articleAnalysis.articleThesis || 
                  articleAnalysis.articleThesis === "<UNKNOWN>" || 
                  articleAnalysis.articleThesis.toLowerCase().includes("unknown"))
    ? (fallbackThesis || "—")
    : articleAnalysis.articleThesis;
  
  return (
    <div style={{ border: `2px solid ${color.border}`, borderRadius: 12, marginBottom: 20, overflow: "hidden", backgroundColor: "#fff" }}>
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span style={{ padding: "8px 16px", borderRadius: 6, fontSize: 18, fontWeight: 700, backgroundColor: color.bg, color: color.text }}>
            {articleAnalysis.articleVerdict}
          </span>
          <span style={{ fontSize: 14, color: "#666" }}>{articleAnalysis.articleConfidence}%</span>
        </div>
        <div><b>Thesis:</b> {thesis}</div>
      </div>
    </div>
  );
}

// ============================================================================
// Two-Panel Summary
// ============================================================================

function TwoPanelSummary({ articleSummary, factharborAnalysis, isQuestion }: { articleSummary: any; factharborAnalysis: any; isQuestion?: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
      <div style={{ border: "1px solid #ddd", borderRadius: 12, overflow: "hidden", backgroundColor: "#fff" }}>
        <div style={{ padding: "10px 14px", backgroundColor: "#f8f9fa", borderBottom: "1px solid #ddd" }}>
          <b>{isQuestion ? "❓ The Question" : "📄 Article"}</b>
        </div>
        <div style={{ padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#666", textTransform: "uppercase", marginBottom: 2 }}>Title</div>
          <div style={{ fontSize: 13, marginBottom: 12 }}>{decodeHtmlEntities(articleSummary.title)}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#666", textTransform: "uppercase", marginBottom: 2 }}>Implied Claim</div>
          <div style={{ fontSize: 13 }}>{decodeHtmlEntities(articleSummary.mainArgument)}</div>
        </div>
      </div>
      
      <div style={{ border: "2px solid #007bff", borderRadius: 12, overflow: "hidden", backgroundColor: "#fff" }}>
        <div style={{ padding: "10px 14px", backgroundColor: "#f8f9fa", borderBottom: "1px solid #ddd" }}>
          <b>🔍 FactHarbor Analysis</b>
        </div>
        <div style={{ padding: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#666", textTransform: "uppercase", marginBottom: 2 }}>Source Credibility</div>
          <div style={{ fontSize: 13, marginBottom: 12 }}>{factharborAnalysis.sourceCredibility}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#666", textTransform: "uppercase", marginBottom: 2 }}>Methodology</div>
          <div style={{ fontSize: 13, marginBottom: 12 }}>{factharborAnalysis.methodologyAssessment}</div>
          <div style={{ textAlign: "center", padding: 12, backgroundColor: "#f0f7ff", borderRadius: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#666" }}>OVERALL</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#007bff", whiteSpace: "pre-line" }}>{factharborAnalysis.overallVerdict}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Claims Components
// ============================================================================

function ClaimsGroupedByProceeding({ claimVerdicts, proceedings }: { claimVerdicts: any[]; proceedings: any[] }) {
  const claimsByProc = new Map<string, any[]>();
  for (const cv of claimVerdicts) {
    const procId = cv.relatedProceedingId || "general";
    if (!claimsByProc.has(procId)) claimsByProc.set(procId, []);
    claimsByProc.get(procId)!.push(cv);
  }
  
  return (
    <div>
      {Array.from(claimsByProc.entries()).map(([procId, claims]) => {
        if (claims.length === 0) return null;
        const proc = proceedings.find((p: any) => p.id === procId);
        return (
          <div key={procId} style={{ marginBottom: 20 }}>
            <h4 style={{ margin: "0 0 10px", padding: "8px 12px", backgroundColor: "#f0f7ff", borderRadius: 6, fontSize: 13, color: "#0056b3" }}>
              {proc ? `⚖️ ${proc.shortName}: ${proc.name}` : "General Claims"}
            </h4>
            {claims.map((cv: any) => <ClaimCard key={cv.claimId} claim={cv} />)}
          </div>
        );
      })}
    </div>
  );
}

function ClaimCard({ claim }: { claim: any }) {
  const colors: Record<string, { border: string; bg: string; text: string }> = {
    "WELL-SUPPORTED": { border: "#28a745", bg: "#d4edda", text: "#155724" },
    "PARTIALLY-SUPPORTED": { border: "#ffc107", bg: "#fff3cd", text: "#856404" },
    "UNCERTAIN": { border: "#ffc107", bg: "#fff3cd", text: "#856404" },
    "REFUTED": { border: "#dc3545", bg: "#f8d7da", text: "#721c24" },
  };
  const color = colors[claim.verdict] || colors["UNCERTAIN"];
  
  return (
    <div style={{ padding: 14, border: "1px solid #ddd", borderLeft: `4px solid ${color.border}`, borderRadius: 8, backgroundColor: "#fff", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontWeight: 600, color: "#666" }}>{claim.claimId}</span>
        {claim.isCentral && <Badge bg="#e8f4fd" color="#0056b3">🔑 Central</Badge>}
        <Badge bg={color.bg} color={color.text}>
          {claim.verdict} ({claim.confidence}%)
        </Badge>
      </div>
      <div style={{ fontSize: 14, fontStyle: "italic", color: "#333", marginBottom: 8 }}>"{claim.claimText}"</div>
      <div style={{ fontSize: 13, color: "#555", lineHeight: 1.5 }}>{claim.reasoning}</div>
    </div>
  );
}

function ClaimHighlighter({ originalText, claimVerdicts }: { originalText: string; claimVerdicts: any[] }) {
  return (
    <div>
      <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8, backgroundColor: "#f8f9fa", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
        {originalText}
      </div>
      
      <div style={{ marginTop: 16 }}>
        <h4 style={{ margin: "0 0 8px" }}>Claims Found:</h4>
        {claimVerdicts.map((cv: any) => (
          <div key={cv.claimId} style={{ 
            display: "flex", 
            alignItems: "flex-start", 
            gap: 10, 
            padding: 10, 
            marginBottom: 6, 
            backgroundColor: cv.highlightColor === "green" ? "#d4edda" : cv.highlightColor === "red" ? "#f8d7da" : "#fff3cd", 
            borderRadius: 6 
          }}>
            <span style={{ fontWeight: 600, minWidth: 50 }}>{cv.claimId}</span>
            <div>
              <div style={{ fontWeight: 500 }}>{cv.claimText}</div>
              <div style={{ fontSize: 12, color: "#666" }}>{cv.verdict} ({cv.confidence}%)</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
