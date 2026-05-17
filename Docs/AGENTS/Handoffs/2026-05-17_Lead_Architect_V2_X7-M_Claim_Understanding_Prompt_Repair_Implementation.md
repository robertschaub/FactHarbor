# Lead Architect Handoff: V2 X7-M Claim Understanding Prompt/Contract Repair Implementation

### 2026-05-17 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 X7-M Claim Understanding Prompt/Contract Repair Implementation

**Task:** Implement the Captain-authorized X7-M Claim Understanding prompt/contract repair.
**Files touched:** `apps/web/prompts/claimboundary-v2.prompt.md`, `apps/web/test/unit/lib/analyzer-v2/claim-understanding/prompt-contract.test.ts`, `apps/web/test/unit/lib/analyzer-v2/claim-understanding/claim-contract.test.ts`, `Docs/WIP/2026-05-17_V2_Slice_X7-M_Claim_Understanding_Prompt_Contract_Repair_Approval_Package.md`, `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Agent_Outputs.md`, `Docs/AGENTS/index/handoff-index.json`.
**Key decisions:** Amended the existing clean-room Claim Understanding prompt contract instead of adding runtime repair logic. The strict schemas remain unchanged and flat dotted-key output remains invalid. `V2_CLAIM_UNDERSTANDING_GATE1` now gives schema-exact nested direct-input and prepared-snapshot `ClaimContract` skeletons, explicitly forbids literal flat dotted keys, and clarifies topic-neutral externally assessable direct-question handling without deciding truth, fairness, legality, compliance, or confidence.
**Open items:** Create a separate reviewed post-repair direct-text smoke package before any live jobs. X3-B Query Planning prompt/frontmatter alignment remains a separate blocked prompt gate.
**Warnings:** Unrelated unstaged X7-J route/test changes exist in the worktree and were excluded from X7-M. Do not stage them with this package unless separately reviewed. Do not run live jobs under X7-M.
**For next agent:** Stage only the X7-M prompt/test/docs/index files. If a smoke is needed, draft a separate execution package, commit first, refresh runtime/reseed state, then use only Captain-approved inputs.
**Learnings:** Not appended to `Role_Learnings.md`; this is slice-specific implementation context.

## Authorization And Review

Captain authorization was explicit in conversation on 2026-05-17:

```text
Prompt implementation authorized.
```

Final prompt-diff review:

- LLM Expert: APPROVE.
- Architect: APPROVE.
- Code/package: APPROVE after adding and testing the `fairness` wording from the package.

## Verification

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding/prompt-contract.test.ts test/unit/lib/analyzer-v2/claim-understanding/claim-contract.test.ts test/unit/lib/analyzer-v2/claim-understanding/model-adapter.test.ts` - PASS, 3 files / 39 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding` - PASS, 9 files / 86 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` - PASS, 74 files / 523 tests.
- `npm -w apps/web run build` - PASS.
- `npm run validate:v2-gates` - PASS.
- `node scripts/validate-v2-gate-register.mjs --self-test` - PASS.

## Debt Guard Result

```text
DEBT-GUARD RESULT
Classification: incomplete-existing-mechanism
Chosen option: amend the existing V2 Claim Understanding prompt contract and focused contract tests
Rejected path and why: schema relaxation/runtime repair rejected because it would hide prompt-output drift and weaken strict V2 contracts
What was removed/simplified: dotted-field accepted-contract bullet guidance was replaced by explicit nested schema guidance
What was added: prompt/test assertions for nested ClaimContract guidance, generic direct-question handling, canary-topic exclusion, and flat dotted-key rejection
Net mechanism count: unchanged
Budget reconciliation: actual diff stayed within approved prompt/test/docs envelope; no new runtime branch, fallback, flag, schema, route, model, cache, or artifact mechanism
Verification: focused tests, Claim Understanding slice, Analyzer V2 slice, build, and V2 gate validators passed
Debt accepted and removal trigger: none
Residual debt: post-repair live behavior is unproven until a separate reviewed smoke package runs committed/refreshed runtime
```
