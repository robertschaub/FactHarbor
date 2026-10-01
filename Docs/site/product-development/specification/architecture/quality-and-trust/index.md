# Quality and Trust

FactHarbor employs multiple quality mechanisms to ensure analysis results are trustworthy: quality gates validate input and output, a defence-in-depth system ensures evidence and verdict quality, source reliability scoring evaluates source credibility, and a confidence calibration pipeline prevents misleading confidence scores.

## Quality Gates

Two quality gates are integrated into the ClaimAssessmentBoundary pipeline: Gate 1 validates extracted claims before research proceeds, and Gate 4 assesses verdict confidence and report trustworthiness after verdict generation.

> **Info**
>
> **Current Implementation (CB Pipeline v2.11.0+)** — Quality gates in the ClaimAssessmentBoundary pipeline. Gate 1 validates claims after extraction (Stage 1), Structural Consistency Check runs after verdict (Stage 4), and Gate 4 assesses verdict confidence before aggregation (Stage 5).
>
> Updated 2026-02-22 per `claimboundary-pipeline.ts`, `verdict-stage.ts`, and `quality-gates.ts`. Added B-6 verifiability annotation (Gate 1) and B-8 explanation quality check (Stage 5).

# Quality Gates Flow

## Overview

The ClaimAssessmentBoundary pipeline enforces three quality checkpoints plus two optional quality features. **Gate 1** filters non-verifiable or unfaithful claims before research begins, with optional verifiability annotation (B-6). The **Structural Consistency Check** validates deterministic invariants after the verdict debate. **Gate 4** classifies verdict confidence into tiers for publication decisions. The **Explanation Quality Check** (B-8) optionally validates narrative quality after aggregation.

![Quality Gates Flow diagram 1](../../../../diagrams/diagram-0d09a4a4e14e487f.svg)

[Full-size diagram](../../../../diagrams/diagram-0d09a4a4e14e487f.svg) · [Mermaid source](../../../../diagrams/diagram-0d09a4a4e14e487f.mmd)

*Quality gates in the ClaimAssessmentBoundary pipeline: Gate 1 filters non-verifiable and evidence-contaminated claims before research (with optional B-6 verifiability annotation), Structural Consistency Check validates verdict integrity (non-blocking), Gate 4 classifies verdict confidence based on evidence count, source quality, agreement, and self-consistency spread. B-8 Explanation Quality Check optionally validates narrative quality after aggregation.*

------------------------------------------------------------------------

## Gate 1: Claim Validation (Detail)

Gate 1 runs after Stage 1 (Extract Claims — Pass 1 + Pass 2) to filter non-verifiable or unfaithful claims before research. It uses a **batched LLM call** (Haiku tier) that validates all claims in a single request for efficiency.

### Gate 1 Decision Flow

![Quality Gates Flow diagram 2](../../../../diagrams/diagram-7e57b8f595fb1e1d.svg)

[Full-size diagram](../../../../diagrams/diagram-7e57b8f595fb1e1d.svg) · [Mermaid source](../../../../diagrams/diagram-7e57b8f595fb1e1d.mmd)

### Gate 1 Checks

| Check | Field | Criteria | Action on Failure |
|----|----|----|----|
| **Fidelity** | `passedFidelity` | Claim must be derivable from original input text, not evidence-contaminated or hallucinated by prior LLM pass | Filtered out (hard filter) |
| **Factuality** | `passedOpinion` | Not pure opinion or prediction (unless in article thesis). Evaluated by LLM, not keyword matching | Filtered out only if specificity also fails (both must fail) |
| **Specificity** | `specificityScore` | Score \>= UCM `claimSpecificityMinimum` (default 0.6). Claim must be researchable independently | Filtered if grounded (moderate/strong/weak); **exempt** if `groundingQuality` is "none" (cold extraction — low specificity expected without preliminary evidence) |
| **Grounding Quality** | `groundingQuality` | 4-level assessment of how well the claim is grounded in preliminary evidence | All levels pass; weak/none receive monitoring flag |

### groundingQuality Levels

| Level | Meaning | Gate 1 Treatment |
|----|----|----|
| **strong** | Fully grounded in preliminary evidence | Pass |
| **moderate** | Evidence themes referenced but claim lacks specifics | Pass |
| **weak** | Acceptable for claims the input article states explicitly | Pass with monitoring flag |
| **none** | Cold extraction — no preliminary evidence available. May indicate poor preliminary search | Pass with monitoring flag. **Exempt from specificity filter** (low specificity expected without grounding) |

### Safety Net

If **all claims** are filtered by Gate 1 (would result in an empty pipeline), the safety net rescues the highest-centrality claim to prevent a completely empty analysis. Rescue priority:

1.  Prefer claims that **passed fidelity** (faithful to input)
2.  Then by **centrality** (high \> medium \> low)

This ensures the pipeline always produces a result, even when input quality is poor.

### Verifiability Annotation (B-6)

After Gate 1 filtering, if UCM `claimAnnotationMode` is not "off", each surviving AtomicClaim receives a **verifiability** assessment:

| Level | Meaning |
|----|----|
| **high** | Directly checkable against available evidence (data, studies, official records) |
| **medium** | Partially checkable — some aspects verifiable, others depend on interpretation or unavailable data |
| **low** | Difficult to check — predictions, subjective assessments, or evidence unlikely to be public |
| **none** | Pure value judgment, preference, or unfalsifiable statement |

**Key property:** Verifiability is **independent of claim category**. A factual claim can have low verifiability (too vague to research), and an evaluative claim can have high verifiability (contains checkable sub-assertions).

**UCM control:** `claimAnnotationMode` = "off" (default) \| "verifiability" \| "verifiability_and_misleadingness". When "off", verifiability is computed but stripped from the output.

<span id="decomposition-retry-path-deferred-to-v1-1"></span>

### Decomposition Retry Path (deferred to v1.1)

When \> 50% of central claims fail specificity (UCM `gate1GroundingRetryThreshold`, default 0.5), this indicates poor overall extraction quality. The planned retry path:

1.  Trigger second preliminary search with refined queries (using passing claims + rejection reasons)
2.  Re-run Pass 2 with expanded evidence context
3.  Max 1 retry to avoid infinite loops

**Current status (v1.0):** Threshold exceedance is **logged as a warning** but retry is not yet implemented. The warning reads: *"Gate 1: N% of claims failed specificity (threshold: M%). Retry deferred to v1.1."*

------------------------------------------------------------------------

## Structural Consistency Check

Runs after Stage 4 Step 5 (Verdict Validation), before Gate 4. This is a **deterministic structural validation only** — no semantic interpretation, per AGENTS.md LLM Intelligence rule.

### Structural Check Flow

![Quality Gates Flow diagram 3](../../../../diagrams/diagram-eb165de79748e167.svg)

[Full-size diagram](../../../../diagrams/diagram-eb165de79748e167.svg) · [Mermaid source](../../../../diagrams/diagram-eb165de79748e167.mmd)

### Structural Checks

| Check | What It Validates | On Failure |
|----|----|----|
| **Evidence ID validity** | All evidence IDs referenced in `supportingEvidenceIds` and `contradictingEvidenceIds` exist in the evidence pool | Warning logged |
| **Boundary ID validity** | All boundary IDs in `boundaryFindings` are valid ClaimAssessmentBoundary IDs | Warning logged |
| **Truth percentage range** | `truthPercentage` within 0–100 | Warning logged |
| **Label-band matching** | Verdict label matches truth percentage band via `percentageToClaimVerdict()` (7-point scale mapping, factoring in confidence and `mixedConfidenceThreshold`) | Warning logged |
| **Coverage completeness** | Every claim has \>= 1 evidence item in the coverage matrix, or is explicitly flagged | Warning logged |

**Non-blocking:** Structural inconsistencies are captured for debugging and quality monitoring. They do NOT block the pipeline or alter verdicts.

### What Is NOT Checked (requires LLM)

Per AGENTS.md LLM Intelligence rule, the following are **not allowed** as deterministic checks:

-   Judging whether a verdict's reasoning is semantically consistent with its truth%
-   Assessing whether boundary findings narratively support the overall verdict
-   Any check that interprets text meaning

If semantic consistency checking is desired in the future, it must be routed through an LLM call and made a UCM-toggled quality gate.

------------------------------------------------------------------------

## Gate 4: Confidence Classification

Gate 4 runs after Stage 4 (Verdict) and the Structural Consistency Check. It classifies the **pre-computed** confidence value from each `CBClaimVerdict` into tiers using simple numeric thresholds. It does NOT calculate confidence — confidence is determined during the verdict stage by the LLM debate pattern (Steps 1–4).

### Gate 4 Decision Flow

![Quality Gates Flow diagram 4](../../../../diagrams/diagram-7ca35fd369d1c14a.svg)

[Full-size diagram](../../../../diagrams/diagram-7ca35fd369d1c14a.svg) · [Mermaid source](../../../../diagrams/diagram-7ca35fd369d1c14a.mmd)

### Confidence Tiers

| Confidence Tier  | Threshold                   | Action                       |
|------------------|-----------------------------|------------------------------|
| **HIGH**         | confidence \>= 70           | Publish with full confidence |
| **MEDIUM**       | confidence \>= 40 and \< 70 | Publish with caveats         |
| **LOW**          | confidence \> 0 and \< 40   | Flag for review              |
| **INSUFFICIENT** | confidence = 0              | Mark as UNVERIFIED           |

### What Determines Confidence (during Stage 4, before Gate 4)

Confidence is computed during the verdict debate (Steps 1–4) by the LLM. The following factors influence the LLM's confidence assessment:

| Factor | Influence |
|----|----|
| **Evidence count** per claim | More evidence = higher confidence |
| **Average source quality** | Higher `trackRecordScore` (from Source Reliability) = higher confidence |
| **Evidence agreement** ratio | Strong agreement in one direction = higher confidence; high contradiction = lower confidence |
| **Self-consistency spread** | High spread from Step 2 (parallel Sonnet calls) reduces confidence — indicates unstable verdict |

### High-Harm Confidence Floor (C8)

After Gate 4 classification, claims with `harmPotential` "critical" or "high" are subject to an additional confidence floor (Stammbach/Ash bias mitigation). Claims below the configured minimum confidence (UCM `highHarmMinConfidence`) are downgraded to UNVERIFIED, regardless of their truth percentage. This prevents low-evidence definitive verdicts on potentially harmful topics.

------------------------------------------------------------------------

## Statistics and Audit

Gate 1 and Gate 4 statistics are recorded in `QualityGates` and persisted in the analysis result:

### Gate 1 Statistics

| Field               | Description                                     |
|---------------------|-------------------------------------------------|
| `totalClaims`       | Total claims entering Gate 1                    |
| `passedOpinion`     | Claims that passed the factuality/opinion check |
| `passedSpecificity` | Claims that passed the specificity check        |
| `passedFidelity`    | Claims that passed the fidelity check           |
| `filteredCount`     | Number of claims filtered out                   |
| `overallPass`       | Boolean — true if at least one claim survived   |

### Gate 4 Statistics

| Field              | Description                                |
|--------------------|--------------------------------------------|
| `totalVerdicts`    | Total verdicts entering Gate 4             |
| `highConfidence`   | Verdicts classified as HIGH                |
| `mediumConfidence` | Verdicts classified as MEDIUM              |
| `lowConfidence`    | Verdicts classified as LOW                 |
| `insufficient`     | Verdicts classified as INSUFFICIENT        |
| `publishable`      | HIGH + MEDIUM count (publishable verdicts) |

*The `QualityGates.passed` flag is true when Gate 1 overall passes (at least one claim survives) AND at least one verdict is publishable (HIGH or MEDIUM confidence).*

------------------------------------------------------------------------

## Explanation Quality Check (B-8)

Runs after Stage 5 aggregation and verdict narrative generation. Validates the quality of the `VerdictNarrative` — the structured explanation shown to users. Controlled by UCM `explanationQualityMode`.

### Modes

| Mode | Behavior | LLM Cost |
|----|----|----|
| **off** (default) | No quality check | 0 calls |
| **structural** | Tier 1 only — deterministic structural checks | 0 calls |
| **rubric** | Tier 1 + Tier 2 — structural checks plus LLM rubric evaluation | 1 Haiku call |

### Tier 1: Structural Findings (deterministic)

Four boolean checks on the narrative text:

| Check | Field | What It Detects |
|----|----|----|
| **Evidence cited** | `hasCitedEvidence` | Narrative references evidence quantities (numeric references like "14 items", "9 sources") |
| **Verdict stated** | `hasVerdictCategory` | Verdict label or type is explicitly stated (Unicode-aware: ALL-CAPS tokens, title-case, or percentage) |
| **Confidence statement** | `hasConfidenceStatement` | Confidence level mentioned (percentage like "72%" or fraction like "4/5") |
| **Limitations acknowledged** | `hasLimitations` | Limitations section is substantive (\> 5 characters, excluding "None" / "N/A") |

### Tier 2: Rubric Scores (LLM — Haiku)

Five dimensions, each scored 1–5:

| Dimension | What It Measures |
|----|----|
| **Clarity** | Is the explanation understandable? Avoids jargon, ambiguity, convoluted phrasing? |
| **Completeness** | Addresses all claims? Evidence summary references actual quantities? |
| **Neutrality** | Balanced and impartial? Avoids loaded language or implicit bias? |
| **Evidence Support** | Cites specific evidence? Explains how evidence supports the conclusion? |
| **Appropriate Hedging** | Includes appropriate caveats? Avoids overconfidence? |

**Overall score:** Mean of the 5 dimension scores.

**Quality flags:** String array detecting specific issues (e.g., "overconfident_language", "missing_counterevidence", "vague_key_finding", "no_limitations_acknowledged").

### Output

Attached to `OverallAssessment.explanationQualityCheck` (optional):

-   `mode`: "structural" or "rubric"
-   `structuralFindings`: 4 boolean checks (always present)
-   `rubricScores`: 5 dimension scores + overall + flags (only when mode = "rubric")

------------------------------------------------------------------------

## Source Files

| File | Quality Gate Role |
|----|----|
| `claimboundary-pipeline.ts` | Gate 1 LLM-based validation (`runGate1Validation`), Gate 4 stats (`buildQualityGates`) |
| `verdict-stage.ts` | Structural Consistency Check (`runStructuralConsistencyCheck`), high-harm confidence floor (`enforceHarmConfidenceFloor`) |
| `quality-gates.ts` | Gate 1 structural pre-filter (`validateClaimGate1`, `applyGate1ToClaims`), Gate 4 evidence-based validation (`validateVerdictGate4`, `applyGate4ToVerdicts`) |
| `truth-scale.ts` | `percentageToClaimVerdict` — maps truth% + confidence to verdict label (used by label-band matching) |
| `types.ts` | `QualityGates`, `Gate1Stats`, `Gate4Stats` type definitions |

*Gate 1 is an LLM-backed claim-validation pass that checks fidelity, opinion/specificity, and grounding-aware claim quality before research proceeds. Gate 4 is the final confidence/trust gate applied after verdict generation and calibration.*

### Gate 1: Claim Validation

| Check | Purpose | Current Pass Logic |
|----|----|----|
| Fidelity review | Prevent claim rewrites that import meaning not present in the user's input | Claims that fail fidelity are filtered unless explicitly exempted by decomposition rules |
| Opinion + specificity review | Remove claims that are both too subjective and too underspecified to analyze reliably | Claims failing both are filtered unless thesis-direct rescue applies |
| Grounding-aware specificity | Avoid over-filtering broad claims before evidence is gathered, while still rejecting grounded claims that remain too vague | Uses UCM `claimSpecificityMinimum` (default 0.6) only when preliminary grounding exists |
| Claim-count recovery | Recover a workable decomposition when Stage 1 produces too few assessable claims | Stage 1 reprompts and carries forward the best valid decomposition |

### Gate 4: Confidence Assessment

| Tier | Confidence Band | Meaning | Typical Effect |
|----|----|----|----|
| **HIGH** | 75-100 | Strongly supported, evidence-backed outcome | Publish normally |
| **MEDIUM** | 50-74 | Adequately supported outcome with some residual uncertainty | Publish |
| **LOW** | 25-49 | Fragile or evidence-limited outcome | Publish with visible caveats when applicable |
| **INSUFFICIENT** | 0-24 | No trustworthy high-level conclusion yet | Surfaces as insufficient / unverified outcome |

## Evidence Quality: Defence in Depth

Evidence and verdicts are protected by a **two-phase defence** system. Phase 1 operates before verdict generation (ensuring only quality evidence reaches aggregation). Phase 2 operates after verdict generation (ensuring verdicts are sound).

# Evidence Defence in Depth

![Evidence Defence in Depth diagram 1](../../../../diagrams/diagram-3dd2442d3cec4516.svg)

[Full-size diagram](../../../../diagrams/diagram-3dd2442d3cec4516.svg) · [Mermaid source](../../../../diagrams/diagram-3dd2442d3cec4516.mmd)

*Two-phase defence system: Phase 1 (blue) filters evidence before verdict generation, Phase 2 (yellow) protects verdict quality through source reliability weighting, aggregation pruning, and verdict corrections.*

*Phase 1 (blue) combines LLM extraction, LLM evidence-quality assessment, and structural filtering before verdict generation. Phase 2 (yellow) protects verdict quality through claim-local source portfolios, aggregation checks, confidence calibration, and optional/experimental SR calibration.*

### Phase 1: Evidence Quality (Pre-Verdict)

| Step | Type | What It Filters |
|----|----|----|
| LLM Extraction + Evidence Quality | Soft (LLM) | Extracts evidence, assigns source/evidence metadata, and sets `probativeValue` |
| Structural Filter | Hard (code) | Enforces non-semantic checks such as minimum lengths, excerpt/URL presence, statistic-number presence, and low-`probativeValue` removal |
| Source-Linkage Validation | Hard (code) | Ensures evidence remains tied to a fetched source and structurally valid provenance fields |

### Phase 2: Verdict Quality (Post-Verdict)

| Step | Type | What It Filters |
|----|----|----|
| Claim-Local Source Portfolios | Mixed | Exposes per-claim source concentration and track-record context to debate roles; works with per-source evidence caps to reduce single-source flooding |
| Aggregation Pruning | Hard (code) | Removes tangential / baseless claims, validates contestation factual basis, and keeps report structure aligned to final claim verdicts |
| Verdict Corrections + Calibration | Mixed | Applies reconciliation/correction logic, confidence calibration, and bounded article-level adjustments; optional Stage 4.5 SR calibration remains experimental/off |

## Source Reliability

Source reliability scoring evaluates the credibility of web domains using LLM-based assessment with consensus scoring.

| Feature | Description |
|----|----|
| **7-band credibility scale** | Authoritative (90+), Highly Credible (80-89), Credible (70-79), Moderately Credible (60-69), Mixed (50-59), Low Credibility (30-49), Unreliable (\<30) |
| **LLM evaluation** | Domain assessed for editorial standards, fact-checking history, transparency, bias indicators |
| **Multi-model consensus** | Multiple LLM evaluations averaged for stability (configurable via UCM) |
| **SQLite cache** | Evaluations cached for 90 days (configurable) to avoid redundant LLM calls |
| **Use in live verdicts** | Domain reliability informs source portfolios and debate context; legacy direct evidence weighting is off by default and Stage 4.5 SR calibration remains experimental/off |

For implementation details, see [Source Reliability Deep Dive](../deep-dive/source-reliability/index.md).

## Source Provenance Tracking (Planned)

Source reliability evaluates **where** evidence was published (domain credibility). Source provenance tracking will evaluate **who originally created** the claim — enabling detection of misinformation amplification patterns that domain-level scoring alone cannot catch.

| Pattern | Description | Current Detection |
|----|----|----|
| Single-source amplification | One press release repeated by 10 outlets | Not detected (appears as 10 independent sources) |
| Attribution washing | Advocacy org claim laundered through "news" site | Partially (sourceType helps, but not origin) |
| Wire-service syndication | AP dispatch published verbatim by 20 papers | Not detected (each paper appears independent) |
| State propaganda laundering | Government → state media → wire service | SR catches known state media domains, not the chain |

**Planned approach (3 phases):**

1.  **Phase 1 — Extraction:** Extract `originalCreator` (structured: name + org + role), `originalCreatorType`, `attributionType` (firsthand/quoted/press_release/aggregated/anonymous), and `citedSourceUrl` during Stage 2 evidence extraction. Observational only.
2.  **Phase 1.5 — Debate Integration:** Enrich `sourcePortfolioByClaim` with provenance data. Challenger uses existing `independence_concern` challenge type with provenance grounding. No aggregation changes.
3.  **Phase 2 — Entity Resolution:** LLM-based creator canonicalization across language variants (WHO = World Health Organization = OMS) and graduated independence assessment per `ClaimAssessmentBoundary`.

**Status:** Design complete, implementation parked. See `Docs/WIP/2026-04-04_Source_Provenance_Tracking_Design.md`.

## Confidence Calibration

A 4-layer deterministic post-processing system prevents misleading confidence scores.

![Quality and Trust diagram 1](../../../../diagrams/diagram-6e626aded2fd3805.svg)

[Full-size diagram](../../../../diagrams/diagram-6e626aded2fd3805.svg) · [Mermaid source](../../../../diagrams/diagram-6e626aded2fd3805.mmd)

*Raw LLM confidence passes through 4 calibration layers: density anchor sets a minimum floor based on evidence quality, band snapping reduces jitter by aligning to a 7-band system, verdict coupling ensures strong verdicts have adequate confidence, and context consistency penalises divergent confidence across analysis contexts.*

| Layer | Purpose | Effect |
|----|----|----|
| **Evidence density anchor** | Sets minimum confidence floor based on evidence quality and quantity | Floor ranges from 15% (minimal evidence) to 75% (strong evidence) |
| **Band snapping** | Aligns confidence to a 7-band system with partial blending (strength 0.5) | Reduces run-to-run jitter by ~5-10pp |
| **Verdict-confidence coupling** | Ensures strong verdicts (\>=70% or \<=30% truth) have confidence \>= 50% | Prevents "TRUE with 20% confidence" anomalies |
| **Context consistency** | Penalises confidence divergence \>25pp across analysis contexts | Ensures consistent confidence across perspectives |

### Additional Confidence Penalties

| Penalty | Trigger | Effect |
|----|----|----|
| **Graduated recency penalty** | Evidence is dated (staleness x volatility x volume formula) | Reduces confidence proportionally to evidence age |
| **Low-source penalty** | 2 or fewer sources found | -15pp confidence (configurable) |
| **Confidence floor** | Always applied | Minimum 10% confidence (configurable) |

All calibration layers are configurable via UCM (`confidenceCalibration` in Pipeline Config) and can be individually toggled on/off.

## Deep Dives

-   [Quality Gates](../deep-dive/quality-gates/index.md) — Detailed Gate 1 and Gate 4 reference with examples
-   [Evidence Quality Filtering](../deep-dive/evidence-quality-filtering/index.md) — Detailed 7-layer filtering pipeline (code-level reference), filter rules, troubleshooting
-   [Source Reliability](../deep-dive/source-reliability/index.md) — Evaluation methodology, caching, multi-language support
-   [Confidence Calibration](../deep-dive/confidence-calibration/index.md) — Layer-by-layer detail, formulas, configuration reference
-   [Calculations and Verdicts](../deep-dive/calculations-and-verdicts/index.md) — Aggregation hierarchy, weighting formulas

------------------------------------------------------------------------

**Navigation:** [Architecture](../index.md) \| Prev: [Storage and Configuration](../storage-and-configuration/index.md) \| Next: [Security and Operations](../security-and-operations/index.md)
