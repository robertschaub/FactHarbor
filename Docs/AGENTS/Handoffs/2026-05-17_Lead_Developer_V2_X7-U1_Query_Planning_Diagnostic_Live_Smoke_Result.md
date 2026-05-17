---
role: Lead Developer / Captain Deputy
date: 2026-05-17
topic: V2 X7-U1 Query Planning Diagnostic Live-Smoke Result
related:
  - Docs/WIP/2026-05-17_V2_Slice_X7-U1_Query_Planning_Diagnostic_Live_Smoke_Package.md
  - Docs/WIP/2026-05-17_V2_Slice_X7-U1_Query_Planning_Diagnostic_Live_Smoke_Result.md
---

# Lead Developer Handoff: V2 X7-U1 Query Planning Diagnostic Live-Smoke Result

### 2026-05-17 | Lead Developer / Captain Deputy | Codex (GPT-5.5) | V2 X7-U1 Query Planning Diagnostic Live-Smoke Result

**Task:** Execute and close out the one-job X7-U1 diagnostic live smoke after X7-U0 added hidden Query Planning adapter diagnostics.

**Files touched:** `Docs/WIP/2026-05-17_V2_Slice_X7-U1_Query_Planning_Diagnostic_Live_Smoke_Result.md`, `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Agent_Outputs.md`, this handoff, and generated `Docs/AGENTS/index/handoff-index.json`.

**Result:** X7-U1 is `PASS_X7_U1_DIAGNOSTIC_CAPTURED`. Job `83c76b93bea746e9b4848c020c8f34a1` ran the exact German Captain-defined input on committed/refreshed runtime `6ca35b35eb3a202c966fea504069a7abcdf071fd`, first prepared `pipeline: claimboundary-v2`, reached `SUCCEEDED`, kept public output `4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged`, and leaked no hidden markers publicly.

**Hidden artifacts:** Ledger `83c76b93bea746e9b4848c020c8f34a1:precutover-observability` contained accepted Claim Understanding, X7-J `intake_ready`, X7-O `structural_prerequisites_observed_not_executed_precutover`, and X7-S Query Planning runtime artifact. Source/search/fetch/parser/SR/cache/evidence/report/verdict/confidence/public flags remained false/off.

**Diagnostic:** X7-S Query Planning completed as damaged with `schema_validation_failed`. `adapterAttemptDiagnostics` captured one `invalid_schema` attempt from `anthropic` / `claude-haiku-4-5-20251001`, prompt hash `6ad2e3146bd545f280730c2391f9364e61a202f3be71bc98acf6fc466427cc2b`, 2132 total tokens, and structural issues: `integrityEvents.0.type` required, `integrityEvents.0.references` required, and unrecognized `eventType`.

**Decision:** The evidence supports an X7-U2 prompt-contract repair, not schema relaxation, adapter alias normalization, model routing, provider configuration, retry, or source behavior changes. Two static expert reviews converged on amending `V2_EVIDENCE_QUERY_PLANNING` to spell out the task-event object contract and adding focused tests that preserve strict schema rejection of `eventType`.

**Warnings:** Do not treat X7-U1 as approving public cutover, source/search/fetch/parser/SR/cache IO, EvidenceCorpus/evidence/report/verdict/confidence behavior, ACS/direct URL execution, V1 reuse, or V1 cleanup. Any live rerun after prompt repair must be committed, runtime-refreshed, and counted against the current max-8 live-job authorization.

**Learnings:** For executable V2 prompt slices, schema literals that are not rendered inside the actual loader section are effectively invisible to the model. Prompt-contract tests should guard the rendered section, not only the TypeScript schema.

DEBT-GUARD RESULT
Classification: incomplete-existing-mechanism
Chosen option: amend the existing Query Planning prompt contract in the next slice
Rejected path and why: schema relaxation and adapter normalization would hide contract drift and weaken strict V2 boundaries; model change is larger and unsupported by the diagnostic
What was removed/simplified: none in X7-U1 closeout
What was added: diagnostic closeout and repair recommendation
Net mechanism count: unchanged
Budget reconciliation: docs-only closeout; source/prompt repair is deferred to X7-U2
Verification: live job, hidden route inspection, public non-leak scan, clean worktree
Debt accepted and removal trigger: none
Residual debt: Query Planning still returns damaged until X7-U2 repair is implemented and live-validated
