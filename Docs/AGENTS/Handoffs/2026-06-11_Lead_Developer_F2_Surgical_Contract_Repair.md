# 2026-06-11 | Lead Developer | Claude (Fable 5) | F2 Surgical Per-Claim Contract Repair — [Significant] [open-items: yes]

## What was done

Implemented and committed (`bb4de5f7`) the F2 surgical per-claim contract repair — the validated root fix for the `report_damaged` hard-abort (~13% of jobs; the largest checkworthy-claim UNVERIFIED family per the 2026-05-31 census).

**Mechanism:** a new recovery rung in Stage 1 between the whole-set contract retry and contract completion ([claim-extraction-stage.ts](../../apps/web/src/lib/analyzer/claim-extraction-stage.ts), F2 block before the completion block). When the summary is `contract_violated` AND the latest validator result carries per-claim critiques matching the active claim set, one bounded LLM call (`CLAIM_CONTRACT_SURGICAL_REPAIR`, `context_refinement` tier) returns replacement groups for ONLY the flagged claims (split Rule-17 bundling / rewrite Rule-3 proxy drift / collapse over-decomposition). Unflagged claims are preserved **by construction** (they never round-trip through the model). The merged set must pass the unchanged ordinary validator (`evaluateClaimContractValidation` + `applyApprovedSingleClaimChallenges`) before adoption. The gate is NOT relaxed.

**Key seams:**
- `latestContractCritique` (hoisted near `contractValidationSummary`) tracks the raw validator result corresponding to the current `activePass2` set; updated at the 5 adoption sites that run before the surgical pass. ⚠ Completion adoption and the final post-Gate-1 revalidation do NOT refresh it — do not add readers after the surgical block.
- `selectFlaggedContractAssessments` + `normalizeSurgicalContractRepairSet` (both exported, pure) — structural guards: flagged-coverage exactly-once, group-size cap (`surgicalRepairMaxClaimsPerGroup`, default 4), collision-proof id assignment, terminal id-uniqueness, statement-level no-op rejection.
- Config: `claimContractValidation.surgicalRepairEnabled` (default true) + `surgicalRepairMaxClaimsPerGroup` in UCM (config-schemas.ts + calculation.default.json, drift-test-synced).
- Telemetry: `contract_surgical_repair_fired` (invocation) + `contract_surgical_repair_diagnostic` (outcome: adopted/rejected/validation_failed/not_validated_cleanly, with claimsBefore/claimsAfter) + distinct `stageAttribution: "surgical_repair"` — F2's fire/rescue rates are measurable from stored reports.

**Verification:** full safe suite 1,966 passed / 0 failed; build clean; local prompt reseed done (claimboundary 1.0.12). 3-lens adversarial review (correctness/compliance/regression) run pre-commit; both should-fix findings fixed (duplicate-id collision in the merge; missing outcome telemetry); compliance lens verified LLM-Intelligence-mandate conformance (all new deterministic checks are identity/plumbing) and prompt-section genericity (abstract examples only).

## Live validation run 2026-06-11 (4 jobs) — REGRESSION-CLEAR, EFFICACY UNPROVEN

> **Superseded on efficacy (2026-06-12):** F2 fired for the first time on job `b84ebbfe` (hydrogen-en) — validator flagged all 3 proxy-drift claims, F2 collapsed 3→1 holistic claim, re-validated clean, adopted (`stageAttribution=surgical_repair`), job finished MOSTLY-FALSE 15/78 in band. The section below remains the accurate record of the 2026-06-11 batch only.

Four Captain-defined inputs, one job each, on `3fc2b26b` (post-F2, post-extension):

| family | job | verdict / truth / conf | contract stage | vs benchmark band |
|---|---|---|---|---|
| plastic-en | `c47c40c8` | MOSTLY-FALSE 28 / 75 | retry | MISS (label out of set; truth 28 vs 42–65) |
| bolsonaro-en | `283cbad2` | UNVERIFIED 50 / 0 | initial | MISS (insufficient evidence; 2 boundaries vs min 3) |
| hydrogen-en | `697ed11e` | MOSTLY-FALSE 25 / 35 | initial | PARTIAL (label+truth in band; conf 35 vs 65–85) |
| bundesrat-rechtskraftig | `bea5ad75` | MOSTLY-FALSE 25 / 24 | retry | MISS (label one step too false; conf 24 vs 55–85) |

**What this run does establish:**
- **0/4 `report_damaged`** — no hard aborts, all four reached a report. No regression introduced by F2 or its extension.
- Contract state healthy in all four: `preservesContract=true`, `rePromptRequired=false`. Two jobs were rescued by the *ordinary* whole-set retry (`stageAttribution=retry`), two passed at initial validation.
- Telemetry plumbing verified end to end: `contract_validation_retry_triggered` is persisted in `ResultJson` for exactly the two `stage=retry` jobs.

**What this run does NOT establish — F2 never executed.** Zero `contract_surgical_repair_fired` / `_diagnostic` warnings across all four jobs (verified by substring scan of stored `ResultJson`). The surgical pass only triggers on `failureMode=contract_violated` *after* the ordinary retry fails, and that state never occurred. With a ~13% base rate, expected hits in 4 jobs ≈ 0.5, so this is statistically unsurprising and says nothing about F2's efficacy. **The 13%→~0 claim remains unmeasured.**

**Separate finding (NOT attributable to F2 — the pass did not run and Stage 1 was clean in every job):** confidence collapsed far below band in 3 of 4 jobs (0, 24, 35 against band minima of 45/55/65). bolsonaro-en produced 6 evidence items from 14 sources across 21 searches with 0 publishable claims at Gate 4 — the `insufficient_evidence` / source-scarcity family, not the contract family. One run per family cannot separate this from known evidence-pool variance; it needs N≥5 per arm before anyone acts on it.

**Environment trap hit during this run:** the first 4-job batch failed 4/4 within ~30s with `AI_APICallError: Not Found`. Root cause was NOT the pipeline — the AI-harness tool shell injects `ANTHROPIC_BASE_URL` without `/v1`, services spawned from it inherit it, and `@ai-sdk/anthropic` prefers it over its correct default. Fixed in `scripts/restart-clean.ps1` (`3fc2b26b`); always start services through that script.

## For next agent

1. **F2 efficacy is still unmeasured** (the 2026-06-11 run did not exercise the path — see table above). Expected effect per the design: report_damaged rate 13% → ~0 on the affected families; same-input bimodal complete/abort behavior disappears. Measure with `scripts/diag/checkworthy-unverified-census.cjs` after fresh runs on Captain-defined inputs (e.g. the plastic/bolsonaro/hydrogen families that produced the 3 known failure shapes). Per the fail-fast cost rule, 3 jobs showing clear regression = stop.
2. **Production rollout requires UCM verification:** admin-owned prompt blobs do NOT auto-refresh. After deploying, verify the active prod claimboundary prompt is version 1.0.12 / contains `CLAIM_CONTRACT_SURGICAL_REPAIR`. If the section is missing in prod, F2 silently no-ops — visible as `contract_surgical_repair_diagnostic` outcome=rejected, reason "prompt section not found".
3. **Coverage boundary (UPDATED — extension landed same day, Captain-commissioned):** the single-claim atomicity path (bundling on one-claim sets, the comparative "more efficient" shape) is now covered via `synthesizeAtomicityFlaggedAssessments` — when the per-claim critique is empty but the summary carries `atomicityRetryReason` and the active set is exactly one claim, a flagged assessment is synthesized so F2 runs a split repair. Telemetry distinguishes the sources via `critiqueSource: "validator_per_claim" | "atomicity_challenge"` in both warnings. Remaining intentional skips: binding-challenge, anchor-provenance (C11b owns anchors), normative injection — these fall through to completion.

## Warnings

- The review's collapse-channel analysis: N→1 collapse of arbitrarily many flagged claims is representable and guarded only by the unchanged validator (Rules 7/17/21) plus single-claim challenges. Accepted per the validated design, but watch `claimsBefore`/`claimsAfter` in the diagnostic telemetry for degenerate collapses.
- `state.llmCalls++` after `runSurgicalContractRepair` counts an attempt even if the prompt section was missing (mirrors the completion block's accounting).
- One legacy test (`claimboundary-pipeline.test.ts` reprompt-loop test) opts out via `surgicalRepairEnabled: false`, mirroring the C11b precedent.

## Learnings

- `getNextAtomicClaimIdFactory` seeds only from the input claims — any caller that also accepts LLM-requested fresh ids must re-draw against its own assigned-id set or duplicates slip through silently (validators dedupe by Set and won't catch it; Gate 1's dedupe would then DROP a claim).
- The Zod `.catch([])` on group arrays means one invalid strict field (`freshnessRequirement`) collapses a whole group to `[]` and surfaces as "no replacement claims" — fail-closed but misleading; check raw output when diagnosing.
