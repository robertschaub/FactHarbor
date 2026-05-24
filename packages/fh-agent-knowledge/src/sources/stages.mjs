import { loadCompatibilityIndexes } from "./indexes.mjs";

export function loadStageEntries() {
  return loadCompatibilityIndexes().stageMap.stages ?? {};
}
