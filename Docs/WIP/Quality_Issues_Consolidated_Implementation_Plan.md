# Quality Issues — Consolidated Implementation Plan

**Date:** 2026-02-12
**Status:** ✅ Steps 1-4 DONE (2026-02-12) / 🧭 Step 5 pending (telemetry & hardening)
**Based on:** Multi-agent investigation synthesis ([archived](../ARCHIVE/Quality%20Issues%20Investigations%20and%20Plan.md))

---

## Issues Addressed

| Issue | Root Cause | Fix Applied | Step |
|-------|-----------|-------------|------|
| **Classification Fallbacks** (22/analysis) | Runtime prompt missing field instructions (prompt-schema drift) | Prompt alignment + schema enforcement (`.optional()` removed) | Steps 2-3 |
| **Low Grounding Ratios** (30-35%) | Missing citations + substring matching | Citation hydration + LLM-powered adjudication (`adjudicateGroundingBatch`) | Steps 1, 4 |
| **Verdict Direction Mismatches** | Scope mismatch (evidence direction vs sub-claim) | Auto-correct disabled + LLM per-claim direction validation (`batchDirectionValidationLLM`) | Steps 1, 4 |

---

## Completed Steps (1-4)

**Step 1** (Code fixes): Disabled auto-correct, fixed warning messages, added citation hydration, added prompt hash to result meta.

**Step 2** (Prompt alignment): Ported classification instructions (sourceAuthority, evidenceBasis, probativeValue) to `orchestrated.prompt.md`. Added anti-pattern examples to VERDICT section.

**Step 3** (Schema enforcement): Removed `.optional()` from 3 classification fields in Zod schema.

**Step 4** (LLM replacements): Replaced substring grounding with `adjudicateGroundingBatch()` (Haiku). Added `batchDirectionValidationLLM()` (Sonnet). Added degraded mode (fallback 0.5 + warning). UCM-configurable `groundingPenalty` section. Cost: ~$0.016/analysis increase.

---

## Step 5: Telemetry & Hardening — NOT STARTED (~2-3h)

| Task | File | Time |
|------|------|------|
| Add telemetry: fallback rate, citation rate, grounding ratio | orchestrated.ts | 1h |
| Add regression tests for classification scenarios | test/unit/ | 1h |
| Add deprecation notice to extract-evidence-base.ts | extract-evidence-base.ts | 15min |
| Update documentation | Various | 45min |

**Metrics to track:**
- `classification_fallback_rate`: Target <5%
- `missing_citation_rate`: Target <10%
- `grounding_ratio_avg`: Target 60-80%
- `direction_mismatch_rate`: Target <5%

---

## Success Criteria

| Metric | Before | Target |
|--------|--------|--------|
| evidenceBasis fallbacks/analysis | 22 (~25%) | <2 (<5%) |
| Grounding ratio | 30-35% | 60-80% |
| Missing citations | 28.6% | <10% |
| Verdict auto-corrections | Multiple | 0 (warning-only) |

**Next Action:** Step 5 implementation
