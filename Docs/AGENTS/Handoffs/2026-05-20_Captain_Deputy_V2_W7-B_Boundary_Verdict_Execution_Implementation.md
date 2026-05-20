# Captain Deputy / Lead Developer Handoff: V2 W7-B Boundary/Verdict Execution Implementation

**Date:** 2026-05-20
**Role:** Captain Deputy coordinating Lead Developer implementation
**Slice:** X7-W7-B Boundary/Verdict LLM Execution
**Package:** `Docs/WIP/2026-05-20_V2_Slice_W7-B_Boundary_Verdict_LLM_Execution_Approval_Package.md`
**Status:** implementation verifier-clean; no live job run

## Summary

W7-B is implemented as one hidden/internal `BoundaryVerdictExecutionDecision`
owner over approved W5/W5-F statement-bearing EvidenceItem lineage plus
W6-B/W6-C/W7-A/W8-A closure evidence. The owner creates an internal
boundary/verdict input packet, runs only through the approved
`boundary_verdict_execution` prompt/model/cache gateway, validates the LLM
output schema and evidence/boundary citations, and returns default
hash/length/provenance-only decision projections.

No public V2 behavior, product route, public report prose, user-visible warning,
published truth/confidence value, parser execution, cache read/write,
Source Reliability, storage, provider expansion, ACS/direct URL support, V1
reuse, or V1 cleanup was added.

## Implementation Delta

- Added `apps/web/src/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/boundary-verdict-execution.ts`.
- Added W7-B task contract/schema support for `boundary_verdict_execution`.
- Added gateway approval/model/cache policy wiring, surface-ledger ownership, and gate-register validator awareness.
- Added `V2_BOUNDARY_VERDICT_EXECUTION` prompt section to `apps/web/prompts/claimboundary-v2.prompt.md`.
- Added focused runtime, schema, prompt-contract, gateway, and boundary-guard tests.
- Amended the W7-B package envelope to include `Docs/AGENTS/V2_Gate_Register.json` and `scripts/validate-v2-gate-register.mjs` as audit/validator maintenance.

## Review

Lead Developer implementation was reviewed by Claude Opus 4.6. Verdict:
`approve`, with no blockers. The one requested pre-commit fix narrowed an
over-wide boundary-guard relaxation by removing an unused `confidenceTier`
exception. The prompt review confirmed generic/multilingual posture, no Captain
benchmark terms, boundary-before-verdict reasoning order, and citation rules.

Claude noted that the package anchor references the pre-amendment package commit
hash, matching an existing W6-C convention. This is accepted as non-blocking
governance debt; future gate packages should prefer anchoring to a committed
post-amendment package hash.

## Validation

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/boundary-verdict/ test/unit/lib/analyzer-v2/evidence-lifecycle/task-contracts/ test/unit/lib/analyzer-v2/gateway/ test/unit/lib/analyzer-v2/boundary-guard.test.ts` passed: 8 files / 144 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/report-result/` passed: 1 file / 6 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/` passed: 42 files / 202 tests.
- `npm run validate:v2-gates` passed.
- `node scripts/validate-v2-gate-register.mjs --self-test` passed.
- `npm run debt:sensors` returned `advisory_warn` with known V2 footprint, boundary-guard size, docs volume, net-mechanism, and consolidation-marker warnings.
- `npm -w apps/web run build` passed.
- `npm run index` passed.
- `git diff --check` passed.

## Debt-Guard Result

**Classification:** missing-capability / planned bounded mechanism.
**Chosen option:** add one governed semantic execution owner because W7-A/W8-A are contract/stop owners and cannot perform LLM-owned boundary/verdict judgment.
**Rejected path:** extend W7-A with semantic behavior, skip to W8-B report prose, or add another denial/proof layer. Those paths would either blur contracts or avoid report-quality value.
**What was added:** one hidden/internal W7-B owner, prompt section, task contract, gateway policy, validator awareness, and focused tests.
**What was removed/simplified:** none in this slice; W7-B carries the W7-A merge trigger once verifier stability and fail-closed parity are proven.
**Net mechanism count:** increases by one approved semantic owner; justified by missing report-quality capability and bounded by hidden/internal redaction and no-live-job posture.
**Debt accepted and removal trigger:** W7-A/W8-A scaffolding remains temporary convergence debt. Merge/retire W7-A after W7-B verifier stability and fail-closed parity; merge W8-A into the later real internal ReportResult owner after W7-B/W8-B exists.

## Warnings

- No live job has run for W7-B.
- Live-job tranche ledger still needs update/authorization before any W7-B canary.
- W8-B remains split unless later approved as a thin/non-semantic wrapper.
- Public result/API/UI/report/export/compatibility exposure remains blocked.
- Prompt/model/config/schema/UCM edits beyond this package remain Captain-gated.

## Next

After the focused W7-B commit, Captain Deputy should convene or use Steer-Co to
prepare a narrow W7-B canary package if the team chooses to spend a live-job
slot. The package must include runtime refresh, route/runtime preflight,
public/default-admin leak checks, comparator posture, tranche ledger update, and
an explicit one-job limit.
