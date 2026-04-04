# Seeded Evidence LLM Remap — Interface Repair Proposal

**Date:** 2026-03-26
**Role:** Lead Architect
**Status:** REVIEW-READY
**Supersedes:** Option B (all-claims fallback) from `2026-03-26_Seeded_Evidence_Mapping_Fix_Investigation.md` — rejected by code review as attribution fabrication
**Framing:** Narrow interface repair. Not a quality-wave reopening. Not an implementation order.

---

## 1. Problem

Stage 1 preliminary evidence is extracted BEFORE Pass 2 produces final `AC_*` claim IDs. The extraction LLM invents semantic claim handles (`claim_bolsonaro_proceedings`, `claim_hydrogen_vs_electric_efficiency`). Stage 2 seeding only remaps `claim_NN → AC_NN` numeric patterns.

Result: for inputs where the LLM uses semantic slugs, **100% of preliminary evidence enters Stage 2 with `relevantClaimIds: []`**. This evidence is invisible to D5 per-claim sufficiency, the coverage matrix, and Stage 4 verdict debate.

Verified across 10 jobs:
- Bolsonaro: 0% remap success (133 items lost across 4 jobs)
- Plastik DE: ~75% remap success (numeric `claim_01` pattern works)
- Hydrogen: ~50% remap success (mixed numeric + semantic)

This is a systemic interface defect, not a run-specific anomaly.

---

## 2. Proposed Fix: Post-Pass-2 LLM Remap

### Where it runs

After Pass 2 has produced final `AC_*` claims, before Stage 2 seeding in [research-orchestrator.ts](apps/web/src/lib/analyzer/research-orchestrator.ts). Specifically:

1. Pass 2 completes → final `AC_*` claims exist
2. **New step: LLM remap** → unmapped seeded items get claim-local attribution
3. `seedEvidenceFromPreliminarySearch()` runs with repaired `relevantClaimIds`

The remap step belongs in `claim-extraction-stage.ts` (where both Pass 2 output and preliminary evidence are in scope), immediately after Pass 2 and before the understanding object is assembled.

### What it does

One batched Haiku call that processes ONLY seeded preliminary items whose `relevantClaimIds` failed the existing remap (i.e., items that would otherwise enter Stage 2 with `relevantClaimIds: []`).

**Input to the LLM:**

```json
{
  "atomicClaims": [
    {"id": "AC_01", "statement": "The court proceedings...complied with Brazilian procedural law."},
    {"id": "AC_02", "statement": "The resulting verdicts...were fair."}
  ],
  "unmappedEvidence": [
    {"index": 0, "statement": "STF upheld constitutional procedures in the trial...", "sourceTitle": "BBC News"},
    {"index": 1, "statement": "Defense counsel argued the proceedings violated due process...", "sourceTitle": "Reuters"}
  ]
}
```

**Output from the LLM:**

```json
{
  "mappings": [
    {"index": 0, "relevantClaimIds": ["AC_01"]},
    {"index": 1, "relevantClaimIds": ["AC_01", "AC_02"]}
  ]
}
```

- `relevantClaimIds` may be empty (item is not relevant to any final claim), single-claim, or multi-claim
- Only `AC_*` IDs from the provided claims list are allowed
- The LLM decides attribution based on semantic relevance, not blanket assignment

### Why it is acceptable

- Restores **claim-local attribution** without deterministic semantic heuristics
- Uses LLM intelligence per AGENTS.md mandate — the attribution decision is semantic, not keyword-based
- Runs on Haiku (budget tier) — ~$0.002-0.003 per call
- Batched into a single call — no per-item overhead
- Only processes items that already failed the existing remap — zero impact on items that are already correctly mapped
- Preserves the right to return `[]` — if the LLM can't determine relevance, the item stays unmapped (no fabrication)

### Cost and latency

| Metric | Estimate |
|--------|----------|
| LLM model | Haiku (budget) |
| Input tokens | ~1500 (claims + evidence summaries) |
| Output tokens | ~300 (mapping array) |
| Cost per call | ~$0.002 |
| Latency | ~1-2 seconds |
| Calls per analysis | 1 (batched) |
| When it fires | Only when unmapped items exist after existing remap |

---

## 3. What It Must Not Do

| Constraint | Reason |
|-----------|--------|
| No Gate 1 changes | Gate 1 is working correctly per the debate decision |
| No prompt-wave | The extraction prompt's semantic slug behavior is correct — the problem is downstream remapping |
| No D5 threshold changes | D5 diversity requirements are correctly enforcing quality |
| No all-claims fallback | Rejected — fabricates attribution rather than repairing it |
| No spread-multiplier tuning | Unrelated mechanism |
| No fuzzy keyword heuristics | Violates AGENTS.md LLM Intelligence mandate |
| No changes to Stage 2 research targeting | Separate track (Stage-2/D5 alignment) |

---

## 4. Validation Plan

### 4.1 Validation runs

| # | Input | Family | Purpose |
|---|-------|--------|---------|
| 1 | "The court proceedings against Jair Bolsonaro..." | Bolsonaro | Weak-run reproduction (compare to `1abb0ea5`) |
| 2 | "The court proceedings against Jair Bolsonaro..." | Bolsonaro | Strong-run control (compare to `3b07a079`) |
| 3 | "Plastik recycling bringt nichts" | Plastik DE | Regression check (already partially working) |
| 4 | "Using hydrogen for cars is more efficient than using electricity" | Hydrogen | Cross-family check (mixed remap success) |

### 4.2 Success criteria

| Criterion | Metric | Target |
|-----------|--------|--------|
| **Fewer unmapped items** | Count of seeded items with `relevantClaimIds: []` | Reduced by ≥70% vs pre-fix baseline |
| **Plausible claim-local mapping** | Manual inspection: are the attributed claims semantically correct? | ≥90% of newly-attributed items are plausibly relevant to the assigned claim |
| **No blanket inflation** | Count of items attributed to ALL claims | Should be rare (only items genuinely relevant to all claims), not the majority |
| **D5 improvements only where genuine** | Per-claim source-type and domain diversity | Improvements only where attribution is correct — not blanket diversity padding |
| **No regression on already-mapped items** | Plastik DE items that currently remap via `claim_01 → AC_01` | Same mapping as before — the LLM remap only touches unmapped items |

### 4.3 Anti-success criteria (things that would indicate a bad fix)

- All unmapped items attributed to all claims (that's the rejected Option B behavior via LLM)
- D5 sufficiency passing for claims where the evidence is not actually relevant
- Plastik DE losing its existing numeric remap
- Additional UNVERIFIED results caused by the remap introducing incorrect attributions

---

## 5. Implementation Notes

### Prompt design (for Senior Developer)

The remap prompt should:
- Be registered as a new section in `claimboundary.prompt.md` (e.g., `REMAP_SEEDED_EVIDENCE`)
- Be generic — no domain-specific examples per AGENTS.md
- Instruct the LLM to assess semantic relevance between each evidence statement and each atomic claim
- Allow empty `relevantClaimIds` when no claim is relevant
- Use abstract examples: "Evidence about Property A → AC_01 (which asserts Property A)"

### Schema (Zod)

```typescript
const RemapOutputSchema = z.object({
  mappings: z.array(z.object({
    index: z.number(),
    relevantClaimIds: z.array(z.string()),
  })),
});
```

### Integration point

In `claim-extraction-stage.ts`, after Pass 2 completes and before the understanding object is assembled (~line 240):

```typescript
// Remap unmapped preliminary evidence to final AC_* claims
const unmappedPrelim = preliminaryEvidence.filter(
  pe => !pe.relevantClaimIds?.some(id => finalClaimIds.has(id))
);
if (unmappedPrelim.length > 0 && finalClaims.length > 1) {
  const remapped = await remapSeededEvidence(unmappedPrelim, finalClaims, pipelineConfig);
  // Apply remapped IDs back to preliminaryEvidence
}
```

### UCM considerations

- `seededEvidenceRemapEnabled: boolean` — UCM toggle, default `true`
- No other new config parameters needed
- The Haiku call uses the existing `understand` task tier

---

## 6. Relationship to Other Tracks

| Track | Relationship |
|-------|-------------|
| **Stage-2/D5 alignment experiment** | Complementary. This fix repairs attribution for seeded evidence. The alignment experiment addresses research sufficiency for newly-found evidence. Both are needed; neither replaces the other. |
| **Observability bundle** (persist `inputClassification` + `contractValidation`) | Independent. Ship in parallel if approved. |
| **Gate 1 rescue debate** | Closed. Not reopened by this fix. |
| **EVD-1 policy** | This fix does not change the policy. It addresses a systemic evidence-attribution defect, not evidence-driven variance. |

---

## 7. Final Judgment

**`Targeted interface fix justified`**

**Recommended next task:** Design and validate post-Pass-2 LLM remap for unmapped seeded evidence

**Why this first:** The seeded evidence mapping loss is systemic (100% for semantic-slug families), materially contributes to D5 starvation, and is fixable with a single batched Haiku call that preserves claim-local attribution. It's the narrowest intervention that directly addresses the evidence-loss interface defect without fabricating attribution or reopening broader quality tracks. The Stage-2/D5 alignment experiment is a separate complementary track for a different layer.
