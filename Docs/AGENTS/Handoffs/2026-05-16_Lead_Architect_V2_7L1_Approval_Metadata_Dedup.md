# Lead Architect Handoff: V2 7L-1 Approval Metadata Deduplication

## Summary
- Addressed code reviewer F1 by replacing three independently defined 7L-1 Captain approval records with one shared V2-owned approval constant.
- Addressed code reviewer F2 by documenting that the 7L-1 model-policy validator is intentionally exact and must be updated with tests whenever the approved policy changes.
- Preserved the current fail-closed execution posture: no provider calls, no live jobs, no cache IO, no public exposure, and no approval flips beyond the already approved 7L-1 metadata.

## Files Changed
- `apps/web/src/lib/analyzer-v2/gateway/approval-records.ts`
- `apps/web/src/lib/analyzer-v2/gateway/policy.ts`
- `apps/web/src/lib/analyzer-v2/gateway/model-policy-registry.ts`
- `apps/web/src/lib/analyzer-v2/gateway/cache-policy-registry.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/query-planning/runtime.ts`
- `apps/web/test/unit/lib/analyzer-v2/gateway/policy.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/gateway/cache-governance.test.ts`

## Debt-Guard Compact Result
- Path: Compact.
- Symptom: duplicated approval metadata plus undocumented exact model-policy validator maintenance constraint.
- Existing mechanism: V2 gateway approval, model, cache registries and query-planning runtime validator.
- Mechanism touched: gateway approval metadata and query-planning runtime exact validator.
- Prior attempt: none.
- Lowest-complexity fix: shared V2 approval-record constant plus local maintenance comment near the exact validator.
- Rejected path: broad registry redesign, runtime approval redesign, or UCM activation changes.
- Verifier: focused Analyzer V2 tests, full Analyzer V2 unit slice, web build, and whitespace checks.
- Net mechanisms: unchanged execution behavior with reduced metadata duplication.

## Verification
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/gateway/policy.test.ts test/unit/lib/analyzer-v2/gateway/cache-governance.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/runtime.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts`
  - Passed: 4 files, 71 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2`
  - Passed: 39 files, 286 tests.
- `npm -w apps/web run build`
  - Passed; postbuild config/prompt reseed reported unchanged state.
- `git diff --check`
  - Passed.

## Warnings
- The exact 7L-1 model-policy validator remains intentionally brittle by design. Future approved policy changes must update the validator and tests together.
- Source execution, live jobs, product wiring, cache IO, and public V2 exposure remain blocked by the active gate sequence.
- `Docs/AGENTS/Agent_Outputs.md` already had an unrelated local modification and was not used for this completion record.

## Learnings
- V2 approval metadata should be single-sourced inside the V2 gateway boundary to avoid drift across prompt, model, and cache registries.
- Exact approval validators need local maintenance notes because brittleness is a safety property here, not an accidental implementation detail.
