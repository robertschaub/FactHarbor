---
### 2026-05-14 | Senior Developer | Codex (GPT-5) | V2 Slice 6B.1a Claim Understanding Result Envelope
**Task:** Implement only the non-executable V2 Slice 6B.1a Claim Understanding result-envelope contract before prompt text/model execution.
**Files touched:** `apps/web/src/lib/analyzer-v2/claim-understanding/types.ts`; `apps/web/src/lib/analyzer-v2/claim-understanding/prepared-snapshot.ts`; `apps/web/src/lib/analyzer-v2/gateway/policy.ts`; `apps/web/test/fixtures/analyzer-v2/README.md`; `apps/web/test/fixtures/analyzer-v2/schemas/claim-contract-v2.schema.json`; `apps/web/test/fixtures/analyzer-v2/schemas/claim-understanding-result-v2.schema.json`; `apps/web/test/unit/lib/analyzer-v2/claim-understanding/claim-contract.test.ts`; `apps/web/test/unit/lib/analyzer-v2/claim-understanding/prepared-snapshot.test.ts`; `apps/web/test/unit/lib/analyzer-v2/gateway/cache-governance.test.ts`; `apps/web/test/unit/lib/analyzer-v2/gateway/policy.test.ts`; this handoff.
**Key decisions:** Added `ClaimUnderstandingResult` as the non-executable accepted/blocked/damaged envelope and moved the Claim Understanding gateway output schema to `v2.claim_understanding_result.0`. `ClaimContract` remains the success contract; ACS-backed success still carries accepted `prepared-stage1-v1` migration metadata, while direct-input success uses `acsMigration: null` instead of fabricating ACS facts. Blocked/damaged outcomes carry `claimContract: null` plus typed reasons and integrity events. No prompt text, prompt profile activation, UCM schema/default changes, runtime LLM calls, API/UI changes, live jobs, or expensive tests were added.
**Open items:** Slice 6B prompt/model execution remains blocked. Next slices still need UCM-0 / 6B.1b prompt-profile/model-policy plumbing, updated LLM Expert review, and explicit Captain approval before any executable `V2_CLAIM_UNDERSTANDING_GATE1` prompt/model path.
**Warnings:** Future prompt-output mapping must not ask the LLM to author gateway-owned structural fields such as hashes, current date buckets, prompt/profile ids, or ACS migration facts. The gateway/migration layer must copy or derive those fields before producing accepted `ClaimContract` results.
**For next agent:** Continue with 6B.1b only if asked: keep `ClaimUnderstandingResult` as the gateway output envelope, keep `ClaimContract` success-only, and preserve the focused verifier set used here.
**Learnings:** Not appended; no reusable Senior Developer learning beyond this slice-specific contract decision.

```text
DEBT-GUARD COMPACT RESULT
Chosen option: amend the existing V2 claim-understanding contract/schema and tests; no runtime mechanism was added.
Net mechanism count: runtime unchanged; one pre-execution contract envelope added as the reviewed missing contract surface.
Verification: `npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding test/unit/lib/analyzer-v2/gateway/policy.test.ts test/unit/lib/analyzer-v2/gateway/cache-governance.test.ts`; `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts`; `npm -w apps/web run build`; `git diff --check`.
Residual debt: prompt/profile/model-policy approval and executable prompt-output mapping remain blocked follow-up work.
```
