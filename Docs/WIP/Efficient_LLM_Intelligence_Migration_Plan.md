# Efficient LLM Intelligence Migration Plan

**Status**: 🔧 Phase 0 mostly done; Phases 1-4 pending
**Priority**: Critical
**Date**: 2026-02-11 | **Updated**: 2026-02-12
**Reviews**: Senior Architect + LLM Expert (APPROVED), Lead Architect (APPROVED WITH ADJUSTMENTS)

---

## Objective

Migrate all deterministic text-analysis decision logic to LLM-based intelligence per AGENTS.md § LLM Intelligence. Keep only structural plumbing (validation, hashing, formatting, routing).

---

## Phase 0 Status (Mostly Done)

**Completed:**
- ✅ `inferContextTypeLabel` hardcoded patterns removed (Brazil-specific "tse"/"stf" regex eliminated)
- ✅ New violating code DELETED: `stemTerm()`, `MODIFIER_CONTEXT_WORDS`, `ENTITY_STOPWORDS`
- ✅ Function inventory verified and classified
- ⏳ Uncommitted normalization changes — awaiting commit

---

## Function Inventory (19 remaining violations)

### P1 — Replace (10 functions)

| Function | Location | Purpose |
|----------|----------|---------|
| `calculateTextSimilarity` | `orchestrated.ts:2131` | Jaccard text similarity (5 semantic call sites) |
| `calculateContextSimilarity` | `orchestrated.ts:2203` | Weighted multi-field Jaccard |
| `calculateTextSimilarity` | `analysis-contexts.ts:256` | Jaccard for context name dedup |
| `calculateSimilarity` | `evidence-filter.ts:153` | Jaccard for evidence dedup |
| `extractCoreEntities` | `analysis-contexts.ts:348` | Proper noun regex (1 call remaining) |
| `isRecencySensitive` | `orchestrated.ts:2661` | Keyword recency detection |
| `countVaguePhrases` | `evidence-filter.ts:74` | Pattern-based vagueness detection |
| `hasAttribution` | `evidence-filter.ts:99` | Pattern-based attribution check |
| `hasLegalCitation` | `evidence-filter.ts:114` | Pattern-based legal citation check |
| `hasTemporalAnchor` | `evidence-filter.ts:137` | Pattern-based temporal anchor check |

### P2 — Replace (8 functions)

| Function | Location | Purpose |
|----------|----------|---------|
| `extractKeyTerms` | `grounding-check.ts:88` | Stopword-based extraction |
| `STOP_WORDS` | `grounding-check.ts:64` | Pre-existing stopword list |
| `COMMON_STOPWORDS` + `tokenizeForMatch` | `orchestrated.ts:478` | Search relevance tokenization |
| `checkSearchResultRelevance` | `orchestrated.ts:736` | Heuristic search relevance |
| `isClaimAlignedWithThesis` | `verdict-corrections.ts:72` | Keyword alignment check |
| `extractComparativeFrame` | `verdict-corrections.ts:180` | Regex frame extraction |
| `detectCounterClaim` | `verdict-corrections.ts:51` | Heuristic counter-claim detection |
| `generateInverseClaimQuery` | `orchestrated.ts` | Regex-based semantic inversion |

### KEEP (structural plumbing)

`deriveCandidateClaimTexts`, `normalizeClaimText`, `simpleHash`, `detectInstitutionCode`, `extractAllCapsToken`, `normalizeYesNoQuestionToStatement` (strips `?` only), `canonicalizeInputForContextDetection` (punctuation + lowercase only).

### Dead Code

`splitByConfigurableHeuristics` in `normalization-heuristics.ts` — not called from anywhere. Delete in Phase 3.

---

## Execution Phases

**Phase 1**: Service foundation + replace P1 functions. Extend `text-analysis-types.ts` with batched decision schemas. Build unified LLM Decision API. Replace similarity, entity extraction, recency detection, evidence filter patterns.

**Phase 2**: Replace P2 functions (grounding extraction, search relevance, verdict-corrections heuristics).

**Phase 3**: Verification + hardening + delete dead code.

**All require T3.3 (LLM Migration Service Foundation) from Consolidated Report Quality Execution Plan.**

---

## Efficiency Design

- **Batching**: Combine related items per pipeline step into single LLM call
- **Caching**: Per-run memoization + canonicalized payload hash cache
- **Tiering**: Simple → lightweight model; complex → verdict tier
- **Token control**: Compact prompts, strict JSON schema, bounded outputs
- **Fallback**: Fail-safe neutral behavior only (no heuristic analytical fallback)

---

## Review Checklist

- [x] `inferContextTypeLabel` hardcoded patterns removed
- [x] `stemTerm()` and new violating code DELETED
- [ ] Uncommitted normalization changes committed
- [ ] Enhancement Plan Fixes 1-7 regression test in Phase 3
- [ ] Cache hit rate > 30% in validation scenarios
- [ ] Token cost within 120% of pre-migration baseline
- [ ] "Structural plumbing" test applied to all inventory items

**Structural plumbing test** (from Lead Architect review): A function is structural plumbing if removing it would not change which verdict the system produces — only how data flows.
