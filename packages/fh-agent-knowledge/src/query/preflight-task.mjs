import { scoreTokenOverlap, tokenize } from "../utils/scoring.mjs";
import { resolveRoleEntry } from "../sources/roles.mjs";
import { lookupStage } from "./lookup-stage.mjs";
import { searchHandoffs } from "./search-handoffs.mjs";

const PREFLIGHT_EXCLUDED_DOCS = new Set([
  "Docs/AGENTS/Agent_Outputs.md",
  "Docs/AGENTS/Role_Learnings.md",
]);

function inferRole(roleEntries, task) {
  const taskText = String(task ?? "").toLowerCase();
  return roleEntries.find((entry) =>
    entry.aliases.some((alias) => taskText.includes(alias.toLowerCase())) ||
    taskText.includes(entry.canonicalName.toLowerCase())
  ) ?? null;
}

export function preflightTask(knowledgeContext, { task, role, limit = 5 } = {}) {
  const roleEntries = knowledgeContext.data?.roles?.entries ?? [];
  const resolvedRole = resolveRoleEntry(roleEntries, role) ?? inferRole(roleEntries, task);
  const matchedHandoffs = searchHandoffs(knowledgeContext, {
    query: task,
    limit,
  });

  const recentEntries = knowledgeContext.data?.recentWindow?.entries ?? [];
  const queryTokens = tokenize(task);
  const recentContext = recentEntries
    .map((entry) => ({
      ...entry,
      score: scoreTokenOverlap(queryTokens, entry.title, entry.summary, entry.role, entry.link),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || right.date.localeCompare(left.date))
    .slice(0, 3);

  const docAnchors = (knowledgeContext.data?.docSections?.docs ?? [])
    .filter((doc) => !PREFLIGHT_EXCLUDED_DOCS.has(doc.file))
    .filter((doc) => !doc.file.startsWith("Docs/AGENTS/Roles/"))
    .map((doc) => ({
      file: doc.file,
      title: doc.title,
      score: scoreTokenOverlap(
        queryTokens,
        doc.file,
        doc.title,
        ...(doc.sections ?? []).map((section) => section.heading),
      ),
    }))
    .filter((doc) => doc.score > 0)
    .sort((left, right) => right.score - left.score || left.file.localeCompare(right.file))
    .slice(0, 5);

  return {
    task,
    recentContext,
    matchedHandoffs,
    stageAnchors: lookupStage(knowledgeContext, { name: task, limit: 5 }),
    roleContext: resolvedRole,
    docAnchors,
  };
}
