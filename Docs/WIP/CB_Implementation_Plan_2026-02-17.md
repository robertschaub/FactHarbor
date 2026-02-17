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
  - Fetch top sources, **extract evidence with batched LLM (Haiku)** - include EvidenceScope for each item
- [ ] Pass 2: Evidence-grounded extraction (Sonnet)
  - Load UCM prompt `CLAIM_EXTRACTION_PASS2`
  - Call LLM with input text + preliminary evidence
  - Parse `{atomicClaims[]: {statement, centrality, harmPotential, expectedEvidenceProfile, groundingQuality}}`
- [ ] Centrality filter
  - Keep only claims with `centrality >= centralityThreshold` (UCM, default "medium")
  - Cap at `maxAtomicClaims` (UCM, default 15)
- [ ] Gate 1: Claim validation (LLM assessment)
  - **Use batched LLM assessment (Haiku)** to validate all claims in one call
  - Check opinion score and specificity for each claim
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
  - **Generate queries via LLM** (UCM `GENERATE_QUERIES` prompt) — no hardcoded query templates
- [ ] Web search + relevance classification
  - Call `searchWebWithProvider()` (max `maxSourcesPerIteration`, UCM)
  - **Batched LLM relevance check (Haiku):** One call with all search results for current claim
  - Filter to top-N relevant sources based on LLM relevance scores
- [ ] Source fetch + reliability prefetch
  - Call `extractTextFromUrl()` for each relevant source
  - Call `prefetchSourceReliability()` for batch (reuse existing module)
- [ ] Evidence extraction with mandatory EvidenceScope
  - Load UCM prompt (evidence extraction section, TBD which prompt file)
  - Call LLM with claim + source content
  - Parse `{evidenceItems[]: {statement, category, claimDirection, evidenceScope, probativeValue, sourceType, isDerivative, derivedFromSourceUrl?, relevantClaimIds[]}}`
  - Include derivative fields per §8.5.3
- [ ] EvidenceScope validation
  - **Deterministic structural check:** Ensure methodology, temporal fields are non-empty strings
  - If validation fails, retry extraction with more explicit prompt (not heuristic fallback)
- [ ] Derivative validation (§8.2 step 9)
  - For items with `isDerivative: true` + `derivedFromSourceUrl`, verify URL in fetched sources
  - If not found, set `derivativeClaimUnverified: true`
- [ ] Evidence filter
  - Call `filterByProbativeValue()` (existing deterministic filter)
  - Optional: LLM quality check (if UCM `llmEvidenceQuality` enabled)
- [ ] Sufficiency check
  - Per claim: if `evidenceCount >= claimSufficiencyThreshold` (UCM, default 3), mark sufficient
  - If all claims sufficient, exit loop early
- [ ] Contradiction search (reserved iterations)
  - After main loop, run `contradictionReservedIterations` (UCM, default 2) targeting claims with low contradiction coverage
  - **Generate contradiction queries via LLM** (UCM `GENERATE_QUERIES` with `iterationType: "contradiction"`) — no hardcoded phrases
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
  - For each claim, calculate `derivativeRatio` = proportion of supporting evidence with `isDerivative: true` AND `derivativeClaimUnverified: false`
  - Apply formula: `derivativeFactor = 1.0 - (derivativeRatio × (1.0 - derivativeMultiplier))`
  - Use in final weight calculation
- [ ] Weighted average computation (§8.5.4)
  - Reuse `getClaimWeight()` from aggregation.ts (centrality weights)
  - Apply harm multipliers: use 4-level `harmPotentialMultipliers` from CalcConfig (not scalar)
  - Apply triangulation factors
  - Call `calculateWeightedVerdictAverage()` (existing function in aggregation.ts)
- [ ] Confidence aggregation (§8.5.5)
  - Weighted average of claim confidences (same weights as verdicts)
  - **Note:** `verdict-stage.ts` already applied self-consistency spread multipliers to per-claim confidence — do NOT re-apply in Stage 5
  - Apply existing confidence calibration (reuse existing module) for overall confidence only
- [ ] VerdictNarrative generation (§8.5.6, Sonnet call)
  - Load UCM prompt `VERDICT_NARRATIVE`
  - Input: overall verdict, claim verdicts, boundaries, coverage matrix
  - Output: `{headline, evidenceBaseSummary, keyFinding, boundaryDisagreements[], limitations}` (per types.ts line 862-868)
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
- Test confidence aggregation (verify spread multipliers NOT re-applied)
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

### Week 2-3: Testing, Documentation, Cleanup
6. **Phase 5f** (Integration test) — Code Reviewer — 1 session (optional)
7. **Phase 5g** (Documentation updates) — Technical Writer — 1-2 sessions (REQUIRED)
8. **Phase 5h** (Test coverage expansion) — Code Reviewer — 1 session (optional but recommended)
9. **Phase 5i** (Final cleanup V-01 through V-09) — Lead Architect — 1 session (REQUIRED)
10. **Phase 5j** (MD status verification) — Lead Architect — 0 sessions (documentation only)
11. **Phase 5k** (UI adaptations + UCM config + diagrams) — Senior Developer (UI focus) — 2-3 sessions (REQUIRED)

**Final Milestone:** ClaimBoundary pipeline v1.0 production-ready with full UI support.

**Total Estimated Effort:** 11-17 agent sessions for core implementation (Phases 5a-5f), plus 5-8 sessions for polish/UI (Phases 5g-5k). Total: 16-25 sessions (35-55 hours) over 3-4 weeks.

---

### Phase 5g: Comprehensive Documentation Updates

**Owner:** Technical Writer or Lead Architect

**Deliverables:**
1. Update all status/tracking documents
2. Update xWiki pages to reflect implementation status
3. Update governance docs (AGENTS.md, CLAUDE.md)
4. Address V-03 through V-08 non-blocking items from final verification

**Documentation checklist:**

**Status Documents (Docs/STATUS/):**
- [ ] **Current_Status.md**: Add ClaimBoundary pipeline v1.0 to "Recent Changes", update pipeline status from "in development" to "production-ready", update version to v2.11.0
- [ ] **KNOWN_ISSUES.md**: Document any new issues discovered during Stage 1-5 implementation
- [ ] **Backlog.md**: Move "Implement ClaimBoundary pipeline" to "Recently Completed", add any deferred items from Phase 5 (e.g., Gate 1 retry loop, CLAIM_GROUPING, derivative detection)

**xWiki Pages (Docs/xwiki-pages/FactHarbor/):**
- [ ] **ClaimBoundary_Pipeline_Architecture** (Docs/WIP/): Add implementation status section at top: "Status: IMPLEMENTED (v2.11.0, 2026-02-17)", note which items are deferred to v1.1
- [ ] **Testing Strategy** (Product Development/DevOps/Guidelines/): Add CB pipeline test coverage section (unit tests, integration tests, neutrality tests)
- [ ] **Pipeline Variant Dispatch** (Product Development/Diagrams/): Update diagram to show CB as default (if not already done)
- [ ] **System Architecture** (Product Development/Diagrams/): Update to remove orchestrated, show CB as primary

**Governance Docs:**
- [ ] **AGENTS.md**:
  - Remove orchestrated.ts from architecture diagram (line 109) and Key Files table (line 121)
  - Remove `[NEW]` tags from claimboundary-pipeline.ts and verdict-stage.ts (they're no longer new)
  - Update orchestrated.ts line to "orchestrated.ts [REMOVED — replaced by ClaimBoundary]"
  - Remove references to deleted test files (test:contexts, test:adversarial) — lines 149-150, 161-162
  - Fix line 63 parenthetical mention of AnalysisContexts in Analysis Prompt Rules section
- [ ] **CLAUDE.md**:
  - Remove orchestrated.ts reference (line 9) or update to "[REMOVED]"
  - Remove references to deleted test scripts (line 41)
  - Update "Migration complete" note to include implementation completion date

**Configuration:**
- [ ] **package.json**: Remove or update test:contexts and test:adversarial scripts (lines 18-19, V-08) to point to new CB neutrality/adversarial tests (if implemented in Phase 5h)

**Estimated effort:** 1-2 sessions (3-5 hours)

---

### Phase 5h: Test Coverage Expansion (Optional but Recommended)

**Owner:** Code Reviewer or Senior Developer

**Deliverables:**
1. Neutrality tests for CB pipeline
2. Performance benchmarks
3. Adversarial input tests
4. Test coverage report

**Test expansion checklist:**

**Neutrality Tests (High Priority):**
- [ ] Create `claimboundary-neutrality.test.ts` (similar to deleted input-neutrality.test.ts)
- [ ] Test pairs:
  - "Was X fair?" vs "X was fair"
  - "Did Y happen?" vs "Y happened"
  - "Is Z true?" vs "Z is true"
- [ ] Acceptance criteria: ≤4% variance in truthPercentage, same claim count (±1), same boundary count (±1)
- [ ] Mark as `.skip()` (expensive, uses real LLM calls)
- [ ] Document cost per run (estimate: $2-4 per pair)

**Performance Benchmarks:**
- [ ] Create `claimboundary-performance.test.ts`
- [ ] Test scenarios:
  - Simple (1 claim): <60s, <$0.30
  - Medium (3-5 claims): <120s, <$1.00
  - Complex (8+ claims): <180s, <$2.00
- [ ] Record baselines for future regression testing
- [ ] Mark as `.skip()` (expensive)

**Adversarial Tests:**
- [ ] Create `claimboundary-adversarial.test.ts` (similar to deleted adversarial-context-leak.test.ts)
- [ ] Test scenarios:
  - Opinion + fact mix: "X is clearly the best. Y sold 500k units."
  - Conflicting evidence: "Study A says X. Study B contradicts X."
  - Vague claims: "Some experts believe X."
- [ ] Verify: Gate 1 filters opinion, boundaries separate conflicting evidence, vague claims flagged with low confidence
- [ ] Mark as `.skip()` (expensive)

**Test Coverage Report:**
- [ ] Run coverage tool on claimboundary-pipeline.ts, verdict-stage.ts, and Stage 1-5 code
- [ ] Target: ≥80% line coverage for Stage 1-5 functions
- [ ] Document gaps and create follow-up tasks if coverage <80%

**Estimated effort:** 1 session (3-4 hours) — neutrality tests are highest priority, others optional

---

### Phase 5i: Final Cleanup (Address V-01 through V-09)

**Owner:** Lead Architect or Code Reviewer

**Deliverables:**
1. Resolve all 9 non-blocking items from final verification
2. Final build + test verification
3. Update CB_Execution_State.md to mark Phase 5 COMPLETE

**Cleanup checklist:**

**Code Cleanup:**
- [ ] **V-01**: Remove `contextId?` field from `AnalysisWarning.details` (types.ts:652) — vestigial debug field
- [ ] **V-02**: Keep LEGACY page.tsx code (acceptable backward compatibility for old job results)
- [ ] **V-09**: Fix or remove 8 skipped budget tests (budgets.test.ts) — either update tests to use new budget tracking or delete if testing deleted functions

**Documentation Cleanup (overlap with Phase 5g):**
- [ ] **V-03**: Already covered in Phase 5g AGENTS.md updates
- [ ] **V-04**: Already covered in Phase 5g CLAUDE.md updates
- [ ] **V-05**: Already covered in Phase 5g AGENTS.md updates
- [ ] **V-06**: Already covered in Phase 5g CLAUDE.md updates
- [ ] **V-07**: Already covered in Phase 5g AGENTS.md updates
- [ ] **V-08**: Already covered in Phase 5g package.json updates

**Final Verification:**
- [ ] Run `npm run build` — must PASS
- [ ] Run `npm test` — must PASS with 0 skipped tests (or document why tests are intentionally skipped)
- [ ] Run `grep -r "AnalysisContext" src/lib/analyzer/` — must return 0 active code hits
- [ ] Run `grep -r "contextId" src/lib/analyzer/` — must return 0 active code hits (except LEGACY UI)

**Estimated effort:** 1 session (2-3 hours)

---

### Phase 5j: Monolithic Dynamic Status Verification

**Owner:** Lead Architect

**Deliverables:**
1. Explicit documentation that MD is complete and needs no changes

**Status:**

Monolithic Dynamic pipeline is **COMPLETE** — no changes needed beyond Phase 3b cleanup (already done).

**Evidence:**
- ✅ Phase 3b completed 2026-02-16 (see CB_Execution_State.md line 54)
- ✅ MD prompt updated for CB terminology (AnalysisContext→ClaimBoundary, CTX_XXX→CB_XXX)
- ✅ MD uses prompt-loader pattern (not prompt-builder) — no dead base prompt dependencies
- ✅ Schema version "2.7.0" is MD's own schema (not CB "3.0.0-cb") — no schema changes needed
- ✅ Source reliability integrated (v2.6.35)
- ✅ No stubs or "not yet implemented" errors
- ✅ All tests passing

**Verification command:**
```bash
grep -n "throw new Error" apps/web/src/lib/analyzer/monolithic-dynamic.ts
# Expected: Only standard error throws (fetch failures, validation errors)
# Actual (confirmed): Lines 296, 504 — standard "Failed to fetch/generate" errors, NOT stubs
```

**Conclusion:** Monolithic Dynamic is production-ready. No implementation work required in Phase 5.

**Documentation Note:** When updating architecture docs in Phase 5g, explicitly note that MD was updated in Phase 3b and requires no further changes for CB migration.

**Estimated effort:** 0 sessions (verification only, no implementation)

---

### Phase 5k: UI Adaptations for ClaimBoundary Display and UCM Config

**Owner:** Senior Developer (UI/Frontend focus)

**Deliverables:**
1. Complete report structure display (coverage matrix, verdictNarrative, qualityGates)
2. UCM Admin UI for all 24 CB parameters (organized by stage, fully editable)
3. Enhanced results page with all CB-specific visualizations
4. Any other UI updates needed for CB pipeline

**Implementation Requirements:**

**1. Admin UI: ClaimBoundary Configuration Panel**

Current state: `apps/web/src/app/admin/page.tsx` has basic admin links. UCM config editing exists in separate pages (TBD which).

**Task:** Create comprehensive CB config UI organized by pipeline stage.

- [ ] Create `apps/web/src/app/admin/config/claimboundary/page.tsx` (or integrate into existing config page)
- [ ] **Stage 1 section:** Form fields for:
  - `centralityThreshold` (dropdown: "high"/"medium")
  - `claimSpecificityMinimum` (number input 0-1)
  - `maxAtomicClaims` (number input 5-30)
  - `preliminarySearchQueriesPerClaim` (number input 1-5)
  - `preliminaryMaxSources` (number input 1-10)
  - `gate1GroundingRetryThreshold` (number input 0-1)
- [ ] **Stage 2 section:** Form fields for:
  - `claimSufficiencyThreshold` (number input 1-10)
  - `contradictionReservedIterations` (number input 0-5)
- [ ] **Stage 3 section:** Form fields for:
  - `maxClaimBoundaries` (number input 2-10)
  - `boundaryCoherenceMinimum` (number input 0-1)
- [ ] **Stage 4 section:** Form fields for:
  - `selfConsistencyMode` (dropdown: "full"/"disabled")
  - `selfConsistencyTemperature` (number input 0.1-0.7)
- [ ] **Aggregation section (CalcConfig):** Form fields for:
  - `selfConsistencySpreadThresholds.stable` (number input 0-20)
  - `selfConsistencySpreadThresholds.moderate` (number input 0-30)
  - `selfConsistencySpreadThresholds.unstable` (number input 0-50)
  - `harmPotentialMultipliers.critical` (number input 1-2)
  - `harmPotentialMultipliers.high` (number input 1-2)
  - `harmPotentialMultipliers.medium` (number input 0.8-1.2)
  - `harmPotentialMultipliers.low` (number input 0.8-1.2)
  - `triangulation.strongAgreementBoost` (number input 0-0.5)
  - `triangulation.moderateAgreementBoost` (number input 0-0.2)
  - `triangulation.singleBoundaryPenalty` (number input -0.3-0)
  - `triangulation.conflictedFlag` (checkbox)
  - `derivativeMultiplier` (number input 0-1)
- [ ] Each field should have:
  - Label with tooltip explaining what it controls
  - Current value display
  - Reset to default button
  - Validation (min/max, type checking)
- [ ] Save button at bottom of each section (async save to UCM)
- [ ] Toast notifications on save success/failure

**2. Results Display: Enhanced CB Report Page**

Current state: `apps/web/src/app/jobs/[id]/page.tsx` already updated in Phase 3 with BoundaryFindings component.

**Task:** Add comprehensive CB report visualizations.

- [ ] **Coverage Matrix Visualization:**
  - Create `apps/web/src/app/jobs/[id]/components/CoverageMatrix.tsx`
  - Display claims × boundaries grid
  - Color-code cells by evidence count (heatmap: 0=gray, 1-2=yellow, 3+=green)
  - Hover tooltip: show evidence count + direction breakdown
  - Only show if `hasMultipleBoundaries === true`
- [ ] **VerdictNarrative Display:**
  - Create `apps/web/src/app/jobs/[id]/components/VerdictNarrative.tsx`
  - Display `verdictNarrative.summary` as prominent callout
  - Display `verdictNarrative.keyEvidence` as bulleted list with citations
  - Display `verdictNarrative.limitations` as expandable "Limitations" section
  - Display `verdictNarrative.methodology` in footer/metadata area
- [ ] **Quality Gates Display:**
  - Create `apps/web/src/app/jobs/[id]/components/QualityGates.tsx`
  - Display Gate 1 stats: claims passed/failed opinion + specificity checks
  - Display Gate 4 stats: claims classified as high/medium/low confidence
  - Visual indicators (✓/✗) for each gate
- [ ] **Triangulation Scores:**
  - Add triangulation score to ClaimCard (if not already there)
  - Show "Strong Agreement", "Moderate Agreement", "Weak", or "Conflicted" badge
  - Tooltip: explain what triangulation means (e.g., "3+ boundaries agree")
- [ ] **Claim Grouping (if implemented in Stage 5):**
  - If `claimGroups` exists in resultJson, display claims grouped by theme
  - Collapsible sections per group
  - Otherwise, display flat claim list (current behavior)
- [ ] **Schema version badge:**
  - Show "3.0.0-cb" badge near title to indicate CB pipeline was used
  - Link to CB architecture doc (or tooltip explaining CB)

**3. Report Pages: Full Report View**

Current state: Job page shows summary + claims. Markdown report is downloadable but not rendered inline.

**Task:** Add inline markdown report rendering or enhance existing view.

- [ ] Option A: Add "Full Report" tab to job page
  - Tab 1: "Summary" (current view)
  - Tab 2: "Full Report" (markdown rendered with syntax highlighting)
  - Tab 3: "Raw JSON" (current JSON view)
- [ ] Option B: Enhance existing summary view to show all report sections
  - Already has verdictSummary, claims, boundaries
  - Add coverage matrix, verdictNarrative, qualityGates (from step 2 above)
  - This may be simpler than tabs
- [ ] Choose Option B unless Captain prefers tabs

**4. Documentation: Diagrams and Obsolete Doc Replacement**

**Task:** Update xWiki diagrams and replace obsolete docs.

- [ ] **Update xWiki diagrams** (in `Docs/xwiki-pages/FactHarbor/Product Development/Diagrams/`):
  - `ClaimBoundary Pipeline Detail` (may need to create new diagram showing Stages 1-5)
  - `Pipeline Variant Dispatch` (ensure CB is default)
  - `System Architecture` (remove orchestrated, show CB)
  - `Quality Gates Flow` (update if CB quality gates differ from orchestrated)
  - `Coverage Matrix` (may need new diagram showing claims × boundaries)
- [ ] **Replace obsolete docs:**
  - `Orchestrated Pipeline Detail` diagram → mark as "Obsolete (removed 2026-02-16)" or replace with CB diagram
  - Any other AC-related diagrams → mark obsolete or update
- [ ] **Create new diagrams (optional):**
  - ClaimBoundary Pipeline Flow (5 stages: Extract → Research → Cluster → Verdict → Aggregate)
  - Coverage Matrix visualization example
  - Verdict Stage 5-step debate flow (may already exist)

**Estimated effort:** 2-3 sessions (6-10 hours)

**Dependencies:**
- Phases 5a-5e complete (CB pipeline functional, data available)
- Phase 5g complete (xWiki pages updated with status)

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

### Phase 5 Core Implementation Complete When (Phases 5a-5e):
1. ✅ All 5 stages implemented (no `throw new Error` stubs)
2. ✅ All unit tests PASS (100+ new tests across 5 stages)
3. ✅ Build PASS (`npm run build`)
4. ✅ Safe tests PASS (`npm test`, no expensive LLM tests)
5. ✅ At least 1 successful end-to-end analysis run (manual or integration test in Phase 5f)
6. ✅ `resultJson._schemaVersion === "3.0.0-cb"` validated

### Phase 5 Documentation Complete When (Phase 5g):
1. ✅ Current_Status.md, KNOWN_ISSUES.md, Backlog.md updated
2. ✅ xWiki pages updated (architecture status, diagrams)
3. ✅ AGENTS.md and CLAUDE.md updated (remove [NEW] tags, fix orchestrated refs)
4. ✅ package.json test scripts updated or removed

### Phase 5 Testing Complete When (Phase 5h, optional):
1. ✅ Neutrality tests created and passing (or documented cost/skipped)
2. ✅ Performance benchmarks recorded
3. ✅ Adversarial tests created (or deferred with justification)
4. ✅ Coverage report generated (target: ≥80% for Stage 1-5 code)

### Phase 5 Cleanup Complete When (Phase 5i):
1. ✅ V-01 through V-09 resolved (contextId removed, skipped tests fixed, docs updated)
2. ✅ Build PASS with 0 skipped tests (or skips documented)
3. ✅ `grep AnalysisContext/contextId` returns 0 active code hits
4. ✅ CB_Execution_State.md updated with Phase 5 COMPLETE

### Phase 5 UI Complete When (Phase 5k):
1. ✅ Admin UI shows all 24 CB parameters organized by stage, fully editable
2. ✅ Results page displays coverage matrix, verdictNarrative, qualityGates
3. ✅ ClaimCard shows triangulation scores
4. ✅ xWiki diagrams updated (CB pipeline flow, system architecture, obsolete docs marked)
5. ✅ Build PASS, UI manually tested with CB resultJson

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
4. **Derivative evidence detection** (§8.5.3) — `isDerivative`/`derivedFromSourceUrl` fields are extracted in Stage 2, but improved heuristics for detecting derivative relationships may be added in v1.1.
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
