# V2 HighJump HJ31 Admin Stop Summary Diagnostics

**Status:** live-validated; next repair identified
**Date:** 2026-05-22
**Implementation anchor before HJ31:** `3f1a1b4c fix(v2): rebalance evidence extraction material alignment`

## Context

HJ30 used the stronger HighJump mini-gauntlet after the W5 material-alignment
rebalance:

- `6ce3a5827b464549b2c524d4f659ae7b` (Bolsonaro/fair-trial) produced a hidden
  internal report, but direct fair-trial/procedural-compliance evidence remained
  weak.
- `06e637107869409c9611b7c7984f1ff1` (hydrogen) produced a hidden internal
  report inside the expected hydrogen-family band.
- `a0b131e0965e4a56afd485dc37344595`, `0645495cce3d4c99bbb268bca7b1e3a2`, and
  `2979fed360504100b689cbab8b265b7c` returned only the damaged shell.

The shell-only runs exposed a process problem: process-local hidden artifact
routes were not durable enough after runtime refresh to reconstruct the stop
stage. The API/UI still persisted admin `reportMarkdown`, so the lowest-net
complexity repair is to reuse that admin-only channel for a bounded structural
stop summary when no internal report draft exists.

## HJ31 Change

HJ31 amends `apps/web/src/lib/analyzer-v2/orchestrator.ts` so the orchestrator
keeps an admin-only stop summary as it progresses through:

- Claim Understanding;
- Query Planning readiness;
- Query Planning;
- Source Acquisition;
- Source Material;
- Evidence Extraction.

If the internal report writer later creates a draft, the draft replaces the stop
summary exactly as before. If no draft is created, the persisted admin report
contains a bounded `Internal Alpha Stop Summary`.

The summary intentionally contains only structural labels and bounded counts:
stage, outcome, selected-claim count, candidate/material counts, W5 status,
EvidenceItem count, source-content packet count, and packet byte count. It must
not contain source text, prompt text, provider payloads, raw URLs, hidden ledger
IDs, or public verdict/truth/confidence.

## Debt-Guard Result

**Risk / defect:** HJ30 shell-only results could not be diagnosed after runtime
refresh because admin reportMarkdown persisted only the old generic damaged
shell while hidden artifact routes were process-local.

**Chosen path:** amend the existing admin-only reportMarkdown channel with a
bounded stop summary.

**Rejected paths:** new durable hidden storage, new admin route, broader
artifact persistence, retries, source/provider expansion, schema changes, or
public exposure.

**Net complexity:** one small helper path in the existing orchestrator and
contract tests. No new runtime mechanism, no new route, no public surface.

**Removal / merge trigger:** once V2 public cutover has a stable, durable
stage-progress model, this stop summary should either merge into that model or
be deleted from the pre-cutover admin report path.

## V2 Scorecard Impact

Positive for debuggability and report-quality iteration speed. HJ31 does not
itself improve report truth, confidence, evidence quality, or UI polish. It
reduces blind live-job spend by making the next report-blocking stage visible
from persisted admin job state.

## V2 Retirement Ledger Impact

No older guard or artifact is retired in this slice. The change reduces pressure
to add another hidden route/storage mechanism by reusing the existing admin
report field.

## Verification

Passed locally:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/pipeline-shell.test.ts test/unit/lib/analyzer-v2/orchestrator-w7c-product-chain.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts`
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2`
- `npm run validate:v2-gates`
- `npm run debt:sensors` (`advisory_warn` for known V2/source/test/docs/boundary-guard footprint warnings)
- `npm -w apps/web run build`
- `npm run index`
- `git diff --check`

## Next Live Validation

After commit and runtime refresh, HJ31 reran the HJ30 shell-only inputs:

1. `8e198dcd90ea4eceb590af62b2ccff14`:
   `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`
2. `53ef9d309f7147a3b47f7f64802ee59d`:
   `Plastic recycling is pointless`
3. `95d5e671ecd64e4a8edbd9aef3f45b36`:
   `235000 Flüchtlinge leben in der Schweiz, das sind fast so viel im am Ende des Zweiten Weltkrieges.`

## Live Results

All three jobs ran `claimboundary-v2` on runtime
`735d83537340ea095b76e1711ea775612473dea3` and succeeded with public/default
V2 still `4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged`.
Default job reads returned `reportMarkdown` length `0`.

### Asylum Aggregate

Job `8e198dcd90ea4eceb590af62b2ccff14` produced a durable admin stop summary:

- Stage: `Evidence Extraction`
- W5 execution: `blocked_pre_execution`
- EvidenceItems: `0`
- Source content packets: `0`
- Input packet bytes: not available

Classification:
`STOP_X7_HJ31_ASYLUM_W5_BLOCKED_PRE_EXECUTION_ZERO_SOURCE_CONTENT_PACKETS`.

### Plastic Recycling

Job `53ef9d309f7147a3b47f7f64802ee59d` stopped earlier:

- Stage: `Query Planning readiness`
- Claim Understanding status: `blocked`
- Query Planning readiness: `blocked_pre_query_planning`
- Selected AtomicClaims: `0`
- Claim Understanding integrity event: `no_valid_claim`

Classification: `STOP_X7_HJ31_PLASTIC_CLAIM_UNDERSTANDING_NO_VALID_CLAIM`.

### Asylum / World War II Variant

Job `95d5e671ecd64e4a8edbd9aef3f45b36` produced the same durable admin stop
shape as the asylum aggregate:

- Stage: `Evidence Extraction`
- W5 execution: `blocked_pre_execution`
- EvidenceItems: `0`
- Source content packets: `0`
- Input packet bytes: not available

Classification:
`STOP_X7_HJ31_ASYLUM_VARIANT_W5_BLOCKED_PRE_EXECUTION_ZERO_SOURCE_CONTENT_PACKETS`.

## Next Repair Direction

The asylum-family failures are not report-writer failures. They reach the W5
call site with no source-content packets, so the next repair should inspect the
Source Material / W4-G / W4-H / W5 input construction path and amend an existing
handoff if bounded Source Material is present but not becoming W5 source-content
packets.

The plastic failure is separate: Claim Understanding rejects a short but
verifiable broad assertion as `no_valid_claim`. That should be handled as a
Claim Understanding bar-calibration follow-up unless the source-content packet
repair naturally covers it, which is unlikely.

Current live-job budget after HJ31: `10` of the Captain-reset `18`.
