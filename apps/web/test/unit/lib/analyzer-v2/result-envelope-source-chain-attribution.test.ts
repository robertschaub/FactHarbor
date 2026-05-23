import { describe, expect, it } from "vitest";
import { buildDamagedClaimBoundaryV2Envelope } from "@/lib/analyzer-v2/result-envelope";
import { buildClaimBoundaryV2RunContext } from "@/lib/analyzer-v2/run-context";
import { buildSourceChainAttributionSnapshot } from "@/lib/analyzer-v2/source-chain-attribution";

describe("Analyzer V2 result envelope source-chain attribution", () => {
  it("attaches source-chain attribution only under top-level admin diagnostics", () => {
    const context = buildClaimBoundaryV2RunContext({
      runIdHint: "job-v2-result-envelope-hj73",
      submitted: {
        kind: "text",
        value: "Result envelope HJ73 input",
      },
    });
    const sourceChainAttribution = buildSourceChainAttributionSnapshot({
      runId: context.runId,
      createdUtc: context.generatedUtc,
      publicCutoverStatus: "blocked_precutover",
      claimUnderstandingStatus: "blocked",
      selectedAtomicClaimCount: 0,
    });

    const envelope = buildDamagedClaimBoundaryV2Envelope(context, [], { sourceChainAttribution });

    expect(envelope.resultJson).toMatchObject({
      adminDiagnostics: {
        sourceChainAttribution: {
          version: "v2.highjump.source-chain-attribution.hj73",
          visibility: "internal_admin_only",
          lossPointCandidate: "query_planning",
        },
      },
    });
    expect(envelope.resultJson.meta).not.toHaveProperty("sourceChainAttribution");
    expect(envelope.resultJson.input).not.toHaveProperty("sourceChainAttribution");
    expect(envelope.resultJson).toHaveProperty("warnings");
    expect(JSON.stringify(envelope.resultJson.warnings)).not.toContain("sourceChainAttribution");
  });
});
