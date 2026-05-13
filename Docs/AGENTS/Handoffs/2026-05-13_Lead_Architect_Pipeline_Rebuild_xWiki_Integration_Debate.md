---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild xWiki Integration Debate
**Task:** Decide whether a focused debate was warranted to integrate newly reviewed `.xwiki` architecture information and reflection into the V2 target specification.

**Files touched:**
- `Docs/WIP/2026-05-12_Pipeline_Rebuild_Target_Specification_Draft.md`
- `Docs/AGENTS/Handoffs/2026-05-13_Lead_Architect_Pipeline_Rebuild_xWiki_Integration_Debate.md`
- `Docs/AGENTS/Agent_Outputs.md`

**Key decisions:**
- Ran a standard focused debate with Franklin as Advocate, Lorentz as Challenger, and Claude Opus 4.6 as Senior Architect / LLM Expert Reconciler.
- Reconciler verdict: `MODIFY`. A broad spec rewrite or deeper stage-contract integration is not justified; a bounded documentation clarity pass is justified.
- Adopted the compact `Design Intent Mapping` table: V2 area, xWiki intent preserved, rejected/deferred mechanism, and V2 authority.
- Kept stage contracts, prompt/model policy, runtime scope, and implementation ordering unchanged.
- Reaffirmed that xWiki docs are design intent only. Source reverse-engineering and V2 contract tests remain authoritative.

**Open items:**
- If the mapping later exposes a true V2 contract gap, escalate to Captain instead of silently patching the spec.
- Slice 6B remains blocked until Captain approval for prompt/profile/model execution and LLM Expert review.

**Warnings:**
- Do not treat the mapping as permission to revive stale V1 mechanisms.
- Do not edit reviewer/runtime prompts from this debate outcome; no prompt changes were authorized.

**For next agent:**
- Use the `Compact Design Intent Mapping` table in Section 1.2 of the target spec as the guardrail for future xWiki-derived ideas.
- The debate outcome supports documentation clarity, not contract mutation.

**Verification:**
- `git diff --check`
- Scope guard by file list: documentation-only changes.

**Learnings:** Not appended to `Role_Learnings.md`; the reusable point is local: stale-source integration should be captured through a mapping table before it is allowed to influence contracts.
