# V2 Slice X7-V-LS1 X7-V Source Acquisition Intake Live-Smoke Result

**Date:** 2026-05-17
**Status:** PASS_X7_V_LS1_SOURCE_ACQUISITION_INTAKE_LIVE_SMOKE
**Owner:** Lead Developer / Captain Deputy
**Execution package:** `Docs/WIP/2026-05-17_V2_Slice_X7-V-LS1_X7V_Source_Acquisition_Intake_Live_Smoke_Package.md`
**Package/runtime revision:** `b8be9bc21bbdd6345efafe60f6cb5f3391cbea12`
**Parent implementation revision:** `91fdd9d5` (`feat: add v2 source acquisition intake boundary`)

## Purpose

X7-V-LS1 tested one product-route fact after X7-V: a committed/refreshed direct-text `claimboundary-v2` job can reach hidden Claim Understanding, X7-J, X7-O, X7-S, and X7-V on the same ledger, with X7-V recorded as `intake_ready_not_executable` while public V2 remains damaged/precutover.

This live smoke is not a Source Acquisition execution, source-quality, evidence-quality, report-quality, public-readiness, legal/truth/fairness, or V1-cleanup gate.

## Preconditions Verified

- Worktree was clean at `b8be9bc21bbdd6345efafe60f6cb5f3391cbea12` before live submission.
- Runtime was refreshed at the package commit.
- Web process gate proof showed:
  - `FH_ANALYZER_V2_SHELL=enabled`
  - `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text`
  - `FH_ANALYZER_V2_QUERY_PLANNING_RUNTIME=enabled_hidden_direct_text`
- Prompt hash recorded before submission: `D3A1D101D481EAE7D0B58ACE70F8B5DCCE862214FC775B28126F690380E8ECB7`.
- Admin route preflight passed for all five hidden artifact routes: unauthenticated access returned `401`; authenticated unknown-ledger access was no-store, internal-only, bounded, and non-public.
- Idle checkpoint was clean before submission.
- After live inspection, the only local scratch file was removed and `git status --short --untracked-files=all` returned clean before closeout edits.

## Verifiers Before Live Job

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/source-acquisition/intake-boundary.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-source-acquisition-intake-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-source-acquisition-intake-artifacts/route.test.ts test/unit/lib/analyzer-v2/orchestrator.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts` passed: 5 files, 93 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime` passed: 40 files, 237 tests.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2` passed: 82 files, 586 tests.
- `npm -w apps/web run build` passed.
- `npm run validate:v2-gates` passed.
- `node scripts/validate-v2-gate-register.mjs --self-test` passed.
- `git diff --check` passed.

## Live Job

| Field | Value |
|---|---|
| Job id | `f850f5f7fc6540e7910138906c0a79fe` |
| Ledger id | `f850f5f7fc6540e7910138906c0a79fe:precutover-observability` |
| Input | `Mehr als 235 000 Personen aus dem Asylbereich sind zurzeit in der Schweiz` |
| Pipeline variant | `claimboundary-v2` |
| Terminal status | `SUCCEEDED` |
| Progress | `100` |
| Created/executed revision | `b8be9bc21bbdd6345efafe60f6cb5f3391cbea12` |
| Event count | 9 |

Events showed `claimboundary-v2`, did not show V1 fallback, and did not show V1 search/fetch/XLSX/Source Reliability/clustering/verdict behavior.

## Public Result Check

| Check | Result |
|---|---|
| Public job status | `SUCCEEDED` |
| Public schema | `4.0.0-cb-precutover` |
| Public cutover status | `blocked_precutover` |
| Public analysis issue | `report_damaged` |
| Hidden marker leaks | none detected |
| Ledger leak | none detected |
| Hidden diagnostic fields in public result | none detected |

The public response stayed damaged/precutover and did not expose ledger id, hidden route names, internal artifact keys, hidden hashes, provider telemetry, query text, source material, evidence, report, verdict, or `internal_admin_only` labels.

## Hidden Artifact Summary

All authenticated artifact routes returned `200` with `Cache-Control: no-store`; all unauthenticated route checks returned `401`.

| Artifact | Result |
|---|---|
| Claim Understanding | 1 artifact; `executionStatus: completed`; `gatewayTaskStatus: executable`; `inputSource: direct_input`; `schemaOutcome.status: accepted`; cache decision `no_store_runtime_dispatch_safety`, `canRead: false`, `canWrite: false`. |
| X7-J Evidence Lifecycle intake | 1 artifact; `evidenceLifecycleIntake.status: intake_ready`; `claimContractPresent: true`; `selectedAtomicClaimCount: 1`; `executionScope: contract_only_no_provider_execution`; `executionEligibility: not_executable_precutover`. |
| X7-O Query Planning pre-execution observation | 1 artifact; `preexecutionObservation.status: structural_prerequisites_observed_not_executed_precutover`; `sourceIntakeStatus: intake_ready`; `selectedAtomicClaimCount: 1`; `sourceLanguageSignal: present`; execution flags false. |
| X7-S Query Planning runtime | 1 artifact; schema outcome `accepted`; 2 bounded query entries; `executionScope: not_executable`; source execution flags false. |
| X7-V Source Acquisition intake | 1 artifact; `sourceAcquisitionIntake.status: intake_ready_not_executable`; `selectedAtomicClaimCount: 1`; `sourceLanguageSignal: present`; `visibility: internal_admin_only`; `publicPointerExposure: forbidden`; `publicCutoverStatus: blocked_precutover`. |

The X7-V artifact kept all source execution and materialization flags false: no provider network execution, search/fetch/content dereference, parser execution, cache read/write, Source Reliability call, source material, EvidenceCorpus, report, or verdict.

## Non-Authorizations

X7-V-LS1 does not authorize:

- Source Acquisition structural executor invocation;
- source/search/fetch/provider-network/content-dereference/parser/Source Reliability/cache/durable-storage IO;
- source material, parsed material, EvidenceCorpus, EvidenceItems, warnings, reports, verdicts, confidence, or public answer generation;
- prompt/config/schema/model/provider edits;
- product API/UI/report/export public cutover;
- ACS/direct URL execution;
- V1 reuse, V1 fallback, V1 work, or V1 cleanup;
- additional live jobs, retries, replacement canaries, benchmark batches, or expensive validation suites.

## Residual Notes

- The API job field `promptContentHash` remained unpopulated; this matches existing API-side dead prompt tracking and did not affect the hidden artifact prompt provenance checks.
- X7-V-LS1 consumed 1 live job from the current authorization window.
- The separate `X7-W` label remains reserved for a reviewed candidate-runtime admission proposal. X7-W should be a design/proposal package first, not implementation-by-handoff.

## Verdict

PASS. X7-V-LS1 proved same-ledger product-route continuity through Claim Understanding, X7-J, X7-O, X7-S, and X7-V with X7-V `intake_ready_not_executable`, public V2 still damaged/precutover, and no hidden marker leak.
