import { buildCommandResult } from "../contracts/results.mjs";
import { loadKnowledgeCache, loadKnowledgeContext } from "../cache/build-cache.mjs";
import { PATHS } from "../utils/paths.mjs";

export function checkKnowledgeHealth() {
  const context = loadKnowledgeContext({ allowFallback: true, refreshIfStale: false });
  const cache = loadKnowledgeCache();

  return buildCommandResult("health", {
    cacheDir: PATHS.cacheDir,
    cacheExists: Boolean(cache),
    cacheSource: context.source,
    builtAt: context.manifest?.builtAt ?? null,
    repoHead: context.manifest?.repoHead ?? null,
    stale: context.freshness.isStale,
    coverage: context.data
      ? {
          handoffs: context.data.handoffs.entries.length,
          recentWindow: context.data.recentWindow.entries.length,
          roles: context.data.roles.entries.length,
          skills: context.data.skills.entries.length,
          docs: context.data.docSections.docs.length,
          stages: Object.keys(context.data.stageMap.stages).length,
          tasks: Object.keys(context.data.stageManifest.tasks).length,
        }
      : null,
  }, context.warnings);
}
