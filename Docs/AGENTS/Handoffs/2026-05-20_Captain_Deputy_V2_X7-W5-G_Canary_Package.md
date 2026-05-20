# Handoff - V2 X7-W5-G EvidenceItem Handoff Projection Canary Package

Date: 2026-05-20
Role: Captain Deputy / Steer-Co
Agent: Codex (GPT-5.5) with two reviewer lenses
Status: canary package prepared; commit pending at handoff creation

## Summary

After X7-W5-F commit `4deb595c`, Steer-Co reviewers agreed the next bounded
step should be a canary package, not new implementation: prove the W5-F
`EvidenceItemHandoffOwner` projection on a live product-route run before W4-I
route deletion or report-facing downstream work.

Package:

`Docs/WIP/2026-05-20_V2_Slice_X7-W5-G_EvidenceItem_Handoff_Projection_Canary_Package.md`

## Recommendation

Run exactly one `claimboundary-v2` canary using:

`Using hydrogen for cars is more efficient than using electricity`

Only after:

- package commit;
- clean git status;
- runtime refresh from package commit;
- runtime commit match;
- focused W5/W4-I/boundary verifier;
- V2 gate validation;
- W5/W4-I internal route auth/no-store preflight.

## Review Consensus

Reviewer 1 recommended `X7-W5-G EvidenceItem Handoff Projection Canary + Budget
Reconciliation Review Package`.

Reviewer 2 recommended `X7-W5-G EvidenceItem Handoff Live Projection And W4-I
Retirement Decision Package`.

Consolidated decision: one reviewed live projection canary package. No source
changes and no second canary.

## Pass Criteria Summary

Pass only if:

- public result remains `4.0.0-cb-precutover` / `blocked_precutover` /
  `report_damaged`;
- no public/default-admin text or hidden-marker leak;
- W5 accepted EvidenceItems;
- W5-E admitted matching count/hash/byte-length arrays;
- W5 route includes `evidenceItemHandoff`;
- handoff status is `evidence_items_ready_for_downstream_internal_handoff`;
- W4-I reports W5-F merged-by marker plus retired and replacement triggers.

## Budget

Machine ledger currently records:

- active tranche reset total: `6`
- current remaining before X7-W5-G: `1`

X7-W5-G consumes `1` if submitted. Every submitted job consumes one slot even if
it stops.

## Boundaries

This package authorizes no source changes, no second canary, no public
API/UI/report/export/compatibility behavior, no report/verdict/warning/confidence
behavior, no parser, no cache/SR/storage, no provider expansion, no W2/W3
widening, no prompt/model/config/schema edits, no ACS/direct URL, and no V1
work.

## Verification Before Package Commit

Docs/package preparation only. No verifier rerun was needed after package text
edits beyond `git diff --check` and `npm run index` before commit.

## Next Agent

If this package is committed cleanly, the next step is canary preflight and
runtime refresh. Stop before submission if runtime commit mismatch, dirty
worktree, failed verifier, route preflight failure, or budget ledger ambiguity
appears.
