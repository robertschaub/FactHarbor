import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ config: vi.fn(), health: vi.fn() }));
vi.mock("@/lib/config-storage", () => ({
  getConfig: mocks.config,
  getActiveConfig: vi.fn(async () => null),
  validateConfigContent: vi.fn(async () => ({ valid: true, warnings: [] })),
}));
vi.mock("@/lib/search-cache", () => ({ getSearchCacheHealth: mocks.health }));
import { GET } from "@/app/api/health/route";

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of ["FH_ADMIN_KEY", "FH_INTERNAL_RUNNER_KEY", "ANTHROPIC_API_KEY"]) vi.stubEnv(key, "offline-placeholder");
  vi.stubEnv("FH_API_BASE_URL", "http://offline.invalid");
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 200 })));
  mocks.config.mockImplementation(async type => ({ config: type === "pipeline" ? { llmProvider: "anthropic" } : { cache: { enabled: true } } }));
  mocks.health.mockResolvedValue({ ok: true, status: "ready" });
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it.each([
  [{ ok: true, status: "ready" }, "healthy"],
  [{ ok: false, status: "unavailable" }, "degraded"],
])("reports initialization availability without changing HTTP availability: %j", async (health, status) => {
  mocks.health.mockResolvedValue(health);
  const response = await GET(), body = await response.json();
  expect(response.status).toBe(200);
  expect(body.ok).toBe(true);
  expect(body.status).toBe(status);
  expect(body.searchCache).toEqual(health);
  expect(body.searchCache).not.toHaveProperty("path");
  expect(body.searchCache).not.toHaveProperty("error");
  expect(mocks.health).toHaveBeenCalledWith(true);
});

it("honors disabled UCM cache even when the environment default is enabled", async () => {
  vi.stubEnv("FH_SEARCH_CACHE_ENABLED", "true");
  mocks.config.mockImplementation(async type => ({ config: type === "pipeline" ? { llmProvider: "anthropic" } : { cache: { enabled: false } } }));
  mocks.health.mockResolvedValue({ ok: true, status: "disabled" });
  const body = await (await GET()).json();
  expect(mocks.health).toHaveBeenCalledWith(false);
  expect(body.status).toBe("healthy");
  expect(body.searchCache).toEqual({ ok: true, status: "disabled" });
});

it("reports not_checked without exposing a configuration failure", async () => {
  mocks.config.mockImplementation(async type => {
    if (type === "search") throw new Error("private filesystem path");
    return { config: { llmProvider: "anthropic" } };
  });
  const response = await GET(), body = await response.json();
  expect(response.status).toBe(200);
  expect(body.status).toBe("degraded");
  expect(body.searchCache).toEqual({ ok: null, status: "not_checked" });
  expect(JSON.stringify(body)).not.toContain("private filesystem path");
  expect(mocks.health).not.toHaveBeenCalled();
});
