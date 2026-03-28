import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockGenerateText = vi.fn();
const mockLoadPipelineConfig = vi.fn();
const mockLoadSearchConfig = vi.fn();
const mockGetCacheStats = vi.fn();
const mockGetAllProviderStats = vi.fn();
const mockGetProviderStats = vi.fn();
const mockCheckAdminKey = vi.fn();

vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => mockGenerateText(...args),
}));

vi.mock("@ai-sdk/openai", () => ({
  openai: vi.fn((model: string) => ({ provider: "openai", model })),
}));

vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: vi.fn((model: string) => ({ provider: "anthropic", model })),
}));

vi.mock("@ai-sdk/google", () => ({
  google: vi.fn((model: string) => ({ provider: "google", model })),
}));

vi.mock("@ai-sdk/mistral", () => ({
  mistral: vi.fn((model: string) => ({ provider: "mistral", model })),
}));

vi.mock("@/lib/config-loader", () => ({
  loadPipelineConfig: (...args: unknown[]) => mockLoadPipelineConfig(...args),
  loadSearchConfig: (...args: unknown[]) => mockLoadSearchConfig(...args),
}));

vi.mock("@/lib/search-cache", () => ({
  getCacheStats: (...args: unknown[]) => mockGetCacheStats(...args),
}));

vi.mock("@/lib/search-circuit-breaker", () => ({
  getAllProviderStats: (...args: unknown[]) => mockGetAllProviderStats(...args),
  getProviderStats: (...args: unknown[]) => mockGetProviderStats(...args),
}));

vi.mock("@/lib/auth", () => ({
  checkAdminKey: (...args: unknown[]) => mockCheckAdminKey(...args),
}));

vi.mock("@/lib/analyzer/model-tiering", () => ({
  ANTHROPIC_MODELS: {
    budget: { modelId: "claude-3-5-haiku-latest" },
  },
}));

const originalEnv = { ...process.env };

function createPipelineConfig(overrides: Record<string, unknown> = {}) {
  return {
    llmProvider: "anthropic",
    debateRoles: {
      advocate: { provider: "anthropic", strength: "standard" },
      selfConsistency: { provider: "anthropic", strength: "standard" },
      challenger: { provider: "openai", strength: "standard" },
      reconciler: { provider: "anthropic", strength: "standard" },
      validation: { provider: "anthropic", strength: "budget" },
    },
    ...overrides,
  };
}

async function runRouteGet() {
  vi.resetModules();
  const { GET } = await import("@/app/api/admin/test-config/route");
  return GET(new Request("http://localhost/api/admin/test-config") as never);
}

describe("Admin test-config route", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };

    mockCheckAdminKey.mockReturnValue(true);
    mockGenerateText.mockResolvedValue({ text: "OK" });
    mockLoadSearchConfig.mockResolvedValue({
      config: { enabled: false, provider: "auto" },
      contentHash: "search-hash",
      overrides: [],
      fromCache: false,
      fromDefault: false,
    });
    mockLoadPipelineConfig.mockResolvedValue({
      config: createPipelineConfig(),
      contentHash: "pipeline-hash",
      overrides: [],
      fromCache: false,
      fromDefault: false,
    });
    mockGetCacheStats.mockResolvedValue({
      validEntries: 0,
      totalQueries: 0,
      expiredEntries: 0,
      dbSizeBytes: 0,
    });
    mockGetAllProviderStats.mockReturnValue([]);
    mockGetProviderStats.mockReturnValue(undefined);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("tests OpenAI when the active debate configuration uses it", async () => {
    process.env.ANTHROPIC_API_KEY = "anthropic-test-key";
    process.env.OPENAI_API_KEY = "openai-test-key";

    const response = await runRouteGet();
    const data = await response.json();

    const openAiResult = data.results.find((result: any) => result.service === "OpenAI");
    const anthropicResult = data.results.find((result: any) => result.service === "Anthropic");

    expect(response.status).toBe(200);
    expect(openAiResult.status).toBe("success");
    expect(openAiResult.details).toContain("debateRoles.challenger");
    expect(anthropicResult.status).toBe("success");
    expect(mockGenerateText).toHaveBeenCalledTimes(2);
    expect(mockGenerateText).toHaveBeenCalledWith(expect.objectContaining({ maxRetries: 0 }));
  });

  it("skips providers that are neither used nor configured", async () => {
    process.env.ANTHROPIC_API_KEY = "anthropic-test-key";

    mockLoadPipelineConfig.mockResolvedValue({
      config: createPipelineConfig({
        debateRoles: {
          advocate: { provider: "anthropic", strength: "standard" },
          selfConsistency: { provider: "anthropic", strength: "standard" },
          challenger: { provider: "anthropic", strength: "standard" },
          reconciler: { provider: "anthropic", strength: "standard" },
          validation: { provider: "anthropic", strength: "budget" },
        },
      }),
      contentHash: "pipeline-hash",
      overrides: [],
      fromCache: false,
      fromDefault: false,
    });

    const response = await runRouteGet();
    const data = await response.json();

    const openAiResult = data.results.find((result: any) => result.service === "OpenAI");

    expect(response.status).toBe(200);
    expect(openAiResult.status).toBe("skipped");
    expect(openAiResult.message).toBe("Not used by the active default pipeline config");
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });

  it("skips configured Google credentials when Google is not used by the active config", async () => {
    process.env.ANTHROPIC_API_KEY = "anthropic-test-key";
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "google-test-key";

    mockLoadPipelineConfig.mockResolvedValue({
      config: createPipelineConfig({
        debateRoles: {
          advocate: { provider: "anthropic", strength: "standard" },
          selfConsistency: { provider: "anthropic", strength: "standard" },
          challenger: { provider: "anthropic", strength: "standard" },
          reconciler: { provider: "anthropic", strength: "standard" },
          validation: { provider: "anthropic", strength: "budget" },
        },
      }),
      contentHash: "pipeline-hash",
      overrides: [],
      fromCache: false,
      fromDefault: false,
    });

    const response = await runRouteGet();
    const data = await response.json();

    const googleResult = data.results.find((result: any) => result.service === "Google Generative AI");

    expect(response.status).toBe(200);
    expect(googleResult.status).toBe("skipped");
    expect(googleResult.message).toBe("Not used by the active default pipeline config");
    expect(mockGenerateText).toHaveBeenCalledTimes(1);
  });

  it("tests Google when the active debate configuration uses it", async () => {
    process.env.ANTHROPIC_API_KEY = "anthropic-test-key";
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = "google-test-key";

    mockLoadPipelineConfig.mockResolvedValue({
      config: createPipelineConfig({
        debateRoles: {
          advocate: { provider: "anthropic", strength: "standard" },
          selfConsistency: { provider: "google", strength: "standard" },
          challenger: { provider: "openai", strength: "standard" },
          reconciler: { provider: "anthropic", strength: "standard" },
          validation: { provider: "anthropic", strength: "budget" },
        },
      }),
      contentHash: "pipeline-hash",
      overrides: [],
      fromCache: false,
      fromDefault: false,
    });

    process.env.OPENAI_API_KEY = "openai-test-key";

    const response = await runRouteGet();
    const data = await response.json();

    const googleResult = data.results.find((result: any) => result.service === "Google Generative AI");

    expect(response.status).toBe(200);
    expect(googleResult.status).toBe("success");
    expect(googleResult.details).toContain("debateRoles.selfConsistency");
    expect(mockGenerateText).toHaveBeenCalledTimes(3);
  });

  it("shows a concise quota message instead of an AI_RetryError stack", async () => {
    process.env.ANTHROPIC_API_KEY = "anthropic-test-key";
    process.env.OPENAI_API_KEY = "openai-test-key";

    mockGenerateText.mockRejectedValueOnce(new Error(
      "AI_RetryError: Failed after 3 attempts. Last error: You exceeded your current quota, please check your plan and billing details."
    ));

    const response = await runRouteGet();
    const data = await response.json();

    const openAiResult = data.results.find((result: any) => result.service === "OpenAI");

    expect(response.status).toBe(200);
    expect(openAiResult.status).toBe("error");
    expect(openAiResult.message).toBe("OpenAI quota or rate limit reached");
    expect(openAiResult.details).toContain("You exceeded your current quota");
    expect(openAiResult.details).not.toContain("AI_RetryError");
  });
});
