import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockCheckAdminKey = vi.fn(() => false);
const mockGetClientIp = vi.fn(() => "127.0.0.1");
const mockDrainRunnerQueue = vi.fn();
const mockFetch = vi.fn();

vi.mock("@/lib/auth", () => ({
  checkAdminKey: (...args: unknown[]) => mockCheckAdminKey(...args),
  getClientIp: (...args: unknown[]) => mockGetClientIp(...args),
}));

vi.mock("@/lib/internal-runner-queue", () => ({
  drainRunnerQueue: (...args: unknown[]) => mockDrainRunnerQueue(...args),
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

describe("job proxy routes", () => {
  const originalApiBase = process.env.FH_API_BASE_URL;

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal("fetch", mockFetch);
    process.env.FH_API_BASE_URL = "http://api.local";
    mockFetch.mockResolvedValue(createJsonResponse({ jobs: [], pagination: { page: 1, pageSize: 50 } }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    process.env.FH_API_BASE_URL = originalApiBase;
  });

  it("kicks runner recovery when loading the reports list", async () => {
    const { GET } = await import("@/app/api/fh/jobs/route");

    const response = await GET(
      new Request("http://localhost/api/fh/jobs?page=1&pageSize=20") as any,
    );

    expect(response.status).toBe(200);
    expect(mockDrainRunnerQueue).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.local/v1/jobs?page=1&pageSize=20",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: expect.objectContaining({
          "x-forwarded-for": "127.0.0.1",
        }),
      }),
    );
  });

  it("kicks runner recovery when loading a single job", async () => {
    const { GET } = await import("@/app/api/fh/jobs/[id]/route");

    mockFetch.mockResolvedValueOnce(createJsonResponse({ jobId: "job-1", status: "RUNNING" }));

    const response = await GET(
      new Request("http://localhost/api/fh/jobs/job-1"),
      { params: Promise.resolve({ id: "job-1" }) },
    );

    expect(response.status).toBe(200);
    expect(mockDrainRunnerQueue).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "http://api.local/v1/jobs/job-1",
      expect.objectContaining({
        method: "GET",
        cache: "no-store",
        headers: expect.objectContaining({
          "x-forwarded-for": "127.0.0.1",
        }),
      }),
    );
  });
});
