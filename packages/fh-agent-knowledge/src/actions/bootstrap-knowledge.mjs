import { buildCommandResult } from "../contracts/results.mjs";
import { bootstrapKnowledgeCache } from "../cache/build-cache.mjs";
import { PATHS } from "../utils/paths.mjs";

export function bootstrapKnowledge() {
  const payload = bootstrapKnowledgeCache();
  return buildCommandResult("bootstrap", {
    cacheDir: PATHS.cacheDir,
    builtAt: payload.manifest.builtAt,
    counts: {
      handoffs: payload.data.handoffs.entries.length,
      recentWindow: payload.data.recentWindow.entries.length,
      roles: payload.data.roles.entries.length,
      docs: payload.data.docSections.docs.length,
      stages: Object.keys(payload.data.stageMap.stages).length,
      tasks: Object.keys(payload.data.stageManifest.tasks).length,
    },
  });
}
