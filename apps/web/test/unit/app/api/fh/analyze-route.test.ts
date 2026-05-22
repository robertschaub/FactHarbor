import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockEvaluateInputPolicy = vi.fn();
const mockGetClientIp = vi.fn(() => "203.0.113.10");
const mockLoadPipelineConfig = vi.fn();
const mockFetch = vi.fn();

vi.mock("@/lib/input-policy-gate", () => ({
  evaluateInputPolicy: (...args: unknown[]) => mockEvaluateInputPolicy(...args),
}));

vi.mock("@/lib/auth", () => ({
  getClientIp: (...args: unknown[]) => mockGetClientIp(...args),
}));

vi.mock("@/lib/config-loader", () => ({
  loadPipelineConfig: (...args: unknown[]) => mockLoadPipelineConfig(...args),
}));

describe("analyze proxy route", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
    process.env.FH_API_BASE_URL = "http://api.local";
    mockEvaluateInputPolicy.mockResolvedValue({ decision: "allow" });
    mockLoadPipelineConfig.mockResolvedValue({
      config: { defaultPipelineVariant: "claimboundary-v2" },
    });
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ jobId: "job-1", status: "QUEUED" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.FH_API_BASE_URL;
  });

  it("forwards the UCM default pipeline variant when the client omits one", async () => {
    const { POST } = await import("@/app/api/fh/analyze/route");

    const response = await POST(new Request("http://localhost/api/fh/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inputType: "text",
        inputValue: "A verifiable claim",
      }),
    }));

    expect(response.status).toBe(200);
    expect(mockLoadPipelineConfig).toHaveBeenCalledWith("default");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.local/v1/analyze",
      expect.objectContaining({
        body: JSON.stringify({
          inputType: "text",
          inputValue: "A verifiable claim",
          pipelineVariant: "claimboundary-v2",
          inviteCode: undefined,
        }),
      }),
    );
  });

  it("rejects unsupported explicit pipeline variants before proxying upstream", async () => {
    const { POST } = await import("@/app/api/fh/analyze/route");

    const response = await POST(new Request("http://localhost/api/fh/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        inputType: "text",
        inputValue: "A verifiable claim",
        pipelineVariant: "claimboundary-v3",
      }),
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Invalid pipelineVariant: must be one of 'claimboundary', 'claimboundary-v2'",
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
