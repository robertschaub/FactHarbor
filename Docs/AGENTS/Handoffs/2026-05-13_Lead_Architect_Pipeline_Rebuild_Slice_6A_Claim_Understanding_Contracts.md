---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Slice 6A Claim Understanding Contracts
**Task:** Add the first V2 Claim Understanding/Gate 1 contract slice without prompt text, runtime execution, V1 hot-path changes, API/UI changes, or live jobs.

**Files touched:**
- `apps/web/src/lib/analyzer-v2/claim-understanding/types.ts`
- `apps/web/src/lib/analyzer-v2/claim-understanding/prepared-snapshot.ts`
- `apps/web/src/lib/analyzer-v2/gateway/types.ts`
- `apps/web/src/lib/analyzer-v2/gateway/policy.ts`
- `apps/web/src/lib/analyzer-v2/gateway/cache-governance.ts`
- `apps/web/test/fixtures/analyzer-v2/README.md`
- `apps/web/test/fixtures/analyzer-v2/claim-contract-v2.fixture.json`
- `apps/web/test/fixtures/analyzer-v2/schemas/claim-contract-v2.schema.json`
- `apps/web/test/unit/lib/analyzer-v2/claim-understanding/claim-contract.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/claim-understanding/prepared-snapshot.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/gateway/policy.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/gateway/cache-governance.test.ts`

**Key decisions:**
- Deputy agents Franklin and Lorentz agreed that Claim Understanding/Gate 1 should start with contracts and a pure ACS prepared-snapshot migration before any prompt or model execution work.
- Claude Opus 4.6, acting as Senior Architect and LLM Expert, approved the slice as-is with no blocking amendments.
- The V2 `ClaimContract` schema is versioned as `v2.claim_contract.0` and fixture-backed with a Captain-defined German input used exactly as provided.
- `migratePreparedStage1SnapshotToClaimContract(...)` is structural only: it validates selected IDs, rejects duplicates and missing prepared claims, preserves selected-claim finality, and copies V1 prepared claim `statement` text unchanged.
- Invalid prepared snapshots produce a blocked migration with integrity events; the adapter does not attempt semantic repair.
- The gateway remains non-executable. `claim_understanding_gate1` now declares required prompt variables and a claim-understanding cache policy, but stays `blockedUntilPromptApproved`.
- No prompt text, prompt profile, prompt loader, model resolver, config defaults/schemas, V1 analyzer stage, API route, UI surface, or live-job path was changed. No live jobs used; budget remains 8.

**Open items:**
- Slice 6B must not edit prompts or enable V2 claim-understanding execution until Captain explicitly approves prompt-change work and LLM Expert review is completed.
- Future direct-input Claim Understanding may need a separate cache policy because `acsSnapshotHash` is required for the current ACS migration path.
- Before execution approval, consider promoting `adapterVersion` from optional to required in the claim-understanding cache policy.
- Document or preserve the current migration interpretation: a V1 prepared snapshot without `overallPass === true` maps to Gate 1 `blocked`, not `failed`; only native V2 Gate 1 should assert failure.

**Warnings:**
- The adapter is a compatibility bridge, not the native V2 understanding implementation. Do not expand it into semantic claim selection or repair logic.
- The `V2_CLAIM_UNDERSTANDING_GATE1` prompt section ID is still a placeholder governance contract. Do not add or use that prompt without explicit Captain approval.
- The V2 orchestrator still returns the damaged shell envelope; this slice does not make V2 reports analytically usable.

**For next agent:**
- Start from `apps/web/src/lib/analyzer-v2/claim-understanding/types.ts`, `prepared-snapshot.ts`, and the gateway tests before adding any native claim-understanding implementation.
- Keep the ACS migration path as a structural adapter: selected claim IDs are Captain/user-selected inputs carried forward, not re-derived.
- The next decision boundary is prompt approval for Slice 6B. Bring back the deputy team plus LLM Expert before editing `apps/web/prompts/**`, prompt profiles, or model policies.

**Verification:**
- `npm -w apps/web test -- --run test/unit/lib/analyzer-v2/claim-understanding/claim-contract.test.ts test/unit/lib/analyzer-v2/claim-understanding/prepared-snapshot.test.ts test/unit/lib/analyzer-v2/gateway/policy.test.ts test/unit/lib/analyzer-v2/gateway/cache-governance.test.ts`
- `npx tsc --noEmit --pretty false --project apps/web/tsconfig.json`
- `npm -w apps/web run build`
- `npm test`
- `git diff --check`
- Scope guard: no diffs under prompts, API, UI/app routes, public pipeline variant, V1 analyzer stages, V1 prompt/model/config loader/resolver files, or config defaults.

**Learnings:** Not appended to `Role_Learnings.md`; the reusable architectural point is captured in tests and this handoff: V2 stage contracts can be advanced safely before prompt execution only when the gateway remains blocked and migration adapters stay structural.
