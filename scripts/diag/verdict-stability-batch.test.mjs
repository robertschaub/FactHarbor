// Offline tests: stubbed fetch, a 127.0.0.1 fake API and a temp metrics DB. No jobs, providers or real database.
// Run: node --test scripts/diag/verdict-stability-batch.test.mjs
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, 'verdict-stability-batch.cjs');
const { waitFor } = createRequire(import.meta.url)(script);

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
