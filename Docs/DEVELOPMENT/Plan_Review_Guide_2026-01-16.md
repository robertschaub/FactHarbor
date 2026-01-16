# FactHarbor Pipeline Redesign - Reviewer Guide

**Date**: January 16, 2026  
**Plan Document**: `Docs/DEVELOPMENT/Pipeline_Redesign_Plan_2026-01-16.md`  
**Status**: Ready for Review

---

## Executive Summary for Reviewers

This plan addresses **critical bugs** in the FactHarbor analysis pipeline that cause:
1. **Input neutrality failures**: Question vs statement inputs diverge by 7-39% (target < 5%)
2. **Missing scope detection**: TSE/STF contexts disappear intermittently
3. **Reduced claim generation**: 4-6 claims vs 10-12 in earlier runs
4. **Verdict inconsistency**: Identical inputs produce different results between runs

The root cause is **excessive pipeline complexity** (15+ LLM calls, fragile state management). The plan proposes a **4-phase migration** to a simplified architecture with 57% cost reduction and 56% latency improvement.

---

## Background Context

### Current System Status (v2.6.32)

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
   - Current_Status.md: v2.6.32 features and known gaps
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
6. **Migration Plan** (Part 6): 4 phases with testing criteria
7. **Risk Assessment** (Part 7): Current vs desired architecture risks
8. **Provider-Agnostic Design** (Part 8): Abstraction layer for multi-LLM support
9. **Success Metrics** (Part 9): Measurable targets for each phase

---

## Key Technical Decisions to Review

### Decision 1: Architecture Option Selection

**Proposed**: Option A (Monolithic LLM-Driven)
- Single LLM call with tool calling for search
- 3-5 LLM calls vs current 15-25
- 57% cost reduction, 56% latency improvement
- **Risk**: Requires tool calling (not all providers support)

**Alternatives**:
- Option B (Hybrid Pipeline): Simplified 3-stage with optional LLM search
- Option C (Minimal Changes): Fix bugs, keep existing architecture

**Review Question**: Is the 57% cost/speed improvement worth the risk of provider lock-in? (Mitigated by fallback to Option B)

### Decision 2: Scope Detection Preservation

**Proposed**: Guarantee ≥1 fact per pre-assigned scope in refinement prompt
- Current fix at lines 754-760 of `analyzer.ts` is good
- Prevents TSE/STF contexts from disappearing during fact sampling

**Review Question**: Is this sufficient, or do we need additional backstops?

### Decision 3: Gate1 Timing

**Proposed**: Move Gate1 from pre-research (line 3874) to post-research (line 8296)
- Don't filter claims before searching for evidence
- Apply Gate1 after facts extracted

**Review Question**: Will this increase LLM costs significantly? (Answer: ~5-10% more extraction calls, but better quality)

### Decision 4: Scope ID Stabilization

**Proposed**: Replace text similarity (lines 769-836) with deterministic hash
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

**Testing**: 20 question/statement pairs, target < 5% divergence

### Phase 2 Risks (Simplification)

**MEDIUM RISK** - Removes safety nets:
- Merge understand + supplemental: May miss edge cases
- Remove scope pruning: May create noise contexts
- Simplify deduplication: May merge distinct contexts

**Mitigation**: Compare claim counts on 50 diverse inputs

### Phase 3 Risks (LLM-Native Search)

**MEDIUM RISK** - Provider availability:
- Gemini Grounded Search: Available
- Perplexity: Available
- OpenAI/Anthropic: Not yet (planned)

**Mitigation**: Fallback to external search if unavailable

### Phase 4 Risks (Unified Architecture)

**HIGH RISK** - Major architectural change:
- Single LLM call may hit context limits
- Tool calling may not match quality
- Debugging complexity increases

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

### 3. Cost Reduction Claims

**Claim**: "57% cost reduction with unified architecture"

**Calculation**:
- Current: 10-27 LLM calls × avg $0.08/call = $0.80-$2.16
- Proposed: 3-5 LLM calls × avg $0.17/call = $0.51-$0.85
- **Savings: 57% at midpoint**

**Review**: Verify LLM call counts from job logs, validate cost assumptions

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
- Measure: verdict divergence (target < 5%)
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

### Phase 4 Testing (Unified)

**Regression Suite**:
- 100 diverse inputs
- Run both pipelines in parallel
- Compare: verdict accuracy, scope detection recall, input neutrality

**Review Question**: What's our acceptance criteria for rolling out unified pipeline?

---

## Estimated Timeline

| Phase | Duration | Effort | Risk |
|-------|----------|--------|------|
| **Phase 1** (Critical Fixes) | Week 1-2 | 3-4 days | LOW |
| **Phase 2** (Simplification) | Week 3-4 | 3-4 days | MEDIUM |
| **Phase 3** (LLM Search) | Week 5-6 | 4-5 days | MEDIUM |
| **Phase 4** (Unified) | Week 7-10 | 8-10 days | HIGH |
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

## Success Criteria for Plan Approval

1. **Input Neutrality**: Achieve < 5% verdict divergence (currently 7-39%)
2. **Scope Detection**: Detect 95%+ of distinct contexts (currently ~80%)
3. **Cost**: Reduce to < $0.50 per analysis (currently $1.50-2.50)
4. **Latency**: Achieve p95 < 45s (currently ~70s)
5. **Quality**: Maintain or improve verdict accuracy (no regression)

**Review Question**: Are these the right metrics? What else should we measure?

---

## Reviewer Action Items

### For Technical Review

1. **Verify claims**: Check job IDs, code line numbers, calculations
2. **Assess risks**: Evaluate migration risk ratings (LOW/MEDIUM/HIGH)
3. **Challenge assumptions**: Question cost/time estimates, test strategies
4. **Propose alternatives**: Suggest different approaches if concerns arise

### For Architectural Review

1. **Evaluate Option A** (Monolithic LLM-Driven) vs Option B (Hybrid)
2. **Assess provider coupling**: Is Gemini dependency acceptable?
3. **Review abstraction layer**: Will it handle all providers?
4. **Consider future extensions**: Does architecture support planned features?

### For Business Review

1. **Validate cost/benefit**: Is 57% savings worth 12-week effort?
2. **Assess risk tolerance**: Is HIGH risk phase acceptable?
3. **Review timeline**: Is 12 weeks aligned with roadmap?
4. **Evaluate alternatives**: Should we consider other options?

---

## Questions for Reviewers

### Critical Questions

1. **Input Neutrality**: Is < 5% divergence sufficient, or should we target < 3%?
2. **Migration Strategy**: Phase all 4 steps, or can we skip Phase 2/3 and go straight to Phase 4?
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
| `analyzer.ts` | 8500 | Entry normalization (7808-7821), Understand (2969-3950), Research (4488-4700), Verdict (5400-5700) |
| `verdict-corrections.ts` | 589 | Counter-claim detection (155-220), Verdict inversion (82-150) |
| `aggregation.ts` | - | Weighted averaging, de-duplication |
| `scopes.ts` | - | Canonicalization (lines referenced in plan) |

### Environment Variables

| Variable | Current | Proposed |
|----------|---------|----------|
| `FH_USE_UNIFIED_PIPELINE` | - | `false` (Phase 4 flag) |
| `FH_FORCE_EXTERNAL_SEARCH` | - | `false` (Phase 3 override) |
| `LLM_PROVIDER` | `anthropic` | `google` (for Phase 3 grounded search) |

---

## Contact & Feedback

**Plan Author**: AI Coding Assistant (Claude Sonnet 4.5)  
**Review Deadline**: TBD  
**Feedback Method**: Update this document or create issues in backlog

---

**Document Version**: 1.0  
**Last Updated**: January 16, 2026  
**Status**: Ready for Review
