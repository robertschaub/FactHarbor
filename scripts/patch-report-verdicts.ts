/**
 * patch-report-verdicts.ts
 *
 * Patches existing HTML report files to use the new verdict display format:
 * - "X% true/false" → formatVerdictText (e.g., "48/52 split" for MIXED)
 * - "Y% sure" → getConfidenceTierLabel (e.g., "Medium confidence")
 *
 * Operates on both Docs/TESTREPORTS/*.html and apps/web/test/output/audit/*.html
 * Does NOT touch calibration reports (test/output/bias/) — those are internal diagnostics.
 *
 * Usage: npx tsx scripts/patch-report-verdicts.ts [--dry-run]
 */

import * as fs from "fs";
import * as path from "path";
import { isFalseBand, getConfidenceTierLabel, formatVerdictText } from "../apps/web/src/lib/analyzer/truth-scale";

const DRY_RUN = process.argv.includes("--dry-run");

// Directories to patch
const REPORT_DIRS = [
  path.resolve(__dirname, "../Docs/TESTREPORTS"),
  path.resolve(__dirname, "../apps/web/test/output/audit"),
];

function verdictFromPct(pct: number, confidence?: number): string {
  if (pct >= 86) return "TRUE";
  if (pct >= 72) return "MOSTLY-TRUE";
  if (pct >= 58) return "LEANING-TRUE";
  if (pct >= 43) return (confidence !== undefined && confidence < 40) ? "UNVERIFIED" : "MIXED";
  if (pct >= 29) return "LEANING-FALSE";
  if (pct >= 15) return "MOSTLY-FALSE";
  return "FALSE";
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function patchFile(filePath: string): { changed: boolean; patches: number } {
  let html = fs.readFileSync(filePath, "utf-8");
  let patches = 0;
  const original = html;

  // ---------- 1. Overall verdict banner meter ----------
  // Pattern: <div class="meter-value COLOR">XX%</div>\n...<div class="meter-label">true|false</div>
  html = html.replace(
    /(<div class="meter-value [^"]*">)(\d+)%(<\/div>\s*<div class="meter-label">)(true|false)(<\/div>)/g,
    (_match, pre, pct, mid, word, post) => {
      const pctNum = parseInt(pct, 10);
      // Derive the original truthPct: if "false", original was 100-displayed
      const originalTruth = word === "false" ? 100 - pctNum : pctNum;
      const conf = 50; // approximate — exact value from confidence meter
      const verdict = verdictFromPct(originalTruth, conf);
      const displayPct = isFalseBand(verdict) ? 100 - originalTruth : originalTruth;
      const text = esc(formatVerdictText(displayPct, verdict));
      patches++;
      return `${pre}${text}${mid.replace("meter-label", "meter-label")}${post.replace(/>$/, ">")}`.replace(
        /(<div class="meter-label">)(true|false)(<\/div>)/,
        `$1$3`
      );
    }
  );
  // Simpler approach: just target the specific patterns
  html = original; // reset and do it properly
  patches = 0;

  // --- Overall verdict meter: truth percentage ---
  // Match: <div class="meter-value COLORCLASS">XX%</div> followed by meter-label with true/false
  html = html.replace(
    /(<div class="meter-value\s+[^"]*">)(\d+)(%<\/div>\s*<div class="meter-label">)(true|false)(<\/div>)/g,
    (_match, prefix, pctStr, middle, trueOrFalse, suffix) => {
      const pct = parseInt(pctStr, 10);
      const origTruth = trueOrFalse === "false" ? 100 - pct : pct;
      const verdict = verdictFromPct(origTruth);
      const displayPct = isFalseBand(verdict) ? 100 - origTruth : origTruth;
      const formatted = esc(formatVerdictText(displayPct, verdict));
      patches++;
      // Remove the "true/false" label since formatVerdictText includes it
      return `${prefix}${formatted}</div>\n        <div class="meter-label">${suffix}`;
    }
  );

  // --- Overall verdict meter: confidence ---
  // Match: <div class="meter-value" style="color:#a0aec0">YY%</div> followed by meter-label with "sure"
  html = html.replace(
    /(<div class="meter-value" style="color:#a0aec0">)(\d+)(%<\/div>\s*<div class="meter-label">)sure(<\/div>)/g,
    (_match, prefix, confStr, _middle, suffix) => {
      const conf = parseInt(confStr, 10);
      const label = esc(getConfidenceTierLabel(conf));
      patches++;
      return `${prefix}${label}</div>\n        <div class="meter-label" title="${conf}% confidence">confidence${suffix}`;
    }
  );

  // --- Claim small-meter: truth percentage ---
  html = html.replace(
    /(<div class="small-meter-val\s+[^"]*">)(\d+)(%<\/div>\s*<div class="small-meter-label">)(true|false)(<\/div>)/g,
    (_match, prefix, pctStr, _middle, trueOrFalse, suffix) => {
      const pct = parseInt(pctStr, 10);
      const origTruth = trueOrFalse === "false" ? 100 - pct : pct;
      const verdict = verdictFromPct(origTruth);
      const displayPct = isFalseBand(verdict) ? 100 - origTruth : origTruth;
      const formatted = esc(formatVerdictText(displayPct, verdict));
      patches++;
      return `${prefix}${formatted}</div>\n          <div class="small-meter-label">${suffix}`;
    }
  );

  // --- Claim small-meter: confidence ---
  html = html.replace(
    /(<div class="small-meter-val" style="color:#a0aec0">)(\d+)(%<\/div>\s*<div class="small-meter-label">)sure(<\/div>)/g,
    (_match, prefix, confStr, _middle, suffix) => {
      const conf = parseInt(confStr, 10);
      const label = esc(getConfidenceTierLabel(conf));
      patches++;
      return `${prefix}${label}</div>\n          <div class="small-meter-label" title="${conf}%">confidence${suffix}`;
    }
  );

  // --- Boundary findings: truth ---
  // Pattern: <span class="bf-key">true|false</span><span class="bf-val COLOR">XX%</span>
  html = html.replace(
    /<span class="bf-key">(true|false)<\/span><span class="bf-val\s+([^"]*)"?>(\d+)%<\/span>/g,
    (_match, trueOrFalse, colorClass, pctStr) => {
      const pct = parseInt(pctStr, 10);
      const origTruth = trueOrFalse === "false" ? 100 - pct : pct;
      const verdict = verdictFromPct(origTruth);
      const displayPct = isFalseBand(verdict) ? 100 - origTruth : origTruth;
      const formatted = esc(formatVerdictText(displayPct, verdict));
      patches++;
      return `<span class="bf-key">Truth</span><span class="bf-val ${colorClass}">${formatted}</span>`;
    }
  );

  // --- Boundary findings: confidence ---
  // Pattern: <span class="bf-key">sure</span><span class="bf-val">YY%</span>
  html = html.replace(
    /<span class="bf-key">sure<\/span><span class="bf-val">(\d+)%<\/span>/g,
    (_match, confStr) => {
      const conf = parseInt(confStr, 10);
      const label = esc(getConfidenceTierLabel(conf));
      patches++;
      return `<span class="bf-key">Confidence</span><span class="bf-val" title="${conf}%">${label}</span>`;
    }
  );

  const changed = html !== original;
  if (changed && !DRY_RUN) {
    fs.writeFileSync(filePath, html, "utf-8");
  }
  return { changed, patches };
}

// Main
let totalFiles = 0;
let totalPatched = 0;
let totalPatchCount = 0;

for (const dir of REPORT_DIRS) {
  if (!fs.existsSync(dir)) {
    console.log(`Skipping ${dir} (not found)`);
    continue;
  }

  const files = fs.readdirSync(dir).filter(f => f.endsWith(".html"));
  for (const file of files) {
    const filePath = path.join(dir, file);
    totalFiles++;
    const { changed, patches } = patchFile(filePath);
    if (changed) {
      totalPatched++;
      totalPatchCount += patches;
      console.log(`${DRY_RUN ? "[DRY-RUN] " : ""}Patched ${file} (${patches} replacements)`);
    }
  }
}

console.log(`\n${DRY_RUN ? "[DRY-RUN] " : ""}Done: ${totalPatched}/${totalFiles} files patched (${totalPatchCount} total replacements)`);
