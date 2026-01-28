/**
 * Admin Config API Route Tests
 *
 * Tests for authentication, input validation, and error handling
 * in the unified config management API endpoints.
 *
 * @module config-api.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock the config-storage module
const mockGetActiveConfig = vi.fn();
const mockSaveConfigBlob = vi.fn();
const mockValidateConfigContent = vi.fn();
const mockActivateConfig = vi.fn();
const mockGetConfigHistory = vi.fn();

vi.mock("@/lib/config-storage", () => ({
  getActiveConfig: (...args: unknown[]) => mockGetActiveConfig(...args),
  saveConfigBlob: (...args: unknown[]) => mockSaveConfigBlob(...args),
  validateConfigContent: (...args: unknown[]) => mockValidateConfigContent(...args),
  activateConfig: (...args: unknown[]) => mockActivateConfig(...args),
  getConfigHistory: (...args: unknown[]) => mockGetConfigHistory(...args),
}));

// Store original env
const originalEnv = { ...process.env };

// ============================================================================
// TEST UTILITIES
// ============================================================================

function createMockRequest(options: {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
}): Request {
  const { method = "GET", headers = {}, body } = options;

  return {
    method,
    headers: {
      get: (name: string) => headers[name.toLowerCase()] ?? null,
    },
    json: () => Promise.resolve(body),
  } as unknown as Request;
}

function createRouteParams(type: string, profile: string) {
  return {
    params: Promise.resolve({ type, profile }),
  };
}

// ============================================================================
// AUTHENTICATION TESTS
// ============================================================================

describe("Admin Config API - Authentication", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("when FH_ADMIN_KEY is set", () => {
    beforeEach(() => {
      process.env.FH_ADMIN_KEY = "secret-admin-key";
      process.env.NODE_ENV = "production";
    });

    it("rejects requests without x-admin-key header", async () => {
      // Import fresh to pick up env changes
      vi.resetModules();
      const { GET } = await import(
        "@/app/api/admin/config/[type]/[profile]/route"
      );

      const req = createMockRequest({ headers: {} });
      const response = await GET(req, createRouteParams("search", "default"));

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.error).toBe("Unauthorized");
    });

    it("rejects requests with wrong x-admin-key", async () => {
      vi.resetModules();
      const { GET } = await import(
        "@/app/api/admin/config/[type]/[profile]/route"
      );

      const req = createMockRequest({
        headers: { "x-admin-key": "wrong-key" },
      });
      const response = await GET(req, createRouteParams("search", "default"));

      expect(response.status).toBe(401);
    });

    it("accepts requests with correct x-admin-key", async () => {
      vi.resetModules();
      const { GET } = await import(
        "@/app/api/admin/config/[type]/[profile]/route"
      );

      mockGetActiveConfig.mockResolvedValue({
        configType: "search",
        profileKey: "default",
        contentHash: "abc123",
        content: '{"enabled":true}',
        isActive: true,
      });

      const req = createMockRequest({
        headers: { "x-admin-key": "secret-admin-key" },
      });
      const response = await GET(req, createRouteParams("search", "default"));

      expect(response.status).toBe(200);
    });
  });

  describe("when FH_ADMIN_KEY is not set (development)", () => {
    beforeEach(() => {
      delete process.env.FH_ADMIN_KEY;
      process.env.NODE_ENV = "development";
    });

    it("allows requests without x-admin-key in development", async () => {
      vi.resetModules();
      const { GET } = await import(
        "@/app/api/admin/config/[type]/[profile]/route"
      );

      mockGetActiveConfig.mockResolvedValue({
        configType: "search",
        profileKey: "default",
        contentHash: "abc123",
        content: '{"enabled":true}',
        isActive: true,
      });

      const req = createMockRequest({ headers: {} });
      const response = await GET(req, createRouteParams("search", "default"));

      expect(response.status).toBe(200);
    });
  });
});

// ============================================================================
// INPUT VALIDATION TESTS
// ============================================================================

describe("Admin Config API - Input Validation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
    delete process.env.FH_ADMIN_KEY;
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("GET /api/admin/config/:type/:profile", () => {
    it("rejects invalid config type", async () => {
      vi.resetModules();
      const { GET } = await import(
        "@/app/api/admin/config/[type]/[profile]/route"
      );

      const req = createMockRequest({});
      const response = await GET(req, createRouteParams("invalid-type", "default"));

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Invalid config type");
      expect(data.error).toContain("invalid-type");
    });

    it("accepts valid config types: prompt, search, calculation", async () => {
      vi.resetModules();
      const { GET } = await import(
        "@/app/api/admin/config/[type]/[profile]/route"
      );

      mockGetActiveConfig.mockResolvedValue(null);

      for (const validType of ["prompt", "search", "calculation"]) {
        const req = createMockRequest({});
        const response = await GET(req, createRouteParams(validType, "default"));
        // Should be 404 (not found) not 400 (bad request)
        expect(response.status).toBe(404);
      }
    });

    it("returns 404 when no active config exists", async () => {
      vi.resetModules();
      const { GET } = await import(
        "@/app/api/admin/config/[type]/[profile]/route"
      );

      mockGetActiveConfig.mockResolvedValue(null);

      const req = createMockRequest({});
      const response = await GET(req, createRouteParams("search", "nonexistent"));

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toContain("No active config found");
      expect(data.configType).toBe("search");
      expect(data.profileKey).toBe("nonexistent");
    });
  });

  describe("PUT /api/admin/config/:type/:profile", () => {
    it("rejects invalid config type", async () => {
      vi.resetModules();
      const { PUT } = await import(
        "@/app/api/admin/config/[type]/[profile]/route"
      );

      const req = createMockRequest({
        method: "PUT",
        body: { content: '{"enabled":true}' },
      });
      const response = await PUT(req, createRouteParams("invalid", "default"));

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Invalid config type");
    });

    it("rejects invalid JSON body", async () => {
      vi.resetModules();
      const { PUT } = await import(
        "@/app/api/admin/config/[type]/[profile]/route"
      );

      const req = {
        method: "PUT",
        headers: { get: () => null },
        json: () => Promise.reject(new Error("Invalid JSON")),
      } as unknown as Request;

      const response = await PUT(req, createRouteParams("search", "default"));

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toBe("Invalid JSON body");
    });

    it("rejects missing content field", async () => {
      vi.resetModules();
      const { PUT } = await import(
        "@/app/api/admin/config/[type]/[profile]/route"
      );

      const req = createMockRequest({
        method: "PUT",
        body: { versionLabel: "v1.0" }, // missing content
      });
      const response = await PUT(req, createRouteParams("search", "default"));

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("content");
    });

    it("rejects non-string content field", async () => {
      vi.resetModules();
      const { PUT } = await import(
        "@/app/api/admin/config/[type]/[profile]/route"
      );

      const req = createMockRequest({
        method: "PUT",
        body: { content: { enabled: true } }, // object instead of string
      });
      const response = await PUT(req, createRouteParams("search", "default"));

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("content");
    });

    it("accepts valid request and returns blob info", async () => {
      vi.resetModules();
      const { PUT } = await import(
        "@/app/api/admin/config/[type]/[profile]/route"
      );

      mockSaveConfigBlob.mockResolvedValue({
        blob: {
          contentHash: "hash123",
          schemaVersion: "1.0.0",
          versionLabel: "v2026-01-28",
          createdUtc: new Date().toISOString(),
        },
        isNew: true,
        validation: { valid: true, warnings: [] },
      });

      const req = createMockRequest({
        method: "PUT",
        body: { content: '{"enabled":true}', versionLabel: "v2026-01-28" },
      });
      const response = await PUT(req, createRouteParams("search", "default"));

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.configType).toBe("search");
      expect(data.profileKey).toBe("default");
      expect(data.contentHash).toBe("hash123");
      expect(data.isNew).toBe(true);
    });

    it("returns 400 for validation failures", async () => {
      vi.resetModules();
      const { PUT } = await import(
        "@/app/api/admin/config/[type]/[profile]/route"
      );

      mockSaveConfigBlob.mockRejectedValue(
        new Error("Validation failed: Missing required field 'enabled'")
      );

      const req = createMockRequest({
        method: "PUT",
        body: { content: '{}' },
      });
      const response = await PUT(req, createRouteParams("search", "default"));

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.valid).toBe(false);
      expect(data.error).toContain("Validation failed");
    });
  });
});

// ============================================================================
// VALIDATE ENDPOINT TESTS
// ============================================================================

describe("Admin Config API - Validation Endpoint", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
    delete process.env.FH_ADMIN_KEY;
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("POST /api/admin/config/:type/:profile/validate", () => {
    it("rejects invalid config type", async () => {
      vi.resetModules();
      const { POST } = await import(
        "@/app/api/admin/config/[type]/[profile]/validate/route"
      );

      const req = createMockRequest({
        method: "POST",
        body: { content: '{}' },
      });
      const response = await POST(req, createRouteParams("invalid", "default"));

      expect(response.status).toBe(400);
    });

    it("rejects missing content field", async () => {
      vi.resetModules();
      const { POST } = await import(
        "@/app/api/admin/config/[type]/[profile]/validate/route"
      );

      const req = createMockRequest({
        method: "POST",
        body: {},
      });
      const response = await POST(req, createRouteParams("search", "default"));

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("content");
    });

    it("returns validation result for valid content", async () => {
      vi.resetModules();
      const { POST } = await import(
        "@/app/api/admin/config/[type]/[profile]/validate/route"
      );

      mockValidateConfigContent.mockResolvedValue({
        valid: true,
        errors: [],
        warnings: ["Consider enabling rate limiting"],
        canonicalizedHash: "canon123",
      });

      const req = createMockRequest({
        method: "POST",
        body: { content: '{"enabled":true}' },
      });
      const response = await POST(req, createRouteParams("search", "default"));

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.valid).toBe(true);
      expect(data.errors).toEqual([]);
      expect(data.warnings).toContain("Consider enabling rate limiting");
      expect(data.canonicalizedHash).toBe("canon123");
    });

    it("returns validation errors for invalid content", async () => {
      vi.resetModules();
      const { POST } = await import(
        "@/app/api/admin/config/[type]/[profile]/validate/route"
      );

      mockValidateConfigContent.mockResolvedValue({
        valid: false,
        errors: ["Missing required field: enabled", "Invalid provider value"],
        warnings: [],
        canonicalizedHash: null,
      });

      const req = createMockRequest({
        method: "POST",
        body: { content: '{"provider":"invalid"}' },
      });
      const response = await POST(req, createRouteParams("search", "default"));

      expect(response.status).toBe(200); // Validation result, not HTTP error
      const data = await response.json();
      expect(data.valid).toBe(false);
      expect(data.errors.length).toBe(2);
    });
  });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe("Admin Config API - Error Handling", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
    delete process.env.FH_ADMIN_KEY;
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("handles database errors gracefully on GET", async () => {
    vi.resetModules();
    const { GET } = await import(
      "@/app/api/admin/config/[type]/[profile]/route"
    );

    mockGetActiveConfig.mockRejectedValue(new Error("SQLITE_BUSY: database is locked"));

    const req = createMockRequest({});
    const response = await GET(req, createRouteParams("search", "default"));

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toContain("Failed to get config");
    expect(data.error).toContain("SQLITE_BUSY");
  });

  it("handles database errors gracefully on PUT", async () => {
    vi.resetModules();
    const { PUT } = await import(
      "@/app/api/admin/config/[type]/[profile]/route"
    );

    mockSaveConfigBlob.mockRejectedValue(new Error("Disk full"));

    const req = createMockRequest({
      method: "PUT",
      body: { content: '{"enabled":true}' },
    });
    const response = await PUT(req, createRouteParams("search", "default"));

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toContain("Failed to save config");
  });

  it("handles validation errors gracefully", async () => {
    vi.resetModules();
    const { POST } = await import(
      "@/app/api/admin/config/[type]/[profile]/validate/route"
    );

    mockValidateConfigContent.mockRejectedValue(new Error("Schema not found"));

    const req = createMockRequest({
      method: "POST",
      body: { content: '{}' },
    });
    const response = await POST(req, createRouteParams("search", "default"));

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toContain("Validation error");
  });
});

// ============================================================================
// PROMPT-SPECIFIC VALIDATION TESTS
// ============================================================================

describe("Admin Config API - Prompt Validation", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
    delete process.env.FH_ADMIN_KEY;
    process.env.NODE_ENV = "development";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("validates prompt frontmatter requirements", async () => {
    vi.resetModules();
    const { POST } = await import(
      "@/app/api/admin/config/[type]/[profile]/validate/route"
    );

    mockValidateConfigContent.mockResolvedValue({
      valid: false,
      errors: [
        "Missing required frontmatter field: version",
        "Missing required section: UNDERSTAND",
      ],
      warnings: [],
      canonicalizedHash: null,
    });

    const req = createMockRequest({
      method: "POST",
      body: { content: "---\npipeline: orchestrated\n---\n## VERDICT\nContent" },
    });
    const response = await POST(req, createRouteParams("prompt", "orchestrated"));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.valid).toBe(false);
    expect(data.errors.some((e: string) => e.includes("version"))).toBe(true);
  });
});
