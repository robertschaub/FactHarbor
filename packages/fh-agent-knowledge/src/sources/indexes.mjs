import { PATHS } from "../utils/paths.mjs";
import { readJsonFile } from "../utils/fs.mjs";

export function loadCompatibilityIndexes() {
  return {
    handoffIndex: readJsonFile(PATHS.handoffIndex),
    stageMap: readJsonFile(PATHS.stageMap),
    stageManifest: readJsonFile(PATHS.stageManifest),
  };
}
