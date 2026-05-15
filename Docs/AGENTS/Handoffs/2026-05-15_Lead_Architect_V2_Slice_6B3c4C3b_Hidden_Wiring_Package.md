---
### 2026-05-15 | Lead Architect | Codex | V2 Slice 6B.3c-4C3b Hidden Wiring Package
**Task:** Debate and consolidate the next 4C3b hidden direct-text wiring step after 4C3a was committed.
**Files touched:**
- `Docs/WIP/2026-05-15_V2_Slice_6B3c4C3b_Hidden_Direct_Text_Wiring_Approval_Package.md`
- `Docs/WIP/2026-05-15_V2_Slice_6B3c4C3_Product_Activation_Approval_Package.md`
- `Docs/WIP/2026-05-14_V2_Slice_6B3_Revised_Implementation_Plan.md`
- `Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md`
- `Docs/AGENTS/Handoffs/2026-05-15_Lead_Architect_V2_Slice_6B3c4C3b_Hidden_Wiring_Package.md`
**Key decisions:** Deputy debate approved only a docs-only 4C3b package. Source wiring is blocked until Captain confirmation because it would enable real hidden prompt/model/provider execution and executable gateway state. Existing job events/history are not a safe hidden artifact sink; the package recommends a V2-owned `v2_observability_ledger` direction with an internal local smoke artifact adapter only for later committed/refreshed 4C3c inspection.
**Open items:** Captain confirmation is required before 4C3b source. If confirmed, implement only the package source envelope: activation owner, artifact sink, run-context activation snapshot, runtime-stage/orchestrator wiring, exact boundary-guard exceptions, and focused tests. 4C3c live smoke remains blocked until committed/refreshed 4C3b can produce an inspectable hidden artifact.
**Warnings:** Do not implement 4C3b from the older 4C3 package alone. Do not store provider telemetry, prompt hashes, activation snapshots, hidden artifact pointers, or runtime state in public `resultJson`, report markdown, UI, export, compatibility view, or normal job events. Do not reuse V1 config/model/provider helpers.
**For next agent:** Use `Docs/WIP/2026-05-15_V2_Slice_6B3c4C3b_Hidden_Direct_Text_Wiring_Approval_Package.md` as the controlling source package. Required confirmation wording is in Section 12. Without Captain confirmation, only review/package refinement is allowed.
**Verification:** Docs-only change. `git diff --check` should be run before commit. No tests/build/live jobs are required for this package.
**Learnings:** Appended to Role_Learnings.md? no - the relevant warning is package-specific and recorded above.
