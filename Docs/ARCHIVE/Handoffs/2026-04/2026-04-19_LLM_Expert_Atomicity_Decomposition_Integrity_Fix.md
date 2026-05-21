---
### 2026-04-19 | LLM Expert | Codex (GPT-5) | Atomicity Decomposition Integrity Fix
**Task:** Replace the failed exclusivity/uniqueness atomicity fix after job `edbfd9e61b154db98ec6b3199a6bf987` still produced a verbatim whole-input "Atomic Claim" plus narrower sub-claims for `Die Schweiz ist das einzige wohlhabende Land Europas ohne eine einzige unabhängige Faktencheck-Organisation`.
**Files touched:** `apps/web/prompts/claimboundary.prompt.md`, `apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts`, `Docs/AGENTS/Handoffs/2026-04-19_LLM_Expert_Atomicity_Decomposition_Integrity_Fix.md`, `Docs/AGENTS/Agent_Outputs.md`
**Key decisions:** The prior fix strategy was wrong in shape: the dedicated `Exclusivity/uniqueness override` still let the model keep the whole comparison sentence as one "subject-specific proposition" and then add narrower claims beside it. I removed that override from `CLAIM_EXTRACTION_PASS1` and `CLAIM_EXTRACTION_PASS2` and replaced it with a stricter generic decomposition-integrity contract. The new prompt now says: (1) `single_atomic_claim` must NOT be used when truth depends on both a proposition about the named subject and a separate proposition about the rest of a comparison class, (2) `multi_assertion_input` explicitly includes that structure, (3) when more than one claim is emitted, each must be a proper sub-assertion, and the model must NOT keep a whole-input restatement alongside narrower claims, and (4) `CLAIM_CONTRACT_VALIDATION` must fail any decomposed set that contains the whole proposition plus one of its parts. This uses the existing claim-contract retry loop instead of adding new deterministic code.
**Open items:** No fresh live rerun of the Swiss input was executed after this replacement fix. The motivating failure job used prompt hash `8298884f5ede...`; the new active prompt hash is `9696f877d56f...`. Runtime confirmation is still pending on a new job.
**Warnings:** `npm -w apps/web run reseed:prompts` printed `claimboundary skipped (unchanged)` even though the active prompt hash did advance to `9696f877d56f...` and direct `config.db` inspection confirms the new wording is active. Treat the DB check as authoritative, not the console wording from that script.
**For next agent:** Start with [claimboundary.prompt.md](/c:/DEV/FactHarbor/apps/web/prompts/claimboundary.prompt.md) in `CLAIM_EXTRACTION_PASS1`, `CLAIM_EXTRACTION_PASS2`, and `CLAIM_CONTRACT_VALIDATION`, plus [claim-extraction-prompt-contract.test.ts](/c:/DEV/FactHarbor/apps/web/test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts). The new contract is "proper sub-assertions only"; the old `Exclusivity/uniqueness override` text is gone. The concrete regression proof is in job `edbfd9e61b154db98ec6b3199a6bf987`, where `understanding.atomicClaims.AC_01.statement` was byte-identical to the full input while `AC_02` and `AC_03` were narrower propositions.
**Learnings:** no

## Verification

- `npm -w apps/web run test -- test/unit/lib/analyzer/claim-extraction-prompt-contract.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer/prompt-frontmatter-drift.test.ts`
- `npm -w apps/web run reseed:prompts`
- `powershell -ExecutionPolicy Bypass -File scripts/restart-clean.ps1`
- Health: `http://localhost:3000/api/health` → `200`, `http://localhost:5000/swagger` → `200`

## Runtime state

- Previous failing job hash: `8298884f5ede80863fe2a9195cfb4d33aec0aa86f26c0b1c1f8f8f3a5127ff0f`
- New active `claimboundary` hash: `9696f877d56f8e81c87fad5f667bad1179812b91b4428178738d90b446cf4598`
- Active hash confirmed directly from `apps/web/config.db`
- Services restarted after reseed
