# V2 HighJump HJ69 W4-I Unicode Length Readiness Repair

**Status:** local implementation verifier-clean; live rerun pending committed runtime refresh
**Date:** 2026-05-23
**Owner:** Captain Deputy / Lead Developer
**Authority:** Captain HighJump direction; HJ68 sidecar steering; current live-job
tranche with `4` jobs remaining after HJ68

## Purpose

HJ68 repaired W5 recall for the two prior no-report families, but the focused
`asylum-235000-de` job stopped before W5 execution:

- job `7dc49f6bfbde4a58a8445edfa8a0849f`;
- W3 produced `6` source-material records;
- W5 observed `6` source-content packets and `13915` parent-packet bytes;
- W5 blocked pre-execution because W4-I returned
  `blocked_pre_execution_readiness_packet_text_oversized`.

Local code inspection found a narrow Unicode length-contract bug. W4-H builds
`inputTextCharLength` with `Array.from(aggregateText).length`, while W4-I
validates it with `packet.inputText.length`. For text containing
supplementary-plane code points, those can diverge even when the byte length is
within the approved cap, causing a false oversized/readiness block.

## Scope

Allowed:

- amend the existing W4-I execution-readiness text validation to use the same
  code-point length contract as W4-H;
- add focused tests with supplementary-code-point bounded text under the
  unchanged byte cap;
- update HJ69 package/status/ledger/Agent_Outputs after validation;
- after commit, runtime refresh, and clean preflight, spend exactly one focused
  live job on the Captain-defined `asylum-235000-de` input if local verifiers
  pass.

Closed:

- no cap increase;
- no source/provider widening;
- no W5 prompt edit;
- no schema relaxation, retry/fallback, report-writer, verdict calibration,
  public API/UI/report/export/compatibility exposure, parser/cache/SR/storage,
  ACS/direct URL, V1 work, or V1 cleanup.

## V2 Scorecard Impact

Quality dimension advanced: V2-Q3 Evidence extraction, V2-Q7 multilingual
robustness, and V2-Q10 complexity convergence.

Direct report value: removes an artificial multilingual pre-W5 block so a
bounded source packet can reach the existing W5 extractor.

Cost/latency impact: no mechanism cost increase; one focused live job proposed
after verifiers.

## V2 Retirement Ledger Impact

Rows touched: V2-RL-021 and V2-RL-023.

Status changes: none.

New mechanism owner: none.

Removal / merge trigger: not applicable; this repairs an existing validation
contract.

## V2 Consolidation Gate

Net mechanism count: unchanged.

HJ69 amends one existing guard to match the upstream packet contract. It does
not add a route, diagnostic sink, retry, fallback, flag, cap, public surface, or
parallel report path.

## Debt-Guard

```text
DEBT-GUARD INVENTORY
Symptom: HJ68 asylum-235000-de W5 blocked pre-execution as readiness_packet_text_oversized despite a 13915 byte packet under the 16384 byte aggregate cap.
Verifier: HJ68 result artifact plus authenticated W5 route for job 7dc49f6bfbde4a58a8445edfa8a0849f.
Likely recent change surface: W4-H/W4-I extraction-input fan-in and execution-readiness validation.
Existing mechanisms: W4-H packet builder records code-point char length; W4-I validates packet text length before allowing W5 pre-call.
Debt signals: duplicated text-length assumptions across W4-H, W4-I, and W5; avoid another cap change or readiness layer.
Constraints: preserve byte caps, text hashes, default redaction, public precutover, and multilingual robustness.
Unknowns: whether the focused live rerun then reaches W5 and whether W5 extracts decisive current-stock evidence.
```

```text
COMPLEXITY BUDGET
Chosen option: amend
Files expected to change: execution-readiness-denial.ts, execution-readiness-denial.test.ts, this package, then closeout/status/ledger docs after live result
Small-change plan: single patch
Net mechanisms: unchanged
New branches/fallbacks/flags/helpers: none beyond using the same code-point count expression already used upstream
Code expected to remove: none
Tests/verifier to add or update: focused W4-I supplementary-code-point packet readiness test
Why this is not workaround stacking: it aligns W4-I with the existing W4-H contract instead of adding a bypass or raising caps
Why the rejected path is worse: cap increases, source filtering, retries, or W5 prompt changes would hide a deterministic contract mismatch
Verifier to run: focused W4-I/W4-H/W5 tests, boundary guard if touched by import/contract surface, build, debt sensors, index, diff checks, then one committed/refreshed live job
Verifier tier: safe-local plus live-job
Cost class: one live job from approved tranche
Expensive/live justification: static tests prove the Unicode contract; live job proves the observed current-asylum roadblock is removed in the product route
Runtime provenance: commit required, runtime refresh required
Debt accepted, if any: none
```

## Pass / Stop Criteria

Local pass:

- focused W4-I test proves supplementary-code-point input under the byte cap is
  eligible;
- W4-H/W5 focused tests remain green;
- build passes;
- `npm run debt:sensors` returns no new hard blocker;
- `git diff --check` and `git diff --cached --check` pass.

Live pass:

- the focused `asylum-235000-de` job stays on `claimboundary-v2`, terminally
  `SUCCEEDED`, and preserves public/default containment;
- W4-I no longer reports `blocked_pre_execution_readiness_packet_text_oversized`;
- W5 either executes and produces EvidenceItems/internal report, or produces a
  new downstream blocker that is not the same Unicode readiness failure.

Stop:

- the fix requires increasing caps or widening sources/providers;
- W4-I still reports the same oversized stop after the repair;
- public/default leak, V1 routing, stale runtime/source, or unclear verifier
  failure appears.

## Local Implementation Result

Implemented as a narrow W4-I amendment:

- `execution-readiness-denial.ts` now validates
  `packet.inputTextCharLength` with `Array.from(packet.inputText).length`,
  matching the W4-H packet builder contract.
- `execution-readiness-denial.test.ts` now constructs sidecar char lengths with
  the same code-point contract and includes a focused supplementary-code-point
  packet readiness test under the unchanged byte cap.

Verifier results on 2026-05-23:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/execution-readiness/execution-readiness-denial.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/extraction-input/bounded-extraction-input-authorization.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/evidence-items/bounded-evidence-extraction.test.ts`:
  pass, 3 files / 20 tests.
- `npm -w apps/web run build`: pass.
- `npm run debt:sensors`: `advisory_warn` only; warnings are the existing V2
  source/test footprint, boundary-guard size, docs footprint, net-mechanism
  telemetry, and consolidation-marker warnings.
- `npm run index`: pass.
- `git diff --check`: pass.
- `git diff --cached --check`: pass.

Sidecar review on 2026-05-23:

- verdict: pass-with-concerns before final alignment;
- concern resolved: the first added test used German ASCII text and did not
  force the UTF-16 code-unit versus Unicode code-point divergence. The final
  test uses a supplementary code point and asserts the two lengths diverge.
- residual concern: none blocking; one focused live rerun remains justified
  after commit and runtime refresh.

Next authorized step after committing this package: refresh the runtime to the
committed HJ69 source and run exactly one focused `asylum-235000-de` product
route canary if provenance is clean.
