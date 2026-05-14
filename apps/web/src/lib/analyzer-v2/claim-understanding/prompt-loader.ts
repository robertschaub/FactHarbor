import { readFile } from "node:fs/promises";
import path from "node:path";
import { canonicalizeContent, computeContentHash } from "@/lib/config-schemas";

export const CLAIMBOUNDARY_V2_PROMPT_PROFILE = "claimboundary-v2";
export const CLAIMBOUNDARY_V2_PROMPT_FILE = "claimboundary-v2.prompt.md";
export const CLAIM_UNDERSTANDING_GATE1_SECTION_ID = "V2_CLAIM_UNDERSTANDING_GATE1";
export const CLAIM_UNDERSTANDING_GATE1_VARIABLES = [
  "currentDate",
  "analysisInput",
  "acsSnapshotJson",
  "inputGroundingSeedJson",
] as const;

export type ClaimUnderstandingPromptVariable = typeof CLAIM_UNDERSTANDING_GATE1_VARIABLES[number];

export type AnalyzerV2ClaimUnderstandingPromptRequest = {
  profile?: string;
  promptFilePath?: string;
  sectionId?: string;
  variables: Record<ClaimUnderstandingPromptVariable, string>;
};

export type AnalyzerV2RenderedClaimUnderstandingPrompt = {
  profile: typeof CLAIMBOUNDARY_V2_PROMPT_PROFILE;
  sectionId: typeof CLAIM_UNDERSTANDING_GATE1_SECTION_ID;
  promptFilePath: string;
  promptContentHash: string;
  requiredVariables: readonly ClaimUnderstandingPromptVariable[];
  renderedPrompt: string;
};

type PromptFrontmatter = {
  pipeline: string | null;
  variables: string[];
  requiredSections: string[];
};

const PROMPT_ROOT = path.resolve(process.cwd(), "prompts");
const DEFAULT_PROMPT_PATH = path.join(PROMPT_ROOT, CLAIMBOUNDARY_V2_PROMPT_FILE);

function normalizePromptPath(promptFilePath: string): string {
  return path.resolve(promptFilePath);
}

function assertV2PromptRequest(request: AnalyzerV2ClaimUnderstandingPromptRequest): {
  promptFilePath: string;
  sectionId: typeof CLAIM_UNDERSTANDING_GATE1_SECTION_ID;
} {
  const profile = request.profile ?? CLAIMBOUNDARY_V2_PROMPT_PROFILE;
  if (profile !== CLAIMBOUNDARY_V2_PROMPT_PROFILE) {
    throw new Error(`Analyzer V2 prompt loader rejects prompt profile: ${profile}`);
  }

  const sectionId = request.sectionId ?? CLAIM_UNDERSTANDING_GATE1_SECTION_ID;
  if (sectionId !== CLAIM_UNDERSTANDING_GATE1_SECTION_ID) {
    throw new Error(`Analyzer V2 prompt loader rejects prompt section: ${sectionId}`);
  }

  const promptFilePath = normalizePromptPath(request.promptFilePath ?? DEFAULT_PROMPT_PATH);
  const relativePromptPath = path.relative(PROMPT_ROOT, promptFilePath).replace(/\\/g, "/");
  if (relativePromptPath !== CLAIMBOUNDARY_V2_PROMPT_FILE) {
    throw new Error(`Analyzer V2 prompt loader rejects prompt file: ${relativePromptPath}`);
  }

  const suppliedVariables = Object.keys(request.variables).sort();
  const expectedVariables = [...CLAIM_UNDERSTANDING_GATE1_VARIABLES].sort();
  if (
    suppliedVariables.length !== expectedVariables.length
    || suppliedVariables.some((variable, index) => variable !== expectedVariables[index])
  ) {
    throw new Error(
      `Analyzer V2 prompt loader requires exactly these variables: ${expectedVariables.join(", ")}`,
    );
  }

  return { promptFilePath, sectionId };
}

function parseInlineArray(value: string | null): string[] {
  if (!value) {
    return [];
  }

  const trimmed = value.trim();
  if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) {
    return [];
  }

  return trimmed
    .slice(1, -1)
    .split(",")
    .map((entry) => entry.trim().replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

function readFrontmatter(content: string): PromptFrontmatter {
  if (!content.startsWith("---\n")) {
    return { pipeline: null, variables: [], requiredSections: [] };
  }

  const end = content.indexOf("\n---", 4);
  if (end < 0) {
    return { pipeline: null, variables: [], requiredSections: [] };
  }

  const frontmatter = content.slice(4, end);
  const readScalar = (key: string): string | null => {
    const match = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, "m"));
    return match?.[1]?.trim().replace(/^["']|["']$/g, "") ?? null;
  };

  return {
    pipeline: readScalar("pipeline"),
    variables: parseInlineArray(readScalar("variables")),
    requiredSections: parseInlineArray(readScalar("requiredSections")),
  };
}

function assertFrontmatter(frontmatter: PromptFrontmatter): void {
  if (frontmatter.pipeline !== CLAIMBOUNDARY_V2_PROMPT_PROFILE) {
    throw new Error(`Analyzer V2 prompt frontmatter pipeline mismatch: ${frontmatter.pipeline ?? "missing"}`);
  }

  if (frontmatter.requiredSections.length !== 1 || frontmatter.requiredSections[0] !== CLAIM_UNDERSTANDING_GATE1_SECTION_ID) {
    throw new Error("Analyzer V2 prompt frontmatter must require only the Claim Understanding Gate 1 section");
  }

  if (
    frontmatter.variables.length !== CLAIM_UNDERSTANDING_GATE1_VARIABLES.length
    || frontmatter.variables.some((variable, index) => variable !== CLAIM_UNDERSTANDING_GATE1_VARIABLES[index])
  ) {
    throw new Error("Analyzer V2 prompt frontmatter variables do not match the approved Claim Understanding variables");
  }
}

function readSection(content: string, sectionId: string): string {
  const header = `## ${sectionId}`;
  const start = content.indexOf(header);
  if (start < 0) {
    throw new Error(`Analyzer V2 prompt section not found: ${sectionId}`);
  }

  const contentStart = start + header.length;
  const nextHeader = content.indexOf("\n## ", contentStart);
  return content.slice(contentStart, nextHeader >= 0 ? nextHeader : undefined).trim();
}

function variablesReferencedBy(content: string): string[] {
  return [...new Set(
    [...content.matchAll(/\$\{(\w+)\}/g)].map((match) => match[1]),
  )].sort();
}

function renderSection(section: string, variables: Record<ClaimUnderstandingPromptVariable, string>): string {
  const referencedVariables = variablesReferencedBy(section);
  const expectedVariables = [...CLAIM_UNDERSTANDING_GATE1_VARIABLES].sort();
  if (
    referencedVariables.length !== expectedVariables.length
    || referencedVariables.some((variable, index) => variable !== expectedVariables[index])
  ) {
    throw new Error("Analyzer V2 prompt section references unapproved variables");
  }

  return section.replace(/\$\{(\w+)\}/g, (_match, variableName: ClaimUnderstandingPromptVariable) => {
    return variables[variableName];
  });
}

export async function loadAndRenderClaimUnderstandingGate1Prompt(
  request: AnalyzerV2ClaimUnderstandingPromptRequest,
): Promise<AnalyzerV2RenderedClaimUnderstandingPrompt> {
  const { promptFilePath, sectionId } = assertV2PromptRequest(request);
  const content = (await readFile(promptFilePath, "utf8")).replace(/\r\n/g, "\n");
  const frontmatter = readFrontmatter(content);
  assertFrontmatter(frontmatter);

  return {
    profile: CLAIMBOUNDARY_V2_PROMPT_PROFILE,
    sectionId,
    promptFilePath,
    promptContentHash: computeContentHash(canonicalizeContent("prompt", content)),
    requiredVariables: CLAIM_UNDERSTANDING_GATE1_VARIABLES,
    renderedPrompt: renderSection(readSection(content, sectionId), request.variables),
  };
}
