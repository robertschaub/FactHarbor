# Lead Architect Handoff - V2 4C3c Live Smoke Result

Date: 2026-05-15
Role: Lead Architect / Captain deputy
Branch: main

## Summary

V2 4C3c first live smoke is complete and accepted.

Accepted smoke job:

- `7b56c24a79ee4ab390cc3a6d5aed8986`
- commit: `efb1f33f30209a56a9fbb392f27eb6ea18ed28bc`
- input: `Plastic recycling is pointless`
- pipeline variant: `claimboundary-v2`

The job reached the hidden direct-text Claim Understanding runtime, wrote one inspectable internal artifact, and kept the public result in the damaged pre-cutover V2 envelope.

## Evidence

Runtime state:

- web `/api/version`: `efb1f33f30209a56a9fbb392f27eb6ea18ed28bc`
- API `/version`: `efb1f33f30209a56a9fbb392f27eb6ea18ed28bc`
- web/API health: healthy before submission
- runtime source/config diff under `apps/web/src`, `apps/web/prompts`, `apps/web/configs`, `apps/api`, `apps/api.Tests`: clean before submission

Job result:

- status `SUCCEEDED`
- `analysisIssueCode: report_damaged`
- public schema `4.0.0-cb-precutover`
- public pipeline `claimboundary-v2`
- verdict `UNVERIFIED`, truth `50`, confidence `0`
- executed web commit hash `efb1f33f30209a56a9fbb392f27eb6ea18ed28bc`

Hidden artifact inspection:

- route: `GET /api/internal/analyzer-v2/claim-understanding-runtime-artifacts?ledgerId=<jobId>:precutover-observability`
- `artifactCount: 1`
- execution status `completed`
- gateway task status `executable`
- provider/model: `anthropic` / `claude-haiku-4-5-20251001`
- token usage: 3376 input, 328 output, 3704 total
- duration: 3785 ms
- schema outcome: `damaged`, reason `claim_contract_validation_failed`
- cache decision: no-store, `canRead: false`, `canWrite: false`

Public leakage check:

- public result did not contain hidden artifact id, ledger id, activation snapshot hash, runtime config hash, prompt hashes, rendered prompt hash, cache-decision reason, provider telemetry object, or artifact sink marker.
- public result contains existing null/public schema fields such as `reportGeneration.configSnapshotHash: null`; this is not hidden artifact leakage.

## Failed Attempt Recovery

The first submission in this gate, job `85ceff71ee274f80a8bbddd56b58f64b` on commit `7a263cbf`, reached the runtime and produced the expected damaged public envelope, but hidden artifact inspection returned `artifactCount: 0`.

That was classified through `/debt-guard` as an incomplete existing mechanism: the temporary ledger was module-scoped and too narrow for route/module reload boundaries. The fix is commit `efb1f33f`, which moves the temporary bounded ledger store to process-global `globalThis` while preserving non-public, non-durable behavior.

## Constraints Still Active

- no broader live-job expansion from this result alone;
- no public V2 exposure;
- no ACS or direct URL runtime dispatch;
- no cache IO;
- no V1 cleanup in this gate;
- no interpretation of this damaged pre-cutover result as analytical quality readiness.

## Next

Proceed to the next reviewed V2 rebuild slice. A good next step is to prepare the next slice plan for converting Claim Understanding from hidden smoke artifact into a typed stage handoff while keeping the public result damaged until the later cutover gate.
