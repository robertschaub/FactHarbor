# Analysis Quality Consolidated Execution Plan

Status: execution-ready plan, documentation-only. Gemini and Claude reviewer conditions incorporated on 2026-06-18. Behavior changes start only after the Phase 1 attribution baseline and Phase 2 isolation rules.

## Sources

- `Docs/AGENTS/Handoffs/2026-06-18_Senior_Developer_Analysis_Improvement_Strategy.md`
- `Docs/AGENTS/Handoffs/2026-06-18_Senior_Developer_Prompt_History_Audit_Plan.md`
- `Docs/AGENTS/Handoffs/2026-06-18_Senior_Developer_Stage2_D5_Recovery.md`
- `Docs/AGENTS/Handoffs/2026-06-17_Senior_Developer_Live_Validation_Stop_Rule.md`
- `Docs/WIP/2026-06-04_Report_Quality_Measurement_Implementation_Plan.md`
- `Docs/AGENTS/Captain_Quality_Expectations.md`
- `Docs/AGENTS/benchmark-expectations.json`
- `Docs/AGENTS/report-quality-expectations.json`

## Objective

Improve FactHarbor analysis quality by moving from isolated report fixes to a measured, stage-isolated improvement loop.

The first target is not a better-looking single report. The first target is knowing why reports fail, which stage owns the failure, and which fix can be verified without teaching to the Captain benchmark inputs.

## Review Consolidation

Gemini and Claude reviewers both returned `CONDITIONAL GO`. Accepted conditions:

- Define scorer-noise and minimum-evidence confidence before using scorer deltas to greenlight behavior changes.
- Treat low-confidence attribution rows as blockers, not as permission to edit.
- Freeze and document Phase 2 fixture construction before D5/Stage4 behavior work.
- Add lane-bloat and cost gates for retrieval-language planning.
- Add negative sufficiency gates so weak, stale, secondary, or incomplete evidence is rejected.
- Add Q-BE, verdict-integrity, Q-HF1, cost, and rollback stop criteria.
- Keep Phase 3 after Phase 2; do not merge ownership/schema fixes before stage isolation exists.

Rejected or narrowed condition:

- Reviewers suggested synthetic held-out probes. That conflicts with the Captain-defined-input rule. If broader held-out coverage is needed, ask the Captain to define or approve the exact input before using it for validation, benchmark, live analysis, or planning.

## Current Baseline

Read-only checks on 2026-06-18:

| Signal | Observed state |
| --- | --- |
| `0396ea47` scorer slice | 2 scored reports, C4 mean 25.0, in-band 0% |
| `6b9c562f` scorer slice | 8 scored reports, C4 mean 70.0, in-band 43% |
| Population census | 1640 `SUCCEEDED` jobs scanned |
| Q-HF1 hard-failure floor | 135 jobs, 8.2% |
| Top-level `UNVERIFIED` | 253 jobs, 15.4% |
| Checkworthy-claim `UNVERIFIED` | 992 / 4038 claims, 24.6% |
| Main current failures | English Bolsonaro source-native retrieval gap; asylum-current D5/Stage4 decisive-metric sufficiency gap |

These numbers make narrow prompt tuning a low-confidence next move. They also make broad live validation wasteful until attribution improves.

## Non-Negotiables

- Use only Captain-defined analysis inputs.
- Do not add domain-specific hardcoding or keyword tables.
- Do not add deterministic semantic decision logic.
- Keep analysis-affecting tunables in UCM.
- Do not prune `claimboundary.prompt.md` before measurement and isolation.
- Do not resurrect reverted prompt fixes without a new investigated mechanism.
- Do not run paid live jobs before a committed, locally verified fix and runtime refresh.
- Before the next behavior edit in the Stage2/D5 recovery chain, record failed-attempt recovery from baseline `0396ea47`.

## Execution Plan

| Phase | Goal | Work | Verification | Exit gate |
| --- | --- | --- | --- | --- |
| 0. Lock the lane | Prevent more pile-up before measurement | Treat this plan as the current execution order. Freeze speculative prompt/code/UCM edits. For Stage2/D5 behavior edits, log `ATTEMPT 2` with baseline `0396ea47` before editing. | Documentation review only. | Captain has this plan; no behavior edits made. |
| 1. Attribution baseline | Convert failures into stage-owned causes | Extend `scripts/measure-report-quality.ts` or a companion read-only diagnostic to emit per-family/current-build rows for Q-HF1, Q-BE, Q-EV6, Q-EV_LANGUAGE, source acquisition/fetch, D5 reason, verdict integrity, prompt rollout/provenance, and cost. Define the scorer-noise floor, minimum-N rule, and confidence labels before using deltas for decisions. | `node --check` for scripts, safe unit tests if shared code is touched, read-only scorer runs for `6b9c562f`, `0396ea47`, and recent accepted comparators where available. | Every current failing Captain input has a primary failure owner and confidence level: retrieval, extraction, D5, Stage4, aggregation, infra, or unknown. Low-confidence rows block downstream behavior edits for that failure class. |
| 2. Stage isolation | Stop conflating retrieval failures with D5/Stage4 failures | Add isolated harnesses or fixtures for: retrieval-language planning dry-run; D5 sufficiency on stored evidence; Stage4 verdict generation from injected evidence. First document a frozen fixture-construction rule: use only Captain-defined inputs and evidence mechanically derived from stored reports or approved reference dossiers; record evidence IDs/source IDs; no invented evidence text. Manual curation beyond existing reference dossiers requires Captain approval. | Focused unit tests. Fixture checksums or snapshots to detect silent fixture edits. No live jobs. | We can prove whether a D5/Stage4 change works when retrieval is held constant, and whether retrieval-language planning changes the intended lanes without running search. |
| 3. Ownership and schema fixes | Remove known prompt/runtime mismatches before larger behavior work | Fix source-reliability prompt ownership or explicitly mark the Markdown prompt as non-authoritative. Align input-policy-gate prompt/schema/runtime expectations. No broad ClaimBoundary prompt edits. | Safe tests, build, scorer baseline rerun. Diverse review because behavior can shift. | No silent regression in scorer table; prompt ownership is single-source or explicitly documented. |
| 4. Generic source-native retrieval planning | Address the English-source-only failure class generically | Add LLM structured output for retrieval language/source-native route planning. Code uses the structure as routing data; it does not infer meaning with keywords. UCM controls max lanes, budgets, and fallback behavior. | Planner unit tests across Captain-defined languages; dry-run query/plan snapshots; lane-bloat checks on standard single-language inputs; safe suite/build. No live jobs until local gates pass. | Captain-defined inputs whose input language differs from likely source-native evidence routes get source-native lanes without hardcoded countries, topics, names, or language lists. Standard inputs do not trigger unnecessary multilingual lanes or exceed the phase cost ceiling. |
| 5. Authoritative-evidence sufficiency admission | Let authoritative evidence reach verdict reasoning without hardcoded topic rules | Rework D5/Stage4 admission so the LLM can assess evidence with explicit generic signals: authority, recency, primary-source status, directness to the claim, and coverage. Prompts/code must not enumerate agencies, metric names, countries, or benchmark topics. Keep deterministic code structural only; the sufficiency judgment remains LLM-backed. | D5/Stage4 injection harness, focused tests, scorer rerun, and negative fixtures from stored/reference evidence where weak, stale, secondary, incomplete, or unsupported-component evidence must stay confidence-limited or `UNVERIFIED`. External review before any prompt/UCM change. | The known current-metric failure class can be assessed from frozen decisive evidence, while at least one previously accepted Captain comparator shows no regression and negative fixtures are rejected. |
| 6. Targeted live validation | Spend only after local causality is testable | Commit first, restart/reseed, confirm prompt/config/UCM runtime state, then run isolated Captain-defined jobs one at a time. Start with one previously accepted Captain comparator as a regression sentinel, then the known failures. | Live jobs plus scorer comparison. Apply corrected stop rule, Q-HF1 stop rule, Q-BE/verdict-integrity ceiling, and phase cost ceiling. | Improvement clears the local target without regressing prior accepted lanes beyond the defined scorer-noise floor. |
| 7. Prompt consolidation | Reduce prompt complexity only where measured safe | Audit load-bearing prompt sections. Remove or merge only sections proven redundant, contradicted, or replaced by code/UCM. Keep abstract wording; no test-case terms. | Prompt diff review, safe tests/build, scorer comparison, limited live validation only if behavior changed. | Prompt complexity drops without worsening Q-HF1, benchmark bands, or checkworthy-claim `UNVERIFIED`. |

## Live Validation Rule

Live validation is allowed only after the relevant fix is committed, the runtime is refreshed, and prompt/config state is reseeded if needed.

Stop a validation batch only after more than one completed job and either:

- more than 50% of top-level verdicts are `UNVERIFIED`, or
- more than 50% of AtomicClaim verdicts are `UNVERIFIED`.

The general fail-fast rule still applies: if the first 3 jobs show a clear regression, stop and classify the attempt.

Additional stop signals for Phase 6:

- Stop immediately if any job hits Q-HF1 hard failure (`report_damaged`, `analysis_generation_failed`, or `llm_provider_error`) unless the failure is clearly unrelated infrastructure already classified outside the change.
- Stop immediately if a verdict-integrity failure could materially alter verdict direction or confidence tier.
- Stop the phase if Q-BE verdict band, truth band, or confidence band regresses beyond the defined scorer-noise floor on a previously accepted comparator.
- Stop when the phase cost ceiling is reached. If no ceiling has been approved, ask the Captain before live validation.

The Bolsonaro sentence-justice/fairness carve-out is validation bookkeeping only. It must not be implemented in prompts, code, UCM, or scoring logic. Apply it only to the Captain-approved clauses already named by the Captain, including equivalent clauses in Captain-defined language variants. If equivalence is unclear, do not auto-exempt; ask the Captain.

## Review Requirements

| Change type | Review required |
| --- | --- |
| Read-only diagnostics | Main-agent review is enough unless results drive architecture. |
| Script-only scorer/diagnostic changes | Senior Developer self-review plus safe verification. |
| Source-reliability or input-policy ownership | Diverse review before merge because behavior can shift. |
| Retrieval-language planner | Lead Architect or Code Reviewer plus LLM Expert review. |
| D5/Stage4 sufficiency | Diverse review required before live jobs. |
| Prompt edits | Allowed only when investigated, justified, and reviewed; speculative or teaching-to-test edits require Captain approval. |
| UCM defaults | Keep JSON and TypeScript defaults in sync; run drift tests. |

## Rollback Criteria

For Phases 3-7, define the rollback trigger before merging the change:

- Which scorer rows must not regress.
- Which tests or fixture snapshots must remain stable.
- Which warning types or Q-codes cause immediate quarantine.
- Whether rollback means revert, amend, quarantine behind UCM, or keep with documented residual risk.

If a post-change verifier fails or the user judges the result worse, follow failed-attempt recovery before the next edit.

## Explicitly Not Next

- Do not launch another broad live batch.
- Do not prune or rewrite `claimboundary.prompt.md`.
- Do not add country, language, person, institution, or topic keyword rules.
- Do not use the current two failed jobs as proof of a broad pipeline regression without scorer attribution.
- Do not revert to a historical "best commit" or provider setup as a strategy.
- Do not implement D5 sufficiency before stage isolation exists.

## First Work Packet

Recommended first packet, no live jobs:

1. Add a current-build failure-attribution output to the zero-spend scorer or a companion diagnostic.
2. Include rows for all Captain benchmark families and columns for Q-HF1, Q-BE, Q-EV6, Q-EV_LANGUAGE, D5 reason, verdict integrity, source acquisition/fetch, and provenance.
3. Define scorer-noise floor, minimum-N/confidence labels, and the "low-confidence blocks downstream edits" rule.
4. Run it read-only against `6b9c562f`, `0396ea47`, and latest accepted comparators where available.
5. Document Phase 2 fixture-construction rules before any behavior edit.

Default recommendation: Phase 1 first, then Phase 2, then Phase 3. Do not merge Phase 3 before Phase 2.

## Phase 1 Status

2026-06-18 update:

- Added read-only diagnostic: `node scripts/diag/current-build-failure-attribution.cjs`.
- Supported modes: `--build <prefix>`, `--latest-per-family`, `--latest-verified`, `--family <slug>`, `--json`.
- Verification run: `node --check scripts/diag/current-build-failure-attribution.cjs`.
- Read-only runs completed for `0396ea47`, `6b9c562f`, and `--latest-verified`.
- Gemini review: `GO`.
- Claude review: `CONDITIONAL GO`; conditions addressed by removing unused label-band code, surfacing prompt hashes in text output, and narrowing per-claim `UNVERIFIED` attribution so an otherwise in-band report is not treated as a family-level failure diagnosis.

Current structural attribution from the diagnostic:

| Scope | Finding |
| --- | --- |
| `0396ea47` / `bolsonaro-en` | `research_extraction_or_relevance`, Q-BE failed, Q-EV6 failed, D5 saw zero directional evidence |
| `0396ea47` / `asylum-235000-de` | `research_budget_or_d5_sufficiency`, Q-BE failed, query budget exhausted, one directional item reached D5 |
| `6b9c562f` | all family/build cells are `low` confidence (`n=1`), so they are blockers for behavior-edit greenlights |
| `--latest-verified` | only `bolsonaro-pt` accepted comparator is present in the local DB; the other accepted comparator IDs are absent locally |

Phase 1 is not a behavior greenlight yet. The next step is to decide whether to increase N through Captain-approved isolated reruns later, or proceed to Phase 2 fixture isolation using the current low-confidence rows only as routing hints.

## Phase 2 Fixture Rule And Status

Frozen fixture construction rule:

- Use only jobs whose `InputValue` exactly matches a Captain-defined input in `Docs/AGENTS/benchmark-expectations.json`.
- Export mechanically from stored `Jobs.ResultJson` plus the latest `AnalysisMetrics.MetricsJson`; do not paraphrase inputs, synthesize evidence, translate evidence, or hand-curate evidence text.
- Preserve stage-facing structures needed for isolation: understanding, claim selection, claim boundaries, claim verdicts, evidence items, sources, search queries, warnings, quality gates, and D5/quality metrics.
- Keep source JSON hashes, fixture hashes, and stage-content hashes so later tests can detect silent fixture edits and distinguish telemetry churn from analysis-content changes.
- Treat the current `0396ea47` rows as routing fixtures only; they are still `n=1` low-confidence rows and do not greenlight behavior edits by themselves.

2026-06-18 implementation status:

- Added exporter: `node scripts/diag/export-stage-isolation-fixtures.cjs`.
- Generated initial fixture set: `apps/web/test/fixtures/analysis-quality/phase2-current-failures.0396ea47.json`.
- Fixture set hash: `b94b0b683f913f8ba5a0895d50c5340572cdbd0c53ed42c1539ee2d1d17f0459`.
- Included jobs:
  - `asylum-235000-de` / `52caacff9cc946a2a676c05fe8a9011a` / fixture hash `9b6cc792c0da...` / stage-content hash `fa5049216e60...`
  - `bolsonaro-en` / `7d3dba8790d345fc9ad534af9acb0be0` / fixture hash `efb15adfbf2d...` / stage-content hash `4edeb2409aef...`
- Verification: `node --check scripts/diag/export-stage-isolation-fixtures.cjs`; fixture export; JSON parse and fixture summary check; build-selection dry run for `--build 0396ea47 --latest-per-family`.
- Added fixture-consuming test and D5 replay harness: `apps/web/test/unit/lib/analyzer/analysis-stage-fixtures.test.ts`.
- Focused test verification: `npm -w apps/web exec vitest run test/unit/lib/analyzer/analysis-stage-fixtures.test.ts` (`4 passed`).

Next Phase 2 work should add the first isolated behavior harness around research-extraction/evidence-linkage, or start the D5 sufficiency behavior edit with failed-attempt recovery logged first. No live jobs are needed for that step.

## Phase 3 Status

2026-06-18 source-reliability ownership update:

- Confirmed the main SR evaluation and refinement prompts are currently TypeScript-owned in `apps/web/src/lib/source-reliability/sr-eval-prompts.ts`, not loaded from `apps/web/prompts/source-reliability.prompt.md`.
- Confirmed `source-reliability.prompt.md` is runtime-read for evidence-quality assessment sections by `sr-eval-enrichment.ts`.
- Updated `apps/web/prompts/README.md` and `apps/web/src/lib/source-reliability-config.ts` comments to state the current split ownership and code-enforced score/rating post-processing.
- No SR prompt text, UCM defaults, or runtime logic changed.
- Verification: `npm -w apps/web exec vitest run test/unit/lib/source-reliability-config.test.ts` (`29 passed`), plus the Phase 2 fixture harness (`4 passed`).

2026-06-18 input-policy-gate schema update:

- Added structural normalization for LLM gate output in `apps/web/src/lib/input-policy-gate.ts`.
- Preserves generic snake_case `reasonCode` values instead of maintaining a stale closed list.
- Keeps `messageKey` inside the UI-safe enum and prevents `messageKey: "unknown"` from reaching the API response.
- Updated `apps/web/prompts/input-policy-gate.prompt.md` to state the exact message-key contract.
- Verification: `npm -w apps/web exec vitest run test/unit/lib/input-policy-gate.test.ts` (`4 passed`), `npm -w apps/web exec vitest run test/unit/lib/analyzer/prompt-frontmatter-drift.test.ts` (`5 passed`), and `npm -w apps/web run build` (passed; postbuild reseeded `input-policy-gate`, `Prompts: 1 changed`).
- Build warning observed: Turbopack NFT tracing warning through `source-reliability-cache.ts`; non-blocking and unrelated to this slice.
- Gemini review: `GO`.
- Claude review: `GO`; optional comment explaining `gate_unavailable` as a system-only fallback was added, then `input-policy-gate.test.ts` was rerun (`4 passed`).

Phase 3 ownership/schema fixes are complete enough to proceed to the first reviewed behavior slice.

## Phase 4 Status

2026-06-18 Path B source-native scaffold:

- Reviewed implementation path before editing: Gemini `GO`; Claude `CONDITIONAL GO`, requiring default-off/no-op tests, budget non-consumption assertions, downstream fixture isolation, and JSON round-trip coverage.
- Added retrieval lane type support for `source_native` in `apps/web/src/lib/analyzer/types.ts`.
- Added UCM-visible, default-off `sourceNativeSupplementaryLane` in `apps/web/src/lib/config-schemas.ts` and `apps/web/configs/search.default.json`.
- Refactored supplementary lane execution in `apps/web/src/lib/analyzer/research-orchestrator.ts` so the existing English lane delegates to a shared executor while preserving its guards, budget consumption, and one-query behavior.
- Added `maybeRunSourceNativeSupplementaryLane` as scaffold-only behavior: with default config it returns immediately; if enabled before a planner exists, it records zero-count `source_native` telemetry with `source_native:planner_unavailable` and performs no search, no query generation, no LLM call, and no query-budget consumption.
- No `claimboundary.prompt.md`, prompt-loader, live-job, or planner behavior was changed.
- Verification: `npm -w apps/web exec vitest run test/unit/lib/analyzer/en-supplementary-lane-geography.test.ts` (`6 passed`), `npm -w apps/web exec vitest run test/unit/lib/analyzer/analysis-stage-fixtures.test.ts` (`5 passed`), `npm -w apps/web exec vitest run test/unit/lib/config-drift.test.ts` (`4 passed`), `npm -w apps/web exec vitest run test/unit/lib/analyzer/primary-source-refinement.test.ts` (`12 passed`), `npm -w apps/web run build` (passed), and `npm test` (`102` files, `1986` passed, `1` skipped).
- Post-implementation review: Gemini `GO`; Claude `CONDITIONAL GO` test conditions were addressed by the added no-budget/no-LLM, fixture-isolation, and JSON round-trip tests.

Next Phase 4 work is the actual LLM source-native planner. It must be a separate reviewed slice with no deterministic geography-to-language mapping, no hardcoded language/country/topic lists, UCM-controlled budgets, and no live jobs before commit plus runtime/config refresh.
