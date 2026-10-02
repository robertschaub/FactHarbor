import { dirname, join, normalize, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";

const THIS_FILE = fileURLToPath(import.meta.url);
const UTILS_DIR = dirname(THIS_FILE);
const SRC_DIR = resolve(UTILS_DIR, "..");
const PACKAGE_DIR = resolve(SRC_DIR, "..");
const REPO_ROOT = realpathSync(resolve(PACKAGE_DIR, "..", ".."));
const CACHE_DIR = process.env.FH_AGENT_KNOWLEDGE_CACHE_DIR
  ? resolve(process.env.FH_AGENT_KNOWLEDGE_CACHE_DIR)
  : join(REPO_ROOT, ".cache", "fh-agent-knowledge");

export const PATHS = {
  repoRoot: REPO_ROOT,
  cacheDir: CACHE_DIR,
  agents: join(REPO_ROOT, "AGENTS.md"),
  currentStatus: join(REPO_ROOT, "Docs", "STATUS", "Current_Status.md"),
  agentOutputs: join(REPO_ROOT, "Docs", "AGENTS", "Agent_Outputs.md"),
  handoffsDir: join(REPO_ROOT, "Docs", "AGENTS", "Handoffs"),
  handoffIndex: join(REPO_ROOT, "Docs", "AGENTS", "index", "handoff-index.json"),
  stageMap: join(REPO_ROOT, "Docs", "AGENTS", "index", "stage-map.json"),
  stageManifest: join(REPO_ROOT, "Docs", "AGENTS", "index", "stage-manifest.json"),
  roleLearnings: join(REPO_ROOT, "Docs", "AGENTS", "Role_Learnings.md"),
  rolesDir: join(REPO_ROOT, "Docs", "AGENTS", "Roles"),
  policiesDir: join(REPO_ROOT, "Docs", "AGENTS", "Policies"),
  wipDir: join(REPO_ROOT, "Docs", "WIP"),
  developmentDir: join(REPO_ROOT, "Docs", "DEVELOPMENT"),
  methodSummaries: ["akel-pipeline.md", "akel-stage-details.md"]
    .map((name) => join(REPO_ROOT, "Docs", "site", name)),
  architectureDir: join(
    REPO_ROOT,
    "Docs",
    "site",
    "product-development",
    "specification",
    "architecture",
  ),
  analyzerDir: join(REPO_ROOT, "apps", "web", "src", "lib", "analyzer"),
  claimBoundaryPipeline: join(
    REPO_ROOT,
    "apps",
    "web",
    "src",
    "lib",
    "analyzer",
    "claimboundary-pipeline.ts",
  ),
  modelTiering: join(
    REPO_ROOT,
    "apps",
    "web",
    "src",
    "lib",
    "analyzer",
    "model-tiering.ts",
  ),
  claudeSkillsDir: join(REPO_ROOT, ".claude", "skills"),
};

export function resolveRepoPath(...segments) {
  return resolve(PATHS.repoRoot, ...segments);
}

export function sameRepoRoot(first, second) {
  if (!first || !second) return false;
  const canonical = (value) => {
    const normalized = normalize(value).replace(/[\\/]+$/, "");
    return process.platform === "win32" ? normalized.toLowerCase() : normalized;
  };
  return canonical(first) === canonical(second);
}

export function toRepoRelativePath(absolutePath) {
  const relativePath = relative(PATHS.repoRoot, absolutePath);
  return relativePath.split(sep).join("/");
}
