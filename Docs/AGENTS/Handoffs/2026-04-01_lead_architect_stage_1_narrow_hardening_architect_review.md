### 2026-04-01 | Lead Architect | Gemini 3.1 Pro | Stage 1 Narrow Hardening - Architect Review
**Task:** Review two proposed narrow post-rollback Stage-1 hardening changes against the Apr 1 baseline.
**Files touched:** Docs/WIP/2026-04-01_Stage1_Narrow_Hardening_Architect_Review.md, Docs/AGENTS/Agent_Outputs.md
**Key decisions:** Both narrow Stage-1 hardening changes are justified and low-risk. Removing the single_atomic_claim fallback fixes an over-fragmentation bypass for omitted classifications. Adding a retry re-validation guard prevents accepting contract-violations during retries.
**Open items:** Next agent to implement the two narrow changes.
**Warnings:** Do not reintroduce evidence-separability tiebreaks, candidate-scoring models, distinctEvents processing modifications, or deterministic semantic logic.
**For next agent:** Read Docs/WIP/2026-04-01_Stage1_Narrow_Hardening_Architect_Review.md and implement both changes simultaneously in claim-extraction-stage.ts.
**Learnings:** no