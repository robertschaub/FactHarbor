#!/usr/bin/env npx tsx
/**
 * Paired Job Audit — CLI
 *
 * Operator tool for comparing two completed analysis jobs as a strict inverse pair.
 * Fetches jobs from the API, computes complementarity error, runs root-cause diagnosis,
 * and optionally verifies the inverse relation via LLM.
 *
 * Usage: npx tsx scripts/run-paired-audit.ts <jobIdA> <jobIdB> [--verify-inverse]
 *
 * Exit codes:
 *   0 — CE within threshold (maxInverseComplementarityError from DEFAULT_CALIBRATION_THRESHOLDS)
 *   1 — CE exceeds threshold or error
 */

import * as fs from "fs";
import * as path from "path";
import { runPairedJobAudit } from "../src/lib/calibration/paired-job-audit";
import { DEFAULT_CALIBRATION_THRESHOLDS } from "../src/lib/calibration/types";

const args = process.argv.slice(2);
const jobIdA = args[0];
const jobIdB = args[1];
const verifyInverse = args.includes("--verify-inverse");

if (!jobIdA || !jobIdB) {
  console.error(
    "Usage: npx tsx scripts/run-paired-audit.ts <jobIdA> <jobIdB> [--verify-inverse]",
  );
  process.exit(1);
}

async function main(): Promise<void> {
  console.log(`[Paired Audit] Auditing jobs: ${jobIdA} vs ${jobIdB}`);
  if (verifyInverse) {
    console.log("[Paired Audit] LLM inverse verification enabled (Haiku tier)");
  }

  const result = await runPairedJobAudit({
    jobIdA,
    jobIdB,
    verifyInverseRelation: verifyInverse,
  });

  console.log("\n--- AUDIT RESULT ---");
  console.log(JSON.stringify(result, null, 2));

  const threshold = DEFAULT_CALIBRATION_THRESHOLDS.maxInverseComplementarityError;
  const withinThreshold = result.complementarityError <= threshold;

  console.log(
    `\n[Paired Audit] Complementarity Error: ${result.complementarityError.toFixed(1)} pp (threshold: ${threshold})`,
  );
  console.log(
    `[Paired Audit] Gate: ${withinThreshold ? "PASS" : "FAIL"}`,
  );
  console.log(
    `[Paired Audit] Root causes: ${result.rootCauseTags.join(", ")}`,
  );

  // Write HTML summary
  const outputDir = path.resolve(__dirname, "../test/output/audit");
  fs.mkdirSync(outputDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const htmlPath = path.join(
    outputDir,
    `${jobIdA}-${jobIdB}-${timestamp}.html`,
  );

  const ceClass = withinThreshold ? "pass" : "fail";
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Paired Job Audit — ${result.jobIdA} vs ${result.jobIdB}</title>
<style>
body{font-family:monospace;background:#1a1a2e;color:#e0e0e0;padding:2em;max-width:900px}
h1{color:#e0e0e0}
.pass{color:#4ecca3}
.fail{color:#ff6b6b}
table{border-collapse:collapse;width:100%;margin:1em 0}
td,th{border:1px solid #333;padding:0.5em 1em;text-align:left}
th{background:#2a2a4e}
.metric{margin:0.5em 0}
</style>
</head>
<body>
<h1>Paired Job Audit</h1>
<p class="metric">Timestamp: ${result.timestamp}</p>
<p class="metric">Gate: <span class="${ceClass}">${withinThreshold ? "PASS" : "FAIL"}</span></p>
<p class="metric">Complementarity Error: <span class="${ceClass}">${result.complementarityError.toFixed(1)} pp (threshold: ${threshold})</span></p>
<p class="metric">Root causes: ${result.rootCauseTags.join(", ")}</p>
${result.isConfirmedInverse !== null
    ? `<p class="metric">LLM Inverse Verified: <span class="${result.isConfirmedInverse ? "pass" : "fail"}">${result.isConfirmedInverse ? "YES" : "NO"}</span></p>
<p class="metric">${result.inverseVerificationReasoning ?? ""}</p>`
    : ""}
<table>
<thead><tr><th>Field</th><th>Job A</th><th>Job B</th></tr></thead>
<tbody>
<tr><td>Job ID</td><td>${result.jobIdA}</td><td>${result.jobIdB}</td></tr>
<tr><td>Claim</td><td>${result.claimA}</td><td>${result.claimB}</td></tr>
<tr><td>Truth %</td><td>${result.truthPercentageA.toFixed(1)}%</td><td>${result.truthPercentageB.toFixed(1)}%</td></tr>
<tr><td>Integrity Downgrades</td><td>${result.integrityDowngradesA}</td><td>${result.integrityDowngradesB}</td></tr>
<tr><td>Warnings</td><td>${result.warningsA.length}</td><td>${result.warningsB.length}</td></tr>
</tbody>
</table>
</body>
</html>`;

  fs.writeFileSync(htmlPath, html, "utf-8");
  console.log(`[Paired Audit] HTML summary: ${htmlPath}`);

  process.exit(withinThreshold ? 0 : 1);
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`[Paired Audit] Error: ${message}`);
  process.exit(1);
});
