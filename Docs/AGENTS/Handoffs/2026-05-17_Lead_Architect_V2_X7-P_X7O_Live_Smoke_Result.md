---
roles: [Lead Architect, Captain Deputy]
topics: [v2, x7-p, x7-o, live-smoke, partial, language-signal]
files_touched:
  - Docs/STATUS/Current_Status.md
  - Docs/STATUS/Backlog.md
  - Docs/AGENTS/Agent_Outputs.md
  - Docs/AGENTS/Handoffs/2026-05-17_Lead_Architect_V2_X7-P_X7O_Live_Smoke_Result.md
  - Docs/AGENTS/index/handoff-index.json
---

# Lead Architect Handoff: V2 X7-P X7-O Live-Smoke Result

### 2026-05-17 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 X7-P X7-O Live-Smoke Result

**Task:** Execute and record the deputy-approved X7-P one-job product-route live smoke for the X7-O Query Planning pre-execution observation artifact.
**Files touched:** `Docs/STATUS/Current_Status.md`, `Docs/STATUS/Backlog.md`, `Docs/AGENTS/Agent_Outputs.md`, `Docs/AGENTS/Handoffs/2026-05-17_Lead_Architect_V2_X7-P_X7O_Live_Smoke_Result.md`, `Docs/AGENTS/index/handoff-index.json`.
**Key decision:** X7-P is `PARTIAL_X7_P_LANGUAGE_SIGNAL_UNAVAILABLE`, not pass. The run cleanly proved product-route reachability and public non-leakage for X7-O, but the X7-O observation correctly blocked because the accepted direct-text ClaimContract did not expose a usable non-`und` language signal.
**Open items:** Draft a reviewed X7-Q language-metadata repair package before any X7-P rerun. Query Planning execution, source/provider/parser execution, public cutover, extra live jobs, and V1 cleanup remain blocked.
**Warnings:** The public V2 result is still a damaged/precutover shell result. This run makes no truth/legal/fairness/evidence/report/verdict-quality claim.
**For next agent:** Do not rerun X7-P. Start from a package-first X7-Q decision on accepted direct-text language metadata. Avoid a shortcut that makes only X7-O read a fallback signal if the later Query Planning input envelope would still block on the ClaimContract language fields.
**Learnings:** A live observer smoke can pass runtime/security checks while still failing a structural prerequisite. Preserve that distinction: security/runtime acceptable does not mean the architecture gate passed.

## Package And Runtime

- Execution package: `Docs/WIP/2026-05-17_V2_Slice_X7-P_X7O_Query_Planning_Observation_Live_Smoke_Package.md`.
- Package commit/runtime revision: `03e2bafbded518946ed1c1f41620842a6cfd66c2`.
- Prompt file hash: `62DC58AAF364029F5F6E655E7A93E21E571F33765E7D8B8A83C45B2255498F8C`.
- Build reseed state: `Configs: 0 changed, 4 unchanged | Prompts: 0 changed, 3 unchanged | Errors: 0`.
- Web/API runtime was refreshed after the package commit. API/Web were restarted as local hidden processes; API Swagger and web health responded before job submission.
- Web runtime process command line included:
  - `FH_ANALYZER_V2_SHELL=enabled`
  - `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text`
- Admin route preflight passed for Claim Understanding, X7-J, and X7-O artifact routes.
- 60-second pre-submission clean/idle checkpoint passed.

## Verifiers

Pre-live verifier set passed:

- Focused X7-P verifier set: 10 files / 121 tests passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime`: 36 files / 215 tests passed.
- `npm -w apps/web run test -- test/unit/lib/analyzer-v2`: 76 files / 540 tests passed.
- `npm -w apps/web run build`: passed; prompt/config reseed unchanged.
- `npm run validate:v2-gates`: passed.
- `node scripts/validate-v2-gate-register.mjs --self-test`: passed.
- `git diff --check`: passed.
- Worktree clean before submission, after idle checkpoint, and after artifact inspection.

## Live Job

- Input: `Did the legal proceedings against Jair Bolsonaro comply with Brazilian law, and did the proceedings and the verdicts meet international standards for a fair trial?`
- Job id: `77f2e9f237e34263a09be50264db3682`.
- Ledger id: `77f2e9f237e34263a09be50264db3682:precutover-observability`.
- Job status: `SUCCEEDED`.
- Stored variant: `claimboundary-v2`.
- Created hash: `03e2bafbded518946ed1c1f41620842a6cfd66c2`.
- Executed hash: `03e2bafbded518946ed1c1f41620842a6cfd66c2`.
- First preparation event: `Preparing input (pipeline: claimboundary-v2)`.
- No `Preparing input (pipeline: claimboundary)` event was present.

Event history:

- `Job created`
- `Triggering runner`
- `Runner started`
- `Preparing input (pipeline: claimboundary-v2)`
- `Analyzer V2 orchestrator initialized.`
- `Analyzer V2 damaged structural envelope generated.`
- `Storing result`
- `Result stored`
- `Done`

## Public Result Checks

- Public result stayed `_schemaVersion: 4.0.0-cb-precutover`.
- Public result stayed `meta.publicCutoverStatus: blocked_precutover`.
- Public result carried `analysisIssueCode: report_damaged`.
- Non-admin public response hidden marker and non-null hidden-field scan passed.
- Public output did not expose the ledger id, artifact bodies, X7-J markers, X7-O markers, hidden hashes, accepted ClaimContract body, provider telemetry, or admin-only route metadata.
- The public result is not a valid V2 analysis answer and must not be used for truth/legal/fairness/report/verdict-quality assessment.

## Hidden Artifact Checks

Claim Understanding artifact route:

- Unauthenticated preflight returned `401`.
- Authenticated real-ledger read returned `200`, `artifactCount: 1`, `visibility: internal_admin_only`, `publicPointerExposure: forbidden`.
- Latest artifact: `executionStatus: completed`, `gatewayTaskStatus: executable`, `inputSource: direct_input`, `schemaOutcome.status: accepted`.
- Runtime cache posture stayed no-store/no-read/no-write: `reason: no_store_runtime_dispatch_safety`, `canRead: false`, `canWrite: false`.
- The route still lacks `Cache-Control: no-store`; this remains accepted only for local one-job CLI/admin inspection and must not be generalized.

X7-J intake artifact route:

- Unauthenticated preflight returned `401`.
- Authenticated real-ledger read returned `200`, `artifactCount: 1`, `Cache-Control: no-store`, `visibility: internal_admin_only`, `publicPointerExposure: forbidden`.
- Latest artifact: `claimUnderstanding.handoffStatus: accepted`, `selectedAtomicClaimCount: 2`.
- `evidenceLifecycleIntake.status: intake_ready`.
- `evidenceLifecycleIntake.observationStatus: contract_observed_preexecution`.
- `evidenceLifecycleIntake.claimContractPresent: true`.
- `evidenceLifecycleIntake.executionScope: contract_only_no_provider_execution`.
- `evidenceLifecycleIntake.executionEligibility: not_executable_precutover`.
- Downstream execution flags stayed false: Query Planning, Source Acquisition, parser, EvidenceCorpus, report, and verdict generation.

X7-O Query Planning pre-execution observation artifact route:

- Unauthenticated preflight returned `401`.
- Authenticated real-ledger read returned `200`, `artifactCount: 1`, `Cache-Control: no-store`, `visibility: internal_admin_only`, `publicPointerExposure: forbidden`.
- Latest artifact version: `v2.evidence-query-planning.preexecution-observation-artifact.x7o`.
- Source: `product_v2_orchestrator_after_evidence_lifecycle_intake`.
- `publicCutoverStatus: blocked_precutover`.
- `preexecutionObservation.status: blocked_pre_query_planning`.
- `preexecutionObservation.blockedReason: language_signal_unavailable`.
- `preexecutionObservation.sourceIntakeStatus: intake_ready`.
- `preexecutionObservation.inputScope: direct_text_claim_contract`.
- `preexecutionObservation.selectedAtomicClaimCount: 2`.
- `preexecutionObservation.sourceLanguageSignal: unavailable`.
- Product execution flags stayed false: Query Planning runtime, prompt load/render, model call, provider callback/search/fetch, Source Acquisition, parser, EvidenceCorpus, report, and verdict generation.
- X7-O artifact leak scan passed: no user input text, canary terms, URLs, source text, report text, verdict text, confidence text, cache keys, storage paths, secrets, env vars, or filesystem paths were present.

## Deputy Classification

- Architect: `PARTIAL`. Useful product-path facts proved, but formal X7-P pass criteria not met.
- Security/runtime: acceptable for closeout; no containment needed. The language block is fail-closed, not a security incident.
- Code/package: `X7-P NOT PASS`; do not loosen criteria retroactively; draft a narrow follow-up package.
- LLM/semantic: `FAIL_X7_P`, useful partial observation; likely Claim Understanding language metadata gap; no rerun before repair.

Consolidated classification: `PARTIAL_X7_P_LANGUAGE_SIGNAL_UNAVAILABLE`, not pass.

## Next Candidate

Draft a reviewed X7-Q language-metadata repair package before any rerun.

Preferred direction from consolidation:

- accepted direct-text `ClaimContract` should not use blank or `und` for `input.detectedLanguage` or `inputGroundingSeed.detectedLanguage`;
- repair should be generic and multilingual, not topic-specific and not based on deterministic keyword/regex language detection;
- likely package may need Claim Understanding prompt/contract validation tests, so it must be explicitly reviewed before implementation;
- do not make only X7-O read fallback metadata if the later Query Planning input envelope would still block on the ClaimContract language fields;
- do not run another live job until the language-metadata contract is repaired and verified.

Still blocked:

- Query Planning runtime execution.
- Query Planning input-envelope/prompt-packet/hash construction beyond reviewed tests.
- Prompt rendering, model/provider calls beyond approved Claim Understanding.
- Source-provider/search/fetch/content-dereference/provider-network/parser execution.
- Source material, EvidenceCorpus, EvidenceItems, warnings, reports, verdicts, confidence, or public output changes.
- Cache IO, durable storage, Source Reliability, ACS/direct URL execution.
- Unreviewed prompt/frontmatter/config/model/schema edits.
- Gateway/model/cache approval flips.
- Extra live jobs, validation batches, B3 proof, 2D-C, V1 reuse, V1 work, and V1 cleanup.
