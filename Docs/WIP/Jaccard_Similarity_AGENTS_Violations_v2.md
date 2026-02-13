# Jaccard Similarity AGENTS.md Violations Report (Corrected)

**Date**: 2026-02-12 (v2 — corrected per reviewer feedback)
**Severity**: HIGH
**Status**: Phase 1 RESOLVED (2026-02-12). Remaining violations in Phases 2-4.

---

## Summary

Primary analysis paths use LLM-powered similarity. Active violations are **deterministic semantic fallback paths** that use Jaccard similarity when LLM fails, and **deterministic semantic generators** (regex-based inverse query generation).

---

## Phase 1: assessTextSimilarityBatch — ✅ DONE (2026-02-12)

Jaccard fallback removed from `orchestrated.ts`. Replaced with retry (3 attempts, exponential backoff) + neutral fail-safe (0.5 default). Tests: 14/14 passing, full suite 869/872 (3 pre-existing).

**Neutral fail-safe behavior**: Frame signal → contexts collapse to one (conservative). Claim clustering → claims stay distinct. Context dedup → mid-range threshold behavior.

---

## Phase 2: Evidence Deduplication Fallback — PENDING

**File**: `apps/web/src/lib/analyzer/evidence-deduplication.ts:110`
**Violation**: `EvidenceDeduplicator.isDuplicate` falls back to Jaccard when constructed without LLM function.
**Fix**: Remove non-LLM constructor path. Always require `assessTextSimilarityBatch`. If LLM unavailable, skip dedup (keep all evidence).
**Effort**: ~1h

---

## Phase 3: Context Canonicalization Fallback — PENDING

**File**: `apps/web/src/lib/analyzer/analysis-contexts.ts:317-328`
**Violation**: Structural Jaccard similarity fallback in context merging.
**Fix**: Replace with call to `assessTextSimilarityBatch`. If LLM unavailable, return neutral scores (0.5).
**Effort**: ~1h

---

## Phase 4: Inverse Query Generation Audit — PENDING

**Target**: `generateInverseClaimQuery` in `orchestrated.ts`
**Violation**: Regex-based semantic inversion affects search routing.
**Fix**: Replace with LLM-powered query reformulation.
**Effort**: Scope unclear

---

## Efficiency Controls (All Phases)

1. Batch size caps: max 20 pairs/call (configurable)
2. Retry with backoff: 3 attempts, 100/200/400ms
3. Schema validation: array length + score range 0-1
4. Cache key: `hash(textA + "|" + textB)`
5. Neutral fail-safe: 0.5 when all retries exhausted
6. Circuit breaker: >50% failures → neutral defaults for remainder

**Total remaining effort**: ~3-4h for Phases 2-4
