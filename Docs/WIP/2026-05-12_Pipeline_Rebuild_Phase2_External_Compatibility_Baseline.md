# Pipeline Rebuild Phase 2 External Compatibility Baseline

**Date:** 2026-05-12
**Status:** Phase 2 factual baseline checkpoint, read-only
**Owner role:** Lead Architect
**Workspace:** `C:\DEV\FactHarbor`
**Git branch:** `main`

---

## 1. Purpose

This document reverse-engineers the externally visible contracts around the current ClaimAssessmentBoundary pipeline: persistence, API, runner, ACS, UI, markdown, static HTML export, validation, calibration, metrics, warnings, and quality gates. It is factual baseline material for later redesign and does not approve compatibility or UI changes.

No analyzer source, prompt, config, API, UI, tests, live jobs, or validation behavior was changed or run for this baseline.

## 2. Source Scope

Primary files:

- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
- `apps/web/src/lib/analyzer/types.ts`
- `apps/web/src/lib/internal-runner-queue.ts`
- `apps/web/src/app/api/internal/run-job/route.ts`
- `apps/web/src/app/api/internal/run-claim-selection-draft/route.ts`
- `apps/web/src/app/jobs/[id]/page.tsx`
- `apps/web/src/app/jobs/[id]/utils/generateHtmlReport.ts`
- `apps/web/src/components/FallbackReport.tsx`
- `apps/web/src/components/QualityGatesPanel.tsx`
- `apps/web/src/lib/analyzer/warning-display.ts`
- `apps/web/src/lib/analyzer/metrics.ts`
- `apps/web/src/lib/analyzer/metrics-integration.ts`
- `apps/web/src/lib/calibration/runner.ts`
- `scripts/validation/extract-validation-summary.js`
- `scripts/run-validation-matrix.js`
- `apps/web/scripts/baseline-runner.js`
- `apps/api/Data/Entities.cs`
- `apps/api/Services/JobService.cs`
- `apps/api/Services/ClaimSelectionDraftService.cs`
- `apps/api/Controllers/JobsController.cs`
- `apps/api/Controllers/InternalJobsController.cs`
- `apps/api/Controllers/ClaimSelectionDraftsController.cs`
- `apps/api/Controllers/MetricsController.cs`

Relevant tests:

- `apps/web/test/integration/claimboundary-integration.test.ts`
- `apps/web/test/unit/lib/analyzer/warning-display.test.ts`
- `apps/web/test/unit/lib/analyzer/metrics-integration.test.ts`
- `apps/web/test/unit/lib/calibration-runner.test.ts`
- `apps/web/test/unit/lib/claim-selection-client.test.ts`
- `apps/web/test/unit/lib/internal-runner-queue.test.ts`
- `apps/api.Tests/Services/JobServiceTests.cs`

Specialist read-only baseline used:

- External compatibility review: `019e1e53-0772-7a90-8df1-348acda71c8c`

## 3. Canonical Result Contract

The runner stores exactly:

- `resultJson`
- `reportMarkdown`

through the internal API. `resultJson` is the machine contract. `reportMarkdown` is the human markdown artifact.

The current canonical CB result shape is:

- `_schemaVersion: "3.2.0-cb"`;
- `meta.schemaVersion: "3.2.0-cb"`;
- `meta.pipeline: "claimboundary"`;
- top-level `truthPercentage`;
- top-level `verdict`;
- top-level `confidence`;
- optional `truthPercentageRange`;
- `verdictNarrative`;
- optional `articleAdjudication`;
- optional `adjudicationPath`;
- `claimBoundaries`;
- `claimVerdicts`;
- `coverageMatrix`;
- `understanding`;
- `evidenceItems`;
- `sources`;
- `citedSources`;
- `searchQueries`;
- `claimAcquisitionLedger`;
- optional `analysisObservability`;
- `qualityGates`;
- `analysisWarnings`.

This shape is partially locked by CB integration tests. It is not fully locked for API list/detail serialization, static HTML export, validation scripts, or metrics dashboards.

## 4. Persistence And Public API Contract

`JobEntity` persists:

- lifecycle/status/progress;
- input type/value/preview;
- pipeline variant;
- invite/visibility fields;
- retry lineage and commit hashes;
- ACS fields: `ClaimSelectionDraftId`, `SubmissionPath`, `PreparedStage1Json`, `ClaimSelectionJson`;
- `ResultJson`;
- `ReportMarkdown`;
- extracted quick fields: `VerdictLabel`, `TruthPercentage`, `Confidence`.

API behavior:

- public list exposes summary fields and primary analysis issue;
- public detail exposes `inputValue`, `resultJson`, and `reportMarkdown`;
- admin detail adds prepared ACS JSON and commit/prompt diagnostics;
- hidden jobs are admin-only.

Known drift:

- `JobService.StoreResultAsync` derives `VerdictLabel` from numeric truth/confidence and ignores top-level `result.verdict`;
- quick-field extraction truncates numeric truth/confidence;
- `MapPercentageToVerdict` has hardcoded thresholds that must align with web `truth-scale.ts`;
- `JobsController.ExtractPrimaryAnalysisIssue` only recognizes `analysis_generation_failed`.

Redesign implication: external API should treat top-level `result.verdict` as authoritative once the new result contract is locked. Derived labels should be backward compatibility fallbacks, not primary interpretation.

## 5. Runner Contract

The public API triggers the web runner, which immediately ACKs and processes jobs in the background.

Current runner behavior:

- fetches job details from API;
- parses optional `PreparedStage1Json`;
- parses optional `ClaimSelectionJson`;
- validates draft-backed selections before running;
- calls `runClaimBoundaryAnalysis`;
- stores `{ resultJson, reportMarkdown }`;
- records executed web git hash in result metadata;
- guards against late `SUCCEEDED` overwrite after terminal failure/cancel;
- records provider health/circuit-breaker outcomes based on warnings and errors.

Runner/route compatibility surfaces:

- `/api/internal/run-job`;
- `/api/internal/run-claim-selection-draft`;
- admin/internal auth keys;
- job events/progress messages;
- heartbeat behavior for long-running jobs.

The new pipeline must preserve runner inputs and outputs until a deliberate migration is approved.

## 6. ACS Compatibility Contract

ACS is not optional plumbing; it is an external workflow contract.

Draft persistence:

- `ClaimSelectionDraftEntity` stores draft status, active/original input, selection mode, draft state JSON, token hash, final job ID, restart state, expiry, and hidden state.

Draft flow:

- create draft;
- prepare Stage 1 candidate claims;
- get draft state;
- update selection state;
- confirm selected claims;
- optionally restart/cancel/hide/retry;
- create queued job with `PreparedStage1Json` and `ClaimSelectionJson`.

Typed analyzer contracts:

- `PreparedStage1Snapshot`;
- `ClaimSelectionDraftState`;
- `ClaimSelectionMetadata`;
- selected claim IDs must exist in prepared candidate claims;
- selected count must fit structural/admission cap;
- runner revalidates these constraints before analysis.

The rebuild cannot simply replace Stage 1 without preserving the prepared snapshot shape or providing a versioned adapter.

## 7. UI, Markdown, And Static Export Contract

Job page behavior:

- detects CB schema via `_schemaVersion`, `meta.schemaVersion`, or `meta.pipeline`;
- still carries legacy adapters for `twoPanelSummary`, `articleAnalysis`, `verdictSummary`, `analysisContexts`, `citations`, and `monolithic_dynamic`;
- CB verdict display derives label from truth/confidence rather than using top-level `result.verdict`;
- quality/warning section uses `FallbackReport` and `QualityGatesPanel`;
- markdown display uses the stored `reportMarkdown`;
- admin/public markdown split assumes `\n## Technical Notes` as marker.

Markdown report behavior:

- produced by `formatClaimBoundaryReportMarkdown`;
- includes overall verdict, AtomicClaims, quality signals, evidence/sources, and technical notes;
- filters warnings by raw `severity === "warning" || "error"`, not by the display registry.

Static HTML export behavior:

- generated client-side from `resultJson`, not from stored markdown;
- consumes claim verdicts, boundaries, evidence, report sources, search queries, TIGER, and quality gates;
- expects stale `result.overallVerdict`;
- expects stale quality-gate shape (`allPassed`, `gate1`, `gate4`);
- does not include an `analysisWarnings` section;
- has its own truth/verdict helper thresholds.

The UI should not change unless there is a clear need, but the replacement spec must define the compatibility adapter so the current UI can keep working while internals change.

## 8. Warning And Quality Gate Contract

Warning severity values:

- `info`;
- `warning`;
- `error`.

Policy mapping:

- `silent` means no warning emitted;
- `severe` is represented by `error` plus damaged-report semantics.

Display registry:

- every `AnalysisWarningType` must be classified in `warning-display.ts`;
- degrading warnings display at least as `warning`;
- informational warnings display as `info`;
- `FallbackReport` uses this registry.

Quality gates:

- current UI expects `qualityGates` with `{ passed, gate1Stats, gate4Stats, summary }`;
- `QualityGatesPanel` consumes the current shape;
- static HTML export expects an older shape.

Known duplication:

- markdown uses raw severity;
- static HTML omits warnings;
- metrics has separate warning-severity classifications;
- API issue extraction recognizes one warning type.

The redesign should make `warning-display.ts` or an equivalent shared classifier the canonical display contract for UI, markdown, export, API summaries, and metrics.

## 9. Validation, Calibration, And Metrics Contract

Validation summary scripts expect:

- top-level truth/confidence/verdict;
- `claimVerdicts`;
- `understanding.atomicClaims`;
- `analysisWarnings`;
- `qualityGates.gate1Stats`;
- `qualityGates.gate4Stats`;
- `qualityGates.summary`;
- ACS observability.

Calibration runner expects:

- top-level truth/confidence/verdict;
- `claimVerdicts`;
- `evidenceItems.claimDirection`;
- `sources.url`;
- `qualityGates`;
- `analysisWarnings`;
- `meta.llmCalls`;
- model metadata.

Metrics surfaces expect:

- full metrics JSON;
- schema compliance;
- Gate 1 and Gate 4 stats;
- failure modes;
- quality health.

Known stale adapters:

- validation summary tries `atomicClaim.claim`/`text`, while canonical AtomicClaim uses `statement`;
- older validation/baseline scripts still read `verdictSummary` or `articleVerdict/articleTruthPercentage`;
- MetricsController reads older top-level `gate1Stats`/`gate4Stats` in some paths;
- HTML and API thresholds are duplicated.

The replacement spec must decide whether these scripts are first-class compatibility surfaces or retired migration artifacts.

## 10. Known Stale Or Duplicated Adapters

| Adapter | Current issue | Redesign handling |
|---|---|---|
| API quick verdict extraction | derives label from truth/confidence, ignores top-level verdict | Prefer canonical `result.verdict`; keep legacy fallback |
| Job page CB verdict | derives label from truth/confidence | Prefer canonical `result.verdict`; keep display helper only for legacy |
| Static HTML verdict | reads `overallVerdict` or first claim | Update adapter or provide compatibility field |
| Static HTML quality gates | expects old gate shape | Update adapter or provide compatibility field |
| Static HTML warnings | omits `analysisWarnings` | Add warning adapter if export remains supported |
| Markdown warnings | raw severity only | Use warning display registry |
| API primary issue | only `analysis_generation_failed` | Use shared warning classifier / primary issue policy |
| Metrics warning logic | separate warning classification | Reconcile with warning-display policy or document telemetry-only difference |
| Validation summary claim text | reads `claim`/`text`, not `statement` | Update adapter or compatibility alias |
| Older validation scripts | legacy result fields | Retire or adapter-test |
| Truth thresholds | duplicated across web/API/export/comments | Single canonical truth-scale contract |

## 11. Test Coverage And Gaps

Existing coverage:

- CB integration tests lock parts of the `3.2.0-cb` shape;
- warning display has unit tests;
- metrics integration has unit tests;
- ACS flow/client/runner pieces have partial tests;
- JobService tests cover ignored result store after terminal status.

Known gaps:

- no public API list/detail serialization test for canonical CB results;
- no JobService success-path test for top-level `result.verdict`, decimal truth/confidence, and legacy fallback parity;
- no static HTML export test for current CB result shape;
- no test ensuring markdown/export warning visibility matches the display registry;
- no end-to-end ACS contract test from prepared draft to persisted job fields to runner reuse to public result;
- no MetricsController parsing test for current CB `qualityGates` shape;
- no validation-summary adapter test for `AtomicClaim.statement`.

## 12. Baseline Conclusion

The current pipeline has one reasonably clear machine result contract but too many downstream reinterpretations. The new architecture should preserve UI behavior by default, not by allowing every consumer to keep guessing the result shape.

The compatibility target should be:

1. one versioned result JSON contract;
2. one canonical truth/verdict/quality-gate/warning interpretation;
3. thin adapters for API list/detail, job UI, markdown, static HTML export, calibration, validation, and metrics;
4. explicit ACS snapshot and selection metadata compatibility;
5. tests that lock each public adapter.

The replacement pipeline can be simpler internally only if the external contract boundary is stricter than the current one.
