import { join } from "node:path";

import { PATHS } from "../utils/paths.mjs";
import {
  fingerprintPaths,
  getFileStatOrNull,
  getGitHead,
  listFilesRecursive,
  pathExists,
  readJsonFile,
  writeJsonAtomic,
} from "../utils/fs.mjs";

const CACHE_MANIFEST_PATH = join(PATHS.cacheDir, "manifest.json");

function fingerprintIfAny(paths) {
  return paths.length > 0 ? fingerprintPaths(paths) : null;
}

function getOptionalMtimeIso(path) {
  return getFileStatOrNull(path)?.mtimeIso ?? null;
}

export function getCacheManifestPath() {
  return CACHE_MANIFEST_PATH;
}

export function readCacheManifest() {
  if (!pathExists(CACHE_MANIFEST_PATH)) {
    return null;
  }

  return readJsonFile(CACHE_MANIFEST_PATH);
}

export function writeCacheManifest(manifest) {
  writeJsonAtomic(CACHE_MANIFEST_PATH, manifest);
}

export function readCurrentSourceSnapshot(indexes) {
  const handoffFiles = listFilesRecursive(PATHS.handoffsDir, (path) => path.endsWith(".md"));
  const roleFiles = listFilesRecursive(PATHS.rolesDir, (path) => path.endsWith(".md"));
  const policyFiles = listFilesRecursive(PATHS.policiesDir, (path) => path.endsWith(".md"));
  const wipFiles = listFilesRecursive(PATHS.wipDir, (path) => path.endsWith(".md"));
  const developmentFiles = listFilesRecursive(PATHS.developmentDir, (path) => path.endsWith(".md"));
  const skillFiles = listFilesRecursive(PATHS.claudeSkillsDir, (path) => path.endsWith("SKILL.md"));
  const stageSourceFiles = [
    PATHS.claimBoundaryPipeline,
    ...listFilesRecursive(PATHS.analyzerDir, (path) => path.endsWith("-stage.ts")),
  ];

  return {
    schemaVersion: 1,
    builtAt: new Date().toISOString(),
    repoHead: getGitHead(),
    sources: {
      agentsMtime: getOptionalMtimeIso(PATHS.agents),
      agentOutputsMtime: getOptionalMtimeIso(PATHS.agentOutputs),
      handoffsDigest: fingerprintIfAny(handoffFiles),
      rolesDigest: fingerprintIfAny(roleFiles),
      roleLearningsMtime: getOptionalMtimeIso(PATHS.roleLearnings),
      policiesDigest: fingerprintIfAny(policyFiles),
      selectedWipDigest: fingerprintIfAny(wipFiles),
      developmentDocsDigest: fingerprintIfAny(developmentFiles),
      skillsDigest: fingerprintIfAny(skillFiles),
      stageSourceDigest: fingerprintIfAny(stageSourceFiles),
      modelTieringMtime: getOptionalMtimeIso(PATHS.modelTiering),
      handoffIndexGeneratedAt: indexes.handoffIndex.generatedAt ?? null,
      stageMapGeneratedAt: indexes.stageMap.generatedAt ?? null,
      stageManifestGeneratedAt: indexes.stageManifest.generatedAt ?? null,
    },
  };
}
