# V2 Slice X7-W2-LS1 Candidate-Provider Network Live-Smoke Result

**Date:** 2026-05-18
**Status:** HARD_FAIL_X7_W2_LS1_OPERATOR_CANCELLED_AND_QUERY_CAP_BLOCKED
**Owner:** Lead Developer / Captain Deputy
**Execution package:** `Docs/WIP/2026-05-18_V2_Slice_X7-W2-LS1_Candidate_Provider_Network_Live_Smoke_Package.md`
**Package/runtime revision:** `90a98f18d85ecc4be09ecb23ab90847738dbcd83`
**Parent implementation revision:** `ff6f6a01` (`feat: add v2 hidden candidate provider network`)

## Purpose

X7-W2-LS1 tested whether one committed/refreshed direct-text `claimboundary-v2` job could reach hidden Claim Understanding, X7-J, X7-O, X7-S, X7-V, X7-W1A, X7-W1B, and the W2 candidate-provider network loop, then record a bounded admin-only W2 provider-network artifact for the approved Wikimedia endpoint.

The run did not pass. It produced useful defensive evidence but did not prove provider-network execution.

## Preconditions Verified

- Package was committed at `90a98f18d85ecc4be09ecb23ab90847738dbcd83`.
- Runtime was refreshed at the package commit.
- Local ignored `.env.local` was updated with the three non-secret V2 gate flags required by the package, then `scripts/restart-clean.ps1` restarted API and web.
- Web process version route reported `git_sha = 90a98f18d85ecc4be09ecb23ab90847738dbcd83`.
- Official Wikimedia endpoint-status/deprecation check remained acceptable for a time-boxed hidden proof: `api.wikimedia.org` endpoints were still documented as working normally, with gradual deprecation beginning July 2026.
- Admin route preflight passed for all six hidden artifact routes:
  - unauthenticated access returned `401`;
  - authenticated unknown-ledger access returned `200` for Claim Understanding and `404` for the other five routes;
  - all authenticated responses used `Cache-Control: no-store`;
  - responses were bounded and did not leak forbidden markers.
- Idle checkpoint before live submission was clean.

## Verifiers Before Live Job

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/candidate-provider-network-loop.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-candidate-provider-network-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-candidate-provider-network-artifacts/route.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-candidate-envelope.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` passed: 6 files, 98 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-candidate-runtime.test.ts` passed: 1 file, 10 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime/source-acquisition-network-authority.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-envelope.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-transport.test.ts test/unit/lib/analyzer-v2-runtime/source-acquisition-network-factory.test.ts` passed: 4 files, 18 tests.
- `npm -w apps/web run build` passed.
- `npm run validate:v2-gates` passed.
- `node scripts/validate-v2-gate-register.mjs --self-test` passed.
- `git diff --check` and `git status --short --untracked-files=all` were clean before submission.

## Live Job

| Field | Value |
|---|---|
| Job id | `41056d2c77794c0bbfa3f1a8d4f5c05f` |
| Ledger id | `41056d2c77794c0bbfa3f1a8d4f5c05f:precutover-observability` |
| Input | `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz` |
| Pipeline variant | `claimboundary-v2` |
| Terminal status | `CANCELLED` |
| Progress | `8` |
| Created/executed revision | `90a98f18d85ecc4be09ecb23ab90847738dbcd83` |
| Prompt hash | `D3A1D101D481EAE7D0B58ACE70F8B5DCCE862214FC775B28126F690380E8ECB7` |
| Event count | `9` |

Events showed:

```text
Job created
Triggering runner
Runner started
Preparing input (pipeline: claimboundary-v2)
Analyzer V2 orchestrator initialized.
Job cancelled by user
Ignored status update after terminal status CANCELLED: requested RUNNING (Analyzer V2 damaged structural envelope generated.)
Ignored status update after terminal status CANCELLED: requested RUNNING (Storing result)
Ignored result store after terminal status CANCELLED
```

The first preparation event was correct: `pipeline: claimboundary-v2`. The cancellation was caused by the executor's PowerShell polling guard treating an array match as failure. The live package's route-probe script was corrected and committed before submission, but the ad hoc polling command still had this separate array-matching defect.

## Public Result Check

The job has no stored result JSON because the operator cancellation reached terminal state before result storage.

| Check | Result |
|---|---|
| Public job status | `CANCELLED` |
| Public result JSON | absent |
| Admin result JSON | absent |
| Public hidden marker leaks | none detected |
| Public response size | 907 bytes |

Since no result JSON was stored, LS1 cannot claim public `4.0.0-cb-precutover` / `blocked_precutover` pass criteria. The only public-surface evidence from this run is that non-admin job inspection did not expose ledger ids, hidden artifact markers, internal artifact keys, provider telemetry, source material, evidence, report, verdict, or `internal_admin_only` labels.

## Hidden Artifact Summary

Authenticated artifact routes showed the run reached the W2 artifact path before result storage was ignored:

| Artifact | Result |
|---|---|
| Claim Understanding | 1 artifact; `executionStatus: completed`. |
| X7-J Evidence Lifecycle intake | 1 artifact; `evidenceLifecycleIntake.status: intake_ready`. |
| X7-O Query Planning pre-execution observation | 1 artifact; `preexecutionObservation.status: structural_prerequisites_observed_not_executed_precutover`. |
| X7-S Query Planning runtime | 1 artifact; schema outcome `accepted`. |
| X7-V Source Acquisition intake | 1 artifact; `sourceAcquisitionIntake.status: intake_ready_not_executable`. |
| X7-W2 candidate-provider network | 1 artifact; `candidateProviderNetwork.status: blocked_pre_candidate_provider_network`; `blockedReason: query_count_exceeds_w2_cap`. |

The W2 blocked artifact recorded:

- `queryEntryCount: 3`;
- `closedLoopStatus: closed_loop_completed_no_source_candidates`;
- `handoffStatus: ready_not_executable`;
- `requestStatus: source_acquisition_ready_not_executable`;
- `intakeStatus: intake_ready_not_executable`;
- `sourceLanguageSignal: present`;
- `providerAttemptCount: 0`;
- `networkAttemptCount: 0`;
- `candidateCount: 0`;
- `totalDurationMs: 0`;
- `totalCompressedBytes: 0`;
- `totalDecompressedBytes: 0`;
- `fixedDollarCost: 0`;
- `providerNetworkExecuted: false`;
- `contentDereferenceCalled: false`;
- `parserExecuted: false`;
- `cacheRead: false`;
- `cacheWrite: false`;
- `storageWrite: false`;
- `sourceReliabilityCalled: false`;
- `sourceMaterialCreated: false`;
- `evidenceCorpusCreated: false`;
- `evidenceItemGenerated: false`;
- `warningGenerated: false`;
- `reportGenerated: false`;
- `verdictGenerated: false`;
- `publicSurfaceWritten: false`.

This is defensive validation that the W2 query-count cap fails closed before provider-network execution. It is not a provider-network proof.

## Findings

| ID | Severity | Finding | Classification |
|---|---|---|---|
| F1 | Blocking for LS1 pass | W2 blocked because accepted Query Planning emitted 3 query entries and W2 allows at most 2. | Safety guard working as designed; not a runtime defect. |
| F2 | Blocking for LS1 pass | The executor polling command cancelled the job after a valid V2 preparation event. | Operator/executor script defect; not V2 runtime behavior. |

## Review/Debate Outcome

Claude Opus 4.6 senior architect/security review recommended:

1. Close LS1 as hard-fail/partial defensive evidence.
2. Do not rerun blindly with a different input.
3. Do not reactively raise the W2 query cap from 2 to 3 based on one observation.
4. Fix future live-execution polling before another live attempt.
5. Gather offline Query Planning query-count distribution across Captain-defined inputs before choosing either a new compatible canary package or a reviewed W2 cap-alignment package.

Lead Developer / Captain Deputy accepts this recommendation.

## Non-Authorizations

X7-W2-LS1 does not authorize:

- another live job under the same package;
- W2 query-cap changes;
- source material, content dereference, parser execution, parsed material, EvidenceCorpus, EvidenceItems, warnings, reports, verdicts, confidence, or public answer generation;
- arbitrary URL dereference, general web search, provider portfolio expansion, redirects, proxy use, provider SDKs, credentials, cache IO, durable storage, or Source Reliability calls;
- prompt/config/schema/model/provider/source/test/script edits;
- product API/UI/report/export public cutover;
- ACS/direct URL execution;
- V1 reuse, V1 fallback, V1 work, or V1 cleanup.

## Next Recommended Package

Prepare a separate docs-only diagnostic/estimation package before any second W2 live job:

- record LS1 as spent and not pass;
- define an offline Query Planning query-count distribution check over a small Captain-defined input set;
- keep network/source/provider execution disabled during estimation;
- decide from observed data whether the next reviewed package should:
  - select a Captain-defined input that reliably emits no more than 2 query entries; or
  - propose a reviewed W2 cap-alignment source amendment to 3 query entries with explicit budget/security justification.

Any future live attempt must include a corrected polling script that treats event messages as scalar strings before matching.
