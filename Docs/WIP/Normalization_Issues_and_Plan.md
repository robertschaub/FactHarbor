# Normalization Issues Report & Remediation Plan

**Session**: 32 (continued)
**Date**: 2026-02-11
**Updated**: 2026-02-12
**Status**: LARGELY SUPERSEDED — Pipeline uses LLM-first normalization. Heuristic normalization is dead code.

---

## Background

The `normalizeYesNoQuestionToStatement()` function (orchestrated.ts:1895) was designed to convert question-form inputs to statement-form before sending to `understandClaim`. This was intended to ensure input neutrality ("Was X fair?" and "X was fair" produce identical analysis, tolerance <=4%).

**Current state (2026-02-12):** The main pipeline (`runFactHarborAnalysis`) does NOT call any normalization function. It passes raw user input directly to the LLM. The function exists only as an exported utility for backward compatibility.

---

## Issues Found

### Issue 1: Garbled "It is the case that" fallback [FIXED — then approach superseded]

**Status**: Fixed, then superseded by LLM-first approach

The fallback produced `"It is the case that {rest}"` which dropped auxiliary verbs. Fix: fallback now returns original minus "?". But the function is no longer called from the pipeline.

### Issue 2: Hyphenated compound word splits [FIX REVERTED — approach superseded]

**Status**: Fix REVERTED (2026-02-12)

The fix (`isValidSplitPoint()` guard in `normalization-heuristics.ts`) was itself an AGENTS.md violation — it created new deterministic text-analysis logic. The guard was removed. This is moot because `splitByConfigurableHeuristics` is dead code (not called from anywhere).

### Issue 3: Modifier phrase splits [FIX REVERTED — approach superseded]

**Status**: Fix REVERTED (2026-02-12)

The fix (`MODIFIER_CONTEXT_WORDS` set) was an AGENTS.md violation. The set was removed. Moot — `splitByConfigurableHeuristics` is dead code.

### Issue 4: Adjective suffix heuristic too aggressive [NO LONGER APPLICABLE]

**Status**: CLOSED — not applicable

The adjective suffix heuristic is part of `splitByConfigurableHeuristics`, which is dead code. No fix needed.

### Issue 5: Incomplete predicate starters list [NO LONGER APPLICABLE]

**Status**: CLOSED — not applicable

Same reason as Issue 4 — `splitByConfigurableHeuristics` is dead code.

### Issue 6: Duplicated normalization logic [RESOLVED]

**Status**: RESOLVED (2026-02-11)

Phase 1 of AGENTS.md enforcement deduplicated `canonicalizeContexts` into a thin wrapper. `canonicalizeInputForContextDetection` was simplified to just strip punctuation + lowercase. The old duplication with `normalizeYesNoQuestionToStatement` no longer exists.

---

## Current Architecture (2026-02-12)

### How normalization works now

| Function | What it does | Called from | Status |
|----------|-------------|-------------|--------|
| `runFactHarborAnalysis` entry point | `input.inputValue.trim()` — passes raw input to LLM | Main pipeline | ACTIVE |
| `normalizeYesNoQuestionToStatement` | Strips trailing `?` + normalizes whitespace | Tests only (exported utility) | NOT IN PIPELINE |
| `canonicalizeInputForContextDetection` | Strips punctuation + lowercases | Context detection prep | ACTIVE (minimal) |
| `splitByConfigurableHeuristics` | Subject/predicate split via config-driven patterns | **NOWHERE** | DEAD CODE |

### Why this is correct

1. **LLMs handle question/statement equivalence naturally** — "Can solar power replace fossil fuels?" and "Solar power can replace fossil fuels" produce equivalent analysis
2. **No deterministic text-analysis decisions** — compliant with AGENTS.md LLM Intelligence Migration mandate
3. **No false positives** — heuristic normalization could produce WORSE input than the original question; LLM-first avoids this entirely
4. **Input neutrality** is ensured by the LLM's understanding, not by deterministic text manipulation

### Dead code candidate

`splitByConfigurableHeuristics` in `normalization-heuristics.ts` is exported but never imported or called. It can be deleted entirely. The file also contains helper functions (`escapeRegexToken`, `normalizeTokens`) and the `PredicateSplit` type that would go with it.

---

## Remediation Plan — Updated Status

### ~~Phase 1: Adjective suffix guard (Issue 4)~~
**CLOSED** — `splitByConfigurableHeuristics` is dead code. No guard needed.

### ~~Phase 2: Expand predicate starters (Issue 5)~~
**CLOSED** — `splitByConfigurableHeuristics` is dead code. No expansion needed.

### ~~Phase 3: Deduplicate normalization logic (Issue 6)~~
**DONE** — Phase 1 of AGENTS.md enforcement deduplicated canonicalization. Pipeline normalization is now minimal and non-duplicated.

### ~~Phase 4: Evaluate LLM-assisted normalization~~
**DONE (by default)** — The pipeline already uses LLM-first normalization. Raw input goes directly to the LLM. The "evaluation" question is answered: LLM-only works.

**Remaining open question:** Should `splitByConfigurableHeuristics` and its helpers be deleted as dead code? This is a housekeeping item, not a quality concern.

---

## Files Summary (Updated 2026-02-12)

| File | Current State |
|------|--------------|
| `normalization-heuristics.ts` | Contains `splitByConfigurableHeuristics` (DEAD CODE). Guards reverted. Can be deleted. |
| `orchestrated.ts` | `normalizeYesNoQuestionToStatement` simplified (strips `?`). Not called from pipeline. |
| `analysis-contexts.ts` | `canonicalizeInputForContextDetection` simplified (strips punctuation, lowercases). Active. |
| `normalization-contract.test.ts` | 22 tests passing. Tests the exported utility function, not pipeline behavior. |
| `pipeline.default.json` | Contains `normalizationPredicateStarters` and `normalizationAdjectiveSuffixes` config — no longer consumed by any active code path. |
