---
### 2026-04-15 | Lead Developer + LLM Expert | Codex (GPT-5) | Narrow Claim Contract Test Cleanup
**Task:** Fix the stale narrow Stage 1 contract-validation assertions after the prompt/source updates, then add targeted prompt/runtime coverage.
**Files touched:** `apps/web/test/unit/lib/analyzer/claim-contract-validation.test.ts`; `apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts`
**Key decisions:** Kept the scope test-only; updated the source-shape assertions to match current Stage 1 code (`contractGuidance` inline fallback branch, case-insensitive anchor substring repair gate) instead of changing runtime logic. Added one prompt-output contract check for `truthConditionAnchor` / `antiInferenceCheck` and one runtime anti-inference regression test so the repaired prompt semantics stay covered.
**Open items:** Optional live verification remains undone; a fresh analysis job plus prompt-hash inspection would confirm the reseeded prompt is the one actually used at runtime. The separate `modelSalience` design slice is still pending.
**Warnings:** `apps/web/config.db` was reseeded earlier in the session to `seed-v1.0.1`; this note does not re-verify any remote/admin-managed environment. No expensive LLM-backed tests were run.
**For next agent:** The narrow analyzer suite is green with the current prompt/source shape: run `npm -w apps/web test -- test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts test/unit/lib/analyzer/claim-contract-validation.test.ts test/unit/lib/analyzer/prompt-frontmatter-drift.test.ts` if you need to reconfirm. If you continue, the next logical step is live runtime verification, not more unit-test expansion.
**Learnings:** No.
