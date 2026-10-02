// Offline tests: stubbed fetch, a 127.0.0.1 fake API and a temp metrics DB. No jobs, providers or real database.
// Run: node --test scripts/diag/verdict-stability-batch.test.mjs
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, 'verdict-stability-batch.cjs');
const {
  waitFor,
  verifyStaticPreflight,
  verifyActivePreflight,
  verifyFinishedJob,
  validateExecutionManifest,
  freezeExecutionManifest,
  verifyInvocationPreflight,
  sha256File,
} = createRequire(import.meta.url)(script);

const CONFIG_HASHES = {
  'pipeline/default': '1'.repeat(64),
  'search/default': '2'.repeat(64),
  'calculation/default': '3'.repeat(64),
  'sr/default': '4'.repeat(64),
  'prompt/claimboundary': '5'.repeat(64),
};

function json(file, value) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function preflightFixture({ singleArm = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'verdict-preflight-repo-'));
  const inputValue = 'Entity A did X';
  const inputRel = 'pilot/input.json';
  const artifactRel = 'pilot/runner.cjs';
  const templateRel = 'pilot/preflight.template.json';
  const planRel = 'pilot/plan.json';
  const inputPath = join(root, inputRel);
  const artifactPath = join(root, artifactRel);
  const templatePath = join(root, templateRel);
  json(join(root, 'Docs/AGENTS/benchmark-expectations.json'), { families: [{ inputValue }] });
  json(inputPath, [{ inputType: 'text', inputValue }]);
  mkdirSync(dirname(artifactPath), { recursive: true });
  writeFileSync(artifactPath, 'runner');
  const runnerRel = 'scripts/diag/verdict-stability-batch.cjs';
  mkdirSync(dirname(join(root, runnerRel)), { recursive: true });
  writeFileSync(join(root, runnerRel), readFileSync(script));
  writeFileSync(join(root, 'dirty-sentinel.txt'), 'clean');
  writeFileSync(join(root, '.gitignore'), 'test-output/\n');
  json(join(root, planRel), {
    planId: 'test-pilot',
    input: { file: inputRel, runsPerArm: 1 },
    sequence: [
      { arm: 'A', n: 1, out: 'test-output/a.jsonl' },
      ...singleArm ? [] : [{ arm: 'B', n: 1, out: 'test-output/b.jsonl' }],
    ],
  });
  const template = {
    schemaVersion: '1.0',
    planId: 'test-pilot',
    planPath: planRel,
    requireClean: true,
    input: { path: inputRel, sha256: sha256File(inputPath), count: 1 },
    artifactPaths: [artifactRel, runnerRel, templateRel, planRel, 'Docs/AGENTS/benchmark-expectations.json'],
    runPolicy: { runsPerInvocation: 1, requireFreshOutput: true, ...singleArm ? { armMode: 'single' } : {} },
    arms: {
      A: { outputPath: 'test-output/a.jsonl', activeConfigs: { ...CONFIG_HASHES } },
      ...singleArm ? {} : { B: { outputPath: 'test-output/b.jsonl', activeConfigs: { ...CONFIG_HASHES, 'pipeline/default': '__SET_AFTER_UCM_SAVE__' } } },
    },
  };
  json(templatePath, template);
  execFileSync('git', ['init'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'test@example.invalid'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: root });
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['commit', '-m', 'fixture'], { cwd: root });
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const artifacts = Object.fromEntries(template.artifactPaths.map((file) => [file, sha256File(join(root, file))]));
  const arms = JSON.parse(JSON.stringify(template.arms));
  if (arms.B) arms.B.activeConfigs['pipeline/default'] = '6'.repeat(64);
  const manifest = {
    schemaVersion: '1.0', planId: template.planId, approvedCommit: commit, requireClean: true,
    template: { path: templateRel, sha256: sha256File(templatePath) },
    input: template.input, artifacts, runPolicy: template.runPolicy, arms,
  };
  return { root, inputPath, artifactPath, templatePath, templateRel, manifest, preflight: { arm: 'A', manifest } };
}

const jobResponse = (status) => new Response(JSON.stringify({ jobId: 'job-1', status }), { status: 200 });

function stubFetch(t, respond) {
  const realFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => respond(++calls);
  t.after(() => {
    globalThis.fetch = realFetch;
  });
  return () => calls;
}

for (const status of ['SUCCEEDED', 'FAILED', 'CANCELLED']) {
  test(`waitFor returns once the job is ${status}`, async (t) => {
    const calls = stubFetch(t, () => jobResponse(status));
    const job = await waitFor('job-1', { timeoutMs: 1_000, pollMs: 1 });
    assert.equal(job.status, status);
    assert.equal(calls(), 1);
  });
}

test('waitFor keeps polling through QUEUED, RUNNING and INTERRUPTED', async (t) => {
  const sequence = ['QUEUED', 'RUNNING', 'INTERRUPTED', 'QUEUED', 'RUNNING', 'SUCCEEDED'];
  const calls = stubFetch(t, (n) => jobResponse(sequence[n - 1]));
  const job = await waitFor('job-1', { timeoutMs: 5_000, pollMs: 1 });
  assert.equal(job.status, 'SUCCEEDED');
  assert.equal(calls(), sequence.length);
});

test('waitFor rejects when the job is still non-terminal at the wait bound', async (t) => {
  stubFetch(t, () => jobResponse('RUNNING'));
  await assert.rejects(waitFor('job-1', { timeoutMs: 30, pollMs: 5 }), /job job-1 still RUNNING after 0\.03s/);
});

test('waitFor rejects when the job status cannot be read', async (t) => {
  stubFetch(t, () => new Response('unavailable', { status: 503 }));
  await assert.rejects(waitFor('job-1', { timeoutMs: 1_000, pollMs: 1 }), /poll 503/);
});

for (const singleArm of [false, true]) {
test(`static preflight fails closed on shape, input, artifact, commit and dirty-tree drift (${singleArm ? 'single' : 'paired'})`, () => {
  const fixture = preflightFixture({ singleArm });
  try {
    assert.doesNotThrow(() => verifyStaticPreflight(fixture.preflight, fixture.inputPath, { root: fixture.root }));

    const falseClean = structuredClone(fixture.manifest);
    falseClean.requireClean = false;
    assert.throws(() => validateExecutionManifest(falseClean, fixture.root), /requireClean must be true/);

    const emptyArtifacts = structuredClone(fixture.manifest);
    emptyArtifacts.artifacts = {};
    assert.throws(() => validateExecutionManifest(emptyArtifacts, fixture.root), /artifacts must match/);

    fixture.manifest.input.sha256 = '0'.repeat(64);
    assert.throws(() => verifyStaticPreflight(fixture.preflight, fixture.inputPath, { root: fixture.root }), /input contract does not match template/);
    fixture.manifest.input.sha256 = sha256File(fixture.inputPath);

    fixture.manifest.artifacts['pilot/runner.cjs'] = '0'.repeat(64);
    assert.throws(() => verifyStaticPreflight(fixture.preflight, fixture.inputPath, { root: fixture.root }), /artifact hash mismatch/);
    fixture.manifest.artifacts['pilot/runner.cjs'] = sha256File(fixture.artifactPath);

    fixture.manifest.approvedCommit = 'a'.repeat(40);
    assert.throws(() => verifyStaticPreflight(fixture.preflight, fixture.inputPath, { root: fixture.root }), /commit mismatch/);
    fixture.manifest.approvedCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: fixture.root, encoding: 'utf8' }).trim();

    writeFileSync(join(fixture.root, 'dirty-sentinel.txt'), 'dirty');
    assert.throws(() => verifyStaticPreflight(fixture.preflight, fixture.inputPath, { root: fixture.root }), /working tree is not clean/);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});
}

test('execution manifest is generated after a clean reviewed commit without rewriting tracked files', () => {
  const fixture = preflightFixture();
  try {
    const output = 'test-output/execution.json';
    const frozen = freezeExecutionManifest(fixture.templateRel, output, '6'.repeat(64), { root: fixture.root });
    assert.equal(frozen.manifest.approvedCommit, fixture.manifest.approvedCommit);
    assert.equal(frozen.manifest.arms.B.activeConfigs['pipeline/default'], '6'.repeat(64));
    assert.deepEqual(Object.keys(frozen.manifest.artifacts).sort(), Object.keys(fixture.manifest.artifacts).sort());
    assert.equal(execFileSync('git', ['status', '--porcelain'], { cwd: fixture.root, encoding: 'utf8' }).trim(), '');
    assert.throws(() => freezeExecutionManifest(fixture.templateRel, output, '6'.repeat(64), { root: fixture.root }), /EEXIST/);
    assert.throws(() => freezeExecutionManifest(fixture.templateRel, 'test-output/no-b.json', undefined, { root: fixture.root }), /arm B config hash/);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('single-arm freeze preserves config/artifact pins and invocation guards without a B hash', () => {
  const f = preflightFixture({ singleArm: true });
  try {
    const options = { root: f.root };
    assert.throws(() => freezeExecutionManifest(f.templateRel, 'test-output/bad.json', '6'.repeat(64), options), /does not accept an arm B/);
    const frozen = freezeExecutionManifest(f.templateRel, 'test-output/execution.json', undefined, options);
    assert.deepEqual(Object.keys(frozen.manifest.arms), ['A']);
    assert.deepEqual(frozen.manifest.arms.A.activeConfigs, CONFIG_HASHES);
    assert.deepEqual(frozen.manifest.artifacts, f.manifest.artifacts);
    const preflight = { arm: 'A', manifest: frozen.manifest };
    assert.doesNotThrow(() => verifyStaticPreflight(preflight, f.inputPath, options));
    assert.doesNotThrow(() => verifyInvocationPreflight(preflight, { n: 1 }, 'test-output/a.jsonl', options));
    assert.throws(() => verifyInvocationPreflight(preflight, { n: 2 }, 'test-output/a.jsonl', options), /exactly 1 run/);
    assert.throws(() => verifyInvocationPreflight(preflight, { n: 1 }, 'test-output/b.jsonl', options), /--out must resolve/);
    writeFileSync(join(f.root, 'test-output/a.jsonl'), 'existing');
    assert.throws(() => verifyInvocationPreflight(preflight, { n: 1 }, 'test-output/a.jsonl', options), /output already exists/);
    assert.throws(() => freezeExecutionManifest(f.templateRel, 'test-output/execution.json', undefined, options), /EEXIST/);
  } finally { rmSync(f.root, { recursive: true, force: true }); }
});

test('single-arm manifests reject arm, policy and configuration-shape tampering', () => {
  const f = preflightFixture({ singleArm: true });
  try {
    for (const [mutate, error] of [
      [m => { m.arms.B = structuredClone(m.arms.A); }, /exactly arms A/],
      [m => { delete m.arms.A; }, /exactly arms A/],
      [m => { delete m.runPolicy.armMode; }, /runPolicy does not match/],
      [m => { delete m.arms.A.activeConfigs['sr/default']; }, /five required config keys/],
      [m => { m.arms.A.activeConfigs['sr/default'] = 'abc'; }, /64-character/],
      [m => { m.arms.A.activeConfigs['sr/default'] = '9'.repeat(64); }, /does not match template/],
    ]) {
      const manifest = structuredClone(f.manifest);
      mutate(manifest);
      assert.throws(() => validateExecutionManifest(manifest, f.root), error);
    }
  } finally { rmSync(f.root, { recursive: true, force: true }); }
  const paired = preflightFixture();
  try {
    for (const arm of ['A', 'B']) {
      const changed = structuredClone(paired.manifest);
      changed.arms[arm].activeConfigs['sr/default'] = '9'.repeat(64);
      assert.throws(() => validateExecutionManifest(changed, paired.root), /does not match template/);
    }
    const selectedB = structuredClone(paired.manifest);
    selectedB.arms.B.activeConfigs['pipeline/default'] = '9'.repeat(64);
    assert.doesNotThrow(() => validateExecutionManifest(selectedB, paired.root));
    delete paired.manifest.arms.B;
    assert.throws(() => validateExecutionManifest(paired.manifest, paired.root), /exactly arms A and B/);
  } finally { rmSync(paired.root, { recursive: true, force: true }); }
});

test('single-arm templates require explicit mode and exactly one matching A step', () => {
  const f = preflightFixture({ singleArm: true });
  try {
    const originalTemplate = JSON.parse(readFileSync(f.templatePath, 'utf8'));
    const planPath = join(f.root, originalTemplate.planPath);
    const originalPlan = JSON.parse(readFileSync(planPath, 'utf8'));
    for (const [mutate, error] of [
      [(t, p) => { delete t.runPolicy.armMode; }, /exactly arms A and B/],
      [(t, p) => { t.runPolicy.armMode = 'typo'; }, /armMode must be single/],
      [(t, p) => { t.arms.B = structuredClone(t.arms.A); }, /exactly arms A/],
      [(t, p) => { delete t.arms.A; }, /exactly arms A/],
      [(t, p) => { p.sequence = []; }, /exactly one A step/],
      [(t, p) => { p.sequence.push(structuredClone(p.sequence[0])); }, /exactly one A step/],
      [(t, p) => { p.sequence[0].arm = 'B'; }, /does not match the pinned plan sequence/],
      [(t, p) => { p.sequence[0].n = 2; }, /does not match the pinned plan sequence/],
      [(t, p) => { p.sequence[0].out = 'test-output/b.jsonl'; }, /does not match the pinned plan sequence/],
    ]) {
      const template = structuredClone(originalTemplate), plan = structuredClone(originalPlan);
      mutate(template, plan);
      json(f.templatePath, template); json(planPath, plan);
      const manifest = structuredClone(f.manifest);
      manifest.template.sha256 = sha256File(f.templatePath);
      assert.throws(() => validateExecutionManifest(manifest, f.root), error);
    }
  } finally { rmSync(f.root, { recursive: true, force: true }); }
});

test('single-arm CLI freezes and plans with no network and rejects B before execution', () => {
  const f = preflightFixture({ singleArm: true });
  try {
    const outputDir = join(f.root, 'test-output');
    mkdirSync(outputDir);
    const guard = join(outputDir, 'deny-network.cjs');
    writeFileSync(guard, "globalThis.fetch = () => { throw new Error('Network forbidden in offline CLI fixture'); };\n");
    const copiedScript = join(f.root, 'scripts/diag/verdict-stability-batch.cjs');
    const invoke = args => execFileSync(process.execPath, ['--require', guard, copiedScript, ...args], {
      cwd: f.root, encoding: 'utf8', timeout: 10_000, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, FH_API_URL: 'http://127.0.0.1:1', FH_INVITE_CODE: 'OFFLINE',
        FH_DB_PATH: join(outputDir, 'no-api.db'), FH_CONFIG_DB_PATH: join(outputDir, 'no-config.db') },
    });
    assert.match(invoke(['--freeze-preflight-template', f.templateRel, '--manifest-out', 'test-output/execution.json']), /EXECUTION PREFLIGHT FROZEN/);
    const manifest = JSON.parse(readFileSync(join(outputDir, 'execution.json'), 'utf8'));
    assert.deepEqual(Object.keys(manifest.arms), ['A']);
    const args = ['--inputs', f.inputPath, '--n', '1', '--preflight', 'test-output/execution.json'];
    assert.match(invoke([...args, '--arm', 'A']), /PLAN ONLY/);
    assert.throws(() => invoke([...args, '--arm', 'B', '--run']), error => {
      assert.match(error.stderr, /preflight requires --arm matching one of: A/);
      assert.doesNotMatch(error.stderr, /Network forbidden/);
      return true;
    });
    assert.throws(() => invoke([...args, '--arm', 'A', '--preflight-only']), error => {
      assert.match(error.stderr, /unable to open database/i);
      assert.match(error.stderr, /no-config\.db/);
      assert.doesNotMatch(error.stderr, /Network forbidden/);
      return true;
    });
    assert.equal(existsSync(join(outputDir, 'a.jsonl')), false);
  } finally { rmSync(f.root, { recursive: true, force: true }); }
});

test('shipped paired template remains valid without touching historical output paths', () => {
  const root = join(here, '..', '..');
  const templateRel = 'scripts/diag/model-upgrade-pilot/preflight-manifest.template.json';
  const templatePath = join(root, templateRel);
  const template = JSON.parse(readFileSync(templatePath, 'utf8'));
  const arms = structuredClone(template.arms);
  arms.B.activeConfigs['pipeline/default'] = '6'.repeat(64);
  const manifest = {
    schemaVersion: '1.0', planId: template.planId, approvedCommit: 'a'.repeat(40), requireClean: true,
    template: { path: templateRel, sha256: sha256File(templatePath) },
    input: template.input,
    artifacts: Object.fromEntries(template.artifactPaths.map(file => [file, sha256File(join(root, file))])),
    runPolicy: template.runPolicy, arms,
  };
  assert.doesNotThrow(() => validateExecutionManifest(manifest, root));
});

test('active and finished-job preflights enforce config and commit provenance', () => {
  const dir = mkdtempSync(join(tmpdir(), 'verdict-preflight-'));
  try {
    const apiDb = join(dir, 'api.db');
    const configDb = join(dir, 'config.db');
    const commit = 'a'.repeat(40);
    const hashes = CONFIG_HASHES;
    execFileSync('sqlite3', [apiDb], { input: [
      'CREATE TABLE Jobs (JobId TEXT, Status TEXT, ExecutedWebGitCommitHash TEXT, PromptContentHash TEXT);',
      'CREATE TABLE AnalysisMetrics (JobId TEXT, CreatedUtc TEXT, MetricsJson TEXT);',
      `INSERT INTO Jobs VALUES ('job-ok','SUCCEEDED','${commit}','${hashes['prompt/claimboundary']}');`,
      `INSERT INTO AnalysisMetrics VALUES ('job-ok','2026-01-01','{"telemetryContext":{"pipelineCommitId":"${commit}"}}');`,
    ].join('\n') });
    execFileSync('sqlite3', [configDb], { input: [
      'CREATE TABLE config_active (config_type TEXT, profile_key TEXT, active_hash TEXT);',
      'CREATE TABLE config_usage (job_id TEXT, config_type TEXT, profile_key TEXT, content_hash TEXT);',
      ...Object.entries(hashes).flatMap(([key, hash]) => {
        const [type, profile] = key.split('/');
        return [
          `INSERT INTO config_active VALUES ('${type}','${profile}','${hash}');`,
          `INSERT INTO config_usage VALUES ('job-ok','${type}','${profile}','${hash}');`,
        ];
      }),
    ].join('\n') });
    const preflight = { arm: 'A', manifest: { approvedCommit: commit, arms: { A: { activeConfigs: hashes } } } };
    assert.doesNotThrow(() => verifyActivePreflight(preflight, { apiDbPath: apiDb, configDbPath: configDb }));
    assert.doesNotThrow(() => verifyFinishedJob(preflight, 'job-ok', { apiDbPath: apiDb, configDbPath: configDb }));
    execFileSync('sqlite3', [configDb], { input: "UPDATE config_active SET active_hash='0' WHERE config_type='pipeline';" });
    assert.throws(() => verifyActivePreflight(preflight, { apiDbPath: apiDb, configDbPath: configDb }), /active config mismatch/);
    execFileSync('sqlite3', [configDb], { input: `UPDATE config_active SET active_hash='${hashes['pipeline/default']}' WHERE config_type='pipeline'; DELETE FROM config_active WHERE config_type='search';` });
    assert.throws(() => verifyActivePreflight(preflight, { apiDbPath: apiDb, configDbPath: configDb }), /got missing/);
    execFileSync('sqlite3', [configDb], { input: `INSERT INTO config_usage VALUES ('job-ok','pipeline','default','${'9'.repeat(64)}');` });
    assert.throws(() => verifyFinishedJob(preflight, 'job-ok', { apiDbPath: apiDb, configDbPath: configDb }), /postflight config mismatch/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// The script reads per-job telemetry with the sqlite3 CLI and retries for about 10 s when none is found,
// so batch runs read a seeded temp DB instead of apps/api/factharbor.db.
const dbDir = mkdtempSync(join(tmpdir(), 'verdict-stability-db-'));
after(() => rmSync(dbDir, { recursive: true, force: true }));
const dbPath = join(dbDir, 'metrics.db');
const metricsRows = [1, 2, 3, 4].map((n) => `('job-${n}', '2026-01-01', '{"telemetryContext":{"pipelineCommitShort":"abc1234"}}')`);
execFileSync('sqlite3', [dbPath], {
  input: `CREATE TABLE AnalysisMetrics (JobId TEXT, CreatedUtc TEXT, MetricsJson TEXT); INSERT INTO AnalysisMetrics VALUES ${metricsRows.join(', ')};`,
});

// Fake API: records every submission; `submit` and `poll` shape the responses per test.
async function startFakeApi(t, { submit = () => ({}), poll }) {
  const submissions = [];
  const server = createServer((req, res) => {
    const send = (code, body) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    if (req.method === 'GET' && req.url === '/health') return send(200, { ok: true });
    if (req.method === 'POST' && req.url === '/v1/analyze') {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        submissions.push(JSON.parse(body).inputValue);
        const n = submissions.length;
        const { code = 200, body: reply = { jobId: `job-${n}`, status: 'QUEUED' }, drop = false } = submit(n);
        if (drop) return req.socket.destroy();
        send(code, reply);
      });
      return;
    }
    if (req.method === 'GET' && req.url.startsWith('/v1/jobs/')) {
      const jobId = req.url.slice('/v1/jobs/'.length);
      const { code = 200, ...fields } = poll(jobId);
      return send(code, { jobId, ...fields });
    }
    send(404, { error: 'not found' });
  });
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen));
  t.after(() => new Promise((resolveClose) => server.close(resolveClose)));
  return { url: `http://127.0.0.1:${server.address().port}`, submissions };
}

function runControlledFailure(t, apiUrl, { n, populateOutput = false, singleArm = false }) {
  const { root, manifest } = preflightFixture({ singleArm });
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const manifestFile = join(root, 'test-output/execution.json');
  json(manifestFile, manifest);
  const output = join(root, manifest.arms.A.outputPath);
  if (populateOutput) {
    mkdirSync(dirname(output), { recursive: true });
    writeFileSync(output, 'existing\n');
  }
  const env = { ...process.env, FH_API_URL: apiUrl, FH_JOB_TIMEOUT_MS: '200', FH_DB_PATH: dbPath };
  const args = [
    join(root, 'scripts/diag/verdict-stability-batch.cjs'),
    '--inputs', join(root, manifest.input.path),
    '--n', String(n),
    '--preflight', manifestFile,
    '--arm', 'A',
    '--run',
    '--out', manifest.arms.A.outputPath,
  ];
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, args, { cwd: root, env, timeout: 20_000 });
    let outputText = '';
    child.stdout.on('data', (chunk) => { outputText += chunk; });
    child.stderr.on('data', (chunk) => { outputText += chunk; });
    child.on('error', reject);
    child.on('close', (code) => resolveRun({ code, output: outputText }));
  });
}

for (const singleArm of [false, true]) {
test(`controlled preflight rejects repeated counts before any submission (${singleArm ? 'single' : 'paired'})`, async (t) => {
  const api = await startFakeApi(t, { poll: () => ({ status: 'SUCCEEDED', progress: 100 }) });
  const result = await runControlledFailure(t, api.url, { n: 2, singleArm });
  assert.notEqual(result.code, 0, result.output);
  assert.match(result.output, /authorizes exactly 1 run/);
  assert.equal(api.submissions.length, 0);
});

test(`controlled preflight rejects a populated arm output before any submission (${singleArm ? 'single' : 'paired'})`, async (t) => {
  const api = await startFakeApi(t, { poll: () => ({ status: 'SUCCEEDED', progress: 100 }) });
  const result = await runControlledFailure(t, api.url, { n: 1, populateOutput: true, singleArm });
  assert.notEqual(result.code, 0, result.output);
  assert.match(result.output, /output already exists/);
  assert.equal(api.submissions.length, 0);
});
}

// Two inputs x 2 runs, so a stop must end both the run loop and the input loop.
function runBatch(t, apiUrl) {
  const dir = mkdtempSync(join(tmpdir(), 'verdict-stability-run-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const inputsFile = join(dir, 'inputs.json');
  const outFile = join(dir, 'results.jsonl');
  const inputs = ['a', 'b'].map((x) => ({ inputType: 'text', inputValue: `Entity ${x.toUpperCase()} did X`, note: `input-${x}` }));
  writeFileSync(inputsFile, JSON.stringify(inputs));
  const env = { ...process.env, FH_API_URL: apiUrl, FH_JOB_TIMEOUT_MS: '200', FH_DB_PATH: dbPath };
  delete env.FH_ADMIN_KEY;
  const args = [script, '--inputs', inputsFile, '--n', '2', '--run', '--out', outFile];
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, args, { env, timeout: 20_000 });
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += chunk;
    });
    child.stderr.on('data', (chunk) => {
      output += chunk;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      const lines = existsSync(outFile) ? readFileSync(outFile, 'utf8').trim().split(/\r?\n/).filter(Boolean) : [];
      resolveRun({ code, output, records: lines.map((line) => JSON.parse(line)) });
    });
  });
}

// Each case leaves the first job possibly running, so no further run may be submitted.
for (const { condition, api: behavior, result } of [
  {
    condition: 'job is still RUNNING at the wait bound',
    api: { poll: () => ({ status: 'RUNNING', progress: 40 }) },
    result: { status: 'NOT_TERMINAL', jobId: 'job-1' },
  },
  {
    condition: 'job status cannot be read',
    api: { poll: () => ({ code: 503 }) },
    result: { status: 'NOT_TERMINAL', jobId: 'job-1' },
  },
  {
    condition: 'stale-job watchdog marks the job FAILED while its pipeline keeps running',
    api: { poll: () => ({ status: 'FAILED', progress: 57 }) },
    result: { status: 'FAILED', jobId: 'job-1' },
  },
  {
    condition: 'job is CANCELLED, which the runner aborts only at its next checkpoint',
    api: { poll: () => ({ status: 'CANCELLED', progress: 40 }) },
    result: { status: 'CANCELLED', jobId: 'job-1' },
  },
  {
    // A non-array `sources` makes the run record throw after waitFor returned.
    condition: 'job is CANCELLED and its run record cannot be built',
    api: { poll: () => ({ status: 'CANCELLED', progress: 40, resultJson: { sources: {} } }) },
    result: { status: 'ERROR', jobId: 'job-1' },
  },
  {
    condition: 'submission fails with a 5xx that may have created a job',
    api: { submit: () => ({ code: 503, body: { error: 'unavailable' } }), poll: () => ({ status: 'RUNNING' }) },
    result: { status: 'NOT_TERMINAL', jobId: null },
  },
  {
    condition: 'submission connection drops before a response',
    api: { submit: () => ({ drop: true }), poll: () => ({ status: 'RUNNING' }) },
    result: { status: 'NOT_TERMINAL', jobId: null },
  },
]) {
  test(`batch stops without submitting another run when the ${condition}`, async (t) => {
    const api = await startFakeApi(t, behavior);
    const { code, output, records } = await runBatch(t, api.url);
    assert.equal(code, 2, output);
    assert.equal(api.submissions.length, 1);
    assert.deepEqual(records.map(({ status, jobId }) => ({ status, jobId })), [result]);
    assert.match(output, /STOPPED: /);
    assert.match(output, /Not submitted: 3 of 4 runs\./);
  });
}

test('batch continues after a rejected submission, a runner-exit FAILED job, or a SUCCEEDED job', async (t) => {
  const api = await startFakeApi(t, {
    submit: (n) => (n === 1 ? { code: 400, body: { error: 'rejected' } } : {}),
    poll: (jobId) =>
      jobId === 'job-2'
        ? { status: 'FAILED', progress: 100 }
        : { status: 'SUCCEEDED', progress: 100, resultJson: { verdict: 'MOSTLY-TRUE', truthPercentage: 70, sources: [{ url: 'https://example.org/a' }] } },
  });
  const { code, output, records } = await runBatch(t, api.url);
  assert.equal(code, 0, output);
  assert.equal(api.submissions.length, 4);
  assert.deepEqual(
    records.map(({ label, status, jobId }) => ({ label, status, jobId })),
    [
      { label: 'input-a', status: 'ERROR', jobId: null },
      { label: 'input-a', status: 'FAILED', jobId: 'job-2' },
      { label: 'input-b', status: 'SUCCEEDED', jobId: 'job-3' },
      { label: 'input-b', status: 'SUCCEEDED', jobId: 'job-4' },
    ],
  );
  assert.deepEqual(
    { verdict: records[3].verdict, truth: records[3].truth, pipelineCommitShort: records[3].pipelineCommitShort },
    { verdict: 'MOSTLY-TRUE', truth: 70, pipelineCommitShort: 'abc1234' },
  );
  assert.doesNotMatch(output, /STOPPED/);
});

test('the UNVERIFIED circuit breaker still ends the batch with exit code 0', async (t) => {
  const api = await startFakeApi(t, {
    poll: () => ({ status: 'SUCCEEDED', progress: 100, resultJson: { verdict: 'UNVERIFIED', sources: [] } }),
  });
  const { code, output, records } = await runBatch(t, api.url);
  assert.equal(code, 0, output);
  assert.equal(api.submissions.length, 2);
  assert.deepEqual(records.map(({ verdict }) => verdict), ['UNVERIFIED', 'UNVERIFIED']);
  assert.match(output, /CIRCUIT-BREAKER/);
  assert.doesNotMatch(output, /STOPPED/);
});
