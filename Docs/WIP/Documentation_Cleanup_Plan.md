# Documentation Cleanup Plan — Full .md + xWiki Update

**Date**: February 7, 2026
**Status**: APPROVED — Consolidated for execution (Code Review Agent + Senior Architect corrections incorporated)
**Purpose**: Comprehensive cleanup of all .md files and xWiki pages to reflect current implementation state

### Version Clarification

Multiple version numbers exist across the project — they track different things:

| Version | What It Tracks | Source |
|---------|---------------|--------|
| **v2.10.2** | Documentation/status version (overall project maturity label) | `Docs/STATUS/Current_Status.md`, `HISTORY.md` |
| **v2.6.40** | Orchestrated pipeline version (code header in `orchestrated.ts`) | `orchestrated.ts` line 1 |
| **v2.6.41** | Schema version (config schema identifier) | `config.ts` |
| **v2.8.1** | Prompt optimization version | `Prompt_Architecture.md` |
| **0.1.0** | NPM package version (unchanged) | `package.json` |

**v2.10.2** is the project-level version used in STATUS docs, roadmap pages, and this plan. Root `AGENTS.md` references v2.6.41 (schema version) and must be updated to clarify or align.

---

## Constraints

1. **DO NOT touch uncommitted files** (already modified in working directory) — except `Docs/WIP/POC_to_Alpha_Transition.md` and `Docs/WIP/Storage_DB_Caching_Strategy.md` (our creations)
2. **DO NOT touch** xWiki Requirements pages or License and Disclaimer. FactHarbor WebHome.xwiki: **terminology corrections only**
3. **ARCHIVE/ files** — do not update (historical records)
4. **"MOVED TO xWiki" files** — no content updates needed (xWiki is authoritative), but verify cross-references
5. **Source code is the single source of truth** for entities, types, pipeline steps, and quality gates

### Uncommitted Files (DO NOT TOUCH)

**.md files:**
- `Docs/AGENTS/Multi_Agent_Collaboration_Rules.md`
- `Docs/ARCHITECTURE/Calculations.md`
- `Docs/ARCHITECTURE/Evidence_Quality_Filtering.md`
- `Docs/ARCHITECTURE/KeyFactors_Design.md`
- `Docs/ARCHITECTURE/Overview.md`
- `Docs/ARCHITECTURE/Prompt_Architecture.md`
- `Docs/ARCHITECTURE/Quality_Gates_Reference.md`
- `Docs/DEVELOPMENT/Coding Agent Prompts.md`
- `Docs/REFERENCE/LLM_Schema_Mapping.md`
- `Docs/REFERENCE/METRICS_SCHEMA.md`
- `Docs/WIP/Generic Evidence Quality Enhancement Plan.md`
- `Docs/WIP/Reporting_Improvement_Exchange.md`

**.xwiki files (already updated in this session):**
- `Roadmap/WebHome.xwiki`, `Roadmap/POC1/`, `Roadmap/POC2/`, `Roadmap/Beta0/`, `Roadmap/V10/`
- `Specification/WebHome.xwiki`, `Specification/Architecture/`, `Specification/Automation/`
- `Specification/Data Model/`, `Specification/POC/`, `WebHome.xwiki`
- `Specification/Diagrams/` — AKEL Architecture, Claim and Scenario Workflow, Core Data Model ERD, Evidence and Verdict Workflow, Orchestrated Pipeline Internal, Storage Architecture

---

## Part 1: .md File Cleanup

### 1A. STATUS/ Files (3 files)

| File | Lines | Issues | Changes Needed |
|------|-------|--------|----------------|
| `STATUS/Backlog.md` | 122 | References MBFC; POC phase labels outdated | Update phase labels to POC→Alpha→Beta→V1.0; fix MBFC→LLM+Cache; update caching/PostgreSQL items per Storage Strategy decisions |
| `STATUS/Current_Status.md` | 809 | Phase labeling, may reference outdated features | Update "POC1" → "POC Complete (pending baseline)" throughout; add Alpha milestone references |
| `STATUS/KNOWN_ISSUES.md` | 507 | Phase labels | Light touch — update any POC2 references to Alpha |

**Note**: `STATUS/HISTORY.md`, `STATUS/Documentation_Updates_2026-02-03.md`, `STATUS/Improvement_Recommendations.md` — verify but likely no changes needed (historical logs).

### 1B. ARCHITECTURE/ Files (2 files touchable)

| File | Lines | Issues | Changes Needed |
|------|-------|--------|----------------|
| `ARCHITECTURE/Source_Reliability.md` | 1110 | MBFC references | Fix MBFC→LLM+Cache references. Has "MOVED TO xWiki" marker so minimal content changes. |
| `ARCHITECTURE/Context_Detection_via_EvidenceScope.md` | 449 | Version v2.6.42 | Verify accuracy against source code. Update if any fields changed since v2.6.42. |

**Files marked "MOVED TO xWiki"** (Context_and_EvidenceScope_Detection_Guide, KeyFactors_Design, Overview, Pipeline_TriplePath_Architecture, Quality_Gates_Reference, Schema_Migration_Strategy) — already have redirect markers, no content changes needed.

### 1C. REFERENCE/ Files (3 files touchable)

| File | Lines | Issues | Changes Needed |
|------|-------|--------|----------------|
| `REFERENCE/Provider_Prompt_Formatting.md` | 556 | extract-facts references | Fix extract-facts→extract-evidence. Has "MOVED TO xWiki" marker. |
| `REFERENCE/Provider_Prompt_Guidelines.md` | 405 | Has "MOVED TO xWiki" marker | Verify redirect is correct, no content changes |
| `REFERENCE/TERMINOLOGY.md` | 585 | Has "MOVED TO xWiki" marker | Verify redirect is correct, no content changes |

### 1D. WIP/ Files (touchable, committed)

| File | Lines | Issues | Changes Needed |
|------|-------|--------|----------------|
| `WIP/POC_to_Alpha_Transition.md` | 295 | OUR FILE — step 5 says "Convert to xWiki" | Add note that xWiki conversion is done. Mark step 5 as COMPLETE. |
| `WIP/Storage_DB_Caching_Strategy.md` | 277 | OUR FILE | Add note that xWiki conversion is done. |
| `WIP/Shadow_Mode_Architecture.md` | 741 | Check phase references | Light touch — verify POC2 references updated |
| `WIP/Pipeline_Improvement_Plan.md` | 752 | Version refs | Light touch — verify current |
| `WIP/Pipeline_Phase2_Plan.md` | 915 | Version refs | Light touch — verify current |
| `WIP/Backward_Compatibility_Break_*.md` | 775+318 | extract-facts references | These are ABOUT the terminology cleanup — historical, don't update content. Verify status markers. |
| `WIP/Code_Review_v3_Terminology_Cleanup.md` | 484 | extract-facts references | Historical code review — don't update content |
| `WIP/README.md` | 179 | Index of WIP files | Update to include POC_to_Alpha_Transition.md and Storage_DB_Caching_Strategy.md |

**WIP files to SKIP** (historical/completed work): Bolsonaro_Analysis, Evidence_Quality_Verification_Report, latest-report, Post_v3.1_Cleanup, Report_Evidence_Calculation_Review, Tangential_Context_Fix, UCM_Flaw_Review, Vector_DB_Assessment, WRITE_LOCK.

### 1E. ROOT Files (3 files)

| File | Lines | Issues | Changes Needed |
|------|-------|--------|----------------|
| `AGENTS.md` (repo root) | ~200 | Version says v2.6.41; Key Files table may be outdated; Architecture Quick Reference | **HIGH PRIORITY** — Most-read file by coding agents. Verify version (align with v2.10.2 project version or clarify schema vs project version), Key Files table, pipeline description, env vars against current code |
| `BACKLOG.md` | 395 | Phase labels, possibly MBFC | Update phase labels POC2→Alpha; update caching/DB items per Storage Strategy decisions; fix MBFC if present |
| `CHANGELOG.md` | 142 | Current version entries | Verify current, add entry for documentation consolidation if missing |

**ROOT files to SKIP** (consolidation process docs, not product docs): CONSOLIDATION_PLAN_Phase2, INSTRUCTIONS_FOR_TECH_WRITER, INVENTORY_Phase1, NEW_XWIKI_WORKFLOW_SUMMARY, ROLES_AND_RESPONSIBILITIES, TECH_WRITER_START_HERE.

### 1F. Other Directories

| File | Issues | Changes Needed |
|------|--------|----------------|
| `DEVELOPMENT/CI_CD_Test_Setup_Guide.md` | Verify current | Light touch — check if references are current |
| `DEVELOPMENT/TESTING_STRATEGY.md` | Verify current | Light touch — check if references are current |
| `USER_GUIDES/Promptfoo_Testing.md` | Verify current | Light touch |
| `USER_GUIDES/Source_Reliability_Export.md` | Verify current | Light touch |
| `USER_GUIDES/UCM_Administrator_Handbook.md` | Version refs | Verify UCM field names match source code |
| `USER_GUIDES/Unified_Config_Management.md` | Version refs | Verify UCM config keys match source code |
| `MIGRATION/v2-to-v3-migration-guide.md` | v3.0 breaking changes | Verify accuracy — this documents the terminology migration |

**SKIP**: All ARCHIVE/ files, `Docs/AGENTS/` files (agent prompts, not product docs), DEPLOYMENT/ files (MOVED TO xWiki), xwiki-export/ files. **Exception**: Root `AGENTS.md` is in scope (see 1E).

### Part 1 Summary

| Category | Files to Update | Effort |
|----------|----------------|--------|
| STATUS/ | 3 | Medium — phase label updates + MBFC fix |
| ARCHITECTURE/ | 2 | Low — MBFC fix + verify |
| REFERENCE/ | 1 | Low — extract-facts fix |
| WIP/ | 4-5 | Low — status updates + README |
| ROOT | 3 | Medium-High — AGENTS.md (high priority) + backlog phase labels |
| USER_GUIDES/ | 2-4 | Low — verify accuracy |
| DEVELOPMENT/ | 2 | Low — verify accuracy |
| MIGRATION/ | 1 | Low — verify accuracy |
| **Total** | ~18-20 files | **~2-3 hours** |

---

## Part 2: xWiki File Cleanup

### Already Updated (This Session)

These pages were updated in the current documentation consolidation session and are already uncommitted:

- `Roadmap/WebHome.xwiki` — Phase redefinition, v2.10.2 status
- `Roadmap/POC1/WebHome.xwiki` — Feature-complete warning, Alpha transition, fixed links
- `Roadmap/POC2/WebHome.xwiki` — SUPERSEDED warning, fixed links
- `Roadmap/Beta0/WebHome.xwiki` — Revised roadmap note, fixed links
- `Roadmap/V10/WebHome.xwiki` — Revised roadmap note, fixed links
- `Roadmap/POC to Alpha Transition/WebHome.xwiki` — NEW PAGE (created)
- `Specification/WebHome.xwiki` — Terminology update note
- `Specification/Architecture/WebHome.xwiki` — Implementation status
- `Specification/Automation/WebHome.xwiki` — Implementation status, pipeline description
- `Specification/Data Model/WebHome.xwiki` — Implementation status, entity updates
- `Specification/POC/WebHome.xwiki` — Comparison table updated
- `Specification/Diagrams/Storage Architecture/WebHome.xwiki` — REWRITTEN
- `Specification/Diagrams/*` (6 diagram pages) — Version, terminology fixes
- `WebHome.xwiki` — Terminology note

### DO NOT TOUCH (except as noted)

- `Specification/Requirements/WebHome.xwiki` and all sub-pages
- `License and Disclaimer/WebHome.xwiki`
- `WebHome.xwiki` (main FactHarbor page) — **terminology corrections only** (already has terminology note; may update terms if needed)

### Pages Still Needing Updates

#### 2A. Specification/Implementation/ Pages (~8 files)

These are the detailed implementation docs. Need to verify they match source code.

| Page | Title | Key Checks |
|------|-------|------------|
| `Implementation/WebHome.xwiki` | Implementation index | Verify links, add cross-ref to POC-to-Alpha |
| `Architecture/System Design/WebHome.xwiki` | Architecture Overview | Verify pipeline steps match `orchestrated.ts`, entity names match `types.ts` |
| `Architecture/AKEL Pipeline/WebHome.xwiki` | Pipeline Architecture | Verify 7-step pipeline, step names, file references |
| `Architecture/Deep Dive/KeyFactors Design/WebHome.xwiki` | KeyFactors Design | Verify KeyFactor fields match `types.ts` (contestationReason, factualBasis) |
| `Architecture/Deep Dive/Source Reliability/WebHome.xwiki` | Source Reliability | Verify cache schema matches `source-reliability-cache.ts`, MBFC→LLM+Cache |
| `Architecture/Deep Dive/Context Detection/WebHome.xwiki` | Context vs EvidenceScope | Verify AnalysisContext fields (assessedStatement v2.6.39+), EvidenceScope fields |
| `Architecture/Deep Dive/Quality Gates/WebHome.xwiki` | Quality Gates | Verify Gate 1 + Gate 4 thresholds/logic match `quality-gates.ts` |
| `Architecture/Deep Dive/Schema Migration/WebHome.xwiki` | Schema Migration | Verify v3.0 migration details |

**Key source code references to verify against:**
- `apps/web/src/lib/analyzer/types.ts` — All entity interfaces
- `apps/web/src/lib/analyzer/orchestrated.ts` — Pipeline steps
- `apps/web/src/lib/analyzer/quality-gates.ts` — Gate implementations
- `apps/web/src/lib/source-reliability-cache.ts` — SR cache schema
- `apps/api/Data/Entities.cs` — .NET entities

#### 2B. Specification/Diagrams/ Pages (~12 remaining files)

These diagram pages were NOT updated in this session. Need to check each one.

| Page | Key Checks |
|------|------------|
| `Diagrams/WebHome.xwiki` | Index page — verify links |
| `Diagrams/Automation Level/WebHome.xwiki` | Verify automation levels reflect current implementation |
| `Diagrams/Automation Roadmap/WebHome.xwiki` | Update phase labels POC→Alpha→Beta |
| `Diagrams/Federation Architecture/WebHome.xwiki` | Future feature — verify framed as extension, not redesign |
| `Diagrams/High-Level Architecture/WebHome.xwiki` | Verify components match actual (Next.js + .NET API + 3 SQLite DBs) |
| `Diagrams/Human User Roles/WebHome.xwiki` | Verify roles reflect current (no user accounts yet) |
| `Diagrams/LLM Abstraction Architecture/WebHome.xwiki` | Verify multi-provider via Vercel AI SDK, model tiering |
| `Diagrams/Manual vs Automated matrix/WebHome.xwiki` | Verify automation levels |
| `Diagrams/Monolithic Dynamic Pipeline Internal/WebHome.xwiki` | Dynamic pipeline — verify descriptions current |
| `Diagrams/Quality and Audit Workflow/WebHome.xwiki` | Verify gates, quality workflow |
| `Diagrams/Technical and System Users/WebHome.xwiki` | Verify system components |
| `Diagrams/User Class Diagram/WebHome.xwiki` | Verify user roles |
| `Diagrams/Versioning Architecture/WebHome.xwiki` | Future feature — verify framed as extension |

#### 2C. Specification/Reference/ Pages (~5 files)

| Page | Key Checks |
|------|------------|
| `Reference/WebHome.xwiki` | Index — verify links |
| `Reference/Terminology/WebHome.xwiki` | Already v3.1.0 — verify comprehensive |
| `Reference/Data Models and Schemas/WebHome.xwiki` | Verify entity schemas match `types.ts` |
| `Reference/Prompt Engineering/WebHome.xwiki` | Verify prompt references |
| Other Reference sub-pages | Verify accuracy |

#### 2D. Specification/Development/ Pages (~5 files)

| Page | Key Checks |
|------|------------|
| `Development/WebHome.xwiki` | Index — verify links |
| `Development/Coding Guidelines/WebHome.xwiki` | Verify current |
| `Development/Testing Strategy/WebHome.xwiki` | Verify current, add promptfoo reference |
| `Development/Scope Definition Guidelines/WebHome.xwiki` | Verify current |
| `Development/Deployment/WebHome.xwiki` | Verify current |

#### 2E. Specification/Other Pages (~6 files)

| Page | Key Checks |
|------|------------|
| `Specification/AI Knowledge Extraction Layer (AKEL)/WebHome.xwiki` | Verify pipeline, entity refs, terminology |
| `Specification/Workflows/WebHome.xwiki` | Verify workflow diagrams match current pipeline |
| `Specification/Examples/WebHome.xwiki` | Verify example data uses current entity names |
| `Specification/FAQ/WebHome.xwiki` | Verify answers are current |
| `Specification/Federation & Decentralization/WebHome.xwiki` | Future — verify framed as extension |
| `Specification/Review & Data Use/WebHome.xwiki` | Verify current |
| `Specification/When-to-Add-Complexity/WebHome.xwiki` | Verify current (referenced by Storage Architecture) |
| `Specification/Design-Decisions/WebHome.xwiki` | Verify current |

#### 2F. Roadmap/ Remaining Pages (~5 files)

| Page | Key Checks |
|------|------------|
| `Roadmap/Requirements-Roadmap-Matrix/WebHome.xwiki` | Update phase labels, verify requirement mappings |
| `Roadmap/Development Guidance/WebHome.xwiki` | Verify current |
| `Roadmap/Architecture Analysis*/WebHome.xwiki` | Verify current |
| `Roadmap/Specification vs*/WebHome.xwiki` | Verify current |
| `Roadmap/Zero-Cost Hosting*/WebHome.xwiki` | Verify current |
| `Roadmap/Future Milestones` | Check if exists, update if needed |

#### 2G. User Guides and FH Analysis Reports

| Page | Key Checks |
|------|------------|
| User guide pages | Verify accuracy against current UI/config |
| FH Analysis Reports | Historical — don't update content |

### Part 2 Summary

| Category | Pages to Check | Estimated Updates | Effort |
|----------|---------------|-------------------|--------|
| Implementation/ | 8 | 4-6 pages need entity/pipeline verification | High |
| Diagrams/ (remaining) | 14 | 6-8 need phase labels or accuracy fixes | Medium |
| Reference/ | 5 | 1-2 need schema verification | Low |
| Development/ | 5 | 1-2 light updates | Low |
| Other Specification/ | 8 | 3-4 need terminology/accuracy updates | Medium |
| Roadmap/ (remaining) | 5 | 2-3 need phase label updates | Low |
| User Guides | 5 | 1-2 verify accuracy | Low |
| **Total** | ~50 pages | **~20-25 need changes** | **~4-6 hours** |

---

## Execution Order

### Phase 1: .md Files (~2-3 hours)

1. **STATUS/ files** — Update phase labels and MBFC references
2. **ARCHITECTURE/ files** — Fix MBFC in Source_Reliability.md
3. **REFERENCE/ files** — Fix extract-facts in Provider_Prompt_Formatting.md
4. **WIP/ files** — Update our two files + README + verify others
5. **ROOT files** — Update BACKLOG.md phase labels
6. **USER_GUIDES/** — Verify UCM handbooks
7. **DEVELOPMENT/** — Light verification

### Phase 2: xWiki Files (~4-6 hours)

1. **Implementation/ pages** — Highest priority: verify entities, pipeline, gates against source code
2. **Remaining Diagrams/** — Phase labels, component accuracy, future features framing
3. **AKEL, Workflows, Examples** — Terminology and accuracy
4. **Reference/ pages** — Schema verification
5. **Remaining Roadmap/ pages** — Phase label updates
6. **Development/, FAQ, other** — Light verification
7. **User Guides** — Accuracy check

### Phase 3: Verification

1. Grep for remaining `MBFC` references across all touchable files (exclude ARCHIVE/ to avoid false positives — 40+ references there are historical)
2. Grep for remaining `extract-facts` (not in archive or historical docs)
3. Grep for `FactHarbor pre10 V0.9.70` namespace links in xWiki
4. Grep for outdated version strings (`v2.6.33`, `V0.9.70`) in non-archive files
5. Verify all cross-links between updated pages work
6. Verify entity names in diagrams match `types.ts`
7. Grep for `searchRelevanceLlmEnabled` (removed config field, superseded by `searchRelevanceLlmMode`)
8. Grep for `parallelExtractionLimit` in docs (verify documented)
9. Grep for `gapResearch` in docs (verify documented)
10. Verify `OUTPUT_SCHEMAS.md` is cross-referenced from Implementation pages

---

## Key Entity Reference (from Source Code)

For verifying documentation accuracy:

| Entity | Key Fields | Source |
|--------|-----------|--------|
| **AnalysisContext** | id, name, shortName, subject, temporal, status, outcome, assessedStatement, metadata | `types.ts` |
| **EvidenceItem** | id, statement, category, sourceId, contextId, claimDirection, evidenceScope, probativeValue, extractionConfidence | `types.ts` |
| **EvidenceScope** | name, methodology, boundaries, geographic, temporal, sourceType | `types.ts` |
| **KeyFactor** | factor, supports, explanation, isContested, contestedBy, contestationReason, factualBasis | `types.ts` |
| **ClaimVerdict** | claimId, claimText, isCentral, centrality, harmPotential, verdict, confidence, truthPercentage, riskTier, reasoning *(selected fields — see source for complete 25+ field interface incl. thesisRelevance, claimRole, dependsOn, isCounterClaim, evidenceQuality, supportingEvidenceIds, keyFactorId, contextId)* | `types.ts` |
| **ArticleAnalysis** | inputType, hasMultipleContexts, analysisContexts, articleThesis, articleVerdict, articleVerdictReliability | `types.ts` |
| **FetchedSource** | id, url, title, trackRecordScore, trackRecordConfidence, trackRecordConsensus *(selected fields — see source for complete interface incl. fullText, fetchedAt, fetchSuccess, category, searchQuery)* | `types.ts` |
| **QualityGates** | passed, gate1Stats, gate4Stats, summary | `types.ts:133` |
| **QualityGatesSummary** | totalEvidenceItems, totalSources, searchesPerformed, contradictionSearchPerformed | `types.ts:122` |
| **AnalysisWarning** | type, severity, message, details | `types.ts:655` |
| **AnalysisWarningType** | verdict_direction_mismatch, structured_output_failure, evidence_filter_degradation, search_fallback, budget_exceeded, classification_fallback, low_evidence_count, context_without_evidence, recency_evidence_gap | `types.ts:641` |
| **VerdictDirectionMismatch** | claimId, claimText, verdictPct, expectedDirection, actualDirection, wasCorrect, correctedVerdictPct, evidenceSupportCount, evidenceContradictCount, evidenceNeutralCount | `types.ts:673` |
| **Gate1Stats** | total, passed, filtered, centralKept | `types.ts` |
| **Gate4Stats** | total, publishable, highConfidence, mediumConfidence, lowConfidence, insufficient, centralKept | `types.ts` |
| **CachedScore** (SR) | domain, score, confidence, consensusAchieved, reasoning, category, biasIndicator, evidencePack, fallbackUsed, identifiedEntity *(selected fields — see source for complete 16-field interface incl. evaluatedAt, expiresAt, modelPrimary, modelSecondary, evidenceCited, fallbackReason)* | `source-reliability-cache.ts` |
| **JobEntity** (.NET) | JobId, Status, Progress, InputType, InputValue, PipelineVariant, PromptContentHash, ResultJson, ReportMarkdown | `Entities.cs` |
| **JobEventEntity** (.NET) | Id, JobId, TsUtc, Level, Message | `Entities.cs` |
| **AnalysisMetrics** (.NET) | Id, JobId, MetricsJson, CreatedUtc | `AnalysisMetrics.cs` |

**Key Documents:**
- `apps/web/src/lib/analyzer/prompts/OUTPUT_SCHEMAS.md` — Centralized JSON schema reference for all LLM prompt phases

**New PipelineConfig Fields** (verify against UCM docs):
- `parallelExtractionLimit` — Max concurrent evidence extraction calls
- `gapResearchEnabled`, `gapResearchMaxIterations`, `gapResearchMaxQueries` — Gap-driven research config
- `searchRelevanceLlmMode`, `searchRelevanceLlmMaxCalls` — LLM relevance classification (replaces removed `searchRelevanceLlmEnabled`)
- `evidenceSimilarityThreshold` — Configurable similarity threshold
- `temporalConfidenceThreshold`, `recencyWindowMonths`, `recencyConfidencePenalty` — Recency config

**Pipeline Steps** (from `orchestrated.ts`):

> **Note**: Steps 2-4 execute as a **single iterative research loop** (driven by `decideNextResearch()`), not as sequential waterfall steps. Each iteration searches, fetches, and extracts in sequence. Sub-steps 4.7 and 4.8 are documentation conventions — they don't have step-number labels in source code.

1. UNDERSTAND (+ temporal context assessment)
2-4. RESEARCH LOOP (iterative):
   - 2. SEARCH (+ URL deduplication, recency-aware queries)
   - 3. FETCH (+ parallel fetching)
   - 4. EXTRACT EVIDENCE (+ parallel extraction with throttle adaptation)
4.4. CONTEXT REFINEMENT
4.5. OUTCOME EXTRACTION
4.6. CONTEXT ENRICHMENT
4.7. GAP-DRIVEN RESEARCH (doc convention; iterates on critical evidence gaps)
4.8. RECENCY VALIDATION (doc convention; penalizes confidence for stale evidence on time-sensitive claims)
5. VERDICTS (+ direction validation, evidence weighting)
6. SUMMARY
7. REPORT

**Gate Thresholds** (from `quality-gates.ts`):

Gate 1 (Claim Validation): Content word count < 3 → filtered. Central claims always pass. All claims treated as AMBIGUOUS type (very permissive by design).

Gate 4 (Verdict Confidence):
- HIGH: ≥3 sources, ≥0.7 avg quality, ≥80% agreement
- MEDIUM: ≥2 sources, ≥0.6 avg quality, ≥60% agreement
- LOW: ≥2 sources but below MEDIUM thresholds
- INSUFFICIENT: <2 sources
- Publication requires minimum MEDIUM confidence (central claims always publishable)

**7-Point Verdict Scale**: TRUE (+3), MOSTLY-TRUE (+2), LEANING-TRUE (+1), MIXED (0, high confidence), UNVERIFIED (0, low confidence), LEANING-FALSE (-1), MOSTLY-FALSE (-2), FALSE (-3)

---

## Estimated Total Effort

| Phase | Files | Effort |
|-------|-------|--------|
| Part 1: .md cleanup | ~18-20 | 2-3 hours |
| Part 2: xWiki cleanup | ~20-25 need changes (of ~50 checked) | 4-6 hours |
| Part 3: Verification | grep + link checks | 30-60 min |
| **Total** | **~40-45 files** | **~7-10 hours** |

---

**Document Status**: APPROVED — Consolidated for execution (2026-02-07)
**Next Step**: Execute Phase 1 → Phase 2 → Phase 3

---

## Review Log

Both reviews were conducted on 2026-02-07. All findings have been incorporated into the main plan body above.

| Reviewer | Verdict | Findings | Status |
|----------|---------|----------|--------|
| Code Review Agent | GOOD PLAN with corrections | 6 issues (2 MEDIUM, 3 LOW, 1 INFO) | All incorporated |
| Senior Software Architect | APPROVE WITH FINDINGS | 11 findings (1 HIGH, 3 MEDIUM, 4 LOW, 2 SUGGESTION, 1 INFO) | All incorporated |

**Key corrections applied:**
- Added 5 missing entities to reference table (QualityGates, QualityGatesSummary, AnalysisWarning, AnalysisWarningType, VerdictDirectionMismatch)
- Added VerdictDirectionMismatch evidence count fields (evidenceSupportCount, evidenceContradictCount, evidenceNeutralCount)
- Updated pipeline steps with iterative loop note and sub-step 4.7/4.8 documentation convention labels
- Added completeness notes to CachedScore, FetchedSource, ClaimVerdict entity rows
- Added root `AGENTS.md` to Part 1E scope (HIGH PRIORITY)
- Added Version Clarification section explaining 5 version numbers
- Added Gate Thresholds reference block
- Added Key Documents and PipelineConfig Fields sections
- Added ARCHIVE/ exclusion to MBFC grep target
- Added grep targets 7-10 to Phase 3 verification
- Updated DO NOT TOUCH: WebHome.xwiki allows terminology corrections
