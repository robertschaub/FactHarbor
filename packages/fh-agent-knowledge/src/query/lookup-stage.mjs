import { scoreTokenOverlap, tokenize } from "../utils/scoring.mjs";

export function lookupStage(knowledgeContext, { name, limit = 5 } = {}) {
  const queryTokens = tokenize(name);
  const stages = Object.entries(knowledgeContext.data?.stageMap?.stages ?? {});

  return stages
    .map(([stageName, entry]) => ({
      stageName,
      ...entry,
      score: scoreTokenOverlap(queryTokens, stageName, entry.file, ...(entry.functions ?? [])),
    }))
    .filter((entry) => entry.score > 0 || queryTokens.length === 0)
    .sort((left, right) => right.score - left.score || left.stageName.localeCompare(right.stageName))
    .slice(0, limit);
}
