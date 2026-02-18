# ClaimBoundary Implementation Plan — Codex Re-Review Fixes (2026-02-17)

**Summary:** All 7 blocking issues (B-01 through B-07) and 2 suggestions (S-01, S-02) from Codex GPT 5.2 re-review have been addressed.

**Status:** COMPLETE — Build PASS, all prompts added, all inconsistencies resolved.

---

## Blocking Issues Resolved

### B-01: Missing UCM Prompt Sections ✅

**Issue:** Architecture expects `CLAIM_VALIDATION`, `GENERATE_QUERIES`, `RELEVANCE_CLASSIFICATION`, `EXTRACT_EVIDENCE` prompt keys, but `claimboundary.prompt.md` only had extraction/clustering/verdict/narrative/grouping.

**Fix:**
- Added 4 new UCM prompt sections to `apps/web/prompts/claimboundary.prompt.md`:
  1. **CLAIM_VALIDATION** (181 lines) — Gate 1 LLM-driven claim validation (opinion + specificity checks)
  2. **GENERATE_QUERIES** (42 lines) — Search query generation with rationale
  3. **RELEVANCE_CLASSIFICATION** (38 lines) — Batched relevance scoring for search results
  4. **EXTRACT_EVIDENCE** (68 lines) — Evidence extraction with full schema including derivative fields
- Updated `requiredSections` list in prompt header
- All prompts follow String Usage Boundary (no hardcoded entity names/keywords)
- **Prompt reseeded:** Build postbuild hook updated UCM database (1 changed prompt)

**Files modified:**
- `apps/web/prompts/claimboundary.prompt.md` (+329 lines total)

---

### B-02: Derivative Weighting References `derivativeSource` ✅

**Issue:** Plan/prompts still referenced non-existent `derivativeSource` field instead of correct fields from §8.5.3.

**Fix:**
- Removed all `derivativeSource` references
- Updated to use correct architecture §8.5.3 formula:
  ```typescript
  const derivativeCount = claim.supportingEvidence.filter(e =>
    e.isDerivative === true && e.derivativeClaimUnverified !== true
  ).length;
  const derivativeRatio = derivativeCount / claim.supportingEvidence.length;
  const derivativeFactor = 1.0 - (derivativeRatio × (1.0 - derivativeMultiplier));
  ```
- Uses `isDerivative`, `derivedFromSourceUrl`, `derivativeClaimUnverified` fields (already in extraction schema)

**Files modified:**
- `Docs/WIP/CB_Implementation_Plan_2026-02-17.md` (Phase 5e derivative section)
- `Docs/WIP/CB_Implementation_Prompts.md` (Phase 5e step 2)

---

### B-03: Aggregation Weight Chain + Spread Handling Drift ✅

**Issue:** Plan suggested re-applying self-consistency spread multipliers in Stage 5, but `verdict-stage.ts` already applies them to per-claim confidence.

**Fix:**
- Added explicit note in Phase 5e: "`verdict-stage.ts` already applied self-consistency spread multipliers to per-claim confidence — do NOT re-apply in Stage 5"
- Clarified that spread multipliers only affect per-claim confidence, not overall confidence calibration
- Updated test description: "verify spread multipliers NOT re-applied"

**Files modified:**
- `Docs/WIP/CB_Implementation_Plan_2026-02-17.md` (Phase 5e confidence aggregation)

---

### B-04: VerdictNarrative Schema Mismatch in Plan ✅

**Issue:** Implementation plan Phase 5e referenced old VerdictNarrative schema `{summary, keyEvidence[], limitations[], methodology}` instead of correct `types.ts` schema.

**Fix:**
- Updated Phase 5e VerdictNarrative output to: `{headline, evidenceBaseSummary, keyFinding, boundaryDisagreements[], limitations}`
- Matches `types.ts` line 862-868
- Prompts already fixed in previous review (B-01 Opus fix)

**Files modified:**
- `Docs/WIP/CB_Implementation_Plan_2026-02-17.md` (Phase 5e VerdictNarrative generation)

---

### B-05: `mixedConfidenceThreshold` Inconsistent Defaults ✅

**Issue:** Architecture/verdict-stage.ts use 40, but `config-schemas.ts` and `calculation.default.json` used 60.

**Fix:**
- Changed `config-schemas.ts` default from `60` to `40`
- Changed `calculation.default.json` default from `60` to `40`
- Aligned with architecture §8.4 and `verdict-stage.ts` implementation

**Files modified:**
- `apps/web/src/lib/config-schemas.ts` (line 1066)
- `apps/web/configs/calculation.default.json` (line 54)

**Build impact:** Config cache invalidated, new default value 40 reseeded

---

### B-06: `selfConsistencySpreadThresholds` Shape Drift ✅

**Issue:** Architecture §13.1 documented as `int[]` with value `[5, 12, 20]`, but implemented schema uses `{stable, moderate, unstable}` object.

**Fix:**
- Updated architecture doc to match implemented schema:
  - Changed: `| selfConsistencySpreadThresholds | [5, 12, 20] | int[] | ...`
  - To: `| selfConsistencySpreadThresholds | {stable: 5, moderate: 12, unstable: 20} | object | ...`
- Matches `config-schemas.ts` and `calculation.default.json` structure

**Files modified:**
- `Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md` (§13.1 line 1885)

---

### B-07: Budget Parameter Naming Drift ✅

**Issue:** Architecture §8.2 used both `evidenceSufficiencyThreshold` and `claimSufficiencyThreshold` for the same parameter.

**Fix:**
- Standardized on `claimSufficiencyThreshold` throughout
- Changed architecture §8.2 table:
  - `evidenceSufficiencyThreshold` → `claimSufficiencyThreshold`
- Matches UCM param name and implementation plan usage

**Files modified:**
- `Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md` (§8.2 line 789)

---

## Suggestions Implemented

### S-01: Clarify Stage 2 Query Generation Must Use LLM ✅

**Suggestion:** Explicitly state that query generation/contradiction targeting must be LLM-driven (no hardcoded templates) to comply with String Usage Boundary.

**Implementation:**
- Updated Phase 5b main loop: "**Generate queries via LLM** (UCM `GENERATE_QUERIES` prompt) — no hardcoded query templates"
- Updated contradiction search: "**Generate contradiction queries via LLM** (UCM `GENERATE_QUERIES` with `iterationType: "contradiction"`) — no hardcoded phrases"
- Removed any suggestion of hardcoded "counterevidence/critique" string templates

**Files modified:**
- `Docs/WIP/CB_Implementation_Plan_2026-02-17.md` (Phase 5b checklist)

---

### S-02: Add Stage 2 LLM Calls → UCM Prompt Mapping Table ✅

**Suggestion:** Add explicit mapping table to prevent accidental inline prompt hardcoding.

**Implementation:**
- Added 3-row mapping table to Phase 5b Dependencies section:

| Step | UCM Prompt Key | Model Tier | Input | Output |
|------|---------------|-----------|-------|--------|
| Query generation | `GENERATE_QUERIES` | Haiku | claim + expectedEvidenceProfile + iterationType | `{queries[]: {query, rationale}}` |
| Relevance check | `RELEVANCE_CLASSIFICATION` | Haiku | claim + searchResults[] | `{relevantSources[]: {url, relevanceScore, reasoning}}` |
| Evidence extraction | `EXTRACT_EVIDENCE` | Haiku | claim + sourceContent + sourceUrl | `{evidenceItems[]: {...full schema}}` |

- Makes UCM prompt profile usage explicit and unambiguous

**Files modified:**
- `Docs/WIP/CB_Implementation_Plan_2026-02-17.md` (Phase 5b Dependencies)

---

## Summary of Changes

**Total commits:** 2
1. `c101bb6` — B-01 through B-05 (prompts + config fixes)
2. `92afe2b` — B-06, B-07, S-01, S-02 (architecture doc + clarifications)

**Total files modified:** 7
- `apps/web/prompts/claimboundary.prompt.md` (+329 lines, 4 new prompt sections)
- `apps/web/src/lib/config-schemas.ts` (mixedConfidenceThreshold: 60 → 40)
- `apps/web/configs/calculation.default.json` (mixedConfidenceThreshold: 60 → 40)
- `Docs/WIP/CB_Implementation_Plan_2026-02-17.md` (derivative formula, VerdictNarrative schema, LLM/UCM mapping, query generation clarifications)
- `Docs/WIP/CB_Implementation_Prompts.md` (derivative formula)
- `Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md` (selfConsistencySpreadThresholds shape, claimSufficiencyThreshold naming)
- `Docs/WIP/CB_Codex_Review_Fixes_2026-02-17.md` (NEW - this document)

**Build status:** ✅ PASS (`npm run build` completed successfully)
**Prompt reseeding:** ✅ 1 changed prompt (claimboundary), 6 unchanged, 0 errors
**Config changes:** ✅ 1 changed config (calculation), 3 unchanged, 0 errors

---

## Verification

**All 7 blocking issues resolved:**
- ✅ B-01: 4 UCM prompt sections added and reseeded
- ✅ B-02: Derivative formula uses correct fields (isDerivative, derivedFromSourceUrl, derivativeClaimUnverified)
- ✅ B-03: Spread multipliers NOT re-applied in Stage 5 (explicit note added)
- ✅ B-04: VerdictNarrative schema matches types.ts (headline, evidenceBaseSummary, keyFinding)
- ✅ B-05: mixedConfidenceThreshold = 40 everywhere (config-schemas.ts + calculation.default.json)
- ✅ B-06: selfConsistencySpreadThresholds = object {stable, moderate, unstable} in architecture
- ✅ B-07: claimSufficiencyThreshold standardized (no evidenceSufficiencyThreshold)

**Both suggestions implemented:**
- ✅ S-01: Query generation explicitly LLM-driven (no hardcoded templates)
- ✅ S-02: Stage 2 LLM → UCM mapping table added

**Ready for:** Phase 5a implementation can begin.

**Recommendation from Codex re-review:** "Proceed with fixes" — All conditions met.

---

**Document Version:** 1.0
**Created:** 2026-02-17
**Author:** Lead Architect (Claude Sonnet 4.5)
**Status:** All issues resolved, plan production-ready
