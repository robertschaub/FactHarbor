# V2 Slice X7-J Product-Internal Evidence Lifecycle Intake Artifact Source Package

**Date:** 2026-05-17
**Status:** deputy-approved source package; docs-only; source implementation not yet started
**Owner role:** Lead Architect / Captain Deputy
**Baseline:** `cfdd7ce6` (`docs: record v2 x7i live-smoke result`)
**Decision source:** post-X7-I next-step debate. Architect and LLM/semantic recommended an internal observer bridge; Security/runtime warned against broad product-observable downstream artifacts; Code/package consolidated the narrow safe path: observe only the existing Evidence Lifecycle intake decision after Claim Understanding, with no downstream execution.
**Review result:** Architect APPROVE, Security/runtime APPROVE, Code/package APPROVE, LLM/semantic APPROVE after adding bounded structural reason codes, `intake_ready` qualification, `executionEligibility: "not_executable_precutover"`, allow-list projection, no-enumeration route rules, `Cache-Control: no-store`, concrete sink caps, fail-closed sink failure behavior, and stronger public leak tests.

## 1. Purpose

Define a narrow future source package that makes the first Evidence Lifecycle boundary product-internal and admin-inspectable without changing public V2 behavior.

X7-I proved that the product runner can reach hidden V2 Claim Understanding and still fail closed publicly. It also showed that X5-X7 harnesses are not product-runner live-path stages. The next useful step is therefore not to build more disconnected hidden code, and not to wire the whole X5-X7 chain into live jobs. The next useful step is a small observer bridge:

```text
product runner Claim Understanding state
  -> Claim Understanding stage handoff
  -> buildEvidenceLifecycleIntake(...)
  -> sanitized admin-only intake artifact
  -> public damaged/precutover envelope unchanged
```

X7-J is observation only. It does not execute Query Planning, Source Acquisition, parser code, downstream Evidence Lifecycle semantic tasks, reports, verdicts, or public cutover.

## 2. Approval Requested

Approve a future X7-J source implementation exactly inside the file envelope and contract below.

This approval would permit only:

- calling existing `buildEvidenceLifecycleIntake(context, claimUnderstandingHandoff)` from the product V2 orchestrator after Claim Understanding handoff creation;
- writing a bounded, sanitized, process-local admin-only Evidence Lifecycle intake artifact;
- adding an internal admin route to inspect that artifact by ledger id;
- tests and boundary guards proving the artifact is internal-only and no downstream execution occurs.

This approval would not permit:

- Query Planning runtime/model/provider execution;
- X5 hidden integration harness execution;
- X6/X7 source-acquisition harness execution;
- source-provider/search/fetch/content-dereference/provider-network/parser execution;
- packet/frame/byte consumption, parsed material, source material, EvidenceCorpus, EvidenceItems, sources, cited sources, warnings, reports, verdicts, confidence, or user-facing quality behavior;
- public API/UI/report/export exposure or public V2 cutover;
- cache IO, durable storage, Source Reliability, ACS/direct URL execution;
- prompt/frontmatter/config/model/schema edits, including X3-B;
- B3 proof execution, 2D-C, V1 reuse, V1 work, or V1 cleanup;
- live jobs or validation batches.

## 3. Source Envelope

Allowed production source files:

- `apps/web/src/lib/analyzer-v2/orchestrator.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-intake-artifact-sink.ts`
- `apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts/route.ts`

Allowed tests:

- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/intake.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/pipeline-shell.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-intake-artifact-sink.test.ts`
- `apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts/route.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Allowed docs/completion files:

- this package;
- `Docs/STATUS/Current_Status.md`;
- `Docs/STATUS/Backlog.md`;
- `Docs/AGENTS/Agent_Outputs.md`;
- `Docs/AGENTS/Handoffs/<dated X7-J package or implementation handoff>.md`;
- `Docs/AGENTS/index/handoff-index.json`.

No other files are approved. If implementation requires edits outside this envelope, stop and create a separate reviewed package.

## 4. Artifact Contract

The X7-J artifact must be a sanitized structural summary, not a copy of the full `EvidenceLifecycleStartDecision`.

Candidate fields:

```ts
type EvidenceLifecycleIntakeRuntimeArtifact = {
  readonly artifactVersion: "v2.evidence-lifecycle.intake-artifact.x7j";
  readonly visibility: "internal_admin_only";
  readonly publicPointerExposure: "forbidden";
  readonly ledgerId: string;
  readonly runId: string;
  readonly createdUtc: string;
  readonly source: "product_v2_orchestrator_after_claim_understanding";
  readonly claimUnderstanding: {
    readonly handoffStatus: "accepted" | "blocked" | "damaged";
    readonly blockedReason:
      | "duplicate_selected_claim_id"
      | "no_valid_claim"
      | "prepared_snapshot_invalid"
      | "selected_claim_missing"
      | "shell_placeholder_claim_id"
      | "gateway_policy_not_executable"
      | "runtime_dispatch_not_enabled"
      | "runtime_activation_disabled"
      | "runtime_activation_invalid"
      | "runtime_dispatch_model_policy_missing"
      | "runtime_dispatch_provider_callback_missing"
      | "runtime_dispatch_preflight_blocked"
      | "runtime_dispatch_readiness_blocked"
      | "runtime_dispatch_blocked"
      | null;
    readonly damagedReason:
      | "claim_contract_validation_failed"
      | "claim_understanding_unavailable"
      | null;
    readonly selectedAtomicClaimCount: number;
    readonly integrityEventCount: number;
  };
  readonly evidenceLifecycleIntake: {
    readonly decisionVersion: "v2.evidence-lifecycle.intake.0";
    readonly observationStatus: "contract_observed_preexecution" | "blocked_preexecution";
    readonly status: "intake_ready" | "blocked";
    readonly blockedReason:
      | "claim_understanding_blocked"
      | "claim_understanding_damaged"
      | "claim_contract_missing"
      | null;
    readonly executionScope: "contract_only_no_provider_execution" | null;
    readonly claimContractPresent: boolean;
    readonly executionEligibility: "not_executable_precutover";
  };
  readonly publicCutoverStatus: "blocked_precutover";
  readonly downstreamExecution: {
    readonly queryPlanningExecuted: false;
    readonly sourceAcquisitionExecuted: false;
    readonly providerNetworkExecuted: false;
    readonly parserExecuted: false;
    readonly evidenceCorpusCreated: false;
    readonly reportGenerated: false;
    readonly verdictGenerated: false;
  };
};
```

The exact field names may be adjusted during implementation review, but the artifact must remain structural, bounded, and sanitized.

`intake_ready` is an existing structural intake-contract status only. In X7-J artifacts it means only that an accepted Claim Understanding handoff contained a ClaimContract and the intake contract was constructed. It must not be interpreted as query-planning readiness, source readiness, evidence availability, report readiness, live eligibility, or public readiness. X7-J artifacts must also carry `executionEligibility: "not_executable_precutover"`.

All reason fields in the artifact must be bounded structural codes, not free-form natural language, claim text, model text, prompt text, evidence text, or report-quality explanation.

The artifact must be built by allow-list projection from explicitly named source fields. It must never be produced by copying a full Claim Understanding handoff, full Evidence Lifecycle intake decision, or full result object and deleting sensitive fields.

The only identifiers allowed in the artifact body are the structural `ledgerId` and `runId` needed for internal correlation. These are observability ids, not source locators. They must not be exposed publicly and must not be usable to enumerate artifacts.

The artifact must not contain:

- user input text, resolved input text, claim statements, prompt text, rendered prompt, provider response text, model raw output, source URLs, hidden source locators, raw source content, parsed content, source material, EvidenceCorpus, EvidenceItems, report text, verdict text, or confidence text;
- prompt/config/model hash values beyond null-safe schema placeholders already present in public output;
- cache keys, storage paths, secrets, admin keys, provider API keys, environment variables, or filesystem paths.

## 5. Runtime Sink Contract

The sink must be process-local and bounded, matching the current temporary hidden-artifact posture.

Required behavior:

- keyed by observability ledger id;
- stores only X7-J sanitized artifacts;
- bounded per ledger id and globally, with oldest-artifact eviction;
- maximum per-ledger artifacts: `4`;
- maximum global artifacts: `256`;
- maximum serialized artifact size: `16384` bytes;
- clone/freeze or equivalent defensive copying on write/read;
- exposes read APIs for the internal route and tests only;
- no durable persistence;
- no cache read/write;
- no Source Reliability, database, filesystem, blob storage, or network access.

Artifact write failures must fail closed operationally: they must not alter the public result, trigger retries, create warnings, unlock downstream execution, or turn a failed artifact write into a user-visible analysis issue. They may be recorded only as internal test-visible sink failure state.

If a reviewer wants durable artifacts, stop. Durable storage requires a separate architecture package.

## 6. Internal Route Contract

The internal route may mirror the Claim Understanding runtime artifact route pattern, but only for X7-J intake artifacts.

Required behavior:

- path: `apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts/route.ts`;
- requires the existing shared admin-key helper;
- unauthenticated requests return `401`;
- authenticated responses include `Cache-Control: no-store`;
- returns `visibility: "internal_admin_only"` and `publicPointerExposure: "forbidden"`;
- requires URL-encoded `ledgerId`;
- rejects missing, blank, malformed, or overlong `ledgerId` with bounded `400` responses;
- returns bounded `404` responses for unknown ledgers;
- forbids listing, enumeration, job-id lookup, prefix lookup, and any public pointer;
- returns bounded artifact summaries only;
- does not expose artifacts through public API, UI, report, export, compatibility view, or result JSON.

The route must not trigger analysis, model calls, source calls, parser calls, cache/SR/storage, or live jobs.

## 7. Orchestrator Contract

The product V2 orchestrator may:

1. build Claim Understanding state exactly as today;
2. build `ClaimUnderstandingStageHandoff` exactly as today;
3. call `buildEvidenceLifecycleIntake(context, claimUnderstandingHandoff)`;
4. write a sanitized X7-J artifact through the process-local sink;
5. build the same damaged/precutover public envelope as today.

The orchestrator must not:

- call `runHiddenV2IntegrationHarness`;
- call Query Planning runtime, prompt loader, model adapter, or provider callback;
- call any X6/X7 source-acquisition harness or execution gate;
- call source/provider/search/fetch/content-dereference/network/parser code;
- add EvidenceCorpus, EvidenceItems, report, warning, verdict, confidence, or public cutover output.

For blocked/damaged Claim Understanding states, X7-J should still write a structural blocked intake artifact. It must not fabricate a ClaimContract or describe the block as evidence scarcity.

## 8. Naming And Semantic Rules

Status and reason names must describe structural pre-execution state only.

Allowed wording examples:

- `intake_ready`;
- `blocked`;
- `claim_understanding_blocked`;
- `claim_understanding_damaged`;
- `claim_contract_missing`;
- `contract_only_no_provider_execution`.

Forbidden wording examples:

- `insufficient_evidence`;
- `low_evidence`;
- `no_sources_found`;
- `low_confidence`;
- `source_quality`;
- `report_quality`;
- `verdict_ready`;
- `evidence_available`;
- `live_eligible`;
- `public_ready`.

X7-J must not make deterministic text-analysis decisions. It may count structural items such as selected claim ids and integrity events. It must not classify or interpret claim meaning, evidence meaning, source quality, language quality, or report quality.

## 9. Boundary Guard Requirements

Update `boundary-guard.test.ts` to prove:

- the X7-J artifact sink imports no prompt/model/provider/search/fetch/content-dereference/network/parser/cache/SR/storage/product/public/API/UI/report/export modules;
- the X7-J internal route imports only admin-auth helpers and the X7-J artifact read API;
- no public route, UI, report, export, compatibility view, or result envelope imports the X7-J artifact sink or route;
- `orchestrator.ts` does not import `runHiddenV2IntegrationHarness`, Query Planning runtime, Source Acquisition runtime, X6/X7 harnesses, source/provider/search/fetch/content/parser, cache, storage, or Source Reliability;
- no V1 analyzer/prompt/type/code imports are introduced;
- the new route is not barrel-exported or reachable from public paths.

## 10. Focused Tests

Add or extend tests that prove:

- accepted Claim Understanding handoff produces an `intake_ready` X7-J artifact without copying full claim text;
- blocked Claim Understanding handoff produces a blocked artifact with `claim_understanding_blocked`;
- damaged Claim Understanding handoff produces a blocked artifact with `claim_understanding_damaged`;
- missing ClaimContract produces a blocked artifact with `claim_contract_missing`;
- sink read/write defensively copies artifacts and enforces bounds;
- sink rejects or drops over-size artifacts according to the approved max serialized size;
- sink failure does not affect public output, create warnings, retry, or unlock downstream execution;
- unauthenticated route access returns `401`;
- authenticated responses include `Cache-Control: no-store`;
- route rejects missing, blank, malformed, and overlong `ledgerId`;
- route does not list, enumerate, or support job-id lookup;
- authenticated route access returns internal-only metadata and artifacts by ledger id;
- public result JSON remains damaged/precutover and contains no X7-J artifact id, artifact body, ledger id, run id, claim text, prompt text, provider output, URLs, non-null hidden hashes, environment names, filesystem paths, cache keys, storage keys, or source/retrieval/parser fields;
- Query Planning, Source Acquisition, provider/network/parser, cache/SR/storage, report, verdict, and confidence flags remain false or absent.

## 11. Verifiers

Focused:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2/evidence-lifecycle/intake.test.ts test/unit/lib/analyzer-v2/pipeline-shell.test.ts test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-intake-artifact-sink.test.ts test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-intake-artifacts/route.test.ts test/unit/lib/analyzer-v2/boundary-guard.test.ts
```

Broader:

```powershell
npm -w apps/web run test -- test/unit/lib/analyzer-v2-runtime
npm -w apps/web run test -- test/unit/lib/analyzer-v2
npm -w apps/web run build
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
node scripts/build-index.mjs --tier=2 --tracked-only
git diff --check
git diff --cached --check
git status --short --untracked-files=all
```

Do not run expensive LLM tests or live jobs.

## 12. Review Questions

Architect:

- Does X7-J close the product-runner observability gap without pretending X5-X7 are product-runner stages?
- Is Evidence Lifecycle intake observation the right next step after X7-I?

Security/runtime:

- Is the admin-only route acceptable if it is bounded, sanitized, non-durable, and authenticated?
- Are leak and gate-drift risks controlled enough for implementation?

Code/package:

- Is the file envelope narrow and enforceable?
- Are the artifact fields concrete enough for implementation and tests?

LLM/semantic:

- Does X7-J avoid treating blocked/no-corpus/pre-execution states as evidence scarcity, report quality, verdict quality, or confidence?
- Does the package avoid semantic interpretation and prompt-edit drift?

## 13. Package Completion Requirements

Before committing this docs-only package:

- obtain Architect, Security/runtime, Code/package, and LLM/semantic review;
- update this package status with the review result;
- update `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md` only as X7-J package pointers;
- append `Docs/AGENTS/Agent_Outputs.md`;
- create a package handoff under `Docs/AGENTS/Handoffs/`;
- rebuild and stage `Docs/AGENTS/index/handoff-index.json`;
- run:

```powershell
npm run validate:v2-gates
node scripts/validate-v2-gate-register.mjs --self-test
node scripts/build-index.mjs --tier=2 --tracked-only
git diff --check
git diff --cached --check
git status --short --untracked-files=all
```

Do not implement source, run live jobs, edit prompts/config/models/schemas, or touch source/provider/parser/public paths until the package is accepted.

## 14. Future Implementation Completion Requirements

Before committing a future X7-J implementation:

- update this package status with implementation result and reviewer state;
- update `Docs/STATUS/Current_Status.md` and `Docs/STATUS/Backlog.md` only as X7-J implementation pointers;
- append `Docs/AGENTS/Agent_Outputs.md`;
- create an implementation handoff under `Docs/AGENTS/Handoffs/`;
- rebuild and stage `Docs/AGENTS/index/handoff-index.json`;
- run the focused and broader verifiers in section 11;
- keep live jobs blocked unless a later reviewed live-smoke package explicitly approves them.
