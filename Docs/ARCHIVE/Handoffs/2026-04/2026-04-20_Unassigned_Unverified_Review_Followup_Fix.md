---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Unverified Review Follow-up Fix
**Task:** Address the two review findings on the Stage 1 `UNVERIFIED` stability patch before commit.
**Files touched:** `apps/web/src/lib/analyzer/claim-extraction-stage.ts`; `apps/web/prompts/claimboundary.prompt.md`; `apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts`; `apps/web/test/unit/lib/analyzer/contract-revalidation-fallback.test.ts`
**Key decisions:** Tightened `canCarryForwardValidatedContractApproval(...)` so carry-forward now requires every previously validated thesis-direct claim to remain in the final accepted set, not just anchor carriers. Kept the order-insensitive claim-set equivalence fix. Rewrote the prompt’s efficiency guard to remove hydrogen/vehicle-shaped proxy vocabulary and replaced it with generic wording about downstream operational proxies or adjacent performance traits.
**Open items:** No live reruns were executed after the review fixes. The same affected reports should still be rerun on the current stack if runtime confirmation is needed.
**Warnings:** `npm -w apps/web run build` succeeded and, as expected in this repo, reseeded prompt blobs during `postbuild`; active `claimboundary` prompt hash refreshed to `79442a030aca...`. Unrelated docs/WIP changes already in the worktree were left untouched.
**For next agent:** The review blocker is resolved structurally in `claim-extraction-stage.ts` around `canCarryForwardValidatedContractApproval(...)`. The follow-up tests now distinguish dropping a tangential claim from dropping a thesis-direct non-anchor claim. Verification passed on targeted Vitest (`73 passed`), `npx tsc -p apps/web/tsconfig.json --noEmit`, and `npm -w apps/web run build`.
**Learnings:** no
