---
role: Lead Developer / Captain Deputy
date: 2026-05-17
topic: V2 X7-U2 Query Planning Task-Event Prompt Contract Repair
related:
  - Docs/WIP/2026-05-17_V2_Slice_X7-U1_Query_Planning_Diagnostic_Live_Smoke_Result.md
  - Docs/WIP/2026-05-17_V2_Slice_X7-U2_Query_Planning_Task_Event_Prompt_Contract_Repair.md
---

# Lead Developer Handoff: V2 X7-U2 Query Planning Task-Event Prompt Contract Repair

### 2026-05-17 | Lead Developer / Captain Deputy | Codex (GPT-5.5) | V2 X7-U2 Query Planning Task-Event Prompt Contract Repair

**Task:** Repair the strict Query Planning prompt/schema contract drift diagnosed by X7-U1.

**Files touched:** `apps/web/prompts/claimboundary-v2.prompt.md`, focused Query Planning prompt/schema/adapter tests, `Docs/AGENTS/Prompt_Issue_Register.md`, `Docs/WIP/2026-05-17_V2_Slice_X7-U2_Query_Planning_Task_Event_Prompt_Contract_Repair.md`, status/backlog, this handoff, `Docs/AGENTS/Agent_Outputs.md`, and generated `Docs/AGENTS/index/handoff-index.json`.

**Decision:** Amend the existing rendered prompt contract. The strict schema already correctly requires `type`, `severity`, `message`, and `references`; the executable prompt section did not spell out those fields. Expert review consensus rejected schema relaxation, adapter alias normalization, model change, retry changes, and source behavior changes as the first repair.

**Implementation:** `V2_EVIDENCE_QUERY_PLANNING` now defines the `integrityEvents` task-event object contract, lists the allowed `type` values, requires `references` even when empty, and explicitly forbids aliases such as `eventType`, `refs`, or `reference`.

**Tests added/updated:** Prompt-contract and prompt-loader tests assert the rendered Query Planning section contains the event object contract. Schema and model-adapter tests assert malformed `eventType` / missing-`references` output remains `invalid_schema` and damaged rather than normalized.

**For next agent:** Run the committed/refreshed post-repair live rerun using the exact German Captain-defined input from X7-U1 if the verifier set is clean. Commit before live execution, reseed/refresh prompt runtime, prove exact V2 gates, then submit one job and inspect hidden Query Planning artifacts. Count that job against the current max-8 live-job authorization.

**Warnings:** X7-U2 does not approve source/search/fetch/parser/SR/cache IO, EvidenceCorpus/evidence/report/verdict/confidence behavior, public output, ACS/direct URL, schema relaxation, adapter alias normalization, model/config/provider changes, V1 reuse, or V1 cleanup.

**Learnings:** A prompt loader that renders only one task section must keep every output object shape needed by that task inside that rendered section; relying on TypeScript schema alone is not enough for model compliance.

DEBT-GUARD RESULT
Classification: incomplete-existing-mechanism
Chosen option: amend the existing Query Planning prompt contract and focused tests
Rejected path and why: schema relaxation and adapter normalization would hide contract drift; model change and retries are larger mechanisms unsupported by X7-U1
What was removed/simplified: none
What was added: rendered event object prompt contract, focused prompt/schema/adapter guards, prompt issue register entry
Net mechanism count: unchanged
Budget reconciliation: actual diff stayed inside the X7-U2 prompt/test/docs envelope; no source/runtime/public/cache/model/provider behavior changed
Verification: focused tests, Analyzer V2 slice, build, V2 gate validators, and diff check
Debt accepted and removal trigger: PI-005 remains open until a committed/refreshed post-repair live rerun accepts Query Planning or exposes a different failure
Residual debt: live behavior after prompt repair is unproven until the next rerun
