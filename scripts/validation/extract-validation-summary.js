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
 * Environment:
 *   FH_API_URL     — API base for job polling (default: http://localhost:5000)
 *   FH_WEB_URL     — Web base for ACS draft submission (default: http://localhost:3000)
 *   FH_INVITE_CODE — invite code (default: SELF-TEST)
 */

const fs = require("fs");
const path = require("path");
const { submitAutomaticDraftAndWaitForJob } = require("../../apps/web/scripts/automatic-claim-selection");

const API_URL = (process.env.FH_API_URL || "http://localhost:5000").replace(/\/$/, "");
const WEB_URL = (process.env.FH_WEB_URL || "http://localhost:3000").replace(/\/$/, "");
const INVITE_CODE = process.env.FH_INVITE_CODE || "SELF-TEST";
const JOB_TIMEOUT_MS = 600_000; // 10 minutes per job
const POLL_INTERVAL_MS = 5_000;

const batchLabel = process.argv[2];
if (!batchLabel) {
  console.error("Usage: node extract-validation-summary.js <batchLabel> [familiesFile]");
  console.error("  batchLabel:   Name for this batch (e.g., baseline, post_fix)");
  console.error("  familiesFile: JSON file with families (default: validation-families.json)");
  process.exit(1);
}

const familiesFile = process.argv[3] || path.join(__dirname, "validation-families.json");
if (!fs.existsSync(familiesFile)) {
  console.error(`Families file not found: ${familiesFile}`);
  process.exit(1);
}
const families = JSON.parse(fs.readFileSync(familiesFile, "utf-8"));

const outputDir = path.join(__dirname, "..", "..", "test-output", "validation", batchLabel);

// ---------------------------------------------------------------------------

async function submitJob(family) {
  const { draftId, jobId } = await submitAutomaticDraftAndWaitForJob({
    apiUrl: WEB_URL,
    inputType: family.inputType,
    inputValue: family.inputValue,
    inviteCode: INVITE_CODE,
  });
  return { draftId, jobId };
}

async function waitForJob(jobId) {
  const start = Date.now();
  while (Date.now() - start < JOB_TIMEOUT_MS) {
    const res = await fetch(`${API_URL}/v1/jobs/${jobId}`);
    if (!res.ok) throw new Error(`Poll failed (${res.status})`);
    const job = await res.json();
    if (job.status === "SUCCEEDED" || job.status === "FAILED") return job;
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
  throw new Error(`Job ${jobId} timed out after ${JOB_TIMEOUT_MS / 1000}s`);
}

function extractSummary(family, job) {
  const result = typeof job.resultJson === "string" ? JSON.parse(job.resultJson) : job.resultJson;
  if (!result) return null;

  const meta = result.meta || {};
  const claims = (result.claimVerdicts || []).map((cv) => {
    // Find matching atomic claim for the statement text
    const ac = (result.understanding?.atomicClaims || []).find((a) => a.id === cv.claimId);
    return {
      claimId: cv.claimId,
      statement: ac?.claim || ac?.text || cv.claimId,
      truthPercentage: cv.truthPercentage,
      verdict: cv.verdict,
      confidence: cv.confidence,
      confidenceTier: cv.confidenceTier,
    };
  });

  const warnings = result.analysisWarnings || [];
  const byType = {};
  const bySeverity = { error: 0, warning: 0, info: 0 };
  for (const w of warnings) {
    byType[w.type] = (byType[w.type] || 0) + 1;
    if (w.severity in bySeverity) bySeverity[w.severity]++;
  }

  const gate1 = result.qualityGates?.gate1Stats;
  const gate4 = result.qualityGates?.gate4Stats;
  const summary = result.qualityGates?.summary;

  return {
    schemaVersion: "1.0.0",
    run: {
      timestamp: new Date().toISOString(),
      jobId: job.jobId || job.id,
      gitCommit: meta.executedWebGitCommitHash || null,
      promptHash: meta.promptContentHash || null,
      inputText: family.inputValue,
      inputType: family.inputType,
      familyName: family.familyName,
    },
    article: {
      truthPercentage: result.truthPercentage,
      verdict: result.verdict,
      confidence: result.confidence,
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
  console.log(`Families: ${families.length} | API: ${API_URL} | Web: ${WEB_URL}`);
  console.log(`Output: ${outputDir}`);
  console.log("=".repeat(60));

  // Health check
  try {
    const apiHealth = await fetch(`${API_URL}/health`);
    const webHealth = await fetch(`${WEB_URL}/api/health`);
    if (!apiHealth.ok || !webHealth.ok) throw new Error("unhealthy");
    console.log("\nAPI and Web healthy\n");
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

  for (let i = 0; i < families.length; i++) {
    const family = families[i];
    const label = `[${i + 1}/${families.length}] ${family.familyName}`;
    process.stdout.write(`${label}: submitting... `);

    try {
      const { draftId, jobId } = await submitJob(family);
      process.stdout.write(`draft=${draftId.slice(0, 8)} job=${jobId.slice(0, 8)}... `);

      const job = await waitForJob(jobId);
      if (job.status !== "SUCCEEDED") {
        console.log(`FAILED (${job.status})`);
        manifest.results.push({ familyName: family.familyName, status: "FAILED", draftId, jobId });
        failed++;
        continue;
      }

      const summary = extractSummary(family, job);
      if (!summary) {
        console.log("FAILED (no result)");
        manifest.results.push({ familyName: family.familyName, status: "NO_RESULT", draftId, jobId });
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
        draftId,
        jobId,
        verdict: summary.article.verdict,
        truthPercentage: summary.article.truthPercentage,
        confidence: summary.article.confidence,
      });
      passed++;
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      manifest.results.push({ familyName: family.familyName, status: "ERROR", error: err.message });
      failed++;
    }
  }

  manifest.completedAt = new Date().toISOString();
  manifest.passed = passed;
  manifest.failed = failed;
  fs.writeFileSync(path.join(outputDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Done: ${passed} passed, ${failed} failed`);
  console.log(`Results: ${outputDir}`);
}

run().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
