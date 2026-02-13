# Report Issues Review and Fix Plan (2026-02-13)

## Scope
- Inputs reviewed:
  - Direction Semantics deep dive: `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/Deep Dive/Direction Semantics/WebHome.xwiki`
  - Report/job `5ccd80a70b16482297fe483b8d53ddeb` (federal-government corroboration claim)
  - Report/job `2cf7906206c740a9b1abec24758d419c` (Bolsonaro German input)
  - z-ai proposed plan (included in request)
- Runtime evidence used:
  - `apps/api/factharbor.db` (`Jobs`, `JobEvents`)
  - Current pipeline code under `apps/web/src/lib/analyzer/`

## Current Pipeline Snapshot
- Stage flow is intact and sequential: Understand -> Research -> Verdict -> Summary/Report.
- Direction validation is LLM-based and warning-only (`autoCorrect: false`): `apps/web/src/lib/analyzer/orchestrated.ts`.
- Grounding check is LLM-adjudicated but still hard-penalizes "reasoning with no cited evidence": `apps/web/src/lib/analyzer/grounding-check.ts`.
- Prompt profile is externally loaded (UCM-backed with fallback seeding from prompt files): `apps/web/src/lib/analyzer/prompt-loader.ts`.

## Related Implementation Landed Today
- 2026-02-12 analyzer changes are significant and relevant:
  - `1232789` LLM grounding + LLM direction adjudication (warning-only mode support).
  - `e572a6a` removal of deterministic semantic fallbacks + temporal guard updates.
  - `237610a` provider-failure surfacing improvements.
  - `d87ae7b`, `ebe3f58` analyzer refactors around evidence processing and LLM semantic modules.
- Both analyzed jobs used prompt hash `75e2b29d...` with schema `2.6.41`, so they ran on the same prompt/config snapshot.

## Report Issue Analysis

### 1) Federal Government Job: Direction Mismatch Warnings Are Likely False Positives
- Job facts:
  - 28 searches, 5 sources, 5 evidence items (all from `S5`, GAO GAGAS source).
  - Warnings: 2x `verdict_direction_mismatch`, 1x `grounding_check`.
- Critical observation:
  - `understanding.impliedClaim` keeps key qualifier: "without independent corroboration".
  - `SC1` sub-claim drops that qualifier and becomes broader: "Statements ... are reliable as evidence".
  - Direction validator currently evaluates `claimText + evidenceStatements + verdictPct` only; it does not receive the original thesis qualifier context.
- Likely root causes:
  - Sub-claim decomposition drift (loss of critical qualifier).
  - Direction-validation adjudicator prompt/input under-specifies conditional semantics.
  - Validator uses extract-tier model path (`getModelForTask("extract_evidence")`), which is cheaper but weaker for nuanced entailment.

### 2) Federal Government Job: Grounding Ratio 39% Is Partly a Methodology Artifact
- `SC3` and `SC4` are UNVERIFIED with no citations and reasoning that explicitly says evidence is insufficient.
- Current grounding logic assigns ratio `0` whenever reasoning exists but citations are empty.
- This causes low grounding warnings even when the claim is explicitly "insufficient evidence".
- Root cause:
  - No-evidence verdicts are treated as fully ungrounded instead of "properly unverified with explicit insufficiency".

### 3) Bolsonaro Job: This Is Primarily a Source Acquisition/Fetch Collapse, Not Evidence-Extraction Logic
- Job facts from DB:
  - 38 searches, 13 unique queries, 1 source stored, 0 successful fetches, 0 evidence items.
  - `analysisWarnings` only show recency gaps; there is no explicit "no successful sources" warning.
  - Job events show repeated search loops after initial failed fetch, with no additional source fetching afterward.
- Root-cause pattern:
  - Pipeline continued searching but did not recover from source acquisition failure.
  - Existing warning taxonomy under-reports this failure mode (recency shown, acquisition collapse hidden).
  - `low_source_count` warning intentionally excludes `0` successful sources (`uniqueSourceCount > 0` guard), creating a blind spot.

## Review of z-ai Plan

### What is valid
- Improve direction-validation prompt clarity around implication inversion.
- Add stronger evidence-citation discipline.
- Add failure detection for "many searches, no usable evidence."

### What needs correction
- "Evidence extraction failure" is too narrow for the Bolsonaro case; the observed failure is upstream (source acquisition/fetch collapse).
- "Every reasoning sentence must reference evidence IDs" is too strict and harms valid UNVERIFIED outputs. It should be conditional.
- Direction prompt examples alone are insufficient; input payload/model tiering must also be adjusted.

### What is missing
- Explicit fix for claim decomposition drift (critical qualifier loss).
- Explicit `0 successful sources` warning path and early-stop/recovery behavior.
- Confidence gating for direction-mismatch warnings (avoid high-noise warning output from uncertain adjudications).

## Proposed Fix Plan (New)

## Phase 1: Observability and Failure Signaling (code-only)
- Add explicit warning type when `successfulSources === 0` after research iteration or at end:
  - Proposed warning: `no_successful_sources`.
  - Severity: `error` (or high warning).
- Add warning type for search/acquisition collapse:
  - Example trigger: `searchQueries >= N && successfulSources == 0 && evidenceItems == 0`.
- Update low-source warning logic to include zero-source case (separate message path).
- Files:
  - `apps/web/src/lib/analyzer/orchestrated.ts`
  - `apps/web/src/lib/analyzer/types.ts`

## Phase 2: Direction Validation Robustness
- Preserve qualifier fidelity in claim decomposition:
  - Prompt update for `UNDERSTAND` and supplemental-claims sections to preserve critical conditionals/negations/modality from thesis in central claims.
  - This is a prompt/profile change (requires human approval).
- Expand direction-validation input payload:
  - Include original thesis/implied claim and verdict reasoning alongside sub-claim text and evidence statements.
- Add confidence-aware adjudication:
  - LLM returns `alignmentConfidence` and optional `uncertain` flag.
  - Emit mismatch warning only above configured confidence threshold.
- Move direction validation model selection to configurable higher tier when needed (UCM-backed).
- Files:
  - `apps/web/src/lib/analyzer/orchestrated.ts`
  - `apps/web/prompts/orchestrated.prompt.md` (or active UCM prompt profile)
  - `apps/web/src/lib/config-schemas.ts` (new UCM knobs)

## Phase 3: Grounding Calibration for Legitimate UNVERIFIED Claims
- Update grounding adjudication behavior for no-citation verdicts:
  - If verdict is in UNVERIFIED band and reasoning explicitly states insufficiency without unsupported factual assertions, treat as grounded by insufficiency rationale (LLM-adjudicated).
  - Keep low scores for no-citation verdicts that still assert factual claims.
- Replace hardcoded no-citation ratio=0 shortcut with batched LLM adjudication path that handles both cited and uncited reasoning.
- Files:
  - `apps/web/src/lib/analyzer/grounding-check.ts`
  - `apps/web/prompts/orchestrated.prompt.md` (`GROUNDING_ADJUDICATION_BATCH_USER`)

## Phase 4: Source Acquisition Resilience (Bolsonaro-class failures)
- Add recovery branch when research is stalled:
  - If consecutive iterations add no successful sources, force broadened candidate acceptance and fetch attempt diversification.
- Add failed-fetch retry policy with capped attempts and reason-aware retry conditions.
- Prevent infinite/low-yield search loops:
  - Stop early with explicit degraded warning if no net source/evidence gain after K iterations.
- Files:
  - `apps/web/src/lib/analyzer/orchestrated.ts`
  - Potentially `apps/web/src/lib/analyzer/evidence-deduplication.ts` (retry-friendly URL state tracking)

## Phase 5: Regression Coverage
- Add targeted regression tests for:
  - Government corroboration claim (direction-mismatch false positive guard).
  - No-source acquisition collapse path (searches high, fetch success zero).
  - Grounding behavior for explicit-insufficiency UNVERIFIED verdicts.
  - Multilingual variant retention (German phrasing robustness).
- Candidate test locations:
  - `apps/web/test/unit/lib/analyzer/`
  - `apps/web/test/unit/lib/`

## Config Placement (per AGENTS.md)
- UCM-configurable (analysis-affecting):
  - Direction-warning confidence threshold.
  - No-source collapse thresholds.
  - Retry caps/relaxation trigger thresholds.
  - Direction-validation model/tier selection.
- Env vars:
  - Keep infrastructure-only (timeouts/concurrency/path/secrets), no semantic behavior tuning.

## Validation Plan
- Re-run both problematic jobs (same inputs) and compare:
  - Direction mismatch warning count.
  - Grounding ratio and warning rationale.
  - Source acquisition metrics (searches, successful sources, evidence count).
- Acceptance targets:
  - Federal-government case: no obviously inverted direction mismatch warnings.
  - Bolsonaro case: explicit acquisition-collapse warning when evidence remains zero.
  - Grounding: no penalty-only warnings for explicitly-insufficient UNVERIFIED claims unless reasoning introduces unsupported facts.

