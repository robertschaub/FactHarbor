# V2 HighJump HJ23 Report Quality Mini-Gauntlet Result

**Date:** 2026-05-22
**Classification:** `STOP_X7_HJ23_MINI_GAUNTLET_SOURCE_MATERIAL_AND_W5_GENERALIZATION_GAPS`
**Runtime:** `036a2c04cd0a3360e1dadb3f623d6b1a9edf9857`

## Purpose

HJ23 responded to the Captain's concern that single canaries were too weak. It spent the remaining two slots in the active HighJump continuation tranche on a compact multi-input gauntlet using Captain-defined inputs that exercise different report families.

The gauntlet checked:

- default/manual V2 submission without explicit `pipelineVariant`;
- runtime hash provenance;
- hidden V2 chain reachability beyond hydrogen;
- authenticated-admin report creation;
- expected verdict band where a report exists;
- evidence citation rendering;
- public/precutover containment.

## Jobs

### `asylum-235000-de`

Input:

`Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz`

Job:

`0194c58b3e9245e6b63eda6cdf2bf4d6`

Observed:

- job status: `SUCCEEDED`;
- stored pipeline: `claimboundary-v2`;
- runtime hash: `036a2c04cd0a3360e1dadb3f623d6b1a9edf9857`;
- public/default V2: `4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged`;
- public/default report markdown: `null`;
- admin stored report markdown: 242-character shell text, not a completed internal report;
- hidden W2: `candidate_provider_network_completed`;
- hidden W3-B: `source_material_page_summary_completed`;
- hidden W3-B Source Material: one `openalex` abstract record;
- hidden W4-G/W4-H: positive bounded text and extraction-input path;
- hidden W5: `hidden_no_extractable_evidence`, `extractionResultStatus = accepted`, `extractionStatus = no_extractable_evidence`, `evidenceItemCount = 0`;
- W5-E admission: blocked because W5 had no accepted EvidenceItems.

Interpretation:

The default V2 chain is reachable for this input, but Source Material was not useful enough for W5. For the official-count family, the current materialization path can pick an academic abstract where official/current aggregate evidence is needed.

### `bolsonaro-en`

Input:

`Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`

Job:

`d3a622a352ba4b27b18d10250e21fbac`

Observed:

- job status: `SUCCEEDED`;
- stored pipeline: `claimboundary-v2`;
- runtime hash: `036a2c04cd0a3360e1dadb3f623d6b1a9edf9857`;
- public/default V2: `4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged`;
- public/default report markdown: `null`;
- admin stored report markdown: 242-character shell text, not a completed internal report;
- hidden W2: `candidate_provider_network_completed`;
- hidden W3-B: `source_material_page_summary_failed_structural`;
- hidden W3-B stop reason: `source_material_extract_structural_rejected`;
- hidden W3-B fetched one Wikimedia page summary successfully at transport level, but did not create Source Material;
- hidden W4-G: `blocked_pre_bounded_corpus_text_w3b_not_completed`;
- hidden W4-H: `blocked_pre_extraction_input_w4g_not_positive`;
- hidden W5: `blocked_pre_execution`, `blockedReason = w4h_packet_invalid`.

Interpretation:

The default V2 chain reaches Source Material for this input, but W3-B failed the whole stage on the first fetched page-summary body that lacked an accepted extract shape. That exposed a brittle fail-fast behavior in W3-B, not a need for a new provider or report-layer change.

## Follow-Up Repair Already Committed

Commit `70644fcb fix(v2): continue w3b after invalid summaries` amends the existing W3-B owner so a structurally rejected fetched page summary does not abort the whole bounded fetch set. W3-B now continues to the next eligible locator within the existing cap and still fails closed if all attempted materialization paths yield no Source Material.

Local verification for `70644fcb`:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-material-page-summary-owner.test.ts` passed (`10` tests).
- `npm run validate:v2-gates` passed.
- `npm run debt:sensors` returned existing `advisory_warn`.
- `npm -w apps/web run build` passed.
- `git diff --check` passed.

## Budget

Both remaining live jobs in the active HighJump continuation tranche were consumed:

- HJ23 job 1: `0194c58b3e9245e6b63eda6cdf2bf4d6`
- HJ23 job 2: `d3a622a352ba4b27b18d10250e21fbac`

The active tranche now has `0` remaining.

## Next

No additional live jobs are available under the active tranche. Continue locally with source-material generalization and tests. The next live validation should require a refreshed budget and should validate `70644fcb` first on `bolsonaro-en`, because that job exposed the exact W3-B fail-fast stop the repair addresses.

For `asylum-235000-de`, the likely next repair is separate: improve bounded source-material selection/fan-in so official/current factual claims are not starved by one irrelevant academic abstract. Do not solve that by hardcoding SEM, Switzerland, asylum, or any topic-specific source.
