import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getWebGitCommitHash } from "@/lib/build-info";

const mockSpawnSync = vi.hoisted(() => vi.fn());

vi.mock("node:child_process", () => ({
  spawnSync: mockSpawnSync,
}));

describe("getWebGitCommitHash", () => {
  beforeEach(() => {
    mockSpawnSync.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("prefers GIT_COMMIT over platform fallbacks", () => {
    vi.stubEnv("GIT_COMMIT", "abc1234");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "vercel123");
    vi.stubEnv("GIT_SHA", "gitsha123");
    vi.stubEnv("SOURCE_VERSION", "source123");

    expect(getWebGitCommitHash()).toBe("abc1234");
  });

  it("accepts a dirty GIT_COMMIT build id without re-running git", () => {
    vi.stubEnv("GIT_COMMIT", "ABCDEF1234567890+DEADBEEF");

    expect(getWebGitCommitHash()).toBe("abcdef1234567890+deadbeef");
    expect(mockSpawnSync).not.toHaveBeenCalled();
  });

  it("falls back through platform-specific variables", () => {
    vi.stubEnv("GIT_COMMIT", "");
    mockSpawnSync.mockReturnValue({ error: new Error("git unavailable") });
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", " ABCDEF1234 ");
    vi.stubEnv("GIT_SHA", "gitsha123");
    vi.stubEnv("SOURCE_VERSION", "source123");

    expect(getWebGitCommitHash()).toBe("abcdef1234");
  });

  it("returns null when no execution hash is available", () => {
    vi.stubEnv("GIT_COMMIT", "");
    mockSpawnSync.mockReturnValue({ error: new Error("git unavailable") });
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "");
    vi.stubEnv("GIT_SHA", "");
    vi.stubEnv("SOURCE_VERSION", "");

    expect(getWebGitCommitHash()).toBeNull();
  });

  it("returns a dirty build id when the local working tree is dirty", () => {
    vi.stubEnv("GIT_COMMIT", "");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "");
    vi.stubEnv("GIT_SHA", "");
    vi.stubEnv("SOURCE_VERSION", "");
    mockSpawnSync
      .mockReturnValueOnce({ error: null, status: 0, stdout: "abcdef1234567890\n" })
      .mockReturnValueOnce({ error: null, status: 0, stdout: " M apps/web/src/lib/build-info.ts\n" })
      .mockReturnValueOnce({ error: null, status: 0, stdout: "dirty diff contents" });

    expect(getWebGitCommitHash()).toMatch(/^abcdef1234567890\+[0-9a-f]{8}$/);
  });

  it("returns a plain commit hash when the local working tree is clean", () => {
    vi.stubEnv("GIT_COMMIT", "");
    vi.stubEnv("VERCEL_GIT_COMMIT_SHA", "");
    vi.stubEnv("GIT_SHA", "");
    vi.stubEnv("SOURCE_VERSION", "");
    mockSpawnSync
      .mockReturnValueOnce({ error: null, status: 0, stdout: "abcdef1234567890\n" })
      .mockReturnValueOnce({ error: null, status: 0, stdout: "" });

    expect(getWebGitCommitHash()).toBe("abcdef1234567890");
  });

  it("caches the build id when explicitly requested", () => {
    vi.stubEnv("GIT_COMMIT", "abcdef1234");

    expect(getWebGitCommitHash({ useCache: true })).toBe("abcdef1234");
    vi.stubEnv("GIT_COMMIT", "fedcba9876");

    expect(getWebGitCommitHash({ useCache: true })).toBe("abcdef1234");
    expect(getWebGitCommitHash()).toBe("fedcba9876");
  });
});
