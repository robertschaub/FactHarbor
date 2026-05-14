# V2 Pipeline Implementation Guardrails

**Purpose:** This is the canonical short reference for agents implementing the FactHarbor V2 pipeline. It summarizes the non-negotiable decisions from the V2 target specification and points implementers to the authoritative details.

Authoritative specification:

- `Docs/WIP/2026-05-12_Pipeline_Rebuild_Target_Specification_Draft.md`
- `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/AKEL Pipeline V2/WebHome.xwiki`
- `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/AKEL Pipeline Detail V2/WebHome.xwiki`

Baseline anchors:

- V1-before-V2-specification tag: `v1-before-v2-pipeline-specification` at commit `92b5a5f3`.
- Use this tag when a future comparison branch or V1/V2 archaeology workspace is needed. Do not create or keep a V1 comparison branch until there is a concrete comparison task.

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

## Approval Gates

Prompt/model execution:

- New or changed prompt-backed V2 tasks require Captain approval and LLM Expert review.
- Prompt/model/cache tasks remain blocked until approval is recorded in the gateway policy.
- Slice 6A.5 hardening is complete at `724dd9aa`: full ACS prepared-snapshot ingress, shell-placeholder claim-id isolation, ACS/direct-input cache-policy alignment, and explicit prompt-output-to-`ClaimContract` schema mapping tests. Before Slice 6B Claim Understanding prompt/model execution, verify this guard still passes and record Captain approval plus LLM Expert review.
- Slice 6B uses the review package in `Docs/WIP/2026-05-14_V2_Slice_6B_Prompt_Model_Review_Package.md`; initial deputy review returned `MODIFY`. Slice 6B.1a is complete at `24f55d4a`: `ClaimUnderstandingResult` is the gateway output envelope and accepted results carry `ClaimContract`. Slice 6B.1b is complete at `2f1b60a4`: `claimboundary-v2` is manageable but not file-seeded, and `claim_understanding_gate1` has blocked model-policy metadata. Slice 6B.2 is complete at `8a1ef8cd`: clean-room `claimboundary-v2.prompt.md` with `V2_CLAIM_UNDERSTANDING_GATE1`, contract/static-hygiene tests, and final Claude Opus LLM Expert approval. Slice 6B.3a is complete at `2d14c89a`: explicit V2 prompt loader, production runtime schemas, cache/provenance no-dispatch/no-store decisions, policy eligibility guard, and tests. Slice 6B.3b is complete at `04742922`: V2-owned local adapter under `apps/web/src/lib/analyzer-v2/`, dependency-injected mock dispatch, production schema validation, gateway policy fail-closed, identical structural retry, typed telemetry/provenance, no cache IO, no provider SDK callsite, no product-path imports, no neutral/shared adapter, and no placeholder telemetry. Slice 6B.3c-0 is complete at `3223d99f`: structural no-dispatch Claim Understanding orchestration, raw shell-placeholder rejection, no `resolvedInputSha256` misuse as ACS hash, V2-owned internal runtime stage/state, direct input blocked by shipped gateway policy, public result leak guards, and no cache/prompt/provider/model side effects. Slice 6B.3c-1 is complete at `8a663d3f`: pure internal dispatch-frame contract, direct-text exact pass-through, unresolved direct-URL fail-closed behavior, ACS frame requirements for resolved text plus canonical V2 hashes, and static guards against prompt/model/cache/provider/V1 imports. Slice 6B.3c-2B is complete at `6a9d7143`: inert dispatch-readiness contract and static guards for protected product paths. Keep prompt text and runtime model execution as separate sub-slices. File seeding, prompt/model/cache approval flips, executable gateway status, runtime LLM calls, dispatch-capable orchestrator wiring, public/API/UI/report changes, live jobs, and V1 analyzer imports remain forbidden without separate approval.
- Next Claim Understanding dispatch gate: 6B.3c-4A is implemented after explicit Captain approval as an internal direct-text runtime wiring scaffold. `runtime-stage.ts` is the only product-stage bridge to `runtime-dispatch.ts`; `orchestrator.ts` awaits the internal state and `pipeline-shell.ts` can pass scaffold options for controlled tests. Normal shell calls remain damaged/pre-cutover, V1 remains default, and public API/UI/report/export schemas remain unchanged. Direct text can execute only with explicit scaffold enablement plus an injected provider boundary; missing provider boundary, direct URL, and ACS/prepared input fail or defer before prompt/cache/adapter/provider work. Cache remains runtime no-store only, provider SDK imports remain absent, prompt/config source files were not changed, live jobs were not run, and V1 cleanup remains forbidden until V2 cutover and stabilization. Boundary guards now also forbid production callers outside the approved owner files from referencing the scaffold option keys, so the executable override remains confined to tests/controlled harnesses until a later reviewed provider-boundary gate. Any next step that adds real provider factory ownership, public result exposure, ACS/direct URL execution, cache read/write, approval/status flips, live jobs, or V1 cleanup requires a separate review/approval gate.

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
