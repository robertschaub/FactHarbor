---
### 2026-04-27 | Senior Developer / LLM Expert | Codex (GPT-5) | Evidence Direction Prompt Refinement
**Task:** Integrate the LLM-expert debate on April 27 prompt-direction findings and implement the agreed bounded prompt change.
**Files touched:** `apps/web/prompts/claimboundary.prompt.md`; `apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts`; `apps/web/test/unit/lib/analyzer/verdict-prompt-contract.test.ts`.
**Key decisions:** Debate result was `MODIFY`: clarify the existing numeric-comparison direction contract instead of adding a numeric materiality threshold, schema change, runtime repair, or broad prompt rewrite. `EXTRACT_EVIDENCE` now states a positive direction procedure before exception-heavy rules; `APPLICABILITY_ASSESSMENT` mirrors the claim-local mapping rule. `VERDICT_GROUNDING_VALIDATION` was left unchanged because the reconciled finding did not justify changing its structural role.
**Open items:** No live LLM validation was run for this wording-only patch. If Captain wants behavioral proof, run an approved validation input after commit and service/prompt refresh.
**Warnings:** The prompt still contains repeated comparison-direction guidance from earlier fixes. This slice intentionally avoids deduplicating it because the verified issue was buried positive guidance, not an obsolete mechanism.
**For next agent:** Treat this as a prompt-contract clarification, not a new mechanism. Do not introduce a fixed percentage for `materially` without an explicit UCM/design decision; it would become a hidden analysis threshold.
**Learnings:** Not appended to `Role_Learnings.md`.

```text
DEBT-GUARD RESULT
Classification: incomplete-existing-mechanism.
Chosen option: amend existing prompt wording and tests.
Rejected path: numeric materiality threshold or broad rewrite, because that would add a hidden analysis parameter and widen the blast radius.
What was added: one positive numeric-comparison direction procedure, one mirrored claim-local direction paragraph, and prompt-contract assertions.
What was removed/simplified: no runtime code or prompt sections removed.
Net mechanism count: unchanged.
Debt accepted: existing repeated comparison-direction wording remains until a separate prompt-consolidation pass has live-verification backing.
```
