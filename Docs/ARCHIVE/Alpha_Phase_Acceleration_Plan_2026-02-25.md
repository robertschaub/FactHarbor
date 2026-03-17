# Alpha Phase Acceleration & Observability Plan (2026-02-25)

**Status**: ✅ Phase 1 DONE (instrumentation). Phase 1.2 (model auto-resolution integration) IN PROGRESS. Phases 1.5-1.6 deferred to post-deployment.
**Author**: Gemini CLI (Lead Architect)
**Objective**: Secure the stability, observability, and cost-efficiency of the Alpha phase while validating recent quality improvements and eliminating architectural risks.

---

## 1. Executive Summary

FactHarbor has successfully completed the POC phase (v1.0.0-poc). The **ClaimAssessmentBoundary (CB)** pipeline is operational. This plan shifts focus from "initial integration" to "**coverage-gap closure**" and "**operational hardening**." 

We address the "Alpha-grade" requirement by ensuring 100% observability across the new CB pipeline, eliminating brittle model version strings, and validating quality via empirical benchmarks (C13, Accuracy).

### Execution Mode Update (2026-02-25)

At Captain direction, execution is temporarily paused for a short manual-test window.  
Resume protocol is fixed and must restart at **Gate 0** of:

- [`Docs/WIP/Phase1_Pipeline_Execution_Checklist_2026-02-25.md`](Phase1_Pipeline_Execution_Checklist_2026-02-25.md)

---

## 2. Priority Initiatives

### Phase 1: Observability & Stability
*Estimated Effort: 1-2 days | Risk: Low*

1.  **Observability Gap Closure (Instrumentation & Taxonomy Alignment) (COMPLETED)**
    - **Ref**: `SD-1`, `SD-2`, `SD-4`, `Lead Architect Review #1`
    - **Action**: 
        - Aligned `LLMTaskType` taxonomy: `[understand, research, cluster, verdict, aggregate]`.
        - Fixed `result.usage` type mismatches in all pipeline stages.
        - Wired `recordLLMCall` into Stage 2 (research), Stage 3 (cluster), and Stage 5 (aggregate).
        - Added `debateRole` attribution to all Stage 4 verdict calls.
    - **Acceptance Gate**: metrics.json contains all 5 taxonomy keys with role attribution. Verified in `claimboundary-pipeline.ts`.

2.  **Model Auto-resolution (Alpha Priority #2) (IN PROGRESS)**
    - **Ref**: [`Docs/WIP/Model_Auto_Resolution_Plan.md`](Model_Auto_Resolution_Plan.md), `SD-3`, `Lead Architect Review #5`
    - **Action**: Implemented `model-resolver.ts`. Logical tiers (haiku, sonnet, opus) mapped to provider IDs with version-lock (default) and latest (opt-in).
    - **Next Step**: Replace hardcoded IDs in `llm.ts`, `config-schemas.ts`, and `runner.ts` with `resolveModel()` calls.
    - **Goal**: Zero hardcoded model ID strings in `src/`.

### Phase 1.5: Validation Cost Governance
*Estimated Effort: 1 day | Risk: Low*

1.  **Staged Validation Lanes (Cost Control)**
    - **Ref**: `Lead Architect Review #3`
    - **Action**: Implement enforceable budget stop-rules in `calibration/runner.ts`:
        - **Budget Stop**: Auto-abort run if cumulative `estimatedCostUSD` exceeds `$5.00` (configurable).
        - **Canary Lane**: 1 pair operational check.
        - **Pilot Lane**: 5-claim sample baseline.
        - **Execution Runbook**: Use gate-by-gate checklist in [`Phase1_Pipeline_Execution_Checklist_2026-02-25.md`](Phase1_Pipeline_Execution_Checklist_2026-02-25.md) (Gate 0 -> Gate 4).
    - **Goal**: Prevent expensive long-run churn while validating logic stability.

### Phase 1.6: Execution Runbook (Embedded Summary)
*Estimated Effort: 0.5 day | Risk: Low*

Use this sequence when manual-test window closes:

1. **Gate 0 (no API cost)**: safe unit tests + web build.
2. **Gate 1 (no API cost)**: instrumentation sanity checks (`understand/research/cluster/verdict/aggregate` + `debateRole`).
3. **Gate 2 (low API cost)**: Canary lane + telemetry validation.
4. **Gate 3 (controlled API cost)**: Smoke lane + telemetry validation.
5. **Gate 4 (higher cost, conditional)**: Full gate lane only if Gates 0-3 are green.

Authoritative command list + pass/fail criteria:
- [`Docs/WIP/Phase1_Pipeline_Execution_Checklist_2026-02-25.md`](Phase1_Pipeline_Execution_Checklist_2026-02-25.md)

### Phase 2: Baseline Validation & Quality Pilot
*Estimated Effort: 2-3 days | Risk: Medium*

1.  **Baseline Canary/Pilot Runs**
    - **Action**: Execute Canary and Pilot lanes to establish a locked performance baseline *before* introducing major retrieval variables (MSR).
    - **Acceptance Gate**: 100% Canary pass + Pilot accuracy trend visible in metrics.

### Phase 3: Multi-Source Retrieval (MSR) Integration
*Estimated Effort: 4-6 days | Risk: Medium*

1.  **Multi-Source Pipeline Integration (MSR Phase 3)**
    - **Ref**: [`Docs/WIP/Multi-Source_Evidence_Retrieval_Plan.md`](Multi-Source_Evidence_Retrieval_Plan.md), `WS-2`
    - **Action**: Integrate Wikipedia, Semantic Scholar, and Google Fact Check. Implement `isSuperseded` filter in `aggregation.ts`.
    - **Goal**: Reduce evidence pool asymmetry (C13).
2.  **Accuracy Benchmarking (50 Claims)**
    - **Action**: Execute full 50-claim Test Set validation only after Pilot baseline passes.
    - **Goal**: `accuracyRate >90%` (95% CI lower bound >80%).

### Phase 4: Cost Optimization Expansion
*Estimated Effort: 4-6 days | Risk: Medium*

1.  **Batch API & Prompt Caching (LLM-2, LLM-3)**
    - **Action**: Extend `cacheControl` and Batch API support after pipeline is stable.
    - **Goal**: 20-30% total job cost reduction.

---

## 3. Prioritization Matrix

| Task | Phase | Priority | Cost/Effort | Risk | Opportunity |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Observability Gap Closure | 1 | 1 | Low | Low | High (Observability) |
| Model Auto-resolution | 1 | 2 | Medium | Low | High (Stability) |
| Baseline Pilot Runs | 2 | 3 | Medium | Medium | High (Integrity) |
| Multi-Source Integration | 3 | 4 | Medium | Medium | High (Quality) |
| Accuracy Validation (50) | 3 | 5 | High | Medium | High (Quality) |
| Batch API/Caching | 4 | 6 | Medium | Medium | High (Cost) |

---

## 4. Success Metrics (Operational Acceptance Gates)

| Metric | Target | Verification Lane |
| :--- | :--- | :--- |
| **Observability** | 100% stages instrumented | API-persisted metrics for job must contain [understand, research, cluster, verdict, aggregate] + `debateRole` |
| **Stability** | 0 hardcoded model IDs | `grep -rE "claude-|gpt-|gemini-|mistral-" src/` returns 0 matches outside `model-resolver.ts` |
| **MSR Yield** | `msrYieldRate` >30% | API metrics: % of claims with ≥1 non-web-search evidence item |
| **Caching** | `cacheHitRate` >50% | API metrics: `cacheReadInputTokens` / `totalTokens` on repeat analyses |
| **Quality** | `accuracyRate` >90% | Success against 50-claim "Ground Truth" test set (95% CI lower bound >80%) |
| **Neutrality** | `meanAbsoluteSkew` <10pp | C13 calibration run vs Baseline v1 |
| **Cost** | 20-30% reduction | API metrics: `avgCostPerAnalysis` (via caching/batching) |

---

## 5. Risks & Mitigations

*   **Risk**: Model auto-resolution might point to breaking updates.
    - **Mitigation**: Implement a "Version Lock" toggle in UCM for critical paths.
*   **Risk**: Quality validation runs exceed budget.
    - **Mitigation**: Enforce strict spend caps and staged validation lanes (Phase 1.5).
*   **Risk**: Instrumentation regressions (silent metric loss).
    - **Mitigation**: Add a schema-validation check to `persistMetrics` that alerts on missing mandatory fields.
*   **Risk**: MSR dedup/supersession regressions.
    - **Mitigation**: Add a dedicated integration test for Wikipedia/FactCheck overrides.
*   **Risk**: Doc/Config drift (Backlog vs Plan).
    - **Mitigation**: Synchronize `Backlog.md` and `Current_Status.md` weekly.

---

## 6. Next Steps & Governance

1.  [ ] **Captain / QA**: Complete manual tests and log checkpoint outcome.
2.  [ ] **Senior Developer**: Resume plan via runbook Gate 0 ([`Phase1_Pipeline_Execution_Checklist_2026-02-25.md`](Phase1_Pipeline_Execution_Checklist_2026-02-25.md)).
3.  [ ] **Lead Architect** (Gemini CLI): Monitor Phase 1 instrumentation completeness and Phase 1.5 lane setup.
4.  [ ] **Lead Developer**: Review Multi-Source integration path in `claimboundary-pipeline.ts`.
5.  [ ] **QA/Tester**: Curate Verdict Accuracy Test Set (50 claims) and Lane 2 Pilot set.
