# ClaimBoundary Pipeline — Implementation Prompts (Phase 5)

**Purpose:** Ready-to-paste prompts for implementing the 5 pipeline stages.

**Context:** All infrastructure is complete (types, prompts, config, tests, verdict-stage module). Stages 1-3 and 5 need implementation. Stage 4 needs LLM wiring.

**Reference:** `Docs/WIP/CB_Implementation_Plan_2026-02-17.md` for full context and strategy.

---

## Phase 5a: Implement Stage 1 — Extract Claims

**Role:** As Senior Developer
**Prerequisite Reading:**
- `Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md` §8.1 (Stage 1 spec)
- `Docs/WIP/CB_Implementation_Plan_2026-02-17.md` Phase 5a checklist
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` (current skeleton)
- `apps/web/prompts/claimboundary.prompt.md` (CLAIM_EXTRACTION_PASS1, CLAIM_EXTRACTION_PASS2)

**Your Task:**

Implement the `extractClaims()` function in `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` (currently throws "not yet implemented").

**Implementation Requirements:**

1. **Pass 1: Rapid Claim Scan (Haiku tier)**
   - Load UCM prompt section `CLAIM_EXTRACTION_PASS1` from `claimboundary.prompt.md`
   - Use `loadAndRenderSection()` pattern from `monolithic-dynamic.ts` (lines 190-200)
   - Call LLM (Haiku) with input text
   - Parse structured output: `{impliedClaim: string, backgroundDetails: string, roughClaims: Array<{statement, searchHint}>}`
   - Error handling: if LLM call fails, throw with clear message (no fallback for Pass 1)

2. **Preliminary Search (Stage 1 lightweight research)**
   - For each `roughClaim`, generate 1-2 search queries (use UCM param `preliminarySearchQueriesPerClaim`, default 2)
   - Call `searchWebWithProvider()` from `web-search.ts` (import it)
   - Limit results to UCM param `preliminaryMaxSources` (default 5) per query
   - Fetch top 3-5 sources using `extractTextFromUrl()` from `retrieval.ts`
   - Extract lightweight evidence snippets (simple text extraction, no LLM yet)
   - Store as `preliminaryEvidence[]` array

3. **Pass 2: Evidence-Grounded Extraction (Sonnet tier)**
   - Load UCM prompt section `CLAIM_EXTRACTION_PASS2`
   - Call LLM (Sonnet) with:
     - Original input text
     - `preliminaryEvidence[]` (pass as context)
   - Parse structured output: `{atomicClaims: Array<{id, statement, centrality, harmPotential, expectedEvidenceProfile, groundingQuality}>}`
   - Generate unique IDs for claims (format: `AC_${uuid()}` or sequential)

4. **Centrality Filter**
   - Load UCM param `centralityThreshold` (default "medium")
   - Filter claims: keep only `centrality === "high"` OR `centrality === "medium"` (if threshold is "medium")
   - Cap at UCM param `maxAtomicClaims` (default 15)
   - If over cap, keep highest-centrality claims first

5. **Gate 1: Claim Validation (Deterministic + Optional LLM)**
   - For each claim, check:
     - Opinion score: if claim contains opinion markers, flag (use simple heuristic or skip for v1)
     - Specificity: check `groundingQuality !== "none"` (LLM already assessed this in Pass 2)
   - If specificity check fails for >X% of claims (UCM `gate1GroundingRetryThreshold`, default 0.5), **skip retry for v1** — just warn and continue
   - Populate `gate1Stats: {totalClaims, passedOpinion, passedSpecificity, overallPass}`

6. **Return CBClaimUnderstanding**
   - Structure:
     ```typescript
     {
       impliedClaim: string,
       backgroundDetails: string,
       atomicClaims: AtomicClaim[],
       detectedInputType: "statement" | "question",
       preliminaryEvidence: Array<{sourceUrl, snippet, claimId}>,
       gate1Stats: {totalClaims, passedOpinion, passedSpecificity, overallPass}
     }
     ```

**Testing:**

Add tests to `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`:

1. Test Pass 1 output parsing (mock LLM to return fixture roughClaims)
2. Test Pass 2 output parsing (mock LLM to return fixture atomicClaims)
3. Test centrality filter with threshold "high" vs "medium"
4. Test claim cap (15 claims → keep top 15)
5. Test Gate 1 stats population
6. Test preliminary search query generation (no actual web calls, check query format)

**Verification Steps:**

1. Run `npm run build` — must PASS
2. Run `npm test` — must PASS (all existing tests + your new tests)
3. Manually test Stage 1 with a simple input (optional):
   ```typescript
   const result = await extractClaims({
     originalInput: "The Eiffel Tower is in Paris",
     inputType: "text",
     // ... minimal state
   });
   console.log(result.atomicClaims); // Should have 1 claim
   ```

**Commit Message Format:**
```
feat(claimboundary): implement Stage 1 (extractClaims)

Two-pass evidence-grounded claim extraction with preliminary search.
- Pass 1: Rapid claim scan (Haiku) + rough claims
- Pass 2: Evidence-grounded extraction (Sonnet) + atomic claims
- Centrality filter + Gate 1 validation
- 15+ unit tests with mocked LLM calls

Build PASS | Tests PASS

Co-Authored-By: Claude <model> <noreply@anthropic.com>
```

**Handover:** Update `Docs/WIP/CB_Execution_State.md` with handover entry for Phase 5a.

---

## Phase 5b: Implement Stage 2 — Research Evidence

**Role:** As Senior Developer
**Prerequisite Reading:**
- `Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md` §8.2 (Stage 2 spec)
- `Docs/WIP/CB_Implementation_Plan_2026-02-17.md` Phase 5b checklist
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` (Stage 1 now implemented)
- Existing evidence extraction in `monolithic-dynamic.ts` (reference for patterns, lines 300-450)

**Your Task:**

Implement the `researchEvidence()` function in `claimboundary-pipeline.ts` (currently throws "not yet implemented").

**Implementation Requirements:**

1. **Seed Evidence Pool from Stage 1**
   - Take `state.understanding.preliminaryEvidence` (from Stage 1)
   - Convert to `EvidenceItem[]` format (with `relevantClaimIds[]`, `evidenceScope`, etc.)
   - Add to `state.evidenceItems[]`
   - Note: These are *lightweight* evidence items, not full extraction yet

2. **Claim-Driven Iteration Loop**
   - Budget: `maxMainIterations = maxResearchIterations - contradictionReservedIterations`
   - Load UCM params: `maxResearchIterations` (maps to `maxTotalIterations`), `contradictionReservedIterations` (default 2)
   - Each iteration:
     a. **Target Selection:** Find claim with fewest evidence items (use `state.evidenceItems.filter(e => e.relevantClaimIds.includes(claimId)).length`)
     b. **Query Generation:** Generate 2-3 search queries for target claim (use claim statement + expectedEvidenceProfile hint)
     c. **Web Search:** Call `searchWebWithProvider()` with max `maxSourcesPerIteration` (UCM, default 8)
     d. **Relevance Check (Optional LLM):** For each search result, optionally call LLM to check "Is this source relevant to claim X?" — **skip for v1**, use title/snippet heuristics
     e. **Source Fetch:** Call `extractTextFromUrl()` for top 3-5 relevant results
     f. **Reliability Prefetch:** Call `prefetchSourceReliability()` with batch of URLs (reuse existing module)
     g. **Evidence Extraction (LLM):** For each fetched source:
        - Load evidence extraction prompt (use monolithic-dynamic pattern or create new section in claimboundary.prompt.md)
        - Call LLM with claim + source content
        - Parse: `{evidenceItems: Array<{statement, category, claimDirection, evidenceScope, probativeValue, sourceType}>}`
        - **Critical:** Ensure `evidenceScope` is always populated (methodology, temporal, geographic, etc.)
     h. **EvidenceScope Validation:** Check all extracted items have non-empty `evidenceScope.methodology` — warn if missing
     i. **Evidence Filter:** Call `filterByProbativeValue()` from `evidence-filter.ts` (deterministic quality check)
     j. **Add to State:** Append filtered evidence to `state.evidenceItems[]`, sources to `state.sources[]`
     k. **Sufficiency Check:** If target claim now has ≥`claimSufficiencyThreshold` (UCM, default 3) items, mark sufficient
     l. **Early Exit:** If all claims sufficient, break loop

3. **Contradiction Search (Reserved Iterations)**
   - After main loop, run `contradictionReservedIterations` (default 2) additional iterations
   - Target: claims with low contradiction coverage (fewest `claimDirection: "contradicts"` items)
   - Query generation: Use "counterevidence" or "critique" phrasing (e.g., "evidence against [claim]")
   - Same search → fetch → extract → filter flow

4. **Update State Metadata**
   - `state.mainIterationsUsed` = number of main loop iterations
   - `state.contradictionIterationsUsed` = number of contradiction iterations
   - `state.contradictionSourcesFound` = count of sources found in contradiction search
   - `state.searchQueries` = log all queries issued (for audit/debug)

**Key Patterns to Reuse:**

- **Search pattern:** See `monolithic-dynamic.ts` lines 320-350 for web search + fetch loop
- **Evidence extraction:** See `monolithic-dynamic.ts` lines 400-450 for LLM extraction call pattern
- **Reliability prefetch:** See `source-reliability.ts` `prefetchSourceReliability()` function
- **Evidence filter:** See `evidence-filter.ts` `filterByProbativeValue()` function

**Testing:**

Add 20-25 tests to `claimboundary-pipeline.test.ts`:

1. Test claim-driven targeting (lowest evidence count selected first)
2. Test sufficiency early exit (all claims reach threshold → loop stops)
3. Test contradiction search triggering (reserved iterations run after main loop)
4. Test EvidenceScope validation (warn if missing methodology)
5. Test evidence filtering (probativeValue thresholds)
6. Test budget enforcement (loop stops at maxMainIterations)
7. Mock web search to return fixture sources
8. Mock LLM extraction to return fixture evidence with EvidenceScopes

**Verification Steps:**

1. Run `npm run build` — must PASS
2. Run `npm test` — must PASS
3. Integration smoke test (optional):
   ```typescript
   const state = {
     understanding: { atomicClaims: [{id: "AC_1", statement: "X is Y"}], preliminaryEvidence: [] },
     evidenceItems: [],
     sources: [],
     searchQueries: [],
     // ...
   };
   await researchEvidence(state);
   console.log(state.evidenceItems.length); // Should be > 0
   ```

**Commit Message Format:**
```
feat(claimboundary): implement Stage 2 (researchEvidence)

Claim-driven evidence research with mandatory EvidenceScope.
- Seed from Stage 1 preliminary evidence
- Main loop: target lowest-evidence claims, web search + LLM extraction
- Contradiction search (reserved iterations)
- EvidenceScope validation + probative filtering
- 20+ unit tests with mocked web search + LLM

Build PASS | Tests PASS

Co-Authored-By: Claude <model> <noreply@anthropic.com>
```

**Handover:** Update `CB_Execution_State.md` with Phase 5b entry.

---

## Phase 5c: Implement Stage 3 — Cluster Boundaries

**Role:** As Senior Developer or As LLM Expert
**Prerequisite Reading:**
- `Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md` §8.3 (Stage 3 spec) + §11.5 (congruence examples)
- `Docs/WIP/CB_Implementation_Plan_2026-02-17.md` Phase 5c checklist
- `apps/web/prompts/claimboundary.prompt.md` BOUNDARY_CLUSTERING section
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` (Stages 1-2 now implemented)

**Your Task:**

Implement the `clusterBoundaries()` function in `claimboundary-pipeline.ts` (currently throws "not yet implemented").

**Implementation Requirements:**

1. **Collect Unique EvidenceScopes**
   - Extract all `evidenceScope` objects from `state.evidenceItems`
   - Deduplicate by structural similarity (simple approach: JSON.stringify() + Set, or compare field-by-field)
   - Each unique scope gets an ID (format: `ES_${index}` or `ES_${uuid()}`)
   - Result: `uniqueScopes: Array<{id, ...evidenceScope fields}>`

2. **LLM Clustering (Sonnet tier)**
   - Load UCM prompt section `BOUNDARY_CLUSTERING` from `claimboundary.prompt.md`
   - Input to LLM:
     - Array of `uniqueScopes` (with IDs)
     - Congruence guidance (already in prompt, see §11.5 examples)
   - Expected output structure:
     ```typescript
     {
       claimBoundaries: Array<{
         id: string,              // CB_1, CB_2, etc.
         name: string,            // e.g., "US Economic Data 2020-2021"
         description: string,     // brief summary
         scopeSummary: string,    // methodology + temporal + geographic summary
         internalCoherence: number, // 0-1, LLM-assessed
         evidenceScopeIds: string[] // ES_1, ES_2, etc.
       }>
     }
     ```
   - Parse LLM output into `ClaimBoundary[]` objects

3. **Coherence Assessment**
   - LLM returns `internalCoherence` per boundary
   - Flag boundaries with `internalCoherence < boundaryCoherenceMinimum` (UCM param, default 0.3)
   - Log warning but don't reject (v1 accepts all boundaries from LLM)

4. **Post-Clustering Validation (Deterministic)**
   - **Completeness check:** Every `uniqueScope.id` must appear in exactly one boundary's `evidenceScopeIds[]`
   - If scope orphaned: add to "General" fallback boundary (create if needed)
   - **Cap enforcement:** If `boundaries.length > maxClaimBoundaries` (UCM, default 6):
     - Merge the two boundaries with highest scope overlap (Jaccard similarity of evidenceScopeIds)
     - Repeat until `boundaries.length <= maxClaimBoundaries`
     - Recalculate merged boundary's `internalCoherence` = average of merged boundaries

5. **Assign Evidence Items to Boundaries**
   - For each `EvidenceItem` in `state.evidenceItems`:
     - Look up its `evidenceScope` in `uniqueScopes` → find scope ID
     - Find boundary containing that scope ID
     - Set `evidenceItem.claimBoundaryId = boundary.id`
   - Verify: all evidence items now have `claimBoundaryId` populated

6. **Fallback: Single "General" Boundary**
   - If LLM returns 0 boundaries OR clustering fails:
     - Create single boundary: `{id: "CB_GENERAL", name: "General Evidence", description: "All evidence analyzed together", scopeSummary: "All scopes", internalCoherence: 0.8, evidenceScopeIds: [all scope IDs]}`
     - Assign all evidence items to `CB_GENERAL`

7. **Return ClaimBoundary[]**

**Testing:**

Add 12-15 tests to `claimboundary-pipeline.test.ts`:

1. Test unique scope extraction (deduplicate similar scopes)
2. Test LLM output parsing (mock to return 2-3 boundaries)
3. Test coherence flagging (boundary with coherence 0.2 < 0.3 → warning logged)
4. Test over-cap merge (6 boundaries → merge 2 → 5 boundaries)
5. Test orphaned scope handling (scope not in any boundary → added to fallback)
6. Test evidence item assignment (`claimBoundaryId` population)
7. Test fallback to "General" boundary (LLM returns empty array)
8. Test completeness validation (every scope in exactly one boundary)

**Verification Steps:**

1. Run `npm run build` — must PASS
2. Run `npm test` — must PASS
3. Integration smoke test (optional):
   ```typescript
   const state = {
     evidenceItems: [
       {evidenceScope: {methodology: "Study A", temporal: "2020"}, ...},
       {evidenceScope: {methodology: "Study B", temporal: "2020"}, ...},
       {evidenceScope: {methodology: "Survey C", temporal: "2021"}, ...},
     ],
     // ...
   };
   const boundaries = await clusterBoundaries(state);
   console.log(boundaries.length); // Should be 1-3
   console.log(state.evidenceItems.every(e => e.claimBoundaryId)); // Should be true
   ```

**Commit Message Format:**
```
feat(claimboundary): implement Stage 3 (clusterBoundaries)

EvidenceScope clustering with LLM-driven boundary detection.
- Collect unique scopes, LLM clustering (Sonnet)
- Coherence assessment + post-validation
- Over-cap merge logic (deterministic)
- Evidence item boundary assignment
- Fallback to single "General" boundary
- 12+ unit tests with mocked LLM clustering

Build PASS | Tests PASS

Co-Authored-By: Claude <model> <noreply@anthropic.com>
```

**Handover:** Update `CB_Execution_State.md` with Phase 5c entry.

---

## Phase 5d: Implement Stage 4 — Production LLM Wiring

**Role:** As Senior Developer or As LLM Expert
**Prerequisite Reading:**
- `Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md` §8.4 (Stage 4 spec)
- `Docs/WIP/CB_Implementation_Plan_2026-02-17.md` Phase 5d checklist
- `apps/web/src/lib/analyzer/verdict-stage.ts` (already implemented, needs LLM glue)
- `apps/web/src/lib/analyzer/monolithic-dynamic.ts` lines 190-250 (LLM call pattern reference)

**Your Task:**

Create the production LLM call wrapper and wire it into `generateVerdicts()` in `claimboundary-pipeline.ts`.

**Implementation Requirements:**

1. **Create `createProductionLLMCall()` Wrapper**

   Add a new function in `claimboundary-pipeline.ts` or a separate helper file (your choice):

   ```typescript
   import { loadAndRenderSection } from "./prompt-loader";
   import { generateText } from "ai";
   import { getModelForTask } from "./llm";

   /**
    * Create a production LLM call function for verdict-stage.
    * Loads prompts from UCM, uses AI SDK for structured output.
    */
   function createProductionLLMCall(): LLMCallFn {
     return async (promptKey: string, input: Record<string, unknown>, options?: { tier?: "sonnet" | "haiku"; temperature?: number }) => {
       // 1. Load UCM prompt section
       const promptText = await loadAndRenderSection("claimboundary", promptKey, {
         ...input,
         currentDate: new Date().toISOString().split('T')[0],
       });

       // 2. Select model based on tier
       const tier = options?.tier ?? "sonnet";
       const model = tier === "sonnet"
         ? getModelForTask("verdict")   // Uses UCM modelVerdict config
         : getModelForTask("understand"); // Uses UCM modelUnderstand (Haiku)

       // 3. Call AI SDK with structured output
       const result = await generateText({
         model,
         prompt: promptText,
         temperature: options?.temperature ?? 0.0,
         // Add Zod schema here if needed for validation
         // For now, rely on LLM JSON mode or prompt instructions
       });

       // 4. Parse result (assume JSON object or array)
       return JSON.parse(result.text);
     };
   }
   ```

2. **Wire into `generateVerdicts()`**

   Replace the current `throw new Error` in `generateVerdicts()` (line 347-349) with:

   ```typescript
   export async function generateVerdicts(
     claims: AtomicClaim[],
     evidence: EvidenceItem[],
     boundaries: ClaimBoundary[],
     coverageMatrix: CoverageMatrix,
     llmCall?: LLMCallFn,
   ): Promise<CBClaimVerdict[]> {
     // Production LLM call wiring
     const llmCallFn = llmCall ?? createProductionLLMCall();

     return runVerdictStage(claims, evidence, boundaries, coverageMatrix, llmCallFn);
   }
   ```

3. **Handle Tier Selection**

   The `verdict-stage.ts` module already handles tier selection internally:
   - Steps 1, 2, 3, 4: pass `{ tier: "sonnet" }` to `llmCall()`
   - Step 5 (validation): pass `{ tier: "haiku" }` to `llmCall()`

   Your wrapper should respect the `tier` option and select the appropriate model.

4. **Error Handling**

   Wrap LLM calls in try/catch:
   - If LLM call fails, decide based on UCM `allowQualityFallbacks` config:
     - `false` (default): re-throw error (fail fast)
     - `true`: attempt fallback or return partial result
   - For v1, **fail fast** (no fallback) — verdict quality is critical

5. **Config Loading**

   Load verdict-stage config from UCM:
   ```typescript
   import { loadPipelineConfig } from "@/lib/config-loader";

   // In generateVerdicts or runVerdictStage call site:
   const pipelineConfig = await loadPipelineConfig();
   const verdictConfig: VerdictStageConfig = {
     selfConsistencyMode: pipelineConfig.selfConsistencyMode === "full" ? "enabled" : "disabled",
     selfConsistencyTemperature: pipelineConfig.selfConsistencyTemperature ?? 0.3,
     stableThreshold: calcConfig.selfConsistencySpreadThresholds.stable ?? 5,
     moderateThreshold: calcConfig.selfConsistencySpreadThresholds.moderate ?? 12,
     unstableThreshold: calcConfig.selfConsistencySpreadThresholds.unstable ?? 20,
     spreadMultipliers: { /* ... */ },
     mixedConfidenceThreshold: calcConfig.mixedConfidenceThreshold ?? 60,
   };
   ```

**Testing:**

1. **Unit test:** Mock `loadAndRenderSection` and `generateText` to verify correct prompt loading
2. **Integration test (optional, expensive):** Call `generateVerdicts()` with real LLM, verify output structure
   - Mark test as `test.skip()` or in separate `test:llm` suite
   - Run manually to verify LLM integration works

**Verification Steps:**

1. Run `npm run build` — must PASS
2. Run `npm test` — must PASS (no expensive tests in default suite)
3. Optional: Run integration test with real LLM to verify verdict-stage works end-to-end

**Commit Message Format:**
```
feat(claimboundary): implement Stage 4 LLM wiring (generateVerdicts)

Production LLM call wrapper for verdict-stage module.
- createProductionLLMCall() using prompt-loader + AI SDK
- Wire into generateVerdicts() call site
- Load verdict-stage config from UCM
- Error handling: fail fast on LLM errors (no fallback for v1)

Build PASS | Tests PASS

Co-Authored-By: Claude <model> <noreply@anthropic.com>
```

**Handover:** Update `CB_Execution_State.md` with Phase 5d entry.

---

## Phase 5e: Implement Stage 5 — Aggregate Assessment

**Role:** As Senior Developer
**Prerequisite Reading:**
- `Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md` §8.5 (Stage 5 spec)
- `Docs/WIP/CB_Implementation_Plan_2026-02-17.md` Phase 5e checklist
- `apps/web/src/lib/analyzer/aggregation.ts` (existing functions to reuse)
- `apps/web/prompts/claimboundary.prompt.md` VERDICT_NARRATIVE section

**Your Task:**

Implement the `aggregateAssessment()` function in `claimboundary-pipeline.ts` (currently throws "not yet implemented").

**Implementation Requirements:**

1. **Triangulation Scoring per Claim (§8.5.2)**

   For each `CBClaimVerdict`:
   - Count boundaries supporting the claim (`boundaryFinding.direction === "supports"`)
   - Count boundaries contradicting (`direction === "contradicts"`)
   - Apply triangulation factor from CalcConfig:
     - **Strong agreement:** ≥3 boundaries agreeing → boost = `triangulation.strongAgreementBoost` (default 0.15)
     - **Moderate agreement:** 2 boundaries agreeing, 1 dissenting → boost = `triangulation.moderateAgreementBoost` (default 0.05)
     - **Single boundary:** Only 1 boundary has evidence → penalty = `triangulation.singleBoundaryPenalty` (default -0.10)
     - **Conflicted:** Boundaries evenly split → set `isContested = true` (if `triangulation.conflictedFlag`)
   - Attach `triangulationScore` to each verdict:
     ```typescript
     {
       boundaryCount: number,
       supporting: number,
       contradicting: number,
       level: "strong" | "moderate" | "weak" | "conflicted",
       factor: number  // boost or penalty value
     }
     ```

2. **Derivative Weight Reduction (§8.5.3)**

   - Check each claim's evidence for derivative sources (if `derivativeSource` field exists on EvidenceItem)
   - If >50% of claim's evidence is derivative, apply `derivativeMultiplier` (CalcConfig, default 0.5) to claim weight
   - **Note for v1:** Derivative detection may not be implemented yet — skip if `derivativeSource` field doesn't exist

3. **Weighted Average Computation (§8.5.4)**

   Reuse existing `aggregation.ts` functions:
   ```typescript
   import { getClaimWeight, calculateWeightedVerdictAverage } from "./aggregation";
   import { loadCalcConfig } from "@/lib/config-loader";

   const calcConfig = await loadCalcConfig();

   // For each claim verdict:
   const baseWeight = getClaimWeight(claim.centrality, calcConfig.aggregation.centralityWeights);
   const harmMultiplier = calcConfig.aggregation.harmPotentialMultipliers[claim.harmPotential]; // 4-level
   const triangulationFactor = verdict.triangulationScore.factor;
   const derivativeFactor = isDerivative ? calcConfig.aggregation.derivativeMultiplier : 1.0;

   const finalWeight = baseWeight * harmMultiplier * (1 + triangulationFactor) * derivativeFactor;

   // Aggregate across all claims:
   const weightedTruthPercentage = calculateWeightedVerdictAverage(
     claimVerdicts.map(v => ({ truthPercentage: v.truthPercentage, weight: finalWeight }))
   );
   ```

4. **Confidence Aggregation (§8.5.5)**

   - Weighted average of claim confidences (same weights as verdicts)
   - Apply spread multipliers from self-consistency results (already in `verdict.consistencyResult.spread`)
   - **Existing confidence calibration:** Reuse `confidence-calibration.ts` if needed (apply density anchor, band snapping, etc.)
   - For v1, **simple approach:** weighted average with spread multipliers only

5. **VerdictNarrative Generation (§8.5.6, Sonnet call)**

   - Load UCM prompt section `VERDICT_NARRATIVE` from `claimboundary.prompt.md`
   - Input to LLM:
     - `overallVerdict: {truthPercentage, verdict, confidence}`
     - `claimVerdicts: CBClaimVerdict[]` (top 5-7 most important claims)
     - `claimBoundaries: ClaimBoundary[]`
     - `coverageMatrix` (summarized)
   - Expected output:
     ```typescript
     {
       summary: string,           // 2-3 sentence overall summary
       keyEvidence: string[],     // 3-5 key evidence items cited
       limitations: string[],     // 2-3 limitations or caveats
       methodology: string        // 1 sentence methodology summary
     }
     ```
   - Parse LLM output into `VerdictNarrative` object

6. **Optional: CLAIM_GROUPING (§18 Q1)**

   - **Defer to v1.1** — not blocking v1.0
   - If implemented: only call if `claimCount >= 4` AND UCM `ui.enableClaimGrouping` enabled
   - Haiku call with `CLAIM_GROUPING` prompt
   - Output: claim groups for UI display

7. **Quality Gates Summary (§8.5.7)**

   - Gate 1 stats: copy from `state.understanding.gate1Stats` (Stage 1 output)
   - Gate 4 stats: classify each claim's confidence as high/medium/low
     - High: `confidence >= 70`
     - Medium: `confidence >= 40`
     - Low: `confidence < 40`
   - Populate `QualityGates` object

8. **Report Assembly (§8.5.7)**

   Return `OverallAssessment`:
   ```typescript
   {
     truthPercentage: number,
     verdict: ClaimVerdict7Point,
     confidence: number,
     hasMultipleBoundaries: boolean,
     verdictNarrative: VerdictNarrative,
     claimVerdicts: CBClaimVerdict[],
     claimBoundaries: ClaimBoundary[],
     coverageMatrix: CoverageMatrix,
     qualityGates: QualityGates,
   }
   ```

**Testing:**

Add 15-20 tests to `claimboundary-pipeline.test.ts`:

1. Test triangulation scoring (3 supporting → strong agreement boost)
2. Test derivative weight reduction (if implemented)
3. Test weighted average calculation (compare to hand-calculated expected)
4. Test confidence aggregation with spread multipliers
5. Test VerdictNarrative LLM call (mock to return fixture)
6. Test quality gates population (Gate 1 + Gate 4 stats)
7. Test report assembly (all fields populated correctly)
8. Test fallback if VerdictNarrative LLM call fails (graceful degradation)

**Verification Steps:**

1. Run `npm run build` — must PASS
2. Run `npm test` — must PASS
3. Integration test (optional):
   ```typescript
   const claimVerdicts = [
     {truthPercentage: 80, confidence: 70, triangulationScore: {factor: 0.15}, ...},
     {truthPercentage: 60, confidence: 50, triangulationScore: {factor: 0.0}, ...},
   ];
   const assessment = await aggregateAssessment(claimVerdicts, boundaries, evidence, coverageMatrix, state);
   console.log(assessment.truthPercentage); // Should be weighted average ~70-75
   console.log(assessment.verdictNarrative); // Should have summary, keyEvidence, etc.
   ```

**Commit Message Format:**
```
feat(claimboundary): implement Stage 5 (aggregateAssessment)

Weighted aggregation with triangulation + VerdictNarrative.
- Triangulation scoring (strong/moderate/weak agreement)
- Derivative weight reduction (if applicable)
- Weighted average: centrality + harm + triangulation + derivative
- VerdictNarrative generation (Sonnet LLM call)
- Quality gates summary (Gate 1 + Gate 4)
- 15+ unit tests with mocked LLM calls

Build PASS | Tests PASS

Co-Authored-By: Claude <model> <noreply@anthropic.com>
```

**Handover:** Update `CB_Execution_State.md` with Phase 5e entry.

---

## Phase 5f: End-to-End Integration Test (Optional)

**Role:** As Code Reviewer or As Lead Architect
**Prerequisite Reading:**
- `Docs/WIP/CB_Implementation_Plan_2026-02-17.md` Phase 5f checklist
- All 5 stages now implemented

**Your Task:**

Create an integration test file `apps/web/test/integration/claimboundary-integration.test.ts` that runs the full pipeline with real LLM calls.

**Test Scenarios:**

1. **Simple input** (1 claim, 1 boundary expected)
   - Input: "The Eiffel Tower is in Paris"
   - Expected: 1 atomic claim, 1 boundary, verdict = TRUE (90-100%), high confidence

2. **Multi-claim input** (3-5 claims, 2-3 boundaries expected)
   - Input: "Brazil's economy grew 5% in 2020. The unemployment rate fell to 8%. Inflation remained under control at 3%."
   - Expected: 3 claims (GDP growth, unemployment, inflation), 2-3 boundaries (official stats, news reports, analysis)

3. **Adversarial input** (opinion + fact mix)
   - Input: "Electric cars are clearly the future. Tesla sold 500,000 vehicles in 2020."
   - Expected: 2 claims (opinion filtered or flagged at Gate 1, sales fact verified), 1-2 boundaries

**Test Structure:**

```typescript
import { describe, test, expect } from "vitest";
import { runClaimBoundaryAnalysis } from "@/lib/analyzer/claimboundary-pipeline";

describe("ClaimBoundary Pipeline - Integration Tests", () => {
  test.skip("simple input: Eiffel Tower in Paris", async () => {
    const result = await runClaimBoundaryAnalysis({
      inputType: "text",
      inputValue: "The Eiffel Tower is in Paris",
    });

    expect(result.resultJson._schemaVersion).toBe("3.0.0-cb");
    expect(result.resultJson.meta.claimCount).toBeGreaterThanOrEqual(1);
    expect(result.resultJson.claimBoundaries.length).toBeGreaterThanOrEqual(1);
    expect(result.resultJson.truthPercentage).toBeGreaterThan(80);
  }, 60000); // 60s timeout for LLM calls

  // Add tests for multi-claim and adversarial inputs...
});
```

**Verification:**

- Mark tests as `.skip()` by default (expensive, not run in CI)
- Run manually: `npm run test:llm` or `vitest run claimboundary-integration.test.ts`
- Document cost per test run (estimate: $0.50-1.00 per test)
- Verify output schema matches `3.0.0-cb` spec

**Deliverables:**

1. Integration test file created
2. 3 test scenarios implemented
3. Documentation of test cost + results
4. Update `CB_Execution_State.md` with integration test results

**Commit Message Format:**
```
test(claimboundary): add end-to-end integration tests

Full pipeline integration tests with real LLM calls.
- 3 test scenarios: simple, multi-claim, adversarial
- Validates output schema (3.0.0-cb)
- Marked .skip() for manual run only (expensive)

Estimated cost per run: $1-2 (all 3 tests)

Co-Authored-By: Claude <model> <noreply@anthropic.com>
```

**Handover:** Update `CB_Execution_State.md` with Phase 5f entry (optional phase).

---

## Final Checklist (Captain Review)

After all phases 5a-5f complete, verify:

- [ ] All 5 stages implemented (no `throw new Error` stubs remain)
- [ ] All unit tests PASS (100+ new tests)
- [ ] Build PASS (`npm run build`)
- [ ] Safe tests PASS (`npm test`)
- [ ] At least 1 successful end-to-end analysis (manual or integration test)
- [ ] `resultJson._schemaVersion === "3.0.0-cb"` validated
- [ ] `CB_Execution_State.md` updated with all handover entries
- [ ] Documentation updated: `Current_Status.md`, `KNOWN_ISSUES.md` (if applicable)

**When all items checked:** ClaimBoundary pipeline v1.0 is **production-ready**.

---

**Document Version:** 1.0
**Created:** 2026-02-17
**Author:** Lead Architect (Claude Opus 4.6)
**Status:** Ready for execution
