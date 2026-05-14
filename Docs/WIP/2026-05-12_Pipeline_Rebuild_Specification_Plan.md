# Pipeline Rebuild Specification Plan - Plan V2 Baseline

**Date:** 2026-05-12
**Status:** Revised draft after Claude/Gemini review and consolidation debate
**Owner role:** Lead Architect
**Workspace:** `C:\DEV\FactHarbor`
**Git branch:** `main`
**Base commit:** `92b5a5f3`
**V1 baseline tag:** `v1-before-v2-pipeline-specification`

---

## 0. Execution Status Addendum - 2026-05-13

This plan has advanced beyond the specification-only phase. Keep this document as the original Plan V2 Baseline and use the target specification as the operative implementation reference:

- Operative target spec: `Docs/WIP/2026-05-12_Pipeline_Rebuild_Target_Specification_Draft.md`
- Deputy review consolidation: `Docs/WIP/2026-05-12_Pipeline_Rebuild_Target_Specification_Review_Consolidation.md`
- Current worktree status before this addendum: stable at `085b714e` (`docs: record xwiki integration debate`)

Execution state:

| Phase / slice | Status | Notes |
|---|---|---|
| Phase 0 | complete | Plan V2 Baseline approved by Captain Deputy team |
| Phase 1 | complete | Governing context loaded; xWiki treated as design intent, not source truth |
| Phase 2 | complete | Reverse-engineered current-state baselines and mechanism registry produced |
| Phase 3 | complete | Complexity/mechanism diagnosis produced |
| Phase 4 | complete | Target architecture drafted, reviewed, and deputy-approved |
| Phase 5 | complete | Implementation approval granted for slice-based isolated rebuild |
| Phase 6 / Slices 1-6A | stable | V2 contracts, compatibility readers, disabled shell, damaged envelope, gateway governance, and Claim Understanding contracts are committed |
| Phase 6 / Slice 6A.5 | complete | Committed at `724dd9aa`: full ACS ingress, shell-placeholder isolation, claim-understanding cache-policy alignment, and 6B schema alignment tests completed without prompt/model execution |
| Phase 6 / Slice 6B.0 | modify | Prompt/model review package prepared at `Docs/WIP/2026-05-14_V2_Slice_6B_Prompt_Model_Review_Package.md`; deputy reviews require result-envelope contract and UCM/profile/model-policy plumbing before prompt text |
| Phase 6 / Slice 6B.1a | complete | Committed at `24f55d4a`: `ClaimUnderstandingResult` envelope prevents failed/no-claim/direct-input states from corrupting `ClaimContract` |
| Phase 6 / Slice 6B.1b | complete | Committed at `2f1b60a4`: `claimboundary-v2` prompt-profile/frontmatter support and blocked task-oriented model policy metadata for `claim_understanding_gate1` |
| Phase 6 / Slice 6B.2 | Captain approval required next | Updated Claude Opus LLM Expert review approved requesting Captain prompt-text approval; prompt draft and contract tests may start only after explicit Captain approval |
| Phase 6 / Slice 6B | blocked | Prompt/profile/model execution for V2 Claim Understanding requires explicit Captain approval and LLM Expert review |

Plan update from xWiki integration debate:

- The `.xwiki` architecture set was reviewed after source reverse-engineering.
- Debate verdict was `MODIFY`: no broad rewrite and no stage-contract mutation, but add a compact Design Intent Mapping table and reader-level diagrams.
- That mapping now lives in Section 1.2 of the target spec. It is the guardrail for future xWiki-derived ideas.
- Source reverse-engineering and V2 contract tests remain authoritative for implementation.

Live jobs used so far: 0. Approved live-job budget remaining: 8.

Next action, unless Captain redirects: request explicit Captain prompt-text approval for Slice 6B.2 prompt draft and contract tests under the conditions recorded in `Docs/WIP/2026-05-14_V2_Slice_6B_Prompt_Model_Review_Package.md`. Updated LLM Expert review is complete and approved the request. Do not edit prompt text, create prompt source files, activate executable prompt profiles, or add runtime LLM-backed Claim Understanding until Captain approval is recorded.

Readiness note from 2026-05-14: no further architecture-wide redesign is required before continuing implementation. Final review by Gemini, Claude Opus, and two deputies kept Slices 1-6A and rejected redo/quarantine. Slice 6A.5 contract/wiring hardening is complete at `724dd9aa`; Slice 6B.0 prompt/model review returned `MODIFY`; executable Slice 6B remains blocked by explicit prompt/model execution approval plus LLM Expert review. Exact mode caps and forced-review thresholds can be resolved as implementation-slice decisions under deputy review unless they become high risk or contested.

Main/UCM alignment note from 2026-05-14:

- Current implementation continues in workspace `C:\DEV\FactHarbor` on Git branch `main`.
- V1-before-V2-specification comparison anchor is tag `v1-before-v2-pipeline-specification` at `92b5a5f3`; create a comparison branch from that tag only when a concrete V1/V2 comparison task requires it.
- Slice 6B.1b completed only minimal non-executable UCM/profile/model-policy plumbing: `claimboundary-v2` is a manageable prompt profile, and `claim_understanding_gate1` has blocked task-oriented model-policy metadata.
- Broader UCM redesign is not a prerequisite for 6B.2 prompt drafting. It remains a later task-oriented analysis-profile/admin-gate track: keep existing UCM storage, avoid growing V2 policy into the broad V1 `pipeline.default.json` shape as the long-term home, and add task-oriented Admin UI/approval-state visibility only after the V2 content model stabilizes.
- No prompt text, prompt source file, prompt activation, model execution, or broad UCM UI work starts before the documented Captain approval gate. Updated LLM Expert review has approved asking for that gate; it has not approved final prompt text or 6B.3 execution.

---

## 1. Purpose

Prepare FactHarbor for replacing the current ClaimAssessmentBoundary analysis pipeline by first producing a clean, reviewable specification. The specification must be reverse-engineered from the current implementation, then cleaned, simplified, re-architected, and redesigned before implementation starts.

The goal is not a smaller pipeline at any cost. The target is a pipeline that is clearly less complex than the current one while preserving FactHarbor's analysis guarantees: input neutrality, multilingual robustness, evidence transparency, mandatory quality gates, warning materiality, report integrity, and LLM-powered semantic judgment.

Captain quality rationale: the current pipeline is not accepted as the quality baseline to preserve. It is judged insufficiently stable and below the required report-quality bar, with no acceptable progress since the last deployment and little meaningful progress after the early ClaimAssessmentBoundary creation period. The rebuild must therefore avoid carrying V1 code, prompts, or mechanisms forward by default.

## 2. Captain Intent

Captain's intent is to replace the current analysis pipeline with a new pipeline, not to keep extending the existing one.

The new pipeline should be materially easier to understand, maintain, test, and evolve than the current implementation. It should be based on a clean architecture with explicit stage responsibilities, stable contracts, and clear ownership of LLM tasks, configuration, evidence lifecycle, warnings, and report outputs.

This is not a request for maximum simplification. The new design must remain strong enough for FactHarbor's quality bar: generic topic handling, multilingual robustness, input neutrality, evidence transparency, mandatory quality gates, and LLM-powered semantic judgment. The goal is a well-balanced architecture: clearly less complicated than today, but not naive or under-specified.

Cost and latency targets are quality-constrained. Normal V2 analyses should target 6-10 minutes active runtime and $0.50-$1.25 cost; complex analyses should target 10-18 minutes and $1.25-$3.25. These targets must never justify weaker evidence, hidden budget exits, downgraded warning honesty, deterministic semantic shortcuts, or V1 prompt/code reuse. Any over-budget run requires an explicit quality-protection reason and deputy/Captain review at the documented threshold.

Retries and repairs should be prevented by design. V2 should use contract-first prompts, structural preflight validation, stable IDs, valid uncertainty states, sufficiency-before-verdict gating, and the right model/evidence packet on the first attempt. Bounded provider/schema retries remain allowed as structural resilience, but hidden semantic repair and repeated "try again for a better answer" loops are not acceptable quality mechanisms.

The UI should remain unchanged unless the specification identifies a concrete product, trust, or compatibility reason for changing it. The V2 Analysis Session flow is now such an approved reason: the current Atomic Claim preparation, claim selection, and analysis execution split remains an internal lifecycle, but users should experience one continuous session with a visible mode choice before submission.

For now, the default mode is Unattended for normal users. It selects a small recommended analysis focus and continues automatically when safe. Attended mode is for advanced users who want to review/select a broader focus before execution. Deep review remains admin/internal or explicitly approved. Future logged-in access control may restrict modes, but until then the mode selector is visible before each submission and server-side mode/cap enforcement is authoritative.

The work must start from a clean specification, reverse-engineered from the current pipeline and then deliberately cleaned, re-architected, and redesigned. Only after that specification is reviewed and approved should implementation begin.

"Rebuild from scratch" means the analyzer pipeline design and implementation are replaceable. It does not mean blindly deleting stable external contracts. UI expectations, job APIs, persisted report compatibility, report JSON shape, event semantics, warning semantics, and structural plumbing may be retained only where the approved specification explicitly says they remain part of the target architecture.

## 3. Review Consolidation Result

Specialized Claude role reviews and a Gemini adversarial review all requested changes. The consolidation debate result was **MODIFY**:

- Keep Captain Intent, the worktree, reverse-engineer-first sequencing, no implementation before approval, UI stability, and the clean-architecture goal.
- Do not treat the first draft as a small patch-list plan. The plan must be a Plan V2 Baseline with hard gates before Phase 1 starts.
- Reject any interpretation of "cleanup before rebuild" that breaks the current runnable system before a replacement path is proven.

## 4. Non-Negotiable Constraints

- Current implementation workspace: `C:\DEV\FactHarbor`. Current Git branch: `main`. The previous main-state workspace is preserved separately at `C:\DEV\FactHarbor-main-before-v2-rehome`.
- No source-code implementation starts until the specification is finished and approved.
- UI does not change unless the approved specification identifies a concrete product, trust, or compatibility reason.
- Stable external contracts are locked by default: job API shape, public report JSON, persisted report rendering, event semantics, warning semantics, and historical-job behavior.
- The target pipeline must preserve the analytical flow: Understand -> Research -> Boundary formation -> Verdict -> Aggregation/report. Stage boundaries may be redesigned, but Understand, Research, and Verdict must not be skipped.
- Gate 1 claim validation and Gate 4 confidence remain mandatory. The baseline spec must define their current inputs, outputs, pass/fail contracts, and test coverage.
- Semantic text decisions must use LLM intelligence, not deterministic keyword, regex, similarity, or language-specific rules.
- Analysis-affecting strings belong in UCM-managed prompts or provider-facing search query construction, not inline code.
- The design must be generic by topic and robust beyond English.
- New or changed prompts require explicit human approval and LLM Expert review.
- Live jobs or expensive validation are out of scope for the specification phase unless Captain explicitly approves them.
- A hot-path mechanism may not be removed until the approved spec names its current purpose, replacement boundary, verifier, and removal condition.

## 5. Phase 0 Baseline Gates

Phase 0 exists to make the plan safe before reverse-engineering starts. Phase 1 cannot begin until these gates are accepted by Captain or by the Captain Deputy team under Gate 0.6.

### Gate 0.1 - Source Inventory Completeness

The plan must inventory, not hand-pick, the implementation surfaces to reverse-engineer.

Required inventory scope:
- Every file under `apps/web/src/lib/analyzer/`, including prompt/model/config/warning/report helpers such as `verdict-stage.ts`, `quality-gates.ts`, `grounding-check.ts`, `confidence-calibration.ts`, `model-resolver.ts`, `model-tiering.ts`, `prompt-loader.ts`, `prompts/prompt-builder.ts`, `budgets.ts`, `metrics.ts`, `evidence-normalization.ts`, `evidence-deduplication.ts`, `warning-display.ts`, and related helpers.
- `apps/web/prompts/claimboundary.prompt.md`. Because this prompt file is over 100KB, follow the AGENTS.md large-file exception: map section headers first, then read only relevant sections plus surrounding context.
- `apps/web/configs/*.default.json`, config schemas, UCM storage, and runtime config loading.
- Search/acquisition surfaces including `apps/web/src/lib/web-search.ts`.
- Job runner and persistence surfaces including `apps/web/src/lib/internal-runner-queue.ts`, `apps/web/src/app/api/internal/run-job/route.ts`, `apps/api/Services/JobService.cs`, and `apps/api/Services/RunnerClient.cs`.
- Claim-selection and prepared-stage surfaces, including ACS UI state, draft services, and draft persistence. Phase 2 must inventory these surfaces even if Phase 3 later decides they are only conditionally retained.
- Report rendering/export surfaces if result shape, warning semantics, or persisted reports are affected.
- Relevant unit, integration, prompt-contract, config-drift, and report-quality tests.
- Generated indexes are discoverability aids, not source truth; rebuild them after handoff/spec changes.

Exit condition: the reverse-engineering plan records every included surface and any intentionally excluded surface with a reason.

### Gate 0.2 - External Contract Lock

Before Phase 1, the plan must state the default compatibility posture:

- Public report JSON shape remains V1-compatible unless Captain explicitly approves a versioned shape.
- Existing persisted job reports must remain renderable unless Captain explicitly approves migration or archival behavior.
- UI routes and user workflows remain unchanged unless the approved specification identifies a product, trust, or compatibility need.
- Warning types, display severity, event semantics, report integrity fields, and citation integrity behavior must be preserved or explicitly replaced with reviewed equivalents.

Exit condition: any proposed exception is listed as an open Captain or Captain Deputy decision before implementation. LLM Expert must review semantic equivalence for warning/event/report-integrity replacements; Code Reviewer must review JSON-shape and rendering compatibility.

### Gate 0.3 - Prompt, Config, and Model Baseline

The baseline specification must capture:

- Current prompt sections, prompt keys, prompt content hashes where available, and the semantic decision each prompt performs.
- Structured-output schemas per LLM task, including field names, field semantics, types, required/optional status, and normalization/default behavior.
- UCM config keys, defaults, JSON authoritative defaults, schema definitions, and any migration risk for renamed or removed keys.
- Model task routing, `getModelForTask` / model resolver behavior, provider options, retry/repair behavior, structured-output failure handling, and LLM outage behavior.
- Prompt caching posture, including which content is static/cacheable vs. dynamic per task and any cache-key or prefix assumptions that affect cost.
- Current multilingual handling mechanisms: language detection, query localization, report-language behavior, source-language preservation, and any language-conditional prompt/config branches.
- Existing deterministic semantic hotspots that must be replaced rather than extended.

Exit condition: LLM Expert confirms the planned baseline is sufficient to judge semantic drift and prompt governance later.

### Gate 0.4 - Quality and Regression Baseline

The implementation readiness plan must define quality verification before any rebuild cutover:

- Captain comparator reports from `Docs/AGENTS/Captain_Quality_Expectations.md`.
- Accepted bands and observations from `Docs/AGENTS/benchmark-expectations.json`.
- Q-code structural checks from `Docs/AGENTS/report-quality-expectations.json`.
- Multilingual and input-neutrality scenarios using only Captain-defined analysis inputs.
- Prompt/semantic drift checks appropriate for the changed surfaces.
- Cost and latency comparison against the baseline commit.
- Current cost and latency profile captured during reverse-engineering by task class where available, so later comparison is against a named baseline rather than memory.

No live jobs are run in this planning phase unless Captain explicitly approves them. The plan only defines the later verification surface.

Phase 0 exit condition: the verification surface is defined and the Captain Deputy team confirms it is sufficient. Phase 6 cannot be considered complete without executing the approved quality/regression checks or recording Captain-approved residual risk.

### Gate 0.5 - Runnable-System Strategy

The approved implementation strategy must avoid a broken intermediate system.

Default strategy:
- Build the replacement as a gated pre-cutover V2 path or equivalent isolated path behind a controlled entry point.
- Keep the current hot path runnable until V2 satisfies the approved structural, quality, compatibility, and report-integrity gates.
- Delete or quarantine obsolete current-pipeline mechanisms only after the replacement boundary and verifier are proven.

"Cleanup before rebuild" applies to dead, obsolete, duplicated, or superseded mechanisms outside the active hot path first. It does not authorize deleting risk-bearing hot-path behavior before a replacement passes verification.

Phase 0 consent: gated pre-cutover V2 or equivalent isolation is the approved default; no hot-path removal is allowed before the replacement verifier passes. Exit condition: Captain or the Captain Deputy team confirms the exact runnable-system strategy before implementation cleanup begins, unless Gate 0.6 requires escalation to Captain.

### Gate 0.6 - Review and Tie-Breaking

- Review outputs live in `Docs/WIP/` during specification. Approved architecture may later be promoted to xWiki.
- Reverse-engineered baseline and target architecture are reviewed separately.
- The Captain Deputy team may decide and approve normal decision gates on Captain's behalf.
- The default deputy team is: Lead Architect, LLM Expert, Senior Developer, Code Reviewer, and Gemini Challenger. Use a smaller quorum only for narrow decisions where the missing role is not materially affected.
- Deputy consent requires no unresolved blocker and no unresolved high-risk item. If the team disagrees, run a short structured debate and use the reconciled verdict only if the team reaches consent.
- Escalate to Captain only when risk is high, the deputy team cannot reach consent, or a decision would materially change product behavior, UI/API/report compatibility, persisted data behavior, validation spend, production/secrets/security posture, or the approved Captain Intent.
- If maintainability conflicts with analysis quality, quality wins.
- If compatibility conflicts with cleanup, preserve compatibility unless Captain approves the break.

## 6. Work Products

The specification phase must produce:

1. **Current Pipeline Baseline Specification**
   - Factual reverse-engineering of current behavior.
   - Stage-by-stage and cross-cutting contracts.
   - Explicit traceability to code, tests, current docs, or named handoffs.

2. **Prompt/Config/Model Baseline**
   - Prompt task surfaces, structured-output schemas, UCM keys, model routing, caching, retries, repairs, failure modes, multilingual handling, and semantic decision surfaces.

3. **External Compatibility Baseline**
   - UI expectations, public result JSON, persisted report behavior, job API, events, warnings, report integrity, historical-job rendering.

4. **Complexity and Debt Assessment**
   - Essential, accidental, stale, and risk-bearing complexity.
   - For every risk-bearing mechanism: current purpose, replacement candidate, verifier, and removal condition.

5. **Target Pipeline Architecture Specification**
   - Stage boundaries, orchestration model, contracts, LLM task surfaces, evidence lifecycle, boundary formation, verdict/aggregation, observability, warning/report policy, UCM/config ownership, cost posture, and test strategy.
   - Mermaid diagrams for flow, data contracts, and cutover/error paths.

6. **Implementation Readiness Plan**
   - Slice order, runnable-system strategy, per-slice verification, quality/regression checks, approval gates, and stop conditions.
   - Prompt approval governance trail for every new or changed prompt, including reviewer and approval state.

## 7. Phase Plan

### Phase 0 - Plan V2 Baseline Review

**Goal:** Approve this revised plan before reverse-engineering starts.

**Exit criteria**
- Captain or the Captain Deputy team approves or amends Gates 0.1 through 0.6.
- Claude Lead Architect or Senior Developer reviews source inventory, external contracts, and cutover safety.
- Claude LLM Expert reviews prompt/config/model baseline and semantic drift gates.
- Gemini participates as independent Challenger focused on broken-intermediate risk, over-preserved legacy complexity, missing contracts, and additive-refactoring drift.

### Phase 1 - Load Governing Context Without Design Anchoring

**Goal:** Establish constraints before observing implementation.

**Read first**
- `AGENTS.md`
- `Docs/AGENTS/Roles/Lead_Architect.md`
- `Docs/AGENTS/Role_Learnings.md`
- `Docs/STATUS/Current_Status.md`
- `Docs/AGENTS/Captain_Quality_Expectations.md`
- `Docs/AGENTS/benchmark-expectations.json`
- `Docs/AGENTS/report-quality-expectations.json`
- Relevant recent handoffs from `fhAgentKnowledge.preflight_task`

Current xWiki architecture docs are reference material, not factual source of implementation behavior. Read them after the initial code inventory and label every doc-derived claim as intended design unless verified against source.

### Phase 2 - Reverse-Engineer Current Pipeline

**Goal:** Produce the factual baseline specification from implementation.

**Required outputs**
- Current stage sequence and orchestration, including claim extraction, research, boundary clustering, verdict generation, aggregation, report construction, warnings, and quality gates.
- Gate 1 and Gate 4 current contracts.
- Input/output contracts per stage and cross-stage state ownership.
- LLM calls, prompts, structured-output schemas, semantic tasks, model tiers, caching, retries, repairs, and failure behavior.
- Prevention-first recovery taxonomy: what is prevented by preflight contracts, what can be retried structurally, what returns insufficiency/caveat/damaged state, and what hidden semantic repair is forbidden.
- Multilingual handling mechanisms and input-neutrality mechanisms.
- Evidence lifecycle: acquisition, extraction, filtering, deduplication, normalization, provenance, source reliability, warning/report integrity.
- UCM/config dependencies and migration surfaces.
- Public and persisted output contracts.
- Test coverage map and gaps.
- Hot-path mechanism registry naming each protective mechanism, current purpose, downstream dependency, replacement candidate placeholder, verifier, and removal condition placeholder.
- Current cost/latency profile by task class where available.
- Target cost/latency envelope and quality floor: simple, normal, complex, and deep-review exception classes; per-stage call/token/time budgets; instrumentation fields; review thresholds.
- Known drift between code and docs.

**Exit criteria**
- A reviewer can understand the current pipeline without reading implementation code.
- Every factual claim is traceable.
- Claude Senior Developer reviews factual completeness.
- LLM Expert reviews prompt/model/config completeness.

### Phase 3 - Complexity and Maintainability Diagnosis

**Goal:** Decide what should be preserved, simplified, removed, replaced, or redesigned.

**Classification buckets**
- Essential complexity: required for analytical quality, transparency, safety, compatibility, or product contract.
- Accidental complexity: repeated paths, compatibility remnants, unclear ownership, or redundant mechanisms.
- Stale complexity: historical code/docs from removed or superseded designs.
- Risk-bearing complexity: mechanisms that are hard to maintain but currently protect quality, compatibility, or trust.

**Exit criteria**
- Every major simplification proposal has a quality-risk assessment.
- No mechanism is removed solely because it is large or hard to read.
- Risk-bearing mechanisms have replacement/verifier/removal-condition records.
- Test gaps for risk-bearing or hot-path mechanisms are carried forward as architecture risks, not hidden as implementation details.

### Phase 4 - Design Target Architecture

**Goal:** Define the new pipeline architecture before implementation.

**Design dimensions**
- Clean stage model and orchestration boundaries.
- Stable domain contracts and schema ownership.
- LLM task boundaries, prompt ownership, model routing, caching, cost/token budget, failure behavior, and semantic-decision compliance.
- Research/evidence lifecycle and provenance.
- ClaimAssessmentBoundary formation contract.
- Verdict generation and aggregation contract.
- Warning materiality, citation integrity, report integrity, and historical report compatibility.
- Config/UCM placement and migration.
- Observability, replay/debuggability, and metrics.
- Test strategy, benchmark strategy, multilingual/input-neutrality strategy, and semantic drift gate.
- Runnable-system and cutover strategy.
- UI compatibility boundary.
- Objective complexity-reduction criteria, such as fewer stage ownership seams, reduced duplicated mechanisms, clearer contracts, fewer unowned transformations, or lower measured code/config/prompt coupling.

**Exit criteria**
- Architecture is simpler than current state for named, reviewable reasons.
- External compatibility posture is explicit.
- Quality gates and evidence transparency are preserved.
- Tradeoffs and rejected alternatives are explicit.
- Gemini challenges architecture assumptions before Captain or Captain Deputy approval.

### Phase 5 - Review Gate Before Implementation

**Goal:** Review the complete specification package before any rebuild begins.

**Required review lenses**
- Lead Architect: architecture balance, maintainability, stage contracts.
- LLM Expert: prompt/LLM task boundaries, genericity, multilingual robustness, semantic-decision compliance.
- Senior Developer: implementation feasibility, migration order, test strategy, blast radius.
- Code Reviewer: regression risks, hidden coupling, missing tests, warning/report integrity.
- Gemini Challenger: broken-intermediate risk, over-preserved legacy complexity, missing contracts, additive-refactoring drift.
- Captain: product fit, quality bar, implementation approval.

**Exit criteria**
- Captain or the Captain Deputy team approves the target architecture or requests revisions.
- Open decisions are resolved or explicitly deferred with owner and gate.
- Implementation slices, verification, and stop conditions are approved.

### Phase 6 - Isolated Rebuild, Verified Cutover, Then Cleanup

**Goal:** Replace the current pipeline without a broken intermediate state.

**Execution rule**
- Build V2 in a gated pre-cutover path or equivalent isolated structure behind a controlled entry point.
- Keep V1 hot path runnable until V2 passes approved structural, quality, compatibility, warning/report, and performance gates.
- Remove dead/stale/non-hot-path mechanisms first where safe.
- Remove risk-bearing V1 hot-path mechanisms only after their replacement has passed the named verifier.
- If focused validation fails, classify the prior attempt as `keep`, `quarantine`, or `revert`; quarantine requires a removal owner and expiration condition.

**Per-slice verification**
- Relevant unit/prompt/config tests pass.
- New tests cover new contracts before the next slice starts.
- Build passes when touched surfaces require it.
- Warning/report/API compatibility checks pass for affected surfaces.
- Quality/regression checks run only at approved gates, with commit-first and runtime-refresh discipline.

**Final exit criteria**
- V2 replaces V1 without UI regression unless an approved UI change exists.
- Approved V2 UI change is implemented without exposing internal pipeline mechanics: one Analysis Session flow, visible pre-submission mode selection, Unattended default, Attended review path, forced-review safeguards, selection-only focus changes, and report focus provenance.
- Public report JSON and persisted historical reports remain compatible unless Captain approved a versioned migration.
- Gate 1, Gate 4, evidence transparency, warning materiality, and report integrity are preserved.
- Cost/latency targets are met or over-budget cases are accepted only with a documented quality-protection reason; cheaper/faster runs do not count as improvements if comparator quality, evidence coverage, warning honesty, multilingual/input-neutral behavior, or report clarity regresses.
- Retry and repair rates are low, ledgered, and accepted by deputy review; high rates force contract/prompt/model/evidence-packet/gate improvement before cutover.
- V1 analysis prompt files, prompt profiles, prompt sections, and active UCM prompt entries are removed from runtime selection once V2 owns and verifies the corresponding prompt-backed task.
- Safe tests and build pass.
- Approved quality, multilingual, input-neutrality, semantic drift, cost, and latency checks pass or have Captain-approved residual risk.
- After V1 analysis code is removed, the surviving pipeline owns final clean names; temporary rebuild labels are removed from runtime code by a verified naming-normalization cleanup slice.

## 8. Review Questions

Reviewers should answer these questions before approving Phase 0:

1. Do Gates 0.1 through 0.6 close the blocker findings from Claude and Gemini?
2. Does the plan prevent premature implementation and a broken intermediate system?
3. Is source inventory broad enough for reverse-engineering?
4. Are prompt, config, model, and semantic drift baselines strong enough?
5. Are external compatibility and persisted-report risks locked down?
6. Does the plan protect quality while still forcing simplification?
7. Are Claude/Gemini participation points timed correctly?

## 9. Explicit Non-Goals For This Plan

These were the Phase 0/specification-phase non-goals. Later execution addenda supersede them only where explicitly stated, such as the approved V2 Analysis Session UX direction and the staged UCM track.

- No analyzer code cleanup yet.
- No prompt editing yet.
- No validation jobs yet.
- No benchmark reruns yet.
- No broad UI redesign during the initial specification phase.
- No schema migration proposal until current contracts are reverse-engineered.
- No target architecture chosen before the current pipeline baseline is documented.

## 10. Claude and Gemini Participation Plan

Best timing:

- **Now / Phase 0:** Claude Lead Architect or Senior Developer reviews Plan V2 for inventory, external contracts, and cutover safety. Claude LLM Expert reviews prompt/config/model and semantic drift gates. Gemini acts as independent Challenger for broken-intermediate risk and additive-refactoring drift.
- **After Phase 2:** Claude Senior Developer reviews factual completeness of the reverse-engineered baseline. Claude LLM Expert reviews LLM/prompt/model completeness. Gemini challenges whether the baseline missed hidden coupling or external contracts.
- **After Phase 4:** Run a short Claude/Gemini debate before implementation approval. Claude should argue architecture and LLM quality from role expertise; Gemini should challenge over-complexity, compatibility assumptions, and whether the design still honors replacement rather than layering.
- **During Phase 6 UCM/prompt/model work:** use LLM Expert review before prompt text or model execution, Senior Developer review for UCM/schema/API/admin-surface changes, and Gemini/Challenger only when a UCM decision could increase legacy coupling, create confusing runtime controls, or affect cutover safety.

## 11. Short Reviewer Prompt

Review `Docs/WIP/2026-05-12_Pipeline_Rebuild_Specification_Plan.md` as the Plan V2 Baseline for replacing the current FactHarbor analysis pipeline. Treat Captain's intent as replacement-with-clean-architecture, not additive refactoring. Check whether Gates 0.1 through 0.6 are strong enough to start reverse-engineering without missing source surfaces, breaking external contracts, losing prompt/config/model baselines, weakening analysis quality, or creating a broken intermediate system. Focus on remaining blockers, vague gates, compatibility gaps, and any path that could preserve old complexity under a new name.
