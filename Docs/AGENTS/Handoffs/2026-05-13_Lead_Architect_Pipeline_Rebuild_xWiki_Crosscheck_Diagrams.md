---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild xWiki Crosscheck And Diagrams
**Task:** Inspect relevant `.xwiki` architecture documentation, identify useful design intent despite staleness, and improve the V2 target specification with diagrams at the same human-reader level as the old docs.

**Files touched:**
- `Docs/WIP/2026-05-12_Pipeline_Rebuild_Target_Specification_Draft.md`
- `Docs/AGENTS/Handoffs/2026-05-13_Lead_Architect_Pipeline_Rebuild_xWiki_Crosscheck_Diagrams.md`
- `Docs/AGENTS/Agent_Outputs.md`

**Key decisions:**
- Treated `.xwiki` architecture pages as design intent and reader-experience references, not as current implementation authority.
- Reviewed the top-level architecture, system design, AKEL pipeline, AKEL pipeline detail, pipeline variants, data model, context detection, prompt architecture, quality/trust, quality gates, evidence filtering, verdict debate, calculations/verdicts, direction semantics, and source reliability deep dives.
- Added target-spec Sections 1.2 and 1.3: an xWiki crosscheck table, useful intent carried forward, stale/rejected mechanisms, and four Mermaid diagrams.
- The new diagrams cover V2 request lifecycle, detailed V2 pipeline flow, target V2 entity model, and quality gates/warning materiality.
- Explicitly rejected stale `.xwiki` mechanisms for V2 where they conflict with current rules: V1 schema strings, old function/file names, deterministic semantic filters, direct source-reliability truth formulas, and prompt snippets without approval.

**Open items:**
- Future public/xWiki docs should eventually be reconciled with the V2 target once implementation stabilizes. This slice only improves the WIP target specification.
- Slice 6B remains blocked until Captain approval for prompt/profile/model execution and LLM Expert review.

**Warnings:**
- Some `.xwiki` pages are useful but stale; do not implement from them directly without checking current source and current AGENTS rules.
- The new diagrams describe target architecture and current guarded posture; they are not proof that future V2 stages are implemented.

**For next agent:**
- Read Sections 1.2 and 1.3 of `Docs/WIP/2026-05-12_Pipeline_Rebuild_Target_Specification_Draft.md` before reviewing the V2 design with human readers.
- Keep `.xwiki` design intent separate from current implementation truth. Source code and V2 contract tests remain authoritative for implementation.

**Verification:**
- `git diff --check`
- Scope guard by file list: only WIP specification, handoff, agent output index, and generated handoff index changed.

**Learnings:** Not appended to `Role_Learnings.md`; the practical lesson is local to this project: old architecture diagrams are still valuable for communication, but old mechanisms need source/rule validation before reuse.
