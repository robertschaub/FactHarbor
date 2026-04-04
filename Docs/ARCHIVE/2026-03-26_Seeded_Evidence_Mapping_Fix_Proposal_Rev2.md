# Seeded Evidence Mapping Fix — Revised Proposal (Rev 2)

**Date:** 2026-03-26
**Role:** Lead Architect
**Status:** REVIEW-READY
**Supersedes:** Rev 1 (`2026-03-26_Seeded_Evidence_LLM_Remap_Proposal.md`) and the Option B recommendation in `2026-03-26_Seeded_Evidence_Mapping_Fix_Investigation.md`
**Type:** Proposal only — no code changes, no prompt changes

---

## 1. Executive Summary

The seeded preliminary evidence claim-mapping failure is **systemic, 100% reproducible**, and materially degrades report quality for any input family where the LLM uses semantic claim slugs instead of numeric patterns.

Across 4 Bolsonaro jobs, **zero** of 133 preliminary evidence items were successfully mapped to final `AC_*` claims. All 133 entered Stage 2 with `relevantClaimIds: []` — invisible to D5 per-claim sufficiency, the coverage matrix, and Stage 4 verdict debate.

The previously proposed **Option B (all-claims fallback) is rejected** as attribution fabrication, not attribution repair.

This revised proposal recommends **Option C: a narrow post-Pass-2 LLM remap step** — one batched Haiku call that semantically maps unmapped seeded evidence items to the correct final `AC_*` claims. It is the smallest justified intervention that restores claim-local attribution without fabrication, deterministic heuristics, or broader pipeline redesign.

**Final judgment: `Targeted interface fix justified`**

---

## 2. What Remains Proven

### 2.1 The root cause is structural

Preliminary evidence is extracted at [claim-extraction-stage.ts:216](apps/web/src/lib/analyzer/claim-extraction-stage.ts#L216) **BEFORE** Pass 2 runs at [line 229](apps/web/src/lib/analyzer/claim-extraction-stage.ts#L229). Pass 2 produces the final `AC_*` IDs. The preliminary extraction LLM has never seen these IDs — it invents its own semantic handles (`claim_bolsonaro_proceedings`, `claim_hydrogen_vs_electric_efficiency`).

This is a structural interface mismatch: preliminary extraction runs early to feed Pass 2 with grounding, but the claim IDs it produces are ephemeral.

### 2.2 The remap heuristic is too narrow

Stage 2 seeding at [research-orchestrator.ts:426-438](apps/web/src/lib/analyzer/research-orchestrator.ts#L426) remaps:

1. Exact `AC_*` matches — never happens (LLM doesn't know these IDs)
2. Legacy single `claimId` matches — rarely happens
3. Single-claim fallback: all evidence to the sole claim — only works for 1-claim inputs
4. `claim_NN → AC_NN` numeric heuristic — catches `claim_01` but not `claim_bolsonaro_proceedings`

Step 4 was designed for an era when the LLM used numeric patterns. Semantic slugs fall through entirely.

### 2.3 The mapping failure is family-dependent and systemic

| Family | Prelim ID pattern | Remap success | Reason |
|--------|------------------|--------------|--------|
| Bolsonaro | `claim_bolsonaro_*` | **0%** | Semantic slug — heuristic fails completely |
| Plastik DE | `claim_01` | ~75% | Numeric pattern matches heuristic |
| Hydrogen | `claim_001` + `claim_hydrogen_*` | ~50% | Mixed — numeric works, semantic fails |

### 2.4 Unmapped evidence is invisible to downstream quality gates

Both D5 per-claim sufficiency ([claimboundary-pipeline.ts:518-520](apps/web/src/lib/analyzer/claimboundary-pipeline.ts#L518)) and the coverage matrix ([boundary-clustering-stage.ts:529](apps/web/src/lib/analyzer/boundary-clustering-stage.ts#L529)) only count evidence items with mapped `relevantClaimIds`. Unmapped items contribute nothing — not to item counts, not to source-type diversity, not to domain diversity.

For `1abb0ea5`, the 23 unmapped items included evidence from pbs.org, npr.org, bbc.com, oas.org, journalofdemocracy.org — across news_primary, news_secondary, organization_report, peer_reviewed_study, expert_statement, and government_report source types. If even some had been mapped to AC_01, the source-type diversity (1, needs ≥2) could have been met.

### 2.5 The defect is contributory, not primary

The same seeded-unmapped pattern appears in both weak and strong Bolsonaro runs. The primary weak-path cause for `1abb0ea5` remains Stage-2/D5 mapped-evidence starvation on AC_01. But the mapping defect is a **systemic quality tax** that compounds starvation risk and distorts diagnostic surfaces.

---

## 3. Why Option B Is Rejected

### 3.1 What Option B proposed

When no remap succeeds and there are >1 final claims, assign the evidence to **ALL** claims:

```typescript
if (claimIds.length === 0 && knownClaimIds.size > 1) {
  claimIds = [...knownClaimIds];
}
```

### 3.2 Why it is attribution fabrication, not attribution repair

Option B does not determine which claims an evidence item is relevant to. It **assumes all claims are relevant** — which is factually incorrect. An evidence item about "STF constitutional procedure" is relevant to AC_01 (procedural compliance), not to AC_02 (verdict fairness). Blanket assignment fabricates a claim-attribution relationship that the evidence does not support.

This distinction matters: attribution repair means determining the correct relationship. Attribution fabrication means inventing one because the correct one is unknown.

### 3.3 How it distorts downstream metrics

**Stage 2 diversity-aware sufficiency:**
The newly shipped `diversityAwareSufficiency` feature (`23d8576c`) checks per-claim item count and source-type diversity during research iterations. If all seeded evidence is attributed to all claims, every claim starts Stage 2 with an artificially inflated evidence count and diversity profile. The sufficiency gate may stop research prematurely for claims that actually have too little *relevant* evidence — the exact opposite of what the fix intends.

**D5 per-claim sufficiency:**
D5 at [claimboundary-pipeline.ts:518-546](apps/web/src/lib/analyzer/claimboundary-pipeline.ts#L518) counts items per claim, distinct source types per claim, and distinct domains per claim. Option B inflates all three metrics for every claim, including claims where the evidence is irrelevant. A claim could pass D5 with evidence that has nothing to do with it.

**Coverage matrix:**
The coverage matrix counts evidence-to-claim-to-boundary intersections. Option B creates phantom intersections — boundaries appear to cover claims they do not actually address. This makes the matrix less useful as a diagnostic surface and harder to interpret for investigators.

### 3.4 The core objection

Option B trades false negatives (unmapped evidence) for false positives (fabricated attribution). False positives are worse because they are invisible — they inflate metrics silently and cannot be detected downstream. False negatives at least produce honest signals (empty rows, low counts, UNVERIFIED verdicts) that surface the real problem.

---

## 4. Option C Design: Post-Pass-2 LLM Remap

### 4.1 Where it runs

After Pass 2 has produced final `AC_*` claims, before Stage 2 seeding. The integration point is in [claim-extraction-stage.ts](apps/web/src/lib/analyzer/claim-extraction-stage.ts), after Pass 2 completes (~line 239) and before the understanding object is assembled:

```
Pass 1 (rapid scan)
  → Preliminary search (produces evidence with semantic claim slugs)
    → Pass 2 (produces final AC_* claims)
      → ** NEW: LLM remap (maps unmapped seeded evidence to AC_* claims) **
        → Claim contract validation
          → Gate 1
            → Stage 2 seeding (seedEvidenceFromPreliminarySearch)
```

### 4.2 What it does

One batched Haiku call that processes **only** seeded preliminary items whose `relevantClaimIds` would fail the existing remap — items that would otherwise enter Stage 2 with `relevantClaimIds: []`.

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

### 4.3 Key constraints on the remap step

| Constraint | Detail |
|-----------|--------|
| **Scope** | Only items that failed the existing numeric remap. Items already mapped via `claim_01 → AC_01` are untouched. |
| **Output** | `relevantClaimIds` may be empty (item not relevant to any claim), single-claim, or multi-claim. The LLM decides. |
| **ID restriction** | Only `AC_*` IDs from the provided claims list are allowed in the output. |
| **No fabrication** | The LLM may return `[]` — if it cannot determine relevance, the item stays unmapped. This preserves the honest-signal property that Option B destroys. |
| **Model tier** | Haiku (budget). This is a classification task, not reasoning. |
| **Batching** | One call per analysis run. All unmapped items in a single structured prompt. |
| **Cost** | ~$0.002 per call (~1500 input tokens, ~300 output tokens). |
| **Latency** | ~1-2 seconds. |
| **When it fires** | Only when unmapped items exist after the existing remap check AND there are >1 final claims. Single-claim inputs already handled by fallback step 3. |

### 4.4 Why it is acceptable

- Restores **claim-local attribution** — the correct claim(s) per evidence item, not blanket assignment
- Uses **LLM intelligence** per AGENTS.md mandate — the attribution decision is semantic, not keyword-based
- Preserves the **right to return `[]`** — no fabrication when relevance is unclear
- **Zero impact** on already-mapped items — only processes failures
- **No prompt changes** to existing extraction — the LLM's semantic slug behavior is correct; the problem is downstream remapping
- **No schema changes** — the output mutates `relevantClaimIds` on existing `PreliminaryEvidenceItem` objects before they enter seeding

### 4.5 UCM configuration

- `seededEvidenceRemapEnabled: boolean` — UCM toggle, default `true`
- No other new config parameters needed
- Uses the existing `understand` task tier (Haiku)

### 4.6 Prompt requirements

- Registered as a new section in `claimboundary.prompt.md` (e.g., `REMAP_SEEDED_EVIDENCE`)
- Generic — no domain-specific examples per AGENTS.md
- Abstract examples only: "Evidence about Property A → AC_01 (which asserts Property A)"
- Instruct the LLM to assess semantic relevance between each evidence statement and each atomic claim
- Explicitly allow empty `relevantClaimIds` when no claim is relevant

---

## 5. Option Comparison

### Option A: Broader deterministic heuristic

Extract the claim topic from semantic slugs (e.g., `claim_bolsonaro_proceedings` → "proceedings") and keyword-match to AC_* claim statements.

| Dimension | Assessment |
|-----------|-----------|
| Correctness | Fragile — keyword extraction from slugs is heuristic guesswork |
| AGENTS.md compliance | **Violates LLM Intelligence mandate** — deterministic text-analysis making semantic decisions |
| Maintenance | Constant — slug patterns evolve with LLM behavior |
| Verdict | **Rejected** |

### Option B: All-claims fallback

Assign unmapped evidence to ALL claims.

| Dimension | Assessment |
|-----------|-----------|
| Correctness | **Fabricates attribution** — assumes all claims are relevant when they are not |
| Downstream impact | Inflates diversity-aware sufficiency, D5, and coverage matrix for all claims |
| Diagnostic integrity | Destroys honest signals — empty rows and low counts no longer surface real mapping failures |
| Verdict | **Rejected** (see §3 above) |

### Option C: Post-Pass-2 LLM remap (RECOMMENDED)

One batched Haiku call to semantically map unmapped items to final claims.

| Dimension | Assessment |
|-----------|-----------|
| Correctness | **Semantically correct** — LLM decides claim relevance per item |
| AGENTS.md compliance | Fully compliant — LLM intelligence for semantic classification |
| Scope | Narrow — single call, only unmapped items, only when needed |
| Cost | ~$0.002/call, ~1-2s latency |
| Risk | Low — fail-open (if call fails, items stay unmapped as today) |
| Verdict | **Recommended** |

### Option D: Stage 1 emits stable claim handles

Make the preliminary extraction prompt use `AC_01`-style IDs by passing rough claim indices to the extraction.

| Dimension | Assessment |
|-----------|-----------|
| Correctness | Would work if the LLM obeyed — but it already ignores index hints and invents semantic slugs |
| Fragility | **Prompt-format fragility** — constraining LLM ID generation is unreliable across model versions and input types |
| Maintenance | Requires ongoing prompt enforcement as models change |
| Verdict | **Rejected** — prompt constraint on ID formatting is unreliable |

### Option E: Explicit mapping artifact from Pass 2

Pass 2 stores a lineage map: `{semantic_slug → roughClaim_index → AC_NN}`. Stage 2 uses this to remap deterministically.

| Dimension | Assessment |
|-----------|-----------|
| Correctness | **Architecturally clean** — durable, no additional LLM call |
| Scope | **Large** — requires Pass 2 schema change to track lineage from rough claims to final claims. Pass 2's current schema does not expose this. |
| Implementation risk | Moderate — Pass 2 prompt + output schema change, new mapping data structure, downstream consumer updates |
| Verdict | **Not recommended now** — best long-term architecture but too large for an interface-repair fix. Consider for a future refactor if Option C proves insufficient. |

### Summary matrix

| Option | Correct | Narrow | Compliant | Cost | Recommended |
|--------|---------|--------|-----------|------|-------------|
| A (heuristic) | Fragile | Yes | **No** | Zero | No |
| B (all-claims) | **No** | Yes | Yes | Zero | **No** |
| C (LLM remap) | **Yes** | **Yes** | **Yes** | ~$0.002 | **Yes** |
| D (stable handles) | Fragile | Yes | Yes | Zero | No |
| E (lineage artifact) | Yes | **No** | Yes | Zero | Not now |

---

## 6. Validation Plan

### 6.1 Validation set

| # | Input | Family | Pattern | Purpose |
|---|-------|--------|---------|---------|
| 1 | "The court proceedings against Jair Bolsonaro..." | Bolsonaro | Weak run | Compare to `1abb0ea5` baseline (0/23 mapped) |
| 2 | "The court proceedings against Jair Bolsonaro..." | Bolsonaro | Strong run | Compare to `3b07a079` baseline (0/27 mapped) |
| 3 | "Plastik recycling bringt nichts" | Plastik DE | Partial success | Regression check — existing numeric remap must remain intact |
| 4 | "Using hydrogen for cars is more efficient than using electricity" | Hydrogen | Mixed | Cross-family check — both numeric and semantic slugs |

### 6.2 Success criteria

| Criterion | Metric | Target |
|-----------|--------|--------|
| **Materially fewer unmapped items** | Count of seeded items with `relevantClaimIds: []` post-remap | Reduced by ≥70% vs pre-fix baseline |
| **Plausible claim-local attribution** | Manual inspection: are the attributed claims semantically correct? | ≥90% of newly-attributed items are plausibly relevant to the assigned claim |
| **No blanket inflation** | Count of items attributed to ALL claims simultaneously | Should be rare (only items genuinely relevant to all claims), not the majority |
| **D5 improvement from recovered attribution only** | Per-claim source-type and domain diversity changes | Improvements only where attribution is correct — not blanket diversity padding |
| **No regression on already-mapped items** | Plastik DE items that currently remap via `claim_01 → AC_01` | Same mapping as before — the LLM remap only touches unmapped items |

### 6.3 Anti-success criteria

These outcomes would indicate the fix is behaving like disguised Option B and must be investigated:

- All or most unmapped items attributed to all claims simultaneously (blanket assignment via LLM)
- D5 sufficiency passing for claims where the evidence is not actually relevant
- Plastik DE losing its existing numeric remap
- New UNVERIFIED results caused by incorrect attributions
- Majority of items returning `relevantClaimIds: []` (remap not working at all)

---

## 7. Final Judgment

**`Targeted interface fix justified`**

Option C is semantically correct, narrowly scoped, AGENTS.md-compliant, and small enough to implement and validate without reopening broader quality tracks. It repairs the attribution interface between Stage 1 preliminary evidence and Stage 2 seeding — restoring claim-local evidence visibility to D5, the coverage matrix, and Stage 4 — without fabricating attribution or introducing deterministic semantic heuristics.

---

**Recommended next task:** Design and validate post-Pass-2 LLM remap for unmapped seeded evidence

**Why this first:** The seeded evidence mapping loss is systemic (100% for semantic-slug families like Bolsonaro), materially contributes to D5 starvation, and is fixable with a single batched Haiku call that preserves claim-local attribution. It is the narrowest intervention that directly addresses the evidence-loss interface defect. Unlike Option B, it does not fabricate attribution or inflate downstream metrics. Unlike Option E, it does not require a Pass 2 schema change. The diversity-aware sufficiency feature (DIV-1) already shipped and aligns Stage 2 research with D5 thresholds — but that alignment is undermined when seeded evidence is invisible due to unmapped claim IDs. Fixing the mapping ensures both seeded and researched evidence contribute honestly to the sufficiency and quality gates they were designed to feed.
