---
### 2026-04-24 | Lead Architect | Codex (GPT-5) | ACS Check-Worthiness Unification Assessment
**Task:** Assess whether AtomicClaim extraction and check-worthiness should be unified, with a lean architecture because check-worthiness is time-consuming.

**Files touched:**
- `Docs/WIP/2026-04-24_Atomic_Claim_ACS_Check_Worthiness_Unification_Assessment.md`
- `Docs/WIP/README.md`
- `Docs/AGENTS/Handoffs/2026-04-24_Lead_Architect_ACS_Check_Worthiness_Unification_Assessment.md`
- `Docs/AGENTS/Agent_Outputs.md`

**Key decisions:** The reconciled architecture decision is `MODIFY`: unify ACS check-worthiness at the internal service/contract/terminology boundary, not by merging Stage 1 extraction, contract validation, Gate 1, and recommendation into one LLM decision. Stage 1 remains the authority for final `AtomicClaim` candidate validity; ACS-CW remains the single post-Gate-1 recommendation authority over those candidates. The existing `AtomicClaim.checkWorthiness` field should remain advisory until type-aligned, renamed, or retired.

**Open items:** No runtime changes were made. Recommended next implementation slice is no-behavior cleanup: type-align or deprecate `AtomicClaim.checkWorthiness`, clarify UI/docs labels so advisory extraction metadata is not confused with ACS-CW recommendation authority, and add observability separating Stage 1 duration from recommendation duration.

**Warnings:** Do not use `AtomicClaim.checkWorthiness` as a fallback selector; current prompt/schema permits `low` while the TypeScript `AtomicClaim` contract narrows the field. Do not expose ACS-CW as a public pre-ACS service. Do not add deterministic semantic check-worthiness shortcuts. Prompt changes require explicit human approval.

**For next agent:** Treat `Docs/WIP/2026-04-24_Atomic_Claim_ACS_Check_Worthiness_Unification_Assessment.md` as the current architecture decision record. The important source anchors are `apps/web/src/lib/analyzer/claim-extraction-stage.ts`, `apps/web/src/lib/analyzer/claim-selection-recommendation.ts`, `apps/web/src/lib/internal-runner-queue.ts`, and `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`.

**Learnings:** No new `Role_Learnings.md` entry appended; this was a task-specific architecture decision, and the durable learning is captured in the WIP decision record.
