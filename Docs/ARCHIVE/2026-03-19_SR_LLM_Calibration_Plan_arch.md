# Source Reliability LLM Calibration Plan

**Date:** 2026-03-19  
**Author Role:** Senior Developer  
**Agent/Tool:** Codex (GPT-5)  
**Status:** Draft

---

## Goal

Replace the current deterministic SR verdict-compression formula with a bounded, LLM-mediated calibration step that uses richer SR details without bluntly dragging truth percentages toward `50`.

The current implementation in [source-reliability.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/source-reliability.ts) is too lossy:
- it reduces SR to a single averaged numeric weight
- it only applies to supporting evidence
- it ignores richer SR outputs already available from cache/evaluation
- it directly compresses truth percentage and confidence in a hard-coded way

The experiment on 2026-03-19 showed that disabling this weighting improved:
- Iran: `65-68` weighted -> `82`
- Bolsonaro EN various: `51` -> `64`
- Hydrogen: direction stable, confidence stronger
- Plastik: still structurally bad, confirming SR is not the main issue there

Conclusion: the current formula should not remain the production mechanism.

---

## Recommendation

Implement **Stage 4.5: SR LLM Calibration** as a separate, bounded post-verdict pass.

Design principles:
- SR should **not** directly own verdict direction.
- SR should primarily calibrate **confidence**, **warnings**, and **small bounded trust adjustments**.
- Support and contradiction must be handled **symmetrically**.
- Unknown sources must not be treated as automatically unreliable.
- Rich SR details should be preserved and surfaced, not collapsed to one average.

Short-term policy until this lands:
- Keep `evidenceWeightingEnabled=false`
- Do not further tune the current numeric formula

Model recommendation:
- use **Haiku / understand-tier strength** for the calibration call
- do **not** use Sonnet by default for this step
- this is a narrow structured classification/calibration task, not open-ended deep reasoning

---

## Where To Insert It

### Current path

In [claimboundary-pipeline.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claimboundary-pipeline.ts), the current SR block runs here:
- after `recordGate4Stats(claimVerdicts)`
- before `aggregateAssessment(...)`

Current block:
- [claimboundary-pipeline.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claimboundary-pipeline.ts#L529)
- [claimboundary-pipeline.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claimboundary-pipeline.ts#L535)

It currently does:
1. detect whether at least one source has `trackRecordScore`
2. call `applyEvidenceWeighting(...)`
3. overwrite each claim verdict’s `truthPercentage`, `confidence`, `verdict`

### Proposed path

Replace that block with:
1. collect SR calibration inputs per claim
2. call new `calibrateVerdictsWithSourceReliability(...)`
3. apply only bounded, structured adjustments
4. emit SR-specific warnings/metadata
5. pass calibrated verdicts into `aggregateAssessment(...)`

This should remain **after Stage 4 / Gate 4 raw verdict generation** and **before Stage 5 aggregation**.

Reason:
- raw verdict logic remains visible and measurable
- calibration stays separate from debate generation
- aggregation receives the final publishable claim verdicts

---

## Proposed Architecture

### New module

Add a dedicated module:
- `apps/web/src/lib/analyzer/source-reliability-calibration.ts`

Responsibilities:
- build compact SR calibration payloads from verdicts + evidence + sources
- batch claims into one structured LLM call
- parse structured calibration results
- apply bounded adjustments to `CBClaimVerdict[]`
- emit `AnalysisWarning[]` for SR concerns

This module should not fetch or evaluate SR itself. It consumes already-computed SR data.

### Why a separate module

Do not bury this inside [source-reliability.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/source-reliability.ts).

That file should remain responsible for:
- domain scoring
- caching
- lookup
- SR metadata utilities

The new calibration step is not “source reliability lookup”; it is verdict-time reasoning about how SR should affect trust in the verdict.

---

## Data It Should Use

### Already available today

From [source-reliability.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/source-reliability.ts):
- `trackRecordScore`
- `trackRecordConfidence`
- `trackRecordConsensus`

From cached evaluation output already stored by `setCachedScore(...)`:
- `reasoning`
- `category`
- `biasIndicator`
- `evidenceCited`
- `identifiedEntity`
- `sourceType`

From evidence and verdict state:
- supporting evidence IDs
- contradicting evidence IDs
- source URLs and domains
- evidence `sourceType`
- evidence `probativeValue`
- final raw claim verdict truth/confidence

### Gap

The current hot-path source objects do not carry enough SR explanation detail into Stage 4/5.

To use rich SR details, add a lightweight enriched shape to the runtime source model or build an auxiliary lookup object before Stage 4.5.

Recommended shape:

```ts
interface SourceReliabilitySummary {
  score: number | null;
  confidence: number | null;
  consensusAchieved: boolean | null;
  category?: string | null;
  sourceType?: string | null;
  biasIndicator?: string | null;
  reasoningShort?: string | null;
}
```

Do not pass full SR evidence packs into the verdict prompt by default. Keep token use bounded.

---

## LLM Interface

### Preferred implementation path

Use the existing text-analysis infrastructure pattern, not ad hoc LLM wiring.

Relevant existing files:
- [text-analysis-types.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/text-analysis-types.ts)
- [text-analysis-llm.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/text-analysis-llm.ts)

Two viable options:

1. **Add a new text-analysis call**
- pros: clean separation, structured schema, reuse retry/parse telemetry path
- cons: requires a new prompt profile and prompt plumbing

2. **Add a new ClaimBoundary prompt section and call it through `createProductionLLMCall(...)`**
- pros: fits current pipeline-local prompt loading
- cons: less reusable than text-analysis service

Recommendation:
- use **Option 1** if we expect SR calibration to become reusable across pipelines
- use **Option 2** if we want the smallest implementation surface in ClaimBoundary only

Given current repo structure, **Option 2 is probably the fastest first implementation**.
This should be the first implementation path.

### Prompt profile / prompt storage

If Option 1 is chosen, add a new prompt profile such as:
- `text-analysis-sr-calibration`

That requires updating:
- `apps/web/src/lib/config-storage.ts` (`VALID_PROMPT_PROFILES`)
- admin config prompt profile lists
- prompt file seeding

If Option 2 is chosen, add a new section to:
- [claimboundary.prompt.md](C:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md)

Important repo rule:
- prompt text changes under `apps/web/prompts/` require explicit human approval

So implementation should separate:
- code plumbing
- prompt content approval

---

## Proposed Request / Response Shapes

### Request

Add a compact request shape:

```ts
interface SRCalibrationClaimInput {
  claimId: string;
  claimText: string;
  rawTruthPercentage: number;
  rawConfidence: number;
  supportSources: Array<{
    sourceId: string;
    domain: string;
    srScore: number | null;
    srConfidence: number | null;
    srConsensus: boolean | null;
    srCategory?: string | null;
    srSourceType?: string | null;
    srBiasIndicator?: string | null;
    evidenceCount: number;
    avgProbativeValue?: "high" | "medium" | "low" | null;
  }>;
  contradictSources: Array<...same shape...>;
}
```

Batch all claims in a single call:

```ts
interface SRCalibrationRequest {
  thesis: string;
  claims: SRCalibrationClaimInput[];
}
```

Prompt scope requirement:
- the calibration prompt must explicitly say it is **not re-evaluating individual evidence items**
- it must assess **source-portfolio reliability patterns** across support and contradiction
- it should answer whether the source portfolio on one side shows a **systematic trust imbalance** that the raw verdict may not have fully reflected

Required prompt guardrail:
- "You are NOT re-evaluating the evidence itself. You are assessing whether the source portfolio on each side has systematic reliability imbalances."

### Response

Keep output tightly bounded:

```ts
interface SRCalibrationResult {
  claimId: string;
  adjustmentMode: "none" | "confidence_only" | "bounded_truth_and_confidence";
  trustDeltaTruth: number;      // bounded, e.g. -8..+8
  trustDeltaConfidence: number; // bounded, e.g. -15..+10
  concernLevel: "none" | "low" | "medium" | "high";
  concernType:
    | "none"
    | "support_quality_weak"
    | "contradiction_quality_weak"
    | "support_bias_concentration"
    | "contradiction_bias_concentration"
    | "unknown_source_dominance"
    | "mixed_sr_signal";
  rationale: string;
}
```

Hard constraints in code:
- clamp truth delta
- clamp confidence delta
- never allow SR calibration alone to flip a claim across the full spectrum
- no direction flip without both:
  - strong symmetric SR evidence
  - explicit config allowing bounded truth adjustment

Raw verdict preservation is mandatory:
- store `rawTruthPercentage`
- store `rawConfidence`
- store applied deltas separately

---

## How To Apply The Output

### Phase 1 rollout

First implementation should be conservative:
- default mode: **confidence-only**
- truth adjustment disabled by default
- SR emits warnings and metadata even when no numeric adjustment is applied

Application logic:
- `truthPercentage`: unchanged
- `confidence`: adjust within bounded range
- `verdict`: recompute only if confidence tier crosses a threshold or if bounded truth adjustment is explicitly enabled

This gets value from SR without repeating the current compression failure.

Important validation caveat:
- a confidence-only calibration must **not** be treated as successful if it merely lifts a structurally bad claim from `UNVERIFIED` to `MIXED`
- for Plastik-like cases, a band change caused only by SR calibration is a false positive, not a quality win

### Phase 2 rollout

If phase 1 is stable, allow limited truth adjustment:
- max `±5` by default
- only when support and contradiction both have meaningful SR coverage
- only when concern is clearly directional and not just sparse/unknown

### Never do this

- no `50 + (truth - 50) * avgWeight`
- no support-only weighting
- no direct penalty for “unknown” alone
- no unbounded truth override from SR

---

## Symmetry Requirement

The current implementation is asymmetric because it only looks at `supportingEvidenceIds`.

The new calibration must explicitly compare:
- support-side SR profile
- contradiction-side SR profile

Example:
- if support is mostly low-confidence unknown sources but contradiction is government/peer-reviewed, calibration may reduce confidence or slightly reduce truth
- if contradiction is weak/opinion-heavy and support is strong/institutional, calibration may increase confidence

This must be computed from both evidence sets every time.

---

## Warnings And Transparency

### New warning types

Add SR-specific warning types to the central registry in:
- [types.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/types.ts)
- [warning-display.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/warning-display.ts)

Suggested warnings:
- `source_reliability_support_concern`
- `source_reliability_contradiction_concern`
- `source_reliability_mixed_signal`
- `source_reliability_unknown_dominance`

Severity guidance:
- mostly `info` or `warning`
- not `error` unless SR calibration failure means report quality may materially differ

Do not classify these inline in UI code.

### Result transparency

Extend `CBClaimVerdict` with a structured calibration payload, for example:

```ts
sourceReliabilityCalibration?: {
  applied: boolean;
  mode: "none" | "confidence_only" | "bounded_truth_and_confidence";
  truthDelta: number;
  confidenceDelta: number;
  concernLevel: "none" | "low" | "medium" | "high";
  concernType: string;
  supportProfile: {
    knownSources: number;
    unknownSources: number;
    avgScore?: number | null;
  };
  contradictionProfile: {
    knownSources: number;
    unknownSources: number;
    avgScore?: number | null;
  };
  rationale: string;
}
```

This is preferable to the current very thin:
- `evidenceWeight`
- `sourceReliabilityMeta`

---

## Config Changes

Anything affecting output should be UCM-configurable.

### Pipeline config

Add new pipeline-level settings in:
- [config-schemas.ts](C:/DEV/FactHarbor/apps/web/src/lib/config-schemas.ts)
- `apps/web/configs/pipeline.default.json`

Suggested fields:

```ts
sourceReliabilityCalibrationEnabled: boolean
sourceReliabilityCalibrationMode: "off" | "confidence_only" | "bounded_truth_and_confidence"
sourceReliabilityCalibrationTruthDeltaMax: number
sourceReliabilityCalibrationConfidenceDeltaMax: number
sourceReliabilityCalibrationMinKnownSourcesPerSide: number
sourceReliabilityCalibrationUnknownDominanceThreshold: number
```

### Calculation config

Move any numeric bounds that are clearly calibration math, not pipeline routing, into calc if preferred. But keep ownership consistent.

Recommendation:
- keep enable/mode in **pipeline**
- keep numeric bounds in **calculation**

### Remove / deprecate

Deprecate:
- `evidenceWeightingEnabled`

Do not delete immediately. Keep it for:
- rollback safety
- migration period
- experiment comparison

But mark it legacy and ensure only one SR mechanism runs at a time.

---

## Concrete File Changes

### New files

- `apps/web/src/lib/analyzer/source-reliability-calibration.ts`

Optional if using text-analysis pattern:
- prompt file for SR calibration
- request/response schemas in text-analysis modules

### Existing files to change

- [claimboundary-pipeline.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claimboundary-pipeline.ts)
  - replace current `applyEvidenceWeighting(...)` block
  - insert Stage 4.5 event emission

- [source-reliability.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/source-reliability.ts)
  - keep lookup/cache functionality
  - mark `applyEvidenceWeighting(...)` as legacy
  - add helper to extract richer SR summaries if useful

- [types.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/types.ts)
  - add raw verdict preservation fields or nested equivalents in calibration metadata
  - add `sourceReliabilityCalibration` metadata to `CBClaimVerdict`
  - add new warning types

- [config-schemas.ts](C:/DEV/FactHarbor/apps/web/src/lib/config-schemas.ts)
  - add config fields
  - add defaults

- `apps/web/configs/pipeline.default.json`
- `apps/web/configs/calculation.default.json`
  - keep JSON and TS defaults in sync

- [warning-display.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/warning-display.ts)
  - register all new warning types

- admin config UI
  - expose new UCM controls

If using text-analysis service:
- [text-analysis-types.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/text-analysis-types.ts)
- [text-analysis-llm.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/text-analysis-llm.ts)

---

## Stage 4.5 Execution Sketch

In [claimboundary-pipeline.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claimboundary-pipeline.ts):

```ts
recordGate4Stats(claimVerdicts);

if (initialPipelineConfig.sourceReliabilityCalibrationEnabled ?? false) {
  onEvent("Calibrating verdict trust with source reliability...", 88);
  claimVerdicts = await calibrateVerdictsWithSourceReliability(
    claimVerdicts,
    state.evidenceItems,
    state.sources,
    state.understanding?.articleThesis ?? state.originalInput,
    {
      pipelineConfig: initialPipelineConfig,
      calcConfig: initialCalcConfig,
      warnings: state.warnings,
      llmCall: createProductionLLMCall(...),
    },
  );
}

const assessment = await aggregateAssessment(...);
```

Notes:
- do not mutate raw Stage 4 outputs before recording them if we still want raw-vs-calibrated diagnostics
- store both `rawTruthPercentage` and `rawConfidence` in calibration metadata before applying any adjustment

---

## Token Budget Guardrails

This step must stay cheap and bounded.

Per claim:
- max **5 support-side sources**
- max **5 contradiction-side sources**
- choose sources by highest `probativeValue`, then strongest SR signal, then evidence count

Field truncation:
- `reasoningShort`: max `100` chars
- no full SR evidence packs
- no long evidence excerpts

Batch target:
- keep the whole request under roughly **2000 input tokens**

If the batch would exceed budget:
- drop lowest-value sources first
- keep all claims in one call if possible
- split the batch only when strictly necessary

---

## Rollout Plan

### Phase 0

Immediate:
- keep current production setting with SR weighting disabled

### Phase 1

Implement Stage 4.5 in `confidence_only` mode:
- warnings + metadata
- bounded confidence adjustment only
- no truth adjustment

Validation target:
- Hydrogen should remain directionally stable
- Iran should not be pushed back into the high-60s
- Bolsonaro should not regress back toward the weighted `MIXED` outcome
- Plastik must not be counted as improved if SR calibration alone only upgrades its confidence/verdict band without fixing claim decomposition

### Phase 2

Enable optional bounded truth adjustment behind UCM:
- small cap
- only with symmetric support/contradiction SR coverage

### Phase 3

Remove or hard-disable the old numeric formula once calibration is validated.

---

## Implementation Order

Proceed in this order:

1. **Types and config**
- `types.ts`
- `config-schemas.ts`
- `apps/web/configs/pipeline.default.json`
- `warning-display.ts`
- no behavior change yet

2. **Module skeleton**
- add `source-reliability-calibration.ts`
- define request/response types
- build application logic with a stubbed calibration result path

3. **Pipeline wiring**
- replace the legacy `applyEvidenceWeighting(...)` block in `claimboundary-pipeline.ts`
- wire Stage 4.5 with feature-flag control

4. **Tests**
- bounded application logic
- warning emission
- raw verdict preservation
- legacy path disabled when new path enabled

5. **Prompt content**
- separate approval step
- only after prompt approval add the actual calibration prompt text

6. **Reseed and validate**
- run the five-claim control set

This sequencing allows the plumbing to proceed before prompt approval.

---

## Testing Strategy

Do not start with expensive broad LLM test suites.

### Safe verification

- unit tests for:
  - request building
  - bounded application logic
  - warning emission
  - legacy path disabled when new path enabled

- build verification:
  - `npm -w apps/web run build`

### Targeted live validation

Re-run the same control set:
- Iran
- Bolsonaro EN single
- Bolsonaro EN various
- Hydrogen
- Plastik

Success criteria:
- Iran stays in the low/mid-80s rather than collapsing to high-60s
- Hydrogen remains `MOSTLY-FALSE`
- Bolsonaro various does not fall back to `MIXED`
- Plastik does not falsely appear “solved”; confidence may improve, but claim-shape issue remains

---

## Risks

### 1. Prompt overreach

If the SR calibration prompt is too powerful, it can become a second verdict generator. That would blur accountability and make debugging harder.

Mitigation:
- keep it bounded
- keep schema narrow
- prefer confidence/warnings first

### 2. Token bloat

Full SR evidence packs are too large.

Mitigation:
- pass summarized SR fields only
- batch claims once

### 3. Double counting

If verdict-stage already implicitly reasons about source quality, SR calibration can double-penalize.

Mitigation:
- bounded deltas
- monitor for systematic compression again

### 4. Hidden policy drift

If new warnings are not classified centrally, UI behavior will drift.

Mitigation:
- register every warning in `warning-display.ts`

---

## Decision

Recommended next implementation step:

1. Approve prompt-level work for a new SR calibration prompt section/profile
2. Implement Stage 4.5 in `confidence_only` mode
3. Keep legacy `evidenceWeightingEnabled` off
4. Validate on the same five-claim control set

This is the most credible path to preserving SR signal without repeating the broad truth-compression regression.
