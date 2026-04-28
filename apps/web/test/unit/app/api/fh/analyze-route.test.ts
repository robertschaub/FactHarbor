import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockEvaluateInputPolicy = vi.fn();
const mockGetClientIp = vi.fn(() => "127.0.0.1");
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

function createJsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
}

describe("analyze proxy route", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
    process.env.FH_API_BASE_URL = "http://api.local";
    mockEvaluateInputPolicy.mockResolvedValue({ decision: "allow" });
    mockLoadPipelineConfig.mockResolvedValue({
      config: { claimSelectionDefaultMode: "interactive" },
    });
    mockFetch.mockResolvedValue(createJsonResponse({ jobId: "job-1", status: "QUEUED" }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env = { ...originalEnv };
  });

  it("rejects legacy direct analysis when the active claim-selection mode is automatic", async () => {
    mockLoadPipelineConfig.mockResolvedValueOnce({
      config: { claimSelectionDefaultMode: "automatic" },
    });
    const { POST } = await import("@/app/api/fh/analyze/route");

    const response = await POST(
      new Request("http://localhost/api/fh/analyze", {
        method: "POST",
        body: JSON.stringify({
          inputType: "text",
          inputValue: "hello world",
        }),
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: "Automatic claim selection requires the claim-selection draft endpoint",
      claimSelectionDraftEndpoint: "/api/fh/claim-selection-drafts",
    });
    expect(mockEvaluateInputPolicy).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("rejects explicit automatic mode on the legacy direct route before upstream job creation", async () => {
    const { POST } = await import("@/app/api/fh/analyze/route");

    const response = await POST(
      new Request("http://localhost/api/fh/analyze", {
        method: "POST",
        body: JSON.stringify({
          inputType: "text",
          inputValue: "hello world",
          selectionMode: "automatic",
        }),
      }),
    );

    expect(response.status).toBe(409);
    expect(mockLoadPipelineConfig).not.toHaveBeenCalled();
    expect(mockEvaluateInputPolicy).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fails closed when default claim-selection mode cannot be loaded", async () => {
    mockLoadPipelineConfig.mockRejectedValueOnce(new Error("config unavailable"));
    const { POST } = await import("@/app/api/fh/analyze/route");

    const response = await POST(
      new Request("http://localhost/api/fh/analyze", {
        method: "POST",
        body: JSON.stringify({
          inputType: "text",
          inputValue: "hello world",
        }),
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to determine claim-selection mode; direct analysis was not started",
    });
    expect(mockEvaluateInputPolicy).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fails closed when config loading returns the loader error fallback", async () => {
    mockLoadPipelineConfig.mockResolvedValueOnce({
      config: { claimSelectionDefaultMode: "interactive" },
      contentHash: "__ERROR_FALLBACK__",
      fromDefault: true,
    });
    const { POST } = await import("@/app/api/fh/analyze/route");

    const response = await POST(
      new Request("http://localhost/api/fh/analyze", {
        method: "POST",
        body: JSON.stringify({
          inputType: "text",
          inputValue: "hello world",
        }),
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Unable to determine claim-selection mode; direct analysis was not started",
    });
    expect(mockEvaluateInputPolicy).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fails closed when an active config hash falls back to defaults", async () => {
    mockLoadPipelineConfig.mockResolvedValueOnce({
      config: { claimSelectionDefaultMode: "interactive" },
      contentHash: "active-hash-with-missing-blob",
      fromDefault: true,
    });
    const { POST } = await import("@/app/api/fh/analyze/route");

    const response = await POST(
      new Request("http://localhost/api/fh/analyze", {
        method: "POST",
        body: JSON.stringify({
          inputType: "text",
          inputValue: "hello world",
        }),
      }),
    );

    expect(response.status).toBe(503);
    expect(mockEvaluateInputPolicy).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("keeps the legacy direct route available when claim-selection mode is interactive", async () => {
    const { POST } = await import("@/app/api/fh/analyze/route");

    const response = await POST(
      new Request("http://localhost/api/fh/analyze", {
        method: "POST",
        headers: { "x-admin-key": "secret" },
        body: JSON.stringify({
          inputType: "text",
          inputValue: "hello world",
          pipelineVariant: "claimboundary",
          inviteCode: "INVITE",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.local/v1/analyze",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          "x-admin-key": "secret",
          "x-forwarded-for": "127.0.0.1",
        }),
        body: JSON.stringify({
          inputType: "text",
          inputValue: "hello world",
          pipelineVariant: "claimboundary",
          inviteCode: "INVITE",
        }),
      }),
    );
    await expect(response.json()).resolves.toEqual({ jobId: "job-1", status: "QUEUED" });
  });
});
