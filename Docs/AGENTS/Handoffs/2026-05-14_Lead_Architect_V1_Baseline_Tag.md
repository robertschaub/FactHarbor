---
### 2026-05-14 | Lead Architect | Codex (GPT-5) | V1 Baseline Tag
**Task:** Add a clear Git anchor for the last main commit before V2 pipeline specification work started.
**Files touched:** `Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md`; `Docs/WIP/2026-05-12_Pipeline_Rebuild_Specification_Plan.md`; `Docs/AGENTS/Agent_Outputs.md`; `Docs/AGENTS/index/handoff-index.json`.
**Key decisions:** Created annotated tag `v1-before-v2-pipeline-specification` at commit `92b5a5f3` (`docs(report): record hydrogen boundary validation`). This is the V1 baseline anchor before the V2 specification/rebuild history begins.
**Open items:** No V1 comparison branch was created. Create one from the tag only when a concrete V1/V2 comparison task requires it.
**Warnings:** Do not treat the preserved `C:\DEV\FactHarbor-main-before-v2-rehome` workspace as the V1-before-V2-spec baseline; it is a later preservation point. Use the tag for the pre-V2-spec anchor.
**For next agent:** Current work continues from workspace `C:\DEV\FactHarbor` on Git branch `main`. For V1 archaeology or comparison, start from tag `v1-before-v2-pipeline-specification`.
**Learnings:** Prefer tags over long-lived comparison branches until the comparison task exists; this keeps branch selectors uncluttered while preserving the exact V1 anchor.
