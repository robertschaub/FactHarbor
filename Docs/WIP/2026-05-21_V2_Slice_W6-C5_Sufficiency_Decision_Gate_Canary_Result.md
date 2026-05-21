# V2 Slice W6-C5 Sufficiency Decision Gate Canary Result

**Status:** `STOP_X7_W6_C5_RETRIEVAL_REFINEMENT_REQUIRED`
**Date:** 2026-05-21
**Implementation commit:** `d59b0248bc78965c1a5988b9cea5df15e9590e2a`
**Captain input:** `Using hydrogen for cars is more efficient than using electricity`
**Package:** `Docs/WIP/2026-05-21_V2_Slice_W6-C5_Sufficiency_Decision_Gate_And_Diagnostic_Retirement_Package.md`

## Jobs

Two live jobs were submitted and both consume the live-job tranche.

| Job | Classification | Notes |
|---|---|---|
| `5762f4f74f7c479daca6c6f0290b7ce8` | `UNEVALUATED_X7_W6_C5_CAPTURE_METHODOLOGY_ERROR` | Public job succeeded as damaged/precutover, but hidden artifact capture used an invalid PowerShell URL interpolation pattern and the W8-B artifact was not retained for later inspection. |
| `305176cf9cd34829b08dc826cf850b64` | `STOP_X7_W6_C5_RETRIEVAL_REFINEMENT_REQUIRED` | Corrected capture confirmed the full hidden chain through W8-B and W6-C5 decision-table outcome. |

The capture issue was methodology, not pipeline behavior: `${route}?ledgerId=...`
must be used in PowerShell strings. The faulty form `$route?ledgerId=...`
collapsed the route segment and produced `/api/internal/analyzer-v2/=...`.

## Result

The corrected W6-C5 canary reached the hidden chain and reconfirmed that W6-C
accepts the current evidence but recommends more retrieval before fair
boundary/verdict candidate formation.

- Claim Understanding: `completed`, schema accepted.
- W2 candidate provider network: `candidate_provider_network_completed`.
- W3-B Source Material: `source_material_page_summary_completed`, one hidden Source Material record.
- W5 bounded EvidenceItem extraction: `hidden_evidence_item_extraction_completed`, `accepted`, one EvidenceItem.
- W6-C sufficiency: `sufficiency_assessment_completed`, `accepted`.
- W6-C `schemaDiagnostics`: `null`.
- W6-C `reportStopRecommendation`: `refine_retrieval`.
- W8-B status: `internal_alpha_report_result_blocked`.
- W8-B blocked reason: `boundary_verdict_candidate_not_ready`.
- First incomplete stage: `boundary_verdict_candidate`.

Per the W6-C5 decision table, `refine_retrieval` means stop and pivot to
retrieval refinement. Do not continue W6-C prompt retries and do not relax W7
fail-closed gates.

## Containment

Public V2 stayed intentionally blocked:

- `_schemaVersion`: `4.0.0-cb-precutover`
- `publicCutoverStatus`: `blocked_precutover`
- public issue: `report_damaged`
- public verdict/truth/confidence: not published

Hidden default artifacts stayed text-contained:

- no hidden artifact file other than the persisted public job record contained
  the Captain input text;
- W8-B redaction flags for source text, EvidenceItem text, input text, prompt
  text, provider payload, hidden ledger reference, public verdict, public truth,
  public confidence, and public warnings remained false;
- default W5/W8 projections stayed hash/length/provenance or structured
  candidate-only.

One expected historical route remains retired:

- `evidence-lifecycle-execution-readiness-artifacts` returned `404`; W4-I
  eligibility is now represented as historical same-ledger evidence merged into
  W5 lineage.

## Live-Job Budget

The active tranche had `6` remaining before W6-C5. Both W6-C5 submissions count.
Remaining budget after this result is `4`.

## Next Step

Prepare a retrieval-refinement review package. It should improve the chance of
getting enough independent and relevant evidence before W6-C, without changing
public behavior or weakening sufficiency.

Recommended boundaries:

- preserve public damaged/precutover output;
- preserve W6-C sufficiency quality bar;
- no W7 gate relaxation;
- no report/verdict/warning/confidence publication;
- no parser/cache/SR/storage/provider expansion/ACS/direct URL/V1 work;
- no live job until the retrieval-refinement package is reviewed and committed.
