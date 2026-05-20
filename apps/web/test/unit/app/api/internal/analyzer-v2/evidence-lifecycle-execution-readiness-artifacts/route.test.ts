import { afterEach, describe, expect, it } from "vitest";

import { buildEvidenceLifecycleExecutionReadinessDenial } from "@/lib/analyzer-v2/evidence-lifecycle/execution-readiness/execution-readiness-denial";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";
import {
  clearEvidenceLifecycleExecutionReadinessRuntimeArtifacts,
  recordEvidenceLifecycleExecutionReadinessRuntimeArtifact,
} from "@/lib/analyzer-v2-runtime/evidence-lifecycle-execution-readiness-artifact-sink";
import { markEvidenceLifecycleExecutionReadinessRuntimeOwnedDecision } from "@/lib/analyzer-v2-runtime/evidence-lifecycle-execution-readiness-denial-provenance";

const originalEnv = { ...process.env };
const INPUT = "Using hydrogen for cars is more efficient than using electricity";

function context(runId = "job-v2-x7w4i-route") {
  return buildClaimBoundaryV2RunContext({
    runIdHint: runId,
    submitted: {
      kind: "text",
      value: INPUT,
    },
    preparedSeed: null,
    selectedAtomicClaimIds: ["AC_001"],
  }, {
    now: () => new Date("2026-05-19T13:40:00.000Z"),
  });
}

function seedArtifact(runId = "job-v2-x7w4i-route") {
  const runContext = context(runId);
  clearEvidenceLifecycleExecutionReadinessRuntimeArtifacts(runContext.observabilityLedger.ledgerId);
  recordEvidenceLifecycleExecutionReadinessRuntimeArtifact({
    context: runContext,
    executionReadinessDenial: markEvidenceLifecycleExecutionReadinessRuntimeOwnedDecision(
      buildEvidenceLifecycleExecutionReadinessDenial({
        extractionInputAuthorization: null,
        extractionInputRuntimeOwnership: "not_owned",
      }),
    ),
  });
  return runContext.observabilityLedger.ledgerId;
}

function artifactUrl(query: string): string {
  return `http://localhost/api/internal/analyzer-v2/evidence-lifecycle-execution-readiness-artifacts${query}`;
}

afterEach(() => {
  process.env = { ...originalEnv };
});

describe("Analyzer V2 internal execution-readiness artifact route", () => {
  it("returns hash/length/provenance-only default artifacts for an authenticated ledger read", async () => {
    const ledgerId = seedArtifact();
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-execution-readiness-artifacts/route"
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
      sinkKind: "v2_evidence_lifecycle_execution_readiness_artifact_ledger",
      visibility: "internal_admin_only",
      publicPointerExposure: "forbidden",
      defaultProjection: "hash_length_provenance_only",
      inspectionRole: "historical_same_ledger_eligibility_evidence",
      mergedBy: "x7-w5-f_evidence_item_handoff_projection",
      retiredRemovalTrigger: "remove_or_merge_route_after_w5e_canary_and_next_evidence_handoff_owner",
      removalTrigger: "after_w5f_handoff_route_projection_verified",
      ledgerId,
      artifactCount: 1,
    });
    expect(body.artifacts[0].inputTextReturned).toBe(false);
    expect(body.artifacts[0].executionReadinessDenial.productExecution).toMatchObject({
      extractionExecutionAuthorized: false,
      llmExtractionCallAuthorized: false,
      evidenceItemGenerated: false,
      parserExecuted: false,
      publicProjectionWritten: false,
    });
    expect(serialized).not.toContain('"inputText":');
    expect(serialized).not.toContain(INPUT);
    expect(serialized).not.toContain("reportMarkdown");
    expect(serialized).not.toContain("truthPercentage");
  });

  it("denies unauthenticated access and malformed ledger requests without text leakage", async () => {
    process.env.FH_ADMIN_KEY = "test-admin-key";
    const { GET } = await import(
      "@/app/api/internal/analyzer-v2/evidence-lifecycle-execution-readiness-artifacts/route"
    );

    const unauthenticated = await GET(new Request(artifactUrl("?ledgerId=ledger-ok")));
    const malformed = await GET(new Request(
      artifactUrl("?ledgerId=ledger-ok&includeText=true"),
      { headers: { "x-admin-key": "test-admin-key" } },
    ));
    const missing = await GET(new Request(
      artifactUrl("?ledgerId=ledger-missing"),
      { headers: { "x-admin-key": "test-admin-key" } },
    ));

    expect(unauthenticated.status).toBe(401);
    expect(malformed.status).toBe(400);
    expect(missing.status).toBe(404);
    expect(JSON.stringify(await unauthenticated.json())).not.toContain(INPUT);
    expect(JSON.stringify(await malformed.json())).not.toContain(INPUT);
    expect(JSON.stringify(await missing.json())).not.toContain(INPUT);
  });
});
