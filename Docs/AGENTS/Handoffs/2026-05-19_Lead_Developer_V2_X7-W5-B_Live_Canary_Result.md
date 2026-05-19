# 2026-05-19 Lead Developer V2 X7-W5-B Live Canary Result

Role: Lead Developer / Captain Deputy
Model: Codex GPT-5.5
Status: partial pass / next blocker identified / no further live job run

## Summary

After W5-B implementation commit `2cdf0426`, monitor governance commit `456fc9cf`, and live-budget reset commit `077c5394`, the local API/Web runtime was refreshed and verified at:

`077c5394a9646ca47e206ff39b2246e984d349d6`

The Captain reset the current live-job budget to `6` and authorized live jobs. Two W5-B follow-up canaries were run because the first proved Claim Understanding activation but hit an input-specific W2 zero-candidate blocker. Remaining live-job budget is now `4`.

## Runtime Preflight

- Git status was clean before submission.
- Web `/api/version` and API `/version` both reported `077c5394a9646ca47e206ff39b2246e984d349d6`.
- Claim Understanding artifact route preflight:
  - unauthenticated request: `401`, `Cache-Control: no-store`;
  - authenticated request: `200`, `Cache-Control: no-store`, empty preflight ledger.

## Canary 1

Input:

```text
Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz
```

Job: `0849273afd304c7790e3cd3b7f009811`

Classification: `PARTIAL_X7_W5_B_CU_ACCEPTED_W2_ZERO_CANDIDATES`

Observed:

- Public job status: `SUCCEEDED`.
- Pipeline variant: `claimboundary-v2`.
- Executed hash: `077c5394a9646ca47e206ff39b2246e984d349d6+79bbb6d3`.
- Public V2 stayed `4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged`.
- Hidden Claim Understanding runtime artifact exists:
  - `executionStatus: completed`;
  - `gatewayTaskStatus: executable`;
  - `schemaOutcome.status: accepted`;
  - provider/model: `anthropic` / `claude-haiku-4-5-20251001`;
  - token usage: `2771` input / `580` output / `3351` total;
  - duration: `3549ms`.
- Query Planning runtime also accepted with `queryEntryCount: 3`.
- W2 provider-network ran 3 attempts but returned `0` candidates / `72` total bytes.
- W3/W4/W5 remained structurally blocked because source material was not available.

Interpretation: W5-B fixed the Claim Understanding activation gate. This input did not exercise downstream value because W2 produced zero candidates.

## Canary 2

Input:

```text
Using hydrogen for cars is more efficient than using electricity
```

Job: `3524dcb15866442ea92bee6351591976`

Classification: `PARTIAL_X7_W5_B_REACHED_W5_SCHEMA_VALIDATION_FAILED`

Observed:

- Public job status: `SUCCEEDED`.
- Pipeline variant: `claimboundary-v2`.
- Executed hash: `077c5394a9646ca47e206ff39b2246e984d349d6+79bbb6d3`.
- Public V2 stayed `4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged`.
- Hidden Claim Understanding runtime artifact:
  - `executionStatus: completed`;
  - `schemaOutcome.status: accepted`;
  - token usage: `2724` input / `497` output / `3221` total;
  - duration: `3295ms`.
- Hidden Query Planning runtime artifact:
  - `schemaOutcome.status: accepted`;
  - `queryEntryCount: 3`.
- Hidden W2 provider-network artifact:
  - `status: candidate_provider_network_completed`;
  - `candidateCount: 9`;
  - `totalCandidateCount: 9`;
  - `totalBytes: 14082`.
- Hidden W3-B Source Material:
  - `status: source_material_page_summary_completed`;
  - `sourceMaterialRecordCount: 1`.
- Hidden W4-G bounded corpus text:
  - `status: bounded_corpus_text_sidecar_created_extraction_gate_closed`;
  - `boundedTextSidecarCount: 1`;
  - `textByteLength: 392`;
  - `providerId: wikimedia_core`.
- Hidden W4-H extraction input:
  - `status: bounded_extraction_input_packet_created_extraction_execution_closed`;
  - `extractionInputPacketCount: 1`;
  - packet hash equals bounded sidecar hash;
  - `providerId: wikimedia_core`.
- Hidden W4-I readiness:
  - `status: extraction_input_structurally_eligible_execution_denied`;
  - `structuralEligibility: eligible_but_execution_denied`;
  - `inputTextReturned: false`.
- Hidden W5 bounded evidence extraction:
  - `status: damaged_execution`;
  - `damagedReason: schema_validation_failed`;
  - `extractionResultStatus: damaged`;
  - `evidenceItemCount: 0`;
  - `promptLoaded: true`;
  - `promptRendered: true`;
  - `adapterCalled: true`;
  - `modelCalled: true`;
  - no cache read/write;
  - no parser, SR/storage, report, verdict, warning, confidence, or public surface write.

Interpretation: W5-B is functionally repaired and the known hydrogen path now reaches W5 model execution. The current blocker is W5 evidence-extraction schema/output alignment, not Claim Understanding activation or W2/W3/W4 reachability.

## Public Leak Check

Both jobs kept public V2 damaged/precutover. Public inspection did not expose hidden ledger ids or hidden artifact markers. The public response still includes the user input as ordinary job/report input, which is expected existing product behavior.

Default hidden admin projections stayed no-store. W4-I/W5 default route fields report `inputTextReturned: false`, `evidenceItemTextReturned: false`, and `sourceTextReturned: false` where applicable.

## Budget

Captain-reset tranche before W5-B canaries: `6`.

Consumed:

- `0849273afd304c7790e3cd3b7f009811`: `1`
- `3524dcb15866442ea92bee6351591976`: `1`

Remaining: `4`.

## V2 SCORECARD IMPACT

Positive. The second canary reached the first actual W5 evidence-extraction execution boundary over real source material and a real bounded extraction input packet. That is closer to report-quality value than another containment-only gate.

Still not report-quality success: no EvidenceItem was produced because W5 failed schema validation.

## V2 RETIREMENT LEDGER IMPACT

W5-B canaries prove that W4-G/H/I are no longer merely isolated containment artifacts on the hydrogen path; they participate in a chain that reaches W5 execution. Do not retire them yet. The next retirement/merge review should wait until W5 produces at least one valid hidden EvidenceItem or a reviewed W5 repair concludes that a different extraction boundary is needed.

## V2 CONSOLIDATION GATE

Pass for this closeout: no new mechanism was added. Existing W2-W5 machinery was exercised and the next blocker is concrete.

## Next Recommended Step

Prepare a narrow W5-C package for evidence-extraction schema/output diagnosis and repair.

Recommended scope:

- no live job until after local verifier pass and commit;
- inspect W5 prompt/schema/adapter contract mismatch using existing hidden telemetry and focused tests;
- prefer testable schema/adapter alignment before prompt text edits;
- if prompt text changes are required, stop for the standing Captain prompt-approval gate;
- keep public/report/verdict/warning/confidence, parser, cache/SR/storage, provider expansion, ACS/direct URL, and V1 work closed.

## Warnings

- Do not claim W5 report quality yet.
- Do not spend another live job before W5-C has a reviewed local hypothesis and verifier.
- The W5 artifact currently does not expose the provider's raw invalid output, so the next package may need sanitized schema-failure diagnostics if local tests cannot reproduce the mismatch.
