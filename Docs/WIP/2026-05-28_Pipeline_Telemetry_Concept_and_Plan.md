# Pipeline Telemetry Concept And Plan

**Status:** Phase 1 + Phase 2 implemented 2026-06-01 (see §15). Reviewed, consolidated, and source-refreshed 2026-06-01
**Created:** 2026-05-28  
**Owner:** open  
**Scope:** ClaimAssessmentBoundary pipeline telemetry only  
**Non-goals:** model-routing changes, D5 behavior changes, warning severity changes, live-job collection, admin UI thresholds, controlled rerun-stability experiments

---

## 1. Executive Summary

FactHarbor currently uses `analysisWarnings[]` as the easiest way to observe several pipeline control-flow events. That works for immediate visibility, but it mixes two different concerns:

- **Warnings** communicate notable analysis events to admins or users.
- **Telemetry** measures control-flow behavior so architecture decisions can be made from rates, denominators, and trends.

The consolidated conceptual change is to add narrow first-class `pipelineTelemetry` to persisted `AnalysisMetrics`. It should be computed after analysis from existing structured outputs, not injected into the pipeline as another behavior path.

This keeps warning semantics clean while making the parked routing questions measurable. D5 partition health remains owned by `qualityHealth` for now to avoid duplicating the existing F6 surface.

2026-06-01 source refresh: `pipelineTelemetry` is still not implemented in source. Current source already changed the D5/direct-publishability path: D5 sufficiency can emit `insufficient_direct_evidence` with per-claim directional counts, and `qualityHealth.f4_*` now counts both `insufficient_evidence` and `insufficient_direct_evidence`. Treat this document as the implementation plan and current-source alignment note, not as a description of a shipped `pipelineTelemetry` schema.

---

## 2. What This Telemetry Addresses

The telemetry should answer these currently parked architecture questions:

1. **Contract validation:** How often Stage 1 contract validation retry and repair paths fire.
2. **Verdict direction validation:** How often direction validation flags, rescues, or downgrades verdicts.
3. **Challenger model guard / TPM fallback:** How often challenger role invocations are affected by fallback under provider capacity pressure.
4. **D5 evidence partitioning:** How often evidence partitioning activates and whether the resulting pools are structurally imbalanced. This is already partly covered by `qualityHealth.f6_*`; improve that surface instead of duplicating it in Phase 1 `pipelineTelemetry`.
5. **Evidence-ID compliance:** Whether new reports consistently emit short sequential `EV_001`-style IDs, so the defensive grounding alias map can eventually be retired with evidence. This is a temporary cleanup metric and should live under quality-health or a one-release cleanup metric, not permanent control-flow telemetry.
6. **Deploy comparison:** Whether a job's telemetry can be associated with the pipeline version that produced it.

Telemetry does not decide these questions by itself. It produces the measurement substrate for later decisions.

Related but separate: the 2026-06-01 verdict-direction instability findings measure rerun instability from evidence-pool drift and stochastic pipeline behavior. The Phase 1 `verdictDirection` telemetry below measures the Stage 4 direction validator/repair/downgrade control path only. It must not be used as a substitute for controlled rerun-stability telemetry or validation batches.

---

## 3. Goals

- Persist per-job control-flow counters in metrics JSON.
- Include denominators wherever a rate is reported.
- Distinguish missing, partial, and available telemetry so absent data cannot be read as clean zeroes.
- Define whether each rate is per job, per claim, per role invocation, or per physical LLM call.
- Support cross-job aggregation without manual parsing of every job report.
- Preserve warning severity semantics; informational warnings must not become fake degradation.
- Keep telemetry language-neutral and structural.
- Keep telemetry additive and backward-compatible for older metrics records.
- Provide enough provenance to know whether jobs are comparable across deploys.
- Ship the smallest useful first release: contract validation, verdict direction, and challenger model guard counters.
- Keep Phase 1 direction telemetry scoped to direction-validator control flow, not broader rerun stability.

---

## 4. User Needs

### Captain / Admin Needs

- Quickly answer whether a control-flow path is common enough to matter.
- See per-job drilldown for which events fired.
- See aggregate rates over a selected date range or job window.
- Compare before and after a deploy without hand-parsing reports.
- Trust that telemetry did not change analysis behavior.

### Developer Needs

- Stable, versioned telemetry schema.
- Zero-denominator-safe rates.
- Explicit availability/error flags for every telemetry section.
- Tests for missing or malformed structured details.
- No database migration for the first implementation if raw metrics JSON is sufficient.
- A clear boundary between warning display, failure/degradation metrics, quality-health metrics, and pipeline telemetry.

---

## 5. Conceptual Change

Add `pipelineTelemetry` as a first-class field under `AnalysisMetrics`.

Current adjacent surfaces should keep their current jobs:

| Surface | Purpose | Should telemetry replace it? |
|---|---|---|
| `analysisWarnings[]` | User/admin communication about notable events | No |
| `failureModes` | Refusal/degradation observability | No |
| `qualityHealth` | Existing F4/F5/F6 health monitoring | No |
| `qualityHealth.evidenceIdCompliance` or a one-release cleanup metric | Transitional evidence-ID cleanup status | No |
| `pipelineTelemetry` | Neutral control-flow instrumentation for routing architecture decisions | New |

`pipelineTelemetry` should be computed once during metrics finalization from data already present in the result and metrics collector. It should not add new LLM calls, alter routing, change D5 behavior, or change warning severity.

The rejected alternative is to keep mining `analysisWarnings[]` directly forever. That avoids a new field, but leaves durable measurement coupled to display/communication policy. The also-rejected alternative is a broad event-log subsystem in Phase 1. Event logs may be useful later for real-time debugging, but the current user need is stable aggregate counts and denominators.

---

## 6. Proposed Telemetry Contract

Draft shape:

```ts
interface TelemetrySectionStatus {
  available: boolean;
  partial: boolean;
  error?: string;
}

interface PipelineTelemetry {
  telemetrySchemaVersion: string; // current value: "1.0"
  status: TelemetrySectionStatus;
  contractValidation: {
    status: TelemetrySectionStatus;
    retryCount: number;
    repairPassCount: number;
    failingClaimCount: number;
    jobHadRetry: boolean;
    jobHadRepair: boolean;
  };
  verdictDirection: {
    status: TelemetrySectionStatus;
    issueCount: number;
    rescueCount: number;
    downgradeCount: number;
    flaggedClaimIds: string[];
    rescuedClaimIds: string[];
    downgradedClaimIds: string[];
    // Derived from claim-ID sets: flagged - rescued - downgraded.
    // If any warning lacks claimId, mark section partial and do not treat
    // unresolvedIssueCount as implementation-ready decision evidence.
    unresolvedClaimIds: string[];
    unresolvedIssueCount: number;
  };
  challengerModelGuard: {
    status: TelemetrySectionStatus;
    precheckFallbackCount: number;
    retryFallbackCount: number;
    totalFallbackCount: number;
    challengerRoleInvocationCount: number;
    challengerPhysicalCallCount: number;
    fallbackAffectedRoleInvocationCount: number;
    fallbackAffectedRoleInvocationRate: number;
    fallbackPhysicalCallRate: number;
  };
}
```

Important details:

- Missing or partial telemetry must never be counted as clean zero. A section with missing required structured details is `partial` or `available: false`, not zero-success.
- `verdictDirection` is claim-scoped. Store `flaggedClaimIds`, `rescuedClaimIds`, `downgradedClaimIds`, and `unresolvedClaimIds` because validation-tier decisions depend on which claims were affected, not only raw warning counts.
- Direction downgrade detection should prefer `details.triggerPolicy === "direction"` and fall back to `details.integrityFailureType === "direction"` for older records.
- `challengerModelGuard` is provider-neutral by name even though the current concrete trigger is OpenAI TPM fallback.
- `challengerRoleInvocationCount` is the count of challenger role invocations, sourced from `result.meta.runtimeRoleModels.challenger.callCount` when available. `challengerPhysicalCallCount` is the count of physical model attempts in `llmCalls[]` with `debateRole === "challenger"`.
- `fallbackAffectedRoleInvocationCount` measures challenger role invocations affected by fallback. It should be keyed from structured fallback warnings. Prefer `details.debateRole === "challenger"` if added; otherwise use the structural prompt key for the challenger role. Do not infer this from physical call count alone.
- Store counts and denominators. Store rates only when they are zero-denominator safe and directly useful to API/UI consumers.

Cross-cutting metrics context should be added outside `pipelineTelemetry`:

```ts
interface MetricsTelemetryContext {
  metricsSchemaVersion: string;
  pipelineVariant: string;
  pipelineCommitId?: string;
  pipelineCommitShort?: string;
  telemetryComputedAt: string;
}
```

This context supports before/after deploy comparisons and helps aggregation report how many jobs are missing telemetry.

Current provenance source: use `resultJson.meta.executedWebGitCommitHash` when present. It is populated by the web runner from `getWebGitCommitHash()` and may include a `+<workingTreeHash>` dirty suffix. The API also exposes the same execution-time value to admins as `gitCommitHash`, with a legacy fallback. Aggregates should keep the full `pipelineCommitId` for grouping and derive `pipelineCommitShort` only for display; do not silently group dirty-suffix jobs with the clean commit.

Aggregate summary shape must include availability counts:

```ts
interface PipelineTelemetryAggregate {
  jobsTotal: number;
  jobsWithTelemetry: number;
  jobsMissingTelemetry: number;
  jobsWithPartialTelemetry: number;
  sectionAvailability: {
    contractValidation: { jobsAvailable: number; jobsPartial: number; jobsErrored: number };
    verdictDirection: { jobsAvailable: number; jobsPartial: number; jobsErrored: number };
    challengerModelGuard: { jobsAvailable: number; jobsPartial: number; jobsErrored: number };
  };
}
```

Rates must divide by the relevant available denominator:

- Job rates divide by `jobsAvailable` for that section, not by all jobs in the query window.
- Claim rates divide by claim IDs available to that section.
- Role-invocation rates divide by `challengerRoleInvocationCount`.
- Physical-call rates divide by `challengerPhysicalCallCount`.
- Missing or partial jobs are reported separately and excluded from decisive rates.

---

## 7. Implementation Plan

### Phase 0 - Scope Gate

First release includes only:

- `contractValidation`
- `verdictDirection`
- `challengerModelGuard`

Deferred:

- D5 partitioning and direct-publishability sufficiency stay in `qualityHealth`; improve that surface separately if the existing aggregate is insufficient. Current source already counts both `insufficient_evidence` and `insufficient_direct_evidence` in `qualityHealth.f4_*`, but it does not yet expose enough D5/directness substructure for architecture decisions.
- Evidence-ID compliance moves to `qualityHealth` or a one-release cleanup metric with an explicit sunset condition.
- Admin UI is deferred unless Captain explicitly scopes it in.

### Phase 1 - Metrics Schema And Builder

1. Add `PipelineTelemetry` and `pipelineTelemetry?: PipelineTelemetry` to `apps/web/src/lib/analyzer/metrics.ts`.
2. Add `MetricsCollector.setPipelineTelemetry(...)`.
3. Add `MetricsCollector.getLLMCallsSnapshot()` because `challengerModelGuard` requires `llmCalls[]` denominators.
4. Add `buildPipelineTelemetry(result, llmCalls)` in `apps/web/src/lib/analyzer/metrics-integration.ts` or a small adjacent helper if tests are cleaner that way.
5. Call `setPipelineTelemetry(...)` in `recordOutputQuality(result)` after warnings and LLM calls are available.
6. Add a structural `debateRole` or stable invocation marker to TPM fallback warning details if needed to count affected role invocations without relying on physical call count.
7. Builder failure must not abort metrics finalization. It must persist `status.available=false` or section-level `partial/error` status, not default zero-looking counters.

### Phase 2 - Aggregate API Surface

1. Extend `apps/api/Controllers/MetricsController.cs` summary aggregation to include a `pipelineTelemetry` object.
2. Aggregate totals and rates from persisted `MetricsJson`.
3. Treat older metrics without `pipelineTelemetry` as missing, not zero. Count them as `jobsMissingTelemetry`.
4. Count partial telemetry separately as `jobsWithPartialTelemetry`; do not include partial/missing sections in decisive rate denominators.
5. Reuse the existing `AnalysisMetrics` table; do not add a migration.

### Phase 3 - Admin Usability

UI is deferred. The first release stops at persisted metrics plus API summary aggregation.

If UI is later scoped, show raw counts, denominators, and rates only. Do not introduce hardcoded "good" or "bad" threshold colors unless those thresholds are UCM-backed.

Current-source caveat: the existing admin quality-health page already applies hardcoded status colors to some F6 rates. Phase 1 pipeline telemetry must not add more hardcoded thresholds. If D5/F6 UI work is touched, either leave existing display behavior unchanged or move new threshold logic into UCM-backed configuration before automating decisions.

### Phase 4 - Tests And Verification

1. Add focused unit tests for telemetry builder behavior:
   - contract retry and repair warning details;
   - direction issue, rescue, downgrade, claim-ID set joins, and missing claim IDs;
   - zero challenger role-invocation and physical-call denominators;
   - TPM precheck and retry phases;
   - fallback warning without role metadata, which must mark `challengerModelGuard` partial instead of inventing a clean zero;
   - missing or malformed warning details.
2. If API aggregation changes, add parser/controller coverage where practical.
3. If D5 quality-health telemetry is added, test ordinary insufficiency, direct-insufficiency, classifier-degraded partial status, and sufficient claims that still required direct applicability.
4. Run safe tests/build only. Do not run real-LLM suites without explicit Captain approval.

---

## 8. Usability Criteria

Telemetry is usable when an admin can answer these questions without manual report parsing:

- Out of the selected jobs, how many had contract validation retry?
- Did the repair pass actually fire, or only the retry?
- How many direction issues were flagged, rescued, and downgraded?
- How many challenger calls happened, and how many hit TPM fallback?
- How many matching jobs were missing telemetry because they predate the schema?
- Which pipeline version produced the jobs in the selected aggregate?

D5 and evidence-ID questions remain important, but they should be answered through `qualityHealth` or a dedicated temporary cleanup metric rather than Phase 1 `pipelineTelemetry`.

For the D5 quality-health follow-up specifically, telemetry is usable when an admin can distinguish ordinary low-evidence rejection from contextual-only/directness rejection, see whether applicability assessment degraded, and identify the affected claim IDs without reading full report prose.

---

## 9. D5 Follow-Up Telemetry

D5 should stay out of Phase 1 `pipelineTelemetry`, but the plan must still define what additional quality-health telemetry is needed before changing D5 behavior.

Owner surface: `qualityHealth.d5` or additive `qualityHealth.f6_*` fields, not `pipelineTelemetry`.

Required fields:

```ts
interface D5QualityHealthTelemetry {
  status: TelemetrySectionStatus;
  partitioning: {
    status: TelemetrySectionStatus;
    partitioningActive: boolean;
    institutionalCount: number;
    generalCount: number;
    totalEvidence: number;
    institutionalGeneralRatio: number | null;
  };
  directPublishability: {
    status: TelemetrySectionStatus;
    totalClaims: number;
    claimsRequiringDirectApplicability: number;
    insufficientEvidenceClaims: number;
    insufficientDirectEvidenceClaims: number;
    claimsWithApplicabilityAssessmentDegraded: number;
    totalDirectionalEvidenceTotal: number;
    directDirectionalEvidenceTotal: number;
    nonDirectDirectionalEvidenceTotal: number;
    claimDiagnostics: Array<{
      claimId: string;
      directApplicabilityRequired: boolean;
      sufficiencyStatus: "sufficient" | "insufficient_evidence" | "insufficient_direct_evidence";
      totalDirectionalCount: number;
      directDirectionalCount: number;
      nonDirectDirectionalCount: number;
    }>;
  };
  evidenceDirection: {
    status: TelemetrySectionStatus;
    supportCount: number;
    contradictCount: number;
    neutralCount: number;
    directionalEvidenceTotal: number;
    supportContradictRatio: number | null;
  };
  roleTruthDeltas: {
    status: TelemetrySectionStatus;
    claimCountWithRoleSnapshots: number;
    advocateChallengerAvgAbsDelta: number | null;
    advocateChallengerMaxAbsDelta: number | null;
    reconcilerAdvocateAvgAbsDelta: number | null;
    reconcilerAdvocateMaxAbsDelta: number | null;
    reconcilerChallengerAvgAbsDelta: number | null;
    reconcilerChallengerMaxAbsDelta: number | null;
  };
}
```

Implementation notes:

- `partitioningActive`, institutional/general counts, and total evidence are already available from `evidence_partition_stats`.
- Current `qualityHealth.f4_insufficientClaims` already counts both `insufficient_evidence` and `insufficient_direct_evidence`. That aggregate is useful for total rejection rate but insufficient for D5 decisions; split the two warning types in the new D5/direct-publishability fields.
- The current D5 gate is per-claim: `claimRequiresDirectApplicability(...)` decides whether direct applicability is required for that claim, and `evaluateEvidenceSufficiency(...)` returns total, direct, and non-direct directional counts. Persist those claim-level diagnostics while the D5 loop has them; do not reconstruct them later from aggregate warning counts only.
- Existing `insufficient_direct_evidence` warning details already include `claimId`, `totalDirectionalCount`, `directDirectionalCount`, `nonDirectDirectionalCount`, and `directApplicabilityRequired` for insufficient claims. Sufficient claims that required direct applicability still need explicit metrics capture if denominator decisions depend on them.
- `evidence_applicability_assessment_degraded` means the classifier failed or was unavailable. D5 currently fails open in that case; quality-health must count it separately instead of classifying it as either clean sufficiency or analytical scarcity.
- Support/contradict/neutral counts can come from structured evidence `claimDirection` values already present in result JSON, but they are not a substitute for claim-local direct-publishability counts.
- Advocate/challenger/reconciler truth deltas are not fully wired today. They require Stage 4 to persist role-level truth snapshots as metrics-only diagnostics. That is a telemetry-only addition, not a D5 behavior change.
- If role-level snapshots are unavailable, mark `roleTruthDeltas.status` or the parent D5 status as partial rather than returning zero deltas.

Decision thresholds for review packets, not hardcoded UI colors:

For these thresholds, include only jobs whose relevant D5 sub-section has `status.available === true`. Per-claim D5 rates divide by `directPublishability.totalClaims` across available jobs, not by all jobs in the selected window.

| Signal | Threshold | Interpretation |
|---|---|---|
| `partitioningActiveRate < 20%` over a 50+ job current-stack window | D5 rarely activates | D5 structural-bias concern is low practical priority; keep or simplify later |
| `partitioningActiveRate >= 50%` and median `institutionalGeneralRatio > 5:1` | D5 often activates with structurally imbalanced pools | Escalate D5 option B/D review |
| `insufficientDirectEvidenceRate` is materially higher than ordinary `insufficientEvidenceRate` | Research finds evidence volume but not claim-local direct directional evidence | Prioritize D5/directness or evidence-to-claim attribution work before changing Stage 4 publication rules |
| `claimsWithApplicabilityAssessmentDegraded > 0` in current-stack review packets | Directness classifier failed open | Treat D5 directness conclusions as partial; fix classifier reliability before using the rate for architecture decisions |
| `partitioningActiveRate >= 70%` and role truth deltas are consistently material | D5 changes actual role outputs | Option A is weak; compare B vs. D |
| `supportContradictRatio` routinely lacks enough evidence on one side | Direction-based partitioning may be under-supported | Do not adopt D5 option B/D until direction evidence coverage improves |

If these thresholds are ever displayed or automated, move them into UCM first. In this document they are manual review thresholds for deciding whether to open a D5 implementation task.

---

## 10. Risks And Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Telemetry accidentally changes behavior | High | Compute after analysis from existing structured outputs only |
| Warning semantics become polluted | Medium | Keep `analysisWarnings[]` as communication and `pipelineTelemetry` as measurement |
| Misleading rates from missing denominators | High | Store denominator fields next to every rate |
| Old metrics records break aggregation | Medium | Treat missing `pipelineTelemetry` as missing, count it separately, and keep schema additive |
| Partial telemetry is mistaken for clean success | High | Persist section `available/partial/error` status and exclude partial sections from decisive rates |
| Naive direction unresolved math misleads decisions | High | Use claim-ID sets and mark section partial when claim IDs are missing |
| Physical LLM calls are mistaken for role invocations | Medium | Store both role-invocation and physical-call denominators |
| D5 direct-publishability failures are hidden inside the broad F4 rejection rate | Medium | Split `insufficient_evidence`, `insufficient_direct_evidence`, and classifier-degraded counts under `qualityHealth` |
| Runtime overhead | Low | One in-memory pass over warnings and LLM calls during metrics finalization |
| UI implies thresholds that are not approved | Medium | Show raw read-only values first; put tunable thresholds in UCM if later needed |
| Evidence-ID compliance check becomes behavioral validation | Medium | Keep it as metrics only; never block or alter report output |
| Builder error breaks metrics persistence | Medium | Catch builder errors, log locally, and persist explicit unavailable/partial telemetry status |
| Deploy boundary remains invisible | Medium | Add metrics context with commit/provenance or explicitly mark deploy comparison out of scope |

---

## 11. Open Questions

1. Should evidence-ID compliance be added under `qualityHealth`, or handled as a separate one-release cleanup metric?
2. Should aggregate API output include per-window telemetry schema version counts in addition to `jobsMissingTelemetry` and `jobsWithPartialTelemetry`?
3. Should Phase 1 add `debateRole` to TPM fallback warning details, or derive challenger fallback from structural prompt keys until a broader invocation-id scheme exists?
4. How much D5 `claimDiagnostics` should be persisted for every job versus reduced to aggregate counts if metrics payload size becomes an issue?

---

## 12. Review Protocol Used

The plan was reviewed by:

- Claude reviewer: broad architecture, schema boundary, and over-engineering risk.
- Gemini reviewer: adversarial review, missing user needs, and conceptual alternatives.
- GPT reviewer: implementation feasibility, tests, and FactHarbor rule compliance.

Reviewers are asked to freely add ideas and alternatives, not just approve or reject this plan.

After review, consolidate through a short debate:

1. Identify all material disagreements.
2. Debate whether `pipelineTelemetry` is sufficient or whether a different conceptual model is better.
3. Decide which proposals are accepted, rejected, or deferred.
4. Update this document with the consolidated decision.

---

## 13. Review Results

### Claude Reviewer

Claude supported the core `pipelineTelemetry` concept but argued the draft was too broad.

Key findings:

- `evidenceIdCompliance` is misplaced in permanent control-flow telemetry; it belongs in `qualityHealth` or a temporary cleanup metric.
- Deploy comparison is a stated user need but needs an explicit metrics context/provenance field.
- D5 partitioning risks duplicating `qualityHealth.f6_*`.
- `openAiTpmGuard` is too provider-specific as a schema name; use a provider-neutral name.
- First release should be narrowed to contract validation, verdict direction, and challenger model guard.

### Gemini Reviewer

Gemini CLI full-document review timed out, but a concise adversarial prompt returned a usable review.

Key findings:

- `pipelineTelemetry` risks redundancy if all data can already be queried from structured warnings and `llmCalls[]`.
- Derivation logic can silently break when warning or LLM call shapes change.
- Post-analysis computation is not suitable for real-time monitoring or alerting.
- Aggregated telemetry may hide raw context needed for deep debugging.
- Alternatives are enhanced querying over existing data, or in-band telemetry emitted at source.

### GPT Reviewer

GPT supported narrow first-class telemetry and emphasized implementation constraints.

Key findings:

- First-class telemetry is justified only once cross-job aggregation is required.
- D5 ownership must be clarified to avoid duplicating `qualityHealth.f6_*`.
- The challenger-call denominator must be validated against actual `llmCalls[].debateRole` records.
- Evidence-ID compliance needs an explicit sunset condition if tracked.
- Add telemetry provenance and `jobsMissingTelemetry` to aggregates.

### Follow-Up Review Addressed

A later review found that the plan was not implementation-ready because missing telemetry could still be misread as zero, direction telemetry was count-only instead of claim-scoped, challenger fallback denominators mixed role invocations with physical calls, and D5 follow-up telemetry was underspecified.

This revision addresses those findings by requiring:

- `jobsWithTelemetry`, `jobsMissingTelemetry`, `jobsWithPartialTelemetry`, and section-level `available/partial/error` status;
- rates that divide only by the relevant available denominator;
- claim-ID sets for direction flags, rescues, downgrades, and unresolved claims;
- separate `challengerRoleInvocationCount` and `challengerPhysicalCallCount`;
- a concrete D5 quality-health follow-up telemetry shape and manual review thresholds.

### 2026-06-01 Source Refresh

The plan was rechecked against current source after the direct-publishability sufficiency work landed. No `AnalysisMetrics.pipelineTelemetry` field or aggregate `pipelineTelemetry` API exists yet. The important drift is in adjacent health telemetry: current source emits `insufficient_direct_evidence`, records direct/non-direct directional counts on that warning, registers `evidence_applicability_assessment_degraded`, and folds both insufficiency warning types into `qualityHealth.f4_*`. The plan now treats those shipped facts as the baseline for the D5 follow-up, not as new Phase 1 `pipelineTelemetry` scope.

---

## 14. Consolidated Decision

### Accepted

1. Add first-class `AnalysisMetrics.pipelineTelemetry`, but keep Phase 1 narrow.
2. Phase 1 includes only `contractValidation`, `verdictDirection`, and `challengerModelGuard`.
3. Keep `analysisWarnings[]` as communication, `failureModes` as degradation/refusal observability, `qualityHealth` as health monitoring, and `pipelineTelemetry` as neutral control-flow measurement.
4. Add cross-cutting metrics context/provenance outside `pipelineTelemetry`.
5. Aggregate API output should include `jobsWithTelemetry`, `jobsMissingTelemetry`, `jobsWithPartialTelemetry`, and section availability counts.
6. Direction telemetry must store claim-level sets, not only counts.
7. Challenger guard telemetry must distinguish role invocations from physical LLM attempts.
8. Do not add UI in the first release.
9. D5 direct-publishability and classifier-degradation subcounts belong under `qualityHealth`, because the source already uses F4/F6 for that health surface.

### Rejected

1. Do not keep durable measurement coupled directly to warning-display policy.
2. Do not build a broad event-log subsystem in Phase 1.
3. Do not duplicate D5 partition health inside `pipelineTelemetry` while `qualityHealth.f6_*` already owns that surface.
4. Do not put evidence-ID cleanup inside permanent `pipelineTelemetry`.

### Deferred

1. Improve D5/direct-publishability telemetry through `qualityHealth`; existing F4/F6 aggregation is now known to be too coarse for D5 architecture decisions.
2. Add evidence-ID compliance as a temporary cleanup metric with a sunset rule.
3. Revisit in-band telemetry events only if real-time monitoring or deeper debug traceability becomes a concrete user need.
4. Add admin UI only after API/persisted metrics prove useful.

### Final Debate Position

The first-class `pipelineTelemetry` concept is worth keeping, but only as a compact measurement layer for routing-related control-flow counters. The implementation should not become a general event system, a warning replacement, or a home for every temporary cleanup metric.

The first useful increment is a unit-tested post-analysis builder plus API aggregation over existing metrics JSON. That gives durable cross-job rates and denominators without changing ClaimAssessmentBoundary behavior.

---

## 15. Implementation Status (2026-06-01)

Phase 0/1/2 are implemented. Phase 3 (admin UI) remains deferred per the consolidated decision.

### What shipped

- **Schema (`apps/web/src/lib/analyzer/metrics.ts`):** added `TelemetrySectionStatus`, `PipelineTelemetry`, `MetricsTelemetryContext`; added optional additive `pipelineTelemetry` and `telemetryContext` to `AnalysisMetrics`; added `MetricsCollector.setPipelineTelemetry()`, `getLLMCallsSnapshot()`, and `getPipelineVariant()`.
- **Builder (`apps/web/src/lib/analyzer/metrics-integration.ts`):** added `buildPipelineTelemetry(result, llmCalls)` and `buildMetricsTelemetryContext(result, pipelineVariant)`, wired into `recordOutputQuality()` behind a defensive try/catch.
- **API aggregation (`apps/api/Controllers/MetricsController.cs`):** added `PipelineTelemetryAccumulator` and a `pipelineTelemetry` object in the `/summary` response, with `jobsWithTelemetry`/`jobsMissingTelemetry`/`jobsWithPartialTelemetry`/`jobsErroredTelemetry`, per-section availability counts, and denominator-correct rates. Reuses the existing `AnalysisMetrics.MetricsJson` TEXT blob — **no DB migration**.
- **Tests:** `apps/web/test/unit/lib/analyzer/pipeline-telemetry.test.ts` (17 cases). Existing metrics tests unaffected (25 pass). TS typecheck and C# compile clean.

### Decisions applied during implementation (from Senior Developer review)

1. **`challengerModelGuard` kept its name but is now fully challenger-scoped.** All TPM fallback counts filter on `details.promptKey === "VERDICT_CHALLENGER"`; no job-wide counts are mixed in. The guard at `verdict-generation-stage.ts` is actually role-agnostic, so a broader `verdictModelGuard` rollup (with per-role breakdown) is the natural future extension — deferred. The rate divides by physical-call count (`fallbackPhysicalCallRate`), since TPM warnings are emitted per physical attempt.
2. **Challenger fallback attribution is by prompt key — zero pipeline change.** No `debateRole` was added to the TPM warning (Phase 1 step 6 / Open Question #3 resolved in favor of the post-analysis-only path). Revisit only if prompt keys prove brittle.
3. **Contract counters are occurrence-derived.** `retryCount`/`repairPassCount` count warning occurrences; `failingClaimCount` sums `details.failingClaimCount` across retry warnings; a retry warning lacking that field marks the section `partial`. `contract_completion_diagnostic` is not yet counted.
4. **Builder self-guards.** `buildPipelineTelemetry` catches internally and emits `available:false` for every section; the `recordOutputQuality` call site also wraps defensively because it runs in the analysis hot path with no outer catch.
5. Direction unresolved math marks `partial` both when a direction warning lacks a `claimId` and when a rescued/downgraded claim was never flagged (join inconsistency).
6. Challenger absence (role never ran / disabled) yields `available:false`, not a row of zeros.
7. `telemetrySchemaVersion` versions only the telemetry sub-schema; `MetricsTelemetryContext` carries provenance and keeps the full dirty commit for grouping plus a clean short prefix for display.
8. **Provenance timing seam (caught in review verification):** the web runner sets `meta.executedWebGitCommitHash` *after* `runClaimBoundaryAnalysis` returns (`internal-runner-queue.ts`), but the telemetry builder runs *inside* the pipeline via `recordOutputQuality`. Naively reading `meta` would persist an empty commit on every job and silently kill deploy comparison. `buildMetricsTelemetryContext` therefore prefers the meta value when present and otherwise resolves the same build hash directly via `getWebGitCommitHash({ useCache: true })` (same process, same source the runner uses). `debateRole` threading to `recordLLMCall` was verified present, so `challengerPhysicalCallCount` works on real persisted metrics.

### Post-implementation code review (2026-06-01)

An independent multi-angle diff review ran after implementation. Result:

- **TS↔C# JSON field contract verified consistent** — every C# `TryGetProperty` read matches a TS-written camelCase field of compatible type; `CreateMetrics` stores raw JSON with no casing transform. The silent-zero risk is cleared.
- **One correctness bug found and fixed:** the C# aggregator's `ReadStatus` ignored `status.error`, so a section that is `available:false` **without** an error (legitimately not-applicable — e.g. the challenger role never ran on early-terminated jobs) was bucketed into `jobsErrored`, misrepresenting not-applicable jobs as telemetry failures. Fixed by reading the error field and adding a distinct `jobsNotApplicable` bucket per section in `sectionAvailability`. Top-level `available:false` still counts as errored (only the catch path produces it, and it always sets `error`).
- **Low-severity notes — all three actioned (2026-06-01):**
  - `extractWarnings` is now the single shared warning-extraction helper; `buildFailureModeMetrics` and `buildQualityHealthMetrics` call it instead of each inlining the same `analysisWarnings ?? warnings` pattern.
  - `verdictDirection.issueCount` (raw occurrences) vs `unresolvedIssueCount` (de-duplicated) now carry a schema doc comment explaining they are on different bases and must not be subtracted.
  - The `/summary` `pipelineTelemetry` aggregate now reports `schemaVersions` (per-window counts of `telemetrySchemaVersion`), closing the measurement side of Open Question #2.

### D5 derivable subcounts shipped (2026-06-01)

The derivable part of the §9 D5 follow-up landed (post-analysis, no pipeline touch):

- `QualityHealthMetrics.d5` (additive) splits what `f4_insufficientClaims` lumps: `insufficientEvidenceClaims`, `insufficientDirectEvidenceClaims`, `applicabilityAssessmentDegradedClaims` (distinct claim IDs across the batch-level `claimIds` arrays) + `applicabilityAssessmentDegradedEvents`, plus direct/non-direct/total directional evidence totals and per-claim `claimDiagnostics`. `f4_*` is unchanged for backward compat.
- `buildD5QualityHealthTelemetry` in `metrics-integration.ts` is self-guarding and marks `status.partial` when an insufficiency warning lacks directional detail or a degraded warning lacks `claimIds`.
- API: `MetricsController.GetQualityHealth` now aggregates `aggregates.d5` (jobsAvailable/Partial/Missing + claim totals + `insufficientEvidenceRate`/`insufficientDirectEvidenceRate`/`applicabilityDegradedRate`, dividing by claims across d5-available jobs only).
- Tests: 5 new cases in `quality-health-metrics.test.ts` (43 metrics-suite tests pass; TS typecheck + C# compile clean). **Deliberately omitted** (not derivable from warnings): `claimsRequiringDirectApplicability` for *sufficient* claims.

### Deferred / open (unchanged by this work)

- Phase 3 admin UI (premature until persisted metrics prove useful, per the plan's own gate).
- **The D5 pipeline-touch remainder:** `roleTruthDeltas` (Stage 4 must persist per-role truth snapshots) and capturing `directApplicabilityRequired` for *sufficient* claims. Both need a Stage 4 change and remain a separate task.
- Evidence-ID compliance placement (Open Question #1).
- **Deploy note:** the API changes only take effect after the API is rebuilt/restarted; the running dev instance must be stopped to relink `FactHarbor.Api.dll`.
