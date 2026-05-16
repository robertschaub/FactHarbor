---
### 2026-05-16 | Lead Architect | Codex (GPT-5) | V2 7N-3B3-2C Real Byte Handoff Design
**Task:** Debate, draft, review, and consolidate the docs-only 7N-3B3-2C real transport-byte handoff design after 7N-3B3-2B parser/sink consolidation.
**Files touched:** `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2C_Real_Byte_Handoff_Design_Package.md`; `Docs/STATUS/Current_Status.md`; `Docs/STATUS/Backlog.md`; `Docs/AGENTS/V2_Pipeline_Implementation_Guardrails.md`; `Docs/AGENTS/Agent_Outputs.md`.
**Key decisions:** 7N-3B3-2C is review-approved as a docs-only design package. It authorizes no source edits. The next implementation package must be a separate 7N-3B3-2C-A source package limited to transport-owner real bytes into hidden packet sink only. Parser consumption of real fetched bytes remains blocked until a later parser-isolation package.
**Open items:** Draft and review 7N-3B3-2C-A before any source edits. The source package must preserve byte-free public transport outcomes, keep 2B fixture ingress unchanged, use the exact one-way transport-to-sink API/import/export envelope, and include HMAC/provenance, no-allocation, no-leak, disposal, boundary, kill-switch, and rollback verifiers.
**Warnings:** Do not treat 2C design approval as implementation approval. Product/public wiring, live jobs, cache IO, Source Reliability, durable storage, prompt/config/model/schema changes, evidence/report/warning generation, ACS/direct URL execution, V1 reuse, and V1 cleanup remain blocked.
**For next agent:** Start from `Docs/WIP/2026-05-16_V2_Slice_7N3B3-2C_Real_Byte_Handoff_Design_Package.md`. If continuing, draft the 7N-3B3-2C-A source package for review only; do not edit source until that package is approved.
**Learnings:** Raw-byte custody belongs in source-acquisition lifecycle before semantic extraction. Parser isolation is a separate decision; in-process transport-to-sink handoff can be reviewed before any parser reads real bytes.

DEBT-GUARD RESULT
Classification: `planned-temporary-debt` for fixture-only 2B and `missing-capability` for future real-byte custody.
Chosen option: docs-only design gate before source edits.
Rejected path and why: implementing 2C-A directly would bypass the boundary guards and raw-byte custody review; deferring byte custody to semantic extraction would mix security/lifecycle concerns with LLM-owned analysis.
What was removed/simplified: no source changes were made.
What was added: review-approved 2C design package with exact 2C-A scope, API/import/export envelope, binding, no-leak, boundary, kill-switch, rollback, and parser-isolation constraints.
Net mechanism count: unchanged in source; one docs-only gate added.
Budget reconciliation: docs stayed inside WIP/status/guardrails/handoff scope.
Verification: `git diff --check`; three-agent debate and re-review returned runtime `approve`, security `approve` after modifications, and Evidence Lifecycle `approve` after modifications.
Debt accepted and removal trigger: 2B fixture ingress remains temporary; replace or delete when a reviewed 2C-A implementation and later parser-isolation path cover real-byte lifecycle safely.
Residual debt: no real transport-byte handoff is implemented yet; parser isolation remains deferred.
