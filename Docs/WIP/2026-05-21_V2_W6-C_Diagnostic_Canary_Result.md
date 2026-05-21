# V2 W6-C Diagnostic Canary Result

**Date:** 2026-05-21
**Canary type:** W6-C diagnostic projection validation (Direction A)
**Runtime commit:** `9f6df4b7` (feat: wire W6-C dimension projections through
artifact observation path)
**Job ID:** `6e0e30ce0897472da589e498368a52df`
**Claim:** "Using hydrogen for cars is more efficient than using electricity"
**Budget slot:** 1 of 4 (diagnostic validation)

## Pipeline Result

- **W5:** `extractionResultStatus = accepted`, 2 EvidenceItems
- **W5E:** `evidence_items_ready_for_downstream_internal_handoff`, 2 admitted
- **W6-C:** `sufficiencyResultStatus = accepted`,
  `reportStopRecommendation = refine_retrieval`,
  `schemaDiagnostics = null`
- **W8-B:** `boundary_verdict_candidate_not_ready` (expected — W6-C stops the
  pipeline with `refine_retrieval`)

## Diagnostic Dimension Projections

| Dimension | Materiality |
|---|---|
| `source_diversity` | **material** |
| `counter_evidence` | **material** |
| `direct_evidence` | **material** |
| `method_quality` | **material** |
| `temporal_coverage` | minor |
| `source_access` | (not flagged) |
| `other` | (not flagged) |

**4 of 7 dimensions flagged as material.**

## Interpretation

The LLM assessed 4 rubric dimensions as materially deficient for the claim
"hydrogen vs electricity efficiency":

1. **`source_diversity`** — 2 EvidenceItems from the same general source type
   (encyclopedic/summary). No primary research, government/regulatory, or
   industry data.
2. **`counter_evidence`** — No evidence presenting the opposing perspective
   (i.e., arguments for hydrogen efficiency or against electric efficiency).
3. **`direct_evidence`** — No primary measurements, experimental data, or
   head-to-head comparison studies.
4. **`method_quality`** — No peer-reviewed methodology, comparative analysis,
   or structured quantitative evidence.

`temporal_coverage` is minor — the existing sources are reasonably current.
`source_access` and `other` are not flagged.

## Retrieval Improvement Targeting

Based on the 4 material dimensions, retrieval improvement should focus on:

- **Source type diversity:** Add academic/research sources (OpenAlex, Semantic
  Scholar) with full abstracts or structured data, not just encyclopedic
  summaries.
- **Counter-evidence:** Ensure search queries include both perspectives of the
  hydrogen-vs-electricity comparison.
- **Direct evidence:** Prefer primary research, efficiency measurements,
  comparative studies over secondary summaries.
- **Method quality:** Prefer peer-reviewed or structured quantitative sources.

The inference in the steering package (Direction B) correctly predicted
`source_diversity`, `direct_evidence`, and `method_quality` as likely deficient,
but missed `counter_evidence` as a 4th material dimension. This validates the
Direction A approach — the diagnostic projection exposed a dimension that
inference alone would have missed.

## Validation

- Diagnostic projection is enum-only: `dimension` and `materiality` per entry.
  No `rationale`, `sufficiencyStatus`, `materialScarcityCandidate`, free-text,
  or provider identifiers in the output.
- `redaction.sufficiencyResultPayloadReturned` stays `false`.
- All `dimension` values are within the 7-value allowlist.
- All `materiality` values are within `{none, minor, material}`.
- Amendment 5 (negative-scope) structurally enforced by allowlisted
  `ReadonlySet<string>` in both source and provenance.

## Budget Accounting

| Slot | Use | Status |
|---|---|---|
| 1 of 4 | Diagnostic validation | **spent** (this canary) |
| 2 of 4 | Targeted retrieval #1 | available |
| 3 of 4 | Targeted retrieval #2 | available |
| 4 of 4 | Contingency/escalation | reserved |

## Next Steps

1. Steer-Co reconvenes to decide targeted retrieval improvement strategy based
   on the 4 material dimensions.
2. Up to 2 targeted retrieval canaries remaining.
3. If 2 targeted canaries still return `refine_retrieval`, the Captain must
   consider whether the sufficiency bar itself is appropriate for internal alpha
   (amendment 3 exit criteria).
