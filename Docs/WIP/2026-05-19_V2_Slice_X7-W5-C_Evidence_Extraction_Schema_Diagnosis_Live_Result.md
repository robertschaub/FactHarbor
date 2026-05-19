# V2 X7-W5-C Evidence Extraction Schema Diagnosis Live Result

Date: 2026-05-19

## Classification

`PARTIAL_X7_W5_C_SCHEMA_DIAGNOSTICS_CAPTURED_PROMPT_CONTRACT_REPAIR_REQUIRED`

## Authority

Captain clarified in the current Codex thread that Captain Deputy should continue without routine pauses and that the current live-job budget was reset to `6`. This result records two W5-C follow-up jobs from that tranche.

## Jobs

### Activation miss

- Job id: `273975edbe2a4acc8bc48325df603069`
- Input: `Using hydrogen for cars is more efficient than using electricity`
- Runtime commit observed by public result: `cc56295e97f82b8d30fc6655a85fd69c8ac7ed2d`
- Classification: `STOP_X7_W5_C_RUNTIME_FLAGS_NOT_ACTIVE`
- Result: public V2 stayed `4.0.0-cb-precutover` / `blocked_precutover`, but no hidden W2-W5 artifacts were recorded. This job must not be used as W5-C diagnostic evidence.

### Valid W5-C diagnostic canary

- Job id: `7774d72df7734844ad9272967c5d3c7d`
- Input: `Using hydrogen for cars is more efficient than using electricity`
- Runtime commit observed by public result: `cc56295e97f82b8d30fc6655a85fd69c8ac7ed2d`
- Public result: `4.0.0-cb-precutover` / `blocked_precutover` / `report_damaged`
- Hidden ledger: `7774d72df7734844ad9272967c5d3c7d:precutover-observability`

The second job reached the hidden product chain:

- Claim Understanding: `completed`, schema accepted.
- Query Planning: `completed`, result accepted.
- W2 candidate provider network: hidden artifact present.
- W3-B Source Material: one page-summary source material record, `960` bytes.
- W4-G bounded text sidecar: present and default-redacted.
- W4-H extraction input packet: present, `960` bytes, provider lineage preserved.
- W4-I execution readiness: structurally eligible, prior denial state preserved.
- W5 bounded evidence extraction: model call executed and then failed closed as `damaged_execution` / `schema_validation_failed`.

W5-C diagnostics were captured on the W5 artifact:

- `failureCategory`: `schema_validation`
- `outputParseStatus`: `parsed`
- `issueCount`: `8`
- representative structural paths: top-level union mismatch plus `evidenceItems.[non_structural].evidenceScope.*`
- leak flags: raw provider output, raw schema messages, provider completion text, source text, input text, evidence item text, prompt text, and stack trace all reported `false`

## Leak And Containment Checks

Programmatic checks confirmed:

- W4-G, W4-H, W4-I, and W5 default artifact projections did not contain the source text.
- Public job payload did not contain the source text.
- W5 default projection reported `inputTextReturned: false`, `evidenceItemTextReturned: false`, and `sourceTextReturned: false`.
- W5 side effects kept cache read/write, parser execution, report generation, verdict generation, and public surface writes closed.

## Live-Job Tranche

- Reset tranche total before these W5-C follow-ups: `6`
- W5-C activation miss consumed: `1`
- W5-C diagnostic canary consumed: `1`
- Remaining tranche budget after this result: `4`

## Interpretation

W5-C succeeded as a diagnosis slice: the current V2 product route can reach W5, call the evidence-extraction model, and record bounded schema diagnostics without public leakage.

W5-C did not produce an EvidenceItem. The immediate blocker is no longer runtime activation or hidden-chain reachability. It is evidence-extraction prompt/contract alignment: the model returned parseable JSON, but the accepted branch did not match `EvidenceExtractionResultSchema`, especially around the required `evidenceScope` object shape.

## Recommended Next Step

Prepare a narrow X7-W5-D prompt/contract alignment review package. It should use the W5-C diagnostics to clarify the existing `V2_EVIDENCE_EXTRACTION` prompt output shape, especially the concrete `evidenceScope` fields, without relaxing the schema, adding deterministic semantic repair, adding retries, widening providers, changing public behavior, or touching report/verdict/warning/confidence behavior.

Do not run another live job until W5-D is reviewed, implemented, verifier-clean, committed, and the runtime is refreshed.

## V2 SCORECARD IMPACT

- Advances V2-Q3 Evidence extraction by proving W5 model execution and capturing the exact bounded schema blocker.
- Still no report-quality value yet because no EvidenceItem was accepted.

## V2 RETIREMENT LEDGER IMPACT

- W4-I and W4-chain retirement remains blocked until W5 produces at least one accepted EvidenceItem through the hidden chain.
- W5-C temporary diagnostics remain active; removal or fold-in trigger remains after schema-root-cause resolution plus a later Captain-approved canary.

## V2 CONSOLIDATION GATE

- No new runtime mechanism was added by this live result.
- Existing W5-C diagnostics are now proven useful and should be folded into the W5-D repair decision.
- Next package must not add another hidden diagnostic layer unless it retires/folds W5-C diagnostics or produces accepted EvidenceItem value.
