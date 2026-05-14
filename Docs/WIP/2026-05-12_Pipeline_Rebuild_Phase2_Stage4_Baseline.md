# Pipeline Rebuild Phase 2 Stage 4 Baseline

**Date:** 2026-05-12
**Status:** Phase 2 factual baseline checkpoint, read-only
**Owner role:** Lead Architect
**Workspace:** `C:\DEV\FactHarbor`
**Git branch:** `codex/v2-pipeline-rebuild`

---

## 1. Purpose

This document reverse-engineers the current Stage 4 verdict-generation and Gate 4 confidence behavior of the ClaimAssessmentBoundary pipeline. It is factual baseline material for the later redesign. It is not a target architecture and does not approve implementation cleanup.

No analyzer source, prompt, config, API, UI, tests, live jobs, or validation behavior was changed or run for this baseline.

## 2. Source Scope

Primary files:

- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
- `apps/web/src/lib/analyzer/verdict-generation-stage.ts`
- `apps/web/src/lib/analyzer/verdict-stage.ts`
- `apps/web/src/lib/analyzer/source-reliability-calibration.ts`
- `apps/web/src/lib/analyzer/aggregation-stage.ts`
- `apps/web/src/lib/analyzer/quality-gates.ts`
- `apps/web/src/lib/analyzer/metrics-integration.ts`
- `apps/web/src/lib/analyzer/metrics.ts`
- `apps/web/src/lib/analyzer/types.ts`
- `apps/web/src/lib/analyzer/truth-scale.ts`
- `apps/web/src/lib/analyzer/warning-display.ts`
- `apps/web/src/lib/analyzer/llm.ts`
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

- `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts`
- `apps/web/test/unit/lib/analyzer/verdict-generation-stage-config.test.ts`
- `apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts`
- `apps/web/test/unit/lib/analyzer/verdict-parse-artifact.test.ts`
- `apps/web/test/unit/lib/analyzer/verdict-preflight.test.ts`
- `apps/web/test/unit/lib/analyzer/source-reliability-calibration.test.ts`
- `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`
- `apps/web/test/unit/lib/analyzer/warning-display.test.ts`
- `apps/web/test/unit/lib/analyzer/metrics-integration.test.ts`
- `apps/web/test/unit/lib/analyzer/prompt-frontmatter-drift.test.ts`
- `apps/web/test/unit/lib/config-drift.test.ts`

Specialist read-only baselines used:

- Stage 4 verdict mechanics: `019e1e3a-a4cf-7141-b6ba-e49f433464ed`
- Stage 4 prompt/model/schema: `019e1e3a-a527-7711-ac8f-e219836de29d`
- Stage 4/5 compatibility: `019e1e3a-a59d-7ce3-b506-31a04a65ad46`

## 3. Current Stage 4 Boundary

Stage 4 starts after Stage 3 boundary clustering and after the pre-Stage-4 D5 sufficiency split. The pipeline currently separates claims into:

- `sufficientClaims`, which enter Stage 4 debate.
- `insufficientClaims`, which bypass Stage 4 and later receive UNVERIFIED fallback verdicts.

The primary Stage 4 entry points are:

- `runVerdictStageWithPreflight(...)` in `claimboundary-pipeline.ts`.
- `generateVerdicts(...)` in `verdict-generation-stage.ts`.
- `runVerdictStage(...)` in `verdict-stage.ts`.

Stage 4 currently owns:

1. LLM provider preflight before verdict generation.
2. Verdict-stage UCM config resolution.
3. Production LLM-call factory and Stage 4 JSON parse recovery.
4. Debate-role provider/strength routing.
5. Optional evidence partitioning between advocate and challenger.
6. Per-claim source portfolio construction.
7. Advocate verdict generation.
8. Optional self-consistency checks.
9. Adversarial challenge generation.
10. Reconciliation.
11. Baseless challenge enforcement.
12. Phantom evidence ID stripping.
13. Citation integrity sanitation and safe downgrade.
14. Self-consistency spread confidence adjustment.
15. Grounding and direction validation.
16. Direction repair and citation-direction adjudication.
17. Structural consistency checks.
18. High-harm low-confidence advisory.
19. Gate 4 confidence-tier classification.
20. Optional truth-percentage range reporting.

The pipeline then appends D5 fallback verdicts, enforces verdict uniqueness, conditionally strips misleadingness fields, records raw Gate 4 metrics, optionally applies Stage 4.5 source-reliability calibration or legacy source weighting, and then enters Stage 5 aggregation.

## 4. Entry Sequence

Current sequence around Stage 4:

1. Build `stage4CoverageMatrix` from assessable claims only.
2. Build resolved `VerdictStageConfig` early.
3. Emit warning if all debate roles have no structural tier/provider diversity.
4. Emit warning for missing provider credentials on configured debate roles.
5. Probe configured LLM provider connectivity.
6. Abort if provider preflight fails.
7. Load UCM pipeline and calculation config in `generateVerdicts`.
8. Build `VerdictStageConfig` from UCM config.
9. Create production LLM call wrapper unless a test injection is provided.
10. Delegate to `runVerdictStage`.
11. Create UNVERIFIED fallback verdicts for claims excluded by D5 sufficiency.
12. Merge sufficient and insufficient verdicts.
13. Fail fast on duplicate `claimId` verdicts.
14. Strip misleadingness annotations unless the configured claim annotation mode includes misleadingness.
15. Record raw Gate 4 stats before source-reliability calibration or weighting.
16. Apply Stage 4.5 SR calibration if enabled, otherwise optionally apply legacy SR weighting.
17. Rebuild final report coverage matrix from all final claim verdicts.
18. Enter Stage 5 aggregation.

Provider preflight behavior is important:

- If there are no assessable claims, Stage 4 returns an empty verdict list.
- If the configured provider is unreachable before Stage 4, the job throws rather than fabricating verdicts.
- If Stage 4 fails after preflight and the system is not paused or cancelled, the pipeline returns fallback UNVERIFIED verdicts with `analysis_generation_failed`.

## 5. Verdict Debate Sequence

Current `runVerdictStage` sequence:

1. Partition evidence by source type if `evidencePartitioningEnabled`.
2. Build role-scoped, claim-local source portfolios.
3. Run `VERDICT_ADVOCATE`.
4. Run self-consistency and challenger in parallel.
5. Run `VERDICT_RECONCILIATION` using full evidence.
6. Enforce baseless-challenge policy.
7. Strip phantom evidence IDs.
8. Enforce citation integrity before validation while deferring collapsed-side errors.
9. Apply self-consistency spread confidence adjustment.
10. Run grounding and direction validation.
11. Attempt neutral citation adjudication, citation normalization, direction repair, and grounding recheck where policy allows.
12. Re-run citation integrity after validation and repair.
13. Run deterministic structural consistency checks.
14. Emit high-harm low-confidence advisory.
15. Classify confidence tier.
16. Optionally compute truth-percentage ranges and range warnings.

Self-consistency nuance:

- Defaults appear contradictory at first read: `pipeline.default.json` says `selfConsistencyMode: "full"`, but `deterministic: true` causes `buildVerdictStageConfig` to disable self-consistency and set low sampling temperature.
- When self-consistency is enabled, two extra advocate runs are used to calculate spread.
- Failed self-consistency runs are excluded, and single-data-point spread receives a minimum floor to avoid artificial confidence.

Challenger nuance:

- Challenger failure is non-fatal.
- The pipeline emits an informational `challenger_failure` warning and proceeds with no challenger input.

Reconciliation nuance:

- Reconciliation validates challenge evidence IDs before the LLM sees them.
- Malformed reconciliation output preserves advocate verdicts with a partial fallback warning.
- Missing claim outputs preserve advocate verdicts for the missing claims.
- Reconciliation can update citation arrays, challenge responses, truth/confidence, contestation, reasoning, and misleadingness fields.

## 6. Core Data Contracts

Stage 4 input contracts:

- `AtomicClaim[]`
- `EvidenceItem[]`
- `ClaimAssessmentBoundary[]`
- `CoverageMatrix`
- `AnalysisWarning[]`
- `PipelineConfig`
- `FetchedSource[]`
- optional `jobId`, event callback, model usage recorder, role trace recorder, report language, and test injections.

Stage 4 output contract:

- `CBClaimVerdict[]`

Important `CBClaimVerdict` fields:

- `id`
- `claimId`
- `truthPercentage`
- `verdict`
- `confidence`
- `confidenceTier`
- `reasoning`
- `harmPotential`
- `thesisRelevance`
- `isContested`
- `supportingEvidenceIds`
- `contradictingEvidenceIds`
- `boundaryFindings`
- `consistencyResult`
- `challengeResponses`
- `triangulationScore`
- optional `truthPercentageRange`
- optional `misleadingness`
- optional `misleadingnessReason`
- optional `verdictReason`
- optional `sourceReliabilityCalibration`

Challenge contracts:

- `ChallengeDocument`
- `ChallengePoint`
- `ChallengeValidation`
- `ChallengeResponse`

Compatibility rule:

- Stage 5, UI, exports, API persistence, and metrics expect the current `CBClaimVerdict` fields even when a future V2 implementation changes internal orchestration.

## 7. Prompt Baseline

Stage 4 prompt sections in `claimboundary.prompt.md`:

| Section | Runtime caller | Primary output |
|---|---|---|
| `VERDICT_ADVOCATE` | `advocateVerdict`, `selfConsistencyCheck` | array of claim verdict drafts |
| `VERDICT_CHALLENGER` | `adversarialChallenge` | `{ challenges: [...] }` |
| `VERDICT_RECONCILIATION` | `reconcileVerdicts` | final/reconciled verdict array |
| `VERDICT_GROUNDING_VALIDATION` | `validateVerdicts`, `validateGroundingOnly` | validation array |
| `VERDICT_DIRECTION_VALIDATION` | `validateVerdicts`, `validateDirectionOnly` | validation array |
| `VERDICT_DIRECTION_REPAIR` | `defaultRepairExecutor` | repaired single verdict object |
| `VERDICT_CITATION_DIRECTION_ADJUDICATION` | `adjudicateNeutralCitationDirections` | `{ adjudications: [...] }` |
| `SR_CALIBRATION` | `callSRCalibrationLLM` | source-reliability confidence deltas |

Adjacent Stage 5 prompt sections that consume Stage 4 outputs:

| Section | Runtime caller | Primary output |
|---|---|---|
| `VERDICT_NARRATIVE` | `generateVerdictNarrative` | report narrative |
| `ARTICLE_ADJUDICATION` | aggregation stage | article-level truth/confidence adjustment |

Important prompt behavior:

- Report-authored analytical text is instructed to use `reportLanguage`.
- Source-authored text is preserved in original language.
- Current date is injected into verdict sections.
- Prompt sections forbid hardcoded keywords, entities, and domain-specific categories.
- Citation arrays are the authoritative evidence-citation channel.
- Raw machine IDs should not appear in natural-language reasoning.
- Applicability and Stage 2 `claimDirection` are treated as binding for directional citation arrays.
- Direction validation and repair prompts are multilingual and prohibit keyword matching.

Prompt contract coverage exists, but it is mostly static render/string coverage rather than schema-level model-output validation.

Known prompt/config gaps:

- Prompt frontmatter variables are incomplete relative to the Stage 4 body variables.
- `advocateTemperature` exists in pipeline defaults, but the advocate call appears to use the generic LLM wrapper default temperature instead.
- No Stage 4 wall-clock timeout knob was found.
- Model catalogs appear in both active resolver code and legacy model-tiering code, creating drift risk.

## 8. Model And Config Baseline

Production model selection:

- `createProductionLLMCall` maps role strength to model task.
- `budget` routes to `understand`.
- `standard` and `premium` route to `verdict`, with premium/opus able to use `modelOpus`.
- Provider overrides are role-specific.
- Missing override credentials fall back to the global provider with `debate_provider_fallback`.

Default role config:

| Role | Default provider | Default strength |
|---|---:|---:|
| advocate | `anthropic` | `standard` |
| selfConsistency | `anthropic` | `standard` |
| challenger | `openai` | `standard` |
| reconciler | `anthropic` | `standard` |
| validation | `anthropic` | `budget` |

Key pipeline config:

- `deterministic`
- `selfConsistencyMode`
- `selfConsistencyTemperature`
- `challengerTemperature`
- `advocateTemperature`
- `verdictGroundingPolicy`
- `verdictDirectionPolicy`
- `debateRoles`
- `sourceReliabilityCalibrationEnabled`
- `sourceReliabilityCalibrationMode`
- `sourceReliabilityCalibrationStrength`
- `openaiTpmGuardEnabled`
- `openaiTpmGuardInputTokenThreshold`
- `openaiTpmGuardFallbackModel`

Key calculation config:

- `mixedConfidenceThreshold`
- `probativeValueWeights`
- `selfConsistencySpreadThresholds`
- `verdictStage.spreadMultipliers`
- `verdictStage.institutionalSourceTypes`
- `verdictStage.generalSourceTypes`
- `highHarmMinConfidence`
- `highHarmFloorLevels`
- `evidencePartitioningEnabled`
- `rangeReporting`
- `sourceReliabilityCalibration`

Production LLM wrapper behavior:

- Loads prompt section via UCM prompt loader.
- JSON-stringifies structured variables before prompt rendering.
- Injects `currentDate`.
- Uses AI SDK `generateText`.
- Sets `maxOutputTokens: 16384`.
- Uses AI SDK retries.
- Applies provider guard and OpenAI TPM guard.
- Records model usage and per-role traces.
- Attempts multiple JSON recovery strategies.
- Retries once after Stage 4 parse failure.
- Captures parse-failure artifacts in metrics.

## 9. Gate 4 Baseline

There are three active confidence bucket schemes:

| Surface | Buckets |
|---|---|
| Stage 4 verdict tiering | `HIGH >= 75`, `MEDIUM >= 50`, `LOW >= 25`, otherwise `INSUFFICIENT` |
| Stage 5 quality gate summary | high `>= 70`, medium `>= 40`, low `> 0 && < 40`, insufficient `== 0` |
| Metrics Gate 4 | high `>= 80`, medium `>= 50`, low `>= 30`, insufficient `> 0`, unpublishable `0` |

Current implications:

- `confidenceTier` on `CBClaimVerdict` is classified in Stage 4 using fixed constants in `types.ts`.
- `buildQualityGates` uses different thresholds and reports `publishable` as high plus medium under its own buckets.
- Metrics uses a third bucket set.
- `qualityGates.gate4*` config exists and is used by the older `quality-gates.ts` path, but the current CB Stage 4 classification path does not appear to consume those thresholds.
- `MIXED` versus `UNVERIFIED` verdict labels are a separate truth-scale concern and use `mixedConfidenceThreshold` default `45`.

This must be treated as an external contract issue in the redesign. A V2 pipeline should not accidentally change displayed confidence, API list summaries, metrics, or quality panel behavior while unifying internals.

## 10. Integrity And Repair Mechanisms

Protective mechanisms currently in Stage 4:

- Provider connectivity preflight.
- Debate role diversity warning.
- Debate provider credential warning.
- Provider fallback warning.
- OpenAI TPM guard fallback.
- Stage 4 parse recovery and parse retry.
- Challenger failure containment.
- Self-consistency retry and partial recovery.
- Reconciliation malformed-output fallback.
- Challenge evidence ID validation.
- Baseless challenge enforcement.
- Phantom evidence stripping.
- Citation integrity sanitation.
- Direction validation.
- Grounding validation.
- Neutral citation direction adjudication.
- Direction repair.
- Safe downgrade to `UNVERIFIED`-like integrity fallback.
- Structural consistency warnings.
- High-harm low-confidence advisory.
- Truth-percentage range reporting.

Several are important quality safety rails, but their implementation is interwoven. The redesign should preserve the purpose of each protective mechanism while collapsing redundant or overlapping implementations.

## 11. Source Reliability Calibration

Source reliability is threaded into Stage 4 in two different ways:

1. Stage 4 source portfolios:
   - Built per claim and per role.
   - Passed into advocate, challenger, reconciliation, and validators.
   - Include source concentration and track-record fields.

2. Stage 4.5 SR calibration:
   - Disabled by default.
   - Runs after raw Gate 4 stats and before Stage 5 aggregation when enabled.
   - Uses `SR_CALIBRATION`.
   - Summarizes support and contradiction source portfolios.
   - Applies bounded truth/confidence deltas depending on configured mode.
   - Recomputes verdict label and confidence tier.
   - Attaches `sourceReliabilityCalibration` metadata.

Fallback behavior:

- If Stage 4.5 is enabled but no LLM result is available, it records metadata and emits `source_reliability_calibration_skipped`.
- Legacy source-reliability weighting may run when Stage 4.5 is off, `evidenceWeightingEnabled` is true, and at least one source has a track-record score.
- Legacy weighting deterministically adjusts truth/confidence from source scores and is default-off in current pipeline defaults.

## 12. Warnings And User Display

Stage 4 warning types include:

- `analysis_generation_failed`
- `all_same_debate_tier`
- `debate_provider_fallback`
- `llm_provider_error`
- `llm_tpm_guard_fallback`
- `evidence_partition_stats`
- `challenger_failure`
- `verdict_batch_retry`
- `verdict_partial_recovery`
- `verdict_fallback_partial`
- `grounding_check_degraded`
- `direction_validation_degraded`
- `verdict_grounding_issue`
- `verdict_direction_issue`
- `direction_rescue_plausible`
- `verdict_integrity_failure`
- `verdict_citation_integrity_guard`
- `phantom_evidence_stripped`
- `phantom_evidence_all_supporting`
- `baseless_challenge_blocked`
- `baseless_challenge_detected`
- `high_harm_low_confidence`
- `contested_verdict_range`
- `source_reliability_calibration_skipped`
- `source_reliability_support_concern`
- `source_reliability_contradiction_concern`
- `source_reliability_unknown_dominance`

Display caveat:

- UI warning display is registry-driven through `warning-display.ts`.
- Markdown report filtering differs and only shows raw `warning` and `error` severities.
- Some `info` warnings may be visible in UI via display mapping but absent from markdown.
- Metrics and UI appear to disagree on whether `contested_verdict_range` is degrading.

The V2 specification needs an explicit warning-display compatibility decision rather than relying on raw severity alone.

## 13. Persisted And External Contracts

Result JSON currently persists:

- top-level `truthPercentage`
- top-level `verdict`
- top-level `confidence`
- `truthPercentageRange`
- `verdictNarrative`
- `articleAdjudication`
- `adjudicationPath`
- `claimBoundaries`
- `claimVerdicts`
- `coverageMatrix`
- `qualityGates`
- `analysisWarnings`
- `analysisObservability`
- runtime model metadata and role traces

API behavior:

- Stores full result JSON and markdown.
- Extracts list display fields from top-level `truthPercentage` and `confidence`.
- Remaps verdict label itself rather than trusting `resultJson.verdict`.
- Admin issue extraction recognizes `analysis_generation_failed` but not every Stage 4 integrity failure type.

UI/export behavior:

- Job page consumes `claimVerdicts`, `qualityGates`, `analysisWarnings`, top-level truth/confidence, and `verdictNarrative`.
- Static HTML export currently has stale compatibility hazards:
  - overall banner reads `result.overallVerdict` instead of current `result.verdict`.
  - quality gate export expects old `gate1/gate4/allPassed` shape instead of `gate1Stats/gate4Stats/passed`.

Observability shape caveat:

- Result assembly emits `analysisObservability.stage1`.
- The `AnalysisObservability` type only declares `acsResearchWaste` and `acquisitionTrace`.
- This mismatch must be deliberately preserved or resolved during redesign.

## 14. Multilingual And Input Neutrality

Current Stage 4 multilingual controls:

- Verdict prompts instruct report-authored analytical text to use `reportLanguage`.
- Source-authored text is preserved in original language.
- Direction validation and repair prompts instruct the LLM not to assume a language and to work from the original claim/evidence.
- Prompt sections explicitly prohibit keyword matching and domain-specific terms.

Current input-neutrality controls:

- Stage 1 claim contract and Stage 2 evidence direction feed Stage 4 via structured fields.
- Stage 4 prompts repeatedly constrain truth to the AtomicClaim proposition rather than inferred implications.
- The `directionalEvidenceSummaryByClaim` is a structural index to avoid missed one-sided direct evidence in large pools.
- Citation arrays are explicit machine-readable channels, reducing dependence on prose.

Risk:

- Some prompt text contains many accumulated case-derived generic rules. They are phrased generically, but the volume and overlap increase maintainability risk.

## 15. Deterministic Semantic Hotspots

The following mechanisms need later LLM-vs-structural classification before redesign:

1. Pre-Stage-4 D5 sufficiency gate:
   - Decides whether a claim receives debated verdict generation.
   - Uses evidence counts, source-type/domain diversity, direct directional evidence, probative values, and authoritative-source exceptions.

2. Evidence partitioning:
   - Routes source types to advocate versus challenger.
   - Depends on source-type partitions in calc config.

3. Direction plausibility and deterministic direction issues:
   - Can override LLM direction failures or trigger repair/downgrade.
   - Uses LLM-assigned fields and citation arrays but changes analytical outcomes.

4. Citation normalization and integrity:
   - Moves or drops directional citations.
   - Can safe-downgrade collapsed decisive sides.

5. Baseless challenge enforcement:
   - Reverts challenge-driven adjustments when evidence provenance is invalid or ambiguous.
   - Protects the Captain rule that unsubstantiated objections must not reduce verdicts.

6. Legacy source-reliability weighting:
   - Deterministically adjusts truth/confidence from source scores.
   - Default-off but still present.

7. Older `quality-gates.ts` Gate 4:
   - Counts contradiction using deterministic category/direction checks.
   - Appears separate from active CB Stage 4 tier classification but remains in codebase.

Some of these are structural guards over LLM-produced labels and IDs; others make outcome-affecting analytical decisions. The redesign must not simply delete them, but it should reduce duplication and move semantic judgment back to LLM where required.

## 16. Tests And Coverage

Current coverage includes:

- Stage 4 orchestration and individual step tests.
- Advocate parsing/default behavior.
- Self-consistency spread behavior.
- Challenger parsing/failure behavior.
- Reconciliation merging/fallback behavior.
- Grounding and direction validation behavior.
- Neutral citation adjudication and repair behavior.
- Phantom citation cleanup and citation integrity behavior.
- Baseless challenge policy behavior.
- Confidence classification and spread multiplier behavior.
- Stage 4 config deterministic-mode behavior.
- Prompt render contract tests.
- Prompt parse-failure artifact tests.
- Preflight behavior tests.
- Stage 4.5 source reliability calibration tests.
- Stage 5 quality-gate tests.
- Warning display tests.
- Metrics tests.

Known gaps:

- Prompt tests are mostly static string/render tests, not model-output schema validation.
- No direct `generateHtmlReport` test was found for current CB result shape.
- API tests do not deeply cover CB result extraction for top-level truth/confidence/verdict label.
- No Stage 4 wall-clock timeout test or knob was found.
- Gate 4 threshold drift across verdicts, quality gates, and metrics is not protected by a single compatibility test.
- UI/markdown warning visibility differences are not captured as an explicit contract.

## 17. Protective Mechanism Registry

| Mechanism | Current purpose | Redesign handling |
|---|---|---|
| LLM provider preflight | Avoid first-outage fallback reports | Preserve purpose |
| Stage 4 fallback verdicts | Avoid total job loss after runtime failures | Preserve, but review user-visible severity |
| Debate role diversity warning | Detect weak adversarial independence | Preserve as config health check |
| Provider credential fallback | Keep jobs running when role override lacks credentials | Preserve with explicit observability |
| OpenAI TPM guard | Avoid model/token failure on large prompts | Preserve or replace with unified provider guard |
| Parse recovery artifacts | Diagnose malformed LLM outputs | Preserve, simplify if possible |
| Self-consistency spread | Penalize unstable verdicts | Preserve decision purpose, simplify execution path |
| Challenger containment | Keep pipeline robust to challenger failures | Preserve with quality signal |
| Baseless challenge enforcement | Prevent unsupported objections affecting verdicts | Preserve as mandatory policy |
| Citation integrity | Ensure verdict citations are valid, direct, claim-local | Preserve as mandatory invariant |
| Direction repair | Recover verdicts with direction/citation mismatch | Preserve, but consolidate retry paths |
| Safe downgrade | Fail safely on integrity violations | Preserve with explicit contract |
| High-harm confidence advisory | Surface low confidence on high-harm claims without changing label | Preserve if high-harm remains in contract |
| Gate 4 confidence tiering | Provide verdict-level confidence class | Preserve externally, unify thresholds deliberately |
| SR calibration | Optional LLM-backed source reliability adjustment | Decide in target architecture |
| Legacy SR weighting | Deterministic fallback weighting | Candidate for quarantine/removal if replaced by LLM-backed calibration |

## 18. Open Questions For Redesign

These are not Captain escalations yet; they are design inputs for the later cleaned specification and deputy review:

1. Should Gate 4 have one canonical threshold scheme, with adapters for old metrics/UI if needed?
2. Should `quality-gates.ts` legacy Gate 4 be removed, quarantined, or repurposed?
3. Should Stage 4.5 SR calibration become the only source-reliability verdict adjustment path?
4. Should `advocateTemperature` be wired or removed from config?
5. Should Stage 4 receive a wall-clock timeout knob aligned with Stage 1/2 LLM timeouts?
6. Should prompt contract tests add schema-level structured-output fixtures?
7. Should HTML export be fixed before or during the V2 compatibility adapter work?
8. Should warning display contracts be defined from `warning-display.ts` rather than raw warning severity?
9. Should deterministic direction plausibility remain as a structural guard, or be replaced by an LLM validation/adjudication contract?
10. Should source-type evidence partitioning remain deterministic config, or become an LLM-planned debate-view assignment?

## 19. Baseline Conclusion

Stage 4 is the most mechanism-dense part of the current pipeline so far. Its current implementation combines verdict reasoning, debate orchestration, provider resilience, citation integrity, validation, repair, source-reliability calibration, confidence tiering, warnings, and downstream compatibility.

The later redesign should not collapse this into a single simplified "verdict prompt." The maintainable target is likely a smaller set of explicit subcontracts:

1. verdict inputs and evidence packets,
2. verdict debate/adjudication,
3. citation and grounding integrity,
4. confidence and quality gates,
5. source-reliability calibration,
6. external report/API/UI compatibility adapters.

The key simplification opportunity is not removing safeguards. It is separating semantic LLM decisions from structural invariants, unifying duplicated threshold/warning/report contracts, and deleting or quarantining legacy paths that no longer drive the active CB pipeline.
