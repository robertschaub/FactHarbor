import { scoreTokenOverlap, tokenize } from "../utils/scoring.mjs";

export function lookupModelTask(knowledgeContext, { task, limit = 5 } = {}) {
  const queryTokens = tokenize(task);
  const tasks = Object.entries(knowledgeContext.data?.stageManifest?.tasks ?? {});

  return tasks
    .map(([taskKey, entry]) => ({
      taskKey,
      ...entry,
      score: scoreTokenOverlap(queryTokens, taskKey, entry.tier, ...Object.values(entry.models ?? {})),
    }))
    .filter((entry) => entry.score > 0 || queryTokens.length === 0)
    .sort((left, right) => right.score - left.score || left.taskKey.localeCompare(right.taskKey))
    .slice(0, limit);
}
