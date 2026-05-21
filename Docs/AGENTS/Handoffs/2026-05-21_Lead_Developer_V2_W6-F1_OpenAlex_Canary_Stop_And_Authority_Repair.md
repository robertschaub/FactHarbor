# 2026-05-21 - Lead Developer - V2 W6-F1 OpenAlex Canary Stop And Authority Repair

**Role:** Lead Developer / Captain Deputy
**Package:** `Docs/WIP/2026-05-21_V2_Slice_W6-F1_OpenAlex_Bounded_Academic_Source_Material_Diversity_Review_Package.md`
**Implementation base:** `731ef0e595c59f678e4d50f461c1ce6ca8cb9715`
**Status:** Repair implemented locally, verifier-clean, not yet repair-canary-run

## Summary

The first W6-F1 canary job `3ec1c0c48ff84dd88484580967380320` ran against runtime
`731ef0e595c59f678e4d50f461c1ce6ca8cb9715`. The job succeeded at the product route
and containment held, but W6-F1 did not meet its value objective.

Classification:

`STOP_X7_W6_F1_OPENALEX_NOT_MATERIALIZED_REFINEMENT_REMAINS`

Observed hidden-chain evidence:

- Candidate provider network completed for Wikimedia with `9` candidates.
- Source Material route recorded `3` records, all `wikimedia_page_summary_extract_text`.
- No OpenAlex Source Material record was present.
- W8-B/internal alpha still reported `refine_retrieval`.
- Public V2 stayed `4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged`.
- Default admin and public leak checks found no source-text or hidden-marker leak.

## Debt-Guard

DEBT-GUARD RESULT

Classification: `incomplete-existing-mechanism`

Chosen option: amend the existing W6-F1 OpenAlex path.

Rejected path and why:

- Revert W6-F1: would remove the approved missing capability and return to the same-provider refinement blocker.
- Add provider framework or retry layer: would increase mechanisms before proving one provider can move W6-C.
- Relax W6/W7 gates or prompt behavior: out of scope and would trade quality for progress.

What was removed/simplified:

- A concurrent uncommitted containment edit that disabled the product OpenAlex sink was not kept because it contradicted the approved W6-F1 objective after Captain re-authorized live jobs and naturally needed repair work.

What was added:

- One OpenAlex-specific source-material provider allowlist builder.
- The OpenAlex Source Material leg now builds its own candidate-runtime authority instead of reusing the Wikimedia allowlist where OpenAlex is explicitly disabled.
- Focused test assertions that the OpenAlex network attempt is observed/sanitized and that the orchestrator still passes the OpenAlex source-material sink.

Net mechanism count: unchanged in purpose, small code increase inside the existing W6-F1 mechanism.

Budget reconciliation: touched only W6-F1 source/test/status/handoff/ledger/package docs. No provider framework, public behavior, parser, cache/SR/storage, report/verdict/warning/confidence behavior, ACS/direct URL, or V1 work.

Verification:

- Focused W6-F1/orchestrator/boundary suite: `6` files / `120` tests passed.
- Full V2 local suite: `140` files / `836` tests passed.
- `npm run validate:v2-gates` passed.
- `node scripts/validate-v2-gate-register.mjs --self-test` passed.
- `npm run debt:sensors` returned `advisory_warn` at `2026-05-21T06:14:20.200Z`.
- `npm -w apps/web run build` passed.
- `git diff --check` passed.

Debt accepted and removal trigger:

- `V2-RL-019` still governs W6-F1. If the repair canary again fails to materialize OpenAlex or W6-C still returns `refine_retrieval` without a new actionable non-retrieval stop, Steer-Co should quarantine/remove or redesign this path rather than generalize it.

Residual debt:

- W6-F1 still requires a committed repair, runtime refresh, route/default-admin preflight, and exactly one repair canary before it can be called value-positive.
- Boundary guard remains large; this repair does not address guard-size debt.

## Files Changed

Source/tests:

- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/orchestrator.test.ts`

Docs/governance:

- `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/WIP/2026-05-21_V2_Slice_W6-F1_OpenAlex_Bounded_Academic_Source_Material_Diversity_Review_Package.md`
- `Docs/AGENTS/Agent_Outputs.md`
- this handoff

## Next Step

Commit the focused repair package after final index/diff checks. Then refresh runtime from the repair commit, confirm API/Web runtime commit hashes match, repeat the route/default-admin no-store/leak preflight and OpenAlex no-key posture probe, and run exactly one W6-F1 repair canary if preflight is clean.

Do not add another provider, weaken W6 prompts, relax W7 gates, add retries, open public behavior, or touch V1.
