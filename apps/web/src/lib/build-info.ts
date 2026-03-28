import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";

const BUILD_INFO_CACHE_TTL_MS = 30_000;
let cachedBuildId: { value: string | null; expiresAt: number } | null = null;

function isValidHash(value: string): boolean {
  return value.length >= 7 && value.length <= 40 && /^[0-9a-f]+$/i.test(value);
}

function isValidDirtySuffix(value: string): boolean {
  return value === "dirty" || /^[0-9a-f]{8}$/i.test(value);
}

function normalizeBuildId(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase() ?? "";
  if (!trimmed) {
    return null;
  }

  if (isValidHash(trimmed)) {
    return trimmed;
  }

  const plusIndex = trimmed.indexOf("+");
  if (plusIndex <= 0) {
    return null;
  }

  const baseHash = trimmed.slice(0, plusIndex);
  const suffix = trimmed.slice(plusIndex + 1);
  if (!isValidHash(baseHash) || !isValidDirtySuffix(suffix)) {
    return null;
  }

  return `${baseHash}+${suffix}`;
}

function runGit(args: string[], timeoutMs: number): string | null {
  try {
    const result = spawnSync("git", args, {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: timeoutMs,
      windowsHide: true,
    });
    if (result.error || result.status !== 0) {
      return null;
    }
    return result.stdout.trim().toLowerCase() || null;
  } catch {
    return null;
  }
}

function computeWorkingTreeHash(): string | null {
  try {
    // Note: `git diff HEAD` fingerprints tracked-file changes only. Untracked files still
    // mark the build dirty via `status --porcelain`, but their contents are not included
    // in the hash to keep this helper simple and low-risk.
    const result = spawnSync("git", ["diff", "HEAD"], {
      cwd: process.cwd(),
      encoding: "utf8",
      timeout: 5000,
      windowsHide: true,
      maxBuffer: 20 * 1024 * 1024,
    });
    if (result.error || result.status !== 0) {
      return null;
    }
    return createHash("sha256")
      .update(result.stdout, "utf8")
      .digest("hex")
      .slice(0, 8)
      .toLowerCase();
  } catch {
    return null;
  }
}

function resolveWebGitCommitHash(): string | null {
  const envHash = normalizeBuildId(process.env.GIT_COMMIT);
  if (envHash) {
    return envHash;
  }

  const hash = runGit(["rev-parse", "HEAD"], 3000);
  if (!hash || !isValidHash(hash)) {
    return (
      normalizeBuildId(process.env.VERCEL_GIT_COMMIT_SHA) ||
      normalizeBuildId(process.env.GIT_SHA) ||
      normalizeBuildId(process.env.SOURCE_VERSION) ||
      null
    );
  }

  const porcelain = runGit(["status", "--porcelain"], 3000);
  if (porcelain) {
    const wtHash = computeWorkingTreeHash();
    return wtHash ? `${hash}+${wtHash}` : `${hash}+dirty`;
  }

  return hash;
}

export function getWebGitCommitHash(options?: { useCache?: boolean }): string | null {
  if (!options?.useCache) {
    return resolveWebGitCommitHash();
  }

  const now = Date.now();
  if (cachedBuildId && cachedBuildId.expiresAt > now) {
    return cachedBuildId.value;
  }

  const resolved = resolveWebGitCommitHash();
  cachedBuildId = {
    value: resolved,
    expiresAt: now + BUILD_INFO_CACHE_TTL_MS,
  };
  return resolved;
}
