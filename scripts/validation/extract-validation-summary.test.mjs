// Offline tests: stubbed fetch and a 127.0.0.1 fake API. No jobs, providers or database.
// Run: node --test "scripts/validation/*.test.mjs"
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { basename, dirname, join, resolve } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, "extract-validation-summary.js");
const outputRoot = resolve(here, "../../test-output/validation");
const { waitForJob } = createRequire(import.meta.url)(script);

const jobResponse = (status) => new Response(JSON.stringify({ jobId: "job-1", status }), { status: 200 });

function stubFetch(t, respond) {
  const realFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => respond(++calls);
  t.after(() => {
    globalThis.fetch = realFetch;
  });
  return () => calls;
}

for (const status of ["SUCCEEDED", "FAILED", "CANCELLED"]) {
  test(`waitForJob returns once the job is ${status}`, async (t) => {
    const calls = stubFetch(t, () => jobResponse(status));
    const job = await waitForJob("job-1", { timeoutMs: 1_000, pollIntervalMs: 1 });
    assert.equal(job.status, status);
    assert.equal(calls(), 1);
  });
}

test("waitForJob keeps polling through QUEUED, RUNNING and INTERRUPTED", async (t) => {
  const sequence = ["QUEUED", "RUNNING", "INTERRUPTED", "QUEUED", "RUNNING", "SUCCEEDED"];
  const calls = stubFetch(t, (n) => jobResponse(sequence[n - 1]));
  const job = await waitForJob("job-1", { timeoutMs: 5_000, pollIntervalMs: 1 });
  assert.equal(job.status, "SUCCEEDED");
  assert.equal(calls(), sequence.length);
});

test("waitForJob rejects when the job is still non-terminal at the wait bound", async (t) => {
  stubFetch(t, () => jobResponse("RUNNING"));
  await assert.rejects(
    waitForJob("job-1", { timeoutMs: 30, pollIntervalMs: 5 }),
    /Job job-1 still RUNNING after 0\.03s/,
  );
});

test("waitForJob rejects when the job status cannot be read", async (t) => {
  stubFetch(t, () => new Response("unavailable", { status: 503 }));
  await assert.rejects(waitForJob("job-1", { timeoutMs: 1_000, pollIntervalMs: 1 }), /Poll failed \(503\)/);
});

// Fake API: records every submission; `submit` and `poll` shape the responses per test.
async function startFakeApi(t, { submit = () => ({}), poll }) {
  const submissions = [];
  const server = createServer((req, res) => {
    const send = (code, body) => {
      res.writeHead(code, { "Content-Type": "application/json" });
      res.end(JSON.stringify(body));
    };
    if (req.method === "GET" && req.url === "/health") return send(200, { ok: true });
    if (req.method === "POST" && req.url === "/v1/analyze") {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });
      req.on("end", () => {
        submissions.push(JSON.parse(body).inputValue);
        const n = submissions.length;
        const { code = 200, body: reply = { jobId: `job-${n}`, status: "QUEUED" } } = submit(n);
        send(code, reply);
      });
      return;
    }
    if (req.method === "GET" && req.url.startsWith("/v1/jobs/")) {
      const jobId = req.url.slice("/v1/jobs/".length);
      const { code = 200, ...fields } = poll(jobId);
      return send(code, { jobId, ...fields });
    }
    send(404, { error: "not found" });
  });
  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  t.after(() => new Promise((resolveClose) => server.close(resolveClose)));
  return { url: `http://127.0.0.1:${server.address().port}`, submissions };
}

// The runner writes to test-output/validation/<batchLabel>, so the batch label is a fresh temp dir there.
function createBatch(t, familyNames) {
  mkdirSync(outputRoot, { recursive: true });
  const dir = mkdtempSync(join(outputRoot, "unit-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const familiesFile = join(dir, "families.json");
  const families = familyNames.map((familyName) => ({ familyName, inputType: "text", inputValue: `Entity ${familyName} did X` }));
  writeFileSync(familiesFile, JSON.stringify(families));
  const readJson = (name) => JSON.parse(readFileSync(join(dir, name), "utf8"));
  return { label: basename(dir), familiesFile, readJson, readManifest: () => readJson("manifest.json") };
}

function runBatch(batch, apiUrl) {
  const env = { ...process.env, FH_API_URL: apiUrl, FH_JOB_TIMEOUT_MS: "200" };
  delete env.FH_ADMIN_KEY;
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, [script, batch.label, batch.familiesFile], { env, timeout: 20_000 });
    let output = "";
    child.stdout.on("data", (chunk) => {
      output += chunk;
    });
    child.stderr.on("data", (chunk) => {
      output += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => resolveRun({ code, output }));
  });
}

// Each case leaves fam_a's job possibly running, so fam_b must never be submitted.
for (const { condition, api: behavior, result } of [
  {
    condition: "job is still RUNNING at the wait bound",
    api: { poll: () => ({ status: "RUNNING", progress: 40 }) },
    result: { status: "NOT_TERMINAL", jobId: "job-1" },
  },
  {
    condition: "job status cannot be read",
    api: { poll: () => ({ code: 503 }) },
    result: { status: "NOT_TERMINAL", jobId: "job-1" },
  },
  {
    condition: "stale-job watchdog marks the job FAILED while its pipeline keeps running",
    api: { poll: () => ({ status: "FAILED", progress: 57 }) },
    result: { status: "FAILED", jobId: "job-1" },
  },
  {
    condition: "job is CANCELLED, which the runner aborts only at its next checkpoint",
    api: { poll: () => ({ status: "CANCELLED", progress: 40 }) },
    result: { status: "CANCELLED", jobId: "job-1" },
  },
  {
    condition: "submission fails in a way that may have created a job",
    api: { submit: () => ({ code: 503, body: { error: "unavailable" } }), poll: () => ({ status: "RUNNING" }) },
    result: { status: "NOT_TERMINAL", jobId: null },
  },
]) {
  test(`batch stops without submitting the next family when the ${condition}`, async (t) => {
    const api = await startFakeApi(t, behavior);
    const batch = createBatch(t, ["fam_a", "fam_b"]);
    const { code, output } = await runBatch(batch, api.url);
    assert.equal(code, 2, output);
    assert.equal(api.submissions.length, 1);
    const manifest = batch.readManifest();
    assert.deepEqual(manifest.results.map(({ status, jobId }) => ({ status, jobId })), [result]);
    assert.deepEqual(manifest.stopped.notSubmitted, ["fam_b"]);
    assert.match(output, /STOPPED: /);
  });
}

test("batch continues after a rejected submission, a FAILED job at progress 100, or a SUCCEEDED job", async (t) => {
  const api = await startFakeApi(t, {
    submit: (n) => (n === 1 ? { code: 400, body: { error: "rejected" } } : {}),
    poll: (jobId) =>
      jobId === "job-2"
        ? { status: "FAILED", progress: 100 }
        : { status: "SUCCEEDED", progress: 100, resultJson: { truthPercentage: 70, verdict: "MOSTLY-TRUE", confidence: 65 } },
  });
  const batch = createBatch(t, ["fam_a", "fam_b", "fam_c", "fam_d"]);
  const { code, output } = await runBatch(batch, api.url);
  assert.equal(code, 0, output);
  assert.equal(api.submissions.length, 4);
  const manifest = batch.readManifest();
  assert.deepEqual(manifest.results.map(({ status }) => status), ["ERROR", "FAILED", "OK", "OK"]);
  assert.equal(manifest.stopped, undefined);
  const summary = batch.readJson("fam_c.json");
  assert.deepEqual(
    { jobId: summary.run.jobId, inputText: summary.run.inputText, verdict: summary.article.verdict },
    { jobId: "job-3", inputText: "Entity fam_c did X", verdict: "MOSTLY-TRUE" },
  );
});
