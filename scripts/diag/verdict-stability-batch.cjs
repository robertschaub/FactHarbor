#!/usr/bin/env node
'use strict';

/**
 * Controlled verdict-stability batch — Phase 2 of the verdict-direction-instability lever.
 *
 * Runs a fixed input set N times on the CURRENT build and records, per run, the
 * verdict + truth% + evidence-source set. From that it answers three questions the
 * read-only Phase-1 data could not (see Docs/AGENTS/Captain_Quality_Expectations.md for the current quality contract):
 *   (1) RATE      — per-input polarity / UNVERIFIED / label flip frequency.
 *   (2) DRIVER    — for runs that disagree, is the evidence-source overlap LOW
 *                   (pool-substitution drift) or HIGH (within-pool sensitivity)?
 *   (3) PROXY     — what fraction of real cross-run flips would a cheap within-pool
 *                   resampling gate (Option 3) catch? == the HIGH-overlap flip share.
 * No extra LLM resampling is needed: (2) and (3) both fall out of the pairwise
 * source-Jaccard-vs-verdict comparison across the N collected runs.
 *
 * SAFETY: PLAN-ONLY by default (no jobs submitted, no spend). Pass --run to execute.
 *
 * Isolation: one job at a time. The next run is submitted only once the previous job is not known to be
 * running: it SUCCEEDED, or FAILED at progress 100 (written when its pipeline exits or the runner could not
 * be triggered), or the API rejected the submission (HTTP 4xx). Anything else stops the batch with exit
 * code 2, including CANCELLED, FAILED by the stale-job watchdog (progress < 100), non-terminal at the wait
 * bound, or an unreadable status.
 *
 * Usage:
 *   node scripts/diag/verdict-stability-batch.cjs --inputs <set.json> --n 8            # plan + cost, no spend
 *   node scripts/diag/verdict-stability-batch.cjs --inputs <set.json> --n 8 --run      # actually submit
 *   node scripts/diag/verdict-stability-batch.cjs --analyze <results.jsonl>            # (re)analyze collected data
 *
 * Env: FH_API_URL (default http://localhost:5000) · FH_INVITE_CODE (default SELF-TEST)
 *      FH_PER_JOB_USD (cost-estimate assumption, default 0.75)
 *      FH_JOB_TIMEOUT_MS (per-job wait bound, default 7200000 = 2 h; "Infinity" waits until terminal)
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..', '..');

// Per-job telemetry (additive, schemaVersion 1.0) lives in AnalysisMetrics.MetricsJson
// (NOT ResultJson, NOT a Jobs column). Read it by JobId. ABSENCE = MISSING, not zero.
// NB: pipelineTelemetry.verdictDirection is the direction-VALIDATOR control path — it is
// NOT a rerun-stability signal. Rerun stability is measured ONLY from result.verdict.
const DB_PATH = process.env.FH_DB_PATH || path.join(__dirname, '..', '..', 'apps', 'api', 'factharbor.db');
const CONFIG_DB_PATH = process.env.FH_CONFIG_DB_PATH || path.join(ROOT, 'apps', 'web', 'config.db');
const REQUIRED_CONFIG_KEYS = Object.freeze([
  'calculation/default',
  'pipeline/default',
  'prompt/claimboundary',
  'search/default',
  'sr/default',
]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function readMetricsForJob(jobId, dbPath = DB_PATH) {
  if (!jobId) return null;
  try {
    const q = "SELECT MetricsJson FROM AnalysisMetrics WHERE JobId='" + String(jobId).replace(/'/g, "''") + "' ORDER BY CreatedUtc DESC LIMIT 1";
    const out = execFileSync('sqlite3', ['-readonly', '-json', dbPath, q], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const rows = out.trim() ? JSON.parse(out) : [];
    return rows.length ? JSON.parse(rows[0].MetricsJson) : null;
  } catch { return null; }
}
function sql(query) {
  try {
    const out = execFileSync('sqlite3', ['-readonly', '-json', DB_PATH, query], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
    return out.trim() ? JSON.parse(out) : [];
  } catch { return []; }
}

function sqlFrom(dbPath, query) {
  const out = execFileSync('sqlite3', ['-readonly', '-json', dbPath, query], {
    encoding: 'utf8', maxBuffer: 256 * 1024 * 1024,
  });
  return out.trim() ? JSON.parse(out) : [];
}

const sha256File = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sqlLiteral = (value) => `'${String(value).replace(/'/g, "''")}'`;

function resolveInside(root, file, label) {
  const resolved = path.resolve(root, file);
  const rel = path.relative(root, resolved);
  if (rel.startsWith('..') || path.isAbsolute(rel)) throw new Error(`${label} escapes repository root: ${file}`);
  return resolved;
}

function assertFullHash(value, length, label) {
  if (!new RegExp(`^[0-9a-f]{${length}}$`, 'i').test(value || '')) {
    throw new Error(`${label} must be a full ${length}-character hexadecimal hash`);
  }
}

function validateTemplate(template, root = ROOT) {
  if (template.schemaVersion !== '1.0') throw new Error(`unsupported template schemaVersion ${template.schemaVersion ?? 'missing'}`);
  if (typeof template.planId !== 'string' || !template.planId) throw new Error('template planId is required');
  if (template.requireClean !== true) throw new Error('template requireClean must be true');
  if (!template.input || typeof template.input.path !== 'string' || template.input.count !== 1) {
    throw new Error('template input must define one exact input file');
  }
  assertFullHash(template.input.sha256, 64, 'template input sha256');
  resolveInside(root, template.input.path, 'template input path');
  const artifactPaths = template.artifactPaths;
  if (!Array.isArray(artifactPaths) || artifactPaths.length === 0 || new Set(artifactPaths).size !== artifactPaths.length) {
    throw new Error('template artifactPaths must be a non-empty unique list');
  }
  for (const artifact of artifactPaths) resolveInside(root, artifact, 'template artifact');
  if (typeof template.planPath !== 'string' || !artifactPaths.includes(template.planPath)) {
    throw new Error('template planPath must name a pinned artifact');
  }
  const planPath = resolveInside(root, template.planPath, 'template plan path');
  if (!fs.existsSync(planPath)) throw new Error(`template plan missing: ${template.planPath}`);
  const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
  if (plan.planId !== template.planId) throw new Error('template planId does not match the pinned plan');
  if (plan.input?.file !== template.input.path || plan.input?.runsPerArm !== 1) throw new Error('template input/run contract does not match the pinned plan');
  if (template.runPolicy?.runsPerInvocation !== 1 || template.runPolicy?.requireFreshOutput !== true) {
    throw new Error('template runPolicy must require exactly one run and a fresh output');
  }
  const arms = template.arms || {};
  if (JSON.stringify(Object.keys(arms).sort()) !== JSON.stringify(['A', 'B'])) throw new Error('template must define exactly arms A and B');
  for (const arm of ['A', 'B']) {
    if (!arms[arm] || typeof arms[arm].outputPath !== 'string') throw new Error(`template arm ${arm} is required`);
    const output = resolveInside(root, arms[arm].outputPath, `template arm ${arm} output`);
    const outputRel = path.relative(root, output).replace(/\\/g, '/');
    if (!outputRel.startsWith('test-output/')) throw new Error(`template arm ${arm} output must be under test-output/`);
    const keys = Object.keys(arms[arm].activeConfigs || {}).sort();
    if (JSON.stringify(keys) !== JSON.stringify([...REQUIRED_CONFIG_KEYS].sort())) {
      throw new Error(`template arm ${arm} must define exactly the five required config keys`);
    }
    const step = (plan.sequence || []).find((entry) => entry.arm === arm);
    if (!step || step.n !== 1 || step.out !== arms[arm].outputPath) throw new Error(`template arm ${arm} does not match the pinned plan sequence`);
  }
  return template;
}

function validateExecutionManifest(manifest, root = ROOT) {
  if (manifest.schemaVersion !== '1.0') throw new Error(`unsupported preflight schemaVersion ${manifest.schemaVersion ?? 'missing'}`);
  if (typeof manifest.planId !== 'string' || !manifest.planId) throw new Error('preflight planId is required');
  if (manifest.requireClean !== true) throw new Error('preflight requireClean must be true');
  assertFullHash(manifest.approvedCommit, 40, 'preflight approvedCommit');
  if (!manifest.template || typeof manifest.template.path !== 'string') throw new Error('preflight template provenance is required');
  assertFullHash(manifest.template.sha256, 64, 'preflight template sha256');
  const templatePath = resolveInside(root, manifest.template.path, 'preflight template path');
  if (!fs.existsSync(templatePath)) throw new Error(`preflight template missing: ${manifest.template.path}`);
  if (sha256File(templatePath) !== manifest.template.sha256) throw new Error('preflight template hash mismatch');
  const template = validateTemplate(JSON.parse(fs.readFileSync(templatePath, 'utf8')), root);
  if (manifest.planId !== template.planId) throw new Error('preflight planId does not match template');
  if (JSON.stringify(manifest.input) !== JSON.stringify(template.input)) throw new Error('preflight input contract does not match template');
  if (JSON.stringify(manifest.runPolicy) !== JSON.stringify(template.runPolicy)) throw new Error('preflight runPolicy does not match template');
  if (JSON.stringify(Object.keys(manifest.arms || {}).sort()) !== JSON.stringify(['A', 'B'])) throw new Error('preflight must define exactly arms A and B');
  const artifactKeys = Object.keys(manifest.artifacts || {}).sort();
  const requiredArtifacts = [...template.artifactPaths].sort();
  if (JSON.stringify(artifactKeys) !== JSON.stringify(requiredArtifacts)) {
    throw new Error('preflight artifacts must match every template artifactPath exactly');
  }
  for (const [file, hash] of Object.entries(manifest.artifacts)) assertFullHash(hash, 64, `preflight artifact ${file}`);
  for (const arm of ['A', 'B']) {
    if (!manifest.arms?.[arm]) throw new Error(`preflight arm ${arm} is required`);
    if (manifest.arms[arm].outputPath !== template.arms[arm].outputPath) throw new Error(`preflight arm ${arm} output does not match template`);
    const configs = manifest.arms[arm].activeConfigs || {};
    const keys = Object.keys(configs).sort();
    if (JSON.stringify(keys) !== JSON.stringify([...REQUIRED_CONFIG_KEYS].sort())) {
      throw new Error(`preflight arm ${arm} must define exactly the five required config keys`);
    }
    for (const [key, hash] of Object.entries(configs)) assertFullHash(hash, 64, `arm ${arm} config ${key}`);
  }
  return manifest;
}

function freezeExecutionManifest(templateFile, outputFile, armBConfigHash, options = {}) {
  const root = options.root || ROOT;
  assertFullHash(armBConfigHash, 64, 'arm B config hash');
  const templatePath = resolveInside(root, templateFile, 'template path');
  const template = validateTemplate(JSON.parse(fs.readFileSync(templatePath, 'utf8')), root);
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  assertFullHash(commit, 40, 'current commit');
  const dirty = execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], { cwd: root, encoding: 'utf8' }).trim();
  if (dirty) throw new Error(`working tree is not clean (${dirty.split(/\r?\n/)[0]})`);
  const artifacts = Object.fromEntries(template.artifactPaths.map((file) => {
    const artifact = resolveInside(root, file, 'template artifact');
    if (!fs.existsSync(artifact)) throw new Error(`template artifact missing: ${file}`);
    return [file, sha256File(artifact)];
  }));
  const arms = JSON.parse(JSON.stringify(template.arms));
  arms.B.activeConfigs['pipeline/default'] = armBConfigHash;
  const unresolved = JSON.stringify(arms).match(/__[A-Z0-9_]+__/);
  if (unresolved) throw new Error(`template contains unresolved placeholder ${unresolved[0]}`);
  const templateRel = path.relative(root, templatePath).replace(/\\/g, '/');
  const manifest = {
    schemaVersion: '1.0',
    planId: template.planId,
    approvedCommit: commit,
    requireClean: true,
    template: { path: templateRel, sha256: sha256File(templatePath) },
    input: template.input,
    artifacts,
    runPolicy: template.runPolicy,
    arms,
  };
  validateExecutionManifest(manifest, root);
  const resolvedOutput = resolveInside(root, outputFile, 'execution manifest output');
  const outputRel = path.relative(root, resolvedOutput).replace(/\\/g, '/');
  if (!outputRel.startsWith('test-output/')) throw new Error('execution manifest output must be under ignored test-output/');
  fs.mkdirSync(path.dirname(resolvedOutput), { recursive: true });
  fs.writeFileSync(resolvedOutput, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
  return { manifest, outputPath: resolvedOutput };
}

function loadPreflight(file, arm) {
  if (!file) return null;
  const manifestPath = path.resolve(file);
  const manifest = validateExecutionManifest(JSON.parse(fs.readFileSync(manifestPath, 'utf8')));
  if (!arm || !manifest.arms || !manifest.arms[arm]) throw new Error(`preflight requires --arm matching one of: ${Object.keys(manifest.arms || {}).join(', ') || 'none'}`);
  return { manifest, manifestPath, arm };
}

function verifyApprovedInputs(inputs, root = ROOT) {
  const benchmark = JSON.parse(fs.readFileSync(path.join(root, 'Docs', 'AGENTS', 'benchmark-expectations.json'), 'utf8'));
  const approved = new Set((benchmark.families || []).map((x) => x.inputValue));
  for (const input of inputs) {
    if (input?.inputType !== 'text' || typeof input.inputValue !== 'string' || !approved.has(input.inputValue)) {
      throw new Error('preflight input is not byte-identical to a scored Captain-defined benchmark input');
    }
  }
}

function verifyStaticPreflight(preflight, inputsPath, options = {}) {
  if (!preflight) return;
  const { manifest } = preflight;
  const root = options.root || ROOT;
  validateExecutionManifest(manifest, root);
  const actualInputs = path.resolve(inputsPath);
  const expectedInputs = resolveInside(root, manifest.input.path, 'manifest input path');
  if (actualInputs !== expectedInputs) throw new Error(`--inputs must resolve to manifest input path ${manifest.input.path}`);
  const inputHash = sha256File(actualInputs);
  if (inputHash !== manifest.input.sha256) throw new Error(`input file hash mismatch: expected ${manifest.input.sha256}, got ${inputHash}`);
  const inputs = JSON.parse(fs.readFileSync(actualInputs, 'utf8'));
  if (!Array.isArray(inputs) || inputs.length !== manifest.input.count) throw new Error(`input count mismatch: expected ${manifest.input.count}`);
  verifyApprovedInputs(inputs, root);
  for (const [file, expected] of Object.entries(manifest.artifacts || {})) {
    const artifact = resolveInside(root, file, 'manifest artifact');
    if (!fs.existsSync(artifact)) throw new Error(`manifest artifact missing: ${file}`);
    const actual = sha256File(artifact);
    if (actual !== expected) throw new Error(`manifest artifact hash mismatch for ${file}: expected ${expected}, got ${actual}`);
  }
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  if (commit !== manifest.approvedCommit) throw new Error(`commit mismatch: expected ${manifest.approvedCommit}, got ${commit}`);
  if (manifest.requireClean !== false) {
    const dirty = execFileSync('git', ['status', '--porcelain', '--untracked-files=normal'], { cwd: root, encoding: 'utf8' }).trim();
    if (dirty) throw new Error(`working tree is not clean (${dirty.split(/\r?\n/)[0]})`);
  }
}

function expectedConfigMap(preflight) {
  return preflight.manifest.arms[preflight.arm].activeConfigs;
}

function verifyActivePreflight(preflight, options = {}) {
  if (!preflight) return;
  const apiDbPath = options.apiDbPath || DB_PATH;
  const configDbPath = options.configDbPath || CONFIG_DB_PATH;
  const expected = expectedConfigMap(preflight);
  const rows = sqlFrom(configDbPath, 'SELECT config_type, profile_key, active_hash FROM config_active');
  const actual = new Map();
  for (const row of rows) {
    const key = `${row.config_type}/${row.profile_key}`;
    if (!actual.has(key)) actual.set(key, new Set());
    actual.get(key).add(row.active_hash);
  }
  for (const [key, hash] of Object.entries(expected)) {
    const hashes = [...(actual.get(key) || [])];
    if (hashes.length !== 1 || hashes[0] !== hash) {
      throw new Error(`active config mismatch for ${key}: expected one ${hash}, got ${hashes.join(',') || 'missing'}`);
    }
  }
  const activeJobs = sqlFrom(apiDbPath, "SELECT JobId, Status FROM Jobs WHERE Status IN ('QUEUED','RUNNING','INTERRUPTED')");
  if (activeJobs.length) throw new Error(`nonterminal job exists: ${activeJobs[0].JobId} ${activeJobs[0].Status}`);
}

function verifyInvocationPreflight(preflight, args, outFile, options = {}) {
  if (!preflight) return;
  const root = options.root || ROOT;
  const policy = preflight.manifest.runPolicy;
  if (args.n !== policy.runsPerInvocation) {
    throw new Error(`preflight authorizes exactly ${policy.runsPerInvocation} run per invocation; received --n ${args.n}`);
  }
  const expectedOutput = resolveInside(root, preflight.manifest.arms[preflight.arm].outputPath, `arm ${preflight.arm} output`);
  const actualOutput = path.resolve(root, outFile);
  if (actualOutput !== expectedOutput) throw new Error(`--out must resolve to ${preflight.manifest.arms[preflight.arm].outputPath}`);
  if (policy.requireFreshOutput && fs.existsSync(actualOutput)) throw new Error(`preflight output already exists: ${preflight.manifest.arms[preflight.arm].outputPath}`);
}

function verifyFinishedJob(preflight, jobId, options = {}) {
  if (!preflight) return;
  const apiDbPath = options.apiDbPath || DB_PATH;
  const configDbPath = options.configDbPath || CONFIG_DB_PATH;
  const job = sqlFrom(apiDbPath, `SELECT ExecutedWebGitCommitHash, PromptContentHash FROM Jobs WHERE JobId=${sqlLiteral(jobId)}`)[0];
  if (!job) throw new Error(`postflight job row missing for ${jobId}`);
  if (job.ExecutedWebGitCommitHash !== preflight.manifest.approvedCommit) {
    throw new Error(`postflight job-start commit mismatch: expected ${preflight.manifest.approvedCommit}, got ${job.ExecutedWebGitCommitHash || 'missing'}`);
  }
  const metrics = readMetricsForJob(jobId, apiDbPath);
  const completionCommit = metrics?.telemetryContext?.pipelineCommitId;
  if (completionCommit !== preflight.manifest.approvedCommit) {
    throw new Error(`postflight completion commit mismatch: expected ${preflight.manifest.approvedCommit}, got ${completionCommit || 'missing'}`);
  }
  const usageRows = sqlFrom(configDbPath, `SELECT config_type, profile_key, content_hash FROM config_usage WHERE job_id=${sqlLiteral(jobId)}`);
  const byKey = new Map();
  for (const row of usageRows) {
    const key = `${row.config_type}/${row.profile_key}`;
    if (!byKey.has(key)) byKey.set(key, new Set());
    byKey.get(key).add(row.content_hash);
  }
  for (const [key, expected] of Object.entries(expectedConfigMap(preflight))) {
    const hashes = [...(byKey.get(key) || [])];
    if (hashes.length !== 1 || hashes[0] !== expected) {
      throw new Error(`postflight config mismatch for ${key}: expected one ${expected}, got ${hashes.join(',') || 'missing'}`);
    }
  }
  const expectedPrompt = expectedConfigMap(preflight)['prompt/claimboundary'];
  if (expectedPrompt && job.PromptContentHash !== expectedPrompt) {
    throw new Error(`postflight prompt hash mismatch: expected ${expectedPrompt}, got ${job.PromptContentHash || 'missing'}`);
  }
}
async function attachTelemetry(rec) {
  let m = null;
  for (let i = 0; i < 5 && !m; i++) { m = readMetricsForJob(rec.jobId); if (!m) await sleep(2000); }
  const pt = m && m.pipelineTelemetry;
  rec.pipelineCommitId = (m && m.telemetryContext && m.telemetryContext.pipelineCommitId) || null;       // null = missing
  rec.pipelineCommitShort = (m && m.telemetryContext && m.telemetryContext.pipelineCommitShort) || null;
  rec.telemetry = pt ? {
    contractValidation: pt.contractValidation && pt.contractValidation.status || null,
    verdictDirection: pt.verdictDirection && pt.verdictDirection.status || null,        // control-flow health ONLY
    challengerModelGuard: pt.challengerModelGuard && pt.challengerModelGuard.status || null,
  } : null;
  rec.d5 = (m && m.qualityHealth && m.qualityHealth.d5) || null;
  rec.telemetryPresent = !!pt;
  return rec;
}

const API_URL = (process.env.FH_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const INVITE = process.env.FH_INVITE_CODE || 'SELF-TEST';
const PER_JOB_USD = Number(process.env.FH_PER_JOB_USD) || 0.75;
const POLL_MS = 5000;
// The default covers observed local runs (SUCCEEDED since 2026-06-01, submit to done: median 14, p90 32, max 75 min).
const configuredTimeoutMs = Number(process.env.FH_JOB_TIMEOUT_MS);
const TIMEOUT_MS = configuredTimeoutMs > 0 ? configuredTimeoutMs : 7200000;
// INTERRUPTED is not terminal: the runner re-queues interrupted jobs and runs them again.
const TERMINAL_STATUSES = new Set(['SUCCEEDED', 'FAILED', 'CANCELLED']);
const HIGH_OVERLAP = 0.5; // Jaccard >= this => "within-pool" (proxy-catchable); below => substitution

function parseArgs(argv) {
  const a = { inputs: null, n: 8, run: false, analyze: null, out: null, sequential: true, stopAfterUnverified: 2, preflight: null, preflightOnly: false, arm: null, freezeTemplate: null, manifestOut: null, armBConfigHash: null };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    if (v === '--inputs') a.inputs = argv[++i];
    else if (v === '--n') a.n = parseInt(argv[++i], 10) || 8;
    else if (v === '--run') a.run = true;
    else if (v === '--analyze') a.analyze = argv[++i];
    else if (v === '--out') a.out = argv[++i];
    else if (v === '--stop-after-unverified') a.stopAfterUnverified = parseInt(argv[++i], 10);
    else if (v === '--preflight') a.preflight = argv[++i];
    else if (v === '--preflight-only') a.preflightOnly = true;
    else if (v === '--arm') a.arm = argv[++i];
    else if (v === '--freeze-preflight-template') a.freezeTemplate = argv[++i];
    else if (v === '--manifest-out') a.manifestOut = argv[++i];
    else if (v === '--arm-b-config-hash') a.armBConfigHash = argv[++i];
    else if (v === '--analyze-pool') a.analyzePool = argv[++i];   // commitShort to analyze the whole DB pool on
  }
  return a;
}

function normUrl(u) {
  if (typeof u !== 'string') return null;
  try { const x = new URL(u.trim()); return (x.hostname + x.pathname).replace(/\/$/, '').toLowerCase(); }
  catch { return u.trim().toLowerCase() || null; }
}

function polaritySign(label) {
  if (!label) return undefined;
  const L = String(label).toUpperCase();
  if (L === 'UNVERIFIED') return null;
  if (L === 'MIXED') return 0;
  if (L.includes('TRUE')) return 1;
  if (L.includes('FALSE')) return -1;
  return undefined;
}

function jaccard(a, b) {
  const A = new Set(a), B = new Set(b);
  if (A.size === 0 && B.size === 0) return 1;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter++;
  const uni = A.size + B.size - inter;
  return uni === 0 ? 1 : inter / uni;
}

async function submit(input) {
  const res = await fetch(`${API_URL}/v1/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputType: input.inputType, inputValue: input.inputValue, pipelineVariant: 'claimboundary', inviteCode: INVITE }),
  });
  if (!res.ok) {
    const err = new Error(`submit ${res.status}: ${(await res.text().catch(() => '')).slice(0, 160)}`);
    // The API rejects 4xx requests before it creates a job; any other failure may have created one.
    err.rejected = res.status >= 400 && res.status < 500;
    throw err;
  }
  return (await res.json()).jobId;
}

async function waitFor(jobId, { timeoutMs = TIMEOUT_MS, pollMs = POLL_MS } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const headers = process.env.FH_ADMIN_KEY ? { 'X-Admin-Key': process.env.FH_ADMIN_KEY } : undefined;
    const res = await fetch(`${API_URL}/v1/jobs/${jobId}`, { headers });
    if (!res.ok) throw new Error(`poll ${res.status}`);
    const job = await res.json();
    if (TERMINAL_STATUSES.has(job.status)) return job;
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) throw new Error(`job ${jobId} still ${job.status} after ${timeoutMs / 1000}s`);
    await sleep(Math.min(pollMs, remainingMs));
  }
}

function extract(job, label, runIdx) {
  let result = {};
  try { result = typeof job.resultJson === 'string' ? JSON.parse(job.resultJson) : (job.resultJson || {}); } catch { /* leave empty */ }
  const sources = [...new Set((result.sources || []).map((s) => normUrl(s && (s.url || s.sourceUrl))).filter(Boolean))];
  return {
    label, runIdx, jobId: job.jobId || job.id, status: job.status,
    verdict: result.verdict ?? null, truth: result.truthPercentage ?? null,
    nSources: sources.length, sources,
  };
}

// ---- analysis -----------------------------------------------------------------
function analyzeRecords(records) {
  const byLabel = new Map();
  for (const r of records) (byLabel.get(r.label) || byLabel.set(r.label, []).get(r.label)).push(r);

  let polarityFlip = 0, unverifiedFlip = 0, labelUnstable = 0, stable = 0;
  let flipPairs = 0, flipPairsLowOverlap = 0; // proxy-blind share
  const perInput = [];

  for (const [label, runs] of byLabel) {
    const ok = runs.filter((r) => r.status === 'SUCCEEDED');
    const labels = new Set(ok.map((r) => r.verdict).filter(Boolean));
    const signs = new Set(ok.map((r) => polaritySign(r.verdict)).filter((s) => s !== undefined));
    const hasPos = signs.has(1), hasNeg = signs.has(-1);
    const hasUnver = ok.some((r) => polaritySign(r.verdict) === null);
    const hasDef = ok.some((r) => [1, -1, 0].includes(polaritySign(r.verdict)));
    const truths = ok.map((r) => r.truth).filter((t) => typeof t === 'number');

    const isPolFlip = hasPos && hasNeg;
    const isUnvFlip = hasUnver && hasDef;
    const isLabelUnstable = labels.size > 1;
    if (isPolFlip) polarityFlip++;
    if (isUnvFlip) unverifiedFlip++;
    if (isLabelUnstable) labelUnstable++; else stable++;

    // pairwise: among disagreeing pairs, classify by source overlap (driver + proxy)
    let pairs = 0, lowOverlapPairs = 0, jSum = 0, jN = 0;
    for (let i = 0; i < ok.length; i++) for (let j = i + 1; j < ok.length; j++) {
      const j_ = jaccard(ok[i].sources, ok[j].sources); jSum += j_; jN++;
      const disagree = ok[i].verdict !== ok[j].verdict;
      if (disagree) { pairs++; if (j_ < HIGH_OVERLAP) lowOverlapPairs++; }
    }
    flipPairs += pairs; flipPairsLowOverlap += lowOverlapPairs;

    perInput.push({
      label, runs: ok.length, failed: runs.length - ok.length,
      verdicts: [...labels].join(' | '),
      truthRange: truths.length ? `${Math.min(...truths)}..${Math.max(...truths)}` : '-',
      meanJaccard: jN ? (jSum / jN).toFixed(2) : '-',
      flag: isPolFlip ? 'POLARITY-FLIP' : (isUnvFlip ? 'unverified-flip' : (isLabelUnstable ? 'label-unstable' : 'stable')),
    });
  }

  const nInputs = byLabel.size;
  const pct = (n) => nInputs ? `${(100 * n / nInputs).toFixed(0)}%` : '-';
  console.log(`\n=== RATE (per input, N runs each) — ${nInputs} inputs ===`);
  console.log(`  stable: ${stable}  label-unstable: ${labelUnstable} (${pct(labelUnstable)})  POLARITY-FLIP: ${polarityFlip} (${pct(polarityFlip)})  unverified-flip: ${unverifiedFlip} (${pct(unverifiedFlip)})`);
  console.log(`\n=== DRIVER + PROXY (across ${flipPairs} disagreeing run-pairs) ===`);
  if (flipPairs) {
    const lowPct = (100 * flipPairsLowOverlap / flipPairs).toFixed(0);
    console.log(`  low-overlap (Jaccard<${HIGH_OVERLAP}) disagreeing pairs: ${flipPairsLowOverlap}/${flipPairs} (${lowPct}%)  => pool-SUBSTITUTION-driven, a within-pool proxy would MISS these`);
    console.log(`  high-overlap disagreeing pairs:                      ${flipPairs - flipPairsLowOverlap}/${flipPairs} (${100 - lowPct}%)  => within-pool sensitivity, proxy could catch`);
    console.log(`  => If low-overlap dominates, Option 3 (within-pool resampling) is the WRONG build.`);
  } else {
    console.log('  no disagreeing run-pairs — either stable, or N too small.');
  }
  console.log(`\n=== per-input detail ===`);
  for (const p of perInput) console.log(`  [${p.flag}] runs=${p.runs}${p.failed ? `(+${p.failed} failed)` : ''} meanJaccard=${p.meanJaccard} truth=${p.truthRange}  {${p.verdicts}}  "${p.label}"`);

  // Telemetry provenance + control-flow health (absence = MISSING, not zero; compare on pipelineCommitId).
  const okRuns = records.filter((r) => r.status === 'SUCCEEDED');
  const commits = [...new Set(okRuns.map((r) => r.pipelineCommitShort).filter(Boolean))];
  const noTelem = okRuns.filter((r) => !r.telemetryPresent).length;
  console.log(`\n=== telemetry provenance + pipeline health ===`);
  if (commits.length === 0) console.log(`  pipelineCommitId: MISSING on all ${okRuns.length} runs (pre-telemetry build) — provenance unavailable`);
  else if (commits.length === 1) console.log(`  pipelineCommitId: all runs on ${commits[0]} — clean same-code comparison`);
  else console.log(`  WARNING pipelineCommitId spans ${commits.length} commits {${commits.join(', ')}} — NOT pure same-code; segment before comparing`);
  if (noTelem) console.log(`  ${noTelem}/${okRuns.length} runs missing pipelineTelemetry (treated as missing, not zero)`);
  const statusTally = {};
  for (const r of okRuns) if (r.telemetry) for (const k of Object.keys(r.telemetry)) { const s = r.telemetry[k]; if (s) { const lvl = s.error ? 'error' : (s.partial ? 'partial' : 'available'); const key = k + ':' + lvl; statusTally[key] = (statusTally[key] || 0) + 1; } }
  const flags = Object.keys(statusTally).filter((k) => k.endsWith(':error') || k.endsWith(':partial'));
  if (flags.length) console.log(`  control-flow telemetry FLAGS: ${flags.map((k) => k + '=' + statusTally[k]).join(', ')}`);
  else if (okRuns.some((r) => r.telemetry)) console.log(`  control-flow telemetry: all sections available (no error/partial)`);
}

// ---- main ---------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.freezeTemplate) {
    if (!args.manifestOut || !args.armBConfigHash) throw new Error('--freeze-preflight-template requires --manifest-out and --arm-b-config-hash');
    const frozen = freezeExecutionManifest(args.freezeTemplate, args.manifestOut, args.armBConfigHash);
    console.log(`EXECUTION PREFLIGHT FROZEN — ${path.relative(ROOT, frozen.outputPath)}`);
    console.log(`  approved commit: ${frozen.manifest.approvedCommit}`);
    console.log('  no job submitted, no service or provider call made.');
    return;
  }

  if (args.analyze) {
    const recs = fs.readFileSync(args.analyze, 'utf8').trim().split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
    console.log(`Analyzing ${recs.length} collected runs from ${args.analyze}`);
    analyzeRecords(recs);
    return;
  }

  if (args.analyzePool) {
    // READ-ONLY: pull every SUCCEEDED job on a given pipelineCommitShort from the DB
    // (mine + anyone else's), reconstruct per-run records, run the same rate/driver/proxy.
    const want = args.analyzePool;
    const since = process.env.FH_POOL_SINCE || '2026-06-02';
    const jobs = sql(`SELECT JobId AS id, InputValue AS inp, ResultJson AS rj FROM Jobs WHERE Status='SUCCEEDED' AND CreatedUtc>='${since}' AND ResultJson IS NOT NULL`);
    const perInput = {};
    const records = [];
    let scanned = 0, matched = 0;
    for (const j of jobs) {
      scanned++;
      const m = readMetricsForJob(j.id);
      const pcs = m && m.telemetryContext && m.telemetryContext.pipelineCommitShort;
      if (pcs !== want) continue;
      matched++;
      let result = {};
      try { result = JSON.parse(j.rj); } catch { continue; }
      const sources = [...new Set((result.sources || []).map((s) => normUrl(s && (s.url || s.sourceUrl))).filter(Boolean))];
      const label = String(j.inp).slice(0, 46).replace(/\s+/g, ' ');
      perInput[label] = (perInput[label] || 0) + 1;
      const pt = m && m.pipelineTelemetry;
      records.push({
        label, runIdx: perInput[label], jobId: j.id, status: 'SUCCEEDED',
        verdict: result.verdict ?? null, truth: result.truthPercentage ?? null,
        nSources: sources.length, sources,
        pipelineCommitShort: pcs,
        telemetry: pt ? { contractValidation: pt.contractValidation && pt.contractValidation.status || null, verdictDirection: pt.verdictDirection && pt.verdictDirection.status || null, challengerModelGuard: pt.challengerModelGuard && pt.challengerModelGuard.status || null } : null,
        d5: (m && m.qualityHealth && m.qualityHealth.d5) || null,
        telemetryPresent: !!pt,
      });
    }
    console.log(`Combined-pool analysis (READ-ONLY): ${matched}/${scanned} SUCCEEDED jobs since ${since} are on pipelineCommitShort=${want}`);
    analyzeRecords(records);
    const unv = records.filter((r) => r.verdict === 'UNVERIFIED');
    if (unv.length) { console.log(`\n=== UNVERIFIED cases ===`); for (const u of unv) console.log(`  ${u.jobId} truth=${u.truth ?? '-'} sources=${u.nSources} d5=${u.d5 ? JSON.stringify(u.d5).slice(0, 120) : 'missing'}  "${u.label}"`); }
    return;
  }

  if (!args.inputs) { console.error('ERROR: --inputs <set.json> required (or --analyze <results.jsonl>)'); process.exit(1); }
  const inputs = JSON.parse(fs.readFileSync(args.inputs, 'utf8'));
  const preflight = loadPreflight(args.preflight, args.arm);
  const total = inputs.length * args.n;
  const requestedOutFile = args.out || (preflight ? preflight.manifest.arms[preflight.arm].outputPath : path.join('test-output', `verdict-stability-${inputs.length}x${args.n}.jsonl`));
  if (preflight) {
    verifyInvocationPreflight(preflight, args, requestedOutFile);
    verifyStaticPreflight(preflight, args.inputs);
  }
  const outFile = preflight
    ? resolveInside(ROOT, preflight.manifest.arms[preflight.arm].outputPath, `arm ${preflight.arm} output`)
    : requestedOutFile;

  console.log('VERDICT-STABILITY BATCH');
  console.log(`  API: ${API_URL}   invite: ${INVITE}`);
  console.log(`  inputs: ${inputs.length}   N per input: ${args.n}   => ${total} jobs (max)`);
  console.log(`  est. cost: ~$${(total * PER_JOB_USD).toFixed(0)} max (@ $${PER_JOB_USD}/job; override FH_PER_JOB_USD)`);
  if (args.stopAfterUnverified > 0) console.log(`  circuit-breaker: STOP after ${args.stopAfterUnverified} UNVERIFIED verdicts (likely halts well before ${total} on contested inputs)`);
  console.log(`  isolation: one job at a time; a job not finished within ${TIMEOUT_MS / 60000} min (FH_JOB_TIMEOUT_MS) stops the batch`);
  console.log(`  output: ${outFile}`);
  console.log('  --- input set ---');
  inputs.forEach((x, i) => console.log(`   ${i + 1}. [${x.inputType}] "${String(x.inputValue).slice(0, 72).replace(/\s+/g, ' ')}"${x.note ? `  (${x.note})` : ''}`));

  if (args.preflightOnly) {
    if (!preflight) throw new Error('--preflight-only requires --preflight and --arm');
    verifyActivePreflight(preflight);
    console.log('\nPREFLIGHT PASSED — no job submitted, no spend.');
    return;
  }

  if (!args.run) {
    console.log('\nPLAN ONLY — no jobs submitted, no spend. Re-run with --run to execute.');
    return;
  }

  // --run: health check, then submit sequentially (clean + cost-controllable)
  try {
    const h = await fetch(`${API_URL}/health`); if (!h.ok) throw new Error(String(h.status));
  } catch (e) { console.error(`\nAPI health check failed at ${API_URL}/health (${e.message}). Start the API + runner first.`); process.exit(1); }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const stream = preflight
    ? fs.createWriteStream(outFile, { fd: fs.openSync(outFile, 'wx') })
    : fs.createWriteStream(outFile, { flags: 'a' });
  let done = 0, attempted = 0, unverified = 0, stopped = false, stopReason = null;
  for (let ii = 0; ii < inputs.length && !stopped && !stopReason; ii++) {
    for (let r = 1; r <= args.n && !stopped && !stopReason; r++) {
      const input = inputs[ii];
      const label = input.note || String(input.inputValue).slice(0, 48);
      let jobId = null, job = null;
      try {
        if (preflight) {
          verifyStaticPreflight(preflight, args.inputs);
          verifyActivePreflight(preflight);
        }
      } catch (e) {
        stopReason = `preflight failed before submission: ${e.message}`;
        break;
      }
      attempted++;
      try {
        jobId = await submit(input);
        job = await waitFor(jobId);
        // FAILED at progress 100 is written when the pipeline exits or the runner could not be triggered. A cancelled
        // job runs until the runner's next abort checkpoint (or to completion if the abort request is lost), and the
        // stale-job watchdog marks a job FAILED without stopping its pipeline.
        if (job.status !== 'SUCCEEDED' && (job.status !== 'FAILED' || job.progress !== 100)) {
          stopReason = `job ${jobId} is ${job.status} at progress ${job.progress}, and its pipeline may still be running`;
        }
        const rec = extract(job, label, r);
        await attachTelemetry(rec);
        if (preflight) verifyFinishedJob(preflight, jobId);
        stream.write(JSON.stringify(rec) + '\n');
        done++;
        const commit = rec.pipelineCommitShort || (rec.telemetryPresent ? '?' : 'no-telem');
        console.log(`  [${done}/${total}] "${label.slice(0, 40)}" run ${r}: ${rec.status} ${rec.verdict ?? '-'} truth=${rec.truth ?? '-'} sources=${rec.nSources} commit=${commit}`);
        if (rec.verdict === 'UNVERIFIED') {
          unverified++;
          if (args.stopAfterUnverified > 0 && unverified >= args.stopAfterUnverified) {
            console.log(`\n*** CIRCUIT-BREAKER: ${unverified} UNVERIFIED verdicts reached (--stop-after-unverified ${args.stopAfterUnverified}). Halting batch. ***`);
            stopped = true;
          }
        }
      } catch (e) {
        // If waitFor returned, stopReason already reflects the job's status. Otherwise continue only after a 4xx
        // rejection: any other failure may have left a job queued or running.
        const status = job || e.rejected ? 'ERROR' : 'NOT_TERMINAL';
        stream.write(JSON.stringify({ label, runIdx: r, jobId, status, error: String(e.message) }) + '\n');
        console.log(`  [${done}/${total}] "${label.slice(0, 40)}" run ${r}: ${status} ${e.message}`);
        if (status === 'NOT_TERMINAL') {
          stopReason = jobId
            ? `job ${jobId} may still be running (${e.message})`
            : `the submission may have created a job that is still running (${e.message})`;
        }
        if (preflight && job && TERMINAL_STATUSES.has(job.status)) {
          stopReason = `postflight failed for terminal job ${jobId}: ${e.message}`;
        }
      }
    }
  }
  // Wait for the last record to reach the file before reading it back.
  await new Promise((resolve) => stream.end(resolve));
  console.log(`\nCollected ${done}/${total} runs (${unverified} UNVERIFIED${stopped ? '; stopped early by circuit-breaker' : ''}) -> ${outFile}`);
  // Report the stop before reading the file back, so a bad line from an earlier run cannot hide it.
  if (stopReason) {
    console.log(`STOPPED: ${stopReason}`);
    console.log(`Not submitted: ${total - attempted} of ${total} runs.`);
    console.log('Confirm the job is no longer queued or running (cancel it if needed) before submitting more runs.');
    process.exitCode = 2;
  }
  const recs = fs.readFileSync(outFile, 'utf8').trim().split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
  analyzeRecords(recs);
  const unv = recs.filter((r) => r.verdict === 'UNVERIFIED');
  if (unv.length) {
    console.log(`\n=== UNVERIFIED cases — drill into WHY (node scripts/diag/compare-evidence-pools.cjs <jobId> [<jobId>...]) ===`);
    for (const u of unv) console.log(`  ${u.jobId}  truth=${u.truth ?? '-'}  d5=${u.d5 ? JSON.stringify(u.d5) : 'missing'}  "${u.label}"`);
  }
}

if (require.main === module) main();

module.exports = {
  waitFor,
  loadPreflight,
  verifyStaticPreflight,
  verifyActivePreflight,
  verifyFinishedJob,
  verifyInvocationPreflight,
  validateExecutionManifest,
  freezeExecutionManifest,
  sha256File,
};
