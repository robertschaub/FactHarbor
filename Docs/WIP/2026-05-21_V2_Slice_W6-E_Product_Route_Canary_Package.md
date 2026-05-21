# V2 Slice W6-E Product-Route Canary Package

**Status:** Steer-Co-authorized execution package
**Date:** 2026-05-21
**Author:** Captain Deputy / Steer-Co
**Package type:** one-job live canary package
**Implementation commit:** `61730d1b`

## Purpose

Run exactly one product-route `claimboundary-v2` canary after W6-E to determine
whether query-balanced W3-B page-summary selection improves the hidden evidence
set enough to move W6-C away from `refine_retrieval`.

This is not provider expansion. W6-E still uses the existing approved Wikimedia
search/page-summary path and the hard cap of `3` page-summary records.

## Authority And Budget

The machine-readable live-job ledger is:

- `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`
- active remaining before W6-E canary: `2`
- this package authorizes exactly one W6-E canary and consumes `1` live-job slot
  if submitted.

No second W6-E canary is authorized without a separate package.

## Required Input

Use exactly this Captain-defined input:

`Using hydrogen for cars is more efficient than using electricity`

Submit explicit `pipelineVariant = "claimboundary-v2"`.

## Required Preflight

Before submission:

- git status is clean;
- runtime is refreshed from commit `61730d1b` or a later docs-only package
  commit containing it;
- API/Web runtime commit hash maps to the committed source;
- W4-G and W8-B internal routes preflight as authenticated, no-store, and
  default-redacted;
- `npm run validate:v2-gates` and gate-register self-test pass after the
  package commit if source state changed.

## Pass Criteria

Classify as `PASS_X7_W6_E_QUERY_BALANCED_SELECTION_CANARY` if all are true:

- job used `claimboundary-v2`;
- job reached `SUCCEEDED`;
- public V2 remains `4.0.0-cb-precutover` / `blocked_precutover` /
  `report_damaged`;
- no public/default-admin/log/error source text, EvidenceItem text, prompt text,
  provider payload, hidden ledger id, hidden route name, public verdict, public
  truth, public confidence, or public warning leak occurs;
- W3-B records `sourceMaterialRecordCount > 1` and `<= 3`;
- selected W3-B `candidatePreviewId` values show at least two distinct
  provider-attempt groups when available;
- W4-G singular and plural sidecar projections remain redacted by default;
- W5 produces one or more accepted EvidenceItems without schema diagnostics;
- W6-C reaches `sufficiency_assessment_completed` with `schemaDiagnostics = null`;
- result docs record whether W6-C stays `refine_retrieval` or moves to
  `caveat_report` / `continue_to_boundary_formation`.

If W6-C remains `refine_retrieval` after at least two structurally distinct
provider-attempt groups, close same-provider refinement and prepare a
provider/source diversity package.

If only one provider-attempt group is available for the submitted input,
classify as `INCONCLUSIVE_W6_E_INSUFFICIENT_QUERY_BREADTH` and move directly to
provider/source diversity without spending further W6-E slots.

## Stop / Pivot Criteria

Stop and do not spend another live job if:

- runtime commit cannot be reconciled with committed W6-E source;
- job falls back to V1 `claimboundary`;
- selected W3-B records still come from one provider-attempt group despite
  available alternatives;
- aggregate text caps fail closed;
- W5 schema diagnostics reappear;
- W6-C returns `damage_report`;
- W4-G or any default-admin/public/log/error surface leaks text or hidden
  markers;
- W6-C remains `refine_retrieval`, in which case next package should target
  provider/source diversity rather than W6 prompt retries or more same-provider
  page-summary shuffling.
- only one provider-attempt group is available, in which case the W6-E selector
  was not actually exercised and the next package should target provider/source
  diversity rather than W6-E variants.

Every submitted job consumes one live-job slot even if it stops.

## V2 SCORECARD IMPACT

Tests a direct report-quality prerequisite: whether structurally broader source
material before W6-C improves sufficiency enough to approach internal Alpha
boundary/verdict formation.

## V2 RETIREMENT LEDGER IMPACT

If W6-E passes but W6-C still recommends `refine_retrieval`, retire
same-provider page-summary refinement as insufficient and move to a
provider/source diversity package. If W6-C moves forward, retire the W6-D
same-first-group selection as superseded by W6-E.

## V2 CONSOLIDATION GATE

Pass. This package adds no source mechanism. It spends one job to evaluate the
already committed W6-E selector and leaves one live-job slot in reserve.

Latest debt-sensor status before this package: `advisory_warn` on 2026-05-21,
with known V2 source/test/boundary/docs footprint warnings.

## Review

| Reviewer | Result | Notes |
|---|---|---|
| Claude Opus 4.6 senior architect/security via `scripts/agents/invoke-claude.cjs` | `APPROVE` | Confirmed one W6-E canary is justified with remaining budget `2`, leaves one reserve slot, preserves containment and no-expansion boundaries, and correctly pivots to provider/source diversity if `refine_retrieval` persists. Applied recommended addendum: if the submitted input yields only one provider-attempt group, classify as `INCONCLUSIVE_W6_E_INSUFFICIENT_QUERY_BREADTH` and do not spend further W6-E slots. |

## Output Requirements

After the canary:

- create a W6-E live-result WIP document;
- update `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`;
- update `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md`;
- append `Docs/AGENTS/Agent_Outputs.md`;
- create a handoff in `Docs/AGENTS/Handoffs/`;
- run `npm run index`;
- commit the result package.
