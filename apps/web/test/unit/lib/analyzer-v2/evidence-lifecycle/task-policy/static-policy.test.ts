import { describe, expect, it } from "vitest";
import {
  buildStaticEvidenceTaskPolicySnapshot,
  readStaticEvidenceRetrievalPolicyCatalog,
} from "@/lib/analyzer-v2/evidence-lifecycle/task-policy/static-policy";

describe("analyzer-v2 Evidence Lifecycle static task policy", () => {
  it("builds the exact hidden query-planning and W5 evidence-extraction policy snapshot", () => {
    expect(buildStaticEvidenceTaskPolicySnapshot()).toEqual({
      snapshotVersion: "v2.evidence-lifecycle.task-policy.0",
      source: "static_contract_only",
      policyStatus: "query_planning_and_evidence_extraction_hidden_internal_executable",
      plannedTasks: [
        {
          taskKey: "evidence_query_planning",
          status: "hidden_internal_executable",
          promptSectionId: "V2_EVIDENCE_QUERY_PLANNING",
          outputSchemaVersion: "v2.evidence_query_planning_result.0",
          promptApprovalStatus: "approved",
          modelPolicyStatus: "approved",
          executionAuthority: "gateway_executable_hidden_internal",
        },
        {
          taskKey: "evidence_applicability",
          status: "symbolic_not_executable",
          promptSectionId: "V2_EVIDENCE_APPLICABILITY",
          outputSchemaVersion: "v2.evidence_applicability_result.0",
          promptApprovalStatus: "missing",
          modelPolicyStatus: "not_approved",
          executionAuthority: "not_executable",
        },
        {
          taskKey: "evidence_extraction",
          status: "hidden_internal_executable",
          promptSectionId: "V2_EVIDENCE_EXTRACTION",
          outputSchemaVersion: "v2.evidence_extraction_result.0",
          promptApprovalStatus: "approved",
          modelPolicyStatus: "approved",
          executionAuthority: "gateway_executable_hidden_internal",
        },
        {
          taskKey: "evidence_sufficiency",
          status: "symbolic_not_executable",
          promptSectionId: "V2_EVIDENCE_SUFFICIENCY_GATE",
          outputSchemaVersion: "v2.evidence_sufficiency_assessment.0",
          promptApprovalStatus: "missing",
          modelPolicyStatus: "not_approved",
          executionAuthority: "not_executable",
        },
      ],
      retrievalPolicyCatalog: [
        { policyKey: "baseline_research", status: "planned_not_executable", source: "static_contract_only" },
        { policyKey: "primary_source_refinement", status: "planned_not_executable", source: "static_contract_only" },
        { policyKey: "contradiction_search", status: "planned_not_executable", source: "static_contract_only" },
        { policyKey: "supplementary_language_lane", status: "planned_not_executable", source: "static_contract_only" },
        { policyKey: "evidence_scarcity_handling", status: "planned_not_executable", source: "static_contract_only" },
      ],
      cachePolicy: "no_store_no_read",
      providerExecution: "query_planning_and_bounded_evidence_extraction_wired_hidden_internal",
      promptModelExecution: "query_planning_and_bounded_evidence_extraction_approved_only",
      publicExposure: "forbidden",
      sourceReliabilityIntegration: "thin_port_pending",
      sourceLanguagePolicy: "source_language_first_query_planning_approved",
    });
  });

  it("returns defensive copies of snapshot arrays", () => {
    const first = buildStaticEvidenceTaskPolicySnapshot();
    const second = buildStaticEvidenceTaskPolicySnapshot();

    (first.plannedTasks as Array<{ taskKey: string }>)[0].taskKey = "mutated";
    (first.retrievalPolicyCatalog as Array<{ policyKey: string }>)[0].policyKey = "mutated";

    expect(second.plannedTasks[0]?.taskKey).toBe("evidence_query_planning");
    expect(second.retrievalPolicyCatalog[0]?.policyKey).toBe("baseline_research");
  });

  it("returns defensive copies of the retrieval catalog", () => {
    const first = readStaticEvidenceRetrievalPolicyCatalog();
    const second = readStaticEvidenceRetrievalPolicyCatalog();

    first[0].policyKey = "mutated" as never;

    expect(second[0]?.policyKey).toBe("baseline_research");
  });

  it("keeps unrelated runtime authority identifiers out of the static snapshot", () => {
    const serialized = JSON.stringify(buildStaticEvidenceTaskPolicySnapshot());

    expect(serialized).not.toContain("claim_understanding_gate1");
    expect(serialized).not.toContain("claimboundary-v2");
    expect(serialized).not.toContain("anthropic");
    expect(serialized).not.toContain("claude");
    expect(serialized).not.toContain("gpt");
  });
});
