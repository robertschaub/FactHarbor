# V2 HighJump HJ56 - Full Internal Report Gauntlet

**Status:** live gauntlet complete; broad reachability proven, W5/report-quality
defects mapped
**Date:** 2026-05-23
**Owner:** Captain Deputy / Lead Developer
**Preceded by:** HJ55 job `8e7375f8d29e4d5b8fe453ebcfe6c295`

## Why This Slice Exists

HJ54 made the plastic input reach internal Alpha report generation. HJ55 fixed
query-planning underuse for that input: Query Planning increased from `3` to
`5` distinct queries and Candidate Provider Network increased from `9` to `15`
retained candidates. W5 still emitted only `3` EvidenceItems.

The next balanced HighJump step is a stronger validation pass, not another
single canary or speculative prompt tweak. HJ56 runs the current V2 stack across
all Captain-defined benchmark inputs to map which report-quality defects repeat
and which are family-specific.

## Scope

Allowed:

- run the eight Captain-defined inputs exactly as listed in `AGENTS.md`;
- submit jobs through the existing direct V2/default route;
- run jobs sequentially or with intentionally low concurrency to avoid
  concurrency-induced quality noise;
- inspect hidden/admin-only artifacts and admin report markdown;
- record report produced / new stage reached / new failure / repeated stop
  information yield per input.

Closed:

- source, prompt, config, schema, model, provider, parser, cache/SR/storage,
  ACS/direct URL, V1, public cutover, UI, API, report-export, compatibility, or
  durable-storage changes;
- deterministic semantic quality adjudication in code;
- retry loops or broad repair work during the gauntlet.

## Inputs

1. `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben`
2. `Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben`
3. `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`
4. `235000 Flüchtlinge leben in der Schweiz, das sind fast so viel im am Ende des Zweiten Weltkrieges.`
5. `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`
6. `O processo judicial contra Jair Bolsonaro por tentativa de golpe de Estado respeitou o direito processual brasileiro e os requisitos constitucionais, e as sentencas proferidas foram justas`
7. `Using hydrogen for cars is more efficient than using electricity`
8. `Plastic recycling is pointless`

## V2 Scorecard Impact

Positive:

- V2-Q1 usable report path: verifies whether complete internal V2 reports now
  generalize beyond one or two inputs.
- V2-Q4 evidence usefulness: identifies whether source usefulness, W5
  extraction breadth, or report roll-up is the repeated bottleneck.
- V2-Q6 report quality: compares internal report shape against Captain
  benchmark expectations before the next implementation repair.
- V2-Q8 multilingual robustness: includes German, English, and Portuguese
  canonical inputs.

## V2 Retirement Ledger Impact

No new mechanism. HJ56 is validation-only. It should reduce future hidden
machinery pressure by making the next repair evidence-driven. If repeated W5 or
source-material defects appear, retire or consolidate older stop/diagnostic
layers before adding new ones.

## V2 Consolidation Gate

Allowed because this package adds no code, prompt, schema, route, artifact, or
policy mechanism. It spends live-job budget to replace speculation with a
cross-family defect map.

## Debt-Guard Result

Classification: `validation-before-new-mechanism`.

Chosen option: run a bounded multi-input validation gauntlet before adding any
new repair mechanism.

Rejected paths:

- another single canary, because HJ54/HJ55 already proved the local plastic
  path;
- immediate W5 prompt edit, because we need to know whether the W5 thinness is
  systemic or plastic-specific;
- source/provider expansion, because no cross-family evidence proves the current
  providers are the repeated blocker;
- verdict/report-writer repair, because we need to compare internal report
  defects across families first.

Net mechanisms: unchanged.

## Verification And Preflight

Before submitting jobs:

- git status clean;
- Web/API/proxy version endpoints match committed HEAD;
- UCM default pipeline remains `claimboundary-v2`;
- active `claimboundary-v2` prompt is
  `hj55-query-planning-angle-breadth` with hash
  `3ab12da1646b9b4bb5bef83c5ef827e643bc9343b9cc9fa8eb0b3b95bc917be1`;
- public/default V2 remains precutover/damaged until explicit cutover.

After each job:

- classify information yield;
- inspect hidden/admin artifacts for stage reachability, query count, candidate
  count, source-content packet count, EvidenceItem count, sufficiency status,
  internal Alpha result, and report-writer status;
- verify unauthenticated hidden routes return `401`;
- verify public/default job output has no report markdown, verdict, truth
  percentage, confidence, source text, prompt text, provider payload, or hidden
  statuses.

## Pass / Stop Criteria

The gauntlet passes as a validation package if:

- all jobs submit against the committed runtime and run `claimboundary-v2`;
- public/default containment holds for every job;
- each job yields either a complete internal Alpha report or a useful stop with
  durable hidden/admin evidence;
- the resulting defect map identifies the next single implementation bar.

Stop immediately if:

- runtime commit/proxy provenance is stale;
- any job unexpectedly runs V1;
- any public/default/admin-default/log/error surface leaks hidden report text,
  source text, prompt text, provider payload, verdict, truth, confidence, or
  hidden artifact ids;
- the direct route fails before job creation;
- the first two jobs repeat the same infrastructure/provider failure without new
  diagnostic value.

Individual report-quality failures are not hard stops for the gauntlet; they are
the expected signal. Do not start a repair during HJ56.

## Budget

Captain reset the live-job budget to `18` after HJ54. HJ55 consumed `1`; `17`
remain. HJ56 may spend up to `8` jobs and should leave at least `9`.

## Live Result

Completed on 2026-05-23 on runtime commit
`88b41c5a214e54a96aec730aca4d087708083760`.

Result evidence:

`Docs/WIP/canary-evidence-hj56-full-internal-report-gauntlet.json`

Classification:

`MIXED_PASS_X7_HJ56_FULL_INTERNAL_REPORT_GAUNTLET_REACHABILITY_BROAD_W5_AND_QUALITY_DEFECTS_MAPPED`

Summary:

| Slug | Job | Result |
|---|---|---|
| `bundesrat-rechtskraftig` | `0e102e087d224affac9cd95e34887516` | Internal report produced; `3` EvidenceItems; `5832` admin markdown chars |
| `bundesrat-simple` | `57fedbd7f4bd44d88290f43ffe4a6e5c` | Admin stop summary; W5 `task_contract_validation_failed` / `approved_packet_mismatch` |
| `asylum-235000-de` | `7a46b7f8d7a24e5aaf82c395043e5a11` | Internal report produced; `3` EvidenceItems; verdict line still `UNVERIFIED` |
| `asylum-wwii-de` | `d859c11d18a84542a0e188725aba44ee` | Internal report produced; `2` EvidenceItems; separate current/WWII sections |
| `bolsonaro-en` | `421f2028ece1460f8782fa721dab3fb7` | Internal report produced; `3` EvidenceItems; only `2` selected claims and UNVERIFIED/MIXED lines |
| `bolsonaro-pt` | `dbcf916966de4d15a7798547b0d05003` | Admin stop summary; W4-G `source_material_text_oversized` before W5 |
| `hydrogen-en` | `6435be9eda01462da01c0f6d344d25ec` | Admin stop summary; W5 `schema_validation_failed` with `evidenceItems` too big |
| `plastic-en` | `328b65a37a2b431a802f8aea5df7d988` | Internal report produced; `4` EvidenceItems; large multi-verdict report |

Containment held for every job:

- all jobs ran `claimboundary-v2`;
- public/default schema stayed `4.0.0-cb-precutover`;
- public cutover stayed `blocked_precutover`;
- public issue stayed `report_damaged`;
- public/default report markdown, verdict, truth percentage, and confidence
  remained absent;
- checked unauthenticated hidden artifact routes returned `401`.

Information yield:

- `5/8` jobs produced internal report-writer drafts.
- `3/8` jobs produced admin stop summaries before report writer.
- Report reachability is now broad enough that the next useful work should not
  be route/UI/plumbing reachability.
- The repeated blockers are W5 extraction contract/schema robustness,
  EvidenceItem breadth, W4-G oversized-text handling for PT, and report
  roll-up/calibration.

Next direction:

The next implementation bar should target W5 extraction contract/schema repair
and EvidenceItem breadth first. This is the broadest repeated failure:
Bundesrat-simple and hydrogen stopped at W5 damage, and produced reports still
carry only `2` to `4` EvidenceItems. Do not start source/provider expansion or
public cutover before that bar is raised.
