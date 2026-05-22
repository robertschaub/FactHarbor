# V2 HighJump HJ12 W5 Event Contract Canary Result

Date: 2026-05-22
Owner: Captain Deputy / Lead Developer
Status: Completed live-result record

## Classification

`PASS_X7_HJ12_W5_EVENT_CONTRACT_REPAIR_INTERNAL_ALPHA_UNVERIFIED`

This is a pass for the HJ12 W5 prompt-contract repair. It is not a full
report-quality pass.

## Source And Runtime

- Source commit: `40207da59a521041879617f94c349162eb86a273`
- Canary job id: `4dfbcd7627414738b0216d200df550c4`
- Submitted variant: `claimboundary-v2`
- Runtime commit: `40207da59a521041879617f94c349162eb86a273`
- Input: `Using hydrogen for cars is more efficient than using electricity`
- Public result: `4.0.0-cb-precutover`; public V2 stayed blocked/damaged
- Hidden ledger: `4dfbcd7627414738b0216d200df550c4:precutover-observability`
- Captured artifacts: `test-output/v2-highjump-hj12-4dfbcd7627414738b0216d200df550c4`

## What HJ12 Proved

HJ12 fixed the W5 schema stop observed in HJ11:

- W3-A materialized `9` source-candidate previews.
- W4-A admitted `9` Source Material records: `1` OpenAlex and `8` Wikimedia.
- W4-H carried `9` source-material refs into one bounded extraction-input packet.
- W5 completed hidden EvidenceItem extraction with `6` EvidenceItems.
- W5 `schemaDiagnostics` is `null`.
- W8-B created one internal Alpha report-result candidate.
- W8-G created one internal Alpha report draft.

W5 cost/timing for the canary:

- input tokens: `6877`
- output tokens: `2564`
- total tokens: `9441`
- model duration: `18226ms`

## Draft Quality

The internal Alpha draft remains `UNVERIFIED`, with internal truth/confidence
candidate `0` / `0`. This is materially better than the earlier off-comparator
positive verdict, but still below the Captain expectation for this family.

The draft now cites six EvidenceItems and includes electric-vehicle material.
The remaining gap is direct comparative evidence: the current source set still
does not provide a sufficiently direct hydrogen-car versus electric-vehicle
efficiency comparison under equivalent measurement boundaries.

## Containment

- W8-G default route returned `200`, `Cache-Control: no-store`,
  `draftMarkdownReturned = false`.
- W8-G inspection route returned `200`, `Cache-Control: no-store`,
  `draftMarkdownReturned = true`.
- W8-G unauthenticated route returned `401`, `Cache-Control: no-store`.
- Public/default-admin leak scan found no source text, prompt text, provider
  payload, hidden ledger id, or draft text in public/default projections.

## HJ11 Accounting Note

HJ11 had two operational misses before the corrective V2 canary:

- `1a5e8f236a164c598429ea6ed3334a69`: stale-runtime/wrong-variant miss; not V2 evidence.
- `897c97cd4180493b93da09bf2cf2d9db`: refreshed runtime but submitted
  `claimboundary`, so it exercised V1 and produced no V2 hidden artifacts.

The corrective HJ11 V2 canary `751c0cb864924ec1a2cbe697730a7b70` proved the
source-coverage repair and stopped at W5 `schema_validation_failed` on
`integrityEvents`, which HJ12 then repaired.

The live-job ledger records both wrong-variant misses and the two
Steer-Co-authorized exception jobs transparently. The current HighJump tranche
is exhausted; another live job needs a reviewed package and explicit
Steer-Co/Captain budget reconciliation.

## Next Action

Prepare a bounded HJ13 retrieval-quality package. The target should be direct
comparative efficiency evidence for the already-selected hydrogen-versus-electric
claim, not another generic fan-in increase or verdict prompt patch.

Likely direction:

- inspect W2 query plan and W3-A/W4 source portfolio from HJ12;
- decide whether query planning needs a topic-neutral comparative-evidence
  instruction or whether Source Material selection should prioritize already
  found direct-comparison records;
- keep public V2 blocked/precutover;
- do not run another live job until budget is reconciled.
