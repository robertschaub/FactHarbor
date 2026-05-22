# V2 HighJump HJ30 - W5 Material-Alignment Rebalance

**Status:** locally implemented and verifier-clean, pending commit/runtime refresh/live validation
**Date:** 2026-05-22
**Owner:** Captain Deputy / Lead Developer
**Authority:** Captain HighJump direction, explicit prompt-edit/live-job authorization, and fresh `18` job tranche after HJ29

## Trigger

HJ29 (`323c5fd3540e43aab9c7c6e686ec4de4`) validated the HJ29 W5
material-alignment prompt repair on the default manual V2 path for the
Captain-defined Bolsonaro/fair-trial input. The run reached W5 with 9 bounded
source content packets and 4971 parent-packet bytes, but W5 returned accepted
`no_extractable_evidence`.

This means HJ29 fixed the HJ28 adjacent/generic extraction defect, but overshot
into an empty W5 result. The needed correction is a rebalance of the existing W5
prompt contract, not a new source provider, parser, retry, schema relaxation,
deterministic semantic filter, or public/report exposure change.

## Debt-Guard Result

Classification: `incomplete-existing-mechanism`

Chosen option: amend the existing W5 `V2_EVIDENCE_EXTRACTION` prompt contract.

Rejected paths:

- Add provider/fetch/parser/source-material machinery: HJ29 already supplied 9
  source content packets to W5; the symptom is extraction-bar calibration.
- Add deterministic semantic filtering: AGENTS.md requires LLM-owned semantic
  analysis.
- Relax schemas or add retries: the W5 output was structurally accepted and
  analytically empty; schema/retry changes would miss the cause.
- Roll back HJ29 entirely: HJ28 showed the prior wording admitted adjacent and
  generic material, so pure rollback would restore a known report-quality
  defect.

Net mechanism count: unchanged. This is a prompt/test amendment to the existing
task contract.

## Implementation Delta

Changed:

- `apps/web/prompts/claimboundary-v2.prompt.md`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`

Behavior:

- Keeps material alignment as the W5 selection owner.
- Allows a weak but materially tied source-attributed preview/abstract point to
  become a limited, contextual, mixed, or unclear EvidenceItem when it helps
  downstream sufficiency/report generation.
- Allows a single EvidenceItem when exactly one materially aligned point exists.
- Does not allow actor-only, broad-domain, adjacent-domain, unrelated conduct,
  or generic framework background to pad the EvidenceItem budget.
- Keeps public/default V2 blocked and redacted.

## V2 Scorecard Impact

Advances report-quality value directly: HJ30 targets the current blocker between
bounded source material and complete internal report generation. It is not a new
hidden proof layer.

## V2 Retirement Ledger Impact

No new mechanism is added. The repair reduces pressure to add provider/parser
machinery for a prompt-calibration failure. If HJ30 succeeds, the HJ28/HJ29
prompt-calibration notes can be treated as closed working evidence rather than
active blockers.

## Verification Plan

Safe local verifiers passed:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle`
- `npm run validate:v2-gates`
- `npm -w apps/web run build`
- `npm run debt:sensors` (`advisory_warn`, known V2 source/test/docs/boundary-guard footprint warnings)

Pending closeout verifiers:

- `npm run index`
- `git diff --check`

Reviewer coverage:

- Claude Opus 4.6 was attempted through `scripts/agents/invoke-claude.cjs` for
  a narrow prompt/debt-guard review, but timed out. This is degraded reviewer
  coverage, not approval. Captain Deputy is proceeding under reduced quorum
  because the repair is bounded, reversible, prompt-only, adds no new
  mechanism, and the local verifier set is clean.

Live validation after commit/runtime refresh:

- Run the Captain-defined Bolsonaro/fair-trial input first through the default
  manual V2 path.
- If it produces materially tied EvidenceItems, an internal report, and no
  containment issue, spend additional jobs from the 18-job tranche on the German
  asylum and hydrogen controls as a stronger mini-gauntlet.

## Pass And Stop Criteria

Pass signal:

- W5 extracts materially tied EvidenceItems instead of HJ29-style empty output.
- W5 does not reintroduce HJ28-style adjacent/generic background crowd-out.
- Internal report writer creates an admin-visible hidden V2 report.
- Public/default surfaces remain `4.0.0-cb-precutover` /
  `blocked_precutover` / `report_damaged` and do not leak hidden text/status.

Stop signal:

- HJ28-style adjacent/generic extraction returns.
- HJ29-style empty W5 output repeats without useful new information.
- Runtime/source provenance is stale.
- The next needed step would require provider expansion, parser execution,
  schema changes, retries, public behavior, cache/SR/storage, ACS/direct URL,
  V1 work, or another hidden mechanism.
