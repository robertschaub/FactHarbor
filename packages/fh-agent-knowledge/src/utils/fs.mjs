import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  lstatSync,
  realpathSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";

import { PATHS, toRepoRelativePath } from "./paths.mjs";

export function pathExists(path) {
  return existsSync(path);
}

export function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

export function readTextFile(path) {
  return readFileSync(path, "utf8");
}

export function readJsonFile(path) {
  return JSON.parse(readTextFile(path));
}

export function listTrackedFiles(repoRoot = PATHS.repoRoot) {
  // Fail closed if repository metadata is unavailable. Local untracked notes are
  // not publication inputs, even when placed inside an allowed documentation root.
  const realRoot = realpathSync(repoRoot);
  return execFileSync("git", ["ls-files", "-s", "-z"], {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).split("\0").filter(Boolean).filter((row) => /^(100644|100755) [a-f0-9]+ 0\t/.test(row))
    .map((row) => row.slice(row.indexOf("\t") + 1)).filter((path) => {
      const file = join(repoRoot, path);
      return existsSync(file) && lstatSync(file).isFile()
        && realpathSync(file) === join(realRoot, path);
    });
}

export function writeJsonAtomic(path, value, { platform = process.platform } = {}) {
  ensureDir(dirname(path));
  const json = `${JSON.stringify(value, null, 2)}\n`;

  if (platform === "win32") {
    // Windows rename semantics are not reliably replace-atomic for an existing target.
    // Prefer a direct overwrite path here instead of temp-file rename choreography.
    writeFileSync(path, json, "utf8");
    return;
  }

  const tempPath = `${path}.tmp`;
  writeFileSync(tempPath, json, "utf8");
  try {
    renameSync(tempPath, path);
  } catch {
    try {
      writeFileSync(path, json, "utf8");
    } finally {
      try {
        unlinkSync(tempPath);
      } catch {
        // Best-effort cleanup only. Preserve the primary write failure if the temp file
        // is still locked or otherwise unavailable during fallback cleanup.
      }
    }
  }
}

export function listFilesRecursive(rootPath, predicate = () => true) {
  if (!pathExists(rootPath)) {
    return [];
  }

  const results = [];
  const stack = [rootPath];

  while (stack.length > 0) {
    const currentPath = stack.pop();
    const entries = readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const entryPath = join(currentPath, entry.name);
      if (entry.isDirectory()) {
        stack.push(entryPath);
        continue;
      }

      if (predicate(entryPath, entry)) {
        results.push(entryPath);
      }
    }
  }

  return results.sort((left, right) => left.localeCompare(right));
}

export function sha1(value) {
  return createHash("sha1").update(value).digest("hex");
}

export function getFileStat(path) {
  const stat = statSync(path);
  return {
    size: stat.size,
    mtimeIso: stat.mtime.toISOString(),
    mtimeMs: stat.mtimeMs,
  };
}

export function getFileStatOrNull(path) {
  try {
    return getFileStat(path);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

export function fingerprintPaths(paths) {
  const hash = createHash("sha1");
  for (const path of [...paths].sort((left, right) => left.localeCompare(right))) {
    const { size, mtimeMs } = getFileStat(path);
    hash.update(`${toRepoRelativePath(path)}|${size}|${mtimeMs}\n`);
  }
  return hash.digest("hex");
}

export function getGitHead() {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: PATHS.repoRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}
