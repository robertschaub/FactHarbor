# Pipeline Telemetry Concept And Plan

**Status:** Reviewed and consolidated plan  
**Created:** 2026-05-28  
**Owner:** open  
**Scope:** ClaimAssessmentBoundary pipeline telemetry only  
**Non-goals:** model-routing changes, D5 behavior changes, warning severity changes, live-job collection, admin UI thresholds

---

## 1. Executive Summary

FactHarbor currently uses `analysisWarnings[]` as the easiest way to observe several pipeline control-flow events. That works for immediate visibility, but it mixes two different concerns:

- **Warnings** communicate notable analysis events to admins or users.
- **Telemetry** measures control-flow behavior so architecture decisions can be made from rates, denominators, and trends.

The consolidated conceptual change is to add narrow first-class `pipelineTelemetry` to persisted `AnalysisMetrics`. It should be computed after analysis from existing structured outputs, not injected into the pipeline as another behavior path.

This keeps warning semantics clean while making the parked routing questions measurable. D5 partition health remains owned by `qualityHealth` for now to avoid duplicating the existing F6 surface.

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
  pipelineCommitShort?: string;
  telemetryComputedAt: string;
}
```

This context supports before/after deploy comparisons and helps aggregation report how many jobs are missing telemetry.

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

- D5 partitioning stays in `qualityHealth.f6_*`; improve that surface separately if the existing aggregate is insufficient.
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

### Phase 4 - Tests And Verification

1. Add focused unit tests for telemetry builder behavior:
   - contract retry and repair warning details;
   - direction issue, rescue, downgrade, claim-ID set joins, and missing claim IDs;
   - zero challenger role-invocation and physical-call denominators;
   - TPM precheck and retry phases;
   - fallback warning without role metadata, which must mark `challengerModelGuard` partial instead of inventing a clean zero;
   - missing or malformed warning details.
2. If API aggregation changes, add parser/controller coverage where practical.
3. Run safe tests/build only. Do not run real-LLM suites without explicit Captain approval.

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

---

## 9. D5 Follow-Up Telemetry

D5 should stay out of Phase 1 `pipelineTelemetry`, but the plan must still define what additional quality-health telemetry is needed before changing D5 behavior.

Owner surface: `qualityHealth.d5` or additive `qualityHealth.f6_*` fields, not `pipelineTelemetry`.

Required fields:

```ts
interface D5QualityHealthTelemetry {
  status: TelemetrySectionStatus;
  partitioningActive: boolean;
  institutionalCount: number;
  generalCount: number;
  totalEvidence: number;
  institutionalGeneralRatio: number | null;
  supportCount: number;
  contradictCount: number;
  neutralCount: number;
  directionalEvidenceTotal: number;
  supportContradictRatio: number | null;
  roleTruthDeltas: {
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
- Support/contradict/neutral counts can come from structured evidence `claimDirection` values already present in result JSON.
- Advocate/challenger/reconciler truth deltas are not fully wired today. They require Stage 4 to persist role-level truth snapshots as metrics-only diagnostics. That is a telemetry-only addition, not a D5 behavior change.
- If role-level snapshots are unavailable, mark `roleTruthDeltas.status` or the parent D5 status as partial rather than returning zero deltas.

Decision thresholds for review packets, not hardcoded UI colors:

| Signal | Threshold | Interpretation |
|---|---|---|
| `partitioningActiveRate < 20%` over a 50+ job current-stack window | D5 rarely activates | D5 structural-bias concern is low practical priority; keep or simplify later |
| `partitioningActiveRate >= 50%` and median `institutionalGeneralRatio > 5:1` | D5 often activates with structurally imbalanced pools | Escalate D5 option B/D review |
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
| Runtime overhead | Low | One in-memory pass over warnings and LLM calls during metrics finalization |
| UI implies thresholds that are not approved | Medium | Show raw read-only values first; put tunable thresholds in UCM if later needed |
| Evidence-ID compliance check becomes behavioral validation | Medium | Keep it as metrics only; never block or alter report output |
| Builder error breaks metrics persistence | Medium | Catch builder errors, log locally, and persist explicit unavailable/partial telemetry status |
| Deploy boundary remains invisible | Medium | Add metrics context with commit/provenance or explicitly mark deploy comparison out of scope |

---

## 11. Open Questions

1. Should evidence-ID compliance be added under `qualityHealth`, or handled as a separate one-release cleanup metric?
2. What exact source should populate `pipelineCommitShort` in local/dev and deployed environments?
3. Should aggregate API output include per-window telemetry schema version counts in addition to `jobsMissingTelemetry` and `jobsWithPartialTelemetry`?
4. Should Phase 1 add `debateRole` to TPM fallback warning details, or derive challenger fallback from structural prompt keys until a broader invocation-id scheme exists?

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

### Rejected

1. Do not keep durable measurement coupled directly to warning-display policy.
2. Do not build a broad event-log subsystem in Phase 1.
3. Do not duplicate D5 partition health inside `pipelineTelemetry` while `qualityHealth.f6_*` already owns that surface.
4. Do not put evidence-ID cleanup inside permanent `pipelineTelemetry`.

### Deferred

1. Improve D5 telemetry through `qualityHealth` if existing F6 aggregation is insufficient.
2. Add evidence-ID compliance as a temporary cleanup metric with a sunset rule.
3. Revisit in-band telemetry events only if real-time monitoring or deeper debug traceability becomes a concrete user need.
4. Add admin UI only after API/persisted metrics prove useful.

### Final Debate Position

The first-class `pipelineTelemetry` concept is worth keeping, but only as a compact measurement layer for routing-related control-flow counters. The implementation should not become a general event system, a warning replacement, or a home for every temporary cleanup metric.

The first useful increment is a unit-tested post-analysis builder plus API aggregation over existing metrics JSON. That gives durable cross-job rates and denominators without changing ClaimAssessmentBoundary behavior.
