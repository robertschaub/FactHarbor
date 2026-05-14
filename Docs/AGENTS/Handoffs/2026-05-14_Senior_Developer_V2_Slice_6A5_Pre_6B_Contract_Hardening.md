---
### 2026-05-14 | Senior Developer | Codex worker (Halley) | V2 Slice 6A.5 Pre-6B Contract Hardening
**Task:** Implement the approved non-prompt Slice 6A.5 hardening before Claim Understanding prompt/model execution.
**Files touched:** `apps/web/src/lib/analyzer-v2/pipeline-input.ts`; `apps/web/src/lib/analyzer-v2/runner-ingress.ts`; `apps/web/src/lib/analyzer-v2/run-context.ts`; `apps/web/src/lib/analyzer-v2/result-envelope.ts`; `apps/web/src/lib/analyzer-v2/claim-understanding/types.ts`; `apps/web/src/lib/analyzer-v2/claim-understanding/prepared-snapshot.ts`; `apps/web/src/lib/analyzer-v2/gateway/types.ts`; `apps/web/src/lib/analyzer-v2/gateway/cache-governance.ts`; `apps/web/src/lib/analyzer-v2/gateway/policy.ts`; `apps/web/test/fixtures/analyzer-v2/schemas/claim-contract-v2.schema.json`; focused Analyzer V2 unit tests; `Docs/AGENTS/Agent_Outputs.md`; this handoff.
**Key decisions:** V2 runner ingress now carries the full ACS prepared snapshot seed. Run context no longer injects shell-only placeholder claim ids; the damaged shell envelope may still display `AC_V2_SHELL_01` when no selected claim exists. ACS migration fails closed on shell-placeholder ids. Claim Understanding cache governance supports ACS-backed and direct-input key paths. Gateway Claim Understanding output schema now maps directly to `v2.claim_contract.0`.
**Open items:** Slice 6B remains blocked until Captain prompt-change approval and LLM Expert review. No prompt text, prompt profile, model execution, API/UI behavior, live job, or expensive validation was added.
**Warnings:** Claim Understanding cache governance now has conditional ACS-hash requirements. Future runtime code must use the claim-understanding validator/builder or equivalent policy-aware path, not the base cache validator alone.
**For next agent:** Continue to Slice 6B only after Captain approval and LLM Expert review. Keep `npm -w apps/web run test -- test/unit/lib/analyzer-v2`, `npm -w apps/web run test -- test/unit/lib/internal-runner-v2-routing.test.ts`, `npm -w apps/web run build`, and `git diff --check` in the verifier set.
**Learnings:** Not appended; this was a slice implementation detail, not a reusable role learning.

```text
DEBT-GUARD RESULT
Classification: missing pre-6B contract hardening capability, with one amended shell-isolation mechanism.
Chosen option: amend existing V2 ingress/gateway contracts and add focused contract tests.
Rejected path: no revert of Slices 1-6A, no prompt/model execution, no parallel Claim Understanding path.
Net mechanism count: small increase for contract guards/tests only.
Verification: focused V2 tests, internal-runner V2 routing test, build, and diff check passed.
```
