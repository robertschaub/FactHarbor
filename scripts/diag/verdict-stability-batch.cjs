#!/usr/bin/env node
'use strict';

/**
 * Controlled verdict-stability batch — Phase 2 of the verdict-direction-instability lever.
 *
 * Runs a fixed input set N times on the CURRENT build and records, per run, the
 * verdict + truth% + evidence-source set. From that it answers three questions the
 * read-only Phase-1 data could not (see Docs/WIP/2026-06-01_Verdict_Direction_Instability_Phase1_Findings.md):
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
 * Usage:
 *   node scripts/diag/verdict-stability-batch.cjs --inputs <set.json> --n 8            # plan + cost, no spend
 *   node scripts/diag/verdict-stability-batch.cjs --inputs <set.json> --n 8 --run      # actually submit
 *   node scripts/diag/verdict-stability-batch.cjs --analyze <results.jsonl>            # (re)analyze collected data
 *
 * Env: FH_API_URL (default http://localhost:5000) · FH_INVITE_CODE (default SELF-TEST)
 *      FH_PER_JOB_USD (cost-estimate assumption, default 0.75)
 */

const fs = require('node:fs');
const path = require('node:path');

const API_URL = (process.env.FH_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const INVITE = process.env.FH_INVITE_CODE || 'SELF-TEST';
const PER_JOB_USD = Number(process.env.FH_PER_JOB_USD) || 0.75;
const POLL_MS = 5000;
const TIMEOUT_MS = 600000;
const HIGH_OVERLAP = 0.5; // Jaccard >= this => "within-pool" (proxy-catchable); below => substitution

function parseArgs(argv) {
  const a = { inputs: null, n: 8, run: false, analyze: null, out: null, sequential: true, stopAfterUnverified: 2 };
  for (let i = 0; i < argv.length; i++) {
    const v = argv[i];
    if (v === '--inputs') a.inputs = argv[++i];
    else if (v === '--n') a.n = parseInt(argv[++i], 10) || 8;
    else if (v === '--run') a.run = true;
    else if (v === '--analyze') a.analyze = argv[++i];
    else if (v === '--out') a.out = argv[++i];
    else if (v === '--stop-after-unverified') a.stopAfterUnverified = parseInt(argv[++i], 10);
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
  if (!res.ok) throw new Error(`submit ${res.status}: ${(await res.text().catch(() => '')).slice(0, 160)}`);
  return (await res.json()).jobId;
}

async function waitFor(jobId) {
  const start = Date.now();
  for (;;) {
    if (Date.now() - start > TIMEOUT_MS) throw new Error(`job ${jobId} timed out`);
    const headers = process.env.FH_ADMIN_KEY ? { 'X-Admin-Key': process.env.FH_ADMIN_KEY } : undefined;
    const res = await fetch(`${API_URL}/v1/jobs/${jobId}`, { headers });
    if (!res.ok) throw new Error(`poll ${res.status}`);
    const job = await res.json();
    if (job.status === 'SUCCEEDED' || job.status === 'FAILED') return job;
    await new Promise((r) => setTimeout(r, POLL_MS));
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
}

// ---- main ---------------------------------------------------------------------
(async () => {
  const args = parseArgs(process.argv.slice(2));

  if (args.analyze) {
    const recs = fs.readFileSync(args.analyze, 'utf8').trim().split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
    console.log(`Analyzing ${recs.length} collected runs from ${args.analyze}`);
    analyzeRecords(recs);
    return;
  }

  if (!args.inputs) { console.error('ERROR: --inputs <set.json> required (or --analyze <results.jsonl>)'); process.exit(1); }
  const inputs = JSON.parse(fs.readFileSync(args.inputs, 'utf8'));
  const total = inputs.length * args.n;
  const outFile = args.out || path.join('test-output', `verdict-stability-${inputs.length}x${args.n}.jsonl`);

  console.log('VERDICT-STABILITY BATCH');
  console.log(`  API: ${API_URL}   invite: ${INVITE}`);
  console.log(`  inputs: ${inputs.length}   N per input: ${args.n}   => ${total} jobs (max)`);
  console.log(`  est. cost: ~$${(total * PER_JOB_USD).toFixed(0)} max (@ $${PER_JOB_USD}/job; override FH_PER_JOB_USD)`);
  if (args.stopAfterUnverified > 0) console.log(`  circuit-breaker: STOP after ${args.stopAfterUnverified} UNVERIFIED verdicts (likely halts well before ${total} on contested inputs)`);
  console.log(`  output: ${outFile}`);
  console.log('  --- input set ---');
  inputs.forEach((x, i) => console.log(`   ${i + 1}. [${x.inputType}] "${String(x.inputValue).slice(0, 72).replace(/\s+/g, ' ')}"${x.note ? `  (${x.note})` : ''}`));

  if (!args.run) {
    console.log('\nPLAN ONLY — no jobs submitted, no spend. Re-run with --run to execute.');
    return;
  }

  // --run: health check, then submit sequentially (clean + cost-controllable)
  try {
    const h = await fetch(`${API_URL}/health`); if (!h.ok) throw new Error(String(h.status));
  } catch (e) { console.error(`\nAPI health check failed at ${API_URL}/health (${e.message}). Start the API + runner first.`); process.exit(1); }

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  const stream = fs.createWriteStream(outFile, { flags: 'a' });
  let done = 0, unverified = 0, stopped = false;
  for (let ii = 0; ii < inputs.length && !stopped; ii++) {
    for (let r = 1; r <= args.n && !stopped; r++) {
      const input = inputs[ii];
      const label = input.note || String(input.inputValue).slice(0, 48);
      try {
        const jobId = await submit(input);
        const job = await waitFor(jobId);
        const rec = extract(job, label, r);
        stream.write(JSON.stringify(rec) + '\n');
        done++;
        console.log(`  [${done}/${total}] "${label.slice(0, 40)}" run ${r}: ${rec.status} ${rec.verdict ?? '-'} truth=${rec.truth ?? '-'} sources=${rec.nSources}`);
        if (rec.verdict === 'UNVERIFIED') {
          unverified++;
          if (args.stopAfterUnverified > 0 && unverified >= args.stopAfterUnverified) {
            console.log(`\n*** CIRCUIT-BREAKER: ${unverified} UNVERIFIED verdicts reached (--stop-after-unverified ${args.stopAfterUnverified}). Halting batch. ***`);
            stopped = true;
          }
        }
      } catch (e) {
        stream.write(JSON.stringify({ label, runIdx: r, status: 'ERROR', error: String(e.message) }) + '\n');
        console.log(`  [${done}/${total}] "${label.slice(0, 40)}" run ${r}: ERROR ${e.message}`);
      }
    }
  }
  stream.end();
  console.log(`\nCollected ${done}/${total} runs (${unverified} UNVERIFIED${stopped ? '; stopped early by circuit-breaker' : ''}) -> ${outFile}`);
  const recs = fs.readFileSync(outFile, 'utf8').trim().split(/\r?\n/).filter(Boolean).map((l) => JSON.parse(l));
  analyzeRecords(recs);
  const unv = recs.filter((r) => r.verdict === 'UNVERIFIED');
  if (unv.length) {
    console.log(`\n=== UNVERIFIED cases — drill into WHY (node scripts/diag/compare-evidence-pools.cjs <jobId> [<jobId>...]) ===`);
    for (const u of unv) console.log(`  ${u.jobId}  truth=${u.truth ?? '-'}  "${u.label}"`);
  }
})();
