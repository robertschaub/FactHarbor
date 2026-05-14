import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  CLAIM_CONTRACT_V2_SCHEMA_VERSION,
  CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
} from "@/lib/analyzer-v2/claim-understanding/types";
import {
  CLAIMBOUNDARY_V2_PROMPT_FILE,
  CLAIMBOUNDARY_V2_PROMPT_PROFILE,
  CLAIM_UNDERSTANDING_GATE1_SECTION_ID,
  CLAIM_UNDERSTANDING_GATE1_VARIABLES,
  loadAndRenderClaimUnderstandingGate1Prompt,
} from "@/lib/analyzer-v2/claim-understanding/prompt-loader";
import {
  canExecuteAnalyzerV2GatewayTask,
  getAnalyzerV2GatewayTask,
} from "@/lib/analyzer-v2/gateway/policy";
import {
  canonicalizeContent,
  computeContentHash,
  validateConfig,
} from "@/lib/config-schemas";
import {
  getExpectedPromptFrontmatterPipeline,
  validatePromptProfileFrontmatter,
} from "@/lib/config-storage";
import { getPromptSurfaceRegistryEntry } from "@/lib/prompt-surface-registry";

const webRoot = process.cwd();
const repoRoot = path.resolve(webRoot, "../..");
const promptPath = path.resolve(webRoot, "prompts/claimboundary-v2.prompt.md");
const agentsPath = path.resolve(repoRoot, "AGENTS.md");
const sectionId = "V2_CLAIM_UNDERSTANDING_GATE1";
const expectedVariables = [
  "currentDate",
  "analysisInput",
  "acsSnapshotJson",
  "inputGroundingSeedJson",
] as const;

const renderVariables = {
  currentDate: "2026-05-14",
  analysisInput: JSON.stringify({ inputType: "text", inputValue: "INPUT_VALUE_PLACEHOLDER" }),
  acsSnapshotJson: "null",
  inputGroundingSeedJson: JSON.stringify({
    source: "direct_input",
    inputType: "text",
    inputValue: "INPUT_VALUE_PLACEHOLDER",
    resolvedInputText: "RESOLVED_INPUT_TEXT_PLACEHOLDER",
    detectedLanguage: "und",
    currentDate: "2026-05-14",
    acsSnapshotHash: null,
    inputGroundingSeedHash: "seed-hash-placeholder",
  }),
};

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

function variablesReferencedBy(content: string): string[] {
  return [...new Set(
    [...content.matchAll(/\$\{(\w+)\}/g)].map((match) => match[1]),
  )].sort();
}

function renderSection(content: string, variables: Record<string, string>): {
  rendered: string;
  missing: string[];
} {
  const missing: string[] = [];
  const rendered = content.replace(/\$\{(\w+)\}/g, (match, variableName: string) => {
    if (variableName in variables) {
      return variables[variableName];
    }
    missing.push(variableName);
    return match;
  });
  return { rendered, missing };
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

describe("V2 Claim Understanding prompt contract", () => {
  it("validates as a non-executable claimboundary-v2 prompt profile", () => {
    const content = readPrompt();
    const validation = validateConfig("prompt", content, "prompt.v1");
    const frontmatterValidation = validatePromptProfileFrontmatter("claimboundary-v2", content);

    expect(validation.valid, validation.errors.join("\n")).toBe(true);
    expect(frontmatterValidation.valid, frontmatterValidation.errors.join("\n")).toBe(true);
    expect(getExpectedPromptFrontmatterPipeline("claimboundary-v2")).toBe("claimboundary-v2");
    expect(computeContentHash(canonicalizeContent("prompt", content))).toHaveLength(64);
  });

  it("matches the gateway task section, variables, and schema versions", () => {
    const content = readPrompt();
    const section = readSection(content, sectionId);
    const gatewayTask = getAnalyzerV2GatewayTask("claim_understanding_gate1");

    expect(section).toBeTruthy();
    expect(readInlineFrontmatterArray(content, "variables")).toEqual([...expectedVariables]);
    expect(readInlineFrontmatterArray(content, "requiredSections")).toEqual([sectionId]);
    expect(variablesReferencedBy(section)).toEqual([...expectedVariables].sort());
    expect(gatewayTask.promptPolicy?.sectionId).toBe(sectionId);
    expect(gatewayTask.promptPolicy?.requiredVariables).toEqual([...expectedVariables]);
    expect(gatewayTask.promptPolicy?.outputSchemaVersion).toBe(CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION);
    expect(gatewayTask.status).toBe("blockedUntilPromptApproved");
    expect(canExecuteAnalyzerV2GatewayTask(gatewayTask)).toBe(false);
    expect(section).toContain(CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION);
    expect(section).toContain(CLAIM_CONTRACT_V2_SCHEMA_VERSION);
  });

  it("loads only the explicit V2 prompt profile, file, section, and approved variables", async () => {
    const rendered = await loadAndRenderClaimUnderstandingGate1Prompt({
      variables: renderVariables,
    });

    expect(rendered.profile).toBe(CLAIMBOUNDARY_V2_PROMPT_PROFILE);
    expect(path.basename(rendered.promptFilePath)).toBe(CLAIMBOUNDARY_V2_PROMPT_FILE);
    expect(rendered.sectionId).toBe(CLAIM_UNDERSTANDING_GATE1_SECTION_ID);
    expect(rendered.requiredVariables).toEqual([...CLAIM_UNDERSTANDING_GATE1_VARIABLES]);
    expect(rendered.promptContentHash).toHaveLength(64);
    expect(rendered.renderedPrompt).toContain("INPUT_VALUE_PLACEHOLDER");
    expect(rendered.renderedPrompt).not.toMatch(/\$\{\w+\}/);
  });

  it("renders deterministic prompt bytes for identical V2 prompt inputs", async () => {
    const first = await loadAndRenderClaimUnderstandingGate1Prompt({ variables: renderVariables });
    const second = await loadAndRenderClaimUnderstandingGate1Prompt({ variables: renderVariables });

    expect(second.promptContentHash).toBe(first.promptContentHash);
    expect(second.renderedPrompt).toBe(first.renderedPrompt);
  });

  it("rejects V1 profile, V1 file, V1 section, and unapproved variables", async () => {
    await expect(loadAndRenderClaimUnderstandingGate1Prompt({
      profile: "claimboundary",
      variables: renderVariables,
    })).rejects.toThrow("rejects prompt profile");

    await expect(loadAndRenderClaimUnderstandingGate1Prompt({
      promptFilePath: path.resolve(webRoot, "prompts/claimboundary.prompt.md"),
      variables: renderVariables,
    })).rejects.toThrow("rejects prompt file");

    await expect(loadAndRenderClaimUnderstandingGate1Prompt({
      sectionId: "CLAIM_EXTRACTION",
      variables: renderVariables,
    })).rejects.toThrow("rejects prompt section");

    await expect(loadAndRenderClaimUnderstandingGate1Prompt({
      variables: {
        ...renderVariables,
        legacyContext: "{}",
      } as typeof renderVariables,
    })).rejects.toThrow("requires exactly these variables");
  });

  it("renders with all declared variables and without unresolved placeholders", () => {
    const content = readPrompt();
    const section = readSection(content, sectionId);
    const { rendered, missing } = renderSection(section, renderVariables);

    expect(missing).toEqual([]);
    expect(rendered).not.toMatch(/\$\{\w+\}/);
    expect(rendered).toContain("INPUT_VALUE_PLACEHOLDER");
    expect(rendered).toContain("RESOLVED_INPUT_TEXT_PLACEHOLDER");
  });

  it("pins the expected result branches, reason codes, and structural authorship rules", () => {
    const section = readSection(readPrompt(), sectionId);

    for (const value of [
      "accepted",
      "blocked",
      "damaged",
      "duplicate_selected_claim_id",
      "no_valid_claim",
      "prepared_snapshot_invalid",
      "selected_claim_missing",
      "shell_placeholder_claim_id",
      "claim_contract_validation_failed",
      "claim_understanding_unavailable",
      "acs_prepared_snapshot",
      "v2_claim_understanding",
      "AC_DIRECT_01",
      "acsMigration",
      "prepared-stage1-v1",
      "selectedClaimFinalityPreserved",
      "null",
    ]) {
      expect(section).toContain(value);
    }

    expect(section).toContain("Do not invent missing hashes");
    expect(section).toContain("The gateway is authoritative for hashes");
    expect(section).toContain("does not research, search, cite evidence, decide truth");
    expect(section).toContain("do not create a dummy selected claim");
    expect(section).toContain("Do not choose `damaged`");
  });

  it("keeps the prompt source clean-room, generic, and not file-seeded", () => {
    const content = readPrompt();
    const registryEntry = getPromptSurfaceRegistryEntry("claimboundary-v2");

    expect(registryEntry).toMatchObject({
      sourcePaths: ["apps/web/prompts/claimboundary-v2.prompt.md"],
      reseedSupported: false,
      ucmProfile: "claimboundary-v2",
    });
    expect(content).not.toContain("claimboundary.prompt.md");
    expect(content).not.toMatch(/^pipeline:\s*claimboundary$/m);
    expect(content).not.toContain("## CLAIM_EXTRACTION");
    expect(content).not.toContain("## VERDICT_GENERATION");

    for (const captainInput of captainDefinedAnalysisInputs()) {
      expect(content).not.toContain(captainInput);
    }
  });
});
