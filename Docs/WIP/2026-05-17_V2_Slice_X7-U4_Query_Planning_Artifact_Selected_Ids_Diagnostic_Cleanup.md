# V2 Slice X7-U4 Query Planning Artifact Selected-IDs Diagnostic Cleanup

**Date:** 2026-05-17
**Status:** implementation package
**Owner:** Lead Developer / Captain Deputy
**Trigger:** X7-U3 live-result diagnostic caveat
**Related job:** `9d70aa3a2ac54edaa44df8b0935e961c`

## 1. Purpose

X7-U3 passed, but its hidden X7-S Query Planning artifact exposed a diagnostic mismatch: the artifact top-level `selectedAtomicClaimIds` field was empty while the accepted query entries targeted `AC_DIRECT_01` and the Source Acquisition handoff was `ready_not_executable`.

Source review showed this is a projection gap, not a selection-logic gap:

- orchestrator passes selected IDs from `claimUnderstandingHandoff.claimContract.input.selectedAtomicClaimIds` into Query Planning runtime, inspection, and handoff;
- artifact projection populated its top-level selected IDs from `context.selectedAtomicClaimIds`, which can be empty for direct API jobs that rely on Claim Understanding selection.

X7-U4 aligns the diagnostic artifact summary with the already validated inspection/handoff selected IDs.

## 2. Decision

Implement a projection-only cleanup:

- prefer `sourceAcquisitionHandoff.handoff.selectedAtomicClaimIds` when the handoff is `ready_not_executable`;
- otherwise prefer inspected Query Planning selected IDs;
- fall back to run-context selected IDs only when no handoff/inspection IDs are available;
- add focused artifact and orchestrator tests for direct ingress with no preselected IDs.

## 3. Approved Source Envelope

- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-runtime-artifact-sink.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-runtime-artifact-sink.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/orchestrator.test.ts`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/`
- generated `Docs/AGENTS/index/handoff-index.json`

## 4. Explicitly Not Authorized

- prompt, schema, model, provider, config, or adapter behavior changes;
- query planning acceptance or query generation changes;
- source/search/fetch/provider-network/parser execution;
- Source Reliability, cache IO, durable storage, EvidenceCorpus, evidence extraction, report/verdict/confidence generation, or warning behavior;
- public output, UI, API, report, export, or compatibility-view cutover behavior;
- ACS/direct URL execution;
- V1 reuse, V1 work, or V1 cleanup;
- live-job rerun unless later requested.

## 5. Review Consensus

Claude Opus 4.6 plus two internal reviewers recommended fixing this diagnostic projection before the next Source Acquisition package. Rationale: Source Acquisition work will rely on hidden artifacts for proof; carrying a contradictory selected-ID field would confuse reviews and could mask a real provenance bug later.

## 6. Verification Plan

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-runtime-artifact-sink.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/query-plan-handoff.test.ts
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
git diff --check
npm run index
```

No live canary is required for X7-U4 because the fix is projection-only and the direct-ingress selected-ID case is covered by local orchestrator/artifact tests.
