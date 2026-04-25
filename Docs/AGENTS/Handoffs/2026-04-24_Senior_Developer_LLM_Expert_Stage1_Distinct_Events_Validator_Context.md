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

**Key decisions:** First fixed the validator-context blind spot by giving the claim-contract and single-claim atomicity validators the same input-derived `distinctEvents` inventory that later triggers MT-5(C). Live rerun `b89e36c3f98f4df79ce2649643c1b2ad` then showed this was necessary but insufficient: MT-5(C) produced an expanded candidate, but contract revalidation rejected it and the old code continued with the original one-claim set. Dirty-worktree rerun `4f6acaf111d04c368a6da6b7753dfe1f` showed the fail-closed patch prevented a misleading verdict, but also exposed evidence contamination in recovery extraction: source-derived dates/titles leaked into claim text while the input's temporal anchor was dropped. The follow-up patch keeps one corrective MT-5(C) retry, fails closed instead of shipping the known-bad single-claim fallback, and now runs contract/contract-approved MT-5(C) correction retries input-only so Stage 1 repairs the user claim rather than copying preliminary-evidence details.

**Open items:** The SVP PDF `3328ed201dd744148678efc015d7c33a` is a separate broad-input Stage 1 quality failure. It was classified as `single_atomic_claim`, extracted five claims, and contract validation correctly failed because major thesis branches and the priority anchor were omitted. The current patch may help validators reason about input-derived structure, but it is not a full broad-article/PDF extraction redesign. Live reruns are still needed after the second patch is committed/restarted.

**Warnings:** Do not claim all Stage 1 quality issues are closed. The fix is deliberately narrow: it makes existing LLM validators see input-derived structural context, prevents unsafe fallback after rejected MT-5(C) expansion, and reduces preliminary-evidence contamination during correction retries. It does not lower contract validation, add deterministic keyword/regex branch detection, or bypass retry revalidation. A reviewer agent was requested but could not run because the account usage limit was reached.

**For next agent:** Primary root cause for `d1689df...` and `466c86...`: the initial contract validator and single-claim atomicity checks saw only the original input plus the near-verbatim one claim, approved it, then MT-5(C) generated a larger candidate but rejected it because the retry did not revalidate cleanly. The patch threads `distinctEventsContextJson` through `validateClaimContract()` and `validateSingleClaimAtomicity()`, tightens `CLAIM_CONTRACT_VALIDATION` and `CLAIM_SINGLE_CLAIM_ATOMICITY_VALIDATION`, improves MT-5(C) reprompt guidance, adds the corrective-retry/fail-closed branch when expanded MT-5(C) candidates fail validation, and changes fidelity-correction retries to input-only. Verification before first live rerun: focused prompt/contract/MT-5 tests, full `npm test`, and `npm -w apps/web run build` passed; first live rerun exposed the fallback gap. Verification after the fail-closed/input-only recovery patch: focused MT-5 tests passed; run full tests/build before committing if this handoff is picked up mid-turn.

**Learnings:** Not appended to `Role_Learnings.md`; durable learning captured here: when an upstream LLM stage already emits an input-derived structural inventory, downstream LLM validators must receive that inventory too, otherwise the pipeline can detect collapse later but still treat the original one-claim approval as authoritative.
