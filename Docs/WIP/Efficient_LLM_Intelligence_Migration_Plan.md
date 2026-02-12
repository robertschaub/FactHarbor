# Efficient LLM Intelligence Migration Plan

Status: Under Review (2nd pass) — Post-Enforcement Update 2026-02-12
Owner Role: Senior Developer + LLM Expert
Priority: Critical
Date: 2026-02-11
Updated: 2026-02-12

---

## Post-Enforcement Update — 2026-02-12

### What Changed

The AGENTS.md Enforcement session (2026-02-11/12) executed portions of this plan and resolved several items:

#### COMPLETED Items

| Checklist Item | Resolution |
|----------------|------------|
| `inferContextTypeLabel` hardcoded patterns removed | ✅ DONE — Phase 2 of enforcement. All regex removed, now reads LLM `typeLabel` |
| `config.ts` added to Section 3 primary scope | ✅ DONE — already listed in scope below |
| Uncommitted normalization changes committed | ⏳ PENDING — tests pass, build clean, awaiting user commit request |

#### RESOLVED: [CRITICAL-5] New Deterministic Text Logic

The newly-created violating code flagged in CRITICAL-5 has been **DELETED** (not just annotated):

| Removed | File | Why |
|---------|------|-----|
| `stemTerm()` + `STEM_SUFFIXES` | `grounding-check.ts` | New deterministic NLP — violated "MUST NOT be created" |
| Extended `STOP_WORDS` (10 analytical terms) | `grounding-check.ts` | New hardcoded stopwords |
| `isValidSplitPoint()` + `MODIFIER_CONTEXT_WORDS` | `normalization-heuristics.ts` | New deterministic NLP guards |
| `ENTITY_STOPWORDS` | `analysis-contexts.ts` | New hardcoded English word filter |

**Lesson learned:** The approach of adding `// MIGRATION` annotations to new violating code is INSUFFICIENT. The AGENTS.md rule "New deterministic text-analysis decision logic MUST NOT be created" means new code must be prevented or removed, not annotated.

#### Updated Function Inventory

| Function | Location | Classification | Priority | Status (2026-02-12) |
|----------|----------|---------------|----------|---------------------|
| `inferContextTypeLabel` | `config.ts:175` | ~~🔴 REPLACE~~ | ~~P0~~ | ✅ **DONE** — reads LLM `typeLabel` now |
| `calculateTextSimilarity` | `orchestrated.ts:2131` | 🟡 **REPLACE** | P1 | NOT DONE — 5 semantic call sites flagged with `// MIGRATION` |
| `calculateContextSimilarity` | `orchestrated.ts:2203` | 🟡 **REPLACE** | P1 | NOT DONE — weighted multi-field Jaccard |
| `calculateTextSimilarity` | `analysis-contexts.ts:256` | 🟡 **REPLACE** | P1 | NOT DONE — duplicate Jaccard for context name dedup |
| `calculateSimilarity` | `evidence-filter.ts:153` | 🟡 **REPLACE** | P1 | NOT DONE — Jaccard for evidence dedup |
| `extractCoreEntities` | `analysis-contexts.ts:348` | 🟡 **REPLACE** | P1 | NOT DONE — proper noun regex (1 call remaining) |
| `isRecencySensitive` | `orchestrated.ts:2661` | 🟡 **REPLACE** | P1 | NOT DONE |
| `countVaguePhrases` | `evidence-filter.ts:74` | 🟡 **REPLACE** | P1 | NOT DONE — NEW in inventory |
| `hasAttribution` | `evidence-filter.ts:99` | 🟡 **REPLACE** | P1 | NOT DONE — NEW in inventory |
| `hasLegalCitation` | `evidence-filter.ts:114` | 🟡 **REPLACE** | P1 | NOT DONE — NEW in inventory |
| `hasTemporalAnchor` | `evidence-filter.ts:137` | 🟡 **REPLACE** | P1 | NOT DONE — NEW in inventory |
| `extractKeyTerms` | `grounding-check.ts:88` | 🟠 **REPLACE** | P2 | NOT DONE — pre-existing stopword-based extraction (stemming removed) |
| `STOP_WORDS` | `grounding-check.ts:64` | 🟠 **REPLACE** | P2 | NOT DONE — pre-existing, not extended |
| `COMMON_STOPWORDS` + `tokenizeForMatch` | `orchestrated.ts:478` | 🟠 **REPLACE** | P2 | NOT DONE — NEW in inventory |
| `checkSearchResultRelevance` | `orchestrated.ts:736` | 🟠 **REPLACE** | P2 | NOT DONE — NEW in inventory |
| `isClaimAlignedWithThesis` | `verdict-corrections.ts:72` | 🟠 **REPLACE** | P2 | NOT DONE — NEW in inventory |
| `extractComparativeFrame` | `verdict-corrections.ts:180` | 🟠 **REPLACE** | P2 | NOT DONE — NEW in inventory |
| `detectCounterClaim` | `verdict-corrections.ts:51` | 🟠 **REPLACE** | P2 | NOT DONE — NEW in inventory |
| ~~`stemTerm`~~ | ~~`grounding-check.ts`~~ | ~~🟠 REPLACE~~ | — | **DELETED** — was new violating code |
| ~~`isValidSplitPoint`~~ | ~~`normalization-heuristics.ts`~~ | ~~🟢 KEEP~~ | — | **DELETED** — was new violating code |
| `splitByConfigurableHeuristics` | `normalization-heuristics.ts:19` | 🟢 **DEAD CODE** | — | Not called from anywhere. Can be deleted. |
| `normalizeYesNoQuestionToStatement` | `orchestrated.ts:1895` | ✅ **SIMPLIFIED** | Done | Strips `?` only. Not called from main pipeline. |
| `canonicalizeInputForContextDetection` | `analysis-contexts.ts:324` | ✅ **SIMPLIFIED** | Done | Strips punctuation + lowercases only. |
| `deriveCandidateClaimTexts` | `claim-decomposition.ts:28` | 🟢 **KEEP** | — | Structural segmentation |
| `normalizeClaimText` | `claim-decomposition.ts:13` | 🟢 **KEEP** | — | Structural normalization |
| `simpleHash` | `analysis-contexts.ts:394` | 🟢 **KEEP** | — | Deterministic hash for IDs |
| `detectInstitutionCode` | `config.ts:220` | 🟢 **KEEP** | — | ALLCAPS token extraction for IDs |
| `extractAllCapsToken` | `config.ts:151` | 🟢 **KEEP** | — | Generic regex |

**Total: 19 pre-existing violations remaining (P0 done, 10 P1, 8 P2). All require T3.3 (LLM Migration Service Foundation).**

#### Updated Checklist

- [x] `inferContextTypeLabel` hardcoded patterns removed
- [x] `config.ts` added to Section 3 primary scope
- [x] `stemTerm()` and new violating code DELETED (not just marked)
- [ ] Enhancement Plan Fixes 1-7 regression test added to Phase 4
- [ ] Uncommitted changes committed before Phase 1 starts
- [ ] Cache hit rate > 30% in validation scenarios
- [ ] Token cost per analysis job within 120% of pre-migration baseline
- [ ] "Structural plumbing" test applied to all inventory items

#### Updated Phase Sequence

- **Phase 0**: Inventory ✅ DONE (see updated table above) + commit changes ⏳ PENDING
- **Phase 1**: Service foundation + replace P1 functions (`calculateTextSimilarity` variants, `extractCoreEntities`, `isRecencySensitive`, evidence-filter patterns)
- **Phase 2**: Replace P2 functions (grounding-check extraction, search relevance, verdict-corrections heuristics)
- **Phase 3**: Verification + hardening + delete dead code (`splitByConfigurableHeuristics`)

---

## Review 2: Lead Architect — 2026-02-11 (Second Pass, Codebase-Verified)

**Overall Assessment: APPROVE WITH MANDATORY ADJUSTMENTS**

This second review verifies the plan and first review against the **actual codebase state**, including uncommitted changes on `main` that partially overlap with this plan's scope. It also cross-checks against the Generic Evidence Quality Enhancement Plan (v3.0) and AGENTS.md Fundamental Rules.

### Key Finding: Uncommitted Changes Create a Partial Head Start

The current working tree (git status: modified but unstaged) already contains changes that align with this plan's direction:

| Change | File | Migration Relevance |
|--------|------|-------------------|
| `normalizeYesNoQuestionToStatement()` **simplified** — stripped down to only remove trailing `?` | `orchestrated.ts` | ✅ Aligned: removed deterministic question-to-statement rewriting |
| `canonicalizeInputForContextDetection()` **gutted** — removed question normalization, heuristic splitting | `analysis-contexts.ts` | ✅ Aligned: trust LLM to handle question/statement equivalence |
| Entry-point normalization **removed** — user input passed as-is to LLM | `orchestrated.ts` | ✅ Aligned: less preprocessing, more LLM responsibility |
| `refineContextsFromEvidence()` — added rollback mechanism, lowered thresholds | `orchestrated.ts` | Neutral: improved plumbing, not semantic decision change |
| `normalization-heuristics.ts` — **new** `isValidSplitPoint()`, `MODIFIER_CONTEXT_WORDS` | `normalization-heuristics.ts` | ⚠️ **CONFLICT**: adds new deterministic text-analysis guards |
| `grounding-check.ts` — **new** `stemTerm()`, extended stopwords, stem matching | `grounding-check.ts` | ⚠️ **CONFLICT**: adds new deterministic NLP (stemmer, stopwords) |

**Impact on Plan:** Phase 2 (orchestrated migration) is partially done for normalization. But two files received **new** deterministic text-analysis logic that the AGENTS.md LLM Intelligence Migration rule says "MUST NOT be created."

### [CRITICAL-5] New Deterministic Text Logic Contradicts AGENTS.md

AGENTS.md §LLM Intelligence Migration states:
> "**New deterministic text-analysis decision logic MUST NOT be created.** When implementing any feature that requires understanding, classifying, comparing, or interpreting text meaning — use an LLM call, never regex, keywords, heuristics, or rules."

The uncommitted changes add:

1. **`stemTerm()` in `grounding-check.ts`** (lines 100-107) — suffix-stripping stemmer with 18 hardcoded English suffixes. This is deterministic NLP.
2. **Extended `STOP_WORDS` set** (82+ words) — hardcoded English stopwords.
3. **`isValidSplitPoint()` in `normalization-heuristics.ts`** — heuristic validation of text split locations.
4. **`MODIFIER_CONTEXT_WORDS` set** — 27 hardcoded English words.

**Nuance:** These are POST-LLM validation (grounding check verifies LLM output against evidence corpus) and PRE-LLM normalization guards. The "decisions" they make don't directly determine verdicts — they validate or prepare.

**Recommended resolution:**
- **Grounding check stemmer**: Flag as **migration candidate, Phase 3**. Replace `stemTerm()` + stopword filtering with LLM-based term extraction. Until then, accept as tactical quality fix with comment `// MIGRATION: replace with LLM term extraction`.
- **Normalization guards**: Flag as **acceptable structural plumbing** IF the split output doesn't influence analytical outcomes (it only prevents false split candidates before LLM receives them). Add comment `// STRUCTURAL: prevents false candidates, does not interpret meaning`.
- **All new stopword/suffix lists**: Must NOT be extended further. Next enhancement must use LLM.

### [CRITICAL-6] Plan Scope Must Include `config.ts`

The first review correctly identified `inferContextTypeLabel` (config.ts:175-196) as the most egregious hardcoded domain logic, but **Section 3 (Scope) still does not list `config.ts`** in primary scope. This file contains:

```typescript
/(election|electoral|ballot|campaign|ineligib|tse)\b/  → "Electoral"
/(criminal|prosecut|indict|investigat|police|coup|stf|supreme)\b/  → "Criminal"
```

The terms "tse" and "stf" are Brazil-specific (Tribunal Superior Eleitoral, Supremo Tribunal Federal). This violates AGENTS.md "Generic by Design" and "No hardcoded keywords."

**Action Required:** Add `apps/web/src/lib/analyzer/config.ts` to Section 3 primary scope.

### [CRITICAL-7] Cross-Reference: Enhancement Plan Fixes Must Not Break

The Generic Evidence Quality Enhancement Plan (v3.0) delivered 7 fixes now in `orchestrated.ts`:

| Enhancement Plan Fix | Migration Risk |
|---------------------|----------------|
| `anchorVerdictTowardClaims()` helper (lines 3122-3151) | **SAFE** — pure arithmetic, not text analysis |
| Frame signal gate (institution/court in frame key) | **SAFE** — uses metadata fields, not text parsing |
| Dedup override institutional distinctness | ⚠️ **CHECK** — compares institution strings; verify it doesn't use text similarity heuristics |
| Multi-context criticism queries | **SAFE** — query construction, not text classification |
| `validateEvidenceRecency()` (lines 2710+) | ⚠️ **CHECK** — `isRecencySensitive` is a migration candidate; ensure migration doesn't break recency flow |
| Contested factor weights (aggregation.ts) | **SAFE** — numeric weights, not text analysis |
| Verdict prompt refinement (verdict-base.ts) | **SAFE** — prompt content, not code logic |

**Action Required:** Add regression test that validates Enhancement Plan fixes survive each migration phase. Specifically test:
- Context-claims anchoring still produces expected range
- Multi-context detection still works for institutional claims
- Recency sensitivity still triggers for time-sensitive claims

### Revised Function Inventory (Codebase-Verified)

The first review's inventory is mostly correct but needs updates based on actual codebase state:

| Function | Location | Classification | Priority | Notes |
|----------|----------|---------------|----------|-------|
| `inferContextTypeLabel` | `config.ts:175` | 🔴 **REPLACE** (domain-specific regex) | **P0** | Contains "tse", "stf" — Brazil-specific |
| `calculateTextSimilarity` | `analysis-contexts.ts:259` | 🟡 **REPLACE** (Jaccard text similarity) | P1 | Generic but semantic decision |
| `extractCoreEntities` | `analysis-contexts.ts:356` | 🟡 **REPLACE** (proper noun extraction) | P1 | Stopword-based, English-specific |
| `isRecencySensitive` | `orchestrated.ts:2661` | 🟡 **REPLACE** (keyword recency detection) | P1 | Partially configurable via `cueTerms`; date logic is structural |
| `stemTerm` | `grounding-check.ts:100` | 🟠 **REPLACE** (deterministic NLP) | P2 | New code — violates migration mandate |
| `extractKeyTerms` | `grounding-check.ts:113` | 🟠 **REPLACE** (stopword-based extraction) | P2 | Depends on `stemTerm` + stopwords |
| `splitByConfigurableHeuristics` | `normalization-heuristics.ts:59` | 🟢 **KEEP/REVIEW** (structural guard) | P3 | Prevents false splits before LLM — review if still needed |
| `normalizeYesNoQuestionToStatement` | `orchestrated.ts:1895` | ✅ **ALREADY SIMPLIFIED** | Done | Now just strips `?` |
| `canonicalizeInputForContextDetection` | `analysis-contexts.ts` | ✅ **ALREADY SIMPLIFIED** | Done | Gutted in uncommitted changes |
| `deriveCandidateClaimTexts` | `claim-decomposition.ts:28` | 🟢 **KEEP** (structural segmentation) | — | Sentence splitting, no semantic analysis |
| `normalizeClaimText` | `claim-decomposition.ts:13` | 🟢 **KEEP** (structural normalization) | — | Lowercase + whitespace collapse |
| `simpleHash` | `analysis-contexts.ts:412` | 🟢 **KEEP** (structural plumbing) | — | Deterministic hash for IDs |
| `detectInstitutionCode` | `config.ts:226` | 🟢 **KEEP** (structural plumbing) | — | ALLCAPS token extraction for IDs |
| `extractAllCapsToken` | `config.ts:151` | 🟢 **KEEP** (structural plumbing) | — | Generic regex `/\b([A-Z]{2,6})\b/` |

### Additional Suggestions

#### [SUGGESTION-4] Phase Resequencing
Given the uncommitted normalization simplification, the phases should be resequenced:

- **Phase 0**: Inventory (incorporate this review's verified table) + commit the uncommitted normalization changes
- **Phase 1**: Service foundation + replace `inferContextTypeLabel` (P0 — AGENTS.md compliance)
- **Phase 2**: Replace `calculateTextSimilarity`, `extractCoreEntities`, `isRecencySensitive` (P1)
- **Phase 3**: Replace grounding-check deterministic NLP (`stemTerm`, `extractKeyTerms`) (P2)
- **Phase 4**: Verification + hardening

#### [SUGGESTION-5] Define "Structural Plumbing" Test
The boundary between "structural plumbing" (keep) and "text-analysis decision" (replace) needs a clear test. Proposed:

> **A function is structural plumbing if removing it would not change which verdict the system produces — only how data flows.** If removing/replacing it with a different implementation could change the verdict or confidence, it's an analytical decision and must use LLM.

Apply this test to every function in the inventory.

#### [SUGGESTION-6] Enhancement Plan Compatibility Gate
Add to Phase 4 exit criteria:
- [ ] All Enhancement Plan fixes (Fixes 1-7) still pass their documented behavior
- [ ] Context-claims anchoring produces expected range on test inputs
- [ ] 50-run validation suite (if completed) shows no regression

### Updated Review Checklist (Additions)

- [ ] `inferContextTypeLabel` hardcoded patterns removed (from first review)
- [ ] `config.ts` added to Section 3 primary scope
- [ ] `stemTerm()` and `extractKeyTerms()` marked as migration candidates with comments
- [ ] Enhancement Plan Fixes 1-7 regression test added to Phase 4
- [ ] Uncommitted normalization changes committed before Phase 1 starts
- [ ] Cache hit rate > 30% in validation scenarios (from first review)
- [ ] Token cost per analysis job within 120% of pre-migration baseline (from first review)
- [ ] "Structural plumbing" test applied to all inventory items

### Final Recommendation

**APPROVE** for execution with the mandatory adjustments above. Priority order:

1. **Immediate**: Commit the uncommitted normalization simplification (it's pre-migration alignment work)
2. **Phase 0 update**: Incorporate the verified function inventory from this review
3. **Phase 1 first target**: `inferContextTypeLabel` — most egregious AGENTS.md violation
4. **Before Phase 3**: Decide whether grounding-check stemmer stays (as "post-LLM structural validation") or gets migrated

---

## Review 1: Senior Architect + LLM Expert - 2026-02-11

**Overall Assessment: APPROVE WITH MODIFICATIONS**

The plan correctly identifies the architectural debt from deterministic text-analysis logic and proposes a sound migration strategy. However, several critical gaps must be addressed before implementation begins to avoid cost overruns, quality regression, and architectural inconsistency.

### Strengths

1. **Correct Scope Identification**: The plan accurately targets the right files (`orchestrated.ts`, `analysis-contexts.ts`, `claim-decomposition.ts`, `config.ts`) where deterministic semantic decisions currently live.

2. **Efficiency Mandates Are Sound**: Batching, caching, tiering, and token control principles align with cost-effective LLM usage at scale.

3. **Clear Line Drawing**: The distinction between "deterministic analytical decisions" (replace) vs "structural plumbing" (keep) is architecturally correct.

4. **Phased Approach**: The 4-phase execution plan with exit criteria demonstrates proper risk management.

### Critical Concerns

#### [CRITICAL-1] Incomplete Target Inventory
The plan lists files but does not enumerate the **specific functions** that must be replaced. Based on codebase analysis, the following deterministic semantic functions MUST be in the replacement matrix:

| Function | Location | Current Purpose | Replacement Strategy |
|----------|----------|-----------------|---------------------|
| `calculateTextSimilarity` | `analysis-contexts.ts:265` | Jaccard-based context deduplication | LLM semantic similarity batch call |
| `extractCoreEntities` | `analysis-contexts.ts:312` | Proper noun extraction for context hints | LLM entity extraction (can batch with context detection) |
| `inferContextTypeLabel` | `config.ts:178` | Regex-based context classification (Electoral/Criminal/Civil/etc.) | **CRITICAL**: This uses hardcoded patterns like `/(election|electoral|ballot...)/` — MUST be replaced with LLM classification |
| `detectInstitutionCode` | `config.ts:207` | ALLCAPS token extraction for ID generation | Keep for ID generation (structural), but NOT for semantic decisions |
| `extractAllCapsToken` | `config.ts:147` | Acronym extraction | Keep (structural plumbing) |
| `simpleHash` | `analysis-contexts.ts:340` | Deterministic ID generation | Keep (structural plumbing) |
| `normalizeClaimText` | `claim-decomposition.ts:15` | Text normalization for dedup | Keep (structural plumbing) |
| `deriveCandidateClaimTexts` | `claim-decomposition.ts:25` | Sentence splitting for claim candidates | **DEBATABLE**: This is structural segmentation, not semantic analysis — may keep with LLM validation layer |
| `normalizeYesNoQuestionToStatement` | `orchestrated.ts` | Input neutrality transformation | Keep (structural normalization) |
| `isRecencySensitive` | `orchestrated.ts` | Keyword-based recency detection | LLM classification (simple tier) |

**Action Required**: Add explicit function-level inventory to Section 4 before Phase 0 exit.

#### [CRITICAL-2] Context Type Classification is Hardcoded Domain Logic
The `inferContextTypeLabel` function in `config.ts:178` contains:
```typescript
if (/(election|electoral|ballot|campaign|ineligib|tse)\b/.test(hay)) return "Electoral";
if (/(criminal|prosecut|indict|investigat|police|coup|stf|supreme)\b/.test(hay)) return "Criminal";
```

This is **exactly** the type of domain-specific hardcoding the AGENTS.md forbids. The plan MUST prioritize replacing this function, as it introduces test-case bias ("tse", "stf" are Brazil-specific).

#### [CRITICAL-3] Batching Strategy Needs Concrete Design
Section 5 proposes a "unified, batched LLM Decision API" but lacks:
- Request/response schema for mixed task types
- Concurrency model (parallel vs sequential batching)
- Error handling strategy (partial batch failure?)
- Token budget management per batch

**Recommendation**: Add subsection 5.1 "Batch API Contract" with explicit JSON schema before Phase 1 begins.

#### [CRITICAL-4] Cache Key Design is Under-specified
Section 6.2 mentions "canonicalized request payload hash" but semantic equivalence is tricky:
- "Was the trial fair?" vs "The trial was fair" must hit same cache
- Punctuation normalization, case folding, stopword removal needed
- Consider embedding-based similarity cache for near-matches

**Recommendation**: Define cache key normalization pipeline explicitly.

#### [SUGGESTION-1] Tiering Alignment with Existing Model Tasks
The plan's tiering (simple/medium/complex) should map to existing model selection logic in `llm.ts`:
- `getModelForTask("understand")` → medium tier
- `getModelForTask("verdict")` → complex tier  
- Add new task type `"decision_simple"` for lightweight tier

**Recommendation**: Reuse existing model selection infrastructure rather than creating parallel tiering logic.

#### [SUGGESTION-2] Telemetry Integration
The existing `text-analysis-llm.ts` already records metrics via `recordMetrics()`. The batched decision API should:
- Emit per-decision telemetry (not just per-batch)
- Track cache hit/miss rates
- Monitor token efficiency (tokens per decision)

#### [SUGGESTION-3] Fallback Strategy Clarity
Section 5 mentions "fail-safe neutral behavior only" but doesn't define what neutral means for each decision type:
- Recency assessment: default to "not recency-sensitive"?
- Evidence relevance: default to "include" or "exclude"?
- Context similarity: default to "don't merge"?

**Recommendation**: Document explicit neutral defaults per decision family.

### Specific Comments by Section

**Section 3 (Scope)**: 
- Add `apps/web/src/lib/analyzer/config.ts` to primary scope — it contains `inferContextTypeLabel` which is core deterministic semantic logic.
- Clarify that `orchestrated.ts` references are to specific functions, not the whole file (much of it is pipeline orchestration, not text analysis).

**Section 4 (Migration Inventory)**:
- Add explicit table of functions (see CRITICAL-1 above).
- Classify each function as: (a) replace with LLM, (b) keep as structural, (c) hybrid (structural + LLM validation).

**Section 5 (Target Design)**:
- The "Decision item families" list is good but incomplete. Add:
  - `context_type_classification` (replaces `inferContextTypeLabel`)
  - `entity_extraction` (replaces `extractCoreEntities`)
  - `recency_sensitivity` (replaces keyword-based detection)

**Section 6.2 (Caching)**:
- Specify cache TTL strategy — semantic decisions may need shorter TTL than structural data.
- Consider persistent cache (SQLite) across job runs, not just per-run memoization.

**Section 7 (Execution Phases)**:
- Phase 0 exit criteria should include: "inventory reviewed and approved by LLM Expert + Lead Architect"
- Add Phase 1.5: "Batch API load testing with realistic payload sizes" before Phase 2

**Section 9 (Review Checklist)**:
- Add: "[ ] `inferContextTypeLabel` hardcoded patterns removed"
- Add: "[ ] Cache hit rate > 30% in validation scenarios"
- Add: "[ ] Token cost per analysis job within 120% of pre-migration baseline"

### Risk Adjustments

| Risk | Current Control | Recommended Addition |
|------|-----------------|----------------------|
| Latency/cost spike | batch + cache + tier | Add circuit breaker: if LLM decision latency > 5s, fall back to deterministic (log for review) |
| Structured output fragility | retry/repair | Add schema versioning — old cache entries with outdated schema must miss, not error |
| Behavior drift | regression checkpoints | Add A/B comparison: run deterministic vs LLM in parallel for 10% of jobs, measure divergence |

### Final Recommendation

**APPROVE** the plan for execution with the following mandatory modifications:

1. **Before Phase 0 exit**: Complete function-level inventory (CRITICAL-1)
2. **Before Phase 1 start**: Design and document Batch API Contract (CRITICAL-3)
3. **Phase 1 priority**: Replace `inferContextTypeLabel` first — it is the most egregious hardcoded domain logic
4. **Add Phase 1.5**: Load testing with realistic payloads
5. **Section 10**: Add circuit breaker and A/B comparison controls

The architectural direction is correct. The execution details need tightening before implementation begins.

---

## 1. Objective

Migrate all deterministic text-analysis decision logic that influences analytical outcomes to efficient LLM-based intelligence, while preserving deterministic structural plumbing only.

## 2. Architectural Directive (Enforced)

- Replace deterministic text decision logic:
  - text recognition/parsing that drives analytical decisions
  - regex/pattern/keyword-based analytical classification
  - heuristic analytical scoring/routing/filtering based on text semantics
- Keep deterministic plumbing only:
  - null/empty validation
  - type coercion/schema validation
  - formatting/ID normalization
  - routing, retry, timeout, and limits that do not interpret meaning
- Enforce efficiency:
  - batch related decisions per call
  - cache identical and semantically equivalent requests
  - tier models by complexity
  - minimize prompt/token footprint

## 3. Scope

Primary scope:
- `apps/web/src/lib/analyzer/orchestrated.ts`
- `apps/web/src/lib/analyzer/analysis-contexts.ts`
- `apps/web/src/lib/analyzer/claim-decomposition.ts`
- `apps/web/src/lib/analyzer/config.ts` ← **[Review 2: ADDED]** contains `inferContextTypeLabel` (hardcoded domain regex)
- `apps/web/src/lib/analyzer/grounding-check.ts` ← **[Review 2: ADDED]** contains new deterministic NLP (`stemTerm`)
- `apps/web/src/lib/analyzer/normalization-heuristics.ts` ← **[Review 2: ADDED]** contains `splitByConfigurableHeuristics`
- `apps/web/src/lib/analyzer/text-analysis-types.ts`
- `apps/web/src/lib/analyzer/text-analysis-llm.ts`
- `apps/web/src/lib/analyzer/text-analysis-service.ts`
- `apps/web/prompts/text-analysis/*`
- `apps/web/src/lib/config-storage.ts` (prompt profile registration if needed)

Secondary scope:
- unit/integration tests under `apps/web/test/unit/lib/analyzer/*`

Out of scope:
- non-analytical deterministic utilities (URL normalization, parsing envelopes, data-shape guards)
- generated artifacts and dependencies

## 4. Migration Inventory and Classification

All deterministic text-analysis decision points will be inventoried and classified:

- Simple (lightweight model tier):
  - binary or low-entropy classification with bounded context
  - examples: recency-sensitive yes/no, relevance keep/drop with reason
- Medium (default understand tier):
  - moderate semantic matching/generation
  - examples: inverse/counter query generation, claim-evidence link decisions
- Complex (premium tier):
  - ambiguity-heavy or multi-factor semantic reasoning
  - examples: multi-item batched reconciliation with conflict reasoning

Deliverable:
- explicit replacement matrix: `function/callsite -> LLM decision task -> model tier -> cache key`

## 5. Target Design

Create a unified, batched LLM Decision API inside text-analysis service:

- New service entrypoint (single batched request):
  - accepts typed decision items (mixed task types in one request)
  - returns typed structured outputs per item
- Decision item families:
  - `recency_assessment`
  - `search_relevance_assessment`
  - `inverse_query_generation`
  - `claim_evidence_relevance_assessment`
  - `semantic_similarity_decision` (where similarity currently influences analysis)
- Deterministic fallback policy:
  - no heuristic analytical fallback
  - fail-safe neutral behavior only (do not inject semantic decisions from rules)

## 6. Efficiency Design (Mandatory)

### 6.1 Batching

- Combine related items per pipeline step into a single LLM call.
- Avoid per-result LLM calls in loops whenever a batched request can serve the same purpose.

### 6.2 Caching

- Two-level cache:
  - per-run in-memory memoization (fast dedupe during a job)
  - reusable cache keyed by canonicalized request payload hash (where applicable)
- Cache key requirements:
  - stable key order and normalized whitespace
  - include task type + key semantic fields + model tier + prompt version hash

### 6.3 Tiering

- simple -> low-cost/fast tier
- medium -> understand tier
- complex -> verdict/context-refinement tier only when needed

### 6.4 Token Control

- compact prompts with strict JSON schema
- no redundant context duplication
- bounded fields and bounded reasoning length

## 7. Execution Phases

### Phase 0: Baseline and Audit

- build full deterministic text-analysis decision inventory
- map downstream dependencies per callsite
- mark keep/remove/replace for each function

Exit criteria:
- reviewed inventory with zero unknown decision paths

### Phase 1: Service and Prompt Foundation

- extend `text-analysis-types.ts` with batched decision request/response schemas
- implement batched decision execution in `text-analysis-llm.ts`
- expose through `text-analysis-service.ts`
- add prompt profile(s) and registration

Exit criteria:
- service compiles
- schema validation + retries + telemetry work for new decision API

### Phase 2: Orchestrated Migration

- replace deterministic analytical callsites in `orchestrated.ts`
- remove heuristic analytical branches from active paths
- preserve only structural checks and neutral fail-safe behavior

Exit criteria:
- no active deterministic analytical decision callsites remain in orchestrated pipeline

### Phase 3: Context/Decomposition Cleanup

- replace remaining deterministic semantic helpers in `analysis-contexts.ts` and `claim-decomposition.ts` where they influence analysis
- decommission obsolete helpers after migration

Exit criteria:
- deterministic semantic decisions removed from active analysis pathways

### Phase 4: Verification and Hardening

- unit tests for batching/caching/tiering behavior
- regression tests for input neutrality and report quality signals
- full compile and test suite

Exit criteria:
- all checks pass
- migration audit report completed

## 8. Verification Plan

Required checks:

1. `npx tsc --noEmit`
2. targeted analyzer tests:
   - text-analysis service tests
   - orchestrated decision-path tests
3. full suite: `npm -w apps/web test`
4. targeted validation scenarios:
   - question vs statement neutrality
   - single-topic claims not oversplit into artificial contexts
   - grounding/relevance diagnostics do not degrade from migration

## 9. Review Checklist

- [ ] Deterministic analytical decision logic removed from active paths
- [ ] No heuristic semantic fallback influences verdict/search/context outcomes
- [ ] Batching implemented at all migrated high-frequency callsites
- [ ] Cache hit path verified before LLM invocation
- [ ] Model tiering aligned with task complexity
- [ ] Prompts are compact and schema-constrained
- [ ] Tests updated and passing
- [ ] Migration audit report produced with residual risk list
- [ ] `inferContextTypeLabel` hardcoded patterns removed [Review 1]
- [ ] `config.ts` in primary scope and fully audited [Review 2]
- [ ] `stemTerm()` / `extractKeyTerms()` marked as migration candidates [Review 2]
- [ ] Enhancement Plan Fixes 1-7 regression test added to Phase 4 [Review 2]
- [ ] Uncommitted normalization changes committed before Phase 1 [Review 2]
- [ ] Cache hit rate > 30% in validation scenarios [Review 1]
- [ ] Token cost per analysis job within 120% of pre-migration baseline [Review 1]
- [ ] "Structural plumbing" test applied to all inventory items [Review 2]

## 10. Risks and Controls

- Risk: latency/cost spike from naive replacement  
  Control: batch + cache + tier gating, plus per-step call caps.

- Risk: structured-output fragility  
  Control: strict schema, retry/repair, bounded outputs, telemetry.

- Risk: behavior drift during phased migration  
  Control: incremental replacement with regression checkpoints per phase.

## 11. Deliverables

1. Code changes for unified batched decision API + migrated callsites
2. Prompt profile updates for new batched decision tasks
3. Test additions/updates
4. Migration audit file listing:
   - removed deterministic decision paths
   - new LLM decision paths
   - efficiency metrics (batch count, cache hit rate, LLM calls avoided)
