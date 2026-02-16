# LLM Call Optimization: Goals Decision Proposal (WIP)

**Date**: 2026-02-12
**Status**: Draft for review (no implementation yet)
**Scope**: Orchestrated pipeline LLM call efficiency/cost optimization

---

## Senior Architect Review — 2026-02-12

**Context**: This review follows completion of the LLM Intelligence Migration (5 phases complete, all deterministic text-analysis logic replaced with LLM-powered intelligence). The migration increased LLM call count but improved semantic accuracy. This proposal addresses the natural next step: optimizing the expanded LLM surface.

**Overall Assessment**: ✅ **APPROVED with recommendations**. The proposal is well-structured, appropriately conservative, and addresses the right concerns. Key strengths: clear guardrails, measurable targets, risk-aware packaging. Recommendations below.

---

## 1) Decision Purpose

Decide **what we optimize for first** before changing pipeline behavior:

1. Cost reduction
2. Latency reduction
3. Quality stability (verdict/grounding/evidence)
4. Reliability under provider/schema failures
5. Maintainability and observability

This document defines candidate goals, measurable targets, tradeoffs, and recommended goal sets.

---

## 2) Guardrails (Non-Negotiable)

Any optimization must preserve:

1. No stage skipping (Understand -> Research -> Verdict)
2. Input neutrality behavior
3. Evidence transparency
4. Quality gate behavior
5. No hidden deterministic semantic fallbacks

**🏛️ Architect Notes**:
- ✅ These guardrails directly align with AGENTS.md mandatory rules
- ✅ #5 is critical — the Intelligence Migration just eliminated all deterministic semantic fallbacks; we must not reintroduce them as "optimization"
- ⚠️ Add explicit guardrail: **"No re-introduction of keyword lists, stop-word filters, or regex-based semantic classification"** — make it unmissable for implementers
- ✅ Input neutrality preservation is measurable via existing `input-neutrality.test.ts` suite

---

## 3) Goal Candidates (with Metrics)

| Goal ID | Goal | Metric | Target (candidate) |
|---|---|---|---|
| G1 | Reduce LLM cost | Mean LLM tokens/cost per report | -25% to -40% |
| G2 | Reduce runtime | P95 analysis duration | -15% to -30% |
| G3 | Preserve quality | Verdict drift vs baseline benchmark | <= 3% |
| G4 | Preserve grounding | Grounding ratio / warning rate | Non-inferior |
| G5 | Improve robustness | Structured-output failure rate | -20%+ |
| G6 | Keep operations clear | Debuggability / traceability | No loss in per-step diagnostics |

**🏛️ Architect Notes**:
- ✅ G1-G2 targets are ambitious but achievable with proper batching + caching
- ✅ G3 drift threshold (3%) aligns with existing input-neutrality tolerance (4%) — consistent
- ⚠️ **Missing goal**: G7 — Multilingual robustness preservation. Any optimization must not regress non-English analysis quality. Add metric: "Verdict drift on French/German test cases <= 3%"
- ✅ G6 is critical for debugging production issues — do not sacrifice observability for efficiency
- 💡 **Recommendation**: Add G8 — "Model tier adherence" — ensure cheap models (Haiku) stay on cheap tasks, expensive models (Opus/Sonnet) only where needed

---

## 4) Optimization Packages to Choose From

| Package | Description | Complexity | Timing | Expected Savings | Drawbacks | Risks |
|---|---|---:|---:|---:|---|---|
| P1 Conservative | Tiering + prompt tightening + caching only (no call merge) | Medium | 1-2 weeks | 10-25% | Lower ceiling | Fewer gains if workload has little repetition |
| P2 Balanced | P1 + merge selected low-risk calls (Understand/classification) | Medium-High | 2-4 weeks | 20-35% | Larger prompt/schema | Structured output fragility on merged call |
| P3 Aggressive | P2 + broad call consolidation incl. evidence batching | High | 4-7 weeks | 30-50% | Highest complexity, harder debugging | Quality drift, attribution mistakes, retry coupling |

**🏛️ Architect Notes**:
- ✅ **P2 Balanced is the right choice** for v1.0 optimization. Reasons:
  1. Recent intelligence migration already batched many calls (search relevance, text similarity, grounding) — P2 builds on that foundation
  2. P1 gains (10-25%) likely insufficient to justify effort — caching alone won't get us there without repetition
  3. P3 risks are too high pre-v1.0 — attribution mistakes would undermine core transparency guarantee
- 💡 **P2 implementation strategy**:
  - ✅ Already batched: search relevance (6 sites → 1 batch per site), text similarity (15+ → batched), grounding (per-claim → batch)
  - 🎯 Next targets: Understand phase (merge claim extraction + context detection), verdict correction (batch counter-claim detection)
  - ⚠️ Do NOT batch evidence extraction — maintaining per-source attribution is non-negotiable
- 📊 **Timing reality check**: 2-4 weeks assumes no schema redesign. If Zod schemas need restructure, add 1 week buffer.

---

## 5) Proposed Goal Set (Recommended)

### Recommendation: **Balanced Goals (P2 path)**

Priority order:

1. **Primary**: G3 + G4 (quality and grounding non-regression)
2. **Secondary**: G1 (cost)
3. **Tertiary**: G2 + G5 (latency and reliability)
4. **Always-on**: G6 (maintainability/diagnostics)

Proposed acceptance thresholds:

1. Verdict drift <= 3% on benchmark corpus
2. Grounding warning rate not worse than baseline
3. LLM cost/token reduction >= 20%
4. P95 runtime reduction >= 10%
5. Structured-output failure rate <= baseline

**🏛️ Architect Notes**:
- ✅ **Priority order is correct** — quality-first approach aligns with POC-to-production maturity stage
- ✅ 20% cost/token reduction is the right floor — anything less doesn't justify optimization risk
- ⚠️ **Add threshold #6**: Input neutrality drift <= 4% (test with `input-neutrality.test.ts` suite)
- ⚠️ **Add threshold #7**: Multilingual verdict drift <= 3% (test on French/German cases from test corpus)
- 💡 **Proposed threshold #8**: Model tier compliance >= 95% (Haiku on extract/classify, Sonnet on verdict/understand only)
- 📊 **Reality check on #4 (P95 runtime -10%)**: This is achievable ONLY if batching reduces sequential LLM round-trips. If batching just moves work within same round-trip count, latency won't improve. Be prepared to drop this if parallelization doesn't increase.

---

## 6) Baseline Measurement Required Before Any Change

Collect baseline on a fixed benchmark suite:

1. Mean and P95 total runtime
2. Mean LLM calls per report
3. Mean input/output tokens per phase
4. Verdict distribution + drift fingerprint
5. Grounding ratio / warning counts
6. Structured-output failure frequency

Without baseline, optimization impact cannot be judged safely.

**🏛️ Architect Notes**:
- ✅ Baseline collection is mandatory — no shortcuts
- 💡 **Add to baseline**: #7 — Input neutrality divergence (Q vs S form) per test case
- 💡 **Add to baseline**: #8 — Multilingual verdict stability (English vs French vs German on same claim)
- 💡 **Add to baseline**: #9 — Model tier usage breakdown (% calls on Haiku vs Sonnet vs Opus)
- 🎯 **Benchmark corpus selection**:
  - Include all test cases from `input-neutrality.test.ts` (covers Q/S neutrality)
  - Include >=5 French and >=5 German test cases (multilingual robustness)
  - Include >=3 multi-context cases (context separation quality)
  - Include >=2 counter-claim cases (counter-claim detection accuracy)
  - Total corpus size: 20-30 cases minimum for statistical validity
- 📊 **Instrumentation**: Use existing `state.llmCalls` counter + add per-phase token tracking (modify `recordLLMCall` in budget-tracker.ts)
- ⚠️ **Storage**: Baseline results MUST be committed to git (e.g., `test/benchmarks/baseline-v2.11.0.json`) for reproducibility

---

## 7) Risks by Goal

| Risk | Trigger | Impact | Mitigation |
|---|---|---|---|
| R1 Quality drift | Over-consolidated prompts | Wrong/mixed verdict shifts | Shadow-mode A/B + strict drift gate |
| R2 Grounding drop | Fewer/simplified reasoning passes | Less evidence-linked verdicts | Keep grounding gate independent |
| R3 Failure amplification | One merged call fails where two used to recover | Higher retry/cascade failures | Separate retries + circuit metrics |
| R4 Attribution blur | Batched extraction across sources | Weaker source-to-claim traceability | Strict per-source evidence IDs/contracts |
| R5 Debug loss | Fewer distinct stages | Harder RCA | Add structured telemetry at sub-step level |

**🏛️ Architect Notes**:
- ⚠️ **R4 is the highest-severity risk** — attribution blur breaks the core transparency guarantee. **Mitigation must be ironclad**:
  - DO NOT batch evidence extraction across different sources
  - Each source MUST get its own extraction call with source ID in prompt
  - Evidence schema MUST enforce `sourceId` + `sourceUrl` non-null validation
  - Test coverage: add explicit attribution tests (verify each evidence item traces to exactly one source)
- ⚠️ **Add R6**: Schema fragility — merged calls use larger Zod schemas which are more prone to LLM schema violations
  - **Mitigation**: Use schema simplification (fewer optional fields), add `catch()` fallbacks, implement graceful degradation
- ⚠️ **Add R7**: Multilingual regression — consolidated prompts may favor English phrasing, degrading non-English quality
  - **Mitigation**: Include multilingual test cases in shadow-mode, add explicit language-agnostic prompt instructions
- ✅ R5 mitigation is critical — use structured debug events (e.g., `debugLog` with phase/step/decision tags) to maintain RCA capability
- 💡 **R3 amplification specifics**: If merging 3 calls into 1, and the merged call fails, you've lost 3x value. Counter-measure: implement **partial success extraction** — if LLM returns malformed JSON, attempt to parse individual fields rather than failing entirely.

---

## 8) Review Questions (Approval Gate)

**🏛️ Senior Architect Responses**:

1. Goal order: Quality first, then cost, then latency? → **YES** ✅
   - Rationale: POC-to-production transition demands quality stability. Cost optimization without quality regression is the only acceptable path.

2. Candidate package: Start with P2 Balanced? → **YES** ✅
   - Rationale: P1 gains insufficient, P3 risks too high. P2 builds on recent intelligence migration batching foundation.

3. Drift threshold <= 3% acceptable? → **YES** ✅
   - Rationale: 3% aligns with input-neutrality tolerance (4%). Acceptable for optimization, but must be measured rigorously.

4. Minimum savings target >= 20% cost/token for phase approval? → **YES** ✅
   - Rationale: Lower savings don't justify optimization risk + effort. 20% is the right floor for go/no-go decision.

5. Require shadow-mode benchmark before rollout? → **YES** ✅ (MANDATORY)
   - Rationale: No production deployment without shadow-mode validation. Non-negotiable safety gate.

**🏛️ Additional Approval Requirements**:

6. Add multilingual drift threshold (French/German <= 3%)? → **YES** ✅ (MANDATORY)
   - Rationale: AGENTS.md multilingual robustness is a mandatory rule. Any optimization that favors English is a violation.

7. Add input neutrality preservation threshold (<= 4%)? → **YES** ✅ (MANDATORY)
   - Rationale: Input neutrality is a core guarantee. Use existing `input-neutrality.test.ts` suite for validation.

8. Prohibit batching evidence extraction across sources (attribution integrity)? → **YES** ✅ (MANDATORY)
   - Rationale: Per-source attribution is non-negotiable. R4 (attribution blur) is the highest-severity risk.

9. Require baseline results committed to git before any optimization work? → **YES** ✅ (MANDATORY)
   - Rationale: Reproducibility demands version-controlled baselines. Store in `test/benchmarks/baseline-v{version}.json`.

10. Implement partial success extraction for merged calls (R3 mitigation)? → **YES** ✅ (RECOMMENDED)
    - Rationale: Graceful degradation reduces failure amplification risk. Parse individual fields when full schema fails.

---

## 9) Next Step After Goal Approval

If approved, prepare `Phase_Execution_Plan` with:

1. Exact call sites to optimize
2. Model-tier/caching strategy per call site
3. Rollout flags and fallback behavior
4. Benchmark protocol and go/no-go checklist

**🏛️ Architect Notes — Execution Plan Requirements**:

### Phase Execution Plan MUST Include:

**A. Call Site Inventory**:
- List ALL LLM calls in orchestrated.ts with current model tier, token count estimate, batching status
- Classify each call: `already_batched` | `merge_candidate` | `keep_separate` | `cache_candidate`
- Prioritize by: (impact × safety) ranking

**B. Already-Batched Calls (v2.11.0 Intelligence Migration)**:
- ✅ `assessSearchRelevanceBatch` (6 call sites → batched per-site)
- ✅ `assessTextSimilarityBatch` (15+ call sites → batched)
- ✅ `extractKeyTermsBatch` (grounding check → batched)
- ✅ `assessSearchRelevanceBatch` (search relevance → batched)
- **Action**: Verify these are properly batched, measure baseline efficiency

**C. High-Priority Merge Candidates (P2 Balanced)**:
1. **Understand phase**: Merge claim extraction + context detection into single call
   - Current: 2 separate calls (understand → extract claims, detect contexts)
   - Proposed: 1 merged call with combined schema
   - Risk: Medium (schema complexity, failure amplification)
   - Savings: ~15-25% of understand phase cost

2. **Counter-claim detection**: Batch across all claims
   - Current: Per-claim `detectCounterClaim` calls
   - Proposed: Batch all claims into single `detectCounterClaimsBatch`
   - Risk: Low (already independent per-claim decisions)
   - Savings: ~10-15% of verdict phase cost

3. **Context similarity**: Already batched, verify efficiency
   - Current: `assessContextSimilarity` uses batched LLM
   - Action: Audit batch sizes, ensure no redundant calls

**D. DO NOT MERGE (Attribution/Quality Risks)**:
- ❌ Evidence extraction (NEVER batch across sources — attribution integrity)
- ❌ Verdict generation (quality-critical, must remain per-claim with full context)
- ❌ Source reliability evaluation (per-source decisions, already cached)

**E. Caching Strategy**:
- ✅ Source reliability (already cached via `source-reliability.db`)
- 🎯 Add: Context similarity cache (contexts with same metadata/subject → cached similarity)
- 🎯 Add: Search relevance cache (same URL + entity + context → cached classification)
- ⚠️ Cache invalidation: Version-based (cache key includes prompt version hash)

**F. Rollout Plan**:
1. **Week 1**: Baseline measurement + commit to git
2. **Week 2**: Implement merge candidates with feature flags (`FH_OPT_MERGE_UNDERSTAND`, `FH_OPT_BATCH_COUNTERCLAIM`)
3. **Week 3**: Shadow-mode testing (parallel execution, compare results, no production use)
4. **Week 4**: Go/no-go decision based on drift thresholds
5. **Week 5**: Gradual rollout (10% → 50% → 100% traffic) with circuit breaker

**G. Go/No-Go Checklist**:
- [ ] Baseline collected and committed to git
- [ ] All acceptance thresholds met (drift, cost, latency, multilingual, input neutrality)
- [ ] Attribution integrity tests passing
- [ ] Structured-output failure rate <= baseline
- [ ] Shadow-mode validation on >=20 test cases
- [ ] Rollback plan documented and tested
- [ ] Observability metrics in place (per-phase tokens, model tier compliance)

**H. Observability Requirements**:
- Add `debugLog` events for each merged call with: input size, output size, model used, duration, success/failure
- Track batch efficiency: items_per_batch, batch_utilization_rate
- Alert on: drift > 5%, failure_rate > 2x baseline, cost > baseline

---

## 10) Senior Architect Recommendation Summary

**APPROVED** ✅ for Phase Execution Plan development with the following mandatory additions:

1. **Add to Guardrails**: "No keyword lists, stop-word filters, or regex semantic classification"
2. **Add Goals**: G7 (multilingual), G8 (model tier compliance)
3. **Add Thresholds**: Input neutrality <= 4%, multilingual drift <= 3%
4. **Add Risks**: R6 (schema fragility), R7 (multilingual regression)
5. **Mandatory**: Shadow-mode validation before ANY production deployment
6. **Mandatory**: Baseline committed to git before optimization work begins
7. **Prohibited**: Batching evidence extraction across sources (attribution integrity)

**Next Action**: Create `LLM_Call_Optimization_Execution_Plan.md` with call site inventory, merge strategy, and rollout protocol per section 9 requirements above.

**Timeline Estimate**: 4-5 weeks (2-4 weeks implementation + 1 week validation)

**Success Criteria**: >=20% cost reduction, <=3% drift, 100% attribution integrity, multilingual stable

---

**Review completed by**: Senior Software Architect
**Date**: 2026-02-12
**Status**: ✅ APPROVED with mandatory additions above

