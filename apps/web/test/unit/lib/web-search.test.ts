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

  it("fallback_only skips supplementary providers in AUTO mode when a primary provider returns results", async () => {
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
        supplementaryProviders: { mode: "fallback_only", maxResultsPerProvider: 3 },
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

  // ---------------------------------------------------------------------------
  // Supplementary provider orchestration (supplementaryProviders.mode)
  // ---------------------------------------------------------------------------

  describe("supplementaryProviders.mode", () => {
    const baseConfig = {
      ...DEFAULT_SEARCH_CONFIG,
      provider: "auto" as const,
      providers: {
        ...DEFAULT_SEARCH_CONFIG.providers,
        googleCse: { enabled: true, priority: 1, dailyQuotaLimit: 0 },
        wikipedia: { enabled: true, priority: 3, dailyQuotaLimit: 0, language: "en" },
        semanticScholar: { enabled: false, priority: 4, dailyQuotaLimit: 0 },
        googleFactCheck: { enabled: false, priority: 5, dailyQuotaLimit: 0 },
      },
    };

    it("fallback_only: skips Wikipedia when primary returns results", async () => {
      mockSearchGoogleCse.mockResolvedValue([
        { url: "https://example.com/1", title: "Primary", snippet: "s" },
      ]);

      const response = await searchWebWithProvider({
        query: "test",
        maxResults: 5,
        config: {
          ...baseConfig,
          supplementaryProviders: { mode: "fallback_only", maxResultsPerProvider: 3 },
        },
      });

      expect(mockSearchWikipedia).not.toHaveBeenCalled();
      expect(response.results).toHaveLength(1);
    });

    it("fallback_only: runs Wikipedia when primary returns zero results", async () => {
      mockSearchGoogleCse.mockResolvedValue([]);
      mockSearchWikipedia.mockResolvedValue([
        { url: "https://en.wikipedia.org/wiki/Test", title: "Test", snippet: "wiki" },
      ]);

      const response = await searchWebWithProvider({
        query: "test",
        maxResults: 5,
        config: {
          ...baseConfig,
          supplementaryProviders: { mode: "fallback_only", maxResultsPerProvider: 3 },
        },
      });

      expect(mockSearchWikipedia).toHaveBeenCalledTimes(1);
      expect(response.results).toHaveLength(1);
      expect(response.providersUsed).toContain("Wikipedia");
    });

    it("always_if_enabled: runs Wikipedia even when primary returns results", async () => {
      mockSearchGoogleCse.mockResolvedValue([
        { url: "https://example.com/1", title: "Primary", snippet: "s" },
      ]);
      mockSearchWikipedia.mockResolvedValue([
        { url: "https://en.wikipedia.org/wiki/Test", title: "Wiki", snippet: "wiki" },
      ]);

      const response = await searchWebWithProvider({
        query: "test",
        maxResults: 5,
        config: {
          ...baseConfig,
          supplementaryProviders: { mode: "always_if_enabled", maxResultsPerProvider: 3 },
        },
      });

      expect(mockSearchWikipedia).toHaveBeenCalledTimes(1);
      expect(response.results).toHaveLength(2);
      expect(response.providersUsed).toContain("Google-CSE");
      expect(response.providersUsed).toContain("Wikipedia");
    });

    it("maxResultsPerProvider is threaded to supplementary provider", async () => {
      mockSearchGoogleCse.mockResolvedValue([]);
      mockSearchWikipedia.mockResolvedValue([]);

      await searchWebWithProvider({
        query: "test",
        maxResults: 10,
        config: {
          ...baseConfig,
          supplementaryProviders: { mode: "fallback_only", maxResultsPerProvider: 2 },
        },
      });

      expect(mockSearchWikipedia).toHaveBeenCalledWith(
        expect.objectContaining({ maxResults: 2 }),
      );
    });

    it("Wikipedia disabled: no Wikipedia call regardless of mode", async () => {
      mockSearchGoogleCse.mockResolvedValue([]);

      await searchWebWithProvider({
        query: "test",
        maxResults: 5,
        config: {
          ...baseConfig,
          providers: {
            ...baseConfig.providers,
            wikipedia: { enabled: false, priority: 3, dailyQuotaLimit: 0, language: "en" },
          },
          supplementaryProviders: { mode: "always_if_enabled", maxResultsPerProvider: 3 },
        },
      });

      expect(mockSearchWikipedia).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // Detected language threading
  // ---------------------------------------------------------------------------

  describe("detectedLanguage threading", () => {
    it("threads detectedLanguage into supplementary provider options", async () => {
      mockSearchGoogleCse.mockResolvedValue([]);
      mockSearchWikipedia.mockResolvedValue([]);

      await searchWebWithProvider({
        query: "test query",
        maxResults: 5,
        detectedLanguage: "de",
        config: {
          ...DEFAULT_SEARCH_CONFIG,
          provider: "auto",
          providers: {
            ...DEFAULT_SEARCH_CONFIG.providers,
            googleCse: { enabled: true, priority: 1, dailyQuotaLimit: 0 },
            wikipedia: { enabled: true, priority: 3, dailyQuotaLimit: 0, language: "en" },
          },
          supplementaryProviders: { mode: "fallback_only", maxResultsPerProvider: 3 },
        },
      });

      expect(mockSearchWikipedia).toHaveBeenCalledWith(
        expect.objectContaining({ detectedLanguage: "de" }),
      );
    });

    it("does not set detectedLanguage when not provided in options", async () => {
      mockSearchGoogleCse.mockResolvedValue([]);
      mockSearchWikipedia.mockResolvedValue([]);

      await searchWebWithProvider({
        query: "test query",
        maxResults: 5,
        config: {
          ...DEFAULT_SEARCH_CONFIG,
          provider: "auto",
          providers: {
            ...DEFAULT_SEARCH_CONFIG.providers,
            googleCse: { enabled: true, priority: 1, dailyQuotaLimit: 0 },
            wikipedia: { enabled: true, priority: 3, dailyQuotaLimit: 0, language: "en" },
          },
          supplementaryProviders: { mode: "fallback_only", maxResultsPerProvider: 3 },
        },
      });

      // When detectedLanguage is not provided in the original options, the spread
      // passes it through as-is (undefined). Wikipedia falls back to config language.
      const callArgs = mockSearchWikipedia.mock.calls[0][0];
      expect(callArgs.detectedLanguage).toBeUndefined();
    });
  });
});
