---
### 2026-02-19 | Lead Architect | Claude Opus 4.6 | xWiki CB Pipeline Documentation Update
**Task:** Update all architecture-relevant xWiki pages to reflect ClaimAssessmentBoundary pipeline (v2.11.0+). Migrate current content from WIP doc into xWiki. Remove all Orchestrated-era stale references.

**Files touched (15 xWiki pages):**

Phase 1 — Foundation ERDs (full rewrites):
- `Docs/xwiki-pages/.../Diagrams/Core Data Model ERD/WebHome.xwiki` — Complete CB entity ERD
- `Docs/xwiki-pages/.../Diagrams/Analysis Entity Model ERD/WebHome.xwiki` — CB analysis hierarchy ERD
- `Docs/xwiki-pages/.../Diagrams/Entity Views/WebHome.xwiki` — All 5 views rewritten (Overview, Analysis Result, Target DB, Runtime, UI-Visible)

Phase 2 — Architecture pages:
- `Docs/xwiki-pages/.../Specification/Architecture/Data Model/WebHome.xwiki` — Entity table, quality gates, MIXED/UNVERIFIED threshold fix (60→40)
- `Docs/xwiki-pages/.../Specification/Architecture/WebHome.xwiki` — Entity count description, Deep Dives label

Phase 3 — Diagram pages:
- `Docs/xwiki-pages/.../Diagrams/Quality Gates Flow/WebHome.xwiki` — Full rewrite: Gate 1 detail, structural check, Gate 4 detail, safety net
- `Docs/xwiki-pages/.../Diagrams/ClaimAssessmentBoundary Pipeline Detail/WebHome.xwiki` — Verdict steps corrected, sequence diagram added, LLM Call Budget table added
- `Docs/xwiki-pages/.../Diagrams/LLM Abstraction Architecture/WebHome.xwiki` — Orchestrated→CB pipeline reference
- `Docs/xwiki-pages/.../Diagrams/Monolithic Dynamic Pipeline Internal/WebHome.xwiki` — Orchestrated→CB reference
- `Docs/xwiki-pages/.../Diagrams/Evidence Quality Filtering Pipeline/WebHome.xwiki` — "facts"→"evidence", KeyFactor→Contestation

Verification bonus — 5 additional pages fixed:
- `Docs/xwiki-pages/.../Diagrams/Source Reliability Flow/WebHome.xwiki` — orchestrated.ts→claimboundary-pipeline.ts, facts→evidence
- `Docs/xwiki-pages/.../Diagrams/Source Reliability Overview/WebHome.xwiki` — orchestrated.ts→claimboundary-pipeline.ts
- `Docs/xwiki-pages/.../Specification/Architecture/System Design/WebHome.xwiki` — orchestrated.ts→claimboundary-pipeline.ts
- `Docs/xwiki-pages/.../Specification/Architecture/Deep Dive/Source Reliability/Admin and Implementation/WebHome.xwiki` — Orchestrated→ClaimAssessmentBoundary in pipeline table
- `Docs/xwiki-pages/.../Specification/Architecture/Deep Dive/Source Reliability/Architecture and Verdicts/WebHome.xwiki` — orchestrated.ts→claimboundary-pipeline.ts

**Key decisions:**
- Kept 5-view structure in Entity Views but rewrote all entity content for CB pipeline
- Used `types.ts` interface definitions as source of truth for all ERD field names and line references
- MIXED/UNVERIFIED confidence threshold corrected from 60% to 40% (verified in `truth-scale.ts:129`)
- Stage 4 verdict steps corrected to match `verdict-stage.ts` implementation: Advocate → Self-Consistency → Adversarial Challenge → Reconciliation → Verdict Validation
- Pages explicitly marked HISTORICAL (KeyFactor Entity Model, LLM Schema Mapping) left untouched — correct historical context preserved
- Added sequence diagram and LLM Call Budget table to CB Pipeline Detail from WIP §7

**Open items:**
- WIP doc (`ClaimBoundary_Pipeline_Architecture_2026-02-15.md`) still exists — most architecture content now migrated to xWiki. Captain should decide if WIP doc can be archived or if remaining sections (§8-§11, §13-§14) still need migration.
- Diagrams have not been visually verified in the xWiki preview extension (structure and syntax verified via code review)

**Warnings:**
- Entity Views Target Database ERD (View 3) uses projected PostgreSQL table names — these are design targets, not implemented tables. Still JSON blob in SQLite.
- The `{{include}}` directives in Data Model page reference Entity Views and Analysis Entity Model ERD. These render correctly because the ERD content was replaced in-place (same page locations).
- Several historical pages still reference `orchestrated.ts` (LLM Schema Mapping, KeyFactors Design, Calculations and Verdicts) — these are correct historical references with explicit "removed in v2.11.0" or "HISTORICAL" banners.

**For next agent:**
- All 15 pages are uncommitted. Ready for `git add` + commit.
- If working on xWiki docs further, all architecture pages are now CB-current as of v2.11.0.
- The Entity Views page is the largest (~650 lines) — any future entity changes need updates across all 5 views.

---

### 2026-02-19 | Lead Architect | Claude Opus 4.6 | Source Code Cross-Check & Conflict Resolution (Pass 2)
**Task:** Cross-check all architecture diagrams against source code implementation. Fix discrepancies. Resolve conflicting documentation across .md and .xwiki files.

**Files touched (8 files):**

Diagram-vs-code fixes (4 xWiki pages):
- `Docs/xwiki-pages/.../Diagrams/ClaimAssessmentBoundary Pipeline Detail/WebHome.xwiki` — 6 fixes: `assessSearchRelevance()`→`classifyRelevance()`, `maxResearchIterations`→`maxTotalIterations`, Stage 5 rewritten (removed fictional functions, added actual `computeTriangulationScore()` + weighted aggregation + `generateVerdictNarrative()`), moved triangulation from Stage 4 to Stage 5, fixed duplicate VALIDATE node ID (Mermaid conflict), Gate 4 now shows `buildQualityGates()`
- `Docs/xwiki-pages/.../Diagrams/LLM Abstraction Architecture/WebHome.xwiki` — `cluster_boundaries`→`context_refinement` task type, `modelVerdict` default `claude-sonnet-4-5-20250929`→`claude-opus-4-6`
- `Docs/xwiki-pages/.../Diagrams/Core Data Model ERD/WebHome.xwiki` — EvidenceScope `methodology`/`temporal` changed from REQUIRED to Optional, CB_CLAIM_VERDICT added 4 missing fields (boundaryFindings, consistencyResult, challengeResponses, triangulationScore), EVIDENCE_ITEM added 2 missing fields (sourceType, derivativeClaimUnverified), Key Implementation Notes updated
- `Docs/xwiki-pages/.../Diagrams/Quality Gates Flow/WebHome.xwiki` — Gate 4 section rewritten: clarified it classifies pre-computed confidence (not calculates), added actual numeric thresholds (HIGH ≥70, MEDIUM ≥40, LOW >0, INSUFFICIENT =0), separated "what determines confidence" into its own table

Documentation conflict fixes (4 .md files):
- `Docs/STATUS/Current_Status.md` — "Mandatory EvidenceScope"→"EvidenceScope on all evidence" (2 locations), removed "mandatory" from Stage 2 description
- `Docs/ARCHITECTURE/Calculations.md` — Marked `orchestrated.ts` file reference as removed, marked `validateContestation()` and `detectClaimContestation()` as removed
- `Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md` — Decision D4 table: methodology/temporal changed from "required" to "optional, populated when available", added implementation note about TypeScript types

**Key decisions:**
- Verified all changes against actual source code before editing (claimboundary-pipeline.ts, verdict-stage.ts, model-tiering.ts, config-schemas.ts, types.ts, aggregation.ts)
- Stage 5 flowchart now reflects actual `aggregateAssessment()` internal structure: triangulation → weighted aggregation → narrative → quality gates → envelope
- Gate 4 thresholds documented from actual code: ≥70/≥40/>0/=0 (these were not documented in any diagram before)
- Archived .md files (Docs/ARCHIVE/) left untouched — historical context preserved correctly

**Open items:**
- WIP doc still has many "mandatory EvidenceScope" references in detailed sections (§8.2, §9.2, §22, glossary, retrospective). Only the decision table (D4) was updated. These are design-intent passages and would need Captain guidance on whether to update all or add a blanket implementation note.
- Entity Views page (5 ERDs) was NOT re-checked against source code in this pass. The previous session rewrote it, but it may have the same EvidenceScope REQUIRED issue.
- All changes are uncommitted.

**Warnings:**
- The CB Pipeline Detail flowchart had a Mermaid rendering bug: node ID `VALIDATE` was used in both Stage 3 and Stage 4, causing Mermaid to merge them into one node. Fixed by renaming Stage 4's to `VERDICT_VAL`.
- The Provider Model Mapping table in LLM Abstraction shows `claude-sonnet-4-5` as Anthropic Premium tier (from model-tiering.ts defaults), but UCM override makes the effective verdict model `claude-opus-4-6`. Both are correct at their respective layers but could confuse readers.

**For next agent:**
- All 8 files are uncommitted. Combined with the 15 pages from Pass 1, that's 23 files total ready for commit.
- If further diagram work needed, Entity Views is the remaining large page to cross-check.
- The WIP doc (3000+ lines) has many "mandatory" references that are technically outdated. A systematic find-replace or blanket note would resolve this.

**Learnings:** Appended to Role_Learnings.md? No — no new role-specific learnings beyond existing entries.

---

### 2026-02-19 | Lead Architect | Claude Opus 4.6 | Final Sweep — EvidenceScope & Entity Views Completeness (Pass 3)
**Task:** Final sweep for remaining documentation conflicts. Fix EvidenceScope REQUIRED→Optional across all pages. Add missing fields to Entity Views ERDs.

**Files touched (7 files):**

EvidenceScope REQUIRED→Optional fixes:
- `Docs/xwiki-pages/.../Diagrams/Entity Views/WebHome.xwiki` — EvidenceScope "REQUIRED"→"Optional" (View 2), removed "mandatory" from Stage 2 description, added missing fields (see below)
- `Docs/xwiki-pages/.../Diagrams/Analysis Entity Model ERD/WebHome.xwiki` — EvidenceScope "REQUIRED"→"Optional", removed "mandatory" from description text
- `Docs/xwiki-pages/.../Specification/Architecture/Data Model/WebHome.xwiki` — Removed "mandatory EvidenceScope" from entity table, fixed EvidenceScope field descriptions
- `Docs/xwiki-pages/.../Specification/Reference/Terminology/WebHome.xwiki` — Fixed TypeScript interface (added `?`), "Core fields (REQUIRED)"→"Primary fields", added implementation note
- `Docs/xwiki-pages/.../Specification/Architecture/Deep Dive/Context Detection/WebHome.xwiki` — "mandatory EvidenceScope"→"EvidenceScope", "REQUIRED"→"when available" (3 locations)
- `Docs/xwiki-pages/.../Diagrams/Context Detection Decision Tree/WebHome.xwiki` — Mermaid diagram: "REQUIRED"→"primary, optional"

Stale parameter fix:
- `Docs/STATUS/KNOWN_ISSUES.md` — `maxResearchIterations`→`maxTotalIterations`

Entity Views missing fields added:
- **AtomicClaim**: Added `checkWorthiness`, fixed `keyEntities` type (json→string_array), added `isCentral` note
- **EvidenceItem**: Added `sourceAuthority`, `evidenceBasis`; reorganized field order
- **CLAIM_BOUNDARY**: Added `constituentScopes`, marked methodology/boundaries/geographic/temporal as optional
- **CB_CLAIM_VERDICT** (Stage 4): Added `boundaryFindings`, `consistencyResult`, `challengeResponses`, `triangulationScore` as json fields
- **OverallAssessment**: Added `verdictNarrative`, `claimBoundaries`, `claimVerdicts`, `coverageMatrix`, `qualityGates` as json fields
- **UI visibility table**: Added `sourceAuthority`, `evidenceBasis` to EvidenceItem internal fields

**Not changed (intentionally):**
- **Scope Definition Guidelines** (`DevOps/Guidelines/`) — "REQUIRED" there means "prompt design intent: instruct LLM to extract these fields", which is correct. Different from TypeScript type optionality.
- **WIP doc** detailed sections (§8.2, §9.2, §22, glossary, retrospective) — many "mandatory EvidenceScope" references remain. These are design-intent passages; only the Decision D4 table was updated.

**For next agent:**
- Total uncommitted files across all 3 passes: ~30 files. Ready for `git add` + commit.
- All Specification and Diagrams xWiki pages now have zero "methodology REQUIRED" or "temporal REQUIRED" references.
- The Scope Definition Guidelines page still says REQUIRED but this is intentional (prompt design directive).
- ERDs are now complete with all structurally important fields from types.ts.
