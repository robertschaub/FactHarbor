# V2 HighJump HJ31 Admin Stop Summary Diagnostics

**Status:** locally implemented, verifier-clean, not yet live-validated
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

After commit and runtime refresh, rerun the HJ30 shell-only inputs first:

1. `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`
2. `Plastic recycling is pointless`
3. optionally `235000 Flüchtlinge leben in der Schweiz, das sind fast so viel im am Ende des Zweiten Weltkrieges.`

Expected information yield: durable admin stop summaries that identify whether
the blocker is Source Material, W5 extraction/source-material usefulness, or
downstream report handling.

Current live-job budget after HJ30: `13` of the Captain-reset `18`.
