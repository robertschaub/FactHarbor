# V2 HighJump HJ27 Bolsonaro Mixed-Source Report Result

**Date:** 2026-05-22  
**Role:** Captain Deputy / Lead Developer  
**Runtime commit:** `311b4b7a8ef23d2f638890337e80b3eba82acabd`  
**Implementation under test:** `30d8d011` Serper Source Material + `dbdd2acc` W4-H Serper lineage repair  
**Live job:** `f84d914e9ae74259a9c58505d2da190d`  
**Input:** `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`

## Result

Classification: `PASS_X7_HJ27_BOLSONARO_MIXED_SOURCE_INTERNAL_REPORT_CREATED`

Information yield: `report_produced`

The job was submitted through the default manual path without an explicit
`pipelineVariant`; it stored and ran `claimboundary-v2`.

Hidden/admin-only chain evidence:

- W3-B Source Material completed with `9` records, `5623` aggregate bytes, and
  providers `openalex`, `serper_web_search`, and `wikimedia_core`.
- W4-G created `9` bounded text sidecars across those providers.
- W4-H created one bounded extraction input packet over the mixed-provider
  sidecars, `5639` bytes.
- W5 completed accepted extraction with `2` EvidenceItems.
- W8-B created an internal Alpha report result candidate.
- W8-G created an internal Alpha report draft.
- Internal report writer created a hidden/admin-only report markdown draft of
  `7381` characters/bytes as observed through the admin job API and artifact
  route.

Containment evidence:

- Public/default job response stayed `4.0.0-cb-precutover` /
  `blocked_precutover` / `report_damaged`.
- Public/default `reportMarkdown` stayed `null`.
- Authenticated admin job response returned report markdown length `7381`.
- Internal report-writer artifact route default projection stayed
  hash/length/provenance-only with `reportMarkdownReturned=false`.
- Unauthenticated internal report-writer route returned `401`.

## Interpretation

This closes the immediate Bolsonaro generalization blocker exposed by HJ24/HJ25.
The V2 HighJump path can now create internal reports for hydrogen, German asylum,
and Bolsonaro-family inputs through the default manual V2 route.

The next step should not add another source-acquisition mechanism by default.
Use report-quality review and a compact multi-input gauntlet to identify the
single most important observed report defect or remaining topic-family gap.

## Budget

The current tranche was reset to `18`.

- HJ26 consumed `1`.
- HJ27 consumed `1`.
- Remaining live-job budget: `16`.
