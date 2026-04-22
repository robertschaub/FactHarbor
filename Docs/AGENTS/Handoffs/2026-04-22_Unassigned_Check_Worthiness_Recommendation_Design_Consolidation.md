---
roles: [Unassigned]
topics: [check_worthiness, atomic_claim_selection, architecture, requirements, specification]
files_touched:
  - Docs/WIP/2026-04-22_Check_Worthiness_Recommendation_Design.md
  - Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Check_Worthiness_Recommendation_Design_Consolidation.md
  - Docs/AGENTS/Agent_Outputs.md
---

### 2026-04-22 | Unassigned | Codex (GPT-5) | Check-Worthiness Recommendation Design Consolidation
**Task:** Create one new consolidated check-worthiness design document from the existing ACS/check-worthiness materials, covering pains/opportunities, requirements, preconditions/dependencies, specification, risks/mitigations, and implementation plan.
**Files touched:** `Docs/WIP/2026-04-22_Check_Worthiness_Recommendation_Design.md`; `Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Check_Worthiness_Recommendation_Design_Consolidation.md`; `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The new document now treats `ACS-CW-1` as a post-Gate-1 ACS contract only, keeps the live extraction-time `AtomicClaim.checkWorthiness` field advisory only, makes `ACS-1` foundation the explicit prerequisite track, defines the new module/output contract and fail-closed rules, and records debate checkpoint summaries after every requested section. Section debates consistently narrowed unsupported claims, reinforced authority boundaries, demoted prompt/runtime growth to a secondary implementation note, and kept `TOPPROP-1` explicitly later and separate.
**Open items:** The document is design-ready, but the ACS foundation and recommendation module are still not implemented in the main branch. If Captain wants this promoted beyond WIP, the next step is either formal approval for implementation or folding it into the canonical ACS spec/backlog narrative.
**Warnings:** This document describes the approved target architecture, not the current live runtime. Do not read it as evidence that the ACS recommendation module already exists. Do not collapse the new ACS recommendation contract back into Stage 1 or Gate 1, and do not reopen a standalone pre-ACS rollout path.
**For next agent:** Use `Docs/WIP/2026-04-22_Check_Worthiness_Recommendation_Design.md` as the consolidated `ACS-CW-1` design note. The core implementation ordering remains `ACS-1` foundation first, `ACS-CW-1` second, `TOPPROP-1` later. The most important guardrails are: keep `AtomicClaim.checkWorthiness` advisory, keep recommendation post-Gate-1 over final flat `atomicClaims`, fail closed with no deterministic fallback, and treat multilingual validation as the rollout gate.
**Learnings:** no — not appended to `Docs/AGENTS/Role_Learnings.md`.
