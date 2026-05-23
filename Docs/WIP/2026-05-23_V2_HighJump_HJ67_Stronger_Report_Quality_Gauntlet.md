# V2 HighJump HJ67 Stronger Report-Quality Gauntlet

**Status:** execution package in preparation
**Date:** 2026-05-23
**Owner:** Captain Deputy / Lead Developer
**Authority:** Captain HighJump direction, current `18`-job tranche reset after
HJ63, and Captain request for stronger validation than one-off canaries

## Purpose

HJ66 repaired the focused plastic W7-B schema/polarity path and produced a
complete hidden/admin internal report with a `MIXED` selected-claim verdict.
The next useful HighJump step is not another single-field repair. It is a
stronger bounded report-quality gauntlet across the Captain-defined inputs to
measure whether the current V2 path now generalizes enough to guide the next
quality bar.

## Scope

Allowed:

- run one committed/refreshed product-route V2 job for each Captain-defined
  input below, stopping early only on systemic hard-stop conditions;
- inspect authenticated hidden/admin artifacts for report reachability, verdict
  labels/truth/confidence, cited EvidenceItem refs, and public/default
  containment;
- compare observed reports against `Docs/AGENTS/Captain_Quality_Expectations.md`,
  `Docs/AGENTS/benchmark-expectations.json`, and
  `Docs/AGENTS/report-quality-expectations.json`;
- record one evidence JSON result and status/ledger/Agent_Outputs closeout.

Closed:

- no source code changes;
- no prompt/model/config/schema/UCM/gateway edits;
- no retries or second canary for the same input inside this package;
- no public API/UI/report/export/compatibility exposure;
- no parser/cache/SR/storage/provider expansion/ACS/direct URL/V1 work;
- no deterministic semantic report correction in code.

## Captain-Defined Inputs

Use exactly these inputs:

1. `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben`
2. `Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben`
3. `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`
4. `235000 Flüchtlinge leben in der Schweiz, das sind fast so viel im am Ende des Zweiten Weltkrieges.`
5. `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`
6. `O processo judicial contra Jair Bolsonaro por tentativa de golpe de Estado respeitou o direito processual brasileiro e os requisitos constitucionais, e as sentencas proferidas foram justas`
7. `Using hydrogen for cars is more efficient than using electricity`
8. `Plastic recycling is pointless`

## V2 Scorecard Impact

Quality dimensions advanced: V2-Q6 evidence usefulness, V2-Q7 report
usefulness, V2-Q8 benchmark alignment, and V2-Q10 convergence.

Direct report value: this package measures complete internal report quality and
cross-input generalization after the HJ61-HJ66 W7-B/W8 repair sequence.

Cost/latency impact: up to `8` live jobs; no per-job runtime cost increase.

## V2 Retirement Ledger Impact

Rows touched: V2-RL-023 and report-quality HighJump lane.

New mechanism owner: none.

Removal / merge trigger: use HJ67 results to choose one next quality bar and
avoid adding more hidden readiness/proof machinery unless a real observed
report defect requires it.

## V2 Consolidation Gate

Net mechanism count: unchanged.

This package is validation only. It adds no hidden route, artifact, readiness
layer, denial, proof, retry, fallback, schema relaxation, runtime coercion, or
parallel report path.

## Debt-Guard

Required path: none for execution because this package changes no source or
prompt behavior.

Debt sensor status: latest `npm run debt:sensors` before HJ66 closeout returned
`advisory_warn` only for known V2 footprint, test footprint, boundary-guard
size, docs footprint, net-mechanism telemetry, and older consolidation-marker
review candidates.

If HJ67 exposes a repair need, the follow-up fix must apply `/debt-guard`
before editing.

## Preflight

Before live execution:

1. commit this package;
2. confirm clean git status;
3. confirm Web/API runtime commit matches the intended execution anchor;
4. confirm default pipeline is `claimboundary-v2`;
5. confirm active `claimboundary-v2` prompt hash is HJ66
   `18182d27945de17dd62b3c89d0e816d09b1b25cb7ee6c3ffb065aef937574786`;
6. confirm public/default V2 is still precutover/blocked.

## Budget

Budget before HJ67: `15`.

Maximum spend: `8` jobs, one per Captain-defined input.

Expected remaining after full gauntlet: `7`.

## Pass / Stop Criteria

Per-job pass signals:

- job stays on `claimboundary-v2` and reaches terminal status;
- public/default containment holds: public/default V2 stays
  `4.0.0-cb-precutover` / `blocked_precutover`, with no public/default report
  markdown, verdict, truth percentage, or confidence;
- if a hidden internal report is produced, default admin artifact routes stay
  hash/length/provenance-only and unauthenticated route access returns `401`;
- report verdict labels/truth/confidence are internally band-consistent and
  answer the selected claim as written.

Early hard stops:

- stale runtime/source or active prompt drift;
- unexpected V1 routing;
- public/default leak of hidden report text, source text, prompt text, provider
  payloads, hidden ids, verdict/truth/confidence, or report markdown;
- two consecutive jobs fail at the same new schema/runtime stop before report
  creation with no additional information yield;
- tool/runtime failure makes result attribution ambiguous.

After the gauntlet, classify each job as:

- `report_produced`;
- `report_produced_with_quality_gap`;
- `new_stage_reached`;
- `new_failure`;
- `same_stop_repeated_with_new_evidence`;
- `same_stop_repeated_without_useful_new_information`.

## Expected Next Decision

If most jobs produce reports, pivot to report-quality review and choose the
single highest-value next bar to raise.

If a systemic schema/runtime stop appears, stop and prepare one narrow repair
package for that owner.

If source usefulness dominates failures, choose one bounded source-material or
query-planning quality repair rather than another downstream report-layer
mechanism.
