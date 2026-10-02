export function buildWarning(code, message) {
  return { code, message };
}

export function buildCommandResult(command, data = {}, warnings = []) {
  return {
    ok: true,
    command,
    binding: {
      repoRoot: PATHS.repoRoot,
      repoHead: getGitHead(),
      scope: "Selected public-checkout sources only; other repositories are not searched. Empty results do not establish absence of prior work. Source and cache freshness are reported separately.",
    },
    warnings,
    ...data,
  };
}
import { PATHS } from "../utils/paths.mjs";
import { getGitHead } from "../utils/fs.mjs";
