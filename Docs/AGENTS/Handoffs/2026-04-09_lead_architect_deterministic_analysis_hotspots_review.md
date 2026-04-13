### 2026-04-09 | Lead Architect | Codex (GPT-5) | Deterministic Analysis Hotspots Review
**Task:** Document the top remaining deterministic analyzer behaviors that still influence analytical outcomes, rank them, and add the resulting review to the backlog.
**Files touched:** `Docs/WIP/2026-04-09_Deterministic_Analysis_Hotspots_Review.md`, `Docs/STATUS/Backlog.md`
**Key decisions:** Added a dedicated WIP note ranking 5 hotspots: (1) Stage-1 truth-condition anchor preservation override, (2) Stage-4 verdict direction plausibility/rescue, (3) SR truth weighting, (4) input-type routing, (5) scope-quality classification. Added backlog item `LLMINT-2` to track review/migration of these deterministic hotspots under the `LLM Intelligence` mandate.
**Open items:** No code changes made. The next architectural decision is whether SR truth weighting stays as an accepted policy mechanism or moves to an LLM-led path.
**Warnings:** The top two items are not just cleanup debt — they are the clearest remaining cases of deterministic logic making meaning-bearing analytical decisions in the live analyzer.
**For next agent:** Start with `Docs/WIP/2026-04-09_Deterministic_Analysis_Hotspots_Review.md`. If this work is picked up, prioritize Stage 1 anchor preservation and Stage 4 direction rescue before lower-severity routing/quality labels.
**Learnings:** No