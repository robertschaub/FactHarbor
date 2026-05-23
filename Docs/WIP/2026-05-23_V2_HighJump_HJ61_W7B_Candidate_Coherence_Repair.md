# V2 HighJump HJ61 W7-B Candidate Coherence Repair

**Status:** partial pass; follow-up W7-B polarity repair required
**Date:** 2026-05-23
**Owner:** Captain Deputy / Lead Developer
**Authority:** Captain HighJump direction, prompt edits allowed, live-job budget reset to 18

## Purpose

HJ60 proved broad internal V2 report reachability: seven of eight
Captain-defined inputs produced authenticated admin-only internal Alpha reports.
The next bar is report quality, not more reachability scaffolding.

The strongest cross-input defect is that W7-B can create confusing or
miscalibrated verdict candidates before the report writer receives them:

- `plastic-en` produced a `MOSTLY-TRUE` primary section, but the benchmark
  expectation is false-side or at most `MIXED`.
- `bundesrat-simple` produced a weaker split report than HJ59, with a secondary
  `UNVERIFIED` procedural section rather than one high-true chronology result
  with caveats.
- `bundesrat-rechtskraftig` produced section-level directions that are hard to
  read as one coherent legal-force/chronology assessment.

The internal report writer is not the right owner: its contract must preserve
W7-B verdict values and cardinality exactly. HJ61 therefore amends the existing
`V2_BOUNDARY_VERDICT_EXECUTION` prompt section so W7-B forms fewer, more
claim-aligned top-line verdict candidates and treats context-only caveats as
caveats or limitations rather than equal competing verdicts.

## Reviewer Consolidation

Reviewer signals:

- Opus 4.6 and one GPT reviewer recommended report consolidation/stability as
  the next broad quality owner.
- A second implementation-path reviewer correctly noted that report-writer
  prose cannot fix the issue because `V2_AGGREGATION_NARRATIVE` preserves
  upstream W7-B verdict values/cardinality.

Consolidated decision: repair W7-B candidate coherence first. Queue direct
source-material usefulness for numeric stock/comparison families next if the
asylum reports remain weak after candidate coherence is no longer masking the
quality picture.

## Scope

Allowed:

- amend only the existing `V2_BOUNDARY_VERDICT_EXECUTION` prompt section in
  `apps/web/prompts/claimboundary-v2.prompt.md`;
- update focused prompt-contract tests;
- update status/ledger/evidence docs after verification and canaries;
- import/activate the revised `claimboundary-v2` prompt through UCM before live
  validation;
- run a bounded live canary set after commit/runtime refresh.

Closed:

- no code-side deterministic semantic rule;
- no report-writer value mutation;
- no schema/model/config/provider/source/parser/cache/SR/storage changes;
- no source expansion, retries, ACS/direct URL, public behavior, UI/report/export
  cutover, compatibility projection, or V1 work;
- no family-specific prompt examples or benchmark vocabulary.

## V2 Scorecard Impact

Quality dimension advanced: V2-Q5 verdict quality, V2-Q4 boundary formation,
V2-Q7 multilingual robustness indirectly by keeping the rule generic.

Direct user/report value: improves internal report top-line coherence and
reduces misleading split verdict sections before public cutover.

Hidden-only value: none added; this amends an existing LLM task.

Cost/latency impact: unchanged per job, except one prompt wording change.

Retirement or simplification unlocked: if W7-B candidate coherence improves,
avoid adding a separate report-consolidation layer after the report writer.

Scorecard risk: prompt change may alter W7-B behavior across families; use
guardrail canaries.

## V2 Retirement Ledger Impact

Rows touched: V2-RL-021 and V2-RL-023.

Status changes: none.

New mechanism owner: none.

Removal / merge trigger: if HJ61 succeeds, keep report writer value-preserving
and do not add a downstream consolidation mechanism.

Debt accepted: no new mechanism; prompt calibration debt remains until HJ61
live evidence is reviewed.

## V2 Consolidation Gate

Net mechanism count: unchanged.

This package amends an existing prompt mechanism and test. It adds no hidden
artifact, route, denial layer, proof layer, retry, fallback, or parallel report
path.

## Debt-Guard

Required path: Full.

Classification: `incomplete-existing-mechanism`.

Chosen option: amend the existing W7-B prompt section.

Rejected paths:

- Report-writer repair: rejected because the writer must preserve W7-B values.
- Source-material XLSX repair first: valid follow-up, but it does not address
  plastic and Bundesrat candidate-coherence defects.
- Family-specific prompt examples or code: rejected by generic-by-design rules.

Net mechanisms: unchanged.

## Debt-Sensor Status

Latest intake:

- `npm run debt:sensors`: `advisory_warn`
- Salient warnings: V2 source/test footprint, boundary guard size, WIP/handoff
  volume, net mechanism telemetry, consolidation-marker warnings.

These are steering context, not blockers for this prompt-amendment package.

## Verifier Plan

Before commit:

1. `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts`
2. `npm -w apps/web run build`
3. `npm run debt:sensors`
4. `git diff --check`

Before live jobs:

1. commit source/docs;
2. import/activate revised `claimboundary-v2` prompt in UCM;
3. restart/refresh runtime;
4. confirm clean git status;
5. confirm Web/API/proxy runtime commit equals HEAD;
6. confirm default pipeline is `claimboundary-v2`;
7. confirm active `claimboundary-v2` prompt hash matches the revised prompt.

## Implementation Checkpoint

Local source/test delta:

- `apps/web/prompts/claimboundary-v2.prompt.md`: amended only the existing
  `V2_BOUNDARY_VERDICT_EXECUTION` section with generic candidate-coherence,
  categorical-claim calibration, and temporal/procedural pending-posture
  guidance.
- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`:
  added focused prompt-contract assertions for the new W7-B guidance.
- lane and ledger docs synced to the Captain's post-HJ60 18-job budget reset.

Verifier results:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`: PASS.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts`: PASS.
- `npm -w apps/web run build`: PASS.
- `npm run debt:sensors`: `advisory_warn`; no new blocking debt signal.
- `node -e "JSON.parse(...V2_Live_Job_Tranche_Ledger.json...)"`: PASS.
- `npm run index`: PASS.
- `git diff --check`: PASS.

## Live Result

Runtime and prompt state:

- implementation/runtime commit: `cd7f2e214b762a456b9e3623f427f3f1c0f3015d`;
- active `claimboundary-v2` prompt hash:
  `0d2aa1e11c26b89fe61023822e8ded1a989c7c7c27e5515272bacb5841ac9753`;
- evidence file:
  `Docs/WIP/canary-evidence-hj61-w7b-candidate-coherence.json`.

Jobs:

| Input | Job ID | Result |
| --- | --- | --- |
| `Plastic recycling is pointless` | `212aee1b8b6340949449539e8caaca85` | Internal report produced, but still `MOSTLY-TRUE` 72/68 plus `MIXED` 50/62. This fails the accepted false-side or at-most-`MIXED` expectation. |
| `Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben` | `040fac63c75b43908ea1043dec9241a8` | Internal report produced with one coherent `MOSTLY-TRUE` 78/82 temporal-sequence section. This improves over HJ60's split report, though it remains below the HJ59 high result. |
| `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben` | `72b40abeb38f4ecca1a03a51902b72c5` | Internal report produced but still split: `MOSTLY-TRUE` 72/78 plus `UNVERIFIED` 45/35. |
| `Using hydrogen for cars is more efficient than using electricity` | `09e3fccef3b54f76bf7ae7d153b0eb77` | Internal report produced, but W7-B emitted `FALSE` 92/88 and `MOSTLY-FALSE` 78/72. This is a hard polarity/calibration defect because truth percentage must measure the submitted claim truth, not confidence in falsehood. |

Public/default containment held for all four jobs: public/default job payloads
kept `reportMarkdown` null, public/default verdict/truth/confidence null, the
result envelope remained `4.0.0-cb-precutover` with
`publicCutoverStatus: blocked_precutover`, default internal report-writer route
stayed hash/length/provenance-only, and unauthenticated hidden artifact route
access returned `401`.

Classification:

`PARTIAL_X7_HJ61_W7B_CANDIDATE_COHERENCE_IMPROVED_ONE_TARGET_POLARITY_REPAIR_REQUIRED`

Failed-attempt recovery:

- keep: selected-claim candidate economy and temporal pending-posture guidance,
  because it improved `bundesrat-simple` and added no new mechanism;
- amend: existing W7-B internal verdict calibration must state that
  `internalTruthPercentageCandidate` is the estimated truth of the selected
  AtomicClaim itself and must be band-consistent with the
  `internalVerdictLabelCandidate`;
- do not revert wholesale unless the focused polarity amendment fails local
  verifier and live validation.

## Live Canary Set

Use Captain-defined inputs only:

1. `Plastic recycling is pointless`
2. `Der Bundesrat unterschrieb den EU-Vertrag bevor Volk und Parlament darüber entschieden haben`
3. `Der Bundesrat unterschrieb den EU-Vertrag rechtskräftig bevor Volk und Parlament darüber entschieden haben`
4. `Using hydrogen for cars is more efficient than using electricity`

Budget: up to 4 jobs from the reset 18-job tranche. Run sequentially.

Pass signals:

- public/default containment remains precutover/blocked with no public/default
  report/verdict/truth/confidence;
- plastic moves toward benchmark-compatible false-side/`MIXED` direction or at
  least no longer promotes a high true-side primary for the whole claim;
- bundesrat-simple moves back toward one high true-side chronology result with
  procedural caveats rather than a low-confidence competing procedural verdict;
- bundesrat-rechtskraftig remains coherent inside its mixed/true-side legal-force
  band rather than over-promoting a chronology-only true-side section;
- hydrogen remains false-side and does not regress.

Stop signals:

- stale runtime/source, unexpected V1 routing, or public/default leak;
- prompt activation drift;
- W7-B schema/contract damage;
- same defect repeats across the targeted canaries without useful new evidence;
- canary outcome shows the problem is actually source-material/evidence
  usefulness rather than W7-B coherence.

## Next If HJ61 Is Not Enough

If numeric stock/comparison reports remain weak while W7-B coherence improves,
the next package should amend the existing Source Material selection path so
already materialized bounded spreadsheet/downloadable public-record source
material is not dropped before W5.
