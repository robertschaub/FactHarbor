import { describe, it, expect, vi, afterEach } from "vitest";
import { runPairedJobAudit } from "@/lib/calibration/paired-job-audit";

function makeJobBody(overrides?: Partial<{
  id: string;
  status: string;
  inputValue: string;
  resultJson: Record<string, unknown>;
}>) {
  return {
    id: "job-a",
    status: "SUCCEEDED",
    inputValue: "Default claim",
    resultJson: {
      truthPercentage: 60,
      analysisWarnings: [],
    },
    ...overrides,
  };
}

function mockFetch(...responses: Array<{ status?: number; ok?: boolean; body: unknown }>) {
  let callIndex = 0;
  return vi.fn().mockImplementation(() => {
    const resp = responses[callIndex++] ?? responses[responses.length - 1];
    const status = resp.status ?? 200;
    const ok = resp.ok ?? (status >= 200 && status < 300);
    return Promise.resolve({
      ok,
      status,
      statusText: ok ? "OK" : "Error",
      json: () => Promise.resolve(resp.body),
    });
  });
}

const TEST_API_URL = "http://localhost:5000";

describe("runPairedJobAudit", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("computes complementarityError correctly from two job truth percentages", async () => {
    // Job A: 70%, Job B: 40% → CE = |(70 + 40) - 100| = 10
    const jobA = makeJobBody({ id: "job-a", inputValue: "Claim A", resultJson: { truthPercentage: 70, analysisWarnings: [] } });
    const jobB = makeJobBody({ id: "job-b", inputValue: "Claim B", resultJson: { truthPercentage: 40, analysisWarnings: [] } });

    vi.stubGlobal("fetch", mockFetch(
      { body: jobA },
      { body: jobB },
    ));

    const result = await runPairedJobAudit({
      jobIdA: "job-a",
      jobIdB: "job-b",
      apiBaseUrl: TEST_API_URL,
    });

    expect(result.complementarityError).toBe(10);
    expect(result.truthPercentageA).toBe(70);
    expect(result.truthPercentageB).toBe(40);
    expect(result.claimA).toBe("Claim A");
    expect(result.claimB).toBe("Claim B");
    expect(result.isConfirmedInverse).toBeNull(); // verification not requested
  });

  it("maps root-cause tags from warnings on either side", async () => {
    // Job A has a fetch failure warning → root cause: fetch_degradation
    // CE = |(80 + 80) - 100| = 60 (exceeds threshold, so diag runs)
    const jobA = makeJobBody({
      resultJson: {
        truthPercentage: 80,
        analysisWarnings: [
          { type: "source_fetch_failure", severity: "warning", message: "Fetch failed" },
        ],
      },
    });
    const jobB = makeJobBody({
      resultJson: { truthPercentage: 80, analysisWarnings: [] },
    });

    vi.stubGlobal("fetch", mockFetch(
      { body: jobA },
      { body: jobB },
    ));

    const result = await runPairedJobAudit({
      jobIdA: "job-a",
      jobIdB: "job-b",
      apiBaseUrl: TEST_API_URL,
    });

    expect(result.rootCauseTags).toContain("fetch_degradation");
    expect(result.warningsA).toHaveLength(1);
    expect(result.warningsA[0].type).toBe("source_fetch_failure");
    expect(result.warningsB).toHaveLength(0);
  });

  it("throws a descriptive error when a job is not found (404)", async () => {
    vi.stubGlobal("fetch", mockFetch(
      { status: 404, ok: false, body: {} },
      { body: makeJobBody() },
    ));

    await expect(
      runPairedJobAudit({
        jobIdA: "nonexistent-job",
        jobIdB: "job-b",
        apiBaseUrl: TEST_API_URL,
      }),
    ).rejects.toThrow("Job not found: nonexistent-job");
  });

  it("throws a descriptive error when a job is not in SUCCEEDED status", async () => {
    const runningJob = makeJobBody({ id: "running-job", status: "RUNNING" });

    vi.stubGlobal("fetch", mockFetch(
      { body: runningJob },
      { body: makeJobBody() },
    ));

    await expect(
      runPairedJobAudit({
        jobIdA: "running-job",
        jobIdB: "job-b",
        apiBaseUrl: TEST_API_URL,
      }),
    ).rejects.toThrow("not SUCCEEDED");
  });

  it("throws a descriptive error when a SUCCEEDED job has null resultJson", async () => {
    const nullResultJob = { id: "null-result-job", status: "SUCCEEDED", inputValue: "Claim A", resultJson: null };

    vi.stubGlobal("fetch", mockFetch(
      { body: nullResultJob },
      { body: makeJobBody() },
    ));

    await expect(
      runPairedJobAudit({
        jobIdA: "null-result-job",
        jobIdB: "job-b",
        apiBaseUrl: TEST_API_URL,
      }),
    ).rejects.toThrow("has no resultJson");
  });
});
