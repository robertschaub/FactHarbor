---
role: Lead Developer / Captain Deputy
date: 2026-05-17
topic: V2 X7-U4 Query Planning Artifact Selected-IDs Diagnostic Cleanup
related:
  - Docs/WIP/2026-05-17_V2_Slice_X7-U3_Query_Planning_Downstream_Gate_Posture_Live_Result.md
  - Docs/WIP/2026-05-17_V2_Slice_X7-U4_Query_Planning_Artifact_Selected_Ids_Diagnostic_Cleanup.md
---

# Lead Developer Handoff: V2 X7-U4 Query Planning Artifact Selected-IDs Diagnostic Cleanup

### 2026-05-17 | Lead Developer / Captain Deputy | Codex (GPT-5.5) | V2 X7-U4 Query Planning Artifact Selected-IDs Diagnostic Cleanup

**Task:** Clean up the selected-ID diagnostic mismatch observed in the X7-U3 hidden Query Planning runtime artifact.

**Files touched:** `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-runtime-artifact-sink.ts`, focused artifact/orchestrator tests, `Docs/WIP/2026-05-17_V2_Slice_X7-U4_Query_Planning_Artifact_Selected_Ids_Diagnostic_Cleanup.md`, status/backlog, this handoff, `Docs/AGENTS/Agent_Outputs.md`, and generated `Docs/AGENTS/index/handoff-index.json`.

**Decision:** Apply a projection-only artifact cleanup before drafting the next Source Acquisition package. Claude Opus 4.6 and two internal reviewers agreed this should be fixed first so future package proof does not carry a contradictory selected-ID diagnostic.

**Implementation:** The X7-S runtime artifact now populates top-level `selectedAtomicClaimIds` from the ready Source Acquisition handoff when present, then from Query Planning inspection, and only falls back to run-context selected IDs when neither downstream diagnostic source is available.

**Tests added/updated:** Artifact sink tests now assert selected IDs match query-entry targets and remain populated when run context has no selected IDs. Orchestrator tests now cover direct ingress with empty selected IDs while Claim Understanding supplies `AC_001`, proving the hidden artifact records `AC_001` and Source Acquisition remains `ready_not_executable`.

**Verification:** Focused X7-U4 verifier passed (3 files / 13 tests), Analyzer V2 passed (80 files / 573 tests), `npm -w apps/web run build` passed, `npm run validate:v2-gates` passed, `node scripts/validate-v2-gate-register.mjs --self-test` passed, `git diff --check` passed, and `npm run index` passed.

**For next agent:** Commit X7-U4 if clean, then draft the next Source Acquisition/Evidence Lifecycle package. Do not run another live canary for X7-U4 unless reviewers require it; local orchestrator/artifact tests cover the observed projection gap.

**Warnings:** X7-U4 does not change prompts, schemas, model/provider/config, Query Planning acceptance, source/search/fetch/parser/SR/cache behavior, EvidenceCorpus/report/verdict/public output, ACS/direct URL, V1 reuse, or V1 cleanup.

**Learnings:** Runtime artifacts should project selected claim IDs from the validated stage handoff/inspection source, not from the initial run context, because direct-input product jobs may start without preselected IDs and let Claim Understanding own the selected contract.

DEBT-GUARD RESULT
Classification: incomplete-existing-mechanism
Chosen option: amend the existing artifact projection
Rejected path and why: changing selection logic or moving straight to Source Acquisition would either overreach or preserve misleading proof artifacts
What was removed/simplified: none
What was added: selected-ID projection preference using handoff/inspection plus focused tests
Net mechanism count: unchanged
Budget reconciliation: source diff stayed projection-only; no runtime/source/public/prompt/model/schema behavior changed
Verification: focused X7-U4 verifier, Analyzer V2, build, V2 gate validator, gate-register self-test, diff check, and index rebuild passed
Debt accepted and removal trigger: none intended
Residual debt: Source Acquisition execution remains blocked by later reviewed gates
