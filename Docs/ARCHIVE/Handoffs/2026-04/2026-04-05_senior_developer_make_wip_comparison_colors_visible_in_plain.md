### 2026-04-05 | Senior Developer | Codex (GPT-5) | Make WIP Comparison Colors Visible in Plain Markdown
**Task:** Replace the subtle color markers with explicit plain-text status chips because the markdown viewer does not render actual table cell colors.
**Files touched:** `Docs/WIP/2026-04-05_Current_vs_Previous_Build_Report_Comparison.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Kept the same judgments but changed the legend and status cells to explicit labels: `🟩 IMPROVED`, `🟨 MIXED`, `🟥 DECLINED`, `⬜ NO COMPARATOR`. Updated the matrices to use the same visible chips.
**Open items:** None.
**Warnings:** Markdown tables still do not support real background fills in this viewer. The visible status now depends on the emoji + text labels, not actual colored cells.
**For next agent:** If you need real colored boxes later, this will need xWiki macros or HTML/CSS in a different rendering context rather than plain markdown tables.
**Learnings:** no