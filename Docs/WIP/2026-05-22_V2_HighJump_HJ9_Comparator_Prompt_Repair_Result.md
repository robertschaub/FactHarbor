# V2 HighJump HJ9 Comparator Prompt Repair Result

**Date:** 2026-05-22
**Status:** Completed live-result record
**Owner:** Captain Deputy / Lead Developer
**Input:** `Using hydrogen for cars is more efficient than using electricity`

## Decision Record

HJ9 is classified as:

`PARTIAL_X7_HJ9_COMPARATOR_PROMPT_REPAIR_OFF_COMPARATOR_TOP_VERDICT_REMAINS`

The prompt repair improved some W7-B behavior but did not close the report
quality gap. It must not be recorded as a pass.

## Canary Evidence

- Job id: `8def207fd600486189ec24237065a8cd`
- Runtime commit: `ff059f7bd8edd4000eb18cadba606adab6d82f9c`
- Job status: `SUCCEEDED`
- Public status: `4.0.0-cb-precutover` / `blocked_precutover` /
  `report_damaged`
- W8-G inspection route: authenticated `200`, unauthenticated `401`,
  `Cache-Control: no-store`
- Captured artifacts:
  `test-output/v2-highjump-hj9-8def207fd600486189ec24237065a8cd`

## Result

The internal draft still produced a top `MOSTLY-TRUE` candidate for a fuel-cell
vehicle versus gasoline/hybrid comparison. That comparator did not match the
Captain-defined claim, which compares hydrogen cars with electricity.

The same draft did improve by classifying PHEV-only and fuel-cell-definition
material as `UNVERIFIED`, but the top-line off-comparator positive verdict made
the result unsuitable as report-quality evidence.

## Root Cause

The W7-B prompt repair was not enough because W7-B only received EvidenceItem
statements and not the original selected AtomicClaim context. Query Planning and
W2 preview did preserve relevant electric/BEV candidates, but W7-B could still
anchor to off-comparator EvidenceItems once those dominated the downstream
evidence set.

## Live-Job Budget

HJ9 consumed one HighJump live job. Remaining budget after HJ9: `3`.

## Next Action

Amend the existing W7-B boundary/verdict execution input so the selected
AtomicClaim statement projection reaches the verdict prompt. Do not solve this
with deterministic comparator heuristics, public output, or source text leaks.
