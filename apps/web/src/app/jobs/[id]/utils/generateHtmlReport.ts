/**
 * generateHtmlReport.ts
 *
 * Generates a self-contained HTML report from a completed ClaimAssessmentBoundary
 * pipeline result. Dark theme, no external dependencies. Matches the template at
 * Docs/TESTREPORTS/job-4dd7f840-SRG-Linksdrall.html.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HtmlReportInput {
  job: {
    jobId: string;
    status: string;
    inputValue: string;
    createdUtc: string;
    updatedUtc: string;
  };
  result: any;           // Full resultJson
  claimVerdicts: any[];
  claimBoundaries: any[];
  evidenceItems: any[];
  sources: any[];
  searchQueries: any[];
  qualityGates: any;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function esc(str: unknown): string {
  const s = String(str ?? "");
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtUtc(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

function calcDuration(created: string, updated: string): string {
  const a = new Date(created).getTime();
  const b = new Date(updated).getTime();
  if (isNaN(a) || isNaN(b)) return "—";
  const sec = Math.round((b - a) / 1000);
  if (sec < 60) return `~${sec} sec`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s > 0 ? `~${m} min ${s} sec` : `~${m} min`;
}

function norm(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n)) return 50;
  const pct = n >= 0 && n <= 1 ? n * 100 : n;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

// Verdict → CSS class/color mappings
type VStyle = { cls: string; color: string; fill: string };
const V_STYLES: Record<string, VStyle> = {
  TRUE:           { cls: "verdict-t",   color: "t-color",   fill: "#22543d" },
  "MOSTLY-TRUE":  { cls: "verdict-t",   color: "t-color",   fill: "#22543d" },
  "LEANING-TRUE": { cls: "verdict-lt",  color: "lt-color",  fill: "#276749" },
  MIXED:          { cls: "verdict-inc",  color: "inc-color", fill: "#553c9a" },
  UNVERIFIED:     { cls: "verdict-inc",  color: "inc-color", fill: "#553c9a" },
  "LEANING-FALSE":{ cls: "verdict-lf",  color: "lf-color",  fill: "#c05621" },
  "MOSTLY-FALSE": { cls: "verdict-f",   color: "f-color",   fill: "#c53030" },
  FALSE:          { cls: "verdict-f",    color: "f-color",   fill: "#c53030" },
};
const DEFAULT_VS: VStyle = { cls: "verdict-inc", color: "inc-color", fill: "#553c9a" };

function vs(verdict: string): VStyle {
  return V_STYLES[verdict] || DEFAULT_VS;
}

function verdictFromPct(pct: number): string {
  if (pct >= 86) return "TRUE";
  if (pct >= 72) return "MOSTLY-TRUE";
  if (pct >= 58) return "LEANING-TRUE";
  if (pct >= 43) return "MIXED";
  if (pct >= 29) return "LEANING-FALSE";
  if (pct >= 15) return "MOSTLY-FALSE";
  return "FALSE";
}

function dirFillClass(dir: string): string {
  switch (dir) {
    case "supports": return "fill-supports";
    case "contradicts": return "fill-contradicts";
    case "neutral": return "fill-neutral";
    case "mixed": return "fill-mixed";
    default: return "fill-neutral";
  }
}

function dirColorClass(dir: string): string {
  switch (dir) {
    case "supports": return "dir-supports";
    case "contradicts": return "dir-contradicts";
    case "neutral": return "dir-neutral";
    case "mixed": return "lf-color";
    default: return "";
  }
}

function cellClass(count: number): string {
  if (count >= 5) return "cell-high";
  if (count >= 3) return "cell-mid";
  if (count >= 1) return "cell-low";
  return "cell-zero";
}

function challengeBadge(cr: any): { cls: string; label: string } {
  const resp = String(cr.response || "").toLowerCase();
  if (cr.verdictAdjusted) {
    if (resp.includes("partially")) return { cls: "ch-part", label: "PARTIALLY ACCEPTED &middot; verdict adjusted" };
    return { cls: "ch-yes", label: "ACCEPTED &middot; verdict adjusted" };
  }
  if (resp.includes("minimal impact")) return { cls: "ch-no", label: "ACCEPTED &mdash; minimal impact" };
  return { cls: "ch-no", label: "REJECTED" };
}

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------

function buildCss(): string {
  return `<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.5;background:#0f1117;color:#e2e8f0;min-height:100vh}
a{color:#63b3ed;text-decoration:none}a:hover{text-decoration:underline}
.page{max-width:1100px;margin:0 auto;padding:24px 16px}
.header{background:#1a1f2e;border:1px solid #2d3748;border-radius:12px;padding:20px 24px;margin-bottom:20px}
.header-top{display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:12px}
.logo{font-size:13px;font-weight:700;letter-spacing:.08em;color:#63b3ed;text-transform:uppercase}
.job-id{font-size:11px;color:#718096;font-family:monospace;margin-top:2px}
.input-claim{font-size:22px;font-weight:700;margin:16px 0 4px;color:#f7fafc}
.pipeline-meta{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.chip{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;border:1px solid}
.chip-blue{background:#1a365d;border-color:#2b6cb0;color:#90cdf4}
.chip-gray{background:#2d3748;border-color:#4a5568;color:#a0aec0}
.chip-green{background:#1c4532;border-color:#276749;color:#68d391}
.verdict-banner{border-radius:12px;padding:28px 28px 24px;margin-bottom:20px;border:2px solid}
.verdict-lf{background:#1c1409;border-color:#c05621}
.verdict-f{background:#1a0a0a;border-color:#c53030}
.verdict-lt{background:#0a1a0a;border-color:#276749}
.verdict-t{background:#061a06;border-color:#22543d}
.verdict-inc{background:#1a1520;border-color:#553c9a}
.verdict-header{display:flex;align-items:center;gap:20px;flex-wrap:wrap}
.verdict-label{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;opacity:.7;margin-bottom:4px}
.verdict-badge{font-size:26px;font-weight:800;letter-spacing:.02em}
.lf-color{color:#f6ad55}
.f-color{color:#fc8181}
.lt-color{color:#68d391}
.t-color{color:#48bb78}
.inc-color{color:#b794f4}
.meter-group{display:flex;gap:32px;flex-wrap:wrap}
.meter{text-align:center}
.meter-value{font-size:42px;font-weight:800;line-height:1}
.meter-label{font-size:11px;color:#a0aec0;margin-top:2px;font-weight:600;text-transform:uppercase;letter-spacing:.06em}
.meter-bar{width:120px;height:6px;background:#2d3748;border-radius:3px;margin-top:8px;overflow:hidden}
.meter-fill{height:100%;border-radius:3px;transition:width .3s}
.section{background:#1a1f2e;border:1px solid #2d3748;border-radius:12px;margin-bottom:16px;overflow:hidden}
.section-head{padding:14px 20px;background:#1e2535;border-bottom:1px solid #2d3748;display:flex;align-items:center;gap:10px}
.section-title{font-weight:700;font-size:14px;color:#e2e8f0}
.section-badge{font-size:11px;padding:2px 8px;border-radius:10px;background:#2d3748;color:#a0aec0;font-weight:600}
.section-body{padding:20px}
.narrative-headline{font-size:17px;font-weight:700;color:#f7fafc;margin-bottom:12px;line-height:1.4}
.narrative-block{margin-bottom:14px}
.nl{font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#63b3ed;margin-bottom:5px}
.narrative-text{color:#cbd5e0;line-height:1.65}
.boundary-disagreements{margin-top:8px;display:flex;flex-direction:column;gap:6px}
.disagreement-item{background:#0f1117;border-left:3px solid #4a5568;padding:8px 12px;border-radius:0 6px 6px 0;font-size:13px;color:#a0aec0}
.claim-head{display:flex;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:16px}
.claim-statement{font-size:16px;font-weight:700;color:#f7fafc;flex:1}
.claim-meters{display:flex;gap:20px}
.small-meter{text-align:center}
.small-meter-val{font-size:24px;font-weight:800}
.small-meter-label{font-size:10px;color:#718096;text-transform:uppercase;letter-spacing:.05em}
.reasoning-box{background:#0f1117;border:1px solid #2d3748;border-radius:8px;padding:14px;margin-bottom:16px;font-size:13px;color:#a0aec0;line-height:1.7;max-height:300px;overflow-y:auto}
details summary{cursor:pointer;user-select:none;list-style:none;display:flex;align-items:center;gap:6px}
details summary::-webkit-details-marker{display:none}
details summary::before{content:'\\25B6';font-size:10px;transition:transform .2s;display:inline-block;color:#718096}
details[open] summary::before{transform:rotate(90deg)}
details summary .sum-label{font-weight:700;font-size:13px;color:#e2e8f0}
details summary .sum-count{font-size:11px;color:#718096;margin-left:4px}
.dir-supports{color:#68d391}
.dir-contradicts{color:#fc8181}
.dir-neutral{color:#90cdf4}
.dir-bg-supports{background:#0a1a10;border-color:#276749}
.dir-bg-contradicts{background:#1a0a0a;border-color:#742a2a}
.dir-bg-neutral{background:#0a0f1a;border-color:#2a4365}
.ev-list{display:flex;flex-direction:column;gap:8px;margin-top:10px}
.ev-item{border-radius:8px;padding:10px 14px;border:1px solid;font-size:13px}
.ev-item-head{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:6px}
.ev-id{font-size:10px;font-family:monospace;color:#718096;flex-shrink:0}
.ev-dir-badge{font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;flex-shrink:0;text-transform:uppercase;letter-spacing:.05em}
.ev-sup{background:#1c4532;color:#68d391}
.ev-con{background:#742a2a;color:#fc8181}
.ev-neu{background:#1a365d;color:#90cdf4}
.ev-statement{color:#e2e8f0;line-height:1.5}
.ev-meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.ev-tag{font-size:10px;padding:2px 7px;border-radius:8px;background:#2d3748;color:#a0aec0}
.ev-source-link{font-size:10px;color:#63b3ed;margin-top:4px;word-break:break-all}
.bf-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:10px}
.bf-card{background:#0f1117;border:1px solid #2d3748;border-radius:8px;padding:14px}
.bf-name{font-weight:700;font-size:13px;color:#e2e8f0;margin-bottom:8px;line-height:1.3}
.bf-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
.bf-key{font-size:11px;color:#718096}
.bf-val{font-size:12px;font-weight:700}
.bf-bar-bg{background:#2d3748;height:4px;border-radius:2px;margin-top:6px;overflow:hidden}
.bf-bar-fill{height:100%;border-radius:2px}
.fill-supports{background:#68d391}
.fill-contradicts{background:#fc8181}
.fill-neutral{background:#90cdf4}
.fill-mixed{background:#f6ad55}
.matrix-wrap{overflow-x:auto}
.matrix-table{border-collapse:collapse;width:100%;font-size:12px}
.matrix-table th{padding:6px 10px;background:#1e2535;border:1px solid #2d3748;color:#a0aec0;font-weight:600;text-align:center;white-space:nowrap}
.matrix-table td{padding:6px 10px;border:1px solid #2d3748;text-align:center}
.matrix-table td.claim-col{text-align:left;font-weight:700;color:#e2e8f0;white-space:nowrap}
.cell-val{font-weight:800;padding:4px 8px;border-radius:6px;display:inline-block;min-width:32px}
.cell-high{background:#1c4532;color:#68d391}
.cell-mid{background:#7b4c1a;color:#f6ad55}
.cell-low{background:#742a2a;color:#fc8181}
.cell-zero{background:#2d3748;color:#718096}
.boundary-accord{margin-bottom:8px;border:1px solid #2d3748;border-radius:8px;overflow:hidden}
.boundary-accord summary{padding:12px 16px;background:#1e2535;cursor:pointer;display:flex;align-items:center;gap:10px}
.boundary-accord summary::-webkit-details-marker{display:none}
.boundary-accord[open] summary{border-bottom:1px solid #2d3748}
.ba-arrow{font-size:10px;color:#718096;transition:transform .2s;flex-shrink:0}
details[open] .ba-arrow{transform:rotate(90deg)}
.ba-id{font-size:11px;font-family:monospace;color:#718096}
.ba-name{font-weight:700;font-size:13px;color:#e2e8f0;flex:1}
.ba-ev-count{font-size:11px;background:#2d3748;color:#a0aec0;padding:2px 8px;border-radius:10px}
.boundary-body{padding:14px 16px}
.boundary-meta-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;font-size:12px}
.bm-item{display:flex;flex-direction:column;gap:2px}
.bm-label{color:#718096;font-size:11px}
.bm-val{color:#e2e8f0;font-weight:600}
.challenge-list{display:flex;flex-direction:column;gap:8px;margin-top:8px}
.challenge-item{border-radius:8px;padding:10px 14px;border:1px solid #2d3748;background:#0f1117;font-size:12px}
.ch-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.ch-type{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#a0aec0}
.ch-adj{font-size:10px;font-weight:700;padding:2px 7px;border-radius:8px}
.ch-yes{background:#1c4532;color:#68d391}
.ch-no{background:#2d3748;color:#a0aec0}
.ch-part{background:#7b4c1a;color:#f6ad55}
.source-list{display:flex;flex-direction:column;gap:8px}
.source-item{background:#0f1117;border:1px solid #2d3748;border-radius:8px;padding:10px 14px;font-size:12px}
.source-head{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;margin-bottom:4px}
.source-id{font-family:monospace;font-size:10px;color:#718096;flex-shrink:0}
.source-title{font-weight:600;color:#e2e8f0;flex:1;line-height:1.3}
.source-url{color:#63b3ed;font-size:11px;word-break:break-all}
.source-tags{display:flex;gap:6px;margin-top:5px;flex-wrap:wrap}
.query-table{width:100%;border-collapse:collapse;font-size:12px}
.query-table th{text-align:left;padding:6px 10px;background:#1e2535;border:1px solid #2d3748;color:#a0aec0;font-weight:600}
.query-table td{padding:6px 10px;border:1px solid #2d3748;color:#cbd5e0;vertical-align:top}
.query-table tr:nth-child(odd) td{background:#0f1117}
.focus-main{color:#68d391}
.focus-contr{color:#f6ad55}
.focus-prel{color:#90cdf4}
.gates-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}
.gate-card{background:#0f1117;border:1px solid #2d3748;border-radius:8px;padding:14px}
.gate-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em;color:#63b3ed;margin-bottom:10px}
.gate-stat{display:flex;justify-content:space-between;margin-bottom:4px;font-size:12px}
.gate-stat-key{color:#718096}
.gate-stat-val{font-weight:700;color:#e2e8f0}
.footer{text-align:center;padding:20px 0 8px;font-size:11px;color:#4a5568}
@media(max-width:600px){
  .meter-group{gap:16px}
  .meter-value{font-size:32px}
  .claim-head{flex-direction:column}
  .boundary-meta-grid{grid-template-columns:1fr}
}
</style>`;
}

// ---------------------------------------------------------------------------
// Section builders
// ---------------------------------------------------------------------------

function buildHeader(input: HtmlReportInput): string {
  const { job, result, claimVerdicts, claimBoundaries, evidenceItems, sources, searchQueries } = input;
  const meta = result?.meta || {};
  const understanding = result?.understanding;
  const inputType = understanding?.detectedInputType || "claim";

  const llmCalls = meta.llmCallCount ?? meta.totalLlmCalls ?? "—";
  const totalSearches = searchQueries.length || result?.researchStats?.totalSearches || 0;
  const claimCount = (result?.atomicClaims || result?.understanding?.atomicClaims || []).length || claimVerdicts.length;
  const boundaryCount = claimBoundaries.length;
  const evCount = evidenceItems.length;
  const srcCount = sources.length;

  return `<!-- HEADER -->
<div class="header">
  <div class="header-top">
    <div>
      <div class="logo">FactHarbor Analysis Report</div>
      <div class="job-id">Job: ${esc(job.jobId)}</div>
    </div>
    <div style="text-align:right;font-size:11px;color:#718096">
      <div>Created: ${esc(fmtUtc(job.createdUtc))}</div>
      <div>Completed: ${esc(fmtUtc(job.updatedUtc))}</div>
      <div>Duration: ${esc(calcDuration(job.createdUtc, job.updatedUtc))}</div>
    </div>
  </div>
  <div class="input-claim">${esc(job.inputValue)}</div>
  <div style="font-size:12px;color:#718096;margin-bottom:10px">Detected input type: <strong style="color:#a0aec0">${esc(inputType)}</strong></div>
  <div class="pipeline-meta">
    <span class="chip chip-blue">&#127891; ${esc(meta.pipeline || "claimboundary")} pipeline</span>
    <span class="chip chip-gray">&#129302; ${esc(meta.model || "—")}</span>
    ${meta.searchProviders ? `<span class="chip chip-gray">&#128269; ${esc(Array.isArray(meta.searchProviders) ? meta.searchProviders.join(" &amp; ") : meta.searchProviders)}</span>` : ""}
    <span class="chip chip-gray">${esc(llmCalls)} LLM calls</span>
    <span class="chip chip-gray">${esc(totalSearches)} searches</span>
    <span class="chip chip-gray">${claimCount} claim${claimCount !== 1 ? "s" : ""} · ${boundaryCount} boundaries · ${evCount} evidence items · ${srcCount} sources</span>
    <span class="chip chip-green">${esc(job.status)}</span>
  </div>
</div>`;
}

function buildVerdictBanner(input: HtmlReportInput): string {
  const { result, claimVerdicts } = input;
  const truthPct = norm(result?.truthPercentage ?? claimVerdicts[0]?.truthPercentage);
  const conf = norm(result?.confidence ?? claimVerdicts[0]?.confidence);
  const verdict = result?.overallVerdict || claimVerdicts[0]?.verdict || verdictFromPct(truthPct);
  const v = vs(verdict);
  const narrative = result?.verdictNarrative;
  const keyFinding = narrative?.keyFinding || "";

  return `<!-- VERDICT BANNER -->
<div class="verdict-banner ${v.cls}">
  <div class="verdict-header">
    <div>
      <div class="verdict-label">Overall Verdict</div>
      <div class="verdict-badge ${v.color}">${esc(verdict)}</div>
      ${keyFinding ? `<div style="font-size:12px;color:#a0aec0;margin-top:6px">${esc(keyFinding.length > 120 ? keyFinding.slice(0, 120) + "…" : keyFinding)}</div>` : ""}
    </div>
    <div class="meter-group">
      <div class="meter">
        <div class="meter-value ${v.color}">${truthPct}%</div>
        <div class="meter-label">Truth</div>
        <div class="meter-bar"><div class="meter-fill" style="width:${truthPct}%;background:${v.fill}"></div></div>
      </div>
      <div class="meter">
        <div class="meter-value" style="color:#a0aec0">${conf}%</div>
        <div class="meter-label">Confidence</div>
        <div class="meter-bar"><div class="meter-fill" style="width:${conf}%;background:#4a5568"></div></div>
      </div>
    </div>
    ${keyFinding && keyFinding.length > 120 ? `<div style="max-width:380px">
      <div style="font-size:11px;color:#a0aec0;font-weight:700;text-transform:uppercase;letter-spacing:.07em;margin-bottom:6px">Key finding</div>
      <div style="font-size:13px;color:#cbd5e0;line-height:1.6">${esc(keyFinding)}</div>
    </div>` : ""}
  </div>
</div>`;
}

function buildVerdictNarrative(narrative: any): string {
  if (!narrative) return "";
  const disagreements = narrative.boundaryDisagreements || [];
  return `<!-- VERDICT NARRATIVE -->
<div class="section">
  <div class="section-head">
    <span>&#128196;</span>
    <span class="section-title">Verdict Narrative</span>
  </div>
  <div class="section-body">
    ${narrative.headline ? `<div class="narrative-headline">${esc(narrative.headline)}</div>` : ""}
    ${narrative.evidenceBaseSummary ? `<div class="narrative-block">
      <div class="nl">Evidence Base</div>
      <div class="narrative-text">${esc(narrative.evidenceBaseSummary)}</div>
    </div>` : ""}
    ${narrative.keyFinding ? `<div class="narrative-block">
      <div class="nl">Key Finding</div>
      <div class="narrative-text">${esc(narrative.keyFinding)}</div>
    </div>` : ""}
    ${disagreements.length > 0 ? `<div class="narrative-block">
      <div class="nl">Boundary Disagreements</div>
      <div class="boundary-disagreements">
        ${disagreements.map((d: string) => `<div class="disagreement-item">${esc(d)}</div>`).join("\n        ")}
      </div>
    </div>` : ""}
    ${narrative.limitations ? `<div class="narrative-block">
      <div class="nl">Limitations</div>
      <div class="narrative-text" style="color:#a0aec0">${esc(narrative.limitations)}</div>
    </div>` : ""}
  </div>
</div>`;
}

function buildClaimVerdicts(input: HtmlReportInput): string {
  const { claimVerdicts, result } = input;
  if (!claimVerdicts.length) return "";
  const atomicClaims = result?.atomicClaims || result?.understanding?.atomicClaims || [];

  return claimVerdicts.map((cv: any, idx: number) => {
    const ac = atomicClaims.find((a: any) => a.id === cv.claimId) || {};
    const tp = norm(cv.truthPercentage);
    const conf = norm(cv.confidence);
    const verdict = cv.verdict || verdictFromPct(tp);
    const v = vs(verdict);
    const bfs = cv.boundaryFindings || [];
    const challenges = cv.challengeResponses || [];
    const tri = cv.triangulationScore;

    return `<!-- CLAIM VERDICT -->
<div class="section">
  <div class="section-head">
    <span>&#9878;&#65039;</span>
    <span class="section-title">Atomic Claim — ${esc(cv.claimId || `AC_${String(idx + 1).padStart(2, "0")}`)}</span>
    <span class="section-badge">${idx + 1} of ${claimVerdicts.length}</span>
  </div>
  <div class="section-body">
    <div class="claim-head">
      <div class="claim-statement">${esc(ac.statement || cv.claimId || "")}</div>
      <div class="claim-meters">
        <div class="small-meter">
          <div class="small-meter-val ${v.color}">${tp}%</div>
          <div class="small-meter-label">Truth</div>
        </div>
        <div class="small-meter">
          <div class="small-meter-val" style="color:#a0aec0">${conf}%</div>
          <div class="small-meter-label">Confidence</div>
        </div>
      </div>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px">
      ${ac.category ? `<span class="chip chip-gray">Category: ${esc(ac.category)}</span>` : ""}
      ${ac.centrality ? `<span class="chip chip-gray">Centrality: ${esc(ac.centrality)}</span>` : ""}
      ${ac.harmPotential ? `<span class="chip chip-gray">Harm potential: ${esc(ac.harmPotential)}</span>` : ""}
      ${ac.checkWorthiness ? `<span class="chip chip-gray">Check-worthiness: ${esc(ac.checkWorthiness)}</span>` : ""}
      ${cv.isContested ? `<span class="chip chip-gray">Contested: yes</span>` : ""}
      ${tri ? `<span class="chip chip-gray">Triangulation: ${esc(tri.level)} (${typeof tri.factor === "number" ? (tri.factor >= 0 ? "+" : "") + tri.factor.toFixed(1) : "—"})</span>` : ""}
    </div>
    ${bfs.length > 0 ? buildBoundaryFindingsGrid(bfs) : ""}
    ${(cv.reasoning || challenges.length > 0) ? buildReasoningAndChallenges(cv.reasoning, challenges) : ""}
  </div>
</div>`;
  }).join("\n");
}

function buildBoundaryFindingsGrid(findings: any[]): string {
  return `<div style="margin-bottom:16px">
      <div style="font-size:12px;font-weight:700;color:#a0aec0;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Per-Boundary Findings</div>
      <div class="bf-grid">
        ${findings.map((bf: any) => {
          const tp = norm(bf.truthPercentage);
          const conf = norm(bf.confidence);
          const dir = bf.evidenceDirection || "neutral";
          const verdictStr = verdictFromPct(tp);
          const dirColor = dir === "mixed" ? 'style="color:#f6ad55"' :
                           dir === "contradicts" ? 'style="color:#fc8181"' :
                           dir === "supports" ? 'style="color:#68d391"' :
                           'style="color:#90cdf4"';
          const tpColor = vs(verdictStr).color;
          return `<div class="bf-card">
          <div class="bf-name">${esc(bf.boundaryId)} · ${esc(bf.boundaryName)}</div>
          <div class="bf-row"><span class="bf-key">Truth</span><span class="bf-val ${tpColor}">${tp}%</span></div>
          <div class="bf-row"><span class="bf-key">Confidence</span><span class="bf-val">${conf}%</span></div>
          <div class="bf-row"><span class="bf-key">Direction</span><span class="bf-val" ${dirColor}>${esc(dir)}</span></div>
          <div class="bf-row"><span class="bf-key">Evidence</span><span class="bf-val">${bf.evidenceCount ?? 0} items</span></div>
          <div class="bf-bar-bg"><div class="bf-bar-fill ${dirFillClass(dir)}" style="width:${tp}%"></div></div>
        </div>`;
        }).join("\n        ")}
      </div>
    </div>`;
}

function buildReasoningAndChallenges(reasoning: string, challenges: any[]): string {
  return `<details style="margin-bottom:16px">
      <summary style="padding:10px 0"><span class="sum-label">Full Reasoning &amp; Challenge Responses</span>${challenges.length > 0 ? `<span class="sum-count">(${challenges.length} challenges evaluated)</span>` : ""}</summary>
      ${reasoning ? `<div class="reasoning-box" style="margin-top:10px;max-height:none">
        <p style="margin-bottom:10px;font-weight:700;color:#e2e8f0">Verdict Reasoning</p>
        <div style="white-space:pre-wrap">${esc(reasoning)}</div>
      </div>` : ""}
      ${challenges.length > 0 ? `<div class="challenge-list">
        <p style="font-size:12px;font-weight:700;color:#a0aec0;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px">Challenge Responses</p>
        ${challenges.map((cr: any) => {
          const badge = challengeBadge(cr);
          return `<div class="challenge-item">
          <div class="ch-head"><span class="ch-type">${esc(cr.challengeType || "")}</span><span class="ch-adj ${badge.cls}">${badge.label}</span></div>
          <div class="ch-response">${esc(cr.response || "")}</div>
        </div>`;
        }).join("\n        ")}
      </div>` : ""}
    </details>`;
}

function buildClaimBoundariesSection(input: HtmlReportInput): string {
  const { claimBoundaries, result, claimVerdicts } = input;
  if (!claimBoundaries.length) return "";
  const coverageMatrix = result?.coverageMatrix;
  const atomicClaims = result?.atomicClaims || result?.understanding?.atomicClaims || [];

  return `<!-- CLAIM ASSESSMENT BOUNDARIES -->
<div class="section">
  <div class="section-head">
    <span>&#128202;</span>
    <span class="section-title">ClaimAssessmentBoundaries</span>
    <span class="section-badge">${claimBoundaries.length} boundaries</span>
  </div>
  <div class="section-body">
    ${coverageMatrix ? buildCoverageMatrix(coverageMatrix, claimVerdicts, atomicClaims, claimBoundaries) : ""}
    ${claimBoundaries.map((cb: any) => buildBoundaryAccordion(cb)).join("\n    ")}
  </div>
</div>`;
}

function buildCoverageMatrix(matrix: any, claimVerdicts: any[], atomicClaims: any[], boundaries: any[]): string {
  if (!matrix?.claims?.length || !matrix?.boundaries?.length || !matrix?.counts?.length) return "";

  const boundaryMap = new Map(boundaries.map((b: any) => [b.id, b]));

  return `<div style="margin-bottom:20px">
      <div style="font-size:12px;font-weight:700;color:#a0aec0;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">Coverage Matrix</div>
      <div class="matrix-wrap">
        <table class="matrix-table">
          <thead><tr><th>Claim</th>${matrix.boundaries.map((bid: string) => {
            const b = boundaryMap.get(bid);
            return `<th>${esc(bid)}<br><span style="font-weight:400;font-size:10px">${esc(b?.shortName || b?.name || "")}</span></th>`;
          }).join("")}</tr></thead>
          <tbody>${matrix.claims.map((cid: string, ci: number) => {
            const ac = atomicClaims.find((a: any) => a.id === cid);
            const label = ac ? `${esc(cid)} — ${esc(ac.statement?.slice(0, 30) || "")}` : esc(cid);
            return `<tr><td class="claim-col">${label}</td>${matrix.boundaries.map((_: string, bi: number) => {
              const cnt = matrix.counts[ci]?.[bi] ?? 0;
              return `<td><span class="cell-val ${cellClass(cnt)}">${cnt}</span></td>`;
            }).join("")}</tr>`;
          }).join("")}</tbody>
        </table>
      </div>
    </div>`;
}

function buildBoundaryAccordion(cb: any): string {
  return `<details class="boundary-accord">
      <summary><span class="ba-arrow">&#9654;</span><span class="ba-id">${esc(cb.id)}</span><span class="ba-name">${esc(cb.name)}</span><span class="ba-ev-count">${cb.evidenceCount ?? 0} evidence</span></summary>
      <div class="boundary-body">
        <div class="boundary-meta-grid">
          ${cb.methodology ? `<div class="bm-item"><div class="bm-label">Methodology</div><div class="bm-val">${esc(cb.methodology)}</div></div>` : ""}
          ${cb.geographic ? `<div class="bm-item"><div class="bm-label">Geographic</div><div class="bm-val">${esc(cb.geographic)}</div></div>` : ""}
          ${cb.temporal ? `<div class="bm-item"><div class="bm-label">Temporal</div><div class="bm-val">${esc(cb.temporal)}</div></div>` : ""}
          ${typeof cb.internalCoherence === "number" ? `<div class="bm-item"><div class="bm-label">Internal Coherence</div><div class="bm-val">${cb.internalCoherence.toFixed(cb.internalCoherence === 1 ? 2 : 3)}</div></div>` : ""}
        </div>
        ${cb.description ? `<div style="font-size:12px;color:#a0aec0">${esc(cb.description)}</div>` : ""}
      </div>
    </details>`;
}

function buildEvidenceSection(evidenceItems: any[], claimVerdicts: any[]): string {
  if (!evidenceItems.length) return "";

  // Split evidence by direction
  const supporting = evidenceItems.filter((e: any) => e.claimDirection === "supports" && e.claimBoundaryId);
  const contradicting = evidenceItems.filter((e: any) => e.claimDirection === "contradicts" && e.claimBoundaryId);
  const neutral = evidenceItems.filter((e: any) => (e.claimDirection === "neutral" || (!e.claimDirection && e.claimBoundaryId)) && e.claimBoundaryId);
  const preliminary = evidenceItems.filter((e: any) => !e.claimBoundaryId);

  const totalForClaims = supporting.length + contradicting.length + neutral.length;

  return `<!-- EVIDENCE ITEMS -->
<div class="section">
  <div class="section-head">
    <span>&#128270;</span>
    <span class="section-title">Evidence Items</span>
    <span class="section-badge">${totalForClaims} assigned${preliminary.length > 0 ? ` (+ ${preliminary.length} preliminary)` : ""}</span>
  </div>
  <div class="section-body">
    ${supporting.length > 0 ? buildEvidenceGroup("Supporting Evidence", supporting, "supports", true) : ""}
    ${contradicting.length > 0 ? buildEvidenceGroup("Contradicting Evidence", contradicting, "contradicts", true) : ""}
    ${neutral.length > 0 ? buildEvidenceGroup("Neutral / Context Evidence", neutral, "neutral", false) : ""}
    ${preliminary.length > 0 ? buildPreliminaryEvidence(preliminary) : ""}
  </div>
</div>`;
}

function buildEvidenceGroup(label: string, items: any[], direction: string, openByDefault: boolean): string {
  const dirClass = dirColorClass(direction);
  const bgClass = direction === "supports" ? "dir-bg-supports" :
                  direction === "contradicts" ? "dir-bg-contradicts" : "dir-bg-neutral";
  const badgeClass = direction === "supports" ? "ev-sup" :
                     direction === "contradicts" ? "ev-con" : "ev-neu";

  return `<details${openByDefault ? " open" : ""} style="margin-bottom:12px">
      <summary style="padding:8px 0;margin-bottom:8px"><span class="sum-label ${dirClass}">${esc(label)}</span><span class="sum-count">(${items.length} items)</span></summary>
      <div class="ev-list">
        ${items.map((ev: any) => `<div class="ev-item ${bgClass}">
          <div class="ev-item-head"><span class="ev-id">${esc(ev.id || "")}</span><span class="ev-dir-badge ${badgeClass}">${esc(ev.claimDirection || direction)}</span></div>
          <div class="ev-statement">${esc(ev.statement || "")}</div>
          <div class="ev-meta">
            ${ev.sourceType ? `<span class="ev-tag">${esc(ev.sourceType)}</span>` : ""}
            ${ev.probativeValue ? `<span class="ev-tag">probative: ${esc(ev.probativeValue)}</span>` : ""}
            ${ev.claimBoundaryId ? `<span class="ev-tag">${esc(ev.claimBoundaryId)}</span>` : ""}
          </div>
          ${ev.sourceUrl ? `<div class="ev-source-link"><a href="${esc(ev.sourceUrl)}" target="_blank">${esc(ev.sourceTitle || ev.sourceUrl)}</a></div>` : ""}
        </div>`).join("\n        ")}
      </div>
    </details>`;
}

function buildPreliminaryEvidence(items: any[]): string {
  return `<details style="margin-bottom:4px">
      <summary style="padding:8px 0;margin-bottom:8px"><span class="sum-label" style="color:#718096">Preliminary Evidence</span><span class="sum-count">(${items.length} pre-research items, not used in final verdict)</span></summary>
      <div class="ev-list">
        ${items.map((ev: any) => `<div class="ev-item" style="border-color:#2d3748;background:#0f1117;opacity:.7">
          <div class="ev-item-head"><span class="ev-id">${esc(ev.id || "")}</span><span class="ev-dir-badge ev-neu">preliminary</span></div>
          <div class="ev-statement" style="color:#a0aec0">${esc(ev.statement || "")}</div>
          ${ev.sourceUrl ? `<div class="ev-source-link"><a href="${esc(ev.sourceUrl)}" target="_blank">${esc(ev.sourceTitle || ev.sourceUrl)}</a></div>` : ""}
        </div>`).join("\n        ")}
      </div>
    </details>`;
}

function buildSourcesSection(sources: any[]): string {
  if (!sources.length) return "";

  return `<!-- SOURCES -->
<div class="section">
  <div class="section-head">
    <span>&#128279;</span>
    <span class="section-title">Sources</span>
    <span class="section-badge">${sources.length} sources</span>
  </div>
  <div class="section-body">
    <div class="source-list">
      ${sources.map((s: any, i: number) => `<div class="source-item">
        <div class="source-head"><span class="source-id">S_${String(i + 1).padStart(3, "0")}</span><span class="source-title">${esc(s.title || "Untitled")}</span></div>
        ${s.url ? `<div class="source-url"><a href="${esc(s.url)}" target="_blank">${esc(s.url)}</a></div>` : ""}
        <div class="source-tags">
          ${s.category ? `<span class="ev-tag">${esc(s.category)}</span>` : ""}
          <span class="ev-tag">${s.fetchSuccess !== false ? "fetched ✓" : "fetch failed"}</span>
          ${s.searchQuery ? `<span class="ev-tag">query: ${esc(s.searchQuery)}</span>` : ""}
        </div>
      </div>`).join("\n      ")}
    </div>
  </div>
</div>`;
}

function buildSearchQueriesSection(queries: any[]): string {
  if (!queries.length) return "";

  const iterations = new Set(queries.map((q: any) => q.iteration ?? 0));

  return `<!-- SEARCH QUERIES -->
<div class="section">
  <div class="section-head">
    <span>&#9878;&#65039;</span>
    <span class="section-title">Search Queries</span>
    <span class="section-badge">${queries.length} queries · ${iterations.size} iterations</span>
  </div>
  <div class="section-body">
    <div class="matrix-wrap">
      <table class="query-table">
        <thead><tr><th>Query</th><th>Iter.</th><th>Focus</th><th>Results</th><th>Provider</th></tr></thead>
        <tbody>
          ${queries.map((q: any) => {
            const focus = q.focus || "main";
            const focusClass = focus === "preliminary" ? "focus-prel" :
                               focus === "contradiction" ? "focus-contr" : "focus-main";
            return `<tr><td>${esc(q.query || "")}</td><td>${q.iteration ?? 0}</td><td><span class="${focusClass}">${esc(focus)}</span></td><td>${q.resultsCount ?? "—"}</td><td>${esc(q.provider || "—")}</td></tr>`;
          }).join("\n          ")}
        </tbody>
      </table>
    </div>
  </div>
</div>`;
}

function buildQualityGatesSection(qualityGates: any, meta: any, input: HtmlReportInput): string {
  const { evidenceItems, sources, searchQueries, claimVerdicts } = input;

  const gate1 = qualityGates?.gate1 || {};
  const gate4 = qualityGates?.gate4 || {};
  const allPassed = qualityGates?.allPassed !== false;

  return `<!-- QUALITY GATES -->
<div class="section">
  <div class="section-head">
    <span>&#10003;</span>
    <span class="section-title">Quality Gates</span>
    <span class="section-badge"${allPassed ? ' style="background:#1c4532;color:#68d391"' : ""}>${allPassed ? "ALL PASSED" : "ISSUES"}</span>
  </div>
  <div class="section-body">
    <div class="gates-grid">
      <div class="gate-card">
        <div class="gate-title">Gate 1 — Claim Validation</div>
        <div class="gate-stat"><span class="gate-stat-key">Total claims</span><span class="gate-stat-val">${gate1.totalClaims ?? claimVerdicts.length}</span></div>
        <div class="gate-stat"><span class="gate-stat-key">Passed fidelity</span><span class="gate-stat-val" style="color:#68d391">${gate1.passedFidelity ?? gate1.totalClaims ?? claimVerdicts.length}</span></div>
        <div class="gate-stat"><span class="gate-stat-key">Filtered</span><span class="gate-stat-val">${gate1.filtered ?? 0}</span></div>
        <div class="gate-stat"><span class="gate-stat-key">Central claims kept</span><span class="gate-stat-val">${gate1.centralKept ?? claimVerdicts.length}</span></div>
      </div>
      <div class="gate-card">
        <div class="gate-title">Gate 4 — Confidence</div>
        <div class="gate-stat"><span class="gate-stat-key">Total claims</span><span class="gate-stat-val">${gate4.totalClaims ?? claimVerdicts.length}</span></div>
        <div class="gate-stat"><span class="gate-stat-key">Publishable</span><span class="gate-stat-val" style="color:#68d391">${gate4.publishable ?? claimVerdicts.length}</span></div>
        <div class="gate-stat"><span class="gate-stat-key">High confidence</span><span class="gate-stat-val">${gate4.highConfidence ?? 0}</span></div>
        <div class="gate-stat"><span class="gate-stat-key">Medium confidence</span><span class="gate-stat-val">${gate4.mediumConfidence ?? 0}</span></div>
        <div class="gate-stat"><span class="gate-stat-key">Insufficient</span><span class="gate-stat-val">${gate4.insufficient ?? 0}</span></div>
      </div>
      <div class="gate-card">
        <div class="gate-title">Evidence Summary</div>
        <div class="gate-stat"><span class="gate-stat-key">Total evidence items</span><span class="gate-stat-val">${evidenceItems.length}</span></div>
        <div class="gate-stat"><span class="gate-stat-key">Sources fetched</span><span class="gate-stat-val">${sources.length}</span></div>
        <div class="gate-stat"><span class="gate-stat-key">Searches performed</span><span class="gate-stat-val">${searchQueries.length}</span></div>
      </div>
      <div class="gate-card">
        <div class="gate-title">Pipeline Execution</div>
        <div class="gate-stat"><span class="gate-stat-key">Status</span><span class="gate-stat-val" style="color:#68d391">${esc(input.job.status)}</span></div>
        <div class="gate-stat"><span class="gate-stat-key">LLM calls</span><span class="gate-stat-val">${meta?.llmCallCount ?? meta?.totalLlmCalls ?? "—"}</span></div>
        <div class="gate-stat"><span class="gate-stat-key">Schema</span><span class="gate-stat-val">${esc(meta?.schemaVersion || "—")}</span></div>
      </div>
    </div>
  </div>
</div>`;
}

function buildFooter(meta: any, jobId: string): string {
  const now = new Date();
  const pad = (n: number) => n.toString().padStart(2, "0");
  const ts = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())} ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())} UTC`;

  return `<div class="footer">
  FactHarbor Alpha · ${esc(meta?.pipeline || "claimboundary")} pipeline ${esc(meta?.schemaVersion || "")} · Generated ${ts}
  <br>Job ${esc(jobId)} · ${esc(meta?.model || "—")} · ${esc(meta?.provider || "anthropic")}
</div>`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function generateHtmlReport(input: HtmlReportInput): string {
  const { result, job } = input;
  const meta = result?.meta || {};
  const narrative = result?.verdictNarrative;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>FactHarbor Report — ${esc(job.inputValue)}</title>
${buildCss()}
</head>
<body>
<div class="page">
${buildHeader(input)}
${buildVerdictBanner(input)}
${buildVerdictNarrative(narrative)}
${buildClaimVerdicts(input)}
${buildClaimBoundariesSection(input)}
${buildEvidenceSection(input.evidenceItems, input.claimVerdicts)}
${buildSourcesSection(input.sources)}
${buildSearchQueriesSection(input.searchQueries)}
${buildQualityGatesSection(input.qualityGates, meta, input)}
${buildFooter(meta, job.jobId)}
</div>
</body>
</html>`;
}
