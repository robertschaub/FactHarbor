import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Analyzer V2 W8-B product chain integration", () => {
  it("captures W7-B2 output and records W8-B inside the hidden runtime containment block", () => {
    const source = readFileSync(
      path.resolve(process.cwd(), "src/lib/analyzer-v2/orchestrator.ts"),
      "utf8",
    );
    const hiddenRuntimeBlockStart = source.indexOf("if (");
    const recordCallIndex = source.indexOf("recordInternalAlphaReportResultRuntimeArtifact({");
    const hiddenRuntimeCatchIndex = source.indexOf("// X7-S hidden runtime execution must never affect");

    expect(source).toContain(
      "@/lib/analyzer-v2-runtime/evidence-lifecycle-internal-alpha-report-result-artifact-sink",
    );
    expect(source).toContain("const boundaryVerdictExecution = await runBoundaryVerdictExecutionDecision({");
    expect(recordCallIndex).toBeGreaterThan(hiddenRuntimeBlockStart);
    expect(recordCallIndex).toBeLessThan(hiddenRuntimeCatchIndex);
    expect(source.slice(recordCallIndex, hiddenRuntimeCatchIndex)).toContain("boundedEvidenceExtraction,");
    expect(source.slice(recordCallIndex, hiddenRuntimeCatchIndex)).toContain("evidenceItemHandoff,");
    expect(source.slice(recordCallIndex, hiddenRuntimeCatchIndex)).toContain("sufficiencyIntake,");
    expect(source.slice(recordCallIndex, hiddenRuntimeCatchIndex)).toContain("sufficiencyAssessment,");
    expect(source.slice(recordCallIndex, hiddenRuntimeCatchIndex)).toContain("boundaryVerdictCandidate,");
    expect(source.slice(recordCallIndex, hiddenRuntimeCatchIndex)).toContain("internalAlphaReportStop,");
    expect(source.slice(recordCallIndex, hiddenRuntimeCatchIndex)).toContain("boundaryVerdictExecution,");
  });

  it("keeps W8-B out of the public envelope construction path", () => {
    const source = readFileSync(
      path.resolve(process.cwd(), "src/lib/analyzer-v2/orchestrator.ts"),
      "utf8",
    );
    const envelopeStart = source.indexOf("const envelope = buildDamagedClaimBoundaryV2Envelope(");
    const envelopeBlock = source.slice(envelopeStart);

    expect(envelopeStart).toBeGreaterThan(0);
    expect(envelopeBlock).not.toContain("recordInternalAlphaReportResultRuntimeArtifact");
    expect(envelopeBlock).not.toContain("boundaryVerdictExecution");
    expect(envelopeBlock).not.toContain("internalAlphaReportResult");
  });
});
