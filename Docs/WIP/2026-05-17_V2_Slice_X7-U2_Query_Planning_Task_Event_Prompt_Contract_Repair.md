# V2 Slice X7-U2 Query Planning Task-Event Prompt Contract Repair

**Date:** 2026-05-17
**Status:** source implementation package and repair
**Owner:** Lead Developer / Captain Deputy
**Trigger:** X7-U1 `PASS_X7_U1_DIAGNOSTIC_CAPTURED`
**Diagnostic job:** `83c76b93bea746e9b4848c020c8f34a1`

## 1. Purpose

X7-U1 proved the hidden Query Planning runtime/model path is reachable and captured the precise schema-output failure. The provider emitted `integrityEvents[0].eventType` and omitted `integrityEvents[0].type` plus `integrityEvents[0].references`, while the strict V2 Evidence Lifecycle task-event contract requires `type`, `severity`, `message`, and `references`.

X7-U2 repairs the rendered prompt contract so the executable `V2_EVIDENCE_QUERY_PLANNING` section states the task-event object shape directly.

## 2. Decision

Implement the smallest strict-contract repair:

- amend `V2_EVIDENCE_QUERY_PLANNING` in `apps/web/prompts/claimboundary-v2.prompt.md`;
- add focused prompt/schema/adapter tests;
- preserve strict schema rejection of `eventType` and missing `references`;
- do not relax schemas, normalize aliases, change model/config/provider policy, add retries, or touch source/public behavior.

## 3. Approved Source Envelope

- `apps/web/prompts/claimboundary-v2.prompt.md`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/prompt-loader.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/schemas.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/model-adapter.test.ts`
- `Docs/AGENTS/Prompt_Issue_Register.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/`
- generated `Docs/AGENTS/index/handoff-index.json`

## 4. Explicitly Not Authorized

- schema relaxation;
- adapter alias normalization or fabricated defaults;
- model/config/provider-factory changes;
- retry/repair-loop changes;
- source/search/fetch/parser/Source Reliability/cache IO;
- EvidenceCorpus/evidence/report/verdict/confidence/public output behavior;
- ACS/direct URL execution;
- V1 reuse, V1 work, or V1 cleanup.

## 5. Review Consensus

Two static expert reviews agreed the repair belongs in prompt wording:

- the schema and TypeScript contract are already canonical and strict;
- the rendered Query Planning section did not expose the event object shape to the model;
- schema relaxation or adapter normalization would hide contract drift;
- model change is larger and unsupported by the diagnostic.

## 6. Verification Plan

Required safe-local/build verifiers:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/prompt-loader.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/schemas.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/model-adapter.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
```

Any live validation after this repair must be a committed/refreshed runtime run using only Captain-defined inputs and counted against the current max-8 live-job authorization.
