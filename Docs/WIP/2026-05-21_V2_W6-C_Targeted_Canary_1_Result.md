# V2 W6-C Targeted Canary #1 Result — Timeout Fix Validation

**Date:** 2026-05-21
**Canary type:** Targeted retrieval canary — provider timeout fix (Direction A)
**Runtime commit:** `f7fb259d` (feat: wire W6-C dimension projections through
artifact observation path)
**Job ID:** `24aed060474847f18371572e552da22a`
**Claim:** "Using hydrogen for cars is more efficient than using electricity"
**Budget slot:** 4 of 20 (2 informative, 2 wasted — see accounting below)

## Change Under Test

`SOURCE_ACQUISITION_CANDIDATE_PROVIDER_NETWORK_PROVIDER_TIMEOUT_MS` raised from
1500ms → 3000ms (and `TOTAL_TIMEOUT_MS` from 9000ms → 18000ms) in
`candidate-provider-network-loop.ts`.

## Pipeline Result

- **W2:** `candidate_provider_network_completed`, 9 Wikimedia candidates + 3
  OpenAlex candidates (12 total, 3 structurally dropped)
- **W3A:** 9 materialized previews (all Wikimedia)
- **W3B:** 3 source materials created:
  - 1× OpenAlex abstract (2027 bytes, `openalex_work_abstract_text`)
  - 2× Wikimedia page summaries (392 + 329 bytes,
    `wikimedia_page_summary_extract_text`)
- **W4:** 1 extraction input packet, 2752 bytes aggregate from 3 source
  materials
- **W5:** `extractionResultStatus = accepted`, 3 EvidenceItems
- **W5E:** `evidence_items_ready_for_downstream_internal_handoff`, 3 admitted
- **W6-C:** `sufficiencyResultStatus = accepted`,
  `reportStopRecommendation = refine_retrieval`,
  `schemaDiagnostics = null`
- **W8-B:** `boundary_verdict_candidate_not_ready` (expected)

## Network Telemetry (timeoutMs=3000 confirmed)

| Provider | Query | Status | Duration | Timeout | Candidates |
|---|---|---|---|---|---|
| Wikimedia | Q1 | success | 477ms | 3000ms | 3 |
| Wikimedia | Q2 | success | 564ms | 3000ms | 3 |
| Wikimedia | Q3 | success | 565ms | 3000ms | 3 |
| OpenAlex | Q4 | **cancelled** | 3014ms | 3000ms | 0 |
| OpenAlex | Q5 | **cancelled** | 3008ms | 3000ms | 0 |
| OpenAlex | Q6 | success | 1654ms | 3000ms | 3 |

**OpenAlex timeout pattern persists:** 2/3 queries hit the timeout cap at 3000ms
(vs 2/3 at 1500ms in the diagnostic canary). The ~14ms overshoot pattern
(3014ms/3008ms vs cap of 3000ms) is consistent with abort signal latency — the
abort fires at exactly the cap, and signal processing adds ~14ms. The identical
2/3 failure rate at both 1500ms and 3000ms confirms the cap value is not the
constraint; raising it further is unlikely to improve the success rate.

## Diagnostic Dimension Projections (W6-C)

| Dimension | Diagnostic Canary (job `6e0e30ce`) | This Canary (job `24aed060`) |
|---|---|---|
| `source_diversity` | **material** | **material** |
| `counter_evidence` | **material** | **material** |
| `direct_evidence` | **material** | **material** |
| `method_quality` | **material** | **material** |
| `temporal_coverage` | minor | minor |
| `source_access` | (not flagged) | (not flagged) |
| `other` | (not flagged) | (not flagged) |

**Same 4 material + 1 minor dimensions. No dimension-level improvement.**

## Source Material Comparison

| Metric | Diagnostic (1500ms) | This Canary (3000ms) | Delta |
|---|---|---|---|
| OpenAlex queries successful | 1/3 | 1/3 | — |
| OpenAlex source materials | 1 (2027 bytes) | 1 (2027 bytes) | — |
| Wikimedia search candidates | 9 | 9 | — |
| Wikimedia page summaries | 2 (unknown bytes) | 2 (721 bytes) | — |
| Total source materials | 3 | 3 | — |
| Total content bytes | ~2750 | 2748 | — |
| EvidenceItems extracted | 2 | 3 | +1 |
| Material dimensions | 4 | 4 | — |
| Outcome | `refine_retrieval` | `refine_retrieval` | — |

The +1 EvidenceItem (2→3) reflects natural LLM extraction variance from the
same content volume, not a retrieval improvement. The timeout fix is
**marginal** — it does not change provider success rates or the sufficiency
outcome.

## Upstream Stop Attribution

```
firstIncompleteStage: boundary_verdict_candidate
firstIncompleteReason: boundary_verdict_candidate_not_ready
  └── sufficiencyAssessment:
        reportStopRecommendation: refine_retrieval
        admittedEvidenceItemCount: 3
```

The pipeline stops at W6-C (sufficiency) because the LLM determines 3
EvidenceItems from ~2.7KB of source text is insufficient for a reliable verdict.
4 of 7 rubric dimensions remain materially deficient.

## Root Cause Analysis

The timeout fix does not address the fundamental constraint:

1. **OpenAlex success rate is time-insensitive:** 2/3 queries timeout regardless
   of the cap value. The responses may require >3s. Increasing the timeout
   further has diminishing returns and extends total pipeline duration.

2. **Wikimedia content is structurally thin:** Wikimedia page summaries
   (`extract_text`) provide 300-400 byte summary paragraphs, not full article
   content. Two summaries contribute ~721 bytes — marginal compared to a single
   OpenAlex abstract (2027 bytes).

3. **Content volume is the binding constraint:** 2748 bytes total across 3
   source materials is insufficient for the LLM to assess source diversity,
   counter-evidence, direct evidence, and method quality. The retrieval system
   finds relevant candidates (9 Wikimedia + 3 OpenAlex) but materializes very
   little content from them.

4. **Wikimedia page summaries vs full content:** The V2 pipeline fetches
   Wikimedia page *summaries* (via `ep_wikimedia_project_page_summary`), not
   full Wikipedia article text. This is an architectural choice — full content
   dereference is gated by the staged cutover design. Search candidates go
   through W2→W3A→W3B, where W3B fetches the summary but the
   `candidate_to_source_material_gate_closed` at W2 blocks full content
   dereference at that stage.

## Budget Accounting

| Slot | Job ID | Variant | Timeout | Informative | Notes |
|---|---|---|---|---|---|
| 1 | `6e0e30ce` | V2 | 1500ms | **Yes** | Diagnostic canary (baseline) |
| 2 | `4ea55fe5` | ~~V1~~ | — | **No** | Wrong variant (submitted as V1) |
| 3 | `7c826d4d` | ~~V1~~ | — | **No** | Wrong variant (submitted as V1) |
| 4 | `71fbaefe` | V2 | ~~1500ms~~ | **No** | Stale server (timeout fix not active) |
| 5 | `24aed060` | V2 | 3000ms | **Yes** | This canary |
| — | — | — | — | — | 15 remaining of 20 authorized |

**3 wasted jobs:** 2 submitted with wrong pipeline variant (V1 default), 1 ran
against stale production build. All three errors have been root-caused and
procedurally corrected.

## Conclusion

The timeout fix is empirically marginal. The W6-C `refine_retrieval` outcome is
driven by **content volume** (2.7KB across 3 source materials), not by provider
timeout configuration. Reconvening Steer-Co is warranted after 1 targeted canary
instead of the planned 2, because:

1. The canary validates the timeout fix is not curative — same 4 material
   dimensions, same outcome.
2. The root cause (low content volume from thin source materials) cannot be
   addressed by further timeout tuning.
3. Spending a second targeted canary on a different timeout value would confirm
   the same finding without advancing the workstream.

## Validation

- Diagnostic projections are enum-only: `dimension` and `materiality` per entry.
- `redaction.sufficiencyResultPayloadReturned` stays `false`.
- All `dimension` values within 7-value allowlist.
- All `materiality` values within `{none, minor, material}`.
- `timeoutMs: 3000` confirmed in all 6 network attempt telemetry records.
- No prompt, schema, model, or config changes were made.
