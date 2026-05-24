import { scoreTokenOverlap, tokenize } from "../utils/scoring.mjs";
import { normalizeRoleKey } from "../sources/roles.mjs";

const MAX_RECOMMENDED_SKILLS = 3;
const MAX_FIRST_ACTIONS = 6;
const MAX_DOCS_TO_READ = 8;
const MAX_HANDOFFS_TO_INSPECT = 5;
const MAX_CODE_HINTS = 8;

function cleanReferencePath(value) {
  return String(value ?? "")
    .trim()
    .replace(/^`|`$/g, "")
    .replace(/^\//, "");
}

function dedupeBy(items, keySelector) {
  const seen = new Set();
  const result = [];

  for (const item of items) {
    const key = keySelector(item);
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(item);
  }

  return result;
}

function findSkillEntry(skillEntries, skillInput) {
  if (!skillInput) {
    return null;
  }

  const normalized = normalizeRoleKey(String(skillInput).replace(/^\//, ""));
  return skillEntries.find((entry) => normalizeRoleKey(entry.name) === normalized) ?? null;
}

function rankSkills(skillEntries, task, skillInput) {
  const explicitSkill = findSkillEntry(skillEntries, skillInput);
  if (explicitSkill) {
    return [{
      ...explicitSkill,
      score: 1000000,
      reason: "Explicit skill argument matched this workflow.",
    }];
  }

  const queryTokens = tokenize(task);
  return skillEntries
    .map((entry) => ({
      ...entry,
      score: scoreTokenOverlap(
        queryTokens,
        entry.name,
        entry.command,
        entry.description,
        ...(entry.sections ?? []).map((section) => section.heading),
      ),
      reason: "Task terms matched this workflow's metadata.",
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
    .slice(0, MAX_RECOMMENDED_SKILLS);
}

function buildRecommendedRole(roleContext, roleInput) {
  if (!roleContext) {
    return null;
  }

  return {
    name: roleContext.canonicalName,
    file: roleContext.file,
    reason: roleInput
      ? "Explicit role argument resolved to this role brief."
      : "Task text matched this role's aliases or focus metadata.",
  };
}

function buildDocsToRead({ roleContext, recommendedSkills, docAnchors }) {
  const roleDocs = (roleContext?.requiredReading ?? []).map((entry) => ({
    file: cleanReferencePath(entry.document),
    title: entry.document,
    reason: entry.why,
    source: "role-required-reading",
  }));

  const skillDocs = recommendedSkills.map((entry) => ({
    file: entry.file,
    title: `${entry.command} workflow`,
    reason: entry.reason,
    source: "skill-workflow",
  }));

  const anchorDocs = docAnchors.map((entry) => ({
    file: entry.file,
    title: entry.title,
    reason: "Task terms matched this documentation title or section index.",
    source: "doc-anchor",
    score: entry.score,
  }));

  return dedupeBy([...roleDocs, ...skillDocs, ...anchorDocs], (entry) => entry.file)
    .slice(0, MAX_DOCS_TO_READ);
}

function buildHandoffsToInspect(matchedHandoffs) {
  return matchedHandoffs.slice(0, MAX_HANDOFFS_TO_INSPECT).map((entry) => ({
    file: `Docs/AGENTS/Handoffs/${entry.file}`,
    title: entry.summary,
    date: entry.date,
    roles: entry.roles,
    topics: entry.topics,
    reason: (entry.reasons ?? []).join("; ") || "Matched the current task.",
    score: entry.score,
  }));
}

function buildCodeSearchHints({ stageAnchors, matchedHandoffs }) {
  const stageHints = stageAnchors.map((entry) => ({
    path: entry.file,
    functions: entry.functions ?? [],
    reason: "Stage map matched this analyzer stage to the task.",
    source: "stage-map",
  }));

  const touchedSourceFiles = matchedHandoffs
    .flatMap((entry) => entry.files_touched ?? [])
    .filter((file) => !String(file).startsWith("Docs/"))
    .map((file) => ({
      path: file,
      functions: [],
      reason: "A relevant prior handoff touched this path; verify with source search before editing.",
      source: "handoff-history",
    }));

  return dedupeBy([...stageHints, ...touchedSourceFiles], (entry) => entry.path)
    .slice(0, MAX_CODE_HINTS);
}

function buildToolPlan({ roleContext, recommendedSkills, matchedHandoffs, stageAnchors, docAnchors }) {
  const plan = [];

  if (roleContext) {
    plan.push({
      tool: "get_role_context",
      when: `Before acting as ${roleContext.canonicalName}.`,
      input: { role: roleContext.canonicalName },
    });
  }

  if (recommendedSkills.length > 0) {
    plan.push({
      tool: "file read",
      when: "Read the relevant workflow skill before following it.",
      input: { file: recommendedSkills[0].file },
    });
  }

  if (matchedHandoffs.length > 0) {
    plan.push({
      tool: "search_handoffs",
      when: "Broaden or refine prior-work lookup if the matched handoffs are insufficient.",
      input: { query: "same task focus", limit: MAX_HANDOFFS_TO_INSPECT },
    });
  }

  if (stageAnchors.length > 0) {
    plan.push({
      tool: "lookup_stage",
      when: "Resolve analyzer ownership before reading or editing stage code.",
      input: { name: "stage or task phrase", limit: 5 },
    });
  }

  const firstDocSection = docAnchors[0]?.sections?.[0]?.heading;
  if (docAnchors.length > 0 && firstDocSection) {
    plan.push({
      tool: "get_doc_section",
      when: "Fetch a precise section from a recommended doc instead of loading broad docs blindly.",
      input: { file: docAnchors[0].file, section: firstDocSection },
    });
  } else if (docAnchors.length > 0) {
    plan.push({
      tool: "file read",
      when: "Read the recommended doc when no indexed section heading is available.",
      input: { file: docAnchors[0].file },
    });
  }

  plan.push({
    tool: "source search",
    when: "Use normal file search for exact implementation locations; handoff search is task history, not a code index.",
    input: { command: "Select-String or rg when available" },
  });

  return plan;
}

function buildWarnings({ roleContext, recommendedSkills }) {
  const roleWarnings = (roleContext?.antiPatterns ?? []).map((entry) => ({
    source: "role-anti-pattern",
    message: entry,
  }));

  const skillWarnings = recommendedSkills
    .filter((entry) => entry.disableModelInvocation)
    .map((entry) => ({
      source: "skill-frontmatter",
      message: `${entry.command} disables automatic model invocation; use it only when explicitly selected for the task.`,
    }));

  return [...roleWarnings, ...skillWarnings];
}

function buildFirstActions({ recommendedRole, recommendedSkills, docsToRead, handoffsToInspect, codeSearchHints }) {
  const actions = [];

  if (recommendedRole) {
    actions.push({
      action: "Load the role brief and keep its anti-patterns in view.",
      refs: [recommendedRole.file],
      reason: recommendedRole.reason,
    });
  }

  if (recommendedSkills.length > 0) {
    actions.push({
      action: `Read and follow ${recommendedSkills[0].command}.`,
      refs: [recommendedSkills[0].file],
      reason: recommendedSkills[0].reason,
    });
  }

  if (handoffsToInspect.length > 0) {
    actions.push({
      action: "Open the top matched handoff before designing or editing.",
      refs: [handoffsToInspect[0].file],
      reason: handoffsToInspect[0].reason,
    });
  }

  const firstDoc = docsToRead.find((entry) => entry.source !== "skill-workflow");
  if (firstDoc) {
    actions.push({
      action: "Read the most relevant governing doc section.",
      refs: [firstDoc.file],
      reason: firstDoc.reason,
    });
  }

  if (codeSearchHints.length > 0) {
    actions.push({
      action: "Inspect the likely owning code paths with normal source search/file reads.",
      refs: codeSearchHints.slice(0, 3).map((entry) => entry.path),
      reason: "Stage and handoff metadata point to these paths, but source reads remain authoritative.",
    });
  }

  actions.push({
    action: "Choose verification from the workflow and repo commands, avoiding expensive suites unless required.",
    refs: ["AGENTS.md"],
    reason: "FactHarbor separates safe tests from real-LLM validation runs.",
  });

  return actions.slice(0, MAX_FIRST_ACTIONS);
}

export function buildStartupAdvice(
  knowledgeContext,
  { task, role, skill } = {},
  { resolvedRole, matchedHandoffs, stageAnchors, docAnchors } = {},
) {
  const skillEntries = knowledgeContext.data?.skills?.entries ?? [];
  const recommendedSkills = rankSkills(skillEntries, task, skill).map((entry) => ({
    name: entry.name,
    command: entry.command,
    file: entry.file,
    description: entry.description,
    reason: entry.reason,
    score: entry.score,
    disableModelInvocation: entry.disableModelInvocation,
    sections: entry.sections,
  }));
  const recommendedRole = buildRecommendedRole(resolvedRole, role);
  const docsToRead = buildDocsToRead({ roleContext: resolvedRole, recommendedSkills, docAnchors });
  const handoffsToInspect = buildHandoffsToInspect(matchedHandoffs);
  const codeSearchHints = buildCodeSearchHints({ stageAnchors, matchedHandoffs });

  return {
    recommendedRole,
    recommendedSkills,
    firstActions: buildFirstActions({
      recommendedRole,
      recommendedSkills,
      docsToRead,
      handoffsToInspect,
      codeSearchHints,
    }),
    docsToRead,
    handoffsToInspect,
    codeSearchHints,
    toolPlan: buildToolPlan({
      roleContext: resolvedRole,
      recommendedSkills,
      matchedHandoffs,
      stageAnchors,
      docAnchors,
    }),
    warnings: buildWarnings({ roleContext: resolvedRole, recommendedSkills }),
  };
}
