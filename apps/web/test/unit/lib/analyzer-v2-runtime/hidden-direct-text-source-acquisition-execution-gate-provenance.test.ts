import { describe, expect, it } from "vitest";
import {
  buildHiddenDirectTextSourceAcquisitionExecutionGate,
  type HiddenDirectTextSourceAcquisitionExecutionGateResult,
} from "@/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-execution-gate";
import {
  ANALYZER_V2_HIDDEN_DIRECT_TEXT_SOURCE_ACQUISITION_EXECUTION_GATE_PROVENANCE_VERSION,
  markHiddenDirectTextSourceAcquisitionExecutionGateProducerOwnedResult,
  readHiddenDirectTextSourceAcquisitionExecutionGateProducerOwnedResult,
} from "@/lib/analyzer-v2-runtime/hidden-direct-text-source-acquisition-execution-gate-provenance";

function producedBlockedGate(): HiddenDirectTextSourceAcquisitionExecutionGateResult {
  return buildHiddenDirectTextSourceAcquisitionExecutionGate({} as never);
}

function forgedPositiveGate(): HiddenDirectTextSourceAcquisitionExecutionGateResult {
  return {
    gateVersion: "v2.hidden-direct-text-source-acquisition-execution-gate.x7f",
    visibility: "internal_only",
    status: "gate_closed_no_io",
    executionStatus: "blocked_no_io",
    closedReason: "research_acquisition_gateway_not_implemented",
    blockedReason: null,
    readinessCompositionVersion: "v2.hidden-direct-text-source-acquisition-readiness-composition.x7d",
    readinessCompositionStatus: "composition_not_executable_pre_live_gate",
    readinessCompositionBlockedReason: null,
    networkExecution: true,
    providerCalls: 1,
    networkCalls: 1,
    bytesRead: 10,
    candidateRecords: 1,
    retries: 0,
    parserRuns: 0,
    cacheTouched: false,
    sourceReliabilityTouched: false,
    publicExposure: false,
    liveJobs: false,
    providerNetworkExecution: null,
    candidateAcquisition: null,
    sourceMaterial: null,
    extractionInput: null,
    evidenceCorpus: null,
    contentPackets: null,
    parserInput: null,
    parserOutput: null,
    parserAdmissionStatus: "blocked_pending_b2_b3_c0_2d_c",
  } as HiddenDirectTextSourceAcquisitionExecutionGateResult;
}

describe("Analyzer V2 X7-F execution gate result provenance", () => {
  it("marks producer-created X7-F results without changing their serialized shape", () => {
    const result = producedBlockedGate();

    expect(readHiddenDirectTextSourceAcquisitionExecutionGateProducerOwnedResult(result)).toBe(result);
    expect(JSON.stringify(result)).not.toContain("producerOwned");
    expect(JSON.stringify(result)).not.toContain(
      ANALYZER_V2_HIDDEN_DIRECT_TEXT_SOURCE_ACQUISITION_EXECUTION_GATE_PROVENANCE_VERSION,
    );
  });

  it("rejects copied, serialized, cloned, and reconstructed X7-F-shaped results", () => {
    const result = producedBlockedGate();

    for (const copy of [
      { ...result },
      JSON.parse(JSON.stringify(result)),
      structuredClone(result),
      Object.fromEntries(Object.entries(result)),
    ]) {
      expect(readHiddenDirectTextSourceAcquisitionExecutionGateProducerOwnedResult(copy)).toBeNull();
    }
  });

  it("fails closed permanently when producer-owned X7-F fields are mutated after marking", () => {
    const result = producedBlockedGate();
    const mutableResult = result as unknown as Record<string, unknown>;

    mutableResult.networkCalls = 1;
    expect(readHiddenDirectTextSourceAcquisitionExecutionGateProducerOwnedResult(result)).toBeNull();

    mutableResult.networkCalls = 0;
    expect(readHiddenDirectTextSourceAcquisitionExecutionGateProducerOwnedResult(result)).toBeNull();
  });

  it("does not let the owner marker bless positive-looking X7-F results", () => {
    const forged = forgedPositiveGate();
    const marked = markHiddenDirectTextSourceAcquisitionExecutionGateProducerOwnedResult(forged);

    expect(marked).toBe(forged);
    expect(readHiddenDirectTextSourceAcquisitionExecutionGateProducerOwnedResult(marked)).toBeNull();
  });
});
