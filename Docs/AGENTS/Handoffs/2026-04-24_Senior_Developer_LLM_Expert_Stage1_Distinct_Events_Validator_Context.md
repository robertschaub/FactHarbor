---
roles: [Senior Developer, LLM Expert]
topics: [stage1, claim-extraction, contract-validation, atomicity, monitor]
files_touched:
  - apps/web/src/lib/analyzer/claim-extraction-stage.ts
  - apps/web/prompts/claimboundary.prompt.md
  - apps/web/test/unit/lib/analyzer/claim-contract-validation.test.ts
  - apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts
---

### 2026-04-24 | Senior Developer / LLM Expert | Codex | Stage 1 Distinct-Events Validator Context

**Task:** Investigate newest monitor issues: `3328ed201dd744148678efc015d7c33a` UNVERIFIED, and `d1689dfbd8ff46d98e76730bfd16fafb` / `466c86c0a399466fb8800c9134edf86e` extracting only one AtomicClaim for the Captain-defined Bundesrat `rechtskräftig` input.

**Files touched:** `claim-extraction-stage.ts`, `claimboundary.prompt.md`, prompt-contract tests.

**Key decisions:** Fixed the Bundesrat one-claim failure path by giving the claim-contract and single-claim atomicity validators the same input-derived `distinctEvents` inventory that later triggers MT-5(C). The prompt now treats that inventory as advisory LLM context: verify it against the original input, do not add events from it blindly, but do not approve a near-verbatim single claim without explaining why multiple listed entries are inseparable/search-only/duplicates/not thesis components. This preserves LLM intelligence and avoids deterministic semantic branch detection.

**Open items:** The SVP PDF `3328ed201dd744148678efc015d7c33a` is a separate broad-input Stage 1 quality failure. It was classified as `single_atomic_claim`, extracted five claims, and contract validation correctly failed because major thesis branches and the priority anchor were omitted. The current patch may help validators reason about input-derived structure, but it is not a full broad-article/PDF extraction redesign. Live reruns are still needed after commit/restart.

**Warnings:** Do not claim all Stage 1 quality issues are closed. The fix is deliberately narrow: it makes existing LLM validators see input-derived structural context. It does not lower contract validation, add deterministic keyword/regex branch detection, or bypass retry revalidation. A reviewer agent was requested but could not run because the account usage limit was reached.

**For next agent:** Primary root cause for `d1689df...` and `466c86...`: the initial contract validator and single-claim atomicity checks saw only the original input plus the near-verbatim one claim, approved it, then MT-5(C) generated a larger candidate but rejected it because the retry did not revalidate cleanly. The patch threads `distinctEventsContextJson` through `validateClaimContract()` and `validateSingleClaimAtomicity()`, tightens `CLAIM_CONTRACT_VALIDATION` and `CLAIM_SINGLE_CLAIM_ATOMICITY_VALIDATION`, and improves MT-5(C) reprompt guidance to split direct branch/proceeding/comparison/decision-gate components while preserving priority anchors. Verification: focused prompt/contract/MT-5 tests, full `npm test`, and `npm -w apps/web run build` passed; build reseeded prompt hash `28d09dc0d2c0...`.

**Learnings:** Not appended to `Role_Learnings.md`; durable learning captured here: when an upstream LLM stage already emits an input-derived structural inventory, downstream LLM validators must receive that inventory too, otherwise the pipeline can detect collapse later but still treat the original one-claim approval as authoritative.
