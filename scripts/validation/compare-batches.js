/**
 * Validation Batch Comparator
 *
 * Compares two validation batches and produces a markdown regression report.
 *
 * Usage:
 *   node scripts/validation/compare-batches.js <oldBatchDir> <newBatchDir>
 *
 * Example:
 *   node scripts/validation/compare-batches.js test-output/validation/baseline test-output/validation/post_fix
 *
 * Output: markdown table to stdout (pipe to file if needed)
 */

const fs = require("fs");
const path = require("path");

const oldDir = process.argv[2];
const newDir = process.argv[3];

if (!oldDir || !newDir) {
  console.error("Usage: node compare-batches.js <oldBatchDir> <newBatchDir>");
  process.exit(1);
}

if (!fs.existsSync(oldDir)) { console.error(`Old batch not found: ${oldDir}`); process.exit(1); }
if (!fs.existsSync(newDir)) { console.error(`New batch not found: ${newDir}`); process.exit(1); }

// ---------------------------------------------------------------------------

const VERDICT_RANK = {
  "TRUE": 7, "MOSTLY-TRUE": 6, "LEANING-TRUE": 5,
  "MIXED": 4, "UNVERIFIED": 3,
  "LEANING-FALSE": 2, "MOSTLY-FALSE": 1, "FALSE": 0,
};

function loadBatch(dir) {
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "manifest.json");
  const summaries = {};
  for (const f of files) {
    const data = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8"));
    const key = data.family?.familyName || data.run?.familyName || path.basename(f, ".json");
    summaries[key] = data;
  }
  return summaries;
}

function loadManifest(dir) {
  const mPath = path.join(dir, "manifest.json");
  if (fs.existsSync(mPath)) return JSON.parse(fs.readFileSync(mPath, "utf-8"));
  return null;
}

function readArticle(summary) {
  return {
    verdict: summary.article?.verdict ?? summary.verdict ?? null,
    truthPercentage: summary.article?.truthPercentage ?? summary.truthPercentage ?? null,
    confidence: summary.article?.confidence ?? summary.confidence ?? null,
  };
}

function readWarningCount(summary, severity) {
  return summary.warnings?.bySeverity?.[severity] || 0;
}

function readClaimCount(summary) {
  if (Array.isArray(summary.claims)) return summary.claims.length;
  if (typeof summary.claimVerdictCount === "number") return summary.claimVerdictCount;
  if (Array.isArray(summary.claimSummaries)) return summary.claimSummaries.length;
  return 0;
}

function readZeroTargetedSelectedClaimCount(summary) {
  if (typeof summary.zeroTargetedSelectedClaimCount === "number") {
    return summary.zeroTargetedSelectedClaimCount;
  }
  if (Array.isArray(summary.zeroTargetedSelectedClaimIds)) {
    return summary.zeroTargetedSelectedClaimIds.length;
  }
  return 0;
}

function readDeferredClaimCount(summary) {
  if (typeof summary.deferredClaimCount === "number") return summary.deferredClaimCount;
  if (Array.isArray(summary.deferredClaimIds)) return summary.deferredClaimIds.length;
  return 0;
}

function formatAcsCoverage(summary) {
  const selected = typeof summary.selectedClaimCount === "number" ? summary.selectedClaimCount : "?";
  const prepared = typeof summary.preparedClaimCount === "number" ? summary.preparedClaimCount : "?";
  return `sel ${selected}/${prepared}, def ${readDeferredClaimCount(summary)}, zero ${readZeroTargetedSelectedClaimCount(summary)}`;
}

function readHistoricalReference(summary) {
  return summary.historicalDirectReference || null;
}

function shortReferenceLabel(reference) {
  if (!reference?.jobId) return "missing";
  const quality = reference.referenceQuality || "unknown";
  return `${reference.jobId.slice(0, 8)} (${quality})`;
}

function classifyChange(oldS, newS) {
  const oldArticle = readArticle(oldS);
  const newArticle = readArticle(newS);
  const tpDelta = (newArticle.truthPercentage ?? 0) - (oldArticle.truthPercentage ?? 0);
  const confDelta = (newArticle.confidence ?? 0) - (oldArticle.confidence ?? 0);
  const oldRank = VERDICT_RANK[oldArticle.verdict] ?? 4;
  const newRank = VERDICT_RANK[newArticle.verdict] ?? 4;

  const flags = [];

  // Confidence regression
  if (confDelta < -10) flags.push("conf_drop");

  // Verdict worsened toward UNVERIFIED
  if (newArticle.verdict === "UNVERIFIED" && oldArticle.verdict !== "UNVERIFIED") {
    flags.push("became_unverified");
  }

  // Verdict direction flipped (positive ↔ negative)
  const oldPositive = oldRank > 4;
  const newPositive = newRank > 4;
  const oldNegative = oldRank < 3;
  const newNegative = newRank < 3;
  if ((oldPositive && newNegative) || (oldNegative && newPositive)) {
    flags.push("direction_flip");
  }

  // New error-severity warnings
  const oldErrors = readWarningCount(oldS, "error");
  const newErrors = readWarningCount(newS, "error");
  if (newErrors > oldErrors) flags.push("new_errors");

  // Claim count change (decomposition instability)
  const oldClaims = readClaimCount(oldS);
  const newClaims = readClaimCount(newS);
  if (oldClaims !== newClaims) flags.push("claim_count_change");

  const oldZeroTargeted = readZeroTargetedSelectedClaimCount(oldS);
  const newZeroTargeted = readZeroTargetedSelectedClaimCount(newS);
  if (newZeroTargeted > oldZeroTargeted) flags.push("zero_targeted_selected_claims");

  if (flags.some((f) => ["conf_drop", "became_unverified", "direction_flip", "new_errors", "zero_targeted_selected_claims"].includes(f))) {
    return { status: "REGRESSION", flags, tpDelta, confDelta };
  }
  if (tpDelta > 5 || confDelta > 5) {
    return { status: "IMPROVED", flags, tpDelta, confDelta };
  }
  return { status: "STABLE", flags, tpDelta, confDelta };
}

function sign(n) {
  if (n > 0) return `+${n}`;
  return `${n}`;
}

function readGitHash(summary) {
  return (
    summary.run?.gitCommit ||
    summary.run?.gitCommitHash ||
    summary.gitCommitHash ||
    summary.createdGitCommitHash ||
    summary.executedWebGitCommitHash ||
    "?"
  );
}

function readPromptHash(summary) {
  return (
    summary.run?.promptContentHash ||
    summary.run?.promptHash ||
    summary.promptContentHash ||
    summary.promptHash ||
    summary.analysisRunProvenance?.promptContentHash ||
    "?"
  );
}

// ---------------------------------------------------------------------------

const oldBatch = loadBatch(oldDir);
const newBatch = loadBatch(newDir);
const oldManifest = loadManifest(oldDir);
const newManifest = loadManifest(newDir);

const allFamilies = new Set([...Object.keys(oldBatch), ...Object.keys(newBatch)]);
const matched = [];
const oldOnly = [];
const newOnly = [];

for (const family of [...allFamilies].sort()) {
  if (oldBatch[family] && newBatch[family]) {
    matched.push(family);
  } else if (oldBatch[family]) {
    oldOnly.push(family);
  } else {
    newOnly.push(family);
  }
}

// Header
const oldLabel = oldManifest?.batchLabel || path.basename(oldDir);
const newLabel = newManifest?.batchLabel || path.basename(newDir);
const oldGit = matched.length > 0
  ? readGitHash(oldBatch[matched[0]]).slice(0, 7)
  : "?";
const newGit = matched.length > 0
  ? readGitHash(newBatch[matched[0]]).slice(0, 7)
  : "?";
const oldPrompt = matched.length > 0
  ? readPromptHash(oldBatch[matched[0]]).slice(0, 8)
  : "?";
const newPrompt = matched.length > 0
  ? readPromptHash(newBatch[matched[0]]).slice(0, 8)
  : "?";
const promptChanged = oldPrompt !== newPrompt;

console.log(`## Validation Batch Comparison`);
console.log(`**Old:** ${oldLabel}  |  **New:** ${newLabel}`);
console.log(`**Git:** ${oldGit} → ${newGit}  |  **Prompt:** ${oldPrompt} → ${newPrompt}${promptChanged ? " (CHANGED)" : " (unchanged)"}`);
console.log();

// Table
console.log(`| Family | Historical Direct Ref | Old Verdict | New Verdict | TP Δ | Conf Δ | Claims | Warnings | ACS Coverage | Status |`);
console.log(`|--------|-----------------------|------------|------------|------|--------|--------|----------|--------------|--------|`);

let regressions = 0;
let improvements = 0;
let stable = 0;
let totalTpDelta = 0;
let totalConfDelta = 0;

for (const family of matched) {
  const oldS = oldBatch[family];
  const newS = newBatch[family];
  const change = classifyChange(oldS, newS);
  const oldArticle = readArticle(oldS);
  const newArticle = readArticle(newS);
  const historicalReference = readHistoricalReference(newS) || readHistoricalReference(oldS);

  totalTpDelta += change.tpDelta;
  totalConfDelta += change.confDelta;

  if (change.status === "REGRESSION") regressions++;
  else if (change.status === "IMPROVED") improvements++;
  else stable++;

  const oldV = `${oldArticle.verdict ?? "?"} (${oldArticle.truthPercentage ?? "?"})`;
  const newV = `${newArticle.verdict ?? "?"} (${newArticle.truthPercentage ?? "?"})`;
  const oldClaims = readClaimCount(oldS);
  const newClaims = readClaimCount(newS);
  const claimsStr = oldClaims === newClaims ? `${newClaims}` : `${oldClaims}→${newClaims}`;
  const oldWarn = oldS.warnings?.total || 0;
  const newWarn = newS.warnings?.total || 0;
  const warnStr = oldWarn === newWarn ? `${newWarn}` : `${oldWarn}→${newWarn}`;
  const acsCoverageStr = formatAcsCoverage(newS);
  const flags = change.flags.length > 0 ? ` (${change.flags.join(", ")})` : "";
  const statusStr = `${change.status}${flags}`;

  console.log(
    `| ${family} | ${shortReferenceLabel(historicalReference)} | ${oldV} | ${newV} | ${sign(change.tpDelta)} | ${sign(change.confDelta)} | ${claimsStr} | ${warnStr} | ${acsCoverageStr} | ${statusStr} |`
  );
}

// Missing families
if (oldOnly.length > 0) {
  console.log();
  console.log(`**Removed families (in old only):** ${oldOnly.join(", ")}`);
}
if (newOnly.length > 0) {
  console.log();
  console.log(`**New families (in new only):** ${newOnly.join(", ")}`);
}

// Summary
const avgTp = matched.length > 0 ? (totalTpDelta / matched.length).toFixed(1) : 0;
const avgConf = matched.length > 0 ? (totalConfDelta / matched.length).toFixed(1) : 0;

console.log();
console.log(`### Regressions: ${regressions} | Improvements: ${improvements} | Stable: ${stable}`);
console.log(`### Avg TP delta: ${sign(Number(avgTp))} | Avg confidence delta: ${sign(Number(avgConf))}`);

// JSON summary to stderr (pipeable separately)
const jsonSummary = {
  oldBatch: oldLabel,
  newBatch: newLabel,
  matched: matched.length,
  regressions,
  improvements,
  stable,
  avgTpDelta: Number(avgTp),
  avgConfDelta: Number(avgConf),
  promptChanged,
};
process.stderr.write(JSON.stringify(jsonSummary) + "\n");
