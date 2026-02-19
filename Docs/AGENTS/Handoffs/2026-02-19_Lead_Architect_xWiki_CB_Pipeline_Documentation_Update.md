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

**Learnings:** Appended to Role_Learnings.md? No — no new learnings beyond what was captured in the previous session's handoff.
