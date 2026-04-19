import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("fs", async () => {
  const actual = await vi.importActual<typeof import("fs")>("fs");
  return {
    ...actual,
    readFileSync: vi.fn(() => "Claim A: {{CLAIM_A}}\nClaim B: {{CLAIM_B}}\nReturn JSON only."),
  };
});

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn(() => "mock-anthropic-model"),
}));

vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

import { generateText } from "ai";
import { runPairedJobAudit } from "@/lib/calibration/paired-job-audit";

const mockGenerateText = vi.mocked(generateText);

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
    vi.clearAllMocks();
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

  it("verifies inverse relations from fenced JSON responses", async () => {
    const jobA = makeJobBody({ id: "job-a", inputValue: "Entity A increased emissions in Year Y." });
    const jobB = makeJobBody({ id: "job-b", inputValue: "Entity A did not increase emissions in Year Y." });

    vi.stubGlobal("fetch", mockFetch(
      { body: jobA },
      { body: jobB },
    ));
    mockGenerateText.mockResolvedValueOnce({
      text: '```json\n{ "isStrictInverse": true, "reasoning": "Same scope and opposite polarity." }\n```',
    } as any);

    const result = await runPairedJobAudit({
      jobIdA: "job-a",
      jobIdB: "job-b",
      apiBaseUrl: TEST_API_URL,
      verifyInverseRelation: true,
    });

    expect(result.isConfirmedInverse).toBe(true);
    expect(result.inverseVerificationReasoning).toBe("Same scope and opposite polarity.");
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
    expect(mockGenerateText).toHaveBeenCalledWith(expect.objectContaining({
      prompt: expect.stringContaining("Claim A: Entity A increased emissions in Year Y."),
    }));
  });

  it("degrades gracefully when inverse verification returns invalid JSON", async () => {
    vi.stubGlobal("fetch", mockFetch(
      { body: makeJobBody({ id: "job-a", inputValue: "Claim A" }) },
      { body: makeJobBody({ id: "job-b", inputValue: "Claim B" }) },
    ));
    mockGenerateText.mockResolvedValueOnce({
      text: "not valid json",
    } as any);

    const result = await runPairedJobAudit({
      jobIdA: "job-a",
      jobIdB: "job-b",
      apiBaseUrl: TEST_API_URL,
      verifyInverseRelation: true,
    });

    expect(result.isConfirmedInverse).toBe(false);
    expect(result.inverseVerificationReasoning).toContain("Inverse verification unavailable:");
    expect(result.inverseVerificationReasoning).toContain("No JSON object found");
  });

  it("skips inverse LLM verification when one claim is empty", async () => {
    vi.stubGlobal("fetch", mockFetch(
      { body: makeJobBody({ id: "job-a", inputValue: "   " }) },
      { body: makeJobBody({ id: "job-b", inputValue: "Claim B" }) },
    ));

    const result = await runPairedJobAudit({
      jobIdA: "job-a",
      jobIdB: "job-b",
      apiBaseUrl: TEST_API_URL,
      verifyInverseRelation: true,
    });

    expect(result.isConfirmedInverse).toBe(false);
    expect(result.inverseVerificationReasoning).toBe(
      "Inverse verification unavailable: one or both claims are empty.",
    );
    expect(mockGenerateText).not.toHaveBeenCalled();
  });
});
