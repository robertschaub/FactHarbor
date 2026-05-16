# Lead Architect Handoff: V2 X3-B Query-Planning Prompt Frontmatter/Text Approval Package

---
### 2026-05-17 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 X3-B Query-Planning Prompt Frontmatter/Text Approval Package

**Task:** Prepare a reviewed docs-only approval package for the remaining X3-A query-planning prompt/frontmatter drift.

**Files touched:**
- `Docs/WIP/2026-05-17_V2_Slice_X3-B_Query_Planning_Prompt_Frontmatter_Text_Approval_Package.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/STATUS/Backlog.md`
- `Docs/AGENTS/Agent_Outputs.md`
- `Docs/AGENTS/Handoffs/2026-05-17_Lead_Architect_V2_X3-B_Query_Planning_Prompt_Frontmatter_Text_Approval_Package.md`
- `Docs/AGENTS/index/handoff-index.json`

**Review result:**
- Architect reviewer: APPROVE after requiring explicit Captain approval before implementation and tightening prompt-surface registry authority.
- LLM Expert reviewer: APPROVE as prompt-governance approval for the exact proposed prompt/frontmatter/text alignment, conditional on Architect and Code/package approval.
- Code/package reviewer: APPROVE after adding docs-only completion requirements and gate-register traceability.
- Security/runtime reviewer: APPROVE with no required edits.

**Key decisions:**
- This package is docs-only and non-authorizing. It does not edit `apps/web/prompts/**`, source, tests, configs, schemas, models, or gateway/cache policies.
- X3-B implementation may begin only after explicit Captain approval of the quoted scope plus LLM Expert prompt approval/review and Architect scope acceptance. Architect or deputy acceptance alone is insufficient.
- The package permits only a narrow future alignment: frontmatter description, `requiredSections`, one query-planning input sentence, matching prompt-loader/test/register/registry metadata, and status/handoff files.
- The package keeps `variables` unchanged because query planning appends typed JSON packets through its loader rather than frontmatter `${...}` interpolation.
- Gate-register drift removal must point back to this X3-B package while preserving `registerGrantsExecution: false`, `liveJobEligibility: blocked`, and no prompt/model/cache approval flips.

**Warnings:**
- Do not treat this package as Captain approval to implement prompt edits.
- Do not use X3-B as authority for source acquisition execution, provider search/fetch, parser execution, product/public/live wiring, cache/SR/storage, EvidenceCorpus/evidence/report/verdict/confidence generation, ACS/direct URL, V1 reuse/cleanup, or 2D-C.
- Do not run live jobs for this package; no executable/live-smoke gate was approved.

**Verification:**
- `git diff --check` - passed after completion edits.
- `npm run validate:v2-gates` - passed after completion edits.
- `node scripts/validate-v2-gate-register.mjs --self-test` - passed after completion edits.
- `node scripts/build-index.mjs --tier=2 --tracked-only` - passed after staging the new handoff; index reports 567 handoffs.

**Debt-Guard Compact Result:**
- Chosen option: amend the staged package header formatting after `git diff --cached --check` reported trailing spaces.
- Net mechanism count: unchanged.
- Verification: staged whitespace check rerun after the amendment.
- Residual debt: none.

**For next agent:**
- If Captain explicitly approves the package wording, implement X3-B exactly under the package file envelope and stop on any semantic prompt change or new capability.
- If Captain approval is absent or ambiguous, do not implement prompts; choose a different reviewed low-risk gate or return for Captain decision.
