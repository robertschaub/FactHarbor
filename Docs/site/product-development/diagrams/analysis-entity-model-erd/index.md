> **Info**
>
> **Current Implementation (CB Pipeline v2.11.0+)** — The complete analysis entity hierarchy from input through verdict to overall assessment. Source of truth: `apps/web/src/lib/analyzer/types.ts` (CB pipeline interfaces: `CBClaimUnderstanding`, `AtomicClaim`, `CBClaimVerdict`, `BoundaryFinding`, `ClaimAssessmentBoundary`, `EvidenceItem`, `EvidenceScope`, `FetchedSource`, `OverallAssessment`, `VerdictNarrative`, `ConsistencyResult`, `ChallengeResponse`, `CoverageMatrix`, `TriangulationScore`).
>
> Updated 2026-02-22.

<span id="analysis-entity-model-cb-pipeline-v2-11-0"></span>

# Analysis Entity Model (CB Pipeline v2.11.0+)

## Entity Relationship Diagram

![Analysis Entity Model ERD diagram 1](../../../diagrams/diagram-cb95db6bc106e37c.svg)

[Full-size diagram](../../../diagrams/diagram-cb95db6bc106e37c.svg) · [Mermaid source](../../../diagrams/diagram-cb95db6bc106e37c.mmd)

*The CB pipeline analysis entity hierarchy. Stage 1 (Extract Claims) produces `CB_CLAIM_UNDERSTANDING` with `AtomicClaims` and `GATE_1_STATS`. Stage 2 (Research) gathers `EVIDENCE_ITEMs` with `EVIDENCE_SCOPEs` from `FETCHED_SOURCEs`. Stage 3 (Cluster) groups `EVIDENCE_SCOPEs` into `CLAIM_ASSESSMENT_BOUNDARYs`. Stage 4 (Verdict) generates `CB_CLAIM_VERDICTs` with per-boundary `BOUNDARY_FINDINGs`, `CONSISTENCY_RESULTs` (self-consistency), `TRIANGULATION_SCOREs` (cross-boundary agreement), and `CHALLENGE_RESPONSEs` (adversarial debate). Stage 5 (Aggregate) produces `OVERALL_ASSESSMENT` with `VERDICT_NARRATIVE`, `COVERAGE_MATRIX`, and `QUALITY_GATES`.*

## Entity Hierarchy

The CB pipeline produces a result structure organized as follows:

1.  **CBClaimUnderstanding** (Stage 1 output) — Top-level understanding of the input. Contains the extracted `atomicClaims[]` array and `gate1Stats` validation summary. Captures the article thesis, background details, risk tier, distinct events, and preliminary evidence gathered during the two-pass extraction process.

<!-- -->

1.  **AtomicClaim** — A single verifiable assertion extracted from user input. Only central claims (high/medium centrality) survive the extraction filter. Each carries `expectedEvidenceProfile` describing what evidence types and methodologies would verify or refute it. Fields `verifiability` (B-6) and `groundingQuality` assess fact-checkability and evidence anchoring.

<!-- -->

1.  **CBClaimVerdict** (Stage 4 output) — One verdict per AtomicClaim, not per boundary. The verdict integrates evidence across all boundaries into a single `truthPercentage` and 7-point `verdict` label. Boundary-specific nuance is captured in `boundaryFindings[]`. Includes `consistencyResult` (self-consistency check), `triangulationScore` (cross-boundary agreement), and `challengeResponses[]` (adversarial debate reconciliation). Optional `misleadingness` (B-7) provides an independent assessment that is output-only and not fed back into the debate.

<!-- -->

1.  **BoundaryFinding** — Per-boundary quantitative signals within a CBClaimVerdict. Records `truthPercentage`, `confidence`, `evidenceDirection`, and `evidenceCount` for one ClaimAssessmentBoundary. Provides nuance when different methodological boundaries yield different conclusions about the same claim.

<!-- -->

1.  **EvidenceItem** (Stage 2 output) — Extracted evidence from a source. This is unverified material to be evaluated against claims — not a verified fact. Linked to a `FetchedSource` via `sourceId` and carries an `EvidenceScope` describing the source methodology. Assigned to a `ClaimAssessmentBoundary` in Stage 3 via `claimBoundaryId`.

<!-- -->

1.  **EvidenceScope** — Per-evidence source metadata describing the methodology, boundaries, geography, and timeframe of the source data. Embedded within EvidenceItem (not a separate stored entity). Extensible via `additionalDimensions` (Decision D4). Compatible scopes are clustered into ClaimAssessmentBoundaries in Stage 3.

<!-- -->

1.  **ClaimAssessmentBoundary** (Stage 3 output) — Evidence-emergent grouping of compatible EvidenceScopes. Created after research by clustering scopes with compatible methodology, temporal, and geographic dimensions. Contains `constituentScopes[]` and measures `internalCoherence` (0-1).

<!-- -->

1.  **OverallAssessment** (Stage 5 output) — Final aggregated result. Weighted average of `truthPercentage` and `confidence` across all CBClaimVerdicts. Contains `verdictNarrative` (structured narrative), `coverageMatrix` (claims x boundaries evidence distribution), `qualityGates` (Gate 1 and Gate 4 results), `claimBoundaries[]`, and `claimVerdicts[]`. Optional `explanationQualityCheck` (B-8) provides structural and rubric-based quality assessment of the narrative.

## Key Implementation Notes

**7-Point Verdict Scale:**

-   TRUE (86-100%) / MOSTLY-TRUE (72-85%) / LEANING-TRUE (58-71%)
-   MIXED (43-57%, confidence \>= 40%) / UNVERIFIED (43-57%, confidence \< 40%)
-   LEANING-FALSE (29-42%) / MOSTLY-FALSE (15-28%) / FALSE (0-14%)

**EvidenceScope (mandatory core fields):** Per-evidence metadata describing the methodology and boundaries of the source data. `methodology` and `temporal` are the primary scope dimensions populated when available from the source. All fields except `name` are optional in the TypeScript interface, but the extraction prompt targets methodology and temporal as mandatory when source data permits. Embedded in EvidenceItem, not a separate stored entity. Extensible via `additionalDimensions` (Decision D4).

**harmPotential (4-level, Decision D9):** `critical` (1.5x weight) = death/injury allegations, `high` (1.2x) = serious but not life-threatening, `medium` (1.0x) = moderate, `low` (1.0x) = minimal. Applied to both AtomicClaim and CBClaimVerdict.

**claimDirection semantics (Decision D6):** AtomicClaim uses `supports_thesis` / `contradicts_thesis` / `contextual` (contextual = relevant background without directional stance). EvidenceItem uses `supports` / `contradicts` / `neutral` for backward compatibility.

**Derivative evidence (CB pipeline):** Evidence items that cite another source's underlying study are flagged with `isDerivative` and `derivedFromSourceUrl`. If the original source was not fetched, `derivativeClaimUnverified` = true. Derivative evidence receives reduced weight in aggregation.

**VerdictNarrative (Decision D7):** Structured type with `headline`, `evidenceBaseSummary`, `keyFinding`, `boundaryDisagreements[]`, and `limitations`. LLM-generated (Sonnet, 1 call) after weighted aggregation. Stored within OverallAssessment.

**Self-Consistency (Stage 4 Step 2):** CBClaimVerdict includes `consistencyResult` recording the spread of truth percentages across multiple LLM runs with temperature \> 0. The `stable` flag indicates whether spread is below the UCM-configured threshold. If `assessed` is false, the check was skipped (disabled or deterministic mode).

**Triangulation (Stage 4):** CBClaimVerdict includes `triangulationScore` measuring cross-boundary agreement: `strong` / `moderate` / `weak` / `conflicted`. The `factor` field provides a multiplicative weight adjustment derived from UCM thresholds.

**Adversarial Challenge (Stage 4 Steps 3-4):** CBClaimVerdict includes `challengeResponses[]` recording how each adversarial challenge point was addressed in reconciliation. Challenges must be evidence-backed to adjust verdicts; unsubstantiated objections do not reduce truth percentage. Each response records `challengeType`, `response`, `verdictAdjusted`, and optional `adjustmentBasedOnChallengeIds` for provenance tracking.

**Misleadingness (B-7):** Optional independent assessment on CBClaimVerdict. Values: `not_misleading`, `potentially_misleading`, `highly_misleading`. Output-only; not fed back into the debate.

**TruthPercentageRange:** Plausible range (`min`, `max`) computed from self-consistency spread and optionally widened by boundary variance. Present on both CBClaimVerdict and OverallAssessment.

**Explanation Quality (B-8):** Optional `explanationQualityCheck` on OverallAssessment. Two tiers: structural (deterministic — checks for cited evidence, verdict category, confidence statement, limitations) and rubric (LLM-powered — scores clarity, completeness, neutrality, evidence support, appropriate hedging on a 1-5 scale).

**Storage:** All data stored as JSON blob in SQLite `ResultJson` field. Schema version: `3.0.0-cb`.

**See Also:** [Entity Views](../entity-views/index.md) for multi-view field-level detail. [Quality Gates Flow](../quality-gates-flow/index.md) for Gate 1 and Gate 4 detail.
