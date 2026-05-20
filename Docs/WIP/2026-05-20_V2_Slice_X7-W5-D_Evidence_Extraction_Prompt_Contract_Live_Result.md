# V2 X7-W5-D Evidence Extraction Prompt Contract Live Result

Date: 2026-05-20

## Classification

`PASS_X7_W5_D_EVIDENCE_EXTRACTION_SCHEMA_REPAIR_VERIFIED`

## Authority

Captain approved analysis prompt edits and clarified that Captain Deputy should continue under the development-team operating model. W5-D prompt validation used a diverse LLM review quorum before the live canary:

- Claude Opus 4.6 LLM Expert: `support`; no prompt patch required before canary.
- Independent LLM Expert reviewer: `support`; W5-D is topic-neutral, schema-aligned, multilingual-safe, and canary-ready after runtime refresh.

## Jobs

### Wrong-variant operational miss

- Job id: `ee086cd0e9b44c3ea88c388e96f2eaf6`
- Input: `Using hydrogen for cars is more efficient than using electricity`
- Submitted variant: `claimboundary`
- Runtime commit: `76984bca20840c3c2e9c02449a0e481ec151a02b`
- Final status: `CANCELLED`
- Classification: `STOP_X7_W5_D_WRONG_VARIANT_CANCELLED`

This job was submitted through the legacy helper shape and ran the V1 `claimboundary` path. It was cancelled after the mismatch was detected. It is not W5-D evidence and must not be used for V2 extraction conclusions. It still consumed one live-job budget slot.

### Valid W5-D canary

- Job id: `08291671a7d44a74b9fc048b6a32a7b5`
- Input: `Using hydrogen for cars is more efficient than using electricity`
- Submitted variant: `claimboundary-v2`
- Runtime commit: `76984bca20840c3c2e9c02449a0e481ec151a02b`
- Public result: `4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged`
- Hidden ledger: `08291671a7d44a74b9fc048b6a32a7b5:precutover-observability`

The valid canary reached the hidden chain:

- Claim Understanding: completed, schema accepted.
- Query Planning: completed.
- W2 candidate provider network: hidden artifact present.
- W3-B Source Material: hidden page-summary source material present.
- W4-G bounded corpus text sidecar: present.
- W4-H extraction input packet: present.
- W4-I execution readiness: present.
- W5 bounded evidence extraction: completed.

W5 result:

- `status`: `hidden_evidence_item_extraction_completed`
- `extractionResultStatus`: `accepted`
- `extractionStatus`: `evidence_extracted`
- `evidenceItemCount`: `2`
- `schemaDiagnostics`: `null`
- `retryCount`: `0`
- `tokenUsage.totalTokens`: `4159`
- `durationMs`: `8053`

This verifies that W5-D repaired the W5-C schema-validation blocker for this canary.

## Leak And Containment Checks

Programmatic checks confirmed:

- Public result remained damaged/precutover and exposed zero public `evidenceItems`.
- Public result pattern scan did not match source-text leak markers.
- Authenticated W5 route returned `Cache-Control: no-store` and `defaultProjection: hash_length_provenance_only`.
- Unauthenticated W5 route returned `401`.
- W5 default projection reported `inputTextReturned: false`, `evidenceItemTextReturned: false`, and `sourceTextReturned: false`.
- W5 side effects kept parser execution, cache read/write, report generation, verdict generation, and public surface writes closed.

## Live-Job Tranche

Latest Captain-declared tranche before W5-D validation: `6`.

- Wrong-variant cancelled job consumed: `1`
- Valid W5-D canary consumed: `1`
- Remaining tranche budget after this result: `4`

## Interpretation

W5-D is closed for the prompt-contract repair gate. The hidden V2 chain can now produce schema-valid, default-redacted bounded EvidenceItem projections from the W4-H packet without public exposure.

This is still not public report quality. Public V2 remains blocked/precutover, and report/verdict/warning/confidence behavior remains closed.

## Recommended Next Step

Prepare the next review package for the first downstream EvidenceItem admission/consumption decision, or a consolidation package that folds W5-C diagnostics and W4-I/W4-chain standalone proof debt now that W5 has produced accepted hidden EvidenceItems.

Do not run another W5-D canary. Do not open parser execution, report/verdict/warning/confidence behavior, public behavior, cache/SR/storage, provider expansion, ACS/direct URL, or V1 work without separate reviewed approval.

## V2 SCORECARD IMPACT

- Advances V2-Q3 Evidence extraction from schema-failing model execution to accepted hidden EvidenceItem extraction.
- Still no public/report-quality value until later stages consume the hidden EvidenceItems and produce report/verdict output.
- Cost signal for W5 extraction on this canary: `4159` total tokens and `8053ms` model duration.

## V2 RETIREMENT LEDGER IMPACT

- W5-C temporary schema diagnostics can now be folded into stable telemetry or quarantined by a follow-up consolidation package.
- W4-I/W4-chain retirement planning is now unblocked in principle, because W5 has proven accepted hidden EvidenceItem extraction from the W4-H packet.
- No retirement was performed in this live-result docs package.

## V2 CONSOLIDATION GATE

- No runtime mechanism was added by this result.
- The next package should avoid adding another hidden denial/diagnostic layer unless it directly advances EvidenceItem consumption/report value or retires/merges existing W4/W5 scaffolding.
