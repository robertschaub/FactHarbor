# Pipeline Rebuild Phase 2 Stage 1 Baseline

**Date:** 2026-05-12
**Status:** Phase 2 factual baseline checkpoint, read-only
**Owner role:** Lead Architect
**Workspace:** `C:\DEV\FactHarbor`
**Git branch:** `codex/v2-pipeline-rebuild`

---

## 1. Purpose

This document reverse-engineers the current Stage 1 behavior of the ClaimAssessmentBoundary pipeline. It is factual baseline material for the later redesign. It is not a target architecture and does not approve implementation cleanup.

No analyzer source, prompt, config, API, UI, tests, live jobs, or validation behavior was changed or run for this baseline.

## 2. Source Scope

Primary files:

- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
- `apps/web/src/lib/analyzer/claim-extraction-stage.ts`
- `apps/web/src/lib/analyzer/types.ts`
- `apps/web/prompts/claimboundary.prompt.md`
- `apps/web/src/lib/analyzer/claim-selection-recommendation.ts`
- `apps/web/src/lib/claim-selection-flow.ts`
- `apps/web/src/lib/internal-runner-queue.ts`
- `apps/api/Controllers/ClaimSelectionDraftsController.cs`
- `apps/api/Services/ClaimSelectionDraftService.cs`
- `apps/api/Services/JobService.cs`

Relevant tests:

- `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`
- `apps/web/test/unit/lib/analyzer/claimboundary-prepared-stage1.test.ts`
- `apps/web/test/unit/lib/analyzer/claim-contract-validation.test.ts`
- `apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts`
- `apps/web/test/unit/lib/analyzer/claim-extraction-multi-event.test.ts`
- `apps/web/test/unit/lib/analyzer/claim-extraction-preliminary-search-dedupe.test.ts`
- `apps/web/test/unit/lib/analyzer/contract-revalidation-fallback.test.ts`
- `apps/web/test/unit/lib/analyzer/repair-anchor-selection.test.ts`
- `apps/web/test/unit/lib/analyzer/repair-pass-adoption.test.ts`
- `apps/web/test/unit/lib/analyzer/claim-selection-recommendation.test.ts`
- `apps/web/test/unit/lib/claim-selection-flow.test.ts`
- `apps/web/test/unit/lib/internal-runner-queue.test.ts`
- `apps/api.Tests/Services/ClaimSelectionDraftServiceTests.cs`

Specialist read-only baselines used:

- Stage 1 code path: `019e1e17-7420-7b61-bd77-986b8380c9a9`
- Stage 1 prompts: `019e1e17-74f3-7462-afc7-c102306e990d`
- ACS/prepared Stage 1 compatibility: `019e1e17-7474-72d2-a205-234521cc8027`

## 3. Entry Points

The primary pipeline entry point is `runClaimBoundaryAnalysis(input)` in `claimboundary-pipeline.ts`.

Cold Stage 1 path:

1. `runClaimBoundaryAnalysis`
2. `prepareStage1Snapshot`
3. `resolveAnalysisText`
4. `createInitialResearchState`
5. `extractClaims`

Prepared Stage 1 reuse path:

1. `runClaimBoundaryAnalysis` sees `input.preparedStage1`.
2. `buildPreparedResearchState` creates `CBResearchState` from the snapshot.
3. `filterPreparedUnderstandingForSelectedClaims` filters the prepared understanding when `selectedClaimIds` is present.
4. Stage 2 begins with the filtered prepared understanding; cold Stage 1 extraction is skipped.

Important compatibility behavior:

- Missing selected IDs fail closed before research.
- Contract failure from prepared or cold Stage 1 triggers an early damaged report before research.
- The prepared snapshot is durable API/persistence behavior, not only an optimization.

## 4. Cold Stage 1 Sequence

Current `extractClaims` sequence:

1. Load UCM configs: pipeline, search, calculation.
2. Pass 1 rapid claim scan.
3. Salience commitment.
4. Preliminary web search and preliminary evidence extraction.
5. Pass 2 evidence-grounded claim extraction.
6. Claim contract validation.
7. Contract-guided Pass 2 retry if validation requests retry or returns no usable result.
8. Narrow contract repair and validation when the contract summary supports repair.
9. Centrality filter and Gate 1 input selection.
10. Dimension-decomposition tagging for `ambiguous_single_claim`.
11. Gate 1 validation.
12. Low-claim-count reprompt loop, except for already contract-approved claim sets.
13. MT-5(C) multi-event collapse guard and corrective retry when applicable.
14. Final contract refresh if the final accepted claim set differs from the last validated set.
15. Multi-claim atomicity audit and bounded repair loop.
16. Return `CBClaimUnderstanding`.

Current design implication: Stage 1 owns more than extraction. It also owns input-language/geography detection, initial source discovery, early evidence seeding, semantic contract preservation, atomicity enforcement, partial warning generation, ACS preparation state, and downstream research seed data.

## 5. Data Contracts

### 5.1 Input Contract

`AnalysisInput` includes:

- `jobId`
- `inputType: "text" | "url"`
- `inputValue`
- `preparedStage1?: PreparedStage1Snapshot`
- `selectedClaimIds?: string[]`
- `onEvent`

### 5.2 Stage 1 Output Contract

`CBClaimUnderstanding` includes:

- `detectedInputType`
- `impliedClaim`
- `backgroundDetails`
- `articleThesis`
- `atomicClaims`
- `distinctEvents`
- `riskTier`
- `detectedLanguage`
- `inferredGeography`
- `preliminaryEvidence`
- `gate1Stats`
- `preFilterAtomicClaims`
- `gate1Reasoning`
- `inputClassification`
- `salienceCommitment`
- `contractValidationSummary`

### 5.3 AtomicClaim Contract

`AtomicClaim` includes:

- Identity and statement: `id`, `statement`
- Classification: `category`, `verifiability`, `freshnessRequirement`
- Ranking/routing fields: `centrality`, `isCentral`, `claimDirection`, `thesisRelevance`, `checkWorthiness`
- Risk/context fields: `harmPotential`, `keyEntities`, `relevantGeographies`
- Gate 1 inputs: `specificityScore`, `groundingQuality`
- Decomposition marker: `isDimensionDecomposition`
- Research contract: `expectedEvidenceProfile` with methodologies, metrics, source types, `primaryMetric`, `componentMetrics`, and source-native routes.

### 5.4 Prepared Stage 1 Contract

`PreparedStage1Snapshot.version = 1` includes:

- `resolvedInputText`
- optional `resolvedInputSource`
- `preparedUnderstanding`
- optional `acquisitionTrace`
- optional `preparationProvenance`

`PreparedStage1Provenance` records:

- pipeline variant and source input type
- source URL where applicable
- resolved input hash
- executed web commit hash
- prompt content hash
- pipeline/search/calculation config hashes
- selection cap and optional admission cap

## 6. LLM Tasks And Schemas

Stage 1 uses structured LLM outputs for the following tasks:

| Task | Prompt section | Runtime schema / output |
|---|---|---|
| Pass 1 rapid scan | `CLAIM_EXTRACTION_PASS1` | `Pass1OutputSchema`: implied claim, background, rough claims, language, geography |
| Salience commitment | `CLAIM_SALIENCE_COMMITMENT` | `SalienceOutputSchema`: truth-condition anchors |
| Preliminary relevance | `RELEVANCE_CLASSIFICATION` | Relevance classification schema in `research-extraction-stage.ts` |
| Preliminary evidence | `EXTRACT_EVIDENCE` | `ExtractEvidenceOutputSchema`: preliminary evidence items |
| Pass 2 extraction | `CLAIM_EXTRACTION_PASS2` | `Pass2OutputSchema` and `Pass2AtomicClaimSchema` |
| Pass 2 salience appendix | `CLAIM_EXTRACTION_PASS2_BINDING_APPENDIX` | Prompt appendix only |
| Contract validation | `CLAIM_CONTRACT_VALIDATION` | `ClaimContractOutputSchema` |
| Contract validation salience appendix | `CLAIM_CONTRACT_VALIDATION_BINDING_APPENDIX` | Prompt appendix only |
| Single-claim atomicity | `CLAIM_SINGLE_CLAIM_ATOMICITY_VALIDATION` | `SingleClaimAtomicityOutputSchema` |
| Multi-claim atomicity audit | `CLAIM_MULTI_CLAIM_ATOMICITY_AUDIT` | `MultiClaimAtomicityAuditOutputSchema` |
| Multi-claim repair guidance | `CLAIM_MULTI_CLAIM_ATOMICITY_REPAIR_GUIDANCE` | Prompt-rendered guidance |
| Contract repair | `CLAIM_CONTRACT_REPAIR` | `ContractRepairOutputSchema` |
| Gate 1 validation | `CLAIM_VALIDATION` | `Gate1OutputSchema` |
| ACS recommendation | `CLAIM_SELECTION_RECOMMENDATION` | `ClaimSelectionRecommendationOutputSchema` |

Semantic decisions made by LLMs include input classification, claim decomposition, salience anchors, verifiability, freshness requirements, expected evidence profile, relevance, preliminary evidence extraction, contract preservation, anti-inference, atomicity, Gate 1 opinion/specificity/fidelity assessment, and ACS ranking/recommendation.

## 7. Gate 1 Current Contract

Gate 1 is mandatory but currently has a narrower filtering role than the name implies.

Gate 1 LLM output records per-claim:

- `passedOpinion`
- `passedSpecificity`
- `passedFidelity`
- `reasoning`

Current filtering behavior:

- Claims failing both opinion and specificity are filtered.
- Thesis-direct claims are rescued from that filter and receive an info warning.
- Claims below `claimSpecificityMinimum` are filtered only when `groundingQuality` is not `none`.
- If all claims would be filtered, the highest-centrality claim is rescued to avoid an empty pipeline.
- Gate 1 fidelity is telemetry-only. Contract validation is the sole fidelity authority.

Gate 1 outputs are persisted in `gate1Stats`, `preFilterAtomicClaims`, and `gate1Reasoning`.

## 8. Contract Validation And Repair

Stage 1 contract validation is the main protection against claim drift.

Current behavior:

- Runs after Pass 2 and before Gate 1.
- Uses `context_refinement` model tier.
- Retries structured-output validation once through `runClaimContractValidationWithRetry`.
- Evaluates contract output for self-consistency and anchor provenance.
- Applies single-claim binding challenges when applicable.
- If effective retry is required, builds corrective guidance and reruns Pass 2.
- The retry path intentionally avoids preliminary evidence to reduce evidence leakage into claim text.
- If configured and applicable, the narrow repair pass attempts to fuse missing or invalid anchors into existing claims.
- Repair adoption requires post-repair contract validation; if repair still fails, an optional refined repair may run once.
- If final accepted claims differ from the last validated set, final contract revalidation runs or a tightly bounded carry-forward rule is applied.

If the final `contractValidationSummary.preservesContract === false`, `runClaimBoundaryAnalysis` aborts research and returns a damaged report with `UNVERIFIED` fallback verdicts.

Known intentional gap:

- Contract evaluation checks quoted provenance and self-consistency but intentionally trusts the LLM's semantic judgment that preserved quote text is relevant to the anchor. This is documented in tests as an intentional gap.

## 9. Salience And Atomicity

Salience commitment:

- Runs between Pass 1 and preliminary search.
- Produces truth-condition anchors.
- Can run in `audit` or `binding` mode.
- Fails open with an info warning.
- Filters anchors to text that appears in the input by case-insensitive substring check.

Single-claim atomicity:

- Runs only for approved single-claim outputs when salience anchors exist.
- Looks for bundled coordinated branches in one extracted claim.
- Can force contract retry by converting an apparent contract pass into an atomicity failure.

Multi-claim atomicity:

- Runs after final accepted claims when the contract is approved and there is more than one final claim.
- High-confidence bundled-proposition findings can trigger a bounded repair loop.
- Repair acceptance requires Pass 2 retry, Gate 1, contract revalidation, and successful re-audit.
- Failed repair marks the contract state as failed instead of silently shipping unsafe decomposition.

MT-5(C) multi-event guard:

- Detects multiple distinct events with only one surviving claim.
- Usually preserves contract-approved one-claim sets.
- Exception: when trustworthy salience anchors are available, it can retry in binding mode and must revalidate cleanly before accepting the expanded set.

## 10. Preliminary Search And Evidence Seeding

Stage 1 preliminary search:

- Takes Pass 1 rough claims.
- Limits search to the top three rough claims.
- Generates queries from Pass 1 `searchHint` plus truncated claim statement.
- Uses web search provider abstraction.
- Uses LLM relevance classification before fetch.
- Fetches selected relevant sources with deduplicated shared fetch promises.
- Reuses already-resolved non-HTML input source bodies when present.
- Extracts preliminary evidence using the shared `EXTRACT_EVIDENCE` section.
- Adds search queries, fetched sources, acquisition traces, evidence traces, warnings, and preliminary evidence to pipeline state.

Current warning behavior:

- Search provider errors are info-level administrative warnings when fallback providers can recover.
- Preliminary source fetch failures are info-level.
- Salience degradation is info-level.
- Low claim count after reprompts is info-level.
- Gate 1 thesis-direct rescue is info-level.

## 11. ACS And Prepared Stage 1 Compatibility

ACS lifecycle:

1. API creates a claim-selection draft.
2. Web runner prepares Stage 1 and stores a `PreparedStage1Snapshot`.
3. Candidate claims are exactly `preparedStage1.preparedUnderstanding.atomicClaims`.
4. LLM recommendation ranks all candidates and recommends a subset up to the cap.
5. User selection or auto-selection determines `selectedClaimIds`.
6. API creates a normal job carrying `PreparedStage1Json` and `ClaimSelectionJson`.
7. The normal job resumes from the prepared snapshot.

Important compatibility rules:

- Recommendations are advisory, not hidden validity filtering.
- Selected claim IDs are authoritative for the downstream report.
- Selected IDs must exist in the prepared atomic claim set.
- Filtering a prepared understanding must also filter pre-filter claims, Gate 1 reasoning, preliminary evidence mappings, and truth-condition anchor claim IDs.
- If all prepared claims are selected, unresolved preliminary evidence is preserved for Stage 2 remapping.
- Existing V1 `PreparedStage1Snapshot`, `ClaimSelectionDraftState.version = 1`, and `ClaimSelectionMetadata.version = 1` are persisted compatibility surfaces. V2 must consume, migrate, or explicitly invalidate them by approved decision.

## 12. Prompt Baseline

Stage 1/ACS prompt sections in `claimboundary.prompt.md`:

- `CLAIM_EXTRACTION_PASS1`
- `CLAIM_SALIENCE_COMMITMENT`
- `CLAIM_EXTRACTION_PASS2`
- `CLAIM_EXTRACTION_PASS2_BINDING_APPENDIX`
- `CLAIM_CONTRACT_VALIDATION`
- `CLAIM_SINGLE_CLAIM_ATOMICITY_VALIDATION`
- `CLAIM_MULTI_CLAIM_ATOMICITY_AUDIT`
- `CLAIM_MULTI_CLAIM_ATOMICITY_REPAIR_GUIDANCE`
- `CLAIM_CONTRACT_VALIDATION_BINDING_APPENDIX`
- `CLAIM_SELECTION_RECOMMENDATION`
- `CLAIM_VALIDATION`
- `CLAIM_CONTRACT_REPAIR`

Shared Stage 1 preliminary sections:

- `GENERATE_QUERIES`
- `RELEVANCE_CLASSIFICATION`
- `EXTRACT_EVIDENCE`

Prompt governance notes:

- The prompt frontmatter variable list is not a complete section-level contract.
- Section-level variable extraction found variables beyond the frontmatter list.
- `EXTRACT_EVIDENCE` is shared between Stage 1 preliminary extraction and Stage 2; Stage 1 supplies a smaller variable set than the shared section expects, and the loader warns about unresolved placeholders.
- Static prompt-contract tests cover many section substrings/rendering constraints, but they do not prove live LLM behavior.

## 13. Multilingual And Input Neutrality

Current mechanisms:

- Pass 1 returns `detectedLanguage` and `inferredGeography`.
- Pass 1, salience, Pass 2, contract validation, ACS recommendation, Gate 1, and query generation contain prompt instructions to avoid English-only assumptions and preserve input language.
- Pass 2 adds a runtime language directive when detected language is not English.
- Input-neutral question handling is explicit in the Pass 2 prompt.
- Preliminary search passes detected language into the search provider unless overridden.

Current gap:

- The repository-level input-neutrality tolerance of 4 percentage points is not itself embedded as a Stage 1 prompt contract. It remains a governing requirement and later validation surface.

## 14. Deterministic Semantic Hotspots To Review

These are not design decisions yet. They are baseline risks for Phase 3/4:

- Inline analysis-affecting prompt text exists in code, including atomicity guidance, Pass 2 fact-check framing, runtime language directive, contract retry guidance, and multi-event reprompt guidance. Under repository rules, analysis-affecting prompt text should live in UCM-managed prompts.
- Salience anchor filtering uses case-insensitive substring checks against the input.
- Anchor landed checks and repair-anchor narrowing use deterministic text checks to decide whether to repair.
- `detectInputType` is a length/shape heuristic that can still affect routing or fallback output.
- `mapSourceType` and source-type normalization include regex/string bucketing.
- Centrality caps, specificity thresholds, high-confidence atomicity repair filters, and relevance floors deterministically select outcomes from LLM-assigned fields. These are probably structural plumbing when they only consume LLM judgments, but each should be reviewed for semantic leakage.

## 15. Test Coverage

Coverage is broad but V1-coupled.

Covered:

- Pass 1, Pass 2, Gate 1, preliminary search, reprompt loop, and MT-5(C) through `claimboundary-pipeline.test.ts`.
- Contract validation schema, retry wrapper, self-consistency, anchor provenance, salience planning, atomicity, repair decisions, and observability through `claim-contract-validation.test.ts`.
- Prompt sections and selected prompt invariants through `claim-extraction-prompt-contract.test.ts`.
- Prepared Stage 1 reuse, selected-claim filtering, and provenance through `claimboundary-prepared-stage1.test.ts`.
- Preliminary fetch deduplication and resolved-source reuse through `claim-extraction-preliminary-search-dedupe.test.ts`.
- Multi-event helper behavior through `claim-extraction-multi-event.test.ts`.
- Revalidation carry-forward rules through `contract-revalidation-fallback.test.ts`.
- Repair adoption safety through `repair-pass-adoption.test.ts`.
- ACS recommendation validation through `claim-selection-recommendation.test.ts`.
- Claim-selection caps, idle behavior, defaults, and selection validation through `claim-selection-flow.test.ts`.
- Runner draft behavior through `internal-runner-queue.test.ts`.
- API draft/job persistence through `ClaimSelectionDraftServiceTests.cs`.

Known gaps:

- Most prompt tests are static render/substr tests, not live LLM behavior tests.
- Contract validation intentionally trusts LLM semantic quote relevance.
- Some Stage 1 behavior is only tested through the monolithic pipeline test, which may not survive a clean architecture unless converted to contract-level tests.
- ACS V1 snapshot migration/consumption policy is unresolved for V2.
- No expensive/live validation was run for this baseline.

## 16. Current Protective Mechanism Registry

| Mechanism | Current purpose | Downstream dependency | Replacement verifier placeholder |
|---|---|---|---|
| Pass 1 rough scan | Language/geography and rough claim discovery | Preliminary search, Pass 2 context | Stage 1 contract tests and multilingual checks |
| Salience commitment | Precommit truth-condition anchors | Contract validation, binding retry, atomicity | Anchor preservation tests and semantic drift checks |
| Preliminary search | Seed initial evidence and grounding signals | Pass 2 profiles, Stage 2 seed state | Search/evidence lifecycle tests |
| Pass 2 extraction | Produce `CBClaimUnderstanding` and `AtomicClaim`s | Entire pipeline | Stage 1 contract and benchmark checks |
| Contract validation | Sole claim-fidelity authority | Early damaged report, repair, Gate 1 pruning rules | Contract validation tests and comparator reports |
| Contract retry | Recover from extraction drift | Preserved claim set | Contract revalidation tests |
| Narrow contract repair | Fix anchor loss without broad re-extraction | Contract approval, final claims | Repair adoption/revalidation tests |
| Centrality/Gate 1 selection | Keep manageable claim set while preserving anchors | Stage 2 workload and report shape | Gate 1 stats and selected-claim coverage |
| Gate 1 validation | Filter non-factual/non-specific non-direct claims | Atomic claims reaching research | Gate 1 contract tests |
| Low-count reprompt | Recover under-decomposed inputs | Stage 2 claim coverage | Reprompt loop tests |
| MT-5(C) guard | Prevent multi-event collapse into one claim | Report completeness | Multi-event tests and benchmark families |
| Final contract refresh | Ensure final claims match validated contract | Early damaged report decision | Revalidation fallback tests |
| Multi-claim atomicity audit | Prevent bundled claims after decomposition | Verdict boundary quality | Atomicity audit/repair tests |
| Prepared snapshot reuse | Avoid repeated Stage 1 and enable ACS | ACS job flow, Stage 2 | Prepared-stage tests and API compatibility tests |

## 17. Open Questions For Later Phases

These should not be decided inside the baseline:

- Should V2 keep Stage 1 preliminary evidence inside the Understand stage, or move it into a Research-owned preflight while preserving current behavior?
- Should V2 centralize Stage 1 schemas and prompt-variable contracts instead of distributing them through stage files and prompt frontmatter?
- Should V2 consume V1 prepared snapshots indefinitely, migrate them, or invalidate them with explicit user/admin behavior?
- Which inline code prompt strings must move to UCM-managed prompt sections?
- Which deterministic text checks are acceptable structural validation, and which must become LLM-governed semantic decisions?
- How should V2 preserve the current damaged-report early exit without coupling it to V1 `contractValidationSummary` shape?

Deputy-team escalation is not needed for this baseline because no product/API/UI/report compatibility exception, validation spend, or target architecture decision was made.
