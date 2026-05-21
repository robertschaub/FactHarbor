# 2026-04-24 — Unassigned — ACS Recommendation Order Normalization

## Summary

Interactive claim-selection sessions could fail after successful Stage 1 preparation when the recommendation LLM returned a valid recommended subset in a different order than `rankedClaimIds`.

Live failure observed on draft `14e7f68f305843ca851e2eb9e22e0e79`:

- Stage 1 completed
- recommendation ran
- draft failed at `32%`
- failure message: `recommendedClaimIds must preserve rankedClaimIds order`

The failure was structural, not semantic. The recommended ids were still a unique in-set subset; only their ordering differed from the ranking.

## Files Changed

- [claim-selection-recommendation.ts](/c:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-selection-recommendation.ts)
- [claim-selection-recommendation.test.ts](/c:/DEV/FactHarbor/apps/web/test/unit/lib/analyzer/claim-selection-recommendation.test.ts)

## What Changed

### Runtime behavior

`validateClaimSelectionRecommendation(...)` now:

- still rejects real invariant violations:
  - duplicate `recommendedClaimIds`
  - out-of-set recommended ids
  - too many recommended ids
- no longer fails on order-only mismatch
- instead normalizes `recommendedClaimIds` into `rankedClaimIds` order before returning the validated recommendation

This keeps the recommendation contract strict on set membership and cardinality while avoiding a draft-level hard failure for a recoverable ordering defect.

### Test coverage

Added focused regressions for:

- direct validator normalization of out-of-order `recommendedClaimIds`
- end-to-end `generateClaimSelectionRecommendation(...)` acceptance of out-of-order recommended ids without retrying

## Verification

Passed:

- `npm -w apps/web run test -- test/unit/lib/analyzer/claim-selection-recommendation.test.ts`
- `npm -w apps/web run build`

## Root Cause

The validator treated ordering as a fatal contract invariant instead of a normalizable structural output defect.

That made the whole ACS session fail before the manual selection dialog could appear, even though:

- the ranked set was valid
- the recommended set was valid
- only the ordering of the recommended subset was wrong

## Outcome

Interactive sessions should now proceed to the AC selection dialog for this class of output instead of failing at recommendation validation.
