### 2026-04-19 | LLM Expert | Codex (GPT-5) | Claim-Extraction Atomicity Review

**Task:** Review the prompt-only atomicity change in `apps/web/prompts/claimboundary.prompt.md` and the focused contract update in `apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts`, with special attention to whether `first`/`last` belong inside the exclusivity override.

**Files touched:**
- `Docs/AGENTS/Handoffs/2026-04-19_LLM_Expert_Claim_Extraction_Atomicity_Review.md`
- `Docs/AGENTS/Agent_Outputs.md`

**Key decisions:**
- Approve the narrowed override. `sole` / `only` / `unique` claims do bundle two independently verifiable propositions at Stage 1: the subject-level property claim and the class-wide no-other-member claim.
- Keep `first` / `last` outside this override by default. Those are primarily ordering/ranking truth conditions and should usually remain one atomic claim unless the input itself adds a second independent assertion.
- Keep the focused contract test. It correctly locks the intended semantic boundary between uniqueness decomposition and ordering preservation.

**Open items:**
- None for this review.

**Warnings:**
- If future prompt edits re-broaden this override to `first` / `last`, they should be treated as a semantic contract change, not a wording cleanup.
- Inputs that explicitly combine ordering and uniqueness (for example, "the first and only ...") still need careful handling so Stage 1 preserves both truth conditions without creating a verbatim full-input pseudo-claim.

**For next agent:**
- The approved contract is in `apps/web/prompts/claimboundary.prompt.md` at the Pass 1 and Pass 2 classification override bullets. The supporting guard test is in `apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts`.
- If this area is revisited, the main review question is not "can `first` be rewritten as two propositions?" but "does Stage 1 preserve the user’s ranking truth condition more faithfully as one atomic claim or as two downstream verdict targets?"

**Learnings:** Appended to Role_Learnings.md? no
