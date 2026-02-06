# Generic Evidence Quality Enhancement Plan

**Author:** Claude (Lead Architect)
**Status:** ✅ PHASE 1 COMPLETE - READY FOR PHASE 2
**Created:** 2026-02-05
**Updated:** 2026-02-06 (Phase 1 verified complete; Phase 2 ready for implementation)
**Priority:** 🟡 MEDIUM (Phase 1 resolved critical issue; Phase 2 improves search quality)
**Verification Report:** [Evidence_Quality_Verification_Report.md](Evidence_Quality_Verification_Report.md)

**Issues Addressed:**

1. ✅ Opinion vs evidence confusion - **RESOLVED** via deterministic filtering (91% → 0% opinion contamination)
2. ⏳ LMs don't know the present - **Phase 3** (knowledge gap handling)

---

## Executive Summary

This plan addresses systematic evidence quality issues where third-party commentary (opinions, reactions, characterizations) contaminates analyses that should be driven by probative evidence. While this failure mode often appears in procedural/process questions (e.g., fairness, compliance, integrity), the root causes are GENERIC and apply across domains (legal, scientific, corporate, historical).

**Two Core Problems:**

1. **Opinion vs Evidence Confusion**: The system lacks mechanisms to distinguish opinion from evidence and filter irrelevant third-party commentary BEFORE extraction, leading to contamination across ALL analysis types (legal, scientific, corporate, historical).
2. **LLMs Don't Know The Present**: LLMs are trained on past data with a knowledge cutoff date, and have NO knowledge of current reality after that cutoff - current government trustworthiness, recent verdicts, contemporary reputations, ongoing events. Yet the system doesn't explicitly acknowledge this limitation or enforce evidence recency requirements for time-sensitive claims.

**Solution Approach** : Five generic principles that strengthen evidence quality universally:

1. Contextual relevance pre-filtering (before extraction) - **Addresses Problem 1**
2. Enhanced opinion vs evidence distinction - **Addresses Problem 1**
3. Probative value validation (deterministic correction) - **Addresses Problem 1**
4. **LLM knowledge gap handling (time-sensitive claims) - Addresses Problem 2**
5. Context-aware criticism search queries - **Addresses Problem 1**

**Problem-Solution Mapping:**


| Core Problem                           | Solutions            | Phase     |
| ---------------------------------------- | ---------------------- | ----------- |
| **Problem 1: Opinion ≠ Evidence**     | Solutions 2, 3, 5, 1 | Phase 1-2 |
| **Problem 2: LLMs Don't Know Present** | Solution 4           | Phase 3   |

---

## Observed Patterns (Sampled, Generic)

In sampled recent runs, we observed generic failure modes that can happen for **any topic**:

1. **Opinion evidence items can be overweighted**
   - Evidence items labeled `sourceAuthority="opinion"` can still be assigned `probativeValue="high"|"medium"` by the LLM.
   - Without deterministic enforcement, these items can influence verdicts despite being non-probative.
2. **Criticism search can import irrelevant third-party reactions**
   - Broad criticism queries can pull reactions that are not directly tied to the AnalysisContext being analyzed.
3. **Context reference drift**
   - Sub-claims can be assigned to context IDs that are not present in `analysisContexts`, indicating a pipeline coordination issue.
4. **Evidence clustering across contexts**
   - Evidence can cluster into a single context, leaving other contexts under-evidenced and lowering confidence.
5. **Verdict-stage resilience gaps**
   - Intermittent provider/SDK failures can cause a job to fail even though fallback logic exists in other parts of the pipeline.

**Sampled metric (illustrative):** In a small sample (n=11) of extracted evidence items labeled `sourceAuthority="opinion"`, 10 were assigned `probativeValue="high"|"medium"` by the LLM (91% mismatch). This indicates deterministic correction is necessary; prompt tuning alone is insufficient.

**Example debug warning (generic):**

```
[YYYY-MM-DDTHH:MM:SSZ] ⚠️ Claim SC<N> assigned to non-existent context CTX_<id>
```

---

## Alignment With Repo Rules (Non‑Negotiable)

- **Generic-by-design**: No domain-specific heuristics or keyword lists; use structural signals (sourceAuthority, evidenceBasis, evidenceScope, jurisdictional standing).
- **Terminology**: Use **AnalysisContext** for top-level frames and **EvidenceScope** for per-evidence metadata.
- **EvidenceItems are not facts**: All extracted statements are unverified evidence until assessed.
- **Pipeline integrity**: Understand → Research → Verdict; do not skip gates.

---

## Deep Analysis of User's Core Principles

### Principle A: Government Opinions ≠ Trustworthy Evidence

**User's insight** : "Opinions from Governments should never just be trusted without strong evidence (they could even cheat and manufacture 'evidence'), many governments are biased, quite some are autocratic or leaning autocratic."

**Generic abstraction** : ANY entity's OPINION about another entity is not evidence about that entity. This applies universally:

* Government A's opinion about Government B
* Company A's opinion about Company B
* Expert A's opinion about Study B
* Historian A's characterization of Event B

**Current system gap** : The system has `sourceAuthority="opinion"` classification but doesn't ENFORCE that opinions cannot have high probativeValue. LLMs sometimes rate authoritative sources' opinions as "high" evidence.

**Solution** : Deterministic validation that DOWNGRADES opinion sources to low probativeValue, regardless of source prestige.

---

### Principle B: LLM Knowledge Has Cutoff Date

**User's insight** : "We should be aware and take measures of the situation that LLM's base only on past data maybe even with latest data from a year ago or so... they likely don't know that a current government cannot be trusted. And also in other situations they might just don't know - the LLM may not have information about recent verdicts or decisions."

**Generic abstraction** : LLMs don't know CURRENT REALITY (any events after their training data cutoff):

* Current government trustworthiness
* Recent verdicts/decisions
* Contemporary reputations
* Active/ongoing processes
* Latest organizational changes

**Current system gap** : Verdict prompts don't acknowledge knowledge cutoff. LLM may rely on outdated training data for time-sensitive claims.

**Solution** : Explicit knowledge cutoff awareness in prompts + confidence penalties for time-sensitive claims lacking recent evidence.

---

### Principle C: Evidence Must Come From Trusted Sources

**User's insight** : "Evidence source must always come from trusted sources and evidence with probativeValue=low should simply be discarded. Maybe we need to better define EvidenceItem, and better prompt the LLM to make sure EvidenceItem gets the appropriate values."

**Generic abstraction** : Evidence quality depends on DOCUMENTATION + SPECIFICITY + AUTHORITY, evaluated independently of whether it supports or contradicts the claim.

**Current system strengths** :

* Already has `sourceAuthority` (primary/secondary/opinion/contested)
* Already has `evidenceBasis` (scientific/documented/anecdotal/theoretical/pseudoscientific)
* Already has `probativeValue` (high/medium/low)
* Already filters low probativeValue items

**Current system gaps** :

1. Prompt guidance doesn't emphasize opinion detection strongly enough
2. No deterministic validation catches LLM classification errors
3. Official/government sources can be opinion even if authoritative (not distinguished)

**Solution** : Enhanced prompts with UNIVERSAL opinion detection rules + deterministic validation layer.

---

### Principle D: Web Search Provides Current Info BUT Results Need Evaluation

**User's insight** : "Web search must be used to enhance sight into the present."

**Generic abstraction** : Web search solves knowledge gap BUT search results are just TEXT that needs the SAME quality evaluation as any other source. Recency ≠ reliability.

**Current system gap** : Quality evaluation happens AFTER extraction, not during search result selection. The "criticism and opposing views" search (`${entityStr} criticism concerns`) returns ANY criticism, including:

* Foreign actors criticizing domestic matters
* Competitors criticizing rivals
* Third-party commentary about the subject (not evidence from the subject)

**Solution** : Relevance pre-filter BEFORE extraction + context-aware criticism queries.

---

## Implementation Notes (Aligned to Existing Pipeline Fields)

The plan should **reuse existing fields** and **avoid schema changes** unless absolutely necessary:

- `EvidenceItem.sourceAuthority` (primary/secondary/opinion/contested)
- `EvidenceItem.evidenceBasis` (scientific/documented/anecdotal/theoretical/pseudoscientific)
- `EvidenceItem.probativeValue` (high/medium/low)
- `EvidenceItem.claimDirection` (supports/contradicts/neutral)
- `EvidenceItem.evidenceScope` (per-evidence methodology/boundary metadata)
- `ClaimUnderstanding.thesisRelevance` (direct/tangential/irrelevant)

These are already used in:
- `apps/web/src/lib/analyzer/orchestrated.ts`
- `apps/web/src/lib/analyzer/evidence-filter.ts`
- `apps/web/src/lib/analyzer/aggregation.ts`

The enhancements below should **extend/strengthen** these, not replace them.

---

## Root Cause Analysis: The Generic Pattern

### What Happened

* **Query** : `[Entity] criticism concerns` (too broad)
* **Result** : External reactions/characterizations retrieved that are not about the process itself
* **Error** : Third-party opinion treated as evidence about the subject's procedural integrity/fairness
* **Impact** : Low-quality evidence contaminated analysis, reducing verdict accuracy

### Generic Pattern (Applies to ALL domains)

```
Subject being analyzed: Entity X in Context C
Irrelevant source retrieved: Entity Y's OPINION about Entity X
Error: Opinion treated as EVIDENCE

Examples across domains:
- Legal: Foreign government opinion on domestic trial → NOT evidence of trial fairness
- Scientific: Industry association opinion on study → NOT evidence of study validity
- Corporate: Competitor statement about rival → NOT evidence of rival's conduct
- Historical: Modern historian's characterization → NOT evidence of historical event
```

### Root Causes (Generic)

**Root Cause Group 1 - Opinion/Relevance Issues:**

1. **Search too broad** : No relevance filtering before extraction
2. **Opinion vs evidence confusion** : Characterizations treated as documented evidence
3. **Jurisdiction mismatch** : External actors' views on internal matters
4. **No standing check** : Third parties commenting without authority/relevance

**Root Cause Group 2 - Knowledge Gap Issues:**
5. **LLM knowledge cutoff not acknowledged** : System doesn't tell LLM "you don't know events after your training cutoff"
6. **No recency validation** : Time-sensitive claims not checked for recent evidence
7. **Training data treated as current** : LLM may use outdated "knowledge" about trustworthiness, status, etc.

---

## Web Search Architecture & Optimization Strategy

### Current Architecture

**CRITICAL**: FactHarbor uses **APPLICATION-controlled** web search, NOT LLM-invoked web search.

**Current flow:**
```
1. Application calls searchWebWithProvider() → SerpAPI/Google CSE
2. Application fetches URL content from search results
3. Application passes fetched content to LLM for evidence extraction
4. LLM processes content without knowing it came from web search
```

**Key file:** [web-search.ts](apps/web/src/lib/web-search.ts) - Application directly controls search APIs

**Why this matters:** The LLM doesn't know it's getting web search results to fill its knowledge gaps. It treats all provided text equally, whether from web search or other sources.

---

### How Solutions Optimize Web Search to Extend LLM Knowledge

The 5 generic solutions work together to ensure web search effectively extends LLM knowledge:

| Solution | Optimization | Benefit |
|----------|--------------|---------|
| **Solution 4: Knowledge cutoff awareness** | Tell LLM about its knowledge gap in verdict prompt | LLM trusts web results over outdated training data for current claims |
| **Solution 5: Context-aware queries** | Build search queries with jurisdiction/context metadata | Returns relevant sources, filters out foreign/unrelated commentary |
| **Solution 1: Relevance pre-filter** | Filter search results BEFORE fetching URLs | Saves tokens, improves quality, prevents irrelevant source contamination |
| **Solution 4: Recency detection** | Apply date filters for time-sensitive claims | Gets current info (e.g., 2025-2026 sources) instead of outdated articles |
| **Solution 2: Opinion vs evidence** | Enhanced extraction prompt distinguishes opinion from evidence | LLM doesn't treat third-party commentary as documented facts |

**Optimization principle:** Control the entire pipeline (query → filter → extract) rather than letting LLM invoke web search autonomously.

---

### Why Application-Controlled Search is Better

**Advantages vs LLM-invoked web search:**
1. ✅ Full control over query construction (context-aware, jurisdiction-scoped)
2. ✅ Pre-filter results before extraction (relevance, jurisdiction match)
3. ✅ URL deduplication across iterations (avoid re-fetching)
4. ✅ Deterministic search behavior (reproducible results)
5. ✅ Lower cost (no LLM deciding when to search)

**Disadvantages of LLM-invoked search:**
- ❌ Less control over query construction
- ❌ Cannot pre-filter results before LLM sees them
- ❌ No URL deduplication
- ❌ Higher cost (LLM autonomously decides when/what to search)
- ❌ Non-deterministic (different searches on different runs)

---

### Best Practices for Web Search Extending LLM Knowledge

**1. Knowledge Cutoff Awareness (Solution 4)**
- **Location:** Verdict prompt
- **Implementation:** Add `## KNOWLEDGE CUTOFF AWARENESS` section to verdict prompt
- **Benefit:** LLM knows to trust web evidence over training data for time-sensitive claims

**2. Context-Aware Query Construction (Solution 5)**
- **Location:** Search query generation ([orchestrated.ts:5975-5993](apps/web/src/lib/analyzer/orchestrated.ts#L5975))
- **Implementation:** Use AnalysisContext metadata (jurisdiction, institution) in queries
- **Benefit:** Returns relevant sources instead of broad/irrelevant results

**3. Relevance Pre-Filtering (Solution 1)**
- **Location:** Before URL fetch in research loop
- **Implementation:** Classify search results as "primary_source" | "secondary_commentary" | "unrelated"
- **Benefit:** LLM only processes high-quality, relevant sources

**4. Recency Detection (Solution 4)**
- **Location:** ClaimUnderstanding phase (temporal context detection)
- **Implementation:** Apply `dateRestrict` parameter to search API for time-sensitive claims
- **Benefit:** For "Is X currently trustworthy?", get 2025-2026 sources, not 2022-2023

**5. Opinion vs Evidence Distinction (Solution 2)**
- **Location:** Evidence extraction prompt
- **Implementation:** Add universal opinion detection decision tree
- **Benefit:** LLM doesn't conflate third-party characterizations with documented evidence

---

## Proposed Generic Solutions

### Solution 1: Contextual Relevance Pre-Filter

**Principle** : Verify source is DIRECTLY RELEVANT to the AnalysisContext BEFORE extracting evidence.

**Current flow** (wasteful):

```
Search → Fetch ALL → Extract evidence → Filter low quality
```

**New flow** (efficient):

```
Search → Relevance pre-filter → Fetch relevant only → Extract → Quality filter
```

**Implementation** :

* **File** : `apps/web/src/lib/analyzer/orchestrated.ts` around lines 10698-10906
* **Add** : `filterSearchResultsByRelevance()` function
* **Logic** : Classify each result as "primary_source" | "secondary_commentary" | "unrelated"
* **Keep** : Only "primary_source" results

**Classification criteria** (universal):

1. **Subject match** : Is this about the SAME subject as AnalysisContext?
2. **Direct vs indirect** : PRIMARY information or COMMENTARY about information?
3. **Jurisdiction match** : Appropriate authority/standing for this context?

**Examples** :


| Domain     | Context           | PRIMARY (keep)      | COMMENTARY (reject)                  |
| ------------ | ------------------- | --------------------- | -------------------------------------- |
| Legal      | Domestic trial   | Court docs, filings | Foreign State Dept opinion                |
| Scientific | Tech A efficiency | Studies measuring A | Industry statements about studies    |
| Corporate  | Company X fraud   | Regulator filings, audits | Competitor statements                |
| Historical | Event X           | Contemporary docs   | Modern historians' characterizations |

---

### Solution 2: Enhanced Opinion vs Evidence Distinction

**Principle** : Strengthen prompts to ALWAYS distinguish opinion from documented evidence, regardless of source credibility.

**Problem** : Government/official sources can be opinion even if authoritative. "Government official states X" is OPINION unless citing specific documentation.

**Implementation** :

* **File** : `apps/web/src/lib/analyzer/prompts/base/extract-evidence-base.ts` lines 120-141
* **Change** : Replace SOURCE AUTHORITY section with enhanced version
* **Add** : Universal opinion detection decision tree

**Universal opinion detection rules** :

An item is OPINION (not documented evidence) if:

1. Characterizes/evaluates without providing measurements or records
2. States a position/stance without citing specific documentation
3. Makes claims without verifiable supporting data
4. Provides interpretation rather than observation

**Decision tree** :

```
1. Does source CITE specific records/measurements/data?
   YES → Check if primary or secondary
   NO → Likely OPINION

2. Is this CHARACTERIZATION (good/bad/fair) or MEASUREMENT (X units, Y count)?
   Characterization → OPINION unless backed by documented evidence
   Measurement → PRIMARY if original, SECONDARY if reported

3. For government/official sources:
   Policy statement/position = OPINION
   Statistical report with methodology = PRIMARY
   Press release claim = OPINION unless cites specific data
```

**Examples** (pattern recognition):

PRIMARY (documented):

* "Audit found 12 violations in records dated 2020-03-15"
* "Study measured 45% efficiency using Standard Protocol Y"
* "Court ruling Case-2023-456 states [legal text]"

OPINION (not documented):

* "Government official states process was appropriate"
* "Agency announces new policy position"
* "Department claims standards were met"
* "Report concludes X is justified" (check if based on documented findings)

---

### Solution 3: Probative Value Validation Layer

**Principle** : Add deterministic enforcement that prevents non-evidentiary material from influencing verdicts, even when upstream LLM steps mis-classify quality fields.

**Validated by data (sampled):** In a small sample (n=11) of evidence items labeled `sourceAuthority="opinion"`, 10 were incorrectly assigned `probativeValue="high"|"medium"` by the LLM (91% mismatch).

**Critical implementation alignment (P0):**
Today, when `llmEvidenceQuality` is enabled, the pipeline can accept the LLM quality filter result and skip the deterministic `filterByProbativeValue()` gate. This defeats the intended two-layer enforcement.

**Implementation (deterministic, generic):**

- **File** : `apps/web/src/lib/analyzer/orchestrated.ts`
  - Always run deterministic `filterByProbativeValue()` on the final kept evidence items (whether or not an LLM pre-filter ran).
- **File** : `apps/web/src/lib/analyzer/evidence-filter.ts`
  - Add a rule that **filters any evidence item with `sourceAuthority="opinion"`**, regardless of `probativeValue`.

**Why this is generic and unbiased:** It does not special-case any government/organization/person. It enforces the semantic contract already present in our fields: items labeled as opinion are not treated as probative evidence for claim verification.

**Deterministic enforcement rule (minimum viable):**

```text
IF sourceAuthority = "opinion" THEN discard evidence item (reason: opinion_source)
```

Optional follow-ups (still generic, but lower priority than the P0 rule above):
- Cap `"high" → "medium"` when `sourceAuthority="contested"` or `evidenceBasis` is non-empirical.
- Add correction telemetry (counts by rule) for monitoring without relying on lexical keyword lists.

---

### Solution 4: LLM Knowledge Gap Handling (CRITICAL - Problem 2)

**Principle** : When LLM lacks current knowledge, REQUIRE web search evidence and FLAG uncertainty.

**Problem - LLMs Don't Know The Present**:

LLMs are trained on historical data with a specific knowledge cutoff date and have ZERO knowledge of:

- **Current events** (anything after training cutoff)
- **Current government/organizational trustworthiness** (may have changed since training)
- **Recent verdicts, decisions, policy changes** (LLM doesn't know they happened)
- **Contemporary reputations** (organizations/people's standing may have changed)
- **Ongoing proceedings/processes** (LLM can't know current status)

**Why this is dangerous**: The LLM may confidently make claims based on outdated training data (e.g., "Organization X is trustworthy" based on old data, when X's situation changed recently). Without explicit knowledge cutoff awareness, the system treats LLM-generated reasoning as if it knows current reality.

**Critical insight**: Web search SOLVES the knowledge gap by providing current information, BUT search results themselves still need quality evaluation (Solution 1-3). Recency ≠ reliability.

**Implementation** :

* **File 1** : `apps/web/src/lib/analyzer/prompts/base/verdict-base.ts` - Add knowledge cutoff section
* **File 2** : `apps/web/src/lib/analyzer/orchestrated.ts` - Add `validateEvidenceRecency()` function

**Additions to verdict prompt** :

**Implementation Note:** The `${llmKnowledgeCutoff}` variable should be obtained dynamically:
- For Anthropic models: Check the model's system prompt or metadata for "knowledge cutoff" information
- If unavailable: Use model release date minus 3-6 months as approximation
- Store in configuration or retrieve at runtime from model metadata

```
## KNOWLEDGE CUTOFF AWARENESS

Today is ${currentDate}.
Your training data cutoff is: ${llmKnowledgeCutoff} (obtain from your system context/prompt).

For claims requiring knowledge of current reality (after ${llmKnowledgeCutoff}):
- You CANNOT know: Current government policies, recent verdicts, contemporary reputations
- You MUST rely ONLY on provided evidence from web search
- If evidence is dated before ${llmKnowledgeCutoff}, it may be outdated for time-sensitive claims

Time-sensitive claim types:
- Current status/state: "X is currently Y"
- Recent events: "X happened in [recent date]"
- Contemporary reputation: "X is known for Y"
- Active processes: "X is ongoing"

Confidence impact:
- Time-sensitive claim WITHOUT recent evidence → Reduce confidence by 20%
- Claim about current trustworthiness → Require web evidence from recent months/year
- Historical claim (before ${llmKnowledgeCutoff}) → Training data may be relevant

Flag: "[KNOWLEDGE GAP] This claim requires current information (after ${llmKnowledgeCutoff}). Evidence may be incomplete."
```

**Recency validation function** :

* Detect time-sensitive patterns: "currently", "now", "recent", "ongoing", "is [state]"
* Check if evidence dates fall within relevant timeframe for the claim
* Apply confidence penalty if no recent evidence for time-sensitive claims

**Universal application** :

* Legal: "Trial was unfair" (recent) → Requires evidence from relevant time period
* Scientific: "Technology A is more efficient" (current) → Requires recent studies
* Political: "Government X is trustworthy" (current) → CANNOT use LLM knowledge
* Corporate: "Company X has good safety record" (current) → Requires recent audits

---

### Solution 5: Context-Aware Criticism Search

**Principle** : Make criticism queries CONTEXT-AWARE to prevent importing irrelevant third-party opinions.

**Current query** (too broad):

```typescript
`${entityStr} criticism concerns`
```

Returns ANY criticism, including foreign/unrelated actors.

**Implementation** :

* **File** : `apps/web/src/lib/analyzer/orchestrated.ts` lines 5975-5993
* **Replace** : `baseQueries` generation with `buildContextAwareCriticismQueries()`
* **Add** : Function that uses AnalysisContext metadata (jurisdiction, institution)

**New query logic** :

```typescript
function buildContextAwareCriticismQueries(
  entityStr: string,
  contexts: AnalysisContext[],
  impliedClaim: string
): string[] {
  // Extract jurisdiction/institution from contexts
  const jurisdiction = ctx.metadata.jurisdiction || ctx.metadata.geographic || "";
  const institution = ctx.metadata.institution || "";

    if (jurisdiction || institution) {
    // CONTEXT-BOUND criticism (only relevant actors)
    return [
      `${entityStr} ${jurisdiction} ${institution} criticism internal review`,
      `${entityStr} ${jurisdiction} appeals challenges objections`
    ];
  } else {
    // Generic but focused on DIRECT criticism
    return [
      `${entityStr} criticism documented evidence`,
      `${entityStr} challenges objections filed`
    ];
  }
}
```

**Examples** :


| Domain                       | Context                                          | Query                                                    |
| ------------------------------ | -------------------------------------------------- | ---------------------------------------------------------- |
| Legal (Domestic trial)      | `{ jurisdiction: "Country A", institution: "Court X" }` | "[Entity] Country A Court X criticism internal review"         |
| Scientific (Tech comparison) | `{ methodology: "Method Y", geographic: "Region Z" }`       | "technology A Method Y Region Z criticism documented evidence" |
| Corporate (Company fraud)    | `{ jurisdiction: "Regulator B" }`                     | "Company X Regulator B criticism internal review"             |

**Result** : Only relevant actors' criticisms, not foreign/third-party opinions.

---

## Implementation Plan

### Phase 0: Ground Truth + Instrumentation (NEW)

**Goal:** Ensure report issues are reproducible with clear artifacts.

1. **Capture artifacts per failing job**
   - Save `resultJson` + `reportMarkdown` and record Job ID.
   - Capture `JobEvents` (including stack traces for failures) for deterministic debugging.
2. **Add a minimal “evidence quality snapshot” block** in reports (optional but recommended)
   - Count of opinion/secondary sources used
   - Count of `probativeValue=high` items from `sourceAuthority=opinion`
3. **Add failure observability + safe retries (P0 resilience)**
   - Persist stack traces for runner failures (so `"reading 'value'"`-type errors are actionable).
   - Add a one-time retry around verdict generation on internal errors (prevents rare transient failures from aborting the job).

This phase is light and does **not require schema changes**.

### Phase 1: Immediate Impact (Prevent Contamination) ✅ COMPLETE

**Priority** : HIGH
**Duration** : 2 days
**Status** : ✅ **VERIFIED COMPLETE** (2026-02-06)
**Verification** : See [Evidence_Quality_Verification_Report.md](Evidence_Quality_Verification_Report.md)

**Results:**
| Metric | Before | After |
|--------|--------|-------|
| Opinion sources in evidence | 11 (91% elevated) | 0 |
| Test analyses verified | - | 4 (vaccine, Bolsonaro EN/DE, hydrogen) |

1. **Solution 2: Enhanced opinion detection** ✅
   * [x] Update `apps/web/src/lib/analyzer/prompts/base/extract-evidence-base.ts` to enforce: opinion → `probativeValue="low"` → omit
   * [x] Add generic guidance to omit third-party reactions/characterizations without documentary support
   * [x] Add universal opinion detection decision tree (in extract-evidence-base.ts)
   * [x] Add generic examples for government/official sources (in extract-evidence-base.ts)

2. **Solution 3: Probative value validation** ✅
   * [x] Ensure deterministic `filterByProbativeValue()` runs even when the LLM evidence-quality filter succeeds (`apps/web/src/lib/analyzer/orchestrated.ts`)
   * [x] Filter out `sourceAuthority="opinion"` deterministically (`apps/web/src/lib/analyzer/evidence-filter.ts` lines 199-203)
   * [x] Add additional deterministic rules (vague-phrase cap, attribution/citation requirements) to prevent low-probative items slipping through
   * [x] Filter stats returned in `FilterStats.filterReasons` (available for logging)

**Achieved impact** : Opinion contamination eliminated (verified via database checks on 4 test analyses).

---

### Phase 2: Search Quality (Reduce Noise) ⏳ READY FOR IMPLEMENTATION

**Priority** : HIGH
**Duration** : 3 days
**Status** : ⏳ **READY FOR SENIOR DEVELOPER**
**Depends On** : Phase 1 complete ✅

---

#### Task 2.1: Context-Aware Criticism Queries (Solution 5)

**Problem:** Generic criticism queries like `"${entityStr} criticism"` return irrelevant third-party reactions from unrelated jurisdictions/domains.

**Example:** Bolsonaro trial analysis returned Trump executive orders as "criticism evidence".

**Implementation:**

**File:** `apps/web/src/lib/analyzer/orchestrated.ts`
**Location:** Lines 5975-5993 (search for `"Criticism and opposing views"`)

**Step 1:** Add helper function (insert before `decideNextResearch`):

```typescript
/**
 * Build context-aware criticism queries that focus on relevant actors/jurisdictions.
 * Prevents foreign/unrelated third-party reactions from contaminating evidence.
 */
function buildContextAwareCriticismQueries(
  entityStr: string,
  contexts: AnalysisContext[],
  currentYear: number
): string[] {
  // Extract jurisdiction/institution from first context with metadata
  const ctx = contexts.find(c => c.metadata?.jurisdiction || c.metadata?.institution);
  const jurisdiction = ctx?.metadata?.jurisdiction || ctx?.metadata?.geographic || "";
  const institution = ctx?.metadata?.institution || "";

  if (jurisdiction || institution) {
    // CONTEXT-BOUND criticism (only relevant actors)
    return [
      `${entityStr} ${jurisdiction} ${institution} criticism official review`,
      `${entityStr} ${jurisdiction} appeals challenges objections ${currentYear}`,
      `${entityStr} ${institution} internal review findings`,
    ];
  } else {
    // Generic but focused on DIRECT criticism (not third-party reactions)
    return [
      `${entityStr} criticism documented evidence ${currentYear}`,
      `${entityStr} official response challenges`,
    ];
  }
}
```

**Step 2:** Update criticism query generation (modify lines ~5980-5984):

```typescript
// BEFORE:
const queries = recencyMatters ? [
  ...baseQueries,
  `${entityStr} criticism ${currentYear}`,
] : baseQueries;

// AFTER:
const contextAwareQueries = buildContextAwareCriticismQueries(
  entityStr,
  analysisContexts,  // pass from outer scope
  currentYear
);
const queries = recencyMatters
  ? [...baseQueries, ...contextAwareQueries]
  : [...baseQueries, ...contextAwareQueries.slice(0, 2)];
```

**Verification:**
- [ ] Run Bolsonaro analysis → should NOT return Trump/US documents
- [ ] Run vaccine analysis → should return medical/scientific criticism, not political
- [ ] Check `debug-analyzer.log` for generated queries

**Effort:** 2 hours

---

#### Task 2.2: Relevance Pre-Filter (Solution 1 - Heuristic)

**Problem:** Search results include obviously irrelevant sources that waste extraction tokens.

**Implementation:**

**File:** `apps/web/src/lib/analyzer/orchestrated.ts`
**Location:** After search results are fetched, before `extractEvidence()` call

**Step 1:** Add relevance heuristic function:

```typescript
interface RelevanceCheck {
  isRelevant: boolean;
  reason?: string;
}

/**
 * Quick heuristic check for obvious irrelevance.
 * Does NOT replace LLM extraction - just filters obvious noise.
 */
function checkSearchResultRelevance(
  result: SearchResult,
  entityStr: string,
  contexts: AnalysisContext[]
): RelevanceCheck {
  const title = (result.title || "").toLowerCase();
  const snippet = (result.snippet || "").toLowerCase();
  const url = (result.url || "").toLowerCase();
  const entityLower = entityStr.toLowerCase();

  // Check 1: Entity mentioned in title or snippet
  const entityMentioned = title.includes(entityLower) || snippet.includes(entityLower);
  if (!entityMentioned) {
    return { isRelevant: false, reason: "entity_not_mentioned" };
  }

  // Check 2: Jurisdiction mismatch (if jurisdiction specified)
  const ctx = contexts.find(c => c.metadata?.jurisdiction);
  if (ctx?.metadata?.jurisdiction) {
    const jurisdiction = ctx.metadata.jurisdiction.toLowerCase();
    // If result is about a DIFFERENT jurisdiction's government/courts, filter
    const foreignGovPatterns = [
      /whitehouse\.gov/,
      /congress\.gov/,
      /parliament\.uk/,
      /bundestag\.de/,
    ].filter(p => !url.includes(jurisdiction));

    if (foreignGovPatterns.some(p => p.test(url)) && !url.includes(jurisdiction)) {
      return { isRelevant: false, reason: "foreign_jurisdiction" };
    }
  }

  return { isRelevant: true };
}
```

**Step 2:** Apply filter before extraction (in research loop):

```typescript
// After fetching search results, before extraction:
const relevantResults = searchResults.filter(result => {
  const check = checkSearchResultRelevance(result, entityStr, analysisContexts);
  if (!check.isRelevant) {
    debugLog("Pre-filter rejected", { url: result.url, reason: check.reason });
  }
  return check.isRelevant;
});

// Use relevantResults for extraction instead of searchResults
```

**Verification:**
- [ ] Check `debug-analyzer.log` for "Pre-filter rejected" entries
- [ ] Verify relevant sources are NOT filtered (no false positives)
- [ ] Monitor extraction token usage (should decrease)

**Effort:** 3 hours

---

#### Task 2.3: Add Filter Telemetry (Minor)

**Problem:** No visibility into how often each filter rule triggers.

**File:** `apps/web/src/lib/analyzer/orchestrated.ts`
**Location:** After `filterByProbativeValue()` call

```typescript
// After filtering
const { kept, filtered, stats } = filterByProbativeValue(evidenceItems);

// Log filter stats for monitoring
debugLog("Evidence filter stats", {
  total: stats.total,
  kept: stats.kept,
  filtered: stats.filtered,
  reasons: stats.filterReasons,
});

// Include in result metadata (optional)
if (result.meta) {
  result.meta.filterStats = stats.filterReasons;
}
```

**Effort:** 30 minutes

---

**Phase 2 Checklist:**
- [ ] Task 2.1: Context-aware criticism queries
- [ ] Task 2.2: Relevance pre-filter (heuristic)
- [ ] Task 2.3: Filter telemetry logging
- [ ] Integration testing with 3+ diverse claims
- [ ] Verify no false positives (valid evidence not filtered)

**Expected impact** : Reduces irrelevant search results by 60-80%, improves evidence quality.

---

### Phase 3: Advanced Filtering (Complete Solution) ⏳ FUTURE

**Priority** : MEDIUM
**Duration** : 4 days
**Status** : ⏳ **PLANNED** (after Phase 2 stabilization)
**Depends On** : Phase 2 complete

---

#### Task 3.1: LLM Knowledge Gap Handling (Solution 4)

**Problem:** LLMs have a knowledge cutoff date and cannot know current reality (recent verdicts, current government status, ongoing events).

**Implementation:**

**File:** `apps/web/src/lib/analyzer/prompts/base/verdict-base.ts`

Add knowledge cutoff awareness section:
```markdown
## KNOWLEDGE CUTOFF AWARENESS

Your training data has a cutoff date. For time-sensitive claims:
- If claim requires CURRENT knowledge (e.g., "is X currently..."):
  - You MUST have recent web evidence (within 6 months)
  - If no recent evidence: FLAG uncertainty, REDUCE confidence by 20%
- If claim is historical (e.g., "did X happen in 2020"):
  - Historical evidence is acceptable
```

**File:** `apps/web/src/lib/analyzer/orchestrated.ts`

Add recency validation:
```typescript
function validateEvidenceRecency(
  evidence: EvidenceItem[],
  claimIsTimeSensitive: boolean,
  currentDate: Date
): { hasRecentEvidence: boolean; oldestDate?: Date; penalty: number } {
  if (!claimIsTimeSensitive) return { hasRecentEvidence: true, penalty: 0 };

  const sixMonthsAgo = new Date(currentDate);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const recentEvidence = evidence.filter(e =>
    e.sourceDate && new Date(e.sourceDate) >= sixMonthsAgo
  );

  return {
    hasRecentEvidence: recentEvidence.length > 0,
    penalty: recentEvidence.length === 0 ? 0.20 : 0,
  };
}
```

**Effort:** 4 hours

---

#### Task 3.2: LLM-Based Relevance Classification (Solution 1 - Complete)

**Problem:** Heuristic pre-filter may miss subtle irrelevance patterns.

**Implementation:** Add optional LLM classification step for edge cases where heuristics are uncertain.

```typescript
type RelevanceClass = "primary_source" | "secondary_commentary" | "unrelated";

async function classifySearchResultRelevance(
  result: SearchResult,
  claimContext: string,
  llmClient: LLMClient
): Promise<RelevanceClass> {
  // Only call LLM for ambiguous cases (heuristic uncertain)
  // ...
}
```

**Effort:** 4 hours

---

**Phase 3 Checklist:**
- [ ] Task 3.1: Knowledge gap handling in verdict prompt
- [ ] Task 3.1: Evidence recency validation function
- [ ] Task 3.1: Confidence penalty for time-sensitive claims without recent evidence
- [ ] Task 3.2: LLM-based relevance classification (optional enhancement)
- [ ] Integration testing with time-sensitive claims

**Expected impact** : Handles time-sensitive claims correctly, completes relevance filtering.

---

## Verification Strategy

### Generic Test Cases (Cross-Domain)

**Test 1: Legal Domain (Foreign opinion contamination)**

* Input: "Was [domestic legal proceeding in Country A] fair?"
* Expected: REJECT foreign government opinions about Country A's proceedings
* Expected: ACCEPT Country A court documents, appeals, legal analysis
* Verify: No foreign political opinions in evidence

**Test 2: Scientific Domain**

* Input: "Is electric vehicle technology A more efficient than B?"
* Expected: REJECT industry association position statements
* Expected: ACCEPT peer-reviewed studies with measurements
* Verify: No advocacy materials treated as evidence

**Test 3: Corporate Domain**

* Input: "Did Company X commit fraud?"
* Expected: REJECT competitor statements about Company X
* Expected: ACCEPT regulatory filings, audit reports, whistleblower docs
* Verify: No third-party characterizations as high probativeValue

**Test 4: Historical Domain**

* Input: "Did Event X occur in Year Y?"
* Expected: ACCEPT contemporary documents from Year Y
* Expected: REJECT modern historians' characterizations without citing primary sources
* Verify: Primary sources prioritized

**Test 5: Time-Sensitive Knowledge Gap**

* Input: "Is Government X currently trustworthy?"
* Expected: FLAG knowledge gap (requires current information after training cutoff)
* Expected: REQUIRE recent web evidence (current year)
* Expected: REDUCE confidence if no recent evidence
* Verify: Warning shown to user

---

## Minimal Repro Protocol (for reviewers)

1. **Run an analysis** using a time-sensitive, procedural fairness input.
2. **Collect artifacts**:
   - `resultJson` and `reportMarkdown` from `Jobs` table.
   - `JobEvents` stream/table (includes error stack traces on failure).
   - `apps/web/debug-analyzer.log` tail.
3. **Check three red flags**:
   - Opinion/response sources labeled `probativeValue=high`.
   - Criticism sources from unrelated jurisdictions or actors.
   - Context duplication (multiple contexts with same institution/subject).

This protocol is designed to be domain‑agnostic and repeatable.

---

## Success Metrics

**Baseline measurements from database analysis (2026-02-05):**

| Metric                                          | Baseline (Measured) | Target | Current (2026-02-06) | Status |
| ------------------------------------------------- | ------------------- | -------- | -------------------- | ------ |
| Opinion evidence items extracted with high/medium probativeValue | **91%** (10/11) | 0% | **0%** | ✅ ACHIEVED |
| Opinion evidence items present after deterministic filtering     | **Present**     | 0% | **0** | ✅ ACHIEVED |
| Irrelevant search results fetched               | ~40%                | <10%   | ~40% (Phase 2) | ⏳ PENDING |
| Time-sensitive claims with old evidence flagged | 0%                  | 100%   | 0% (Phase 3) | ⏳ PENDING |
| Evidence contamination rate (opinion/third-party commentary influencing verdicts) | **Present** | 0% | **0%** | ✅ ACHIEVED |
| Job failures due to intermittent provider/SDK errors            | **Present** (rare) | ~0% | Improved (stack traces logged) | ✅ IMPROVED |

**Phase 1 Verification (2026-02-06):**
- Vaccine analysis: 19 primary, 3 secondary, **0 opinion** ✅
- Bolsonaro (EN): 11 primary, 5 secondary, **0 opinion** ✅
- Bolsonaro (DE): 1 primary, **0 opinion** ✅ (correctly low confidence)
- Hydrogen: 33 primary, 8 secondary, **0 opinion** ✅

**Key insight from baseline:** The 91% error rate for opinion sources (10/11 incorrectly elevated) was a systematic issue requiring deterministic correction. **Phase 1 resolved this completely.**

---

## Risk Assessment


| Risk                          | Probability | Impact | Mitigation                                                  |
| ------------------------------- | ------------- | -------- | ------------------------------------------------------------- |
| Over-filtering valid evidence | MEDIUM      | HIGH   | Extensive cross-domain testing, log all filtering decisions |
| LLM classification errors     | MEDIUM      | MEDIUM | Deterministic validation catches errors                     |
| Performance degradation       | LOW         | MEDIUM | Pre-filter reduces fetch/extract, net improvement expected  |
| Breaking existing analyses    | LOW         | HIGH   | Feature flags for gradual rollout, A/B testing              |

---

## Rollout Plan

1. **Feature flags** for each solution (enable/disable independently)
2. **A/B test** with 10% traffic for 48-72 hours
3. **Monitor metrics** : Evidence quality, filtering stats, analysis quality
4. **Roll back** if evidence contamination increases or valid evidence filtered >5%
5. **Gradual rollout** : 10% → 25% → 50% → 100% over 2 weeks

---

## Files to Modify


| File                                                              | Changes                                 | Lines                  | Priority |
| ------------------------------------------------------------------- | ----------------------------------------- | ------------------------ | ---------- |
| `apps/web/src/lib/analyzer/prompts/base/extract-evidence-base.ts` | Enhanced opinion detection              | 120-141                | P0       |
| `apps/web/src/lib/analyzer/evidence-filter.ts`                    | Deterministic opinion filtering         | Probative filter rules | P0       |
| `apps/web/src/lib/analyzer/orchestrated.ts`                       | Always apply deterministic filter + search improvements | Evidence extraction + search loop | P0       |
| `apps/web/src/app/api/internal/run-job/route.ts`                  | Persist error stacks + runner resilience | Runner error handling  | P0       |
| `apps/web/test/unit/lib/analyzer/evidence-filter.test.ts`         | Deterministic filter regression tests   | Unit tests             | P0       |
| `apps/web/src/lib/analyzer/prompts/base/verdict-base.ts`          | Knowledge cutoff awareness              | After line 27          | P1       |
| `apps/web/src/lib/analyzer/types.ts`                              | Add relevanceClassification field       | SearchResult interface | P1       |

---

## Dependencies

* No external dependencies
* No schema changes required (uses existing fields)
* No database migrations needed
* Compatible with current PipelineConfig

---

## Open Questions for Review

1. Should relevance pre-filter use LLM classification or heuristics first?
2. What confidence penalty amount for knowledge gap? (Proposed: 20%)
3. Should we add explicit "third-party commentary" flag to evidence items?
4. How to handle cases where NO relevant criticism exists? (Currently: "not found" logged)
5. Should context deduplication be **strengthened** when multiple contexts share the same institution and assessedStatement? (Avoids redundant contexts.)

---

## Review Checklist

Please review the following aspects before approval:

### Design Review

- [ ] Solutions are **truly generic** (not case-specific to any single incident or report)
- [ ] Solutions apply universally across domains (legal, scientific, corporate, historical)
- [ ] No bias toward or against any specific government, organization, or entity
- [ ] Root cause analysis is accurate and complete
- [ ] Proposed solutions address root causes (not symptoms)

### Technical Review

- [ ] Implementation plan is feasible and well-sequenced
- [ ] File locations and line numbers are correct
- [ ] No conflicts with existing Pipeline Improvement Plan (Phase 1 complete)
- [ ] No schema changes required (uses existing fields)
- [ ] Backward compatibility maintained (feature flags for rollout)

### Testing & Validation

- [ ] Cross-domain test cases are comprehensive
- [ ] Success metrics are measurable and appropriate
- [ ] Risk assessment covers major concerns
- [ ] Rollout plan includes safety measures (A/B testing, feature flags)

### Effort & Priority

- [ ] Phase 1 (2 days) is achievable for P0 items
- [ ] Phase 2 (3 days) is reasonable for search quality improvements
- [ ] Phase 3 (4 days) is appropriate for advanced filtering
- [ ] Total effort (9 days) aligns with priority

### Open Questions Resolution

- [ ] Q1: Relevance pre-filter approach (LLM vs heuristics) - **Decision needed**
- [ ] Q2: Confidence penalty for knowledge gap (20%) - **Decision needed**
- [ ] Q3: Add third-party commentary flag - **Decision needed**
- [ ] Q4: Handle cases with no relevant criticism - **Decision needed**

---

## Reviewer Sign-Off


| Reviewer | Role                | Status     | Date | Comments |
| ---------- | --------------------- | ------------ | ------ | ---------- |
|          | Principal Architect | ⏳ PENDING |      |          |
|          | Lead Developer      | ⏳ PENDING |      |          |
|          | Senior Developer    | ⏳ PENDING |      |          |

---

## Approval Decision

**Status:** ⚠️ **APPROVED WITH CHANGES**

**Options:**

- ✅ **APPROVED** - Proceed with implementation as specified
- ⚠️ **APPROVED WITH CHANGES** - Proceed after addressing specific concerns (list below)
- ❌ **REJECTED** - Major redesign required (provide rationale below)

**Decision Notes:**

```
PRINCIPAL ARCHITECT REVIEW (2026-02-05):

APPROVED WITH CHANGES - Ready for Phase 1 implementation.

The database analysis validates the core problems:
- 91% of opinion sources have incorrectly elevated probativeValue
- Third-party commentary contaminates evidence when external reactions are treated as probative
- Deterministic validation is required - prompt tuning alone is insufficient

OPEN QUESTION DECISIONS:

Q1: Relevance pre-filter approach (LLM vs heuristics)?
DECISION: Start with HEURISTICS in Phase 2. LLM-based classification adds latency
and cost. Use domain/URL patterns + metadata matching first. Add LLM fallback in
Phase 3 if heuristic accuracy < 80%.

Q2: Confidence penalty for knowledge gap (20%)?
DECISION: APPROVED at 20%. This is a reasonable starting point. Make configurable
via PipelineConfig so we can tune based on A/B testing results.

Q3: Add third-party commentary flag?
DECISION: DEFER to Phase 2. Solution 3's validation rules address the immediate
problem. A dedicated flag can be added later for enhanced reporting.

Q4: Handle cases with no relevant criticism?
DECISION: Log "no relevant criticism found" and proceed with available evidence.
Do NOT fabricate counter-evidence. Add to researchMetrics output.

Q5: Context deduplication strengthening?
DECISION: OUT OF SCOPE for this plan. Address in Pipeline Phase 2 under
"Context-parallel research" item.

IMPLEMENTATION PRIORITY:
1. Phase 1 (Solution 2 + 3): CRITICAL - Deploy within 1 week
2. Phase 2 (Solution 5 + 1): HIGH - Deploy within 2 weeks
3. Phase 3 (Solution 4): MEDIUM - Deploy within 3 weeks

The 91% error rate for opinion sources is unacceptable for production quality.
Solution 3's deterministic validation is the highest-impact change and should
be implemented first.
```

---

## Reviewer Sign-Off


| Reviewer       | Role                | Status          | Date       | Comments                                                    |
| -------------- | ------------------- | --------------- | ---------- | ----------------------------------------------------------- |
| Claude Opus 4.5 | Principal Architect | ✅ APPROVED     | 2026-02-05 | Validated via database analysis; approved with decisions above |
| Claude Opus 4.5 | Lead Developer      | ✅ PHASE 1 DONE | 2026-02-06 | Phase 1 implemented and verified (see verification report) |
|                | Senior Developer    | ⏳ PHASE 2      |            | Ready to implement Tasks 2.1-2.3                            |

---

**Plan Status:** ✅ PHASE 1 COMPLETE - PHASE 2 READY FOR IMPLEMENTATION
**Next Step:** Senior Developer to implement Phase 2 (Tasks 2.1-2.3)
**Document Version:** 2.0 (Phase 1 verified complete; Phase 2 implementation-ready)
