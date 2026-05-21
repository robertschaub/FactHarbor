# V2 Slice W6-D Product-Route Canary Package

**Status:** Captain Deputy / Steer-Co-authorized execution package
**Date:** 2026-05-21
**Author:** Captain Deputy / Steer-Co
**Package type:** one-job live canary package
**Implementation baseline:** W6-D1 `1abfacf9`, W6-D2 `67161341`

## Purpose

Run exactly one product-route `claimboundary-v2` canary after W6-D1 and W6-D2 to test whether bounded same-provider Wikimedia page-summary fan-in moves the W6-C5 stop-line away from `refine_retrieval`.

W6-D is not public report generation and not true source/provider diversity. It is a bounded retrieval-refinement test over the existing approved Wikimedia candidate/page-summary path.

## Authority And Budget

Captain authorized live jobs and prompt/schema work needed to complete the plan. The current machine-readable live-job ledger is:

- `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`
- active remaining before W6-D canary: `4`
- this package authorizes exactly one W6-D canary and consumes `1` live-job slot if submitted.

No second W6-D canary is authorized without a separate package.

## Required Input

Use exactly this Captain-defined input:

`Using hydrogen for cars is more efficient than using electricity`

Submit explicit `pipelineVariant = "claimboundary-v2"`.

## Required Preflight

Before submission:

- source implementation commit `67161341` is present;
- git status is clean or only canary docs are committed;
- runtime is refreshed from the committed source;
- API/Web runtime commit hash maps to `67161341` or this docs-only package commit;
- W3-B/W8-B internal artifact routes preflight as authenticated, no-store, and default-redacted;
- `npm run validate:v2-gates` and gate-register self-test pass after the package commit if source state changed.

## Pass Criteria

Classify as `PASS_X7_W6_D_RETRIEVAL_REFINEMENT_CANARY` if all are true:

- job used `claimboundary-v2`;
- job reached `SUCCEEDED`;
- public V2 remains `4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged`;
- no public/default-admin/log/error source text, EvidenceItem text, prompt text, provider payload, hidden ledger id, hidden route name, public verdict, public truth, public confidence, or public warning leak occurs;
- W2/W3/W4/W5 hidden chain reaches W5 with more than one bounded Source Material record when candidates are available;
- W3-B records `sourceMaterialRecordCount > 1` and `<= 3`;
- W5 produces one or more accepted EvidenceItems without schema diagnostics;
- W6-C reaches `sufficiency_assessment_completed` with `schemaDiagnostics = null`;
- W6-C recommendation is `caveat_report` or `continue_to_boundary_formation`, or remains `refine_retrieval` with clear missing dimensions that justify the next retrieval stage;
- result docs record W6-C rubric/missing-dimension movement compared with W6-C5.

## Stop / Pivot Criteria

Stop and do not spend another live job if:

- runtime commit cannot be reconciled with committed W6-D source;
- job falls back to V1 `claimboundary`;
- W3-B still records only one Source Material record despite available W3-A materialized locators;
- aggregate text caps fail closed;
- W5 schema diagnostics reappear;
- W6-C returns `damage_report`;
- W6-C remains `refine_retrieval`, in which case next package should target query/source diversity rather than W6 prompt retries;
- any public/default-admin/log/error text or hidden-marker leak appears.

Every submitted job consumes one live-job slot even if it stops.

## V2 SCORECARD IMPACT

Tests a direct report-quality prerequisite: whether a bounded, more balanced evidence set is enough for W6-C to permit internal Alpha boundary/verdict formation. Public report quality is still blocked/precutover.

## V2 RETIREMENT LEDGER IMPACT

If W6-D succeeds with multiple records, downgrade the single-page-summary W3-B/W4/W5 canary path to compatibility baseline for future sufficiency proof. If W6-D does not move W6-C, record pressure toward query/source diversity instead of prompt weakening.

## V2 CONSOLIDATION GATE

Pass. This package adds no source mechanism. It spends one job to evaluate the already committed W6-D fan-in path.

Latest debt-sensor status before this package: `advisory_warn` on 2026-05-21, with known V2 source/test/boundary/docs footprint warnings and older consolidation-marker warnings.

## Output Requirements

After the canary:

- create a W6-D live-result WIP document;
- update `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`;
- update `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md`;
- append `Docs/AGENTS/Agent_Outputs.md`;
- create a handoff in `Docs/AGENTS/Handoffs/`;
- run `npm run index`;
- commit the result package.
