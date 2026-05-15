import { describe, expect, it } from "vitest";
import {
  readStaticSourceAcquisitionPortContract,
  readStaticSourceAcquisitionStructuralOutcomeKinds,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition-port/static-contract";

const expectedOutcomeKinds = [
  "not_executed",
  "provider_not_configured",
  "provider_failure",
  "search_failure",
  "rate_limited",
  "fetch_failure",
  "content_unavailable",
  "content_rejected_structurally",
  "success",
];

function collectStringValues(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => collectStringValues(entry));
  }
  if (value && typeof value === "object") {
    return Object.values(value).flatMap((entry) => collectStringValues(entry));
  }
  return [];
}

describe("analyzer-v2 Evidence Lifecycle source-acquisition port contract", () => {
  it("builds the exact static non-executable port contract", () => {
    expect(readStaticSourceAcquisitionPortContract()).toEqual({
      contractVersion: "v2.evidence-lifecycle.source-acquisition-port-contract.0",
      source: "static_contract_only",
      contractStatus: "not_executable",
      queryPlanning: "llm_task_not_wired",
      semanticTaskExecution: "llm_task_not_wired",
      promptModelExecution: "not_approved",
      providerSearchFetchExecution: "not_wired",
      providerSdkImports: "forbidden",
      cachePolicy: "no_store_no_read",
      sourceReliabilityIntegration: "thin_port_pending",
      publicExposure: "forbidden",
      orchestratorProductWiring: "forbidden",
      acsDirectUrlExecution: "not_approved",
      structuralOutcomeKinds: expectedOutcomeKinds,
    });
  });

  it("keeps structural outcome labels fixed and non-semantic", () => {
    const outcomeKinds = readStaticSourceAcquisitionStructuralOutcomeKinds();
    const forbiddenSemanticTerms = [
      "relevance",
      "applicability",
      "credibility",
      "scarcity",
      "sufficiency",
      "verdict",
      "probative",
      "truth",
      "confidence",
      "source_reliability",
    ];

    expect(outcomeKinds).toEqual(expectedOutcomeKinds);
    for (const outcomeKind of outcomeKinds) {
      expect(forbiddenSemanticTerms.some((term) => outcomeKind.includes(term))).toBe(false);
    }
  });

  it("returns defensive copies of contract arrays", () => {
    const firstContract = readStaticSourceAcquisitionPortContract();
    const secondContract = readStaticSourceAcquisitionPortContract();
    const firstOutcomes = readStaticSourceAcquisitionStructuralOutcomeKinds();
    const secondOutcomes = readStaticSourceAcquisitionStructuralOutcomeKinds();

    (firstContract.structuralOutcomeKinds as string[])[0] = "mutated";
    firstOutcomes[0] = "mutated" as never;

    expect(secondContract.structuralOutcomeKinds[0]).toBe("not_executed");
    expect(secondOutcomes[0]).toBe("not_executed");
  });

  it("keeps authority values blocked and non-executable", () => {
    const values = collectStringValues(readStaticSourceAcquisitionPortContract());
    const forbiddenExecutableValues = [
      "enabled",
      "approved",
      "wired",
      "executable",
      "cache_read",
      "cache_write",
      "cache_read_write",
      "public",
      "product_wired",
    ];

    for (const forbiddenValue of forbiddenExecutableValues) {
      expect(values).not.toContain(forbiddenValue);
    }
    expect(values).toEqual(expect.arrayContaining([
      "not_executable",
      "llm_task_not_wired",
      "not_approved",
      "not_wired",
      "forbidden",
      "no_store_no_read",
      "thin_port_pending",
    ]));
  });

  it("does not carry real provider, prompt, model, network, or source identifiers", () => {
    const serialized = JSON.stringify(readStaticSourceAcquisitionPortContract());

    expect(serialized).not.toContain("claim_understanding_gate1");
    expect(serialized).not.toContain("claimboundary-v2");
    expect(serialized).not.toContain("anthropic");
    expect(serialized).not.toContain("claude");
    expect(serialized).not.toContain("openai");
    expect(serialized).not.toContain("gpt");
    expect(serialized).not.toContain("https://");
    expect(serialized).not.toContain("http://");
  });
});
