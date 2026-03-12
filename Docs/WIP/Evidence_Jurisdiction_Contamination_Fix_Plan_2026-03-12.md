# Evidence Jurisdiction Contamination Fix Plan

**Created:** 2026-03-12
**Author:** Senior Developer (Claude Opus 4.6)
**Status:** APPROVED — ready for Act Mode
**Baseline:** `Baseline_Test_Results_Phase1_2026-03-12.md`
**Priority:** #1 quality blocker (per baseline §11)

---

## 1. Problem Statement

The ClaimAssessmentBoundary pipeline produces boundaries containing foreign-jurisdiction evidence when analyzing jurisdiction-specific claims. In the Bolsonaro trial analysis (H3, English), 3 of 6 boundaries contained U.S. government material (executive orders, congressional statements, State Department reports) — yielding the **worst B-score (15%) in the entire 13-run historical dataset**.

This is not an edge case. The Scorecard showed 7 of 13 historical Bolsonaro runs had at least one foreign-contaminated boundary (54% contamination rate).

### H3 Contamination by the Numbers

From the actual H3 run data (job `fe595e71`):

| Metric | Value |
|--------|-------|
| Total evidence items | 49 |
| U.S. government source items | **21 (42.9%)** |
| state.gov items alone | 15 (30.6%) — mostly about general police accountability, NOT Bolsonaro trials |
| Dedicated U.S. boundaries | 2 (CB_01: U.S. Executive Branch sanctions; CB_07: U.S. Congressional statements) |
| U.S. items in mega-boundary CB_12 | 15 (from state.gov HR report) |
| Verdict impact | CB_01 reduced truth percentage by 5 points — U.S. sanctions treated as evidence that trials were unfair |

**Key domains involved:** `state.gov` (15 items), `home.treasury.gov` (3), `federalregister.gov` (2), `mcgovern.house.gov` (1), `cov.com` (2 — law firm analysis of U.S. sanctions).

---

## 2. Root Cause Analysis

### 2.1 Five Compounding Failures

The contamination is not caused by a single bug — it results from five independent gaps that compound:

**Gap 1: `distinctEvents` has ZERO prompt instructions (CRITICAL)**

The `distinctEvents` field in the Pass 2 output schema (`claimboundary.prompt.md` lines 214-220) is an **orphan field** — it appears only in the JSON schema with no governing instructions, constraints, or description. Compare this to `atomicClaims` which has ~50 lines of detailed rules (lines 117-169).

The LLM can populate `distinctEvents` with anything it considers relevant from preliminary evidence, including foreign reactions, sanctions, and political statements from other countries. There is no:
- Definition of what qualifies as a "distinct event"
- Constraint that events must be from the claim's jurisdiction
- Prohibition on including foreign reactions
- Requirement that events be explicitly mentioned in the input

**Gap 2: Multi-event coverage rule FORCES queries for foreign events (AMPLIFIER)**

`GENERATE_QUERIES` line 333 states: *"When `distinctEvents` contains two or more distinct events... you MUST distribute query coverage across those events."* This uses imperative "MUST" language.

Once a foreign reaction enters `distinctEvents`, the pipeline is **required** to generate dedicated search queries targeting it. A single stray foreign event in `distinctEvents` becomes multiple foreign-jurisdiction search queries, which become dozens of foreign evidence items.

**Flow:** Foreign reaction in preliminary evidence → Pass 2 puts it in `distinctEvents` (no constraint prevents this) → Multi-event coverage rule forces dedicated queries → Foreign evidence extracted → Forms contaminated boundaries.

**Gap 3: `classifyRelevance()` has no jurisdiction dimension (GATE MISSING)**

The `RELEVANCE_CLASSIFICATION` prompt (lines 368-418) only checks topical relevance. Its criteria are:
- "appears to contain evidence that would verify, refute, or contextualize the claim" (line 377)
- "methodology, metrics, or source type match" (line 378)
- "content is substantive" (line 379)

There is no jurisdiction/applicability criterion. A U.S. Executive Order about Bolsonaro is topically relevant (mentions the same person/events) but jurisdictionally irrelevant to assessing Brazilian legal proceedings.

Additionally, **`classifyRelevance()` doesn't even pass geographic context to the LLM** (`claimboundary-pipeline.ts` line 3247 passes only `claim.statement`). The LLM has no information about `inferredGeography` during relevance scoring.

**Gap 4: No post-extraction jurisdiction filter (SAFETY NET MISSING)**

Between evidence extraction and boundary clustering, there is zero filtering based on `evidenceScope.geographic`. The `geographic` field exists in the `EvidenceScope` type (line 247 of `types.ts`) as purely descriptive metadata. The pipeline records it but never acts on it.

`evidence-filter.ts` (203 lines) filters by: source authority, probativeValue, statement length, source excerpt presence, source URL presence, and statistics content. No geographic/jurisdiction check.

**Gap 5: Contrarian iteration is jurisdiction-blind (SECONDARY VECTOR)**

The contrarian instruction (line 343) seeks "evidence in the opposite direction" with no jurisdiction constraint. For politically charged topics, foreign government reactions are highly authoritative refutations — the LLM naturally gravitates toward them because they're strong, credible counter-evidence from the wrong jurisdiction.

### 2.2 Contamination Flow Diagram

```
Pass 1: inferredGeography = "BR" (detected correctly)
  ↓ (geography NOT passed to downstream stages)
Pass 2: distinctEvents = [..., "U.S. sanctions against X", ...] (no constraint)
  ↓
GENERATE_QUERIES: "MUST distribute queries across distinctEvents"
  → Query: "US sanctions Bolsonaro human rights"
  → Query: "US congressional statement Brazil judicial proceedings"
  ↓
classifyRelevance(): topical match only, no jurisdiction check
  → state.gov HR report: relevanceScore = 0.65 (topically relevant) → PASSES 0.4 threshold
  → federalregister.gov EO: relevanceScore = 0.58 → PASSES
  ↓
extractEvidence(): extracts 21 items from U.S. sources
  → evidenceScope.geographic = "United States" (recorded but not filtered)
  ↓
evidence-filter.ts: no jurisdiction check → all 21 pass
  ↓
clusterBoundaries(): correctly separates by methodology
  → CB_01: "U.S. Executive Branch Official Designations and Sanctions" (6 items)
  → CB_07: "U.S. Congressional Statements" (1 item)
  → CB_12: absorbs 15 state.gov items into mega-boundary
  ↓
verdict-stage: CB_01 "directly contradicts AC_01 with 6 evidence items"
  → truth percentage reduced by 5 points based on U.S. sanctions
```

### 2.3 Why Portuguese Runs Are Clean

Portuguese runs (H1a, H1b) have clean boundaries (B2=✅, B7=✅) because:
- Query generation in Portuguese (`detectedLanguage = "pt"`) naturally produces Portuguese-language queries
- Portuguese queries return Brazilian sources from Google/Brave
- English-language U.S. government sources don't appear in Portuguese search results
- The language barrier acts as an accidental jurisdiction filter

English runs are vulnerable because English is the lingua franca of both Brazilian legal commentary AND U.S. government reports. The pipeline can't distinguish "English-language analysis OF Brazil" from "English-language analysis BY the U.S. about Brazil."

---

## 3. Design Constraints

Any fix must respect the project's fundamental rules:

| Constraint | Implication |
|-----------|-------------|
| **Generic by design** | No hardcoded country lists, keyword blocklists, or jurisdiction taxonomies |
| **LLM Intelligence** | Jurisdiction assessment must use LLM, not regex/rules |
| **Multilingual robustness** | Must work for DE claims about Swiss cantons, PT claims about Brazilian courts, EN claims about any country |
| **No hardcoded keywords** | Cannot filter by domain name, country code, or entity name |
| **Efficiency mandates** | Must batch, cache, minimize tokens — no separate LLM call per evidence item |
| **UCM configurable** | Thresholds and weights must be admin-tunable |
| **Input neutrality** | Fixes must not change verdicts for non-jurisdiction claims (e.g., "Is electricity more efficient for cars than hydrogen?") |

---

## 4. Proposed Fixes

Four complementary interventions at different pipeline stages, ordered by where they intercept the contamination flow. Fixes 0-2 are prompt changes with minimal code. Fix 3 is a new pipeline step.

### Fix 0: Add `distinctEvents` Prompt Instructions (PROMPT + 1-LINE CODE CHANGE — ROOT CAUSE)

**Stage:** Pass 2 (`CLAIM_EXTRACTION_PASS2`) — understanding stage
**Type:** Prompt addition + pass `inferredGeography` to Pass 2 template vars
**Effort:** Small (1 code change + prompt)
**Impact:** Critical — prevents foreign events from entering the pipeline's event model

**Problem:** `distinctEvents` (schema lines 214-220) has no accompanying instructions. It is the only output field in the entire Pass 2 prompt without governing rules. The LLM fills it based on whatever it finds in preliminary evidence, including foreign reactions.

**Prompt change** — add to Pass 2 Rules section (before the Output Schema, around line 170):

```markdown
### Distinct Events Rules

`distinctEvents` identifies separate proceedings, episodes, or time-bounded events that the claim encompasses. These drive multi-event query coverage in Stage 2.

**Include:**
- Events, proceedings, rulings, or episodes that are WITHIN the claim's jurisdiction and directly relevant to the claim's substance.
- Multiple proceedings or trials by the jurisdiction's own institutions.
- Temporal episodes of the same phenomenon (e.g., "2022 trial" and "2024 appeal").

**Exclude:**
- Foreign government reactions, sanctions, or statements about the claim's jurisdiction. These are third-party responses, not events within the claim's scope.
- International media coverage or foreign political commentary.
- Events that are consequences or ripple effects of the claim's subject in other jurisdictions.

**Test:** For each proposed event, ask: "Did this event occur within the claim's jurisdiction/system?" If a claim is about Country A's courts, only proceedings in Country A's courts qualify. Country B's sanctions against Country A are NOT a distinct event — they are a foreign reaction.

When unsure, err on the side of exclusion. Fewer, jurisdiction-accurate events produce better evidence than many events that dilute the search across foreign reactions.
```

**Code change** — pass `inferredGeography` as a template variable into `CLAIM_EXTRACTION_PASS2`. Currently the Pass 2 prompt receives only claim text; Pass 1 already computed `inferredGeography` but does not forward it to Pass 2. The LLM must re-infer jurisdiction from the claim text alone. Adding an explicit anchor removes this ambiguity for cases where jurisdiction is not obvious from phrasing.

1. **Update `runPass2` signature** to accept the new parameter:
```typescript
export async function runPass2(
  // ... existing params
  state?: Pick<CBResearchState, "warnings" | "onEvent">,
  repromptGuidance?: string,
  inferredGeography?: string | null, // NEW
)
```

2. **Update all `runPass2` callers** in `extractClaims` to pass `pass1.inferredGeography` (the initial call, the minimum-claim reprompts, and the MT-5(C) reprompt).

3. **CRITICAL: there are two Pass 2 render calls inside `runPass2` — both must receive `inferredGeography`.** At `claimboundary-pipeline.ts:1683`, the primary render with evidence. At `claimboundary-pipeline.ts:1696`, the soft-refusal retry render with no preliminary evidence. The comment at line 1693 explicitly notes this retry is for "politically sensitive inputs" — these are precisely the claims most likely to involve foreign-jurisdiction contamination. Missing the retry path means the geography anchor disappears exactly when it is needed most:

```typescript
// claimboundary-pipeline.ts:1683 — primary render (MUST add inferredGeography):
const renderedWithEvidence = await loadAndRenderSection("claimboundary", "CLAIM_EXTRACTION_PASS2", {
  currentDate,
  analysisInput: inputText,
  preliminaryEvidence: buildPreliminaryEvidencePayload(preliminaryEvidence),
  atomicityGuidance: getAtomicityGuidance(pipelineConfig.claimAtomicityLevel ?? 3),
  inferredGeography: inferredGeography ?? "not geographically specific",  // NEW
});

// claimboundary-pipeline.ts:1696 — soft-refusal retry render (MUST also add inferredGeography):
const renderedWithoutEvidence = await loadAndRenderSection("claimboundary", "CLAIM_EXTRACTION_PASS2", {
  currentDate,
  analysisInput: inputText,
  preliminaryEvidence: "[]",
  atomicityGuidance: getAtomicityGuidance(pipelineConfig.claimAtomicityLevel ?? 3),
  inferredGeography: inferredGeography ?? "not geographically specific",  // NEW
}) ?? renderedWithEvidence;
```

Update the Pass 2 prompt to reference `${inferredGeography}` in the Distinct Events Rules section (e.g., "When `${inferredGeography}` is set, treat it as the claim's jurisdiction anchor").

**Why this is Fix 0:** This is the root cause. If foreign events don't enter `distinctEvents`, the multi-event coverage rule (line 333) won't force queries for them. This single change would have prevented most of the H3 contamination.

**Risk:** Very low. The instruction is generic (uses "Country A/B" pattern, `inferredGeography` anchor). Claims without clear jurisdiction will have `inferredGeography = null` → "not geographically specific" → `distinctEvents` rules don't activate.

---

### Fix 1: Jurisdiction-Aware Relevance Classification (PROMPT + SMALL CODE CHANGE)

**Stage:** `classifyRelevance()` — between search results and source fetching
**Type:** Prompt enhancement + pass `inferredGeography` to the LLM
**Effort:** Small-Medium
**Impact:** High — prevents foreign sources from entering evidence pool even if queries return them

**Problem:** Two sub-issues:
1. The `RELEVANCE_CLASSIFICATION` prompt has no jurisdiction dimension
2. The `classifyRelevance()` function (`claimboundary-pipeline.ts` line 3247) doesn't pass `inferredGeography` to the LLM — the LLM only sees the bare claim statement

**Prompt change** (add to `RELEVANCE_CLASSIFICATION` → Rules section, after line 391):

```markdown
- **Jurisdiction applicability**: When the claim concerns a specific jurisdiction (legal system, country, institution, geographic entity), assess whether the search result contains evidence FROM WITHIN that jurisdiction or about that jurisdiction's own actions/data.
  - **direct**: Evidence produced by institutions, courts, agencies, or researchers within the claim's jurisdiction. Score normally.
  - **contextual**: Evidence about the jurisdiction from neutral external observers (international NGOs, academic comparative studies). Score normally but note as external.
  - **foreign_reaction**: Evidence produced by foreign governments, foreign legislative bodies, or foreign executive actions ABOUT the claim's jurisdiction (sanctions, diplomatic statements, foreign congressional resolutions). These are political reactions, not evidence about the claim's substance. Score at most 0.3.
  - When `inferredGeography` is provided, use it as a signal for the claim's jurisdiction. When it is null, infer jurisdiction from the claim text if possible.
  - For claims without clear jurisdiction (e.g., scientific claims, global phenomena), all sources are "direct" — do not apply jurisdiction filtering.
```

**Schema change** (add to output):

```json
{
  "relevantSources": [
    {
      "url": "string",
      "relevanceScore": 0.85,
      "jurisdictionMatch": "direct | contextual | foreign_reaction",
      "reasoning": "string"
    }
  ]
}
```

**Code change 1** — pass `inferredGeography` to the prompt in `classifyRelevance()` (around line 3258):

```typescript
// Current: only claim.statement is rendered into the prompt
// Add: inferredGeography as a new template variable
const rendered = await loadAndRenderSection("claimboundary", "RELEVANCE_CLASSIFICATION", {
  claim: claim.statement,
  searchResults: JSON.stringify(searchResults),
  inferredGeography: inferredGeography ?? "null",  // NEW
});
```

This requires updating `classifyRelevance()`'s signature to accept `inferredGeography`. **`currentDate` must be retained** — it is a required parameter used to render the prompt (live call at `claimboundary-pipeline.ts:3243`) and passed by the caller at `claimboundary-pipeline.ts:2981`. Dropping it would break the existing prompt render contract:

```typescript
export async function classifyRelevance(
  claim: AtomicClaim,
  searchResults: Array<{ url: string; title: string; snippet?: string | null }>,
  pipelineConfig: PipelineConfig,
  currentDate: string,             // EXISTING — must not be removed
  inferredGeography?: string | null,  // NEW
): Promise<Array<{ url: string; relevanceScore: number }>>
```

**Code change 2** — cap foreign_reaction scores (after line 3304):

```typescript
const foreignCap = pipelineConfig.foreignJurisdictionRelevanceCap ?? 0.35;
const adjustedSources = validated.relevantSources.map(s => {
  if (s.jurisdictionMatch === "foreign_reaction") {
    return { ...s, relevanceScore: Math.min(s.relevanceScore, foreignCap) };
  }
  return s;
});
const relevantSources = adjustedSources.filter(s => s.relevanceScore >= 0.4);
```

**UCM config** — must be added in **three locations** or `config-drift.test.ts` will fail:

1. `apps/web/configs/pipeline.default.json`:
```json
"foreignJurisdictionRelevanceCap": 0.35
```
2. `PipelineConfigSchema` in `config-schemas.ts` (~line 310):
```typescript
foreignJurisdictionRelevanceCap: z.number().min(0).max(1).optional()
  .describe("Max relevance score for foreign-reaction sources (default: 0.35, below the 0.4 pass threshold)"),
```
3. `DEFAULT_PIPELINE_CONFIG` in `config-schemas.ts` (~line 812):
```typescript
foreignJurisdictionRelevanceCap: 0.35,
```

**Code change 3** — update all callers of `classifyRelevance()` to pass `inferredGeography`. The single call site is at `claimboundary-pipeline.ts:2977` (inside `runResearchIteration`):

```typescript
const relevantSources = await classifyRelevance(
  targetClaim,
  response.results,
  pipelineConfig,
  currentDate,                                      // EXISTING — must be retained
  state.understanding?.inferredGeography ?? null,   // NEW — pass geography context
);
```

**Why this works:** Even if foreign events leak through `distinctEvents` (Fix 0 fails or is incomplete), this gate blocks foreign sources from being fetched and extracted. The LLM now has both the claim text AND the geographic context to make a jurisdiction judgment.

**Risk:** Medium. Requires schema change to `RelevanceClassificationOutputSchema` and caller updates. The `contextual` tier ensures legitimate cross-jurisdiction evidence (academic studies, international NGO reports) still passes.

**What about the relevance threshold (0.4)?** This fix does NOT change the threshold — it changes what scores foreign sources receive. Raising the threshold globally would also filter out borderline-relevant domestic sources. The jurisdiction-specific cap is more surgical.

---

### Fix 2: Constrain Contrarian and Multi-Event Query Generation (PROMPT CHANGE)

**Stage:** `generateResearchQueries()` — query generation
**Type:** Prompt enhancement (zero code change)
**Effort:** Small
**Impact:** Medium — reduces foreign material in search results

**Problem:** Two sub-issues in `GENERATE_QUERIES`:
1. Contrarian iteration (line 343) seeks any refutation regardless of jurisdiction
2. Multi-event coverage rule (line 333) uses "MUST" to force queries for every event including foreign ones

**Prompt change A** — amend the contrarian instruction (after line 343):

```markdown
**Jurisdiction constraint**: When the claim is about a specific jurisdiction, ALL queries (including contrarian) MUST seek evidence FROM WITHIN that same jurisdiction. For a claim about Country A's courts, search for Country A legal scholars who disagree, Country A media reporting problems, Country A opposition parties raising concerns — not Country B's government reactions. Cross-jurisdictional evidence (e.g., international tribunal rulings) is acceptable only when the claim itself invokes international standards. Use `inferredGeography` as a jurisdiction signal when available.
```

**Prompt change B** — amend the multi-event coverage rule (line 333), add after "When `distinctEvents` is empty or contains only one event, default to the normal query strategy from `expectedEvidenceProfile`.":

```markdown
**Jurisdiction filter for events**: When distributing queries across `distinctEvents`, skip events that are foreign reactions or occurred outside the claim's jurisdiction. If `inferredGeography` indicates Country A, only generate queries for events that occurred WITHIN Country A's institutions or system. Foreign sanctions, foreign government statements, and foreign legislative actions are NOT events to cover — they are reactions.
```

**Why this works:** Even if foreign events remain in `distinctEvents` (Fix 0 incomplete), the query generator won't create queries for them. And contrarian queries will stay within the claim's jurisdiction.

**Risk:** Low. Uses the same `inferredGeography` signal already passed to the prompt. Non-jurisdiction claims are unaffected (the constraint only activates "when the claim is about a specific jurisdiction").

---

### Fix 3: Post-Extraction Applicability Assessment (NEW PIPELINE STEP — SAFETY NET)

**Stage:** Between research loop completion and `clusterBoundaries()`
**Type:** New LLM-powered assessment step (code change)
**Effort:** Medium
**Impact:** High — catches contamination that slipped through Fixes 0-2

**Rationale for including this fix:** Fixes 0-2 are all prompt-based. LLM prompt compliance is probabilistic, not guaranteed. The H3 baseline showed that 42.9% of evidence was foreign — a prompt-only fix might reduce this to 10-15% but not zero. Fix 3 provides a deterministic-feeling safety net (LLM classification with hard threshold) that catches residual contamination.

**Implementation:**

1. **New prompt section** `APPLICABILITY_ASSESSMENT` in `claimboundary.prompt.md`:

```markdown
## APPLICABILITY_ASSESSMENT

You are an evidence applicability engine. Given a set of evidence items and the claim's jurisdiction context, classify each item's applicability.

### Task

For each evidence item, determine whether it was produced by actors within the claim's jurisdiction or by external/foreign actors.

### Applicability Categories

- **direct**: Evidence produced by actors, institutions, processes, or data sources WITHIN the claim's jurisdiction. Court rulings from the relevant country, statistics from the relevant agency, domestic media reporting, domestic academic analysis.
- **contextual**: Evidence about the jurisdiction from neutral external observers. International academic studies, international NGO reports using the jurisdiction's own data, comparative legal analyses. These provide useful external perspective.
- **foreign_reaction**: Evidence produced by foreign governments, foreign legislative bodies, or foreign executive actions ABOUT the claim's jurisdiction. Sanctions, diplomatic statements, foreign congressional resolutions, foreign State Department reports. These are political reactions, not evidence about the claim's substance.

### Rules

- Do not assume any particular language. Assess based on the evidence's institutional origin, not its language.
- When `inferredGeography` is null or the claim has no clear jurisdiction, mark all items "direct."
- International bodies (UN, ICC, ECHR) are "direct" when the claim invokes international standards; otherwise "contextual."
- Foreign media reporting (e.g., BBC reporting on Brazilian trials) is "contextual" — the media organization is foreign but it's reporting on the jurisdiction's events using the jurisdiction's own sources.
- Foreign government ACTIONS (sanctions, executive orders) are always "foreign_reaction" — even if they mention the jurisdiction's events.

### Input

**Claims:**
```
${claims}
```

**Inferred Geography:**
```
${inferredGeography}
```

**Evidence Items:**
```
${evidenceItems}
```

### Output Schema

Return a JSON object:
```json
{
  "assessments": [
    {
      "evidenceIndex": 0,
      "applicability": "direct | contextual | foreign_reaction",
      "reasoning": "string — brief justification"
    }
  ]
}
```
```

2. **Schema change** — add `applicability` field to the **TypeScript interface** in `types.ts` (optional, to carry the field after post-extraction assessment):

```typescript
// In the EvidenceItem interface (types.ts) — TypeScript type system only:
applicability?: "direct" | "contextual" | "foreign_reaction";
```

**Do NOT add `applicability` to `Stage2EvidenceItemSchema` (`claimboundary-pipeline.ts:2340`).** That schema parses the EXTRACT_EVIDENCE LLM output; under this design, `applicability` is set programmatically by `assessEvidenceApplicability` after extraction, not by the extraction LLM. Adding it to `Stage2EvidenceItemSchema` would confuse the extraction schema with the applicability assessment output. If the approach is ever changed so the extraction LLM outputs `applicability` directly (Approach B — more LLM-efficient, requires EXTRACT_EVIDENCE prompt change and LLM Expert review), that migration would move the Zod definition to `Stage2EvidenceItemSchema` and remove the separate assessment function.

3. **New function** in `claimboundary-pipeline.ts`:

```typescript
export async function assessEvidenceApplicability(
  claims: AtomicClaim[],
  evidenceItems: EvidenceItem[],
  inferredGeography: string | null,
  pipelineConfig: PipelineConfig,
): Promise<EvidenceItem[]> {
  // Skip if no geography or disabled
  if (!inferredGeography || !(pipelineConfig.applicabilityFilterEnabled ?? true)) {
    return evidenceItems;
  }

  // Batch all evidence into single Haiku-tier LLM call
  // For each item: set item.applicability = assessment result ("direct" | "contextual" | "foreign_reaction")
  // Do NOT modify probativeValue — applicability is a separate dimension from evidence quality
  // Return items with applicability field populated
}
```

3. **Integration** — in `runClaimBoundaryAnalysis()`, after research completes and before clustering. Assessment and filtering happen together in one post-loop pass:

```typescript
// After: state.evidenceItems fully populated from all research iterations
// Before: const boundaries = await clusterBoundaries(state);
if (pipelineConfig.applicabilityFilterEnabled ?? true) {
  const assessed = await assessEvidenceApplicability(
    state.understanding.atomicClaims,
    state.evidenceItems,
    state.understanding?.inferredGeography ?? null,
    pipelineConfig,
  );
  state.llmCalls++;
  // Filter foreign_reaction items inline — field is now populated
  state.evidenceItems = assessed.filter(
    (item) => !item.applicability || item.applicability !== "foreign_reaction"
  );
}
```

**Do NOT add an `applicability` check to `evidence-filter.ts`** (the existing `filterByProbativeValue` at `claimboundary-pipeline.ts:3026`). That filter runs inside each research iteration loop, before `assessEvidenceApplicability` has been called. At that point, `item.applicability` is always `undefined` — the check would never fire. The `applicability` field is only set by the post-loop assessment call above. Adding a dead check to `evidence-filter.ts` would create misleading code.

The two filter axes remain conceptually independent — `probativeValue` (quality) runs inside the loop; `applicability` (jurisdiction relevance) runs once after all research completes. A U.S. executive order may have high `probativeValue` for what it *is* while having `applicability: "foreign_reaction"` for a Brazilian legal claim. The post-loop filter removes it; the probativeValue filter never saw a reason to.

**UCM config** — must be added in **three locations** or `config-drift.test.ts` will fail:

1. `apps/web/configs/pipeline.default.json`:
```json
"applicabilityFilterEnabled": true
```
2. `PipelineConfigSchema` in `config-schemas.ts`:
```typescript
applicabilityFilterEnabled: z.boolean().optional()
  .describe("Enable post-extraction applicability assessment to filter foreign-jurisdiction evidence"),
```
3. `DEFAULT_PIPELINE_CONFIG` in `config-schemas.ts`:
```typescript
applicabilityFilterEnabled: true,
```

**Cost:** One additional Haiku-tier LLM call per analysis. With ~50 evidence items batched, this is ~200-300 input tokens + ~150 output tokens ≈ $0.0002 per run. Negligible.

**Risk:** Medium effort. Requires new prompt section, new function, schema updates, and integration. False positives possible but mitigated by `contextual` middle tier and the fact that Fix 3 only activates when `inferredGeography` is set.

---

## 5. Implementation Priority

| Order | Fix | What | Effort | Impact | Code Changes |
|-------|-----|------|--------|--------|-------------|
| **0** | distinctEvents instructions | Prompt + 1-line code | Small | Critical | 1 file (pipeline) |
| **2** | Query generation constraints | Prompt only | Small | Medium | 0 files |
| **1** | Jurisdiction-aware relevance | Prompt + code | Small-Med | High | 3 files (prompt, pipeline, schema) |
| **3** | Post-extraction assessment | New step | Medium | High (safety net) | 4 files (prompt, pipeline, types, filter) |

**Approved phased approach (Captain decision 2026-03-12):**

**Phase A — Fix 0 alone (root cause first):** Implement Fix 0 prompt instructions + pass `inferredGeography` to Pass 2. Then immediately validate (re-run H3). This isolates whether the root cause fix is sufficient before adding any further changes.

**Phase A validation:** If H3 has 0 foreign-contaminated boundaries → Fix 0 was sufficient; proceed to Phase A+ only if regression checks fail. If residual contamination remains → add Fix 2 in Phase A+.

**Phase A+ (if needed):** Add Fix 2 (query constraints, prompt-only). Re-validate H3.

**Phase B (if A+A+ still shows residual):** Implement Fix 1 (jurisdiction-aware relevance). Requires `inferredGeography` passed to `classifyRelevance()`, schema change, and caller updates. Note: Fix 1's `jurisdictionMatch` field must default to `.catch("contextual")` — not `"direct"` — to avoid silently passing all sources through when the field is absent.

**Phase C (if needed):** Implement Fix 3 only if Phase A+B validation shows residual contamination. Fix 3 uses a dedicated `applicability` field (not `probativeValue` override) — see §4 Fix 3 for schema details.

---

## 6. Validation Plan

After each phase, re-run the H3 baseline claim:

**Claim:** "Were the various Bolsonaro trials conducted in accordance with Brazilian law and international standards of due process?"

| Metric | Phase 1 Baseline | Target After Fix |
|--------|-----------------|-----------------|
| U.S.-focused boundaries | 3 of 6 | 0 |
| `foreign_reaction` classified items | 21 of 49 (42.9% were foreign govt sources) | 0 |
| `contextual` items (U.S. academic/NGO) | allowed | allowed — must NOT be filtered |
| B2 (Trump immune) | ❌ | ✅ |
| B3 (Boundary naming) | ❌ | ✅ (all boundaries jurisdiction-appropriate) |
| B7 (No foreign bounds) | ❌ | ✅ |
| B-score | 15% | ≥50% |
| Truth percentage | 56% | Within ±5pp (fix should not dramatically change TP) |

**Note on validation metric:** The target is zero `foreign_reaction` items, not zero "U.S." items. U.S.-based academic papers, law school analyses, and NGO reports on Brazilian proceedings are `contextual` evidence — they should pass through and their presence is a quality signal, not contamination. Only foreign *government* actors (state.gov, federalregister.gov, congressional statements, executive orders) are `foreign_reaction`.

**Regression checks (end-to-end):**
- Re-run H1a (PT Bolsonaro): B-score ≥55% (currently 55%)
- Re-run H4 (DE Kinder Migration): TP within 68-76% (currently 72%)

**Required unit tests — must pass before commit; do not rely on end-to-end reruns alone:**

| Test file | What to test |
|-----------|-------------|
| `test/unit/lib/analyzer/claimboundary-pipeline.test.ts` | Both Pass 2 render calls (line 1683 and line 1696) receive `inferredGeography` as a template variable. Use existing `distinctEvents` wiring pattern (line 1676) as the test model. |
| `test/unit/lib/analyzer/claimboundary-pipeline.test.ts` | Fix 1: `classifyRelevance()` output with missing `jurisdictionMatch` field defaults to `"contextual"` (not `"direct"`) via `.catch("contextual")` on the schema. Verify a response missing the field does not block foreign-reaction filtering. |
| `test/unit/lib/analyzer/claimboundary-pipeline.test.ts` | Fix 3: after `assessEvidenceApplicability()` runs, an item with `applicability: "foreign_reaction"` is absent from `state.evidenceItems`. An item with `applicability: "contextual"` is retained. An item with no `applicability` field is retained (backwards compatible). Test the integration point, not evidence-filter.ts in isolation — the filter is inline post-loop, not inside `filterByProbativeValue`. |
| `test/unit/lib/config-drift.test.ts` | Will pass automatically once all three locations per UCM key are updated (`pipeline.default.json`, `PipelineConfigSchema`, `DEFAULT_PIPELINE_CONFIG`). Run after any UCM config change to confirm. |

---

## 7. What This Does NOT Fix

| Issue | Why Not | Where to Fix |
|-------|---------|-------------|
| H1 mean TP 56% vs deployed 90% | Likely caused by removed config params (`maxClaimBoundaries`, `boundaryCoherenceMinimum`, `selfConsistencyMode`), not contamination. PT runs are already clean. | Config investigation (separate task) |
| B1 STF/TSE separation | Claim decomposition splits by procedural/due-process instead of STF/TSE. This is a Pass 2 understanding issue. | Pass 2 prompt tuning (separate task) |
| SR weighting effects | SR weighting (commit `9550eb26`) is now active. Re-validation will include SR effects. | No fix needed — observe in validation |
| state.gov over-extraction (15 items from one source) | Even for legitimate sources, extracting 15 items from a single HR report is excessive. | Source extraction limits (separate task) |
| "Fix 1.4" break in web-search.ts | Auto-mode search stops after first provider with results. Affects evidence diversity. | web-search.ts fix (separate task, tracked in SR UCM Separation Plan) |

---

## 8. Open Questions for Captain

1. ~~**Phase A first, then validate?**~~ ✅ **DECIDED (2026-03-12):** Fix 0 alone first → validate H3 → add Fix 2 only if residual contamination. Then Fix 1 (Phase B), Fix 3 (Phase C) only if needed.
2. **Relevance threshold (0.4)** — Keep at 0.4 and let jurisdiction filtering handle contamination? Or also raise threshold? *(Architect recommendation: keep at 0.4 — jurisdiction-specific cap is more surgical than raising the global threshold.)*
3. ~~**`contextual` evidence weight**~~ ✅ **DECIDED (2026-03-12):** `contextual` evidence keeps full weight. International NGO reports and academic studies are legitimate evidence. No downweighting.
4. **state.gov extraction limit** — 15 items from one source is excessive regardless of jurisdiction. Should we add a per-source extraction cap? (Separate from this plan but related.)

---

## Review Log

| Date | Reviewer | Verdict | Notes |
|------|----------|---------|-------|
| 2026-03-12 | Lead Architect | ~~REQUEST_CHANGES~~ → RESOLVED | All structural and implementation concerns addressed through subsequent review iterations. See full review below. |
| 2026-03-12 | Captain | APPROVED with decisions | All LA recommendations accepted. See Decision Record below. |
| 2026-03-12 | Captain | ADDENDUM — 3 gaps | Two HIGH and one MEDIUM gap identified post-approval. All addressed in plan body. |
| 2026-03-12 | Captain | REQUEST_CHANGES — 3 implementation gaps | Critical: Fix 3 filter timing wrong, Fix 1 signature drops currentDate, Fix 3 schema location wrong. All corrected in plan body. |
| 2026-03-12 | Lead Developer | ~~REQUEST_CHANGES~~ → RESOLVED | All 3 objections resolved in plan body. See resolution note appended to that review. |
| 2026-03-12 | Lead Developer | APPROVED with inline fixes | Caught 2 out-of-scope variable references (`pass1Result`) in Fix 0 and Fix 1 implementation snippets. Corrected the code snippets and `runPass2` signature directly in the plan body and approved. |
| 2026-03-12 | Captain Deputy (Claude Sonnet 4.6) | APPROVED — doc cleanup applied | Confirmed plan execution-ready. Closed Open Q2 (keep 0.4 threshold, Architect recommendation accepted). Confirmed Open Q4 deferred. Found one remaining stale `pass1Result` snippet in Fix 1 (missed by prior inline fix) — removed directly. Two implementation flags noted for executor (Fix A touches 2 files, not 1; Phase A = Fix 0 alone per D3). Sequencing decision: Phase 2 worktree runs before Fix 0 implementation. |

---

## Decision Record

| # | Decision | Rationale |
|---|----------|-----------|
| D1 | **Fix 0: add `inferredGeography` to Pass 2 template vars** (1-line code change in addition to prompt). | Upgrades Fix 0 from "LLM infers jurisdiction" to "LLM receives jurisdiction explicitly." Low effort, removes ambiguity for non-obvious claims. |
| D2 | **Fix 3: use dedicated `applicability` field on `EvidenceItem`, not `probativeValue` override.** | `probativeValue` is a quality dimension; `applicability` is a jurisdiction dimension. Conflating them couples the jurisdiction filter to the quality threshold and obscures intent. The `applicability` field is explicit, backwards-compatible (optional field), and immune to threshold changes. |
| D3 | **Phasing: Fix 0 alone → validate → add fixes incrementally.** | Root cause should be isolated before adding further changes. Fix 0 may be sufficient. The original Phase A (0+2 together) makes it impossible to know which fix did the work. |
| D4 | **`contextual` evidence keeps full weight. No downweighting.** | International NGO and academic analysis is legitimate evidence. Blanket downweighting of external observers is not grounded in pipeline rules. |

---

### Captain Addendum — 2026-03-12 (post-approval gap review)

Three implementation gaps identified after approval. All addressed in the plan body. Severity ratings match AGENTS.md warning framework applied to implementation risk.

**[HIGH] Fix 0: soft-refusal retry path must also receive `inferredGeography`.**
`CLAIM_EXTRACTION_PASS2` is rendered at two call sites in `claimboundary-pipeline.ts`: the primary render at line 1683 (with preliminary evidence) and the soft-refusal retry at line 1696 (with empty evidence, used when the model refuses politically sensitive inputs). The original plan only described a generic "code change" without specifying both sites. The retry path is the failure mode this fix is designed to prevent — politically sensitive claims (Bolsonaro, contested trials) are the most likely to trigger refusal retries AND the most likely to attract foreign-jurisdiction contamination. Missing line 1696 would leave the exact problem case unprotected. §4 Fix 0 updated with both call sites explicitly.

**[HIGH] UCM config keys require three-location registration — `pipeline.default.json` alone is insufficient.**
`foreignJurisdictionRelevanceCap` (Fix 1) and `applicabilityFilterEnabled` (Fix 3) were documented only as `pipeline.default.json` changes. In this codebase, `config-drift.test.ts` compares `DEFAULT_PIPELINE_CONFIG` (TypeScript) against the JSON file key-by-key and fails the build if they diverge. New UCM pipeline keys must be added to all three locations: `pipeline.default.json`, `PipelineConfigSchema` (Zod schema), and `DEFAULT_PIPELINE_CONFIG` (TypeScript constant) — all in `config-schemas.ts`. §4 Fix 1 and Fix 3 UCM config sections updated with all three locations.

---

### Captain Addendum — 2026-03-12 (implementation gap review, round 2)

Three further implementation correctness gaps identified. All corrected in plan body. Severity uses AGENTS.md framework applied to implementation breakage risk.

**[CRITICAL] Fix 3 filter timing: the applicability check in `evidence-filter.ts` would never fire.**
`filterByProbativeValue` runs inside each research iteration loop at `claimboundary-pipeline.ts:3026`. Items pass through this filter and are added to `state.evidenceItems` before `assessEvidenceApplicability` has been called. At the time `filterByProbativeValue` checks `item.applicability`, the field is always `undefined` — no item would ever be filtered on applicability. The plan's step 4 (adding the check to `evidence-filter.ts`) was structurally impossible. Fix: removed step 4; the `foreign_reaction` filter is now applied inline in step 3, immediately after `assessEvidenceApplicability` populates the field. The two filter axes now run at their correct points in the pipeline: `probativeValue` (quality) inside the loop, `applicability` (jurisdiction) once post-loop.

**[CRITICAL] Fix 1: `classifyRelevance()` proposed signature drops `currentDate`, breaking the prompt render contract.**
The plan's sample signature added `inferredGeography` but omitted `currentDate`. The live function at `claimboundary-pipeline.ts:3239` requires `currentDate` as a parameter (it is rendered into the prompt at line 3246). The caller at `claimboundary-pipeline.ts:2981` passes it explicitly. Dropping `currentDate` from the signature would cause a TypeScript error and a runtime failure when the prompt renders without the required date variable. Fix: updated signature retains `currentDate` in its existing position, with `inferredGeography` appended as the new optional last parameter. Caller update also specified.

**[IMPORTANT] Fix 3: schema change points to the wrong location for the chosen design.**
The plan specified adding `applicability` to `EvidenceItemSchema in types.ts`. The Zod parsing schema that controls what the extraction LLM can output is `Stage2EvidenceItemSchema` at `claimboundary-pipeline.ts:2340`, not the interface in `types.ts`. However: under Approach A (separate `assessEvidenceApplicability` call, which is the plan's design), `applicability` is set programmatically post-extraction — it is NOT an extraction LLM output field. Therefore `Stage2EvidenceItemSchema` must NOT be updated for this approach. The `types.ts` interface update IS the correct and sufficient change for the type system. Clarification added to schema step with an explicit note about when `Stage2EvidenceItemSchema` would be the right location (Approach B — extraction-time, requires LLM Expert review).

---

**[MEDIUM] Validation section relies only on end-to-end reruns; unit tests are required.**
The implementation touches three exported seams that already have focused unit coverage: `generateResearchQueries` (distinctEvents wiring, `claimboundary-pipeline.test.ts:1676`), `classifyRelevance` schema validation (`claimboundary-pipeline.test.ts:1816`), and `filterEvidence` (`evidence-filter.test.ts`). The original §6 Validation only specified end-to-end reruns (H3, H1a, H4), which are expensive and non-deterministic. Unit tests for both Pass 2 render paths, the `jurisdictionMatch` `.catch("contextual")` default, and the `applicability` filter behavior are required before commit. §6 updated with a required unit test table.

---

### Review: Lead Architect - 2026-03-12

**Overall Assessment:** REQUEST_CHANGES

#### Strengths

- Root cause analysis is excellent. The five-gap chain (distinctEvents → multi-event amplifier → classifyRelevance gate missing → no post-extraction filter → contrarian blind) is accurate and grounded in the actual code.
- Contamination flow diagram (§2.2) is precise and matches the code I read. The flow from unguarded `distinctEvents` through the "MUST distribute queries" rule is the correct explanation for why a single foreign event becomes 21 foreign evidence items.
- The Portuguese-language immunity explanation (§2.3) correctly identifies why H1a/H1b are clean — language acts as an accidental jurisdiction barrier. This is an important architectural insight.
- Phased approach (A=prompt only → B=code → C=safety net) is the right sequence. Phase A carries zero code risk and can be validated immediately.
- Fix 3's efficiency profile is correct — one batched Haiku call for all evidence items is negligible cost (~$0.0002/run).
- Design constraints table (§3) correctly identifies all binding rules (no hardcoded keywords, LLM intelligence, UCM configurable). The proposed fixes respect all of them.

#### Concerns

- **[CRITICAL] Fix 0's jurisdiction reasoning has no `inferredGeography` context in Pass 2.** I verified: `CLAIM_EXTRACTION_PASS2` does not receive `inferredGeography` as a template variable. The proposed prompt instructions say "within the claim's jurisdiction/system" — but the LLM must *infer* the jurisdiction from the claim text alone, without the explicit `inferredGeography` signal that Pass 1 already computed. For clear claims ("Were the Bolsonaro trials...") this is fine. For ambiguous multi-jurisdiction claims ("Did NATO's eastern expansion violate international law?"), the jurisdiction inference is unreliable. Fix 0 should be complemented by also passing `inferredGeography` as a template variable into `CLAIM_EXTRACTION_PASS2` — a 2-line code change that gives the prompt an authoritative jurisdiction anchor rather than requiring the LLM to re-derive it. Without this, Fix 0's effectiveness depends entirely on claim phrasing clarity.

- **[CRITICAL] Fix 3's `probativeValue` override conflates two distinct dimensions.** `probativeValue` is defined in AGENTS.md as "quality assessment of evidence" — how well evidence supports the claim analytically. A U.S. executive order sanctioning Bolsonaro is a high-quality primary source; it deserves a "high" probativeValue for what it *is*. Setting it to "low" misrepresents the evidence's quality and will confuse future developers reading `evidence-filter.ts` — they'll see a primary government document filtered as "low quality" with no explanation. More importantly, this couples jurisdiction filtering to the `probativeValue` threshold — if an admin raises `probativeValueMinimum` to "medium" (to improve overall evidence quality), foreign evidence would silently slip back through. The architectural solution is a dedicated `applicability` field on `EvidenceItem` (e.g., `"direct" | "contextual" | "foreign_reaction"`) with a corresponding explicit check in `evidence-filter.ts`. This separates applicability from quality, makes the filtering intent readable, and is immune to threshold changes. The additional schema change is modest.

- **[IMPORTANT] Validation target conflates "U.S. government sources" with "foreign_reaction sources".** §6 targets "U.S. government evidence items: 0-2 (≤5%)". But a U.S. academic or U.S.-based NGO analysis of Brazilian legal proceedings is `contextual` (Fix 1 category) and should pass through — these are legitimate external observers. The target should be "0 `foreign_reaction` classified items" (i.e., items from foreign *government* actors: state.gov, federalregister.gov, congressional statements). Targeting all U.S.-origin items would also suppress legitimate scholarly sources from U.S. law schools or human rights researchers. The validation metric needs to distinguish the two sub-categories.

- **[SUGGESTION] Check whether Fix 0 alone (prompt-only, root cause) is sufficient before building Fixes 1-3.** The plan's Phase A includes Fix 0 + Fix 2 together. Consider splitting: run Fix 0 alone first, re-run H3, and count how many foreign events remain in `distinctEvents`. If `distinctEvents` is clean after Fix 0, then Fix 2 (query constraint) is only a belt-and-suspenders addition, and Fix 1 (relevance gate) may only need to exist for non-jurisdiction-specific contamination risks. This would tell us whether the problem is upstream (event extraction) or downstream (query/relevance). Given that Fix 0 is genuinely zero-code and the root cause, the cheapest path might be Fix 0 → validate → decide. The current Phase A bundles Fix 0+2 which makes it harder to isolate which fix did the work.

- **[SUGGESTION] Fix 1's `jurisdictionMatch` field needs a safe default for the schema migration.** The existing `RelevanceClassificationOutputSchema` validation will fail on responses that don't include the new `jurisdictionMatch` field until the prompt change propagates fully. Add `.catch("contextual")` as the default (not `"direct"`) — defaulting to `"direct"` when the field is absent would silently pass all sources through, defeating the gate. Defaulting to `"contextual"` preserves current behavior (sources score normally) while not breaking the filter.

- **[SUGGESTION] Open Question 3 (contextual evidence weight) — architectural recommendation.** Do not downweight `contextual` evidence. International NGO reports and academic comparative studies citing a jurisdiction's own data are legitimate evidence in the `AGENTS.md` framework. Downweighting them would introduce a blanket bias against cross-border academic analysis that is not grounded in any pipeline rule. The distinction between `contextual` and `foreign_reaction` is sufficient — keep `contextual` at full weight, cap `foreign_reaction` below the relevance threshold.

#### Specific Comments

- §2.1 Gap 1: Confirm (before implementing) whether `inferredGeography` needs a code change to reach `CLAIM_EXTRACTION_PASS2`, or whether it can be included in the Pass 2 template vars with minimal friction. From my code read: Pass 2 is rendered via `loadAndRenderSection("claimboundary", "CLAIM_EXTRACTION_PASS2", {...})` — adding `inferredGeography` to that template var object is a 1-line change in the pipeline.
- §4 Fix 3 schema: If adopting the `applicability` field recommendation, add it to `EvidenceItem` in `types.ts` as an optional field (to avoid breaking existing cached items), and add the filter check to `evidence-filter.ts` alongside the existing `probativeValue === "low"` check.
- §6 Validation: Change "U.S. government evidence items: 0-2 (≤5%)" to "foreign_reaction classified items: 0". The quantitative threshold conflates categories. The qualitative check (zero `foreign_reaction` items) is both more precise and more aligned with the fix's intent.
- §8 Q1: Strongly recommend Phase A first, then validate. Add: run Fix 0 in isolation before Fix 2 to isolate root cause effectiveness.

#### Captain Decisions Needed

Based on this review, the Captain needs to decide:

1. **Fix 3 `probativeValue` vs. dedicated `applicability` field**: The `probativeValue` approach ships faster (no `types.ts` schema change, no `evidence-filter.ts` change beyond the LLM call result). The `applicability` field approach is architecturally cleaner but touches more files. Given this is a quality-sensitive area that future developers will read, I recommend the `applicability` field — but this is a Captain call.

2. **Fix 0: add `inferredGeography` to Pass 2 template vars or not**: A 1-line code change that upgrades Fix 0 from "LLM infers jurisdiction" to "LLM receives jurisdiction explicitly." Low effort, high value. Recommend yes.

3. **Phase A alone or A+B+C together**: Given the root cause is in `distinctEvents` (Fix 0), there's a real chance Phase A alone resolves 80%+ of contamination. Recommend Phase A → validate H3 → decide on B/C based on residual contamination count.

---

### Review: Lead Developer - 2026-03-12

**Overall Assessment:** REQUEST_CHANGES

#### Strengths

- The plan is grounded in the correct code seams. Fix 0 targets the real Pass 2 render points, Fix 1 targets the actual `classifyRelevance()` gate, and Fix 2 correctly uses the existing `GENERATE_QUERIES` prompt surface rather than inventing a parallel mechanism.
- The phased rollout is directionally correct. Starting with Fix 0, validating H3, and only escalating to Fixes 1-3 if contamination remains is the right implementation order for a quality-sensitive path.
- The plan now correctly distinguishes `contextual` evidence from `foreign_reaction`, which is necessary to avoid over-filtering legitimate external observers.

#### Concerns

- **[CRITICAL] Fix 3’s integration order does not work as written.** The plan says to run `assessEvidenceApplicability()` after research completes and before clustering (§4 Fix 3 integration), then enforce the result via a new `applicability` check in `evidence-filter.ts`. But the current pipeline already runs `filterByProbativeValue(rawEvidence)` inside each research iteration before items are pushed into `state.evidenceItems` at `claimboundary-pipeline.ts:3025-3038`. If `applicability` is only added later, the new filter branch will never execute for those items. The plan must choose one of two coherent implementations: either (a) run applicability assessment before the existing filter in each iteration, or (b) keep the proposed late assessment but add an explicit second filtering pass after applicability is assigned. As written, Fix 3 describes both pieces but they do not connect.

- **[CRITICAL] Fix 1’s proposed signature change drops the existing `currentDate` parameter.** The live function signature is `classifyRelevance(claim, searchResults, pipelineConfig, currentDate)` at `claimboundary-pipeline.ts:3239-3244`, and the call site in the research loop passes `currentDate` at `claimboundary-pipeline.ts:2977-2982`. The plan’s replacement signature in §4 Fix 1 adds `inferredGeography` but omits `currentDate`, and the sample render code omits it as well. If implemented literally, this breaks the existing prompt render contract. The plan needs to specify the new signature as additive, not substitutive, for example `(..., pipelineConfig, currentDate, inferredGeography?)`.

- **[IMPORTANT] Fix 3’s schema placement is inaccurate.** §4 Fix 3 says “add `applicability` field to `EvidenceItemSchema` in `types.ts`”. In the current code, the runtime extraction schema is `Stage2EvidenceItemSchema` in `claimboundary-pipeline.ts:2340-2357`, while `types.ts:430-464` only defines the TypeScript interface. Updating only `types.ts` would satisfy type-checking in some places but would not update the actual LLM output parsing path. The plan should name both required edits explicitly: the `EvidenceItem` interface in `types.ts` and the relevant Zod schema(s) in `claimboundary-pipeline.ts`.

#### Specific Comments

- §4 Fix 1: Update the sample code so `loadAndRenderSection("claimboundary", "RELEVANCE_CLASSIFICATION", ...)` still includes `currentDate`; the current implementation passes it today.
- §4 Fix 3: The integration snippet should reference the existing filter location around `claimboundary-pipeline.ts:3025` so implementers do not assume the new `evidence-filter.ts` branch will fire automatically.
- §5 Implementation Priority: Fix 0 is not “1 file” in practice. It touches the prompt file and the pipeline render calls, so reviewers should expect at least two files in Phase A.
- §6 Validation: Add one unit test proving the Fix 3 integration point actually removes a `foreign_reaction` item from `state.evidenceItems`, not just that `evidence-filter.ts` would filter such an item in isolation.

#### Captain / Editor Actions Needed

1. Rewrite §4 Fix 1 so the `classifyRelevance()` signature keeps `currentDate` and adds `inferredGeography` without breaking existing callers.
2. Rewrite §4 Fix 3 so applicability assessment and filtering occur in a coherent order. Right now the plan’s code path would classify items but not actually filter them.
3. Correct §4 Fix 3 schema instructions to mention both the interface in `types.ts` and the Zod extraction schema in `claimboundary-pipeline.ts`.

#### Resolution — Lead Architect, 2026-03-12

**All 3 objections resolved. This review is superseded by the corrections applied to the plan body.**

| Concern | Resolution |
|---------|-----------|
| [CRITICAL] Fix 3 filter timing | §4 Fix 3 step 4 (`evidence-filter.ts` integration) removed. Filtering now inline after `assessEvidenceApplicability` in step 3. Detailed explanation of why `filterByProbativeValue` at line 3026 is inside the loop and cannot see `applicability` fields added. |
| [CRITICAL] Fix 1 drops `currentDate` | §4 Fix 1 primary signature corrected. Stale caller snippet at "Code change 3" also corrected to show `currentDate` in its existing position with `inferredGeography` appended. |
| [IMPORTANT] Fix 3 schema location | §4 Fix 3 step 2 clarified: `types.ts` interface update is correct and sufficient for Approach A (separate assessment call). `Stage2EvidenceItemSchema` must NOT be updated under this approach — applicability is set programmatically, not by the extraction LLM. Note added explaining when `Stage2EvidenceItemSchema` would be the right location (Approach B). |
