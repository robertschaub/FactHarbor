### 2026-04-05 | Senior Developer | Codex (GPT-5) | Write WIP Build Comparison Note
**Task:** Write a dedicated WIP markdown note that makes the 5-input comparison unambiguous by separating build-over-build analysis from current local-vs-deployed comparison.
**Files touched:** `Docs/WIP/2026-04-05_Current_vs_Previous_Build_Report_Comparison.md`, `Docs/WIP/README.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Added a standalone WIP note with explicit comparator rules, separate tables for local build-over-build and deployed build-over-build, and a third table for current local vs current deployed. Added the new note to the WIP index and updated the WIP README date to `2026-04-05`.
**Open items:** None for the document itself. If exact immediate-prior-build A/B evidence is needed for every family, some families still require controlled reruns because older history does not always contain a same-family sample on the immediately preceding hash.
**Warnings:** The document explicitly distinguishes nearest older-build comparisons from exact immediate-prior-build comparisons. Do not collapse those categories in later summaries.
**For next agent:** Use the WIP note as the canonical comparison reference for this batch instead of rephrasing from memory. It already contains the exact current job IDs and the comparator caveats.
**Learnings:** no