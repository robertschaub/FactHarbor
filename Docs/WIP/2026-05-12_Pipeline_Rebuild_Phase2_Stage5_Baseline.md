# Pipeline Rebuild Phase 2 Stage 5 Baseline

**Date:** 2026-05-12  
**Status:** Phase 2 factual baseline checkpoint, read-only  
**Owner role:** Lead Architect  
**Worktree:** `C:\DEV\FactHarbor-pipeline-rebuild-spec`  
**Branch:** `codex/pipeline-rebuild-spec`

---

## 1. Purpose

This document reverse-engineers the current Stage 5 aggregation, article-level assessment, narrative/report quality, and downstream report compatibility behavior of the ClaimAssessmentBoundary pipeline. It is factual baseline material for the later redesign. It is not a target architecture and does not approve implementation cleanup.

No analyzer source, prompt, config, API, UI, tests, live jobs, or validation behavior was changed or run for this baseline.

## 2. Source Scope

Primary files:

- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
- `apps/web/src/lib/analyzer/aggregation-stage.ts`
- `apps/web/src/lib/analyzer/types.ts`
- `apps/web/src/lib/analyzer/truth-scale.ts`
- `apps/web/src/lib/analyzer/warning-display.ts`
- `apps/web/src/lib/analyzer/model-resolver.ts`
- `apps/web/src/lib/config-schemas.ts`
- `apps/web/configs/pipeline.default.json`
- `apps/web/configs/calculation.default.json`
- `apps/web/prompts/claimboundary.prompt.md`
- `apps/api/Services/JobService.cs`
- `apps/api/Controllers/JobsController.cs`
- `apps/api/Controllers/MetricsController.cs`
- `apps/web/src/app/jobs/[id]/page.tsx`
- `apps/web/src/app/jobs/[id]/utils/generateHtmlReport.ts`
- `apps/web/src/components/FallbackReport.tsx`
- `apps/web/src/components/QualityGatesPanel.tsx`

Relevant tests:

- `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`
- `apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts`
- `apps/web/test/unit/lib/analyzer/prompt-frontmatter-drift.test.ts`
- `apps/web/test/unit/lib/analyzer/warning-display.test.ts`
- `apps/web/test/unit/lib/analyzer/metrics-integration.test.ts`
- `apps/web/test/unit/lib/analyzer/metrics.test.ts`
- `apps/web/test/unit/lib/config-drift.test.ts`
- `apps/web/test/unit/lib/config-schemas.test.ts`
- `apps/api.Tests/Services/JobServiceTests.cs`

Specialist read-only baselines used:

- Stage 5 aggregation mechanics: `019e1e47-6b42-76f3-99e5-f9bd121adb92`
- Report/API/UI/export compatibility: `019e1e47-6b9a-70b3-9304-ae8a39742764`
- Stage 5 prompt/config/model/tests: `019e1e47-6bf8-7222-baf7-8076c0f77647`

## 3. Current Stage 5 Boundary

Stage 5 starts after Stage 4 verdict generation and after several late pre-aggregation steps:

- D5 fallback verdicts are added for claims that lacked sufficient evidence for Stage 4.
- Duplicate verdict invariants are checked.
- Optional Stage 4.5 source-reliability calibration or legacy weighting may adjust claim verdicts.
- A report coverage matrix is built.

The primary Stage 5 entry point is `aggregateAssessment(claimVerdicts, boundaries, evidence, coverageMatrix, state)` in `aggregation-stage.ts`.

Stage 5 currently owns:

- article-level truth/confidence aggregation from per-AtomicClaim verdicts,
- claim-weight calculation,
- `contradicts_thesis` truth inversion,
- zero-weighting non-direct thesis-relevance verdicts,
- optional article-level LLM adjudication,
- verdict narrative generation,
- overall truth range aggregation,
- `qualityGates` reporting object creation,
- `OverallAssessment` assembly.

The pipeline then performs post-Stage-5 report quality work before result JSON is finalized:

- explanation-quality structural/rubric check when `explanationQualityMode !== "off"`,
- optional TIGERScore when `tigerScoreMode === "on"`,
- result JSON assembly,
- markdown report formatting,
- output quality metrics recording.

## 4. Current Execution Sequence

The effective flow is:

1. Load UCM pipeline and calculation config inside `aggregateAssessment`, with default fallback and console warnings on load failure.
2. Compute and mutate `triangulationScore` on each `CBClaimVerdict`.
3. Compute per-claim aggregation weights.
4. Convert each verdict into effective article direction:
   - `claimDirection === "contradicts_thesis"` uses `100 - truthPercentage`.
   - `thesisRelevance !== "direct"` remains visible but receives weight `0`.
5. Compute baseline weighted truth and confidence.
6. Cap weighted confidence if any verdict carries `verdict_integrity_failure`.
7. Optionally run article adjudication when enabled and triggered by direction conflict or borderline direct-claim conditions.
8. Generate verdict narrative.
9. Build quality-gate summary and overall truth range.
10. Return `OverallAssessment`.
11. Run explanation-quality and optional TIGERScore checks in `claimboundary-pipeline.ts`.
12. Build persisted `resultJson` and `reportMarkdown`.

## 5. Aggregation Mechanics

The current claim-weight formula combines structural and LLM-derived fields:

`centrality * harm * confidence * (1 + triangulationFactor) * derivativeFactor * anchorFactor * probativeFactor`

Inputs include:

- `centrality` from Stage 1 claim extraction.
- `harmPotential` from Stage 1 claim extraction.
- Stage 4 verdict confidence.
- triangulation across ClaimAssessmentBoundaries.
- derivative-evidence flags on supporting evidence.
- anchor-preservation metadata on AtomicClaims.
- `probativeValue` from extracted evidence.

UCM calculation defaults include:

- centrality weights: high `3`, medium `2`, low `1`;
- harm multipliers: critical `1.5`, high `1.2`, medium `1.0`, low `1.0`;
- triangulation: strong boost `0.15`, moderate boost `0.05`, single-boundary penalty `-0.10`;
- derivative multiplier `0.5`;
- anchor claim multiplier `2.5`;
- probative value weights: high `1.0`, medium `0.9`, low `0.5`;
- mixed confidence threshold `45`.

If total aggregation weight is zero, the baseline aggregate defaults to truth `50` and confidence `0`. This is a safe fallback but should be treated as a visible analysis state in the target contract.

## 6. Article Adjudication

Article adjudication is enabled by default in `calculation.default.json`.

It is an optional LLM synthesis layer that can move the article-level result away from the baseline weighted average when the structural gate detects:

- direct claims pointing in different article directions, excluding borderline truth values around the configured margin;
- or direct claims near the mixed/borderline band.

The LLM surface is `ARTICLE_ADJUDICATION`. It receives:

- original input,
- claim verdicts,
- AtomicClaims,
- contract validation summary,
- baseline truth and confidence,
- evidence summary.

Runtime behavior:

- model task: verdict model via `getModelForTask("verdict")`;
- temperature: hardcoded `0.1`;
- output: structured schema;
- guards: max deviation from baseline, bounds clamp, max confidence ceiling, integrity downgrade, dominant-claim validation.

Failure behavior currently falls back to the baseline path without a user-visible warning. That is a compatibility and observability issue for the redesign because an LLM decision point silently becoming a structural weighted average can materially affect the article result.

## 7. Narrative, Explanation Quality, And TIGER

### Verdict Narrative

`VERDICT_NARRATIVE` is always attempted after final truth/confidence are determined. It is explicitly explanatory:

- it cannot change truth;
- it can only lower confidence through `adjustedConfidence`;
- it receives report language, current date, aggregation values, claim verdicts, boundaries, methodology highlights, and evidence summary.

Fallback behavior is deterministic and English-only. It does not currently append an analysis warning.

### Explanation Quality

`explanationQualityMode` defaults to `rubric`. Current behavior:

- structural check uses deterministic regex/format checks over the generated narrative;
- rubric mode calls `EXPLANATION_QUALITY_RUBRIC` through the production LLM wrapper;
- rubric failure emits `explanation_quality_rubric_failed` as `info` and falls back to structural-only state.

### TIGERScore

TIGERScore is effectively Stage 6/beta behavior:

- `tigerScoreMode` defaults to `off`;
- when enabled, it calls `TIGER_SCORE_EVAL`;
- it uses `tigerScoreStrength` default `standard` and `tigerScoreTemperature` default `0.1`;
- failure emits `tiger_score_failed` as `info`.

## 8. Quality Gates And Result JSON

`buildQualityGates` creates a reporting object. It is not the active enforcement mechanism for Stage 4 verdict generation.

Current `qualityGates` shape:

- `passed`
- `gate1Stats`
- `gate4Stats`
- `summary`

Current Gate 4 reporting thresholds in `buildQualityGates` differ from other Stage 4 threshold schemes:

- high confidence: `confidence >= 70`;
- medium confidence: `confidence >= 40`;
- low confidence: `confidence > 0 && confidence < 40`;
- insufficient: `confidence === 0`;
- publishable: high + medium.

This differs from:

- Stage 4 verdict tiering: high `>=75`, medium `>=50`, low `>=25`, otherwise insufficient.
- metrics confidence buckets: high `>=80`, medium `>=50`, low `>=30`, insufficient `>0`, unpublishable `0`.

The current persisted CB result contract is assembled by `buildClaimBoundaryResultJson`. Important fields:

- `_schemaVersion: "3.2.0-cb"`;
- `meta`;
- `languageIntent`;
- top-level `truthPercentage`, `verdict`, `confidence`, `truthPercentageRange`;
- `verdictNarrative`;
- `articleAdjudication`;
- `adjudicationPath`;
- `claimBoundaries`;
- `claimVerdicts`;
- `coverageMatrix`;
- `understanding`;
- `evidenceItems`;
- `sources` and `citedSources`;
- `searchQueries`;
- `claimAcquisitionLedger`;
- `analysisObservability`;
- `qualityGates`;
- `analysisWarnings`.

This top-level contract is the external compatibility surface for API persistence, job list display, job detail UI, markdown, static HTML export, validation tooling, calibration tooling, and metrics.

## 9. Prompt, Model, And Config Baseline

Stage 5 prompt sections in `claimboundary.prompt.md`:

- `VERDICT_NARRATIVE`
- `ARTICLE_ADJUDICATION`
- `CLAIM_GROUPING`
- `EXPLANATION_QUALITY_RUBRIC`
- `TIGER_SCORE_EVAL`

Observed runtime calls:

- `VERDICT_NARRATIVE` is active.
- `ARTICLE_ADJUDICATION` is active.
- `EXPLANATION_QUALITY_RUBRIC` is active when rubric mode is enabled.
- `TIGER_SCORE_EVAL` is active when TIGERScore mode is enabled.
- `CLAIM_GROUPING` appears to be an orphan prompt section; no runtime call site was found.

Model/config notes:

- narrative and article adjudication share the verdict model task.
- article adjudication temperature is hardcoded and not currently UCM-tunable.
- explanation rubric uses a legacy tier label (`haiku`) rather than the current strength abstraction used elsewhere.
- prompt frontmatter `requiredSections` includes relevant sections, but frontmatter `variables` is stale/incomplete for Stage 5 variables.

## 10. Report, API, UI, Export, And Metrics Compatibility

Downstream consumers currently reinterpret several Stage 5 outputs instead of treating the persisted result as authoritative.

Known compatibility constraints and drift points:

- `JobService.StoreResultAsync` persists full `resultJson` and `reportMarkdown`, but derives `Job.TruthPercentage`, `Job.Confidence`, and `Job.VerdictLabel` from numeric fields. It ignores top-level `result.verdict` and truncates numeric truth/confidence into integers.
- `JobService.MapPercentageToVerdict` has hardcoded thresholds that must stay aligned with `truth-scale.ts`.
- The job page CB verdict banner derives the displayed verdict from `percentageToArticleVerdict(result.truthPercentage, result.confidence)` rather than `result.verdict`.
- Static HTML export reads `result.overallVerdict` or falls back to the first claim verdict, not the current top-level `result.verdict`.
- Static HTML export expects old quality-gate fields (`allPassed`, `gate1`, `gate4`) rather than current `passed`, `gate1Stats`, `gate4Stats`, `summary`.
- Static HTML export does not include an `analysisWarnings` section.
- Markdown report formatting filters raw warning severities `warning` and `error`; the UI uses `warning-display.ts`, which can promote degrading `info` warnings to displayed warnings.
- `FallbackReport` uses the warning registry and is closer to the intended warning-display contract than markdown/export.
- `QualityGatesPanel` consumes the current `qualityGates` shape.
- The job page's quality/warning block is nested under the verdict narrative section, so a future result without narrative could hide warnings/gates.
- `JobsController.ExtractPrimaryAnalysisIssue` only recognizes `analysis_generation_failed`.
- `MetricsController` reads older top-level `gate1Stats`/`gate4Stats` shapes, while CB result JSON nests them under `qualityGates`.
- metrics integration has warning-severity classification logic that differs from `warning-display.ts`.
- `articleAdjudication` and `adjudicationPath` are persisted but have no observed first-class UI, markdown, or HTML display surface.

The target architecture should define one canonical external result contract and adapters for legacy consumers. API/UI/export should not independently recalculate verdict identity unless explicitly required for backward compatibility.

## 11. Warning And Observability Behavior

Current Stage 5/report warning behavior is uneven:

- article adjudication failure falls back silently;
- narrative generation failure falls back silently and in English;
- explanation rubric failure emits `info`;
- TIGER failure emits `info`;
- markdown uses raw severity;
- UI uses display classification from `warning-display.ts`;
- static HTML export omits warnings.

The redesign should preserve the Captain warning policy: severity is based on verdict impact, not internal event type. A single display classifier should drive UI, markdown, export, and summary behavior unless a consumer has a documented reason to show a stricter diagnostic view.

## 12. Multilingual And Input-Neutrality Considerations

Preserved mechanisms:

- narrative receives `reportLanguage`;
- prompts are broadly topic-neutral and instruct preservation of source language where relevant;
- article adjudication receives original input and contract validation summary rather than relying on English-only labels.

Risks:

- narrative fallback is English-only;
- structural explanation checks use regex/digit/uppercase patterns;
- anchor matching uses lowercase substring matching;
- static report labels are English-only UI/report text;
- independent verdict derivations may not preserve future report-language or label policy.

The target design should keep report-language behavior explicit and ensure fallback paths are language-neutral or classified as degraded.

## 13. Deterministic Semantic Hotspots

These are factual current-state hotspots for later LLM-vs-structural classification:

- Exact lowercase substring matching for anchor preservation influences claim weights.
- Structural explanation checks use regex and text-form heuristics over generated narrative.
- Article-adjudication routing uses deterministic thresholds over LLM-produced semantic labels and truth values.
- Weighted aggregation is deterministic math over LLM-derived semantic fields; it is acceptable as structural aggregation only if inputs and weights are governed as contracts.
- `contradicts_thesis` inversion and non-direct zero-weighting are structural contract rules, but they are high-impact and must remain explicit.
- Static HTML export and API/UI displays derive verdict labels independently from truth/confidence.
- Warning display semantics are duplicated across markdown, UI, metrics, and API summaries.
- Prompt frontmatter variable drift weakens prompt governance.

## 14. Tests And Gaps

Observed coverage includes:

- triangulation behavior;
- derivative evidence factor;
- narrative generation;
- confidence cap from narrative;
- contradiction inversion;
- non-direct exclusion;
- article adjudication paths and guards;
- explanation structure/rubric behavior;
- prompt contracts for narrative and article adjudication;
- config default drift for TIGER/explanation defaults;
- warning display registry behavior.

Known gaps:

- no direct test for `anchorClaimMultiplier`;
- no direct test for `probativeValueWeights`;
- no direct test for nested `harmPotentialMultipliers` in active aggregation;
- no user-warning test for article-adjudication LLM failure;
- no direct coverage for invalid dominant-claim cleanup;
- no TIGER success/failure tests found;
- no prompt-contract tests for `EXPLANATION_QUALITY_RUBRIC`, `TIGER_SCORE_EVAL`, or orphan `CLAIM_GROUPING`;
- no test catches prompt frontmatter variable drift;
- no focused API test for CB verdict extraction/label drift in `StoreResultAsync`;
- no static HTML export tests for current CB result shape;
- no parity test ensuring markdown/export warning visibility matches `warning-display.ts`;
- no .NET metrics parsing test for current CB `qualityGates` shape.

## 15. Protective Mechanism Registry

| Mechanism | Current purpose | Redesign handling |
|---|---|---|
| Weighted article aggregation | Convert per-claim verdicts into article-level result | Preserve purpose, simplify and document as structural math over LLM outputs |
| `contradicts_thesis` inversion | Align claim-local truth with article-level thesis direction | Preserve as explicit contract rule |
| Non-direct zero-weighting | Keep contextual claims visible without letting them drive article truth | Preserve if thesis relevance remains in contract |
| Triangulation factor | Reward cross-boundary support and penalize single-boundary reliance | Decide whether to keep as structural metric or move to LLM adjudication |
| Derivative factor | Reduce influence of derivative/unverified support | Preserve purpose, review implementation clarity |
| Anchor multiplier | Protect truth-condition-preserving direct claims | Replace deterministic substring matching with LLM/contracted anchor assessment or remove if redundant |
| Probative factor | Weight stronger evidence more heavily | Preserve if `probativeValue` remains LLM-assigned and transparent |
| Article adjudication | Resolve direction conflicts and borderline article-level outcomes | Preserve as explicit LLM decision point with observability |
| Adjudication guards | Bound LLM movement and confidence inflation | Preserve |
| Verdict narrative | Produce human-readable article explanation | Preserve, keep non-authoritative relative to truth |
| Explanation quality rubric | Audit report explanation quality | Decide whether it remains default-on and how warnings surface |
| TIGERScore | Optional holistic report audit | Keep beta/off unless productized |
| Quality gates object | Surface claim validation and confidence distribution | Preserve external contract, unify threshold definitions |
| Warning display registry | Normalize user-visible warning semantics | Make canonical for all report surfaces |
| Result JSON top-level contract | Persist and expose analysis result | Lock as external contract with versioned adapters |

## 16. Open Questions For Redesign

These are not Captain escalations yet; they are design inputs for the later cleaned specification and deputy review:

1. Should article adjudication remain default-on, or should a simpler canonical aggregation path be default with adjudication only for explicit conflict cases?
2. Should `ARTICLE_ADJUDICATION` get its own model task and UCM temperature knob?
3. Should narrative generation failure emit a warning and preserve report language through a language-neutral fallback contract?
4. Should explanation quality remain default rubric mode, or be moved to optional audit mode?
5. Should TIGERScore remain in the pipeline code path if it is beta/off, or be separated as a post-report audit plugin?
6. Should the orphan `CLAIM_GROUPING` section be deleted, restored, or archived as historical prompt material?
7. Should `qualityGates` thresholds be unified with Stage 4 and metrics thresholds before V2 implementation?
8. Should API and UI display persisted `result.verdict` as authoritative, with derived labels only as backward compatibility fallback?
9. Should HTML export and markdown be treated as first-class compatibility adapters in the rebuild, not incidental formatters?
10. Should warning display classification become a shared contract consumed by UI, markdown, export, API summary, and metrics?

## 17. Baseline Conclusion

Stage 5 is not only aggregation. It is the point where analytical outputs become product outputs: article truth, verdict label, confidence, narrative, warnings, quality gates, persisted JSON, markdown, UI, API list data, static HTML export, validation tooling, and metrics all converge here.

The main simplification opportunity is to split the current mixed responsibilities into explicit contracts:

1. aggregation math,
2. optional LLM article adjudication,
3. narrative and explanation audit,
4. quality gates and warning display,
5. versioned result contract,
6. compatibility adapters for API/UI/export/metrics.

The replacement pipeline should not allow each downstream surface to reinterpret verdicts, quality gates, or warnings independently. The clean architecture should make Stage 5 the producer of one authoritative result contract, then keep adapters thin and tested.
