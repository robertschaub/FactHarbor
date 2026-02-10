# Plan: Remove Monolithic Canonical Pipeline

**Status:** COMPLETED (implemented in commit `88e7fc4`, documentation cleanup in subsequent commits)

## Context

The Monolithic Canonical pipeline (`monolithic_canonical`) was an experimental pipeline variant introduced for faster single-context analysis with canonical schema output. With the Orchestrated pipeline as the stable default and Monolithic Dynamic as the experimental alternative, the Canonical pipeline is no longer needed and adds maintenance overhead.

**Goal**: Completely remove the Monolithic Canonical pipeline from source code and documentation while ensuring the Orchestrated and Dynamic pipelines remain fully functional with no behavior changes.

**Critical distinction**: The word "canonical" is used in two contexts in this codebase:
1. **Pipeline variant "monolithic_canonical"** -- THIS IS REMOVED
2. **Data normalization "canonicalize"** (canonicalizeContexts, canonicalizeContent, canonicalizedHash, canonical_claim, canonicalName) -- THIS STAYS UNTOUCHED

---

## Phase 1: Remove Tests That Import monolithic-canonical.ts

These test files directly import `runMonolithicCanonical` and must be cleaned before deleting the implementation.

| File | Action | Detail |
|------|--------|--------|
| `apps/web/test/unit/lib/analyzer/multi-jurisdiction.test.ts` | DELETE | Entire file is canonical-only stress test |
| `apps/web/test/unit/lib/analyzer/v2.8-verification.test.ts` | MODIFY | Remove `import { runMonolithicCanonical }` (line 25) and the Integration Tests describe block (~line 630+) that calls it. Keep all Unit Tests (lines 32-628) for context detection and aggregation |

**Verify**: `npx tsc --noEmit` compiles, `npx vitest run test/unit/lib/analyzer/v2.8-verification.test.ts` passes.

**Commit**: `refactor(tests): remove monolithic-canonical integration tests`

---

## Phase 2+3: Delete Implementation & Remove All TypeScript References

Phase 2 and 3 are one atomic commit since deleting the file without cleaning imports won't compile.

### Files to DELETE

| File | Lines | Purpose |
|------|-------|---------|
| `apps/web/src/lib/analyzer/monolithic-canonical.ts` | 1508 | Pipeline implementation |
| `apps/web/prompts/monolithic-canonical.prompt.md` | 661 | Pipeline LLM prompt |

### Source Files to MODIFY

| # | File | Change |
|---|------|--------|
| 1 | `apps/web/src/lib/pipeline-variant.ts` | Remove `"monolithic_canonical"` from `PipelineVariant` type (line 1) and `VALID` set (line 7) |
| 2 | `apps/web/src/app/api/internal/run-job/route.ts` | Remove import (line 3), remove entire `else if (pipelineVariant === "monolithic_canonical")` branch. Unknown variants already fall back to orchestrated via the else branch |
| 3 | `apps/web/src/lib/config-schemas.ts` | Remove `monolithicCanonicalTimeoutMs` schema field + default. Remove `"monolithic_canonical"` from `defaultPipelineVariant` enum. Remove `"monolithic-canonical"` from VALID_PROFILES and valid pipelines arrays. **Keep** all `canonicalizeContent`/`canonicalizedHash` code |
| 4 | `apps/web/configs/pipeline.default.json` | Remove `"monolithicCanonicalTimeoutMs": 180000` line |
| 5 | `apps/web/src/lib/config-storage.ts` | Remove `"monolithic-canonical"` from VALID_PROFILES (~line 1263) |
| 6 | `apps/web/src/lib/config-loader.ts` | Update JSDoc to remove "monolithic-canonical" from `@param profile` description (~line 386) |
| 7 | `apps/web/src/lib/analyzer/prompt-loader.ts` | Remove `"monolithic-canonical"` from Pipeline type (line 30) and VALID_PIPELINES (line 37) |
| 8 | `apps/web/src/lib/analyzer/metrics.ts` | Remove `'monolithic-canonical'` from pipelineVariant type (line 87) |
| 9 | `apps/web/src/lib/analyzer/metrics-integration.ts` | Remove `'monolithic-canonical'` from pipelineVariant type (line 25) |
| 10 | `apps/web/src/lib/analyzer/monolithic-dynamic.ts` | Update comment (line 5) to remove comparison to canonical pipeline |
| 11 | `apps/web/scripts/migrate-env-to-db.ts` | Remove `"monolithic_canonical"` from type union (line 156) |
| 12 | `apps/web/scripts/reseed-all-prompts.ts` | Remove `"monolithic-canonical"` from profiles array (line 39) |
| 13 | `apps/web/src/app/api/admin/config/[type]/profiles/route.ts` | Remove `"monolithic-canonical"` from returned profiles (line 52) |
| 14 | `apps/web/src/app/api/admin/config/[type]/[profile]/export/route.ts` | Remove `"monolithic-canonical"` from VALID_PROFILES (line 18) |

**Verify**: `npx tsc --noEmit` compiles cleanly.

**Commit**: `refactor(pipeline): remove monolithic-canonical implementation`

---

## Phase 4: Update Remaining Tests

| File | Change |
|------|--------|
| `apps/web/test/unit/lib/config-schemas.test.ts` | Update defaultPipelineVariant test (line 169): remove assertion that `monolithic_canonical` is valid, optionally add assertion it's now invalid. **Keep** canonicalizeContent tests (lines 463-502) |
| `apps/web/test/unit/lib/config-storage.test.ts` | Remove `"monolithic-canonical"` from profiles array fixture (line 567) |
| `apps/web/promptfooconfig.text-analysis.yaml` | Replace 8 occurrences of `"monolithic-canonical"` with `"orchestrated"` (lines 82, 115, 138, 161, 184, 205, 223, 241) *(reviewer addition)* |

**Verify**: `npx vitest run` -- all tests pass.

**Commit**: `test: update tests after monolithic-canonical removal`

---

## Phase 5: Update UI Components

| # | File | Change |
|---|------|--------|
| 1 | `apps/web/src/app/analyze/page.tsx` | Remove canonical pipeline selection card (~lines 183-197). Update grid from 3-col to 2-col |
| 2 | `apps/web/src/app/jobs/page.tsx` | Remove `case "monolithic_canonical"` from getPipelineBadge (lines 130-131). Old jobs fall through to default "Orchestrated" |
| 3 | `apps/web/src/app/jobs/[id]/page.tsx` | Remove canonical conditions from badge colors/labels (lines 508-512). Update comments (line 336) |
| 4 | `apps/web/src/app/admin/page.tsx` | Remove canonical pipeline card (~lines 347-374). Update grid from 3-col to 2-col |
| 5 | `apps/web/src/app/admin/config/page.tsx` | Remove `"monolithic_canonical"` from type (line 206), dropdown option (line 1525), profile arrays (lines 2046, 2079). **Keep** canonicalizedHash (line 68, 3967) |

**Verify**: `npx tsc --noEmit` compiles.

**Commit**: `feat(ui): remove monolithic-canonical pipeline from all UI pages`

---

## Phase 6: Update Backend (C#) Comments

| File | Change |
|------|--------|
| `apps/api/Data/Entities.cs` | Update comment (line 22) to remove `"monolithic_canonical"` from variant list. Keep column as TEXT for backward compat |
| `apps/api/Controllers/AnalyzeController.cs` | Update comment (line 10) to remove `"monolithic_canonical"` |

**Verify**: `dotnet build` from `apps/api`.

**Commit**: `docs(api): update pipeline variant comments after canonical removal`

---

## Phase 7: Update Markdown Documentation

| File | Change |
|------|--------|
| `apps/web/prompts/README.md` | Remove monolithic-canonical.prompt.md listing |
| `AGENTS.md` | Remove monolithic-canonical.ts from file listing table |
| `QUICKSTART.md` | Remove `'monolithic-canonical'` from example comment (line 48) |
| `Docs/ARCHITECTURE/Calculations.md` | Remove monolithic-canonical.ts from file references |
| `Docs/WIP/Vector_DB_Assessment.md` | Remove `monolithic-canonical.ts` from architecture component list (line 14) *(reviewer addition)* |
| `Docs/STATUS/Current_Status.md` | Note canonical removal in current version |
| `Docs/STATUS/HISTORY.md` | Add version entry documenting canonical pipeline removal |
| `Docs/USER_GUIDES/Unified_Config_Management.md` | Update pipeline selection docs |
| `Docs/WIP/Reporting_Improvement_Exchange_done.md` | Update monolithic-canonical references |
| `Docs/RECOMMENDATIONS/UCM_Enhancement_Recommendations.md` | Update if references canonical pipeline |

**Commit**: `docs: remove monolithic-canonical references from markdown docs`

---

## Phase 8: Update XWiki Documentation

| # | File | Action |
|---|------|--------|
| 1 | `Docs/xwiki-pages/.../Diagrams/Monolithic Canonical Pipeline Internal/` | DELETE entire directory |
| 2 | `Docs/xwiki-pages/.../Architecture/Deep Dive/Pipeline Variants/WebHome.xwiki` | Remove canonical column from all comparison tables, update decision tree |
| 3 | `Docs/xwiki-pages/.../Diagrams/Monolithic Dynamic Pipeline Internal/WebHome.xwiki` | Remove canonical column from comparison table |
| 4 | `Docs/xwiki-pages/.../Architecture/AKEL Pipeline/WebHome.xwiki` | Remove canonical variant references |
| 5 | `Docs/xwiki-pages/.../Diagrams/AKEL Architecture/WebHome.xwiki` | Remove canonical from dispatch diagram and table |
| 6 | `Docs/xwiki-pages/.../Diagrams/High-Level Architecture/WebHome.xwiki` | Remove monolithic-canonical.ts reference |
| 7 | `Docs/xwiki-pages/.../User Guides/Admin Interface/WebHome.xwiki` | Remove canonical from config profile list |
| 8 | `Docs/xwiki-pages/.../Reference/Data Models and Schemas/Metrics Schema/WebHome.xwiki` | Remove 'monolithic-canonical' from pipelineVariant type |
| 9 | `Docs/xwiki-pages/.../AI Knowledge Extraction Layer (AKEL)/WebHome.xwiki` | Remove canonical variant references |
| 10 | `Docs/xwiki-pages/.../Architecture/Deep Dive/WebHome.xwiki` | Remove canonical pipeline link from navigation |
| 11 | `Docs/xwiki-pages/.../Architecture/Deep Dive/Calculations and Verdicts/WebHome.xwiki` | Update if canonical pipeline referenced |
| 12 | `Docs/xwiki-pages/.../Architecture/Deep Dive/Source Reliability/Admin and Implementation/WebHome.xwiki` | Update if canonical pipeline referenced |
| 13 | `Docs/xwiki-pages/.../Architecture/Deep Dive/Context Detection/WebHome.xwiki` | Update if canonical pipeline referenced |
| 14 | `Docs/xwiki-pages/.../Specification/Diagrams/WebHome.xwiki` | Remove index references to Canonical diagram (lines 21, 59) *(reviewer addition)* |
| 15 | `Docs/xwiki-pages/.../User Guides/LLM Configuration/WebHome.xwiki` | Update "All three pipelines" text to two pipelines (line 378) *(reviewer addition)* |

**Do NOT modify** `Docs/xwiki-pages-ARCHIVE/` -- historical records stay as-is.

**Commit**: `docs(xwiki): remove monolithic-canonical from wiki documentation`

---

## Files NOT Modified (canonicalize data normalization -- MUST STAY)

These files use "canonical" in the data normalization sense, not the pipeline sense:

- `apps/web/src/lib/analyzer/analysis-contexts.ts` -- canonicalizeContexts, canonicalizeInputForContextDetection
- `apps/web/src/lib/analyzer/orchestrated.ts` -- imports/uses canonicalizeContexts
- `apps/web/src/lib/config-schemas.ts` -- canonicalizeContent function (config hashing)
- `apps/web/src/lib/analyzer/text-analysis-llm.ts` -- canonicalName field
- `apps/web/src/lib/analyzer/text-analysis-types.ts` -- canonicalName field
- `apps/web/src/app/api/admin/config/[type]/drift/route.ts` -- canonicalizeContent
- `apps/web/src/app/api/admin/config/[type]/[profile]/validate/route.ts` -- canonicalizedHash
- `apps/web/src/app/admin/config/page.tsx` -- canonicalizedHash display (lines 68, 3967-3969)
- `apps/web/test/unit/lib/config-schemas.test.ts` -- canonicalizeContent tests (lines 463-502)
- `apps/web/test/unit/app/api/admin/config/config-api.test.ts` -- canonicalizedHash tests
- XWiki docs about canonical_claim, canonical data models, canonical outputs (POC specs, cache design, coding guidelines)

---

## Backward Compatibility

1. **Database records**: Old jobs with `pipelineVariant = "monolithic_canonical"` remain in SQLite. The UI falls back to "Orchestrated" display for unknown variants. The C# column stays TEXT type.
2. **Running jobs**: The `else` branch in run-job/route.ts catches unknown variants and runs orchestrated.
3. **Config DB**: Old prompt config records for `monolithic-canonical` profile remain but are never loaded.
4. **localStorage**: Users with `monolithic_canonical` saved get `isPipelineVariant` → false → fallback to "orchestrated".

---

## Summary

| Category | DELETE | MODIFY | Total |
|----------|--------|--------|-------|
| Implementation files | 2 | 0 | 2 |
| TypeScript source | 0 | 14 | 14 |
| UI components | 0 | 5 | 5 |
| Tests | 1 | 2 | 3 |
| Backend (C#) | 0 | 2 | 2 |
| Config JSON | 0 | 1 | 1 |
| Markdown docs | 0 | ~9 | ~9 |
| XWiki docs | 1 dir | ~12 | ~13 |
| **Total** | **4** | **~45** | **~49** |

---

## Review Comments

### Reviewer: Claude Sonnet 4.5
### Date: 2026-02-10

#### Status: APPROVED WITH CHANGES

#### Findings:

1. **Completeness - Generally Good**: The plan covers the vast majority of files containing canonical pipeline references. Systematic grep searches found 18 files with `monolithic_canonical`, 59 files with `monolithic-canonical`, and 6 files with `runMonolithicCanonical`. All major source files, UI components, tests, and configuration files are accounted for.

2. **Missing File - promptfooconfig.text-analysis.yaml**: This file contains 8 references to `"monolithic-canonical"` as a pipeline parameter in test cases (lines 82, 115, 138, 161, 184, 205, 223, 241). These need to be changed to either `"orchestrated"` or `"monolithic-dynamic"` depending on test intent.

3. **Accuracy Verified - Spot Checks Passed**:
   - `apps/web/src/lib/pipeline-variant.ts`: Lines 1 and 7 confirmed for type and VALID set
   - `apps/web/src/app/api/internal/run-job/route.ts`: Line 3 import confirmed, line 153-173 canonical branch confirmed
   - `apps/web/src/lib/config-schemas.ts`: Lines 297, 326, 368-369, 543 confirmed for monolithicCanonicalTimeoutMs and defaultPipelineVariant
   - `apps/web/configs/pipeline.default.json`: Line 32 confirmed for monolithicCanonicalTimeoutMs
   - `apps/web/src/app/analyze/page.tsx`: Lines 184-197 confirmed for canonical card
   - `apps/web/src/app/admin/page.tsx`: Lines 347-374 confirmed for canonical card
   - `apps/web/src/app/admin/config/page.tsx`: Lines 206, 2046, 2079 confirmed (note: line 1525 dropdown reference not directly verified but consistent with pattern)
   - `apps/web/src/app/jobs/page.tsx`: Lines 130-131 confirmed for canonical badge case
   - `apps/web/src/app/jobs/[id]/page.tsx`: Lines 508-512 confirmed for canonical conditions

4. **Line Number Note**: Line 336 in `apps/web/src/app/jobs/[id]/page.tsx` contains a comment "For dynamic pipeline... for canonical pipelines" which is a general explanation of data structure differences (not a pipeline reference requiring removal). This is acceptable terminology for differentiating pipeline output schemas.

5. **Backward Compatibility - Correctly Handled**: The else branch at line 195-204 in `apps/web/src/app/api/internal/run-job/route.ts` correctly catches unknown variants (including old `monolithic_canonical` from database) and falls back to orchestrated with a warning. This ensures graceful degradation for historical job records.

6. **Canonicalize Preservation - Correct**: All data normalization functions are properly excluded:
   - `canonicalizeContexts`, `canonicalizeInputForContextDetection` in analysis-contexts.ts
   - `canonicalizeContent` in config-schemas.ts
   - `canonicalName` in text-analysis types
   - `canonicalizedHash` in admin config UI
   These must NOT be modified and the plan correctly identifies them as DO-NOT-MODIFY.

7. **Documentation References Found**: Additional documentation files reference the canonical pipeline:
   - `Docs/WIP/Vector_DB_Assessment.md` line 14: mentions `monolithic-canonical.ts` in architecture discussion
   - `Docs/xwiki-pages/FactHarbor/Specification/Diagrams/WebHome.xwiki` lines 21, 59: Index references to Monolithic Canonical diagram
   - `Docs/xwiki-pages/FactHarbor/User Guides/LLM Configuration/WebHome.xwiki` line 378: Example showing "All three pipelines (Orchestrated, Monolithic Canonical, Monolithic Dynamic)"
   - `QUICKSTART.md` line 48: Example code comment mentioning `'monolithic-canonical'`

8. **Risk - Dynamic String Construction**: Searched for runtime string construction patterns that might dynamically reference "canonical". Found only static references already covered in the plan. The comment at line 336 in `apps/web/src/app/jobs/[id]/page.tsx` uses "canonical" descriptively (not as a variant selector), which is acceptable.

9. **Phase Ordering - Sound**: The commit strategy is well-designed:
   - Phase 1: Remove test imports (prevents broken imports when implementation deleted)
   - Phase 2+3: Atomic deletion + cleanup (one compile pass)
   - Phase 4-8: Incremental updates (each phase compiles)
   - Each phase leaves codebase in compilable/testable state

10. **VALID_PROFILES Pattern**: The plan correctly identifies multiple instances of VALID_PROFILES arrays/constants that need `"monolithic-canonical"` removed (config-storage.ts line 1263, reseed-all-prompts.ts line 39, admin routes).

#### Missing Files (if any):

1. **apps/web/promptfooconfig.text-analysis.yaml** - NOT in plan
   - Action: Replace `"monolithic-canonical"` with `"orchestrated"` or `"monolithic-dynamic"` in test case pipeline parameters (8 occurrences on lines 82, 115, 138, 161, 184, 205, 223, 241)
   - Suggested Phase: Phase 4 (tests) or Phase 5 (UI/config)

2. **Docs/WIP/Vector_DB_Assessment.md** - NOT in plan
   - Action: Update line 14 to remove `monolithic-canonical.ts` from architecture component list
   - Suggested Phase: Phase 7 (markdown docs)

3. **Docs/xwiki-pages/FactHarbor/Specification/Diagrams/WebHome.xwiki** - PARTIALLY covered
   - Action: Remove references to "Monolithic Canonical Internal" diagram from index (lines 21, 59)
   - Note: This file IS mentioned in Phase 8 for diagram deletion but specific index cleanup not called out
   - Suggested Phase: Phase 8 (xwiki docs)

4. **Docs/xwiki-pages/FactHarbor/User Guides/LLM Configuration/WebHome.xwiki** - NOT in plan
   - Action: Update line 378 troubleshooting section to remove "Monolithic Canonical" from the "All three pipelines" statement
   - Suggested Phase: Phase 8 (xwiki docs)

5. **QUICKSTART.md** - MENTIONED in plan but no specific line number
   - Action: Update line 48 to remove `'monolithic-canonical'` from example comment
   - Suggested Phase: Phase 7 (markdown docs)

#### Corrections Needed:

1. **Phase 2+3, Item 3**: The plan states "Remove `monolithicCanonicalTimeoutMs` schema field + default" but doesn't specify exact lines. Based on review:
   - Remove line 297-298 (schema definition with .optional())
   - Remove lines 368-369 (default assignment in conditional)
   - Remove line 543 (default value in DEFAULT_PIPELINE_CONFIG)

2. **Phase 5, Item 5**: Plan mentions line 1525 for dropdown option but verification needed. Based on pattern analysis, this is likely correct but recommend double-checking during implementation.

3. **Phase 7**: Add specific line numbers where found:
   - `QUICKSTART.md`: Line 48
   - `Docs/WIP/Vector_DB_Assessment.md`: Line 14 (ADD to plan)

4. **Phase 8**: Clarify that `Docs/xwiki-pages/FactHarbor/Specification/Diagrams/WebHome.xwiki` index references (lines 21, 59) need updating beyond just deleting the diagram directory.

#### Risk Notes:

1. **Low Risk - Well-scoped**: The removal is clean because canonical pipeline was truly isolated (separate implementation file, no shared utilities with orchestrated/dynamic).

2. **Low Risk - Graceful Degradation**: Unknown pipeline variants already fall back to orchestrated, so old database records will continue to work (just displayed as "Orchestrated" in UI).

3. **Low Risk - Test Coverage**: The plan removes canonical-specific tests but preserves all shared unit tests (context detection, aggregation, config validation).

4. **Medium Risk - Documentation Drift**: With 13+ xwiki pages and multiple markdown files to update, there's risk of missed references. Recommend final `grep -r "canonical"` pass after Phase 8 to catch any stragglers (filtering out canonicalize* functions).

5. **Low Risk - Runtime String Construction**: No evidence of dynamic construction patterns like `const variant = "monolithic_" + type` that could reconstruct the canonical variant string at runtime.

6. **No Risk - TypeScript Safety**: Removing from type union ensures any missed references will fail TypeScript compilation (strong static safety net).

#### Approval Notes:

This is a well-researched, thorough removal plan with excellent phase sequencing and backward compatibility handling. The distinction between "canonical pipeline" (being removed) and "canonicalize data normalization" (being preserved) is clearly documented and correctly enforced.

**Recommended additions before execution**:
1. Add `apps/web/promptfooconfig.text-analysis.yaml` to Phase 4 or 5
2. Add `Docs/WIP/Vector_DB_Assessment.md` to Phase 7
3. Add `Docs/xwiki-pages/FactHarbor/User Guides/LLM Configuration/WebHome.xwiki` to Phase 8
4. Clarify `Docs/xwiki-pages/FactHarbor/Specification/Diagrams/WebHome.xwiki` index cleanup in Phase 8
5. Add final verification step: After Phase 8, run `grep -ri "monolithic.canonical\|canonical.*pipeline\|pipeline.*canonical" --exclude-dir=node_modules --exclude-dir=.next` and manually verify all remaining hits are either:
   - Data normalization (canonicalize*)
   - Archive documentation
   - Removal plan itself

**With these additions, the plan is APPROVED for execution.**

The removal will be clean, safe, and complete. The phase structure ensures each commit is independently testable. Backward compatibility is preserved for existing database records. The risk of breaking orchestrated or dynamic pipelines is negligible due to proper isolation.

---

## Post-Implementation Review (Reviewer 2)

**Reviewer**: Claude Sonnet 4.5
**Date**: 2026-02-10
**Scope**: All 7 commits (ce8003b through b14d6d7)

### 1. Leftover Check

**Status**: FAIL - 6 leftover references found in non-ARCHIVE locations

#### Files with leftover "monolithic_canonical" references:

1. **apps/web/test/unit/lib/config-schemas.test.ts** (line 170)
   - Status: ACCEPTABLE - Test correctly verifies that `monolithic_canonical` is now INVALID
   - Code: `expect(PipelineConfigSchema.safeParse({ ...DEFAULT_PIPELINE_CONFIG, defaultPipelineVariant: "monolithic_canonical" }).success).toBe(false);`
   - This is a backward compatibility test ensuring old values are rejected

2. **apps/web/prompts/promptfoo-results/text-analysis.json** (56 occurrences)
   - Status: LOW PRIORITY - Cached test results, will be regenerated on next test run
   - File is a promptfoo evaluation cache containing old test run data with "monolithic-canonical" pipeline parameter
   - Not runtime code, does not affect behavior

#### Files with leftover "Triple-Path" or "three pipelines" references:

3. **README.md** (line 79)
   - Status: MUST FIX
   - Current: `- **[Pipeline Architecture](...) - Triple-path pipeline design (xWiki)`
   - Should be: `Twin-path pipeline design`

4. **Docs/STATUS/Current_Status.md** (lines 184, 187)
   - Status: MUST FIX
   - Line 184: `| **Next.js Web App** | ✅ Operational | Triple-Path Pipeline complete |`
   - Line 187: `| **Triple-Path Pipeline** | ✅ Complete | Orchestrated, Monolithic Canonical, Monolithic Dynamic |`
   - Should change "Triple-Path" to "Twin-Path" and remove "Monolithic Canonical" from variant list

5. **Docs/xwiki-pages/FactHarbor/Specification/Architecture/WebHome.xwiki** (line 104)
   - Status: MUST FIX
   - Current: `Includes: Orchestrated Pipeline internals, Pipeline Variants (TriplePath), Quality Gates Reference...`
   - Should be: `Pipeline Variants (Twin-Path)`

6. **Docs/xwiki-pages/FactHarbor/Specification/Implementation/WebHome.xwiki** (line 12)
   - Status: MUST FIX
   - Current: `| TriplePath Architecture | [[Pipeline Variants>>...]]`
   - Should be: `| Twin-Path Architecture | [[Pipeline Variants>>...]]`

7. **Docs/xwiki-pages/FactHarbor/Specification/Implementation/Pipeline Architecture/_sort** (line 2)
   - Status: MUST FIX
   - Current: `TriplePath Architecture`
   - Should be: `Twin-Path Architecture`

8. **Docs/xwiki-pages/FactHarbor/Specification/Implementation/Implementation Status and Quality/WebHome.xwiki** (line 267)
   - Status: MUST FIX
   - Current: `Triple-path pipeline design`
   - Should be: `Twin-path pipeline design`

9. **Docs/xwiki-pages/FactHarbor/Specification/Architecture/Deep Dive/Schema Migration/WebHome.xwiki** (line 255)
   - Status: ACCEPTABLE - Historical record documenting when feature was introduced
   - Context: `| 2.6.38 | 2026-01 | Triple-path pipeline (no schema change) | No`
   - This is version history, not current feature description

10. **Docs/xwiki-pages/FactHarbor/Specification/Reference/Terminology/WebHome.xwiki** (line 539)
    - Status: MUST FIX
    - Current: `* Pipeline_TriplePath_Architecture.md - Pipeline design`
    - Should be: `* Pipeline_TwinPath_Architecture.md - Pipeline design`

#### Summary of Leftover Check:
- **Critical leftover code references**: 0 (excellent)
- **Test/cache files with references**: 2 (acceptable)
- **Documentation "Triple-Path" leftovers**: 7 MUST FIX
- **Historical records (acceptable)**: 1

### 2. Behavioral Impact Check

**Status**: PASS - No unintended behavioral changes detected

#### Type Definitions:
- **PipelineVariant** (pipeline-variant.ts): Correctly narrowed to `"orchestrated" | "monolithic_dynamic"`
- **VALID set**: Correctly contains only 2 variants
- **Fallback behavior**: Unknown variants correctly fall back to "orchestrated" (line 195-204 in run-job/route.ts)

#### Shared Utilities Analysis:
Verified that the following shared utilities were NOT modified (correct):
- **aggregation.ts**: Claim weighting, verdict aggregation - UNTOUCHED
- **evidence-filter.ts**: Deterministic evidence quality filtering - UNTOUCHED
- **verdict-corrections.ts**: Counter-claim detection - UNTOUCHED
- **source-reliability.ts**: Source scoring - UNTOUCHED
- **analysis-contexts.ts**: Context detection - UNTOUCHED (except removal of one file reference in comments)
- **truth-scale.ts**: Verdict scale mapping - UNTOUCHED

#### Pipeline Implementations:
- **orchestrated.ts**: No changes except removal of canonical comparison comment at line 19 - SAFE
- **monolithic-dynamic.ts**: Comment at line 5 updated to remove comparison to canonical - SAFE
  - Comment at line 9 mentions "flexible output structure (not bound to canonical schema)" - this refers to schema structure, NOT the pipeline variant, which is ACCEPTABLE terminology

#### Config Schema Changes:
- **Removed**: `monolithicCanonicalTimeoutMs` field (lines 297-298, 368-369, 543)
- **Narrowed enum**: `defaultPipelineVariant` now only accepts `"orchestrated"` or `"monolithic_dynamic"` (line 323)
- **Preserved**: All `canonicalize*` functions intact (canonicalizeContent at line 1354, etc.)

#### Route Handler Changes:
- **run-job/route.ts**: Removed import and `monolithic_canonical` branch (lines 153-173 deleted)
- **Fallback logic**: Else branch (lines 195-204) catches unknown variants and runs orchestrated - CORRECT

#### Database Backward Compatibility:
- **C# Entity definition**: Column remains TEXT type (backward compatible)
- **UI display**: Jobs page falls through to default "Orchestrated" badge for unknown variants - GRACEFUL DEGRADATION
- **No data migration**: Old records preserved as-is - SAFE

#### Risk Assessment:
- **Risk to Orchestrated pipeline**: NONE - No logic changes, only removal of separate variant
- **Risk to Dynamic pipeline**: NONE - Only comment updates
- **Risk to shared utilities**: NONE - All preserved exactly
- **Risk of runtime errors**: LOW - TypeScript compilation ensures no broken references

### 3. Documentation Consistency Check

**Status**: FAIL - 7 documentation pages still reference "Triple-Path" or three variants

#### Diagrams:
- **Monolithic Canonical Pipeline Internal**: Directory successfully DELETED
- **AKEL Architecture diagram**: Canonical pipeline REMOVED from dispatch diagram (verified in commit 9691198)
- **High-Level Architecture**: Reference to monolithic-canonical.ts REMOVED
- **Pipeline Variants page**: Comparison tables updated to 2 columns (verified no canonical references)

#### Mermaid Diagrams:
- All diagram nodes and edges for CANON pipeline REMOVED (verified in commit 9691198)

#### Text References:
- "Triple-Path" → "Twin-Path": INCOMPLETE (7 leftover references listed in section 1)
- "three variants/pipelines" → "two": MOSTLY COMPLETE (Current_Status.md line 187 still lists 3)
- "all three pipelines" → "both pipelines": COMPLETE (no matches found except false positives about frameworks/viewers)

### 4. Risky Changes Check

**Status**: PASS - No risky changes detected

#### Code Deletion Analysis:
- **monolithic-canonical.ts** (1508 lines): Completely isolated implementation, no shared code with other pipelines - SAFE
- **monolithic-canonical.prompt.md** (661 lines): Pipeline-specific prompt, no dependencies - SAFE

#### Import/Reference Integrity:
- All imports of `runMonolithicCanonical` removed before file deletion (Phase 1) - SAFE
- TypeScript compilation succeeds (verified in plan verification steps) - PASS
- No broken imports found in codebase - PASS

#### Config Changes Risk:
- **pipeline.default.json**: Removed `monolithicCanonicalTimeoutMs` - SAFE (only affected canonical)
- **Config schemas**: Enum narrowing causes old invalid values to fail validation - CORRECT BEHAVIOR
- **localStorage fallback**: `isPipelineVariant()` returns false for old "monolithic_canonical" value, falls back to "orchestrated" - GRACEFUL

#### Test Coverage Impact:
- **Removed tests**: multi-jurisdiction.test.ts (canonical-only), v2.8-verification integration tests (canonical)
- **Preserved tests**: All shared unit tests (context detection, aggregation, config validation, canonicalization)
- **Updated tests**: config-schemas.test.ts now correctly tests that canonical is INVALID
- **Test coverage reduction**: Minimal - only removed pipeline-specific tests, all shared logic still covered

#### UI Changes Risk:
- **3-column → 2-column grids**: Layout change only, no logic impact - SAFE
- **Pipeline selector cards**: Canonical card removed from analyze page and admin page - CORRECT
- **Badge rendering**: Falls through to default for unknown variants - GRACEFUL

### 5. Canonicalize Preservation Check

**Status**: PASS - All data normalization functions correctly preserved

#### Verified Preservation:

1. **canonicalizeContexts()** - apps/web/src/lib/analyzer/analysis-contexts.ts (line 459)
   - Function signature intact
   - Used by orchestrated.ts (line 19 comment references it)
   - PURPOSE: Normalize context detection for consistent behavior
   - STATUS: PRESERVED

2. **canonicalizeInputForContextDetection()** - analysis-contexts.ts (line 294)
   - Function intact
   - PURPOSE: Input normalization before context detection
   - STATUS: PRESERVED

3. **canonicalizeContent()** - apps/web/src/lib/config-schemas.ts (line 1354)
   - Function intact
   - Used for config hashing and drift detection
   - Test coverage maintained (config-schemas.test.ts lines 463-502)
   - PURPOSE: Consistent config content canonicalization for hash comparison
   - STATUS: PRESERVED

4. **canonicalizedHash** - Referenced in admin config UI (page.tsx lines 68, 3967)
   - Display field for config content hash
   - Used by config API routes for drift detection
   - PURPOSE: Config version tracking and change detection
   - STATUS: PRESERVED

5. **canonicalName** - text-analysis-types.ts
   - Field in text analysis types
   - PURPOSE: Canonical entity name normalization
   - STATUS: PRESERVED

6. **Test coverage** - config-schemas.test.ts (lines 463-504)
   - Tests for canonicalizeContent and computeContentHash
   - All tests still present and passing
   - STATUS: PRESERVED

#### Distinction Clarity:
The plan document correctly distinguishes between:
- **"monolithic_canonical"** (pipeline variant) - REMOVED
- **"canonicalize*"** (data normalization functions) - PRESERVED

This distinction was maintained throughout implementation with NO CONFUSION.

### Summary

**Overall Status**: CONDITIONAL PASS with 8 required fixes

#### What Went Well:
1. **Code removal**: Clean and complete - all 2,281 lines removed, no broken imports
2. **Type safety**: PipelineVariant union correctly narrowed, TypeScript compilation passes
3. **Backward compatibility**: Graceful degradation for old database records and localStorage values
4. **Shared utilities**: Zero impact on aggregation, evidence-filter, source-reliability, verdict-corrections
5. **Canonicalize preservation**: Perfect - all data normalization functions untouched
6. **Commit structure**: Excellent phasing - each commit independently compilable and testable
7. **Test coverage**: Removed only pipeline-specific tests, preserved all shared logic tests

#### Issues Found:

**MUST FIX** (8 documentation updates required):
1. README.md line 79: "Triple-path" → "Twin-path"
2. Docs/STATUS/Current_Status.md lines 184, 187: "Triple-Path" → "Twin-Path", remove "Monolithic Canonical"
3. Docs/xwiki-pages/FactHarbor/Specification/Architecture/WebHome.xwiki line 104: "TriplePath" → "Twin-Path"
4. Docs/xwiki-pages/FactHarbor/Specification/Implementation/WebHome.xwiki line 12: "TriplePath" → "Twin-Path"
5. Docs/xwiki-pages/FactHarbor/Specification/Implementation/Pipeline Architecture/_sort line 2: "TriplePath" → "Twin-Path"
6. Docs/xwiki-pages/FactHarbor/Specification/Implementation/Implementation Status and Quality/WebHome.xwiki line 267: "Triple-path" → "Twin-path"
7. Docs/xwiki-pages/FactHarbor/Specification/Reference/Terminology/WebHome.xwiki line 539: "Pipeline_TriplePath_Architecture.md" → "Pipeline_TwinPath_Architecture.md"

**LOW PRIORITY** (can be deferred):
- apps/web/prompts/promptfoo-results/text-analysis.json - cached test results with 56 "monolithic-canonical" references (will regenerate)

#### Risk Assessment:
- **Runtime impact**: ZERO - All code references successfully removed
- **Orchestrated pipeline**: SAFE - No behavioral changes
- **Dynamic pipeline**: SAFE - No behavioral changes
- **Backward compatibility**: MAINTAINED - Graceful degradation for old records
- **Documentation debt**: MODERATE - 8 leftover "Triple-Path" references create inconsistency

#### Recommendations:

1. **Immediate action**: Fix the 8 "Triple-Path" → "Twin-Path" documentation references listed above
2. **Before next release**: Clear promptfoo cache with `rm apps/web/prompts/promptfoo-results/*.json` or re-run evals
3. **Final verification**: After fixing docs, run: `grep -ri "triple.*path\|three.*variant\|three.*pipeline\|monolithic.canonical" --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git --exclude-dir=Docs/ARCHIVE --exclude-dir=promptfoo-results`
4. **Version notes**: Document in next version entry of HISTORY.md that canonical pipeline was removed in v2.10.x

#### Approval:

**APPROVED WITH CONDITIONS** - The code implementation is complete and safe. The 8 documentation references to "Triple-Path" must be fixed to achieve full consistency. Once fixed, the removal will be 100% complete.

The removal was executed with excellent care:
- No behavioral regressions
- Perfect preservation of canonicalize functions
- Graceful backward compatibility
- Clean type narrowing
- No impact on other pipelines

**Confidence Level**: HIGH - The implementation matches the plan exactly, with only cosmetic documentation inconsistencies remaining.
