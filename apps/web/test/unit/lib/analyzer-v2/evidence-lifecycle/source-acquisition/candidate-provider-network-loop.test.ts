import { describe, expect, it } from "vitest";
import type { ClaimContract } from "@/lib/analyzer-v2/claim-understanding/types";
import {
  buildSourceAcquisitionCandidateRuntimeClosedLoopAuthoritySnapshot,
  type SourceAcquisitionCandidateRuntimeClosedLoopDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-runtime-closed-loop";
import {
  SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_MAX_QUERY_ENTRIES,
  SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_TOTAL_TIMEOUT_MS,
  buildSourceAcquisitionCandidateProviderNetworkAllowlistSnapshot,
  buildSourceAcquisitionCandidateProviderNetworkAuthoritySnapshot,
  buildSourceAcquisitionCandidateProviderNetworkBudgetSnapshot,
  buildSourceAcquisitionCandidateProviderNetworkCandidateBudgetSnapshot,
  buildSourceAcquisitionCandidateProviderNetworkEndpointSnapshot,
  runSourceAcquisitionCandidateProviderNetworkLoop,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop";
import {
  EVIDENCE_QUERY_PLANNING_MAX_QUERY_ENTRIES,
} from "@/lib/analyzer-v2/evidence-lifecycle/query-planning/input-envelope";
import type {
  QueryPlanSourceAcquisitionHandoff,
  QueryPlanSourceAcquisitionHandoffDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff";
import type {
  SourceAcquisitionIntakeBoundaryDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/intake-boundary";
import type {
  SourceAcquisitionRequest,
  SourceAcquisitionStartDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/types";
import type {
  SourceAcquisitionNetworkLowLevelRequest,
  SourceAcquisitionNetworkLowLevelTransport,
} from "@/lib/analyzer-v2-runtime/source-acquisition-network-transport";

const POISON_QUERY_TEXT = "https://example.invalid/source?secret=sk_test_query_text";
const POISON_QUERY_ID = "EQ_001";
const POISON_LANGUAGE_RATIONALE = "language policy contains sk_test_language and https://example.invalid/lang";
const POISON_PROVIDER_PAYLOAD = "https://example.invalid/provider?secret=sk_test_provider_payload";

function claimContract(): ClaimContract {
  return {
    schemaVersion: "v2.claim_contract.0",
    input: {
      inputType: "text",
      inputValue: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
      resolvedInputText: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
      detectedLanguage: "de",
      selectedAtomicClaimIds: ["AC_001"],
    },
    inputGroundingSeed: {
      source: "direct_input",
      inputType: "text",
      inputValue: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
      resolvedInputText: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
      detectedLanguage: "de",
      currentDate: "2026-05-17",
      acsSnapshotHash: null,
      inputGroundingSeedHash: "seed-hash",
    },
    atomicClaims: [
      {
        id: "AC_001",
        statement: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz.",
        selected: true,
        source: "v2_claim_understanding",
        gate1Status: {
          status: "passed",
          source: "v2_claim_understanding",
          summary: "One selected assertion.",
          reasons: [],
        },
        integrityEvents: [],
      },
    ],
    integrityEvents: [],
    acsMigration: null,
  };
}

function queryEntry(index: number) {
  return {
    queryId: `EQ_${String(index).padStart(3, "0")}`,
    retrievalPolicyKey: "baseline_research",
    queryText: index === 1 ? POISON_QUERY_TEXT : `structural query ${index}`,
    targetAtomicClaimIds: ["AC_001"],
  };
}

function queryEntries(count: number) {
  return Array.from({ length: count }, (_, index) => queryEntry(index + 1));
}

function handoff(overrides: Partial<QueryPlanSourceAcquisitionHandoff> = {}): QueryPlanSourceAcquisitionHandoff {
  return {
    handoffVersion: "v2.evidence-lifecycle.query-plan-source-acquisition-handoff.0",
    visibility: "internal_only",
    executionScope: "not_executable",
    sourceAcquisitionStatus: "ready_not_executable",
    selectedAtomicClaimIds: ["AC_001"],
    queryPlanResultSchemaVersion: "v2.evidence_query_planning_result.0",
    queryPlanningStatus: "accepted",
    inspection: {
      inspectionVersion: "v2.evidence-query-planning.inspection.0",
      resultStatus: "accepted",
      selectedAtomicClaimIds: ["AC_001"],
      selectedAtomicClaimSnapshotSource: "7l1_input_envelope",
      queryEntryCount: 1,
      sourceLanguagePolicy: {
        primaryLanguage: "de",
        supplementaryLanguageDecision: "needed",
        rationale: POISON_LANGUAGE_RATIONALE,
      },
      structuralCoverage: {
        selectedAtomicClaimCount: 1,
        queryCoveredClaimCount: 1,
        uncoveredSelectedAtomicClaimIds: [],
        partialCoverage: false,
        coverageJudgment: "structural_only_not_quality_assessment",
      },
      promptProvenance: {
        promptContentHash: "p".repeat(64),
        renderedPromptHash: "r".repeat(64),
        configSnapshotHash: "c".repeat(64),
        cacheDecisionReason: "no_store_runtime_dispatch_safety",
      },
      modelPolicyId: "v2.model.evidence_query_planning.0",
      cacheDecision: {
        namespace: "analyzer-v2:query",
        canRead: false,
        canWrite: false,
        reason: "no_store_runtime_dispatch_safety",
      },
    },
    promptProvenance: {
      promptContentHash: "p".repeat(64),
      renderedPromptHash: "r".repeat(64),
      configSnapshotHash: "c".repeat(64),
      cacheDecisionReason: "no_store_runtime_dispatch_safety",
    },
    modelPolicyId: "v2.model.evidence_query_planning.0",
    cacheProvenance: {
      namespace: "analyzer-v2:query",
      reason: "no_store_runtime_dispatch_safety",
      canRead: false,
      canWrite: false,
    },
    sourceLanguagePolicy: {
      primaryLanguage: "de",
      supplementaryLanguageDecision: "needed",
      rationale: POISON_LANGUAGE_RATIONALE,
    },
    structuralCoverage: {
      selectedAtomicClaimCount: 1,
      queryCoveredClaimCount: 1,
      uncoveredSelectedAtomicClaimIds: [],
      partialCoverage: false,
      coverageJudgment: "structural_only_not_quality_assessment",
    },
    queryEntries: [queryEntry(1)],
    ...overrides,
  };
}

function readyHandoffDecision(
  value: QueryPlanSourceAcquisitionHandoff = handoff(),
): QueryPlanSourceAcquisitionHandoffDecision {
  return {
    decisionVersion: "v2.evidence-lifecycle.query-plan-source-acquisition-handoff.0",
    visibility: "internal_only",
    status: "ready_not_executable",
    handoff: value,
    blockedReason: null,
  };
}

function sourceRequest(overrides: Partial<SourceAcquisitionRequest> = {}): SourceAcquisitionRequest {
  return {
    requestVersion: "v2.evidence-lifecycle.source-acquisition-request.0",
    visibility: "internal_only",
    executionScope: "contract_only_no_provider_execution",
    sourceAcquisitionStatus: "ready_not_executable",
    intake: {
      intakeVersion: "v2.evidence-lifecycle.intake.0",
      selectedAtomicClaimIds: ["AC_001"],
      runId: "job-v2-x7w2-provider-network",
      currentDate: "2026-05-17",
      detectedLanguage: "de",
    },
    policySnapshot: {
      snapshotVersion: "v2.evidence-lifecycle.task-policy.0",
      source: "static_contract_only",
      policyStatus: "query_planning_hidden_internal_executable",
      plannedTasks: [],
      retrievalPolicyCatalog: [],
      cachePolicy: "no_store_no_read",
      providerExecution: "not_wired",
      promptModelExecution: "query_planning_approved_only",
      publicExposure: "forbidden",
      sourceReliabilityIntegration: "thin_port_pending",
      sourceLanguagePolicy: "source_language_first_query_planning_approved",
    },
    retrievalPolicyCatalog: [
      { policyKey: "baseline_research", status: "planned_not_executable", source: "static_contract_only" },
    ],
    claimContract: claimContract(),
    ...overrides,
  };
}

function readyStartDecision(request = sourceRequest()): SourceAcquisitionStartDecision {
  return {
    decisionVersion: "v2.evidence-lifecycle.source-acquisition-request.0",
    visibility: "internal_only",
    status: "source_acquisition_ready_not_executable",
    request,
    blockedReason: null,
    sourceEvidenceLifecycleStatus: "intake_ready",
  };
}

function intakeDecision(
  overrides: Partial<SourceAcquisitionIntakeBoundaryDecision> = {},
): SourceAcquisitionIntakeBoundaryDecision {
  return {
    boundaryVersion: "v2.evidence-lifecycle.source-acquisition-intake-boundary.x7v",
    visibility: "internal_only",
    status: "intake_ready_not_executable",
    blockedReason: null,
    handoffStatus: "ready_not_executable",
    requestStatus: "source_acquisition_ready_not_executable",
    executionScope: "not_executable",
    selectedAtomicClaimCount: 1,
    queryEntryCount: 1,
    retrievalPolicyCount: 1,
    sourceLanguageSignal: "present",
    executionPosture: {
      sourceExecutionAuthority: "blocked_precutover",
      providerNetworkAuthority: "not_authorized",
      parserAuthority: "not_authorized",
      publicExposure: "forbidden",
    },
    execution: {
      sourceAcquisitionExecuted: false,
      providerNetworkExecuted: false,
      searchFetchCalled: false,
      contentDereferenceCalled: false,
      parserExecuted: false,
      cacheRead: false,
      cacheWrite: false,
      sourceReliabilityCalled: false,
      sourceMaterialCreated: false,
      evidenceCorpusCreated: false,
      reportGenerated: false,
      verdictGenerated: false,
    },
    ...overrides,
  };
}

function closedLoopDecision(
  overrides: Partial<SourceAcquisitionCandidateRuntimeClosedLoopDecision> = {},
): SourceAcquisitionCandidateRuntimeClosedLoopDecision {
  return {
    closedLoopVersion: "v2.evidence-lifecycle.source-acquisition-candidate-runtime-closed-loop.x7w1b",
    visibility: "internal_only",
    status: "closed_loop_completed_no_source_candidates",
    blockedReason: null,
    damagedReason: null,
    admissionStatus: "admission_ready_no_runtime_execution",
    handoffStatus: "ready_not_executable",
    requestStatus: "source_acquisition_ready_not_executable",
    intakeStatus: "intake_ready_not_executable",
    selectedAtomicClaimCount: 1,
    queryEntryCount: 1,
    retrievalPolicyCount: 1,
    sourceLanguageSignal: "present",
    productClosedLoopAuthorityHash: buildSourceAcquisitionCandidateRuntimeClosedLoopAuthoritySnapshot()
      .authoritySnapshotHash,
    runtimeContractAuthorityHash: "r".repeat(64),
    providerAllowlistSnapshotHash: "p".repeat(64),
    candidateBudgetSnapshotHash: "b".repeat(64),
    runtimeStatus: "completed_structural",
    queryOutcomeSummaries: [
      {
        ordinal: 1,
        closedLoopQueryRef: "CLQ_001",
        status: "failed",
        structuralReason: "provider_failure",
        providerAttemptObserved: true,
        candidateCount: 0,
      },
    ],
    telemetry: {
      candidateRuntimeExercised: true,
      closedProviderBoundaryInvoked: true,
      providerAttemptCount: 1,
      candidateCount: 0,
      totalCandidateCount: 0,
      bytesRead: 0,
      providerNetworkExecuted: false,
      searchFetchCalled: false,
      contentDereferenceCalled: false,
      parserExecuted: false,
      cacheRead: false,
      cacheWrite: false,
      storageWrite: false,
      sourceReliabilityCalled: false,
      sourceMaterialCreated: false,
      evidenceCorpusCreated: false,
      evidenceItemGenerated: false,
      warningGenerated: false,
      reportGenerated: false,
      verdictGenerated: false,
      publicSurfaceWritten: false,
    },
    publicCutoverStatus: "blocked_precutover",
    ...overrides,
  };
}

function fakeTransport(calls: SourceAcquisitionNetworkLowLevelRequest[]): SourceAcquisitionNetworkLowLevelTransport {
  return {
    resolve: async () => [{ address: "93.184.216.34", family: 4 }],
    request: async (request) => {
      calls.push(request);
      const parsed = new URL(`https://api.wikimedia.org${request.pathWithQuery}`);
      const requestedLimit = Number(parsed.searchParams.get("limit") ?? "5");
      const pageCount = Number.isInteger(requestedLimit) && requestedLimit >= 0
        ? Math.min(requestedLimit, 5)
        : 0;
      return {
        statusCode: 200,
        headers: { "content-type": "application/json" },
        remoteAddress: "93.184.216.34",
        body: Buffer.from(JSON.stringify({
          pages: Array.from({ length: pageCount }, (_, index) => ({
            id: index + 1,
            key: `Raw_Key_${index}_${POISON_PROVIDER_PAYLOAD}`,
            title: `Raw Title ${index} ${POISON_PROVIDER_PAYLOAD}`,
            excerpt: `Raw excerpt ${index} ${POISON_PROVIDER_PAYLOAD}`,
            description: POISON_PROVIDER_PAYLOAD,
            thumbnail: { url: POISON_PROVIDER_PAYLOAD },
          })),
        }), "utf8"),
      };
    },
    now: () => 100,
  };
}

describe("Analyzer V2 Source Acquisition candidate-provider network loop", () => {
  it("runs one hidden Wikimedia candidate-provider network path without leaking query or provider payloads", async () => {
    const calls: SourceAcquisitionNetworkLowLevelRequest[] = [];
    const decision = await runSourceAcquisitionCandidateProviderNetworkLoop({
      handoffDecision: readyHandoffDecision(),
      sourceAcquisitionStartDecision: readyStartDecision(),
      sourceAcquisitionIntakeBoundary: intakeDecision(),
      candidateRuntimeClosedLoop: closedLoopDecision(),
      lowLevelTransport: fakeTransport(calls),
    });
    const serialized = JSON.stringify(decision);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.hostname).toBe("api.wikimedia.org");
    expect(calls[0]?.pathWithQuery).toContain("/core/v1/wikipedia/en/search/page?q=");
    expect(calls[0]?.pathWithQuery).toContain("&limit=3");
    expect(decision).toMatchObject({
      networkLoopVersion: "v2.evidence-lifecycle.source-acquisition-candidate-provider-network-loop.x7w2",
      visibility: "internal_only",
      status: "candidate_provider_network_completed",
      blockedReason: null,
      damagedReason: null,
      closedLoopStatus: "closed_loop_completed_no_source_candidates",
      handoffStatus: "ready_not_executable",
      requestStatus: "source_acquisition_ready_not_executable",
      intakeStatus: "intake_ready_not_executable",
      queryEntryCount: 1,
      queryOutcomeSummaries: [
        {
          ordinal: 1,
          candidateProviderNetworkQueryRef: "W2Q_001",
          status: "attempted",
          structuralReason: "not_stopped",
          providerAttemptObserved: true,
          candidateCount: 3,
        },
      ],
      telemetry: expect.objectContaining({
        candidateRuntimeExercised: true,
        candidateProviderBoundaryInvoked: true,
        providerNetworkBoundaryInvoked: true,
        providerAttemptCount: 1,
        networkAttemptCount: 1,
        candidateCount: 3,
        totalCandidateCount: 3,
        structurallyDroppedCandidateCount: 0,
        fixedDollarCost: 0,
        costReason: "no_paid_api_no_credentials",
        providerNetworkExecuted: true,
        searchFetchCalled: true,
        contentDereferenceCalled: false,
        parserExecuted: false,
        cacheRead: false,
        cacheWrite: false,
        sourceReliabilityCalled: false,
        sourceMaterialCreated: false,
        evidenceCorpusCreated: false,
        reportGenerated: false,
        verdictGenerated: false,
        publicSurfaceWritten: false,
      }),
      downstreamGate: "candidate_to_source_material_gate_closed",
      publicCutoverStatus: "blocked_precutover",
    });
    expect(decision.productNetworkAuthorityHash).toMatch(/^[0-9a-f]{64}$/);
    expect(decision.runtimeContractAuthorityHash).toMatch(/^[0-9a-f]{64}$/);
    expect(decision.endpointSnapshotHash).toMatch(/^[0-9a-f]{64}$/);
    expect(decision.networkBudgetSnapshotHash).toMatch(/^[0-9a-f]{64}$/);
    expect(decision.providerAllowlistSnapshotHash).toMatch(/^[0-9a-f]{64}$/);
    expect(decision.candidateBudgetSnapshotHash).toMatch(/^[0-9a-f]{64}$/);
    expect(decision.telemetry.totalCompressedBytes).toBeGreaterThan(0);
    expect(decision.telemetry.totalDecompressedBytes).toBeGreaterThan(0);
    expect(decision.telemetry.networkAttempts).toEqual([
      expect.objectContaining({
        visibility: "internal_only",
        providerId: "wikimedia_core",
        endpointId: "ep_wikimedia_core_page_search",
        structuralStatus: "success",
        stopReason: "not_stopped",
        dnsAddressCount: 1,
        selectedAddressFamily: "ipv4",
        finalAddressValidation: "matched_validated_public_address",
        responseStatusCodeCategory: "success_2xx",
        contentTypeState: "accepted_json",
        transportFailureClass: "not_applicable",
        transportFailurePhase: "not_applicable",
        transportErrorShape: "not_applicable",
        nodeErrorCodeCategory: "none",
        byteCountState: "observed",
        rawPayloadIncluded: false,
        secretIncluded: false,
        publicPayloadIncluded: false,
        errorTraceIncluded: false,
      }),
    ]);
    for (const forbidden of [
      POISON_QUERY_TEXT,
      POISON_QUERY_ID,
      POISON_LANGUAGE_RATIONALE,
      POISON_PROVIDER_PAYLOAD,
      "Raw Title",
      "Raw excerpt",
      "Raw_Key",
      "queryText",
      "queryId",
      "sourceLanguagePolicy",
      "providerAttemptId",
      "SourceAcquisitionCandidateProviderAttemptRequest",
      "sk_test",
      "https://example.invalid",
      "EvidenceItem",
      "EvidenceCorpus",
      "reportMarkdown",
      "truthPercentage",
      "confidence",
      "cacheKey",
      "sourceReliabilityScore",
      "parsedContent",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("projects bounded W3-A preview records through the provider-owned search response without changing W2 output", async () => {
    const calls: SourceAcquisitionNetworkLowLevelRequest[] = [];
    const previews: unknown[] = [];
    const locators: unknown[] = [];
    const decision = await runSourceAcquisitionCandidateProviderNetworkLoop({
      handoffDecision: readyHandoffDecision(),
      sourceAcquisitionStartDecision: readyStartDecision(),
      sourceAcquisitionIntakeBoundary: intakeDecision(),
      candidateRuntimeClosedLoop: closedLoopDecision(),
      lowLevelTransport: {
        resolve: async () => [{ address: "93.184.216.34", family: 4 }],
        request: async (request) => {
          calls.push(request);
          return {
            statusCode: 200,
            headers: { "content-type": "application/json" },
            remoteAddress: "93.184.216.34",
            body: Buffer.from(JSON.stringify({
              pages: [
                {
                  id: 235000,
                  key: "Switzerland_asylum_statistics",
                  title: "Asylum statistics in Switzerland",
                  excerpt: "Mehr als <span class=\"searchmatch\">235 000</span> Personen",
                  description: "Public encyclopedia page",
                  url: "https://example.invalid/source?secret=sk_test",
                },
              ],
            }), "utf8"),
          };
        },
      },
      candidatePreviewProjectionSink: (projection) => previews.push(projection),
      sourceMaterialPageSummaryFetchLocatorSink: (locator) => locators.push(locator),
    });
    const serializedDecision = JSON.stringify(decision);
    const serializedPreviews = JSON.stringify(previews);
    const serializedLocators = JSON.stringify(locators);

    expect(calls).toHaveLength(1);
    expect(decision.status).toBe("candidate_provider_network_completed");
    expect(serializedDecision).not.toContain("Switzerland_asylum_statistics");
    expect(serializedDecision).not.toContain("Asylum statistics in Switzerland");
    expect(serializedDecision).not.toContain("https://example.invalid");
    expect(previews).toEqual([
      expect.objectContaining({
        sourceCandidateRef: "OPAQUE_SOURCE_CANDIDATE_ATT_1_1",
        locatorRef: expect.stringMatching(/^OPAQUE_SOURCE_LOCATOR_1_1_[A-F0-9]{12}$/),
        pageKeyHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        pageIdHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        titlePreviewText: "Asylum statistics in Switzerland",
        excerptPreviewText: "Mehr als 235 000 Personen",
        descriptionPreviewText: "Public encyclopedia page",
        materializationStatus: "source_candidate_preview_materialized",
      }),
    ]);
    expect(locators).toEqual([
      expect.objectContaining({
        providerId: "wikimedia_core",
        searchEndpointId: "ep_wikimedia_core_page_search",
        sourceMaterialEndpointId: "ep_wikimedia_project_page_summary",
        candidatePreviewId: "SOURCE_CANDIDATE_PREVIEW_1_1",
        languageCode: "en",
        encodedTitlePathSegment: "Switzerland_asylum_statistics",
        eligibility: "eligible_for_w3b_fetch",
      }),
    ]);
    expect(serializedPreviews).not.toContain("Switzerland_asylum_statistics");
    expect(serializedPreviews).not.toContain("https://example.invalid");
    expect(serializedPreviews).not.toContain("sk_test");
    expect(serializedPreviews).not.toContain("url");
    expect(serializedLocators).not.toContain("Asylum statistics in Switzerland");
    expect(serializedLocators).not.toContain("https://example.invalid");
    expect(serializedLocators).not.toContain("sk_test");
  });

  it("collects one hidden OpenAlex abstract source-material record when the W6-F1 sink is provided", async () => {
    const calls: SourceAcquisitionNetworkLowLevelRequest[] = [];
    const records: unknown[] = [];
    const previews: unknown[] = [];
    const wikimediaTransport = fakeTransport(calls);
    const transport: SourceAcquisitionNetworkLowLevelTransport = {
      resolve: async () => [{ address: "93.184.216.34", family: 4 }],
      request: async (request) => {
        if (request.hostname === "api.openalex.org") {
          calls.push(request);
          return {
            statusCode: 200,
            headers: { "content-type": "application/json" },
            remoteAddress: "93.184.216.34",
            body: Buffer.from(JSON.stringify({
              results: [
                {
                  id: "https://openalex.org/W123",
                  display_name: "Hydrogen vehicle efficiency",
                  language: "en",
                  abstract_inverted_index: {
                    Hydrogen: [0],
                    vehicles: [1],
                    use: [2],
                    electricity: [3],
                  },
                },
              ],
            }), "utf8"),
          };
        }
        return wikimediaTransport.request(request);
      },
      now: () => 100,
    };

    const decision = await runSourceAcquisitionCandidateProviderNetworkLoop({
      handoffDecision: readyHandoffDecision(),
      sourceAcquisitionStartDecision: readyStartDecision(),
      sourceAcquisitionIntakeBoundary: intakeDecision(),
      candidateRuntimeClosedLoop: closedLoopDecision(),
      lowLevelTransport: transport,
      candidatePreviewProjectionSink: (projection) => previews.push(projection),
      openAlexSourceMaterialRecordSink: (record) => records.push(record),
    });
    const serializedRecords = JSON.stringify(records);
    const openAlexCall = calls.find((call) => call.hostname === "api.openalex.org");

    expect(decision.status).toBe("candidate_provider_network_completed");
    expect(calls.some((call) => call.hostname === "api.wikimedia.org")).toBe(true);
    expect(openAlexCall?.pathWithQuery).toContain("/works?search=");
    expect(openAlexCall?.pathWithQuery).toContain("&per_page=3");
    expect(openAlexCall?.pathWithQuery)
      .toContain("select=id%2Cdisplay_name%2Cabstract_inverted_index%2Clanguage%2Cpublication_year");
    expect(decision.telemetry.networkAttempts).toEqual(expect.arrayContaining([
      expect.objectContaining({
        providerId: "openalex",
        endpointId: "ep_openalex_works_search",
        structuralStatus: "success",
        candidateCount: 1,
        rawPayloadIncluded: false,
        publicPayloadIncluded: false,
      }),
    ]));
    expect(records).toEqual([
      expect.objectContaining({
        providerId: "openalex",
        sourceMaterialEndpointId: "ep_openalex_works_search",
        sourceMaterialKind: "openalex_work_abstract_text",
        sourceMaterialText: "Hydrogen vehicles use electricity",
        publicPointerExposure: "forbidden",
        parserExecuted: false,
        cacheRead: false,
        cacheWrite: false,
        storageWrite: false,
        sourceReliabilityCalled: false,
        evidenceCorpusCreated: false,
        evidenceItemGenerated: false,
        publicSurfaceWritten: false,
      }),
    ]);
    expect(previews.some((preview) =>
      typeof preview === "object"
      && preview !== null
      && "providerId" in preview
      && preview.providerId === "openalex"
    )).toBe(true);
    expect(serializedRecords).not.toContain("https://openalex.org/W123");
    expect(serializedRecords).not.toContain("abstract_inverted_index");
  });

  it("admits the reviewed six-query cap and keeps multi-query artifacts sanitized", async () => {
    expect(SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_MAX_QUERY_ENTRIES).toBe(6);
    expect(SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_MAX_QUERY_ENTRIES).toBe(
      EVIDENCE_QUERY_PLANNING_MAX_QUERY_ENTRIES,
    );
    expect(SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_TOTAL_TIMEOUT_MS).toBe(18000);

    const calls: SourceAcquisitionNetworkLowLevelRequest[] = [];
    const maxQueryHandoff = handoff({
      queryEntries: queryEntries(SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_MAX_QUERY_ENTRIES),
    });
    const decision = await runSourceAcquisitionCandidateProviderNetworkLoop({
      handoffDecision: readyHandoffDecision(maxQueryHandoff),
      sourceAcquisitionStartDecision: readyStartDecision(sourceRequest()),
      sourceAcquisitionIntakeBoundary: intakeDecision({
        queryEntryCount: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_MAX_QUERY_ENTRIES,
      }),
      candidateRuntimeClosedLoop: closedLoopDecision({
        queryEntryCount: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_MAX_QUERY_ENTRIES,
      }),
      lowLevelTransport: fakeTransport(calls),
    });
    const serialized = JSON.stringify(decision);

    expect(calls).toHaveLength(SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_MAX_QUERY_ENTRIES);
    expect(decision).toMatchObject({
      status: "candidate_provider_network_completed",
      blockedReason: null,
      damagedReason: null,
      queryEntryCount: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_MAX_QUERY_ENTRIES,
      telemetry: expect.objectContaining({
        providerAttemptCount: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_MAX_QUERY_ENTRIES,
        networkAttemptCount: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_MAX_QUERY_ENTRIES,
        candidateCount: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_MAX_QUERY_ENTRIES * 3,
        totalCandidateCount: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_MAX_QUERY_ENTRIES * 3,
        structurallyDroppedCandidateCount: 0,
        fixedDollarCost: 0,
        providerNetworkExecuted: true,
        searchFetchCalled: true,
        contentDereferenceCalled: false,
        parserExecuted: false,
        cacheRead: false,
        cacheWrite: false,
        sourceReliabilityCalled: false,
        sourceMaterialCreated: false,
        evidenceCorpusCreated: false,
        reportGenerated: false,
        verdictGenerated: false,
        publicSurfaceWritten: false,
      }),
    });
    expect(decision.queryOutcomeSummaries).toHaveLength(
      SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_MAX_QUERY_ENTRIES,
    );
    expect(decision.queryOutcomeSummaries.map((summary) => summary.candidateProviderNetworkQueryRef)).toEqual([
      "W2Q_001",
      "W2Q_002",
      "W2Q_003",
      "W2Q_004",
      "W2Q_005",
      "W2Q_006",
    ]);
    expect(decision.telemetry.networkAttempts).toHaveLength(
      SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_MAX_QUERY_ENTRIES,
    );

    for (const forbidden of [
      POISON_QUERY_TEXT,
      POISON_QUERY_ID,
      POISON_LANGUAGE_RATIONALE,
      POISON_PROVIDER_PAYLOAD,
      "structural query",
      "EQ_002",
      "EQ_006",
      "Raw Title",
      "Raw excerpt",
      "Raw_Key",
      "queryText",
      "queryId",
      "sourceLanguagePolicy",
      "providerAttemptId",
      "sk_test",
      "https://example.invalid",
      "EvidenceItem",
      "EvidenceCorpus",
      "reportMarkdown",
      "truthPercentage",
      "confidence",
      "cacheKey",
      "sourceReliabilityScore",
      "parsedContent",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("fails closed on bounded Wikimedia response byte-cap overrun without leaking raw payloads", async () => {
    const calls: SourceAcquisitionNetworkLowLevelRequest[] = [];
    const poison = `${POISON_PROVIDER_PAYLOAD} Raw Title RAW_SOURCE_MATERIAL_PAYLOAD EvidenceCorpus`;
    const largeBody = Buffer.from(JSON.stringify({
      pages: [{
        id: 1,
        title: `Raw Title ${poison}`,
        excerpt: poison.repeat(1400),
        url: `${POISON_PROVIDER_PAYLOAD}/raw`,
      }],
    }), "utf8");
    const decision = await runSourceAcquisitionCandidateProviderNetworkLoop({
      handoffDecision: readyHandoffDecision(),
      sourceAcquisitionStartDecision: readyStartDecision(),
      sourceAcquisitionIntakeBoundary: intakeDecision(),
      candidateRuntimeClosedLoop: closedLoopDecision(),
      lowLevelTransport: {
        resolve: async () => [{ address: "93.184.216.34", family: 4 }],
        request: async (request) => {
          calls.push(request);
          return {
            statusCode: 200,
            headers: { "content-type": "application/json" },
            remoteAddress: "93.184.216.34",
            body: largeBody,
          };
        },
      },
    });
    const serialized = JSON.stringify(decision);

    expect(calls).toHaveLength(1);
    expect(calls[0]?.pathWithQuery).toContain("/core/v1/wikipedia/en/search/page?q=");
    expect(calls[0]?.pathWithQuery).toContain("&limit=3");
    expect(decision).toMatchObject({
      status: "candidate_provider_network_damaged_structural",
      damagedReason: "candidate_runtime_query_coverage_invalid",
      telemetry: expect.objectContaining({
        providerAttemptCount: 1,
        networkAttemptCount: 1,
        candidateCount: 0,
        totalCandidateCount: 0,
        structurallyDroppedCandidateCount: 0,
        providerNetworkExecuted: true,
        searchFetchCalled: true,
        sourceMaterialCreated: false,
        evidenceCorpusCreated: false,
        reportGenerated: false,
        verdictGenerated: false,
        publicSurfaceWritten: false,
      }),
    });
    expect(decision.telemetry.networkAttempts).toEqual([
      expect.objectContaining({
        structuralStatus: "search_failure",
        stopReason: "compressed_byte_cap_exceeded",
        responseStatusCodeCategory: "success_2xx",
        contentTypeState: "accepted_json",
        byteCountState: "observed",
        rawPayloadIncluded: false,
        secretIncluded: false,
        publicPayloadIncluded: false,
        errorTraceIncluded: false,
      }),
    ]);
    expect(decision.telemetry.networkAttempts[0]?.compressedBytes).toBeGreaterThan(0);
    for (const forbidden of [
      POISON_PROVIDER_PAYLOAD,
      "Raw Title",
      "provider?secret",
      "RAW_SOURCE_MATERIAL_PAYLOAD",
      "EvidenceCorpus",
      "EvidenceItem",
      "reportMarkdown",
      "truthPercentage",
      "confidence",
      "parsedContent",
    ]) {
      expect(serialized).not.toContain(forbidden);
    }
  });

  it("blocks before network execution when prerequisites or exact W2 snapshots are invalid", async () => {
    const calls: SourceAcquisitionNetworkLowLevelRequest[] = [];
    const tooManyQueries = handoff({
      queryEntries: queryEntries(SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_MAX_QUERY_ENTRIES + 1),
    });

    await expect(runSourceAcquisitionCandidateProviderNetworkLoop({
      handoffDecision: readyHandoffDecision(tooManyQueries),
      sourceAcquisitionStartDecision: readyStartDecision(sourceRequest()),
      sourceAcquisitionIntakeBoundary: intakeDecision({
        queryEntryCount: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_MAX_QUERY_ENTRIES + 1,
      }),
      candidateRuntimeClosedLoop: closedLoopDecision({
        queryEntryCount: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_MAX_QUERY_ENTRIES + 1,
      }),
      lowLevelTransport: fakeTransport(calls),
    })).resolves.toMatchObject({
      status: "blocked_pre_candidate_provider_network",
      blockedReason: "query_count_exceeds_w2_cap",
      telemetry: {
        providerNetworkExecuted: false,
        searchFetchCalled: false,
      },
    });
    expect(calls).toEqual([]);

    await expect(runSourceAcquisitionCandidateProviderNetworkLoop({
      handoffDecision: readyHandoffDecision(),
      sourceAcquisitionStartDecision: readyStartDecision(),
      sourceAcquisitionIntakeBoundary: intakeDecision(),
      candidateRuntimeClosedLoop: closedLoopDecision({ status: "blocked_pre_closed_candidate_runtime_loop" }),
      lowLevelTransport: fakeTransport(calls),
    })).resolves.toMatchObject({
      status: "blocked_pre_candidate_provider_network",
      blockedReason: "candidate_runtime_closed_loop_not_completed",
    });

    const endpoint = {
      ...buildSourceAcquisitionCandidateProviderNetworkEndpointSnapshot(),
      canonicalAsciiHostname: "en.wikipedia.org",
    };
    await expect(runSourceAcquisitionCandidateProviderNetworkLoop({
      handoffDecision: readyHandoffDecision(),
      sourceAcquisitionStartDecision: readyStartDecision(),
      sourceAcquisitionIntakeBoundary: intakeDecision(),
      candidateRuntimeClosedLoop: closedLoopDecision(),
      endpointSnapshot: endpoint,
      lowLevelTransport: fakeTransport(calls),
    })).resolves.toMatchObject({
      status: "blocked_pre_candidate_provider_network",
      blockedReason: "network_endpoint_invalid",
    });

    const endpointWithLiteralLimit = {
      ...buildSourceAcquisitionCandidateProviderNetworkEndpointSnapshot(),
      allowedRequestParameters: [
        { key: "q", valueSource: "query_text" },
        { key: "limit", valueSource: "retrieval_policy_key" },
      ],
    };
    await expect(runSourceAcquisitionCandidateProviderNetworkLoop({
      handoffDecision: readyHandoffDecision(),
      sourceAcquisitionStartDecision: readyStartDecision(),
      sourceAcquisitionIntakeBoundary: intakeDecision(),
      candidateRuntimeClosedLoop: closedLoopDecision(),
      endpointSnapshot: endpointWithLiteralLimit,
      lowLevelTransport: fakeTransport(calls),
    })).resolves.toMatchObject({
      status: "blocked_pre_candidate_provider_network",
      blockedReason: "network_endpoint_invalid",
    });
  });

  it("requires exact no-credential provider posture and maps network failures structurally", async () => {
    const endpoint = buildSourceAcquisitionCandidateProviderNetworkEndpointSnapshot();
    const providerAllowlist = buildSourceAcquisitionCandidateProviderNetworkAllowlistSnapshot({
      endpointSnapshotHash: endpoint.endpointSnapshotHash,
    });
    await expect(runSourceAcquisitionCandidateProviderNetworkLoop({
      handoffDecision: readyHandoffDecision(),
      sourceAcquisitionStartDecision: readyStartDecision(),
      sourceAcquisitionIntakeBoundary: intakeDecision(),
      candidateRuntimeClosedLoop: closedLoopDecision(),
      providerAllowlistSnapshot: {
        ...providerAllowlist,
        allowedProviders: [
          {
            ...providerAllowlist.allowedProviders[0],
            credentialsState: "present_without_secret",
          },
        ],
      },
    })).resolves.toMatchObject({
      status: "blocked_pre_candidate_provider_network",
      blockedReason: "provider_allowlist_invalid",
    });

    const dnsPoison = "dns failure https://example.invalid/sk_test_dns";
    const failure = await runSourceAcquisitionCandidateProviderNetworkLoop({
      handoffDecision: readyHandoffDecision(),
      sourceAcquisitionStartDecision: readyStartDecision(),
      sourceAcquisitionIntakeBoundary: intakeDecision(),
      candidateRuntimeClosedLoop: closedLoopDecision(),
      lowLevelTransport: {
        resolve: async () => {
          throw new Error(dnsPoison);
        },
        request: async () => {
          throw new Error("request must not run after DNS failure");
        },
      },
    });

    expect(failure).toMatchObject({
      status: "candidate_provider_network_damaged_structural",
      damagedReason: "candidate_runtime_query_coverage_invalid",
      telemetry: {
        providerAttemptCount: 1,
        networkAttemptCount: 1,
        providerNetworkExecuted: true,
        searchFetchCalled: true,
        candidateCount: 0,
        totalCandidateCount: 0,
      },
    });
    expect(failure.telemetry.networkAttempts).toEqual([
      expect.objectContaining({
        providerId: "wikimedia_core",
        stopReason: "dns_resolution_failed",
        dnsAddressCount: 0,
        selectedAddressFamily: "not_reached",
        finalAddressValidation: "not_reached",
        responseStatusCodeCategory: "not_reached",
        contentTypeState: "not_reached",
        transportFailureClass: "dns_resolution_failure",
        transportFailurePhase: "dns_resolution",
        transportErrorShape: "node_error_code_absent",
        nodeErrorCodeCategory: "unknown_absent",
        byteCountState: "not_reached",
        compressedBytes: 0,
        decompressedBytes: 0,
      }),
    ]);
    expect(JSON.stringify(failure)).not.toContain(dnsPoison);
    expect(JSON.stringify(failure)).not.toContain("example.invalid");
    expect(JSON.stringify(failure)).not.toContain("sk_test_dns");
  });

  it("builds exact W2 endpoint, provider, budget, and authority snapshots", async () => {
    const currentHandoff = handoff();
    const request = sourceRequest();
    const endpoint = buildSourceAcquisitionCandidateProviderNetworkEndpointSnapshot();
    const providerAllowlist = buildSourceAcquisitionCandidateProviderNetworkAllowlistSnapshot({
      endpointSnapshotHash: endpoint.endpointSnapshotHash,
    });
    const candidateBudget = buildSourceAcquisitionCandidateProviderNetworkCandidateBudgetSnapshot({
      handoff: currentHandoff,
      request,
    });
    const networkBudget = buildSourceAcquisitionCandidateProviderNetworkBudgetSnapshot({
      endpointSnapshot: endpoint,
      providerAllowlist,
      candidateBudget,
    });
    const authority = buildSourceAcquisitionCandidateProviderNetworkAuthoritySnapshot({
      endpointSnapshotHash: endpoint.endpointSnapshotHash,
      networkBudgetSnapshotHash: networkBudget.networkBudgetSnapshotHash,
      providerAllowlistSnapshotHash: providerAllowlist.providerAllowlistSnapshotHash,
      candidateBudgetSnapshotHash: candidateBudget.budgetSnapshotHash,
    });

    expect(endpoint).toMatchObject({
      providerId: "wikimedia_core",
      endpointId: "ep_wikimedia_core_page_search",
      canonicalAsciiHostname: "api.wikimedia.org",
      path: "/core/v1/wikipedia/en/search/page",
      method: "GET",
      allowedRequestParameters: [
        { key: "q", valueSource: "query_text" },
        { key: "limit", valueSource: "max_candidate_records" },
      ],
      credentialsState: "not_required",
      redirectPolicy: "deny",
      proxyPolicy: "none",
      responseCandidatePointer: { kind: "object_array_field", fieldName: "pages" },
      decompressionPolicy: "identity_only",
      noCache: true,
      noStorage: true,
      noSourceReliability: true,
      noProduct: true,
      noPublic: true,
    });
    expect(JSON.stringify(endpoint)).toContain("\"limit\"");
    expect(providerAllowlist).toMatchObject({
      allowedProviders: [
        {
          providerId: "wikimedia_core",
          endpointKind: "candidate_search_api_future",
          maxQueries: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_MAX_QUERY_ENTRIES,
          timeoutMs: 3000,
          credentialsState: "not_required_for_approved_network_provider",
        },
      ],
      disabledProviders: [{ providerId: "openalex", disabledReason: "credentials_missing" }],
      noCache: true,
      noStorage: true,
      noSourceReliability: true,
      noProduct: true,
      noPublic: true,
    });
    expect(candidateBudget).toMatchObject({
      queryEntryCount: 1,
      maxAttemptsPerQuery: 1,
      maxCandidateRecordsPerQuery: 3,
      providerTimeoutMs: 3000,
      totalCandidateAcquisitionTimeoutMs: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_TOTAL_TIMEOUT_MS,
      cancellationState: "not_requested",
      retryPolicy: "none",
    });
    expect(networkBudget).toMatchObject({
      maxProvidersPerRun: 1,
      maxQueriesPerProvider: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_MAX_QUERY_ENTRIES,
      maxAttemptsPerQuery: 1,
      maxCandidatesPerQuery: 3,
      perQueryTimeoutMs: 3000,
      totalNetworkTimeoutMs: SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_TOTAL_TIMEOUT_MS,
      retryPolicy: "none",
      noCache: true,
      noStorage: true,
      noSourceReliability: true,
      noProduct: true,
      noPublic: true,
    });
    expect(authority).toMatchObject({
      status: "approved_x7w2_product_candidate_provider_network",
      approvedBy: "captain_deputy_review_team",
      visibility: "internal_only",
      providerId: "wikimedia_core",
      endpointId: "ep_wikimedia_core_page_search",
      providerNetworkImplementationCommit: "54b8af1a",
      capabilityScope: {
        candidateProviderNetwork: "approved_wikimedia_core_search_only",
        providerSdk: false,
        arbitraryUrlDereference: false,
        contentDereference: false,
        parser: false,
        cacheRead: false,
        cacheWrite: false,
        durableStorage: false,
        sourceReliability: false,
        sourceMaterial: false,
        evidenceCorpus: false,
        evidenceItem: false,
        warning: false,
        report: false,
        verdict: false,
        publicExposure: false,
        liveJobs: false,
        acsPreparedSnapshot: false,
        directUrl: false,
      },
    });

    await expect(runSourceAcquisitionCandidateProviderNetworkLoop({
      handoffDecision: readyHandoffDecision(currentHandoff),
      sourceAcquisitionStartDecision: readyStartDecision(request),
      sourceAcquisitionIntakeBoundary: intakeDecision(),
      candidateRuntimeClosedLoop: closedLoopDecision(),
      w2AuthoritySnapshot: {
        ...authority,
        endpointSnapshotHash: "0".repeat(64),
      },
      lowLevelTransport: fakeTransport([]),
    })).resolves.toMatchObject({
      status: "blocked_pre_candidate_provider_network",
      blockedReason: "w2_authority_invalid",
      telemetry: {
        providerNetworkExecuted: false,
        searchFetchCalled: false,
      },
    });
  });
});
