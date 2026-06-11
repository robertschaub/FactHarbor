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

## For next agent

1. **Live validation is NOT done** (no jobs were submitted). Expected effect per the design: report_damaged rate 13% → ~0 on the affected families; same-input bimodal complete/abort behavior disappears. Measure with `scripts/diag/checkworthy-unverified-census.cjs` after fresh runs on Captain-defined inputs (e.g. the plastic/bolsonaro/hydrogen families that produced the 3 known failure shapes). Per the fail-fast cost rule, 3 jobs showing clear regression = stop.
2. **Production rollout requires UCM verification:** admin-owned prompt blobs do NOT auto-refresh. After deploying, verify the active prod claimboundary prompt is version 1.0.12 / contains `CLAIM_CONTRACT_SURGICAL_REPAIR`. If the section is missing in prod, F2 silently no-ops — visible as `contract_surgical_repair_diagnostic` outcome=rejected, reason "prompt section not found".
3. **Coverage boundary (UPDATED — extension landed same day, Captain-commissioned):** the single-claim atomicity path (bundling on one-claim sets, the comparative "more efficient" shape) is now covered via `synthesizeAtomicityFlaggedAssessments` — when the per-claim critique is empty but the summary carries `atomicityRetryReason` and the active set is exactly one claim, a flagged assessment is synthesized so F2 runs a split repair. Telemetry distinguishes the sources via `critiqueSource: "validator_per_claim" | "atomicity_challenge"` in both warnings. Remaining intentional skips: binding-challenge, anchor-provenance (C11b owns anchors), normative injection — these fall through to completion.

## Warnings

- The review's collapse-channel analysis: N→1 collapse of arbitrarily many flagged claims is representable and guarded only by the unchanged validator (Rules 7/17/21) plus single-claim challenges. Accepted per the validated design, but watch `claimsBefore`/`claimsAfter` in the diagnostic telemetry for degenerate collapses.
- `state.llmCalls++` after `runSurgicalContractRepair` counts an attempt even if the prompt section was missing (mirrors the completion block's accounting).
- One legacy test (`claimboundary-pipeline.test.ts` reprompt-loop test) opts out via `surgicalRepairEnabled: false`, mirroring the C11b precedent.

## Learnings

- `getNextAtomicClaimIdFactory` seeds only from the input claims — any caller that also accepts LLM-requested fresh ids must re-draw against its own assigned-id set or duplicates slip through silently (validators dedupe by Set and won't catch it; Gate 1's dedupe would then DROP a claim).
- The Zod `.catch([])` on group arrays means one invalid strict field (`freshnessRequirement`) collapses a whole group to `[]` and surfaces as "no replacement claims" — fail-closed but misleading; check raw output when diagnosing.
