# V2 Slice W6-D3 Containment Repair Rerun Result

**Status:** `PASS_X7_W6_D3_CONTAINMENT_REPAIR_VERIFIED_RETRIEVAL_REFINEMENT_REMAINS`
**Date:** 2026-05-21
**Package:** `Docs/WIP/2026-05-21_V2_Slice_W6-D3_Containment_Repair_Rerun_Package.md`
**Runtime commit:** `5ea83b5a67b655d39de2703b970dd9acbc63e3b5`
**Repair commit:** `8dcbb982`
**Job:** `be008b8b3bdd4c7fa6edd19c368061db`

## Result

The W6-D3 repaired-runtime rerun passed the containment repair objective.

It also confirmed the W6-D retrieval signal: same-provider page-summary fan-in
is reachable and produces more hidden evidence, but W6-C still recommends
`refine_retrieval`. Therefore the next report-quality package should target
query/source diversity rather than W6 prompt weakening or W7 gate relaxation.

## Public Envelope

The public result stayed intentionally blocked:

- `_schemaVersion`: `4.0.0-cb-precutover`
- `publicCutoverStatus`: `blocked_precutover`
- public issue: `report_damaged`
- public verdict/truth/confidence: not published
- result meta executed web commit:
  `5ea83b5a67b655d39de2703b970dd9acbc63e3b5`

## Hidden Chain Evidence

Same-ledger id:

- `be008b8b3bdd4c7fa6edd19c368061db:precutover-observability`

Captured artifacts were stored locally under:

- `test-output/live/w6d3-canary-be008b8b3bdd4c7fa6edd19c368061db/`

Observed hidden-chain state:

- W3-B Source Material: `source_material_page_summary_completed`.
- W3-B Source Material records: `3`.
- W3-B attempted fetch count: `3`.
- W4-G bounded text: `bounded_corpus_text_sidecar_created_extraction_gate_closed`.
- W4-G plural sidecar count: `3`.
- W4-H aggregate extraction-input packet count: `1`.
- W4-H aggregate packet bytes: `1941`, within the `4096` cap.
- W5 bounded EvidenceItem extraction: `hidden_evidence_item_extraction_completed`.
- W5 extraction result: `accepted`.
- W5 EvidenceItem count: `3`.
- W5 schema diagnostics: `null`.
- W6-C sufficiency: `sufficiency_assessment_completed`.
- W6-C result: `accepted`.
- W6-C schema diagnostics: `null`.
- W6-C recommendation: `refine_retrieval`.
- W8-B status: `internal_alpha_report_result_blocked`.
- W8-B first incomplete stage: `boundary_verdict_candidate`.

## Containment Verification

The W4-G default-admin projection now redacts both sidecar surfaces:

- singular `boundedTextSidecar.textReturned`: `false`;
- singular `boundedTextSidecar` has no `text` field;
- plural `boundedTextSidecars[]` count: `3`;
- every plural sidecar has `textReturned = false`;
- no plural sidecar has a `text` field.

Route leak-key scan over the captured default-admin artifacts found no keys for:

- `text`
- `sourceText`
- `sourceMaterialText`
- `inputText`
- `statement`
- `summary`
- `extract`
- `providerPayload`
- `promptText`
- `reportMarkdown`

The route responses were authenticated internal no-store responses. No public
V2 report/verdict/truth/confidence behavior was exposed.

## Live-Job Budget

The active live-job tranche had `3` remaining before W6-D3.
This canary consumed `1`.

Remaining recorded budget after this result: `2`.

## Decision

W6-D3 closes the containment repair. It does not close the retrieval-refinement
need.

Next recommended package:

- query/source diversity before W6-C;
- preserve W6-C quality bar;
- preserve W7 fail-closed gates;
- no W6 prompt retry/weakening as the next move;
- no public report/verdict/warning/confidence exposure;
- no parser/cache/SR/storage/provider broadening beyond a reviewed package;
- no ACS/direct URL support;
- no V1 work or cleanup.
