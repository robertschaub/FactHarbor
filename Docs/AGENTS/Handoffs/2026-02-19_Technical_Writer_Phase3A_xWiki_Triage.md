# 2026-02-19 | Technical Writer | Claude Code (Sonnet 4.6) | Phase 3A — xWiki Refresh Triage

## Task

Phase 3A of the Documentation Refresh: grep scan of all `.xwiki` files under `Docs/xwiki-pages/FactHarbor/` for stale references, and produce a prioritised work plan for Phase 3B–3F execution.

Scope exclusions (per Captain): Requirements pages, License/Disclaimer, top-level FactHarbor WebHome.

---

## Grep Results Summary

| Term | Files | Occurrences | Notes |
|------|-------|-------------|-------|
| `orchestrated\|Orchestrated` | 37 | 99 | Removed pipeline (v2.11.0) |
| `AnalysisContext` (PascalCase) | 35 | 144 | Old top-level concept → ClaimAssessmentBoundary |
| `analysis-contexts.ts` | 5 | 5 | File deleted — references are broken |
| `ExtractedFact\|extractedFact` | 3 | ~5 | Old field name → EvidenceItem/statement |
| `Monolithic Canonical` | 0 | 0 | ✅ Already clean |

The `analysis.context` regex (lowercase) adds ~12 more files but most are plain-English "analysis context" phrases — not the TypeScript type. Low priority unless the page also has PascalCase hits.

---

## Triage by Priority

### ARCHIVE — Do not edit, move to xwiki-pages-ARCHIVE

| File | Reason |
|------|--------|
| `Diagrams/Orchestrated Pipeline Detail/WebHome.xwiki` | Entire page documents the removed Orchestrated pipeline. 3 "orchestrated" hits. Archive alongside the existing `Orchestrated Pipeline/WebHome.xwiki` archive. |

---

### TIER 1 — Full Rewrite Required
Actively describes the Orchestrated pipeline as current. Core file references point to deleted files.

| File | Hits (orch) | Hits (AC) | Notes |
|------|-------------|-----------|-------|
| `Deep Dive/Direction Semantics/WebHome.xwiki` | **21** | 1 | Key files still list `orchestrated.ts` + `orchestrated.prompt.md`. Every code reference is to a deleted file. CB equivalents: `verdict-stage.ts` + `claimboundary.prompt.md` sections `VERDICT_DIRECTION_VALIDATION`, `VERDICT_ADVOCATE/CHALLENGER/RECONCILIATION`. |
| `Deep Dive/Calculations and Verdicts/WebHome.xwiki` | **11** | 4 | `orchestrated.ts` line refs throughout. AnalysisContext as top-level concept. Both need replacing with CB pipeline + ClaimAssessmentBoundary. Cross-reference with updated `Docs/ARCHITECTURE/Calculations.md`. |
| `Deep Dive/Prompt Architecture/WebHome.xwiki` | **7** | — | `orchestrated.prompt.md` in directory tree + section table with 40+ sections. Replace with CB prompt file (`claimboundary.prompt.md`, 13 sections). Cross-reference with updated `Docs/ARCHITECTURE/Prompt_Architecture.md`. |

---

### TIER 2 — Targeted Fixes (analysis-contexts.ts + specific sections)
These have dead file references (`analysis-contexts.ts` doesn't exist) or small numbers of orchestrated/AnalysisContext hits in specific sections.

| File | Issue | Fix |
|------|-------|-----|
| `Diagrams/Evidence Quality Filtering Pipeline/WebHome.xwiki` | `analysis-contexts.ts` in Layer 7 mermaid node | Replace with `claimboundary-pipeline.ts` (Stage 3: boundary clustering). Cross-reference with updated `Evidence_Quality_Filtering.md`. |
| `Diagrams/Pipeline Shared Primitives/WebHome.xwiki` | `analysis-contexts.ts` as a diagram node + 1 orchestrated hit | Update diagram node to `claimboundary-pipeline.ts`. Check orchestrated reference. |
| `Diagrams/AKEL Shared Modules/WebHome.xwiki` | `analysis-contexts.ts\nContext detection` node + 2 orchestrated hits | Update diagram node; check orchestrated refs. |
| `Specification/Architecture/AKEL Pipeline/WebHome.xwiki` | `analysis-contexts.ts` in table row + 6 orchestrated hits | Table row: remove `analysis-contexts.ts`. Fix 6 orchestrated refs. |
| `Deep Dive/WebHome.xwiki` (index) | `analysis-contexts.ts` in key file column | Update key file reference. The 2 orchestrated hits from this page were already addressed — re-verify. |
| `Deep Dive/KeyFactors Design/WebHome.xwiki` | 2 orchestrated + 1 AnalysisContext | Key files list: `orchestrated.ts` → `verdict-stage.ts` or `aggregation.ts`. |

---

### TIER 3 — High AnalysisContext Density (schema / terminology pages)
These pages describe data models and terminology that uses `AnalysisContext` as the entity name. Need terminology updates and potentially schema updates.

| File | Hits (AC) | Priority | Notes |
|------|-----------|----------|-------|
| `Specification/Reference/Terminology/WebHome.xwiki` | **35** | HIGH | Likely the Terminology Catalog. Must add ClaimAssessmentBoundary as the current term and note AnalysisContext is the former name. |
| `Reference/Data Models and Schemas/LLM Schema Mapping/WebHome.xwiki` | **24** | HIGH | Schema mapping from TypeScript types to LLM output. `AnalysisContext` fields likely need mapping to CB equivalents. Also has 3 "orchestrated" hits. |
| `Specification/Data Model/WebHome.xwiki` | **14** | HIGH | Core data model page — must reflect current `types.ts` entities. |
| `Specification/Reference/Prompt Engineering/Provider-Specific Formatting/WebHome.xwiki` | **6** | MEDIUM | 6 AnalysisContext + 1 orchestrated. Likely schema examples. |
| `Specification/FAQ/WebHome.xwiki` | **6** | MEDIUM | FAQ entries about AnalysisContext concept. Update to explain CB. |
| `Specification/Architecture/Data Model/WebHome.xwiki` | **6** | MEDIUM | Duplicates `Data Model/WebHome.xwiki`? Check and reconcile. |

---

### TIER 4 — Low-count Orchestrated Refs (likely historical/incidental)
These have 1–2 "orchestrated" hits. Many are historical version notes or diagram annotations that can be fixed quickly.

**Quick-fix batch (1-2 hits, likely one-line changes):**
- `Architecture/WebHome.xwiki` (1) — architecture overview
- `System Design/WebHome.xwiki` (1)
- `Implementation/WebHome.xwiki` (1)
- `Diagrams/WebHome.xwiki` (1) — diagram index
- `Metrics Schema/WebHome.xwiki` (2)
- `Quality Gates/WebHome.xwiki` (2)
- `Automation/WebHome.xwiki` (2)
- `POC to Alpha Transition/WebHome.xwiki` (2 orch + 5 AC) — transition history
- `Monolithic Dynamic Pipeline Internal/WebHome.xwiki` (2) — check if "orchestrated" is just a comparison note
- `ClaimAssessmentBoundary Pipeline Detail/WebHome.xwiki` (1 orch + 1 AC)
- `LLM Abstraction Architecture/WebHome.xwiki` (1 orch + 1 AC)
- `Job Lifecycle ERD/WebHome.xwiki` (1)
- `Source Reliability Overview/WebHome.xwiki` (1 orch)
- `Source Reliability Flow/WebHome.xwiki` (1 orch)
- `SR Overview and Quick Start/WebHome.xwiki` (1 orch)
- `SR Architecture and Verdicts/WebHome.xwiki` (1 orch)
- `SR Admin and Implementation/WebHome.xwiki` (1 orch)
- `LLM Configuration/WebHome.xwiki` (1 orch + 1 AC)
- `Admin Interface/WebHome.xwiki` (1 orch)
- `Unified Config Management/WebHome.xwiki` (3 orch)
- `Provider-Specific Formatting/WebHome.xwiki` (1 orch)
- `Entity Views/WebHome.xwiki` (4 orch) — diagram views
- `AI Knowledge Extraction Layer (AKEL)/WebHome.xwiki` (3 orch)

---

### SKIP — Historical / POC content (low value, don't edit)

| File | Reason |
|------|--------|
| `Planning/POC1/WebHome.xwiki` | Historical POC1 planning. 1 orch + 5 AC. Content describes the initial POC state — historical accuracy is correct. |
| `Specification/POC/Article-Verdict-Problem.xwiki` | POC-era problem statement. Historical. |
| `Specification/POC/WebHome.xwiki` | POC specification. Historical. |
| `Diagrams/_sort` | Sort metadata file, not a content page. |

---

### ExtractedFact — 3 files
| File | Notes |
|------|-------|
| `Specification/Reference/Terminology/WebHome.xwiki` | Probably has migration note — verify it says "renamed to EvidenceItem" and update if wrong |
| `SR Admin and Implementation/WebHome.xwiki` | Likely a code reference — update to `EvidenceItem` |
| `Deep Dive/Schema Migration/WebHome.xwiki` | Schema migration history — may legitimately use `ExtractedFact` as the old name |

---

## Recommended Phase 3 Execution Order

**3B — Archive + Tier 1 rewrites (3 files + 1 archive)**
1. Archive `Diagrams/Orchestrated Pipeline Detail/WebHome.xwiki`
2. Rewrite `Deep Dive/Direction Semantics/WebHome.xwiki`
3. Rewrite `Deep Dive/Calculations and Verdicts/WebHome.xwiki`
4. Rewrite `Deep Dive/Prompt Architecture/WebHome.xwiki`

**3C — Tier 2 analysis-contexts.ts fixes (5-6 files)**
Quick targeted diagram/table fixes for the dead `analysis-contexts.ts` reference.

**3D — Tier 3 schema/terminology pages (6 files)**
These require reading `types.ts` and `config-schemas.ts` to verify entities match current code. Most work.

**3E — Tier 4 quick-fix batch (20+ files)**
One-line or few-line fixes per file. Can do in parallel batches.

**3F — XAR rebuild**
`python Docs/xwiki-pages/scripts/fulltree_to_xar.py Docs/xwiki-pages --output FactHarbor.xar`
(Script renamed from `xwiki_fulltree_to_xar_ROBUST.py` to `fulltree_to_xar.py` per Feb 19 xWiki Expert session.)

---

## Key Reference Files for Phase 3 Agents

- **Current pipeline**: `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` (5 stages)
- **Current prompt**: `apps/web/prompts/claimboundary.prompt.md` (13 sections: CLAIM_EXTRACTION_PASS1/2, CLAIM_VALIDATION, GENERATE_QUERIES, RELEVANCE_CLASSIFICATION, EXTRACT_EVIDENCE, BOUNDARY_CLUSTERING, VERDICT_ADVOCATE/CHALLENGER/RECONCILIATION, VERDICT_GROUNDING_VALIDATION, VERDICT_DIRECTION_VALIDATION, VERDICT_NARRATIVE, CLAIM_GROUPING)
- **Current types**: `apps/web/src/lib/analyzer/types.ts` — ground truth for entity names
- **Verdict/calculation**: `apps/web/src/lib/analyzer/verdict-stage.ts`, `truth-scale.ts`, `aggregation.ts`
- **Updated ARCHITECTURE/ docs**: `Calculations.md`, `Prompt_Architecture.md`, `Evidence_Quality_Filtering.md` (all updated 2026-02-19, cross-reference for xWiki rewrites)
- **Removed files** (do NOT reference): `orchestrated.ts`, `orchestrated.prompt.md`, `analysis-contexts.ts`
- **Terminology**: AnalysisContext → ClaimAssessmentBoundary; EvidenceScope (per-evidence); AtomicClaim (analytical unit); EvidenceItem (not "fact")

---

## Open Items

1. Captain to decide: Archive `Orchestrated Pipeline Detail` diagram — or just add deprecation banner? (Recommend archive, consistent with how we handled the Orchestrated Pipeline xwiki page.)
2. `Deep Dive/Context Detection/WebHome.xwiki` — mentions `analysis-contexts.ts` and AnalysisContext (1 AC hit). The Context Detection page describes the CB clustering concept. Needs review to confirm if it's still valid as a CB-era page or needs full rewrite.
3. The `AnalysisContext` count of 35 in Terminology is large. Check if this is the full terminology catalog for the old system — if so, consider whether to update in place or archive the old catalog and create a new one.

---

## Warnings

- **Direction Semantics is the most complex rewrite**: 21 orchestrated hits, covers claim direction logic that IS still implemented (in `verdict-stage.ts` CB pipeline). The concepts are valid, only the file references and pipeline name need updating. Do NOT lose the semantic direction content — it applies 1:1 to CB.
- **`AnalysisContext` in Terminology**: 35 hits means the Terminology page is heavily structured around the old concept. The top-level concept is now `ClaimAssessmentBoundary` but `EvidenceScope` is still called `EvidenceScope` (not renamed). Be careful not to conflate.
- **Pipeline Variants archive note** — the 1 "orchestrated" hit in the live Pipeline Variants page is intentional (archive cross-reference). Do not remove.
- **XAR script renamed** — use `fulltree_to_xar.py` not the old `xwiki_fulltree_to_xar_ROBUST.py`.

---

## Learnings

Appended to Role_Learnings.md? **No** — Phase 3A is triage only; no new gotchas beyond what's already documented.
