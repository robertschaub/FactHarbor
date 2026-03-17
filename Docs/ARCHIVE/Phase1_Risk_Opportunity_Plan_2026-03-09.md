# Phase 1 Fixes — Risk vs. Opportunity Assessment & Deployment Plan

**Date:** 2026-03-09
**Author:** Lead Architect (Cline, Claude Sonnet 4)
**Status:** Awaiting Captain decision
**Context:** Phase 1 of `Report_Quality_Analysis_2026-03-08.md` — 5 fixes implemented, not yet committed. This document provides a balanced risk-opportunity analysis and proposes a staged deployment strategy.

---

## 1. Risk vs. Opportunity Matrix

### B1: Seed Evidence Enrichment (RC-1)

| Dimension | Rating | Detail |
|-----------|--------|--------|
| **Opportunity** | ★★★★★ | Addresses root cause of 4/5 Captain issues. Restores metadata to 28-70% of evidence that was invisible to clustering, balance checks, and source-type routing. |
| **Risk** | ★★☆☆☆ | Stub `evidenceScope` creates a "seeded mega-boundary" — all stub-scoped items cluster together. `allClaimsSufficient` exclusion of `isSeeded` items is a new gate that could interact with edge cases. |
| **Net** | **Strong positive** | Highest-leverage fix. Risk is well-understood and the known trade-off (mega-boundary) is strictly better than the current random `boundaries[0]` assignment. |

**Proposal:** ✅ **Commit as-is.** Monitor seeded mega-boundary size in first 3 validation runs. If it exceeds 50% of total evidence in any run, escalate to Option 1B (re-extract through Stage 2).

---

### B2: Boundary Fallback Assignment (RC-2)

| Dimension | Rating | Detail |
|-----------|--------|--------|
| **Opportunity** | ★★★☆☆ | Eliminates the `b32cbcaf`-type anomaly (39 Brazilian items in U.S. boundary). Safety net for any remaining scopeless items after B1. |
| **Risk** | ★☆☆☆☆ | Deterministic algorithm, well-tested. "Largest boundary" heuristic is a sensible default — worst case is equivalent to current behavior (items in wrong boundary), but now predictable. |
| **Net** | **Clear positive** | Low risk, meaningful safety net. Nearly redundant after B1 but protects against edge cases. |

**Proposal:** ✅ **Commit as-is.** No conditions or monitoring needed beyond standard validation.

---

### B3: Verdict Prompt — Factual vs. Positional Output Distinction (RC-3)

| Dimension | Rating | Detail |
|-----------|--------|--------|
| **Opportunity** | ★★★★☆ | Addresses the 15-40pp verdict degradation from U.S. political evidence. Generic, applies to any domain. |
| **Risk** | ★★☆☆☆ | **Reduced from original.** Revised prompt is more balanced — removes absolute "LOW regardless" language, removes directive to force `evidenceDirection: neutral`, removes speculative institutional-change paragraph. Focuses on the core analytical insight. |
| **Net** | **Positive with acceptable risk** | High upside on political topics, low regression risk on data-heavy topics due to explicit preservation of factual outputs. |

**Revision applied (2026-03-09).** Original 3-bullet prompt replaced with a more balanced 2-bullet version:

**Changes from original:**
1. **Removed** "LOW regardless of source's reliability rating" → replaced with "weigh them primarily as indicators of that institution's position" (softer, lets LLM reason)
2. **Removed** directive to set `evidenceDirection: neutral` → instead asks LLM to "assess whether it provides factual counter-evidence or merely expresses political disagreement" (analytical question, not directive)
3. **Removed** institutional-change paragraph entirely → too speculative, low value-add, risk of over-application. Deferred to Phase 2 (SR cache TTL addresses this more robustly)
4. **Added** explicit examples of factual outputs (statistical publications, field measurements) to protect against over-classification

**Proposal:** ✅ **Commit with standard validation** (no longer needs 3-topic spread — reduced risk warrants simpler validation):
1. Bolsonaro 3× (target case — should see improvement)
2. Iran nukes 1× (control — should not regress)

**Rollback path:** Remove the 2 prompt bullet points. Zero code impact.

---

### B4: AUTO Mode — Stop on First Success (RC-5)

| Dimension | Rating | Detail |
|-----------|--------|--------|
| **Opportunity** | ★★★☆☆ | Reduces run-to-run variance from provider mixing. Cleaner evidence pool per run. |
| **Risk** | ★★☆☆☆ | **Revised down.** Supplementary providers (Wikipedia, Semantic Scholar, Google Fact-Check) are not yet implemented — the gating logic for them is future-proofing, not an active regression. The real change is: primary AUTO mode stops after first successful provider instead of filling remaining slots from fallbacks. |
| **Net** | **Clear positive** | Eliminates the main source of provider-mix variance without losing any currently-available evidence diversity. |

**Captain correction (2026-03-09):** Wikipedia, Semantic Scholar, and Google Fact-Check providers are not yet implemented. The `shouldRunSupplementaryProviders` gate in the implementation is correct future-proofing — it will run supplementary providers as fallback when primaries fail once they exist. No modification needed.

**Proposal:** ✅ **Commit as-is.** The primary-provider stop-on-first-success is the only active behavioral change.

---

### B5: Clustering Temperature 0.15 → 0.05 (RC-6)

| Dimension | Rating | Detail |
|-----------|--------|--------|
| **Opportunity** | ★★☆☆☆ | Reduces boundary structural variance. Cosmetic improvement — boundary names/count more stable between runs. |
| **Risk** | ★☆☆☆☆ | UCM-configurable, instantly reversible. Near-zero temperature is appropriate for structural decisions. |
| **Net** | **Minor positive** | Low effort, low risk, low reward. Worth doing. |

**Proposal:** ✅ **Commit as-is.** UCM-configurable means zero rollback friction.

---

## 2. Deployment Strategy

Based on the risk-opportunity analysis, I recommend a **two-stage commit** approach:

### Stage 1: ✅ DONE — Code fixes (B1 + B2 + B5)

**Committed:** `27c4ef44` — `fix(pipeline): enrich seeded evidence metadata, fix boundary fallback, lower clustering temp`

### Stage 2: Commit B3 (prompt) + B4 (search) together

**Rationale:** Both B3 and B4 are now low-risk. B4 is a clean code fix (no supplementary provider concern). B3 is a balanced prompt revision. Committing together reduces overhead.

**Commit message:** `fix(pipeline): verdict factual-vs-positional guidance, AUTO mode stop on first success`

**Validation after commit:** Run Bolsonaro 3× + Iran 1×. Check:
- [ ] No evidence items with empty `sourceType`, `claimDirection`, or `evidenceScope` (B1 validation)
- [ ] No boundary with >30 items (B2 validation)
- [ ] U.S. political evidence boundary (if present) does not drag truth below 70 (B3 validation)
- [ ] Single primary search provider per run in logs (B4 validation)
- [ ] Iran truth stable within ±5pp of pre-fix baseline (B3 regression check)

---

## 3. Decision Summary for Captain

| # | Fix | Proposal | Captain Action |
|---|-----|----------|----------------|
| B1 | Seed enrichment | ✅ **Committed** (27c4ef44) | Done |
| B2 | Fallback assignment | ✅ **Committed** (27c4ef44) | Done |
| B5 | Clustering temp | ✅ **Committed** (27c4ef44) | Done |
| B4 | AUTO mode | ✅ Commit as-is (Stage 2) | Approve |
| B3 | Verdict prompt (revised) | ✅ Commit with validation (Stage 2) | Approve |

### Open question: .env.example concurrency

The committed `.env.example` change (`FH_RUNNER_MAX_CONCURRENCY=4→1`) was for investigation. Should it be reverted to 3 (production default) before next deployment?

---

## 4. Post-Deployment Monitoring

After all stages are committed and deployed:

1. **First 10 reports on production:** Compare truth spread and boundary structure against pre-fix baseline (Section 2.1 of the consolidated plan)
2. **Watch for:** Seeded mega-boundary dominating reports (>50% of evidence) — triggers Option 1B upgrade
3. **Watch for:** Government data/statistics being classified as "positional outputs" — triggers prompt refinement
4. **Watch for:** Thinner evidence pools on topics where multiple search providers previously contributed — indicates B4 diversity loss

---

## Appendix: Relationship to Phase 2/3

This plan covers Phase 1 only. Phase 2 (claim stability gate, decomposition guidance, STF/TSE evaluation, SR cache TTL, scope normalization) and Phase 3 (multilingual quality, re-extraction upgrade, self-consistency review, SR temporal windowing) remain as specified in `Report_Quality_Analysis_2026-03-08.md`. The Phase 1 validation results will inform whether Phase 2 priorities need adjustment.
