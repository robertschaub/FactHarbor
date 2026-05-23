# 2026-05-23 - Lead Developer - HJ73 Durable Source-Chain Attribution

## Task

Implemented HJ73 under package
`Docs/WIP/2026-05-23_V2_HighJump_HJ73_Durable_Source_Chain_Attribution_Package.md`.
Scope stayed no-live and result-envelope/admin-diagnostics only.

## Summary

Added a small structural source-chain attribution helper at
`apps/web/src/lib/analyzer-v2/source-chain-attribution.ts`. The helper accepts
existing orchestrator-owned in-memory decisions and emits
`SourceChainAttributionSnapshot` with statuses, counts, hashes, lengths, redaction
flags, source-material structural refs, and a structural `lossPointCandidate`.

Amended `apps/web/src/lib/analyzer-v2/orchestrator.ts` to retain already-created
Query Planning, candidate network, source preview, Source Material, W4, W5, and
report-writer decisions for final projection. No new provider call, retry,
parser, cache/SR/storage, route, sink, table, public surface, or live job was
added.

Amended `apps/web/src/lib/analyzer-v2/result-envelope.ts` to attach the snapshot
as `adminDiagnostics.sourceChainAttribution`, outside `meta`, `input`, and
`warnings`. Public/default blocked V2 projection remains unchanged.

Updated API compatibility tests to prove blocked public V2 output omits
`adminDiagnostics` and admin raw output preserves it.

## Files Changed

- `apps/web/src/lib/analyzer-v2/source-chain-attribution.ts`
- `apps/web/src/lib/analyzer-v2/orchestrator.ts`
- `apps/web/src/lib/analyzer-v2/result-envelope.ts`
- `apps/web/test/unit/lib/analyzer-v2/source-chain-attribution.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/result-envelope-source-chain-attribution.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/pipeline-shell.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/orchestrator-w8b-product-chain.test.ts`
- `apps/api.Tests/Services/ResultCompatibilityTests.cs`
- `Docs/AGENTS/Handoffs/2026-05-23_Lead_Developer_HJ73_Source_Chain_Attribution.md`
- `Docs/AGENTS/Agent_Outputs.md`

## Validation

- PASS: `npm -w apps/web run test -- test/unit/lib/analyzer-v2/source-chain-attribution.test.ts test/unit/lib/analyzer-v2/result-envelope-source-chain-attribution.test.ts`
- PASS: `npm -w apps/web run test -- test/unit/lib/analyzer-v2/pipeline-shell.test.ts test/unit/lib/analyzer-v2/orchestrator-w8b-product-chain.test.ts`
- PASS: `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- PASS with equivalent locked-service workaround: `dotnet test apps/api.Tests --filter ResultCompatibilityTests --no-restore -p:BuildProjectReferences=false` ran 16 ResultCompatibility tests. The exact requested command failed because a running `FactHarbor.Api (21896)` process locked `apps/api/bin/Debug/net8.0/FactHarbor.Api.exe`.
- PASS after quarantining generated `.next/dev`: `npm -w apps/web run build`. First attempt failed in generated `.next/dev/types/routes.d.ts`; deleting only the generated `.next/dev` cache fixed the build.
- PASS/advisory: `npm run debt:sensors` returned `advisory_warn` with known V2 footprint, boundary guard size, docs footprint, debt-guard telemetry, and consolidation-marker warnings.

## V2 Scorecard Impact

V2-Q2, V2-Q3, and V2-Q10 advanced indirectly by making the next source/report
owner observable without spending live budget or adding a new hidden route
family. Direct user/report value remains indirect decision-quality value only.

## V2 Retirement Ledger Impact

Rows touched: V2-RL-004, V2-RL-021, V2-RL-024. No status changes. HJ73 reduces
reliance on process-local hidden route probing for HighJump diagnosis and adds
a bounded temporary admin diagnostic shape.

Removal / merge trigger: after a stable persisted run-ledger/report-result
diagnostic contract exists, or source-chain ownership becomes directly visible
in accepted internal reports, merge HJ73 fields into stable report-quality
diagnostics or retire them.

## Warnings

- No live job was run or authorized.
- Exact `dotnet test apps/api.Tests --filter ResultCompatibilityTests` remains
  blocked while the local API process holds the executable. The test project
  itself passed with project-reference rebuilding disabled.
- `npm run debt:sensors` remains advisory_warn for known repository-level V2 and
  docs footprint warnings.

## Learnings

- HJ73 can remain a pure result-envelope/admin-diagnostics amendment when the
  attribution helper reads only structural status/count/hash/length fields and
  avoids runtime imports.

```text
DEBT-GUARD RESULT
Classification: incomplete-existing-mechanism
Chosen option: amend existing result-envelope/admin diagnostics
Rejected path and why: live canary, source/provider strategy, cap/retry/parser/cache/SR/storage expansion, new hidden route/sink/table, public/API/UI/report/export behavior, prompt/model/config/schema changes, raw artifact dumps, and deterministic semantic source ranking all exceeded the HJ73 attribution-only package or added higher net complexity
What was removed/simplified: quarantined generated .next/dev cache after build failure; removed generated hj73-test dotnet output from the failed isolated-output retry
What was added: one redacted structural source-chain attribution helper, one adminDiagnostics result-envelope attachment, orchestrator projection wiring from existing decisions, focused web tests, and API compatibility assertions
Net mechanism count: small bounded increase in persisted admin diagnostics; no new route, sink, table, provider, cache, parser, retry, or public surface
Budget reconciliation: actual diff stayed within the allowed helper/orchestrator/result-envelope/tests/API-compatibility surface; no live job or source-strategy change occurred
Verification: focused helper/result-envelope tests, required V2 shell/orchestrator tests, boundary guard, API compatibility tests with locked-service workaround, web build, debt sensors, index, and diff checks
Debt accepted and removal trigger: temporary admin diagnostic shape accepted until stable persisted run-ledger/report-result diagnostics exist or accepted internal reports directly expose source-chain ownership; then merge or retire HJ73 fields
Residual debt: known advisory_warn V2 footprint, boundary guard size, docs footprint, debt-guard telemetry, and V2 consolidation-marker warnings remain
```
