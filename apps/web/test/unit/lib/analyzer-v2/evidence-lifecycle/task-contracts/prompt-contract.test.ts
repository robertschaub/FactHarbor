import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  EVIDENCE_APPLICABILITY_RESULT_SCHEMA_VERSION,
  BOUNDARY_VERDICT_EXECUTION_SCHEMA_VERSION,
  EVIDENCE_EXTRACTION_RESULT_SCHEMA_VERSION,
  EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION,
  EVIDENCE_SUFFICIENCY_ASSESSMENT_SCHEMA_VERSION,
  EVIDENCE_TASK_PROMPT_SECTION_IDS,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";
import {
  EvidenceLifecycleTaskBlockedReasonSchema,
  EvidenceLifecycleTaskDamagedReasonSchema,
  EvidenceLifecycleTaskEventSchema,
  EvidenceMissingDimensionSchema,
  EvidenceSufficiencyMissingDimensionMaterialitySchema,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/schemas";
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
  BOUNDARY_VERDICT_EXECUTION_SCHEMA_VERSION,
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

function expectContainsAll(section: string, values: readonly string[]): void {
  for (const value of values) {
    expect(section).toContain(value);
  }
}

describe("analyzer-v2 Evidence Lifecycle prompt task contracts", () => {
  it("adds Evidence Lifecycle sections while requiring only approved loader sections", () => {
    const content = readPrompt();

    for (const sectionId of evidenceSectionIds) {
      expect(readSection(content, sectionId)).toBeTruthy();
    }
    expect(readInlineFrontmatterArray(content, "requiredSections")).toEqual([
      "V2_CLAIM_UNDERSTANDING_GATE1",
      "V2_EVIDENCE_QUERY_PLANNING",
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

  it("renders the query-planning task-event contract with canonical field names", () => {
    const content = readPrompt();
    const section = readSection(content, EVIDENCE_TASK_PROMPT_SECTION_IDS.evidence_query_planning);

    expect(section).toContain("Integrity event object");
    expect(section).toContain("`type`");
    expect(section).toContain("`severity`");
    expect(section).toContain("`message`");
    expect(section).toContain("`references`");
    expect(section).toContain("Never omit this field");
    expect(section).toContain("`eventType`");
    expect(section).toContain("For `blocked` and `damaged`, `integrityEvents` must contain at least one valid task event");
  });

  it("renders the sufficiency prompt contract from schema-owned literals without canary-domain terms", () => {
    const content = readPrompt();
    const section = readSection(content, EVIDENCE_TASK_PROMPT_SECTION_IDS.evidence_sufficiency);
    const eventShape = EvidenceLifecycleTaskEventSchema.shape;

    expect(section).toContain("v2.evidence_sufficiency_assessment.0");
    expect(section).toContain("Evidence scarcity is a candidate analytical reality");
    expectContainsAll(section, EvidenceMissingDimensionSchema.options);
    expectContainsAll(section, EvidenceSufficiencyMissingDimensionMaterialitySchema.options);
    expectContainsAll(section, eventShape.type.options);
    expectContainsAll(section, eventShape.severity.options);
    expectContainsAll(section, EvidenceLifecycleTaskBlockedReasonSchema.options);
    expectContainsAll(section, EvidenceLifecycleTaskDamagedReasonSchema.options);
    expect(section).toContain("`type`");
    expect(section).toContain("`severity`");
    expect(section).toContain("`message`");
    expect(section).toContain("`references`");
    expect(section).toContain("Never omit this field");
    expect(section).toContain("`eventType`");
    expect(section).toContain("`refs`");
    expect(section).toContain("`reference`");
    expect(section).toContain("`detail`");
    expect(section).toContain("`details`");
    expect(section).toContain("Preserve multilingual evidence meaning without translating as a prerequisite");
    expect(section).toContain("Prefer `caveat_report` over `refine_retrieval`");
    expect(section).toContain("fair boundary and verdict-candidate formation");
    expect(section).toContain("Choose `refine_retrieval` only when the corpus cannot support any fair boundary candidate");

    for (const term of ["hydrogen", "electricity", "cars", "vehicle", "efficient"]) {
      expect(section.toLowerCase()).not.toMatch(new RegExp(`\\b${term}\\b`));
    }
  });

  it("keeps closed downstream source acquisition from blocking query planning by itself", () => {
    const content = readPrompt();
    const section = readSection(content, EVIDENCE_TASK_PROMPT_SECTION_IDS.evidence_query_planning);

    expect(section).toContain("Downstream Source Acquisition posture");
    expect(section).toContain("return `status: accepted` with a bounded `queryPlan`");
    expect(section).toContain("`not_wired_in_7L1`");
    expect(section).toContain("`ready_not_executable` Source Acquisition handoff");
    expect(section).toContain("It is not, by itself, a Query Planning block");
    expect(section).toContain("do not use it solely because Source Acquisition, provider search, fetch, or parser execution is not currently executable");
  });

  it("renders the evidence-extraction strict output branch contract", () => {
    const content = readPrompt();
    const section = readSection(content, EVIDENCE_TASK_PROMPT_SECTION_IDS.evidence_extraction);

    expect(section).toContain("Branch rules");
    expect(section).toContain("Accepted with extracted evidence");
    expect(section).toContain("Accepted with no extractable evidence");
    expect(section).toContain("Blocked");
    expect(section).toContain("Damaged");
    expect(section).toContain("Integrity event object");
    expect(section).toContain("`type`");
    expect(section).toContain("`severity`");
    expect(section).toContain("`message`");
    expect(section).toContain("`references`");
    expect(section).toContain("Never omit this field");
    expect(section).toContain("`eventType`");
    expect(section).toContain("`refs`");
    expect(section).toContain("`reference`");
    expect(section).toContain("`detail`");
    expect(section).toContain("`details`");
    expect(section).toContain("For `blocked` and `damaged`, `integrityEvents` must contain at least one valid task event");
    expect(section).toContain("`evidenceScope`: strict object with exactly these keys");
    for (const field of [
      "`scopeId`",
      "`method`",
      "`temporalBounds`",
      "`populationOrDomain`",
      "`geographicScope`",
      "`limitations`",
    ]) {
      expect(section).toContain(field);
    }
    expect(section).toContain("otherwise `null`");
    expect(section).toContain("use an empty array when no limitation is extractable");
    expect(section).toContain("`provenance`: strict object with exactly `locator` and `rationale`");
    expect(section).toContain("both are non-empty strings");
    expect(section).toContain("For comparative claims, preserve the compared entities");
    expect(section).toContain("Evidence comparing a claim entity to a third entity is contextual or unclear");
    expect(section).toContain("Do not treat adjacent or substitute comparators as direct support or opposition");
    expect(section).toContain("Keep the JSON compact and complete");
    expect(section).toContain("avoid duplicative items from the same source content");
    expect(section).toContain("while preserving required evidence meaning");
  });

  it("renders the boundary/verdict execution prompt contract with citation and internal-label constraints", () => {
    const content = readPrompt();
    const section = readSection(content, EVIDENCE_TASK_PROMPT_SECTION_IDS.boundary_verdict_execution);

    expect(section).toContain("v2.boundary_verdict_execution.0");
    expect(section).toContain("boundary_verdict_execution");
    expect(section).toContain("Boundary-First Reasoning");
    expect(section).toContain("Every boundary candidate must cite at least one supplied EvidenceItem ID");
    expect(section).toContain("Every verdict candidate must cite at least one supplied EvidenceItem ID");
    expect(section).toContain("internalVerdictLabelCandidate");
    expect(section).toContain("TRUE");
    expect(section).toContain("UNVERIFIED");
    expect(section).toContain("userVisibleWarningPublication");
    expect(section).toContain("closed");
    expect(section).toContain("Return only one JSON object");
    expect(section).toContain("Branch rules");
    expect(section).toContain("Never omit these four event fields");
    expect(section).toContain("`eventType`");
    expect(section).toContain("`refs`");
    expect(section).toContain("`reference`");
    expect(section).toContain("`detail`");
    expect(section).toContain("`details`");
    expect(section).toContain("`boundaryCandidates`");
    expect(section).toContain("`verdicts`");
    expect(section).toContain("`truthPercentage`");
    expect(section).toContain("`confidence`");
    expect(section).toContain("`evidenceIds`");
    expect(section).toContain("selected AtomicClaim statement projections plus bounded EvidenceItem statements");
    expect(section).toContain("Preserve comparison structure and measurement boundaries visible in the selected AtomicClaim statements");
    expect(section).toContain("same compared entities, property, direction, and measurement frame as the selected AtomicClaim");
    expect(section).toContain("keep the internal report path open with a caveated or `UNVERIFIED` candidate");
    expect(section).not.toMatch(/\$\{\w+\}/);
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

  it("links task metadata to prompt sections and output schemas with approved hidden execution authority only", () => {
    const snapshot = buildStaticEvidenceTaskPolicySnapshot();

    expect(snapshot.policyStatus).toBe("query_planning_and_evidence_extraction_hidden_internal_executable");
    expect(snapshot.promptModelExecution).toBe("query_planning_and_bounded_evidence_extraction_approved_only");
    expect(snapshot.cachePolicy).toBe("no_store_no_read");
    expect(snapshot.providerExecution).toBe("query_planning_and_bounded_evidence_extraction_wired_hidden_internal");

    for (const task of snapshot.plannedTasks) {
      expect(task.promptSectionId).toBe(EVIDENCE_TASK_PROMPT_SECTION_IDS[task.taskKey]);
      expect(expectedSchemaVersions).toContain(task.outputSchemaVersion);
    }
    for (const taskKey of ["evidence_query_planning", "evidence_extraction"] as const) {
      expect(snapshot.plannedTasks.find((task) => task.taskKey === taskKey)).toMatchObject({
        status: "hidden_internal_executable",
        promptApprovalStatus: "approved",
        modelPolicyStatus: "approved",
        executionAuthority: "gateway_executable_hidden_internal",
      });
    }
    for (const task of snapshot.plannedTasks.filter((entry) =>
      entry.taskKey !== "evidence_query_planning" && entry.taskKey !== "evidence_extraction")) {
      expect(task).toMatchObject({
        status: "symbolic_not_executable",
        promptApprovalStatus: "missing",
        modelPolicyStatus: "not_approved",
        executionAuthority: "not_executable",
      });
    }
  });
});
