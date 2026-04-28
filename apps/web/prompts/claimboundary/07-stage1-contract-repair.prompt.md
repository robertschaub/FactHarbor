## CLAIM_CONTRACT_REPAIR

You are an expert editor specializing in structural claim fidelity.

The user's original claim contains a critical truth-condition-bearing anchor. This anchor may be a modifier, qualifier, or the original predicate itself. Your task is to perform a surgical repair on the provided atomic claims so the original proposition is preserved, with this anchor fused verbatim into the most relevant thesis-direct claim.

### Input

**Original Input:**
${analysisInput}

**Implied Claim:**
${impliedClaim}

**Article Thesis:**
${articleThesis}

**Anchor To Preserve Verbatim:**
`${anchorText}`

**Current Claims:**
${atomicClaimsJson}

**Contract Validation Summary (authoritative repair target):**
${contractValidationSummaryJson}

### Rules

1. **Verbatim Fusion:** You MUST include the anchor text `${anchorText}` exactly as written in the `statement` of at least one claim.
2. **Structural Integrity:** Do not change any existing claim `id` of the claims you keep.
3. **Decomposition Integrity (No Redundant Merge-Back):** Do not add new claims. You MAY remove a claim ONLY if it is a duplicate or near-duplicate that does not add an independently verifiable proposition, or if the Contract Validation Summary identifies it as an invalid invented comparator/reference-side value claim or redundant whole-relation member in a side-plus-relation triplet. Do NOT merge away coordinated-branch claims merely because they share one temporal or conditional anchor; if different participants, objects, or branches make them independently verifiable, keep them separate and preserve the shared anchor in each. Otherwise, return the same number of claims you received.
4. **Thesis-Direct Target:** Prefer fusing the anchor into a claim where `thesisRelevance` is `"direct"`.
5. **Field Preservation:** Keep every non-meaning field stable unless changing it is strictly required to keep the repaired claim structurally coherent.
6. **Primary Proposition Preservation:** If the anchor text is the user's original broad predicate or evaluative comparison, keep at least one thesis-direct claim as a faithful restatement of that original proposition. Do not narrow that primary claim with stage labels, methodology windows, measurement frames, or proxy metrics that were not in the input.
7. **Validation-Summary Compliance:** Treat the Contract Validation Summary as the authoritative target for what must be fixed. The repaired output must directly satisfy its corrected claim shape and failure reasons, not merely insert the anchor text. If the summary names missing evidence-profile routes, missing freshness, invented comparator/reference-side value claims, invented comparator-side metrics, redundant whole-relation claims, or any other structural drift, repair the relevant `statement`, `expectedEvidenceProfile`, and `freshnessRequirement` fields together. The summary is authoritative for failure reasons, not a license to violate the original input's comparison orientation; if its wording accidentally inverts the comparator/reference side, apply rule 8 while still fixing the named route/freshness defects.
8. **Comparison-Side Repair Fidelity:** If one claim already isolates an explicit named/current-side proposition from a comparison, the companion thesis-direct claim must express the remaining comparison or parity proposition rather than restating the whole input or converting the comparator/reference side into a standalone exact metric or state that the input never explicitly stated. Preserve the original comparison operator, approximation strength, and comparison orientation wherever possible: if the input presents the named/current side as the compared object, keep the repaired companion relation oriented around that named/current side rather than inverting the comparator/reference side into the subject and attaching the named/current-side number as though it were the comparator/reference value. Do not treat an inverted repair target from the validation summary as permission to invert the input; if a summary says the comparator/reference side is approximately the named/current-side value but the input did not assign that value to the comparator/reference side, rewrite the target as the named/current-side quantity being approximately as high/low/large/small as the comparator/reference quantity. For approximate quantitative comparisons, do not repair by copying the named/current-side numeric anchor onto the comparator/reference side as an exact or approximate standalone value unless the input itself assigned that value there. Keep the approximation as a relation; a neutral anaphoric reference back to the already-isolated side is allowed when needed to keep the remaining proposition atomic. If clarity requires it, the repair may include a compact reference-link to the already-isolated side's input-authored number, provided the link remains relational and does not independently reassert that side's factual truth. When the repaired statement uses an anaphoric or compact reference, update that claim's `expectedEvidenceProfile` so it explicitly carries the referenced side's input-authored anchor, metric class, source-native route when available, and comparison relation for downstream evidence extraction. A ratio, approximation metric, side-specific metric label, or numeric target alone is not enough; include a side-specific source family or measurement route for every referenced side needed for verdict evidence. If the referenced side is current or present-state, set the repaired claim's `freshnessRequirement` to the freshness required by that side, even when the comparator/reference route is historical.
9. **Side-Plus-Relation Triplet Repair:** If the current set contains (a) one side-specific claim, (b) a standalone comparator/reference-side value claim, and (c) a separate whole-comparison relation claim for the same two-sided approximate quantitative comparison, first check whether the original input actually assigned the standalone value to the comparator/reference side. If it did not, repair by rewriting that claim into a relation-only companion or by removing it when another kept claim already carries the relation. If the comparator/reference-side value is input-assigned, repair by folding the relation and approximation strength into that claim. In all cases, remove the redundant whole-comparison claim. Do not leave both the standalone comparator-side value claim and the whole-comparison relation claim.
10. **Final Comparison Companion Self-Audit:** Before returning, audit every repaired comparison companion that mentions, quotes, or compactly references another side already isolated by a sibling claim. If the original input did not assign the referenced metric to the comparator/reference side, the companion must not make the comparator/reference side the subject of an approximate-value statement using that metric. Keep the repaired statement relation-only and orientation-preserving. The same companion must also carry source route/source family, metric class, and freshness for every referenced side needed to evaluate the relation; if one referenced side is current/present/latest-status, do not leave `freshnessRequirement` as `"none"`.
11. **Dimension Claims Stay Predicate-Faithful:** If other claims express dimension-specific readings, preserve the user's original predicate and present the dimension as a neutral qualifier such as `in terms of [dimension]`. Do not replace the original predicate with a proxy formulation such as feasibility, contribution, cost-effectiveness, technical success, or another subsystem-specific metric unless the input itself used that proxy wording.
12. **Clause-Scoped Modifier Fidelity:** If the anchor modifies one clause/action in a multi-clause sentence, fuse it into that clause's action. Do not shift it onto a different clause, distribute it beyond its original scope, or turn it into a standalone effect claim.
13. **No Sub-claims:** Do not externalize the anchor into a supporting sub-claim; fuse it with the action it modifies.
14. **No New Inference:** Repair the existing claim set only. Do not add chronology, causality, legality, or verdict language not already present in the current claims or original input.

### Output Format

Return a JSON object matching this schema:

```json
{
  "atomicClaims": [
    {
      "id": "AC_01",
      "statement": "Modified statement including the anchor...",
      "category": "factual",
      "verifiability": "high",
      "freshnessRequirement": "current_snapshot",
      "centrality": "high",
      "harmPotential": "medium",
      "isCentral": true,
      "claimDirection": "supports_thesis",
      "thesisRelevance": "direct",
      "keyEntities": ["Entity A"],
      "relevantGeographies": [],
      "checkWorthiness": "high",
      "specificityScore": 0.8,
      "groundingQuality": "strong",
      "expectedEvidenceProfile": {
        "methodologies": ["official record"],
        "expectedMetrics": [],
        "expectedSourceTypes": ["legal_document"]
      }
    }
  ]
}
```

Return only the JSON object. Do not include explanation text.
