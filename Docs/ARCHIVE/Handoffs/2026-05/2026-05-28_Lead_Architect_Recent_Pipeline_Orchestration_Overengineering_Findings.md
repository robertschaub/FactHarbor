---
### 2026-05-28 | Lead Architect | Codex (GPT-5) | Recent Pipeline LLM Orchestration And Over-Engineering Findings

**Task:** Find Markdown discussion from the last four days about Pipeline LLM orchestration and over-engineering.

**Files touched:** `Docs/AGENTS/Handoffs/2026-05-28_Lead_Architect_Recent_Pipeline_Orchestration_Overengineering_Findings.md`, `Docs/AGENTS/Agent_Outputs.md`.

**Key decisions:** The main current discussion is `Docs/WIP/2026-05-28_ClaimBoundary_Routing_Telemetry_ID_Handover.md`: model-routing changes were rejected/deferred in favor of warning-based telemetry and small evidence-ID/counter work. Supporting docs are `Docs/WIP/2026-05-26_Telemetry_Observation_Plan_First_4_Jobs.md`, `Docs/WIP/2026-05-26_D5_Evidence_Partitioning_Architectural_Review.md`, the May 24/25 Stage 1.5 auto-selection handoffs, `AGENTS.md`, and `Docs/AGENTS/Role_Learnings.md`.

**Open items:** Fill rows 2-4 in the telemetry observation plan before reopening model-routing changes; D5 evidence partitioning remains a separate pre-decision architecture question.

**Warnings:** Do not use model-tier changes as a substitute for missing telemetry. Do not add `modelClaimAtomization`, a new metrics subsystem, D5 changes, or Pipeline_V2/Captain-Deputy process machinery without measured need and Captain approval.

**For next agent:** Start at `Docs/WIP/2026-05-28_ClaimBoundary_Routing_Telemetry_ID_Handover.md` lines 11-19 and 117-131. Treat May 24 Pipeline_V2 lessons as governance constraints: cherry-pick small useful mechanisms, but do not revive the old orchestration/process layer.

**Learnings:** No new role learning appended; this task applied the existing 2026-05-24 Pipeline_V2 over-engineering learnings.
