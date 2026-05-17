---
roles: [Lead Developer]
topics: [v2, x7-q, claim-understanding, language-metadata, implementation]
files_touched:
  - apps/web/prompts/claimboundary-v2.prompt.md
  - apps/web/src/lib/analyzer-v2/claim-understanding/schemas.ts
  - apps/web/test/fixtures/analyzer-v2/schemas/claim-contract-v2.schema.json
  - apps/web/test/unit/lib/analyzer-v2/claim-understanding/prompt-contract.test.ts
  - apps/web/test/unit/lib/analyzer-v2/claim-understanding/claim-contract.test.ts
  - apps/web/test/unit/lib/analyzer-v2/claim-understanding/model-adapter.test.ts
  - apps/web/test/unit/lib/analyzer-v2/claim-understanding/runtime-stage.test.ts
  - apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/input-envelope.test.ts
  - apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/preexecution-observation.test.ts
  - apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts
  - Docs/STATUS/Current_Status.md
  - Docs/STATUS/Backlog.md
  - Docs/AGENTS/Agent_Outputs.md
  - Docs/AGENTS/Handoffs/2026-05-17_Lead_Developer_V2_X7-Q_Language_Metadata_Repair_Implementation.md
  - Docs/AGENTS/index/handoff-index.json
---

# Lead Developer Handoff: V2 X7-Q Language-Metadata Repair Implementation

### 2026-05-17 | Lead Developer | Codex (GPT-5.5) | V2 X7-Q Claim Understanding Language-Metadata Repair

**Task:** Implement the deputy-approved X7-Q package after X7-P exposed accepted direct-text Claim Understanding carrying `und` language metadata into X7-O/Query Planning prerequisites.
**Approval/source package:** `Docs/WIP/2026-05-17_V2_Slice_X7-Q_Claim_Understanding_Language_Metadata_Repair_Package.md`, committed at `7d8ba8a9`, plus Captain prompt authorization in conversation on 2026-05-17: `Prompt implementation authorized.`
**Files touched:** listed in frontmatter.
**Key decisions:** Amended the existing Claim Understanding contract boundary rather than adding a downstream fallback. The prompt now instructs direct-input accepted outputs to provide concrete non-`und` source-language metadata, inferring it with LLM judgment from direct input when the seed is `und`, without translation or English-only assumptions. `ClaimContractSchema` now rejects direct-input blank/`und` language metadata and rejects mismatched direct-input language fields. The ClaimContract JSON schema fixture mirrors blank/`und` rejection for direct input.
**Verifier alignment:** The broad Claim Understanding suite exposed one obsolete hidden-runtime accepted-result fixture whose default provider output still used `und`; that test fixture was amended to emit a concrete language. Runtime input frames may still carry `und` from the submitted context; accepted provider output may not.
**Open items:** X7-Q authorizes no live job. A post-repair X7-P rerun needs a separate reviewed execution package after commit and runtime refresh.
**Warnings:** Do not add deterministic language detection. Do not make X7-O or Query Planning repair language metadata downstream. Do not run live jobs under X7-Q.

## Verification

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding/prompt-contract.test.ts test/unit/lib/analyzer-v2/claim-understanding/claim-contract.test.ts test/unit/lib/analyzer-v2/claim-understanding/model-adapter.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/input-envelope.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/preexecution-observation.test.ts test/unit/lib/analyzer-v2/pipeline-shell.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` - PASS, 7 files / 137 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding/claim-contract.test.ts` - PASS, 1 file / 24 tests after JSON schema strict-mode warning cleanup.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/claim-understanding` - PASS, 9 files / 95 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` - PASS, 76 files / 550 tests.
- `npm -w apps/web run build` - PASS.
- `npm run validate:v2-gates` - PASS.
- `node scripts/validate-v2-gate-register.mjs --self-test` - PASS.
- `git diff --check` - PASS.

## Debt Guard Result

```text
DEBT-GUARD RESULT
Classification: incomplete-existing-mechanism
Chosen option: amend the existing V2 Claim Understanding prompt and ClaimContract schema boundary
Rejected path and why: downstream X7-O/Query Planning fallback rejected because it would pass the observer while leaving the real input-envelope precondition divergent
What was removed/simplified: none; the invalid accepted-output path is now rejected at the contract boundary
What was added: prompt guidance, structural schema refinement, JSON schema fixture constraints, focused schema/retry/downstream tests, and a boundary guard against deterministic language-detection dependencies/helpers
Net mechanism count: unchanged
Budget reconciliation: implementation stayed in the approved source/prompt/test surface except for one runtime-stage test fixture alignment required by the broad Claim Understanding verifier; no runtime fallback, flag, provider, cache, source, public, report, verdict, or V1 mechanism was added
Verification: focused X7-Q tests, Claim Understanding slice, Analyzer V2 slice, build, V2 gate validator, self-test, and diff check passed
Debt accepted and removal trigger: none
Residual debt: post-repair product-route behavior is unproven until a separate reviewed live-smoke package runs on a committed/refreshed runtime
```
