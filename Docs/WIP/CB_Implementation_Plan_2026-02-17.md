# ClaimBoundary Pipeline — Implementation Plan (Phase 5: Stage Implementation)

**Purpose:** Complete implementation of the 5 ClaimBoundary pipeline stages to make the pipeline fully functional.

**Context:** Migration phases (0-4) are complete. The pipeline skeleton exists with types, prompts, config, and verdict-stage module, but Stages 1-3 and 5 throw "not yet implemented" errors. Stage 4 verdict logic exists but needs production LLM wiring.

**Reference:** `Docs/WIP/ClaimBoundary_Pipeline_Architecture_2026-02-15.md` — the definitive architecture specification.

---

## Current State (2026-02-17)

### ✅ What Exists (Infrastructure Complete)

| Component | Status | Location |
|-----------|--------|----------|
| **Types** | ✅ Complete | `types.ts` — AtomicClaim, ClaimBoundary, CBClaimVerdict, etc. |
| **Prompts** | ✅ Complete | `claimboundary.prompt.md` — 8 UCM sections, seeded |
| **UCM Config** | ✅ Complete | All 24 CB parameters in schemas + defaults |
| **Coverage Matrix** | ✅ Complete | `buildCoverageMatrix()` — 55 lines, deterministic, 7 tests |
| **Verdict Module** | ✅ Complete | `verdict-stage.ts` — 683 lines, 29 tests, all 5 debate steps |
| **Pipeline Skeleton** | ✅ Complete | `claimboundary-pipeline.ts` — main orchestrator, 5 stage functions |
| **Test Infrastructure** | ✅ Ready | 24 tests for types/coverage/skeleton |

### ❌ What's Missing (Implementation Needed)

| Stage | Function | Lines Est. | Complexity | LLM Calls |
|-------|----------|------------|------------|-----------|
| **Stage 1** | `extractClaims()` | ~300-400 | High | 2-3 (Pass 1 Haiku, Pass 2 Sonnet, Gate 1 optional retry) |
| **Stage 2** | `researchEvidence()` | ~500-600 | High | 8-12 (relevance, extraction per iteration) |
| **Stage 3** | `clusterBoundaries()` | ~200-250 | Medium | 1 (Sonnet clustering) |
| **Stage 4 Wiring** | LLM glue code | ~80-100 | Low | 0 (verdict-stage.ts already has logic) |
| **Stage 5** | `aggregateAssessment()` | ~300-400 | Medium | 1-2 (VerdictNarrative Sonnet, optional CLAIM_GROUPING Haiku) |

**Total estimated new code:** ~1500-1850 lines across 5 stages + tests.

---

## Implementation Strategy

### Principle: Sequential, Testable, Incremental

1. **One stage at a time** — implement + test + verify before moving to next
2. **Stage order:** 1 → 2 → 3 → 4 wiring → 5 (dependency chain)
3. **Each stage deliverable:**
   - Implementation (remove `throw new Error`)
   - Unit tests (mocked LLM calls)
   - Integration smoke test (optional, uses real LLM)
   - Build PASS + tests PASS
4. **No dead code** — if a helper function is needed, implement it when needed, not speculatively
5. **Reuse existing modules:** web-search, retrieval, evidence-filter, source-reliability, aggregation (for weights)

### Why Sequential (Not Parallel)?

- **Stage 2 depends on Stage 1 output** (AtomicClaims with preliminaryEvidence)
- **Stage 3 depends on Stage 2 output** (EvidenceItems with EvidenceScopes)
- **Stage 4 depends on Stage 3 output** (ClaimBoundaries)
- **Stage 5 depends on Stage 4 output** (CBClaimVerdicts)

Attempting parallel implementation would require extensive mocking of data structures that don't exist yet.

---

## Phase 5: Stage-by-Stage Implementation

### Phase 5a: Stage 1 — Extract Claims (§8.1)

**Owner:** Senior Developer (Haiku or Sonnet tier, strong TypeScript/LLM integration skills)

**Deliverables:**
1. Implement `extractClaims()` function (~300-400 lines)
2. Add 15-20 unit tests (mocked LLM calls)
3. Verify: Build PASS, tests PASS, no regressions

**Implementation checklist:**
- [ ] Pass 1: Rapid claim scan (Haiku)
  - Load UCM prompt `CLAIM_EXTRACTION_PASS1`
  - Call LLM with input text
  - Parse `{impliedClaim, backgroundDetails, roughClaims[]}`
- [ ] Preliminary search (Stage 1 only, not Stage 2)
  - Generate 1-2 queries per roughClaim (UCM `preliminarySearchQueriesPerClaim`)
  - Call `searchWebWithProvider()` (max `preliminaryMaxSources` per query)
  - Fetch top sources, extract preliminary evidence (lightweight)
- [ ] Pass 2: Evidence-grounded extraction (Sonnet)
  - Load UCM prompt `CLAIM_EXTRACTION_PASS2`
  - Call LLM with input text + preliminary evidence
  - Parse `{atomicClaims[]: {statement, centrality, harmPotential, expectedEvidenceProfile, groundingQuality}}`
- [ ] Centrality filter
  - Keep only claims with `centrality >= centralityThreshold` (UCM, default "medium")
  - Cap at `maxAtomicClaims` (UCM, default 15)
- [ ] Gate 1: Claim validation
  - Check `opinionScore < gate1OpinionThreshold` (CalcConfig)
  - Check `specificity >= claimSpecificityMinimum` (UCM, default 0.6)
  - If >X% fail (UCM `gate1GroundingRetryThreshold`), trigger retry loop (optional, can defer)
- [ ] Return `CBClaimUnderstanding`

**Dependencies:**
- Existing: `searchWebWithProvider` (web-search.ts), `extractTextFromUrl` (retrieval.ts), LLM call wrapper (from monolithic-dynamic or create new)
- UCM prompts: `CLAIM_EXTRACTION_PASS1`, `CLAIM_EXTRACTION_PASS2`
- UCM config: `centralityThreshold`, `claimSpecificityMinimum`, `maxAtomicClaims`, `preliminarySearchQueriesPerClaim`, `preliminaryMaxSources`

**Testing strategy:**
- Mock LLM calls to return fixture data (rough claims → atomic claims)
- Test centrality filter with different thresholds
- Test Gate 1 validation logic
- Test grounding retry logic (if implemented)

**Estimated effort:** 1-2 sessions (4-8 hours)

---

### Phase 5b: Stage 2 — Research Evidence (§8.2)

**Owner:** Senior Developer (same as 5a, maintains context)

**Deliverables:**
1. Implement `researchEvidence()` function (~500-600 lines)
2. Add 20-25 unit tests (mocked web search + LLM extraction)
3. Verify: Build PASS, tests PASS, Stage 1→2 integration works

**Implementation checklist:**
- [ ] Seed evidence pool from Stage 1 preliminary search
  - Take `preliminaryEvidence` from `CBClaimUnderstanding`
  - Add to `state.evidenceItems[]` (with proper `relevantClaimIds[]`)
- [ ] Claim-driven iteration loop
  - Budget: `maxResearchIterations` - `contradictionReservedIterations` (UCM)
  - Target: claim with fewest evidence items (min-heap or sort)
  - Generate 2-3 search queries per claim
- [ ] Web search + relevance classification
  - Call `searchWebWithProvider()` (max `maxSourcesPerIteration`, UCM)
  - LLM relevance check: "Is this source relevant to claim X?" (optional, can use heuristics)
  - Filter to top-N relevant sources
- [ ] Source fetch + reliability prefetch
  - Call `extractTextFromUrl()` for each relevant source
  - Call `prefetchSourceReliability()` for batch (reuse existing module)
- [ ] Evidence extraction with mandatory EvidenceScope
  - Load UCM prompt (evidence extraction section, TBD which prompt file)
  - Call LLM with claim + source content
  - Parse `{evidenceItems[]: {statement, category, claimDirection, evidenceScope, probativeValue, sourceType}}`
- [ ] EvidenceScope validation
  - Ensure all `evidenceScope` fields are populated
  - Flag/warn if scope is too vague (deterministic heuristics)
- [ ] Evidence filter
  - Call `filterByProbativeValue()` (existing deterministic filter)
  - Optional: LLM quality check (if UCM `llmEvidenceQuality` enabled)
- [ ] Sufficiency check
  - Per claim: if `evidenceCount >= claimSufficiencyThreshold` (UCM, default 3), mark sufficient
  - If all claims sufficient, exit loop early
- [ ] Contradiction search (reserved iterations)
  - After main loop, run `contradictionReservedIterations` (UCM, default 2) targeting claims with low contradiction coverage
  - Generate "critique" or "counterevidence" queries
  - Same search → extract → filter flow
- [ ] Update state
  - `state.evidenceItems` populated with all evidence
  - `state.sources` populated with FetchedSource records
  - `state.searchQueries` logged for audit
  - `state.mainIterationsUsed`, `state.contradictionIterationsUsed` tracked

**Dependencies:**
- Existing: `searchWebWithProvider`, `extractTextFromUrl`, `prefetchSourceReliability`, `filterByProbativeValue`
- UCM prompts: Evidence extraction section (may need new prompt or reuse MD extraction)
- UCM config: `claimSufficiencyThreshold`, `contradictionReservedIterations`, `maxResearchIterations`, `maxSourcesPerIteration`

**Testing strategy:**
- Mock web search results (return fixture sources)
- Mock LLM extraction (return fixture evidence with EvidenceScopes)
- Test claim-driven targeting (lowest evidence count prioritized)
- Test sufficiency early-exit
- Test contradiction search triggering
- Test EvidenceScope validation

**Estimated effort:** 2-3 sessions (6-10 hours)

---

### Phase 5c: Stage 3 — Cluster Boundaries (§8.3)

**Owner:** Senior Developer or LLM Expert (needs strong prompt engineering for clustering)

**Deliverables:**
1. Implement `clusterBoundaries()` function (~200-250 lines)
2. Add 12-15 unit tests (mocked LLM clustering output)
3. Verify: Build PASS, tests PASS, Stages 1→2→3 chain works

**Implementation checklist:**
- [ ] Collect unique EvidenceScopes
  - Extract all `evidenceScope` objects from `state.evidenceItems`
  - Deduplicate by structural similarity (deterministic, not LLM)
- [ ] LLM clustering (Sonnet)
  - Load UCM prompt `BOUNDARY_CLUSTERING`
  - Input: array of unique EvidenceScopes
  - Output: `{claimBoundaries[]: {id, name, description, scopeSummary, internalCoherence, evidenceScopeIds[]}}`
  - Prompt includes congruence examples from architecture doc §11.5 (already in claimboundary.prompt.md)
- [ ] Coherence assessment
  - LLM returns `internalCoherence` score (0-1) per boundary
  - Flag boundaries with `internalCoherence < boundaryCoherenceMinimum` (UCM, default 0.3)
- [ ] Post-clustering validation (deterministic)
  - Every EvidenceScope assigned to exactly one boundary
  - Boundary count ≤ `maxClaimBoundaries` (UCM, default 6)
  - If over cap: merge two most similar boundaries (use LLM similarity or deterministic heuristic), repeat until under cap
- [ ] Assign evidence items to boundaries
  - For each `EvidenceItem`, set `claimBoundaryId` based on its `evidenceScope` → boundary mapping
- [ ] Fallback: single "General" boundary
  - If clustering returns 0 boundaries or fails, create one boundary containing all scopes
  - Name: "General Evidence", description: "All evidence analyzed together"
- [ ] Return `ClaimBoundary[]`

**Dependencies:**
- UCM prompts: `BOUNDARY_CLUSTERING`
- UCM config: `maxClaimBoundaries`, `boundaryCoherenceMinimum`
- Existing: None (pure LLM + deterministic logic)

**Testing strategy:**
- Mock LLM to return 2-3 boundaries with varying coherence
- Test over-cap scenario (merge logic)
- Test single-scope → single-boundary case
- Test fallback to "General" boundary
- Test evidence item assignment (`claimBoundaryId` population)

**Estimated effort:** 1-2 sessions (4-6 hours)

---

### Phase 5d: Stage 4 — Production LLM Wiring (§8.4)

**Owner:** Senior Developer or LLM Expert

**Deliverables:**
1. Create `createProductionLLMCall()` wrapper (~80-100 lines)
2. Wire it into `generateVerdicts()` call site
3. Add integration test (optional, uses real LLM)
4. Verify: Build PASS, tests PASS, Stage 4 can run with production prompts

**Implementation checklist:**
- [ ] Create LLM call wrapper
  - Function signature matches `LLMCallFn` from verdict-stage.ts
  - Loads UCM prompt by `promptKey` (e.g., "VERDICT_ADVOCATE")
  - Uses `loadAndRenderSection()` from prompt-loader.ts (like monolithic-dynamic does)
  - Calls AI SDK `generateText()` with provider from UCM config
  - Parses structured output (Zod schema or JSON mode)
  - Returns typed result
- [ ] Wire into `generateVerdicts()`
  - Replace `throw new Error("llmCall function required")` with production call creation
  - Pass `createProductionLLMCall()` to `runVerdictStage()`
- [ ] Handle tier selection
  - Step 1, 2, 3, 4: Sonnet
  - Step 5: Haiku (2 calls for validation)
  - Read from UCM `modelVerdict` config or use `getModelForTask("verdict")`
- [ ] Error handling
  - Wrap LLM calls in try/catch
  - If LLM fails, decide: retry, fallback, or throw (per UCM `allowQualityFallbacks` config)

**Dependencies:**
- Existing: `loadAndRenderSection` (prompt-loader.ts), `getModelForTask` (llm.ts), AI SDK `generateText`
- UCM prompts: All verdict prompts already exist in `claimboundary.prompt.md`
- UCM config: `modelVerdict`, `llmProvider`, verdict-stage config params

**Testing strategy:**
- Create integration test that calls `generateVerdicts()` with real LLM (mark as expensive, skip in CI)
- Unit tests can still use mocked `llmCall` for verdict-stage.ts logic

**Estimated effort:** 1 session (2-4 hours)

---

### Phase 5e: Stage 5 — Aggregate Assessment (§8.5)

**Owner:** Senior Developer (needs strong understanding of aggregation logic)

**Deliverables:**
1. Implement `aggregateAssessment()` function (~300-400 lines)
2. Add 15-20 unit tests (mocked VerdictNarrative LLM call)
3. Verify: Build PASS, tests PASS, full pipeline 1→2→3→4→5 works end-to-end

**Implementation checklist:**
- [ ] Triangulation scoring per claim (§8.5.2)
  - For each claim, count boundaries supporting/contradicting
  - Apply triangulation factor from CalcConfig (`triangulation.strongAgreementBoost`, etc.)
  - Attach `triangulationScore` to each `CBClaimVerdict`
- [ ] Derivative weight reduction (§8.5.3)
  - Flag derivative evidence (if `derivativeSource` field exists)
  - Apply `derivativeMultiplier` (CalcConfig, default 0.5) to claim weight
- [ ] Weighted average computation (§8.5.4)
  - Reuse `getClaimWeight()` from aggregation.ts (centrality weights)
  - Apply harm multipliers: use 4-level `harmPotentialMultipliers` from CalcConfig (not scalar)
  - Apply triangulation factors
  - Call `calculateWeightedVerdictAverage()` (existing function in aggregation.ts)
- [ ] Confidence aggregation (§8.5.5)
  - Weighted average of claim confidences (same weights as verdicts)
  - Apply spread multipliers from verdict-stage self-consistency results
  - Apply existing confidence calibration (reuse existing module)
- [ ] VerdictNarrative generation (§8.5.6, Sonnet call)
  - Load UCM prompt `VERDICT_NARRATIVE`
  - Input: overall verdict, claim verdicts, boundaries, coverage matrix
  - Output: `{summary, keyEvidence[], limitations[], methodology}`
- [ ] Optional: CLAIM_GROUPING (§18 Q1)
  - If `claimCount >= 4` AND UCM `ui.enableClaimGrouping` enabled
  - Call Haiku with `CLAIM_GROUPING` prompt
  - Group claims by theme for UI display
  - **Note:** Can defer this to UI polish phase
- [ ] Quality gates summary (§8.5.7)
  - Gate 1: claim validation stats (from Stage 1)
  - Gate 4: confidence classification (high/medium/low per claim)
  - Populate `QualityGates` object
- [ ] Report assembly (§8.5.7)
  - Return `OverallAssessment` with all fields populated
  - `hasMultipleBoundaries` = boundaryCount > 1
  - `claimVerdicts`, `claimBoundaries`, `coverageMatrix`, `verdictNarrative`, `qualityGates`

**Dependencies:**
- Existing: `getClaimWeight`, `calculateWeightedVerdictAverage` (aggregation.ts), confidence calibration modules
- UCM prompts: `VERDICT_NARRATIVE`, `CLAIM_GROUPING` (optional)
- UCM config: All CalcConfig aggregation params (triangulation, derivativeMultiplier, harmPotentialMultipliers)

**Testing strategy:**
- Mock VerdictNarrative LLM call to return fixture
- Test triangulation scoring with different boundary agreement patterns
- Test derivative weight reduction
- Test weighted average calculation (compare to hand-calculated expected values)
- Test confidence aggregation with spread multipliers
- Test quality gates population

**Estimated effort:** 2 sessions (4-6 hours)

---

### Phase 5f: End-to-End Integration Test (Optional)

**Owner:** Code Reviewer or Lead Architect

**Deliverables:**
1. Create `claimboundary-integration.test.ts` (expensive test, real LLM calls)
2. Run full pipeline on 2-3 test inputs
3. Verify output schema matches `3.0.0-cb` spec
4. Document cost per test run

**Test scenarios:**
1. **Simple input** (1 claim, 1 boundary expected) — "The Eiffel Tower is in Paris"
2. **Multi-claim input** (3-5 claims, 2-3 boundaries expected) — "Brazil's economy grew 5% in 2020. The unemployment rate fell to 8%. Inflation remained under control."
3. **Adversarial input** (opinion + fact mix) — "Electric cars are clearly the future. Tesla sold 500k vehicles in 2020."

**Verification:**
- All stages complete without throwing
- `resultJson._schemaVersion === "3.0.0-cb"`
- `claimBoundaries.length > 0`
- `claimVerdicts.length === atomicClaims.length`
- `coverageMatrix` dimensions match claims × boundaries
- Build PASS, individual unit tests PASS

**Estimated effort:** 1 session (2-3 hours)

---

## Execution Sequence

### Week 1: Core Stages (1-3)
1. **Phase 5a** (Stage 1) — Senior Developer — 1-2 sessions
2. **Phase 5b** (Stage 2) — Senior Developer — 2-3 sessions
3. **Phase 5c** (Stage 3) — Senior Developer or LLM Expert — 1-2 sessions

**Milestone:** First 3 stages complete, pipeline can extract claims → research → cluster boundaries.

### Week 2: Verdict + Aggregation (4-5)
4. **Phase 5d** (Stage 4 wiring) — Senior Developer or LLM Expert — 1 session
5. **Phase 5e** (Stage 5) — Senior Developer — 2 sessions

**Milestone:** Full pipeline functional, can run end-to-end analysis.

### Week 2-3: Testing + Polish
6. **Phase 5f** (Integration test) — Code Reviewer — 1 session (optional)
7. **Documentation update** — Technical Writer — update Current_Status.md, KNOWN_ISSUES.md
8. **Performance baseline** — Run on 5-10 real inputs, measure time/cost/quality

**Final Milestone:** ClaimBoundary pipeline v1.0 production-ready.

---

## Risk Mitigation

### Risk 1: LLM Prompt Quality Issues
**Mitigation:** Prompts are already written and reviewed (Phase 1c). If extraction/clustering quality is poor, iterate on prompts in UCM (no code changes needed).

### Risk 2: Budget Overruns (Token Usage)
**Mitigation:** All budget limits are UCM-configurable. Start with conservative limits (low `maxResearchIterations`), tune up after cost baseline.

### Risk 3: Integration Failures (Stage Dependencies)
**Mitigation:** Test each stage independently with mocked inputs before integration. Use fixtures from architecture doc examples.

### Risk 4: Performance (Latency)
**Mitigation:** Stages 2 and 3 can run parallel LLM calls where applicable (e.g., evidence extraction per source, self-consistency + challenge in Stage 4). Optimize after functional correctness.

### Risk 5: Schema Mismatches (resultJson Format)
**Mitigation:** `resultJson` schema is already defined in `claimboundary-pipeline.ts` lines 121-164. Validate against it in tests.

---

## Success Criteria

### Phase 5 Complete When:
1. ✅ All 5 stages implemented (no `throw new Error` stubs)
2. ✅ All unit tests PASS (100+ new tests across 5 stages)
3. ✅ Build PASS (`npm run build`)
4. ✅ Safe tests PASS (`npm test`, no expensive LLM tests)
5. ✅ At least 1 successful end-to-end analysis run (manual or integration test)
6. ✅ `resultJson._schemaVersion === "3.0.0-cb"` validated
7. ✅ Documentation updated (CB_Execution_State.md, Current_Status.md)

### Ready for Production When:
1. ✅ All Phase 5 success criteria met
2. ✅ Performance baseline established (time/cost per analysis)
3. ✅ Error handling complete (graceful degradation or retry on LLM failures)
4. ✅ Admin UI can configure all 24 CB parameters
5. ✅ Quality baseline: 5+ real analyses reviewed by human, verdicts reasonable
6. ✅ Known issues documented (if any)

---

## Deferred Items (Post-v1.0)

The following items from the architecture doc are **deferred** to v1.1+ (not blocking v1.0):

1. **Stage 1 Gate 1 retry loop** (§8.1.5) — if >50% claims fail grounding check, retry with stricter prompt. Can start without this.
2. **CLAIM_GROUPING for UI** (§18 Q1) — optional Haiku call for 4+ claims. UI can work without grouping.
3. **Advanced triangulation** (§8.5.2 extended) — initial version uses simple counts, can refine scoring logic later.
4. **Derivative evidence detection** (§8.5.3) — requires `derivativeSource` field population, may need additional extraction logic.
5. **F-05 aggregation gaps** (from Phase 1 Review) — triangulationFactor/derivativeFactor integration with `aggregation.ts`. Can start with CalcConfig values applied in Stage 5 directly.

---

## Handoff to Execution

**Next Step:** Create `Docs/WIP/CB_Implementation_Prompts.md` with detailed agent prompts for Phases 5a-5f.

**Captain's Decision Points:**
1. Approve this plan before proceeding?
2. Any changes to stage order or scope?
3. Which agent should start with Phase 5a (Stage 1 implementation)?

**Estimated Total Effort:** 10-15 agent sessions (20-35 hours of implementation + testing), spread over 2-3 weeks.

---

**Document Version:** 1.0
**Created:** 2026-02-17
**Author:** Lead Architect (Claude Opus 4.6)
**Status:** Awaiting Captain approval
