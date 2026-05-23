# V2 HighJump HJ84 Selected-Endpoint Opposition Calibration Result

## Classification

`REGRESSION_X7_HJ84_W7_CALIBRATION_REPORT_WRITER_DAMAGED_REVERTED`

## Runtime And Job

- Implementation commit: `f766419e905315ffe9b98195d3608f3a724a3113`
- Job: `b0d3334b948f4495989543e95995e5c9`
- Input: `Using hydrogen for cars is more efficient than using electricity`
- Pipeline: `claimboundary-v2`
- Created git commit hash: `f766419e905315ffe9b98195d3608f3a724a3113`
- Executed Web git commit hash: `f766419e905315ffe9b98195d3608f3a724a3113`
- Status: `SUCCEEDED`
- Admin report markdown length: `1253` characters

## Local Verification Before Job

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`: passed, `10` tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution.test.ts`: passed, `11` tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts --runInBand`: passed, `96` tests.
- `npm -w apps/web run build`: passed.
- `npm run debt:sensors`: `advisory_warn` only.
- `git diff --check`: passed.
- Runtime preflight before job: Web and API both reported `f766419e905315ffe9b98195d3608f3a724a3113`; git status was clean; API/Web health passed; runner route probe returned `400`; admin probe returned `200`.

## Result Evidence

The run did not produce a full internal report. It reached W5 and extracted
EvidenceItems, but the internal report writer did not create a draft:

- Source Material records: `9`.
- Source Material bounded text bytes: `19966`.
- W5 execution status: `hidden_evidence_item_extraction_completed`.
- EvidenceItems: `5`.
- Report writer status: `internal_report_writer_damaged`.
- Report writer markdown hash: `null`.
- Report writer markdown byte length: `0`.
- Durable loss point: `internal_report_writer`.
- Public/default containment stayed closed:
  - public report markdown absent;
  - public verdict/truth/confidence absent;
  - public `adminDiagnostics` absent;
  - result schema `4.0.0-cb-precutover`;
  - public cutover status `blocked_precutover`.

Process-local hidden artifact routes returned `404`, and the job events route
timed out during inspection, so the exact provider/schema damage is not
durable in the currently available artifact set. The persisted source-chain
diagnostics and stop summary are enough to classify the attempt as unsafe for
the active path.

## Failed-Attempt Recovery

Prior attempt: `revert`.

Reason: HJ84 changed W7 calibration prompt guidance and live validation
regressed from HJ83's complete selected-claim-primary report to a report-writer
damaged stop summary. With no durable report-writer schema details available,
keeping or broadening the paragraph would be speculative.

Kept: HJ83 remains the latest accepted quality baseline: complete
selected-claim-primary report, `LEANING-FALSE 35/62`, public/default
containment held.

Reverted: the HJ84 W7 selected-endpoint opposition calibration paragraph and
its prompt-contract assertions.

Next owner: no more W7 prompt-only calibration without a durable report-writer
diagnostic or a different report-quality strategy. With only two jobs left in
the tranche, the next move should preserve HJ83 as the proof report and either
run another Captain-defined family to test generalization, or add durable
report-writer damage diagnostics before another risky W7 calibration attempt.

## Information Yield

`new_failure_report_writer_damaged_after_w7_calibration`

## Debt-Guard Result

Classification: `introduced-regression`.

Chosen option: revert the HJ84 prompt paragraph and assertions.

Rejected path and why:

- Keep HJ84 and patch around the report-writer damage: would stack fixes on a
  live-contradicted prompt without durable schema evidence.
- Broaden W7 calibration further: HJ81 and HJ84 now both show W7 prompt-only
  work is high risk without better diagnostics.
- Add code-level calibration: would add deterministic semantic machinery and
  violate the HighJump "well balanced" direction.

What was removed/simplified: the HJ84 W7 calibration paragraph and test
assertions are removed from the active source state.

What was added: this result artifact and ledger/current-lane notes.

Net mechanism count: unchanged.

Debt accepted and removal trigger: no structural debt accepted; residual report
quality gap from HJ83 remains.

## Post-Revert Closeout Verification

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/prompt-contract.test.ts`: passed, `10` tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution.test.ts`: passed, `11` tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts`: passed, `96` tests.
- `npm -w apps/web run build`: passed; prompt reseed reported `Prompts: 0 changed, 3 unchanged`.
- `npm run debt:sensors`: `advisory_warn` only.
- `git diff --check`: passed.

## Stop Summary

# Internal Alpha Stop Summary

Analyzer V2 reached the hidden/internal path but did not create an internal report draft.
This admin-only summary records bounded structural progress without source text, prompt text, provider payloads, raw URLs, or hidden ledger IDs.

## Stop Point

- Stage: Evidence Extraction
- Outcome: EvidenceItems were extracted; internal report writer did not create a draft.

## Structural Observations

- Source Material records: 9
- W4-G bounded text: bounded_corpus_text_sidecar_created_extraction_gate_closed
- W4-G stop: not_stopped
- W4-G sidecars: 8
- W4-H extraction input: bounded_extraction_input_packet_created_extraction_execution_closed
- W4-H stop: not_stopped
- W4-H packets: 1
- W4-I readiness: extraction_input_structurally_eligible_execution_denied
- W4-I stop: extraction_execution_not_authorized_in_x7w4i
- W5 execution: hidden_evidence_item_extraction_completed
- W5 blocked: not available
- W5 damaged: not available
- Extraction result: evidence_extracted
- EvidenceItems: 5
- Source content packets: 8
- Input packet bytes: 15884

## Next Step

Inspect sufficiency, boundary/verdict, and report-writer handoff before changing extraction.

Public/default V2 output remains blocked, precutover, and damaged.
