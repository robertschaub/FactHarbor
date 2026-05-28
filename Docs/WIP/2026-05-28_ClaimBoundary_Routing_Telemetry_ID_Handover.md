# ClaimBoundary Routing / Telemetry / Evidence-ID Handover

**Status:** Active handover for next agent  
**Created:** 2026-05-28  
**Owner:** open  
**Current agent:** Codex (GPT-5), acting under Lead Architect + LLM Expert constraints  
**Purpose:** Preserve the current state of the model-routing review follow-up, the evidence-ID cleanup, the telemetry/counter work, and the over-engineering cautions so another agent can resume without reconstructing the thread.

## 1. Immediate Context

The Captain asked for a ClaimBoundary pipeline LLM-call/model-routing review, then supplied an adversarial cross-check verdict. That verdict rejected or deferred the proposed model-routing changes and redirected the session toward small infrastructure work and measurement.

The important user-supplied decisions were:

- Do not change default `debateRoles.validation.strength` from `budget` to `standard`.
- Do not upgrade the deep-quality reconciler to premium until profile location, cross-family benchmark, and real token cost are measured.
- Do not globally upgrade `modelUnderstand` or `modelExtractEvidence`.
- Defer adding a dedicated UCM-backed Pass 2 model lane until contract-validation retry rate is measured.
- Ship only contained evidence-ID cleanup and telemetry needed to unblock later decisions.

The Captain also explicitly said not to touch:

- `debateRoles.validation.strength`
- `debateRoles.reconciler.strength`
- `modelOpus`
- `modelExtractEvidence`
- `evidencePartitioningEnabled`
- adding `modelClaimAtomization`

No source edits were made by this Codex handover pass.

## 2. Current Repo State After "There Was A Change Just Now"

The source has changed since the earlier investigation notes. Do not rely on the older observation that main Stage 2 evidence IDs are timestamp-based.

Relevant current commits in `git log`:

- `a446b7cc feat(analyzer): switch evidence IDs to short sequential per-analysis scheme`
- `d29a1621 feat(metrics): add contract-validation and direction-downgrade counters`

Current working tree also has unrelated local modifications that this agent did not make:

- `Docs/AGENTS/Agent_Outputs.md`
- `apps/web/src/lib/internal-runner-queue.ts`
- `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`
- `apps/web/test/unit/lib/drain-runner-pause.integration.test.ts`

Treat those as user/other-agent changes unless Captain says otherwise.

## 3. Evidence-ID Finding And Current Implementation

Earlier finding: `research-extraction-stage.ts` previously minted long timestamp IDs (`EV_${Date.now()}` style), which was the underlying reason the verdict grounding validator needed an `EVG_xxx` alias map.

Current state: the cleanup appears already landed.

Verified current anchors:

- `apps/web/src/lib/analyzer/types.ts:1347` defines `CBResearchState.nextEvidenceId`, a per-analysis monotonic counter.
- `apps/web/src/lib/analyzer/research-orchestrator.ts:1048` uses `state.nextEvidenceId++` for preliminary seeded evidence IDs.
- `apps/web/src/lib/analyzer/research-extraction-stage.ts:377` uses `idScope.nextEvidenceId++` for main research extraction IDs.
- `apps/web/src/lib/analyzer/verdict-stage.ts:1138` still keeps the grounding alias map and now documents it as mostly no-op for `EV_001` style IDs, but defensive for nonconforming/legacy IDs.

Next-agent guidance:

- Do not reimplement the ID cleanup. First verify current HEAD still has the above anchors.
- Keep the `EVG_xxx` alias map for at least one release as a defensive scaffold.
- If a later cleanup removes the alias map, gate that on evidence from production metrics/jobs showing zero long-ID emissions and no external consumers still referencing old IDs.

## 4. Telemetry / Counter State

Original requested counters:

- Counter A: contract-validation retry firing rate at `claim-extraction-stage.ts`.
- Counter B: direction-validation downgrade firing rate and overturn/rescue rate via repair.
- Counter C: OpenAI TPM-guard firing rate in `verdict-generation-stage.ts`.

Current implementation is warning-based, not a new top-level `pipelineTelemetry` object in `metrics.ts`.

Verified current anchors:

- `apps/web/src/lib/analyzer/claim-extraction-stage.ts:435` emits `contract_validation_retry_triggered`.
- `apps/web/src/lib/analyzer/claim-extraction-stage.ts:621` emits `contract_repair_pass_fired`.
- `apps/web/src/lib/analyzer/verdict-stage.ts:1420` emits `verdict_direction_issue`.
- `apps/web/src/lib/analyzer/verdict-stage.ts:1401` and `:1484` emit `direction_rescue_plausible`.
- `apps/web/src/lib/analyzer/types.ts:783-784` registers the new contract warning types.
- `apps/web/src/lib/analyzer/warning-display.ts:72-73` classifies the new contract warnings as informational.
- `apps/web/src/lib/analyzer/verdict-generation-stage.ts:492-494` emits TPM precheck fallback warning via `llm_tpm_guard_fallback`.
- `apps/web/src/lib/analyzer/verdict-generation-stage.ts:586-588` emits TPM retry fallback warning via `llm_tpm_guard_fallback`.

Important nuance:

- `metrics.ts` has no separate `pipelineTelemetry` counters today.
- `metrics-integration.ts` computes `failureModes` from warnings, but informational warnings are not counted as degradation events unless they match fallback/degradation criteria.
- Therefore the current "counters" are primarily in `resultJson.analysisWarnings[]`, not in dedicated metrics fields.

Existing WIP plan:

- `Docs/WIP/2026-05-26_Telemetry_Observation_Plan_First_4_Jobs.md` is the active measurement plan. It defines how to compute Counters A/B/C from warnings and metrics call records.

Next-agent guidance:

- If the Captain only needs the first 4-job observation, continue with the warning-based plan. Do not add a second telemetry system.
- If the Captain explicitly wants cross-job API aggregation, add the smallest possible metrics extension. Prefer a compact top-level aggregate object over per-call `recordLLMCall` fields because these are pipeline control-flow events, not properties of one LLM call.
- Counter C still needs a denominator: total challenger calls from metrics `llmCalls[]` filtered by `debateRole: "challenger"`. The numerator is `llm_tpm_guard_fallback`.

## 5. Model-Routing Verdict To Preserve

Do not reopen routing changes until the measurement window has real data.

Preserved decisions:

- Validation tier stays `budget` by default. The LLM grounding policy is disabled for behavioural downgrade, and direction-repair economics need measured FP/repair rates before model-tier changes.
- Deep-quality reconciler premium is deferred. If revisited, benchmark a cross-family reconciler against Opus rather than assuming Opus is the right premium default.
- `modelUnderstand` and `modelExtractEvidence` stay budget. Stage 2 evidence extraction is high-volume, and global upgrade is disproportionate.
- Dedicated Pass 2 lane is deferred pending Counter A.

## 6. Over-Engineering Comments And Related Findings

These are the comments that matter for the next agent:

1. Do not make model-routing changes as a proxy for missing telemetry. The adversarial reviews converged that the next useful move is measurement, not tier churn.

2. Do not add `modelClaimAtomization` just to create a future tuning point. Without Counter A showing retry is common, a new UCM lane is architecture surface area with no proven behavioural need.

3. Do not build a full metrics/event subsystem for this narrow decision if warnings already give the numerator and `llmCalls[]` gives the denominator. A compact `pipelineTelemetry` object is only justified if warning-based extraction is too brittle for repeated production measurement.

4. Do not delete the grounding alias map just because IDs are now short. The alias map is cheap defensive compatibility and protects against legacy/nonconforming IDs while production data catches up.

5. Do not solve D5 inside the model-routing task. D5 has a real structural-bias concern, but it is a separate architecture decision with its own WIP doc.

6. Do not turn the current handover into another committee/process layer. This task should proceed as small direct increments with targeted review, consistent with the 2026-05-24 Lead Architect learning about failed Pipeline V2 process overhead.

7. Do not run `test:llm`, `test:neutrality`, `test:cb-integration`, or `test:expensive` unless Captain explicitly approves. Safe tests/build are allowed, but this handover pass did not run any tests.

## 7. D5 Evidence Partitioning Side Finding

Separate WIP doc already exists:

- `Docs/WIP/2026-05-26_D5_Evidence_Partitioning_Architectural_Review.md`

Summary:

- D5 partitions evidence by source type: institutional to advocate, general to challenger.
- That may pre-bias the debate because institutional evidence carries structural evidentiary weight.
- The fallback at `apps/web/src/lib/analyzer/verdict-stage.ts:452-456` collapses partitioning when either side has fewer than two items, so the adversarial design often may not actually activate.
- Do not change `evidencePartitioningEnabled` in this task. Measure partition activity and evidence imbalance first.

## 8. What The Next Agent Should Do

Recommended resume sequence:

1. Confirm current source still contains commits/equivalent changes for short evidence IDs and warning-based counters.
2. Read `Docs/WIP/2026-05-26_Telemetry_Observation_Plan_First_4_Jobs.md`.
3. Collect rows 2-4 in that telemetry plan, or ask Captain whether to restore the original 50-job window.
4. If the warning-based counters are insufficient, propose the minimal metrics JSON addition before editing.
5. Keep all model/routing changes parked until Counter A/B/C data exists.

Potential safe verification, if implementation work resumes:

- Targeted Vitest around changed Stage 1/Stage 4 warning behavior.
- TypeScript/build verification if metrics types are changed.
- No real-LLM suites without approval.

## 9. Do Not Trust Without Rechecking

- Exact line numbers can drift. Re-run `rg` before editing.
- The current dirty worktree includes unrelated changes; do not revert or overwrite them.
- The commit IDs above are current as of this handover write on 2026-05-28, but future rebases may change them.
- Warning-based "counters" may be enough for the first measurement window but may not satisfy a future requirement for durable metrics API aggregation.

