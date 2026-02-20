/**
 * Political Bias Calibration — HTML Report Generator
 *
 * Generates self-contained HTML reports with embedded CSS.
 * No external dependencies. Matches the dark theme of existing test reports.
 *
 * @module calibration/report-generator
 */

import type { CalibrationRunResult, PairResult } from "./types";

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Generate a self-contained HTML report from a calibration run result.
 */
export function generateCalibrationReport(
  result: CalibrationRunResult,
): string {
  const am = result.aggregateMetrics;
  const passClass = am.overallPassed ? "pass" : "fail";
  const passLabel = am.overallPassed ? "PASS" : "FAIL";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bias Calibration Report — ${result.timestamp}</title>
<style>
${CSS}
</style>
</head>
<body>
<div class="container">

${renderHeader(result)}
${renderVerdictBanner(result, passClass, passLabel)}
${renderAggregatePanel(result)}
${renderStageBiasHeatmap(result)}
${renderPairCards(result)}
${renderConfigSnapshot(result)}
${renderFooter(result)}

</div>
</body>
</html>`;
}

// ============================================================================
// SECTION RENDERERS
// ============================================================================

function renderHeader(r: CalibrationRunResult): string {
  const am = r.aggregateMetrics;
  const durationMin = (am.totalDurationMs / 60_000).toFixed(1);

  return `
<header>
  <h1>Political Bias Calibration Report</h1>
  <div class="meta-grid">
    <div class="meta-item"><span class="label">Run ID</span><span class="value">${esc(r.runId)}</span></div>
    <div class="meta-item"><span class="label">Timestamp</span><span class="value">${esc(r.timestamp)}</span></div>
    <div class="meta-item"><span class="label">Mode</span><span class="value">${esc(r.metadata.mode)}</span></div>
    <div class="meta-item"><span class="label">Fixture</span><span class="value">${esc(r.metadata.fixtureFile)} v${esc(r.metadata.fixtureVersion)}</span></div>
    <div class="meta-item"><span class="label">Pairs</span><span class="value">${am.completedPairs}/${am.totalPairs} completed</span></div>
    <div class="meta-item"><span class="label">Duration</span><span class="value">${durationMin} min</span></div>
    <div class="meta-item"><span class="label">Config hashes</span><span class="value mono">P:${esc(r.configSnapshot.configHashes.pipeline.slice(0, 8))} S:${esc(r.configSnapshot.configHashes.search.slice(0, 8))}</span></div>
  </div>
</header>`;
}

function renderVerdictBanner(
  r: CalibrationRunResult,
  passClass: string,
  passLabel: string,
): string {
  const am = r.aggregateMetrics;
  const skewDir =
    am.meanDirectionalSkew > 0
      ? "favors left"
      : am.meanDirectionalSkew < 0
        ? "favors right"
        : "balanced";

  return `
<section class="verdict-banner ${passClass}">
  <div class="verdict-label">${passLabel}</div>
  <div class="verdict-detail">
    Mean directional skew: <strong>${am.meanDirectionalSkew.toFixed(1)} pp</strong> (${skewDir})
    &nbsp;|&nbsp; Pass rate: <strong>${(am.passRate * 100).toFixed(0)}%</strong>
  </div>
</section>`;
}

function renderAggregatePanel(r: CalibrationRunResult): string {
  const am = r.aggregateMetrics;
  const t = r.thresholds;

  let domainRows = "";
  for (const [domain, stats] of Object.entries(am.perDomain)) {
    domainRows += `<tr><td>${esc(domain)}</td><td>${stats.pairCount}</td><td>${stats.meanSkew.toFixed(1)}</td><td>${stats.maxSkew.toFixed(1)}</td></tr>`;
  }

  let langRows = "";
  for (const [lang, stats] of Object.entries(am.perLanguage)) {
    langRows += `<tr><td>${esc(lang)}</td><td>${stats.pairCount}</td><td>${stats.meanSkew.toFixed(1)}</td><td>${stats.maxSkew.toFixed(1)}</td></tr>`;
  }

  return `
<section class="panel">
  <h2>Aggregate Metrics</h2>
  <div class="metrics-grid">
    <div class="metric">
      <span class="metric-value ${Math.abs(am.meanDirectionalSkew) <= t.maxMeanDirectionalSkew ? "pass" : "fail"}">${am.meanDirectionalSkew.toFixed(1)} pp</span>
      <span class="metric-label">Mean Directional Skew (±${t.maxMeanDirectionalSkew})</span>
    </div>
    <div class="metric">
      <span class="metric-value ${am.meanAbsoluteSkew <= t.maxMeanAbsoluteSkew ? "pass" : "fail"}">${am.meanAbsoluteSkew.toFixed(1)} pp</span>
      <span class="metric-label">Mean Absolute Skew (≤${t.maxMeanAbsoluteSkew})</span>
    </div>
    <div class="metric">
      <span class="metric-value">${am.maxAbsoluteSkew.toFixed(1)} pp</span>
      <span class="metric-label">Max Absolute Skew</span>
    </div>
    <div class="metric">
      <span class="metric-value">${am.medianAbsoluteSkew.toFixed(1)} pp</span>
      <span class="metric-label">Median Absolute Skew</span>
    </div>
    <div class="metric">
      <span class="metric-value">${am.p95AbsoluteSkew.toFixed(1)} pp</span>
      <span class="metric-label">p95 Absolute Skew</span>
    </div>
    <div class="metric">
      <span class="metric-value">${am.skewStandardDeviation.toFixed(1)}</span>
      <span class="metric-label">Skew Std Dev</span>
    </div>
  </div>

  <div class="breakdown-row">
    <div class="breakdown-table">
      <h3>By Domain</h3>
      <table><thead><tr><th>Domain</th><th>Pairs</th><th>Mean</th><th>Max</th></tr></thead>
      <tbody>${domainRows}</tbody></table>
    </div>
    <div class="breakdown-table">
      <h3>By Language</h3>
      <table><thead><tr><th>Lang</th><th>Pairs</th><th>Mean</th><th>Max</th></tr></thead>
      <tbody>${langRows}</tbody></table>
    </div>
  </div>
</section>`;
}

function renderStageBiasHeatmap(r: CalibrationRunResult): string {
  const stages = ["Extraction", "Research", "Evidence", "Verdict"] as const;
  const stageKeys = [
    "extractionBias",
    "researchBias",
    "evidenceBias",
    "verdictBias",
  ] as const;

  let rows = "";
  for (const pr of r.pairResults) {
    let cells = `<td class="pair-label">${esc(pr.pairId)}</td>`;
    if (pr.status !== "completed") {
      for (let i = 0; i < stageKeys.length; i++) {
        cells += `<td class="heatmap-cell flagged">ERR</td>`;
      }
    } else {
      for (const key of stageKeys) {
        const flagged = pr.metrics.stageIndicators[key];
        cells += `<td class="heatmap-cell ${flagged ? "flagged" : "clear"}">${flagged ? "⚠" : "✓"}</td>`;
      }
    }
    rows += `<tr>${cells}</tr>`;
  }

  return `
<section class="panel">
  <h2>Stage Bias Heatmap</h2>
  <table class="heatmap">
    <thead><tr><th>Pair</th>${stages.map((s) => `<th>${s}</th>`).join("")}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
</section>`;
}

function renderPairCards(r: CalibrationRunResult): string {
  let cards = "";
  for (const pr of r.pairResults) {
    cards += renderPairCard(pr, r.thresholds.maxPairSkew);
  }

  return `
<section class="panel">
  <h2>Per-Pair Results</h2>
  ${cards}
</section>`;
}

function renderPairCard(pr: PairResult, maxSkew: number): string {
  if (pr.status !== "completed") {
    return `
<details class="pair-card pair-fail">
  <summary>
    <span class="pair-id">${esc(pr.pairId)}</span>
    <span class="pair-badge fail">FAILED</span>
    <span class="pair-meta">${esc(pr.pair.domain)} / ${esc(pr.pair.language)} / ${esc(pr.pair.category)}</span>
  </summary>
  <div class="pair-body">
    <div class="pair-description">${esc(pr.pair.description)}</div>
    <div class="delta-summary">
      <table>
        <tr><td>Status</td><td><strong>Execution failed</strong></td></tr>
        <tr><td>Error</td><td>${esc(pr.error)}</td></tr>
      </table>
    </div>
  </div>
</details>`;
  }

  const m = pr.metrics;
  const cardClass = m.passed ? "pair-pass" : "pair-fail";
  const skewPct = Math.min(Math.abs(m.directionalSkew) / maxSkew, 2) * 50;
  const skewDir =
    m.directionalSkew > 0 ? "left" : m.directionalSkew < 0 ? "right" : "neutral";

  return `
<details class="pair-card ${cardClass}">
  <summary>
    <span class="pair-id">${esc(pr.pairId)}</span>
    <span class="pair-badge ${m.passed ? "pass" : "fail"}">${m.passed ? "PASS" : "FAIL"}</span>
    <span class="pair-skew">skew: ${m.directionalSkew.toFixed(1)} pp</span>
    <span class="pair-meta">${esc(pr.pair.domain)} / ${esc(pr.pair.language)} / ${esc(pr.pair.category)}</span>
  </summary>
  <div class="pair-body">
    <div class="pair-description">${esc(pr.pair.description)}</div>

    <div class="skew-bar-container">
      <div class="skew-bar-label">← favors right</div>
      <div class="skew-bar">
        <div class="skew-bar-center"></div>
        <div class="skew-bar-fill ${skewDir}" style="width: ${skewPct.toFixed(0)}%"></div>
      </div>
      <div class="skew-bar-label">favors left →</div>
    </div>

    <div class="side-comparison">
      <div class="side left-side">
        <h4>← Left</h4>
        <div class="side-claim">${esc(pr.left.claim)}</div>
        <div class="side-metrics">
          <div>Truth: <strong>${pr.left.truthPercentage.toFixed(0)}%</strong></div>
          <div>Confidence: <strong>${pr.left.confidence.toFixed(0)}%</strong></div>
          <div>Verdict: <strong>${esc(pr.left.verdict)}</strong></div>
          <div>Claims: ${pr.left.claimVerdicts.length}</div>
          <div>Sources: ${pr.left.sourceCount} (${pr.left.uniqueDomains} domains)</div>
          <div>Evidence: ${pr.left.evidencePool.totalItems} (${pr.left.evidencePool.supporting}↑ ${pr.left.evidencePool.contradicting}↓ ${pr.left.evidencePool.neutral}—)</div>
          <div>Support ratio: ${(pr.left.evidencePool.supportRatio * 100).toFixed(0)}%</div>
        </div>
      </div>

      <div class="side-divider"></div>

      <div class="side right-side">
        <h4>Right →</h4>
        <div class="side-claim">${esc(pr.right.claim)}</div>
        <div class="side-metrics">
          <div>Truth: <strong>${pr.right.truthPercentage.toFixed(0)}%</strong></div>
          <div>Confidence: <strong>${pr.right.confidence.toFixed(0)}%</strong></div>
          <div>Verdict: <strong>${esc(pr.right.verdict)}</strong></div>
          <div>Claims: ${pr.right.claimVerdicts.length}</div>
          <div>Sources: ${pr.right.sourceCount} (${pr.right.uniqueDomains} domains)</div>
          <div>Evidence: ${pr.right.evidencePool.totalItems} (${pr.right.evidencePool.supporting}↑ ${pr.right.evidencePool.contradicting}↓ ${pr.right.evidencePool.neutral}—)</div>
          <div>Support ratio: ${(pr.right.evidencePool.supportRatio * 100).toFixed(0)}%</div>
        </div>
      </div>
    </div>

    <div class="delta-summary">
      <table>
        <tr><td>Directional skew</td><td><strong>${m.directionalSkew.toFixed(1)} pp</strong></td></tr>
        <tr><td>Adjusted skew</td><td>${m.adjustedSkew.toFixed(1)} pp</td></tr>
        <tr><td>Confidence delta</td><td>${m.confidenceDelta.toFixed(1)} pp</td></tr>
        <tr><td>Claim count delta</td><td>${m.claimCountDelta} ${m.stageIndicators.extractionBias ? "⚠" : ""}</td></tr>
        <tr><td>Source count delta</td><td>${m.sourceCountDelta} ${m.stageIndicators.researchBias ? "⚠" : ""}</td></tr>
        <tr><td>Evidence balance delta</td><td>${(m.evidenceBalanceDelta * 100).toFixed(0)}% ${m.stageIndicators.evidenceBias ? "⚠" : ""}</td></tr>
        <tr><td>Expected skew</td><td>${esc(pr.pair.expectedSkew)}${pr.pair.expectedAsymmetry ? ` (${pr.pair.expectedAsymmetry} pp)` : ""}</td></tr>
      </table>
    </div>
  </div>
</details>`;
}

function renderConfigSnapshot(r: CalibrationRunResult): string {
  const configJson = JSON.stringify(
    {
      pipeline: r.configSnapshot.pipeline,
      search: r.configSnapshot.search,
      thresholds: r.thresholds,
    },
    null,
    2,
  );

  return `
<details class="panel config-panel">
  <summary><h2 style="display:inline">Configuration Snapshot</h2></summary>
  <pre class="config-pre">${esc(configJson)}</pre>
</details>`;
}

function renderFooter(r: CalibrationRunResult): string {
  return `
<footer>
  <p>Generated: ${new Date().toISOString()} | Schema: ${esc(r.metadata.schemaVersion)} | Fixture: v${esc(r.metadata.fixtureVersion)}</p>
</footer>`;
}

// ============================================================================
// HELPERS
// ============================================================================

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ============================================================================
// CSS
// ============================================================================

const CSS = `
:root {
  --bg: #1a1a2e;
  --surface: #16213e;
  --surface2: #0f3460;
  --text: #e0e0e0;
  --text-muted: #999;
  --pass: #2e7d32;
  --pass-bg: #1b3d1e;
  --fail: #d32f2f;
  --fail-bg: #3d1b1b;
  --warn: #e65100;
  --accent: #64b5f6;
  --border: #333;
}

* { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.5;
  padding: 20px;
}

.container { max-width: 1200px; margin: 0 auto; }

header { margin-bottom: 24px; }
header h1 { font-size: 1.6em; margin-bottom: 12px; color: var(--accent); }

.meta-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 8px;
}
.meta-item { background: var(--surface); padding: 8px 12px; border-radius: 6px; }
.meta-item .label { color: var(--text-muted); font-size: 0.8em; display: block; }
.meta-item .value { font-weight: 600; }
.meta-item .mono { font-family: monospace; font-size: 0.85em; }

.verdict-banner {
  padding: 20px;
  border-radius: 8px;
  text-align: center;
  margin-bottom: 24px;
}
.verdict-banner.pass { background: var(--pass-bg); border: 2px solid var(--pass); }
.verdict-banner.fail { background: var(--fail-bg); border: 2px solid var(--fail); }
.verdict-label { font-size: 2em; font-weight: 800; }
.verdict-banner.pass .verdict-label { color: var(--pass); }
.verdict-banner.fail .verdict-label { color: var(--fail); }
.verdict-detail { margin-top: 8px; color: var(--text-muted); }

.panel {
  background: var(--surface);
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}
.panel h2 { font-size: 1.2em; margin-bottom: 16px; color: var(--accent); }
.panel h3 { font-size: 1em; margin-bottom: 8px; color: var(--text); }

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}
.metric {
  background: var(--bg);
  padding: 12px;
  border-radius: 6px;
  text-align: center;
}
.metric-value { font-size: 1.5em; font-weight: 700; display: block; }
.metric-value.pass { color: var(--pass); }
.metric-value.fail { color: var(--fail); }
.metric-label { font-size: 0.75em; color: var(--text-muted); display: block; margin-top: 4px; }

.breakdown-row { display: flex; gap: 20px; flex-wrap: wrap; }
.breakdown-table { flex: 1; min-width: 200px; }

table { width: 100%; border-collapse: collapse; }
th, td { padding: 6px 10px; text-align: left; border-bottom: 1px solid var(--border); }
th { color: var(--text-muted); font-size: 0.85em; font-weight: 600; }

.heatmap { table-layout: fixed; }
.heatmap th { text-align: center; }
.pair-label { font-family: monospace; font-size: 0.85em; }
.heatmap-cell { text-align: center; font-size: 1.1em; }
.heatmap-cell.flagged { background: var(--fail-bg); color: var(--warn); }
.heatmap-cell.clear { color: var(--pass); }

.pair-card {
  background: var(--bg);
  border-radius: 6px;
  margin-bottom: 8px;
  border-left: 4px solid var(--border);
}
.pair-card.pair-pass { border-left-color: var(--pass); }
.pair-card.pair-fail { border-left-color: var(--fail); }

.pair-card summary {
  padding: 10px 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.pair-card summary:hover { background: rgba(255,255,255,0.03); }
.pair-id { font-family: monospace; font-weight: 600; min-width: 180px; }
.pair-badge {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.75em;
  font-weight: 700;
}
.pair-badge.pass { background: var(--pass); color: #fff; }
.pair-badge.fail { background: var(--fail); color: #fff; }
.pair-skew { font-family: monospace; }
.pair-meta { color: var(--text-muted); font-size: 0.85em; }

.pair-body { padding: 16px; border-top: 1px solid var(--border); }
.pair-description { color: var(--text-muted); font-style: italic; margin-bottom: 16px; }

.skew-bar-container {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.skew-bar-label { font-size: 0.75em; color: var(--text-muted); white-space: nowrap; }
.skew-bar {
  flex: 1;
  height: 20px;
  background: var(--surface);
  border-radius: 10px;
  position: relative;
  overflow: hidden;
}
.skew-bar-center {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--text-muted);
}
.skew-bar-fill {
  position: absolute;
  top: 2px;
  bottom: 2px;
  border-radius: 8px;
}
.skew-bar-fill.right { left: 50%; background: var(--warn); }
.skew-bar-fill.left { right: 50%; background: var(--accent); }

.side-comparison {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}
.side { flex: 1; }
.side h4 { margin-bottom: 8px; color: var(--accent); }
.side-claim {
  background: var(--surface);
  padding: 8px 12px;
  border-radius: 4px;
  margin-bottom: 8px;
  font-style: italic;
}
.side-metrics { font-size: 0.9em; }
.side-metrics div { padding: 2px 0; }
.side-divider {
  width: 1px;
  background: var(--border);
  align-self: stretch;
}

.delta-summary { margin-top: 12px; }
.delta-summary table { max-width: 400px; }
.delta-summary td:first-child { color: var(--text-muted); }

.config-panel summary { cursor: pointer; padding: 4px 0; }
.config-pre {
  background: var(--bg);
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
  font-size: 0.8em;
  max-height: 400px;
  overflow-y: auto;
}

footer {
  text-align: center;
  color: var(--text-muted);
  font-size: 0.8em;
  padding: 20px 0;
  border-top: 1px solid var(--border);
  margin-top: 20px;
}
`;
