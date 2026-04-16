### 2026-04-16 | LLM Expert | GitHub Copilot (GPT-5.4) | Bolsonaro Foreign Assessment Backstop Verification

**Task:** Strengthen the Bolsonaro foreign-assessment containment fix so foreign government reports cannot act as standalone contradiction evidence, then verify the result on a live approved-input rerun.

**Files touched:**
- `apps/web/prompts/claimboundary.prompt.md`
- `apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts`
- `Docs/AGENTS/Handoffs/2026-04-16_LLM_Expert_Bolsonaro_Foreign_Assessment_Backstop_Verification.md`
- `Docs/AGENTS/Agent_Outputs.md`

**Done:**
- Added a verdict-stage backstop in `apps/web/prompts/claimboundary.prompt.md:1157` so foreign government-issued country reports, monitoring reports, scorecards, and official assessments remain positional outputs and cannot count as independent high-probative contradiction without corroborating direct or neutral external evidence.
- Tightened `APPLICABILITY_ASSESSMENT` in `apps/web/prompts/claimboundary.prompt.md:1907` and `apps/web/prompts/claimboundary.prompt.md:1922` so official foreign-government publications are explicitly excluded from the "neutral external observer" bucket and are not upgraded to `contextual` merely because they summarize local sources or court filings.
- Locked both guardrails with prompt-contract tests in `apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts:268`, `apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts:554`, and `apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts:560`.
- Ran focused safe verification: `npm -w apps/web run test -- test/unit/lib/analyzer/verdict-prompt-contract.test.ts test/unit/lib/analyzer/research-extraction-stage.test.ts` passed with `106` tests green.
- Reseeded prompts with `npm -w apps/web run reseed:prompts`, updating the active `claimboundary` blob from `44c0926c...` to `af6ebf88...`.
- Submitted a fresh approved-input rerun with invite code `SELF-TEST`: job `ec9840ff97994392a7ea9784beb5d79a`.
- Verified the live rerun finished `SUCCEEDED` on prompt hash `af6ebf8871249aa3709da690d03c8b6e537d3cd56c4236b79fb816558d679ccc` with `LEANING-TRUE | 64.2 | 50`.
- Compared against prior bad rerun `a3ef4dafeefd4b55825f1cdd95a1e28e`: the old run had `9` `state.gov` evidence items with `7` cited in final verdict arrays; the new run has `4` `state.gov`-domain items and **zero** cited `state.gov` or other U.S.-like evidence IDs in final claim verdicts.

**Key decisions:**
- Kept the repair LLM-driven and prompt-based rather than adding deterministic domain logic. That stays aligned with the repo rule that analytical text interpretation must not move into keyword or hardcoded heuristics.
- Added a verdict-stage corroboration rule instead of relying solely on applicability. The new evidence shows applicability alone was not a reliable single point of containment.
- Verified with the exact Captain-approved Bolsonaro fair-trial input rather than a synthetic probe.

**Open items:**
- No commit has been created for this prompt/test change.
- Four `state.gov`-domain items still survive in the final evidence pool on `ec9840ff97994392a7ea9784beb5d79a`, all non-seeded and all attached to `AC_03`; none are cited.

**Warnings:**
- One surviving `state.gov`-domain item on `ec9840ff97994392a7ea9784beb5d79a` is still classified `direct` while carrying neutral trial-description text. That looks more like source-url attribution noise or wrapper contamination than a pure applicability miss. If foreign-government material starts getting cited again, inspect source attribution/extraction before assuming the applicability prompt regressed.
- The visible contamination is removed from final verdict citations, but the evidence pool still contains a small uncited foreign-government residue. Treat this as reduced risk, not absolute elimination.

**For next agent:**
- If you continue hardening this area, start with the surviving `state.gov` items on job `ec9840ff97994392a7ea9784beb5d79a` (`EV_1776349873152`, `EV_1776349873153`, `EV_1776349873155`, `EV_1776349873156`) and inspect whether their source URLs were mis-attributed during fetch/extraction.
- If a future run again cites foreign-government material, compare it first against `ec9840ff97994392a7ea9784beb5d79a` and `a3ef4dafeefd4b55825f1cdd95a1e28e` to distinguish "residual uncited evidence" from "actual verdict contamination."

**Learnings:** Appended to Role_Learnings.md? no
