import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  EVIDENCE_QUERY_PLANNING_PROMPT_FILE,
  EVIDENCE_QUERY_PLANNING_PROMPT_PROFILE,
  EVIDENCE_QUERY_PLANNING_SECTION_ID,
  EVIDENCE_QUERY_PLANNING_VARIABLES,
  loadAndRenderEvidenceQueryPlanningPrompt,
} from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/prompt-loader";
import { EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION } from "@/lib/analyzer-v2/evidence-lifecycle/task-contracts/types";

const webRoot = process.cwd();
const variables = {
  claimContractJson: JSON.stringify({
    schemaVersion: "v2.claim_contract.0",
    input: {
      detectedLanguage: "de",
      selectedAtomicClaimIds: ["AC_001"],
    },
    atomicClaims: [
      {
        id: "AC_001",
        statement: "Entity A machte Aussage B.",
        selected: true,
      },
    ],
  }),
  taskPolicySnapshotJson: JSON.stringify({ gatewayTaskId: "evidence_query_planning" }),
  retrievalPolicyCatalogJson: JSON.stringify(["baseline_research"]),
  sourceAcquisitionTraceJson: JSON.stringify({
    status: "not_wired_in_7L1",
    currentDate: "2026-05-15",
  }),
};

describe("analyzer-v2 evidence query-planning prompt loader", () => {
  it("loads only the approved V2 query-planning section and appends JSON packets", async () => {
    const rendered = await loadAndRenderEvidenceQueryPlanningPrompt({ variables });

    expect(rendered.profile).toBe(EVIDENCE_QUERY_PLANNING_PROMPT_PROFILE);
    expect(path.basename(rendered.promptFilePath)).toBe(EVIDENCE_QUERY_PLANNING_PROMPT_FILE);
    expect(rendered.sectionId).toBe(EVIDENCE_QUERY_PLANNING_SECTION_ID);
    expect(rendered.requiredVariables).toEqual([...EVIDENCE_QUERY_PLANNING_VARIABLES]);
    expect(rendered.promptContentHash).toHaveLength(64);
    expect(rendered.renderedPrompt).toContain(EVIDENCE_QUERY_PLANNING_RESULT_SCHEMA_VERSION);
    expect(rendered.renderedPrompt).toContain("The hidden/internal query-planning runtime loader provides these JSON packets");
    expect(rendered.renderedPrompt).toContain("Integrity event object");
    expect(rendered.renderedPrompt).toContain("`references`: string array");
    expect(rendered.renderedPrompt).toContain("Do not emit alternate event field names such as `eventType`");
    expect(rendered.renderedPrompt).toContain("Downstream Source Acquisition posture");
    expect(rendered.renderedPrompt).toContain("return `status: accepted` with a bounded `queryPlan`");
    expect(rendered.renderedPrompt).toContain("`not_wired_in_7L1`");
    expect(rendered.renderedPrompt).toContain("It is not, by itself, a Query Planning block");
    expect(rendered.renderedPrompt).toContain("Packet: claimContractJson");
    expect(rendered.renderedPrompt).toContain("Entity A machte Aussage B.");
    expect(rendered.renderedPrompt).toContain("\"detectedLanguage\":\"de\"");
    expect(rendered.renderedPrompt).not.toMatch(/\$\{\w+\}/);
  });

  it("renders deterministic prompt bytes for identical inputs", async () => {
    const first = await loadAndRenderEvidenceQueryPlanningPrompt({ variables });
    const second = await loadAndRenderEvidenceQueryPlanningPrompt({ variables });

    expect(second.promptContentHash).toBe(first.promptContentHash);
    expect(second.renderedPrompt).toBe(first.renderedPrompt);
  });

  it("rejects wrong profile, file, section, variables, and non-JSON packets", async () => {
    await expect(loadAndRenderEvidenceQueryPlanningPrompt({
      profile: "claimboundary",
      variables,
    })).rejects.toThrow("rejects prompt profile");

    await expect(loadAndRenderEvidenceQueryPlanningPrompt({
      promptFilePath: path.resolve(webRoot, "prompts/claimboundary.prompt.md"),
      variables,
    })).rejects.toThrow("rejects prompt file");

    await expect(loadAndRenderEvidenceQueryPlanningPrompt({
      sectionId: "V2_EVIDENCE_EXTRACTION",
      variables,
    })).rejects.toThrow("rejects prompt section");

    await expect(loadAndRenderEvidenceQueryPlanningPrompt({
      variables: {
        ...variables,
        extraPacketJson: "{}",
      } as typeof variables,
    })).rejects.toThrow("requires exactly these variables");

    await expect(loadAndRenderEvidenceQueryPlanningPrompt({
      variables: {
        ...variables,
        claimContractJson: "not-json",
      },
    })).rejects.toThrow("not valid JSON");
  });
});
