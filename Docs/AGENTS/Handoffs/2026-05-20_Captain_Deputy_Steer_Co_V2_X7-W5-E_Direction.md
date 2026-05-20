# Captain Deputy / Steer-Co V2 X7-W5-E Direction

Date: 2026-05-20
Role: Captain Deputy / Steer-Co
Agent: Codex (GPT-5.5) + Claude Opus 4.6 + Lead Developer lens + Code Reviewer/Security lens
Status: review package prepared; no implementation or live job authorized by this handoff

## Summary

After X7-W5-D produced two schema-valid hidden EvidenceItems with no public leak,
Captain Deputy convened a small diverse Steer-Co review to decide the next V2
direction under the corrected Captain Deputy operating model.

Consensus is to proceed with a constrained combined review package:

- define the first hidden/internal downstream EvidenceItem
  admission/consumption contract;
- require concrete merge/quarantine handling for W5-C diagnostics and W4-I /
  W4-chain proof machinery in the same implementation slice;
- do not open report/verdict/warning/confidence/public behavior or any other
  standing Captain-gated surface.

The review package is:

`Docs/WIP/2026-05-20_V2_Slice_X7-W5-E_EvidenceItem_Admission_And_Consolidation_Review_Package.md`

## Evidence

- W5-D live job `08291671a7d44a74b9fc048b6a32a7b5` ran `claimboundary-v2` on
  runtime `76984bca20840c3c2e9c02449a0e481ec151a02b`.
- W5-D result: `hidden_evidence_item_extraction_completed`, accepted,
  `evidenceItemCount = 2`, `schemaDiagnostics = null`, `retryCount = 0`.
- W5-D default route remained hash/length/provenance-only and public V2 stayed
  `4.0.0-cb-precutover` / `blocked_precutover`.
- Latest `npm run debt:sensors`: `advisory_warn`, with high V2 source/test,
  boundary-guard, WIP/handoff volume, and `14` net mechanism increases.
- `Docs/AGENTS/V2_Retirement_Ledger.md` says W4-I merge is triggered after the
  first accepted W5 canary; that condition is now met.

## Steer-Co Result

Question: after W5-D, should V2 continue with:

- A: downstream EvidenceItem admission only;
- B: consolidation/retirement first;
- C: combined narrow review package with admission plus concrete
  consolidation?

Decision: C, constrained.

Member results:

- Claude Opus 4.6 Senior Architect + LLM Expert: support C. A alone is
  debt-blind; B alone delays value. C must keep admission contract-level and
  hidden/internal, with concrete retirement row action.
- Lead Developer lens: modify toward C. Keep it one review package, not one
  broad implementation lump. Reject A alone and B alone.
- Code Reviewer/Security lens: support C if leak checks remain first-class and
  no EvidenceItem text becomes default-visible.

No material dissent remains.

Package-readiness follow-up:

- Claude Opus 4.6 reviewed the first package draft as `approve_with_changes`;
  it required explicit net-mechanism accounting and a hard default-projection
  field ceiling.
- Lead Developer / Code Reviewer lens reviewed the first package draft as
  `approve_with_changes`; it required exact contract owner, input source,
  output status labels, consolidation targets, and focused verifier names.
- The package was amended accordingly. It now chooses the existing W5 artifact
  sink/route as the projection carrier and forbids adding a new route/sink
  without Steer-Co amendment.

## Boundaries

This direction authorizes no implementation and no live job by itself.

Still closed:

- report/verdict/warning/confidence behavior;
- public API/UI/report/export/compatibility exposure;
- parser execution;
- prompt/model/config/schema edits;
- cache/SR/storage;
- provider expansion, W2/W3 widening, retries, endpoint migration;
- ACS/direct URL;
- V1 reuse, cleanup, or removal.

## Recommended Next Action

Lead Developer should review the X7-W5-E package and, if accepted inside the
existing Captain Deputy/Steer-Co authority boundary, prepare or implement the
bounded package without Captain interruption only if:

- implementation remains hidden/internal;
- no standing Captain approval gate is touched;
- W5-C/W4-I/W4-chain consolidation remains concrete;
- verifiers and leak checks are clear.

Current package-readiness status after amendment: ready for Lead Developer
implementation planning; implementation must still stop if the exact file
envelope or consolidation target cannot be preserved.

If implementation would touch prompt/model/config/schema, public/report
behavior, live jobs, or any other standing Captain gate, stop and escalate.

## V2 SCORECARD IMPACT

Quality dimension advanced: V2-Q3 Evidence extraction and internal evidence
handoff.

Direct user/report value: none yet.

Hidden-only value: acceptable only because it advances admitted EvidenceItem
handoff and requires consolidation of older hidden machinery.

Cost/latency impact: no new live job authorized.

Retirement or simplification unlocked: W5-C diagnostics and W4-I/W4-chain proof
machinery can now be folded, merged, or quarantined.

Scorecard risk: another hidden-only layer without actual consolidation would
violate V2-Q10.

## V2 RETIREMENT LEDGER IMPACT

Rows touched: V2-RL-009, V2-RL-010, V2-RL-011, V2-RL-012.

Status changes: none in this handoff.

New mechanism owner: none yet.

Removal / merge trigger: accepted W5-D output has fired the V2-RL-012 trigger.

Debt accepted: none.

## V2 CONSOLIDATION GATE

Latest debt-sensor status: `advisory_warn` on 2026-05-20T06:12:21.762Z.

The X7-W5-E package requires net runtime mechanism count to decrease or remain
unchanged unless Steer-Co accepts a concrete missing-capability rationale and
removal trigger.

## Warnings

- The wrong-variant W5-D job must not be reused as V2 evidence.
- Future live jobs must use `claimboundary-v2` route proof and must not use the
  legacy helper shape.
- Timeout/silence from unrelated reviewers is not approval; this handoff relies
  only on the completed Opus, Lead Developer, and Code Reviewer/Security
  responses.

## Learnings

Captain Deputy must run as a coordinator for a diverse development team, not as
a solo implementer. Prompt edits require LLM Expert author/review. Steer-Co
should be convened at phase boundaries where scorecard progress and retirement
pressure must be balanced.
