# Source Reliability UCM Separation Plan

**Status:** COMPLETED (Updated with Finding Fixes)
**Created:** 2026-03-10
**Last Updated:** 2026-03-10
**Author Role:** Senior Developer

---

### Implementation Update (Finding Fixes)

After initial review, the following enhancements were implemented to address high-priority findings:

1.  **Full SR Independence (Fix for Finding 1):** `evaluate-source/route.ts` no longer spreads `DEFAULT_SEARCH_CONFIG`. It now builds `SR_SEARCH_CONFIG` from scratch using `DEFAULT_SR_CONFIG.evaluationSearch`. This ensures SR does not inherit Analysis-side defaults like the `domainBlacklist`.
2.  **Complete Cache Isolation (Fix for Finding 2):** `generateCacheKey()` in `search-cache.ts` now includes:
    *   `autoMode` (accumulate vs first-success)
    *   `providers` (active lineup + priorities)
    This ensures that any change to SR search behavior correctly invalidates the search cache.
3.  **Repo-Backed Cache Flush (Fix for Finding 3):** Added `scripts/sr-cache-flush.ts` to provide a reproducible implementation of the Decision D3 flush.
4.  **Regression Coverage (Fix for Finding 4):** Added 4 new test cases to `web-search.test.ts` verifying `autoMode` behavior and provider accumulation.
5.  **Schema Consistency (Fix for Finding 5):** Added `schemaVersion: "3.0.0"` to `sr.default.json`, resolving build-time version mismatch warnings.


---

## Context

Source Reliability (SR) is intended to become a standalone service in the future. Today, SR evaluation is still operationally coupled to the main FactHarbor Analysis search stack:

- SR loads the shared `search` UCM profile at runtime
- SR uses the shared `searchWebWithProvider()` AUTO dispatcher
- SR therefore inherits Analysis search behavior changes, provider-default changes, and cache semantics

This coupling is now causing a concrete quality problem:

- `weltwoche.de` previously scored `29%` in a cached result from **2026-02-18**
- fresh evaluations for `weltwoche.de` and `weltwoche.ch` now converge around `48%`
- the regression persists even after reverting recent SR-specific changes in `evaluate-source/route.ts`

The current investigation shows the regression is primarily caused by the shared search layer, not by SR prompt or SR evaluation logic.

---

## References

- `apps/web/src/app/api/internal/evaluate-source/route.ts`
- `apps/web/src/lib/web-search.ts`
- `apps/web/src/lib/config-schemas.ts`
- `apps/web/configs/sr.default.json`
- `apps/web/configs/search.default.json`
- `apps/web/test/unit/lib/web-search.test.ts`
- `Docs/AGENTS/Agent_Outputs.md` — 2026-03-10 entry: "SR Score Regression Investigation"
- `Docs/xwiki-pages/FactHarbor/Product Development/Specification/Architecture/Deep Dive/Source Reliability/WebHome.xwiki`
- `Docs/WIP/UCM_Config_Drift_Review_2026-03-05.md`

---

## Problem Statement

### 1. Architectural Problem

SR is not UCM-independent from Analysis.

Current runtime flow in `evaluate-source/route.ts`:

1. Load `sr` config
2. Load `search` config
3. Copy shared `search` config into `SR_SEARCH_CONFIG`
4. Run SR evidence collection using shared `searchWebWithProvider()`

Concrete coupling points:

- `getConfig("search", "default")` in `apps/web/src/app/api/internal/evaluate-source/route.ts`
- `SR_SEARCH_CONFIG: SearchConfig = DEFAULT_SEARCH_CONFIG`
- `searchWebWithProvider(...)` used directly by SR evidence-pack building

Result: any Analysis search change can alter SR ratings.

### 2. Quality Problem

The current shared AUTO search dispatcher changed behavior on **2026-03-09** in commit `8bef6a91`:

- old behavior: accumulate results across primary providers until `maxResults`
- current behavior: stop after the first provider that returns any results

Current code in `apps/web/src/lib/web-search.ts`:

```ts
if (providerResults.length > 0) break;
```

This reduces evidence diversity. In practice, AUTO becomes near-Google-only whenever Google CSE returns at least one result.

### 3. Configuration Problem

The old effective SR baseline is no longer reproducible by simply resetting configs:

- historical `search.default.json` around `bd40e80b` had no `providers` block
- AUTO therefore implicitly enabled all credentialed providers via `?? true`
- current `search.default.json` explicitly sets:
  - `serpapi: false`
  - `serper: true`
  - `brave: true` with priority `10`
- `parseTypedConfig()` now merges stored configs with current defaults

Result: reset/reseed now restores current shared Analysis search behavior, not the old SR baseline.

### 4. Current Default Drift

There is also an active default mismatch between:

- `apps/web/configs/search.default.json`
- `apps/web/src/lib/config-schemas.ts`

At time of writing:

- JSON defaults enable `serper` and `brave`
- TypeScript defaults disable both

This drift increases review and rollout risk.

---

## What Reviewers Need To Know

### This is not just an SR bug fix

This is both:

1. a quality regression fix
2. an architectural separation step for future SR service extraction

### This is not a prompt problem

Recent SR prompt and route reverts restored `evaluate-source/route.ts` close to the pre-regression state. The score inflation remained. The remaining root cause is the shared search stack.

### This is not only an SR concern

The shared search dispatcher is also used by the main Analysis pipeline:

- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`

That is exactly why SR must stop inheriting Analysis search policy.

### Shared provider code is acceptable

The intended separation is:

- shared low-level provider execution: acceptable
- shared runtime config and shared AUTO orchestration policy: not acceptable

---

## Goals

1. SR must load only SR-owned UCM values during evaluation.
2. Analysis search UCM changes must not change SR scores.
3. SR must have its own search orchestration policy.
4. SR defaults must encode an SR-owned rollback baseline.
5. Reset-to-default for SR must restore SR behavior, not Analysis behavior.
6. The design should support future extraction of SR into a separate service with minimal rework.

---

## Non-Goals

1. No prompt redesign.
2. No attempt to solve all Analysis search quality issues here.
3. No provider implementation rewrite.
4. No production deployment procedure in this document beyond config/cache reset notes.

---

## Current Architecture

### Today

```text
SR route
  -> load SR config
  -> load shared Search config
  -> use shared web-search AUTO policy
  -> shared search cache semantics
  -> shared provider lineup semantics
```

### Target

```text
SR route
  -> load SR config only
  -> use SR-owned evaluationSearch config
  -> use SR-owned AUTO orchestration policy
  -> optionally reuse shared provider executors

Analysis pipeline
  -> load Search config only
  -> use Analysis-owned AUTO orchestration policy
```

---

## Proposed Design

### 1. Add SR-Owned Evaluation Search Config

Extend `SourceReliabilityConfigSchema` with SR-owned search settings.

Recommended structure:

```ts
evaluationSearch: {
  enabled: boolean,
  provider: "auto" | "google-cse" | "serpapi" | "serper" | "brave",
  maxResultsPerQuery: number,
  maxEvidenceItems: number,
  dateRestrict: "y" | "m" | "w" | null,
  timeoutMs: number,
  domainWhitelist: string[],
  domainBlacklist: string[],
  cache: {
    enabled: boolean,
    ttlDays: number
  },
  circuitBreaker: {
    enabled: boolean,
    failureThreshold: number,
    resetTimeoutSec: number
  },
  providers: {
    googleCse?: { enabled: boolean, priority: number, dailyQuotaLimit: number },
    serpapi?: { enabled: boolean, priority: number, dailyQuotaLimit: number },
    serper?: { enabled: boolean, priority: number, dailyQuotaLimit: number },
    brave?: { enabled: boolean, priority: number, dailyQuotaLimit: number }
  }
}
```

Rationale:

- keeps SR runtime independent from Analysis UCM
- preserves familiar search concepts
- supports later extraction into a separate SR service API

### 2. Stop Loading Shared Search Config In SR Route

Replace this current pattern:

- load `sr`
- load `search`
- assign `SR_SEARCH_CONFIG = searchConfigResult.config`

with:

- load `sr`
- derive SR evaluation search runtime from `sr.evaluationSearch`

### 3. Split Search Orchestration

Keep a shared provider execution layer, but split orchestrators:

- Analysis orchestrator
- SR orchestrator

The SR orchestrator must own:

- AUTO provider ordering
- AUTO accumulation/stop behavior
- supplementary-provider policy if any
- cache policy if retained

### 4. Restore SR Baseline Behavior

For SR only, restore the old effective evidence-pool behavior:

- AUTO accumulates across primary providers until the requested result count is satisfied
- SR does not stop after the first provider that returns any result

This is the main rollback needed to address the current `48%` inflation pattern without forcing the same choice onto Analysis.

---

## Phased Implementation Plan

### Phase 1: Schema and Defaults

**Objective:** Give SR its own search config surface.

Changes:

- update `apps/web/src/lib/config-schemas.ts`
- update `apps/web/configs/sr.default.json`

Deliverables:

- `evaluationSearch` block in SR schema
- SR defaults no longer depend on shared Search defaults
- backward-compatible read path for existing flat SR fields during transition

Reviewer focus:

- is the proposed SR config shape correct?
- are any fields missing for future standalone service extraction?

### Phase 2: SR Route Decoupling

**Objective:** Remove SR runtime dependence on shared Search UCM.

Changes:

- update `apps/web/src/app/api/internal/evaluate-source/route.ts`

Deliverables:

- remove `getConfig("search", "default")` from SR route
- remove `SR_SEARCH_CONFIG: SearchConfig`
- replace with SR-owned search runtime object

Reviewer focus:

- does the route become fully UCM-independent from Analysis?
- are there any remaining leaks from shared Search config?

### Phase 3: Shared Provider Extraction

**Objective:** Separate provider execution from orchestration policy.

Changes:

- refactor `apps/web/src/lib/web-search.ts`
- add shared provider execution module if needed

Deliverables:

- shared provider registry/executors
- no shared AUTO policy requirement between Analysis and SR

Reviewer focus:

- are we separating at the right layer?
- are we avoiding code duplication without reintroducing config coupling?

### Phase 4: SR-Specific Search Orchestrator

**Objective:** Give SR its own search behavior.

Changes:

- add `apps/web/src/lib/source-reliability-search.ts` or equivalent
- wire SR route to it

Deliverables:

- SR AUTO accumulation behavior
- SR-owned provider lineup/priorities
- SR-specific cache/circuit-breaker application

Reviewer focus:

- should SR supplementary providers exist at all?
- should SR cache be isolated from Analysis cache immediately or as follow-up?

### Phase 5: Admin UI

**Objective:** Make SR search settings visible and resettable independently.

Changes:

- update `apps/web/src/app/admin/config/page.tsx`

Deliverables:

- SR admin section exposes `evaluationSearch`
- reset-to-default restores SR-owned values only

Reviewer focus:

- is the UI split clear enough for admins?
- do we need transitional messaging to prevent confusion with Analysis Search config?

### Phase 6: Migration and Verification

**Objective:** Migrate existing stored config safely and prove independence.

Changes:

- migration logic in config parse/load path if needed
- tests

Deliverables:

- old SR config still loads
- new SR config writes in the new structure
- tests prove Analysis Search UCM changes do not alter SR runtime

Reviewer focus:

- is the migration safe for existing pre-release config DBs?
- are the regression tests sufficient?

---

## SR Rollback Baseline

The rollback target should be SR-owned behavior approximating the pre-regression state, not "whatever the current shared Search config says."

### Keep As SR Defaults

- `enabled: true`
- `multiModel: true`
- `confidenceThreshold: 0.8`
- `consensusThreshold: 0.2`
- `rateLimitPerIp: 10`
- `domainCooldownSec: 60`
- `evalUseSearch: true`
- `evalSearchMaxResultsPerQuery: 3`
- `evalMaxEvidenceItems: 12`
- `evalSearchDateRestrict: null`

### Move Under SR-Owned Search Defaults

- `provider: "auto"`
- provider priorities and enabled flags
- timeout
- domain whitelist / blacklist
- cache settings
- circuit breaker settings

### Behavior To Restore

- accumulate across primary providers until fill target is reached
- do not stop on first provider that returns any result

### Deliberate Open Decision

The exact SR baseline provider lineup needs review:

Option A:
- use old effective baseline for parity
- likely Google CSE + SerpAPI + Brave
- exclude Serper initially

Option B:
- keep Serper available for SR
- but still restore accumulation semantics

This decision materially affects parity versus February results and should be reviewed explicitly.

---

## Risks and Concerns

### Risk 1: Hidden Shared Cache Coupling

If SR and Analysis continue using the same search cache database and the same cache keys, behavior can still bleed across even after config separation.

Mitigation:

- include provider/orchestrator identity in SR cache keys, or
- give SR its own search cache database/path

### Risk 2: Config Migration Drift

Adding nested SR search config without migration support may break existing stored SR profiles.

Mitigation:

- transitional read compatibility for old flat fields
- write new nested structure going forward

### Risk 3: Review Ambiguity On "Parity"

"Revert SR back" can mean:

1. revert recent route/prompt changes
2. revert shared search dispatch semantics
3. revert provider lineup
4. reproduce exact 2026-02-18 cached scores

This document assumes the intended target is:

- restore old SR search behavior and independence
- not guarantee exact historical byte-for-byte reproduction

### Risk 4: Analysis Behavior Drift During Refactor

If provider extraction is done carelessly, Analysis search behavior may change unintentionally.

Mitigation:

- split orchestration only
- keep Analysis search behavior unchanged unless explicitly approved

---

## Verification Plan

### Required

1. SR route no longer loads `search` config.
2. Changing Analysis `search` UCM does not change SR runtime config.
3. SR AUTO accumulates across providers.
4. SR reset-to-default restores SR-owned values.
5. Fresh SR evaluations for `weltwoche.ch` and `weltwoche.de` no longer follow the current `48%` pattern caused by first-hit-only AUTO behavior.

### Recommended

1. Add unit tests for SR search orchestrator.
2. Add regression tests for multi-provider accumulation.
3. Add a config migration test for old flat SR config.
4. Verify admin UI reset works correctly.

---

## Open Questions For Review

1. Should SR get its own search cache immediately, or is config/orchestrator separation enough for the first cut?
2. Should SR keep Serper in its default provider lineup, or should we prioritize historical parity and exclude it initially?
3. Should SR retain supplementary providers at all, or should its search be limited to primary web providers?
4. Should the SR config use a nested `evaluationSearch` object, or keep prefixed flat fields for simpler admin UI continuity?
5. Is exact historical parity a requirement, or is restoring independence plus old accumulation behavior sufficient?

---

## Reviewer Quick Start

If a reviewer only has 5-10 minutes, read these sections in order:

1. `Problem Statement`
2. `What Reviewers Need To Know`
3. `Proposed Design`
4. `SR Rollback Baseline`
5. `Open Questions For Review`

### Reviewer Checklist

- Does the document prove that SR is currently coupled to Analysis UCM/runtime?
- Does the proposed boundary cleanly separate SR config ownership from Analysis config ownership?
- Is the separation layer correct: shared provider executors allowed, shared orchestration disallowed?
- Is the rollback target specific enough to implement safely?
- Are the migration and cache risks called out clearly enough?
- Are any important fields or rollout steps missing?

### Reviewer Prompts By Role

#### Lead Developer

Focus on implementation feasibility and blast radius.

- Is the proposed split between provider execution and orchestration the right abstraction?
- Does the plan minimize risk to existing Analysis behavior?
- Is the phased commit order technically sound?
- Are there simpler implementation options that preserve the same boundary?

#### Lead Architect

Focus on service boundary and long-term modularity.

- Does this plan create the right separation for future SR service extraction?
- Are any hidden dependencies between SR and Analysis still left in place?
- Is `evaluationSearch` the right contract shape for a future standalone SR service?
- Should cache separation be part of the first cut or a follow-up?

#### UCM / Config Reviewer

Focus on config ownership, migration, and admin ergonomics.

- Are SR-owned search settings placed in the correct config tier?
- Is the migration path for existing SR profiles safe enough?
- Will reset-to-default semantics become unambiguous for admins?
- Is the nested-vs-flat config tradeoff handled clearly enough?

#### Code Reviewer

Focus on regression prevention.

- Are the required tests sufficient to prove SR no longer inherits Analysis search behavior?
- Is cache contamination between SR and Analysis adequately addressed?
- Are the open questions concrete enough to block unsafe implementation assumptions?

---

## Recommendation

Approve the separation in two decisions:

### Decision A: Architecture

Approve that SR must no longer load or inherit shared Analysis Search UCM at runtime.

### Decision B: Rollback Posture

Approve that SR should restore old accumulation semantics inside an SR-specific search orchestrator, with provider-lineup parity reviewed explicitly.

This is the minimum clean path that:

- fixes the current SR regression class
- protects Analysis from SR-specific rollback pressure
- advances the long-term goal of SR as a standalone service

---

## Review Log

| Date | Reviewer Role | Status | Comments |
|------|---------------|--------|----------|
| 2026-03-10 | Senior Developer (Claude Opus 4.6) | REQUEST_CHANGES | See review below |
| 2026-03-10 | Senior Developer (Cline GPT 5.4) | REQUEST_CHANGES | See review below |
| 2026-03-10 | Lead Developer (Gemini 3) | REQUEST_CHANGES | See review below |
| 2026-03-10 | Lead Architect (Claude Opus 4.6) | APPROVED | Consolidated plan added; all review concerns resolved; 7 architectural decisions recorded |

### Review: Senior Developer (Claude Opus 4.6) - 2026-03-10

**Overall Assessment:** REQUEST_CHANGES

#### Strengths

- Excellent problem framing. The document correctly identifies that the SR score regression is caused by the shared search stack, not by SR-specific code. The investigation trail (Phase 2.4 revert → still 48% → must be search layer) is clearly documented.
- The "What Reviewers Need To Know" section is exceptionally well-written. It preemptively addresses the three most likely misunderstandings (not a bug fix only, not a prompt problem, not SR-only).
- The separation boundary is well-chosen: shared provider executors OK, shared orchestration policy not OK. This is the right abstraction layer.
- Non-goals are clear and appropriately scoped.
- The reviewer quick-start, checklist, and role-specific prompts are a model for how WIP reviews should be structured.
- Open questions are concrete and decision-ready — the Captain can answer each one without needing further investigation.

#### Concerns

- **[CRITICAL]** Section "2. Quality Problem" cites commit `8bef6a91` as the source of the `break` change on 2026-03-09. Verified: the commit exists (`fix(pipeline): verdict factual-vs-positional guidance, AUTO mode stop on first success`) but its date is actually **2026-03-05**, not 2026-03-09. The date should be corrected to avoid confusion during implementation. Phase 2.4 commit 2 (`e3f1228e`, 2026-03-09) is the SR-specific change that was already reverted — these are two separate commits and should not be conflated.
- **[CRITICAL]** Section "4. Current Default Drift" states that the JSON defaults enable `serper` and `brave` while the TypeScript defaults disable both. Verified correct: `search.default.json` has `serper: enabled: true, brave: enabled: true (priority 10)`, while `DEFAULT_SEARCH_CONFIG` in `config-schemas.ts` has both `enabled: false`. However, the plan does not clarify **which defaults win at runtime**. Investigation shows: `parseTypedConfig()` merges stored DB config with TypeScript `DEFAULT_SEARCH_CONFIG` (via `getDefaultConfig()`) — so the TypeScript defaults apply to any field missing from the stored config. But the JSON seed file is what initially populates the DB via `reseed-all-prompts.ts`. So the effective runtime config depends on: (a) whether the DB was seeded from JSON, and (b) whether any field is missing from the stored config. This merge path needs to be documented in the plan because it directly affects whether the drift is observable at runtime and whether `--force-configs` fixes or worsens the problem.
- **[CRITICAL]** The plan proposes 6 phases but does not address the **immediate quality regression**. The user expects weltwoche.de/ch to score 29-38%, not 48%. Phases 1-6 are a multi-day architectural separation. There is no "Phase 0: Quick fix to restore SR scores now." The plan should either (a) include a minimal immediate fix (e.g., SR route passes its own search options that override the `break` behavior), or (b) explicitly state that scores will remain inflated until the full separation is complete, so the Captain can decide whether to accept that timeline.
- **[SUGGESTION]** The `evaluationSearch` nested config (Proposed Design §1) duplicates most of `SearchConfig`'s shape. Consider whether SR should instead compose a `SearchConfig`-compatible object from its own defaults and pass it to the existing `searchWebWithProvider()` — but with an SR-specific orchestration function replacing the auto-mode logic. This would reduce schema duplication and avoid needing to keep two parallel config shapes in sync.
- **[SUGGESTION]** Risk 1 (Hidden Shared Cache Coupling) is correctly identified but understated. The search cache uses query + provider as cache key. If SR and Analysis happen to issue the same query string, one will serve the other's cached results regardless of config separation. For true isolation, the cache key must include a caller context (e.g., `sr:` prefix) or SR must use a separate cache. This should be elevated to a Phase 1 or Phase 2 concern, not deferred.
- **[SUGGESTION]** Phase 3 (Shared Provider Extraction) and Phase 4 (SR-Specific Orchestrator) could likely be collapsed into a single phase. The current `searchWebWithProvider()` already accepts a `config` parameter — an SR-specific orchestrator could be a new function (e.g., `searchWebForSR()`) that accepts `SREvaluationSearchConfig` and implements accumulation semantics, while internally calling the same provider executors. No extraction/refactor of `web-search.ts` is needed for SR to stop using its auto-mode. Collapsing these reduces blast radius and avoids touching Analysis code.
- **[QUESTION]** The plan lists `evalUseSearch: true` under "Keep As SR Defaults". Given the user's feedback that search was "always on" before `evalUseSearch` was introduced as a toggle, should `evalUseSearch` be removed entirely from the schema? It now serves no purpose — it was added as part of Phase 2.4 to allow disabling search, but the user has stated that disabling search produces invalid results (0% / `insufficient_data`). Keeping a dead toggle invites future misconfiguration. **Captain Decision: D1 — Remove it.**
- **[QUESTION]** The verification plan requires fresh SR evaluations for weltwoche.ch and weltwoche.de to "no longer follow the 48% pattern." But SR evaluation is non-deterministic (two LLMs + variable search results). What is the acceptance band? **Captain Decision: D2 — 32-38%.**
- **[QUESTION]** Should existing SR cached scores be bulk-invalidated after implementation? **Captain Decision: D3 — Yes, flush all entries after 2026-03-05.**

#### Specific Comments

- Line 65: Commit hash `8bef6a91` date should be corrected from "2026-03-09" to "2026-03-05".
- Lines 82-90 (Configuration Problem): Add clarification about the `parseTypedConfig()` merge path. The JSON seed file populates the DB; the TypeScript defaults are used as merge fallback for missing fields. These are two different defaults surfaces and the plan should state which one is authoritative for SR going forward.
- Lines 196-220 (evaluationSearch schema): Missing `provider` ordering/accumulation policy field. The whole point of separation is to restore multi-provider accumulation for SR. The schema should either include an `autoMode: "accumulate" | "first-success"` field, or the plan should state that SR always accumulates (hardcoded behavior, not configurable).
- Lines 405-410 (Move Under SR-Owned Search Defaults): The list says "provider priorities and enabled flags" but does not specify which providers should be enabled in the SR baseline. This is the most impactful decision for score parity and should not be deferred to implementation time.
- Lines 484-488 (Verification Plan - Required): Item 5 needs a quantitative acceptance criterion, not just "no longer follows the 48% pattern."

### Review: Senior Developer (Cline GPT 5.4) - 2026-03-10

**Overall Assessment:** REQUEST_CHANGES

#### Strengths

- Excellent problem framing. The document correctly identifies that the SR score regression is caused by the search stack, not SR logic.
- The "What Reviewers Need To Know" section preemptively clears common misconceptions.
- The separation boundary (shared executors, split orchestration) is architecturally sound.

#### Concerns

- **[CRITICAL]** Commit `8bef6a91` date is 2026-03-05, not 2026-03-09. This distinction is important for cache invalidation strategies.
- **[CRITICAL]** Default drift: The plan needs to clarify the `parseTypedConfig()` merge behavior and establish which surface is the "source of truth" for SR.
- **[CRITICAL]** Missing "Phase 0": We need a tactical fix (passing overrides to the current search) to restore scores immediately while the refactor proceeds.
- **[SUGGESTION]** Collapse Phase 3/4: Avoid unnecessary extraction; just create an SR-specific search function that uses existing providers.
- **[SUGGESTION]** Cache key isolation is a Phase 1/2 requirement, not a risk to be deferred.
- **[QUESTION]** Should `evalUseSearch` be removed if it's mandatory for valid SR results?
- **[QUESTION]** What is the exact quantitative acceptance band for "parity"?

#### Specific Comments

- **Problem framing:** Strong overall. The document correctly ties the observed SR regression to operational coupling rather than to prompt quality, model drift, or an isolated route bug. That is the right foundation for the plan.
- **Proposed architecture:** The target boundary is good, but the implementation path should stay lighter-weight than the current Phase 3/4 wording suggests. You likely do **not** need a broad extraction/refactor of `web-search.ts` before SR can be decoupled. A narrower SR-specific orchestrator that reuses existing provider executors is sufficient for the first cut.
- **Rollback posture:** The rollback target is directionally correct, but still underspecified. "Restore accumulation" is necessary, yet not sufficient. The plan also needs to state the intended baseline provider lineup, because provider lineup and accumulation semantics together determine the effective evidence pool.
- **Implementation feasibility:** The plan is feasible, but too sequential for the urgency of the current regression. Right now it reads as an architecture-first refactor. It should explicitly separate:
  1. an immediate SR-only tactical restoration path, and
  2. the longer-term clean separation path.
- **Migration risk:** The document correctly notes backward compatibility, but it should explicitly explain how old flat SR fields are read, when nested `evaluationSearch` becomes authoritative, and how reset/reseed interacts with DB-stored configs versus TypeScript defaults.
- **Cache risk:** This is more than a generic risk. It is a likely residual failure mode even after config separation. The current search cache key is based on query/options and does not include an SR-vs-Analysis caller identity. Without cache namespace isolation or key prefixing, SR can still consume Analysis-shaped cached results.
- **Verification:** The current wording "no longer follows the 48% pattern" is too soft. Verification should use explicit pass/fail criteria, especially because SR evaluation has natural run-to-run variance.

#### Open Questions That Still Need Captain Decision

- **Immediate remediation scope:** Is a tactical SR-only fix required before the full separation lands, or is the team accepting inflated SR scores until the full refactor is complete?
- **Cache isolation mode:** Should SR use a prefixed cache namespace / caller-context key, or a separate cache DB/path from day one?
- **Baseline lineup:** Should SR optimize for February parity first (likely no Serper), or accept some baseline drift in exchange for a broader default provider set?
- **Verification threshold:** What exact acceptance rule applies to `weltwoche.de` and `weltwoche.ch`? A hard target band is needed, not qualitative wording.
- **Post-fix cache invalidation:** Should all SR cache entries produced after the AUTO behavior change be invalidated as part of rollout?

#### Recommended Plan Adjustments

1. Add **Phase 0: Tactical Score Restoration** for SR only.
2. Document the runtime precedence between:
   - seeded JSON defaults,
   - DB-stored active config,
   - TypeScript fallback defaults used by `parseTypedConfig()`.
3. Promote cache isolation from a generic risk to an explicit design/implementation item.
4. Collapse or simplify Phase 3/4 so the first implementation does not over-refactor shared Analysis code.
5. Replace qualitative verification language with numeric pass/fail criteria.

### Review: Lead Developer - 2026-03-10 (Gemini 3)

**Overall Assessment:** REQUEST_CHANGES

#### Problem Framing
The root cause analysis is spot-on. The coupling of SR to the "Analysis" search profile was a ticking time bomb for quality stability. Using the `48%` weltwoche regression as the catalyst for this separation is the right move.

#### Proposed Architecture
I support the nested `evaluationSearch` structure. It aligns perfectly with the long-term goal of SR as a standalone service. However, I agree with the Senior Developer that we should avoid a heavy refactor of `web-search.ts`. The orchestrator should be the only split point.

#### Rollback Strategy
The "accumulation" behavior is the correct target. The plan should explicitly specify the provider lineup for this baseline. I recommend **Google CSE + Brave + SerpAPI** (if configured), excluding Serper for the initial restoration to maximize February parity.

#### Implementation Feasibility
Phases 1-5 are logical but I want to see **Phase 1 (Schema)** and **Phase 2 (Route Decoupling)** prioritized for the "Phase 0" tactical fix. We can hardcode the accumulation behavior in a temporary SR-specific wrapper within the route before formalizing the orchestrator in Phase 4.

#### Migration and Cache Risks
- **[CRITICAL] Cache Pollution:** Config separation alone won't fix this if `weltwoche.de` results are already in the cache with the "broken" single-provider evidence packs. We MUST either:
  1. Add a `context: "sr"` field to the cache key, or
  2. Implement a targeted cache flush for SR queries since 2026-03-05.
  I prefer (1) as it's a permanent architectural fix for isolation.
- **Migration:** The "backward-compatible read" is mandatory. We cannot break existing pre-release DBs.

#### Open Questions For Captain
- **Cache Isolation:** Do we prefix keys (cheaper) or use a separate DB (cleaner)? I recommend prefixing.
- **Baseline Lineup:** Should we stick strictly to the Feb 18 providers (No Serper)? I recommend NO SERPER for the first cut.
- **Acceptance Band:** Is ≤38% for weltwoche.ch the hard pass/fail criteria?

#### Specific Comments
- **Section 2.4 (Default Drift):** This is a known UCM pain point. The plan should mandate that `reseed-all-prompts.ts` be updated as part of Phase 1 to ensure the DB reflects the new SR search defaults.
- **Section 5 (Phased Plan):** Please add a "Phase 0: Tactical Score Restoration" to the top of the list.
- **Verification:** Add a requirement to verify that the `SearchConfig` (Analysis) can still use "first-success" AUTO while SR uses "accumulation" AUTO simultaneously.


---

## Consolidated Implementation Plan (Lead Architect)

**Consolidation date:** 2026-03-10
**Consolidator:** Lead Architect (Claude Opus 4.6)
**Inputs:** 3 reviews (Senior Developer/Opus 4.6, Senior Developer/GPT 5.4, Lead Developer/Gemini 3) + Captain Decisions D1-D3

### Review Convergence Summary

All three reviewers independently reached REQUEST_CHANGES with strong convergence on the same issues:

| Issue | All 3 Agree | Resolution |
|-------|-------------|------------|
| Commit `8bef6a91` date is 2026-03-05, not 2026-03-09 | Yes | Corrected in this section |
| `parseTypedConfig()` merge path must be documented | Yes | Documented below (§ Runtime Config Precedence) |
| Missing Phase 0 for immediate score restoration | Yes | Added below |
| Cache isolation is near-term, not a deferred risk | Yes | Promoted to Phase 1 |
| Phase 3/4 should be collapsed (avoid over-refactoring web-search.ts) | Yes | Collapsed into single phase |
| Verification needs quantitative pass/fail | Yes | D2: 32-38% |
| SR baseline provider lineup must be specified | Yes | Google CSE + SerpAPI + Brave; no Serper |
| `evaluationSearch` schema needs `autoMode` field | Opus 4.6 | Added |

No conflicts between reviewers. Differences were in emphasis only.

### Corrected Facts

- Commit `8bef6a91` (`fix(pipeline): verdict factual-vs-positional guidance, AUTO mode stop on first success`) is dated **2026-03-05**, not 2026-03-09.
- Commit `e3f1228e` (2026-03-09) is the separate SR-specific route change that was already reverted. These must not be conflated.

### Runtime Config Precedence (Previously Undocumented)

Three config surfaces interact at runtime. Understanding their precedence is critical for this plan:

```text
1. DB-stored config (written by Admin UI or reseed)
   ↓ merged with
2. TypeScript defaults (DEFAULT_SR_CONFIG / DEFAULT_SEARCH_CONFIG in config-schemas.ts)
   via parseTypedConfig() — TS defaults fill any field MISSING from DB
   ↓ seeded from
3. JSON seed files (configs/sr.default.json, configs/search.default.json)
   via reseed-all-prompts.ts — populates DB on first run or --force-configs
```

**Effective runtime config** = DB-stored values merged with TypeScript defaults for any missing fields.

**Current drift:** `search.default.json` enables serper+brave, but `DEFAULT_SEARCH_CONFIG` (TypeScript) disables both. If a DB record was seeded from JSON, serper+brave are enabled. If a field is missing from the DB record, TypeScript defaults apply (disabled). This ambiguity is eliminated for SR by this plan: SR will have its own config surface with aligned JSON and TypeScript defaults.

**Rule going forward:** For any config profile, the JSON seed file and TypeScript defaults MUST agree. The JSON seed file is the human-readable reference; the TypeScript default is the programmatic fallback. They must encode the same values.

### Consolidated Phase Plan

The original 6-phase plan is restructured into 5 phases, with a new Phase 0 prepended and Phases 3/4 collapsed.

#### Phase 0: Tactical Score Restoration (IMMEDIATE)

**Objective:** Restore SR scores to the 32-38% band NOW, before the full architectural separation.

**Approach:** In the SR route (`evaluate-source/route.ts`), pass an override to the existing `searchWebWithProvider()` that forces multi-provider accumulation for SR calls only. This is a minimal, targeted change that does not touch Analysis behavior.

**Implementation:**

1. Add a `callerContext: "sr" | "analysis"` parameter (or equivalent) to `searchWebWithProvider()`.
2. When `callerContext === "sr"`, skip the `if (providerResults.length > 0) break;` early-exit — instead accumulate across primary providers until the requested result count is filled.
3. In `evaluate-source/route.ts`, pass `callerContext: "sr"` when calling `searchWebWithProvider()`.
4. Add `sr:` prefix to search cache keys when `callerContext === "sr"` (cache isolation — see below).

**What this does NOT do:** No schema changes, no config restructuring, no admin UI changes. Pure behavior override for SR callers.

**Verification:** Fresh evaluation of `weltwoche.ch` must return 32-38% (D2).

**Cache flush:** Execute D3 — invalidate all SR cache entries after 2026-03-05.

#### Phase 1: Schema, Defaults, and Cache Isolation

**Objective:** Give SR its own search config surface with aligned defaults, and isolate SR cache.

**Changes:**

- `apps/web/src/lib/config-schemas.ts`:
  - Add `evaluationSearch` block to `SourceReliabilityConfigSchema`
  - Remove `evalUseSearch` (D1 — search is always on)
  - Ensure TypeScript defaults match the JSON seed below
- `apps/web/configs/sr.default.json`:
  - Add `evaluationSearch` block with SR-owned defaults
  - Remove `evalUseSearch`
- `apps/web/src/lib/web-search.ts`:
  - Formalize `callerContext` in cache key (if not done in Phase 0)

**SR `evaluationSearch` schema (final):**

```ts
evaluationSearch: {
  provider: "auto" | "google-cse" | "serpapi" | "serper" | "brave",
  autoMode: "accumulate" | "first-success",  // SR default: "accumulate"
  maxResultsPerQuery: number,                 // SR default: 3
  maxEvidenceItems: number,                   // SR default: 30 (raised from 12 when keyword pre-filter replaced by LLM relevance)
  dateRestrict: "y" | "m" | "w" | null,      // SR default: null
  timeoutMs: number,                          // SR default: 15000
  providers: {
    googleCse: { enabled: boolean, priority: number },   // true, 1
    serpapi: { enabled: boolean, priority: number },      // true, 2
    brave: { enabled: boolean, priority: number },        // true, 3
    serper: { enabled: boolean, priority: number }        // false, 4
  }
}
```

**Design decisions:**

- `autoMode: "accumulate"` is the key behavioral separation. SR always accumulates across providers. Analysis retains `"first-success"`.
- Provider lineup for SR baseline: **Google CSE + SerpAPI + Brave enabled; Serper disabled.** This matches the effective pre-regression provider set and maximizes February parity (per Gemini 3 recommendation, all reviewers agree).
- `dailyQuotaLimit` from the original proposal is dropped — it duplicates search-level quota management and adds complexity without value for SR.
- `domainWhitelist`/`domainBlacklist` from the original proposal are dropped — SR doesn't need domain filtering at the search level (it evaluates whatever domain it's given).
- `circuitBreaker` from the original proposal is dropped — SR makes few search calls per evaluation; circuit breaker is an Analysis-scale concern.
- `cache` sub-object from the original proposal is dropped — SR cache is managed by the SR cache layer (`source-reliability.db`), not by search cache config.

**Migration:** `parseTypedConfig()` already handles missing fields by falling back to TypeScript defaults. When `evaluationSearch` is absent from a stored SR config, the TypeScript default fills it. No explicit migration code needed — but `reseed-all-prompts.ts` must be updated to include the new block in the seed file.

**Removed fields:** `evalUseSearch` removed from schema, defaults, seed, admin UI, and route (D1).

#### Phase 2: SR Route Decoupling

**Objective:** Remove SR runtime dependence on shared Search UCM.

**Changes in `evaluate-source/route.ts`:**

1. Remove `getConfig("search", "default")` call
2. Remove `SR_SEARCH_CONFIG: SearchConfig` assignment
3. Read search parameters from `srConfig.evaluationSearch` instead
4. Build a `SearchConfig`-compatible object from `evaluationSearch` values and pass it to `searchWebWithProvider()` with `callerContext: "sr"`

**Key point (from Opus 4.6 review):** SR composes a `SearchConfig`-compatible object from its own defaults rather than duplicating the full `SearchConfig` type. This avoids maintaining two parallel config shapes.

**Verification:** After this phase, changing any value in the Analysis `search` UCM profile must have zero effect on SR evaluation behavior. Test by toggling Analysis search settings and confirming SR scores don't change.

#### Phase 3: SR Search Orchestrator (collapsed from original Phases 3+4)

**Objective:** Give SR its own search orchestration without refactoring `web-search.ts`.

**Approach (per reviewer consensus):** Do NOT extract/refactor the shared provider layer in `web-search.ts`. Instead:

1. Create `apps/web/src/lib/source-reliability-search.ts` (or a function within the SR module)
2. This function accepts `SREvaluationSearchConfig`, builds a `SearchConfig`-compatible object, and calls `searchWebWithProvider()` with `callerContext: "sr"` and `autoMode: "accumulate"`
3. The `autoMode` field controls accumulation behavior inside `searchWebWithProvider()` — a single `if` check replaces the current hardcoded `break`

**Why this is better than original Phase 3/4:**
- No extraction or restructuring of `web-search.ts`
- No blast radius to Analysis code
- Analysis behavior unchanged (it passes `autoMode: "first-success"` or defaults to current behavior)
- SR gets full behavioral independence through config, not code duplication

#### Phase 4: Admin UI and Verification (original Phases 5+6 collapsed)

**Objective:** Expose SR search settings in admin UI and verify full independence.

**Admin UI changes (`apps/web/src/app/admin/config/page.tsx`):**

- Add `evaluationSearch` section under SR config panel
- Remove `evalUseSearch` toggle
- Reset-to-default restores SR-owned values only (not Analysis search values)
- Clear labeling: "SR Evaluation Search" distinct from "Analysis Search"

**Verification (quantitative pass/fail):**

| Test | Pass Criterion |
|------|---------------|
| SR route does not load `search` config | No `getConfig("search", ...)` call in SR code path |
| Analysis search UCM changes don't affect SR | Toggle Analysis provider → SR score unchanged |
| SR AUTO accumulates across providers | With 3 providers enabled, all 3 queried (not just first) |
| SR reset-to-default restores SR values | Reset → `evaluationSearch` matches SR seed defaults |
| `weltwoche.ch` fresh evaluation | 32-38% (D2) |
| `weltwoche.de` fresh evaluation | 32-38% (D2) |
| Analysis AUTO retains first-success | Analysis search still stops on first provider hit |

**Regression tests to add:**

1. SR search orchestrator accumulates across providers (unit test)
2. Analysis search stops on first success (unit test — existing behavior preserved)
3. Config isolation: SR and Analysis search configs are independent objects (unit test)
4. Cache key includes caller context prefix (unit test)
5. Migration: old flat SR config loads correctly when `evaluationSearch` is absent (unit test)

### Post-Implementation Actions

1. **Cache flush (D3):** Invalidate all SR cache entries with `evaluatedAt > 2026-03-05`. SQL: `DELETE FROM source_reliability_cache WHERE evaluatedAt > '2026-03-05'` (or equivalent).
2. **Reseed:** Run `reseed-all-prompts.ts` to populate DB with new SR seed defaults.
3. **Smoke test:** Fresh SR evaluations for `weltwoche.ch`, `weltwoche.de`, and 2-3 other domains across reliable/unreliable spectrum.
4. **Default drift audit:** Verify that `sr.default.json` and `DEFAULT_SR_CONFIG` in `config-schemas.ts` agree on every field value. Fix any drift.
5. **Search default drift:** Separately audit and fix the existing `search.default.json` vs `DEFAULT_SEARCH_CONFIG` drift (serper/brave). This is out of scope for this plan but should be tracked as a follow-up.

### Implementation Priority and Sequencing

```text
Phase 0 ──→ Phase 1 ──→ Phase 2 ──→ Phase 3 ──→ Phase 4
(hours)      (hours)      (hours)      (hours)      (1-2 days)
 ↑                                                    ↑
 IMMEDIATE                                     Can be deferred
 (unblocks score parity)                    (UI polish + full test suite)
```

Phase 0 is the urgent tactical fix. Phases 1-3 are the architectural separation (can be done as a single focused session). Phase 4 (admin UI + full verification) can follow.

### Scope Boundaries

**In scope:** SR search config independence, SR search orchestration, cache isolation, `evalUseSearch` removal, verification.

**Out of scope (unchanged from original plan):**
- No prompt redesign
- No Analysis search quality fixes
- No provider implementation rewrite
- No search.default.json vs config-schemas.ts drift fix (separate follow-up)
- No production deployment procedure

---

## Decision Record

### Captain Decisions — 2026-03-10

**D1: Remove `evalUseSearch` entirely.**
The toggle serves no purpose — search must always be on for valid SR results. Remove from schema, defaults, seed file, admin UI, and route. SR evaluation always uses web search.

**D2: Acceptance band is 32-38% for weltwoche.ch.**
This is the hard pass/fail criterion for score parity verification. Fresh evaluations of weltwoche.ch and weltwoche.de must fall within this range after implementation.

**D3: Bulk-invalidate all SR cached scores after 2026-03-05.**
All SR cache entries dated after commit `8bef6a91` (2026-03-05) were computed with broken single-provider evidence packs and must be flushed.

### Architectural Decisions — 2026-03-10 (Lead Architect)

**A1: Phase 0 tactical fix via `callerContext` parameter.**
Add a `callerContext: "sr" | "analysis"` parameter to `searchWebWithProvider()`. SR calls accumulate across providers; Analysis calls retain first-success. This unblocks score restoration immediately without architectural changes.

**A2: `autoMode` as the separation mechanism.**
The `evaluationSearch` schema includes `autoMode: "accumulate" | "first-success"`. This is the behavioral pivot that makes SR independent. SR defaults to `"accumulate"`. Analysis defaults to `"first-success"` (current behavior). The existing `searchWebWithProvider()` reads this field to decide whether to `break` on first results.

**A3: SR baseline provider lineup — Google CSE + SerpAPI + Brave; no Serper.**
Serper excluded from SR defaults to maximize February parity. Serper remains available (can be enabled via admin UI) but is off by default for SR. All three reviewers and the Lead Developer recommendation align on this.

**A4: Cache key isolation via caller-context prefix.**
Search cache keys include a `sr:` or `analysis:` prefix to prevent cross-contamination. This is a Phase 0/1 concern, not deferred. Avoids the need for a separate cache database while providing full isolation.

**A5: No extraction/refactor of `web-search.ts`.**
Original Phase 3 (shared provider extraction) is unnecessary. SR creates its own orchestrator function that composes a `SearchConfig`-compatible object and calls the existing `searchWebWithProvider()`. Analysis code is untouched. All three reviewers agree.

**A6: Schema simplification — drop `dailyQuotaLimit`, `domainWhitelist/Blacklist`, `circuitBreaker`, `cache` sub-objects.**
The original `evaluationSearch` proposal over-specified. SR makes few search calls per evaluation. These fields add complexity without value. Can be added later if SR scales.

**A7: JSON seed and TypeScript defaults must always agree.**
Going forward, for any config profile, the JSON seed file and the TypeScript `DEFAULT_*_CONFIG` must encode identical values. The JSON file is the human-readable reference; the TypeScript default is the programmatic fallback. Drift between them is a bug.
