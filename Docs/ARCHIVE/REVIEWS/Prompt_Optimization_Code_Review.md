# Prompt Optimization v2.8.0-2.8.1 Code Review

**Reviewer:** Senior Developer
**Date:** 2026-02-03
**Status:** APPROVED
**Created:** 2026-02-03
**Last Updated:** 2026-02-04
**Author Role:** Senior Developer

---

## Context

Comprehensive code review of prompt optimization changes (Phases 1–3) plus documentation updates. Focus on preserving critical guidance (death/injury high centrality, attribution low centrality, multi-context rules), verifying format-only principle in provider variants, checking for regressions/broken references, and validating documentation accuracy.

## References

- `Docs/WIP/Prompt_Optimization_Investigation.md`
- `Docs/WIP/Prompt_Optimization_Architecture_Review.md`
- `Docs/ARCHITECTURE/Prompt_Architecture.md`
- `Docs/REFERENCE/Provider_Prompt_Formatting.md`
- `Docs/USER_GUIDES/LLM_Configuration.md`

---

## Executive Summary

The prompt optimizations preserved key critical guidance in base prompts (death/injury = HIGH centrality, attribution/source/timing = LOW centrality, and multi-context split rules). However, multiple regressions and policy conflicts exist. Most notably, prompts still include domain-specific examples (e.g., Well-to-Wheel/Tank-to-Wheel, Brazil/SCOTUS) that violate the “generic by design” and “no test-case terms in prompts” rules. In addition, the Phase 3 Anthropic variant is not strictly format-only and includes concept guidance (attribution separation, centrality limits, context logic), which violates the format-only principle as defined in the task.

Documentation claims (token reductions, legacy field removal, and example structures) are not fully consistent with the current code. Several provider variants still include legacy field explanations and schema names (e.g., `detectedScopes`) that appear inconsistent with the base prompt outputs (`analysisContexts`), creating a risk of schema confusion or broken references.

---

## Per-Commit Review

### Phase 1 (c1a768c)
**Status:** CHANGES_REQUESTED  
**Findings:**
- Domain-specific examples remain in base prompts and provider variants (violates generic prompt policy).
- Legacy field explanations remain in provider variants (contrary to Phase 1 objective).
- OpenAI provider still references `detectedScopes` instead of `analysisContexts` (schema mismatch risk).

### Phase 2 (2ae2a42)
**Status:** CHANGES_REQUESTED  
**Findings:**
- Centrality and multi-context guidance preserved in base prompts (PASS).
- Condensed rules still include domain-specific examples (policy violation).

### Phase 3 (7803ab1)
**Status:** CHANGES_REQUESTED  
**Findings:**
- Anthropic “format-only” variant still includes concept teaching (attribution separation, context handling, centrality limits).
- Rating direction guidance is preserved (PASS), but must remain the only non-format behavioral guidance if format-only principle is enforced.

### Documentation (8d235c6)
**Status:** CHANGES_REQUESTED  
**Findings:**
- Docs claim legacy field explanations removed, but provider prompts still contain them.
- Token reduction percentages and savings are asserted without explicit “estimated/approximate” qualifiers.
- Provider formatting examples in docs do not reflect the slimmed Anthropic variant.

---

## Critical Guidance Verification

| Guidance | Location | Must Contain | Review Status |
|---|---|---|---|
| Death = HIGH centrality | `apps/web/src/lib/analyzer/prompts/base/understand-base.ts:124` | “DEATH/INJURY: MANDATORY HIGH” | ✅ PASS |
| Attribution = LOW centrality | `apps/web/src/lib/analyzer/prompts/base/understand-base.ts:135-136` | Attribution/source/timing = LOW | ✅ PASS |
| Multi-context split rules (DO split) | `apps/web/src/lib/analyzer/prompts/base/understand-base.ts:67-70` | Methodology boundaries, time-as-subject | ✅ PASS |
| Multi-context NO split | `apps/web/src/lib/analyzer/prompts/base/understand-base.ts:62-65` | Viewpoints/incidental temporal | ✅ PASS |
| Rating direction (claim truth) | `apps/web/src/lib/analyzer/prompts/providers/anthropic.ts:70-73` | “Rate USER’S CLAIM truth” | ✅ PASS |
| Contested/factualBasis rules | `apps/web/src/lib/analyzer/prompts/base/verdict-base.ts:153-172` | factualBasis guidance | ✅ PASS (in base) |

---

## Issues Found

### [CRITICAL] - Domain-Specific Examples in Base Prompts (Violates Generic Prompt Policy)

**Location:**  
- `apps/web/src/lib/analyzer/prompts/base/understand-base.ts:68-70`  
- `apps/web/src/lib/analyzer/prompts/base/orchestrated-understand.ts:176`  
- `apps/web/src/lib/analyzer/prompts/base/scope-refinement-base.ts:17`  
- `apps/web/src/lib/analyzer/prompts/base/extract-facts-base.ts:24`

**Issue:** Base prompts include domain-specific examples (e.g., “Well-to-Wheel vs Tank-to-Wheel,” “electric vehicles vs gas-powered cars”).  
**Expected:** Only abstract, generic examples (e.g., “Method A vs Method B”).  
**Actual:** Real-world domain terms remain in base prompts.  
**Recommendation:** Replace all domain-specific references with abstract placeholders.

### [CRITICAL] - Domain-Specific Examples in Provider Variants

**Location:**  
- `apps/web/src/lib/analyzer/prompts/providers/openai.ts:20-29, 171-201`  
- `apps/web/src/lib/analyzer/prompts/providers/mistral.ts:112-119`  
- `apps/web/src/lib/analyzer/prompts/providers/google.ts:93-100`

**Issue:** Provider variants contain real-world institutions/regions and domain-specific terminology.  
**Expected:** Generic placeholders only (e.g., “Entity A”, “Region X”).  
**Actual:** “Brazil TSE”, “SCOTUS”, “EU/USA”, “Well-to-Wheel/Tank-to-Wheel”.  
**Recommendation:** Replace with abstract examples that do not match real-world test cases.

### [CRITICAL] - Phase 1 Requirement Not Met: Legacy Field Explanations Remain

**Location:**  
- `apps/web/src/lib/analyzer/prompts/providers/openai.ts:34-35, 95-103`  
- `apps/web/src/lib/analyzer/prompts/providers/google.ts:84-91`  
- `apps/web/src/lib/analyzer/prompts/providers/mistral.ts:88-96`

**Issue:** Provider variants still include legacy field explanations (e.g., “fact” legacy field, “evidence” legacy enum).  
**Expected:** Phase 1 change removed legacy field explanations from provider variants.  
**Actual:** Legacy explanations persist.  
**Recommendation:** Remove legacy field explanations from provider variants or clarify that Phase 1 did not apply to these sections.

### [CRITICAL] - Format-Only Principle Violations in Anthropic Variant

**Location:**  
- `apps/web/src/lib/analyzer/prompts/providers/anthropic.ts:23-31, 45-52, 96-101`

**Issue:** Anthropic “format-only” variant includes behavioral/semantic guidance (attribution separation, centrality limits, context rules, coverage thresholds).  
**Expected:** Format-only guidance (XML tags, schema shape, output formatting) per Phase 3 requirements.  
**Actual:** Concept teaching remains.  
**Recommendation:** Remove conceptual instructions from Anthropic variant; keep only format and output-structure preferences. Leave rating-direction guidance only if explicitly exempted.

### [CRITICAL] - Schema Terminology Drift in Provider Variants

**Location:**  
- `apps/web/src/lib/analyzer/prompts/providers/openai.ts:20-38`

**Issue:** OpenAI variant references `detectedScopes`, while base output uses `analysisContexts`.  
**Expected:** Provider variant must match base schema and terminology.  
**Actual:** Mixed legacy and current schema naming in the same prompt.  
**Recommendation:** Align provider variants to `analysisContexts` and remove legacy schema field names or clearly label as deprecated if still required.

### [SUGGESTION] - Documentation Uses Non-Generic Examples

**Location:**  
- `Docs/REFERENCE/Provider_Prompt_Formatting.md:235-249`

**Issue:** Documentation examples include real-world terms (e.g., WHO, COVID-19).  
**Expected:** Generic examples to match prompt policy and avoid test-case leakage.  
**Actual:** Real-world example data present.  
**Recommendation:** Replace with abstract placeholders.

### [SUGGESTION] - Token Reduction Claims Not Marked as Estimates

**Location:**  
- `Docs/ARCHITECTURE/Prompt_Architecture.md:215-229`  
- `Docs/USER_GUIDES/LLM_Configuration.md:215-229`

**Issue:** Token savings are presented as precise achievements without “estimated/approximate” qualifiers or measurement methodology.  
**Expected:** Mark as estimates unless measured with reproducible scripts.  
**Actual:** Claims read as finalized metrics.  
**Recommendation:** Add “estimated” labels or reference measurement method.

---

## Recommendations

1. Replace all domain-specific prompt examples with abstract placeholders across base prompts and provider variants.  
2. Enforce format-only principle for Anthropic (and clarify whether it applies to all providers or only the pilot).  
3. Remove legacy field explanations from provider variants or update Phase 1 documentation if intentionally retained.  
4. Align provider variants to current schema naming (`analysisContexts`), avoiding `detectedScopes`.  
5. Update docs to reflect actual current variant content and clarify token reduction figures as estimates.

---

## Sign-Off

**Decision:** REQUEST_CHANGES  
**Rationale:** Multiple critical policy violations (non-generic prompts, format-only violations, legacy schema leakage) and documentation mismatches.  
**Next Steps:** Apply prompt/variant fixes, update docs, then re-run review and prompt composition checks.

---

## Post-Review Fixes (2026-02-03)

**What changed and why:**

- **Sanitized prompt examples** to remove domain-specific terms (e.g., WTW/TTW, real institutions/regions) and replace with abstract placeholders, per the “generic by design” policy.
- **Aligned Anthropic variants to format-only** by removing conceptual instructions (attribution separation, context rules, centrality guidance) while retaining required rating-direction guidance.
- **Removed legacy-field explanations** from provider variants to match Phase 1 requirements and reduce schema confusion.
- **Kept `detectedScopes` naming in understand variants** to match `understand-base.ts` and the monolithic schema (`monolithic-canonical.ts`) for backward compatibility. This does **not** affect EvidenceScope; `analysisContexts` remains the output for orchestrated understand and scope_refinement tasks.
- **Updated prompt test fixtures** to generic examples and renamed “scope” test cases to “context” for clarity and consistency.
- **Updated docs** to reflect format-only Anthropic variants, generic examples, and mark token/cost reductions as **estimated** rather than finalized.

**Files updated:**
- `apps/web/src/lib/analyzer/prompts/base/understand-base.ts`
- `apps/web/src/lib/analyzer/prompts/base/orchestrated-understand.ts`
- `apps/web/src/lib/analyzer/prompts/base/scope-refinement-base.ts`
- `apps/web/src/lib/analyzer/prompts/base/extract-facts-base.ts`
- `apps/web/src/lib/analyzer/prompts/base/verdict-base.ts`
- `apps/web/src/lib/analyzer/prompts/providers/anthropic.ts`
- `apps/web/src/lib/analyzer/prompts/providers/openai.ts`
- `apps/web/src/lib/analyzer/prompts/providers/google.ts`
- `apps/web/src/lib/analyzer/prompts/providers/mistral.ts`
- `apps/web/src/lib/analyzer/prompts/prompt-testing.ts`
- `apps/web/test/unit/lib/analyzer/prompts/prompt-optimization.test.ts`
- `Docs/ARCHITECTURE/Prompt_Architecture.md`
- `Docs/REFERENCE/Provider_Prompt_Formatting.md`
- `Docs/USER_GUIDES/LLM_Configuration.md`

**Validation:**
- `cd apps/web; npm run build` (successful)

---

## Review Log

| Date | Reviewer Role | Status | Comments |
|------|---------------|--------|----------|
| 2026-02-03 | Senior Developer | REQUEST_CHANGES | Multiple critical prompt policy and format-only violations; docs need alignment |
| 2026-02-04 | Lead Developer | APPROVED | Post-Review Fixes verified; all critical issues resolved |

---

## Lead Developer Verification (2026-02-04)

### Verification Summary: ✅ ALL CHECKS PASS

| Check | Result | Evidence |
|-------|--------|----------|
| AnalysisContext vs EvidenceScope clarity | ✅ PASS | Clear terminology in understand-base.ts:23-27 and orchestrated-understand.ts:46-50 |
| Legacy field naming notes | ✅ PASS | All 4 provider variants have consistent notes (lines 13-15) |
| No schema/output breaking changes | ✅ PASS | `detectedScopes` preserved for backward compatibility; `analysisContexts` used in orchestrated pipeline |
| Format-only Anthropic variants | ✅ PASS | ~84 lines, format-only; rating direction exemption honored |
| Generic examples | ✅ PASS | All examples use "Institution A/B", "Technology A/B", "Region X", etc. |

### Detailed Findings

**1. Terminology Clarity (understand-base.ts:23-27)**
```
**AnalysisContext**: Top-level analytical frame requiring separate verdict (e.g., "System A" vs "System B").
**EvidenceScope**: Per-evidence source methodology metadata.
```
Both base prompts properly distinguish these concepts with clear definitions.

**2. Legacy Field Documentation**
All four provider variants include identical notes:
```typescript
// NOTE: Keep "detectedScopes" naming to match understand-base schema and monolithic parsing.
// Do NOT switch to analysisContexts here until a coordinated breaking change.
```

**3. Format-Only Compliance (anthropic.ts)**
Anthropic variant now contains only:
- XML tag preferences
- JSON output format requirements
- Schema compliance reminders
- Rating direction guidance (explicitly exempted)

No concept teaching (attribution separation, context rules, centrality guidance) remains.

**4. Generic Examples Verified**
Spot-checked all prompt files:
- understand-base.ts: "Method A vs Method B", "Entity A", "Event E"
- openai.ts: "Institution A", "Technology A/B", "Region X"
- google.ts: "Boundary A", "Standard X", "Region X"
- mistral.ts: "Technology A/B", "Product X"

No domain-specific terms (WTW/TTW, Brazil TSE, SCOTUS, WHO, COVID-19) found.

---

## Decision Record

~~REQUEST_CHANGES due to policy violations and format-only mismatch. Re-review required after corrections.~~

**APPROVED (2026-02-04)**: All Post-Review Fixes verified. Critical issues resolved:
- Domain-specific examples replaced with generic placeholders
- Anthropic variant slimmed to format-only (~84 lines)
- Legacy field naming properly documented
- No breaking changes to schema or output format
- AnalysisContext vs EvidenceScope terminology clear and consistent
