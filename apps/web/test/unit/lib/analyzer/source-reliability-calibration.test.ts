import { describe, expect, it } from "vitest";

import {
  DEFAULT_CALC_CONFIG,
  DEFAULT_PIPELINE_CONFIG,
  type CalcConfig,
  type PipelineConfig,
} from "@/lib/config-schemas";
import {
  applySourceReliabilityCalibrationResults,
  buildSourceReliabilityCalibrationInput,
  calibrateVerdictsWithSourceReliability,
} from "@/lib/analyzer/source-reliability-calibration";
import type { CBClaimVerdict, EvidenceItem, FetchedSource } from "@/lib/analyzer/types";

function createCalcConfig(overrides: Partial<CalcConfig> = {}): CalcConfig {
  return {
    ...DEFAULT_CALC_CONFIG,
    ...overrides,
    sourceReliabilityCalibration: {
      ...DEFAULT_CALC_CONFIG.sourceReliabilityCalibration!,
      ...(overrides.sourceReliabilityCalibration ?? {}),
    },
  };
}

function createPipelineConfig(overrides: Partial<PipelineConfig> = {}): PipelineConfig {
  return {
    ...DEFAULT_PIPELINE_CONFIG,
    ...overrides,
  };
}

function createVerdict(overrides: Partial<CBClaimVerdict> = {}): CBClaimVerdict {
  return {
    id: "CV_01",
    claimId: "AC_01",
    truthPercentage: 64,
    verdict: "LEANING-TRUE",
    confidence: 58,
    reasoning: "Test reasoning.",
    harmPotential: "medium",
    isContested: false,
    supportingEvidenceIds: ["EV_01", "EV_02"],
    contradictingEvidenceIds: ["EV_03"],
    boundaryFindings: [],
    consistencyResult: {
      claimId: "AC_01",
      percentages: [63, 64, 65],
      average: 64,
      spread: 2,
      stable: true,
      assessed: true,
    },
    challengeResponses: [],
    triangulationScore: {
      boundaryCount: 1,
      supporting: 1,
      contradicting: 0,
      level: "limited",
      factor: 1,
    },
    confidenceTier: "MEDIUM",
    ...overrides,
  };
}

function createEvidenceItem(overrides: Partial<EvidenceItem> = {}): EvidenceItem {
  return {
    id: "EV_01",
    statement: "Evidence statement with enough detail for testing.",
    category: "direct_evidence",
    specificity: "high",
    sourceId: "S1",
    sourceUrl: "https://example.com/source-1",
    sourceTitle: "Example Source",
    sourceExcerpt: "Excerpt",
    claimDirection: "supports",
    probativeValue: "high",
    sourceType: "peer_reviewed_study",
    ...overrides,
  };
}

function createSource(overrides: Partial<FetchedSource> = {}): FetchedSource {
  return {
    id: "S1",
    url: "https://example.com/source-1",
    title: "Example Source",
    trackRecordScore: 0.8,
    trackRecordConfidence: 0.9,
    trackRecordConsensus: true,
    fullText: "Full text",
    fetchedAt: "2026-03-19T12:00:00.000Z",
    category: "news",
    fetchSuccess: true,
    ...overrides,
  };
}

describe("source-reliability-calibration", () => {
  it("builds bounded source portfolios and caps each side at maxSourcesPerSide", () => {
    const verdict = createVerdict({
      supportingEvidenceIds: ["EV_01", "EV_02", "EV_03", "EV_04", "EV_05", "EV_06"],
      contradictingEvidenceIds: ["EV_07"],
    });
    const evidenceItems: EvidenceItem[] = [
      createEvidenceItem({ id: "EV_01", sourceId: "S1", probativeValue: "high" }),
      createEvidenceItem({ id: "EV_02", sourceId: "S2", probativeValue: "medium", sourceUrl: "https://two.example/a" }),
      createEvidenceItem({ id: "EV_03", sourceId: "S3", probativeValue: "low", sourceUrl: "https://three.example/a" }),
      createEvidenceItem({ id: "EV_04", sourceId: "S4", probativeValue: "high", sourceUrl: "https://four.example/a" }),
      createEvidenceItem({ id: "EV_05", sourceId: "S5", probativeValue: "medium", sourceUrl: "https://five.example/a" }),
      createEvidenceItem({ id: "EV_06", sourceId: "S6", probativeValue: "high", sourceUrl: "https://six.example/a" }),
      createEvidenceItem({ id: "EV_07", sourceId: "S7", claimDirection: "contradicts", probativeValue: "medium", sourceUrl: "https://seven.example/a" }),
    ];
    const sources: FetchedSource[] = [
      createSource({ id: "S1", url: "https://one.example/a" }),
      createSource({ id: "S2", url: "https://two.example/a" }),
      createSource({ id: "S3", url: "https://three.example/a" }),
      createSource({ id: "S4", url: "https://four.example/a" }),
      createSource({ id: "S5", url: "https://five.example/a" }),
      createSource({ id: "S6", url: "https://six.example/a" }),
      createSource({ id: "S7", url: "https://seven.example/a" }),
    ];
    const calcConfig = createCalcConfig({
      sourceReliabilityCalibration: {
        ...DEFAULT_CALC_CONFIG.sourceReliabilityCalibration!,
        maxSourcesPerSide: 5,
      },
    });
    const pipelineConfig = createPipelineConfig({
      sourceReliabilityCalibrationMode: "confidence_only",
    });

    const request = buildSourceReliabilityCalibrationInput(
      [verdict],
      evidenceItems,
      sources,
      calcConfig,
      pipelineConfig,
    );

    expect(request.claims[0].supportPortfolio.selectedSourceCount).toBe(5);
    expect(request.claims[0].supportPortfolio.topSources).toHaveLength(5);
    expect(request.claims[0].supportPortfolio.topSources.every((source) => source.domain !== null)).toBe(true);
    expect(request.claims[0].supportPortfolio.topSources[0].probativeValue).toBe("high");
  });

  it("applies confidence-only calibration while preserving raw verdict diagnostics", () => {
    const verdict = createVerdict();
    const calcConfig = createCalcConfig();
    const pipelineConfig = createPipelineConfig({
      sourceReliabilityCalibrationMode: "confidence_only",
    });
    const request = buildSourceReliabilityCalibrationInput(
      [verdict],
      [
        createEvidenceItem({ id: "EV_01", sourceId: "S1" }),
        createEvidenceItem({ id: "EV_02", sourceId: "S2", sourceUrl: "https://two.example/a" }),
        createEvidenceItem({ id: "EV_03", sourceId: "S3", claimDirection: "contradicts", sourceUrl: "https://three.example/a" }),
      ],
      [
        createSource({ id: "S1", url: "https://one.example/a" }),
        createSource({ id: "S2", url: "https://two.example/a", trackRecordScore: null }),
        createSource({ id: "S3", url: "https://three.example/a", trackRecordScore: 0.6 }),
      ],
      calcConfig,
      pipelineConfig,
    );

    const applied = applySourceReliabilityCalibrationResults(
      [verdict],
      request,
      calcConfig,
      [{ claimId: verdict.claimId, truthDelta: 5, confidenceDelta: 12 }],
    );

    expect(applied.verdicts[0].truthPercentage).toBe(64);
    expect(applied.verdicts[0].confidence).toBe(70);
    expect(applied.verdicts[0].sourceReliabilityCalibration).toMatchObject({
      mode: "confidence_only",
      rawTruthPercentage: 64,
      rawConfidence: 58,
      rawTruthDelta: 5,
      rawConfidenceDelta: 12,
      truthDelta: 0,
      confidenceDelta: 12,
      llmStatus: "applied",
    });
  });

  it("clamps bounded truth and confidence deltas before applying them", () => {
    const verdict = createVerdict({ truthPercentage: 98, confidence: 94, verdict: "TRUE", confidenceTier: "HIGH" });
    const calcConfig = createCalcConfig({
      sourceReliabilityCalibration: {
        ...DEFAULT_CALC_CONFIG.sourceReliabilityCalibration!,
        truthDeltaMax: 5,
        confidenceDeltaMax: 15,
      },
    });
    const pipelineConfig = createPipelineConfig({
      sourceReliabilityCalibrationMode: "bounded_truth_and_confidence",
    });
    const request = buildSourceReliabilityCalibrationInput(
      [verdict],
      [createEvidenceItem()],
      [createSource()],
      calcConfig,
      pipelineConfig,
    );

    const applied = applySourceReliabilityCalibrationResults(
      [verdict],
      request,
      calcConfig,
      [{ claimId: verdict.claimId, truthDelta: 20, confidenceDelta: 25 }],
    );

    expect(applied.verdicts[0].truthPercentage).toBe(100);
    expect(applied.verdicts[0].confidence).toBe(100);
    expect(applied.verdicts[0].sourceReliabilityCalibration).toMatchObject({
      rawTruthDelta: 20,
      rawConfidenceDelta: 25,
      truthDelta: 5,
      confidenceDelta: 15,
    });
  });

  it("clamps bounded truth and confidence deltas at the lower boundary", () => {
    const verdict = createVerdict({ truthPercentage: 2, confidence: 6, verdict: "MIXED", confidenceTier: "INSUFFICIENT" });
    const calcConfig = createCalcConfig({
      sourceReliabilityCalibration: {
        ...DEFAULT_CALC_CONFIG.sourceReliabilityCalibration!,
        truthDeltaMax: 5,
        confidenceDeltaMax: 15,
      },
    });
    const pipelineConfig = createPipelineConfig({
      sourceReliabilityCalibrationMode: "bounded_truth_and_confidence",
    });
    const request = buildSourceReliabilityCalibrationInput(
      [verdict],
      [createEvidenceItem()],
      [createSource()],
      calcConfig,
      pipelineConfig,
    );

    const applied = applySourceReliabilityCalibrationResults(
      [verdict],
      request,
      calcConfig,
      [{ claimId: verdict.claimId, truthDelta: -20, confidenceDelta: -25 }],
    );

    expect(applied.verdicts[0].truthPercentage).toBe(0);
    expect(applied.verdicts[0].confidence).toBe(0);
    expect(applied.verdicts[0].sourceReliabilityCalibration).toMatchObject({
      rawTruthDelta: -20,
      rawConfidenceDelta: -25,
      truthDelta: -5,
      confidenceDelta: -15,
    });
  });

  it("applies multi-claim batch results to the matching claim only", () => {
    const verdictOne = createVerdict({ id: "CV_01", claimId: "AC_01", truthPercentage: 64, confidence: 58 });
    const verdictTwo = createVerdict({
      id: "CV_02",
      claimId: "AC_02",
      truthPercentage: 41,
      confidence: 49,
      verdict: "MIXED",
      supportingEvidenceIds: ["EV_04"],
      contradictingEvidenceIds: ["EV_05"],
    });
    const calcConfig = createCalcConfig();
    const pipelineConfig = createPipelineConfig({
      sourceReliabilityCalibrationMode: "bounded_truth_and_confidence",
    });
    const evidenceItems = [
      createEvidenceItem({ id: "EV_01", sourceId: "S1" }),
      createEvidenceItem({ id: "EV_02", sourceId: "S2", sourceUrl: "https://two.example/a" }),
      createEvidenceItem({ id: "EV_03", sourceId: "S3", claimDirection: "contradicts", sourceUrl: "https://three.example/a" }),
      createEvidenceItem({ id: "EV_04", sourceId: "S4", sourceUrl: "https://four.example/a" }),
      createEvidenceItem({ id: "EV_05", sourceId: "S5", claimDirection: "contradicts", sourceUrl: "https://five.example/a" }),
    ];
    const sources = [
      createSource({ id: "S1", url: "https://one.example/a" }),
      createSource({ id: "S2", url: "https://two.example/a" }),
      createSource({ id: "S3", url: "https://three.example/a" }),
      createSource({ id: "S4", url: "https://four.example/a", trackRecordScore: null }),
      createSource({ id: "S5", url: "https://five.example/a", trackRecordScore: 0.55 }),
    ];

    const request = buildSourceReliabilityCalibrationInput(
      [verdictOne, verdictTwo],
      evidenceItems,
      sources,
      calcConfig,
      pipelineConfig,
    );

    const applied = applySourceReliabilityCalibrationResults(
      [verdictOne, verdictTwo],
      request,
      calcConfig,
      [
        { claimId: "AC_02", truthDelta: -4, confidenceDelta: 8 },
        { claimId: "AC_01", truthDelta: 3, confidenceDelta: 5 },
      ],
    );

    expect(applied.verdicts[0]).toMatchObject({
      claimId: "AC_01",
      truthPercentage: 67,
      confidence: 63,
    });
    expect(applied.verdicts[0].sourceReliabilityCalibration).toMatchObject({
      rawTruthPercentage: 64,
      rawConfidence: 58,
      rawTruthDelta: 3,
      rawConfidenceDelta: 5,
      truthDelta: 3,
      confidenceDelta: 5,
    });

    expect(applied.verdicts[1]).toMatchObject({
      claimId: "AC_02",
      truthPercentage: 37,
      confidence: 57,
    });
    expect(applied.verdicts[1].sourceReliabilityCalibration).toMatchObject({
      rawTruthPercentage: 41,
      rawConfidence: 49,
      rawTruthDelta: -4,
      rawConfidenceDelta: 8,
      truthDelta: -4,
      confidenceDelta: 8,
    });
  });

  it("returns a skipped warning and unknown-dominance diagnostics when enabled without results", () => {
    const verdict = createVerdict({
      supportingEvidenceIds: ["EV_01", "EV_02"],
      contradictingEvidenceIds: [],
    });
    const calcConfig = createCalcConfig({
      sourceReliabilityCalibration: {
        ...DEFAULT_CALC_CONFIG.sourceReliabilityCalibration!,
        minKnownSourcesPerSide: 1,
        unknownDominanceThreshold: 0.75,
      },
    });
    const pipelineConfig = createPipelineConfig({
      sourceReliabilityCalibrationEnabled: true,
      sourceReliabilityCalibrationMode: "confidence_only",
    });

    const result = calibrateVerdictsWithSourceReliability(
      [verdict],
      [
        createEvidenceItem({ id: "EV_01", sourceId: "S1" }),
        createEvidenceItem({ id: "EV_02", sourceId: "S2", sourceUrl: "https://two.example/a" }),
      ],
      [
        createSource({ id: "S1", trackRecordScore: null }),
        createSource({ id: "S2", url: "https://two.example/a", trackRecordScore: null }),
      ],
      calcConfig,
      pipelineConfig,
    );

    expect(result.warnings.map((warning) => warning.type)).toContain("source_reliability_calibration_skipped");
    expect(result.warnings.map((warning) => warning.type)).toContain("source_reliability_unknown_dominance");
    expect(result.verdicts[0].sourceReliabilityCalibration).toMatchObject({
      llmStatus: "not_requested",
      applied: false,
      rawTruthPercentage: 64,
      rawConfidence: 58,
      rawTruthDelta: 0,
      rawConfidenceDelta: 0,
    });
  });

  it("does not duplicate unknown-dominance warnings when both preflight and results request them", () => {
    const verdict = createVerdict({
      supportingEvidenceIds: ["EV_01", "EV_02"],
      contradictingEvidenceIds: [],
    });
    const calcConfig = createCalcConfig({
      sourceReliabilityCalibration: {
        ...DEFAULT_CALC_CONFIG.sourceReliabilityCalibration!,
        minKnownSourcesPerSide: 1,
        unknownDominanceThreshold: 0.75,
      },
    });
    const pipelineConfig = createPipelineConfig({
      sourceReliabilityCalibrationMode: "confidence_only",
    });
    const request = buildSourceReliabilityCalibrationInput(
      [verdict],
      [
        createEvidenceItem({ id: "EV_01", sourceId: "S1" }),
        createEvidenceItem({ id: "EV_02", sourceId: "S2", sourceUrl: "https://two.example/a" }),
      ],
      [
        createSource({ id: "S1", trackRecordScore: null }),
        createSource({ id: "S2", url: "https://two.example/a", trackRecordScore: null }),
      ],
      calcConfig,
      pipelineConfig,
    );

    const applied = applySourceReliabilityCalibrationResults(
      [verdict],
      request,
      calcConfig,
      [{
        claimId: verdict.claimId,
        confidenceDelta: 0,
        warningTypes: ["source_reliability_unknown_dominance"],
      }],
    );

    expect(
      applied.warnings.filter((warning) => warning.type === "source_reliability_unknown_dominance"),
    ).toHaveLength(1);
  });

  it("forces truthDelta to 0 even in bounded_truth_and_confidence mode when LLM result omits truthDelta", () => {
    const verdict = createVerdict({ truthPercentage: 64, confidence: 58 });
    const calcConfig = createCalcConfig();
    const pipelineConfig = createPipelineConfig({
      sourceReliabilityCalibrationMode: "bounded_truth_and_confidence",
    });
    const request = buildSourceReliabilityCalibrationInput(
      [verdict],
      [createEvidenceItem()],
      [createSource()],
      calcConfig,
      pipelineConfig,
    );

    // Simulate LLM result that only provides confidenceDelta (no truthDelta field) —
    // this is the current SR_CALIBRATION prompt contract.
    const applied = applySourceReliabilityCalibrationResults(
      [verdict],
      request,
      calcConfig,
      [{ claimId: verdict.claimId, confidenceDelta: 10 }],
    );

    // Truth must remain unchanged even though mode allows truth adjustment,
    // because the LLM result has no truthDelta (undefined → 0 after clamping).
    expect(applied.verdicts[0].truthPercentage).toBe(64);
    expect(applied.verdicts[0].confidence).toBe(68);
    expect(applied.verdicts[0].sourceReliabilityCalibration).toMatchObject({
      mode: "bounded_truth_and_confidence",
      rawTruthDelta: 0,
      rawConfidenceDelta: 10,
      truthDelta: 0,
      confidenceDelta: 10,
      applied: true,
    });
  });
});
