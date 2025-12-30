/**
 * Job Results Page v2.4.1 - Contested Factor Display
 * 
 * New in v2.4.1:
 * - Contested Factor Badges: Shows when factors are disputed
 * - Factor Analysis Display: Shows positive/negative/contested counts
 * - Calibration Notes: Explains when contested factors affected verdict
 * 
 * @version 2.4.1
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
  const params = useParams();
  const jobId = params?.id as string;
  
  const [job, setJob] = useState<Job | null>(null);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [tab, setTab] = useState<"report" | "json" | "events" | "summary" | "article">("summary");
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

  if (!jobId) return <div style={{ padding: 20 }}>Loading job ID...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h1 style={{ margin: "8px 0 0" }}>FactHarbor Analysis</h1>

      {err && <div style={{ color: "#f88", padding: 12, backgroundColor: "#2a1a1a", borderRadius: 8 }}>Error: {err}</div>}

      {job ? (
        <div style={{ border: "1px solid #333", borderRadius: 10, padding: 12 }}>
          <div><b>ID:</b> <code>{job.jobId}</code></div>
          <div><b>Status:</b> <code>{job.status}</code> ({job.progress}%)</div>
          <div><b>Created:</b> {job.createdUtc}</div>
          <div style={{ marginTop: 8 }}><b>Input:</b> <code>{job.inputType}</code> — {job.inputPreview ?? "—"}</div>
          {hasV22Data && (
            <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <span><b>Schema:</b> <code>{schemaVersion}</code></span>
              {result.meta.analysisId && <span>— <b>ID:</b> <code>{result.meta.analysisId}</code></span>}
              {isQuestion && <Badge bg="#e3f2fd" color="#1565c0">📝 QUESTION</Badge>}
              {hasMultipleProceedings && <Badge bg="#fff3e0" color="#e65100">⚖️ {proceedings.length} PROCEEDINGS</Badge>}
              {hasContestedFactors && <Badge bg="#fce4ec" color="#c2185b">⚠️ CONTESTED FACTORS</Badge>}
            </div>
          )}
        </div>
      ) : (
        <div>Loading…</div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {hasV22Data && (
          <>
            <button onClick={() => setTab("summary")} style={tabStyle(tab === "summary")}>📊 Summary</button>
            <button onClick={() => setTab("article")} style={tabStyle(tab === "article")} disabled={!claimVerdicts.length}>📖 Article View</button>
          </>
        )}
        <button onClick={() => setTab("report")} style={tabStyle(tab === "report")}>📝 Report</button>
        <button onClick={() => setTab("json")} style={tabStyle(tab === "json")}>🔧 JSON</button>
        <button onClick={() => setTab("events")} style={tabStyle(tab === "events")}>📋 Events ({events.length})</button>
      </div>

      {/* Summary Tab */}
      {tab === "summary" && hasV22Data && (
        <div style={{ border: "1px solid #333", borderRadius: 10, padding: 16 }}>
          {isQuestion && questionAnswer && (
            hasMultipleProceedings 
              ? <MultiProceedingAnswerBanner questionAnswer={questionAnswer} proceedings={proceedings} />
              : <QuestionAnswerBanner questionAnswer={questionAnswer} />
          )}
          
          {!isQuestion && articleAnalysis && (
            <ArticleVerdictBanner articleAnalysis={articleAnalysis} />
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

      {/* Article View Tab */}
      {tab === "article" && hasV22Data && (
        <div style={{ border: "1px solid #333", borderRadius: 10, padding: 16 }}>
          <ClaimHighlighter originalText={job?.inputValue || ""} claimVerdicts={claimVerdicts} />
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

// Utility components
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
// Multi-Proceeding Answer Banner (v2.4.1 - with contested factor display)
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
      {/* Question Header */}
      <div style={{ padding: "12px 16px", backgroundColor: "#f0f7ff", borderRadius: "12px 12px 0 0", border: "1px solid #90caf9", borderBottom: "none" }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "#0056b3", textTransform: "uppercase", marginBottom: 4 }}>
          📝 Question Asked
        </div>
        <div style={{ fontSize: 16, color: "#333", fontStyle: "italic" }}>
          "{questionAnswer.question}"
        </div>
      </div>
      
      {/* Multi-Proceeding Notice */}
      <div style={{ padding: "10px 16px", backgroundColor: "#fff3e0", border: "1px solid #ffcc80", borderBottom: "none", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 18 }}>⚖️</span>
        <span style={{ fontSize: 13, color: "#e65100", fontWeight: 600 }}>
          {proceedings.length} distinct legal proceedings analyzed separately
        </span>
        {questionAnswer.hasContestedFactors && (
          <Badge bg="#fce4ec" color="#c2185b">⚠️ Contains contested factors</Badge>
        )}
      </div>
      
      {/* Overall Answer */}
      <div style={{ padding: 16, border: `2px solid ${overallColor.border}`, backgroundColor: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#666", textTransform: "uppercase" }}>Overall Answer</span>
          <span style={{ padding: "10px 20px", borderRadius: 8, fontSize: 20, fontWeight: 700, backgroundColor: overallColor.bg, color: overallColor.text }}>
            {getAnswerEmoji(questionAnswer.answer)} {questionAnswer.answer}
          </span>
          <span style={{ fontSize: 14, color: "#666" }}>{questionAnswer.confidence}% confidence</span>
        </div>
        
        {/* Calibration Note (v2.4.1) */}
        {questionAnswer.calibrationNote && (
          <div style={{ padding: 10, backgroundColor: "#fff8e1", borderRadius: 6, marginBottom: 12, border: "1px solid #ffe082" }}>
            <span style={{ fontSize: 13, color: "#f57c00" }}>⚠️ {questionAnswer.calibrationNote}</span>
          </div>
        )}
        
        {/* Proceeding Summary */}
        {questionAnswer.proceedingSummary && (
          <div style={{ padding: 12, backgroundColor: "#f8f9fa", borderRadius: 8, marginBottom: 12, borderLeft: "4px solid #6c757d" }}>
            <div style={{ fontSize: 14, color: "#333" }}>{questionAnswer.proceedingSummary}</div>
          </div>
        )}
        
        {/* Short Answer */}
        <div style={{ padding: 12, backgroundColor: "#f8f9fa", borderRadius: 8, borderLeft: `4px solid ${overallColor.border}` }}>
          <div style={{ fontSize: 14, color: "#333", lineHeight: 1.5 }}>{questionAnswer.shortAnswer}</div>
        </div>
      </div>
      
      {/* Per-Proceeding Cards */}
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
      
      {/* Detailed Answer */}
      <details style={{ marginTop: 16 }}>
        <summary style={{ cursor: "pointer", fontWeight: 600, color: "#666", padding: 8 }}>📖 Show Detailed Answer</summary>
        <div style={{ padding: 12, backgroundColor: "#f8f9fa", borderRadius: 8, marginTop: 8 }}>
          <div style={{ fontSize: 14, color: "#555", lineHeight: 1.6 }}>{questionAnswer.nuancedAnswer}</div>
        </div>
      </details>
      
      {/* Overall Key Factors */}
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

// v2.4.1: Key Factor Row with contestation display
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
          
          {/* Contestation Badge (v2.4.1) */}
          {factor.isContested && (
            <span style={{ 
              padding: "2px 6px", 
              backgroundColor: "#fce4ec", 
              color: "#c2185b", 
              borderRadius: 4, 
              fontSize: 10, 
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 4
            }}>
              ⚠️ CONTESTED
            </span>
          )}
          
          {/* Factual Basis Badge */}
          {factor.factualBasis && factor.factualBasis !== "established" && (
            <span style={{ 
              padding: "2px 6px", 
              backgroundColor: factor.factualBasis === "disputed" ? "#fff3e0" : factor.factualBasis === "alleged" ? "#e3f2fd" : "#f3e5f5",
              color: factor.factualBasis === "disputed" ? "#e65100" : factor.factualBasis === "alleged" ? "#1565c0" : "#7b1fa2",
              borderRadius: 4, 
              fontSize: 10, 
              fontWeight: 600
            }}>
              {factor.factualBasis.toUpperCase()}
            </span>
          )}
        </div>
        
        <div style={{ fontSize: 13, color: "#666", marginTop: 4 }}>{factor.explanation}</div>
        
        {/* Contested By info */}
        {factor.isContested && factor.contestedBy && (
          <div style={{ fontSize: 11, color: "#c2185b", marginTop: 4, fontStyle: "italic" }}>
            Contested by: {factor.contestedBy}
            {factor.contestationReason && ` — ${factor.contestationReason}`}
          </div>
        )}
      </div>
    </div>
  );
}

// v2.4.1: Proceeding Card with factor analysis
function ProceedingCard({ proceedingAnswer, proceeding }: { proceedingAnswer: any; proceeding: any }) {
  const answerColors: Record<string, { bg: string; text: string; border: string }> = {
    "YES": { bg: "#d4edda", text: "#155724", border: "#28a745" },
    "NO": { bg: "#f8d7da", text: "#721c24", border: "#dc3545" },
    "PARTIALLY": { bg: "#fff3cd", text: "#856404", border: "#ffc107" },
    "INSUFFICIENT-EVIDENCE": { bg: "#e9ecef", text: "#495057", border: "#6c757d" },
  };
  
  const color = answerColors[proceedingAnswer.answer] || answerColors["PARTIALLY"];
  const fa = proceedingAnswer.factorAnalysis;
  const hasContested = fa?.contestedNegatives > 0;
  
  return (
    <div style={{ border: `2px solid ${color.border}`, borderRadius: 12, overflow: "hidden", backgroundColor: "#fff" }}>
      {/* Header */}
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
      
      {/* Answer */}
      <div style={{ padding: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ padding: "6px 12px", borderRadius: 6, fontSize: 14, fontWeight: 700, backgroundColor: color.bg, color: color.text }}>
            {getAnswerEmoji(proceedingAnswer.answer)} {proceedingAnswer.answer}
          </span>
          <span style={{ fontSize: 12, color: "#666" }}>{proceedingAnswer.confidence}%</span>
        </div>
        
        {/* Factor Analysis Summary (v2.4.1) */}
        {fa && (
          <div style={{ 
            display: "flex", 
            gap: 12, 
            marginBottom: 10, 
            padding: 8, 
            backgroundColor: hasContested ? "#fff8e1" : "#f8f9fa", 
            borderRadius: 6,
            fontSize: 11
          }}>
            <span style={{ color: "#28a745" }}>✅ {fa.positiveFactors} positive</span>
            <span style={{ color: "#dc3545" }}>
              ❌ {fa.negativeFactors} negative
              {fa.contestedNegatives > 0 && (
                <span style={{ color: "#c2185b" }}> ({fa.contestedNegatives} contested)</span>
              )}
            </span>
            <span style={{ color: "#6c757d" }}>➖ {fa.neutralFactors} neutral</span>
          </div>
        )}
        
        <div style={{ fontSize: 13, color: "#333", lineHeight: 1.5, marginBottom: 10 }}>
          {proceedingAnswer.shortAnswer}
        </div>
        
        {/* Key Factors */}
        {proceedingAnswer.keyFactors?.length > 0 && (
          <div style={{ borderTop: "1px solid #eee", paddingTop: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: "#888", textTransform: "uppercase", marginBottom: 6 }}>Key Factors</div>
            {proceedingAnswer.keyFactors.slice(0, 4).map((f: any, i: number) => (
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
                  {f.isContested && <span style={{ color: "#c2185b", fontSize: 10 }}> ⚠️</span>}
                </span>
              </div>
            ))}
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
        <div style={{ fontSize: 12, fontWeight: 600, color: "#0056b3", textTransform: "uppercase", marginBottom: 4 }}>📝 Question Asked</div>
        <div style={{ fontSize: 16, color: "#333", fontStyle: "italic" }}>"{questionAnswer.question}"</div>
      </div>
      
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#666", textTransform: "uppercase" }}>Answer</span>
          <span style={{ padding: "10px 20px", borderRadius: 8, fontSize: 20, fontWeight: 700, backgroundColor: color.bg, color: color.text }}>
            {getAnswerEmoji(questionAnswer.answer)} {questionAnswer.answer}
          </span>
          <span style={{ fontSize: 14, color: "#666" }}>{questionAnswer.confidence}% confidence</span>
        </div>
        
        {questionAnswer.calibrationNote && (
          <div style={{ padding: 10, backgroundColor: "#fff8e1", borderRadius: 6, marginBottom: 12, border: "1px solid #ffe082" }}>
            <span style={{ fontSize: 13, color: "#f57c00" }}>⚠️ {questionAnswer.calibrationNote}</span>
          </div>
        )}
        
        <div style={{ padding: 14, backgroundColor: "#f8f9fa", borderRadius: 8, marginBottom: 12, borderLeft: `4px solid ${color.border}` }}>
          <div style={{ fontSize: 15, color: "#333", lineHeight: 1.5 }}>{questionAnswer.shortAnswer}</div>
        </div>
        
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#666", textTransform: "uppercase", marginBottom: 4 }}>Detailed Answer</div>
          <div style={{ fontSize: 14, color: "#555", lineHeight: 1.6 }}>{questionAnswer.nuancedAnswer}</div>
        </div>
      </div>
      
      {questionAnswer.keyFactors?.length > 0 && (
        <div style={{ padding: "12px 16px", backgroundColor: "#f8f9fa", borderTop: "1px solid #eee" }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#666", textTransform: "uppercase", marginBottom: 10 }}>Key Factors</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {questionAnswer.keyFactors.map((factor: any, i: number) => (
              <KeyFactorRow key={i} factor={factor} />
            ))}
          </div>
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
    <div style={{ border: `2px solid ${color.border}`, borderRadius: 12, marginBottom: 20, overflow: "hidden", backgroundColor: "#fff" }}>
      <div style={{ padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: "#666", textTransform: "uppercase" }}>Article Verdict</span>
          <span style={{ padding: "8px 16px", borderRadius: 6, fontSize: 18, fontWeight: 700, backgroundColor: color.bg, color: color.text }}>
            {articleAnalysis.articleVerdict}
          </span>
          <span style={{ fontSize: 14, color: "#666" }}>{articleAnalysis.articleConfidence}%</span>
        </div>
        <div><span style={{ fontSize: 13, fontWeight: 600, color: "#666" }}>Thesis: </span><span style={{ fontSize: 14, color: "#333" }}>{articleAnalysis.articleThesis}</span></div>
      </div>
      
      {claimPattern && (
        <div style={{ padding: "12px 16px", backgroundColor: "#f8f9fa", borderTop: "1px solid #eee" }}>
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", fontSize: 13 }}>
            <span>Total: <b>{claimPattern.total}</b></span>
            <span style={{ color: "#28a745" }}>Supported: <b>{claimPattern.supported}</b></span>
            <span style={{ color: "#ffc107" }}>Uncertain: <b>{claimPattern.uncertain}</b></span>
            <span style={{ color: "#dc3545" }}>Refuted: <b>{claimPattern.refuted}</b></span>
          </div>
        </div>
      )}
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
          <b>{isQuestion ? "❓ The Question" : "📄 Article Claims"}</b>
        </div>
        <div style={{ padding: 14 }}>
          <FieldRow label="Title" value={articleSummary.title} />
          <FieldRow label={isQuestion ? "Implied Claim" : "Main Argument"} value={articleSummary.mainArgument} block />
        </div>
      </div>
      
      <div style={{ border: "2px solid #007bff", borderRadius: 12, overflow: "hidden", backgroundColor: "#fff" }}>
        <div style={{ padding: "10px 14px", backgroundColor: "#f8f9fa", borderBottom: "1px solid #ddd" }}>
          <b>🔍 FactHarbor Analysis</b>
        </div>
        <div style={{ padding: 14 }}>
          <FieldRow label="Source Credibility" value={factharborAnalysis.sourceCredibility} />
          <FieldRow label="Methodology" value={factharborAnalysis.methodologyAssessment} />
          <div style={{ textAlign: "center", padding: 12, backgroundColor: "#f0f7ff", borderRadius: 8, marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#666", textTransform: "uppercase" }}>Overall</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#007bff", whiteSpace: "pre-line" }}>{factharborAnalysis.overallVerdict}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Remaining Components
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
        const proc = proceedings.find(p => p.id === procId);
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
  const colors: Record<string, { border: string }> = {
    "WELL-SUPPORTED": { border: "#28a745" },
    "PARTIALLY-SUPPORTED": { border: "#ffc107" },
    "UNCERTAIN": { border: "#ffc107" },
    "REFUTED": { border: "#dc3545" },
  };
  const color = colors[claim.verdict] || colors["UNCERTAIN"];
  
  return (
    <div style={{ padding: 14, border: "1px solid #ddd", borderLeft: `4px solid ${color.border}`, borderRadius: 8, backgroundColor: "#fff", marginBottom: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontWeight: 600, color: "#666" }}>{claim.claimId}</span>
        {claim.isCentral && <Badge bg="#e8f4fd" color="#0056b3">🔑 Central</Badge>}
        <Badge bg={color.border === "#28a745" ? "#d4edda" : color.border === "#dc3545" ? "#f8d7da" : "#fff3cd"} color={color.border === "#28a745" ? "#155724" : color.border === "#dc3545" ? "#721c24" : "#856404"}>
          {claim.verdict} ({claim.confidence}%)
        </Badge>
      </div>
      <div style={{ fontSize: 14, fontStyle: "italic", color: "#333", marginBottom: 8 }}>"{claim.claimText}"</div>
      <div style={{ fontSize: 13, color: "#555", lineHeight: 1.5 }}>{claim.reasoning}</div>
    </div>
  );
}

function ClaimHighlighter({ originalText, claimVerdicts }: { originalText: string; claimVerdicts: any[] }) {
  const [enabled, setEnabled] = useState(true);
  
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, padding: "8px 12px", backgroundColor: "#f8f9fa", borderRadius: 8 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Show claims
        </label>
      </div>
      
      <div style={{ padding: 16, border: "1px solid #ddd", borderRadius: 8, backgroundColor: "#fff", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
        {originalText}
      </div>
      
      {enabled && (
        <div style={{ marginTop: 16 }}>
          {claimVerdicts.map((cv: any) => (
            <div key={cv.claimId} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: 10, marginBottom: 6, backgroundColor: cv.highlightColor === "green" ? "#d4edda" : cv.highlightColor === "red" ? "#f8d7da" : "#fff3cd", borderRadius: 6 }}>
              <span style={{ fontWeight: 600, minWidth: 50 }}>{cv.claimId}</span>
              <div>
                <div style={{ fontWeight: 500 }}>{cv.claimText}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{cv.verdict} ({cv.confidence}%)</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FieldRow({ label, value, block }: { label: string; value: string; block?: boolean }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "#666", textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
      {block ? <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5 }}>{value}</p> : <span style={{ fontSize: 13 }}>{value}</span>}
    </div>
  );
}
