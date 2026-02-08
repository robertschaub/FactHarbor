# Documentation & Diagram Audit Report

**Author:** Claude (Principal Architect)
**Date:** 2026-02-08
**Scope:** All .xwiki files containing diagrams and entity definitions
**Method:** Cross-referenced against actual codebase (TypeScript types, .NET entities, config schemas, database files)

---

## Executive Summary

Audited **26 diagrams** and **6 data model definitions** across the xwiki documentation. Found **11 issues requiring correction**, **4 future-compatibility risks**, and **11 items that are accurate**.

| Category | Count | Severity |
|----------|-------|----------|
| Accurate (no action needed) | 11 | - |
| Inaccurate (needs correction) | 7 | MEDIUM |
| Incomplete (missing information) | 4 | LOW-MEDIUM |
| Future compatibility risk | 4 | HIGH |

---

## SECTION 1: Current Implementation Diagrams

### 1.1 Core Data Model ERD
**File:** `Specification/Diagrams/Core Data Model ERD/WebHome.xwiki`
**Status:** NEEDS CORRECTION

| ERD Entity | Field | Issue | Actual Code |
|-----------|-------|-------|-------------|
| CLAIM_VERDICT | `opposingEvidenceIds` | **DOES NOT EXIST** in code | Not in `ClaimVerdict` type (`types.ts`) |
| EVIDENCE_ITEM | (missing fields) | **INCOMPLETE** - missing 7 fields added since v2.8 | Missing: `sourceAuthority`, `probativeValue`, `evidenceBasis`, `extractionConfidence`, `evidenceScope`, `fromOppositeClaimSearch`, `isContestedClaim` |
| SOURCE | `reliabilityScore`, `bias` | **WRONG NAMES** | Actual: `trackRecordScore`, `trackRecordConfidence`, `trackRecordConsensus` (`FetchedSource` type) |
| ANALYSIS_CONTEXT | `description`, `methodology`, `temporalPeriod` | **WRONG FIELDS** | Actual: `subject`, `temporal`, `status`, `outcome`, `assessedStatement`, `metadata` (nested: institution, jurisdiction, court, etc.) |
| CLAIM | (ok) | Correct | Matches `subClaims` in `ClaimUnderstanding` |

**Fix Required:**
- Remove `opposingEvidenceIds` from CLAIM_VERDICT
- Add `sourceAuthority`, `probativeValue`, `evidenceBasis` to EVIDENCE_ITEM
- Rename SOURCE fields to match `FetchedSource`
- Update ANALYSIS_CONTEXT fields to match actual type

---

### 1.2 AKEL Architecture (Triple-Path Pipeline)
**File:** `Specification/Diagrams/AKEL Architecture/WebHome.xwiki`
**Status:** NEEDS UPDATE

| Item | Diagram | Actual | Issue |
|------|---------|--------|-------|
| orchestrated.ts | ~12,000 lines | **13,337 lines** | 11% understated |
| monolithic-canonical.ts | ~1,100 lines | **1,491 lines** | 35% understated |
| monolithic-dynamic.ts | ~550 lines | **735 lines** | 34% understated |
| Shared modules shown | 3 (analysis-contexts, aggregation, claim-decomposition) | **13+ modules** | Missing: evidence-filter.ts, quality-gates.ts, truth-scale.ts, verdict-corrections.ts, source-reliability.ts, provenance-validation.ts, normalization-heuristics.ts, budgets.ts, ab-testing.ts, metrics.ts |

**Fix Required:**
- Update line counts
- Add key shared modules (at minimum: evidence-filter.ts, quality-gates.ts, source-reliability.ts, verdict-corrections.ts)

---

### 1.3 Orchestrated Pipeline Internal Flow
**File:** `Specification/Diagrams/Orchestrated Pipeline Internal/WebHome.xwiki`
**Status:** ACCURATE (config values match)

| Parameter | Diagram | Actual | Status |
|-----------|---------|--------|--------|
| maxIterationsPerContext | 5 | 5 | ✅ |
| maxTotalIterations | 20 | 20 | ✅ |
| maxTotalTokens | 750,000 | 750,000 | ✅ |

**BUT** diagram is missing the new adaptive fallback step (added 2026-02-07):
- `searchAdaptiveFallbackMinCandidates: 5`
- `searchAdaptiveFallbackMaxQueries: 2`

---

### 1.4 Storage Architecture
**File:** `Specification/Diagrams/Storage Architecture/WebHome.xwiki`
**Status:** ACCURATE

| Database | Diagram | Actual | Status |
|----------|---------|--------|--------|
| factharbor.db | via .NET API | `apps/api/factharbor.db` | ✅ |
| config.db | via Next.js | `apps/web/config.db` | ✅ |
| source-reliability.db | via Next.js | `apps/web/source-reliability.db` | ✅ |

---

### 1.5 Audit Trail ERD
**File:** `Specification/Diagrams/Audit Trail ERD/WebHome.xwiki`
**Status:** ACCURATE

| Entity | Diagram | Actual (.NET Entity) | Status |
|--------|---------|---------------------|--------|
| JOBS | JobId, Status, CreatedAt, UpdatedAt, ResultJson, ReportMarkdown | JobEntity matches | ✅ |
| JOB_EVENTS | Id, JobId, TsUtc, Level, Message | JobEventEntity matches | ✅ |
| CONFIG_BLOBS | hash, config_type, content, changed_by, change_reason, created_at | config.db tables | ✅ |

---

### 1.6 LLM Abstraction Architecture
**File:** `Specification/Diagrams/LLM Abstraction Architecture/WebHome.xwiki`
**Status:** ACCURATE

All 4 providers verified in `llm.ts`:
- ✅ Anthropic (Claude) - imports `@ai-sdk/anthropic`
- ✅ OpenAI (GPT-4o) - imports `@ai-sdk/openai`
- ✅ Google (Gemini) - imports `@ai-sdk/google`
- ✅ Mistral - imports `@ai-sdk/mistral`

**Minor note:** Default models have been updated:
- Understand: `claude-haiku-4-5-20251001` (was not specified in diagram)
- Verdict: `claude-sonnet-4-5-20250929` (was not specified)

---

### 1.7 High-Level Architecture
**File:** `Specification/Diagrams/High-Level Architecture/WebHome.xwiki`
**Status:** ACCURATE
- ✅ Two-service architecture confirmed: Next.js (`apps/web/`) + .NET API (`apps/api/`)

---

### 1.8 Quality Gates Flow
**File:** `Specification/Diagrams/Quality and Audit Workflow/WebHome.xwiki`
**Status:** ACCURATE

Gate 1 and Gate 4 thresholds match `config-schemas.ts`:
- ✅ Gate 1: opinion threshold 0.7, specificity 0.3
- ✅ Gate 4: HIGH (3+ sources, 0.7 quality, 80% agreement), MEDIUM (2+ sources), LOW, INSUFFICIENT

---

### 1.9 Evidence and Verdict Data Model
**File:** `Specification/Diagrams/Evidence and Verdict Workflow/WebHome.xwiki`
**Status:** ACCURATE (simplified view - relationships correct)
- ✅ 7-point verdict scale correct
- ✅ Contestation status handling correct

---

### 1.10 Monolithic Pipeline Diagrams
**Files:** `Monolithic Canonical Pipeline Internal/`, `Monolithic Dynamic Pipeline Internal/`
**Status:** ACCURATE

| Pipeline | Parameter | Diagram | Actual | Status |
|----------|-----------|---------|--------|--------|
| Canonical | maxIterations | 5 | 5 | ✅ |
| Canonical | maxSearches | 8 | 8 | ✅ |
| Canonical | timeoutMs | 180000 | 180000 | ✅ |
| Dynamic | maxIterations | 4 | 4 | ✅ |
| Dynamic | maxSearches | 6 | 6 | ✅ |

---

## SECTION 2: Future/Target Documentation Issues

### 2.1 Target Data Model (Data Model/WebHome.xwiki) - COMPATIBILITY RISKS

**File:** `Specification/Data Model/WebHome.xwiki`

This is the most problematic document. While clearly labeled as "target" with a warning box, it contains **multiple conflicts** with the current implementation that could cause confusion or incorrect migration planning.

#### RISK 1: "Scenario" vs "AnalysisContext" Terminology Conflict

| Target Model | Current Implementation | Conflict |
|-------------|----------------------|----------|
| **Scenario**: interpretation/context for evaluating claims | **AnalysisContext**: bounded analytical frame | Different name, overlapping concept |
| Scenario fields: `id, claim_id, description, assumptions, extracted_from` | AnalysisContext fields: `id, name, subject, temporal, status, outcome, metadata` | Completely different field structure |
| Scenario belongs to single Claim (1:N) | AnalysisContext belongs to Article/Understanding (1:N), Claims link via `contextId` | Different relationship direction |

**Risk:** A developer reading the target model would design migration toward "Scenarios" when the system has already evolved to "AnalysisContexts" with a fundamentally different structure. The migration would need to map AnalysisContext → Scenario which loses metadata (institution, jurisdiction, court, methodology).

**Recommendation:** Update target model to use AnalysisContext as the normalized entity, not Scenario.

---

#### RISK 2: Verdict Format Incompatibility

| Target Model | Current Implementation | Conflict |
|-------------|----------------------|----------|
| `likelihood_range`: text like "0.40-0.65 (uncertain)" | `truthPercentage`: integer 0-100 | Format mismatch |
| `uncertainty_factors`: text array | `isContested`, `contestedBy`, `factualBasis` | Different uncertainty model |
| Verdict belongs to Scenario | ClaimVerdict linked to Claim via `claimId` | Different entity relationship |

**Risk:** Migration would need to convert between formats. The 7-point truth scale is now deeply embedded in the system. The target model's range-based approach would require significant refactoring.

**Recommendation:** Update target model to use 7-point scale (0-100 truthPercentage + confidence) instead of likelihood_range.

---

#### RISK 3: Source Scoring Model Conflict

| Target Model | Current Implementation | Conflict |
|-------------|----------------------|----------|
| Background batch job "Sunday 2 AM" | On-demand LLM evaluation with TTL cache (90 days) | Completely different architecture |
| Formula: accuracy_rate 50% + correction_policy 20% + ... | Multi-model LLM consensus (Claude + GPT) evaluation | Different scoring method |
| `accuracy_history` (JSON), `correction_frequency` (float) | `trackRecordScore`, `trackRecordConfidence`, `trackRecordConsensus` | Different fields |
| Source types: NewsOutlet, AcademicJournal, GovernmentAgency | No explicit source type enum - LLM evaluates | Different classification |

**Risk:** The target model describes a fundamentally different source scoring architecture. Building toward the target model would discard the working LLM-based system.

**Recommendation:** Update target model to reflect LLM + Cache architecture (v2.2) as described in Source Reliability System docs.

---

#### RISK 4: Storage Stack Assumptions

| Target Model | Current Implementation | Status |
|-------------|----------------------|--------|
| PostgreSQL (primary) | SQLite (3 databases) | Not migrated |
| Redis (cache) | No cache layer | Not implemented |
| Elasticsearch (search) | No search index | Not implemented |
| S3 (archive) | No archive | Not implemented |

**Risk:** Low. The target model clearly labels these as future. But cost projections ($75/month for 1M claims) assume PostgreSQL + Redis which may not be needed if SQLite scales sufficiently.

**Recommendation:** Add a note that SQLite may be sufficient through Alpha/Beta, with PostgreSQL migration deferred based on actual scale needs.

---

### 2.2 Evidence & Source Missing Fields in ERD

The Core Data Model ERD is labeled v2.10.2 but was not updated when these fields were added:

| Field | Added In | Purpose | ERD Missing? |
|-------|----------|---------|-------------|
| `sourceAuthority` | v2.6 | primary/secondary/opinion/contested | YES |
| `probativeValue` | v2.8 | high/medium/low | YES |
| `evidenceBasis` | v2.8 | scientific/documented/anecdotal/etc | YES |
| `extractionConfidence` | v2.8 | 0-100 confidence score | YES |
| `evidenceScope` | v2.6 | methodology metadata object | YES |
| `assessedStatement` | v2.6.39 | per-context assessed statement | YES (on AnalysisContext) |
| `searchAdaptiveFallbackMinCandidates` | v2.9 | UCM config field | YES (on pipeline config) |
| `searchAdaptiveFallbackMaxQueries` | v2.9 | UCM config field | YES (on pipeline config) |

---

### 2.3 User/Role Diagrams (Future - No Compatibility Risk)

**Files:** `User Class Diagram/`, `Human User Roles/`, `Technical and System Users/`
**Status:** ACCURATELY LABELED AS FUTURE

These correctly note that only Reader (guest) role is implemented. No compatibility risk - the planned role structure (Reader → RegisteredUser → UCMAdministrator/Moderator) doesn't conflict with any current code.

---

### 2.4 Federation Architecture (Future - No Compatibility Risk)

**File:** `Federation Architecture/WebHome.xwiki`
**Status:** ACCURATELY LABELED AS FUTURE (V1.0+)

No compatibility risk. The federation design is sufficiently abstract that it doesn't conflict with current implementation.

---

### 2.5 Automation Level / Roadmap (Accurate)

**Files:** `Automation Level/`, `Automation Roadmap/`
**Status:** ACCURATE
- ✅ Correctly places current system at Level 0 (POC/Demo)
- ✅ Future levels properly defined

---

## SECTION 3: Summary of Required Actions

### HIGH Priority (Correctness Issues)

| # | File | Issue | Fix |
|---|------|-------|-----|
| 1 | Core Data Model ERD | `opposingEvidenceIds` doesn't exist | Remove from CLAIM_VERDICT |
| 2 | Core Data Model ERD | EVIDENCE_ITEM missing 7 fields (v2.8+) | Add `sourceAuthority`, `probativeValue`, `evidenceBasis` at minimum |
| 3 | Core Data Model ERD | SOURCE fields wrong | Rename to `trackRecordScore`, `trackRecordConfidence`, `trackRecordConsensus` |
| 4 | Core Data Model ERD | ANALYSIS_CONTEXT fields wrong | Update to `subject`, `temporal`, `status`, `outcome`, `assessedStatement`, `metadata` |
| 5 | Target Data Model | "Scenario" conflicts with AnalysisContext | Update to use AnalysisContext terminology and field structure |
| 6 | Target Data Model | Source scoring describes batch job, not LLM+Cache | Update to reflect v2.2 LLM + Cache architecture |
| 7 | Target Data Model | Verdict uses `likelihood_range` text, not 7-point scale | Update to use `truthPercentage` (0-100) + `confidence` |

### MEDIUM Priority (Incomplete Information)

| # | File | Issue | Fix |
|---|------|-------|-----|
| 8 | AKEL Architecture | Line counts understated by 11-35% | Update to actual counts |
| 9 | AKEL Architecture | Only 3 of 13+ shared modules shown | Add key modules (evidence-filter, quality-gates, source-reliability, verdict-corrections) |
| 10 | Orchestrated Pipeline | Missing adaptive fallback step | Add adaptive fallback to research loop diagram |
| 11 | LLM Abstraction | Default model names not specified | Add current defaults (claude-haiku-4-5, claude-sonnet-4-5) |

### ACCURATE (No Action Needed)

| # | File | Status |
|---|------|--------|
| - | Storage Architecture | ✅ 3 databases verified |
| - | Audit Trail ERD | ✅ All entities match |
| - | High-Level Architecture | ✅ Two-service confirmed |
| - | Quality Gates Flow | ✅ Thresholds match |
| - | Evidence & Verdict Workflow | ✅ Relationships correct |
| - | Monolithic Pipeline diagrams | ✅ Config values match |
| - | UCM Versioning Architecture | ✅ Design matches config.db |
| - | Pipeline budget defaults | ✅ All 3 values correct |
| - | LLM providers | ✅ All 4 supported |
| - | User/Role diagrams | ✅ Correctly labeled future |
| - | Federation Architecture | ✅ Correctly labeled future |

---

## SECTION 4: Future Compatibility Assessment

### Will the target model create compatibility issues?

**YES - 3 structural conflicts must be resolved before any migration:**

1. **Scenario → AnalysisContext**: The target model must adopt AnalysisContext as the primary analytical frame entity. The "Scenario" concept can be retired or redefined as a sub-concept.

2. **likelihood_range → truthPercentage**: The target model must adopt the 7-point truth scale (0-100%) with separate confidence field. The text-based likelihood_range format is incompatible.

3. **Batch source scoring → LLM + Cache**: The target model must reflect the current on-demand LLM evaluation architecture instead of the weekly batch job design.

**If these 3 items are updated, the target model becomes a valid migration target** with the following mapping:
- AnalysisContext → normalized table (straightforward)
- ClaimVerdict → Verdict table with truthPercentage + confidence
- FetchedSource → Source table with LLM-based scoring columns
- UCM Config → already matches (config_blobs + config_active + config_usage)

---

## SECTION 5: xWiki Variants That Add Value

After investigating each mismatch, several xWiki design choices are **better than the current code** or **add value worth adopting**.

### 5.1 `opposingEvidenceIds` on CLAIM_VERDICT - ADDS VALUE

**xWiki proposes:** Separate `opposingEvidenceIds` array alongside `supportingEvidenceIds`

**Current code problem:** `supportingEvidenceIds` is misnamed - it actually holds ALL linked evidence IDs (both supporting and contradicting). To find counter-evidence, code must filter by `claimDirection === "contradicts"` inside the array, which is confusing and required the `countBySourceDeduped()` workaround we just built.

**Value assessment:**
- The UI already separately displays "Supporting Evidence" and "Counter-Evidence" sections ([page.tsx:914](apps/web/src/app/jobs/[id]/page.tsx#L914))
- The verdict direction validator already filters `supportingEvidenceIds` by direction ([orchestrated.ts:3807](apps/web/src/lib/analyzer/orchestrated.ts#L3807))
- Having explicit `opposingEvidenceIds` would make the data self-documenting and eliminate the misleading field name

**Recommendation:** ADOPT from xWiki. Add `opposingEvidenceIds` to `ClaimVerdict`. Populate during verdict generation by splitting evidence by `claimDirection`. This is an additive change (no breaking migration).

---

### 5.2 SOURCE `bias` field - PARTIALLY IMPLEMENTED, WORTH SURFACING

**xWiki proposes:** `bias` field on SOURCE entity

**Current code reality:** Source reliability evaluation already tracks bias:
- `biasIndicator?: string | null` ([source-reliability.ts:301](apps/web/src/lib/analyzer/source-reliability.ts#L301))
- `bias?: { politicalBias: string; otherBias?: string | null }` ([source-reliability.ts:303](apps/web/src/lib/analyzer/source-reliability.ts#L303))
- Bias is evaluated by LLM, cached in source-reliability.db, but **NOT surfaced** to `FetchedSource` or the report UI

**Value assessment:**
- Bias data exists in the cache but is invisible to users and verdicts
- Surfacing bias in the report would improve transparency
- Could help explain why certain sources are weighted differently

**Recommendation:** ADOPT from xWiki. Add `biasIndicator` to `FetchedSource` interface. Surface in report UI alongside `trackRecordScore`. The data already exists - just needs plumbing.

---

### 5.3 "Scenario" concept - RETIRE, but preserve the ASSUMPTIONS idea

**xWiki proposes:** Scenarios with `description`, `assumptions`, `extracted_from` per claim

**Current code:** AnalysisContexts with `subject`, `metadata`, `assessedStatement` per article

**Value assessment:**
- The AnalysisContext concept is architecturally superior - it's a bounded analytical frame with rich metadata
- **BUT** the xWiki Scenario concept has one valuable element: **explicit `assumptions`**. Currently, AnalysisContext has `metadata` (freeform) and `boundaries` but no structured assumptions field
- Example: For "Are vaccines effective?" - AnalysisContext separates by methodology. A Scenario would also capture "assuming healthy adults 18-65" vs "assuming immunocompromised patients" - these assumptions could refine the analysis within a context

**Recommendation:** RETIRE "Scenario" as a separate entity. But consider adding an `assumptions?: string[]` field to AnalysisContext for V2.0 if conditional analysis becomes needed. Not urgent.

---

### 5.4 `likelihood_range` vs `truthPercentage` - DON'T ADOPT, but learn from it

**xWiki proposes:** Text ranges like "0.40-0.65 (uncertain)" on Verdict

**Current code:** `truthPercentage: number` (0-100) + separate `confidence: number`

**Value assessment:**
- The current 7-point scale with separate confidence is well-embedded in the system and UI
- The xWiki range approach bundles truth and uncertainty into one field, which is harder to compute with
- **BUT** the underlying insight is valid: a point estimate (e.g., 46%) implies false precision. The system already handles this via the "MIXED" and "UNVERIFIED" bands (43-57%) and confidence assessment
- The run-to-run variance we just measured (46% vs 69% for Bolsonaro) shows the system already has natural uncertainty ranges

**Recommendation:** DON'T ADOPT the format. But consider adding an optional `verdictRange?: [number, number]` field to ClaimVerdict in V2.0 to communicate uncertainty bounds. Low priority - the confidence field already serves this purpose.

---

### 5.5 Temporal Separation of Source Scoring - GOOD PRINCIPLE, ALREADY PARTIALLY IN PLACE

**xWiki proposes:** Batch job (weekly Sunday 2AM) for source scoring, one-way data flow during analysis

**Current code:** On-demand LLM evaluation with 90-day TTL cache. Analysis reads cached scores but never writes them.

**Value assessment:**
- The **one-way data flow principle** from xWiki IS already implemented: analysis reads `trackRecordScore` from cache but never updates it ([source-reliability.ts:15](apps/web/src/lib/analyzer/source-reliability.ts#L15))
- The **temporal separation** is achieved differently: instead of a weekly batch, scores are computed on first access and cached for 90 days (TTL-based vs schedule-based)
- The xWiki's scheduled batch approach has one advantage: **predictability** (all analyses in a week use the same scores). The current TTL-based approach means different analyses might trigger new evaluations mid-week

**Recommendation:** KEEP current architecture. The xWiki principle is sound but the TTL-based approach is more practical for a POC/Alpha. If scoring consistency becomes important at scale, consider batch pre-evaluation as described in xWiki.

---

### 5.6 Denormalized Fields (evidence_summary, source_names) - WORTH CONSIDERING FOR BETA

**xWiki proposes:** Denormalized fields on Claims table:
- `evidence_summary` (JSONB): Top 5 evidence snippets
- `source_names` (TEXT[]): Array of source names
- `scenario_count` (INTEGER): Quick metric
- `cache_updated_at` (TIMESTAMP)

**Current code:** All data in single `ResultJson` blob. No denormalization.

**Value assessment:**
- Currently works fine because the entire result is loaded at once
- For normalized database (Beta/V1.0), these denormalized fields would be valuable for list/search pages
- The evidence_summary concept maps well to the existing `twoPanelSummary` in the result JSON

**Recommendation:** ADOPT when migrating to PostgreSQL. Add `evidence_summary` and `source_names` as denormalized columns. Not needed until database normalization happens.

---

## SECTION 6: Updated Action Summary

| # | xWiki Item | Verdict | Action | Priority |
|---|-----------|---------|--------|----------|
| 1 | `opposingEvidenceIds` | **xWiki is better** | Add to ClaimVerdict type | MEDIUM (next increment) |
| 2 | SOURCE `bias` field | **xWiki is correct** - data exists but not surfaced | Plumb `biasIndicator` to FetchedSource | LOW |
| 3 | "Scenario" concept | **Retire** - AnalysisContext is superior | Update target model; consider `assumptions` field later | LOW |
| 4 | `likelihood_range` | **Don't adopt** - current scale is better | Consider `verdictRange` for V2.0 | DEFER |
| 5 | Batch source scoring | **Principle valid** - already followed via TTL | Keep current TTL approach | NONE |
| 6 | Denormalized fields | **Worth adopting** at normalization time | Add when migrating to PostgreSQL | DEFER |
| 7 | Core ERD field names | **Code is correct** - update docs | Fix SOURCE and ANALYSIS_CONTEXT fields | HIGH |
| 8 | EVIDENCE_ITEM fields | **Code is correct** - update docs | Add sourceAuthority, probativeValue, evidenceBasis | HIGH |
| 9 | AKEL line counts | **Code is correct** - update docs | Update to actual line counts | MEDIUM |
| 10 | Shared modules | **Code is correct** - update docs | Add missing modules to diagram | MEDIUM |

---

**Approval:**

| Reviewer | Role | Status | Date |
|----------|------|--------|------|
| Claude Opus 4.6 | Principal Architect | ✅ AUTHORED | 2026-02-08 |
| | Senior Developer | ⏳ PENDING | |
