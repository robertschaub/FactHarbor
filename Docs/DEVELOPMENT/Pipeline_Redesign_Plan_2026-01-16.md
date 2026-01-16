---
name: FactHarbor Analysis Pipeline Redesign
overview: Comprehensive investigation of input transformation, scope detection, and verdict calculation issues, followed by architectural redesign proposal with migration path, risk assessment, and optimization strategy.
todos:
  - id: phase0-grounding-reality-gate
    content: Add a Phase 0 "Ground Realism" gate: grounded search must produce real, fetchable sources with provenance; never treat LLM synthesis as evidence.
    status: pending
  - id: phase1-normalization
    content: Remove duplicate normalizations; keep a single normalization point at analysis entry (runFactHarborAnalysis) and ensure all downstream steps use the normalized input.
    status: pending
  - id: phase1-scope-ids
    content: Replace scope ID text similarity with deterministic hashing (in analyzer/scopes.ts), using a documented canonicalization + hashing scheme.
    status: pending
  - id: phase1-scope-preservation
    content: Ensure selectFactsForScopeRefinementPrompt guarantees ≥1 representative fact per pre-assigned scope; verify on known multi-scope regressions.
    status: in_progress
  - id: phase1-gate1-move
    content: Do NOT move Gate1 fully post-research until supplemental-claims coverage logic is refactored (use Gate1-lite or defer; see Implementation_Feasibility_Audit_Report).
    status: pending
  - id: phase1-metrics-harness
    content: Add a deterministic regression harness for Q/S pairs and multi-scope cases (neutrality divergence, scope stability, claim stability, cost/latency).
    status: pending
  - id: phase1-testing
    content: Test 20 Q/S pairs, measure verdict divergence (target ≤ 4 points avg absolute)
    status: pending
    dependencies:
      - phase1-normalization
      - phase1-scope-ids
      - phase1-gate1-move
      - phase1-metrics-harness
  - id: phase2-merge-understand
    content: Merge understand + supplemental claims into single pass
    status: pending
  - id: phase2-remove-pruning
    content: Replace scope coverage pruning with a deterministic rule (only prune scopes with zero assigned claims AND zero assigned facts).
    status: pending
  - id: phase2-simplify-dedup
    content: Make scope deduplication type-aware/evidence-aware; increase similarity threshold and avoid merging across scope types (legal vs methodological, etc).
    status: pending
  - id: phase2-testing
    content: Compare claim counts and scope retention on 50 diverse inputs
    status: pending
    dependencies:
      - phase2-merge-understand
      - phase2-remove-pruning
  - id: phase3-llm-search
    content: Implement LLM-native search delegation with provenance (Gemini grounded search only if it returns grounding metadata + real URLs; otherwise fallback to external search)
    status: pending
  - id: phase3-research-refactor
    content: Refactor research loop to use LLM tool calling for search
    status: pending
  - id: phase3-ab-test
    content: A/B test LLM search vs external search (cost, quality, latency)
    status: pending
    dependencies:
      - phase3-llm-search
      - phase3-research-refactor
  - id: phase4-budgeted-research
    content: Add explicit budgets/caps (latency, retries, sources, extraction calls) and bounded parallelism for multi-scope research to prevent p95 blowups.
    status: pending
  - id: phase4-semantic-validation
    content: Add semantic validation for the Structured Fact Buffer (provenance, scope mapping) so schema-valid but wrong outputs can't silently drift.
    status: pending
  - id: phase4-parallel-run
    content: Run baseline vs Option D (budgeted research + validation) in parallel, compare outputs on regression suite.
    status: pending
  - id: phase4-gradual-rollout
    content: "Gradual traffic shift for Option D: 10% → 50% → 100% with monitoring and rollback."
    status: pending
    dependencies:
      - phase4-parallel-run
  - id: phase5-archive-legacy
    content: Archive legacy pipeline code under analyzer/legacy/ (keep it buildable, but out of the hot path).
    status: pending
    dependencies:
      - phase4-gradual-rollout
  - id: phase5-update-architecture-docs
    content: Update architecture documentation (Docs/ARCHITECTURE/Overview.md and related) to reflect the new pipeline and flags.
    status: pending
    dependencies:
      - phase5-archive-legacy
  - id: phase5-benchmarks-regression-suite
    content: Create a benchmarks/regression suite artifact (inputs + harness + baseline outputs) to prevent neutrality/scope regressions.
    status: pending
    dependencies:
      - phase1-metrics-harness
      - phase4-parallel-run
  - id: phase5-cleanup-flags
    content: Deprecate/remove legacy-only flags and dead code paths once rollout is stable (keep rollback path documented until fully sunset).
    status: pending
    dependencies:
      - phase5-update-architecture-docs
---

# FactHarbor Analysis Pipeline Redesign

## Executive Summary

Investigation reveals **five critical architectural issues** causing inconsistent verdicts between question/statement inputs, missing scope detection, and reduced claim generation. The root cause is **excessive pipeline complexity with 15+ LLM calls and fragile state management**. This plan proposes a **simplified, provider-agnostic architecture** leveraging native LLM capabilities (tool calling, grounded search) while maintaining quality.

**Implementation entry**: `Docs/DEVELOPMENT/Start_Pipeline_Redesign_Implementation.md`

> **Note on code references**: This plan mentions line numbers as a convenience, but they drift quickly as `analyzer.ts` evolves. Treat line numbers as approximate and prefer searching by **function name** (e.g., `runFactHarborAnalysis`, `understandClaim`, `selectFactsForScopeRefinementPrompt`, `canonicalizeScopes`, `pruneScopesByCoverage`).

### Non‑negotiable Invariants (from `AGENTS.md`)

Any redesign MUST preserve:
- **Pipeline integrity**: Understand → Research → Verdict (no stage skipping)
- **Input neutrality**: question vs statement divergence target ≤ 4 points (percentage points, avg absolute)
- **Scope detection**: maintain multi-scope detection and unified “Scope” terminology
- **Quality gates**: Gate 1 and Gate 4 are mandatory
- **Generic by design**: no domain-specific keyword lists or special-casing

**Governance note:** If the team wants to relax any of the above, treat it as an explicit policy change by updating `AGENTS.md` first, then re-deriving the acceptance tests and go/no-go gates.

---

## Part 1: Root Cause Analysis

### Issue 1: Input Normalization Cascade Failures

**Current Flow:**
```mermaid
graph TD
    Input[User Input] --> EntryNorm[Entry Normalization<br/>lines 7808-7821]
    EntryNorm --> UnderstandNorm[Understand Normalization<br/>lines 2969-2986]
    UnderstandNorm --> ScopeCanon[Scope Canonicalization<br/>lines 3833, 3861, 3914]
    ScopeCanon --> RefineScope[Scope Refinement<br/>lines 81-515]
    RefineScope --> Analysis[Verdict Generation]
    
    style EntryNorm fill:#f9d5d5
    style UnderstandNorm fill:#f9d5d5
    style ScopeCanon fill:#f9d5d5
```

**Problems:**
1. **Triple normalization** at entry (7816), understand (2979), and canonicalize (3833) creates drift
2. Question "Was X fair?" → "X was fair" at entry, but `understandClaim` may generate different `impliedClaim`
3. **Non-deterministic scope IDs**: `canonicalizeScopes` uses text similarity (lines 769-836), causing ID instability between runs
4. **Search query divergence**: `decideNextResearch` (4488-4537) extracts entities from `impliedClaim`, which differs between question/statement due to LLM variability

**Evidence from Jobs:**
- `6c55de4808834ccf951d8fbd7d4dd220` (question): TSE detected, 2 contexts, 74% verdict
- `d4cda8f3d85545499d9487b3ef214b4d` (statement): TSE missing, 1 context, 35% verdict
- **Verdict divergence: 39 points** (far exceeds 5% target)

### Issue 2: Scope Detection Fragility

**Current Architecture:**
```mermaid
graph LR
    subgraph Initial[Initial Detection]
        U[understandClaim<br/>3100 lines] --> S1[distinctProceedings]
    end
    
    subgraph Refinement[Evidence Refinement]
        Facts[Facts 40/N] --> Select[selectFacts<br/>712-767]
        Select --> Refine[refineScopesFromEvidence<br/>81-515]
        Refine --> S2[New distinctProceedings]
    end
    
    subgraph Prune[Pruning]
        S2 --> Dedup[deduplicateScopes<br/>837-920]
        Dedup --> Coverage[pruneScopesByCoverage<br/>2690-2748]
        Coverage --> S3[Final Scopes]
    end
    
    S1 --> Refinement
    
    style Select fill:#f9d5d5
    style Dedup fill:#f9d5d5
```

**Problems:**
1. **Fact sampling loses contexts** (lines 712-767): If TSE facts don't make top-40 sampled facts, TSE context disappears
2. **Over-aggressive deduplication** (lines 837-920): Similarity threshold 0.85 merges distinct trials
3. **Coverage pruning** (lines 2690-2748): Drops scopes with <20% fact coverage, even if semantically important
4. **No scope preservation guarantee**: Fix at line 754-760 helps but doesn't guarantee all pre-assigned scopes survive

**Evidence:** Job `dd4d3952b9394d7bbd5feb140bf5ec29` lost TSE context entirely

### Issue 3: Claim Generation Inconsistency

**Current Flow:**
```mermaid
graph TD
    U[understandClaim] --> Claims1[Initial subClaims]
    Claims1 --> Gate1[Gate1 Filter<br/>remove low checkWorthiness]
    Gate1 --> Supplement[requestSupplementalSubClaims<br/>if coverage thin]
    Supplement --> Outcome[extractOutcomeClaimsFromFacts<br/>after research]
    Outcome --> Claims2[Final subClaims]
    
    style Gate1 fill:#f9d5d5
    style Supplement fill:#f9d5d5
```

**Problems:**
1. **Gate1 removes claims** before research (lines 3874-3900), reducing evidence targets
2. **Supplemental claims** triggered inconsistently based on `distinctProceedings.length` (line 506)
3. **Outcome extraction** (lines 4230-4365) runs AFTER research, misses claims that should have guided search
4. **Non-deterministic claim IDs**: Supplemental claims get new IDs (SC7, SC8...), but order varies between runs

**Evidence:** Reports show 4-6 claims vs. 10-12 in earlier runs for same input

### Issue 4: Research Query Generation Drift

**Current Implementation** (lines 4488-4537):
```typescript
const entityStr = understanding.impliedClaim
  .toLowerCase()
  .replace(/[^\w\s]/g, " ")
  .split(/\s+/)
  .filter(word => word.length > 2 && !stopWords.has(word))
  .slice(0, 8)
  .join(" ");
```

**Problems:**
1. **Depends on LLM-generated `impliedClaim`**: Different for question vs. statement due to prompt variability
2. **Loses semantic context**: Word splitting discards multi-word entities ("Supreme Court" → "supreme court")
3. **No entity recognition**: Treats all words equally (misses proper nouns, dates, institutions)
4. **Search provider coupling**: Queries optimized for Brave/Google, not provider-agnostic

### Issue 5: Verdict Calculation Complexity

**Current Aggregation** ([`apps/web/src/lib/analyzer/aggregation.ts`](apps/web/src/lib/analyzer/aggregation.ts)):
```mermaid
graph TD
    Claims[Direct Claims] --> Weight[getClaimWeight<br/>centrality × confidence]
    Weight --> Invert[Invert counter-claims]
    Invert --> Filter[Filter tangential]
    Filter --> Avg[Weighted Average]
    Avg --> Context[Per-Context Verdict]
    Context --> Overall[Overall Verdict<br/>avg of contexts]
    
    style Invert fill:#fff3cd
    style Filter fill:#fff3cd
```

**Problems:**
1. **Counter-claim detection unreliable** ([`verdict-corrections.ts`](apps/web/src/lib/analyzer/verdict-corrections.ts) lines 155-220): Depends on `claimDirection` which is fact-level, not claim-level
2. **Double-filtering**: Tangential filtered at claim level AND at verdict aggregation
3. **Context averaging oversimplifies**: Equal weight to all contexts (TSE=STF) regardless of relevance to thesis
4. **Claims avg vs. overall divergence**: Job `d4cda8f3d85545499d9487b3ef214b4d` shows both at 35% (suspiciously identical)

---

## Part 2: Input Type Taxonomy & Requirements

### Input Spectrum

```mermaid
graph LR
    subgraph Simple[Simple 20-100 chars]
        S1[Single Claim<br/>Statement]
        S2[Single Claim<br/>Question]
        S3[Comparative<br/>X vs Y]
        S4[Inverse Claim<br/>X is not Y]
    end
    
    subgraph Medium[Medium 100-500 chars]
        M1[Multi-Claim<br/>2-5 claims]
        M2[Contextualized<br/>Claim + Background]
    end
    
    subgraph Complex[Complex 500+ chars]
        C1[Multi-Subject<br/>Article]
        C2[Multi-Context<br/>Multiple Proceedings]
    end
```

### Requirements Matrix

| Input Type | Normalization | Scope Detection | Claim Generation | Search Strategy |
|-----------|---------------|-----------------|------------------|-----------------|
| **Simple Statement** | Strip punctuation | Single scope | 3-5 claims from decomposition | Direct thesis search |
| **Simple Question** | → Statement form | Single scope | 3-5 claims from decomposition | Direct thesis search |
| **Comparative (X vs Y)** | Preserve structure | 2+ scopes (one per option) | 4-8 claims (pros/cons each) | Parallel search X, Y |
| **Inverse (X is not Y)** | Detect negation | Single scope | Invert verdict direction | Search X, search ¬X |
| **Multi-Claim** | Parse compound | Single scope | 1 claim per assertion | Sequential search |
| **Article** | Extract thesis | Multi-scope if distinct | 8-15 claims | Iterative deepening |
| **Multi-Context** | Identify proceedings | Multi-scope (forced) | 3-5 claims per scope | Scope-targeted search |

**Input Neutrality Contract (recommended):** Question ↔ Statement must produce **stable outputs** (not necessarily byte-identical intermediate fields):
- Same normalized input string
- Same scope count and scope type distribution
- High claim-set overlap (define threshold; e.g., Jaccard ≥ 0.85 on normalized claim texts)
- Verdict divergence avg ≤ 4 points (and define p95 target)

---

## Part 3: Desired Architecture

### Option D: Code-Orchestrated Native Research (NEW - Recommended)

Based on the `o1` Adversarial Audit, a pure Monolithic approach (Option A) contains fatal risks regarding token-bloat and attention drift. Option D provides the cost savings of native search while preserving the stability of the current orchestrator.

**Concept:** Keep the "Brain" in TypeScript, but replace the 15+ "Hand" calls (Extraction) with a single "Native Research" tool call.

```mermaid
graph TD
    Input[User Input] --> Stage1[Stage 1: UNDERSTAND<br/>1 LLM call]
    Stage1 --> Contexts[Contexts]
    Stage1 --> Claims[Claims]
    Stage1 --> Queries[Research Queries]
    
    Queries --> LLMSearch[LLM Grounded Search Tool<br/>1 call per scope]
    
    LLMSearch --> Facts[Structured Fact Buffer]
    
    Facts --> Stage2[Stage 2: VERDICT<br/>1 LLM call per context]
    
    Stage2 --> Output[Final Verdict]
    
    style Stage1 fill:#cfe2ff
    style LLMSearch fill:#d4edda
    style Stage2 fill:#cfe2ff
```

**Advantages:**
- **Linear Cost Scaling**: Avoids the quadratic token growth of a long-running monolithic conversation.
- **UI Responsiveness**: Maintains the ability to emit "Step X" events for each search/scope.
- **Schema Integrity**: Facts are extracted into a "Buffer" before the verdict, preventing the LLM from "summarizing away" critical metadata.
- **Scope Isolation**: By running search/verdict in separate, scoped calls, we prevent "Attention Sink" contamination between jurisdictions (e.g., TSE vs. SCOTUS).

---

## Part 3.1: Ground Realism Gate (NEW - REQUIRED BEFORE PHASE 3/4)

Option D only works in production if the "Native Research" stage is **actually grounded** and **provenance-safe**.

**Non-negotiable rule (Pipeline Integrity):** Facts used for verdicts must come from **fetched sources** (real URLs / documents) with `sourceUrl` + `sourceExcerpt`. Do **not** treat an LLM's synthesized “grounded response” as evidence.

**Reality check:** Gemini “grounded search” support in the repo depends on provider metadata being present. If grounding metadata is missing, the system must **fall back** to standard search providers rather than pretending research happened.

---

## Part 4: Adversarial Audit Result (o1-preview)

The following "Kill Switch" issues were identified during a deep simulation audit:

1.  **Context Window Bloat / Token Trap**: In Option A, re-entrant tool calls re-inject the entire history. This leads to **quadratic token growth**, potentially making the "simplified" pipeline *more expensive* than the legacy one.
2.  **Attention Sink / Scope Contamination**: In a monolithic prompt, LLMs struggle to isolate evidence for 3+ distinct legal bodies (e.g., TSE, STF, SCOTUS). Facts from one court "leak" into the verdict of another.
3.  **Black Box UX**: A 40-second monolithic call prevents the iterative UI feedback users expect, leading to a perceived "system hang."

**Fix**: Pivot to **Option D**, maintaining stage boundaries while leveraging high-tier LLM "Grounded Search" tools for the evidence collection stage.

---

## Part 5: Complexity Audit

### Unnecessary Complexity (Can Remove)

| Component | LOC | Purpose | Verdict |
|-----------|-----|---------|---------|
| **Triple normalization** | 150 | Input → statement (3 times) | ❌ REMOVE 2/3 |
| **Scope canonicalization** | 250 | Stabilize IDs with text similarity | ❌ REPLACE with deterministic hash |
| **Supplemental claims** | 400 | Backfill thin scope coverage | ⚠️ MOVE to post-research |
| **Deduplication (scopes)** | 300 | Merge similar scopes | ⚠️ SIMPLIFY threshold |
| **Deduplication (facts)** | 200 | Remove duplicate facts | ✅ KEEP (prevents bloat) |
| **Coverage pruning** | 150 | Drop scopes with few facts | ❌ REMOVE (loses contexts) |
| **Outcome extraction** | 350 | Generate outcome claims | ⚠️ MERGE into understand |
| **Gate1 pre-filter** | 150 | Remove low-quality claims early | ❌ MOVE to post-research |
| **Verdict inversions** | 400 | Detect and flip inverted claims | ✅ KEEP (critical) |
| **Counter-claim detection** | 300 | Identify opposing claims | ⚠️ FIX logic (use claim text, not facts) |

**Total removable:** ~1800 LOC (~21% of [`analyzer.ts`](apps/web/src/lib/analyzer.ts))

### Essential Complexity (Keep)

- **Input normalization** (1×, not 3×): Handle question → statement
- **Multi-scope detection**: Legal proceedings, scientific methodologies
- **Claim decomposition**: Break compound claims
- **Inverse search**: Find counter-evidence
- **Weighted aggregation**: Centrality × confidence
- **Quality gates**: Filter hallucinations (Gate1), low-confidence verdicts (Gate4)

### Rewrite vs. Evolution Strategy (Recommended)

This plan intentionally avoids a “rewrite everything” approach. Instead:

- **Evolve the core pipeline incrementally** (Phase 1–2), because it is tightly coupled to repo invariants:
  - pipeline integrity (Understand → Research → Verdict)
  - input neutrality
  - scope detection semantics
  - Gate 1 + Gate 4 enforcement

- **Rewrite selectively** when the component is:
  - small and interface-bound (clear inputs/outputs)
  - independently testable with deterministic fixtures
  - high-bug-density or inherently non-deterministic today
  - replaceable behind a feature flag / adapter

Examples of good “selective rewrite” candidates:
- **Deterministic scope IDs** in `analyzer/scopes.ts` (replace similarity-based ID logic with documented canonicalization + hash).
- A **Phase 1 regression harness** (inputs → metrics report) to make neutrality/scope regressions measurable and repeatable.
- A dedicated **LLM/tool-assisted search adapter** (Phase 3) that can be swapped between providers and guarded with budgets/caps.

Examples where “evolution” is safer than rewrite:
- The orchestration in `runFactHarborAnalysis` (too many invariants; safest via phased changes + parallel run).
- The quality gates (must remain enforceable and transparent).

---

## Part 5: Performance & Cost Optimization

### Cost Model (make assumptions explicit)

All cost numbers in this plan should be validated against:
- observed `state.llmCalls` and (if available) per-call token usage
- provider price table (input/output token pricing)

Use a consistent formula:
\[
\text{cost}=\sum_{calls}(\text{inTokens}\times price_{in} + \text{outTokens}\times price_{out})
\]

### Current Costs (per analysis)

| Stage | LLM Calls | Tokens (avg) | Cost (GPT-4) | Cost (Claude) | Time |
|-------|-----------|--------------|--------------|---------------|------|
| Understand | 1-3 | 8K in, 4K out | $0.12 | $0.05 | 8s |
| Search | 0 | - | - | - | - |
| Extract Facts | 5-15 | 6K in, 2K out | $0.60 | $0.24 | 25s |
| Refine Scopes | 1 | 12K in, 2K out | $0.08 | $0.03 | 4s |
| Verdict | 3-8 | 20K in, 3K out | $1.20 | $0.48 | 15s |
| **Total** | **10-27** | **~200K** | **$2.00** | **$0.80** | **52s** |

### Optimized Costs (Option D) (estimate; must be validated with measurements)

| Stage | LLM Calls | Tokens (avg) | Cost (GPT-4) | Cost (Claude) | Time |
|-------|-----------|--------------|--------------|---------------|------|
| Understand | 1 | 8K in, 4K out | $0.12 | $0.05 | 8s |
| Research (budgeted + grounded/external search) | 2-4 | varies | varies | varies | varies |
| Verdict (per-scope) | 1-3 | 20K in, 3K out | $0.40 | $0.16 | 10s |
| **Total** | **4-8** | **workload-dependent** | **must measure** | **must measure** | **p95-driven** |

**Potential savings:** TBD (must be measured on the regression suite; p95-driven)

### Optimization Strategies (All Options)

1. **Batch LLM calls**: Parallelize independent calls (understand + extract)
2. **Caching**: Cache `understandClaim` result by normalized input hash (Redis/file)
3. **Streaming**: Stream verdict generation (show partial results)
4. **Model tiering**: Use cheaper models for fact extraction (GPT-4-mini vs. GPT-4)
5. **Search optimization**: Limit to 3-5 queries, reuse search results across claims
6. **Context pruning**: Sample facts intelligently (current implementation mostly good)

**Target SLOs (without quality loss):**
- **Latency**: p50 < 20s, p95 < 45s
- **Cost**: < $0.50 per analysis (GPT-4), < $0.20 (Claude)
- **Accuracy**: Input neutrality divergence avg ≤ 4 points (Q/S), verdict stability > 90%

---

## Part 6: Migration Plan

### Phase 1: Critical Fixes (Week 1-2)

**Goal:** Stabilize current architecture, fix input neutrality

1. **Single normalization point** (`runFactHarborAnalysis` entry)
   - Remove any secondary normalization inside `understandClaim`
   - Ensure `impliedClaim` and downstream query generation is based on the normalized input
   - Add a regression check: Q/S inputs must lead to stable scope/claim outputs (see metrics harness)
   
2. **Deterministic scope IDs** ([`analyzer/scopes.ts`](apps/web/src/lib/analyzer/scopes.ts))
   - Replace text similarity with hash: `hash(name + subject + temporal)`
   - Preserve order (P1, P2, P3)
   
3. **Scope preservation** (`selectFactsForScopeRefinementPrompt`)
   - Guarantee ≥1 representative fact per pre-assigned scope in the refinement prompt
   - Treat “implemented fix” and “verification” separately: ensure the logic is present AND validated on known regressions
   
4. **Gate1 timing (defer or Gate1-lite first)**
   - **Do not** move Gate1 fully post-research until supplemental claims logic is refactored.
   - Safe interim: keep Gate1 pre-research (status quo) **or** add a minimal “Gate1-lite” pre-filter for extreme non-factual claims, then apply full Gate1 post-research for verdicting.

**Testing:**
- Run 20 question/statement pairs (plus a small set of known multi-scope regressions)
- Target: avg divergence ≤ 4 points; define p95 target; no scope loss events in the regression set

### Phase 2: Pipeline Simplification (Week 3-4)

**Goal:** Reduce to 3 stages, remove fragile components

1. **Merge understand + supplemental** (lines 3100-3950)
   - Generate all claims in one pass (no backfill)
   - Include outcome claims in initial understanding
   
2. **Replace scope pruning with deterministic pruning**
   - Only prune scopes with zero assigned claims AND zero assigned facts
   - Log every prune decision (reason + counts) so regressions are diagnosable
   
3. **Simplify deduplication safely**
   - Use a higher threshold (e.g. 0.92) BUT make it type-aware/evidence-aware
   - Never merge across scope types (legal ≠ scientific; jurisdiction ≠ methodology)

**Testing:**
- Compare claim counts (expect +20-30%)
- Verify no scope loss on multi-context inputs

### Phase 3: LLM-Native Search Integration (Week 5-6)

**Goal:** Add *verifiable* grounded research (only when provenance is real), with deterministic fallback to external search

1. **Implement search delegation** (new file: [`analyzer/llm-search.ts`](apps/web/src/lib/analyzer/llm-search.ts))
   - Detect if provider supports native search *and* returns grounding metadata with real sources
   - **Fallback to external search** if grounding metadata is absent/unreliable
   
2. **Refactor research loop with guardrails**
   - If LLM supports tools, allow tool-assisted search, but keep the orchestrator in control
   - Enforce caps (max searches, max tool calls, max sources, max facts) to prevent runaway behavior
   - The model can recommend searches; the system chooses which to execute (budget + diversity)
   
3. **Cost tracking** (lines 7955-7975)
   - Track native search costs separately
   - Compare cost/quality vs. external search

**Testing:**
- A/B test: LLM search vs. external search
- Measure: cost, latency, fact relevance, verdict quality

### Phase 4: Option D Production Hardening (Week 7-10)

**Goal:** Make Option D safe under tail latency and adversarial multi-scope inputs

1. **Budget + p95 controls**
   - Add explicit **latency budgets**, caps, retries, and bounded parallelism across scopes
   - Fail “slow scope” gracefully with explicit confidence reduction (Gate 4)

2. **Semantic validation for Structured Fact Buffer**
   - Enforce provenance (real URLs, excerpts)
   - Enforce scope mapping (`relatedProceedingId` must map to known scopes or `CTX_UNSCOPED`)

3. **Migration flags**
   - `FH_SHADOW_PIPELINE=true` (run hardened Option D in shadow-mode; compare without user impact)
   - `FH_FORCE_EXTERNAL_SEARCH=true` (override grounded mode for safety)
   - Gradual rollout of hardened Option D once metrics are green

**Testing:**
- Regression suite: 100+ diverse inputs (must include adversarial multi-scope)
- Metrics: input neutrality, scope retention, cross-scope leak rate, cost, **p95 latency**
- Rollout: 10% → 50% → 100% with automated rollback

**Go/No-Go gate (before production rollout):**
- Grounding/provenance gate is green (no synthetic-evidence path)
- Neutrality suite meets targets (avg ≤ 4 points; p95 defined and met)
- Scope-loss regressions reduced to ~0 in the tracked set
- Cross-scope leak test passes (adversarial input)
- Deterministic scope IDs shipped and verified

### Phase 5: Deprecation (Week 11-12)

**Goal:** Remove legacy pipeline, finalize migration

1. **Archive old code** (move to [`analyzer/legacy/`](apps/web/src/lib/analyzer/legacy/))
2. **Update documentation** ([`Docs/ARCHITECTURE/Overview.md`](Docs/ARCHITECTURE/Overview.md))
3. **Benchmarking** (create [`benchmarks/`](benchmarks/) with regression suite)

---

## Part 7: Risk Assessment

### Current Architecture Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Input neutrality failure** | HIGH (observed) | HIGH | Phase 1 fixes |
| **Scope loss** | MEDIUM (intermittent) | HIGH | Phase 1 scope preservation |
| **Verdict instability** | MEDIUM | MEDIUM | Phase 2 simplification |
| **Cost overruns** | LOW | MEDIUM | Model tiering |
| **Provider coupling** | LOW | LOW | Already multi-provider |

### Desired Architecture Risks (Option D)

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Grounding future-ware** | HIGH | HIGH | Phase 0 reality gate; fail closed to external search |
| **p95 latency blowups** | MEDIUM | HIGH | budgets/caps + bounded parallelism + timeouts |
| **Schema-valid but wrong metadata** | MEDIUM | HIGH | semantic validation + provenance rules |
| **Provider coupling** | MEDIUM | MEDIUM | adapter + deterministic fallback |
| **Regression during migration** | MEDIUM | HIGH | shadow mode + gradual rollout + rollback |

### Mitigation Strategy

1. **Feature flags**: `FH_SEARCH_MODE` (standard|grounded), `FH_FORCE_EXTERNAL_SEARCH`, `FH_SHADOW_PIPELINE`
2. **Parallel execution**: Run baseline vs hardened Option D in parallel (shadow-mode), compare outputs
3. **Rollback plan**: Single env var change reverts to legacy
4. **Monitoring**: Log verdict divergence, scope count, cost per input type
5. **Circuit breaker**: Auto-fallback to external search/baseline path if Option D error rate > threshold

---

## Part 8: Provider-Agnostic Design

### Abstraction Layer

```typescript
// apps/web/src/lib/analyzer/llm-abstraction.ts

interface LLMCapabilities {
  toolCalling: boolean;
  nativeSearch: boolean;
  structuredOutput: boolean;
  streamingSupported: boolean;
  maxContextTokens: number;
}

interface SearchTool {
  name: "web_search";
  description: string;
  parameters: {
    query: string;
    numResults?: number;
  };
}

interface AnalysisResult {
  contexts: AnalysisContext[];
  claims: SubClaim[];
  facts: ExtractedFact[];
  verdicts: ContextVerdict[];
}

async function runUnifiedAnalysis(
  input: string,
  provider: LLMProvider
): Promise<AnalysisResult> {
  const capabilities = detectCapabilities(provider);
  
  if (capabilities.toolCalling && capabilities.nativeSearch) {
    return runWithNativeSearch(input, provider);
  } else if (capabilities.toolCalling) {
    return runWithExternalSearchTool(input, provider);
  } else {
    return runHybridPipeline(input, provider);
  }
}
```

### Provider Capability Matrix

| Provider | Tool Calling | Native Search | Structured Output | Context Limit |
|----------|--------------|---------------|-------------------|---------------|
| **OpenAI GPT-4** | ✅ | ❌ (planned) | ✅ | 128K |
| **Anthropic Claude** | ✅ | ❌ | ✅ | 200K |
| **Google Gemini (AI SDK)** | ✅ | ⚠️ (grounded; experimental — only counts when grounding metadata/citations are returned) | ✅ | large |
| **Perplexity** | ⚠️ (limited) | ✅ (built-in; not yet integrated in this repo) | ❌ | 127K |
| **Mistral** | ⚠️ (basic) | ❌ | ⚠️ | 32K |

**Recommendation:** Keep multi-provider support. Treat grounded/native research as **experimental** until Phase 0 provenance gates are enforced; always maintain deterministic fallback to external search.

---

## Part 9: Success Metrics

### Input Neutrality
- **Target:** ≤ 4 points (percentage points) average absolute divergence between question/statement
- **Measure:** Run 50 Q/S pairs, calculate avg absolute difference
- **Current:** 7-39% (FAILING)
- **Phase 1 goal:** < 10%
- **Phase 4 goal:** < 4%

### Scope Detection Recall
- **Target:** Detect 95%+ of distinct legal proceedings, methodologies
- **Measure:** Manual annotation of 100 multi-context inputs
- **Current:** ~80% (estimated from bug reports)
- **Phase 2 goal:** > 90%

### Claim Generation Consistency
- **Target:** Variance < 15% between runs for same input
- **Measure:** Run same input 10×, measure claim count std dev
- **Current:** 4-12 claims, CV~30%
- **Phase 2 goal:** CV < 20%

### Cost Efficiency
- **Target:** < $0.50 per analysis (GPT-4)
- **Current:** $1.50-2.50
- **Phase 3 goal:** < $1.00
- **Phase 4 goal:** < $0.60

### Latency
- **Target:** p95 < 45s
- **Current:** p95 ~70s
- **Phase 3 goal:** p95 < 60s
- **Phase 4 goal:** p95 < 40s

---

## Recommendation (UPDATED)

**Adopt Option D (Code-Orchestrated Native Research)** with an explicit **Phase 0 Ground Realism Gate**:

1. **Immediate** (Week 1-2): Fix critical input neutrality bugs (Phase 1)
2. **Short-term** (Week 3-4): Simplify pipeline, stabilize scope detection (Phase 2)
3. **Medium-term** (Week 5-10): Add provenance-safe grounded research + p95 guardrails (Phase 3-4)
4. **Long-term** (ongoing): Measure cost/latency at p95, expand provider adapters, and only consider Option A again if tool-chain and grounding are provably stable.

**Why Option D:**
- Preserves **Pipeline Integrity** with explicit stage boundaries and provenance.
- Avoids the known **token trap** risks of monolithic tool loops.
- Keeps UI telemetry and isolation per scope.
