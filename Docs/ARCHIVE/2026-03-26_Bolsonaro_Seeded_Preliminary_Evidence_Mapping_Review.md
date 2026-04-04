# Bolsonaro `1abb0ea5` Seeded Preliminary Evidence Mapping Review

**Date:** 2026-03-26  
**Role:** Lead Architect  
**Status:** REVIEW-READY  
**Target job:** `1abb0ea52a6c404baadaba360b0370de`  
**Question:** Are the empty ClaimAssessmentBoundary rows in the coverage matrix just UI noise, or do they expose a real analytical defect?

---

## 1. Executive Summary

The empty matrix rows in job `1abb0ea5` are **not** just a presentation artifact.

They expose a real Stage-1 -> Stage-2 interface defect:

- Stage 1 preliminary evidence is emitted with free-form semantic claim IDs such as:
  - `claim_bolsonaro_proceedings`
  - `claim_bolsonaro_coup_proceedings`
  - `claim_bolsonaro_fair_verdict`
- Stage 2 seeding only remaps:
  - exact final `AC_*` IDs
  - the narrow legacy pattern `claim_01 -> AC_01`
- As a result, many seeded evidence items enter Stage 2 with `relevantClaimIds: []`

That means:

- the coverage matrix does not count them
- D5 sufficiency does not count them
- some boundaries appear in Stage 3 with non-zero `evidenceCount`, but zero contribution to any atomic claim

For `1abb0ea5`, this is a **real contributing defect**.

But it is **not the primary cause** of the weak result.

The primary weak-path cause remains:

- `AC_01` ended with too little **mapped** diversity
- only `11` mapped items
- only `1` source type
- only `2` normalized domains
- D5 then correctly zeroed it to `UNVERIFIED 50 / 0`

So the reconciled judgment is:

- **Empty rows are a real signal**
- **Unmapped seeded evidence is a real systemic quality tax**
- **but the main cause of this specific weak run is still Stage-2/D5 claim starvation on `AC_01`**

---

## 2. What Is Proven

### 2.1 The coverage matrix undercount is real

Stored matrix for `1abb0ea5`:

```json
{
  "claims": ["AC_01", "AC_02"],
  "boundaries": ["CB_15", "CB_21", "CB_19", "CB_17"],
  "counts": [
    [0, 0, 0, 11],
    [0, 0, 5, 38]
  ]
}
```

This is why the UI shows:

- `CB_15` row empty
- `CB_21` row empty
- `CB_19` only partly filled
- `CB_17` dominating almost everything

That is **not** a rendering bug. It is exactly what the stored matrix says.

### 2.2 The boundaries do contain evidence

The same result stores Stage-3 boundaries with non-zero evidence counts:

| Boundary | Stored `evidenceCount` | Matrix contribution |
|----------|-------------------------|---------------------|
| `CB_15` Official government statements | `1` | `0` |
| `CB_21` Formal criminal charges documentation | `1` | `0` |
| `CB_19` Prosecutorial presentation... | `7` | `5` |
| `CB_17` Academic legal scholarship... | `68` | `49` |

So the boundaries are real and populated.

The discrepancy comes from **claim mapping**, not missing evidence.

### 2.3 The missing matrix evidence is exactly the unmapped seeded evidence

For `1abb0ea5`:

| Metric | Count |
|--------|-------|
| Total evidence items | `77` |
| Matrix-counted items | `54` |
| Missing from matrix | `23` |
| Seeded evidence items | `23` |
| Seeded evidence items with empty `relevantClaimIds` | `23` |

So the matrix is undercounting by exactly the seeded-evidence mapping loss.

### 2.4 The seeded mapping failure is structural

Examples from `understanding.preliminaryEvidence`:

```json
{"relevantClaimIds":["claim_bolsonaro_coup_proceedings"]}
{"relevantClaimIds":["claim_bolsonaro_proceedings"]}
{"relevantClaimIds":["claim_bolsonaro_fair_verdict"]}
```

Final atomic claims for this job are only:

- `AC_01`
- `AC_02`

Stage 2 seeding preserves only:

1. exact final IDs already matching `AC_*`
2. legacy single-claim fallback
3. the narrow remap pattern `claim_01 -> AC_01`

It does **not** remap semantic slugs like `claim_bolsonaro_proceedings`.

---

## 3. Code Path Analysis

### 3.1 Stage 1 preliminary evidence preserves LLM-emitted IDs

Preliminary evidence extraction keeps `relevantClaimIds` directly from the LLM output in:

- [claim-extraction-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claim-extraction-stage.ts:1160)

That means Stage 1 currently emits unstable semantic claim handles into the Stage-1/Stage-2 interface.

### 3.2 Stage 2 seeding remap is too narrow

Stage 2 seeding happens in:

- [research-orchestrator.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/research-orchestrator.ts:392)

Relevant remap logic:

- accept exact known final IDs
- single-claim fallback
- `claim_01 -> AC_01` heuristic

But it does not handle semantic slugs such as:

- `claim_bolsonaro_proceedings`
- `claim_bolsonaro_coup_proceedings`

So those items become seeded evidence with:

- `relevantClaimIds: []`

### 3.3 The coverage matrix is doing exactly what it was designed to do

The matrix builder only counts evidence items that have:

- a boundary ID
- and at least one mapped `relevantClaimId`

See:

- [boundary-clustering-stage.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/boundary-clustering-stage.ts:529)

So the empty rows are a direct downstream symptom of unmapped evidence.

### 3.4 D5 also ignores the unmapped evidence

Per-claim sufficiency in:

- [claimboundary-pipeline.ts](C:/DEV/FactHarbor/apps/web/src/lib/analyzer/claimboundary-pipeline.ts:521)

only counts evidence items whose `relevantClaimIds` include the claim.

So unmapped seeded evidence does not help:

- evidence item count
- source-type diversity
- domain diversity

for any claim.

---

## 4. Why This Is Not the Primary Cause

The mapping defect is real, but it also appears in stronger Bolsonaro runs.

### 4.1 Stronger runs have the same seeded-unmapped pattern

| Job | Verdict | Total evidence | Seeded | Seeded unmapped |
|-----|---------|----------------|--------|-----------------|
| `1abb0ea5` | `MIXED 54 / 58` | `77` | `23` | `23` |
| `3b07a079` | `LEANING-TRUE 63.6 / 66.6` | `87` | `27` | `27` |
| `465cd4ac` | `LEANING-TRUE 64.4 / 67.3` | `111` | `36` | `36` |
| `74d40863` | `UNVERIFIED 47.5 / 44.2` | `91` | `36` | `28` |
| `92f2ada7` | `MOSTLY-TRUE 72.6 / 65.2` | `61` | `31` | `20` |

So the seeded-unmapped issue is **systemic**, not unique to the weak run.

That means it is a **quality tax**, but not by itself the main differentiator.

### 4.2 The differentiator remains mapped evidence diversity for `AC_01`

For `1abb0ea5`:

- `AC_01`: `11` mapped items, `1` source type, `2` domains
- D5 result: `UNVERIFIED 50 / 0`

For stronger same-stack run `3b07a079`:

- `AC_01`: `25` mapped items, `5` source types, `7` domains
- result: `LEANING-TRUE 62 / 65`

So the immediate failure condition is still:

- **mapped evidence for `AC_01` remained too narrow**

That is why the challenger is right to keep the stronger primary diagnosis on:

- Stage-2 retrieval / evidence allocation / diversity starvation

---

## 5. Why the Mapping Defect Still Matters

Even though it is not the sole root cause, it is still materially important.

### 5.1 In `1abb0ea5`, the lost seeded evidence was not trivial noise

The `23` unmapped seeded items included:

- `news_primary`
- `news_secondary`
- `organization_report`
- `peer_reviewed_study`
- `expert_statement`
- `government_report`

Across domains such as:

- `pbs.org`
- `npr.org`
- `journalofdemocracy.org`
- `bbc.com`
- `oas.org`
- `verfassungsblog.de`
- `aljazeera.com`
- `cfr.org`

If even part of that pool had been correctly mapped to `AC_01`, the claim could plausibly have improved on:

- source-type diversity
- domain diversity
- D5 sufficiency odds

So the mapping loss is not merely cosmetic. It is potentially outcome-relevant.

### 5.2 The defect also distorts diagnostic surfaces

Because seeded evidence is lost from claim mapping:

- the coverage matrix understates real boundary contribution
- investigators may misread boundary sparsity
- D5 statistics undercount available evidence for claims

That makes the system harder to debug and easier to misdiagnose.

---

## 6. Debate Summary

### Reviewer position

- This is a real Stage-1 -> Stage-2 interface defect
- The narrowest justified fix is a targeted claim-handle alignment repair
- Empty rows are not just UI noise

### Challenger position

- Do not overclaim it as the main cause
- The weak run is still more directly explained by:
  - Stage-2 diversity starvation
  - query-budget exhaustion
  - broad `AC_01` scope
  - contested fairness evidence

### Reconciled position

Both are correct:

- **real defect**
- **not primary cause**
- **material contributing factor**

So the right wording is:

> The seeded preliminary evidence mapping problem is a systemic evidence-attribution defect that materially contributed to this weak run, but the primary weak-path cause remains Stage-2/D5 starvation of mapped `AC_01` evidence.

---

## 7. Recommended Next Step

### Recommendation

Open a **narrow Stage-1/Stage-2 interface investigation**, not a prompt wave and not a verdict-stage change.

Best target:

- preliminary evidence claim-handle alignment

Preferred solution shapes:

1. **Best structural option**
   - Stage 1 emits stable preliminary claim handles that survive into final `AC_*` claims
   - or stores an explicit mapping artifact from preliminary claims to final claims

2. **Acceptable fallback**
   - small LLM-backed remap step between preliminary evidence and final claim IDs

What should **not** be done:

- no Gate 1 changes
- no D5 threshold changes
- no spread-multiplier tuning
- no UI-only suppression of empty rows
- no fuzzy keyword heuristics like `bolsonaro -> AC_01`

### Priority framing

This should be treated as:

- a **targeted interface / attribution fix**
- not a broad Stage-1 reopening
- and not a replacement for the already-approved Stage-2/D5 diversity experiment

The two tracks are complementary:

- **Stage-2/D5 alignment experiment** addresses mapped-evidence starvation
- **seeded-evidence mapping fix** would stop wasting Stage-1 evidence before Stage 2 even starts

---

## 8. Final Judgment

**Final judgment:** `Targeted Stage-1/Stage-2 interface fix justified, but as a contributing-defect fix rather than a primary-root-cause fix.`

More concretely:

- the empty matrix rows are a **real signal**
- the seeded-evidence mapping defect is **worth fixing**
- but this run should still be explained primarily by **mapped claim-local diversity failure on AC_01**

That is the review-ready position.
