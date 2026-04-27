---
### 2026-04-27 | Senior Developer | Codex (GPT-5) | ACS Research Waste Slices 1-2 Implementation
**Task:** Implement the approved first branch of the SVP ACS research-waste plan: shadow observability for selected-vs-dropped preliminary work plus Stage 2 contradiction admission protection.

**Files touched:**
- `apps/web/src/lib/analyzer/url-normalization.ts`
- `apps/web/src/lib/analyzer/research-waste-metrics.ts`
- `apps/web/src/lib/analyzer/evidence-deduplication.ts`
- `apps/web/src/lib/analyzer/claim-extraction-stage.ts`
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
- `apps/web/src/lib/analyzer/research-orchestrator.ts`
- `apps/web/src/lib/analyzer/types.ts`
- `apps/web/src/lib/config-schemas.ts`
- `apps/web/configs/pipeline.default.json`
- `apps/web/test/unit/lib/analyzer/url-normalization.test.ts`
- `apps/web/test/unit/lib/analyzer/research-contradiction-admission.test.ts`
- `apps/web/test/unit/lib/analyzer/claimboundary-prepared-stage1.test.ts`
- `apps/web/test/unit/lib/config-schemas.test.ts`
- `Docs/AGENTS/Role_Learnings.md`

**Key decisions:**
- Extracted shared structural URL normalization into `normalizeUrlForEvidence(...)`; `EvidenceDeduplicator.normalizeUrl(...)` now delegates to it, preserving tracking-param removal while adding trailing-slash normalization and keeping non-tracking query params.
- Added diagnostic-only `researchWasteMetrics` on prepared Stage 1 snapshots and final-job `analysisObservability.acsResearchWaste`. `preparedCandidateCount` is derived from existing `ClaimSelectionStage1Observability.candidateClaimCount` when available, so the Stage 1 field remains authoritative and the final-job metric is a waste-analysis copy.
- Added selected/dropped/unmapped preliminary attribution by stable claim IDs, Stage 1 to Stage 2 normalized URL overlap, selected-claim Stage 2 cost metrics, and contradiction reachability metrics.
- Added UCM fields `contradictionAdmissionEnabled` and `contradictionProtectedTimeMs`. Stage 2 now uses the concrete formula `elapsedMs + contradictionProtectedTimeMs > researchTimeBudgetMs` to transition from main research to contradiction before protected time is consumed.
- Self-review correction: `contradictionAdmissionEnabled=false` now disables only the protected-time admission guard. It does not disable the existing reserved contradiction loop; a regression test covers this.

**Open items:**
- No live SVP rerun was submitted. Live validation requires commit plus runtime/config refresh under the repository discipline.
- Source artifact reuse, ACS budget-aware recommendation behavior, and Stage 1 two-lane redesign remain gated later slices, not implemented here.
- The overlap metric intentionally persists overlap URLs, not full dropped-source text or reusable artifacts.

**Warnings:**
- `analysisObservability.acsResearchWaste` is diagnostic-only; it must not affect claim selection, evidence admission, verdicts, or warning severity.
- The source-family classifier is structural (MIME/extension/category string), not semantic source reliability or source type.
- Contradiction admission protects a fixed wall-clock window; it does not estimate the duration of the next network iteration.

**For next agent:**
- Start with `research-waste-metrics.ts` and the final JSON field `analysisObservability.acsResearchWaste` when inspecting whether ACS preparation work is being wasted.
- For Stage 2 behavior, inspect `researchEvidence(...)` in `research-orchestrator.ts`; the admission guard sits before main-loop iteration targeting, while the existing contradiction loop remains after main research.
- Before promoting later slices, collect real overlap/reuse data from completed jobs; do not add source artifact reuse or ACS prompt/config changes from this branch alone.

**Learnings:** Appended to `Docs/AGENTS/Role_Learnings.md`: admission/protection flags must preserve the existing loop they guard unless the plan explicitly authorizes disabling that mechanism.

```
DEBT-GUARD RESULT
Classification: missing-capability plus incomplete-existing-mechanism.
Chosen option: add narrowly scoped observability where no selected-vs-dropped ACS waste metric existed, and amend existing Stage 2 budget management in place for contradiction admission.
Rejected path and why: rejected source artifact reuse, ACS prompt/config tuning, and Stage 1 redesign because the approved first branch was instrumentation plus contradiction reachability, and those later mechanisms need evidence from the new metrics first.
What was removed/simplified: duplicated URL normalization logic was removed from EvidenceDeduplicator and replaced by a shared normalizer; the self-review-only mistaken disabled-admission loop gate was removed before final validation.
What was added: researchWasteMetrics types/helpers, final-job analysis observability, prepared snapshot metric hydration, contradiction protected-time UCM fields, contradiction reachability telemetry, and focused tests.
Net mechanism count: increases, justified as missing diagnostic capability plus a bounded admission guard using existing Stage 2 loop structure.
Budget reconciliation: stayed within approved Slices 1-2; no source persistence/reuse, no prompt changes, no live jobs, no expensive tests.
Verification: `npm -w apps/web test -- test/unit/lib/analyzer/url-normalization.test.ts test/unit/lib/analyzer/research-contradiction-admission.test.ts test/unit/lib/analyzer/claimboundary-prepared-stage1.test.ts test/unit/lib/config-drift.test.ts test/unit/lib/config-schemas.test.ts`; `npm -w apps/web test -- test/unit/lib/analyzer/claim-extraction-preliminary-search-dedupe.test.ts test/unit/lib/analyzer/research-orchestrator.test.ts test/unit/lib/analyzer/research-orchestrator-progress.test.ts test/unit/lib/analyzer/primary-source-refinement.test.ts test/unit/lib/analyzer/claimboundary-pipeline.test.ts`; `npm -w apps/web run build`; `npm test`; `git diff --check`.
Debt accepted and removal trigger: diagnostic URL overlap stores normalized overlap URLs only; revisit if metrics prove source reuse should be designed.
Residual debt: later gates still need real run data before artifact reuse or ACS budget-aware behavior is safe to implement.
```
