# V2 HighJump HJ50 - Source Material Query-Diversity Selection

**Status:** local implementation verifier-clean; live rerun pending committed runtime refresh
**Date:** 2026-05-23
**Owner:** Captain Deputy / Lead Developer
**Preceded by:** HJ49 report `910b9892ae3345a2a72ca1ca14b14990`

## Why This Slice Exists

HJ49 restored Query Planning literal-value preservation and reopened the
internal report path, but the report stayed `UNVERIFIED` because the extracted
EvidenceItem described annual application flow rather than current
asylum-domain population stock.

The hidden preview ledger showed that a later provider attempt did contain a
rank-1 direct-stock candidate, but the existing Source Material selection kept
the first six provided Serper records in source order. That source-order cap
could fill with earlier attempts before a later direct-record query's top
candidate reached W5.

This slice amends the existing Source Material selector structurally: reserve
the top bounded Serper Source Material record from each provider attempt before
filling remaining slots. It does not semantically rank titles, snippets, source
domains, or topic wording.

## Scope

Allowed:

- amend the existing provided-Serper Source Material selector to use
  provider-attempt balanced order;
- keep the existing six-record cap and aggregate byte cap;
- update focused W3-B Source Material owner tests;
- run one HJ50 live rerun after clean verifiers, committed runtime refresh, and
  active prompt confirmation.

Closed:

- source/provider expansion, recursive crawling, parser execution, XLSX
  broadening, retries, cache/SR/storage, public behavior, schema/model policy
  changes, deterministic semantic title/snippet ranking, direct URL/ACS,
  V1 work, and V1 cleanup.

## V2 Scorecard Impact

Positive:

- V2-Q3 Source usefulness: later direct-record queries can contribute their top
  candidate under the same cap.
- V2-Q6 Report quality: improves the chance that W5 receives current-stock
  evidence before verdict/report calibration is judged.
- V2-Q10 Complexity convergence: amends an existing selector rather than adding
  a new provider, crawler, route, or diagnostic mechanism.

## V2 Retirement Ledger Impact

No new hidden mechanism. This reduces pressure to add source machinery for a
structural cap/order defect.

## V2 Consolidation Gate

Allowed because it directly addresses the HJ49 observed defect and keeps the
same Source Material family, caps, and containment.

## Debt-Guard Result

Classification: `incomplete-existing-mechanism`.

Chosen option: amend the existing provided-Serper Source Material selector.

Rejected paths:

- W5 prompt/selectivity changes, because W5 received flow material and did
  extract it correctly as weak/insufficient evidence;
- source/provider expansion, parser/PDF work, or crawler behavior, because the
  preview ledger already showed a structurally available later direct-record
  candidate;
- deterministic semantic title/snippet ranking, because source usefulness must
  not depend on hardcoded language/topic rules;
- raising caps, because the issue is ordering inside the existing cap rather
  than insufficient total budget.

Net mechanisms: unchanged. The selector keeps the same record/byte caps and
uses existing provider-attempt metadata already present in W3-A projections.

Residual risk: provider-attempt balancing may still include weak material when
the query itself is weak. If HJ50 includes the direct-stock candidate but W5
still extracts only flow evidence, the next repair should inspect source text
materialization or W5 extraction behavior, not increase caps by default.

## Verification Plan

Before live job:

- focused W3-B Source Material owner test;
- focused Serper/source-material tests if needed by import surface;
- `npm run validate:v2-gates`;
- `npm run debt:sensors`;
- `npm -w apps/web run build`;
- `npm run index`;
- `git diff --check`;
- commit;
- confirm `claimboundary-v2` prompt remains active;
- restart/refresh runtime and verify Web/API/proxy commit match.

Local verifier result, 2026-05-23:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.test.ts`
  passed: 1 file, 17 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-serper-search-preview.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/source-candidate-preview.test.ts test/unit/lib/analyzer-v2/evidence-lifecycle/source-material/page-summary-source-material.test.ts`
  passed: 4 files, 36 tests.
- `npm run validate:v2-gates` passed.
- `npm run debt:sensors` returned `advisory_warn` with the known V2
  source/test footprint, boundary-guard size, docs footprint, and
  consolidation-marker warnings.
- `npm -w apps/web run build` passed.
- `npm run index` passed.
- `git diff --check` passed.

Live validation:

- exactly one HJ50 rerun for the Captain-defined input
  `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`;
- pass if the direct-stock provider-attempt top candidate is included in Source
  Material under the existing cap, W5 extracts current-stock/threshold evidence
  or a materially closer item than annual flow, an internal report is produced,
  and public/default containment holds;
- if the direct-stock candidate is included but W5 still ignores it, stop and
  classify the next defect as W5 extraction/materialization quality;
- if Source Material still drops the later top candidate, inspect the selector
  with no additional live job first.

## Stop Conditions

Stop and reconvene Steer-Co if:

- the repair would require semantic source ranking, provider/source-specific
  rules, provider expansion, recursive crawling, parser work, schema/model
  changes, public behavior, direct URL/ACS, cache/SR/storage, V1 work, or V1
  cleanup;
- local tests show the balanced selector breaks existing W3-B source-material
  contracts;
- a live run leaks report text, source text, prompt text, provider payload,
  hidden ids, public verdict, truth percentage, or confidence to public/default
  surfaces.
