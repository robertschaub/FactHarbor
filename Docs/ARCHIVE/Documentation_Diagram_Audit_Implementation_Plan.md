# Documentation & Diagram Audit - Implementation Plan

**Author:** Claude (Principal Architect)
**Date:** 2026-02-08
**Source:** [Documentation_Diagram_Audit_Report.md](Documentation_Diagram_Audit_Report.md)
**Status:** READY FOR IMPLEMENTATION

---

## Overview

3 phases, ordered by priority. Phase 1 fixes incorrect documentation. Phase 2 adopts valuable xWiki designs into code. Phase 3 updates target model to prevent future migration conflicts.

| Phase | Scope | Tasks | Effort | Priority |
|-------|-------|-------|--------|----------|
| **Phase 1** | Fix xWiki docs to match code | 4 tasks | ~3h | HIGH |
| **Phase 2** | Adopt xWiki designs into code | 3 tasks | ~4h | MEDIUM |
| **Phase 3** | Update target data model | 3 tasks | ~2h | LOW |

---

## Phase 1: Fix xWiki Documentation (HIGH Priority)

Goal: Make current-implementation diagrams match the actual codebase.

---

### Task 1.1: Fix Core Data Model ERD

**File:** `Docs/xwiki-pages/FactHarbor/Specification/Diagrams/Core Data Model ERD/WebHome.xwiki`

**Changes:**

**a) CLAIM_VERDICT - Remove `opposingEvidenceIds`, fix field list:**
```
CLAIM_VERDICT {
    string id_PK
    string claimId_FK
    number verdict
    number truthPercentage
    number confidence
    string reasoning
    string_array supportingEvidenceIds
    string ratingConfirmation
    boolean isContested
    string contestedBy
    string factualBasis
}
```
Note: `opposingEvidenceIds` will be added as a code improvement in Phase 2. Don't add it to ERD until code has it.

**b) EVIDENCE_ITEM - Add v2.8+ fields:**
```
EVIDENCE_ITEM {
    string id_PK
    string sourceId_FK
    string statement
    string sourceExcerpt
    string category
    string claimDirection
    string contextId
    string sourceAuthority
    string probativeValue
    string evidenceBasis
    number extractionConfidence
}
```

**c) SOURCE - Rename fields to match FetchedSource:**
```
SOURCE {
    string id_PK
    string url
    string title
    float trackRecordScore
    float trackRecordConfidence
    boolean trackRecordConsensus
    string category
    boolean fetchSuccess
}
```

**d) ANALYSIS_CONTEXT - Update fields to match actual type:**
```
ANALYSIS_CONTEXT {
    string id_PK
    string name
    string shortName
    string subject
    string temporal
    string status
    string outcome
    string assessedStatement
    json metadata
}
```

**e) Update version note:**
Change `v2.10.2` references to current version. Add note: "Updated 2026-02-08 per audit report."

**Effort:** 45 minutes

---

### Task 1.2: Fix AKEL Architecture Diagram

**File:** `Docs/xwiki-pages/FactHarbor/Specification/Diagrams/AKEL Architecture/WebHome.xwiki`

**Changes:**

**a) Update line counts:**
| File | Old | New |
|------|-----|-----|
| orchestrated.ts | ~12,000 | ~13,300 |
| monolithic-canonical.ts | ~1,100 | ~1,500 |
| monolithic-dynamic.ts | ~550 | ~735 |

**b) Add missing shared modules to the diagram:**

Add these to the "Shared Modules" group in the mermaid graph:
```
evidence-filter.ts[evidence-filter.ts ~330 lines]
quality-gates.ts[quality-gates.ts]
source-reliability.ts[source-reliability.ts ~550 lines]
verdict-corrections.ts[verdict-corrections.ts]
truth-scale.ts[truth-scale.ts]
budgets.ts[budgets.ts]
```

Connect them to the pipeline nodes that use them.

**Effort:** 30 minutes

---

### Task 1.3: Update Orchestrated Pipeline Diagram

**File:** `Docs/xwiki-pages/FactHarbor/Specification/Diagrams/Orchestrated Pipeline Internal/WebHome.xwiki`

**Changes:**

Add adaptive fallback step within the RESEARCH LOOP:

```
PREFILTER[Relevance Pre-Filter] --> ADAPTIVE{Candidates >= 5?}
ADAPTIVE -- Yes --> EXTRACT[Extract Evidence]
ADAPTIVE -- No --> FALLBACK[Adaptive Fallback: relax constraints + extra queries] --> EXTRACT
```

Add to parameters section:
```
searchAdaptiveFallbackMinCandidates: 5
searchAdaptiveFallbackMaxQueries: 2
```

**Effort:** 20 minutes

---

### Task 1.4: Update LLM Abstraction Diagram

**File:** `Docs/xwiki-pages/FactHarbor/Specification/Diagrams/LLM Abstraction Architecture/WebHome.xwiki`

**Changes:**

Add default model names to diagram labels:
```
Anthropic: claude-haiku-4-5 (extract), claude-sonnet-4-5 (verdict)
OpenAI: gpt-4.1-mini (extract), gpt-4.1 (verdict)
Google: gemini-2.5-flash (extract), gemini-2.5-pro (verdict)
Mistral: mistral-small (extract), mistral-large (verdict)
```

**Effort:** 15 minutes

---

### Phase 1 Checklist

- [x] Task 1.1: Core Data Model ERD (CLAIM_VERDICT, EVIDENCE_ITEM, SOURCE, ANALYSIS_CONTEXT) — 2026-02-08
- [x] Task 1.2: AKEL Architecture (line counts, shared modules) — 2026-02-08
- [x] Task 1.3: Orchestrated Pipeline (adaptive fallback step) — 2026-02-08
- [x] Task 1.4: LLM Abstraction (default model names, tiered routing) — 2026-02-08
- [ ] Verify all changes render correctly in xWiki preview

---

## Phase 2: Adopt xWiki Designs Into Code (MEDIUM Priority)

Goal: Implement valuable design ideas from xWiki documentation that the code doesn't have yet.

---

### Task 2.1: Add `opposingEvidenceIds` to ClaimVerdict

**Rationale:** xWiki ERD proposed this field. Current code uses misleadingly named `supportingEvidenceIds` for ALL evidence. The UI and verdict validator already split by direction - making this explicit improves clarity.

**Files to modify:**

**a) `apps/web/src/lib/analyzer/types.ts`** - Add field to ClaimVerdict interface:
```typescript
// After supportingEvidenceIds (around line 500)
/** Evidence IDs that contradict this claim (claimDirection === "contradicts") */
opposingEvidenceIds?: string[];
```

**b) `apps/web/src/lib/analyzer/orchestrated.ts`** - Populate during verdict assembly:

Find where `supportingEvidenceIds` is populated (search for `supportingEvidenceIds:` assignments). After each, add:
```typescript
opposingEvidenceIds: linkedEvidence
  .filter(e => e.claimDirection === "contradicts")
  .map(e => e.id),
```

**c) `apps/web/src/lib/analyzer/orchestrated.ts`** - Use in `countBySourceDeduped()`:

In `validateVerdictDirections()` (line ~3807), the current code filters `supportingEvidenceIds` by direction. After populating `opposingEvidenceIds`, this can be simplified:
```typescript
// Current (confusing):
const linkedEvidence = evidenceItems.filter(e => supportingIds.includes(e.id));

// After (clearer):
const supportEvidence = evidenceItems.filter(e => (verdict.supportingEvidenceIds || []).includes(e.id));
const opposeEvidence = evidenceItems.filter(e => (verdict.opposingEvidenceIds || []).includes(e.id));
const linkedEvidence = [...supportEvidence, ...opposeEvidence];
```

**d) `apps/web/src/app/jobs/[id]/page.tsx`** - Use in UI (optional, simplifies existing filter):

Currently the UI filters evidence by `claimDirection` at line ~914. With explicit `opposingEvidenceIds`, this can reference the pre-computed arrays.

**e) Update Core Data Model ERD** (after code is done):

Add `opposingEvidenceIds` to CLAIM_VERDICT entity in the ERD.

**Backward compatibility:** Fully backward compatible. New field is optional (`?`). Old results without it still work. Existing `supportingEvidenceIds` kept as-is.

**Verification:**
- [ ] `npx tsc --noEmit` passes
- [ ] Existing tests pass
- [ ] New analysis run produces both `supportingEvidenceIds` and `opposingEvidenceIds`
- [ ] UI displays counter-evidence correctly

**Effort:** 1.5 hours

---

### Task 2.2: Surface `biasIndicator` on FetchedSource

**Rationale:** Source bias data is already evaluated by LLM and cached in source-reliability.db, but never surfaced to the analysis result or UI. xWiki correctly proposes a `bias` field.

**Files to modify:**

**a) `apps/web/src/lib/analyzer/types.ts`** - Add to FetchedSource:
```typescript
export interface FetchedSource {
  // ... existing fields ...
  /** Bias indicator from source reliability evaluation (e.g., "center-left", "right-leaning") */
  biasIndicator?: string | null;
}
```

**b) `apps/web/src/lib/analyzer/source-reliability.ts`** - Return bias in prefetch results:

In the function that maps cached data to the format used during analysis, include `biasIndicator` from the cache. Find where `trackRecordScore` is read from cache and add:
```typescript
biasIndicator: cachedData.biasIndicator || null,
```

**c) `apps/web/src/lib/analyzer/orchestrated.ts`** - Populate on FetchedSource during source assembly:

When building the `FetchedSource` object from prefetched reliability data, include:
```typescript
biasIndicator: reliabilityData?.biasIndicator || null,
```

**d) Report UI (optional, LOW priority):**

In `apps/web/src/app/jobs/[id]/page.tsx`, where sources are displayed, add bias indicator as a small badge/tag next to the source name.

**Backward compatibility:** Fully backward compatible. Optional field, old results unaffected.

**Verification:**
- [ ] `npx tsc --noEmit` passes
- [ ] New analysis result includes `biasIndicator` on sources
- [ ] Verify bias values are reasonable (e.g., bbc.com shows "center", whitehouse.gov shows political leaning)

**Effort:** 1.5 hours

---

### Task 2.3: Update Core Data Model ERD After Code Changes

**File:** `Docs/xwiki-pages/FactHarbor/Specification/Diagrams/Core Data Model ERD/WebHome.xwiki`

After Tasks 2.1 and 2.2 are in code, update the ERD:

- Add `opposingEvidenceIds` to CLAIM_VERDICT
- Add `biasIndicator` to SOURCE

**Effort:** 15 minutes

---

### Phase 2 Checklist

- [ ] Task 2.1: Add `opposingEvidenceIds` to ClaimVerdict + orchestrated.ts + UI
- [ ] Task 2.2: Surface `biasIndicator` on FetchedSource + source-reliability.ts
- [ ] Task 2.3: Update Core Data Model ERD with new fields
- [ ] Run full test suite
- [ ] Run 2 live analyses (Bolsonaro + vaccine) and verify new fields populated

---

## Phase 3: Update Target Data Model (LOW Priority)

Goal: Resolve the 3 structural conflicts in the target data model to prevent future migration confusion.

---

### Task 3.1: Replace "Scenario" with AnalysisContext

**File:** `Docs/xwiki-pages/FactHarbor/Specification/Data Model/WebHome.xwiki`

**Changes:**

**a) Section 1.4 "Scenario"** - Rewrite to describe AnalysisContext:
```
=== 1.4 AnalysisContext ===
**Purpose**: Bounded analytical frame for evaluating claims within a specific context
**Relationship**: One-to-many with Article (AnalysisContexts detected per analysis)
**Fields**:
* **id** (string): Short identifier (e.g., "CTX_A", "CTX_B")
* **name** (string): Human-readable name
* **shortName** (string): Abbreviated name
* **subject** (string): What is being assessed
* **temporal** (string): Time period
* **status** (enum): "concluded" | "ongoing" | "pending" | "unknown"
* **outcome** (string): Known outcome if concluded
* **assessedStatement** (string): Statement being assessed in this context
* **metadata** (JSON): {institution, court, jurisdiction, methodology, boundaries, geographic, ...}
```

**b) Remove** Scenario-specific text: "Scenario Strategy (APPROVED)" section, staleness logic, "Scenarios may improve as AI improves" section.

**c) Add note**: "Previously named 'Scenario' in target model. Renamed to AnalysisContext to match implementation (v2.6.39+)."

**Effort:** 30 minutes

---

### Task 3.2: Replace `likelihood_range` with 7-Point Scale

**File:** `Docs/xwiki-pages/FactHarbor/Specification/Data Model/WebHome.xwiki`

**Changes in Section 1.5 "Verdict":**

Replace:
```
* **likelihood_range** (text): Probabilistic assessment (e.g., "0.40-0.65 (uncertain)")
```

With:
```
* **truthPercentage** (integer 0-100): Position on 7-point truth scale
* **confidence** (integer 0-100): Assessment confidence
* **ratingConfirmation** (enum): "claim_supported" | "claim_refuted" | "mixed"
```

Add the 7-point scale definition:
```
TRUE (86-100%) | MOSTLY-TRUE (72-85%) | LEANING-TRUE (58-71%)
MIXED (43-57%, high confidence) | UNVERIFIED (43-57%, low confidence)
LEANING-FALSE (29-42%) | MOSTLY-FALSE (15-28%) | FALSE (0-14%)
```

**Effort:** 20 minutes

---

### Task 3.3: Update Source Scoring Architecture

**File:** `Docs/xwiki-pages/FactHarbor/Specification/Data Model/WebHome.xwiki`

**Changes in Section 1.3 "Source" and scoring subsections:**

**a) Replace** the background batch job description (Python code example, "Sunday 2 AM" schedule) with:
```
==== Source Scoring Architecture (LLM + Cache v2.2) ====
* **On-demand evaluation**: Sources evaluated by LLM on first encounter
* **Multi-model consensus**: Claude + GPT evaluate independently, consensus detected
* **TTL cache**: Scores cached in source-reliability.db (default: 90 days)
* **One-way data flow**: Analysis reads scores but never writes them (same principle as original batch design)
* **Fields stored**: score, confidence, consensusAchieved, biasIndicator, category, reasoning, evidenceCited
```

**b) Update** Source fields to match `EvaluationResult`:
```
* **score** (float 0-1): Overall reliability score
* **confidence** (float 0-1): Evaluation confidence
* **consensusAchieved** (boolean): Whether multiple models agreed
* **biasIndicator** (string): Political/editorial bias assessment
* **category** (string): Source category (news, academic, government, etc.)
* **reasoning** (string): LLM explanation of the score
```

**c) Remove** or move to "Historical Design" appendix:
- The `accuracy_history` (JSON) field
- The `correction_frequency` (float) field
- The Python batch job code examples
- The "Sunday 2 AM" schedule description

**d) Keep** the design principles section (one-way data flow, no circular dependencies) - these are still valid and correctly implemented.

**Effort:** 45 minutes

---

### Phase 3 Checklist

- [ ] Task 3.1: Replace Scenario with AnalysisContext throughout
- [ ] Task 3.2: Replace likelihood_range with 7-point scale
- [ ] Task 3.3: Update source scoring architecture
- [ ] Review full Data Model page for consistency after changes
- [ ] Verify xWiki cross-references (links to Source Reliability System, Architecture, etc.) still valid

---

## Implementation Order

```
Phase 1 (docs only, no code risk)
  ├── Task 1.1: Core ERD fix
  ├── Task 1.2: AKEL diagram fix
  ├── Task 1.3: Pipeline diagram fix
  └── Task 1.4: LLM diagram fix

Phase 2 (code changes, need testing)
  ├── Task 2.1: opposingEvidenceIds in code
  ├── Task 2.2: biasIndicator surfacing
  └── Task 2.3: ERD update (after 2.1 + 2.2)

Phase 3 (target model docs, no code risk)
  ├── Task 3.1: Scenario → AnalysisContext
  ├── Task 3.2: likelihood_range → 7-point scale
  └── Task 3.3: Source scoring architecture
```

Phases 1 and 3 are documentation-only (no code risk, no testing needed beyond xWiki preview).
Phase 2 requires TypeScript compilation check + test suite + live validation runs.

---

## Verification

After all phases complete:

- [ ] All .xwiki diagram files render correctly
- [ ] `npx tsc --noEmit` passes (Phase 2)
- [ ] Unit tests pass (Phase 2)
- [ ] Live analysis produces `opposingEvidenceIds` and `biasIndicator` (Phase 2)
- [ ] No xWiki cross-reference links broken (all phases)
- [ ] Core ERD matches actual TypeScript types exactly

---

**Approval:**

| Reviewer | Role | Status | Date |
|----------|------|--------|------|
| Claude Opus 4.6 | Principal Architect | ✅ AUTHORED | 2026-02-08 |
| | Senior Developer | ⏳ PENDING | |
