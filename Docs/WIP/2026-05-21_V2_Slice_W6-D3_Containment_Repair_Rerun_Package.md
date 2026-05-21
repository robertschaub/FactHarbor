# V2 Slice W6-D3 Containment Repair Rerun Package

**Status:** Steer-Co review package
**Date:** 2026-05-21
**Author:** Captain Deputy
**Package type:** one-job containment repair rerun package
**Baseline:** W6-D1 `1abfacf9`, W6-D2 `67161341`, containment repair `8dcbb982`

## Purpose

Run one repaired-runtime W6-D product-route canary after the W4-G default-admin
bounded-text sidecar array redaction repair.

This is not a second victory-lap W6-D canary. The prior W6-D job
`cc1700dd7ae544d4877482f93d399474` stopped before pass/fail classification
because default-admin containment failed in the plural `boundedTextSidecars[]`
projection. W6-D3 exists only to verify containment after `8dcbb982` and, if
containment holds, classify the W6-D retrieval-refinement signal.

## Authority And Budget

The machine-readable live-job ledger is:

- `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`
- active remaining before W6-D3: `3`
- this package may authorize exactly one canary and consumes `1` live-job slot
  if submitted.

No second W6-D3 canary is authorized without a separate package.

## Required Input

Use exactly this Captain-defined input:

`Using hydrogen for cars is more efficient than using electricity`

Submit explicit `pipelineVariant = "claimboundary-v2"`.

## Required Preflight

Before submission:

- git status is clean;
- runtime is refreshed from a commit containing `8dcbb982`;
- API/Web runtime commit hash maps to that committed source or a later docs-only
  package commit;
- W4-G internal bounded-text route preflight proves:
  - unauthenticated request is denied;
  - authenticated missing-ledger request is `404`;
  - responses are `no-store`;
  - the route schema is available;
- if a fixture or prior captured ledger is used for route preflight, default
  projection checks must cover both:
  - singular `boundedTextSidecar`;
  - plural `boundedTextSidecars[]`;
- `npm run validate:v2-gates` and gate-register self-test pass after the
  package commit if source state changed.

## Pass Criteria

Classify as `PASS_X7_W6_D3_CONTAINMENT_REPAIR_AND_RETRIEVAL_SIGNAL_CANARY` if
all are true:

- job used `claimboundary-v2`;
- job reached `SUCCEEDED`;
- public V2 remains `4.0.0-cb-precutover` / `blocked_precutover` /
  `report_damaged`;
- no public/default-admin/log/error source text, EvidenceItem text, prompt text,
  provider payload, hidden ledger id, hidden route name, public verdict, public
  truth, public confidence, or public warning leak occurs;
- W4-G default route returns hash/length/provenance-only projection for both
  singular and plural sidecar fields;
- W3-B records `sourceMaterialRecordCount > 1` and `<= 3` when multiple
  materialized locators are available;
- W5 produces one or more accepted EvidenceItems without schema diagnostics;
- W6-C reaches `sufficiency_assessment_completed` with `schemaDiagnostics = null`;
- result docs record whether W6-C stays `refine_retrieval` or moves to
  `caveat_report` / `continue_to_boundary_formation`.

If containment passes but W6-C remains `refine_retrieval`, the canary may still
pass containment while directing the next package toward query/source diversity.

## Stop / Pivot Criteria

Stop and do not spend another live job if:

- runtime commit cannot be reconciled with committed repaired source;
- job falls back to V1 `claimboundary`;
- W4-G singular or plural default projection returns text;
- any public/default-admin/log/error text or hidden-marker leak appears;
- W3-B still records only one Source Material record despite available W3-A
  materialized locators;
- aggregate text caps fail closed;
- W5 schema diagnostics reappear;
- W6-C returns `damage_report`;
- W6-C remains `refine_retrieval`, in which case next package should target
  query/source diversity rather than W6 prompt retries.

Every submitted job consumes one live-job slot even if it stops.

## V2 SCORECARD IMPACT

This package protects report-quality progress by proving the hidden
retrieval-refinement path can be inspected without text leakage. If containment
holds, the canary produces the next useful signal on whether fan-in improves the
evidence set enough for W6-C to permit later boundary/verdict formation.

## V2 RETIREMENT LEDGER IMPACT

If W6-D3 passes containment, retire the W6-D containment stop as repaired and
move the active pressure point to the W6-C recommendation. If W6-C still
recommends `refine_retrieval`, retire W6 prompt-repair pressure and open a
query/source-diversity package instead.

## V2 CONSOLIDATION GATE

Pass. This package adds no new source mechanism and no new hidden route. It
reuses the existing W6-D path after a focused redaction repair and spends one
job only to verify containment and classify the already-implemented fan-in path.

Latest debt-sensor status before this package: `advisory_warn` on 2026-05-21,
with known V2 source/test/boundary/docs footprint warnings and older
consolidation-marker warnings.

## Review

| Reviewer | Result | Notes |
|---|---|---|
| Claude Opus 4.6 senior architect/security via `scripts/agents/invoke-claude.cjs` | `APPROVE` | Confirmed the package is safe and narrow for exactly one repaired-runtime W6-D containment rerun after `8dcbb982`, with correct no-victory-lap framing, budget accounting, singular/plural redaction criteria, scope exclusions, verifier set, and stop criteria. Non-blocking advisory: future packages should keep watching that sidecar projections do not later pass through non-empty nested EvidenceItem text fields; current W6-D3 is safe because this stage keeps those arrays empty and tests the current projection surface. |

## Verifier Plan

Before live submission:

- `npm -w apps/web run test -- test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-evidence-corpus-bounded-text-artifacts/route.test.ts`
- `npm -w apps/web run test -- test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-material-page-summary-artifacts/route.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-extraction-input-artifacts/route.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-bounded-evidence-extraction-artifacts/route.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-internal-alpha-report-result-artifacts/route.test.ts`
- `npm run validate:v2-gates`
- `node scripts/validate-v2-gate-register.mjs --self-test`
- `npm run debt:sensors`
- `npm -w apps/web run build`
- `git diff --check`
- `git status --short --untracked-files=all`

## Approval Boundaries

This package authorizes only one product-route canary after clean commit,
runtime refresh, and route/runtime preflight.

It does not authorize:

- source edits beyond already committed `8dcbb982`;
- prompt/model/config/schema/UCM/gateway changes;
- public/API/UI/report/export/compatibility behavior;
- report/verdict/warning/confidence publication;
- W6 prompt weakening or W7 gate relaxation;
- parser/cache/SR/storage/provider expansion;
- W2/W3 endpoint widening;
- retries or second canary;
- ACS/direct URL support;
- V1 work or V1 cleanup.

## Output Requirements

After the canary:

- create or amend a W6-D3 live-result WIP document;
- update `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`;
- update `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md`;
- append `Docs/AGENTS/Agent_Outputs.md`;
- create a handoff in `Docs/AGENTS/Handoffs/`;
- run `npm run index`;
- commit the result package.
