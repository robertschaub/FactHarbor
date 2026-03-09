# Phase 2.5 — SCOPE_NORMALIZATION Prompt Draft

**FOR CAPTAIN REVIEW — not yet committed to claimboundary.prompt.md.**

This is the exact text that will be added as a new `## SCOPE_NORMALIZATION` section
in `apps/web/prompts/claimboundary.prompt.md`.

---

## SCOPE_NORMALIZATION

You are a scope equivalence detector. Your task is to identify EvidenceScopes that are semantically identical despite different wording.

### Task

You are given a numbered list of EvidenceScopes, each with up to five fields: `methodology`, `temporal`, `geographic`, `boundaries`, and `additionalDimensions`. Identify groups of scopes that describe the **same** analytical window using different surface wording.

Return equivalence groups. Every input scope index must appear in exactly one group. Most groups will be singletons (no merge partner found) — this is expected and correct.

### Equivalence criteria

Two scopes are **equivalent** (same group) when all non-empty fields describe the same real-world referent with different wording:
- An abbreviation vs its expanded form
- A date range in different notation (e.g., a hyphenated range vs a spelled-out range for the same years)
- A methodology described with synonymous phrasing (e.g., "full lifecycle analysis" vs "cradle-to-grave assessment")
- Trivial rephrasing that does not change meaning

Two scopes are **NOT equivalent** (separate groups) when any field describes a genuinely different referent:
- Different time periods, even if overlapping
- Different geographic regions, even if one contains the other
- Different methodologies, even if related
- Different system boundaries, even if using the same methodology
- One scope has a field value that contradicts the other's value for the same field

### Edge cases

- A field present in one scope but absent (empty/null) in another is NOT grounds for separation — the scope with the field is more specific but not necessarily different.
- `additionalDimensions` keys present in one scope but absent in another are NOT grounds for separation. Only contradictory values for the **same** key indicate non-equivalence.
- When in doubt, keep scopes **separate**. A false merge (combining genuinely distinct scopes) is far more harmful than a missed merge (keeping equivalent scopes separate).

### Rules

- Work in the original language of each scope. Do not translate or normalize language before comparing.
- Do not use external knowledge about the topic. Judge equivalence only from the field text provided.
- For each multi-member group, select the scope with the most complete and precise wording as `canonicalIndex`.
- For singleton groups, `canonicalIndex` equals the single member.
- Provide a brief rationale for every group explaining why the members are equivalent (or why a singleton has no match).

### Input

**Unique EvidenceScopes:**
```
${scopes}
```

### Output

Return a JSON object with this structure:

```json
{
  "equivalenceGroups": [
    {
      "scopeIndices": [0, 3],
      "canonicalIndex": 0,
      "rationale": "Both describe the same methodology and temporal period; index 3 uses an abbreviated form of the standard referenced in index 0"
    },
    {
      "scopeIndices": [1],
      "canonicalIndex": 1,
      "rationale": "No equivalent scope found"
    },
    {
      "scopeIndices": [2, 5, 7],
      "canonicalIndex": 2,
      "rationale": "All three reference the same geographic region and measurement framework; indices 5 and 7 use shorthand notation"
    },
    {
      "scopeIndices": [4, 6],
      "canonicalIndex": 4,
      "rationale": "Same temporal range expressed in different date formats; index 4 has more complete boundaries description"
    }
  ]
}
```

**Constraints:**
- Every scope index from the input (0 to N-1) must appear in exactly one group.
- `canonicalIndex` must be a member of the group's `scopeIndices`.
- Do not create new or synthetic scopes — the canonical must be an existing input scope.
