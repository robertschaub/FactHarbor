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
 *   FH_ADMIN_KEY   — admin key for schema v2 metadata extraction
 */

const fs = require("fs");
const path = require("path");
const { submitAutomaticValidationJob } = require("../../apps/web/scripts/automatic-claim-selection");

const API_URL = (process.env.FH_API_URL || "http://localhost:5000").replace(/\/$/, "");
const WEB_URL = (process.env.FH_WEB_URL || "http://localhost:3000").replace(/\/$/, "");
const INVITE_CODE = process.env.FH_INVITE_CODE || "SELF-TEST";
const JOB_TIMEOUT_MS = 600_000; // 10 minutes per job
const POLL_INTERVAL_MS = 5_000;

const batchLabel = process.argv[2];
if (!batchLabel) {
  console.error("Usage: node extract-validation-summary.js <batchLabel> [familiesFile]");
  console.error("  batchLabel:   Name for this batch (e.g., baseline, post_fix)");
  console.error("  familiesFile: JSON file with families (default: captain-approved-families.json)");
  process.exit(1);
}

const familiesFile = process.argv[3] || path.join(__dirname, "captain-approved-families.json");
if (!fs.existsSync(familiesFile)) {
  console.error(`Families file not found: ${familiesFile}`);
  process.exit(1);
}
const families = JSON.parse(fs.readFileSync(familiesFile, "utf-8"));

const outputDir = path.join(__dirname, "..", "..", "test-output", "validation", batchLabel);

// ---------------------------------------------------------------------------

async function submitJob(family) {
  return submitAutomaticValidationJob({
    apiUrl: WEB_URL,
    inputType: family.inputType,
    inputValue: family.inputValue,
    inviteCode: INVITE_CODE,
    timeoutMs: JOB_TIMEOUT_MS,
    pollIntervalMs: POLL_INTERVAL_MS,
    waitForFinalJob: true,
    family,
  });
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
      const validation = await submitJob(family);
      const { draftId, jobId, summary } = validation;

      if (!validation.ok || !summary) {
        const draftLabel = typeof draftId === "string" ? draftId.slice(0, 8) : "none";
        const jobLabel = typeof jobId === "string" ? jobId.slice(0, 8) : "none";
        const historicalDirectReference = family.historicalDirectReference || null;
        process.stdout.write(`draft=${draftLabel} job=${jobLabel}... `);
        console.log(`FAILED (${validation.status})`);
        manifest.results.push({
          familyName: family.familyName,
          status: validation.status,
          draftId,
          jobId,
          historicalDirectReferenceJobId: historicalDirectReference?.jobId || null,
          historicalDirectReferenceQuality:
            historicalDirectReference?.referenceQuality || "missing",
          historicalDirectReferenceJobStatus:
            historicalDirectReference?.status || "missing",
          metadataUnavailable: validation.metadataUnavailable,
          metadataUnavailableReason: validation.metadataUnavailableReason,
          resultUnavailable: validation.resultUnavailable,
          resultUnavailableReason: validation.resultUnavailableReason,
        });
        failed++;
        continue;
      }

      process.stdout.write(`draft=${draftId.slice(0, 8)} job=${jobId.slice(0, 8)}... `);

      const outFile = path.join(outputDir, `${family.familyName}.json`);
      fs.writeFileSync(outFile, JSON.stringify(summary, null, 2));

      console.log(
        `${summary.verdict} (TP=${summary.truthPercentage}, C=${summary.confidence}, selected=${summary.selectedClaimCount}/${summary.preparedClaimCount}, deferred=${summary.deferredClaimCount}, zeroTargeted=${summary.zeroTargetedSelectedClaimCount})`
      );
      manifest.results.push({
        familyName: family.familyName,
        status: "OK",
        draftId,
        jobId,
        verdict: summary.verdict,
        truthPercentage: summary.truthPercentage,
        confidence: summary.confidence,
        metadataUnavailable: summary.metadataUnavailable,
        preparedClaimCount: summary.preparedClaimCount,
        rankedClaimCount: summary.rankedClaimCount,
        recommendedClaimCount: summary.recommendedClaimCount,
        selectedClaimCount: summary.selectedClaimCount,
        deferredClaimCount: summary.deferredClaimCount,
        zeroTargetedSelectedClaimCount: summary.zeroTargetedSelectedClaimCount,
        zeroTargetedSelectedClaimIds: summary.zeroTargetedSelectedClaimIds,
        historicalDirectReferenceJobId: summary.historicalDirectReferenceJobId,
        historicalDirectReferenceQuality: summary.historicalDirectReferenceQuality,
        historicalDirectReferenceJobStatus: summary.historicalDirectReferenceJobStatus,
      });
      passed++;
    } catch (err) {
      const historicalDirectReference = family.historicalDirectReference || null;
      console.log(`ERROR: ${err.message}`);
      manifest.results.push({
        familyName: family.familyName,
        status: "ERROR",
        error: err.message,
        historicalDirectReferenceJobId: historicalDirectReference?.jobId || null,
        historicalDirectReferenceQuality:
          historicalDirectReference?.referenceQuality || "missing",
        historicalDirectReferenceJobStatus:
          historicalDirectReference?.status || "missing",
      });
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
