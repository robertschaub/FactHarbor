# FactHarbor Pipeline Redesign - Reviewer Guide

**Date**: January 16, 2026  
**Plan Document**: `Docs/DEVELOPMENT/Pipeline_Redesign_Plan_2026-01-16.md`  
**Implementation Entry**: `Docs/DEVELOPMENT/Start_Pipeline_Redesign_Implementation.md`  
**Status**: Ready for Review

---

## Executive Summary for Reviewers

This plan addresses **critical bugs** in the FactHarbor analysis pipeline that cause:
1. **Input neutrality failures**: Question vs statement inputs diverge by ~7–39 points (target ≤ 4 points avg absolute)
2. **Missing scope detection**: TSE/STF contexts disappear intermittently
3. **Reduced claim generation**: 4-6 claims vs 10-12 in earlier runs
4. **Verdict inconsistency**: Identical inputs produce different results between runs

The root cause is **excessive pipeline complexity** (15+ LLM calls, fragile state management). The plan proposes a **5-phase migration** (Phase 1-5) to a simplified architecture with **measured** cost/latency reductions (p95-driven) and explicit go/no-go gates.

> **Note on code references**: This document (and the plan) mention line numbers as a convenience, but they can drift quickly as `analyzer.ts` evolves. Reviewers should prefer searching by **function name** (e.g., `runFactHarborAnalysis`, `understandClaim`, `selectFactsForScopeRefinementPrompt`, `canonicalizeScopes`, `pruneScopesByCoverage`) and confirm behavior in the current `main` branch.

## Final Review Checklist (sign-off)

Use this as the minimum sign-off checklist. **Further checks are welcome** wherever the reviewer thinks it makes sense (add items, request extra evidence, or propose alternative gates).

- [ ] **Architecture coherence**: Option D (Code-Orchestrated Native Research) is the selected target; Option A is explicitly deferred; no contradictory recommendations remain.
- [ ] **AGENTS.md invariants**: Pipeline Integrity (Understand → Research → Verdict), multi-scope detection/“Scope” terminology, and Gate 1 + Gate 4 are reaffirmed as hard constraints (or an explicit `AGENTS.md` amendment is proposed).
- [ ] **Input neutrality target**: Q/S divergence target is **≤ 4 percentage points** (avg absolute), with a defined p95 target.
- [ ] **Phase 0 Ground Realism Gate**: No “LLM synthesis as evidence”; grounded/native research must yield real sources with provenance or fail closed to standard search.
- [ ] **p95 safety**: Research budgets/caps + bounded parallelism are specified for multi-scope workloads; timeouts and “partial results” behavior are explicit.
- [ ] **Semantic validation**: Structured outputs are validated beyond schema (provenance + scope mapping) before verdicting.
- [ ] **Rollout/rollback**: Shadow-mode/parallel run, gradual rollout, and deterministic fallback are documented with clear go/no-go triggers.
- [ ] **Implementation on-ramp**: `Start_Pipeline_Redesign_Implementation.md` is sufficient to start PR 1 without guesswork.

## Invariants governance (AGENTS.md)

`AGENTS.md` defines repo-level **non‑negotiable invariants** for this project. If we want to relax any of these (Pipeline Integrity, multi-scope detection/terminology, Gate 1 & Gate 4), that is a **governance change**: it requires explicitly updating `AGENTS.md` and re-deriving acceptance tests.

**Invariants to reaffirm (or explicitly amend)**:
- **Pipeline Integrity (Understand → Research → Verdict)**: without this, the system can “skip research” and still output a verdict, which breaks evidence transparency and makes regressions unauditable.
- **Scope detection (“Scope” terminology + multi-scope support)**: without multi-scope isolation, multi-jurisdiction inputs become a cross-contamination risk (facts leak between scopes).
- **Quality gates (Gate 1 + Gate 4)**: without these, you lose deterministic guardrails against hallucinations/low-confidence outputs and you weaken rollback criteria.
- **Input Neutrality**: `AGENTS.md` now targets **≤4 percentage points** divergence between question/statement forms; this is a rollout gate, not just “nice to have.”

**Review prompt**: Do we reaffirm these invariants as hard constraints? If not, what exact amendments to `AGENTS.md` are being proposed, and what new safety/quality gates replace the removed ones?

## Second/Third Reviewer Protocol (recommended)

If you are running a subsequent review (e.g., using GPT-4 or another agent), keep it **independent** and **evidence-based**:

1.  **Role**: Act as a **skeptical auditor**. Assume “native research / grounding” will fail closed unless proven otherwise (no synthetic evidence).
2.  **Independence**: Do an initial pass *without* reading the first reviewer’s notes. Only reconcile at the end.
3.  **Focus Areas for GPT-4**:
   - **Grounded research realism**: Does “grounded” actually return real sources with provenance, or is it model synthesis?
   - **p95 budgeting**: Are tail-latency caps and bounded parallelism explicit for multi-scope workloads?
   - **Invariants**: Does the design preserve Understand → Research → Verdict and evidence transparency required by `AGENTS.md`?
4.  **Verification**:
    - Validate root causes with code inspection (function-name anchored).
    - Check for "hallucinated" cost savings—are we trading LLM calls for much more expensive input tokens?
5.  **Deliverable format**: Provide a short report with:
    - **Top 5 risks** (ranked)
    - **Top 5 proposed fixes** (actionable, with rationale)
    - **Go/No-Go criteria** for Phase 4 (Option D production hardening)

---

## Background Context

### Current System Status (v2.6.33)

**Working Features:**
- Multi-scope detection (legal proceedings, methodologies)
- 7-point verdict scale (TRUE to FALSE)
- Dependency tracking between claims
- Pseudoscience detection
- Quality gates (Gate 1, Gate 4)
- Multi-provider LLM support (Anthropic, OpenAI, Google, Mistral)

**Known Issues** (documented in plan):
- Input normalization applied 3× (entry, understand, canonicalize) → drift
- Scope IDs use text similarity → non-deterministic
- Fact sampling for scope refinement → contexts disappear
- Gate1 filters claims before research → reduces evidence targets
- Research query generation depends on LLM-generated `impliedClaim` → varies

### Documentation Reviewed

The analysis incorporated:
1. **Architecture docs** (`Docs/ARCHITECTURE/`):
   - Overview.md: 5-stage AKEL pipeline (Understand → Research → Verdict)
   - Calculations.md: Verdict aggregation, counter-evidence handling
   - Scope_Detection_and_Filtering.md: AnalysisContext vs EvidenceScope distinction
   
2. **Status docs** (`Docs/STATUS/`):
   - Current_Status.md: current features and known gaps
   - CHANGELOG.md: Recent fixes (v2.6.18-v2.6.25)
   
3. **Codebase** (`apps/web/src/lib/`):
   - analyzer.ts (8500 lines): Main analysis pipeline
   - analyzer/verdict-corrections.ts: Counter-claim detection logic
   - analyzer/aggregation.ts: Weighted verdict averaging

---

## Plan Structure Overview

The plan is organized into 9 parts:

1. **Root Cause Analysis** (Part 1): 5 critical issues with code citations
2. **Input Type Taxonomy** (Part 2): Requirements matrix for different input types
3. **Desired Architecture** (Part 3): 3 options with trade-offs
4. **Complexity Audit** (Part 4): Identify removable code (~1800 LOC)
5. **Performance & Cost** (Part 5): Current vs optimized metrics
6. **Migration Plan** (Part 6): Phases 1-5 with testing criteria
7. **Risk Assessment** (Part 7): Current vs desired architecture risks
8. **Provider-Agnostic Design** (Part 8): Abstraction layer for multi-LLM support
9. **Success Metrics** (Part 9): Measurable targets for each phase

---

## Architecture & Design Deltas (what changes in code)

This is the reviewer-oriented “diff” from the current pipeline to the redesigned Option D plan.

### Delta A: Phase 0 “Ground Realism Gate” (NEW)
- **Rule**: Facts used for verdicts must come from **fetched sources** (real URLs/documents) with provenance (URL + excerpt).
- **Ban**: No “LLM synthesis as evidence” paths (including any “grounded response” text treated as a source).
- **Fail closed**: If grounded/native research does not yield grounding metadata/citations, fall back to standard search providers.

### Delta B: p95-first budgets + bounded parallelism (NEW)
- Add explicit budgets/caps (timeouts, max sources, max extractions, max retries) and bounded concurrency for multi-scope workloads so p95 does not explode on 3+ scopes.

### Delta C: Semantic validation of the Structured Fact Buffer (NEW)
- Parsing JSON is not enough: add deterministic semantic validators (provenance, scope mapping) before verdict generation to prevent schema-valid but wrong data from silently drifting.

### Delta D: Generic-by-design enforcement (NEW)
- Remove/replace any domain-specific keyword heuristics used for scope labeling/classification; prefer provider-agnostic metadata + deterministic normalization and/or configuration.

### Delta E: EvidenceScope persistence (FIX)
- If per-fact `evidenceScope` is extracted, ensure it is actually persisted in the returned fact objects so scope isolation and transparency can use it.

---

## Key Technical Decisions to Review

### Decision 0: Rewrite vs. Evolution Strategy

**Proposed**: **Evolve the existing pipeline** for Phase 1–3, and **rewrite selectively** behind adapters/flags when components are small, interface-bound, and testable.

- **Why**: The core pipeline is tightly coupled to repo invariants (pipeline integrity, input neutrality, scope semantics, Gate 1 + Gate 4). Large rewrites tend to regress these invariants.
- **What to selectively rewrite** (good candidates):
  - deterministic scope IDs (replace similarity → canonicalized hash)
  - a deterministic regression harness (neutrality/scope/claim stability metrics)
  - provider/tool search adapters (with strict budgets/caps and fallbacks)

**Review Question**: Do we agree to avoid a full rewrite and instead use a “strangler” approach (parallel run + feature flags + regression harness) for any rewritten components?

### Decision 1: Architecture Option Selection

**Proposed**: Option D (Code-Orchestrated Native Research)
- Keep orchestration in TypeScript (telemetry + deterministic controls)
- Use grounded/native research only when it yields **real sources** with provenance
- **Risk**: Grounding capability and tail latency must be proven (Phase 0 reality gate)

**Alternatives**:
- Option A (Monolithic LLM-Driven): deferred due to token-trap and scope contamination risks unless tool-chains are proven stable
- Option B (Hybrid Pipeline): Simplified 3-stage with optional LLM search
- Option C (Minimal Changes): Fix bugs, keep existing architecture

**Review Question**: Is capability dependence (native search/grounding, structured output) acceptable **given** a strict “fail-closed” provenance gate and deterministic fallback to external search?

### Decision 1.1: Phase 0 “Ground Realism Gate” (NEW - rollout blocking)

**Proposed**: Add an explicit Phase 0 gate before Phase 3/4 work:
- Grounded/native research only “counts” when it yields **real sources** with provenance (URLs + excerpts)
- **No synthetic evidence**: do not treat any LLM synthesis text as a fetchable source used for verdicting
- **Fail closed**: if grounding metadata/citations are absent, fall back to standard search providers

**Review Question**: Are we comfortable making “provenance or fallback” a hard gate (even if it reduces apparent recall in some cases)?

### Decision 1.2: p95-first research budgets + bounded parallelism (NEW - design change)

**Proposed**: Implement explicit budgets/caps and bounded concurrency for multi-scope research to prevent p95 latency blowups.

**Review Question**: What is the production p95 target (e.g., 60s) and what is the acceptable behavior on budget exhaustion (partial results with Gate 4 confidence reduction vs. retry)?

### Decision 1.3: Semantic validation (NEW - design change)

**Proposed**: Add semantic validators for the “Structured Fact Buffer” (provenance, scope mapping) so schema-valid but wrong data cannot silently drift.

**Review Question**: What should be the fail-closed behavior on semantic validation failure (skip verdicting vs. “insufficient evidence” verdict)?

### Decision 2: Scope Detection Preservation

**Proposed**: Guarantee ≥1 fact per pre-assigned scope in refinement prompt
- Current fix in `selectFactsForScopeRefinementPrompt` is directionally good
- Prevents TSE/STF contexts from disappearing during fact sampling

**Review Question**: Is this sufficient, or do we need additional backstops?

### Decision 3: Gate1 Timing

**Proposed (updated per feasibility audit)**: **Do not** move Gate1 fully post-research until supplemental-claims coverage logic is refactored.\n+\n+Rationale (execution blocker): `requestSupplementalSubClaims` currently uses claim counts **after** Gate1 filtering to detect coverage gaps. If Gate1 is moved post-research without refactoring, opinion/prediction claims will mask factual coverage gaps, reducing supplemental claim generation and silently degrading research coverage.\n+\n+Two safe options:\n+- **Option 1 (defer)**: keep Gate1 pre-research (status quo) until supplemental claims are redesigned/removed.\n+- **Option 2 (Gate1-lite)**: keep a minimal pre-filter (“Gate1-lite”) for extreme non-factual claims to preserve coverage accounting, then apply the full Gate1 post-research for verdicting.

**Review Question**: Will this increase LLM costs significantly? (Answer: ~5-10% more extraction calls, but better quality)

### Decision 4: Scope ID Stabilization

**Proposed**: Replace scope text similarity with deterministic hash
- `hash(name + subject + temporal)` instead of Jaccard similarity
- Stable IDs across question/statement inputs

**Review Question**: Will this break existing job comparisons? (Answer: No, IDs are ephemeral per job)

---

## Migration Risk Assessment

### Phase 1 Risks (Critical Fixes)

**LOW RISK** - Isolated changes with clear rollback:
- Single normalization point: Remove duplicate code
- Deterministic scope IDs: Replace similarity with hash
- Scope preservation: Already implemented, verify effectiveness
- Gate1 timing: Simple code move

**Testing**: 20 question/statement pairs, target ≤ 4 points avg absolute divergence (define p95 target)

### Phase 2 Risks (Simplification)

**MEDIUM RISK** - Removes safety nets:
- Merge understand + supplemental: May miss edge cases
- Remove scope pruning: May create noise contexts
- Simplify deduplication: May merge distinct contexts

**Mitigation**: Compare claim counts on 50 diverse inputs

### Phase 3 Risks (LLM-Native Search)

**MEDIUM→HIGH RISK** - Grounding realism + provider variance:
- “Gemini grounded search” is only safe if it yields grounding metadata and real sources; otherwise it is not evidence.
- Providers differ in tool surfaces and latency tails; treat this as capability dependence.

**Mitigation**: Phase 0 “Ground Realism Gate” + deterministic fallback to external search if grounding metadata is absent/unreliable

### Phase 4 Risks (Option D Production Hardening)

**HIGH RISK** - Production hardening for Option D:
- p95 latency blowups on multi-scope workloads without budgets/caps
- schema-valid but semantically wrong “structured buffers” without semantic validation
- cross-scope evidence leakage if provenance/scope mapping is not enforced deterministically

**Mitigation**: 
- Parallel pipelines during migration
- Gradual rollout (10% → 50% → 100%)
- Feature flag for instant rollback

---

## Critical Review Points

### 1. Input Neutrality Claims

**Claim**: "Question vs statement divergence of 7-39% observed"

**Evidence**:
- Job `6c55de4808834ccf951d8fbd7d4dd220` (question): 74% verdict, 2 contexts
- Job `d4cda8f3d85545499d9487b3ef214b4d` (statement): 35% verdict, 1 context
- **Divergence: 39 points**

**Review**: Verify these job IDs in database, confirm they have identical inputs except punctuation

### 2. Scope Loss Claims

**Claim**: "TSE Electoral Case context missing in job `46b92597dbec46f08cf58d3c63060e0e`"

**Evidence**:
- Earlier report `ac3063c6c21440b89b241199f99ceaf0` had TSE context
- Recent report `46b92597dbec46f08cf58d3c63060e0e` only has STF context

**Review**: Compare fact sampling in both jobs, verify TSE facts exist but weren't sampled

### 3. Cost/Latency Claims

**Claim (updated)**: Cost and latency improvements are expected from reducing call count and enforcing bounded research, but **must be measured** (p95-driven). Avoid “headline % savings” until token usage and search/provider costs are recorded on a representative suite.

**Review**:
- Verify call counts (`state.llmCalls`) on baseline and Option D
- If token usage is available, compute cost via a single, documented price table
- Report avg/median/p95 latency; do not use averages as the rollout gate

### 4. Complexity Removal Claims

**Claim**: "~1800 LOC removable (21% of analyzer.ts)"

**Breakdown**:
- Triple normalization: 150 LOC
- Scope canonicalization: 250 LOC
- Supplemental claims: 400 LOC
- Deduplication: 500 LOC
- Other: 500 LOC
- **Total: ~1800 LOC**

**Review**: Are these truly unnecessary, or do they handle edge cases?

---

## Testing Strategy Review

### Phase 1 Testing (Immediate)

**Regression Suite**:
- 20 question/statement pairs (10 topics × 2 phrasings)
- Measure: verdict divergence (target ≤ 4 points avg absolute)
- Measure: scope count consistency
- Measure: claim count consistency

**Review Question**: Is 20 pairs sufficient? Should we test more diverse input types?

### Phase 2 Testing (Simplification)

**Claim Count Validation**:
- 50 diverse inputs
- Compare claim counts before/after
- Expect +20-30% increase (Gate1 moved)

**Review Question**: How do we validate quality of additional claims?

### Phase 3 Testing (LLM Search)

**A/B Test**:
- 100 analyses, 50 with LLM search, 50 with external
- Measure: cost, latency, fact relevance, verdict quality

**Review Question**: How do we quantify "fact relevance"?

### Phase 4 Testing (Option D Hardening)

**Regression Suite**:
- 100 diverse inputs
- Run both pipelines in parallel
- Compare: verdict accuracy, scope detection recall, input neutrality

**Review Question**: What's our acceptance criteria for rolling out hardened Option D?

---

## Estimated Timeline

| Phase | Duration | Effort | Risk |
|-------|----------|--------|------|
| **Phase 1** (Critical Fixes) | Week 1-2 | 3-4 days | LOW |
| **Phase 2** (Simplification) | Week 3-4 | 3-4 days | MEDIUM |
| **Phase 3** (LLM Search) | Week 5-6 | 4-5 days | MEDIUM |
| **Phase 4** (Option D hardening) | Week 7-10 | 8-10 days | HIGH |
| **Phase 5** (Deprecation) | Week 11-12 | 2-3 days | LOW |
| **Total** | **12 weeks** | **20-26 days** | - |

**Review Question**: Is 12 weeks realistic? Can we parallelize some phases?

---

## Alternatives Not Chosen

### Alternative 1: Keep Current Architecture

**Pros**:
- No migration risk
- Proven and battle-tested
- Incremental improvements possible

**Cons**:
- Bugs remain difficult to fix
- High cost ($1.50-2.50 per analysis)
- Slow (p95 ~70s)
- Maintenance burden (8500 LOC)

**Why not chosen**: Doesn't address root cause (excessive complexity)

### Alternative 2: Rewrite from Scratch

**Pros**:
- Clean slate, no technical debt
- Optimized for current LLM capabilities

**Cons**:
- Extremely high risk
- 6-12 months development time
- Loss of proven features
- Requires complete re-testing

**Why not chosen**: Too risky, plan offers incremental path with rollback

### Alternative 4: Selective Rewrites Only (No Native/Tool-Assisted Research)

**Pros**:
- Lower risk than a full rewrite
- Targets known failure points (determinism, sampling, query drift)
- Keeps existing observability and safety gates

**Cons**:
- May not achieve the full cost/latency improvements possible with a provenance-safe native/grounded research adapter
- Some complexity remains in the orchestration layer

**Why not chosen**: Selected as a **tactic** within Phase 1–3 (selective rewrites behind flags), but not sufficient alone to reach long-term maintainability targets.

### Alternative 3: Focus Only on Critical Bugs

**Pros**:
- Minimal risk
- Fast to implement (2-3 weeks)
- Keeps familiar architecture

**Cons**:
- Doesn't address cost/latency issues
- Complexity remains
- Future bugs likely

**Why not chosen**: Band-aid solution, doesn't improve long-term maintainability

---

## Phase 4 Go/No-Go Stress Test (Adversarial Scope Leak)

Before approving production rollout, the system must pass this **multi-scope leak test** (also referenced in `Docs/DEVELOPMENT/Start_Pipeline_Redesign_Implementation.md`):

1.  **Input** (run as both question + statement forms):
    - Two legal scopes share confusing identifiers.
    - Scope A: Supreme Court of Country A, Case 2024-017, about whether Policy P violates Statute S.
    - Scope B: Supreme Court of Country B, Case 2024-017, about whether Policy P complies with Statute S.
    - Some articles abbreviate both courts as “SC” and merge the stories.
    - Task: Analyze Scope A and Scope B separately. For each scope, list the controlling decision, date, holding, and only the evidence that belongs to that scope. If evidence is ambiguous, place it in CTX_UNSCOPED/General and do not let it affect either scope’s verdict.
2.  **Success Criteria**:
    - **Scope Isolation**: No Scope A verdict cites Scope B facts (and vice versa). Ambiguous evidence must be assigned to `CTX_UNSCOPED` and excluded from aggregation.
    - **Provenance**: Every cited fact has a real `sourceUrl` and an excerpt; no “LLM synthesis as evidence.”
    - **Progress Update**: The UI must emit at least 3 distinct "Search" or "Processing" events before the final result.
    - **p95 Safety**: Under the multi-scope workload, p95 stays within the target (define and enforce time budgets).

---

## Success Criteria for Plan Approval

1. **Input Neutrality**: Achieve ≤ 4 points average absolute divergence between question/statement paired inputs (and define p95 target)
2. **Scope Detection**: Detect 95%+ of distinct contexts (with an explicit definition of “context recall” and an evaluation set)
3. **Cost**: Reduce to < $0.50 per analysis (with a documented cost model + measured call/token counts)
4. **Latency**: Achieve p95 < 45s
5. **Quality**: Maintain or improve verdict accuracy (no regression)

**Review Question**: Are these the right metrics? What else should we measure?

### Metric Definitions (recommended to adopt before Phase 1 testing)

- **Input neutrality divergence**: For each question/statement pair, compute the absolute difference in final article truth percentage. Report avg/median/p95 across the suite.
- **Scope stability**: Compare scope count and scope type distribution; track “scope dropped after refinement/pruning” events.
- **Claim stability**: Jaccard overlap on normalized claim texts (or embedding match if available); report avg/median/p95.
- **Cost**: Report `state.llmCalls`, token usage (if available), and estimated cost by provider price table.

---

## Reviewer Action Items

### For Technical Review

1. **Verify claims**: Check job IDs, code line numbers, calculations
2. **Assess risks**: Evaluate migration risk ratings (LOW/MEDIUM/HIGH)
3. **Challenge assumptions**: Question cost/time estimates, test strategies
4. **Propose alternatives**: Suggest different approaches if concerns arise

### For Architectural Review

1. **Evaluate Option D** (Code-Orchestrated Native Research) vs Option B (Hybrid)
2. **Assess provider coupling**: Is Gemini dependency acceptable?
3. **Review abstraction layer**: Will it handle all providers?
4. **Consider future extensions**: Does architecture support planned features?

### For Business Review

1. **Validate cost/benefit**: Is the expected reduction in LLM calls and improved p95 latency worth the 12-week effort, given that cost savings must be measured (not assumed)?
2. **Assess risk tolerance**: Is HIGH risk phase acceptable?
3. **Review timeline**: Is 12 weeks aligned with roadmap?
4. **Evaluate alternatives**: Should we consider other options?

---

## Questions for Reviewers

### Critical Questions

1. **Input Neutrality**: Is ≤ 4 points (percentage points) the right target, or should we use a tighter/looser avg + p95 pair?
2. **Migration Strategy**: Execute all phases (1-5), or can we skip Phase 2/3 and go straight to Phase 4?
3. **Provider Strategy**: Should we support Gemini-only initially, or maintain multi-provider from day 1?
4. **Rollback Plan**: Is feature flag sufficient, or do we need database versioning?

### Technical Questions

5. **Scope Preservation**: Is the current fix (lines 754-760) sufficient, or do we need additional backstops?
6. **Counter-Claim Detection**: Should we refactor `verdict-corrections.ts` now, or wait for Phase 4?
7. **Weighted Aggregation**: Is the current weighted average algorithm (centrality × confidence) optimal?
8. **Pseudoscience Detection**: Should we expand patterns, or is current set sufficient?

### Process Questions

9. **Testing Strategy**: Is 100-input regression suite sufficient, or do we need more?
10. **Documentation**: What additional docs do we need beyond the plan?
11. **Monitoring**: What metrics should we track during rollout?
12. **Stakeholder Communication**: Who needs to be informed at each phase?

---

## Appendix: Key Code Locations

### Files to Review

| File | Lines | Key Sections |
|------|-------|--------------|
| `analyzer.ts` | ~8500 | `runFactHarborAnalysis` (entry normalization + orchestration), `understandClaim`, research loop, verdict generation |
| `verdict-corrections.ts` | ~589 | `detectCounterClaim`, `detectAndCorrectVerdictInversion` |
| `aggregation.ts` | - | Weighted averaging, de-duplication |
| `scopes.ts` | - | Canonicalization (lines referenced in plan) |

### Environment Variables

| Variable | Current | Proposed |
|----------|---------|----------|
| `FH_SEARCH_MODE` | `standard` | `standard` (default) or `grounded` (experimental; must pass Phase 0 gate) |
| `FH_FORCE_EXTERNAL_SEARCH` | - | `false` (override to force standard search for safety) |
| `FH_SHADOW_PIPELINE` | - | `true/false` (run hardened Option D in parallel without user impact) |
| `FH_SEARCH_ENABLED` | `true` | `true` (deterministic fallback path) |
| `LLM_PROVIDER` | `anthropic` | keep multi-provider; do not require Gemini-only for rollout |

---

## Contact & Feedback

**Plan Author**: AI Coding Assistant (Claude Sonnet 4.5)  
**Review Deadline**: TBD  
**Feedback Method**: Update this document or create issues in backlog

---

**Document Version**: 1.0  
**Last Updated**: January 16, 2026  
**Status**: Ready for Review
