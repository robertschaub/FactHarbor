# V2 HighJump HJ60 Stronger Internal Report Gauntlet

**Status:** closed as live-validated mixed pass
**Date:** 2026-05-23
**Owner:** Captain Deputy / Lead Developer
**Captain input:** Use the HighJump approach and avoid low-information one-off validation when a stronger pass is needed. New V2 live-job budget was reset to `18`; HJ58 and HJ59 consumed `2`, so `16` remain before HJ60.

## Purpose

HJ59 proved a meaningful single-input report-quality improvement for the Bundesrat-simple input: the internal Alpha report moved from a weak `UNVERIFIED` shape to `TRUE` / `88` / `85`, while public/default V2 remained blocked and precutover.

The next useful step is not another narrow prompt tweak. HJ60 will run a stronger sequential validation pass over all eight Captain-defined benchmark inputs on the same committed runtime/prompt state. The goal is to learn whether recent HighJump repairs generalize and to select the next report-quality bar from observed cross-input evidence.

## Inputs

Use exactly these Captain-defined inputs, unchanged:

1. `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben`
2. `Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben`
3. `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`
4. `235000 Flüchtlinge leben in der Schweiz, das sind fast so viel im am Ende des Zweiten Weltkrieges.`
5. `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`
6. `O processo judicial contra Jair Bolsonaro por tentativa de golpe de Estado respeitou o direito processual brasileiro e os requisitos constitucionais, e as sentencas proferidas foram justas`
7. `Using hydrogen for cars is more efficient than using electricity`
8. `Plastic recycling is pointless`

Run sequentially to reduce concurrency noise. Do not add new analysis inputs.

## Scope

Allowed:

- runtime refresh from committed HEAD;
- route/runtime preflight;
- verify UCM default pipeline and active `claimboundary-v2` prompt hash;
- submit the eight listed jobs through the normal manual/default V2 path;
- inspect authenticated admin job records and public/default containment;
- record report reachability, first incomplete stage when visible, internal report verdict/truth/confidence, report markdown length, and canary information yield per job;
- update lane, ledger, WIP evidence, and Agent_Outputs after the gauntlet.

Closed:

- no source, prompt, schema, model, provider, parser, cache/SR/storage, direct URL/ACS, public route, UI/report/export/compatibility, V1, or UCM behavior changes;
- no extra inputs;
- no retries as a repair mechanism;
- no second run of an input unless the first submission fails before job creation;
- no public/default exposure of report markdown, source text, hidden ids, prompt text, verdict, truth percentage, or confidence.

## V2 Scorecard Impact

HJ60 advances report-quality evidence directly. It tests internal report reachability and quality bands across the current benchmark set, rather than adding hidden machinery. The output should identify concrete report defects that can drive the next bar-raising repair.

## V2 Retirement Ledger Impact

No new mechanism. HJ60 should reduce pressure for speculative readiness/diagnostic layers by making the next repair owner visible from real cross-input report evidence. If repeated hidden stops appear, the next package must prefer amending or retiring existing gates before adding another layer.

## V2 Consolidation Gate

Net mechanism count: unchanged.

HJ60 adds no code and no prompt text. It is a validation package only. Any next implementation package must cite HJ60 evidence and state what existing gate/artifact it amends, retires, merges, or deliberately keeps.

## Debt-Sensor Status

Latest closeout check before this package:

- `npm run debt:sensors`: `advisory_warn`
- Salient warnings remain the known V2 source/test footprint, large boundary guard, WIP/handoff volume, net-mechanism telemetry, and consolidation-marker warnings.

These are steering context, not blockers for a validation-only gauntlet.

## Preflight

Before submitting jobs:

1. Confirm `git status --short --untracked-files=all` is clean.
2. Restart/refresh runtime if needed.
3. Confirm Web `/api/version`, API `/version`, and Web proxy `/api/fh/version` report the committed HEAD.
4. Confirm UCM effective/default pipeline selects `claimboundary-v2`.
5. Confirm active `claimboundary-v2` prompt hash remains `8e50a65fe61c1961d3d0e6e5eb7dc0b9075e870a5ffe64e688c08ba6aff1bf20` or record any legitimate newer activated prompt before stopping.
6. Confirm no uncommitted source or docs changes before the first job.

## Pass / Stop Criteria

Per-job pass signals:

- job runs `claimboundary-v2`;
- job finishes `SUCCEEDED` or produces a durable admin stop summary with a clear first incomplete stage;
- public/default containment remains `4.0.0-cb-precutover`, `blocked_precutover`, no public/default report markdown, verdict, truth percentage, confidence, source text, prompt text, or hidden ids;
- if an internal report is produced, record verdict/truth/confidence and compare against the current benchmark expectation where one exists.

Gauntlet pass signal:

- enough jobs complete to show the next strongest cross-input repair owner from live evidence;
- public/default containment holds for all submitted jobs;
- no stale-runtime, V1-routing, or provenance issue appears.

Hard stops:

- stale runtime/source or version mismatch;
- unexpected V1 pipeline execution;
- public/default leak of report markdown, source text, prompt text, hidden ids, verdict, truth percentage, or confidence;
- authenticated route exposes text by default where it should remain hash/length/provenance-only;
- live submission would require source/prompt/schema/model/config changes;
- repeated infrastructure failure makes remaining jobs low-information.

Non-hard analytical stops:

- a job stopping at Claim Understanding, Source Material, W4, W5, sufficiency, verdict, or report writer is a valid information yield. Record it and continue the gauntlet unless it is the same infrastructure/provenance failure for multiple consecutive jobs.

## Budget

HJ60 may consume up to `8` of the `16` remaining jobs. If all eight run, `8` remain.

## Expected Output

After the gauntlet:

- create a machine-readable evidence JSON;
- update `Docs/STATUS/V2_Current_Lane.md`;
- update `Docs/AGENTS/V2_Live_Job_Tranche_Ledger.json`;
- append `Docs/AGENTS/Agent_Outputs.md`;
- run `npm run index`, JSON parse checks, `git diff --check`;
- commit the closeout.

## Live Validation Result

HJ60 ran all eight Captain-defined inputs sequentially on runtime commit
`58fa06a2db7182c4d879e5d96af0e654bf48bb46` with active `claimboundary-v2`
prompt hash `8e50a65fe61c1961d3d0e6e5eb7dc0b9075e870a5ffe64e688c08ba6aff1bf20`.

Result classification:

`MIXED_PASS_X7_HJ60_STRONGER_GAUNTLET_7_OF_8_INTERNAL_REPORTS_PRODUCED_QUALITY_GAPS_MAPPED`

Jobs:

| Label | Job | Result |
| --- | --- | --- |
| `bundesrat-rechtskraftig` | `cb969b2d844242e2b3b48194abe6e88c` | internal report, `MOSTLY-TRUE` 78/82 primary, legal-binding caveat |
| `bundesrat-simple` | `3d23e8347df444ec81e5fc637e3cf8d7` | internal report, `MOSTLY-TRUE` 72/68 primary, weaker than HJ59 |
| `asylum-235000-de` | `451732eef8004b5a8f85853e992f4592` | internal report, still `UNVERIFIED` because direct stock number is missing |
| `asylum-wwii-de` | `5e5a188a00dc4d7d8f5212268e95bb3c` | internal report, still `UNVERIFIED` because dual measurement evidence is missing |
| `bolsonaro-en` | `615be4c9226b4900b82553286a6e4ccf` | internal report, caveated true-side legal/procedural assessment |
| `bolsonaro-pt` | `5f026f1c4915455a88ba96f712790015` | short admin stop summary, W5 `hidden_no_extractable_evidence`, `0` EvidenceItems |
| `hydrogen-en` | `39c3505cea344c39b4278b76d2e25e9f` | internal report, expected false-side primary verdict (`FALSE` 8/82) |
| `plastic-en` | `71ab493bd64640f5957acd4e59e1c362` | internal report, plausible mostly-true primary verdict (`MOSTLY-TRUE` 72/78) |

Public/default containment held for all submitted jobs: no public/default report
markdown, verdict, truth percentage, or confidence was returned. The public V2
surface remained precutover/blocked.

Machine-readable evidence:

`Docs/WIP/canary-evidence-hj60-stronger-internal-report-gauntlet.json`

## Interpretation

HJ60 is a stronger progress signal than a one-job canary: the normal manual V2
path now produces internal Alpha reports for most benchmark inputs. The next
bar is report quality and stability, not reachability.

Important defects now visible:

- Bundesrat-simple did not reproduce the HJ59 high result; it produced a weaker
  split report (`MOSTLY-TRUE` 72/68 plus `UNVERIFIED` 45/42). This points to
  verdict/report consolidation and stability, not another isolated W5 prompt
  patch.
- The asylum-family reports correctly identify stock-vs-flow and comparison
  evidence gaps, but still do not retrieve/use the decisive current stock and
  WWII comparator quantities.
- Bolsonaro PT still stops at W5 with no EvidenceItems while Bolsonaro EN
  produces a report, showing a multilingual/source-material or W5 extraction
  robustness gap.
- Hydrogen and plastic are comparatively strong and should be used as guardrail
  comparators while repairing weaker families.

## Budget Result

HJ60 consumed `8` live jobs. Combined with HJ58 and HJ59, this tranche has
consumed `10` of the reset `18`; `8` remain.
