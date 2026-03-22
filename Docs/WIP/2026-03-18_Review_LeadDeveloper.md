# Lead Developer Review — Refactoring Plan Code Cleanup

**Reviewer:** Lead Developer (GitHub Copilot, GPT-5.4)
**Date:** 2026-03-19
**Plan under review:** `Docs/WIP/2026-03-18_Refactoring_Plan_Code_Cleanup.md`
**Focus:** Practicality, implementation quality, module boundaries, extraction conventions, effort realism
**Verdict:** APPROVE WITH REFINEMENTS

---

## Executive Assessment

The plan is directionally strong and worth executing. The overall sequencing is sensible, and the biggest wins are correctly prioritized: delete dead code first, then break up the ClaimAssessmentBoundary pipeline, then reduce provider duplication.

My main implementation-quality concerns are not about whether to refactor, but about **where the seams should be** so we do not replace a few giant files with a handful of new grab-bag modules.

The key adjustments I recommend:

1. **WS-2:** Keep the stage-oriented split, but treat `pipeline-utils.ts` and `aggregation-stage.ts` as danger zones for “miscellaneous” growth.
2. **WS-3:** Replace mutable module globals, but do it as a **request-scoped context/config object**, not raw parameter threading through every helper.
3. **WS-4:** Shared utilities are the right level, but keep them narrowly focused on transport/error plumbing. Do not create a fake provider abstraction.
4. **WS-5/6:** Follow the existing jobs page extraction convention more closely. The current pattern is **flat components + hooks + utils + lib**, not a deep feature tree.

---

## Current Size Reality Check

The plan’s direction is still valid, but several absolute line counts are stale relative to the current repo state:

| File | Plan says | Actual current lines | Assessment |
|------|-----------|----------------------|------------|
| `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` | 6,231 | 5,692 | Still too large; estimate is overstated by ~540 lines |
| `apps/web/src/app/api/internal/evaluate-source/route.ts` | 2,959 | 2,615 | Still too large; estimate is overstated by ~340 lines |
| `apps/web/src/app/jobs/[id]/page.tsx` | 3,720 | 3,466 | Still too large; estimate is slightly high |
| `apps/web/src/app/admin/config/page.tsx` | 4,779 | 4,580 | Close enough |

This does not invalidate the plan. It does mean effort should be judged by **coupling and extraction difficulty**, not by the original line counts.

---

## 1. Module Boundaries (WS-2)

### Overall judgment

The **stage-aligned split is the right direction**. The current file already has recognizable seams around:

- `extractClaims`
- `researchEvidence`
- `clusterBoundaries`
- `generateVerdicts`
- `aggregateAssessment`

The revised split is materially better than leaving Stage 2 in one file. In particular, separating:

- `query-generation.ts`
- `evidence-extraction.ts`
- `research-stage.ts`

is the correct response to the earlier “2100-line research-stage” concern.

### What I would keep

I would keep these extracted modules:

- `claim-extraction-stage.ts`
- `query-generation.ts`
- `evidence-extraction.ts`
- `research-stage.ts`
- `boundary-clustering-stage.ts`
- `verdict-generation-stage.ts`
- `aggregation-stage.ts`

### What I would change

#### A. Keep `claimboundary-pipeline.ts` as a thin orchestrator only

After extraction, `claimboundary-pipeline.ts` should ideally contain only:

- imports
- `runClaimBoundaryAnalysis`
- barrel re-exports if you want test compatibility

Do not leave shared helpers there once other modules depend on them. The Code Reviewer already flagged `checkAbortSignal`; the same principle applies to any helper used by more than one extracted stage.

#### B. Be careful with `pipeline-utils.ts`

This is the module most likely to become a junk drawer.

Good fits:

- pure leaf helpers like `mapSourceType`, `mapCategory`, `normalizeExtractedSourceType`
- structurally shared helpers like `createErrorFingerprint`
- cross-stage runtime helpers like `checkAbortSignal`
- fallback constructors like `createUnverifiedFallbackVerdict`

Bad fits:

- research-specific warning builders
- boundary-specific helpers
- aggregation/explanation scoring helpers
- anything that only one stage uses

Practical rule: if a helper is used by exactly one stage module, keep it in that stage module.

#### C. `research-stage.ts` should not re-absorb all Stage 2 complexity

At the plan’s new target size, `research-stage.ts` is acceptable **if it remains the orchestrator plus Stage 2-specific runtime plumbing**.

That means it can own:

- `researchEvidence`
- `runResearchIteration`
- `fetchSources`
- budget helpers
- post-search warning aggregation

If it starts to also absorb query schemas, evidence extraction schemas, or source-fetch parsing helpers, it will grow back into the same problem.

### Is `research-stage.ts` at ~2,100 lines still too large?

Yes. Absolutely too large.

At roughly:

- 700 to 900 lines: acceptable for an orchestration-heavy module
- 900 to 1,200 lines: tolerable if cohesive
- 2,100 lines: too large, too hard to review, too hard to test surgically

The plan’s revised split solves this, so I agree with the revised direction.

### Additional boundary concern: `aggregation-stage.ts`

This is the second place I would watch closely. The current Stage 5 area includes:

- weighted aggregation
- verdict narrative generation
- triangulation scoring
- quality gates
- explanation structure/rubric logic
- TIGER score logic

That is a lot of responsibilities for one module. I would allow it initially, but with a guardrail:

If `aggregation-stage.ts` grows past about 900 lines or mixes too many independent helpers, split out one of:

- `aggregation-quality.ts`
- `aggregation-narrative.ts`

I would not pre-split on day one unless the extraction becomes awkward, but I would expect this to be the next place to split.

### Recommendation

**Approve the WS-2 module split with one refinement:** treat `pipeline-utils.ts` as a very small shared leaf module, and be ready to split `aggregation-stage.ts` if it becomes the new monolith.

---

## 2. Evaluate-Source Design (WS-3)

### Current implementation problem

The module-level mutable config variables in `apps/web/src/app/api/internal/evaluate-source/route.ts` are worse than just awkward:

- `SR_OPENAI_MODEL`
- `RATE_LIMIT_PER_IP`
- `DOMAIN_COOLDOWN_SEC`
- `SR_SEARCH_CONFIG`
- `SR_EVAL_USE_SEARCH`
- `SR_EVAL_MAX_RESULTS_PER_QUERY`
- `SR_EVAL_MAX_EVIDENCE_ITEMS`
- `SR_EVAL_DATE_RESTRICT`

These are mutated inside `POST()` and then read by many helper functions later.

In a shared Node.js server process, that is **request-unsafe**. Concurrent requests can overwrite each other’s effective SR evaluation settings.

So on the root question: **yes, the globals should be eliminated.**

### Is a passed `SrEvalConfig` object the right approach?

Yes, but not as a naive “pass config to every helper” rewrite.

The right shape is:

1. Build a **request-scoped config/context** once in `POST()`.
2. Pass that object only to the top-level helper families that actually need it.
3. Let lower-level helpers receive narrower slices where that improves readability.

### What to avoid

Do **not** create a situation where every helper signature becomes:

```ts
fn(domain, evidencePack, modelProvider, requestStartedAtMs, requestBudgetMs, srEvalConfig)
```

That would be parameter threading in the bad sense.

### What I recommend instead

Use two request-scoped objects:

#### `SrEvalConfig`

Pure configuration derived from UCM/defaults, for example:

- model names
- rate limits / cooldowns
- evaluation search config
- evidence-pack limits
- evidence quality assessment config

#### `SrEvalRequestContext`

Per-request runtime state, for example:

- `requestStartedAtMs`
- `requestBudgetMs`
- maybe resolved env capability flags if needed

Then functions become cleaner:

- `checkRateLimit(ip, domain, config)`
- `buildEvidencePack(domain, config)`
- `evaluateWithModel(domain, modelProvider, evidencePack, config)`
- `evaluateSourceWithConsensus(domain, multiModel, confidenceThreshold, { config, request })`

That removes the global mutability **without** turning every callsite into noise.

### Practical split recommendation for WS-3

The proposed module list is mostly good, but I would slightly adjust the design emphasis:

- `sr-eval-types.ts`: keep
- `sr-eval-prompts.ts`: keep
- `sr-eval-evidence-pack.ts`: keep
- `sr-eval-enrichment.ts`: keep
- `sr-eval-engine.ts`: keep

But the key implementation artifact should be a small builder such as:

- `buildSrEvalConfig()` or `createSrEvalContext()`

This is more important than the exact filename split, because it fixes the actual safety issue.

### Recommendation

**Approve WS-3, but implement it as request-scoped config/context, not raw config threading.** That is the cleanest way to remove the concurrency risk without degrading readability.

---

## 3. Search Provider Abstraction (WS-4)

### Utilities vs interface/adapter pattern

Utilities are the right level.

The current providers are similar only in a narrow band of behavior:

- API key checks
- HTTP error body extraction
- quota/rate-limit classification
- timeout/fetch failure handling
- logging shape

They are **not** similar enough in their request/response contracts to justify a formal adapter abstraction.

Differences that argue against an interface-first design:

- Google CSE needs two credentials
- Serper throws on placeholder key while others return `[]`
- Semantic Scholar has optional auth and a serialized rate limiter
- some providers classify 200-status API errors from the JSON body
- timeouts are intentionally different by provider

An adapter layer would mostly add ceremony while the real custom logic stays provider-local anyway.

### My refinement to the plan

I would keep shared utilities **very small and transport-focused**. In practice, that means:

- `extractErrorBody()` or `readErrorBodySafe()`
- `requireApiKey()`
- optional `warnIfMissingApiKey()`
- `classifyHttpError()` with provider-specific keywords passed in
- maybe `logSearchStart/logSearchResult` or `createSearchLogger()`

I would be careful with a monolithic `handleFetchError()` helper if it becomes too magical. The more it hides provider behavior, the harder provider tests become to reason about.

### Testing impact

Shared utilities would make testing **easier**, not harder, if the helper boundary stays narrow.

Why easier:

- shared quota/error classification can be tested once in utility tests
- provider tests can shrink to request construction, response parsing, and provider-specific edge cases
- less duplicate assertion maintenance when error semantics change

What would make testing harder:

- moving too much provider behavior into one opaque helper
- making tests assert against indirect shared behavior without clear provider-level intent

Given the existing test layout, the right model is:

1. Add direct utility unit tests for the shared helpers.
2. Keep provider tests focused on provider-specific behavior.
3. Do not try to replace provider tests with shared helper tests.

One practical note: there is no dedicated `search-serper.test.ts` in the current suite, so if WS-4 touches Serper behavior, that provider deserves explicit test coverage.

### Recommendation

**Approve utility extraction, reject interface/adapter pattern.** Keep the utilities narrow, obvious, and independently testable.

---

## 4. UI Extraction (WS-5/6)

### Existing extraction convention in `jobs/[id]`

The current jobs page already establishes a convention:

- `components/`
- `hooks/`
- `utils/`
- `lib/`

Within `components/`, the pattern is currently **flat**, for example:

- `BoundaryFindings.tsx`
- `ExpandableText.tsx`
- `InputBanner.tsx`
- `VerdictNarrative.tsx`

Styling convention is also established:

- some components use their own CSS module
- some extracted components import `../page.module.css`

So the new extraction plan should align with that pattern unless there is a strong reason to deviate.

### Is `verdict/`, `evidence/`, `analysis/`, `shared/` the right directory structure?

Not as proposed.

My issue is not the idea of grouping. It is that **`analysis/` is too vague** and overlaps with verdict, evidence, boundaries, quality gates, and narrative.

### What I recommend for WS-5

Two acceptable options:

#### Option A: stay flat

Best if you want consistency with the current page and minimal import churn.

#### Option B: use light grouping only where volume justifies it

If the component count really expands materially, use:

- `components/verdict/`
- `components/evidence/`
- `components/events/` or `components/report/`
- `components/shared/`

I would **not** use `components/analysis/`.

If something is page scaffolding rather than domain content, call it `report` or `layout`, not `analysis`.

### What I recommend for WS-6

For the admin config page, the cleaner structure is:

- `components/forms/`
- `components/panels/`
- `hooks/`
- `types.ts`
- `constants.ts`

That fits the current page better than generic folder names.

### Convention check

The proposed extractions are consistent with the **idea** of the existing jobs-page pattern, but not yet with its **actual directory style**. The current convention is flatter and simpler than the proposed `verdict/evidence/analysis/shared` tree.

### Recommendation

**Follow the existing jobs-page convention more closely.** Use flat extraction first. Introduce subfolders only where the number of related siblings becomes unwieldy.

---

## 5. Effort Estimates

### WS-1 Dead code removal

`Low` is realistic.

Only caution: string references, prompt file references, and transitive test dependencies can still create nuisance failures. The Code Reviewer already caught the main ones.

### WS-2 Pipeline decomposition

`High` is realistic.

If anything, the integration complexity is slightly understated because of:

- preserving many named exports for tests
- avoiding circular imports
- keeping current behavior and logging identical
- moving Zod schemas without breaking test mocks

This is correctly the highest-effort work stream.

### WS-3 Evaluate-source decomposition

The current `Medium` estimate is **slightly underestimated**.

Why:

- evidence-pack assembly is heavily intertwined with config access
- language detection, translated search terms, budget guards, and enrichment all interact
- fixing the mutable-global issue touches control flow, not just file moves

I would call this **Medium-High**.

### WS-4 Search provider consolidation

`Medium` is realistic.

If the helper surface stays narrow, this is manageable. If the implementation drifts toward a pseudo-framework, it will become expensive for little gain.

### WS-5 Job report page extraction

The plan’s `Medium` estimate is **slightly underestimated**.

Reasons:

- the page still contains several inline UI primitives and report orchestration helpers
- there is event timeline logic, report export behavior, admin actions, navigation, and many derived display helpers
- line movement is easy; preserving render behavior and CSS expectations is where cost sits

I would rate this **Medium-High**.

### WS-6 Admin config page extraction

`Medium` is plausible, but it is close to `Medium-High`.

The file is not just large; it contains:

- several embedded forms
- nested update logic
- profile/tab state
- defaults and shape conversions

The danger here is not extraction itself, but accidental behavior drift in the edit forms.

### WS-7 Admin route boilerplate

`Low` is accurate, and the plan is right to defer it.

---

## 6. Answers to the Open Questions

In the current revision of the plan, the earlier open questions are already moved into **Resolved Decisions**. I agree with the direction of those decisions, with the refinements above.

My direct answers are:

1. **Is `research-stage.ts` at ~2,100 lines too large?**
   Yes. The revised split into query generation, evidence extraction, and research orchestration is the correct fix.

2. **Should mutable module-level vars become an `SrEvalConfig` object?**
   Yes. Strong yes. The current approach is request-unsafe. Do it as request-scoped config/context, not raw parameter threading.

3. **Utilities vs `SearchProviderAdapter` interface?**
   Utilities. The providers are too heterogeneous for an adapter pattern to pay off.

4. **Add component tests during WS-5/6?**
   No. Keep this workstream structural. If behavior drifts are a concern, add smoke verification, not new test scope.

5. **Commit strategy?**
   One commit per step is correct.

6. **Is WS-7 worth doing?**
   Defer unless one of those routes is already being edited for another reason.

---

## Final Recommendations

### Recommended changes to the plan before execution

1. Keep the WS-2 split, but explicitly state that `claimboundary-pipeline.ts` becomes a thin orchestrator.
2. Add a guardrail that `pipeline-utils.ts` must remain a small shared-leaf module, not a dumping ground.
3. Add a note that `aggregation-stage.ts` may need a second split if it becomes the next monolith.
4. Reframe WS-3 around **request-scoped config/context creation** as the first step.
5. Adjust WS-5 directory guidance to match the existing jobs-page convention: flat first, light grouping only where justified.
6. Mark WS-3, WS-5, and possibly WS-6 as slightly more effortful than currently described.

### Execution quality bar

I would approve execution if the implementer follows these constraints:

- behavior-preserving moves only
- no new abstraction layers beyond what the current code clearly wants
- no “misc” utility modules with stage-specific logic hidden inside them
- build and safe tests after each step
- manual smoke check after WS-5 and WS-6 because page extraction failures are often visual/interaction regressions, not compile errors

With those adjustments, the plan is practical and should improve maintainability without introducing architecture churn.
