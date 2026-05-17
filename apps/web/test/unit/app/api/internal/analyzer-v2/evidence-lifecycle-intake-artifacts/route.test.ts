import { afterEach, describe, expect, it } from "vitest";
import {
  EVIDENCE_LIFECYCLE_INTAKE_ARTIFACT_VERSION,
  clearEvidenceLifecycleIntakeRuntimeArtifacts,
  recordEvidenceLifecycleIntakeRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-intake-artifact-sink";
import {
  CLAIM_UNDERSTANDING_STAGE_HANDOFF_VERSION,
  type ClaimUnderstandingStageHandoff,
} from "@/lib/analyzer-v2/claim-understanding/stage-handoff";
import { CLAIM_UNDERSTANDING_RUNTIME_STAGE_VERSION } from "@/lib/analyzer-v2/claim-understanding/runtime-stage";
import {
  CLAIM_CONTRACT_V2_SCHEMA_VERSION,
  type ClaimContract,
} from "@/lib/analyzer-v2/claim-understanding/types";
import { buildEvidenceLifecycleIntake } from "@/lib/analyzer-v2/evidence-lifecycle/intake";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";

const originalEnv = { ...process.env };

function claimContract(): ClaimContract {
  return {
    schemaVersion: CLAIM_CONTRACT_V2_SCHEMA_VERSION,
    input: {
      inputType: "text",
      inputValue: "route input",
      resolvedInputText: "route input",
      detectedLanguage: "en",
      selectedAtomicClaimIds: ["AC_ROUTE_01"],
    },
    inputGroundingSeed: {
      source: "direct_input",
      inputType: "text",
      inputValue: "route input",
      resolvedInputText: "route input",
      detectedLanguage: "en",
      currentDate: "2026-05-17",
      acsSnapshotHash: null,
      inputGroundingSeedHash: "route-grounding",
    },
    atomicClaims: [
      {
        id: "AC_ROUTE_01",
        statement: "route claim text",
        selected: true,
        source: "v2_claim_understanding",
        gate1Status: {
          status: "passed",
          source: "v2_claim_understanding",
          summary: "Accepted structurally.",
          reasons: [],
        },
        integrityEvents: [],
      },
    ],
    integrityEvents: [],
    acsMigration: null,
  };
}

function acceptedHandoff(): Extract<ClaimUnderstandingStageHandoff, { status: "accepted" }> {
  const contract = claimContract();
  return {
    handoffVersion: CLAIM_UNDERSTANDING_STAGE_HANDOFF_VERSION,
    visibility: "internal_only",
    runtimeStageVersion: CLAIM_UNDERSTANDING_RUNTIME_STAGE_VERSION,
    runtimeStatus: "runtime_dispatch_completed",
    inputSource: "direct_input",
    selectedAtomicClaimIds: contract.input.selectedAtomicClaimIds,
    gatewayTaskId: "claim_understanding_gate1",
    gatewayTaskStatus: "executable",
    cacheEligibility: "runtime_no_store",
    integrityEventSummaries: [],
    status: "accepted",
    claimContract: contract,
    blockedReason: null,
    damagedReason: null,
    downstreamStart: {
      evidenceLifecycleStatus: "blocked_precutover",
      reason: "public_cutover_not_approved",
    },
  };
}

function seedArtifact(runId?: string) {
  const context = buildClaimBoundaryV2RunContext({
    ...(runId ? { runIdHint: runId } : {}),
    submitted: {
      kind: "text",
      value: "route input",
    },
    preparedSeed: null,
    selectedAtomicClaimIds: [],
  }, {
    now: () => new Date("2026-05-17T01:00:00.000Z"),
  });
  const handoff = acceptedHandoff();
  clearEvidenceLifecycleIntakeRuntimeArtifacts(context.observabilityLedger.ledgerId);
  recordEvidenceLifecycleIntakeRuntimeArtifact({
    context,
    claimUnderstandingHandoff: handoff,
    evidenceLifecycleIntake: buildEvidenceLifecycleIntake(context, handoff),
  });
  return context.observabilityLedger.ledgerId;
}

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("Analyzer V2 internal Evidence Lifecycle intake artifact route", () => {
  it("returns internal-only artifacts for an authenticated ledger read", async () => {
    const ledgerId = seedArtifact("job-v2-x7j-route");
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import("@/app/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts/route");

    const response = await GET(new Request(
      `http://localhost/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts?ledgerId=${encodeURIComponent(ledgerId)}`,
      { headers: { "x-admin-key": "test-admin-key" } },
    ));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      ok: true,
      sinkKind: "v2_evidence_lifecycle_intake_artifact_ledger",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      ledgerId,
      artifactCount: 1,
    });
    expect(body.artifacts).toEqual([
      expect.objectContaining({
        artifactVersion: EVIDENCE_LIFECYCLE_INTAKE_ARTIFACT_VERSION,
        visibility: "internal_admin_only",
        publicPointerExposure: "forbidden",
        evidenceLifecycleIntake: expect.objectContaining({
          observationStatus: "contract_observed_preexecution",
          executionEligibility: "not_executable_precutover",
        }),
      }),
    ]);
    expect(JSON.stringify(body)).not.toContain("route claim text");
  });

  it("accepts the default timestamped V2 ledger id shape", async () => {
    const ledgerId = seedArtifact();
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import("@/app/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts/route");

    const response = await GET(new Request(
      `http://localhost/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts?ledgerId=${encodeURIComponent(ledgerId)}`,
      { headers: { "x-admin-key": "test-admin-key" } },
    ));
    const body = await response.json();

    expect(ledgerId).toContain(".");
    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      ledgerId,
      artifactCount: 1,
    });
  });

  it("requires admin authentication", async () => {
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import("@/app/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts/route");

    const response = await GET(new Request(
      "http://localhost/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts?ledgerId=ledger",
    ));
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ ok: false, error: "Unauthorized" });
  });

  it("rejects missing, blank, malformed, overlong, duplicate, and enumerating ledger queries", async () => {
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import("@/app/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts/route");
    const headers = { "x-admin-key": "test-admin-key" };
    const urls = [
      "http://localhost/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts",
      "http://localhost/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts?ledgerId=%20",
      "http://localhost/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts?ledgerId=bad/ledger",
      `http://localhost/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts?ledgerId=${"x".repeat(257)}`,
      "http://localhost/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts?ledgerId=a&ledgerId=b",
      "http://localhost/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts?jobId=job-v2-x7j-route",
      "http://localhost/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts?prefix=job",
    ];

    for (const url of urls) {
      const response = await GET(new Request(url, { headers }));
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ ok: false, error: "Missing or invalid ledgerId" });
    }
  });

  it("returns a bounded not-found response without enumerating artifacts", async () => {
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import("@/app/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts/route");

    const response = await GET(new Request(
      "http://localhost/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts?ledgerId=missing-ledger",
      { headers: { "x-admin-key": "test-admin-key" } },
    ));
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      ok: false,
      error: "Not found",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
    });
  });
});
