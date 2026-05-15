import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  EVIDENCE_APPLICABILITY_RESULT_SCHEMA_VERSION,
  EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
  EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION,
  EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION,
  EVIDENCE_TASK_PROMPT_SECTION_IDS,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";
import { buildStaticEvidenceTaskPolicySnapshot } from "@/lib/analyzer-v2/evidence-lifecycle/task-policy/static-policy";

const webRoot = process.cwd();
const repoRoot = path.resolve(webRoot, "../..");
const promptPath = path.resolve(webRoot, "prompts/claimboundary-v2.prompt.md");
const agentsPath = path.resolve(repoRoot, "AGENTS.md");

const evidenceSectionIds = Object.values(EVIDENCE_TASK_PROMPT_SECTION_IDS);
const expectedSchemaVersions = [
  EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION,
  EVIDENCE_APPLICABILITY_RESULT_SCHEMA_VERSION,
  EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
  EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION,
];

function readPrompt(): string {
  return readFileSync(promptPath, "utf8").replace(/\r\n/g, "\n");
}

function readInlineFrontmatterArray(content: string, key: string): string[] {
  const match = content.match(new RegExp(`^${key}:\\s*\\[([^\\]]*)\\]`, "m"));
  return match
    ? match[1].split(",").map((value) => value.trim()).filter(Boolean)
    : [];
}

function readSection(content: string, id: string): string {
  const header = `## ${id}`;
  const start = content.indexOf(header);
  if (start < 0) {
    return "";
  }
  const contentStart = start + header.length;
  const nextHeader = content.indexOf("\n## ", contentStart);
  return content.slice(contentStart, nextHeader >= 0 ? nextHeader : undefined).trim();
}

function captainDefinedAnalysisInputs(): string[] {
  const agents = readFileSync(agentsPath, "utf8");
  const marker = "- **Current Captain-defined analysis inputs:**";
  const markerIndex = agents.indexOf(marker);
  expect(markerIndex).toBeGreaterThanOrEqual(0);

  const rest = agents.slice(markerIndex + marker.length);
  const nextHeading = rest.search(/\n### |\n## /);
  const section = nextHeading >= 0 ? rest.slice(0, nextHeading) : rest;
  const inputs = [...section.matchAll(/^\s+- `([^`]+)`/gm)].map((match) => match[1]);

  expect(inputs.length).toBeGreaterThan(0);
  return inputs;
}

describe("analyzer-v2 Evidence Lifecycle prompt task contracts", () => {
  it("adds Evidence Lifecycle sections without making them file-seeded or loader-required", () => {
    const content = readPrompt();

    for (const sectionId of evidenceSectionIds) {
      expect(readSection(content, sectionId)).toBeTruthy();
    }
    expect(readInlineFrontmatterArray(content, "requiredSections")).toEqual([
      "V2_CLAIM_UNDERSTANDING_GATE1",
    ]);
    expect(readInlineFrontmatterArray(content, "variables")).toEqual([
      "currentDate",
      "analysisInput",
      "acsSnapshotJson",
      "inputGroundingSeedJson",
    ]);
  });

  it("keeps Evidence Lifecycle sections non-rendered and schema-aligned", () => {
    const content = readPrompt();
    const sections = evidenceSectionIds.map((sectionId) => readSection(content, sectionId));
    const joined = sections.join("\n\n");

    for (const section of sections) {
      expect(section).not.toMatch(/\$\{\w+\}/);
      expect(section).toContain("Return only one JSON object");
      expect(section).toContain("accepted");
      expect(section).toContain("blocked");
      expect(section).toContain("damaged");
    }
    for (const schemaVersion of expectedSchemaVersions) {
      expect(joined).toContain(schemaVersion);
    }
  });

  it("keeps Evidence Lifecycle prompt sections generic and free of Captain canary terms", () => {
    const content = readPrompt();

    for (const captainInput of captainDefinedAnalysisInputs()) {
      expect(content).not.toContain(captainInput);
    }
    expect(content).not.toContain("claimboundary.prompt.md");
    expect(content).not.toContain("## CLAIM_EXTRACTION");
    expect(content).not.toContain("## EVIDENCE_EXTRACTION");
    expect(content).not.toContain("## RESEARCH_QUERIES");
    expect(content).not.toContain("## SEARCH_QUERY_GENERATION");
    expect(content).not.toContain("## VERDICT_GENERATION");
  });

  it("links static task metadata to prompt sections and output schemas without execution authority", () => {
    const snapshot = buildStaticEvidenceTaskPolicySnapshot();

    expect(snapshot.policyStatus).toBe("not_executable");
    expect(snapshot.promptModelExecution).toBe("not_approved");
    expect(snapshot.cachePolicy).toBe("no_store_no_read");
    expect(snapshot.providerExecution).toBe("not_wired");

    for (const task of snapshot.plannedTasks) {
      expect(task.status).toBe("symbolic_not_executable");
      expect(task.promptApprovalStatus).toBe("missing");
      expect(task.modelPolicyStatus).toBe("not_approved");
      expect(task.executionAuthority).toBe("not_executable");
      expect(task.promptSectionId).toBe(EVIDENCE_TASK_PROMPT_SECTION_IDS[task.taskKey]);
      expect(expectedSchemaVersions).toContain(task.outputSchemaVersion);
    }
  });
});
