import { buildWarning } from "../contracts/results.mjs";
import { sameRepoRoot } from "../utils/paths.mjs";

export function evaluateCacheFreshness(manifest, currentSnapshot) {
  if (!manifest) {
    return {
      cacheExists: false,
      isStale: true,
      warnings: [buildWarning("cache_missing", "No usable checkout-bound knowledge cache; repo-source fallback will be used.")],
    };
  }

  const warnings = [];
  let isStale = false;

  if (!sameRepoRoot(manifest.repoRoot, currentSnapshot.repoRoot)) {
    warnings.push(buildWarning("cache_binding_unverified", "Cache checkout identity is absent or different; use identified current sources until an authorized refresh."));
    isStale = true;
  }

  if (manifest.repoHead !== currentSnapshot.repoHead) {
    warnings.push(buildWarning("repo_head_changed", "Repository HEAD changed since the knowledge cache was built."));
    isStale = true;
  }

  for (const [key, value] of Object.entries(currentSnapshot.sources)) {
    if (manifest.sources?.[key] !== value) {
      warnings.push(buildWarning("source_changed", `Knowledge source changed since build: ${key}`));
      isStale = true;
    }
  }

  return {
    cacheExists: true,
    isStale,
    warnings,
  };
}
