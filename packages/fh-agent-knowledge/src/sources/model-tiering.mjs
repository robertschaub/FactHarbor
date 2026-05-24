import { loadCompatibilityIndexes } from "./indexes.mjs";

export function loadModelTaskEntries() {
  return loadCompatibilityIndexes().stageManifest.tasks ?? {};
}
