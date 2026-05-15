import { describe, expect, it } from "vitest";
import {
  ANALYZER_V2_BASE_SEMANTIC_CACHE_POLICY,
  ANALYZER_V2_CLAIM_UNDERSTANDING_CACHE_NAMESPACE,
  ANALYZER_V2_CLAIM_UNDERSTANDING_CACHE_POLICY,
  ANALYZER_V2_EVIDENCE_QUERY_PLANNING_CACHE_POLICY,
  ANALYZER_V2_SOURCE_AWARE_CACHE_POLICY,
  buildAnalyzerV2ClaimUnderstandingCacheDecision,
  buildAnalyzerV2ClaimUnderstandingCacheKeyParts,
  buildAnalyzerV2ClaimUnderstandingRuntimeNoStoreCacheDecision,
  buildAnalyzerV2CacheKeyParts,
  validateAnalyzerV2ClaimUnderstandingCacheKeyInput,
  validateAnalyzerV2CacheKeyInput,
} from "@/lib/analyzer-v2/gateway/cache-governance";
import { ANALYZER_V2_7L1_CAPTAIN_APPROVAL } from "@/lib/analyzer-v2/gateway/approval-records";
import { CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION } from "@/lib/analyzer-v2/claim-understanding/types";

const completeBaseInput = {
  promptProfile: "claimboundary-v2",
  promptSectionId: "V2_CLAIM_UNDERSTANDING_GATE1",
  promptContentHash: "prompt-hash",
  modelTask: "understand",
  provider: "anthropic",
  modelName: "claude-haiku",
  temperature: 0.2,
  outputSchemaVersion: CLAIM_UNDERSTANDING_RESULT_SCHEMA_VERSION,
  configSnapshotHash: "config-hash",
  resultSchemaVersion: "4.0.0-cb-precutover",
  inputIdentityHash: "input-hash",
  currentDateBucket: "2026-05-13",
};

describe("analyzer-v2 cache governance", () => {
  it("requires prompt, model, config, schema, input, and current-date dimensions", () => {
    const validation = validateAnalyzerV2CacheKeyInput(ANALYZER_V2_BASE_SEMANTIC_CACHE_POLICY, {});

    expect(validation.valid).toBe(false);
    expect(validation.missingDimensions).toEqual(expect.arrayContaining([
      "promptProfile",
      "promptSectionId",
      "promptContentHash",
      "modelTask",
      "provider",
      "modelName",
      "temperature",
      "outputSchemaVersion",
      "configSnapshotHash",
      "resultSchemaVersion",
      "inputIdentityHash",
      "currentDateBucket",
    ]));
  });

  it("builds deterministic ordered cache key parts from complete base dimensions", () => {
    const parts = buildAnalyzerV2CacheKeyParts(ANALYZER_V2_BASE_SEMANTIC_CACHE_POLICY, completeBaseInput);

    expect(parts.map((part) => part.dimension)).toEqual([
      ...ANALYZER_V2_BASE_SEMANTIC_CACHE_POLICY.requiredDimensions,
    ]);
    expect(parts).toContainEqual({ dimension: "temperature", value: "0.2" });
  });

  it("requires source identity for source-aware semantic cache policies", () => {
    const missingSource = validateAnalyzerV2CacheKeyInput(
      ANALYZER_V2_SOURCE_AWARE_CACHE_POLICY,
      completeBaseInput,
    );

    expect(missingSource.valid).toBe(false);
    expect(missingSource.missingDimensions).toEqual(["sourceIdentityHash"]);

    const completeSourceAware = validateAnalyzerV2CacheKeyInput(
      ANALYZER_V2_SOURCE_AWARE_CACHE_POLICY,
      {
        ...completeBaseInput,
        sourceIdentityHash: "source-pack-hash",
      },
    );
    expect(completeSourceAware.valid).toBe(true);
  });

  it("declares exact approved cache-policy metadata for evidence query planning", () => {
    expect(ANALYZER_V2_EVIDENCE_QUERY_PLANNING_CACHE_POLICY).toEqual({
      policyId: "v2.semantic.evidence-query-planning",
      requiredDimensions: [
        "promptProfile",
        "promptSectionId",
        "promptContentHash",
        "modelTask",
        "provider",
        "modelName",
        "temperature",
        "outputSchemaVersion",
        "configSnapshotHash",
        "resultSchemaVersion",
        "inputIdentityHash",
        "languageContextHash",
        "currentDateBucket",
      ],
      optionalDimensions: [
        "adapterVersion",
      ],
      approval: ANALYZER_V2_7L1_CAPTAIN_APPROVAL,
    });

    expect(validateAnalyzerV2CacheKeyInput(
      ANALYZER_V2_EVIDENCE_QUERY_PLANNING_CACHE_POLICY,
      completeBaseInput,
    )).toMatchObject({
      valid: false,
      missingDimensions: ["languageContextHash"],
    });
    expect(validateAnalyzerV2CacheKeyInput(
      ANALYZER_V2_EVIDENCE_QUERY_PLANNING_CACHE_POLICY,
      {
        ...completeBaseInput,
        languageContextHash: "language-hash",
      },
    ).valid).toBe(true);
  });

  it("validates ACS-backed claim-understanding cache keys with ACS and input-grounding dimensions", () => {
    const missingClaimUnderstandingDimensions = validateAnalyzerV2CacheKeyInput(
      ANALYZER_V2_CLAIM_UNDERSTANDING_CACHE_POLICY,
      completeBaseInput,
    );

    expect(missingClaimUnderstandingDimensions.valid).toBe(false);
    expect(missingClaimUnderstandingDimensions.missingDimensions).toEqual([
      "claimUnderstandingInputSource",
      "inputGroundingSeedHash",
    ]);

    const missingAcsSnapshot = validateAnalyzerV2ClaimUnderstandingCacheKeyInput(
      {
        ...completeBaseInput,
        claimUnderstandingInputSource: "acs_prepared_snapshot",
        inputGroundingSeedHash: "seed-hash",
      },
    );
    expect(missingAcsSnapshot.valid).toBe(false);
    expect(missingAcsSnapshot.missingDimensions).toEqual(["acsSnapshotHash"]);
    expect(() => buildAnalyzerV2ClaimUnderstandingCacheKeyParts({
      ...completeBaseInput,
      claimUnderstandingInputSource: "acs_prepared_snapshot",
      inputGroundingSeedHash: "seed-hash",
    })).toThrow("acsSnapshotHash");
    expect(() => buildAnalyzerV2CacheKeyParts(
      ANALYZER_V2_CLAIM_UNDERSTANDING_CACHE_POLICY,
      {
        ...completeBaseInput,
        claimUnderstandingInputSource: "acs_prepared_snapshot",
        inputGroundingSeedHash: "seed-hash",
      },
    )).toThrow("acsSnapshotHash");

    const completeClaimUnderstanding = validateAnalyzerV2ClaimUnderstandingCacheKeyInput(
      {
        ...completeBaseInput,
        claimUnderstandingInputSource: "acs_prepared_snapshot",
        acsSnapshotHash: "acs-hash",
        inputGroundingSeedHash: "seed-hash",
      },
    );
    expect(completeClaimUnderstanding.valid).toBe(true);
  });

  it("validates direct-input claim-understanding cache keys without requiring an ACS snapshot hash", () => {
    const directInput = validateAnalyzerV2ClaimUnderstandingCacheKeyInput({
      ...completeBaseInput,
      claimUnderstandingInputSource: "direct_input",
      inputGroundingSeedHash: "seed-hash",
    });

    expect(directInput.valid).toBe(true);

    const parts = buildAnalyzerV2ClaimUnderstandingCacheKeyParts({
      ...completeBaseInput,
      claimUnderstandingInputSource: "direct_input",
      inputGroundingSeedHash: "seed-hash",
    });
    expect(parts).toContainEqual({ dimension: "claimUnderstandingInputSource", value: "direct_input" });
    expect(parts.map((part) => part.dimension)).not.toContain("acsSnapshotHash");
  });

  it("records no-store decisions when dimensions are incomplete", () => {
    const decision = buildAnalyzerV2ClaimUnderstandingCacheDecision(completeBaseInput);

    expect(decision).toMatchObject({
      namespace: ANALYZER_V2_CLAIM_UNDERSTANDING_CACHE_NAMESPACE,
      canRead: false,
      canWrite: false,
      reason: "no_store_due_to_incomplete_dimensions",
    });
    expect(decision.missingDimensions).toEqual([
      "claimUnderstandingInputSource",
      "inputGroundingSeedHash",
    ]);
    expect(decision.keyParts).toEqual([]);
  });

  it("keeps complete claim-understanding dimensions no-store until execution is approved", () => {
    const decision = buildAnalyzerV2ClaimUnderstandingCacheDecision({
      ...completeBaseInput,
      claimUnderstandingInputSource: "direct_input",
      inputGroundingSeedHash: "seed-hash",
    });

    expect(decision.canRead).toBe(false);
    expect(decision.canWrite).toBe(false);
    expect(decision.reason).toBe("no_store_until_execution_approved");
    expect(decision.keyParts).toContainEqual({ dimension: "promptProfile", value: "claimboundary-v2" });
    expect(decision.keyParts).not.toContainEqual(expect.objectContaining({ dimension: "acsSnapshotHash" }));
  });

  it("builds a runtime-dispatch no-store decision without enabling cache IO", () => {
    const decision = buildAnalyzerV2ClaimUnderstandingRuntimeNoStoreCacheDecision({
      ...completeBaseInput,
      claimUnderstandingInputSource: "direct_input",
      inputGroundingSeedHash: "seed-hash",
    });

    expect(decision).toMatchObject({
      namespace: ANALYZER_V2_CLAIM_UNDERSTANDING_CACHE_NAMESPACE,
      canRead: false,
      canWrite: false,
      reason: "no_store_runtime_dispatch_safety",
      missingDimensions: [],
    });
    expect(decision.keyParts.map((part) => part.dimension)).toEqual([
      ...ANALYZER_V2_CLAIM_UNDERSTANDING_CACHE_POLICY.requiredDimensions,
    ]);
    expect(decision.keyParts).not.toContainEqual(expect.objectContaining({ dimension: "acsSnapshotHash" }));
  });

  it("keeps runtime-dispatch no-store fail-closed when dimensions are incomplete", () => {
    const decision = buildAnalyzerV2ClaimUnderstandingRuntimeNoStoreCacheDecision(completeBaseInput);

    expect(decision).toMatchObject({
      canRead: false,
      canWrite: false,
      reason: "no_store_due_to_incomplete_dimensions",
      keyParts: [],
    });
    expect(decision.missingDimensions).toEqual([
      "claimUnderstandingInputSource",
      "inputGroundingSeedHash",
    ]);
  });

  it("fails closed when an ACS cache decision receives a mismatched snapshot hash", () => {
    const decision = buildAnalyzerV2ClaimUnderstandingCacheDecision(
      {
        ...completeBaseInput,
        claimUnderstandingInputSource: "acs_prepared_snapshot",
        acsSnapshotHash: "actual-acs-hash",
        inputGroundingSeedHash: "seed-hash",
      },
      { expectedAcsSnapshotHash: "expected-acs-hash" },
    );

    expect(decision).toMatchObject({
      canRead: false,
      canWrite: false,
      reason: "no_store_due_to_acs_snapshot_hash_mismatch",
      missingDimensions: [],
      keyParts: [],
    });
  });

  it("lets ACS snapshot mismatch override runtime-dispatch no-store safety", () => {
    const decision = buildAnalyzerV2ClaimUnderstandingRuntimeNoStoreCacheDecision(
      {
        ...completeBaseInput,
        claimUnderstandingInputSource: "acs_prepared_snapshot",
        acsSnapshotHash: "actual-acs-hash",
        inputGroundingSeedHash: "seed-hash",
      },
      { expectedAcsSnapshotHash: "expected-acs-hash" },
    );

    expect(decision).toMatchObject({
      canRead: false,
      canWrite: false,
      reason: "no_store_due_to_acs_snapshot_hash_mismatch",
      missingDimensions: [],
      keyParts: [],
    });
  });

  it("allows synthetic cache eligibility only when dimensions and execution approval are explicit", () => {
    const decision = buildAnalyzerV2ClaimUnderstandingCacheDecision(
      {
        ...completeBaseInput,
        claimUnderstandingInputSource: "acs_prepared_snapshot",
        acsSnapshotHash: "acs-hash",
        inputGroundingSeedHash: "seed-hash",
      },
      {
        executionApproved: true,
        expectedAcsSnapshotHash: "acs-hash",
      },
    );

    expect(decision.canRead).toBe(true);
    expect(decision.canWrite).toBe(true);
    expect(decision.reason).toBe("dimensions_complete_and_execution_approved");
    expect(decision.keyParts).toContainEqual({ dimension: "acsSnapshotHash", value: "acs-hash" });
  });
});
