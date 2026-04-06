# 2026-04-06 Upstream Report Quality Workstream Proposal

**Date:** 2026-04-06  
**Authoring role:** Senior Developer (Codex)  
**Context:** Stage 5 narrative-tension cleanup is now good enough; the next
quality workstream should target upstream report quality rather than more
narrative repair.

---

## 1. Executive Summary

The current evidence says the `Cross-Boundary Tensions` problem is no longer
the main report-quality limiter.

What remains is upstream:

- uneven claim-level evidence yield
- retrieval/event drift into adjacent material
- unstable evidence composition on hard families
- mega-boundary or near-mega-boundary concentration in some runs
- unresolved cross-linguistic evidence-base divergence

The next workstream should therefore be:

**Stage 2/3 upstream report-quality stabilization**

This means:

1. characterize claim-level evidence acquisition and loss precisely
2. improve Stage 2 query/event anchoring and evidence-pool quality
3. only then tighten Stage 3 boundary formation where concentration remains

The immediate focus should be **hard-family quality**, not more narrative
polish:

- Bolsonaro EN
- Plastik DE
- Swiss vs Germany
- misinformation-tools family as a structural control

---

## 2. Why This Is The Right Next Workstream

### 2.1 Stage 5 is no longer the main blocker

After `08220154` and `2acc4545`:

- Swiss post-fix reruns stayed at `0` tensions
- misinformation-tools post-fix reruns stayed at `0` tensions
- remaining Bolsonaro and Plastik tensions look substantive

So the earlier Stage 5 problem is now mostly contained:

- methodology asymmetries
- thin singleton caveats
- coverage gaps
- concentration observations

are largely landing in `limitations` rather than being over-promoted into
`boundaryDisagreements`.

### 2.2 Hard-family quality is still unstable upstream

The remaining quality problems are not mainly narrative classification issues.

Recent examples:

- **Bolsonaro EN**
  - current local post-fix runs remain below the strongest deployed reference
  - the gap is concentrated in claim-level evidence composition, especially
    thin or mixed evidence on international-law / fair-trial dimensions
- **Plastik**
  - Stage 5 got cleaner, but report direction still varies materially between
    runs because the upstream evidence mix and dominant boundary structure vary
- **Swiss vs Germany**
  - tension emission is now cleaner, but report quality still depends heavily
    on fetch success and thin evidence pools
- **misinformation tools**
  - the family is now a useful control for Stage 5, but still reflects
    upstream variability in boundary composition and source mix

### 2.3 This aligns with the repo's broader quality picture

The existing active docs already point in the same direction:

- boundary concentration remains an open quality issue
- cross-linguistic neutrality remains an open quality issue
- the hardest remaining failures are evidence/retrieval-driven, not Stage-5-driven

So the next workstream should consolidate those themes instead of opening
another narrative-only fix slice.

---

## 3. Working Diagnosis

### Root Cause A — Claim-level evidence acquisition remains uneven

Some claims end a run with thin or weakly case-specific evidence pools while
sibling claims are well-supported.

What matters is not just total evidence count, but:

- how much evidence each claim receives
- how much of it is case-specific vs broad/system-level
- how much new information arrives per iteration
- whether the evidence mix is balanced enough to support stable verdicts

### Root Cause B — Query/event anchoring still drifts

Stage 2 can still admit evidence that is:

- adjacent rather than directly on the claim
- system-level when the claim needs case-level material
- geographically or institutionally related but not central

This does not always create obviously bad reports, but it reduces the quality
of the evidence pool and increases variance.

### Root Cause C — Boundary concentration amplifies upstream skew

When one boundary absorbs a large share of evidence, two bad things happen:

- the report becomes overly sensitive to one evidence cluster
- weak or thin side-boundaries become narratively loud relative to their actual
  analytical weight

This is not always a pure Stage 3 bug. Often Stage 3 is faithfully clustering a
skewed Stage 2 pool. That is why Stage 2 characterization must come first.

### Root Cause D — Cross-linguistic evidence divergence remains open

The repo already has strong evidence that language materially affects the
retrieved evidence base on some families. The new Stage 5 fixes do not change
that. Any upstream workstream that ignores multilingual behavior will miss one
of the major remaining quality gaps.

---

## 4. Proposed Workstream

### Phase A — Instrumentation and characterization first

Before changing retrieval logic again, improve observability around where
quality is gained or lost.

Add a claim-level acquisition ledger for repeated canaries:

- queries generated per claim / per iteration
- fetched sources per claim / per iteration
- newly admitted evidence items per claim / per iteration
- applicability / relevance / extraction losses per claim
- claim-local support / contradiction / neutral counts by iteration
- dominant boundary share and boundary count at the end of Stage 3

Target files:

- `apps/web/src/lib/analyzer/research-orchestrator.ts`
- `apps/web/src/lib/analyzer/research-extraction-stage.ts`
- `apps/web/src/lib/analyzer/boundary-clustering-stage.ts`
- `apps/web/src/lib/analyzer/types.ts`

Why first:

- it turns today's narrative impressions into concrete per-claim evidence-flow
  data
- it reduces the risk of tuning the wrong stage
- it gives future local-vs-deployed comparisons a better basis than final
  verdicts alone

### Phase B — Stage 2 query/event anchoring improvement

Once the claim-level ledger is visible, improve Stage 2 where the evidence pool
is demonstrably drifting or staying too broad.

Focus:

- make query generation preserve claim-local event / actor / legal-standard
  anchoring more reliably
- improve query portfolio diversity without broadening into adjacent
  controversies
- favor evidence that directly addresses the claim's actual analytical burden,
  not merely adjacent system-level discussion

Target files:

- `apps/web/src/lib/analyzer/research-query-stage.ts`
- `apps/web/prompts/claimboundary.prompt.md`

Important constraint:

- no domain-specific keywords
- no language-specific heuristics
- any semantic change must stay prompt/LLM-driven

### Phase C — Stage 3 boundary concentration stabilization

Only after the Stage 2 pool is better characterized should Stage 3 be tightened.

Focus:

- measure how often one boundary exceeds a meaningful dominance threshold
- inspect whether weak side-boundaries are informative or mostly tangential
- improve concentration handling only where the evidence says the clustering
  layer is amplifying noise instead of reflecting a legitimately dominant pool

Target file:

- `apps/web/src/lib/analyzer/boundary-clustering-stage.ts`

### Phase D — Validation and promotion gate

Use the same hard families repeatedly:

- Bolsonaro EN
- Plastik DE
- Swiss vs Germany
- misinformation-tools family

Success should be judged on:

- cleaner claim-level evidence support
- lower run-to-run direction instability
- healthier boundary-share distribution
- no new grounding/direction regressions
- no renewed Stage 5 tension inflation

---

## 5. What This Workstream Should NOT Do

- do **not** reopen Stage 5 narrative repair now
- do **not** reopen `sufficiencyMinMainIterations` as the primary lever
- do **not** add deterministic semantic heuristics
- do **not** start by changing Stage 3 in isolation
- do **not** tune against one family only

---

## 6. Recommended Order

1. **Close Stage 5 as monitor-only**
   - keep Fix 2 deferred
2. **Start Phase A instrumentation**
   - claim-level acquisition ledger
   - boundary concentration telemetry
3. **Run repeated canaries with the new telemetry**
4. **Choose one bounded Stage 2 improvement slice**
   - query/event anchoring
   - claim-local evidence-pool quality
5. **Re-measure**
6. **Only then** decide whether a Stage 3 concentration fix is needed

---

## 7. Single Best Next Implementation Target

**Add claim-level Stage 2/3 telemetry for evidence acquisition and boundary
concentration.**

Why this should be first:

- it is generic
- it is low-risk
- it improves diagnosis across all hard families
- it avoids another speculative fix cycle
- it creates the decision basis for the first true upstream quality change

---

## 8. Proposed Backlog / Status Framing

- `NARR-1` should move from active validation toward **monitor**
- a new upstream quality track should become the active engineering focus

Suggested backlog item:

- `UPQ-1` — **Stage 2/3 upstream report quality stabilization**
  - characterization
  - query/event anchoring
  - boundary concentration follow-on
  - multilingual hard-family validation

---

## 9. Short Conclusion

The next report-quality workstream should be upstream, not narrative:

- **Stage 5** is good enough for now
- **Stage 2/3** is where the remaining hard-family instability lives
- the safest high-value first move is **better per-claim evidence-flow and
  boundary telemetry**
