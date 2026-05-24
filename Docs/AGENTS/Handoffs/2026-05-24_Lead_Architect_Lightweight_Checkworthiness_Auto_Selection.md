---
### 2026-05-24 | Lead Architect | Codex (GPT-5) + Claude Opus/Gemini Review | Lightweight Check-Worthiness Auto Selection

**Task:** Investigate whether to take over Pipeline_V2 check-worthiness into main as a lightweight automatic-only claim selector with UCM cap 5, without user waiting or ACS draft/UI machinery.

**Files touched:** Documentation only: `Docs/AGENTS/Handoffs/2026-05-24_Lead_Architect_Lightweight_Checkworthiness_Auto_Selection.md`, `Docs/AGENTS/Agent_Outputs.md`.

**Key decisions:**

Recommended path is a narrow Stage 1.5 automatic claim-selection slice, not a Pipeline_V2 ACS port.

Bring over only:
- `apps/web/src/lib/analyzer/claim-selection-recommendation.ts`, adapted from Pipeline_V2.
- `CLAIM_SELECTION_RECOMMENDATION` prompt section, rewritten for automatic post-Gate-1 selection rather than ACS/user preselection.
- A current-shape version of `filterPreparedUnderstandingForSelectedClaims`, renamed for direct runtime use.
- Minimal types/config/tests needed for the above.

Do not bring over:
- claim-selection drafts, draft APIs, UI chooser, DB migrations/entities, idle auto-proceed, `Other` restart, prepared Stage 1 job resume, budget-aware admission, or selection mode state.

The active seam is in `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`: run after `extractClaims(state)`, after contract-damaged early exit, and after existing Gate 1 stats recording, before Stage 2 research. This preserves current Gate 1 telemetry and ensures Stage 2 sees only selected claims when the feature is enabled.

`AtomicClaim.checkWorthiness` must remain advisory extraction-time metadata. It must not become selector authority. The real selector is the post-Gate-1 batched LLM recommendation over the exact surviving `understanding.atomicClaims` set.

Add minimal UCM:
- `claimAutoSelectionEnabled` boolean. Initial implementation defaulted it off; after mocked pipeline integration coverage passed for disabled parity, selected-only Stage 2+, zero-selection terminal output, and selector-failure fail-closed behavior, the UCM default is now `true`.
- `claimAutoSelectionCap` int `1..5`, default 5.
- `claimAutoSelectionCandidateCap` int `1..25`, default 25, to bound structured-output reliability for unusually large article candidate sets.

Keep `claimAutoSelectionCap` separate from `maxAtomicClaims`; they control different things. `claimAutoSelectionCap` bounds selected claims. `claimAutoSelectionCandidateCap` bounds how many current Stage 1 candidates are sent to the selector. The candidate cap is a structured-output reliability boundary, not a semantic filter. If Stage 1 emits more candidates than the cap, pass the first `claimAutoSelectionCandidateCap` claims in current Stage 1 order, list overflow claims in dropped-claim transparency metadata with reason `candidate_cap_excluded`, and emit a registered warning.

Failure semantics after reviewer consolidation:
- Recommender runtime/schema/refusal/invariant failure: fail closed before Stage 2 with a damaged/unverified result or registered degrading warning. No fallback to all claims and no fallback to raw `checkWorthiness`.
- Valid recommendation with zero selected claims: terminal "no check-worthy claims identified" result, not a system-damaged report. It should be explicit and user-visible, but not presented as a crash.
- Exact warning/status names for implementation:
  - Add `no_checkworthy_claims` to `AnalysisWarningType`; register it in `warning-display.ts` as `{ bucket: "analysis", impact: "degrading" }` with runtime severity `warning`.
  - Add `claim_selection_truncated` to `AnalysisWarningType`; register it in `warning-display.ts` as `{ bucket: "analysis", impact: "degrading" }` with runtime severity `warning` when `candidateClaimCount > evaluatedCandidateCount`.
  - Do not use `report_damaged` for valid zero-selection. Reserve `report_damaged` for extraction/selection failures that may invalidate report integrity.
- For zero selected claims, return a terminal report with no Stage 2 research, no evidence, no claim verdicts, `claimSelection.selectedClaimIds = []`, all evaluated and overflow candidates in `droppedClaims`, and a clear report message that no claims were selected for fact-checking. If existing result consumers require numeric placeholders, use the narrowest existing UNVERIFIED/no-evidence convention, but do not render dropped claims as verdict-bearing claims.

User recovery and report transparency:
- The report should include a collapsed "Not analyzed in this run" section listing dropped atomic claims.
- Dropped claims must be clearly marked as not researched and not verdict-bearing. They must not contribute to aggregate truth, confidence, claim cards, evidence counts, or verdict narrative.
- Each dropped claim entry should show the statement and a short selector rationale from the recommendation assessment.
- This is the delayed human recovery point for automatic selection: users can later resubmit one or more dropped claims as a new analysis without reintroducing a chooser, draft state, or a paused-job workflow.
- A later UI action such as "Analyze this claim" is allowed as a follow-up convenience, but v1 only needs the report-visible dropped-claim list and enough result metadata to support resubmission.

Metadata should stay compact:
- Store enabled/mode/cap, candidate count, selected count, candidate IDs, ranked IDs, selected IDs, and short overall rationale.
- Store dropped-claim projections for report transparency: id, statement, reason type, optional triage label, and short rationale. Do not duplicate full `AtomicClaim` objects in the primary result payload unless needed for a bounded admin diagnostic.
- Keep full per-claim assessment output available enough for audit/tests if practical, but avoid bulky candidate summaries in the primary result payload.
- When the selector succeeds, selected claims are intentionally ordered by selector ranking before entering Stage 2+. This affects downstream claim verdict/report order when the feature is enabled; document and verify that report presentation should prioritize selected check-worthiness ranking over original extraction order.

Implementation order:
1. Fix `AtomicClaim.checkWorthiness` type mismatch to include `low` consistently with the schema/prompt.
2. Add config fields/default JSON/schema and config drift tests, still disabled.
3. Add `claim_selection` metrics task type and document it as using the `context_refinement` model route; avoid a new model override knob in v1.
4. Port/adapt recommender module and prompt contract tests.
5. Port/adapt direct filtering helper and test every current claim-ID-keyed field in `CBClaimUnderstanding`.
6. Add result/report projection for dropped claims, collapsed by default and excluded from verdict-bearing report content.
7. Wire Stage 1.5 behind the flag and test disabled parity plus enabled Stage 2 filtering.
8. Verify API-side result JSON handling remains opaque or patch any discovered typed contract.
9. Validate with build/safe tests; only after commit/reseed/restart run live jobs on Captain-approved inputs.

**Implementation packet for Senior Developer + LLM Expert:**

Primary code files:
- `apps/web/src/lib/analyzer/types.ts`
  - Expand `AtomicClaim.checkWorthiness` to `"high" | "medium" | "low"`.
  - Add compact auto-selection metadata types, including dropped-claim projection.
  - Add optional `claimSelection?: ClaimAutoSelectionMetadata` to `CBResearchState` as the runtime carrier.
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
  - `buildClaimBoundaryResultJson()` exposes `state.claimSelection` as top-level `resultJson.claimSelection`.
  - Do not nest selection metadata under `CBClaimUnderstanding`; keep `understanding` as the selected runtime claim contract.
- `apps/web/src/lib/config-schemas.ts`
  - Add `claimAutoSelectionEnabled?: boolean`, `claimAutoSelectionCap?: number`, and `claimAutoSelectionCandidateCap?: number`.
  - Normalize defaults in the same area as ClaimBoundary Stage 1 config.
- `apps/web/configs/pipeline.default.json`
  - Add matching JSON defaults because JSON is authoritative for UCM defaults.
- `apps/web/src/lib/analyzer/metrics.ts`
  - Add `claim_selection` to `LLMTaskType`.
- `apps/web/src/lib/analyzer/claim-selection-recommendation.ts`
  - New/ported module. Copy the working `generateText` structured-output pattern exactly.
  - Use `getModelForTask("context_refinement", undefined, pipelineConfig)`; no new v1 model knob.
  - Validate full candidate coverage, unique ranked IDs, selected IDs subset/order, non-empty bounded rationales.
  - Do not include extraction-time `checkWorthiness` in the prompt input projection.
  - Retry exactly once on schema/invariant failure; do not retry explicit refusal or safety block.
  - Record `recordLLMCall()` with `taskType: "claim_selection"`, provider, model name, tokens, duration, success, `schemaCompliant`, retry count, timestamp, and error message on failure.
- `apps/web/prompts/claimboundary.prompt.md`
  - Add/rewrite `CLAIM_SELECTION_RECOMMENDATION` for automatic-only post-Gate-1 selection.
  - Remove ACS/user chooser/draft/preselection wording.
  - Prompt must state: ranked list covers all evaluated candidates; selected IDs are a subset of ranked IDs and may be fewer than cap, including zero; exact enum labels only; rationales stay in the same language as the source claim statement; per-claim rationales max 160 chars and overall rationale max 240 chars; tie-break equal candidates by source order; no topic-specific examples or keyword rules.
  - Prompt must define all four `triageLabel` values and state that triage is assigned to every evaluated candidate, not only selected or dropped candidates.
  - Primary ranking criterion: rank descending by FactHarbor check-worthiness, meaning factual/verifiable, thesis-relevant, likely evidence-yielding, distinct from stronger candidates, and significant to the user's input. Tie-break genuinely equal candidates by source order.
  - Structured output should include per-claim rationale for every evaluated candidate for audit/tests. The primary `resultJson.claimSelection` projection includes only dropped-claim rationales plus the overall rationale.
- `apps/web/src/lib/analyzer/claim-selection-filter.ts` or local helper in `claimboundary-pipeline.ts`
  - Filter only selected claims for runtime research/verdict path.
  - Preserve dropped-claim metadata outside the filtered runtime path.
  - Current claim-ID-keyed fields to filter: `atomicClaims`, `preFilterAtomicClaims`, `gate1Reasoning`, `preliminaryEvidence.claimId`, `preliminaryEvidence.relevantClaimIds`, `contractValidationSummary.truthConditionAnchor.preservedInClaimIds`, and `contractValidationSummary.truthConditionAnchor.validPreservedIds`.
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
  - Insert Stage 1.5 only after contract-damaged early exit and after Gate 1 stats.
  - If disabled, no behavior change.
  - If enabled, selected claims are the only claims entering Stage 2+.
  - Do not call the recommender with an empty candidate set. If no Gate 1 candidates exist, use the existing no-valid-claim/terminal behavior rather than fabricating a selector output.
  - Candidate truncation invariant: `evaluatedCandidateClaimIds` must equal `candidateClaimIds.slice(0, claimAutoSelectionCandidateCap)`. Do not apply any deterministic semantic ranking before the LLM selector.
- `apps/web/src/app/jobs/[id]/page.tsx`
  - Add collapsed "Not analyzed in this run" section for dropped claims.
  - Older stored results without `claimSelection` must render exactly as they do today.
  - Placement: below analyzed claim cards and above technical/admin sections. Use collapsed-by-default `<details>` style.
  - Copy: "These atomic claims were not researched and did not affect the verdict. Start a new analysis with any of them if you want them checked separately."
- `apps/web/src/app/jobs/[id]/utils/generateHtmlReport.ts`
  - Add the same dropped-claim transparency to exported HTML reports if the job page exposes it there.
  - Older stored results without `claimSelection` must export exactly as they do today.
  - Placement: after the claim analysis section and before evidence details.
- `apps/web/src/lib/analyzer/warning-display.ts`
  - Register `no_checkworthy_claims` and `claim_selection_truncated`.
- `apps/api`
  - Expected to remain unchanged because result JSON is stored as an opaque payload, but the implementer must grep API-side result validation/serialization before closeout and document "no API change needed" or patch any discovered typed contract.

Suggested metadata contract:

```ts
interface ClaimAutoSelectionMetadata {
  enabled: boolean;
  mode: "automatic";
  selectionCap: number;
  candidateCap: number;
  candidateClaimIds: string[];
  evaluatedCandidateClaimIds: string[];
  selectedClaimIds: string[];
  droppedClaims: Array<{
    id: string;
    statement: string;
    reasonType: "selector_dropped" | "selector_failed" | "candidate_cap_excluded";
    triageLabel?: "fact_check_worthy" | "fact_non_check_worthy" | "opinion_or_subjective" | "unclear";
    rationale: string;
  }>;
  rankedClaimIds: string[];
  rationale: string;
}
```

Keep `droppedClaims` report-facing and bounded. It is deliberately not a second full claim store.
For `candidate_cap_excluded` entries, the rationale is deterministic structural text, not LLM reasoning: `Not evaluated because the candidate set exceeded the configured claim auto-selection candidate cap.` This avoids inventing semantic reasons for overflow candidates.
For `selector_failed` entries, the selector did not make an intentional drop decision; use it only for evaluated candidates when the selector runtime/schema/refusal/invariant path fails closed before research.

Acceptance criteria:
- Feature flag off: existing safe tests for ClaimBoundary behavior remain unchanged.
- Feature flag on: Stage 2, Stage 3, Stage 4, aggregation, coverage matrix, evidence counts, and claim verdict cards only see selected claims.
- Dropped claims appear only in `resultJson.claimSelection.droppedClaims`, the collapsed report section, and exported report transparency. They do not appear in research prompts, verdict prompts, coverage matrix, claim verdicts, aggregate truth/confidence, or evidence counts.
- `recommendedClaimIds: []` produces a clear terminal "no check-worthy claims identified" report/status, not a damaged/crash report.
- Recommender failure/refusal/invariant failure produces a fail-closed damaged/unverified result or registered degrading warning with no fallback to raw `checkWorthiness`.
- Prompt and tests remain generic/multilingual-safe; no topic-specific examples or hardcoded semantic keywords.
- Recommender prompt input omits extraction-time `checkWorthiness`; the selector must re-evaluate from claim content and structural fields rather than anchoring on the Stage 1 advisory label.

Minimum test list:
- `apps/web/test/unit/lib/analyzer/claim-selection-recommendation.test.ts`
  - Port/adapt V2 tests for invariant validation, prompt variables, retry behavior, and metrics recording.
  - Add refusal-vs-schema-failure retry tests and edge cases for single candidate, cap greater than candidate count, zero selected, and candidate cap boundary.
  - Add anchoring independence test: same claim statements with different prior `checkWorthiness` values produce the same recommender prompt input because `checkWorthiness` is stripped before rendering.
  - Add at least one German or French fixture to verify prompt/output contract handles non-English claim statements and same-language rationales.
- `apps/web/test/unit/lib/analyzer/claim-selection-filter.test.ts`
  - Selected-only filtering of `atomicClaims`, `preFilterAtomicClaims`, `gate1Reasoning`, `preliminaryEvidence`, and contract anchor IDs.
- `apps/web/test/unit/lib/config-schemas.test.ts`
  - Defaults, bounds, and parse behavior for new UCM fields.
- `apps/web/test/unit/lib/config-drift.test.ts`
  - JSON/TS default sync.
- `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`
  - Disabled parity, enabled selected-only Stage 2 path, zero-selection terminal path, recommender-failure path, and dropped-claim metadata/report projection.
- Prompt contract test for `CLAIM_SELECTION_RECOMMENDATION` in `claimboundary.prompt.md`.
- Negative prompt-leakage test asserting dropped claims do not appear in research/verdict prompt inputs after selection filtering.
- UI/render test for older results with no `claimSelection`.
- UI/render test for collapsed dropped-claim section.
- HTML export test for dropped-claim section or explicit closeout note if export is deferred.

Prerequisites satisfied before enabling `claimAutoSelectionEnabled=true` by default:
- Disabled-parity pipeline integration test showing flag-off behavior remains unchanged.
- Enabled selected-only pipeline integration test showing Stage 2+ sees only selected claims.
- Zero-selection terminal integration test showing no research/verdict stages and no `report_damaged`.
- Selector-failure integration test showing fail-closed `report_damaged` and `selector_failed` dropped-claim reason types.

Verification:
- Run focused Vitest tests for the touched units first.
- Run `npm -w apps/web run build`.
- Run `npm test` if focused tests/build pass.
- Do not run expensive/live tests until after commit, runtime refresh, and Captain approval.

**Open items:**

- During implementation, verify whether article inputs commonly hit `claimAutoSelectionCandidateCap`; if so, use the `claim_selection_truncated` telemetry/report transparency to decide whether a later article-specific policy is needed.
- Prompt rewrite requires LLM Expert-style review before merge because it changes analysis behavior.

**Warnings:**

- Do not revive `applyGate1Lite()` or any deterministic `checkWorthiness === "low"` filter as semantic selector authority.
- Do not import Pipeline_V2's draft/database/UI orchestration. That was the overload source.
- Do not let the prompt preserve ACS/user-choice language; automatic-only semantics need a full rewrite pass.
- Filtering must be checked against the current `CBClaimUnderstanding` shape, not Pipeline_V2's older shape.
- Dropped claims are transparency/recovery metadata only; do not let them leak into research prompts, verdict generation, aggregation, or evidence coverage logic.
- The recommender input projection must omit `checkWorthiness`; otherwise the model can anchor on the old Stage 1 advisory label and the new selector adds little independent value.
- Candidate-cap overflow is a structural reliability limit, not semantic de-prioritization. Overflow claims must be visible as not analyzed so the user has a recovery path.

**Implementation-role review disposition (2026-05-24):**

- Senior Developer review verdict: ready with changes. Integrated blockers: exact warning/status identifiers, current `CBClaimUnderstanding` claim-ID fields, result/backward compatibility behavior, metrics requirements, UI/export tests, and API opaque-result verification.
- LLM Expert review verdict: ready with changes. Integrated blockers: strip `checkWorthiness` from recommender input, exact retry semantics, candidate input cap, same-language and bounded rationales, tie-breaking by source order, multilingual/anchoring/refusal tests, and prompt-contract constraints.
- Second Senior Developer review verdict: ready with remaining packet-only amendments. Integrated final carrier decision (`CBResearchState.claimSelection` -> top-level `resultJson.claimSelection`), candidate-cap rationale rule, and source-order truncation invariant.
- Second LLM Expert review verdict: ready to implement. Integrated final prompt-contract amendments: triage definitions for every evaluated candidate, explicit ranking criterion, and full-assessment rationale vs compact result projection.

**For next agent:** Implement as a small feature-flagged Stage 1.5 selection slice with dropped-claim transparency as the recovery mechanism. Start with `apps/web/src/lib/analyzer/types.ts`, `apps/web/src/lib/config-schemas.ts`, `apps/web/configs/pipeline.default.json`, `apps/web/src/lib/analyzer/metrics.ts`, then port the recommender/prompt/filter before touching `claimboundary-pipeline.ts`.

**Learnings:** Not appended to `Role_Learnings.md`; this applies an existing Pipeline_V2 lesson rather than adding a new role-level operating principle.
