import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("Analyzer V2 W8-B/W8-G product chain integration", () => {
  it("captures W7-B2 output and records W8-B plus W8-G inside the hidden runtime containment block", () => {
    const source = readFileSync(
      path.resolve(process.cwd(), "src/lib/analyzer-v2/orchestrator.ts"),
      "utf8",
    );
    const hiddenRuntimeBlockStart = source.indexOf("if (");
    const recordCallIndex = source.indexOf("recordInternalAlphaReportResultRuntimeArtifact({");
    const draftRecordCallIndex = source.indexOf("recordInternalAlphaReportDraftRuntimeArtifact({");
    const hiddenRuntimeCatchIndex = source.indexOf("// X7-S hidden runtime execution must never affect");

    expect(source).toContain(
      "@/lib/analyzer-v2-runtime/evidence-lifecycle-internal-alpha-report-result-artifact-sink",
    );
    expect(source).toContain(
      "@/lib/analyzer-v2-runtime/evidence-lifecycle-internal-alpha-report-draft-artifact-sink",
    );
    expect(source).toContain("boundaryVerdictExecution = await runBoundaryVerdictExecutionDecision({");
    expect(source).toContain("} finally {");
    expect(recordCallIndex).toBeGreaterThan(hiddenRuntimeBlockStart);
    expect(recordCallIndex).toBeLessThan(hiddenRuntimeCatchIndex);
    expect(draftRecordCallIndex).toBeGreaterThan(recordCallIndex);
    expect(draftRecordCallIndex).toBeLessThan(hiddenRuntimeCatchIndex);
    expect(source.slice(recordCallIndex, hiddenRuntimeCatchIndex)).toContain("boundedEvidenceExtraction,");
    expect(source.slice(recordCallIndex, hiddenRuntimeCatchIndex)).toContain("evidenceItemHandoff,");
    expect(source.slice(recordCallIndex, hiddenRuntimeCatchIndex)).toContain("sufficiencyIntake,");
    expect(source.slice(recordCallIndex, hiddenRuntimeCatchIndex)).toContain("sufficiencyAssessment,");
    expect(source.slice(recordCallIndex, hiddenRuntimeCatchIndex)).toContain("boundaryVerdictCandidate,");
    expect(source.slice(recordCallIndex, hiddenRuntimeCatchIndex)).toContain("internalAlphaReportStop,");
    expect(source.slice(recordCallIndex, hiddenRuntimeCatchIndex)).toContain("boundaryVerdictExecution,");
    expect(source.slice(draftRecordCallIndex, hiddenRuntimeCatchIndex)).toContain("internalAlphaReportResult:");
    expect(source.slice(draftRecordCallIndex, hiddenRuntimeCatchIndex)).toContain("boundaryVerdictExecution,");
  });

  it("keeps W8-B and W8-G out of the public envelope construction path", () => {
    const source = readFileSync(
      path.resolve(process.cwd(), "src/lib/analyzer-v2/orchestrator.ts"),
      "utf8",
    );
    const envelopeStart = source.indexOf("const envelope = buildDamagedClaimBoundaryV2Envelope(");
    const envelopeBlock = source.slice(envelopeStart);

    expect(envelopeStart).toBeGreaterThan(0);
    expect(envelopeBlock).not.toContain("recordInternalAlphaReportResultRuntimeArtifact");
    expect(envelopeBlock).not.toContain("recordInternalAlphaReportDraftRuntimeArtifact");
    expect(envelopeBlock).not.toContain("boundaryVerdictExecution");
    expect(envelopeBlock).not.toContain("internalAlphaReportResult");
    expect(envelopeBlock).not.toContain("internalAlphaReportDraft");
  });

  it("projects HJ73 source-chain attribution through the existing result envelope", () => {
    const source = readFileSync(
      path.resolve(process.cwd(), "src/lib/analyzer-v2/orchestrator.ts"),
      "utf8",
    );
    const envelopeStart = source.indexOf("const envelope = buildDamagedClaimBoundaryV2Envelope(");
    const envelopeBlock = source.slice(envelopeStart);

    expect(source).toContain("@/lib/analyzer-v2/source-chain-attribution");
    expect(envelopeBlock).toContain("sourceChainAttribution: buildSourceChainAttributionSnapshot({");
    expect(envelopeBlock).toContain("queryPlanningInspection: queryPlanningInspectionForAttribution");
    expect(envelopeBlock).toContain("sourceMaterialPageSummary: sourceMaterialPageSummaryForAttribution");
    expect(envelopeBlock).toContain("boundedEvidenceExtraction: boundedEvidenceExtractionForAttribution");
    expect(envelopeBlock).toContain("internalReportWriter: internalReportWriterForAttribution");
    expect(envelopeBlock).not.toContain("sourceMaterialText");
    expect(envelopeBlock).not.toContain("rawQueryText");
    expect(envelopeBlock).not.toContain("reportMarkdown:");
  });
});
