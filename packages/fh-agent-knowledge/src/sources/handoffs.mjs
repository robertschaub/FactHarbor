import { loadCompatibilityIndexes } from "./indexes.mjs";

export function loadHandoffEntries() {
  return loadCompatibilityIndexes().handoffIndex.entries ?? [];
}
