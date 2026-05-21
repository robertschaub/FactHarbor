# Captain Deputy Handoff Pause - V2 W6-F1

**Date:** 2026-05-21
**Role:** Captain Deputy
**Reason:** Captain-directed transfer to successor agent team
**Application-code HEAD before handoff docs commit:** `7f5fe959b2a9c60b3ee86a0d69bc3ad6cee29b37`
**Working tree state at handoff creation:** docs-only WIP for canary result, status, ledger, and handoff closeout
**Expected state after this handoff commit:** clean

## Current W6-F1 Status

W6-F1 reached a stable transfer point.

Implementation and repair sequence:

- W6-F1 implementation commit: `731ef0e5` family.
- First W6-F1 canary: job `3ec1c0c48ff84dd88484580967380320`, classified
  `STOP_X7_W6_F1_OPENALEX_NOT_MATERIALIZED_REFINEMENT_REMAINS`.
- OpenAlex authority repair commit:
  `7e3dafe8ce674765e77737e3b3aa007be02a7a06`.
- Authority-repair canary: job `130bfc4c8be94fffadf780e7a0dd3f3f`,
  classified
  `PARTIAL_X7_W6_F1_OPENALEX_SOURCE_MATERIAL_MATERIALIZED_W4H_LINEAGE_BLOCKED`.
- W4-H/W4-I/W5 lineage repair commit:
  `778be4b2403de8cfe60b0d21d72239c96180f772`.
- Lineage-repair canary: job `0389a60644f749fb86208bb7d8e2c4ce`,
  classified
  `PARTIAL_X7_W6_F1_OPENALEX_LINEAGE_REPAIRED_W5E_ADMISSION_BLOCKED`.
- W5E multi-source admission repair commit:
  `7f5fe959b2a9c60b3ee86a0d69bc3ad6cee29b37`.
- W5E repair canary: job `2c60d8e749514f0d84e1158ae7dc9354`,
  classified
  `PASS_X7_W6_F1_W5E_MULTI_SOURCE_ADMISSION_REPAIR_VERIFIED_RETRIEVAL_REFINEMENT_REMAINS`.

The latest canary passed the W6-F1/W5E repair objective. It did not produce a
full report and should not be represented as report-quality progress.

## Canary Evidence

Canary job `2c60d8e749514f0d84e1158ae7dc9354` used exact Captain-defined input:

`Using hydrogen for cars is more efficient than using electricity`

Runtime and route facts:

- Web `/api/version` and API `/version` both reported
  `7f5fe959b2a9c60b3ee86a0d69bc3ad6cee29b37` before submission.
- Hidden ledger id:
  `2c60d8e749514f0d84e1158ae7dc9354:precutover-observability`.
- Public V2 stayed `4.0.0-cb-precutover`, `blocked_precutover`, and
  `report_damaged`.
- Source Material produced `3` records: one OpenAlex
  `openalex_work_abstract_text` record and two Wikimedia
  `wikimedia_page_summary_extract_text` records.
- W4-G created bounded text sidecars for all `3` records.
- W4-H produced one bounded extraction-input packet with `3`
  source-content packets.
- W5 completed with `extractionResultStatus = accepted`,
  `schemaDiagnostics = null`, and `3` EvidenceItems.
- W5E returned
  `bounded_evidence_items_admitted_internal_consumption_pending` with no
  blocked or damaged reason.
- W5-F returned `evidence_items_ready_for_downstream_internal_handoff`.
- W6-C completed with `sufficiencyResultStatus = accepted`,
  `schemaDiagnostics = null`, and `reportStopRecommendation =
  refine_retrieval`.
- W8-B/W8-F still stops at `boundary_verdict_candidate_not_ready`.

Containment held: default hidden artifact routes were authenticated, no-store,
and default-redacted; public output did not expose source text, EvidenceItem
text, provider payloads, hidden ledger ids, report prose, verdicts, truth
percentages, confidence, or user-visible warnings.

## Runtime State

Runtime was refreshed to application-code commit
`7f5fe959b2a9c60b3ee86a0d69bc3ad6cee29b37` for the canary.

After the docs-only handoff commit, runtime is not expected to report the final
docs commit. That is intentional: no application source changed after the
reported verifier and canary state.

Gotcha: `scripts/restart-clean.ps1` initially left API `/version` reporting an
older `GIT_COMMIT`. The API process had to be restarted with
`GIT_COMMIT=7f5fe959b2a9c60b3ee86a0d69bc3ad6cee29b37` before the canary. Future
runtime refresh checks should verify both Web and API version endpoints.

## Live-Job Budget

The machine ledger `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json` records:

- active tranche: `v2-w6f1-captain-reset-2026-05-21`;
- reset total: `8`;
- current remaining: `4`;
- latest W6-F1 consumption: job `2c60d8e749514f0d84e1158ae7dc9354`.

No second W6-F1/W5E canary is authorized.

## In-Flight Decisions And Pending Items

No Steer-Co decision is currently in flight from this agent. The next concrete
action is for the successor team to convene or use Steer-Co for a
retrieval-quality/source-diversity decision based on the current stop:

- W6-F1/W5E lineage blocker: closed.
- Remaining quality/value stop: W6-C still recommends `refine_retrieval`.
- Downstream report stop: `boundary_verdict_candidate_not_ready`.

Do not start a new package from this handoff alone.

## Known Single-Provider Assumptions To Watch

The repair removed the immediate W5E scalar-lineage blocker, but downstream
multi-provider assumptions are not globally proven.

Known pressure points:

- W4-H/W4-I/W5 still retain scalar compatibility fields alongside the new
  `sourceContentPackets` list.
- W5E now validates against the approved source-content packet set, with a
  legacy singleton fallback for existing synthetic/downstream fixture shapes.
- Later W6/W7/W8 projections may still summarize parent/provider lineage through
  aggregate or scalar fields. They were not proven broken by this canary, but
  should be audited before any public/report-quality projection depends on
  per-provider lineage.
- Route/default-admin projections must stay hash/length/provenance-only by
  default. Text inspection remains explicitly gated and internal-only where it
  exists.

## Gotchas For Successor Team

- The hidden ledger suffix is `:precutover-observability`.
- Public V2 success does not indicate hidden-chain progress; inspect hidden
  authenticated routes.
- Do not use older `currentRemaining = 7`, `6`, or `5` W6-F1 status lines as
  budget authority. The live-job ledger now records `4`.
- Do not run another W6-F1/W5E canary.
- Do not weaken W6 sufficiency prompts, relax W7 gates, add another provider, or
  expose public report behavior as a shortcut from this result.
- W6-F1 does not authorize V1 cleanup, V1 removal, public cutover, Source
  Reliability changes, cache/storage behavior, parser work, ACS/direct URL work,
  or report/verdict/warning/confidence behavior.

## Verification State

Before W5E repair commit `7f5fe959b2a9c60b3ee86a0d69bc3ad6cee29b37`:

- focused W5E/W5/boundary suite passed: `3` files / `107` tests;
- focused downstream recovery suite passed: `7` files / `41` tests;
- full V2 local suite passed: `140` files / `838` tests;
- `npm -w apps/web run build` passed;
- `npm run validate:v2-gates` passed;
- `node scripts/validate-v2-gate-register.mjs --self-test` passed;
- `npm run debt:sensors` returned `advisory_warn`;
- `npm run index` passed;
- `git diff --check` and `git diff --cached --check` passed.

After the canary, this handoff closeout updates docs/status/ledger only and
runs `npm run index`, diff checks, and the focused handoff commit.

## Next Concrete Action

Successor team should start with a Steer-Co reviewed retrieval-quality or
source-diversity package decision. The open question is how to improve evidence
value after W6-F1 proved multi-source admission but W6-C still recommends
`refine_retrieval`.

Do not start implementation or a live job without a reviewed package and the
standing approval gates.
