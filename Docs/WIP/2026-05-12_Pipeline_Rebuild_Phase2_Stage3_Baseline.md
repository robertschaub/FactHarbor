# Pipeline Rebuild Phase 2 Stage 3 Baseline

**Date:** 2026-05-12  
**Status:** Phase 2 factual baseline checkpoint, read-only  
**Owner role:** Lead Architect  
**Worktree:** `C:\DEV\FactHarbor-pipeline-rebuild-spec`  
**Branch:** `codex/pipeline-rebuild-spec`

---

## 1. Purpose

This document reverse-engineers the current Stage 3 boundary-formation behavior of the ClaimAssessmentBoundary pipeline. It is factual baseline material for the later redesign. It is not a target architecture and does not approve implementation cleanup.

No analyzer source, prompt, config, API, UI, tests, live jobs, or validation behavior was changed or run for this baseline.

## 2. Source Scope

Primary files:

- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
- `apps/web/src/lib/analyzer/boundary-clustering-stage.ts`
- `apps/web/src/lib/analyzer/scope-normalization.ts`
- `apps/web/src/lib/analyzer/research-extraction-stage.ts`
- `apps/web/src/lib/analyzer/research-orchestrator.ts`
- `apps/web/src/lib/analyzer/verdict-stage.ts`
- `apps/web/src/lib/analyzer/aggregation-stage.ts`
- `apps/web/src/lib/analyzer/types.ts`
- `apps/web/src/lib/analyzer/warning-display.ts`
- `apps/web/src/lib/analyzer/metrics-integration.ts`
- `apps/web/src/app/jobs/[id]/page.tsx`
- `apps/web/src/app/jobs/[id]/components/BoundaryFindings.tsx`
- `apps/web/src/app/jobs/[id]/utils/generateHtmlReport.ts`
- `apps/web/prompts/claimboundary.prompt.md`
- `apps/web/configs/pipeline.default.json`
- `apps/web/src/lib/config-schemas.ts`
- `apps/web/src/lib/analyzer/model-resolver.ts`

Relevant tests:

- `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`
- `apps/web/test/unit/lib/scope-normalization.test.ts`
- `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts`
- `apps/web/test/unit/lib/analyzer/llm-routing.test.ts`
- `apps/web/test/unit/lib/config-drift.test.ts`
- `apps/web/test/unit/lib/claim-boundary-display.test.ts`
- `apps/web/test/integration/claimboundary-integration.test.ts`
- `apps/web/test/integration/hydrogen-smoke.test.ts`

Specialist read-only baselines used:

- Stage 3 mechanics: `019e1e2e-b8db-7a82-8b6f-1898aa3b8d86`
- Stage 3 prompt/model/schema: `019e1e2e-b933-7ee1-961f-2de2d01bdfd9`
- Stage 3 compatibility/observability: `019e1e2e-b998-7392-bb22-fd101f875289`

## 3. Current Stage 3 Boundary

Stage 3 starts after Stage 2 research, contrarian retrieval, evidence applicability assessment, and post-applicability evidence balance recomputation.

The primary Stage 3 entry point is `clusterBoundaries(state)` from `runClaimBoundaryAnalysis`.

Stage 3 currently owns:

1. Unique `EvidenceScope` collection from admitted `EvidenceItem`s.
2. Optional LLM scope normalization.
3. LLM boundary clustering.
4. Fallback boundary creation.
5. Boundary count capping.
6. In-place `EvidenceItem.claimBoundaryId` assignment.
7. Boundary evidence counts.
8. Boundary concentration warning emission.
9. Coverage-matrix construction helper used by Stage 4 and final report packaging.

Immediately after Stage 3, the pipeline finalizes claim-acquisition telemetry, runs D5 evidence sufficiency, then builds the Stage 4 coverage matrix from sufficient claims, boundaries, and boundary-assigned evidence.

## 4. State And Data Contracts

Core Stage 3 contracts:

- `EvidenceScope`: `name`, `methodology`, `boundaries`, `geographic`, `temporal`, `sourceType`, `analyticalDimension`, and `additionalDimensions`.
- `EvidenceItem.claimBoundaryId`: optional before Stage 3, assigned in-place by Stage 3.
- `ClaimAssessmentBoundary`: `id`, `name`, `shortName`, `description`, optional `methodology`, optional `boundaries`, optional `geographic`, optional `temporal`, `constituentScopes`, `internalCoherence`, and `evidenceCount`.
- `CoverageMatrix`: `claims`, `boundaries`, `counts`, plus runtime helper methods `getBoundariesForClaim` and `getClaimsForBoundary`.

Persistence caveat:

- Result JSON persists the coverage matrix arrays, not runtime methods. UI/export/persisted consumers must rely on arrays and rebuild helper behavior if needed.

Result JSON currently persists Stage 3 outputs through:

- `meta.boundaryCount`
- `claimBoundaries`
- `coverageMatrix`
- `evidenceItems[].claimBoundaryId`
- `claimAcquisitionLedger`
- `qualityGates`
- `analysisWarnings`

## 5. Current Stage 3 Sequence

Current sequence inside `clusterBoundaries`:

1. Load pipeline config through UCM.
2. Collect unique scopes by `scopeFingerprint`.
3. If there are zero or one unique scopes, create fallback `CB_GENERAL` and finalize.
4. If `scopeNormalizationEnabled` and unique scope count is at least `scopeNormalizationMinScopes`, run `normalizeScopeEquivalence`.
5. If normalization merges scopes, repoint evidence items to canonical scope objects.
6. Run `runLLMClustering` with effective scopes, evidence items, AtomicClaims, config, and current date.
7. Validate structured LLM output.
8. Map LLM `constituentScopeIndices` to `ClaimAssessmentBoundary.constituentScopes`.
9. Log low internal coherence when below `boundaryCoherenceMinimum`.
10. Filter invalid boundaries with missing ID/name/scopes.
11. Deduplicate duplicate boundary IDs by appending a timestamp.
12. Assign orphaned scopes to `CB_GENERAL`.
13. Enforce `maxClaimBoundaries` by repeatedly merging closest boundaries.
14. Assign evidence items to boundaries by scope fingerprint.
15. Calculate per-boundary evidence counts.
16. Drop zero-evidence boundaries.
17. Emit informational `boundary_evidence_concentration` if one non-empty boundary dominates evidence share.

Fallbacks:

- Zero or one unique scope: `CB_GENERAL`.
- LLM clustering failure: `CB_GENERAL`.
- All boundaries invalid after filtering: `CB_GENERAL`.
- Unmatched evidence in one-boundary runs: sole boundary.
- Unmatched evidence in multi-boundary runs: existing `CB_GENERAL` or new `CB_GENERAL_UNSCOPED`.

## 6. Scope Normalization

`normalizeScopeEquivalence` renders `SCOPE_NORMALIZATION` and uses the `understand` model task.

Purpose:

- Detect semantically equivalent EvidenceScopes that differ by wording, abbreviation, date notation, or synonymous methodology wording.
- Merge only when scopes describe the same analytical window.
- Fail open to identity mapping when prompt load, LLM call, structured output, or validation fails.

Schema:

- `equivalenceGroups[].scopeIndices`
- `equivalenceGroups[].canonicalIndex`
- `equivalenceGroups[].rationale`

Structural validation enforces:

- every input scope appears exactly once
- no duplicate scope membership
- no out-of-range indices
- canonical index belongs to the group

Important baseline mismatch:

- The prompt says each scope can include `analyticalDimension`.
- Runtime sends `methodology`, `temporal`, `geographic`, `boundaries`, and `additionalDimensions`, but not `analyticalDimension`.

## 7. Boundary Clustering

`runLLMClustering` renders `BOUNDARY_CLUSTERING` and uses the `verdict` model task.

Inputs:

- `evidenceScopes`
- `evidenceItems`
- `atomicClaims`
- `currentDate` is passed by code but not referenced by the current prompt section.

Schema:

- `claimBoundaries`
- `scopeToBoundaryMapping`
- `congruenceDecisions`

Runtime consumption:

- `claimBoundaries` drives the persisted boundary list.
- `scopeToBoundaryMapping` and `congruenceDecisions` are schema-validated but not persisted or used downstream.

The prompt asks the LLM to group scopes by methodological congruence, with special attention to analytical dimensions, system-boundary windows, normalization/denomination differences, and cases where contradictory evidence is factual rather than methodological.

## 8. Prompt, Model, And Config Baseline

Stage 3 prompt sections:

| Section | Runtime | Model task | Purpose |
|---|---|---|---|
| `SCOPE_NORMALIZATION` | `scope-normalization.ts` | `understand` | Deduplicate semantically equivalent EvidenceScopes. |
| `BOUNDARY_CLUSTERING` | `boundary-clustering-stage.ts` | `verdict` | Group EvidenceScopes into ClaimAssessmentBoundaries. |

Default model/config:

- `modelUnderstand: "budget"` for scope normalization.
- `modelVerdict: "standard"` for boundary clustering.
- Default provider/model resolution currently routes these through `model-resolver.ts`.
- `scopeNormalizationTemperature: 0.0`.
- `boundaryClusteringTemperature: 0.05`.
- `maxClaimBoundaries: 6`.
- `boundaryCoherenceMinimum: 0.3`.
- `scopeNormalizationEnabled: true`.
- `scopeNormalizationMinScopes: 5`.
- `boundaryEvidenceConcentrationWarningThreshold: 0.8`.

Gaps:

- No Stage 3-specific LLM timeout knob was found.
- Stage 3 `generateText` calls do not pass a timeout or abort signal.
- Prompt-render contract coverage for `SCOPE_NORMALIZATION` and `BOUNDARY_CLUSTERING` is weaker than for Stage 2 and Stage 4 sections.

## 9. Downstream Dependencies

Stage 4 depends on Stage 3:

- `claimBoundaries` are sent into verdict prompt context.
- `coverageMatrix.claims`, `coverageMatrix.boundaries`, and `coverageMatrix.counts` are sent into verdict context.
- `EvidenceItem.claimBoundaryId` is used to group evidence by boundary.
- Hallucinated or invalid boundary findings are filtered against the coverage matrix.
- Boundary findings can be recomputed after verdict repair from coverage-matrix membership and evidence `claimBoundaryId`.

Stage 5 depends on Stage 3:

- Aggregation computes triangulation from coverage matrix and `boundaryFindings`.
- Truth-percentage range widening can use boundary variance.

Report/UI/export dependencies:

- Job page uses `claimBoundaries`, `coverageMatrix`, `boundaryFindings`, and `evidenceItems[].claimBoundaryId` for boundary matrix, boundary directory, claim cards, evidence links, and navigation.
- `BoundaryFindings` assumes matched boundaries have `constituentScopes`.
- HTML export consumes boundaries, coverage matrix, boundary findings, and evidence `claimBoundaryId`.
- Metrics topic derivation uses the first boundary `shortName` or `name`, so boundary naming affects quality metrics grouping.

API persistence:

- API stores the result JSON blob and extracts only top-level truth/confidence for job-list fields.
- Stage 3 compatibility therefore mainly lives in the JSON shape, UI readers, report exports, and tests.

## 10. Observability And Warnings

Stage 3 observability surfaces:

- `state.llmCalls`
- job events for clustering and scope normalization
- LLM metrics with `taskType: "cluster"`
- `meta.boundaryCount`
- boundary `evidenceCount`
- `coverageMatrix`
- `claimAcquisitionLedger` boundary distribution, final boundary count, and maximum boundary share

Current missing observability:

- No persisted Stage 3 clustering trace.
- No persisted `scopeToBoundaryMapping` or `congruenceDecisions` rationales.
- No structured warning for scope-normalization failure, LLM clustering fallback, or low internal coherence.

Structured Stage 3 warning:

- `boundary_evidence_concentration`, severity `info`, emitted when a dominant non-empty boundary exceeds the configured evidence-share threshold.
- Warning display classifies it as informational/admin diagnostic, not user-degrading.
- Markdown report omits it because the markdown report only includes raw `warning` and `error` severities.

## 11. Multilingual And Input Neutrality

Current mechanisms:

- `SCOPE_NORMALIZATION` instructs the LLM to work in the original language and not translate or normalize language before comparing.
- `BOUNDARY_CLUSTERING` instructs the LLM not to assume any particular language.
- Boundary clustering uses scope text generated upstream, so multilingual robustness depends heavily on Stage 2 evidence-scope extraction quality.

Current gaps:

- No Stage 3-specific multilingual behavior test was found.
- No safe unit test verifies that scope normalization preserves meaning across multilingual surface wording.
- Exact-string fingerprinting lowercases/trims strings but otherwise does not provide multilingual semantic equivalence unless the LLM normalization path runs.

## 12. Deterministic Semantic Hotspots To Review

These are not design decisions yet. They are baseline risks for Phase 3/4:

- `scopeFingerprint` deterministically lowercases/trims meaningful scope fields and drives dedupe, assignment, orphan detection, Jaccard merge, and coverage assignment.
- `scopeFingerprint` ignores `name`, `sourceType`, and `additionalDimensions`, even though prompts say `additionalDimensions` can affect congruence.
- Scope normalization is skipped below `scopeNormalizationMinScopes`, so small evidence sets remain exact-string grouped.
- Scope normalization prompt expects `analyticalDimension`, but runtime omits it.
- Evidence assignment maps boundaries by fingerprint only.
- `mergeClosestBoundaries` enforces `maxClaimBoundaries` by Jaccard similarity over fingerprints; disjoint ties fall to first encountered pair.
- Low `internalCoherence` logs only and does not influence structured warning or downstream gating.
- Stage 3 LLM fallback collapses to a single general boundary without a structured quality warning.
- Upstream `assessScopeQuality` uses deterministic completeness/vague-string checks, while Stage 3 does not consume `scopeQuality`.

Under repository rules, V2 should not create new deterministic text-analysis decision logic. Retained deterministic mechanisms must be justified as structural plumbing or replaced by LLM intelligence.

## 13. Test Coverage

Covered:

- `collectUniqueScopes` deduplication and skipped unscoped items.
- fallback `CB_GENERAL`.
- evidence assignment, including `CB_GENERAL_UNSCOPED`.
- boundary Jaccard similarity.
- max-boundary merge behavior.
- LLM clustering parse, missing prompt, zero boundaries, coherence clamp, and temperature.
- clustering fallback.
- boundary concentration warning.
- coverage matrix dimensions, counts, unknown IDs, and lookup behavior.
- scope normalization structural validation and evidence repointing.
- some downstream verdict behaviors around invalid boundary IDs, ghost-boundary stripping, boundary variance widening, and grounding validation boundary IDs.
- config drift and model routing.

Known gaps:

- No prompt contract test for `SCOPE_NORMALIZATION` or `BOUNDARY_CLUSTERING`.
- No test that `analyticalDimension` reaches scope normalization.
- No test that `additionalDimensions` survive unique-scope dedupe behavior.
- No enforcement test for complete `scopeToBoundaryMapping` or pairwise `congruenceDecisions`.
- No focused tests for job-detail UI boundary rendering, `BoundaryFindings`, `QualityGatesPanel`, or API persistence/retrieval of CB result JSON.
- Static HTML export appears stale around quality-gate field names: export expects `qualityGates.gate1`, `qualityGates.gate4`, and `qualityGates.allPassed`, while current types/builders expose `passed`, `gate1Stats`, `gate4Stats`, and `summary`.
- Existing CB integration tests are intentionally skipped/excluded as expensive.
- A hydrogen smoke integration input uses wording that does not match the current Captain-defined exact input list.

## 14. Current Protective Mechanism Registry

| Mechanism | Current purpose | Downstream dependency | Replacement verifier placeholder |
|---|---|---|---|
| Scope fingerprinting | Create stable scope identity for dedupe/assignment | Boundary assignment, coverage matrix | Scope/assignment tests and semantic hotspot review |
| LLM scope normalization | Merge semantically equivalent scope wordings | Boundary count, evidence assignment | Scope-normalization tests and multilingual checks |
| Fallback `CB_GENERAL` | Preserve runnable pipeline when scope/LLM clustering fails | Stage 4 verdict can continue | Fallback tests and report degradation checks |
| LLM boundary clustering | Create evidence-emergent ClaimAssessmentBoundaries | Verdict boundary findings, triangulation, report UI | Boundary clustering prompt/schema tests and comparator reports |
| Boundary validity filtering | Remove unusable LLM boundaries | Assignment safety | Cluster integration tests |
| Orphan-scope general boundary | Avoid dropped scopes from partial LLM assignment | Evidence coverage and verdict context | Assignment tests |
| Max-boundary merge | Keep report and verdict context bounded | Runtime, UI readability, Stage 4 prompt size | Max-boundary tests and benchmark quality checks |
| Evidence boundary assignment | Attach evidence to analytical lens | Coverage matrix, verdict citations, UI evidence links | Assignment and coverage matrix tests |
| Boundary concentration warning | Flag diagnostic evidence concentration | Admin/report QA | Warning-display tests |
| Coverage matrix | Connect claims, boundaries, and evidence counts | Stage 4, Stage 5, report UI | Coverage matrix and verdict-stage tests |
| Claim-acquisition boundary telemetry | Measure per-claim evidence concentration | ACS/research waste observability | Ledger/observability tests |

## 15. Open Questions For Later Phases

These should not be decided inside the baseline:

- Should V2 keep scope normalization as a separate Stage 2.5/Stage 3 substep, or fold it into a single boundary-formation service?
- Should boundary formation persist LLM rationales for `scopeToBoundaryMapping` and `congruenceDecisions`?
- Should fallback-to-general-boundary produce a structured warning when it materially affects report quality?
- Which fingerprint-based behaviors are acceptable structural plumbing, and which should move behind LLM semantic decisions?
- Should `analyticalDimension` and `additionalDimensions` become first-class normalized scope fields in V2 contracts?
- Should Stage 3 own D5 sufficiency or remain strictly boundary formation with D5 as a separate gate?
- What compatibility layer is needed if V2 simplifies `CoverageMatrix` or boundary result shapes?
- Should old persisted reports be read through a V1 compatibility adapter instead of forcing V2 internal contracts to preserve V1 shapes?

Deputy-team escalation is not needed for this baseline because no product/API/UI/report compatibility exception, validation spend, or target architecture decision was made.
