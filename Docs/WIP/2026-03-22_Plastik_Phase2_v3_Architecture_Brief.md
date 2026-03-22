# Plastik Phase 2 v3 Architecture Brief

**Date:** 2026-03-22  
**Status:** Design-only brief — review and prioritization required before any implementation  
**Author:** Codex (GPT-5)  
**Scope:** Define the only credible restart point for the parked Plastik multilingual-neutrality problem after failed Phase 2 v1/v2 experiments.

---

## 1. Document Role

This document is **not** an implementation plan and **not** a request to reopen Plastik immediately.

It exists to:
- preserve the hard lessons from Phase 2 v1/v2,
- define what a credible Phase 2 v3 would have to look like,
- and prevent future agents from retrying already-rejected patterns under a new name.

Use this brief only if Plastik multilingual neutrality becomes a real priority again.

---

## 2. Current Decision Context

Current stable state on `main`:
- Stage 1 broad-claim contract preservation is materially fixed enough to keep.
- `verdictDirectionPolicy` remains active.
- Phase 2 v1 and v2 are both closed as failed retrieval experiments.
- `crossLinguisticQueryEnabled` is off again in live UCM.
- Plastik multilingual neutrality is currently parked as a **known limitation**.

This brief therefore answers:

> If we ever reopen the Plastik multilingual-neutrality track, what should the next architecture look like so we do not repeat v1/v2?

---

## 3. What v1 and v2 Actually Proved

### 3.1 Phase 2 v1 proved shared supplementary pooling is the wrong abstraction

v1 added a cross-linguistic supplementary retrieval pass and merged the resulting evidence into the same flat pool consumed downstream.

What happened:
- supplementary evidence did arrive,
- but it redistributed unevenly across claims/boundaries,
- which increased inter-claim divergence,
- which Gate 4 `contextConsistency` correctly penalized via confidence collapse.

What this rules out:
- more shared-pool supplementation,
- more supplementary query budget on the same design,
- loosening Gate 4 just to hide the failure.

### 3.2 Phase 2 v2 proved language is not a stable proxy for evidential direction

v2 replaced supplementary `"main"` queries with supplementary `"contrarian"` queries plus a skew gate.

What happened:
- the gate fired rarely,
- and the only clearly attributable firing moved in the wrong direction,
- showing that "query in another language" does **not** reliably mean "retrieve opposite-direction evidence."

What this rules out:
- using supplementary language as a substitute for directional control,
- tuning the threshold (`0.55`, `>=`, more budget) as if the basic assumption were still sound.

### 3.3 Combined lesson

The failed assumption chain was:

1. different language -> different pool  
2. different pool -> useful counterbalance  
3. useful counterbalance -> better neutrality

Only step 1 is reliable. Steps 2 and 3 are not.

That means v3 must independently control:
- **which claim** needs balancing,
- **which language** is worth searching,
- **which direction** of evidence is needed,
- and **how** that evidence is merged without creating new cross-claim inconsistency.

---

## 4. Design Constraints for Any Credible v3

Any future Phase 2 v3 must satisfy all of the following:

1. **Claim-aware, not pool-aware.**  
   Decisions cannot be based only on one aggregate evidence pool.

2. **Language choice and direction choice must be separate controls.**  
   A supplementary language may broaden coverage, but it must not be assumed to supply the missing direction automatically.

3. **No Gate 4 weakening.**  
   `contextConsistency` is correctly exposing cross-claim instability and must not be softened to make v3 appear better.

4. **Bounded and reversible rollout.**  
   Any v3 implementation must remain behind a UCM feature flag with a small validation set first.

5. **Generic multilingual design only.**  
   No Plastik-specific handling, no hardcoded topic keywords, no language-specific semantic shortcuts.

6. **Attributable diagnostics.**  
   Validation must record whether the new mechanism actually fired, per claim, per lane, before quality conclusions are drawn.

---

## 5. Candidate v3 Directions

Only a small number of options remain credible.

### Option A — Claim-Scoped Multilingual Retrieval Lanes

**Concept:**  
For each `AtomicClaim`, maintain separate retrieval lanes rather than one shared supplementary pool:
- primary-language lane
- supplementary-language lane(s)

Each lane gathers evidence independently for that claim. Dedup still happens, but lane attribution is preserved until late aggregation.

**Key property:**  
This avoids v1's flat-pool failure because supplementary evidence cannot silently rebalance only one claim while contaminating aggregate confidence accounting.

**What changes conceptually:**
- Stage 2 stores evidence with both `claimId` and `retrievalLane`
- balancing decisions happen per claim, not only globally
- late merge or comparison happens after lane-local evidence composition is visible

**Pros:**
- directly addresses v1's architectural failure
- preserves observability
- keeps the change focused in Stage 2 / Stage 3 interfaces

**Cons:**
- larger data-shape change than v1/v2
- likely requires careful pipeline refactor before implementation
- still does not by itself solve "language != direction"

**Assessment:**  
This is the best **minimum credible architecture family** if Plastik is reopened later.

### Option B — Independent Multilingual Claim Analysis, Then Reconciliation

**Concept:**  
Instead of pooling multilingual evidence inside one Stage 2 pass, run bounded per-claim analyses in two language lanes and reconcile their outputs later.

Example shape:
- analyze claim in primary language lane
- analyze claim in supplementary language lane
- compare/reconcile at claim verdict level
- only then feed the reconciled claim picture into overall aggregation

**Pros:**
- avoids both v1 shared-pool mixing and v2 language-as-direction proxy
- makes disagreement between language communities explicit
- strongest causal clarity

**Cons:**
- highest cost
- effectively a larger pipeline architecture extension
- more complex to explain and validate

**Assessment:**  
Highest-fidelity option, but too large as a first restart step unless product priority is very high.

### Option C — Keep the Limitation Parked

**Concept:**  
Do not build v3 now. Preserve the brief, keep the limitation explicit, and return only when multilingual neutrality for broad evaluative claims becomes a higher-priority product goal.

**Pros:**
- zero immediate regression risk
- matches current repository priorities
- avoids re-opening a proven-complex track during refactoring/cleanup

**Cons:**
- the known limitation remains
- no near-term quality gain on Plastik-family multilingual neutrality

**Assessment:**  
This is the correct default unless product priorities change.

---

## 6. Recommended v3 Path If Reopened Later

If Plastik is reopened, the recommended order is:

1. **Do not resume v1 or v2.**
2. Start with **Option A** as the smallest credible architecture family.
3. Keep **Option B** only as the escalation path if Option A cannot reduce spread without creating fresh inconsistency.

So the recommendation is:

> **Default now:** keep the limitation parked.  
> **If reopened later:** pursue a claim-scoped multilingual-lane design, not shared-pool supplementation and not language-as-direction contrarian retrieval.

---

## 7. Minimum Viable v3 Design Slice

If implementation is ever approved later, the smallest viable first slice should be:

1. **No product-default change**
   - keep behind a new UCM flag
   - do not reuse `crossLinguisticQueryEnabled` blindly without re-scoping it

2. **Claim-scoped supplementary evidence lane**
   - one supplementary lane only
   - one additional language only
   - one claim family validation set only

3. **Lane attribution preserved**
   - every supplementary evidence item must remain attributable to:
     - `claimId`
     - `retrievalLane`
     - retrieval language

4. **Per-claim diagnostics first**
   - before judging quality, verify:
     - did the lane run?
     - did it add evidence?
     - what direction did that evidence actually contribute?
     - did inter-claim spread shrink or widen?

5. **No prompt churn in the same step**
   - v3 should be tested as an architectural retrieval/data-flow change
   - do not simultaneously reopen prompt experimentation

---

## 8. Decision Gates Before Any Future Implementation

Before any v3 coding begins, all of these should be true:

1. **Product priority is explicit**
   - multilingual neutrality for broad evaluative claims is important enough to justify new architecture work

2. **Current active priorities are not displaced accidentally**
   - refactoring/cleanup track has either landed far enough
   - or the Captain explicitly reorders priorities

3. **A concrete v3 validation set is fixed in advance**
   - Plastik EN exact
   - Plastik DE exact
   - Plastik EN paraphrase
   - Plastik FR exact
   - Hydrogen smoke
   - Bolsonaro smoke or another current control

4. **Success criteria are explicit**
   - family spread materially reduced
   - no new confidence-collapse pattern
   - no new control-family regression
   - mechanism firing proven, not assumed

If these are not true, do not implement v3.

---

## 9. Recommendation

### Immediate recommendation

**Do not implement Phase 2 v3 now.**

The right action on 2026-03-22 is:
- keep Plastik multilingual neutrality parked,
- preserve this brief,
- and continue with the broader near-term stability/cleanup agenda.

### Strategic recommendation

If the limitation becomes important enough later, restart from:
- this brief,
- the v1/v2 post-mortems,
- and a claim-scoped multilingual-lane design.

Do **not** restart from:
- v1 shared supplementary pooling,
- v2 contrarian supplementary language,
- or threshold/budget tuning of either failed design.

---

## 10. Reviewer Questions

When this brief is reviewed, the useful questions are:

1. Is Option C (keep parked) still the right near-term decision?
2. If the issue is reopened later, is Option A the right smallest credible architecture family?
3. Is Option B worth keeping as an explicit escalation path, or is it too large to matter now?
4. Are the v3 preconditions and success gates strict enough to prevent another low-signal experiment cycle?

