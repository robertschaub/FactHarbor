import { afterEach, describe, expect, it } from "vitest";
import type {
  SourceAcquisitionCandidateProviderNetworkLoopDecision,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";
import {
  EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_ARTIFACT_VERSION,
  clearEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifacts,
  recordEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-provider-network-artifact-sink";

const originalEnv = { ...process.env };

function networkDecision(): SourceAcquisitionCandidateProviderNetworkLoopDecision {
  return {
    networkLoopVersion: "v2.evidence-lifecycle.source-acquisition-candidate-provider-network-loop.x7w2",
    visibility: "internal_only",
    status: "candidate_provider_network_completed",
    blockedReason: null,
    damagedReason: null,
    closedLoopStatus: "closed_loop_completed_no_source_candidates",
    handoffStatus: "ready_not_executable",
    requestStatus: "source_acquisition_ready_not_executable",
    intakeStatus: "intake_ready_not_executable",
    selectedAtomicClaimCount: 1,
    queryEntryCount: 1,
    retrievalPolicyCount: 1,
    sourceLanguageSignal: "present",
    productNetworkAuthorityHash: "a".repeat(64),
    runtimeContractAuthorityHash: "r".repeat(64),
    endpointSnapshotHash: "e".repeat(64),
    networkBudgetSnapshotHash: "n".repeat(64),
    providerAllowlistSnapshotHash: "p".repeat(64),
    candidateBudgetSnapshotHash: "b".repeat(64),
    runtimeStatus: "completed_structural",
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
    telemetry: {
      candidateRuntimeExercised: true,
      candidateProviderBoundaryInvoked: true,
      providerNetworkBoundaryInvoked: true,
      providerAttemptCount: 1,
      networkAttemptCount: 1,
      candidateCount: 3,
      totalCandidateCount: 5,
      structurallyDroppedCandidateCount: 2,
      totalDurationMs: 42,
      totalCompressedBytes: 2048,
      totalDecompressedBytes: 4096,
      totalBytes: 6144,
      fixedDollarCost: 0,
      costReason: "no_paid_api_no_credentials",
      providerNetworkExecuted: true,
      searchFetchCalled: true,
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
      networkAttempts: [
        {
          telemetryVersion: "v2.source-acquisition.provider-network-attempt-telemetry.7n3b2-t1",
          visibility: "internal_only",
          providerId: "wikimedia_core",
          endpointId: "ep_wikimedia_core_page_search",
          attemptOrdinal: 1,
          structuralStatus: "success",
          stopReason: "not_stopped",
          durationMs: 42,
          timeoutMs: 1500,
          candidateCount: 5,
          compressedBytes: 2048,
          decompressedBytes: 4096,
          byteCountState: "observed",
          rawPayloadIncluded: false,
          secretIncluded: false,
          publicPayloadIncluded: false,
          errorTraceIncluded: false,
        },
      ],
    },
    downstreamGate: "candidate_to_source_material_gate_closed",
    publicCutoverStatus: "blocked_precutover",
  };
}

function seedArtifact(runId = "job-v2-x7w2-route") {
  const context = buildClaimBoundaryV2RunContext({
    runIdHint: runId,
    submitted: {
      kind: "text",
      value: "Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz",
    },
    preparedSeed: null,
    selectedAtomicClaimIds: ["AC_001"],
  }, {
    now: () => new Date("2026-05-17T21:20:00.000Z"),
  });
  clearEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifacts(
    context.observabilityLedger.ledgerId,
  );
  recordEvidenceLifecycleSourceAcquisitionCandidateProviderNetworkRuntimeArtifact({
    context,
    networkDecision: networkDecision(),
  });
  return context.observabilityLedger.ledgerId;
}

function artifactUrl(query: string): string {
  return `http://localhost/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts${query}`;
}

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("Analyzer V2 internal Source Acquisition candidate-provider network artifact route", () => {
  it("returns internal-only artifacts for an authenticated ledger read", async () => {
    const ledgerId = seedArtifact();
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts/route"
    );

    const response = await GET(new Request(
      artifactUrl(`?ledgerId=${encodeURIComponent(ledgerId)}`),
      { headers: { "x-admin-key": "test-admin-key" } },
    ));
    const body = await response.json();
    const serialized = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      ok: true,
      sinkKind: "v2_evidence_lifecycle_source_acquisition_candidate_provider_network_artifact_ledger",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      ledgerId,
      artifactCount: 1,
    });
    expect(body.artifacts).toEqual([
      expect.objectContaining({
        artifactVersion: EVIDENCE_LIFECYCLE_SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_ARTIFACT_VERSION,
        visibility: "internal_admin_only",
        publicPointerExposure: "forbidden",
        candidateProviderNetwork: expect.objectContaining({
          status: "candidate_provider_network_completed",
          queryEntryCount: 1,
          queryOutcomeSummaries: [
            expect.objectContaining({
              candidateProviderNetworkQueryRef: "W2Q_001",
              candidateCount: 3,
            }),
          ],
        }),
        productExecution: expect.objectContaining({
          candidateProviderNetworkObserved: true,
          providerNetworkExecuted: true,
          searchFetchCalled: true,
          contentDereferenceCalled: false,
          parserExecuted: false,
          reportGenerated: false,
          verdictGenerated: false,
          publicSurfaceWritten: false,
          providerAttemptCount: 1,
          candidateCount: 3,
          fixedDollarCost: 0,
        }),
      }),
    ]);
    expect(serialized).not.toContain("Mehr als 235");
    expect(serialized).not.toContain("Asylbereich Schweiz Statistik");
    expect(serialized).not.toContain("queryText");
    expect(serialized).not.toContain("queryId");
    expect(serialized).not.toContain("providerAttemptId");
    expect(serialized).not.toContain("https://example.invalid");
    expect(serialized).not.toContain("sk_test");
    expect(serialized).not.toContain("confidence");
    expect(serialized).not.toContain("cacheKey");
  });

  it("requires configured admin authentication and rejects incorrect keys", async () => {
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts/route"
    );

    for (const request of [
      new Request(artifactUrl("?ledgerId=ledger")),
      new Request(artifactUrl("?ledgerId=ledger"), { headers: { "x-admin-key": "wrong-key" } }),
    ]) {
      const response = await GET(request);
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(body).toEqual({ ok: false, error: "Unauthorized" });
    }
  });

  it("rejects production requests when FH_ADMIN_KEY is missing", async () => {
    delete process.env.FH_ADMIN_KEY;
    process.env.NODE_ENV = "production";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts/route"
    );

    const response = await GET(new Request(
      artifactUrl("?ledgerId=ledger"),
      { headers: { "x-admin-key": "anything" } },
    ));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toEqual({ ok: false, error: "Unauthorized" });
  });

  it("rejects missing, blank, padded, malformed, overlong, duplicate, and enumerating ledger queries", async () => {
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts/route"
    );
    const headers = { "x-admin-key": "test-admin-key" };
    const urls = [
      artifactUrl(""),
      artifactUrl("?ledgerId=%20"),
      artifactUrl("?ledgerId=%20ledger"),
      artifactUrl("?ledgerId=ledger%20"),
      artifactUrl("?ledgerId=bad/ledger"),
      artifactUrl(`?ledgerId=${"x".repeat(257)}`),
      artifactUrl("?ledgerId=a&ledgerId=b"),
      artifactUrl("?jobId=job-v2-x7w2-route"),
      artifactUrl("?prefix=job"),
    ];

    for (const url of urls) {
      const response = await GET(new Request(url, { headers }));
      expect(response.status).toBe(400);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(await response.json()).toEqual({ ok: false, error: "Missing or invalid ledgerId" });
    }
  });

  it("returns a bounded not-found response without echoing the requested ledger id", async () => {
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts/route"
    );
    const missingLedgerId = "missing-x7w2-ledger";

    const response = await GET(new Request(
      artifactUrl(`?ledgerId=${missingLedgerId}`),
      { headers: { "x-admin-key": "test-admin-key" } },
    ));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(JSON.stringify(body)).not.toContain(missingLedgerId);
    expect(body).toEqual({
      ok: false,
      error: "Not found",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
    });
  });
});
