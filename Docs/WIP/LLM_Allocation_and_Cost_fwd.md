# LLM Allocation & Cost — Pending Items

**Created:** 2026-03-17 (extracted from WIP Consolidation #6)
**Status:** Active — forward-looking items from archived allocation/cost documents

---

## 1. LLM Model Allocation — Pending Recommendations

**Source:** `ARCHIVE/LLM_Model_Allocation_Review_2026-03-15.md`

Shipped: Rec-A (Pass 2 → Haiku), Rec-C (getModel literal fix). Pending:

### Rec-B: TIGERScore to Haiku (deferred)
- Current: TIGERScore evaluation uses Sonnet (verdict tier)
- Proposed: Switch to Haiku — TIGERScore is a structured rubric scoring task, not deep reasoning
- Risk: May reduce scoring nuance. Needs quality comparison (run 5 paired TIGERScore evaluations)
- Estimated saving: ~$0.01/job (small, but TIGERScore runs per-claim)

### Rec-D: Batch Prompts Investigation (deferred)
- Anthropic Batch API could reduce cost 50% for non-latency-sensitive calls
- Applicable to: self-consistency calls (2 per claim), TIGERScore, verdict narrative
- Requires: Batch API support in AI SDK, queue management, result collection
- Estimated saving: 15-25% of total LLM cost if all eligible calls batched

### 16-Slot LLM Call Inventory (reference)
The review documented all 16 LLM call sites in the pipeline with model, tier, and cost per call.
Full inventory in `ARCHIVE/LLM_Model_Allocation_Review_2026-03-15.md`.

## 2. Multi-Source Evidence Retrieval — Pending Phases

**Source:** `ARCHIVE/Multi-Source_Evidence_Retrieval_Plan.md`

Phases 1-4 complete (Wikipedia, Semantic Scholar, Google Fact Check providers, config wiring). Pending:
- Phase 3.2-3.6: Fact Check API pipeline integration (wire into claimboundary research loop)
- Phase 4b: UCM hardcoded values (move remaining hardcoded search params to UCM)
- Phase 4c: Admin UI forms for new provider configuration

## 3. Alpha Acceleration — Remaining Phases (deferred)

**Source:** `ARCHIVE/Alpha_Phase_Acceleration_Plan_2026-02-25.md`

Phase 1 (observability) done. Phase 1.2 (model auto-resolution) in progress via `WIP/Model_Auto_Resolution_Plan.md`. Deferred phases:
- Phase 2: Quality measurement automation (calibration runner integration)
- Phase 3: Cost optimization sprint (batch API, token reduction)
- Phase 4: Public alpha preparation (rate limiting done, cost quotas not done)

Success metrics table (still valid):
- Evidence quality: ≥80% high-probative items
- Verdict stability: ≤15pp spread on repeated runs
- Cost per analysis: target <$0.30

---

## Related Active Documents

- `WIP/API_Cost_Reduction_Strategy_2026-02-13.md` — Batch API and NPO credit strategies
- `WIP/Model_Auto_Resolution_Plan.md` — consumer wiring for model-resolver.ts
