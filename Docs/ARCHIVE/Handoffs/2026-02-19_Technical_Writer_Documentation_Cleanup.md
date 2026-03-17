# 2026-02-19 | Technical Writer | Claude Code (Sonnet 4.6) | Documentation Cleanup — Historical Content Archival

---

**Task:** Comprehensive documentation cleanup: archive all historical content from `.md` and `.xwiki` files that does not document current implementation, future plans, or decisions still worth remembering. Split pages containing mixed content. User will review archives before final deletion.

---

## Files Touched

### Created (Archives)

| File | Reason |
|------|--------|
| `Docs/ARCHIVE/STATUS/Documentation_Updates_2026-02-03.md` | Full copy of original before deletion |
| `Docs/ARCHIVE/STATUS/Current_Status_arch.md` | Historical changelog v2.10.2 and earlier (pre-2026-02-13) |
| `Docs/xwiki-pages-ARCHIVE/FactHarbor/Product Development/Specification/Architecture/Deep Dive/Orchestrated Pipeline/WebHome.xwiki` | Full Orchestrated Pipeline page (pipeline removed v2.11.0) |
| `Docs/xwiki-pages-ARCHIVE/FactHarbor/Product Development/Specification/Architecture/Deep Dive/Pipeline Variants/WebHome_arch.xwiki` | Orchestrated-era sections split from Pipeline Variants page |

### Modified (Live Files)

| File | Change |
|------|--------|
| `Docs/STATUS/Current_Status.md` | Removed changelog entries v2.10.2 and earlier (lines 455–827); replaced with archive reference |
| `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/Deep Dive/Pipeline Variants/WebHome.xwiki` | Full rewrite: replaced Orchestrated references with ClaimAssessmentBoundary throughout; updated comparison table, decision tree, shared primitives, result model, config blocks, performance table, risks table, navigation |
| `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/Deep Dive/WebHome.xwiki` | Removed Orchestrated Pipeline row from Pipeline Implementation table; updated Pipeline Developer and QA/Tester role paths |
| `Docs/ARCHIVE/README_ARCHIVE.md` | Added "Documentation Cleanup (2026-02-19)" section; updated timestamps |

### Deleted (Originals — Archived First)

| File | Archived To |
|------|------------|
| `Docs/STATUS/Documentation_Updates_2026-02-03.md` | `Docs/ARCHIVE/STATUS/Documentation_Updates_2026-02-03.md` |
| `Docs/xwiki-pages/.../Orchestrated Pipeline/WebHome.xwiki` (+ directory) | `Docs/xwiki-pages-ARCHIVE/.../Orchestrated Pipeline/WebHome.xwiki` |

---

## Key Decisions

### What Was Archived

1. **`Documentation_Updates_2026-02-03.md`** — Pure completion report for a Feb 3, 2026 documentation initiative. References files that no longer exist in the current tree (`Pipeline_TriplePath_Architecture.md`, `Quality_Gates_Reference.md`, `Context_and_EvidenceScope_Detection_Guide.md`). No forward relevance.

2. **`Current_Status.md` changelog block** — Changelog entries from v2.10.2 (2026-02-04) back through v2.6.30-31 (Jan 2026). Split boundary set at 2026-02-13: the current sprint's work (Prompt Externalization, Report Quality Hardening, CB v1.0, Claim Fidelity Fix) stays in the live file. Earlier entries moved to `Current_Status_arch.md`.

3. **Orchestrated Pipeline xwiki page** — The entire page documents the Orchestrated pipeline, which was removed in v2.11.0 (2026-02-17). The `orchestrated.ts` and `orchestrated.prompt.md` files no longer exist. All content is historical.

4. **Pipeline Variants xwiki — Orchestrated-era sections** — Six sections described the Orchestrated pipeline as the default: variant comparison table, decision tree, canonical payload spec, UCM config block (`"defaultPipelineVariant": "orchestrated"`), Orchestrated performance row, and navigation link to the Orchestrated Pipeline page. These were split into `WebHome_arch.xwiki`.

### What Was NOT Archived (Kept)

- All 18 WIP files (all confirmed active per WIP/README.md consolidated 2026-02-18)
- `HISTORY.md`, `Backlog.md`, `KNOWN_ISSUES.md`, `Improvement_Recommendations.md` (all current/forward-looking)
- All ARCHITECTURE/ files
- All AGENTS/ files
- `USER_GUIDES/UCM_Administrator_Handbook.md`
- `Current_Status.md` from 2026-02-13 onward (active sprint work)
- All xwiki pages except the Orchestrated Pipeline page

### Pipeline Variants Page Rewrite

The live Pipeline Variants page was substantially updated (not just trimmed):
- **Variant comparison table**: Updated with ClaimAssessmentBoundary as default (replacing Orchestrated column)
- **Decision tree**: Mermaid diagram updated to show CB vs MD choice
- **Config blocks**: `defaultPipelineVariant` changed from `"orchestrated"` to `"claimboundary"`; `allowedVariants` updated
- **Performance table**: Orchestrated row replaced with ClaimAssessmentBoundary row (same timing characteristics: 2-3 min p50, 5-7 min p95)
- **Key Files info box**: Updated to `claimboundary-pipeline.ts`, `verdict-stage.ts`, `monolithic-dynamic.ts`, `claimboundary.prompt.md`, `monolithic-dynamic.prompt.md`
- **Canonical Payload section**: Removed (was Orchestrated-specific; CB has its own schema)
- **Shared Primitives**: Updated "What Is Kept Separate" bullets to reference CB files
- **Common Result Envelope**: `pipelineVariant` values updated to `"claimboundary"` / `"monolithic_dynamic"`
- **Risks table**: Updated "Current-path regressions" row to reference CB instead of Orchestrated
- **Navigation**: Removed "Prev: Orchestrated Pipeline" link

---

## Scope: What Was NOT Assessed

The cleanup focused on the highest-value targets (recently removed pipeline = Orchestrated, known historical files). The following were **not individually reviewed** and may contain residual Orchestrated references:

- `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/Deep Dive/Direction Semantics/WebHome.xwiki` — references `orchestrated.ts` as key file
- `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/Deep Dive/KeyFactors Design/WebHome.xwiki` — references `orchestrated.ts` as key file
- Other Deep Dive pages that may mention the Orchestrated pipeline by name

These are lower-priority (the pages describe concepts that are still valid, the file references are the only stale element). Recommend a grep-based scan to find remaining `orchestrated` references in xwiki pages.

---

## Open Items

1. **Residual `orchestrated.ts` references in xwiki** — Run `grep -r "orchestrated" Docs/xwiki-pages/` to find remaining stale references (estimate: 3-5 pages). The Direction Semantics and KeyFactors Design pages are known candidates.

2. **WIP/README.md not updated** — The WIP README (last consolidated 2026-02-18) does not need updating for this cleanup (no WIP files were touched). However, the xWiki-pages README (`Docs/xwiki-pages/README.md`) may benefit from a note about the archive structure change (Orchestrated Pipeline directory removed).

3. **xwiki-pages-ARCHIVE README** — No README exists in the xwiki-pages-ARCHIVE directory. Consider adding one analogous to `README_ARCHIVE.md`.

4. **User review** — User stated: "I will review the archived files before final deletion." The four archived files have been created and the originals deleted. Nothing further is pending from the agent side.

---

## Warnings

- **Pipeline Variants page is a significant rewrite** — The updated page includes a new CB vs MD comparison table and decision tree. These were authored from knowledge of the CB architecture (5 stages, 2-5 min, canonical schema). If CB performance characteristics differ materially in practice, the Performance table should be updated.
- **`"claimboundary"` as pipelineVariant value** — The live page now documents `"claimboundary"` as the UCM config value. Verify this matches the actual value in `config-storage.ts` / UCM config. (The string was inferred from the pipeline name; the actual enum value should be confirmed.)
- **Archived Orchestrated Pipeline xwiki** — The archived page preserves internal xWiki links to other pages that still exist (e.g., Quality Gates, Pipeline Variants). If opened in xWiki with the archive subtree imported, these links will resolve correctly. The navigation footer still points to `...Pipeline Variants.WebHome` which is current.

---

## For Next Agent

If continuing documentation cleanup or related work:

1. The four archive files in `Docs/xwiki-pages-ARCHIVE/` and `Docs/ARCHIVE/STATUS/` are the output of this session. The user will review them.
2. The live Pipeline Variants xwiki page is substantially rewritten — treat it as the new authoritative source.
3. Check `"claimboundary"` pipelineVariant string value against actual code before publishing docs.
4. Run `grep -r "orchestrated" Docs/xwiki-pages/` to find remaining stale references and decide whether to update or leave them (Direction Semantics / KeyFactors pages describe concepts that still exist, just implemented in different files now).

---

## Learnings

Appended to Role_Learnings.md? **No** — no new Technical Writer gotchas discovered specific to this session beyond what is already documented (archive pattern, xWiki syntax rules). The main learning is operational: PowerShell Remove-Item works for file deletion on Windows, while bash `rm` commands fail silently with exit code 1 in this environment.
