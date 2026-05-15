# V2 Pipeline Implementation Guardrails

**Purpose:** This is the canonical short reference for agents implementing the FactHarbor V2 pipeline. It summarizes the non-negotiable decisions from the V2 target specification and points implementers to the authoritative details.

Authoritative specification:

- `Docs/WIP/2026-05-12_Pipeline_Rebuild_Target_Specification_Draft.md`
- `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/AKEL Pipeline V2/WebHome.xwiki`
- `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/AKEL Pipeline Detail V2/WebHome.xwiki`

Baseline anchors:

- V1-before-V2-specification tag: `v1-before-v2-pipeline-specification` at commit `92b5a5f3`.
- Use this tag when a future comparison branch or V1/V2 archaeology workspace is needed. Do not create or keep a V1 comparison branch until there is a concrete comparison task.

Current runtime-gate checklist:

- `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` in this file is the single source of truth for 6B.* blocked/allowed runtime and provider-wiring constraints until it is explicitly superseded by a newer checklist version.

## Mandatory Startup

Before non-trivial V2 implementation work:

1. Call `fhAgentKnowledge.preflight_task` with the actual task.
2. Read `apps/web/src/lib/analyzer-v2/AGENTS.md`.
3. Read the relevant target-spec section for the slice.
4. Identify whether the change touches prompt/model execution, report generation, UI/session behavior, V1 cleanup, cutover behavior, or live validation. Those surfaces require the documented review gates.

## Clean-Room Boundary

V2 is a clean rebuild, not a refactor of V1.

- No imports from `apps/web/src/lib/analyzer/` into V2 internals.
- No V1 analysis prompt, prompt profile, prompt section, or V1 pipeline-owned type reuse.
- No cloning V1 code under new names.
- Current runner/job data may enter V2 only through a named one-way ingress mapping.
- Compatibility adapters may project `ReportResult`; they must not reinterpret verdicts.

Current mechanical guard:

- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

## Architecture Rules

- Preserve the analytical flow: Understand -> Research -> Boundary formation -> Verdict -> Aggregation/report.
- Gate 1, sufficiency, Gate 4, warning integrity, and report integrity remain explicit trust controls.
- Semantic text decisions are LLM-owned or UCM/prompt-owned, not regex, keyword, language-specific, or overlap heuristics.
- Use V2-owned contracts: `PipelineRunContext`, `ClaimContract`, `EvidenceCorpus`, `BoundarySet`, `VerdictSet`, and `ReportResult`.
- During rebuild, `apps/web/src/lib/analyzer-v2/` and `4.0.0-cb-precutover` are temporary boundaries. After V1 deletion, a naming-normalization slice removes unnecessary rebuild labels from final runtime code.

## Runtime Gate Constraint Checklist

Checklist version/hash: `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` / `sha256:9029402e8d359ef21a5e92a181e290a9362203acaca1923a98606b63018fec96` for the checklist payload from `Track identity` through `V1 cleanup rule`.

Use this checklist for every 6B.* Claim Understanding runtime/provider slice until a newer version replaces it. Slice plans and handoffs must reference this exact version and must record whether the slice is `docs-only`, `contract-only`, `internal scaffold`, or `source-wiring`.

- Track identity: 6B.* runtime/provider work is a parallel gated activation track for V2 Claim Understanding. It is not the main rebuild sequence, not a V1 monitor backlog item, and not a V1 completion plan.
- Approval traceability: if a slice requires Captain or deputy-team approval, the implementing handoff must record the source package, the approver or approval body, the date, the message/artifact pointer, and the implementing commit. If the approval pointer is missing, the slice is not approved.
- Allowed before a later source-wiring gate: docs packages, inert contracts, static guards, focused tests, internal no-public-result scaffolds inside explicitly approved owner files, and controlled test harness injection.
- Blocked without a later reviewed gate: public API/UI/report/export exposure; live jobs; ACS or direct URL runtime execution; cache read/write/storage IO; prompt/config source changes; file seeding; prompt/model/cache approval flips; product caller exceptions; public partial Claim Understanding results; V1 cleanup/removal; V1 analyzer/prompt/type reuse; provider SDK imports inside Analyzer V2; concrete provider callback factories; and broad product-path runtime dispatch.
- Direct-text-only rule: any approved pre-cutover runtime path is direct text only unless the gate explicitly names ACS or direct URL execution and its ownership/verifier.
- Provider boundary rule: Analyzer V2 may depend only on V2-owned contracts and injected provider boundaries. Concrete provider factory construction belongs outside Analyzer V2 and requires a separate source-wiring gate.
- Cache rule: runtime Claim Understanding remains no-store/no-read unless a later gate approves cache identity, cache IO ownership, provenance, rollback, and tests.
- Public surface rule: the public result remains the damaged pre-cutover envelope until a separate result/report/API/UI gate approves exposure.
- Live-job rule: live jobs become meaningful only after a committed, runtime-refreshed source-wiring slice can produce a real hidden V2 direct-text artifact without scaffold-only injection. Current Captain allowance is max 4 live jobs without further confirmation, but a slice may still require a narrower gate.
- V1 cleanup rule: V1 code/prompts/types are removal debt only after V2 owns the equivalent public path, cutover stabilizes, and the cleanup ledger verifier passes. Git history and tagged old worktrees are the backward-investigation mechanism.

## Approval Gates

Prompt/model execution:

- All 6B.* Claim Understanding runtime/provider slices must reference `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1` or a newer superseding checklist version.
- New or changed prompt-backed V2 tasks require Captain approval and LLM Expert review.
- Prompt/model/cache tasks remain blocked until approval is recorded in the gateway policy.
- Slice 6A.5 hardening is complete at `724dd9aa`: full ACS prepared-snapshot ingress, shell-placeholder claim-id isolation, ACS/direct-input cache-policy alignment, and explicit prompt-output-to-`ClaimContract` schema mapping tests. Before Slice 6B Claim Understanding prompt/model execution, verify this guard still passes and record Captain approval plus LLM Expert review.
- Slice 6B uses the review package in `Docs/WIP/2026-05-14_V2_Slice_6B_Prompt_Model_Review_Package.md`; initial deputy review returned `MODIFY`. Slice 6B.1a is complete at `24f55d4a`: `ClaimUnderstandingResult` is the gateway output envelope and accepted results carry `ClaimContract`. Slice 6B.1b is complete at `2f1b60a4`: `claimboundary-v2` is manageable but not file-seeded, and `claim_understanding_gate1` has blocked model-policy metadata. Slice 6B.2 is complete at `8a1ef8cd`: clean-room `claimboundary-v2.prompt.md` with `V2_CLAIM_UNDERSTANDING_GATE1`, contract/static-hygiene tests, and final Claude Opus LLM Expert approval. Slice 6B.3a is complete at `2d14c89a`: explicit V2 prompt loader, production runtime schemas, cache/provenance no-dispatch/no-store decisions, policy eligibility guard, and tests. Slice 6B.3b is complete at `04742922`: V2-owned local adapter under `apps/web/src/lib/analyzer-v2/`, dependency-injected mock dispatch, production schema validation, gateway policy fail-closed, identical structural retry, typed telemetry/provenance, no cache IO, no provider SDK callsite, no product-path imports, no neutral/shared adapter, and no placeholder telemetry. Slice 6B.3c-0 is complete at `3223d99f`: structural no-dispatch Claim Understanding orchestration, raw shell-placeholder rejection, no `resolvedInputSha256` misuse as ACS hash, V2-owned internal runtime stage/state, direct input blocked by shipped gateway policy, public result leak guards, and no cache/prompt/provider/model side effects. Slice 6B.3c-1 is complete at `8a663d3f`: pure internal dispatch-frame contract, direct-text exact pass-through, unresolved direct-URL fail-closed behavior, ACS frame requirements for resolved text plus canonical V2 hashes, and static guards against prompt/model/cache/provider/V1 imports. Slice 6B.3c-2B is complete at `6a9d7143`: inert dispatch-readiness contract and static guards for protected product paths. Keep prompt text and runtime model execution as separate sub-slices. File seeding, prompt/model/cache approval flips, executable gateway status, runtime LLM calls, dispatch-capable orchestrator wiring, public/API/UI/report changes, live jobs, and V1 analyzer imports remain forbidden without separate approval.
- Next Claim Understanding dispatch gate: 6B.3c-4A is implemented after explicit Captain approval as an internal direct-text runtime wiring scaffold under `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1`. `runtime-stage.ts` is the only product-stage bridge to `runtime-dispatch.ts`; `orchestrator.ts` awaits the internal state and `pipeline-shell.ts` can pass scaffold options for controlled tests. Normal shell calls remain damaged/pre-cutover, V1 remains default, and public API/UI/report/export schemas remain unchanged. Direct text can execute only with explicit scaffold enablement plus an injected provider boundary; missing provider boundary, direct URL, and ACS/prepared input fail or defer before prompt/cache/adapter/provider work. Boundary guards now also forbid production callers outside the approved owner files from referencing the scaffold option keys, so the executable override remains confined to tests/controlled harnesses until a later reviewed provider-boundary gate.
- Slice 6B.3c-4B is a provider-boundary ownership contract slice, not provider wiring, under `V2-RUNTIME-GATE-CHECKLIST-2026-05-14.1`. It adds an inert contract under `apps/web/src/lib/analyzer-v2-runtime/` plus tests/guards so the future product-owned provider callback factory can be reviewed. Real factory construction remains blocked until a later source-wiring gate resolves the executable approval source, V2 config snapshot ownership, SDK import location, direct-text-only runtime entry, rollback/failure behavior, and live-job smoke plan.
- Slice 6B.3c-4C is a docs-only provider source-wiring approval package at `ad01740f`. Deputy review approved only 4C1 approval-authority cleanup after tightening the source envelope. Slice 6B.3c-4C1 is complete at `0aa31d4`: product/orchestrator callers can no longer pass scaffold provider options, `runtime-dispatch.ts` no longer creates a private executable gateway-task clone, and runtime execution fails closed unless the real shipped gateway task is executable through approved prompt/model/cache policy. Provider factory implementation, provider SDK imports, public exposure, cache IO, ACS/direct URL execution, live jobs, approval/status flips, prompt/config changes, and V1 cleanup remain blocked until separate approval.
- Slice 6B.3c-4C2 is the provider factory approval track at `Docs/WIP/2026-05-14_V2_Slice_6B3c4C2_Provider_Factory_Approval_Package.md`. 4C2a is complete as an inert provider runtime config/provenance contract under `apps/web/src/lib/analyzer-v2-runtime/`; it adds no SDK import, callback creation, product wiring, cache IO, approval flips, live jobs, ACS/direct URL execution, or public exposure. 4C2b-0 is complete as a contract/docs addendum: it defines `factory_only_not_product_wired`, exact factory path, exact SDK specifiers (`ai`, `@ai-sdk/anthropic`), supplied-validated-snapshot-only factory authority, sanitized provider failure mapping, and telemetry ownership. 4C2b source is complete at `7f6f310a`: the only approved provider SDK imports are in `apps/web/src/lib/analyzer-v2-runtime/claim-understanding-provider-factory.ts`; the factory accepts only a validated factory-only runtime config snapshot and returns an injected model-adapter provider callback. It remains not product-wired and must not read config/cache storage, mutate approvals, construct executable gateway state, expose public output, execute ACS/direct URL paths, run live jobs, or reuse V1 analyzer/prompt/provider helpers. 4C3 is the next product wiring/live-smoke gate.
- Slice 6B.3c-4C3 starts as the product activation package at `Docs/WIP/2026-05-15_V2_Slice_6B3c4C3_Product_Activation_Approval_Package.md`. Deputy review approved only 4C3a as an inert activation-authority/hidden-artifact contract slice, limited to `claim-understanding-runtime-activation.contract.ts`, its focused test, boundary guards, docs, and handoff updates. 4C3a is complete as contract-only source: it records product-owned activation snapshot requirements, run-context freeze authority, approval/config/rollback traceability, hidden-artifact non-public inspectability, fail-closed kill-switch behavior, direct-text-only scope, and unchanged public surfaces. 4C3b is complete after Captain confirmation under `Docs/WIP/2026-05-15_V2_Slice_6B3c4C3b_Hidden_Direct_Text_Wiring_Approval_Package.md`: hidden direct-text activation is source-wired through a product-owned activation snapshot, executable gateway construction is confined to `claim-understanding-runtime-activation.ts`, the default kill switch remains closed, hidden artifacts go only to the V2-owned `v2_observability_ledger`, and public API/UI/report/export/compatibility surfaces remain unchanged. The P1 reachability fix makes the hidden runtime operator-openable only when the stored variant is `claimboundary-v2`, the V2 shell gate is enabled, and `FH_ANALYZER_V2_CLAIM_UNDERSTANDING_RUNTIME=enabled_hidden_direct_text`; this env value is a kill-switch selector only, not approval/model/provider/config authority, and is confined to `execution-selection.ts`. Existing job events/history are not a safe hidden artifact sink. 4C3c first live smoke passed on `efb1f33f` with job `7b56c24a79ee4ab390cc3a6d5aed8986`, proving inspectable hidden artifact capture without public leakage.
- Slice 6B.3c-4C4 is implemented at `91ba03c0` from `Docs/WIP/2026-05-15_V2_Slice_6B3c4C4_Claim_Understanding_Handoff_Gate.md`. `ClaimUnderstandingStageHandoff` now types the internal `ClaimUnderstandingResult -> ClaimContract -> stage handoff` boundary; accepted states preserve `ClaimContract` internally, blocked/damaged states never fabricate it, and Evidence Lifecycle remains `blocked_precutover` for all handoff statuses until a later gate. Cache IO, public exposure, ACS/direct URL execution, broader live-job expansion, approval flips in shipped policy, prompt/config changes, broad product activation, and V1 cleanup remain blocked unless a later reviewed gate explicitly allows them.
- Slice 6B.3c-4C5 is the hidden diagnostic artifact enrichment gate at `Docs/WIP/2026-05-15_V2_Slice_6B3c4C5_Hidden_Diagnostic_Artifact_Gate.md`. It may only preserve bounded adapter attempt diagnostics in the internal `v2_observability_ledger` hidden artifact so the `claim_contract_validation_failed` smoke result can be diagnosed. It must not expose diagnostics through public result/report/UI/export/compatibility paths, must not store raw provider output or rendered prompts, and must not change prompt/config/model/schema behavior.
- Slice 6B.3c-4C6 is implemented at `57dc2308` from `Docs/WIP/2026-05-15_V2_Slice_6B3c4C6_Output_Coercion_And_Accepted_Contract_Smoke.md`. The model adapter now accepts direct JSON or exactly one whole-response Markdown JSON fence before unchanged Zod validation; prose-wrapped JSON, multiple fences, and malformed fenced JSON remain parse failures. Post-fix hidden smokes proved both no-repeat-parse-failure behavior (`df29d295c4cc47cda021c9e57f559a50`) and an accepted internal Claim Understanding contract (`591d39d68c3e4483bc6bd353ba21071a`) without public leakage. `Plastic recycling is pointless` still produced `blocked/no_valid_claim`; treat that as a later Claim Understanding policy-quality review, not as parser evidence.
- Slice 7A is implemented at `08c7ddae` from `Docs/WIP/2026-05-15_V2_Slice_7A_Evidence_Lifecycle_Intake_Contract.md`. `buildEvidenceLifecycleIntake(...)` is contract-only: it consumes only accepted internal `ClaimUnderstandingStageHandoff` state with a non-null `ClaimContract`, produces an internal `EvidenceLifecycleIntake` carrying the exact `ClaimContract`, and fails closed for blocked/damaged/malformed handoffs. No orchestrator wiring, provider/search/fetch work, prompt/model/schema/UCM changes, cache IO, public exposure, ACS/direct URL execution, approval flips, or V1 cleanup were added. The next Evidence Lifecycle gate is a reviewed source-acquisition/task-policy contract package before source work.

UCM/model policy:

- Existing UCM storage remains the foundation; do not redesign the database first.
- Do not keep expanding the broad V1 `pipeline.default.json` shape as the long-term home for V2 prompt/model/task policy.
- Minimal UCM for 6B.2 is complete: V2 prompt-profile validation/import support, a reviewable clean-room `claimboundary-v2` prompt source, and blocked model-policy metadata for `claim_understanding_gate1`.
- Broader task-oriented analysis-profile/admin-gate work remains a later track before broad V2 prompt/model execution and cutover.
- Admin UI changes should start read-only/task-oriented, then add edit/activation flows only after the V2 task-policy model stabilizes.

Report generation:

- Report-generation changes need versioned profile/provenance, stored-packet replay where valid, candidate-vs-approved comparison, rollback-ready defaults, and deputy signoff for accepted tradeoffs.

UI/session behavior:

- V2 product UX is one Analysis Session.
- Mode is visible before submission; Unattended is default; Attended and Deep review are explicit modes.
- Server-side mode/cap enforcement is authoritative.
- Do not create a persisted job before finalized focus selection.

V1 cleanup:

- V1 remains temporarily until V2 cutover and stabilization.
- After V2 owns and verifies an equivalent contract, V1 code/prompts/types become removal debt.
- Historical report readability is through stored data, fixtures, and adapters, not a retained V1 analysis path.

## Verification Expectations

For implementation slices, choose the narrowest verifier that proves the contract:

- `npm -w apps/web run test -- test/unit/lib/analyzer-v2/boundary-guard.test.ts`
- focused Analyzer V2 unit/contract tests for touched files
- `npm -w apps/web run build` when TypeScript, schema, adapter, or public result surfaces change
- `git diff --check`

Do not run expensive/live validation unless the approved validation gate requires it. Commit first and refresh runtime/prompt/config state before live jobs.

## Handoff

Follow the repository handoff protocol. Use `Docs/AGENTS/Agent_Outputs.md` or a handoff file for standard/significant V2 work, especially when a gate remains blocked or a future implementer must know a decision.
