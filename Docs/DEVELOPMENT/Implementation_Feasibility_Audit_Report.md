# Implementation Feasibility Audit Report
**Date:** January 16, 2026  
**Target Plan:** `Pipeline_Redesign_Plan_2026-01-16.md`  
**Auditor:** Implementation Lead & Senior Systems Engineer  
**Scope:** Execution Friction Analysis for Option D: Code-Orchestrated Native Research

---

## Executive Summary

**Implementation Readiness Score: 6.5/10**

The redesign plan is **architecturally sound** but contains **critical execution gaps** that will cause implementation friction. Phase 1 can be partially implemented today, but **3 high-severity blockers** must be addressed before proceeding.

### Traffic Light Status
- 🟢 **Phase 1 (Normalization)**: Ready (with minor fixes)
- 🟡 **Phase 1 (Scope IDs)**: Ready but needs careful testing
- 🟡 **Phase 1 (Scope Preservation)**: Implemented but not verified
- 🔴 **Phase 1 (Gate1 Move)**: HIGH RISK - Will break supplemental claims logic
- 🔴 **Phase 3-4 (LLM Search)**: BLOCKED - Grounding validation missing

---

## 1. Function Signature Verification

### ✅ PASS: Signatures Match Current Implementation

The plan's references to key functions are **accurate**:

**`runFactHarborAnalysis`** (Line 7763):
```typescript
export async function runFactHarborAnalysis(input: AnalysisInput)
```
- ✅ Entry point correctly identified
- ✅ Normalization occurs at lines 7808-7821 (as documented)
- ✅ Uses `normalizedInputValue` throughout pipeline

**`understandClaim`** (Line 2953):
```typescript
async function understandClaim(input: string, model: any): Promise<ClaimUnderstanding>
```
- ✅ Function exists and is private (as expected)
- ⚠️ **DUPLICATE NORMALIZATION DETECTED** (lines 2969-2986)
- ⚠️ This contradicts plan assumption of "single normalization"

**`selectFactsForScopeRefinementPrompt`** (Line 712):
```typescript
function selectFactsForScopeRefinementPrompt(
  facts: ExtractedFact[],
  analysisInput: string,
  maxFacts: number
): ExtractedFact[]
```
- ✅ Scope preservation logic present (lines 754-760)
- ✅ Uses `bestByScope` map to guarantee ≥1 fact per scope
- ⚠️ **NOT YET VERIFIED** on regression suite (as plan notes)

**`requestSupplementalSubClaims`** (Line 3974):
```typescript
async function requestSupplementalSubClaims(
  input: string,
  model: any,
  understanding: ClaimUnderstanding
): Promise<ClaimUnderstanding["subClaims"]>
```
- ✅ Function signature accurate
- 🔴 **CRITICAL DEPENDENCY** on `understanding.subClaims` (line 4002)
- 🔴 If Gate1 moves post-research, this function receives **FILTERED claims**, not original claims

---

## 2. Normalization Leakage Analysis

### 🟡 PARTIAL PASS: Leakage Contained but Not Eliminated

**Normalization Call Sites:**

1. **Line 7816** (`runFactHarborAnalysis`): ✅ PRIMARY normalization point
2. **Line 2979** (`understandClaim`): ❌ DUPLICATE normalization
3. **No other leakage detected** in `analyzer.ts`

**Current State (v2.6.26):**
- Entry point normalization is **working** (lines 7808-7821)
- `understandClaim` performs **redundant** normalization (lines 2969-2986)
- Both use identical `normalizeYesNoQuestionToStatement` function
- Redundancy is **benign** (idempotent) but violates plan's "single normalization" goal

**Execution Risk:** 🟡 LOW
- Both normalizations produce identical output
- No divergence risk
- Violates plan's architectural intent but won't break production

**Plan Accuracy Issue:**
The plan states "Remove any secondary normalization inside `understandClaim`" but doesn't account for the fact that `understandClaim` receives **already-normalized** input from `runFactHarborAnalysis` (line 7832: `originalInput: normalizedInputValue`). The duplicate normalization is **defensive** but unnecessary.

**Recommendation:**
Phase 1 can remove line 2979 normalization **safely** because `analysisInput` is already normalized by the caller. Add assertion to verify this contract:
```typescript
// Line 2969 replacement:
console.assert(
  !input.trim().endsWith("?"),
  "understandClaim expects pre-normalized input"
);
```

---

## 3. Scope ID Dependencies

### 🟡 PASS: ID Change is Safe, But Testing is Critical

**Scope ID Generation** (`apps/web/src/lib/analyzer/scopes.ts`, lines 17-109):

Current implementation:
```typescript
let newId = inst ? `CTX_${inst}` : `CTX_${idx + 1}`;
if (usedIds.has(newId)) newId = `${newId}_${idx + 1}`;
```

**Current ID Format:**
- Institution-based: `CTX_TSE`, `CTX_STF`, `CTX_SCOTUS`
- Index-based fallback: `CTX_1`, `CTX_2`, `CTX_3`

**Plan Proposal:** Replace with hash-based IDs like `CTX_a1b2c3`

**Impact Analysis:**

### Aggregation (`apps/web/src/lib/analyzer/aggregation.ts`):
✅ **NO BREAKING CHANGES**
- `getClaimWeight()` doesn't use scope IDs
- `calculateWeightedVerdictAverage()` doesn't use scope IDs
- Aggregation depends on `relatedProceedingId` matching, not ID format

### UI (`apps/web/src/app/jobs/[id]/page.tsx`):
✅ **NO BREAKING CHANGES** (with caveat)
- Line 1328: Uses `normalizeScopeKey()` function (NOT FOUND in grep)
- Searched for definition but it's likely a local helper
- UI groups claims by `cv.relatedProceedingId` (line 1386)
- As long as **claim.relatedProceedingId === scope.id**, UI will work

### Verdict Corrections (`apps/web/src/lib/analyzer/verdict-corrections.ts`):
✅ Imported but not scanned in detail
- If it uses string matching on scope IDs, hash-based IDs will break it
- **NEEDS VERIFICATION**

**Execution Risk:** 🟡 MEDIUM
- ID format change is **structurally safe** (just a string)
- Risk comes from **undiscovered string matching** (e.g., `if (id.startsWith("CTX_TSE"))`)
- Plan's hashing approach is **deterministic**, which is good
- But plan doesn't specify **how to handle collisions** or **canonicalization details**

**Files to Watch:**
1. `apps/web/src/lib/analyzer/verdict-corrections.ts` - May contain scope ID logic
2. `apps/web/src/app/jobs/[id]/page.tsx` - Definition of `normalizeScopeKey()` not found
3. Any code that does `scope.id.includes("TSE")` or similar string matching

**Recommendation:**
- ✅ Phase 1 can proceed with hash-based IDs
- ⚠️ Add regression test: same input → same hash → same ID across runs
- ⚠️ Grep entire codebase for `CTX_` to find any hardcoded references
- ⚠️ Document hash collision strategy (though extremely unlikely with good hash)

---

## 4. Gate1 Impact Assessment

### 🔴 CRITICAL: Moving Gate1 Post-Research Will Break Supplemental Claims

**Current Gate1 Flow:**
```
understandClaim()
  ↓ generates subClaims (all claims, unfiltered)
  ↓
applyGate1ToClaims() [LINE 3964]
  ↓ filters non-factual claims (opinions, predictions)
  ↓ central claims ALWAYS pass (for safety)
  ↓
← validatedClaims (filtered list)
  ↓
← RESEARCH uses these claims to guide search
  ↓
← SUPPLEMENTAL CLAIMS triggered by coverage gaps
```

**`requestSupplementalSubClaims` Dependency** (Line 3974):
```typescript
async function requestSupplementalSubClaims(
  input: string,
  model: any,
  understanding: ClaimUnderstanding  // ← Contains validatedClaims (post-Gate1)
): Promise<ClaimUnderstanding["subClaims"]>
```

**Critical Logic** (Lines 4002-4020):
```typescript
for (const claim of understanding.subClaims) {  // ← Iterates FILTERED claims
  const normalized = normalizeText(claim.text || "");
  if (normalized) {
    existingTextGlobal.add(normalized);
  }
  
  const procId = isMultiScope ? (claim.relatedProceedingId || "") : (singleScopeId || "");
  
  if (isMultiScope && !procId) continue;
  if (!claimsByProc.has(procId)) continue;
  
  claimsByProc.get(procId)!.push(claim);
  existingTextByProc.get(procId)!.add(normalized);
  if (claim.claimRole === "core") {
    coreCounts.set(procId, (coreCounts.get(procId) || 0) + 1);
  }
}
```

**What Goes Wrong if Gate1 Moves Post-Research:**

1. **Research Phase:** Uses ALL claims (including opinions/predictions)
   - Pro: More search coverage
   - Con: Wastes LLM calls on non-factual claims

2. **Supplemental Claims Phase:**
   - `requestSupplementalSubClaims` receives `understanding` with **unfiltered claims**
   - It counts existing claims per scope (line 4018: `coreCounts.set(procId, ...)`)
   - If a scope has 3 opinion-based claims, it won't request supplemental factual claims
   - **Result:** Coverage gaps for scopes with lots of opinions but few factual claims

3. **Verdict Generation:**
   - Gate1 applied AFTER research
   - Opinions filtered out
   - But **supplemental claims were never generated** (because opinion claims masked the gap)
   - **Result:** Under-researched verdicts

**Plan Statement vs. Reality:**

The plan says (line 476):
> "Move Gate1 post-research: Don't filter claims before searching for evidence. Apply Gate1 after facts extracted."

This is **architecturally correct** but **implementation-naive**. The plan doesn't account for:
- Supplemental claims logic depends on claim counts BEFORE research
- Coverage detection needs to know which claims are actually factual

**Execution Risk:** 🔴 HIGH
- Moving Gate1 will silently degrade coverage quality
- Regression tests won't catch this (metrics will look "fine")
- Only manual review will reveal under-researched scopes

**Recommendation:**
**DO NOT move Gate1 post-research without refactoring supplemental claims logic.**

**Alternative Fix:**
1. Keep Gate1 pre-research (status quo)
2. Add a **"Gate1-lite"** pre-filter that only removes extreme cases:
   - Pure predictions (`will happen in 2027`)
   - Pure opinions (`I think X is beautiful`)
3. Keep the **full Gate1** post-research for final verdict filtering
4. Update supplemental claims to use **Gate1-lite counts** for coverage detection

This preserves the plan's intent (don't over-filter before research) without breaking supplemental claims.

---

## 5. Files to Watch (Undocumented in Plan)

### High-Risk Files Not Mentioned in Plan:

1. **`apps/web/src/lib/analyzer/verdict-corrections.ts`**
   - Contains `detectCounterClaim()` and `detectAndCorrectVerdictInversion()`
   - May contain scope ID string matching
   - **Risk:** Hash-based IDs could break counter-claim detection
   - **Action:** Full audit required before Phase 1

2. **`apps/web/src/lib/claim-importance.ts`**
   - Imported as `normalizeSubClaimsImportance` (line 45)
   - May depend on claim ordering or IDs
   - **Risk:** Unknown
   - **Action:** Verify it's ID-agnostic

3. **`apps/web/src/app/jobs/[id]/page.tsx`**
   - UI rendering logic for scopes
   - Uses `normalizeScopeKey()` function (definition not found in scan)
   - **Risk:** May assume specific ID format (e.g., `CTX_1` → `CTX1`)
   - **Action:** Locate and verify `normalizeScopeKey()` implementation

4. **`apps/web/src/lib/analyzer/quality-gates.ts`**
   - Gate4 uses `verdict.relatedProceedingId` for filtering (line 418)
   - Assumes `relatedProceedingId` matches scope IDs exactly
   - **Risk:** LOW (string comparison, format-agnostic)
   - **Action:** No immediate concern, but validate in integration tests

5. **`apps/api/` (ASP.NET Core backend)**
   - Plan doesn't mention backend impact
   - If backend does scope-based filtering or caching, hash-based IDs will break queries
   - **Risk:** UNKNOWN (not scanned)
   - **Action:** Verify backend doesn't hardcode scope ID expectations

---

## 6. Phase 1 Implementation Readiness

### Can Phase 1 Be Implemented Today Without Breaking Production?

**Answer: PARTIAL YES (50% of Phase 1)**

#### ✅ Safe to Implement Today:
1. **Normalization consolidation** (remove line 2979 duplicate)
   - Zero risk
   - Pure cleanup
   - No behavior change

2. **Scope preservation validation** (add regression test for `selectFactsForScopeRefinementPrompt`)
   - Zero risk (test-only change)
   - Verification of existing logic

#### 🟡 Safe with Caution:
3. **Deterministic scope IDs** (hash-based)
   - Medium risk
   - **Prerequisites:**
     1. Audit `verdict-corrections.ts` for ID string matching
     2. Locate `normalizeScopeKey()` in UI code
     3. Add regression test: same input → same ID hash
     4. Grep entire codebase for `CTX_` hardcoded strings
   - **Estimated effort:** 4-6 hours of auditing + 2 hours testing
   - **Go/No-Go:** Can proceed if audit passes

#### 🔴 DO NOT IMPLEMENT:
4. **Move Gate1 post-research**
   - High risk
   - Will silently break supplemental claims coverage detection
   - **Blocked until:** Supplemental claims logic is refactored to use pre-filtered counts
   - **Estimated effort:** 8-12 hours (refactor + testing)

**Overall Phase 1 Readiness:**
- **2 out of 4 tasks** ready today (50%)
- **1 task** ready in 1 day (with audit)
- **1 task** requires architectural rework (3-5 days)

---

## 7. Phase 3-4 Grounding Validation Gap

### 🔴 CRITICAL BLOCKER: No Provenance Enforcement

The plan states (lines 505-510):
> "Implement search delegation: Detect if provider supports native search AND returns grounding metadata with real sources. Fallback to external search if grounding metadata is absent/unreliable."

**Current Implementation Check:**
- `apps/web/src/lib/search-gemini-grounded.ts` imported (line 43)
- Functions: `searchWithGrounding`, `isGroundedSearchAvailable`, `convertToFetchedSources`

**Critical Questions:**
1. Does `searchWithGrounding` validate **provenance** (real URLs + excerpts)?
2. Does it **fail closed** (reject synthetic responses without grounding metadata)?
3. Is there a **deterministic fallback** to external search?

**Without reading that file, this is BLOCKED.** The plan's "Ground Realism Gate" (lines 327-335) is **architecturally correct** but **not yet implemented** based on imports alone.

**Execution Risk:** 🔴 CRITICAL
- If grounding validation is missing, Phase 3-4 will introduce **synthetic evidence** into verdicts
- This violates FactHarbor's core integrity guarantee
- Cannot proceed to Phase 3 until grounding validation is proven safe

**Recommendation:**
**Before Phase 3 starts:**
1. Audit `search-gemini-grounded.ts` for provenance validation
2. Add integration test: grounded search WITHOUT metadata → fallback to external search
3. Add regression test: no synthetic facts in verdict evidence chain

---

## 8. Recommendations & Go/No-Go Gates

### Immediate Actions (Before Any Phase 1 Work):

1. **AUDIT** `apps/web/src/lib/analyzer/verdict-corrections.ts`
   - Look for scope ID string matching
   - Verify hash-based IDs won't break counter-claim detection
   - **Est. time:** 1 hour

2. **LOCATE** `normalizeScopeKey()` in UI code
   - Search outside `grep` results (may be inline helper)
   - Verify it's format-agnostic
   - **Est. time:** 30 minutes

3. **GREP** entire codebase for `"CTX_"`
   - Find any hardcoded scope ID references
   - Assess hash-based ID compatibility
   - **Est. time:** 15 minutes

4. **REFACTOR** supplemental claims logic
   - Option A: Keep Gate1 pre-research (status quo)
   - Option B: Add "Gate1-lite" pre-filter + full Gate1 post-research
   - Update plan to reflect this decision
   - **Est. time:** 4-8 hours

5. **AUDIT** grounding validation in `search-gemini-grounded.ts`
   - Verify provenance enforcement
   - Verify deterministic fallback
   - **Est. time:** 1-2 hours

### Phase 1 Go/No-Go Decision Tree:

```
START
  ↓
Audit verdict-corrections.ts
  ↓ PASS → Continue
  ↓ FAIL → FIX hash-based ID compatibility (Est. 2-4 hours)
  ↓
Locate normalizeScopeKey()
  ↓ PASS → Continue
  ↓ FAIL → Refactor UI scope key logic (Est. 2-4 hours)
  ↓
Grep for "CTX_" hardcoding
  ↓ NONE FOUND → Continue
  ↓ FOUND → Replace with ID-agnostic logic (Est. 1-3 hours per instance)
  ↓
Decide Gate1 strategy
  ↓ Keep pre-research → Continue (skip Gate1 move)
  ↓ Move post-research → Refactor supplemental claims (Est. 8-12 hours)
  ↓
✅ GO: Phase 1 (partial) can proceed
```

### Updated Phase 1 Scope (Realistic):

**Week 1-2 Achievable:**
1. ✅ Remove duplicate normalization (2 hours)
2. ✅ Add scope preservation regression test (4 hours)
3. 🟡 Implement deterministic scope IDs (8-12 hours, pending audits)
4. ❌ ~~Move Gate1 post-research~~ (DEFER to Phase 2)

**Updated Phase 1 Goal:**
- Stabilize normalization (DONE in v2.6.26, just needs cleanup)
- Stabilize scope IDs (80% ready, needs audits)
- Validate scope preservation (ready for testing)
- **Defer Gate1 move** until supplemental claims refactor is complete

---

## 9. Implementation Readiness Score Breakdown

| Category | Score | Weight | Weighted Score |
|----------|-------|--------|----------------|
| **Function Signature Accuracy** | 9/10 | 15% | 1.35 |
| **Normalization Plan Feasibility** | 8/10 | 15% | 1.20 |
| **Scope ID Change Safety** | 7/10 | 20% | 1.40 |
| **Gate1 Move Feasibility** | 3/10 | 25% | 0.75 |
| **Phase 3-4 Grounding Readiness** | 4/10 | 15% | 0.60 |
| **Documentation Completeness** | 7/10 | 10% | 0.70 |

**Total Weighted Score: 6.0/10**

Adjusted for "files to watch" risk: **6.5/10** (generous, assumes audits pass)

---

## 10. Final Verdict

### Implementation Readiness: 🟡 CONDITIONAL GO

**Phase 1 can start with reduced scope:**
- ✅ Normalization cleanup: GO
- ✅ Scope preservation testing: GO
- 🟡 Deterministic scope IDs: GO (after 1-day audit)
- 🔴 Gate1 move: NO-GO (defer to Phase 2)

**Phase 3-4 is BLOCKED** until grounding validation is proven safe.

### Confirmation for Stakeholder:

**Q: Can Phase 1 (Normalization & IDs) be implemented today without breaking the production build?**

**A: PARTIAL YES (50% of Phase 1 tasks can proceed today).**
- Normalization: ✅ Ready
- Scope IDs: ⚠️ Ready in 1 day (after audits)
- Scope preservation: ✅ Ready for testing
- Gate1 move: ❌ Not ready (requires 3-5 days of refactoring)

**Recommended Action:**
- Start Phase 1 with tasks 1-3 (normalization, scope IDs, testing)
- **Do NOT move Gate1** until supplemental claims logic is refactored
- Update plan to reflect realistic Phase 1 scope (2 weeks → 3 weeks with Gate1 deferred)

---

## Appendix A: Critical Code Paths Requiring Manual Audit

1. `apps/web/src/lib/analyzer/verdict-corrections.ts` (counter-claim detection)
2. `apps/web/src/app/jobs/[id]/page.tsx` (locate `normalizeScopeKey()`)
3. `apps/web/src/lib/search-gemini-grounded.ts` (provenance validation)
4. `apps/web/src/lib/claim-importance.ts` (ID-agnostic verification)
5. Backend API (`apps/api/`) scope ID usage (not scanned)

---

## Appendix B: Suggested Plan Updates

1. **Line 476:** Add note: "Gate1 move requires supplemental claims refactor (see Audit Report)"
2. **Line 467:** Change from "hash(name + subject + temporal)" to "hash(canonicalizeScope(name, subject, temporal)) with documented collision strategy"
3. **Lines 505-510:** Add explicit provenance validation checklist (URLs, excerpts, no synthetic facts)
4. **Line 480:** Update testing target: "Run 20 Q/S pairs + **known multi-scope regressions** + **Gate1 edge cases**"

---

**Audit Completed:** January 16, 2026  
**Next Review:** After 1-day audit (verdict-corrections.ts, normalizeScopeKey, CTX_ grep)  
**Escalation:** If audits reveal >5 hardcoded ID dependencies, re-evaluate hash-based ID approach
