# V2 W6-C Quota=6 Canary Result

**Date:** 2026-05-21
**Canary type:** Retrieval volume canary — fetch quota trio raised to 6
(Direction A, Axis 0a+0b)
**Runtime commit:** `63d2e7d3` (Axis 0b aggregate cap raise to 12288)
**Job ID:** `2c14b0a8853849aa963331f6ad7f8fbf`
**Claim:** "Using hydrogen for cars is more efficient than using electricity"
**Budget slot:** 10 of 20 (3 informative, 5 wasted, 2 partial)

## Changes Under Test

1. **Axis 0a** (commit `35bea403`): W3B fetch quota trio raised from 3 to 6.
2. **Axis 0b** (commit `63d2e7d3`): Aggregate byte caps raised across
   W4G/W4H/W5/W4I from 4096 to 12288 to accommodate quota=6 volume.

## Pipeline Result

- **W2:** Provider network completed, mixed Wikimedia + OpenAlex candidates
- **W3B:** 6 source materials created:
  - 1x OpenAlex abstract (1451 bytes, `openalex_work_abstract_text`)
  - 5x Wikimedia page summaries (960 + 457 + 309 + 392 + 585 bytes)
- **W4:** 1 extraction input packet, 4164 bytes aggregate from 6 source
  content packets (well within 12288 cap)
- **W5:** `extractionResultStatus = accepted`, 6 EvidenceItems
- **W5E:** `evidence_items_ready_for_downstream_internal_handoff`, 6 admitted
- **W6-C:** `sufficiencyResultStatus = accepted`,
  `reportStopRecommendation = refine_retrieval`,
  `schemaDiagnostics = null`
- **W8-B:** `boundary_verdict_candidate_not_ready` (expected)

## Diagnostic Dimension Projections (W6-C)

| Dimension | Diagnostic (2 EI) | Targeted #1 (3 EI) | This Canary (6 EI) |
|---|---|---|---|
| `source_diversity` | **material** | **material** | **material** |
| `counter_evidence` | **material** | **material** | **material** |
| `direct_evidence` | **material** | **material** | **material** |
| `method_quality` | **material** | **material** | **material** |
| `temporal_coverage` | minor | minor | minor |
| `source_access` | (not flagged) | (not flagged) | (not flagged) |
| `other` | (not flagged) | (not flagged) | (not flagged) |

**Same 4 material + 1 minor dimensions across all three canaries. No
dimension-level improvement despite doubling the source material count.**

The material dimension *set* is invariant but the *order* differs: this canary
lists `direct_evidence` first where prior canaries led with `source_diversity`.
Different output orderings on independent invocations with identical material
sets confirms the LLM is performing genuine structural assessment, not
memoizing or echoing cached output.

## Source Material Comparison

| Metric | Diagnostic (quota=3) | Targeted #1 (quota=3) | This Canary (quota=6) | Delta (→quota=6) |
|---|---|---|---|---|
| Source materials | 3 | 3 | 6 | +3 |
| OpenAlex abstracts | 1 (2027B) | 1 (2027B) | 1 (1451B) | — |
| Wikimedia summaries | 2 (~723B) | 2 (721B) | 5 (2703B) | +3 |
| Total content bytes | ~2750 | 2748 | 4154 | +51% |
| EvidenceItems extracted | 2 | 3 | 6 | +3 |
| Material dimensions | 4 | 4 | 4 | — |
| Outcome | `refine_retrieval` | `refine_retrieval` | `refine_retrieval` | — |

## Per-Record Source Material Breakdown

| # | Provider | Kind | Bytes |
|---|---|---|---|
| 1 | openalex | `openalex_work_abstract_text` | 1451 |
| 2 | wikimedia_core | `wikimedia_page_summary_extract_text` | 960 |
| 3 | wikimedia_core | `wikimedia_page_summary_extract_text` | 585 |
| 4 | wikimedia_core | `wikimedia_page_summary_extract_text` | 457 |
| 5 | wikimedia_core | `wikimedia_page_summary_extract_text` | 392 |
| 6 | wikimedia_core | `wikimedia_page_summary_extract_text` | 309 |

**Aggregate:** 4154 bytes content + 10 bytes separators (5x `\n\n`) = 4164
bytes input text. Well within the 12288 aggregate cap.

## Aggregate Byte Distribution Note

Per the Steer-Co re-anchoring clause: after sufficient quota=6 runs, report
actual aggregate byte distribution back for cap right-sizing.

This first quota=6 run shows 4164/12288 = **33.9% utilization** of the
aggregate cap. The 12288 cap provides comfortable headroom. If subsequent runs
confirm similar byte distributions, the cap could be tightened to 8192 without
risk — but there is no urgency since the current value is safe and the cap only
exists as a fail-closed safety bound.

## Root Cause Analysis

Doubling the source material count from 3 to 6 **doubled the EvidenceItem
count** (3→6) but **did not move any dimension off material**. This confirms:

1. **The `refine_retrieval` stop is content-quality-driven, not
   content-volume-driven.** More of the same source types does not address the
   4 material dimensions.

2. **Source diversity remains the structural constraint.** All 6 sources are
   encyclopedic summaries (5 Wikimedia page summaries + 1 OpenAlex abstract).
   The LLM correctly identifies that none provide:
   - Counter-evidence (opposing viewpoint)
   - Direct evidence (primary measurements/experiments)
   - Method quality (peer-reviewed comparative analysis)
   - Source diversity (only 2 provider types, both encyclopedic)

3. **OpenAlex variability is high.** The same claim returned a 2027-byte
   abstract in prior canaries but only 1451 bytes here — a 28% reduction. This
   confirms the earlier observation of 65% cross-run variability in OpenAlex
   abstract sizes.

## Upstream Stop Attribution

```
firstIncompleteStage: boundary_verdict_candidate
firstIncompleteReason: boundary_verdict_candidate_not_ready
  └── sufficiencyAssessment:
        reportStopRecommendation: refine_retrieval
        admittedEvidenceItemCount: 6
        missingEvidenceDimensionProjections:
          - direct_evidence: material
          - counter_evidence: material
          - source_diversity: material
          - method_quality: material
          - temporal_coverage: minor
```

## Conclusion

The fetch quota raise from 3 to 6 successfully:
- Passed all 6 source materials through the W4G/W4H/W5/W4I pipeline (Axis 0b
  aggregate cap fix validated)
- Doubled EvidenceItem extraction (3→6)
- Confirmed the pipeline handles 6-record fan-in correctly

But it did **not** move the W6-C sufficiency stop. The `refine_retrieval`
recommendation is stable across 3 canaries with 2, 3, and 6 EvidenceItems
respectively. The same 4 dimensions remain material in all runs.

**Next step:** The evidence now clearly shows that same-provider volume
increases cannot move the stop line. Moving W6-C off `refine_retrieval`
requires either:
1. Structurally different source types (primary research, government data,
   industry reports) — requires new provider integration
2. Adjusting the sufficiency prompt's bar for what constitutes adequate
   evidence coverage — requires prompt authority approval
3. Accepting that `refine_retrieval` is the correct assessment for this
   evidence quality and proceeding to boundary formation with a caveat

## Redaction Verification

- Diagnostic projections are enum-only: `dimension` and `materiality` per entry.
- No source text, evidence item text, prompt text, or internal state exposed.
- `redaction.sufficiencyResultPayloadReturned = false` confirmed in artifact.
- Report result default projection: `admin_structured_candidate_no_source_text`.
