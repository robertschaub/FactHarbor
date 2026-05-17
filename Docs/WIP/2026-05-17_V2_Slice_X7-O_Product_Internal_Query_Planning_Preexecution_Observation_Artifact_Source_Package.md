# V2 Slice X7-O Product-Internal Query Planning Pre-Execution Observation Artifact Source Package

**Date:** 2026-05-17
**Status:** reviewer-approved source package; docs-only; source implementation not yet started
**Owner role:** Lead Architect / Captain Deputy
**Baseline:** `8136f12f` (`docs: record v2 x7n-d live smoke result`)
**Decision source:** post-X7-N-D next-step debate. Architect, Security/runtime, Code/package, LLM/semantic, and Claude Opus reviewers converged on a no-provider product-internal Query Planning pre-execution structural observation artifact before any Query Planning execution or source-acquisition expansion.
**Review result:** Architect APPROVE, Security/runtime APPROVE, Code/package APPROVE, LLM/semantic APPROVE, and Claude Opus APPROVE after replacing readiness/eligibility terminology, forbidding Query Planning input-envelope/prompt-packet/hash construction, requiring configured-key and production-missing-key route tests, restricting sink/route APIs to sanitized projections, and making prior prompt authorization explicitly consumed by X7-M/X3-B.

## 1. Purpose

X7-N-D proved the product V2 route can produce accepted hidden Claim Understanding output and X7-J Evidence Lifecycle intake artifacts for the legal-question canary while public V2 remains damaged/precutover.

The next useful product-path step is not Query Planning execution. It is a narrow observer bridge:

```text
product runner Claim Understanding state
  -> Claim Understanding stage handoff
  -> Evidence Lifecycle intake decision
  -> Query Planning pre-execution structural observation
  -> sanitized admin-only X7-O artifact
  -> public damaged/precutover envelope unchanged
```

X7-O records whether the existing X7-J intake exposes the structural prerequisites a later, separately approved Query Planning execution gate would need to evaluate. It does not run Query Planning, construct a Query Planning input envelope, build prompt packets, hash a ClaimContract, render prompts, call models, call providers, build search queries for execution, fetch sources, create source material, create an EvidenceCorpus, or alter public result behavior.

## 2. Approval Requested

Approve a future X7-O source implementation exactly inside the file envelope and contract below.

This approval would permit only:

- building a sanitized structural Query Planning pre-execution observation after the existing X7-J intake decision;
- recording a bounded, process-local, admin-only X7-O artifact by observability ledger id;
- adding an authenticated internal no-store route to inspect that artifact;
- tests and boundary guards proving no Query Planning execution, prompt rendering, provider/model call, source IO, parser work, cache IO, Source Reliability, public exposure, or live job occurs.

Prior `Prompt implementation authorized.` wording is spent by X7-M Claim Understanding prompt repair and X3-B Query Planning prompt metadata alignment. X7-O grants no prompt/frontmatter/config/model/schema authority; any new prompt change requires a separate explicit prompt package and approval.

This approval would not permit:

- `runEvidenceQueryPlanningRuntime(...)`;
- `loadAndRenderEvidenceQueryPlanningPrompt(...)`;
- `executeEvidenceQueryPlanningModelAdapter(...)`;
- `buildEvidenceQueryPlanningInputEnvelope(...)`;
- prompt-packet construction, `claimContractHash` construction, `batchInputEnvelope` construction, retrieval catalog packet construction, or source-acquisition trace packet construction;
- provider callbacks, provider SDK imports, model calls, search/fetch/content-dereference/provider-network/parser execution;
- source material, EvidenceCorpus, EvidenceItems, warnings, report, verdict, confidence, or public output;
- cache IO, durable storage, Source Reliability, ACS/direct URL execution;
- prompt/frontmatter/config/model/schema edits;
- gateway/model/cache approval flips;
- live jobs, validation batches, B3 proof, 2D-C, V1 reuse, V1 work, or V1 cleanup.

## 3. Source Envelope

Allowed production source files:

- `apps/web/src/lib/analyzer-v2/orchestrator.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/query-planning/preexecution-observation.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-preexecution-observation-artifact-sink.ts`
- `apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-query-planning-preexecution-observation-artifacts/route.ts`

Allowed tests:

- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/preexecution-observation.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/pipeline-shell.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-preexecution-observation-artifact-sink.test.ts`
- `apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-query-planning-preexecution-observation-artifacts/route.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Allowed docs/completion files:

- this package;
- `Docs/STATUS/Current_Status.md`;
- `Docs/STATUS/Backlog.md`;
- `Docs/AGENTS/Agent_Outputs.md`;
- `Docs/AGENTS/Handoffs/<dated X7-O package or implementation handoff>.md`;
- `Docs/AGENTS/index/handoff-index.json`.

No other files are approved. If implementation requires edits outside this envelope, stop and create a separate reviewed package.

## 4. Pre-Execution Observation Contract

The X7-O pre-execution observation builder must consume only:

- `EvidenceLifecycleStartDecision` from the existing X7-J intake path;
- the existing `PipelineRunContext` if needed for run id, current date, and observability ledger id;

X7-O must not consume Query Planning execution-preparation owners. In particular, it must not import or call `query-planning/input-envelope.ts`, `query-planning/runtime.ts`, `query-planning/prompt-loader.ts`, `query-planning/model-adapter.ts`, `query-planning/inspection.ts`, source-acquisition request/handoff modules, provider callback types, or anything that builds prompt packets, `ClaimContract` hashes, `batchInputEnvelope`, retrieval-catalog packets, source-acquisition trace packets, prompt/model/cache provenance, or query-plan inspection summaries.

Static Query Planning policy/readiness metadata may not be copied into artifacts. If implementation needs to acknowledge policy posture, it may emit only coarse literals from this package such as `hidden_task_policy_observed_not_invoked` and `product_invocation_blocked_precutover`; it must not surface raw static policy snapshots, prompt section ids, schema versions, gateway task ids/statuses, provider/model names, approval timestamps, config snapshots, prompt profiles, cache keys, or hashes.

The builder must not copy or store the full ClaimContract. It may inspect structural fields needed to classify pre-execution observation state:

- Claim Understanding handoff/intake status;
- direct-text versus prepared-snapshot/source mode;
- selected AtomicClaim count and selected-id structural validity;
- source-language signal presence, without storing the language value;
- coarse Query Planning policy posture, without importing execution-preparation owners and without granting product execution;
- public cutover status, always `blocked_precutover`;
- downstream execution flags, all false.

Candidate result shape:

```ts
type EvidenceQueryPlanningPreexecutionObservation =
  | {
      readonly observationVersion: "v2.evidence-query-planning.preexecution-observation.x7o";
      readonly visibility: "internal_only";
      readonly status: "structural_prerequisites_observed_not_executed_precutover";
      readonly blockedReason: null;
      readonly sourceIntakeStatus: "intake_ready";
      readonly inputScope: "direct_text_claim_contract";
      readonly selectedAtomicClaimCount: number;
      readonly sourceLanguageSignal: "present";
      readonly taskPolicy: {
        readonly queryPlanningPolicySignal: "hidden_task_policy_observed_not_invoked";
        readonly productExecutionAuthority: "product_invocation_blocked_precutover";
      };
      readonly execution: {
        readonly queryPlanningExecuted: false;
        readonly promptLoaded: false;
        readonly promptRendered: false;
        readonly modelCalled: false;
        readonly providerCallbackCreated: false;
        readonly providerSearchFetchCalled: false;
        readonly cacheRead: false;
        readonly cacheWrite: false;
        readonly sourceReliabilityCalled: false;
      };
    }
  | {
      readonly observationVersion: "v2.evidence-query-planning.preexecution-observation.x7o";
      readonly visibility: "internal_only";
      readonly status: "blocked_pre_query_planning";
      readonly blockedReason:
        | "evidence_lifecycle_intake_blocked"
        | "claim_contract_missing"
        | "claim_contract_invalid"
        | "direct_text_claim_contract_required"
        | "selected_claim_ids_invalid"
        | "language_signal_unavailable"
        | "query_planning_product_execution_not_approved";
      readonly sourceIntakeStatus: "blocked" | "intake_ready";
      readonly inputScope: "not_applicable" | "unsupported_claim_contract_scope";
      readonly selectedAtomicClaimCount: number;
      readonly sourceLanguageSignal: "present" | "unavailable";
      readonly taskPolicy: {
        readonly queryPlanningPolicySignal:
          | "hidden_task_policy_observed_not_invoked"
          | "not_observed_execution_gate_required";
        readonly productExecutionAuthority: "product_invocation_blocked_precutover";
      };
      readonly execution: {
        readonly queryPlanningExecuted: false;
        readonly promptLoaded: false;
        readonly promptRendered: false;
        readonly modelCalled: false;
        readonly providerCallbackCreated: false;
        readonly providerSearchFetchCalled: false;
        readonly cacheRead: false;
        readonly cacheWrite: false;
        readonly sourceReliabilityCalled: false;
      };
    };
```

The exact field names may be adjusted during implementation review, but the observation must remain structural, bounded, and sanitized. The status `structural_prerequisites_observed_not_executed_precutover` means only that the accepted X7-J intake has the structural direct-text prerequisites a later Query Planning execution gate would need to evaluate. It does not mean source readiness, evidence availability, report readiness, public readiness, or live eligibility.

`language_signal_unavailable` means only that required structural language metadata is missing or unusable. It must not imply language quality, language confidence, translation need, source adequacy, evidence scarcity, or report quality.

## 5. Artifact Contract

The X7-O artifact must be a sanitized structural summary, not a copy of the full pre-execution observation if that observation ever grows sensitive fields.

Candidate fields:

```ts
type EvidenceQueryPlanningPreexecutionObservationRuntimeArtifact = {
  readonly artifactVersion: "v2.evidence-query-planning.preexecution-observation-artifact.x7o";
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly ledgerId: string;
  readonly runId: string;
  readonly createdUtc: string;
  readonly source: "product_v2_orchestrator_after_evidence_lifecycle_intake";
  readonly preexecutionObservation: {
    readonly observationVersion: "v2.evidence-query-planning.preexecution-observation.x7o";
    readonly status:
      | "structural_prerequisites_observed_not_executed_precutover"
      | "blocked_pre_query_planning";
    readonly blockedReason:
      | "evidence_lifecycle_intake_blocked"
      | "claim_contract_missing"
      | "claim_contract_invalid"
      | "direct_text_claim_contract_required"
      | "selected_claim_ids_invalid"
      | "language_signal_unavailable"
      | "query_planning_product_execution_not_approved"
      | null;
    readonly sourceIntakeStatus: "intake_ready" | "blocked";
    readonly inputScope: "direct_text_claim_contract" | "unsupported_claim_contract_scope" | "not_applicable";
    readonly selectedAtomicClaimCount: number;
    readonly sourceLanguageSignal: "present" | "unavailable";
  };
  readonly productExecution: {
    readonly queryPlanningRuntimeInvoked: false;
    readonly promptLoaded: false;
    readonly promptRendered: false;
    readonly modelCalled: false;
    readonly providerCallbackCreated: false;
    readonly providerSearchFetchCalled: false;
    readonly sourceAcquisitionExecuted: false;
    readonly parserExecuted: false;
    readonly evidenceCorpusCreated: false;
    readonly reportGenerated: false;
    readonly verdictGenerated: false;
  };
  readonly publicCutoverStatus: "blocked_precutover";
};
```

The artifact must not contain:

- user input text, resolved input text, claim statements, AtomicClaim ids, prompt text, rendered prompt text, provider request/response text, raw model output, source URLs, hidden source locators, raw source content, parsed content, source material, EvidenceCorpus, EvidenceItems, report text, verdict text, or confidence text;
- prompt/config/model hashes unless separately reviewed as needed for an execution provenance artifact;
- cache keys, storage paths, secrets, admin keys, provider API keys, environment variables, or filesystem paths.

The artifact must be built by allow-list projection from explicitly named source fields. It must never be produced by copying full Claim Understanding handoff, full Evidence Lifecycle intake decision, full ClaimContract, full Query Planning input envelope, full static policy snapshot, or full result object and deleting sensitive fields.

The sink and route APIs must accept only sanitized artifact/projection types. They must not accept or import raw `ClaimContract`, `EvidenceLifecycleStartDecision`, `PipelineRunContext`, static policy snapshots, prompt/model/provider types, or Query Planning runtime/input-envelope/inspection result types.

## 6. Runtime Sink Contract

The sink must mirror the temporary hidden-artifact posture already used by Claim Understanding and X7-J:

- process-local only;
- keyed by observability ledger id;
- bounded per ledger and globally, with oldest-artifact eviction;
- maximum per-ledger artifacts: `4`;
- maximum global ledgers: `256`;
- maximum serialized artifact size: `16384` bytes;
- maximum ledger id length: `256`;
- defensive clone/freeze or equivalent on write/read;
- no durable persistence;
- no cache read/write;
- no Source Reliability, database, filesystem, blob storage, or network access.

Artifact write failures must be best-effort and isolated: they must not alter public result generation, trigger retries, create user-visible warnings, unlock downstream execution, or turn a failed artifact write into an analysis issue.

## 7. Internal Route Contract

The internal route must follow the X7-J route pattern:

- path: `apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-query-planning-preexecution-observation-artifacts/route.ts`;
- exports `runtime = "nodejs"`;
- requires the existing shared admin-key helper;
- unauthenticated requests return `401`;
- authenticated responses include `Cache-Control: no-store`;
- requires exactly one URL parameter: `ledgerId`;
- rejects missing, blank, malformed, duplicate, or overlong `ledgerId` with bounded `400`;
- returns bounded `404` for unknown ledgers;
- `400` and `404` bodies must not echo the requested `ledgerId`; successful authenticated reads may include `ledgerId`;
- forbids listing, enumeration, job-id lookup, prefix lookup, public pointers, and public route access;
- returns only bounded internal artifact summaries.

Route tests must set a configured `FH_ADMIN_KEY` and prove missing or incorrect keys return `401`. They must also prove production mode with missing `FH_ADMIN_KEY` returns `401` and that all route responses include `Cache-Control: no-store`. X7-O tests must not rely on any local-development unset-key exception in the shared auth helper.

The route must not trigger analysis, prompt rendering, model calls, provider calls, source calls, parser calls, cache/SR/storage, or live jobs.

## 8. Orchestrator Contract

The product V2 orchestrator may:

1. build Claim Understanding state exactly as today;
2. build `ClaimUnderstandingStageHandoff` exactly as today;
3. build `EvidenceLifecycleStartDecision` exactly as today;
4. build the X7-O pre-execution observation from that intake decision;
5. write the sanitized X7-O artifact through the process-local sink;
6. build the same damaged/precutover public envelope as today.

The orchestrator must not:

- call `runEvidenceQueryPlanningRuntime`;
- call `loadAndRenderEvidenceQueryPlanningPrompt`;
- call `executeEvidenceQueryPlanningModelAdapter`;
- call `buildEvidenceQueryPlanningInputEnvelope`;
- construct prompt packets, ClaimContract hashes, batch input envelopes, retrieval catalog packets, source-acquisition trace packets, or Query Planning provenance envelopes;
- create or pass a provider callback;
- call `runHiddenV2IntegrationHarness`;
- call any X6/X7 source-acquisition harness or execution gate;
- call source/provider/search/fetch/content-dereference/network/parser code;
- add EvidenceCorpus, EvidenceItems, report, warning, verdict, confidence, or public cutover output.

For blocked/damaged Claim Understanding or blocked intake states, X7-O should still write a structural blocked artifact when safe. It must not fabricate a ClaimContract or describe the block as evidence scarcity.

## 9. Naming And Semantic Rules

Status and reason names must describe structural pre-execution state only.

Allowed wording examples:

- `structural_prerequisites_observed_not_executed_precutover`;
- `blocked_pre_query_planning`;
- `direct_text_claim_contract_required`;
- `language_signal_unavailable`;
- `query_planning_product_execution_not_approved`;
- `product_invocation_blocked_precutover`;
- `hidden_task_policy_observed_not_invoked`.

Forbidden wording examples:

- `eligible_not_executed_precutover`;
- `ready_hidden_internal`;
- `query_planning_ready`;
- `query_plan_ready`;
- `search_ready`;
- `sources_ready`;
- `insufficient_evidence`;
- `low_evidence`;
- `source_quality`;
- `report_quality`;
- `verdict_ready`;
- `evidence_available`;
- `live_eligible`;
- `public_ready`.

X7-O must not make deterministic text-analysis decisions. It may count structural items and inspect schema/contract fields. It must not classify or interpret claim meaning, evidence meaning, source quality, language quality, report quality, fairness, truth, compliance, or confidence.

## 10. Boundary Guard Requirements

Update `boundary-guard.test.ts` to prove:

- the X7-O pre-execution observation builder imports no `query-planning/runtime.ts`, `query-planning/prompt-loader.ts`, `query-planning/model-adapter.ts`, `query-planning/input-envelope.ts`, `query-planning/inspection.ts`, provider callback types, source-acquisition handoff/request modules, prompt/model/provider/search/fetch/content-dereference/network/parser/cache/SR/storage/product/public/API/UI/report/export modules;
- the X7-O builder does not construct prompt packets, `EvidenceQueryPlanningInputEnvelope`, `claimContractHash`, `batchInputEnvelope`, retrieval catalog packets, source-acquisition trace packets, prompt/model/cache provenance, or query-plan inspection summaries;
- the X7-O artifact sink imports no `ClaimContract`, `EvidenceLifecycleStartDecision`, `PipelineRunContext`, static policy snapshots, prompt/model/provider/search/fetch/content-dereference/network/parser/cache/SR/storage/product/public/API/UI/report/export modules;
- the X7-O internal route imports only admin-auth helpers and the X7-O artifact read API;
- no public route, UI, report, export, compatibility view, or result envelope imports the X7-O sink or route;
- `orchestrator.ts` imports the X7-O pre-execution observation builder and sink only, not Query Planning runtime, prompt loader, model adapter, provider callback types, hidden integration harness, source-acquisition harnesses, cache, storage, Source Reliability, parser, or V1 analyzer code;
- the X7-O route is not barrel-exported or reachable from public paths.

X7-O must not consume or advance X7-F, X7-G2, C0-S1, C0-S2, or C0-S3 source/parser denial paths. Those remain separate hidden source/parser governance tracks.

## 11. Focused Tests

Add tests that prove:

- accepted direct-text X7-J intake produces `structural_prerequisites_observed_not_executed_precutover`;
- blocked intake produces `blocked_pre_query_planning`;
- prepared-snapshot or ACS-sourced ClaimContract is blocked as `direct_text_claim_contract_required`;
- empty, duplicate, or missing selected claim ids are blocked as `selected_claim_ids_invalid`;
- unavailable source-language signal is blocked as `language_signal_unavailable`;
- `language_signal_unavailable` is tested as missing structural metadata only and does not expose or judge language quality, language confidence, translation need, source adequacy, evidence scarcity, or report quality;
- accepted observation is computed by structural inspection only and does not construct `EvidenceQueryPlanningInputEnvelope`, `promptPackets`, `claimContractHash`, `batchInputEnvelope`, retrieval catalog packets, source-acquisition trace fields, prompt/model/cache provenance, or query-plan inspection summaries;
- X7-O artifacts do not contain user input, claim text, AtomicClaim ids, prompt text, rendered prompt text, provider payloads, source URLs, cache keys, storage paths, or environment values;
- artifacts never expose the actual detected/source-language value, only `present` or `unavailable`;
- artifact leak tests include sentinel values for `inputValue`, `resolvedInputText`, claim text, AtomicClaim IDs, language value, `configSnapshot`, `promptProfile`, `modelPolicy`, gateway task IDs/statuses, prompt section IDs, provider names, cache/storage keys, environment values, URLs, source fields, parser fields, and hidden provenance fields;
- sink read/write defensively copies artifacts and enforces per-ledger/global/serialized-size bounds;
- sink failure is isolated from public envelope generation;
- unauthenticated route access returns `401`;
- authenticated route responses include `Cache-Control: no-store`;
- route rejects missing, blank, malformed, duplicate, overlong, enumerating, and non-ledger query shapes;
- public result JSON remains damaged/precutover and contains no X7-O artifact id, artifact body, ledger id, run id, claim text, prompt text, provider output, URLs, non-null hidden hashes, cache keys, storage keys, source/retrieval/parser fields, new public V2 result fields, `preexecutionObservation`, `queryPlanningEligibility`, `eligibility`, or `structural_prerequisites_observed_not_executed_precutover`;
- Query Planning, Source Acquisition, provider/network/parser, cache/SR/storage, report, verdict, and confidence flags remain false or absent.

## 12. Verifiers

Focused:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/preexecution-observation.test.ts test/unit/lib/analyzer-v2/pipeline-shell.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-preexecution-observation-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-query-planning-preexecution-observation-artifacts/route.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
```

Broader:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run index
git diff --check
git diff --cached --check
git status --short --untracked-files=all
```

Do not run expensive LLM tests or live jobs for X7-O.

## 13. Review Questions

Architect:

- Does X7-O establish the right product-path handoff between X7-J intake and later Query Planning execution without executing Query Planning?
- Is the pre-execution observation terminology sufficiently clear that it does not imply source, report, public, or live readiness?

Security/runtime:

- Is the artifact sanitized and bounded enough for process-local admin inspection?
- Are prompt/model/provider/source/cache/SR/storage/public leak paths controlled?

Code/package:

- Is the file envelope narrow and enforceable?
- Are the tests and boundary guards sufficient to prevent accidental runtime/source/public expansion?

LLM/semantic:

- Does X7-O avoid semantic classification and avoid turning pre-execution blocks into evidence scarcity, report quality, verdict quality, or confidence judgments?
- Does the package keep prompt implementation authorization consumed by X7-M/X3-B and avoid unapproved prompt edits?

## 14. Package Completion Requirements

Before committing this docs-only package:

- obtain Architect, Security/runtime, Code/package, LLM/semantic, and Claude Opus review;
- update this package status with the review result;
- update `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md` only as X7-O package pointers;
- append `Docs/AGENTS/Agent_Outputs.md`;
- create a package handoff under `Docs/AGENTS/Handoffs/`;
- rebuild and stage `Docs/AGENTS/index/handoff-index.json`;
- run:

```powershell
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
npm run index
git diff --check
git diff --cached --check
git status --short --untracked-files=all
```

Do not implement source, run live jobs, edit prompts/config/models/schemas, or touch provider/source/parser/public paths until the package is accepted.

## 15. Future Implementation Completion Requirements

Before committing a future X7-O implementation:

- update this package status with implementation result and reviewer state;
- update `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md` only as X7-O implementation pointers;
- append `Docs/AGENTS/Agent_Outputs.md`;
- create an implementation handoff under `Docs/AGENTS/Handoffs/`;
- rebuild `Docs/AGENTS/index/handoff-index.json`;
- run the focused and broader verifiers in section 12;
- keep live jobs blocked unless a later reviewed live-smoke package explicitly approves them.
