import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";

import { bootstrapKnowledgeCache, loadKnowledgeContext } from "../src/cache/build-cache.mjs";
import { readCurrentSourceSnapshot, readCacheManifest, writeCacheManifest } from "../src/cache/manifest.mjs";
import { PATHS } from "../src/utils/paths.mjs";
import { getFileStatOrNull, writeJsonAtomic } from "../src/utils/fs.mjs";

function collectDirectorySnapshot(rootPath) {
  if (!existsSync(rootPath)) {
    return null;
  }

  const files = [];
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

      files.push({
        relativePath: relative(rootPath, entryPath),
        content: readFileSync(entryPath),
      });
    }
  }

  return files;
}

function restoreDirectorySnapshot(rootPath, snapshot) {
  rmSync(rootPath, { recursive: true, force: true });
  if (!snapshot) {
    return;
  }

  for (const file of snapshot) {
    const absolutePath = join(rootPath, file.relativePath);
    writeJsonAtomic(absolutePath, JSON.parse(file.content.toString("utf8")));
  }
}

test("writeJsonAtomic overwrites existing files directly on win32 without leaking temp files", () => {
  const tempDir = mkdtempSync(join(tmpdir(), "fh-knowledge-fs-"));

  try {
    const targetPath = join(tempDir, "payload.json");
    writeFileSync(targetPath, '{"before":true}\n', "utf8");

    writeJsonAtomic(targetPath, { after: true }, { platform: "win32" });

    assert.equal(readFileSync(targetPath, "utf8"), '{\n  "after": true\n}\n');
    assert.equal(existsSync(`${targetPath}.tmp`), false);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("getFileStatOrNull returns null for missing files", () => {
  const missingPath = join(tmpdir(), `fh-agent-knowledge-missing-${Date.now()}.md`);
  assert.equal(getFileStatOrNull(missingPath), null);
});

test("readCurrentSourceSnapshot tolerates missing optional source files", () => {
  const originalRoleLearnings = PATHS.roleLearnings;
  const originalModelTiering = PATHS.modelTiering;
  const tempDir = mkdtempSync(join(tmpdir(), "fh-knowledge-manifest-"));

  try {
    PATHS.roleLearnings = join(tempDir, "missing-role-learnings.md");
    PATHS.modelTiering = join(tempDir, "missing-model-tiering.ts");

    const snapshot = readCurrentSourceSnapshot({
      handoffIndex: { generatedAt: "2026-04-23T00:00:00.000Z" },
      stageMap: { generatedAt: "2026-04-23T00:00:00.000Z" },
      stageManifest: { generatedAt: "2026-04-23T00:00:00.000Z" },
    });

    assert.equal(snapshot.sources.roleLearningsMtime, null);
    assert.equal(snapshot.sources.modelTieringMtime, null);
  } finally {
    PATHS.roleLearnings = originalRoleLearnings;
    PATHS.modelTiering = originalModelTiering;
    rmSync(tempDir, { recursive: true, force: true });
  }
});

test("loadKnowledgeContext auto-refreshes stale cache for query callers", () => {
  const cacheSnapshot = collectDirectorySnapshot(PATHS.cacheDir);

  try {
    bootstrapKnowledgeCache();
    const manifest = readCacheManifest();
    writeCacheManifest({
      ...manifest,
      repoHead: "__stale_cache_marker__",
    });

    const staleContext = loadKnowledgeContext({
      allowFallback: true,
      refreshIfStale: false,
    });
    assert.equal(staleContext.freshness.isStale, true);

    const refreshedContext = loadKnowledgeContext({
      allowFallback: true,
      refreshIfStale: true,
    });

    assert.equal(refreshedContext.source, "cache");
    assert.equal(refreshedContext.refreshed, true);
    assert.equal(refreshedContext.freshness.isStale, false);
    assert.notEqual(readCacheManifest()?.repoHead, "__stale_cache_marker__");
  } finally {
    restoreDirectorySnapshot(PATHS.cacheDir, cacheSnapshot);
  }
});
