/**
 * Validation Batch Runner & Summary Extractor
 *
 * Submits validation families to the API, waits for completion,
 * extracts structured summaries for cross-batch comparison.
 *
 * Usage:
 *   node scripts/validation/extract-validation-summary.js <batchLabel> [familiesFile]
 *
 * Examples:
 *   node scripts/validation/extract-validation-summary.js baseline
 *   node scripts/validation/extract-validation-summary.js post_languageintent families-subset.json
 *
 * Output: test-output/validation/<batchLabel>/<familyName>.json + manifest.json
 *
 * Isolation: one job at a time. The next family is submitted only once the previous one cannot
 * still be running: its job SUCCEEDED, or FAILED at progress 100 (written when the pipeline exits
 * or the runner could not be triggered), or the API rejected the submission (HTTP 4xx). Anything
 * else stops the batch, including CANCELLED, FAILED by the stale-job watchdog, non-terminal at the
 * wait bound, or an unreadable status. manifest.stopped then lists the families not submitted,
 * and the process exits with code 2.
 *
 * Environment:
 *   FH_API_URL        — API base (default: http://localhost:5000)
 *   FH_INVITE_CODE    — invite code (default: SELF-TEST)
 *   FH_JOB_TIMEOUT_MS — per-job wait bound (default: 7200000 = 2 h; "Infinity" waits until terminal)
 */

const fs = require("fs");
const path = require("path");

const API_URL = (process.env.FH_API_URL || "http://localhost:5000").replace(/\/$/, "");
const INVITE_CODE = process.env.FH_INVITE_CODE || "SELF-TEST";
// The default covers observed local runs (June–September 2026: median 14 min, max 75 min).
const configuredJobTimeoutMs = Number(process.env.FH_JOB_TIMEOUT_MS);
const JOB_TIMEOUT_MS = configuredJobTimeoutMs > 0 ? configuredJobTimeoutMs : 7_200_000;
const POLL_INTERVAL_MS = 5_000;
// INTERRUPTED is not terminal: the runner re-queues interrupted jobs and runs them again.
const TERMINAL_JOB_STATUSES = new Set(["SUCCEEDED", "FAILED", "CANCELLED"]);
const isCli = require.main === module;

const batchLabel = process.argv[2];
if (isCli && !batchLabel) {
  console.error("Usage: node extract-validation-summary.js <batchLabel> [familiesFile]");
  console.error("  batchLabel:   Name for this batch (e.g., baseline, post_fix)");
  console.error("  familiesFile: JSON file with families (default: validation-families.json)");
  process.exit(1);
}

const familiesFile = process.argv[3] || path.join(__dirname, "validation-families.json");
if (isCli && !fs.existsSync(familiesFile)) {
  console.error(`Families file not found: ${familiesFile}`);
  process.exit(1);
}
const families = isCli ? JSON.parse(fs.readFileSync(familiesFile, "utf-8")) : [];

const outputDir = isCli ? path.join(__dirname, "..", "..", "test-output", "validation", batchLabel) : "";

// ---------------------------------------------------------------------------

async function submitJob(family) {
  const res = await fetch(`${API_URL}/v1/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      inputType: family.inputType,
      inputValue: family.inputValue,
      pipelineVariant: "claimboundary",
      inviteCode: INVITE_CODE,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(`Submit failed (${res.status}): ${body.slice(0, 200)}`);
    // The API rejects 4xx requests before it creates a job; any other failure may have created one.
    err.rejected = res.status >= 400 && res.status < 500;
    throw err;
  }
  const data = await res.json();
  return data.jobId;
}

async function waitForJob(jobId, { timeoutMs = JOB_TIMEOUT_MS, pollIntervalMs = POLL_INTERVAL_MS } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const headers = process.env.FH_ADMIN_KEY ? { "X-Admin-Key": process.env.FH_ADMIN_KEY } : undefined;
    const res = await fetch(`${API_URL}/v1/jobs/${jobId}`, { headers });
    if (!res.ok) throw new Error(`Poll failed (${res.status})`);
    const job = await res.json();
    if (TERMINAL_JOB_STATUSES.has(job.status)) return job;
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) throw new Error(`Job ${jobId} still ${job.status} after ${timeoutMs / 1000}s`);
    await new Promise((r) => setTimeout(r, Math.min(pollIntervalMs, remainingMs)));
  }
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function asRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function asString(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readSchemaVersion(result) {
  const meta = asRecord(result.meta);
  return asString(result._schemaVersion) || asString(meta.schemaVersion);
}

function getResultSchemaKind(result) {
  const meta = asRecord(result.meta);
  const schemaVersion = readSchemaVersion(result);
  const pipeline = asString(meta.pipeline);

  if (
    (schemaVersion === "4.0.0-cb-precutover" || schemaVersion === "4.0.0-cb") &&
    pipeline === "claimboundary-v2"
  ) {
    return "v2";
  }

  if (schemaVersion === "3.2.0-cb" && pipeline === "claimboundary") {
    return "legacy-v1";
  }

  return "unknown";
}

function readV2FallbackFields(result) {
  const compatibility = asRecord(result.compatibility);
  const v1 = asRecord(compatibility.v1);
  return asRecord(v1.fallbackFields);
}

function normalizeV2Warnings(warnings) {
  return normalizeArray(warnings).map((warning) => {
    const item = asRecord(warning);
    return {
      ...item,
      type: asString(item.type) || "unknown",
      severity: asString(item.severity) || "info",
      message: asString(item.message) || asString(item.materialityRationale) || "",
    };
  });
}

function buildSummaryReadModel(result) {
  const schemaKind = getResultSchemaKind(result);
  const meta = asRecord(result.meta);

  if (schemaKind === "v2") {
    const verdict = asRecord(result.verdict);
    const fallbackFields = readV2FallbackFields(result);
    const claimsGroup = asRecord(result.claims);
    const analysisObservability = asRecord(result.analysisObservability);

    return {
      schemaKind,
      meta,
      article: {
        truthPercentage: asNumber(verdict.truthPercentage),
        verdict: asString(verdict.label),
        confidence: asNumber(verdict.confidence),
      },
      claimVerdicts: normalizeArray(fallbackFields.claimVerdicts),
      atomicClaims: normalizeArray(claimsGroup.atomicClaims),
      warnings: normalizeV2Warnings(result.warnings),
      qualityGates: asRecord(fallbackFields.qualityGates),
      acsResearchWaste: asRecord(analysisObservability.acsResearchWaste),
    };
  }

  const understanding = asRecord(result.understanding);
  const analysisObservability = asRecord(result.analysisObservability);
  return {
    schemaKind,
    meta,
    article: {
      truthPercentage: result.truthPercentage,
      verdict: result.verdict,
      confidence: result.confidence,
    },
    claimVerdicts: normalizeArray(result.claimVerdicts),
    atomicClaims: normalizeArray(understanding.atomicClaims),
    warnings: normalizeArray(result.analysisWarnings),
    qualityGates: asRecord(result.qualityGates),
    acsResearchWaste: asRecord(analysisObservability.acsResearchWaste),
  };
}

function readClaimStatement(schemaKind, atomicClaims, claimVerdict) {
  const claimId = claimVerdict.claimId;
  const atomicClaim = atomicClaims.find((claim) => claim?.id === claimId);
  if (schemaKind === "v2") {
    return atomicClaim?.statement ||
      atomicClaim?.claim ||
      atomicClaim?.text ||
      claimVerdict.claimText ||
      claimId;
  }

  return atomicClaim?.claim || atomicClaim?.text || claimId;
}

function extractSummary(family, job) {
  const result = typeof job.resultJson === "string" ? JSON.parse(job.resultJson) : job.resultJson;
  if (!result) return null;

  const readModel = buildSummaryReadModel(result);
  const meta = readModel.meta;
  const acsResearchWaste = readModel.acsResearchWaste;
  const selectedClaimResearchCoverage = normalizeArray(acsResearchWaste.selectedClaimResearchCoverage);
  const zeroTargetedSelectedClaimIds = normalizeArray(acsResearchWaste.zeroTargetedSelectedClaimIds).length > 0
    ? normalizeArray(acsResearchWaste.zeroTargetedSelectedClaimIds)
    : selectedClaimResearchCoverage
        .filter((entry) => entry?.zeroTargetedMainResearch)
        .map((entry) => entry.claimId)
        .filter(Boolean);
  const claims = readModel.claimVerdicts.map((rawClaimVerdict) => {
    const cv = asRecord(rawClaimVerdict);
    return {
      claimId: cv.claimId,
      statement: readClaimStatement(readModel.schemaKind, readModel.atomicClaims, cv),
      truthPercentage: cv.truthPercentage,
      verdict: cv.verdict,
      confidence: cv.confidence,
      confidenceTier: cv.confidenceTier,
    };
  });

  const warnings = readModel.warnings;
  const byType = {};
  const bySeverity = { error: 0, warning: 0, info: 0 };
  for (const w of warnings) {
    byType[w.type] = (byType[w.type] || 0) + 1;
    if (w.severity in bySeverity) bySeverity[w.severity]++;
  }

  const gate1 = readModel.qualityGates.gate1Stats;
  const gate4 = readModel.qualityGates.gate4Stats;
  const summary = readModel.qualityGates.summary;

  return {
    schemaVersion: "1.0.0",
    run: {
      timestamp: new Date().toISOString(),
      jobId: job.jobId || job.id,
      submissionPath: job.submissionPath || meta.submissionPath || null,
      gitCommit: job.executedWebGitCommitHash || meta.executedWebGitCommitHash || job.gitCommitHash || meta.gitCommitHash || null,
      createdGitCommitHash: job.createdGitCommitHash || meta.createdGitCommitHash || meta.gitCommitHash || null,
      executedWebGitCommitHash: job.executedWebGitCommitHash || meta.executedWebGitCommitHash || null,
      promptHash: meta.promptContentHash || null,
      promptContentHash: job.promptContentHash || meta.promptContentHash || null,
      inputText: family.inputValue,
      inputType: family.inputType,
      familyName: family.familyName,
    },
    article: {
      truthPercentage: readModel.article.truthPercentage,
      verdict: readModel.article.verdict,
      confidence: readModel.article.confidence,
    },
    claims,
    qualityGates: {
      gate1: gate1
        ? { total: gate1.total, passed: gate1.passed, filtered: gate1.filtered }
        : null,
      gate4: gate4
        ? {
            total: gate4.total,
            highConfidence: gate4.highConfidence,
            mediumConfidence: gate4.mediumConfidence,
            lowConfidence: gate4.lowConfidence,
            insufficient: gate4.insufficient,
          }
        : null,
      summary: summary
        ? {
            totalEvidenceItems: summary.totalEvidenceItems,
            totalSources: summary.totalSources,
            searchesPerformed: summary.searchesPerformed,
          }
        : null,
    },
    acsResearchWaste: {
      selectedClaimResearchCoverage,
      selectedClaimResearch: normalizeArray(acsResearchWaste.selectedClaimResearch),
      zeroTargetedSelectedClaimCount:
        acsResearchWaste.zeroTargetedSelectedClaimCount ?? zeroTargetedSelectedClaimIds.length,
      zeroTargetedSelectedClaimIds,
    },
    warnings: { total: warnings.length, byType, bySeverity },
    meta: {
      llmModel: meta.llmModel,
      modelsUsed: meta.modelsUsed,
      searchProvider: meta.searchProvider,
      llmCalls: meta.llmCalls,
      claimCount: meta.claimCount,
      evidenceBalance: meta.evidenceBalance,
      pipelineVariant: meta.pipeline || "claimboundary",
    },
  };
}

// ---------------------------------------------------------------------------

async function run() {
  console.log("=".repeat(60));
  console.log(`Validation Batch: ${batchLabel}`);
  console.log(`Families: ${families.length} | API: ${API_URL} | Job wait bound: ${JOB_TIMEOUT_MS / 60_000} min`);
  console.log(`Output: ${outputDir}`);
  console.log("=".repeat(60));

  // Health check
  try {
    const h = await fetch(`${API_URL}/health`);
    if (!h.ok) throw new Error("unhealthy");
    console.log("\nAPI healthy\n");
  } catch {
    console.error("API not reachable. Start both services first.");
    process.exit(1);
  }

  fs.mkdirSync(outputDir, { recursive: true });

  const manifest = {
    batchLabel,
    startedAt: new Date().toISOString(),
    apiUrl: API_URL,
    familyCount: families.length,
    results: [],
  };

  let passed = 0;
  let failed = 0;
  let stopReason = null;

  for (let i = 0; i < families.length; i++) {
    const family = families[i];
    const label = `[${i + 1}/${families.length}] ${family.familyName}`;
    process.stdout.write(`${label}: submitting... `);

    let jobId = null;
    let job = null;
    try {
      jobId = await submitJob(family);
      process.stdout.write(`job=${jobId.slice(0, 8)}... `);

      job = await waitForJob(jobId);
      if (job.status !== "SUCCEEDED") {
        console.log(`FAILED (${job.status})`);
        manifest.results.push({ familyName: family.familyName, status: job.status, jobId });
        failed++;
        // FAILED at progress 100 is written when the pipeline exits or the runner could not be triggered. A cancelled
        // job runs until its next abort checkpoint, and the stale-job watchdog marks a job FAILED without stopping it.
        if (job.status !== "FAILED" || job.progress !== 100) {
          stopReason = `job ${jobId} is ${job.status} at progress ${job.progress}, and its pipeline may still be running`;
          break;
        }
        continue;
      }

      const summary = extractSummary(family, job);
      if (!summary) {
        console.log("FAILED (no result)");
        manifest.results.push({ familyName: family.familyName, status: "NO_RESULT", jobId });
        failed++;
        continue;
      }

      const outFile = path.join(outputDir, `${family.familyName}.json`);
      fs.writeFileSync(outFile, JSON.stringify(summary, null, 2));

      console.log(
        `${summary.article.verdict} (TP=${summary.article.truthPercentage}, C=${summary.article.confidence}, claims=${summary.claims.length})`
      );
      manifest.results.push({
        familyName: family.familyName,
        status: "OK",
        jobId,
        verdict: summary.article.verdict,
        truthPercentage: summary.article.truthPercentage,
        confidence: summary.article.confidence,
      });
      passed++;
    } catch (err) {
      // Continue only when no job can be running: the submission was rejected, or the job already SUCCEEDED.
      const status = job || err.rejected ? "ERROR" : "NOT_TERMINAL";
      console.log(`${status}: ${err.message}`);
      manifest.results.push({ familyName: family.familyName, status, jobId, error: err.message });
      failed++;
      if (status === "NOT_TERMINAL") {
        stopReason = jobId
          ? `job ${jobId} may still be running (${err.message})`
          : `the submission may have created a job that is still running (${err.message})`;
        break;
      }
    }
  }

  manifest.completedAt = new Date().toISOString();
  manifest.passed = passed;
  manifest.failed = failed;
  if (stopReason) {
    // Each processed family added exactly one result, so the rest were never submitted.
    const notSubmitted = families.slice(manifest.results.length).map((family) => family.familyName);
    manifest.stopped = { reason: stopReason, notSubmitted };
  }
  fs.writeFileSync(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Done: ${passed} passed, ${failed} failed`);
  console.log(`Results: ${outputDir}`);
  if (manifest.stopped) {
    console.log(`STOPPED: ${manifest.stopped.reason}`);
    console.log(`Not submitted: ${manifest.stopped.notSubmitted.join(", ") || "(none)"}`);
    console.log("Confirm the job is no longer queued or running (cancel it if needed) before submitting the remaining families.");
    process.exitCode = 2;
  }
}

if (isCli) {
  run().catch((err) => {
    console.error("Fatal:", err);
    process.exit(1);
  });
}

module.exports = {
  buildSummaryReadModel,
  extractSummary,
  getResultSchemaKind,
  waitForJob,
};
