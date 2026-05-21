# V2 W6-C Retrieval-Quality Steering Package

**Status:** Prepared for Steer-Co review
**Date:** 2026-05-21
**Author:** Captain Deputy (Claude Opus 4.6)
**Package type:** steering decision package (no implementation, no live job)
**Predecessor:** `Docs/AGENTS/Handoffs/2026-05-21_Captain_Deputy_V2_W6-F1_Agent_Handoff_Pause.md`
**Application-code HEAD:** `7f5fe959`

## Decision Requested

How should the team improve evidence value so W6-C stops returning
`refine_retrieval` and allows progression to boundary/verdict formation?

This package requests a steering direction only. It authorizes no
implementation, no live job, no prompt/model/config/schema edit, no provider
expansion, and no public behavior.

## Current Evidence

W6-F1 canary job `2c60d8e749514f0d84e1158ae7dc9354` on runtime `7f5fe959`:

- Source Material: `3` records (1 OpenAlex `openalex_work_abstract_text`, 2
  Wikimedia `wikimedia_page_summary_extract_text`)
- W5: `extractionResultStatus = accepted`, `3` EvidenceItems,
  `schemaDiagnostics = null`
- W5E: `bounded_evidence_items_admitted_internal_consumption_pending`, no
  block/damage reason
- W5-F: `evidence_items_ready_for_downstream_internal_handoff`
- W6-C: `sufficiencyResultStatus = accepted`, `schemaDiagnostics = null`,
  `reportStopRecommendation = refine_retrieval`
- W8-B/W8-F: `boundary_verdict_candidate_not_ready`

Claim used: `Using hydrogen for cars is more efficient than using electricity`

## The Evidence Gap

The W6-C sufficiency assessment projection includes only:

- `sufficiencyResultStatus` (enum)
- `reportStopRecommendation` (enum)
- `sufficiencyResultPayloadHash` (SHA-256 of the full assessment)

The full `missingEvidenceDimensions` array — which records which of the 7
rubric dimensions (`source_diversity`, `direct_evidence`, `counter_evidence`,
`temporal_coverage`, `method_quality`, `source_access`, `other`) the LLM
flagged as `material`, `minor`, or `none` — is hashed but **not projected**.
The `rationale` field is also not projected.

This means we do not know which specific dimensions drove the `refine_retrieval`
recommendation on any canary since W6-C4 (the schema repair that made W6-C
produce accepted output). Every W6-C canary since then — W6-C4, W6-C5, W6-D,
W6-D3, W6-E, W6-F1 — returned `refine_retrieval` without exposing which
dimensions are material.

The `redaction.sufficiencyResultPayloadReturned` field is hardcoded `false` in
`sufficiency-assessment.ts:671`. The provenance contract in
`evidence-lifecycle-sufficiency-assessment-provenance.ts:118` enforces this.

## Chronology of Retrieval Improvements

| Canary | Evidence composition | Result |
|---|---|---|
| W6-C4 `cbb4f6b5` | 1 Wikimedia Source Material → 1 EvidenceItem | `refine_retrieval` |
| W6-C5 `305176cf` | 1 Wikimedia Source Material → 1 EvidenceItem | `refine_retrieval` |
| W6-D3 `be008b8b` | 3 Wikimedia Source Material → 3 EvidenceItems | `refine_retrieval` |
| W6-E `6a09d149` | 3 Wikimedia (query-balanced) → 3 EvidenceItems | `refine_retrieval` |
| W6-F1 `2c60d8e7` | 1 OpenAlex + 2 Wikimedia → 3 EvidenceItems | `refine_retrieval` |

Five consecutive `refine_retrieval` results across increasing retrieval
diversity, from 1 encyclopedic item to 3 items from 2 provider types. The
sufficiency bar has not moved despite meaningful retrieval improvement.

## Possible Directions

### Direction A: W6-C Sufficiency Diagnostic Projection First

Add a bounded structural projection of `missingEvidenceDimensions` dimension
names and materiality values (no rationale text, no source text, no statement
text) to the W6-C decision. This lets the next canary capture which dimensions
are material, giving Steer-Co evidence-based retrieval direction.

- **Cost:** One implementation package (schema/projection change, Captain
  approval gate for schema edit), plus one canary slot.
- **Value:** Eliminates guessing. Every future retrieval improvement can target
  the specific deficient dimensions.
- **Risk:** Low. Dimension names and materiality enums are structural metadata,
  not source text or analytical content. The projection already carries
  `reportStopRecommendation` (which is itself an LLM-generated enum).

### Direction B: Inference-Based Retrieval Improvement

Infer the likely deficient dimensions from the evidence profile and improve
directly. Given 3 items (1 academic abstract + 2 encyclopedic summaries) for
"hydrogen vs electricity efficiency":

- `source_diversity`: 2 providers, but both provide summary/encyclopedic
  content. No primary research, no government/regulatory, no industry data.
- `direct_evidence`: Encyclopedic summaries are indirect; an OpenAlex abstract
  is closer to direct evidence but still only one.
- `counter_evidence`: Unclear whether the 3 items include opposing perspectives.
- `method_quality`: No peer-reviewed methodology descriptions.
- `temporal_coverage`: Likely adequate from Wikipedia's currency.

Likely deficient: `source_diversity` (type diversity), `direct_evidence`,
`method_quality`.

- **Cost:** One implementation package + one canary, but aimed at the inferred
  dimensions.
- **Risk:** Medium. If the inference is wrong, the canary may still return
  `refine_retrieval` for a different reason, wasting a live-job slot.

### Direction C: Increase Evidence Volume

Raise the Source Material cap from `3` to a higher number (e.g., `5`) within
existing providers.

- **Cost:** Contract widening + implementation + canary.
- **Risk:** Medium-high. W6-D through W6-F1 show that going from 1→3 items
  didn't change the recommendation. More of the same type may not help if the
  issue is type diversity or quality, not quantity.

## Forbidden Directions

Per Captain standing instructions and predecessor handoff:

- Do not weaken W6-C sufficiency prompts or lower the sufficiency bar.
- Do not relax W7 boundary/verdict gates.
- Do not add another provider without Steer-Co review.
- Do not expose public report behavior, V1 cleanup/removal, or cutover.
- Do not bypass standing Captain approval gates.
- Do not run another W6-F1/W5E canary.

## Constraints

- **Live-job budget:** `4` remaining in tranche `v2-w6f1-captain-reset-2026-05-21`.
- **Debt sensors:** `advisory_warn` (stable). V2 source 159 files / 50230
  lines, tests 140 files / 55135 lines, boundary guard 11627 lines, WIP docs
  264, handoffs 410. Net mechanism increases 18.
- **V2 Retirement Ledger:** V2-RL-005 (W2 transport diagnostics), V2-RL-008
  (W3-B Wikimedia-specific → multi-provider transition). Any new mechanism must
  include a removal/quarantine trigger.
- **Schema/projection changes** require Captain approval gate.
- **Prompt/model/config changes** require Captain approval gate.

## Steer-Co Question

Given the evidence gap and the five consecutive `refine_retrieval` results:

1. Should we first capture W6-C sufficiency diagnostic dimensions (Direction A)
   before choosing a retrieval improvement path?
2. Or should we proceed with inference-based retrieval improvement (Direction B)
   and accept the risk of targeting the wrong dimensions?
3. If Direction A, should the diagnostic projection be bounded to dimension
   names + materiality only, or also include `materialScarcityCandidate` and
   `sufficiencyStatus`?

The Captain Deputy recommends **Direction A** because it costs one bounded
implementation step and one canary slot but eliminates guessing for all future
retrieval work. Five blind iterations have not moved the needle; the next one
should be targeted.

## V2 Scorecard Impact

Direction A is a diagnostic/observability improvement, not direct report-quality
progress. It enables targeted retrieval improvement in subsequent packages.

## V2 Retirement Ledger Impact

Direction A should not add a new retirement ledger row. It extends the existing
W6-C decision shape with structural metadata already present in the hashed
payload. If Direction A adds a new field to the provenance contract, that field
must be covered by the existing W6-C removal/merge triggers.

## Debt Sensor Status

Latest: `advisory_warn` (2026-05-21). Salient warnings: V2 footprint, boundary
guard size, WIP doc count, net mechanism increases. Direction A is a bounded
projection extension, not a new mechanism.
