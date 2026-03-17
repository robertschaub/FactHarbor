---
### 2026-03-07 | Unassigned | Codex (GPT-5) | UCM Default Change History Since First Seeded Deploy
**Task:** Inventory all committed UCM default-value changes since the first versioned config seeds, with extra focus on temporal, regional, and language-related settings.
**Files touched:** `Docs/AGENTS/Handoffs/2026-03-07_Unassigned_UCM_Default_Change_History.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:**
- Used commit `9403932f` as the baseline because it is the first commit that contains the file-backed UCM default JSONs under `apps/web/configs/`.
- Measured changes against the committed default seed files only: `search.default.json`, `calculation.default.json`, `pipeline.default.json`, `sr.default.json`.
- Separated "value changed vs baseline" from "schema field exists but was never seeded in default JSON" to avoid overstating regional/language drift.
**Open items:** If the user wants runtime/admin edits from `config.db` history rather than git-tracked default seed changes, that is a separate investigation.
**Warnings:** This report does not inspect production databases or deployed `config.db` files. It covers git-tracked default UCM seeds only.
**For next agent:** If asked for a machine-readable export, generate CSV/JSON from the same git-history script and include commit-by-commit transitions per key.
**Learnings:** no

## Scope and Baseline

- Baseline used: commit `9403932f` (`ucm: implement phase1 must-haves from review plan`)
- Current files compared:
  - `apps/web/configs/search.default.json`
  - `apps/web/configs/calculation.default.json`
  - `apps/web/configs/pipeline.default.json`
  - `apps/web/configs/sr.default.json`
- Count of keys whose committed default differs from the baseline or did not exist at baseline:
  - `pipeline`: 119
  - `calculation`: 92
  - `search`: 36
  - `sr`: 7

## Focus Findings: Temporal, Regional, Language

### Temporal / Recency

These were not present in the first seeded defaults and are now present:

- `pipeline.recencyConfidencePenalty` = `20`
- `pipeline.recencyCueTerms` = `[]`
- `pipeline.recencyGraduatedPenalty` = `true`
- `pipeline.recencyWindowMonths` = `6`
- `pipeline.temporalConfidenceThreshold` = `0.6`
- `pipeline.temporalPromptContractTemplate`
- `pipeline.temporalPromptKnowledgeRuleAllowed`
- `pipeline.temporalPromptKnowledgeRuleEvidenceOnly`
- `pipeline.temporalPromptNoFreshEvidenceRule`
- `pipeline.temporalPromptRecencyRuleGeneral`
- `pipeline.temporalPromptRecencyRuleSensitive`
- `pipeline.temporalPromptRelativeTimeRule`

Related date-sensitive search additions:

- `search.factCheckApi.maxAgeDays` = `365`

### Language

Committed default seed changes found:

- `search.providers.wikipedia.language` was added with default `en`

Schema-only language controls that exist but were never seeded into the committed default JSON:

- `search.searchLanguageOverride` introduced in commit `4ca33376`
- `search.providers.googleFactCheck.languageCode` introduced in commit `8dae5a20`

### Regional / Geography

No committed default JSON value changes were found for regional/country overrides.

Schema-only regional control that exists but was never seeded into the committed default JSON:

- `search.searchGeographyOverride` introduced in commit `4ca33376`

## Notable Tuned Values (Changed More Than Once)

- `calculation.mixedConfidenceThreshold`: `60 -> 40 -> 50 -> 45`
- `calculation.sourceReliability.defaultScore`: `0.5 -> 0.4 -> 0.45`
- `sr.defaultScore`: `0.5 -> 0.4 -> 0.45`, then removed from the SR default JSON when SR defaults split into `defaultConfidence` / `unknownSourceConfidence`
- `pipeline.verdictGroundingPolicy`: `disabled -> safe_downgrade -> disabled`
- `pipeline.verdictDirectionPolicy`: `disabled -> retry_once_then_safe_downgrade -> disabled`
- `pipeline.selfConsistencyMode`: `full -> disabled -> full`
- `pipeline.searchRelevanceLlmMode`: `off -> auto`
- `pipeline.calibrationInverseGateAction`: `warn -> fail -> warn`
- `search.domainBlacklist`: `[] -> ["facebook.com","twitter.com","x.com","reddit.com","instagram.com","tiktok.com","pinterest.com","quora.com","youtube.com"]`
- `search.providers.brave.enabled`: `false -> true`
- `search.providers.serpapi.enabled`: `false -> true`

## Full Changed-Key Inventory

### calculation

- `aggregation.contestationWeights.disputed`
- `aggregation.contestationWeights.established`
- `aggregation.derivativeMultiplier`
- `aggregation.harmPotentialMultipliers.critical`
- `aggregation.harmPotentialMultipliers.high`
- `aggregation.harmPotentialMultipliers.low`
- `aggregation.harmPotentialMultipliers.medium`
- `aggregation.triangulation.conflictedFlag`
- `aggregation.triangulation.moderateAgreementBoost`
- `aggregation.triangulation.singleBoundaryPenalty`
- `aggregation.triangulation.strongAgreementBoost`
- `articleVerdictOverride.centralRefutedRatioThreshold`
- `articleVerdictOverride.maxBlendStrength`
- `articleVerdictOverride.misleadingTarget`
- `claimClustering.duplicateWeightShare`
- `claimClustering.jaccardSimilarityThreshold`
- `claimDecomposition.minCoreClaimsPerContext`
- `claimDecomposition.minDirectClaimsPerContext`
- `claimDecomposition.minTotalClaimsWithSingleCore`
- `claimDecomposition.shortSimpleInputMaxChars`
- `claimDecomposition.supplementalRepromptMaxAttempts`
- `contextRefinement.maxEvidenceCeiling`
- `contextRefinement.minAssignmentCoverage`
- `contextRefinement.oldToNewSimilarityThreshold`
- `contextSimilarity.anchorRecoveryThreshold`
- `contextSimilarity.assessedStatementWeight`
- `contextSimilarity.fallbackEvidenceCapPercent`
- `contextSimilarity.nameWeight`
- `contextSimilarity.nearDuplicateAssessedThreshold`
- `contextSimilarity.nearDuplicateForceScore`
- `contextSimilarity.nearDuplicateMinNameSim`
- `contextSimilarity.nearDuplicateMinPrimarySim`
- `contextSimilarity.nearDuplicateNameGuardThreshold`
- `contextSimilarity.nearDuplicateSubjectGuardThreshold`
- `contextSimilarity.primaryMetadataWeight`
- `contextSimilarity.secondaryMetadataWeight`
- `contextSimilarity.subjectWeight`
- `contrarianMaxQueriesPerClaim`
- `contrarianRetrievalEnabled`
- `contrarianRuntimeCeilingPct`
- `evidenceBalanceMinDirectional`
- `evidenceBalanceSkewThreshold`
- `evidenceFilter.maxVaguePhraseCount`
- `evidenceFilter.minExcerptLength`
- `evidenceFilter.minStatementLength`
- `evidenceFilter.requireSourceExcerpt`
- `evidenceFilter.requireSourceUrl`
- `evidencePartitioningEnabled`
- `evidenceSufficiencyMinDistinctDomains`
- `evidenceSufficiencyMinItems`
- `evidenceSufficiencyMinSourceTypes`
- `fallback.step1RelaxInstitution`
- `fallback.step2RelevanceFloor`
- `fallback.step3BroadEnabled`
- `frameSignal.assessedDistinctnessThreshold`
- `frameSignal.nameDistinctnessThreshold`
- `groundingPenalty.enabled`
- `groundingPenalty.floorRatio`
- `groundingPenalty.reductionFactor`
- `groundingPenalty.threshold`
- `highHarmFloorLevels`
- `highHarmMinConfidence`
- `mixedConfidenceThreshold`
- `probativeValueWeights.high`
- `probativeValueWeights.low`
- `probativeValueWeights.medium`
- `processing.maxContextsPerClaim`
- `processing.maxEvidenceSelection`
- `processing.similarityBatchSize`
- `provenanceValidation.minExcerptLength`
- `qualityGates.gate4QualityThresholdHigh`
- `riskTiers.highConfidenceThreshold`
- `riskTiers.mediumConfidenceThreshold`
- `schemaVersion`
- `selfConsistencySpreadThresholds.moderate`
- `selfConsistencySpreadThresholds.stable`
- `selfConsistencySpreadThresholds.unstable`
- `sourceReliability.defaultScore`
- `tangentialPruning.minEvidenceForTangential`
- `verdictBands.false`
- `verdictBands.leaningFalse`
- `verdictBands.leaningTrue`
- `verdictBands.mixed`
- `verdictBands.mostlyFalse`
- `verdictBands.mostlyTrue`
- `verdictBands.true`
- `verdictStage.generalSourceTypes`
- `verdictStage.institutionalSourceTypes`
- `verdictStage.spreadMultipliers.highlyStable`
- `verdictStage.spreadMultipliers.highlyUnstable`
- `verdictStage.spreadMultipliers.moderatelyStable`
- `verdictStage.spreadMultipliers.unstable`

### pipeline

- `atomicClaimsInputCharsPerClaim`
- `boundaryCoherenceMinimum`
- `calibrationInverseGateAction`
- `centralityThreshold`
- `challengerTemperature`
- `claimAnnotationMode`
- `claimAtomicityLevel`
- `claimSpecificityMinimum`
- `claimSufficiencyThreshold`
- `confidenceCalibration.bandSnapping.enabled`
- `confidenceCalibration.bandSnapping.strength`
- `confidenceCalibration.contextConsistency.enabled`
- `confidenceCalibration.contextConsistency.maxConfidenceSpread`
- `confidenceCalibration.contextConsistency.reductionFactor`
- `confidenceCalibration.densityAnchor.enabled`
- `confidenceCalibration.densityAnchor.minConfidenceBase`
- `confidenceCalibration.densityAnchor.minConfidenceMax`
- `confidenceCalibration.densityAnchor.sourceCountThreshold`
- `confidenceCalibration.enabled`
- `confidenceCalibration.verdictCoupling.enabled`
- `confidenceCalibration.verdictCoupling.minConfidenceNeutral`
- `confidenceCalibration.verdictCoupling.minConfidenceStrong`
- `confidenceCalibration.verdictCoupling.strongVerdictThreshold`
- `contextClaimsAnchorClaimsWeight`
- `contextClaimsAnchorDivergenceThreshold`
- `contextDedupEnabled`
- `contextDedupThreshold`
- `contextDetectionEnabled`
- `contextDetectionMaxContexts`
- `contextDetectionMethod`
- `contextDetectionMinConfidence`
- `contextNameAlignmentEnabled`
- `contextNameAlignmentThreshold`
- `contextPromptMaxEvidenceItems`
- `contextPromptMaxFacts`
- `contextPromptSelectionEnabled`
- `contradictionReservedIterations`
- `debateModelProviders.challenger`
- `debateProfile`
- `defaultPipelineVariant`
- `evidenceScopeAlmostEqualThreshold`
- `evidenceSimilarityThreshold`
- `explanationQualityMode`
- `extractEvidenceLlmTimeoutMs`
- `extractFactsLlmTimeoutMs`
- `gapResearchEnabled`
- `gapResearchMaxIterations`
- `gapResearchMaxQueries`
- `gate1GroundingRetryThreshold`
- `llmTiering`
- `lowSourceConfidencePenalty`
- `lowSourceThreshold`
- `maxAtomicClaims`
- `maxAtomicClaimsBase`
- `maxClaimBoundaries`
- `maxIterationsPerContext`
- `maxOpinionFactors`
- `maxTotalIterations`
- `maxTotalTokens`
- `minConfidenceFloor`
- `minEvidenceForTangential`
- `modelExtractEvidence`
- `modelExtractFacts`
- `modelOpus`
- `modelUnderstand`
- `modelVerdict`
- `monolithicCanonicalTimeoutMs`
- `monolithicDynamicTimeoutMs`
- `monolithicMaxEvidenceBeforeStop`
- `normalizationAdjectiveSuffixes`
- `normalizationPredicateStarters`
- `openaiTpmGuardEnabled`
- `openaiTpmGuardFallbackModel`
- `openaiTpmGuardInputTokenThreshold`
- `opinionAccumulationWarningThreshold`
- `parallelExtractionLimit`
- `perClaimQueryBudget`
- `planningMaxSearchQueries`
- `preliminaryMaxSources`
- `preliminarySearchQueriesPerClaim`
- `probativeDeduplicationThreshold`
- `queryStrategyMode`
- `recencyConfidencePenalty`
- `recencyCueTerms`
- `recencyGraduatedPenalty`
- `recencyWindowMonths`
- `researchTimeBudgetMs`
- `researchZeroYieldBreakThreshold`
- `schemaVersion`
- `searchAdaptiveFallbackMaxQueries`
- `searchAdaptiveFallbackMinCandidates`
- `searchMaxResultsCriticism`
- `searchRelevanceLlmEnabled`
- `searchRelevanceLlmMaxCalls`
- `searchRelevanceLlmMode`
- `searchRetryBeforeFallback`
- `selfConsistencyMode`
- `selfConsistencyTemperature`
- `sourceFetchTimeoutMs`
- `tangentialEvidenceQualityCheckEnabled`
- `temporalConfidenceThreshold`
- `temporalPromptContractTemplate`
- `temporalPromptKnowledgeRuleAllowed`
- `temporalPromptKnowledgeRuleEvidenceOnly`
- `temporalPromptNoFreshEvidenceRule`
- `temporalPromptRecencyRuleGeneral`
- `temporalPromptRecencyRuleSensitive`
- `temporalPromptRelativeTimeRule`
- `thesisRelevanceAutoDowngradeThreshold`
- `thesisRelevanceLowConfidenceThreshold`
- `thesisRelevanceValidationEnabled`
- `tigerScoreMode`
- `tigerScoreTemperature`
- `tigerScoreTier`
- `understandMinClaimThreshold`
- `understandTemperature`
- `verdictBatchSize`
- `verdictDirectionPolicy`
- `verdictGroundingPolicy`

### search

- `cache.enabled`
- `cache.ttlDays`
- `circuitBreaker.enabled`
- `circuitBreaker.failureThreshold`
- `circuitBreaker.resetTimeoutSec`
- `domainBlacklist`
- `factCheckApi.enabled`
- `factCheckApi.fetchFullArticles`
- `factCheckApi.maxAgeDays`
- `factCheckApi.maxResultsPerClaim`
- `maxResults`
- `maxSourcesPerIteration`
- `providers.brave.dailyQuotaLimit`
- `providers.brave.enabled`
- `providers.brave.priority`
- `providers.googleCse.dailyQuotaLimit`
- `providers.googleCse.enabled`
- `providers.googleCse.priority`
- `providers.googleFactCheck.dailyQuotaLimit`
- `providers.googleFactCheck.enabled`
- `providers.googleFactCheck.priority`
- `providers.semanticScholar.dailyQuotaLimit`
- `providers.semanticScholar.enabled`
- `providers.semanticScholar.priority`
- `providers.serpapi.dailyQuotaLimit`
- `providers.serpapi.enabled`
- `providers.serpapi.priority`
- `providers.wikipedia.dailyQuotaLimit`
- `providers.wikipedia.enabled`
- `providers.wikipedia.language`
- `providers.wikipedia.priority`
- `queryGeneration.maxEntitiesPerClaim`
- `queryGeneration.maxFallbackTerms`
- `queryGeneration.maxSearchTerms`
- `queryGeneration.maxWordLength`
- `schemaVersion`

### sr

- `defaultConfidence`
- `defaultScore`
- `evalConcurrency`
- `evalTimeoutMs`
- `openaiModel`
- `schemaVersion`
- `unknownSourceConfidence`
