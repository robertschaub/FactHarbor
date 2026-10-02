import { afterEach, expect, it, vi } from "vitest";
import { GET } from "@/app/api/fh/jobs/[id]/route";

afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

it.each([undefined, "incorrect", "test-admin"])("forwards capture access only for a validated admin key (%s)", async key => {
  vi.stubEnv("FH_API_BASE_URL", "http://example.invalid");
  vi.stubEnv("FH_ADMIN_KEY", "test-admin");
  const capture = { evidenceApplicability: { privateText: "capture-only-secret" } };
  const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
    const forwarded = new Headers(init?.headers).get("x-admin-key");
    expect(forwarded).toBe(key === "test-admin" ? "test-admin" : null);
    // API projection itself is covered in JobsControllerCaptureTests.
    return Response.json({ resultJson: { verdict: "UNVERIFIED", ...(forwarded ? { adminCapture: capture } : {}) } });
  });
  const response = await GET(new Request("http://example.invalid/api/fh/jobs/test", {
    headers: key ? { "x-admin-key": key } : {},
  }), { params: Promise.resolve({ id: "test" }) });
  const data = await response.json();
  expect(data.resultJson.adminCapture).toEqual(key === "test-admin" ? capture : undefined);
  expect(fetch).toHaveBeenCalledTimes(1);
});
