export function buildWarning(code, message) {
  return { code, message };
}

export function buildCommandResult(command, data = {}, warnings = []) {
  return {
    ok: true,
    command,
    binding: { repoRoot: PATHS.repoRoot, repoHead: getGitHead(), scope: "tool checkout identity; source and cache freshness reported separately" },
    warnings,
    ...data,
  };
}
import { PATHS } from "../utils/paths.mjs";
import { getGitHead } from "../utils/fs.mjs";
