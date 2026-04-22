---
roles: [Lead Architect]
topics: [atomic_claim_selection, implementation_spec, debate, spec_tightening]
files_touched:
  - Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md
  - Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_Atomic_Claim_Selection_Implementation_Spec_Debate.md
  - Docs/AGENTS/Agent_Outputs.md
---

### 2026-04-22 | Lead Architect | GitHub Copilot (GPT-5.4) | Atomic Claim Selection Implementation Spec Debate
**Task:** Run a `/debate` plus implementation-pragmatism review on the Atomic Claim Selection implementation spec and tighten the spec before code starts.
**Files touched:** `Docs/WIP/2026-04-22_Atomic_Claim_Selection_Implementation_Spec.md`, `Docs/AGENTS/Handoffs/2026-04-22_Lead_Architect_Atomic_Claim_Selection_Implementation_Spec_Debate.md`, `Docs/AGENTS/Agent_Outputs.md`

**Done**
- Ran a full-tier structured debate on whether to adopt the implementation spec as-is.
- Debate verdict was `MODIFY`, not `ADOPT`.
- Tightened the spec in the exact places the debate found too risky: authoritative state ownership, `Other` input typing, queue-shape minimalism, and explicit draft expiry/quota/token-recovery semantics.

**Decisions**
- Keep the pre-job draft architecture and shared Stage 1 seam.
- Make `DraftStateJson` the single authoritative draft payload; remove the separate draft-side Stage 1 snapshot blob.
- Keep `PreparedStage1Json` as the authoritative job-side Stage 1 snapshot, and slim `ClaimSelectionJson` down to selection metadata only.
- Require recomputation and persistence of `activeInputType` on every draft creation and `Other` restart.
- Reuse runner concurrency controls without requiring a full discriminated-union queue refactor in v1.

**Open items**
- Lead Developer should decide whether the eventual implementation uses a sibling `draftQueue` or a small generalized queue abstraction once the code is in hand.
- Captain should confirm whether the 24-hour draft TTL is acceptable as product behavior.

**Warnings**
- The debate did not invalidate the feature design; it invalidated adopting the previous persistence/state contract unchanged.
- If implementation starts from an earlier local copy of the spec, it may still carry the now-removed draft-side duplication (`Stage1SnapshotJson` + `DraftStateJson`) and should be refreshed first.

**Learnings**
- For pre-job interactive flows, the highest hidden cost is not usually the user-visible API shape but overlapping persistence contracts. Tightening source-of-truth ownership before code starts removes disproportionate implementation risk.

**For next agent**
- Implement from the tightened spec, not the earlier version. In particular: use one authoritative draft payload, minimal job-side selection metadata, explicit active-input typing on restart, and shared runner concurrency without forcing a large queue rewrite up front.
