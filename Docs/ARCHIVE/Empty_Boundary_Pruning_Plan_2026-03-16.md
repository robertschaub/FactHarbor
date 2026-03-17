# Boundary Quality Improvement Plan

**Created:** 2026-03-16
**Author:** Lead Architect (Claude Opus 4.6)
**Status:** DRAFT v2 — addressing review findings (methodology/dimension conflation, prompt rule compliance)
**Trigger:** Job `09e356e4` (Hydrogen vs Electric) — 6 boundaries created, 5 effectively empty. 95% of evidence (69/73 items) in one boundary. Coverage matrix misleadingly implies 6 analytical frames.

---

## 1. Problem Statement

The Stage 3 clustering step creates boundaries that have no evidence items relevant to any atomic claim. These empty boundaries appear in the coverage matrix as rows of zeros, creating visual noise and implying a richer analytical structure than the evidence actually supports.

### Observed in Job `09e356e4`

| Boundary | Constituent Scopes | Evidence Items | In Coverage Matrix |
|----------|-------------------|---------------|-------------------|
| CB_04 Round-trip efficiency comparison | **65** | **69** | AC_01:20, AC_02:10, AC_03:14 |
| CB_11 Government/policy documentation | 4 | 2 | 0 |
| CB_GENERAL General Evidence | 4 | 0 | 0 |
| CB_10 Non-efficiency vehicle features | 1 | 0 | 0 |
| CB_08 Lifecycle cost/TCO | 1 | 1 | 0 |
| CB_09 EPA fuel economy | 1 | 1 | 0 |

---

## 2. Root Cause Analysis (Three Levels)

### Level 1: Scope extraction produces generic, undifferentiated scopes

The `EXTRACT_EVIDENCE` prompt (line 468-527 of `claimboundary.prompt.md`) requires `evidenceScope.methodology` for every item but provides no guidance on specificity. The result: 61 unique scope names, almost all variations of "Comparative analysis of X vs Y". These are worded differently but describe the same analytical approach.

The extraction prompt also has no concept of "what analytical question does this evidence answer" — it only captures "how the source measured." When 50 sources all use "comparative analysis" methodology to measure different things (efficiency, energy density, cost), they all get near-identical scope descriptions.

### Level 2: Scope normalization doesn't catch semantic duplicates

The `SCOPE_NORMALIZATION` step merges scopes with matching fingerprints, but string-level fingerprinting can't catch that "Comparative analysis of energy density" and "Comparative energy density analysis" are semantically identical.

### Level 3: Clustering groups by methodology only — no dimension axis

The `BOUNDARY_CLUSTERING` prompt (line 626-704) groups by **methodological congruence** — "Are these scopes measuring the same thing in a compatible way?" For topics where most evidence uses similar methodology, everything correctly merges into one boundary. The prompt has no guidance to consider *what property the evidence measures* as a separation axis.

### Flow Diagram

```
Source A: "Technology X efficiency is 25-35%"
  → Scope methodology: "Comparative analysis"     ← generic

Source B: "Technology X energy density is 39,000 Wh/kg"
  → Scope methodology: "Comparative analysis"     ← same generic label

Source C: "Technology X costs $0.12/mile vs $0.04/mile"
  → Scope methodology: "Comparative analysis"     ← same again

                    ↓ All "Comparative analysis"

Normalization: Different strings → not merged (61 survive)
Clustering: All "compatible methodology" → ONE boundary

Result: 69/73 items in one boundary, 5 others empty
```

---

## 3. Schema Decision: `analyticalDimension` field

### Problem

The `EvidenceScope` interface (`types.ts:241`) defines `methodology` as the source's method/standard (e.g., "ISO 14040", "RCT double-blind"). The review correctly identified that overloading `methodology` with analytical-dimension semantics ("what metric does this measure") would blur the contract and degrade clustering for cases where true methodology differences matter.

### Proposal: New `analyticalDimension` field on `EvidenceScope`

```typescript
export interface EvidenceScope {
  name: string;
  methodology?: string;     // HOW the source measured (unchanged contract)
  boundaries?: string;
  geographic?: string;
  temporal?: string;
  sourceType?: SourceType;
  additionalDimensions?: Record<string, string>;
  /** What property or metric this evidence measures.
   *  Examples: "energy conversion efficiency", "cost per distance unit",
   *  "storage capacity by mass", "procedural compliance".
   *  Used alongside methodology for boundary clustering —
   *  same methodology but different dimensions = separate boundaries. */
  analyticalDimension?: string;  // NEW
}
```

**Why a typed field instead of `additionalDimensions`:**
- `additionalDimensions` is a generic `Record<string, string>` bag — putting the primary clustering signal there makes it invisible to code that reads specific fields
- A typed field can be referenced explicitly in the clustering prompt, the coverage matrix, and future dimension-aware filtering
- Backwards compatible: optional field, existing evidence items without it continue to work

**Schema migration:** None needed. The field is optional. Existing jobs' evidence items simply won't have it. The clustering prompt and code fall back to methodology-only grouping when `analyticalDimension` is absent.

---

## 4. Proposed Fixes

### Track 1: Downstream cleanup (deterministic, immediate)

#### Fix A: Post-assignment empty boundary pruning

**Where:** `clusterBoundaries()` in `claimboundary-pipeline.ts`, after line 4514
**Type:** Deterministic code
**Effort:** Small

After `evidenceCount` is computed, prune boundaries with zero evidence:

```typescript
// Prune boundaries with zero evidence items.
// The LLM may propose boundaries for analytical frames that the research
// phase didn't find evidence for. Empty boundaries add noise to the
// coverage matrix without contributing to any verdict.
const beforeCount = boundaries.length;
boundaries = boundaries.filter((b) => b.evidenceCount > 0);
if (boundaries.length < beforeCount) {
  console.info(`[Stage3] Pruned ${beforeCount - boundaries.length} empty boundaries`);
}
if (boundaries.length === 0) {
  const boundary = createFallbackBoundary(uniqueScopes, state.evidenceItems);
  assignEvidenceToBoundaries(state.evidenceItems, [boundary], uniqueScopes);
  return [boundary];
}
```

#### Fix B: Evidence concentration warning

**Where:** Same location, after pruning
**Type:** Deterministic code
**Effort:** Trivial

```typescript
const totalEv = state.evidenceItems.length;
for (const b of boundaries) {
  if (totalEv > 10 && b.evidenceCount / totalEv > 0.8) {
    state.warnings.push({
      type: "evidence_concentration",
      severity: "info",
      message: `Boundary "${b.name}" contains ${Math.round(100 * b.evidenceCount / totalEv)}% of evidence. Analytical diversity is limited.`,
      details: { boundaryId: b.id, evidenceCount: b.evidenceCount, totalEvidence: totalEv },
    });
  }
}
```

### Track 2: Upstream quality (schema + prompt, higher impact)

#### Fix C: Add `analyticalDimension` to EvidenceScope + extraction prompt

**Type:** Schema addition + prompt change
**Effort:** Small-Medium
**Impact:** High — root cause fix

**Step 1 — Schema:** Add `analyticalDimension?: string` to `EvidenceScope` interface in `types.ts:241`.

**Step 2 — Extraction schema:** Add the field to the `Stage2EvidenceItemSchema` Zod schema in `claimboundary-pipeline.ts` (the runtime extraction schema, ~line 2340) with `.catch(undefined)` for backwards compatibility.

**Step 3 — Extraction prompt:** Add to the `EXTRACT_EVIDENCE` section of `claimboundary.prompt.md`, within the `evidenceScope` output schema documentation:

```markdown
- `evidenceScope.analyticalDimension` (string, REQUIRED): The specific property or
  metric that this evidence measures or addresses. This is DIFFERENT from `methodology`
  (which describes how the source measured). `analyticalDimension` describes WHAT was measured.

  `methodology` = the approach/standard used by the source
  `analyticalDimension` = the property/metric the evidence quantifies or evaluates

  Examples (abstract, not domain-specific):
  - A source using "lifecycle assessment" methodology to measure "energy conversion efficiency"
    → methodology: "Lifecycle assessment (ISO 14040)"
    → analyticalDimension: "energy conversion efficiency"
  - A source using "lifecycle assessment" methodology to measure "total ownership cost"
    → methodology: "Lifecycle assessment (ISO 14040)"
    → analyticalDimension: "total cost of ownership"
  - A source using "standardized test protocol" to measure "storage capacity per unit mass"
    → methodology: "Standardized laboratory testing"
    → analyticalDimension: "gravimetric storage capacity"

  When two sources use the same methodology but measure DIFFERENT properties, they must
  have different `analyticalDimension` values. This enables the clustering stage to
  create separate boundaries for different analytical questions.

  Do not use generic labels like "comparison" or "analysis" — name the specific
  property being measured.
```

**Step 4 — Scope fingerprinting:** Update `scopeFingerprint()` in `claimboundary-pipeline.ts` to include `analyticalDimension` in the fingerprint key. This ensures scopes measuring different things are not merged during normalization.

#### Fix D: Clustering prompt — use `analyticalDimension` as a separation axis

**Where:** `BOUNDARY_CLUSTERING` section of `claimboundary.prompt.md`, lines 626-704
**Type:** Prompt change
**Effort:** Small

Add to the "Non-congruent (separate)" rules at line 652:

```markdown
- Evidence has different `analyticalDimension` values — it measures different properties
  or metrics of the same subject, even if the methodology is compatible. Two boundaries
  using the same methodology to measure different things should remain separate.
```

Add to the "Edge Cases" section at line 674:

```markdown
- **Single mega-cluster by methodology**: If >80% of scopes share compatible methodology
  but have different `analyticalDimension` values, split along dimension lines. A single
  boundary is only valid when evidence genuinely measures the same property using the
  same approach.
```

Add to the "Congruence Decision Rules" examples table:

```markdown
| "Lifecycle assessment, Property A" | "Lifecycle assessment, Property B" | **No** | Same methodology but different analytical dimensions — merging would obscure which property the evidence addresses |
| "Comparative test, Property A, Region 1" | "Comparative test, Property A, Region 2" | **Yes** | Same methodology, same analytical dimension, different datasets |
```

---

## 5. Implementation Priority

| Order | Fix | Track | Effort | Impact | Risk |
|-------|-----|-------|--------|--------|------|
| **A** | Empty boundary pruning | Downstream (code) | Small | Medium — cleanup | Very low |
| **B** | Concentration warning | Downstream (code) | Trivial | Low — observability | Very low |
| **C** | `analyticalDimension` field + extraction prompt | Upstream (schema + prompt) | Small-Medium | **High** — root cause | Medium |
| **D** | Clustering dimension-aware split | Upstream (prompt) | Small | Medium — secondary | Medium |

**Recommended phasing:**

**Phase 1 — Fix A + B:** Ship the downstream cleanup immediately. No schema or prompt changes needed. Removes empty boundaries from the coverage matrix.

**Phase 2 — Fix C + D:** Add `analyticalDimension` to `EvidenceScope`, update extraction prompt, update clustering prompt, update scope fingerprinting. Validate together.

---

## 6. Validation Plan

### Phase 1 validation (Fix A + B)

Re-run one claim to verify empty boundaries are pruned:

| Metric | Current (`09e356e4`) | Target |
|--------|---------------------|--------|
| Empty boundaries in matrix | 5 | **0** (pruned) |
| Verdicts | AC_01:18, AC_02:15, AC_03:47 | Unchanged (pruning doesn't affect verdicts) |

### Phase 2 validation (Fix C + D)

**3 benchmark claims required — including non-English regression:**

| # | Claim | Language | Purpose |
|---|-------|----------|---------|
| 1 | Technology comparison claim (e.g., hydrogen/electric) | EN | Primary test — verify dimension separation produces ≥3 boundaries with evidence |
| 2 | Legal proceedings claim (e.g., Bolsonaro EN or PT) | EN/PT | Regression — verify that legal-analysis scopes still cluster correctly by methodology (court type, jurisdiction) and are not over-split by dimension |
| 3 | German-language claim (e.g., DE Mental Health) | DE | Multilingual regression — verify `analyticalDimension` extraction works in non-English; scope quality not degraded |

**Phase 2 success criteria:**

| Metric | Target |
|--------|--------|
| Boundaries with evidence (technology claim) | **≥3 of N** (meaningful dimension separation) |
| Evidence concentration (technology claim) | **≤60%** in largest boundary |
| `analyticalDimension` populated | **≥80%** of evidence items have non-empty value |
| Legal claim boundary quality | No regression — boundaries still separate by court/jurisdiction, not over-split |
| German claim scope quality | No regression — scopes in German, boundaries in German |
| Verdicts | Within ±10pp of baseline (boundary changes shouldn't flip verdicts) |

**Required unit tests:**

| Test file | What to test |
|-----------|-------------|
| `claimboundary-pipeline.test.ts` | Fix A: `clusterBoundaries` output contains no boundaries with `evidenceCount === 0` |
| `warning-display.test.ts` | Fix B: `evidence_concentration` warning type is registered |
| `claimboundary-pipeline.test.ts` | Fix C: `scopeFingerprint` includes `analyticalDimension` — two scopes with same methodology but different dimensions produce different fingerprints |
| `claimboundary-pipeline.test.ts` | Fix C: evidence items extracted with `analyticalDimension` field populated (mock LLM output includes the field) |

---

## 7. What This Does NOT Fix

| Issue | Why Not | Where to Fix |
|-------|---------|-------------|
| Low query diversity | Query generation is upstream of scope extraction. More diverse queries would yield more diverse sources. | Next Investigation Phase B (prompt quality — query generation) |
| AC_03 UNVERIFIED (TP=47, Conf=44) | Correct verdict — claim conflates energy density (true) with propulsion efficiency (false). Not a scope/boundary issue. | N/A |
| Verdict stability (G1) | Boundary quality affects stability indirectly. Primary drivers are evidence pool size and claim decomposition. | Multiple: search accumulation (shipped), claim decomposition (Phase B) |

---

## 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Fix C (new field) not populated by LLM | Medium | `.catch(undefined)` on the Zod schema. When absent, clustering falls back to methodology-only grouping (current behavior). No regression. |
| Fix C/D prompt changes produce too many singleton boundaries | Medium | Clustering prompt already handles singletons (line 678: "merge with closest"). |
| Fix C/D degrade non-English scope quality | Low | Validation plan requires a German regression run (Phase 2, claim #3). Abstract prompt examples avoid English-specific terms. |
| Fix A prunes boundaries that should exist | Very low | Empty boundaries have zero evidence — they contribute nothing to verdicts. |
| `analyticalDimension` field adds schema surface | Very low | Optional field, backwards compatible. No migration. Existing jobs unaffected. |

---

## 9. Relationship to Existing Work

| Document | Relationship |
|----------|-------------|
| `Report_Quality_Next_Investigation_Recommendations_2026-03-14.md` | Fix C/D are Phase B (prompt quality) scope. This plan provides a concrete, narrow improvement. |
| `Evidence_Jurisdiction_Contamination_Fix_Plan_2026-03-12.md` | Orthogonal. Contamination fixes address foreign evidence; this plan addresses evidence grouping quality. |
| `Search_Accumulation_Restoration_Plan_2026-03-15.md` | Complementary. More evidence makes boundary diversity more important. |
| `Proxy_Claim_Decomposition_Investigation_2026-03-16.md` | Orthogonal but related — both address analytical structure quality from different angles (claims vs boundaries). |

---

## Review Log

| Date | Reviewer | Assessment | Notes |
|------|----------|------------|-------|
| 2026-03-16 | Code Reviewer | REQUEST_CHANGES | [MEDIUM] Fix C overloads methodology with dimension semantics — conflicts with EvidenceScope contract. [LOW] Prompt examples use test-case terms; validation lacks non-English case. |
| 2026-03-16 | Lead Architect | v2 addressing findings | Fix C revised: new `analyticalDimension` field instead of overloading `methodology`. Prompt examples replaced with abstract patterns. Non-English regression added to validation. |

---

## Decision Record

*(Decisions made after review, with rationale)*
