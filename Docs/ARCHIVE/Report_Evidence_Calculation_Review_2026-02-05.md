# Report Evidence Calculation Review (2026-02-05)

**Status:** ✅ Critical Issues Fixed / 🧭 Design Decisions Pending
**Owner:** Engineering
**Scope:** Report evidence calculations, verdict confidence, evidence weighting
**Related Areas:** Gate 4 (quality-gates), evidence weighting, aggregation

---

## Summary

This document captures issues identified in report evidence calculations. Critical issues (#1, #2, #5) have been fixed. Items #3 and #4 require design decisions before implementation.

---

## Findings & Status

### 1) Gate 4 evidence agreement ignores claimDirection="contradicts"

- **Location:** `apps/web/src/lib/analyzer/quality-gates.ts`
- **Issue:** `contradictingFactCount` only counted `category === "criticism"`, ignoring `claimDirection="contradicts"`.
- **Status:** ✅ **FIXED**
- **Resolution:** Updated contradiction counting to check either:
  - `item.category === "criticism"` OR
  - `item.claimDirection === "contradicts"`

### 2) Evidence weighting logic duplicated and inconsistent

- **Locations:**
  - `apps/web/src/lib/analyzer/orchestrated.ts` (local `applyEvidenceWeighting`)
  - `apps/web/src/lib/analyzer/source-reliability.ts` (`applyEvidenceWeighting`)
- **Issue:** The orchestrated pipeline version dropped unknown sources and ignored confidence metadata.
- **Status:** ✅ **FIXED**
- **Resolution:** Consolidated to use the shared SR module implementation via delegation:
  - Unknown sources now use `DEFAULT_UNKNOWN_SOURCE_SCORE` (0.5) with low confidence
  - `trackRecordConfidence` and `consensusAchieved` metadata now properly used
  - Consistent formula across all pipelines

### 3) Evidence agreement and claim weighting ignore probativeValue

- **Locations:**
  - `apps/web/src/lib/analyzer/quality-gates.ts`
  - `apps/web/src/lib/analyzer/aggregation.ts`
- **Issue:** Gate 4 and aggregation treat all supporting evidence equally (count-based).
- **Status:** 🧭 **DESIGN DECISION NEEDED**
- **Questions:**
  - What weighting factors for probativeValue? (e.g., high=1.0, medium=0.7, low=0.3)
  - Should this be configurable in calc config?
  - How to handle evidenceBasis alongside probativeValue?
- **Recommendation:** Add configuration options before implementing to allow tuning.

### 4) Evidence agreement uses evidence count, not unique sources

- **Location:** `apps/web/src/lib/analyzer/quality-gates.ts`
- **Issue:** Agreement uses evidence IDs rather than unique sources.
- **Status:** 🧭 **DESIGN DECISION NEEDED**
- **Questions:**
  - Should agreement be based on unique sources or evidence count?
  - How to weight when one source has many evidence items?
  - Should minimum unique sources be required for HIGH/MEDIUM tiers?
- **Recommendation:** Discuss impact on existing verdicts before changing.

### 5) Potential double-adjustments in truth percentage

- **Location:** `apps/web/src/lib/analyzer/orchestrated.ts`
- **Issue:** Truth percentage adjustments happened at multiple points without clear documentation.
- **Status:** ✅ **FIXED**
- **Resolution:** Added comprehensive documentation block (lines 2733-2756) documenting:
  1. **Evidence Weighting** - Adjusts based on source reliability
  2. **Direction Validation** - Validates/corrects based on evidence direction
  3. **Gate 4 Classification** - Adds tier metadata (does NOT modify truthPercentage)

---

## Files Modified

- `apps/web/src/lib/analyzer/quality-gates.ts` - Fixed contradiction counting
- `apps/web/src/lib/analyzer/orchestrated.ts` - Consolidated evidence weighting, added documentation

---

## Remaining Design Decisions

Before implementing #3 and #4, decisions needed on:

1. **probativeValue weighting factors** - What multipliers for high/medium/low?
2. **evidenceBasis interaction** - How does evidenceBasis interact with probativeValue?
3. **Unique source counting** - Replace evidence count with source count, or use weighted hybrid?
4. **Configuration** - Should these be configurable in calc config or hard-coded?
5. **Backward compatibility** - How to migrate existing job results?

---

## Verification

Run TypeScript compilation to verify changes:
```bash
npx tsc --noEmit --skipLibCheck -p apps/web/tsconfig.json
```

---

## Completed: 2026-02-05

Critical issues fixed. Design decisions pending for #3 and #4.
