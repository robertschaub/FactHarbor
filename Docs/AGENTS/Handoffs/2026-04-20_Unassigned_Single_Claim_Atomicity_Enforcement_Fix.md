---
### 2026-04-20 | Unassigned | Codex (GPT-5) | Single-Claim Atomicity Enforcement Fix
**Task:** Stop the exact Captain-defined Bundesrat input from being accepted as one non-atomic claim after the earlier repair-pass fix.
**Files touched:** `apps/web/prompts/claimboundary.prompt.md`; `apps/web/src/lib/analyzer/claim-extraction-stage.ts`; `apps/web/src/lib/analyzer/types.ts`; `apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts`; `apps/web/test/unit/lib/analyzer/claim-contract-validation.test.ts`; `Docs/AGENTS/index/stage-map.json`; `Docs/AGENTS/index/stage-manifest.json`.
**Key decisions:** Added a dedicated `CLAIM_SINGLE_CLAIM_ATOMICITY_VALIDATION` prompt section plus a new Stage-1 single-claim audit that runs only after a normal contract pass on a one-claim output. Wired that audit into the initial validation, retry validation, repair validation, and final accepted-claims refresh path. Followed with a stricter interpretation fix in `evaluateSingleClaimAtomicityValidation(...)`: any explicit non-atomic judgment or any detected bundled coordinated-branch finding now forces retry, even if the model emits inconsistent booleans. This was necessary because the first clean rerun on `adff6e0b` still produced one bundled claim. The successful clean runtime is `4bdef2c1f083be3cdd5373aa2ead9ec63aa70611`.
**Open items:** The exact Bundesrat benchmark now splits correctly, but stability is only confirmed on one clean rerun after the contradiction-guard follow-up. If this family matters as a benchmark gate, run the same input multiple times on `4bdef2c1` or its descendant before closing the issue. If regressions recur, inspect whether the atomicity validator itself needs richer structured output about branch anchors rather than a boolean-only judgment.
**Warnings:** Commit hooks regenerate `Docs/AGENTS/index/stage-map.json` and `stage-manifest.json`, which dirties the tree after code commits. For clean commit-linked job runs, commit those generated index updates too and restart again before submitting jobs. Prompt edits under `apps/web/prompts/` still require `npm -w apps/web run reseed:prompts` or an equivalent restart path that reseeds prompts.
**For next agent:** The relevant runtime path is `apps/web/src/lib/analyzer/claim-extraction-stage.ts`, especially `shouldRunSingleClaimAtomicityValidation(...)`, `evaluateSingleClaimAtomicityValidation(...)`, `applySingleClaimAtomicityValidation(...)`, and `validateSingleClaimAtomicity(...)`. The prompt contract lives in `apps/web/prompts/claimboundary.prompt.md` under `CLAIM_SINGLE_CLAIM_ATOMICITY_VALIDATION`. Clean runtime validation sequence:
- First follow-up clean rerun on `adff6e0be7960b1e80a09c9e991430a41bd43ec7`: job `1bd1493808044dd583b4a0933dd11f4b` still accepted one bundled claim.
- Contradiction-guard fix committed in `f287e427`, then clean runtime commit `4bdef2c1f083be3cdd5373aa2ead9ec63aa70611`.
- Successful rerun: job `8537313effa74c98a0945636c69dbd42`, `LEANING-TRUE 58 / 74`, `claimCount: 2`, `gate1Stats.total: 2`, `stageAttribution: "retry"`.
**Learnings:** no

#### Verification
- `npm -w apps/web exec vitest run test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts test/unit/lib/analyzer/claim-contract-validation.test.ts test/unit/lib/analyzer/repair-anchor-selection.test.ts`
- `npm -w apps/web exec vitest run test/unit/lib/analyzer/claim-contract-validation.test.ts test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts`
- `npm -w apps/web run build`
- Clean restarted rerun of `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben`

#### Outcome
- `AC_01`: `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor das Volk darüber entschieden hat.`
- `AC_02`: `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor das Parlament darüber entschieden hat.`
- Final contract summary on the successful run explicitly says the extraction correctly decomposed the input into two separately verifiable branches while preserving the shared predicate and modifier.
