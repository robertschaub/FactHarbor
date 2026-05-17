# Lead Architect Handoff: V2 X7-O Query Planning Pre-Execution Observation Source Package

### 2026-05-17 | Lead Architect / Captain Deputy | Codex (GPT-5.5) | V2 X7-O Query Planning Pre-Execution Observation Source Package

**Package:** `Docs/WIP/2026-05-17_V2_Slice_X7-O_Product_Internal_Query_Planning_Preexecution_Observation_Artifact_Source_Package.md`
**Baseline:** `8136f12f` (`docs: record v2 x7n-d live smoke result`)
**Result:** reviewer-approved docs-only source package; source implementation not yet started

## Summary

After X7-N-D passed its clean legal-question smoke objective, deputy debate selected a no-provider product-path bridge as the next low-risk step. X7-O is that bridge: a future implementation may observe the existing product V2 Claim Understanding -> X7-J Evidence Lifecycle intake boundary and write a sanitized admin-only Query Planning pre-execution structural observation artifact.

The package deliberately avoids "ready" and "eligible" runtime wording. It records only structural prerequisites that a later reviewed Query Planning execution gate would need to evaluate. It does not execute Query Planning or prepare Query Planning prompt/model input.

## Review Result

Initial Architect, Security/runtime, and Code/package reviews required changes. The amended package was then approved:

- Architect: APPROVE.
- Security/runtime: APPROVE.
- Code/package: APPROVE.
- LLM/semantic: APPROVE.
- Claude Opus: APPROVE.

Required changes incorporated:

- Replaced readiness/eligibility terminology with `pre-execution structural observation`.
- Replaced `ready_hidden_internal` / `eligible_not_executed_precutover` with non-authorizing terms such as `hidden_task_policy_observed_not_invoked` and `structural_prerequisites_observed_not_executed_precutover`.
- Explicitly forbids `buildEvidenceQueryPlanningInputEnvelope(...)`, Query Planning input-envelope imports, prompt-packet construction, `ClaimContract` hashes, `batchInputEnvelope`, retrieval-catalog packets, source-acquisition trace packets, prompt/model/cache provenance, and query-plan inspection summaries.
- Requires configured-key and production-missing-key admin route tests plus `Cache-Control: no-store` on all responses.
- Requires sink and route APIs to accept only sanitized artifact/projection types, not raw `ClaimContract`, `EvidenceLifecycleStartDecision`, `PipelineRunContext`, static policy snapshots, prompt/model/provider types, or Query Planning runtime/input-envelope/inspection types.
- Records that prior `Prompt implementation authorized.` wording was consumed by X7-M and X3-B and grants X7-O no prompt authority.

## Approved Future Source Envelope

Production:

- `apps/web/src/lib/analyzer-v2/orchestrator.ts`
- `apps/web/src/lib/analyzer-v2/evidence-lifecycle/query-planning/preexecution-observation.ts`
- `apps/web/src/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-preexecution-observation-artifact-sink.ts`
- `apps/web/src/app/api/internal/analyzer-v2/evidence-lifecycle-query-planning-preexecution-observation-artifacts/route.ts`

Tests:

- `apps/web/test/unit/lib/analyzer-v2/evidence-lifecycle/query-planning/preexecution-observation.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/pipeline-shell.test.ts`
- `apps/web/test/unit/lib/analyzer-v2-runtime/evidence-lifecycle-query-planning-preexecution-observation-artifact-sink.test.ts`
- `apps/web/test/unit/app/api/internal/analyzer-v2/evidence-lifecycle-query-planning-preexecution-observation-artifacts/route.test.ts`
- `apps/web/test/unit/lib/analyzer-v2/boundary-guard.test.ts`

Completion docs:

- package file;
- `Docs/STATUS/Current_Status.md`;
- `Docs/STATUS/Backlog.md`;
- `Docs/AGENTS/Agent_Outputs.md`;
- X7-O implementation handoff;
- `Docs/AGENTS/index/handoff-index.json`.

## Still Blocked

- Query Planning runtime execution.
- Query Planning input-envelope, prompt-packet, hash, prompt/model/cache provenance, or query-plan inspection construction.
- Prompt rendering, model calls, provider callbacks, provider SDK imports.
- Source-provider/search/fetch/content-dereference/provider-network/parser execution.
- Source material, EvidenceCorpus, EvidenceItems, warnings, reports, verdicts, confidence, or public output.
- Cache IO, durable storage, Source Reliability, ACS/direct URL execution.
- Prompt/frontmatter/config/model/schema edits.
- Gateway/model/cache approval flips.
- Live jobs, validation batches, B3 proof, 2D-C, V1 reuse, V1 work, and V1 cleanup.

## Next

Commit the docs-only X7-O source package. Then implement X7-O only inside the approved source/test envelope, run the focused and broader verifier set from the package, and produce an implementation handoff before commit.
