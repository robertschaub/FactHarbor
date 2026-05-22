# 2026-05-22 - Captain Deputy - V2 HighJump HJ14 Wikimedia Source Material Depth Result

## Role And Scope

- Role: Captain Deputy / Lead Developer.
- Slice: `X7-HJ-14-WIKIMEDIA-SOURCE-MATERIAL-DEPTH-REPAIR-CANARY`.
- Implementation commit under test:
  `92cbc14fd53665e07a80e239b2e1ec6e190be3df`.
- Package:
  `Docs/WIP/2026-05-22_V2_HighJump_HJ14_Wikimedia_Source_Material_Depth_Repair.md`.
- Captain-defined input:
  `Using hydrogen for cars is more efficient than using electricity`.

## Canary

- Job id: `959c0246501c44558cbf8f484f9b6e3b`.
- Pipeline variant: `claimboundary-v2`.
- API runtime commit:
  `92cbc14fd53665e07a80e239b2e1ec6e190be3df`.
- Web runtime commit:
  `92cbc14fd53665e07a80e239b2e1ec6e190be3df`.
- Job status: `SUCCEEDED`.
- Classification:
  `STOP_X7_HJ14_WIKIMEDIA_TEXTEXTRACTS_NO_MEASURABLE_DEPTH_GAIN_INTERNAL_ALPHA_DRAFT_CREATED`.

## Hidden Chain Evidence

- Public result stayed `4.0.0-cb-precutover` / `blocked_precutover` /
  `report_damaged`.
- W4-A Source Material corpus readiness admitted `9` records:
  - `1` OpenAlex record, `2027` bytes.
  - `8` Wikimedia records, `148` to `960` bytes, `3577` total bytes.
- W5 completed:
  - `hidden_evidence_item_extraction_completed`.
  - `extractionResultStatus = accepted`.
  - `evidenceItemCount = 5`.
  - `admittedEvidenceItemCount = 5`.
  - `schemaDiagnostics = null`.
- W8-B completed:
  - `internal_alpha_report_result_candidate_created`.
  - `firstIncompleteStage = none`.
  - `4` boundary candidates.
  - `3` verdict candidates.
  - `5` cited EvidenceItem refs.
- W8-G completed:
  - `internal_alpha_report_draft_created`.
  - `7908` byte draft.
  - `4` boundary drafts.
  - `3` verdict drafts.
  - `5` cited EvidenceItem refs.

## Containment

- W5 default projection returned no input text, no EvidenceItem text, and no
  source text.
- W8-G default projection stayed hash/length/provenance-only with
  `draftMarkdownReturned = false`.
- Explicit authenticated W8-G inspection returned the internal draft for review.
- Public job output stayed the damaged pre-cutover envelope and did not expose
  hidden Source Material, EvidenceItem, or draft text.

## Negative Evidence And Decision

HJ14 did not meet the source-depth improvement intent. The W4-A Source Material
byte distribution is unchanged from HJ13: the same `1` OpenAlex record plus `8`
Wikimedia records and the same Wikimedia byte lengths. W5 admitted one more
EvidenceItem than HJ13 and W8-G still produced a draft, but the repair did not
produce measurable Wikimedia source-material depth improvement.

The standalone W3-B Source Material route returned `404` for this ledger while
W4-A/W4-F still carried W3-B state downstream. This is not a public/default-admin
text leak, but it is an inspection-coverage caveat for the next review.

Do not spend another unreviewed same-provider Wikimedia depth tweak. The next
step should be Steer-Co review of a report-quality path that directly addresses
comparator evidence quality: a targeted source/provider-quality package, a
source-selection package, or a prompt/report-review package.

## Budget

- HJ14 consumed the single pending Steer-Co budget-reconciliation exception job.
- HighJump tranche remains exhausted.
- Exception overrun count is now `4`.
- No second HJ14 canary is authorized.

## Artifacts

Captured under:
`test-output/v2-highjump-hj14-959c0246501c44558cbf8f484f9b6e3b/`.

Key files:

- `job.json`
- `public-result-json.json`
- `public-report-markdown.md`
- `w4a.json`
- `w5.json`
- `w8b.json`
- `w8g.json`
- `w8g-inspect.json`

## Next Action

Convene Steer-Co before further implementation. The proposed decision question:
what is the shortest balanced next step that improves comparator evidence quality
without adding speculative hidden machinery or another Wikimedia-only depth tweak?
