import { scoreTokenOverlap, tokenize } from "../utils/scoring.mjs";
import { resolveRoleEntry } from "../sources/roles.mjs";
import { lookupStage } from "./lookup-stage.mjs";
import { searchHandoffs } from "./search-handoffs.mjs";
import { buildStartupAdvice } from "./startup-advice.mjs";

const PREFLIGHT_EXCLUDED_DOCS = new Set([
  "Docs/AGENTS/Agent_Outputs.md",
  "Docs/AGENTS/Role_Learnings.md",
]);

function parseTaskDirectives(rawTask) {
  const originalTask = String(rawTask ?? "");
  let taskText = originalTask;
  let parsedRole;
  const parsedSkills = [];

  const roleMatch = /^\s*As\s+([^,\r\n:]+?)\s*[:,]\s*/i.exec(taskText);
  if (roleMatch) {
    parsedRole = roleMatch[1].trim();
    taskText = taskText.slice(roleMatch[0].length);
  }

  const cleanedLines = [];
  for (const line of taskText.split(/\r?\n/)) {
    const skillMatch = /^\s*Skills?\s*:\s*(.+?)\s*$/i.exec(line);
    if (skillMatch) {
      parsedSkills.push(skillMatch[1]);
      continue;
    }

    cleanedLines.push(line);
  }

  const parsedSkill = parsedSkills
    .flatMap((entry) => entry.split(/[;,]/))
    .map((entry) => entry.trim().replace(/^\//, ""))
    .find(Boolean);
  const parsedTask = cleanedLines.join("\n").trim();

  return {
    task: parsedTask || originalTask.trim(),
    role: parsedRole,
    skill: parsedSkill,
  };
}

function inferRole(roleEntries, task) {
  const queryTokens = tokenize(task);
  const matches = roleEntries
    .map((entry) => ({
      entry,
      score: scoreTokenOverlap(
        queryTokens,
        entry.canonicalName,
        ...(entry.aliases ?? []),
        entry.mission,
        ...(entry.focusAreas ?? []),
      ),
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => right.score - left.score || left.entry.canonicalName.localeCompare(right.entry.canonicalName));

  return matches[0]?.entry ?? null;
}

export function preflightTask(knowledgeContext, { task, role, skill, limit = 5 } = {}) {
  const parsedDirectives = parseTaskDirectives(task);
  const effectiveTask = parsedDirectives.task;
  const effectiveRole = role ?? parsedDirectives.role;
  const effectiveSkill = skill ?? parsedDirectives.skill;
  const roleEntries = knowledgeContext.data?.roles?.entries ?? [];
  const resolvedRole = resolveRoleEntry(roleEntries, effectiveRole) ?? inferRole(roleEntries, effectiveTask);
  const matchedHandoffs = searchHandoffs(knowledgeContext, {
    query: effectiveTask,
    limit,
  });

  const recentEntries = knowledgeContext.data?.recentWindow?.entries ?? [];
  const queryTokens = tokenize(effectiveTask);
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
      sections: (doc.sections ?? []).slice(0, 5),
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
  const stageAnchors = lookupStage(knowledgeContext, { name: effectiveTask, limit: 5 });

  return {
    task: effectiveTask,
    recentContext,
    matchedHandoffs,
    stageAnchors,
    roleContext: resolvedRole,
    docAnchors,
    startupAdvice: buildStartupAdvice(knowledgeContext, {
      task: effectiveTask,
      role: effectiveRole,
      skill: effectiveSkill,
    }, {
      resolvedRole,
      matchedHandoffs,
      stageAnchors,
      docAnchors,
    }),
  };
}
