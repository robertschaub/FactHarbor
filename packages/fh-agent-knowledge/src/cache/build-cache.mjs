import { join } from "node:path";

import { PATHS } from "../utils/paths.mjs";
import { pathExists, readJsonFile, writeJsonAtomic } from "../utils/fs.mjs";
import { buildWarning } from "../contracts/results.mjs";
import { loadRecentAgentOutputs } from "../sources/agent-outputs.mjs";
import { buildDocSectionIndex } from "../sources/docs.mjs";
import { loadHandoffEntries } from "../sources/handoffs.mjs";
import { loadCompatibilityIndexes } from "../sources/indexes.mjs";
import { loadModelTaskEntries } from "../sources/model-tiering.mjs";
import { loadRoleEntries } from "../sources/roles.mjs";
import { loadStageEntries } from "../sources/stages.mjs";
import {
  getCacheManifestPath,
  readCacheManifest,
  readCurrentSourceSnapshot,
  writeCacheManifest,
} from "./manifest.mjs";
import { evaluateCacheFreshness } from "./freshness.mjs";

const CACHE_FILES = {
  handoffs: join(PATHS.cacheDir, "handoffs.json"),
  recentWindow: join(PATHS.cacheDir, "recent-window.json"),
  roles: join(PATHS.cacheDir, "roles.json"),
  docSections: join(PATHS.cacheDir, "doc-sections.json"),
  stageMap: join(PATHS.cacheDir, "stage-map.json"),
  stageManifest: join(PATHS.cacheDir, "stage-manifest.json"),
};

function buildKnowledgeContext({
  source,
  manifest,
  data,
  freshness,
  warnings = [],
  refreshed = false,
} = {}) {
  return {
    source,
    manifest,
    data,
    freshness,
    warnings,
    refreshed,
  };
}

function buildKnowledgeData() {
  const indexes = loadCompatibilityIndexes();
  const data = {
    handoffs: {
      generatedAt: new Date().toISOString(),
      entries: loadHandoffEntries(),
    },
    recentWindow: {
      generatedAt: new Date().toISOString(),
      entries: loadRecentAgentOutputs(),
    },
    roles: {
      generatedAt: new Date().toISOString(),
      entries: loadRoleEntries(),
    },
    docSections: {
      generatedAt: new Date().toISOString(),
      docs: buildDocSectionIndex(),
    },
    stageMap: {
      generatedAt: indexes.stageMap.generatedAt ?? new Date().toISOString(),
      stages: loadStageEntries(),
    },
    stageManifest: {
      generatedAt: indexes.stageManifest.generatedAt ?? new Date().toISOString(),
      tasks: loadModelTaskEntries(),
    },
  };

  const manifest = readCurrentSourceSnapshot(indexes);
  return { manifest, data };
}

export function writeKnowledgeCache(payload) {
  writeJsonAtomic(CACHE_FILES.handoffs, payload.data.handoffs);
  writeJsonAtomic(CACHE_FILES.recentWindow, payload.data.recentWindow);
  writeJsonAtomic(CACHE_FILES.roles, payload.data.roles);
  writeJsonAtomic(CACHE_FILES.docSections, payload.data.docSections);
  writeJsonAtomic(CACHE_FILES.stageMap, payload.data.stageMap);
  writeJsonAtomic(CACHE_FILES.stageManifest, payload.data.stageManifest);
  writeCacheManifest(payload.manifest);
}

export function bootstrapKnowledgeCache() {
  const payload = buildKnowledgeData();
  writeKnowledgeCache(payload);
  return payload;
}

export function loadKnowledgeCache() {
  if (!pathExists(getCacheManifestPath())) {
    return null;
  }

  const requiredFiles = Object.values(CACHE_FILES);
  if (requiredFiles.some((path) => !pathExists(path))) {
    return null;
  }

  return {
    manifest: readCacheManifest(),
    data: {
      handoffs: readJsonFile(CACHE_FILES.handoffs),
      recentWindow: readJsonFile(CACHE_FILES.recentWindow),
      roles: readJsonFile(CACHE_FILES.roles),
      docSections: readJsonFile(CACHE_FILES.docSections),
      stageMap: readJsonFile(CACHE_FILES.stageMap),
      stageManifest: readJsonFile(CACHE_FILES.stageManifest),
    },
  };
}

export function loadKnowledgeContext({ allowFallback = true, refreshIfStale = false } = {}) {
  const cached = loadKnowledgeCache();
  const indexes = loadCompatibilityIndexes();
  const currentSnapshot = readCurrentSourceSnapshot(indexes);
  const freshness = evaluateCacheFreshness(cached?.manifest ?? null, currentSnapshot);

  if (cached) {
    if (refreshIfStale && freshness.isStale) {
      try {
        const payload = bootstrapKnowledgeCache();
        return buildKnowledgeContext({
          source: "cache",
          manifest: payload.manifest,
          data: payload.data,
          freshness: evaluateCacheFreshness(payload.manifest, payload.manifest),
          refreshed: true,
        });
      } catch (error) {
        return buildKnowledgeContext({
          source: "cache",
          manifest: cached.manifest,
          data: cached.data,
          freshness,
          warnings: [
            ...freshness.warnings,
            buildWarning(
              "cache_refresh_failed",
              `Failed to refresh stale knowledge cache automatically: ${
                error instanceof Error ? error.message : String(error)
              }`,
            ),
          ],
        });
      }
    }

    return buildKnowledgeContext({
      source: "cache",
      manifest: cached.manifest,
      data: cached.data,
      freshness,
      warnings: freshness.warnings,
    });
  }

  if (!allowFallback) {
    return buildKnowledgeContext({
      source: "none",
      manifest: null,
      data: null,
      freshness,
      warnings: freshness.warnings,
    });
  }

  const fallback = buildKnowledgeData();
  return buildKnowledgeContext({
    source: "fallback",
    manifest: fallback.manifest,
    data: fallback.data,
    freshness,
    warnings: [
      ...freshness.warnings,
      buildWarning("cache_served_from_repo", "Served directly from repo sources because no cache is available."),
    ],
  });
}
