# Pipeline Rebuild Phase 2 Prompt, Config, And Model Baseline

**Date:** 2026-05-12
**Status:** Phase 2 factual baseline checkpoint, read-only
**Owner role:** Lead Architect
**Worktree:** `C:\DEV\FactHarbor-pipeline-rebuild-spec`
**Branch:** `codex/pipeline-rebuild-spec`

---

## 1. Purpose

This document reverse-engineers the cross-cutting prompt, UCM config, model routing, LLM call, budget, timeout, and provider contracts that the replacement pipeline must either preserve, simplify, or explicitly retire. It is factual baseline material for later redesign and does not approve prompt/config/source changes.

No analyzer source, prompt, config, API, UI, tests, live jobs, or validation behavior was changed or run for this baseline.

## 2. Source Scope

Primary files:

- `apps/web/prompts/claimboundary.prompt.md`
- `apps/web/src/lib/analyzer/prompt-loader.ts`
- `apps/web/src/lib/prompt-surface-registry.ts`
- `apps/web/src/lib/config-schemas.ts`
- `apps/web/src/lib/config-storage.ts`
- `apps/web/src/lib/config-loader.ts`
- `apps/web/configs/pipeline.default.json`
- `apps/web/configs/calculation.default.json`
- `apps/web/configs/search.default.json`
- `apps/web/configs/sr.default.json`
- `apps/web/src/lib/analyzer/llm.ts`
- `apps/web/src/lib/analyzer/model-resolver.ts`
- `apps/web/src/lib/analyzer/model-tiering.ts`
- `apps/web/src/lib/analyzer/verdict-generation-stage.ts`
- `apps/web/src/lib/analyzer/llm-provider-guard.ts`
- `apps/web/src/lib/web-search.ts`
- `apps/web/src/lib/search-circuit-breaker.ts`
- `apps/web/src/lib/source-reliability/*`

Relevant tests:

- `apps/web/test/unit/lib/analyzer/prompt-frontmatter-drift.test.ts`
- `apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts`
- `apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts`
- `apps/web/test/unit/lib/config-drift.test.ts`
- `apps/web/test/unit/lib/config-schemas.test.ts`
- `apps/web/test/unit/lib/analyzer/verdict-generation-stage-config.test.ts`
- `apps/web/test/unit/lib/analyzer/verdict-preflight.test.ts`
- `apps/web/test/unit/lib/calibration-runner.test.ts`
- `apps/web/test/unit/lib/search-circuit-breaker.test.ts`
- `apps/web/test/unit/lib/source-reliability/*`

Specialist read-only baselines used:

- Prompt contracts: `019e1e53-06c5-7671-8344-d3a224f53c32`
- Config/model contracts: `019e1e53-0713-76a3-b05f-7682314766d8`

## 3. Prompt Loading Contract

The active CB prompt file is `claimboundary.prompt.md`.

Prompt loading behavior:

- prompt content is loaded through UCM prompt config via `loadPromptConfig`;
- local file content is the fallback/lazy seed source;
- `prompt-loader.ts` parses frontmatter, sections, and content hashes;
- sections are delimited by `## SECTION_NAME`;
- variables use `${variableName}` substitution;
- missing variables produce `ValidationWarning` entries but do not fail rendering;
- most call sites ignore render warnings.

Prompt metadata contract:

- `requiredSections` is currently aligned with body headings and covered by `prompt-frontmatter-drift.test.ts`.
- `variables` is not aligned with body placeholders and is not covered by tests.
- `CLAIM_GROUPING` is listed and present, but no runtime call site was found.

The replacement pipeline should keep section-level prompt rendering. It should not return to monolithic full-file prompts.

## 4. Active Prompt Sections By Pipeline Area

| Pipeline area | Active prompt sections |
|---|---|
| Stage 1 extraction/validation | `CLAIM_EXTRACTION_PASS1`, `CLAIM_SALIENCE_COMMITMENT`, `CLAIM_EXTRACTION_PASS2`, `CLAIM_EXTRACTION_PASS2_BINDING_APPENDIX`, `CLAIM_CONTRACT_VALIDATION`, `CLAIM_SINGLE_CLAIM_ATOMICITY_VALIDATION`, `CLAIM_MULTI_CLAIM_ATOMICITY_AUDIT`, `CLAIM_MULTI_CLAIM_ATOMICITY_REPAIR_GUIDANCE`, `CLAIM_CONTRACT_VALIDATION_BINDING_APPENDIX`, `CLAIM_SELECTION_RECOMMENDATION`, `CLAIM_VALIDATION`, `CLAIM_CONTRACT_REPAIR` |
| Stage 2 research | `GENERATE_QUERIES`, `RELEVANCE_CLASSIFICATION`, `EXTRACT_EVIDENCE`, `APPLICABILITY_ASSESSMENT`, `REMAP_SEEDED_EVIDENCE` |
| Stage 3 boundaries | `SCOPE_NORMALIZATION`, `BOUNDARY_CLUSTERING` |
| Stage 4 verdict | `VERDICT_ADVOCATE`, `VERDICT_CHALLENGER`, `VERDICT_RECONCILIATION`, `VERDICT_GROUNDING_VALIDATION`, `VERDICT_DIRECTION_VALIDATION`, `VERDICT_DIRECTION_REPAIR`, `VERDICT_CITATION_DIRECTION_ADJUDICATION` |
| Stage 4.5 / Stage 5 / Stage 6 | `SR_CALIBRATION`, `ARTICLE_ADJUDICATION`, `VERDICT_NARRATIVE`, `EXPLANATION_QUALITY_RUBRIC`, `TIGER_SCORE_EVAL` |
| Stale/orphan candidate | `CLAIM_GROUPING` |

Legacy prompt profile note:

- `orchestrated` remains a non-CB prompt profile used by grounding checks. It is not part of the new CB pipeline target unless grounding checks are retained through that profile.

## 5. Prompt Governance Risks

Observed risks:

- frontmatter declares about 21 variables while body placeholders are much larger; missing declarations include Stage 2/3/4/5 variables such as `claim`, `evidenceItems`, `claimBoundaries`, `verdicts`, `aggregation`, `adjudicationCases`, `sourceContent`, `reportLanguage`, and `unmappedEvidenceJson`;
- `originalClaim` is declared but unused;
- unresolved placeholders are warnings, not failures;
- call sites generally ignore prompt render warnings;
- prompt examples still contain concrete date-period examples;
- some instructions lean on English lexical framing despite multilingual language;
- query-generation includes explicit supplementary English-lane behavior;
- missing language defaults can become `en`;
- several model-facing user messages are hardcoded in TypeScript around UCM system prompts.

Known inline prompt/text surfaces:

- Stage 1 Pass 2 framing/retry/language text in `claim-extraction-stage.ts` is registered as an intentional exception in `prompt-surface-registry.ts`.
- Smaller task wrappers exist in research query, research extraction, aggregation, and verdict LLM call sites.
- Source-reliability evaluation has separate prompt files/code paths outside the main CB prompt file.

Redesign implication: prompt surfaces should be owned by an explicit prompt registry, with section usage and variables checked as contracts. Any inline model-facing text should be either moved into UCM or explicitly classified as a structural wrapper with tests.

## 6. Authoritative Config Defaults

File-backed defaults in `apps/web/configs/*.default.json` are the intended authoritative defaults and are loaded by `config-storage.ts`. TypeScript defaults in `config-schemas.ts` are still required to remain synchronized and are protected by `config-drift.test.ts`.

Config files:

- `pipeline.default.json`
- `calculation.default.json`
- `search.default.json`
- `sr.default.json`

Pipeline defaults include:

- `llmProvider: "anthropic"`;
- `llmTiering: true`;
- `modelUnderstand: "budget"`;
- `modelExtractEvidence: "standard"`;
- `modelVerdict: "standard"`;
- `modelOpus: "premium"`;
- `analysisMode: "quick"`;
- `deterministic: true`;
- quality fallbacks off;
- non-quality fallbacks on;
- `explanationQualityMode: "rubric"`;
- `tigerScoreMode: "off"`;
- canonical `debateRoles`.

Search defaults include:

- `provider: "auto"`;
- `autoMode: "first-success"`;
- enabled providers: Serper, Google CSE, Wikipedia;
- disabled providers include SerpAPI, Brave, Semantic Scholar, Google Fact Check;
- cache TTL 7 days;
- circuit breaker enabled.

SR defaults include:

- multi-model evaluation enabled;
- search-backed evaluation enabled;
- evidence quality assessment enabled;
- evaluation/runtime budgets and live-eval caps.

Known config governance gaps:

- duplicate JSON keys are not detected by the drift test; `pipeline.default.json` has duplicate `sourceFetchTimeoutMs` entries with the same value;
- `model-tiering.ts` appears stale relative to `model-resolver.ts`;
- some legacy aliases remain accepted (`haiku`, `sonnet`, `opus`) while canonical config uses `budget`, `standard`, `premium`;
- some config fields are weakly wired or not visibly wired into active CB runtime.

## 7. Model And LLM Routing Contract

Active task routing in `llm.ts`:

- `understand`
- `extract_evidence`
- `context_refinement`
- `verdict`
- `report`

Provider/version maps live in `model-resolver.ts`:

- Anthropic: budget/standard/premium maps to current Claude model IDs.
- OpenAI: budget/standard/premium maps to GPT model IDs.
- Google: budget/standard/premium maps to Gemini model IDs.
- Mistral: budget/standard/premium maps to Mistral model IDs.

Debate roles:

- normalized in `config-schemas.ts`;
- role providers/strengths are applied in Stage 4;
- premium/opus roles use `modelOpus` by temporarily overriding `modelVerdict` in Stage 4 LLM calls;
- role-specific provider credentials are checked before use;
- missing credentials fall back to global provider and emit a warning.

Prompt caching:

- Superseded: current policy keeps Anthropic prompt caching off. `getPromptCachingOptions` returns `undefined`, and the pipeline UCM default records `anthropicPromptCachingEnabled: false`.
- The earlier targeted opt-out path for source-heavy extraction is no longer the controlling policy; prompt caching is globally disabled.

Provider fallback:

- search has provider fallback in auto/first-success mode;
- LLM has provider credential fallback for Stage 4 debate roles but no generic cross-provider fallback for all LLM calls;
- provider health and circuit-breaker logic can pause the system after repeated provider failures.

## 8. Budget, Timeout, And Temperature Contract

Covered config/runtime controls include:

- search timeout;
- source fetch timeout;
- PDF parse timeout;
- Stage 2 research wall-clock budget;
- iteration/query/source caps;
- per-claim query budget;
- ACS budget-aware admission estimates;
- SR evaluation/runtime budgets;
- OpenAI TPM guard;
- LLM provider concurrency guard.

Weak or inconsistent wiring:

- `maxTotalTokens`, `maxTokensPerCall`, and `enforceBudgets` exist but appear lightly wired into the active CB runtime;
- several `generateText` paths do not visibly apply configured timeout/max-token settings;
- Stage 4 has preflight but no observed wall-clock timeout knob;
- article adjudication uses hardcoded temperature `0.1`;
- claim selection recommendation uses temperature `0`;
- seeded-evidence remap uses hardcoded temperature `0.1`;
- direction citation adjudication uses temperature `0`;
- direction repair derives temperature from self-consistency temperature;
- `advocateTemperature` exists in config but does not appear wired into the Stage 4 advocate call;
- `deterministic: true` disables self-consistency even when `selfConsistencyMode` defaults to `full`.

Redesign implication: every tunable behavior that affects quality, cost, speed, model choice, or warning behavior should have one visible owner and one wiring point. Dead knobs should be removed or intentionally marked deprecated.

## 9. Drift Protections And Test Coverage

Existing protections:

- JSON-vs-TS config default drift test;
- config schema parsing and legacy normalization tests;
- required prompt-section drift test;
- selected prompt contract tests;
- verdict config deterministic-mode tests;
- Stage 4 preflight tests;
- search circuit-breaker tests;
- source-reliability tests.

Known gaps:

- no prompt variable drift test;
- no runtime prompt-section usage registry that catches orphans like `CLAIM_GROUPING`;
- no global test that every active prompt section renders with call-site variables;
- prompt contract coverage is uneven across sections;
- no duplicate JSON-key detection;
- limited Google/Mistral model-map coverage;
- limited timeout/max-token enforcement tests;
- limited full provider-fallback behavior tests;
- limited SR/config integration coverage;
- generic-hygiene tests rely on fixed forbidden terms, which is brittle.

## 10. Baseline Conclusion

The current prompt/config/model layer is close to a workable governance system but has too many partially overlapping contracts:

1. prompt file frontmatter vs runtime call sites;
2. JSON defaults vs TypeScript defaults;
3. canonical strength names vs legacy tier names;
4. generic model tasks vs debate-role routing;
5. configured temperatures/budgets vs hardcoded per-call values;
6. main analyzer prompts vs source-reliability prompt surfaces.

The replacement pipeline should preserve UCM section-loaded prompts and JSON-backed defaults. The simplification opportunity is to make prompt sections, variables, model tasks, provider roles, timeouts, budgets, and warning behavior explicit contracts with tests. The redesign should delete or quarantine stale prompt sections, stale model-tier helpers, and unwired config knobs before rebuilding the new runtime path.
