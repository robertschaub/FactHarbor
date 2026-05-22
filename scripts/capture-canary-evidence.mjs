#!/usr/bin/env node
/**
 * V2 canary evidence capture helper.
 *
 * Fetches job metadata, verifies public containment markers, emits a
 * ledger-consumption stub, then delegates artifact capture to the existing
 * capture-v2-artifacts.ps1 script.
 *
 * Standalone — not wired into package.json.
 *
 * Usage:
 *   node scripts/capture-canary-evidence.mjs --job-id <id> [--admin-key <key>] [--base-url <url>] [--out-dir <dir>]
 */

import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function parseArgs(argv) {
  const opts = {
    jobId: null,
    adminKey: 'Tabea_Race',
    baseUrl: 'http://localhost:3000',
    outDir: join(REPO, 'Docs', 'WIP'),
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--job-id' && argv[i + 1]) opts.jobId = argv[++i];
    else if (a === '--admin-key' && argv[i + 1]) opts.adminKey = argv[++i];
    else if (a === '--base-url' && argv[i + 1]) opts.baseUrl = argv[++i];
    else if (a === '--out-dir' && argv[i + 1]) opts.outDir = argv[++i];
  }
  if (!opts.jobId) {
    console.error('Usage: node scripts/capture-canary-evidence.mjs --job-id <id> [--admin-key <key>] [--base-url <url>] [--out-dir <dir>]');
    process.exit(1);
  }
  return opts;
}

async function fetchJob(baseUrl, jobId, adminKey) {
  const url = `${baseUrl}/api/fh/jobs/${encodeURIComponent(jobId)}`;
  const res = await fetch(url, {
    headers: { 'x-admin-key': adminKey },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Job fetch failed: HTTP ${res.status}`);
  return res.json();
}

function verifyContainment(job) {
  const checks = [];
  const meta = job.resultJson?.meta ?? {};
  const schema = job.resultJson?._schemaVersion ?? meta.schemaVersion ?? null;

  checks.push({
    marker: 'schemaVersion_precutover',
    expected: '4.0.0-cb-precutover',
    actual: schema,
    pass: schema === '4.0.0-cb-precutover',
  });
  checks.push({
    marker: 'publicCutoverStatus_blocked',
    expected: 'blocked_precutover',
    actual: meta.publicCutoverStatus ?? null,
    pass: meta.publicCutoverStatus === 'blocked_precutover',
  });
  checks.push({
    marker: 'analysisIssueCode_damaged',
    expected: 'report_damaged',
    actual: job.analysisIssueCode ?? null,
    pass: job.analysisIssueCode === 'report_damaged',
  });
  return checks;
}

function buildStub(job, containmentChecks, capturedAt) {
  return {
    jobId: job.jobId,
    implementationCommit: job.gitCommitHash ?? job.executedWebGitCommitHash ?? 'FILL_IN',
    createdAt: job.createdUtc ?? null,
    status: job.status ?? null,
    pipelineVariant: job.pipelineVariant ?? null,
    containmentVerification: containmentChecks,
    capturedAt,
    sliceId: 'FILL_IN',
    classification: 'FILL_IN',
    docsCommit: 'FILL_IN',
    remainingAfter: 'FILL_IN',
    approvalPointer: 'FILL_IN',
    canaryRunner: 'FILL_IN',
  };
}

async function main() {
  const opts = parseArgs(process.argv);
  const capturedAt = new Date().toISOString();

  console.log(`Fetching job ${opts.jobId} from ${opts.baseUrl} ...`);
  const job = await fetchJob(opts.baseUrl, opts.jobId, opts.adminKey);
  console.log(`  status: ${job.status}  pipeline: ${job.pipelineVariant}  commit: ${job.gitCommitHash ?? '(none)'}`);

  const checks = verifyContainment(job);
  const allPass = checks.every(c => c.pass);
  for (const c of checks) {
    console.log(`  ${c.pass ? 'OK' : 'FAIL'}  ${c.marker}: ${c.actual}`);
  }
  if (!allPass) {
    console.error('\nContainment verification FAILED — review before proceeding.');
  }

  const stub = buildStub(job, checks, capturedAt);
  const stubPath = join(opts.outDir, `canary-evidence-${opts.jobId}.json`);
  writeFileSync(stubPath, JSON.stringify(stub, null, 2) + '\n', 'utf-8');
  console.log(`\nConsumption stub written to ${stubPath}`);

  console.log('\nCapturing V2 artifacts via capture-v2-artifacts.ps1 ...');
  try {
    execFileSync('powershell', [
      '-ExecutionPolicy', 'Bypass',
      '-File', join(REPO, 'scripts', 'capture-v2-artifacts.ps1'),
      '-JobId', opts.jobId,
      '-AdminKey', opts.adminKey,
      '-BaseUrl', opts.baseUrl,
      '-OutDir', opts.outDir,
    ], { stdio: 'inherit' });
  } catch {
    console.error('Artifact capture encountered errors (see above).');
  }

  console.log('\nDone.');
  process.exit(allPass ? 0 : 1);
}

main();
