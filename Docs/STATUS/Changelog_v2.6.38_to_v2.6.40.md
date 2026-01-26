# Changelog: v2.6.38 to v2.6.40

**Date**: January 26, 2026  
**Status**: Implemented and Tested

---

## v2.6.40 - Context/Scope Terminology Fix

### Problem
The inline prompts in `orchestrated.ts` were mixing "scope" and "context" terminology, causing confusion for the LLM and preventing `assessedStatement` from being properly passed to the verdict phase.

### Changes

1. **Fixed assessedStatement in Verdict Prompt**
   - `contextsFormatted` now includes `assessedStatement` field for each context
   - Added explicit instruction: shortAnswer must evaluate the assessedStatement
   - Added `assessedStatement` to the local `Scope` interface

2. **Fixed Terminology in Inline Prompts** (~10 instances)
   - `"MULTIPLE DISTINCT SCOPES"` → `"MULTIPLE DISTINCT CONTEXTS"`
   - `"SCOPE RELEVANCE REQUIREMENT"` → `"CONTEXT RELEVANCE REQUIREMENT"`
   - `"MULTI-SCOPE DETECTION"` → `"MULTI-CONTEXT DETECTION"`
   - `"For EACH scope"` → `"For EACH context"`
   - `"NOT DISTINCT SCOPES"` → `"NOT DISTINCT CONTEXTS"`
   - `"## SCOPES"` → `"## CONTEXTS"`
   - Renamed variable `scopesFormatted` to `contextsFormatted`
   - Updated example IDs from `SCOPE_COURT_A` to `CTX_COURT_A`

### Files Modified
- `apps/web/src/lib/analyzer/orchestrated.ts`
- `apps/web/src/lib/analyzer/config.ts` (version bump)

---

## v2.6.39 - Assessed Statement Feature

### Problem
Users couldn't tell what specific statement was being evaluated in each AnalysisContext card. A context showing "74% Mostly True" was unclear - Was it assessing fairness? Legality? Validity?

### Solution
Added explicit `assessedStatement` field to each **AnalysisContext** object that clearly states what is being evaluated.

### Implementation

**Type Definition** (`types.ts`):
```typescript
export interface AnalysisContext {
  // ... existing fields
  assessedStatement?: string;   // What is being assessed in this context
}
```

**Prompt Updates**:
- `orchestrated-understand.ts` - Added assessedStatement to output schema
- `scope-refinement-base.ts` - Added assessedStatement to output schema
- Instructions: assessedStatement describes what is evaluated; Assessment must summarize the assessment of THIS assessedStatement

**UI Display** (`page.tsx`):
```tsx
{scope?.assessedStatement && (
  <div className={styles.scopeAssessmentQuestion}>
    <span className={styles.scopeAssessmentLabel}>Assessed Statement:</span> 
    {scope.assessedStatement}
  </div>
)}
```

### Files Modified
- `apps/web/src/lib/analyzer/types.ts`
- `apps/web/src/lib/analyzer/prompts/base/orchestrated-understand.ts`
- `apps/web/src/lib/analyzer/prompts/base/scope-refinement-base.ts`
- `apps/web/src/app/jobs/[id]/page.tsx`
- `apps/web/src/app/jobs/[id]/page.module.css`

---

## v2.6.38 - Context Overlap Detection & UI Reliability

### Changes

1. **Temporal Guidance Clarification**
   - Fixed contradiction in prompts about temporal splitting
   - **Incidental temporal mentions** (e.g., "in 2020, the court...") → Do NOT split
   - **Time period AS PRIMARY SUBJECT** (e.g., "2000s event" vs "1970s event") → DO split

2. **Context Count Warning**
   - Added logging when 5+ contexts detected (may indicate over-splitting)
   - Threshold: `CONTEXT_WARNING_THRESHOLD = 5`

3. **Claim Assignment Validation**
   - Catches claims assigned to non-existent contexts
   - Orphaned claims are unassigned for fallback handling

4. **UI Reliability Field**
   - Added `articleVerdictReliability: "high" | "low"` to ArticleAnalysis
   - `"high"` = single context or same question (average meaningful)
   - `"low"` = multiple distinct contexts (average may not be meaningful)

5. **UI Improvements**
   - De-emphasize overall average when reliability is low (60% opacity, "(avg)" label)
   - Explanatory note: "This average may not be meaningful..."
   - Emphasize individual context verdicts section with star header

6. **Documentation**
   - Added "When is the Overall Average Meaningful?" section to Calculations.md

### Files Modified
- `apps/web/src/lib/analyzer/prompts/base/understand-base.ts`
- `apps/web/src/lib/analyzer/prompts/base/scope-refinement-base.ts`
- `apps/web/src/lib/analyzer/prompts/base/orchestrated-understand.ts`
- `apps/web/src/lib/analyzer/orchestrated.ts`
- `apps/web/src/lib/analyzer/types.ts`
- `apps/web/src/app/jobs/[id]/page.tsx`
- `Docs/ARCHITECTURE/Calculations.md`

---

## Source Reliability Export Feature (v2.6.38)

### Feature
Added print and export functionality to the Source Evaluation Details modal in the admin source reliability page.

### Export Formats
- **Print** - Opens browser print dialog (save as PDF)
- **HTML** - Downloads standalone HTML report
- **Markdown** - Downloads formatted .md file
- **JSON** - Downloads structured .json file

### Files Modified
- `apps/web/src/app/admin/source-reliability/page.tsx`
- `apps/web/src/app/admin/source-reliability/source-reliability.module.css`

### Usage
1. Navigate to `/admin/source-reliability`
2. Click "View" on any cached source entry
3. Use export buttons in modal footer

---

## Architecture Decisions

### Context vs Scope Terminology
- **AnalysisContext** (abbreviated "Context"): Top-level analytical frame requiring separate analysis and verdict
- **EvidenceScope** (abbreviated "Scope"): Per-fact source metadata (methodology, temporal bounds, boundaries)
- **Rule**: NEVER use "scope" when referring to AnalysisContext

### Verdict Averaging
- Simple averaging chosen over complex weighting schemes
- UI signals when average may not be meaningful
- Individual context verdicts always preserved and displayed

### LLM-Driven Overlap Detection
- Algorithmic overlap detection removed (not intelligent enough)
- LLM instructed to merge near-duplicates during context detection
- Qualitative heuristics instead of percentage thresholds
