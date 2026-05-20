---
### 2026-05-20 | Lead Developer | Codex (GPT-5.5) | V2 W7-B2 Boundary/Verdict Product Runtime Owner Implementation
**Task:** Implement V2 W7-B2 strictly under `Docs/WIP/2026-05-20_V2_Slice_W7-B2_Boundary_Verdict_Product_Runtime_Owner_Review_Package.md` at package commit `7d229caf`, preserving unrelated work and avoiding product chain integration.

**Files touched:**
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-boundary-verdict-execution-owner.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-boundary-verdict-execution-provenance.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-boundary-verdict-execution-owner.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

**Key decisions:**
- Added one product-owned W7-B2 runtime owner, `runBoundaryVerdictExecutionDecision(...)`, that wraps existing core `runBoundaryVerdictExecutionRuntime(...)`.
- Added one process-local runtime-owned provenance marker for `BoundaryVerdictExecutionDecision`.
- Required W5 `boundedEvidenceExtraction` to be runtime-owned through existing W5 provenance and W6-C `sufficiencyAssessment` to be runtime-owned through W6-C2 provenance.
- Left W6-B `sufficiencyIntake`, W7-A, and W8-A as core decisions, with W7-B core validation authoritative.
- Loaded only `V2_BOUNDARY_VERDICT_EXECUTION` from `apps/web/prompts/claimboundary-v2.prompt.md`; no prompt/model/schema/UCM/gateway edits were made.
- Used Anthropic `generateText` with `maxRetries: 0`, frozen `boundary_verdict_execution` model-policy validation, hidden direct-text activation validation, sanitized provider failure mapping to W7-B `provider_unavailable`, and runtime ownership marking for every returned decision.
- Updated boundary guard allowlists only for the new owner/provenance pair and its approved prompt-file/provider SDK dependencies.

**Open items:**
- Product orchestrator wiring remains blocked.
- W6-C2-to-W7-B chain integration remains blocked until a later reviewed package.
- No live job or canary was run.
- No W8-B report wrapper, route, sink, chain artifact, public/default-admin projection, parser execution, EvidenceItem generation change, report/verdict/warning/confidence behavior, cache/SR/storage behavior, provider expansion, ACS/direct URL, V1 work, V1 cleanup, or cutover was added.

**Warnings:**
- W7-B2 duplicates the W7-B input packet projection locally only to render the approved prompt before entering the W7-B core runtime; core W7-B remains authoritative for parent validation, packet size validation, schema parsing, citation integrity, and no-store cache policy.
- `npm run debt:sensors` remains `advisory_warn` with known V2 source/test footprint, oversized boundary guard, docs footprint, net-mechanism, and consolidation-marker warnings.
- The boundary guard is now 92 tests and remains a known consolidation target.

**V2 SCORECARD IMPACT:**
- Quality dimension advanced: V2-Q4/V2-Q5 internal boundary/verdict execution reachability.
- Direct user/report value: none yet; public V2 remains blocked/precutover.
- Hidden-only value: W7-B can now be executed by a product-owned adapter in a later chain package.
- Cost/latency impact: no live cost measured; owner uses one Anthropic provider call on success and no provider SDK retries.
- Retirement or simplification unlocked: later chain integration can consume W6-C2 and W7-B2 directly instead of cloning provider/prompt logic.
- Scorecard risk: another hidden mechanism was added; bounded by package scope and boundary guard coverage.

**V2 RETIREMENT LEDGER IMPACT:**
- Rows touched: W7-B core remains semantic boundary/verdict execution owner; W7-B2 becomes product runtime ownership adapter; W7-A remains temporary contract-only scaffolding.
- Status changes: no ledger file changed.
- New mechanism owner: Lead Developer.
- Removal / merge trigger: later product-route chain integration must consume W7-B2 directly and must not add a parallel W7-B provider/prompt runner.
- Debt accepted: planned hidden runtime owner/provenance mechanism authorized by the package.

**Verification:**
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-boundary-verdict-execution-owner.test.ts` passed, 10 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution.test.ts` passed, 8 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts` passed, 92 tests. First run failed on guard-only allowlist expectations; classified as `keep` product patch / `amend` guard expectations, then reran clean.
- `npm run validate:v2-gates` passed.
- `node scripts/validate-v2-gate-register.mjs --self-test` passed.
- `npm run debt:sensors` completed with expected `advisory_warn`.
- `npm -w apps/web run build` passed; postbuild reseed reported `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged | Errors: 0`.
- `git diff --check` passed.
- Initial `git status --short --untracked-files=all` was clean; final status had only the W7-B2 changed/untracked files plus completion docs/index updates.

```text
DEBT-GUARD RESULT
Classification: missing-capability / planned-temporary-debt.
Chosen option: add one bounded product runtime owner and one process-local provenance marker.
Rejected path and why: product orchestrator wiring, chain integration, route/sink/artifact creation, W8-B report wrapping, prompt/model/config/schema/UCM/gateway edits, and W7-B core rewrites were either forbidden by the package or higher blast radius than the missing owner capability required.
What was removed/simplified: nothing removed; existing W7-B core remains authoritative and no duplicate route/sink/cache/public mechanism was added.
What was added: W7-B2 owner, W7-B2 provenance marker, focused owner tests, and guard allowlists/assertions.
Net mechanism count: increases by the package-approved owner/provenance marker only.
Budget reconciliation: touched only approved source/test files plus completion protocol docs; no flags, retries, fallbacks, public surfaces, storage, cache, SR, parser, W4-I imports, or chain runner appeared.
Verification: all required local tests, V2 gate checks, debt sensors, build, diff check, and status check completed as recorded above.
Debt accepted and removal trigger: planned hidden mechanism; later chain integration must consume W7-B2 directly instead of cloning provider-call or prompt-rendering logic.
Residual debt: W7-B2 remains unreachable from the product orchestrator until a later chain package; boundary guard size remains advisory debt.
```

**For next agent:** Start from the new owner/provenance files and focused test. Chain integration is still blocked; next package must wire W6-C2 and W7-B2 together without adding a chain artifact, route, sink, public projection, or cloned provider/prompt runner unless separately approved.

**Learnings:** Not appended to `Role_Learnings.md`; no reusable role-level gotcha beyond the already-known boundary guard size/owner pattern.
