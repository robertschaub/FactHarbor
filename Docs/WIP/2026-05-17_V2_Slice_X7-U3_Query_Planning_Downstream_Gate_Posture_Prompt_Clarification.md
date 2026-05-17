# V2 Slice X7-U3 Query Planning Downstream Gate Posture Prompt Clarification

**Date:** 2026-05-17
**Status:** source implementation package and repair
**Owner:** Lead Developer / Captain Deputy
**Trigger:** X7-U2 `PASS_X7_U2_SCHEMA_REPAIR_VERIFIED`
**Diagnostic job:** `3f75f309c9a8484381fb6c596589296c`

## 1. Purpose

X7-U2 proved the Query Planning task-event schema repair: the hidden runtime/model path accepted the repaired prompt contract with zero structural issues. The same run then exposed a separate stage-boundary posture problem: Query Planning returned `blocked` with `blockedReason: source_acquisition_not_executable` only because downstream Source Acquisition remains non-executable.

The existing handoff contract already distinguishes these states:

- accepted Query Planning output with bounded query entries becomes Source Acquisition `ready_not_executable`;
- non-accepted Query Planning output becomes `query_planning_not_accepted`.

X7-U3 clarifies the rendered Query Planning prompt so closed downstream Source Acquisition is treated as execution posture, not by itself a Query Planning blocker.

## 2. Decision

Implement the smallest prompt-contract correction:

- amend `V2_EVIDENCE_QUERY_PLANNING` in `apps/web/prompts/claimboundary-v2.prompt.md`;
- state that valid inputs should produce an accepted bounded query plan even when downstream Source Acquisition is closed;
- state that the later Source Acquisition handoff represents this as `ready_not_executable`;
- preserve strict schema, adapter behavior, model/config/provider policy, and all downstream no-execution constraints.

## 3. Approved Source Envelope

- `apps/web/prompts/claimboundary-v2.prompt.md`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/prompt-loader.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff.test.ts`
- `Docs/AGENTS/Prompt_Issue_Register.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/`
- generated `Docs/AGENTS/index/handoff-index.json`

## 4. Explicitly Not Authorized

- source/search/fetch/provider-network/parser execution;
- Source Reliability, cache IO, durable storage, EvidenceCorpus, evidence extraction, report/verdict/confidence generation, or warning behavior;
- public output, UI, API, report, export, or compatibility-view cutover behavior;
- schema relaxation, adapter alias normalization, fabricated defaults, or retry/repair-loop changes;
- model/config/provider-factory changes;
- ACS/direct URL execution;
- live validation batches or substitute analysis inputs;
- V1 reuse, V1 work, or V1 cleanup.

## 5. Review Consensus

Two expert reviewers agreed that the right next repair is prompt-only:

- Query Planning should plan retrieval intent when its own inputs, policy, prompt, model, and schema prerequisites are valid.
- Downstream Source Acquisition non-executability is not a Query Planning failure; it is the expected post-planning handoff posture.
- Schema relaxation, adapter normalization, model escalation, retries, and source execution are unnecessary and riskier first responses.

## 6. Verification Plan

Required safe-local/build verifiers:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/prompt-loader.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
```

After commit, a single committed/refreshed live canary may be run using the exact Captain-defined German input from X7-U1/X7-U2 and counted against the current max-8 live-job authorization.

Expected live proof:

- public V2 remains `4.0.0-cb-precutover`, `blocked_precutover`, and non-leaking;
- hidden Query Planning result is `accepted`;
- query entries are present and bounded;
- Source Acquisition handoff is `ready_not_executable`;
- source/search/fetch/parser/SR/cache/evidence/report/verdict/public execution flags remain false.
