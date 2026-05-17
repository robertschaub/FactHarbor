import { describe, expect, it } from "vitest";
import {
  SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_COMMIT,
  SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_PATH,
  SOURCE_ACQUISITION_CANDIDATE_RUNTIME_VERSION,
  sourceAcquisitionCandidateRuntimeDecisionHasExactQueryCoverage,
  validateSourceAcquisitionCandidateBudgetSnapshot,
  validateSourceAcquisitionCandidateProviderAllowlistSnapshot,
  validateSourceAcquisitionCandidateProviderAttemptResult,
  type SourceAcquisitionCandidateBudgetSnapshot,
  type SourceAcquisitionCandidateProviderAllowlistSnapshot,
  type SourceAcquisitionCandidateProviderAttemptResult,
  type SourceAcquisitionCandidateRuntimeApproval,
  type SourceAcquisitionCandidateRuntimeDecision,
  type SourceAcquisitionHiddenCandidateRecord,
} from "@/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope";

function approval(): SourceAcquisitionCandidateRuntimeApproval {
  return {
    status: "approved_7n3b1_candidate_runtime",
    approvedBy: "deputy_review_team",
    packagePath: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_PATH,
    packageCommit: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_PACKAGE_COMMIT,
    approvedScope: "hidden_candidate_runtime_shell_only",
  };
}

function allowlist(
  overrides: Partial<SourceAcquisitionCandidateProviderAllowlistSnapshot> = {},
): SourceAcquisitionCandidateProviderAllowlistSnapshot {
  return {
    version: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_VERSION,
    approval: approval(),
    providerAllowlistSnapshotHash: "allowlist-hash-7n3b1",
    configSnapshotHash: "config-hash-7n3b1",
    allowedProviders: [
      {
        providerId: "test_provider",
        endpointKind: "test_injected_candidate_boundary",
        maxQueries: 2,
        timeoutMs: 5000,
        credentialsState: "not_required_for_test_boundary",
      },
    ],
    disabledProviders: [],
    noCache: true,
    noStorage: true,
    noSourceReliability: true,
    noProduct: true,
    noPublic: true,
    ...overrides,
  };
}

function budget(
  overrides: Partial<SourceAcquisitionCandidateBudgetSnapshot> = {},
): SourceAcquisitionCandidateBudgetSnapshot {
  return {
    version: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_VERSION,
    source: "v2_7n3b1_candidate_runtime",
    approval: approval(),
    budgetSnapshotHash: "budget-hash-7n3b1",
    handoffIdentity: {
      handoffVersion: "v2.evidence-lifecycle.query-plan-source-acquisition-handoff.0",
      selectedAtomicClaimIds: ["AC_001"],
      queryIds: ["EQ_001"],
      queryEntryCount: 1,
      promptContentHash: "prompt-hash",
      renderedPromptHash: "rendered-hash",
      modelPolicyId: "v2.model.evidence_query_planning.0",
      cacheNamespace: "analyzer-v2:evidence-query-planning",
      cacheReason: "no_store_runtime_dispatch_safety",
      cacheCanRead: false,
      cacheCanWrite: false,
      sourceLanguagePolicy: {
        primaryLanguage: "de",
        supplementaryLanguageDecision: "not_needed",
        rationale: "Opaque upstream language policy.",
      },
    },
    sourceRequestIdentity: {
      requestVersion: "v2.evidence-lifecycle.source-acquisition-request.0",
      selectedAtomicClaimIds: ["AC_001"],
      runId: "run-7n3b1",
      currentDate: "2026-05-16",
      detectedLanguage: "de",
    },
    queryEntryCount: 1,
    maxAttemptsPerQuery: 1,
    maxCandidateRecordsPerQuery: 2,
    providerTimeoutMs: 5000,
    totalCandidateAcquisitionTimeoutMs: 5000,
    cancellationState: "not_requested",
    retryPolicy: "none",
    partialExecutionSemantics: "structural_query_outcome_per_query",
    ...overrides,
  };
}

function candidate(
  overrides: Partial<SourceAcquisitionHiddenCandidateRecord> = {},
): SourceAcquisitionHiddenCandidateRecord {
  return {
    candidateId: "OPAQUE_SOURCE_CANDIDATE_001",
    queryId: "EQ_001",
    retrievalPolicyKey: "baseline_research",
    providerId: "test_provider",
    providerAttemptId: "ATT_001",
    providerRank: 1,
    hiddenLocatorId: "HIDDEN_SOURCE_LOCATOR_001",
    hiddenMetadata: {
      semanticUse: "not_semantic_evidence",
      titleState: "not_collected",
      snippetState: "not_collected",
      domainState: "not_collected",
      languageState: "not_collected",
    },
    candidateStructuralStatus: "candidate_acquired",
    ...overrides,
  };
}

function providerResult(
  overrides: Partial<SourceAcquisitionCandidateProviderAttemptResult> = {},
): SourceAcquisitionCandidateProviderAttemptResult {
  return {
    queryId: "EQ_001",
    providerId: "test_provider",
    providerAttemptId: "ATT_001",
    structuralStatus: "success",
    durationMs: 25,
    candidates: [candidate()],
    sanitizedProviderTelemetry: {
      rawPayloadIncluded: false,
      secretIncluded: false,
      publicPayloadIncluded: false,
    },
    ...overrides,
  };
}

describe("Analyzer V2 source-acquisition candidate envelope", () => {
  it("accepts hidden candidate runtime allowlist and budget snapshots", () => {
    expect(validateSourceAcquisitionCandidateProviderAllowlistSnapshot(allowlist())).toEqual({
      status: "valid",
      blockedReasons: [],
    });
    expect(validateSourceAcquisitionCandidateProviderAllowlistSnapshot(allowlist({
      allowedProviders: [
        {
          providerId: "wikimedia_core",
          endpointKind: "candidate_search_api_future",
          maxQueries: 2,
          timeoutMs: 1500,
          credentialsState: "not_required_for_approved_network_provider",
        },
      ],
      disabledProviders: [
        {
          providerId: "openalex",
          disabledReason: "credentials_missing",
        },
      ],
    }))).toEqual({
      status: "valid",
      blockedReasons: [],
    });
    expect(validateSourceAcquisitionCandidateBudgetSnapshot(budget())).toEqual({
      status: "valid",
      blockedReasons: [],
    });
  });

  it("rejects empty, duplicate, URL-like, path-like, secret-like, and placeholder provider ids", () => {
    const invalidProviderIds = [
      "",
      "test_provider ",
      "https://example.test",
      "example.test",
      "provider/path",
      "provider?query",
      "provider#fragment",
      "api_key",
      "secret_provider",
      "placeholder",
      "Unknown",
    ];

    for (const providerId of invalidProviderIds) {
      const result = validateSourceAcquisitionCandidateProviderAllowlistSnapshot(allowlist({
        allowedProviders: [
          {
            providerId,
            endpointKind: "test_injected_candidate_boundary",
            maxQueries: 2,
            timeoutMs: 5000,
            credentialsState: "not_required_for_test_boundary",
          },
        ],
      }));

      expect(result.status).toBe("blocked");
    }

    expect(validateSourceAcquisitionCandidateProviderAllowlistSnapshot(allowlist({
      allowedProviders: [],
    })).status).toBe("blocked");
    expect(validateSourceAcquisitionCandidateProviderAllowlistSnapshot(allowlist({
      allowedProviders: [
        {
          providerId: "test_provider",
          endpointKind: "test_injected_candidate_boundary",
          maxQueries: 2,
          timeoutMs: 5000,
          credentialsState: "not_required_for_test_boundary",
        },
      ],
      disabledProviders: [
        {
          providerId: "test_provider",
          disabledReason: "credentials_missing",
        },
      ],
    })).status).toBe("blocked");
  });

  it("rejects budget snapshots that are stale, cancelled, retrying, or cache-capable", () => {
    for (const invalidBudget of [
      budget({ version: "stale" as SourceAcquisitionCandidateBudgetSnapshot["version"] }),
      budget({ source: "legacy" as SourceAcquisitionCandidateBudgetSnapshot["source"] }),
      budget({ cancellationState: "requested" }),
      budget({ retryPolicy: "retry" as SourceAcquisitionCandidateBudgetSnapshot["retryPolicy"] }),
      budget({ maxAttemptsPerQuery: 2 as SourceAcquisitionCandidateBudgetSnapshot["maxAttemptsPerQuery"] }),
      budget({
        handoffIdentity: {
          ...budget().handoffIdentity,
          cacheCanRead: true as false,
        },
      }),
    ]) {
      expect(validateSourceAcquisitionCandidateBudgetSnapshot(invalidBudget).status).toBe("blocked");
    }
  });

  it("validates provider attempt results without raw payload, public fields, cache keys, or semantic leakage", () => {
    expect(validateSourceAcquisitionCandidateProviderAttemptResult(providerResult(), {
      queryId: "EQ_001",
      retrievalPolicyKey: "baseline_research",
      allowedProviderIds: ["test_provider"],
      maxCandidateRecords: 2,
    })).toEqual({
      status: "valid",
      blockedReasons: [],
    });

    for (const invalidResult of [
      providerResult({ providerId: "off_allowlist" }),
      providerResult({ providerId: "https://example.test" }),
      providerResult({ providerAttemptId: "https://example.test/sk_test_secret" }),
      providerResult({ providerAttemptId: "ATT_SECRET" }),
      providerResult({ queryId: "EQ_EXTRA" }),
      providerResult({ structuralStatus: "provider_failure", candidates: [candidate()] }),
      providerResult({
        sanitizedProviderTelemetry: {
          rawPayloadIncluded: true,
          secretIncluded: false,
          publicPayloadIncluded: false,
        } as SourceAcquisitionCandidateProviderAttemptResult["sanitizedProviderTelemetry"],
      }),
      {
        ...providerResult(),
        rawProviderPayload: "not allowed",
      } as SourceAcquisitionCandidateProviderAttemptResult,
      providerResult({
        candidates: [
          {
            ...candidate(),
            url: "https://example.test/source",
          } as SourceAcquisitionHiddenCandidateRecord,
        ],
      }),
      providerResult({
        candidates: [candidate({ hiddenLocatorId: "https://example.test/source" })],
      }),
    ]) {
      expect(validateSourceAcquisitionCandidateProviderAttemptResult(invalidResult, {
        queryId: "EQ_001",
        retrievalPolicyKey: "baseline_research",
        allowedProviderIds: ["test_provider"],
        maxCandidateRecords: 2,
      }).status).toBe("blocked");
    }
  });

  it("detects missing, duplicate, or extra query outcomes", () => {
    const decision: SourceAcquisitionCandidateRuntimeDecision = {
      version: SOURCE_ACQUISITION_CANDIDATE_RUNTIME_VERSION,
      visibility: "internal_only",
      status: "completed_structural",
      stopReason: "not_stopped",
      candidates: [],
      queryOutcomes: [
        {
          queryId: "EQ_001",
          status: "attempted",
          structuralReason: "not_stopped",
          providerAttemptId: "ATT_001",
          candidateCount: 0,
        },
      ],
    };

    expect(sourceAcquisitionCandidateRuntimeDecisionHasExactQueryCoverage(decision, ["EQ_001"])).toBe(true);
    expect(sourceAcquisitionCandidateRuntimeDecisionHasExactQueryCoverage(decision, ["EQ_001", "EQ_002"])).toBe(false);
    expect(sourceAcquisitionCandidateRuntimeDecisionHasExactQueryCoverage({
      ...decision,
      queryOutcomes: [...decision.queryOutcomes, decision.queryOutcomes[0]],
    }, ["EQ_001", "EQ_001"])).toBe(false);
  });
});
