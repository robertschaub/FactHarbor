import { readFile } from "node:fs/promises";
import path from "node:path";
import { canonicalizeContent, computeContentHash } from "@/lib/config-schemas";
import {
  EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION,
  EVIDENCE_TASK_PROMPT_SECTION_IDS,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";

export const EVIDENCE_QUERY_PLANNING_PROMPT_PROFILE = "claimboundary-v2";
export const EVIDENCE_QUERY_PLANNING_PROMPT_FILE = "claimboundary-v2.prompt.md";
export const EVIDENCE_QUERY_PLANNING_SECTION_ID =
  EVIDENCE_TASK_PROMPT_SECTION_IDS.evidence_query_planning;
export const EVIDENCE_QUERY_PLANNING_VARIABLES = [
  "claimContractJson",
  "taskPolicySnapshotJson",
  "retrievalPolicyCatalogJson",
  "sourceAcquisitionTraceJson",
] as const;

export type EvidenceQueryPlanningPromptVariable =
  typeof EVIDENCE_QUERY_PLANNING_VARIABLES[number];

export type EvidenceQueryPlanningPromptRequest = {
  profile?: string;
  promptFilePath?: string;
  sectionId?: string;
  variables: Record<EvidenceQueryPlanningPromptVariable, string>;
};

export type RenderedEvidenceQueryPlanningPrompt = {
  profile: typeof EVIDENCE_QUERY_PLANNING_PROMPT_PROFILE;
  sectionId: typeof EVIDENCE_QUERY_PLANNING_SECTION_ID;
  promptFilePath: string;
  promptContentHash: string;
  requiredVariables: readonly EvidenceQueryPlanningPromptVariable[];
  renderedPrompt: string;
};

type PromptFrontmatter = {
  pipeline: string | null;
};

const PROMPT_ROOT = path.resolve(process.cwd(), "prompts");
const DEFAULT_PROMPT_PATH = path.join(PROMPT_ROOT, EVIDENCE_QUERY_PLANNING_PROMPT_FILE);

function normalizePromptPath(promptFilePath: string): string {
  return path.resolve(promptFilePath);
}

function assertPromptRequest(request: EvidenceQueryPlanningPromptRequest): {
  promptFilePath: string;
  sectionId: typeof EVIDENCE_QUERY_PLANNING_SECTION_ID;
} {
  const profile = request.profile ?? EVIDENCE_QUERY_PLANNING_PROMPT_PROFILE;
  if (profile !== EVIDENCE_QUERY_PLANNING_PROMPT_PROFILE) {
    throw new Error(`Analyzer V2 query-planning prompt loader rejects prompt profile: ${profile}`);
  }

  const sectionId = request.sectionId ?? EVIDENCE_QUERY_PLANNING_SECTION_ID;
  if (sectionId !== EVIDENCE_QUERY_PLANNING_SECTION_ID) {
    throw new Error(`Analyzer V2 query-planning prompt loader rejects prompt section: ${sectionId}`);
  }

  const promptFilePath = normalizePromptPath(request.promptFilePath ?? DEFAULT_PROMPT_PATH);
  const relativePromptPath = path.relative(PROMPT_ROOT, promptFilePath).replace(/\\/g, "/");
  if (relativePromptPath !== EVIDENCE_QUERY_PLANNING_PROMPT_FILE) {
    throw new Error(`Analyzer V2 query-planning prompt loader rejects prompt file: ${relativePromptPath}`);
  }

  const suppliedVariables = Object.keys(request.variables).sort();
  const expectedVariables = [...EVIDENCE_QUERY_PLANNING_VARIABLES].sort();
  if (
    suppliedVariables.length !== expectedVariables.length
    || suppliedVariables.some((variable, index) => variable !== expectedVariables[index])
  ) {
    throw new Error(
      `Analyzer V2 query-planning prompt loader requires exactly these variables: ${expectedVariables.join(", ")}`,
    );
  }

  for (const variableName of EVIDENCE_QUERY_PLANNING_VARIABLES) {
    try {
      JSON.parse(request.variables[variableName]);
    } catch (error) {
      throw new Error(`Analyzer V2 query-planning prompt variable is not valid JSON: ${variableName}`);
    }
  }

  return { promptFilePath, sectionId };
}

function readFrontmatter(content: string): PromptFrontmatter {
  if (!content.startsWith("---\n")) {
    return { pipeline: null };
  }

  const end = content.indexOf("\n---", 4);
  if (end < 0) {
    return { pipeline: null };
  }

  const frontmatter = content.slice(4, end);
  const match = frontmatter.match(/^pipeline:\s*(.+)$/m);
  return {
    pipeline: match?.[1]?.trim().replace(/^["']|["']$/g, "") ?? null,
  };
}

function readSection(content: string, sectionId: string): string {
  const header = `## ${sectionId}`;
  const start = content.indexOf(header);
  if (start < 0) {
    throw new Error(`Analyzer V2 query-planning prompt section not found: ${sectionId}`);
  }

  const contentStart = start + header.length;
  const nextHeader = content.indexOf("\n## ", contentStart);
  return content.slice(contentStart, nextHeader >= 0 ? nextHeader : undefined).trim();
}

function assertSectionContract(section: string): void {
  if (!section.includes(EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION)) {
    throw new Error("Analyzer V2 query-planning prompt section is not aligned to the approved schema.");
  }
  for (const variableName of EVIDENCE_QUERY_PLANNING_VARIABLES) {
    if (!section.includes(variableName)) {
      throw new Error(`Analyzer V2 query-planning prompt section is missing packet name: ${variableName}`);
    }
  }
}

function renderPacket(variableName: EvidenceQueryPlanningPromptVariable, value: string): string {
  return [
    `Packet: ${variableName}`,
    "```json",
    value,
    "```",
  ].join("\n");
}

function renderSection(
  section: string,
  variables: Record<EvidenceQueryPlanningPromptVariable, string>,
): string {
  return [
    section,
    "### Runtime JSON Packets",
    ...EVIDENCE_QUERY_PLANNING_VARIABLES.map((variableName) =>
      renderPacket(variableName, variables[variableName])
    ),
  ].join("\n\n");
}

export async function loadAndRenderEvidenceQueryPlanningPrompt(
  request: EvidenceQueryPlanningPromptRequest,
): Promise<RenderedEvidenceQueryPlanningPrompt> {
  const { promptFilePath, sectionId } = assertPromptRequest(request);
  const content = (await readFile(promptFilePath, "utf8")).replace(/\r\n/g, "\n");
  const frontmatter = readFrontmatter(content);
  if (frontmatter.pipeline !== EVIDENCE_QUERY_PLANNING_PROMPT_PROFILE) {
    throw new Error(
      `Analyzer V2 query-planning prompt frontmatter pipeline mismatch: ${frontmatter.pipeline ?? "missing"}`,
    );
  }

  const section = readSection(content, sectionId);
  assertSectionContract(section);

  return {
    profile: EVIDENCE_QUERY_PLANNING_PROMPT_PROFILE,
    sectionId,
    promptFilePath,
    promptContentHash: computeContentHash(canonicalizeContent("prompt", content)),
    requiredVariables: EVIDENCE_QUERY_PLANNING_VARIABLES,
    renderedPrompt: renderSection(section, request.variables),
  };
}
