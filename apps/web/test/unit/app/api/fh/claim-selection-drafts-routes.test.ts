import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockEvaluateInputPolicy = vi.fn();
const mockBuildClaimSelectionDraftForwardHeaders = vi.fn(() => ({ "Content-Type": "application/json" }));
const mockPersistDraftAccessCookie = vi.fn((response: Response, draftId: string, token: string) => {
  response.headers.set("set-cookie", `fh_claim_selection_draft_${draftId}=${token}`);
});
const mockClearDraftAccessCookie = vi.fn((response: Response, draftId: string) => {
  response.headers.set("set-cookie", `fh_claim_selection_draft_${draftId}=; Max-Age=0`);
});
const mockCheckAdminKey = vi.fn(() => false);
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
const mockDrainDraftQueue = vi.fn();
const mockLoadPipelineConfig = vi.fn();
const mockFetch = vi.fn();

vi.mock("@/lib/input-policy-gate", () => ({
  evaluateInputPolicy: (...args: unknown[]) => mockEvaluateInputPolicy(...args),
}));

vi.mock("@/lib/claim-selection-draft-proxy", () => ({
  buildClaimSelectionDraftForwardHeaders: (...args: unknown[]) =>
    mockBuildClaimSelectionDraftForwardHeaders(...args),
  clearDraftAccessCookie: (...args: unknown[]) => mockClearDraftAccessCookie(...args),
  forwardTextResponse: (...args: unknown[]) => mockForwardTextResponse(...args),
  getClaimSelectionDraftApiBase: (...args: unknown[]) => mockGetClaimSelectionDraftApiBase(...args),
  persistDraftAccessCookie: (...args: unknown[]) => mockPersistDraftAccessCookie(...args),
  resolveDraftId: (...args: unknown[]) => mockResolveDraftId(...args),
}));

vi.mock("@/lib/auth", () => ({
  checkAdminKey: (...args: unknown[]) => mockCheckAdminKey(...args),
}));

vi.mock("@/lib/internal-runner-queue", () => ({
  drainDraftQueue: (...args: unknown[]) => mockDrainDraftQueue(...args),
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

describe("claim-selection draft proxy routes", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);

    mockEvaluateInputPolicy.mockResolvedValue({ decision: "allow" });
    mockGetClaimSelectionDraftApiBase.mockReturnValue("http://api.local");
    mockResolveDraftId.mockResolvedValue("draft-1");
    mockCheckAdminKey.mockReturnValue(false);
    mockDrainDraftQueue.mockReset();
    mockLoadPipelineConfig.mockResolvedValue({
      config: { claimSelectionDefaultMode: "interactive" },
    });
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

  it("rejects admin list reads before upstream fetch or queue recovery when admin auth is missing", async () => {
    const { GET } = await import("@/app/api/fh/claim-selection-drafts/route");

    const response = await GET(
      new Request("http://localhost/api/fh/claim-selection-drafts?scope=all"),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Admin key required" });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockDrainDraftQueue).not.toHaveBeenCalled();
  });

  it("forwards admin list reads with whitelisted params and no queue recovery", async () => {
    const { GET } = await import("@/app/api/fh/claim-selection-drafts/route");

    mockCheckAdminKey.mockReturnValueOnce(true);
    mockFetch.mockResolvedValueOnce(createJsonResponse({
      items: [],
      pagination: { page: 2, pageSize: 50, totalCount: 0, totalPages: 0 },
      statusCounts: {},
    }));

    const response = await GET(
      new Request("http://localhost/api/fh/claim-selection-drafts?scope=all&page=2&pageSize=50&q=claim&status=preparing&status=FAILED", {
        headers: { "x-admin-key": "secret" },
      }),
    );

    expect(response.status).toBe(200);
    expect(mockDrainDraftQueue).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, init] = mockFetch.mock.calls[0];
    const calledUrl = new URL(String(url));
    expect(calledUrl.origin).toBe("http://api.local");
    expect(calledUrl.pathname).toBe("/v1/claim-selection-drafts");
    expect(calledUrl.searchParams.get("scope")).toBe("all");
    expect(calledUrl.searchParams.get("page")).toBe("2");
    expect(calledUrl.searchParams.get("pageSize")).toBe("50");
    expect(calledUrl.searchParams.get("q")).toBe("claim");
    expect(calledUrl.searchParams.getAll("status")).toEqual(["PREPARING", "FAILED"]);
    expect(init).toEqual(expect.objectContaining({
      method: "GET",
      cache: "no-store",
      headers: { "X-Admin-Key": "secret" },
    }));
  });

  it("rejects unsupported admin list params before upstream fetch", async () => {
    const { GET } = await import("@/app/api/fh/claim-selection-drafts/route");

    mockCheckAdminKey.mockReturnValueOnce(true);

    const response = await GET(
      new Request("http://localhost/api/fh/claim-selection-drafts?draftStateJson=1", {
        headers: { "x-admin-key": "secret" },
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Unsupported query parameter: draftStateJson",
    });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockDrainDraftQueue).not.toHaveBeenCalled();
  });

  it("rejects admin detail reads before upstream fetch or queue recovery when admin auth is missing", async () => {
    const { GET } = await import("@/app/api/fh/admin/claim-selection-drafts/[draftId]/route");

    const response = await GET(
      new Request("http://localhost/api/fh/admin/claim-selection-drafts/draft-1"),
      { params: Promise.resolve({ draftId: "draft-1" }) },
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Admin key required" });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockDrainDraftQueue).not.toHaveBeenCalled();
  });

  it("forwards admin detail reads without queue recovery", async () => {
    const { GET } = await import("@/app/api/fh/admin/claim-selection-drafts/[draftId]/route");

    mockCheckAdminKey.mockReturnValueOnce(true);
    mockFetch.mockResolvedValueOnce(createJsonResponse({ draftId: "draft-1", status: "PREPARING" }));

    const response = await GET(
      new Request("http://localhost/api/fh/admin/claim-selection-drafts/draft-1", {
        headers: { "x-admin-key": "secret" },
      }),
      { params: Promise.resolve({ draftId: "draft-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mockDrainDraftQueue).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.local/v1/claim-selection-drafts/draft-1",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: { "X-Admin-Key": "secret" },
      }),
    );
  });

  it("forwards admin event history reads without queue recovery", async () => {
    const { GET } = await import("@/app/api/fh/admin/claim-selection-drafts/[draftId]/events/route");

    mockCheckAdminKey.mockReturnValueOnce(true);
    mockFetch.mockResolvedValueOnce(createJsonResponse({ events: [] }));

    const response = await GET(
      new Request("http://localhost/api/fh/admin/claim-selection-drafts/draft-1/events", {
        headers: { "x-admin-key": "secret" },
      }),
      { params: Promise.resolve({ draftId: "draft-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mockDrainDraftQueue).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.local/v1/claim-selection-drafts/draft-1/events",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: { "X-Admin-Key": "secret" },
      }),
    );
  });

  it("persists a draft access cookie when session creation succeeds", async () => {
    const { POST } = await import("@/app/api/fh/claim-selection-drafts/route");

    mockFetch.mockResolvedValueOnce(
      createJsonResponse({
        draftId: "draft-1",
        draftAccessToken: "token-1",
        status: "QUEUED",
        expiresUtc: "2026-04-24T12:00:00.000Z",
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/fh/claim-selection-drafts", {
        method: "POST",
        body: JSON.stringify({
          inputType: "text",
          inputValue: "hello world",
          selectionMode: "automatic",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockPersistDraftAccessCookie).toHaveBeenCalledWith(
      expect.any(Response),
      "draft-1",
      "token-1",
      "2026-04-24T12:00:00.000Z",
    );
    expect(response.headers.get("set-cookie")).toContain("fh_claim_selection_draft_draft-1=token-1");
  });

  it("defaults session creation mode from pipeline config when the client omits it", async () => {
    const { POST } = await import("@/app/api/fh/claim-selection-drafts/route");

    mockLoadPipelineConfig.mockResolvedValueOnce({
      config: { claimSelectionDefaultMode: "interactive" },
    });
    mockFetch.mockResolvedValueOnce(
      createJsonResponse({
        draftId: "draft-1",
        draftAccessToken: "token-1",
        status: "QUEUED",
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/fh/claim-selection-drafts", {
        method: "POST",
        body: JSON.stringify({
          inputType: "text",
          inputValue: "hello world",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockLoadPipelineConfig).toHaveBeenCalledWith("default");
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.local/v1/claim-selection-drafts",
      expect.objectContaining({
        body: JSON.stringify({
          inputType: "text",
          inputValue: "hello world",
          selectionMode: "interactive",
          inviteCode: undefined,
        }),
      }),
    );
    await expect(response.json()).resolves.toMatchObject({
      draftId: "draft-1",
      selectionMode: "interactive",
    });
  });

  it("respects an explicit client selection mode instead of the pipeline default", async () => {
    const { POST } = await import("@/app/api/fh/claim-selection-drafts/route");

    mockLoadPipelineConfig.mockResolvedValueOnce({
      config: { claimSelectionDefaultMode: "interactive" },
    });
    mockFetch.mockResolvedValueOnce(
      createJsonResponse({
        draftId: "draft-1",
        draftAccessToken: "token-1",
        status: "QUEUED",
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/fh/claim-selection-drafts", {
        method: "POST",
        body: JSON.stringify({
          inputType: "text",
          inputValue: "hello world",
          selectionMode: "automatic",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.local/v1/claim-selection-drafts",
      expect.objectContaining({
        body: JSON.stringify({
          inputType: "text",
          inputValue: "hello world",
          selectionMode: "automatic",
          inviteCode: undefined,
        }),
      }),
    );
    await expect(response.json()).resolves.toMatchObject({
      draftId: "draft-1",
      selectionMode: "automatic",
    });
  });

  it("kicks draft queue recovery when loading an existing session", async () => {
    const { GET } = await import("@/app/api/fh/claim-selection-drafts/[draftId]/route");

    mockFetch.mockResolvedValueOnce(createJsonResponse({ draftId: "draft-1", status: "QUEUED" }));

    const response = await GET(
      new Request("http://localhost/api/fh/claim-selection-drafts/draft-1"),
      { params: Promise.resolve({ draftId: "draft-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mockDrainDraftQueue).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.local/v1/claim-selection-drafts/draft-1",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
      }),
    );
  });

  it("clears the draft access cookie when the session has a final job", async () => {
    const { GET } = await import("@/app/api/fh/claim-selection-drafts/[draftId]/route");

    mockFetch.mockResolvedValueOnce(
      createJsonResponse({ draftId: "draft-1", status: "COMPLETED", finalJobId: "job-1" }),
    );

    const response = await GET(
      new Request("http://localhost/api/fh/claim-selection-drafts/draft-1"),
      { params: Promise.resolve({ draftId: "draft-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mockClearDraftAccessCookie).toHaveBeenCalledWith(expect.any(Response), "draft-1");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
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
    expect(mockClearDraftAccessCookie).toHaveBeenCalledWith(expect.any(Response), "draft-1");
  });

  it("clears the draft access cookie when cancellation succeeds", async () => {
    const { POST } = await import("@/app/api/fh/claim-selection-drafts/[draftId]/cancel/route");

    mockFetch.mockResolvedValueOnce(createJsonResponse({ cancelled: true }));

    const response = await POST(
      new Request("http://localhost/api/fh/claim-selection-drafts/draft-1/cancel", {
        method: "POST",
      }),
      { params: Promise.resolve({ draftId: "draft-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mockClearDraftAccessCookie).toHaveBeenCalledWith(expect.any(Response), "draft-1");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
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

  it("forwards hide requests to the upstream draft visibility endpoint", async () => {
    const { POST } = await import("@/app/api/fh/claim-selection-drafts/[draftId]/hide/route");

    mockCheckAdminKey.mockReturnValueOnce(true);
    mockFetch.mockResolvedValueOnce(createJsonResponse({ isHidden: true }));

    const response = await POST(
      new Request("http://localhost/api/fh/claim-selection-drafts/draft-1/hide", {
        method: "POST",
      }),
      { params: Promise.resolve({ draftId: "draft-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.local/v1/claim-selection-drafts/draft-1/hide",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("forwards unhide requests to the upstream draft visibility endpoint", async () => {
    const { POST } = await import("@/app/api/fh/claim-selection-drafts/[draftId]/unhide/route");

    mockCheckAdminKey.mockReturnValueOnce(true);
    mockFetch.mockResolvedValueOnce(createJsonResponse({ isHidden: false }));

    const response = await POST(
      new Request("http://localhost/api/fh/claim-selection-drafts/draft-1/unhide", {
        method: "POST",
      }),
      { params: Promise.resolve({ draftId: "draft-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.local/v1/claim-selection-drafts/draft-1/unhide",
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("allows empty selectedClaimIds when persisting selection activity", async () => {
    const { POST } = await import("@/app/api/fh/claim-selection-drafts/[draftId]/selection-state/route");

    mockFetch.mockResolvedValueOnce(createJsonResponse({ ok: true }));

    const response = await POST(
      new Request("http://localhost/api/fh/claim-selection-drafts/draft-1/selection-state", {
        method: "POST",
        body: JSON.stringify({
          selectedClaimIds: [],
          interactionUtc: "2026-04-23T15:00:00.000Z",
        }),
      }),
      { params: Promise.resolve({ draftId: "draft-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.local/v1/claim-selection-drafts/draft-1/selection-state",
      expect.objectContaining({
        body: JSON.stringify({
          selectedClaimIds: [],
          interactionUtc: "2026-04-23T15:00:00.000Z",
        }),
      }),
    );
  });

  it("clears the draft access cookie when selection-state auto-confirms into a job", async () => {
    const { POST } = await import("@/app/api/fh/claim-selection-drafts/[draftId]/selection-state/route");

    mockFetch.mockResolvedValueOnce(createJsonResponse({ finalJobId: "job-1" }));

    const response = await POST(
      new Request("http://localhost/api/fh/claim-selection-drafts/draft-1/selection-state", {
        method: "POST",
        body: JSON.stringify({
          selectedClaimIds: ["AC-1"],
          interactionUtc: "2026-04-23T15:00:00.000Z",
        }),
      }),
      { params: Promise.resolve({ draftId: "draft-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mockClearDraftAccessCookie).toHaveBeenCalledWith(expect.any(Response), "draft-1");
  });

  it("rejects duplicate selection-state claim ids before forwarding upstream", async () => {
    const { POST } = await import("@/app/api/fh/claim-selection-drafts/[draftId]/selection-state/route");

    const response = await POST(
      new Request("http://localhost/api/fh/claim-selection-drafts/draft-1/selection-state", {
        method: "POST",
        body: JSON.stringify({
          selectedClaimIds: ["AC-1", "AC-1"],
        }),
      }),
      { params: Promise.resolve({ draftId: "draft-1" }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "selectedClaimIds must not contain duplicates",
    });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
