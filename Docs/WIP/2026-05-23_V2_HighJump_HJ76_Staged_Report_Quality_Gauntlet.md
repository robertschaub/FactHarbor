# V2 HighJump HJ76 Staged Report-Quality Gauntlet

**Status:** approved for execution under Captain Deputy authority
**Date:** 2026-05-23
**Package owner:** Captain Deputy / Lead Developer
**Implementation anchor:** no source implementation change; use current HEAD after this package commit
**Live-job tranche:** fresh Captain-approved 12-job tranche after HJ75

## Decision

HJ75 moved the current-asylum family from `UNVERIFIED` to an internal
`MOSTLY-TRUE` report (`ad76c64ca5eb46c7904043975e0c483c`, 78 truth / 72
confidence) while public V2 remained blocked/precutover. That is enough to stop
single-family source-material tuning for now. It is not enough to claim report
quality is broadly stable.

HJ76 is therefore a no-code staged report-quality gauntlet over Captain-defined
inputs. The goal is to identify the next repeated report-quality defect from
real internal V2 reports before another source, prompt, schema, or code repair.

## Steer-Co Consolidation

Two reviewer positions were considered:

- Claude Opus reviewer: modify. Do not immediately spend all jobs on an
  eight-input batch; first inspect HJ75 quality and avoid amplifying a thin
  evidence pattern.
- GPT sidecar reviewer: modify. Run a staged gauntlet, counting HJ75 as the
  `asylum-235000-de` datapoint unless a fresh rerun is needed. Use wave 1 to
  detect hard stops before spending the remaining wave.

Consolidated decision: run a staged validation package, not another repair. Use
the HJ75 report review as the current-asylum datapoint and run fresh jobs in
waves.

## HJ75 Quality Baseline

HJ75 observed:

- Expected family direction: pass (`MOSTLY-TRUE`, true-side).
- Mechanical band with tolerance: pass (truth 78 is within the accepted
  tolerance around 58-75; confidence 72 is within tolerance around 40-70).
- Public/default containment: pass.
- Main quality gap: the internal V2 report is thin compared with the accepted
  exact comparator `bb2133a191894da9bacf4f63e4b458ac`:
  - HJ75: 2 cited EvidenceItem refs, 2 boundaries in report text.
  - Comparator: 38 evidence items, 4 boundaries, explicit SEM aggregate
    context and richer source diversity.

The next bar should be selected from cross-family evidence, not by continuing
to tune this single input blindly.

## Job Plan

All inputs must be submitted exactly as Captain-defined in `AGENTS.md`.

### Wave 1: High-Signal Controls

Run sequentially after clean provenance and runtime refresh:

1. `Using hydrogen for cars is more efficient than using electricity`
2. `Plastic recycling is pointless`
3. `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`
4. `235000 Flüchtlinge leben in der Schweiz, das sind fast so viel im am Ende des Zweiten Weltkrieges.`

### Wave 2: Broader Shape Check

Proceed only if Wave 1 has no hard stop:

5. `Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben`
6. `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben`
7. `O processo judicial contra Jair Bolsonaro por tentativa de golpe de Estado respeitou o direito processual brasileiro e os requisitos constitucionais, e as sentencas proferidas foram justas`

HJ75 job `ad76c64ca5eb46c7904043975e0c483c` counts as the eighth family datapoint
for `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`.
Do not spend a fresh same-input asylum-current job unless the staged results make
that specifically useful.

## Pass / Stop Criteria

Public/default containment must hold for every job:

- pipeline remains `claimboundary-v2`;
- public/default result remains `4.0.0-cb-precutover` /
  `blocked_precutover`;
- no public/default report markdown, verdict label, truth percentage,
  confidence, `adminDiagnostics`, source text, prompt text, provider payload,
  hidden ids, or internal report text.

Stop immediately and reconvene Steer-Co if any of these occur:

- runtime/source provenance is missing or stale;
- V1 or an unexpected pipeline variant runs;
- API-to-Web runner auth or trigger failure repeats;
- public/default leak is detected;
- two of the first four jobs produce damaged/`UNVERIFIED` internal reports;
- a verdict is produced with zero cited EvidenceItems or no source-chain
  attribution;
- a materially misleading report appears and the owner is unclear;
- the same stop repeats without new information.

Continue from Wave 1 to Wave 2 if:

- all four jobs reach terminal status with valid provenance;
- public/default containment holds;
- at least three of four produce internal report drafts or an informative new
  stage/failure signal;
- no hard stop above is hit.

## Expected Output

For each submitted job, record:

- job id, input slug, runtime commit, status, pipeline variant;
- internal top-line report status/verdict/truth/confidence if present;
- EvidenceItem count, cited ref count, boundary count if available;
- source-chain stage statuses and source-material composition if present;
- public containment result;
- information yield category:
  `report_produced`, `new_stage_reached`, `new_failure`,
  `same_stop_repeated_with_new_evidence`, or
  `same_stop_repeated_without_useful_new_information`.

After the staged gauntlet, choose one next bar:

- if one defect repeats across families, prepare the smallest repair package for
  that defect;
- if most families are expectation-compatible, shift to report-quality polishing
  and public-readiness planning;
- if failures are scattered, classify by owner before changing code or prompts.

## V2 Scorecard Impact

Directly advances real report-quality value by testing whether the internal V2
report path generalizes beyond the latest single-family repair.

## V2 Retirement Ledger Impact

No new hidden mechanism is introduced. If HJ76 produces broad positive evidence,
it should allow later retirement or narrowing of single-family HighJump repair
lanes and reduce pressure to add more source-material plumbing.

## Consolidation Gate

No code, prompt, model, config, schema, route, provider, parser, cache,
Source Reliability, ACS/direct URL, public behavior, or V1 work is authorized by
this package. The package only authorizes staged live validation inside the
fresh Captain-approved 12-job tranche.

## Verifiers Before Submission

- `git status --short --untracked-files=all`
- runtime refresh to the package commit;
- API/Web health and version endpoints match the package commit;
- `/api/internal/run-job` runner-key preflight returns an auth-pass structural
  response, not `401`;
- admin-key preflight succeeds;
- UCM/default manual pipeline remains `claimboundary-v2`.

## Debt-Sensor Status

Latest `npm run debt:sensors`: `advisory_warn`.

Salient warnings: V2 source/test footprint, oversized boundary guard, WIP and
handoff volume, net mechanism telemetry, and some historical consolidation
markers. These are steering context, not blockers for a no-code validation
gauntlet.
