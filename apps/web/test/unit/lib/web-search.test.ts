import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SEARCH_CONFIG } from "@/lib/config-schemas";
import { searchWebWithProvider } from "@/lib/web-search";

const {
  mockGetCachedSearchResults,
  mockCacheSearchResults,
  mockIsProviderAvailable,
  mockRecordSuccess,
  mockRecordFailure,
  mockRecordSearchQuery,
  mockSearchGoogleCse,
  mockSearchBrave,
  mockSearchWikipedia,
  mockSearchSemanticScholar,
  mockSearchGoogleFactCheck,
} = vi.hoisted(() => ({
  mockGetCachedSearchResults: vi.fn(),
  mockCacheSearchResults: vi.fn(),
  mockIsProviderAvailable: vi.fn(),
  mockRecordSuccess: vi.fn(),
  mockRecordFailure: vi.fn(),
  mockRecordSearchQuery: vi.fn(),
  mockSearchGoogleCse: vi.fn(),
  mockSearchBrave: vi.fn(),
  mockSearchWikipedia: vi.fn(),
  mockSearchSemanticScholar: vi.fn(),
  mockSearchGoogleFactCheck: vi.fn(),
}));

vi.mock("@/lib/search-cache", () => ({
  getCachedSearchResults: mockGetCachedSearchResults,
  cacheSearchResults: mockCacheSearchResults,
}));

vi.mock("@/lib/search-circuit-breaker", () => ({
  isProviderAvailable: mockIsProviderAvailable,
  recordSuccess: mockRecordSuccess,
  recordFailure: mockRecordFailure,
}));

vi.mock("@/lib/analyzer/metrics-integration", () => ({
  recordSearchQuery: mockRecordSearchQuery,
}));

vi.mock("@/lib/search-google-cse", () => ({
  searchGoogleCse: mockSearchGoogleCse,
}));

vi.mock("@/lib/search-brave", () => ({
  searchBrave: mockSearchBrave,
}));

vi.mock("@/lib/search-wikipedia", () => ({
  searchWikipedia: mockSearchWikipedia,
}));

vi.mock("@/lib/search-semanticscholar", () => ({
  searchSemanticScholar: mockSearchSemanticScholar,
}));

vi.mock("@/lib/search-factcheck-api", () => ({
  searchGoogleFactCheck: mockSearchGoogleFactCheck,
}));

describe("searchWebWithProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("GOOGLE_CSE_API_KEY", "test-key");
    vi.stubEnv("GOOGLE_CSE_ID", "test-cse");
    vi.stubEnv("BRAVE_API_KEY", "test-brave");
    mockGetCachedSearchResults.mockResolvedValue(null);
    mockCacheSearchResults.mockResolvedValue(undefined);
    mockIsProviderAvailable.mockReturnValue(true);
    mockRecordSuccess.mockReturnValue(undefined);
    mockRecordFailure.mockReturnValue(undefined);
    mockRecordSearchQuery.mockReturnValue(undefined);
    mockSearchGoogleCse.mockResolvedValue([]);
    mockSearchBrave.mockResolvedValue([]);
    mockSearchWikipedia.mockResolvedValue([]);
    mockSearchSemanticScholar.mockResolvedValue([]);
    mockSearchGoogleFactCheck.mockResolvedValue([]);
  });

  it("skips supplementary providers in AUTO mode when a primary provider returns results", async () => {
    mockSearchGoogleCse.mockResolvedValue([
      { url: "https://example.com/primary", title: "Primary", snippet: "Primary snippet" },
    ]);

    const response = await searchWebWithProvider({
      query: "test query",
      maxResults: 5,
      config: {
        ...DEFAULT_SEARCH_CONFIG,
        provider: "auto",
        providers: {
          ...DEFAULT_SEARCH_CONFIG.providers,
          googleCse: { enabled: true, priority: 1, dailyQuotaLimit: 0 },
          wikipedia: { enabled: true, priority: 3, dailyQuotaLimit: 0, language: "en" },
          semanticScholar: { enabled: true, priority: 4, dailyQuotaLimit: 0 },
          googleFactCheck: { enabled: true, priority: 5, dailyQuotaLimit: 0 },
        },
      },
    });

    expect(mockSearchGoogleCse).toHaveBeenCalledTimes(1);
    expect(mockSearchWikipedia).not.toHaveBeenCalled();
    expect(mockSearchSemanticScholar).not.toHaveBeenCalled();
    expect(mockSearchGoogleFactCheck).not.toHaveBeenCalled();
    expect(response.providersUsed).toEqual(["Google-CSE"]);
  });

  it("allows supplementary providers in AUTO mode when no primary provider returns results", async () => {
    mockSearchWikipedia.mockResolvedValue([
      { url: "https://example.com/wiki", title: "Wiki", snippet: "Wiki snippet" },
    ]);

    const response = await searchWebWithProvider({
      query: "test query",
      maxResults: 5,
      config: {
        ...DEFAULT_SEARCH_CONFIG,
        provider: "auto",
        providers: {
          ...DEFAULT_SEARCH_CONFIG.providers,
          googleCse: { enabled: true, priority: 1, dailyQuotaLimit: 0 },
          wikipedia: { enabled: true, priority: 3, dailyQuotaLimit: 0, language: "en" },
          semanticScholar: { enabled: false, priority: 4, dailyQuotaLimit: 0 },
          googleFactCheck: { enabled: false, priority: 5, dailyQuotaLimit: 0 },
        },
      },
    });

    expect(mockSearchGoogleCse).toHaveBeenCalledTimes(1);
    expect(mockSearchWikipedia).toHaveBeenCalledTimes(1);
    expect(response.results).toEqual([
      { url: "https://example.com/wiki", title: "Wiki", snippet: "Wiki snippet" },
    ]);
    expect(response.providersUsed).toContain("Wikipedia");
  });

  it("falls back to DEFAULT_SEARCH_CONFIG if config is missing evaluationSearch block", async () => {
    // If we pass no config, it uses global defaults
    mockSearchGoogleCse.mockResolvedValue([{ url: "https://def.com", title: "Def", snippet: null }]);

    const response = await searchWebWithProvider({
      query: "test query",
      maxResults: 5,
      // No config passed -> should use DEFAULT_SEARCH_CONFIG
    });

    expect(mockSearchGoogleCse).toHaveBeenCalled();
    expect(response.results).toHaveLength(1);
  });
});
