import test from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";

// Set the existing override before loading modules that capture cache paths.
const TEST_ROOT = mkdtempSync(join(tmpdir(), "fh-knowledge-query-"));
process.env.FH_AGENT_KNOWLEDGE_CACHE_DIR = join(TEST_ROOT, "cache");
const { getFileStatOrNull, writeJsonAtomic } = await import("../src/utils/fs.mjs");
const { loadKnowledgeContext } = await import("../src/cache/build-cache.mjs");
const { readCurrentSourceSnapshot, readCacheManifest, writeCacheManifest } = await import("../src/cache/manifest.mjs");
const { PATHS } = await import("../src/utils/paths.mjs");
assert.equal(PATHS.cacheDir, join(TEST_ROOT, "cache"), "Cache fixture must be isolated before any operation");
const { executeKnowledgeOperation } = await import("../src/adapters/operations.mjs");
test.after(() => rmSync(TEST_ROOT, { recursive: true, force: true }));

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
        mtimeMs: statSync(entryPath).mtimeMs,
      });
    }
  }

  return files;
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

const QUERIES = [
  ["preflight-task", { task: "Review knowledge cache query behavior" }],
  ["search-handoffs", { query: "knowledge" }],
  ["lookup-stage", { name: "research" }],
  ["lookup-model-task", { task: "extract" }],
  ["get-role-context", { role: "Senior Developer" }],
  ["get-doc-section", { file: "AGENTS.md", section: "Safety" }],
];

test("all queries use missing-cache fallback without creating cache state", () => {
  assert.equal(existsSync(PATHS.cacheDir), false);
  for (const [command, input] of QUERIES) {
    const result = executeKnowledgeOperation(command, input);
    assert.equal(result.cacheSource, "fallback", command);
    assert.equal(result.cacheStale, true, command);
    assert.equal(result.cacheRefreshed, false, command);
    assert.ok(result.warnings.some((warning) => warning.code === "cache_served_from_repo"), command);
    assert.equal(existsSync(PATHS.cacheDir), false, command);
  }
  const context = loadKnowledgeContext({ allowFallback: false });
  assert.equal(context.source, "none");
  assert.equal(existsSync(PATHS.cacheDir), false);
});

test("stale queries preserve cache bytes and mtimes; explicit refresh rebuilds", () => {
  executeKnowledgeOperation("bootstrap");
  writeCacheManifest({ ...readCacheManifest(), repoHead: "__stale_cache_marker__" });
  const before = collectDirectorySnapshot(PATHS.cacheDir);
  for (const [command, input] of QUERIES) {
    const result = executeKnowledgeOperation(command, input);
    assert.equal(result.cacheSource, "cache", command);
    assert.equal(result.cacheStale, true, command);
    assert.equal(result.cacheRefreshed, false, command);
    assert.ok(result.warnings.length > 0, command);
    assert.deepEqual(collectDirectorySnapshot(PATHS.cacheDir), before, command);
  }
  // Even a legacy caller cannot opt a query into mutation.
  const legacy = loadKnowledgeContext({ refreshIfStale: true });
  assert.equal(legacy.freshness.isStale, true);
  assert.equal(legacy.refreshed, false);
  assert.deepEqual(collectDirectorySnapshot(PATHS.cacheDir), before);
  executeKnowledgeOperation("refresh");
  assert.notEqual(readCacheManifest().repoHead, "__stale_cache_marker__");
  assert.equal(loadKnowledgeContext().freshness.isStale, false);
});
