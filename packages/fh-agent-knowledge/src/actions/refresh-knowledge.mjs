import { buildCommandResult } from "../contracts/results.mjs";
import { bootstrapKnowledgeCache, loadKnowledgeContext } from "../cache/build-cache.mjs";
import { PATHS } from "../utils/paths.mjs";

export function refreshKnowledge({ force = false } = {}) {
  const current = loadKnowledgeContext({ allowFallback: true, refreshIfStale: false });
  if (!force && current.source === "cache" && !current.freshness.isStale) {
    return buildCommandResult("refresh", {
      cacheDir: PATHS.cacheDir,
      rebuilt: false,
      builtAt: current.manifest?.builtAt ?? null,
    }, current.warnings);
  }

  const payload = bootstrapKnowledgeCache();
  return buildCommandResult("refresh", {
    cacheDir: PATHS.cacheDir,
    rebuilt: true,
    builtAt: payload.manifest.builtAt,
  });
}
