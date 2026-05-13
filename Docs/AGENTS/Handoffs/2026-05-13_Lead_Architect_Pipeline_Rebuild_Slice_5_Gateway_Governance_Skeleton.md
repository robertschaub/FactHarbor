---
### 2026-05-13 | Lead Architect | Codex (GPT-5) | Pipeline Rebuild Slice 5 Gateway Governance Skeleton
**Task:** Add the deferred prompt/config/model gateway skeleton, cache governance contract, and dead/quarantine classification ledger after the V2 damaged envelope slice.

**Files touched:**
- `apps/web/src/lib/analyzer-v2/gateway/types.ts`
- `apps/web/src/lib/analyzer-v2/gateway/policy.ts`
- `apps/web/src/lib/analyzer-v2/gateway/cache-governance.ts`
- `apps/web/src/lib/analyzer-v2/gateway/surface-ledger.ts`
- `apps/web/test/unit/lib/analyzer-v2/gateway/policy.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/gateway/cache-governance.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/gateway/surface-ledger.test.ts`

**Key decisions:**
- Deputy Franklin recommended the smallest safe scope as an offline V2 gateway governance skeleton. Claude Opus 4.6 approved and added two required guardrails: ledger exhaustiveness against current V1 stage surfaces, and a blocked-to-executable approval guard.
- The gateway registry is V2-local and static. All prompt/model/cache-backed tasks are `blockedUntilPromptApproved`; structural acquisition remains `notImplemented`.
- `canExecuteAnalyzerV2GatewayTask` requires executable status plus approved prompt, model, and cache policies. Tests prove a status flip alone is insufficient.
- Cache governance is pure: required dimensions cover prompt profile/section/content hash, model task/provider/model/temperature, output schema, config snapshot, result schema, input identity, and current-date bucket. Source-aware policy also requires source identity.
- The surface ledger classifies every current V1 analyzer stage from `Docs/AGENTS/index/stage-map.json`, plus quarantine/defer candidates (`CLAIM_GROUPING`, `orchestrated`, `model-tiering`, weak config knobs, hardcoded call-site model parameters).
- No prompt text, config defaults/schemas, model resolver, prompt loader, cache runtime, V1 analyzer stages, API, UI, or live-job paths were changed. No live jobs used; budget remains 8.

**Open items:**
- The next implementation slice should choose the first real V2 stage contract, likely claim understanding/Gate 1, but still start with prompt/config/model policy approval before any prompt text or runtime LLM call.
- Duplicate JSON-key detection and actual dead-knob enforcement are still future config-contract work; this slice only records the candidate ledger.
- Runtime gateway integration is intentionally absent. The V2 orchestrator still returns the damaged shell envelope.

**Warnings:**
- Ledger classifications are candidates/contracts only. Do not delete, quarantine, or migrate live mechanisms from this slice without deputy approval and focused validation.
- The prompt section IDs in `policy.ts` are V2 placeholder contract IDs, not approved prompt sections. Do not create or use them without Captain approval and LLM Expert review.
- `model-tiering.ts` and `orchestrated` remain live for non-V2 callers; the ledger marks them as candidates, not dead code.

**For next agent:**
- Start in `apps/web/src/lib/analyzer-v2/gateway/policy.ts` and `cache-governance.ts` before adding any V2 stage that renders a prompt or calls a model.
- Preserve the tests in `apps/web/test/unit/lib/analyzer-v2/gateway/`; they are the guardrail that prevents silent V1 surface gaps and unapproved executable tasks.
- If moving toward V2 claim understanding, first define approved prompt/model/cache policies and schema fixtures; do not edit `apps/web/prompts/**` without explicit Captain approval.

**Verification:**
- `npm -w apps/web test -- --run test/unit/lib/analyzer-v2/gateway/policy.test.ts test/unit/lib/analyzer-v2/gateway/cache-governance.test.ts test/unit/lib/analyzer-v2/gateway/surface-ledger.test.ts`
- `npx tsc --noEmit --pretty false --project apps/web/tsconfig.json`
- `npm -w apps/web run build`
- `npm test`
- `git diff --check`
- Scope guard: no diffs under prompts, API, UI/app routes, public pipeline variant, V1 analyzer stages, V1 prompt/model/config loader/resolver files, or config defaults.

**Learnings:** Not appended to `Role_Learnings.md`; the reusable point is already encoded in tests: gateway executability must be tied to approved prompt/model/cache policies, not a status string.
