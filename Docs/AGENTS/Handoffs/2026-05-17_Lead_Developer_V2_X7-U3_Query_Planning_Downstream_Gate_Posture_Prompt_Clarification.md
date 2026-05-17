---
role: Lead Developer / Captain Deputy
date: 2026-05-17
topic: V2 X7-U3 Query Planning Downstream Gate Posture Prompt Clarification
related:
  - Docs/WIP/2026-05-17_V2_Slice_X7-U2_Query_Planning_Task_Event_Prompt_Contract_Live_Result.md
  - Docs/WIP/2026-05-17_V2_Slice_X7-U3_Query_Planning_Downstream_Gate_Posture_Prompt_Clarification.md
---

# Lead Developer Handoff: V2 X7-U3 Query Planning Downstream Gate Posture Prompt Clarification

### 2026-05-17 | Lead Developer / Captain Deputy | Codex (GPT-5.5) | V2 X7-U3 Query Planning Downstream Gate Posture Prompt Clarification

**Task:** Repair the stage-boundary prompt ambiguity diagnosed by the X7-U2 live canary.

**Files touched:** `apps/web/prompts/claimboundary-v2.prompt.md`, focused Query Planning prompt-loader/prompt-contract tests, `Docs/AGENTS/Prompt_Issue_Register.md`, `Docs/WIP/2026-05-17_V2_Slice_X7-U3_Query_Planning_Downstream_Gate_Posture_Prompt_Clarification.md`, status/backlog, this handoff, `Docs/AGENTS/Agent_Outputs.md`, and generated `Docs/AGENTS/index/handoff-index.json`.

**Decision:** Amend the existing rendered Query Planning prompt contract. The TypeScript handoff already maps accepted Query Planning output to Source Acquisition `ready_not_executable`; the live model needed the rendered prompt to state that closed downstream Source Acquisition is execution posture, not by itself a Query Planning block.

**Implementation:** `V2_EVIDENCE_QUERY_PLANNING` now has a "Downstream Source Acquisition posture" rule: valid planning inputs should return `status: accepted` with a bounded `queryPlan` even when `sourceAcquisitionTraceJson.status` indicates closed downstream execution such as `not_wired_in_7L1`. It reserves `blockedReason: source_acquisition_not_executable` for missing/malformed/provenance-preventing trace packets rather than merely closed downstream execution.

**Tests added/updated:** Prompt-contract and prompt-loader tests assert the rendered Query Planning section contains the downstream-posture rule. The existing handoff test continues to prove accepted Query Planning becomes `ready_not_executable`.

**Verification:** Focused X7-U3 verifier passed (4 files / 17 tests), Evidence Lifecycle passed (20 files / 105 tests), Analyzer V2 passed (80 files / 571 tests), `npm -w apps/web run build` passed, `npm run validate:v2-gates` passed, `node scripts/validate-v2-gate-register.mjs --self-test` passed, `git diff --check` passed, and `npm run index` passed.

**For next agent:** Commit this implementation package, reseed/refresh runtime from that commit with the three exact V2 gates, and run one German live canary using `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`. Count it against the current max-8 live-job authorization.

**Warnings:** X7-U3 does not authorize source/search/fetch/provider-network/parser execution, Source Reliability, cache IO, EvidenceCorpus/evidence/report/verdict/confidence behavior, public output, ACS/direct URL, schema relaxation, adapter alias normalization, retries, model/config/provider changes, V1 reuse, or V1 cleanup.

**Learnings:** A hidden planning task can be executable while the next stage remains non-executable; the rendered prompt must separate task acceptance from downstream execution posture as explicitly as the TypeScript handoff does.

DEBT-GUARD RESULT
Classification: incomplete-existing-mechanism
Chosen option: amend the existing Query Planning prompt contract and focused tests
Rejected path and why: schema relaxation, adapter normalization, model change, retries, or source execution would add mechanisms around a prompt-boundary ambiguity
What was removed/simplified: none
What was added: downstream Source Acquisition posture rule in the rendered prompt and focused prompt guards
Net mechanism count: unchanged
Budget reconciliation: source/test diff stayed inside the X7-U3 prompt/test envelope; no runtime/source/public/model/schema behavior changed
Verification: focused X7-U3 verifier, Evidence Lifecycle, Analyzer V2, build, V2 gate validator, gate-register self-test, diff check, and index rebuild passed
Debt accepted and removal trigger: PI-006 remains open until a committed/refreshed live canary proves accepted Query Planning with `ready_not_executable` handoff or exposes a different failure
Residual debt: live model compliance is unproven until the post-commit canary
