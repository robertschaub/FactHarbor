---
roles: [Unassigned]
topics: [check_worthiness, fail_closed, contract_invariants, soft_refusal, architecture]
files_touched:
  - Docs/WIP/2026-04-22_Check_Worthiness_Recommendation_Design.md
  - Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Check_Worthiness_Senior_Architect_LLM_Expert_Findings_Disposition.md
  - Docs/AGENTS/Agent_Outputs.md
---

### 2026-04-22 | Unassigned | Codex (GPT-5) | Check-Worthiness Senior Architect LLM Expert Findings Disposition
**Task:** Apply the Senior Architect / LLM Expert findings to the consolidated check-worthiness design doc, specifically hardening fail-closed enforceability and recommendation-contract invariants.
**Files touched:** `Docs/WIP/2026-04-22_Check_Worthiness_Recommendation_Design.md`; `Docs/AGENTS/Handoffs/2026-04-22_Unassigned_Check_Worthiness_Senior_Architect_LLM_Expert_Findings_Disposition.md`; `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** Added explicit module-boundary invariants so the recommendation snapshot is self-validating before persistence or downstream consumption: one assessment per candidate claim, full ranked permutation of candidate ids, ordered subset rule for `recommendedClaimIds`, uniqueness constraints, and non-empty rationale requirements. Hardened fail-closed semantics so post-parse invariant failures, including structured-output soft-refusal shapes such as empty arrays or blank rationale strings, now count as recommendation failure and trigger the same bounded retry/fail-closed path as schema failures or timeouts.
**Open items:** This is still a design-level contract hardening. When implemented, the runtime module should mirror these invariants in code and treat invariant failure as a first-class error path. If Captain later wants a stricter guarantee that `recommendedClaimIds` is never empty, that would be a policy change beyond the current ACS spec.
**Warnings:** The doc now allows `recommendedClaimIds.length === 0` as a valid outcome when the full ranked/assessed snapshot is otherwise complete, because the approved ACS policy does not require at least one recommendation in all cases. Do not weaken the new invariant checks by relying on later UI/API confirmation to catch empty or inconsistent snapshots.
**For next agent:** The recommendation contract is now hardened where it was previously too permissive: fail-closed is enforced by explicit invariants, not just by prose, and empty/partial soft-refusal outputs are explicitly invalid even if they pass basic structured parsing. The key new sections are the added requirements items plus the new `Structural validity invariants` subsection.
**Learnings:** no — not appended to `Docs/AGENTS/Role_Learnings.md`.
