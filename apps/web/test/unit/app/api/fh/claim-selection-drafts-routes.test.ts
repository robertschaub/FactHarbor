import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockEvaluateInputPolicy = vi.fn();
const mockBuildClaimSelectionDraftForwardHeaders = vi.fn(() => ({ "Content-Type": "application/json" }));
const mockForwardTextResponse = vi.fn(async (response: Response) => {
  const text = await response.text();
  return new Response(text, {
    status: response.status,
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    },
  });
});
const mockGetClaimSelectionDraftApiBase = vi.fn(() => "http://api.local");
const mockResolveDraftId = vi.fn(async () => "draft-1");
const mockFetch = vi.fn();

vi.mock("@/lib/input-policy-gate", () => ({
  evaluateInputPolicy: (...args: unknown[]) => mockEvaluateInputPolicy(...args),
}));

vi.mock("@/lib/claim-selection-draft-proxy", () => ({
  buildClaimSelectionDraftForwardHeaders: (...args: unknown[]) =>
    mockBuildClaimSelectionDraftForwardHeaders(...args),
  forwardTextResponse: (...args: unknown[]) => mockForwardTextResponse(...args),
  getClaimSelectionDraftApiBase: (...args: unknown[]) => mockGetClaimSelectionDraftApiBase(...args),
  resolveDraftId: (...args: unknown[]) => mockResolveDraftId(...args),
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

describe("claim-selection draft proxy routes", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);

    mockEvaluateInputPolicy.mockResolvedValue({ decision: "allow" });
    mockGetClaimSelectionDraftApiBase.mockReturnValue("http://api.local");
    mockResolveDraftId.mockResolvedValue("draft-1");
    mockFetch.mockResolvedValue(createJsonResponse({ ok: true }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects empty create input before policy evaluation or upstream fetch", async () => {
    const { POST } = await import("@/app/api/fh/claim-selection-drafts/route");

    const response = await POST(
      new Request("http://localhost/api/fh/claim-selection-drafts", {
        method: "POST",
        body: JSON.stringify({
          inputType: "text",
          inputValue: "   ",
          selectionMode: "interactive",
        }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "inputValue must be a non-empty string",
    });
    expect(mockEvaluateInputPolicy).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("rejects empty restart input before policy evaluation or upstream fetch", async () => {
    const { POST } = await import("@/app/api/fh/claim-selection-drafts/[draftId]/restart/route");

    const response = await POST(
      new Request("http://localhost/api/fh/claim-selection-drafts/draft-1/restart", {
        method: "POST",
        body: JSON.stringify({
          inputType: "text",
          inputValue: "\n\t",
        }),
      }),
      { params: Promise.resolve({ draftId: "draft-1" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "inputValue must be a non-empty string",
    });
    expect(mockEvaluateInputPolicy).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("rejects malformed selectedClaimIds in the confirm route", async () => {
    const { POST } = await import("@/app/api/fh/claim-selection-drafts/[draftId]/confirm/route");

    const response = await POST(
      new Request("http://localhost/api/fh/claim-selection-drafts/draft-1/confirm", {
        method: "POST",
        body: JSON.stringify({ selectedClaimIds: ["valid", "", 123] }),
      }),
      { params: Promise.resolve({ draftId: "draft-1" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "selectedClaimIds must contain one or more non-empty strings",
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("forwards a normalized confirm payload when selectedClaimIds are valid", async () => {
    const { POST } = await import("@/app/api/fh/claim-selection-drafts/[draftId]/confirm/route");

    mockFetch.mockResolvedValueOnce(createJsonResponse({ finalJobId: "job-1" }));

    const response = await POST(
      new Request("http://localhost/api/fh/claim-selection-drafts/draft-1/confirm", {
        method: "POST",
        body: JSON.stringify({ selectedClaimIds: ["  AC-1  ", "AC-2"] }),
      }),
      { params: Promise.resolve({ draftId: "draft-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.local/v1/claim-selection-drafts/draft-1/confirm",
      expect.objectContaining({
        body: JSON.stringify({ selectedClaimIds: ["AC-1", "AC-2"] }),
      }),
    );
  });

  it("does not enforce the configured selection cap in the proxy route", async () => {
    const { POST } = await import("@/app/api/fh/claim-selection-drafts/[draftId]/confirm/route");

    mockFetch.mockResolvedValueOnce(createJsonResponse({ error: "upstream validation" }, { status: 400 }));

    const response = await POST(
      new Request("http://localhost/api/fh/claim-selection-drafts/draft-1/confirm", {
        method: "POST",
        body: JSON.stringify({
          selectedClaimIds: ["AC-1", "AC-2", "AC-3", "AC-4", "AC-5", "AC-6"],
        }),
      }),
      { params: Promise.resolve({ draftId: "draft-1" }) },
    );

    expect(response.status).toBe(400);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.local/v1/claim-selection-drafts/draft-1/confirm",
      expect.objectContaining({
        body: JSON.stringify({
          selectedClaimIds: ["AC-1", "AC-2", "AC-3", "AC-4", "AC-5", "AC-6"],
        }),
      }),
    );
  });
});
