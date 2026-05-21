---
### 2026-05-21 | Lead Developer | Codex (GPT-5.5) | V2 W6-C4 Sufficiency Prompt Repair Implementation
**Task:** Implement the approved W6-C4 prompt-contract repair from `Docs/WIP/2026-05-20_V2_Slice_W6-C4_Sufficiency_Prompt_Contract_Repair_Package.md`.
**Files touched:** `apps/web/prompts/claimboundary-v2.prompt.md`; `apps/web/src/lib/analyzer-v2/evidence-lifecycle/task-contracts/schemas.ts`; `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`.
**Key decisions:** Amended only the `V2_EVIDENCE_SUFFICIENCY_GATE` prompt section to enumerate existing schema literals for `missingEvidenceDimensions[].dimension`, `missingEvidenceDimensions[].materiality`, task-event fields/literals, blocked reasons, and damaged reasons. Exported existing Zod enum constants so the prompt-contract test derives its expected literals from schema-owned definitions. No schema literals, validation behavior, model policy, gateway policy, UCM, runtime activation, provider seam, public surface, or retry behavior changed.
**Open items:** One W6-C4 product-route canary remains pending after this implementation commit, runtime refresh, runtime hash match, W8-B route preflight, and clean git status.
**Warnings:** Prompt repair is intentionally schema-focused and topic-neutral. Do not add canary-domain examples or topic-specific wording. If the canary still fails with the same eight W6-C3 paths, or fails with broader schema drift, stop after the single canary and prepare a new reviewed package.
**For next agent:** Canary input remains exactly `Using hydrogen for cars is more efficient than using electricity`. A pass means W6-C no longer repeats the W6-C3 issue paths; if it advances downstream, document the new stop-line. If W6-C accepts, W6-C3 diagnostics should become eligible for removal/folding in a follow-up package.
**Learnings:** Not appended to `Role_Learnings.md`; package-specific.

## Verification

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/sufficiency/sufficiency-assessment.test.ts` - passed, 2 files / 15 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts` - passed, 1 file / 94 tests.
- `npm run validate:v2-gates` - passed.
- `node scripts/validate-v2-gate-register.mjs --self-test` - passed.
- `npm run debt:sensors` - completed with known `advisory_warn`.
- `npm -w apps/web run build` - passed.
- `npm run index` - passed.
- `git diff --check` - passed.

## DEBT-GUARD RESULT

```text
Classification: prompt-contract bugfix / incomplete-existing-mechanism
Chosen option: amend existing W6-C prompt contract and add schema-derived prompt drift tests.
Rejected path: schema relaxation, alias normalization, retry/repair loops, UCM/model/gateway changes, or new runtime code.
What was removed/simplified: none.
What was added: prompt-contract literals in W6-C section; export-only schema enum access for tests; one prompt-contract drift test.
Net mechanism count: unchanged for runtime; small test-only verifier increase.
Budget reconciliation: implementation stayed inside approved W6-C4 envelope.
Verification: focused W6-C prompt/runtime tests, boundary guard, V2 gates, gate-register self-test, debt sensors, build, index, and whitespace checks passed.
Debt accepted and removal trigger: none for runtime; W6-C3 temporary diagnostics remain removable/foldable after a successful canary proves W6-C no longer needs them.
Residual debt: known V2 footprint, boundary guard, docs volume, and debt-sensor advisory warnings remain.
```
