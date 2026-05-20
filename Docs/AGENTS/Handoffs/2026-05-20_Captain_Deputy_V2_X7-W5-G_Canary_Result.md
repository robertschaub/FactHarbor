# Handoff - V2 X7-W5-G EvidenceItem Handoff Projection Canary Result

Date: 2026-05-20
Role: Captain Deputy / Lead Developer
Agent: Codex (GPT-5.5)
Status: passed; result commit pending at handoff creation

## Summary

Ran the one authorized X7-W5-G product-route canary.

Classification:

`PASS_X7_W5_G_EVIDENCE_ITEM_HANDOFF_PROJECTION_CANARY`

Job:

`19f831aa36084ab6a2cee9e89698f87c`

Runtime commit:

`8d36e68ab81e09c0a59ebd60aa1f37cced610a33`

Input:

`Using hydrogen for cars is more efficient than using electricity`

Pipeline variant:

`claimboundary-v2`

## Result

The public job reached `SUCCEEDED` while staying in the pre-cutover damaged
shell:

- `_schemaVersion = 4.0.0-cb-precutover`
- `publicCutoverStatus = blocked_precutover`
- `analysisIssueCode = report_damaged`

Hidden same-ledger route inspection passed:

- W2 candidate-provider network completed;
- W3-B source material route was present and default-redacted;
- W4-I route was present and no-store;
- W5 accepted `1` EvidenceItem;
- W5-E admitted `1`;
- W5-F `evidenceItemHandoff` was present and ready;
- W5-F lineage matched W5/W5-E;
- W4-I reported W5-F as the merge owner and carried both retired and replacement
  triggers.

## Key Evidence

W5-F:

- `handoffStatus = evidence_items_ready_for_downstream_internal_handoff`
- `admittedEvidenceItemCount = 1`
- `w4iDisposition = historical_same_ledger_evidence_merged`
- `retiredW4iTrigger =
  remove_or_merge_route_after_w5e_canary_and_next_evidence_handoff_owner`
- `replacementW4iTrigger = after_w5f_handoff_route_projection_verified`
- `evidenceItemTextReturned = false`

W4-I:

- `mergedBy = x7-w5-f_evidence_item_handoff_projection`
- `retiredRemovalTrigger =
  remove_or_merge_route_after_w5e_canary_and_next_evidence_handoff_owner`
- `removalTrigger = after_w5f_handoff_route_projection_verified`

Refined W5 leak scan found no forbidden:

- `"statement":`
- `"sourceMaterialText":`
- `"inputText":`
- `"snippet":`
- `"summary":`
- exact Captain input text.

## Budget

Live-job budget before X7-W5-G: `1`.

Live-job budget after X7-W5-G: `0`.

No second W5-G canary is authorized.

## Verification

Before submission:

```powershell
npm -w apps/web run test -- test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-bounded-evidence-extraction-artifacts/route.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-execution-readiness-artifacts/route.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
npm run validate:v2-gates
```

Both passed. W5/W4-I route preflight passed auth/no-store/missing-ledger checks.

## V2 Scorecard Impact

V2-Q3 Evidence extraction handoff: W5-F is now live-proven on a product-route
run. Direct public report value remains none.

## V2 Retirement Ledger Impact

`V2-RL-012`: the replacement trigger
`after_w5f_handoff_route_projection_verified` is satisfied for this canary.
A later reviewed package may remove or merge the standalone W4-I route/sink if
no downstream inspection still needs it.

## Warnings

Do not run another W5-G canary without a new live-job tranche and reviewed
package.

X7-W5-G does not authorize public API/UI/report/export/compatibility behavior,
report/verdict/warning/confidence behavior, parser execution, cache/SR/storage,
provider expansion, W2/W3 widening, prompt/model/config/schema edits, ACS/direct
URL support, or V1 work/cleanup.

## Learnings

The W5-F projection can be verified without opening new source behavior. The
next package should avoid another containment-only layer unless it retires W4-I
route debt or directly prepares the next report-quality bridge.
