# V2 Pipeline Implementation Guardrails

**Purpose:** This is the canonical short reference for agents implementing the FactHarbor V2 pipeline. It summarizes the non-negotiable decisions from the V2 target specification and points implementers to the authoritative details.

Authoritative specification:

- `Docs/WIP/2026-05-12_Pipeline_Rebuild_Target_Specification_Draft.md`
- `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/AKEL Pipeline V2/WebHome.xwiki`
- `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/AKEL Pipeline Detail V2/WebHome.xwiki`

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
- Slice 6B uses the review package in `Docs/WIP/2026-05-14_V2_Slice_6B_Prompt_Model_Review_Package.md`; deputy review returned `MODIFY`. Slice 6B.1a is complete at `24f55d4a`: `ClaimUnderstandingResult` is the gateway output envelope and accepted results carry `ClaimContract`. Slice 6B.1b is complete at `2f1b60a4`: `claimboundary-v2` is manageable but not file-seeded, and `claim_understanding_gate1` has blocked model-policy metadata. Keep prompt text and runtime model execution as separate sub-slices. Slice 6B.2 requires updated LLM Expert review and explicit Captain prompt-text approval before adding `V2_CLAIM_UNDERSTANDING_GATE1`.

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
