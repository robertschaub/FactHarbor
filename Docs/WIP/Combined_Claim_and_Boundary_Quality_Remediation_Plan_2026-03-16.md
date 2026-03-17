# Combined Claim and Boundary Quality Remediation Plan

**Date:** 2026-03-16  
**Status:** Ready for Review  
**Author:** Senior Developer  
**Related docs:** [Empty_Boundary_Pruning_Plan_2026-03-16.md](Empty_Boundary_Pruning_Plan_2026-03-16.md), [Plastik_Recycling_Report_Regression_Investigation_2026-03-16.md](Plastik_Recycling_Report_Regression_Investigation_2026-03-16.md)  
**Primary triggers:** Job `09e356e4` (empty / misleading boundaries), job `64c44032d2b84093ae2c97384996aad1` (`Plastik recycling bringt nichts`)

---

## 1. Purpose

This plan combines two currently open quality tracks into one implementation sequence:

1. **Claim-quality regression**
   - broad rhetorical claims are being decomposed too aggressively
   - weak or over-narrow dimension claims survive Gate 1
   - Stage 2 then amplifies those claims with skewed research allocation
   - degraded verdict objects can still ship as normal-quality reports

2. **Boundary-quality regression**
   - Stage 3 can create empty or misleading boundaries
   - scope extraction is too generic
   - clustering lacks an explicit analytical-dimension axis
   - coverage matrix output can imply analytical diversity that the evidence does not support

The goal is to solve both problems **without creating new regressions** in verdict quality, multilingual behavior, or schema stability.

---

## 2. Relationship Between The Two Problems

The two issues are **complementary**, not contradictory.

### 2.1 What the plastics regression plan is about

[Plastik_Recycling_Report_Regression_Investigation_2026-03-16.md](Plastik_Recycling_Report_Regression_Investigation_2026-03-16.md) focuses on the **claim contract and verdict quality**:

- Stage 1 narrows the thesis into easier-to-support subclaims
- Gate 1 keeps claims it already judged too vague
- Stage 2 allocates research budget in a way that amplifies that decomposition
- verdict integrity warnings do not currently block or downgrade the report

### 2.2 What the empty-boundary plan is about

[Empty_Boundary_Pruning_Plan_2026-03-16.md](Empty_Boundary_Pruning_Plan_2026-03-16.md) focuses on **evidence-scope and Stage 3 structure**:

- empty boundaries should be pruned
- scope extraction should distinguish methodology from analytical dimension
- clustering should separate evidence measuring different properties even when methodology is similar

### 2.3 How they interact

They interact in one important way:

- bad Stage 1 claims can feed Stage 2 and Stage 3 with already distorted analytical units
- bad Stage 3 boundaries then amplify the report-quality problem by producing noisy or misleading analytical frames

So Stage 3 cleanup helps the plastics case, but it does **not** solve the plastics root cause by itself.

---

## 3. Core Design Principle

Fix the pipeline in the same order that quality degrades:

1. **low-risk boundary cleanup first**
2. **claim contract plus verdict containment second**
3. **dimension-aware Stage 3 modeling third**
4. **resource allocation improvements after the claim and boundary contracts are stable**

This order minimizes two risks at once:

- creating cleaner-looking reports around still-bad semantic decomposition
- changing claim behavior without a verdict-quality safety net in place

---

## 4. Non-Negotiable Guardrails

These constraints apply to every phase.

### 4.1 No domain-specific logic

The fixes must remain generic:

- no plastics-specific heuristics
- no hydrogen/electric-specific heuristics
- no German-only wording assumptions

### 4.2 No deterministic semantic shortcuts

Any decision about:

- claim meaning
- claim fidelity
- dimension equivalence
- analytical framing

must remain LLM-driven, not regex or keyword logic.

This includes:

- selecting which decomposed claim is the most thesis-faithful rescue candidate
- deciding whether two analytical-dimension labels are semantically equivalent
- deciding whether a claim's contradiction coverage is substantively weak vs merely low-count

### 4.3 Keep `methodology` and `analyticalDimension` separate

If Stage 3 gets a dimension axis, it must not overload `EvidenceScope.methodology`.

- `methodology` = how the source measured
- `analyticalDimension` = what property the evidence measures

### 4.4 Backward compatibility

Any new scope field must be optional.

Existing jobs and stored evidence items must remain readable without schema migration.

### 4.5 Multilingual validation is required

Every analysis-affecting phase must be validated on:

- German
- English
- at least one non-English, non-German language

### 4.6 Prompt implementation must use abstract examples only

This plan discusses concrete trigger cases such as:

- `Plastik recycling bringt nichts`
- `X bringt nichts`
- `X is useless`

Those examples are acceptable in this planning document, but they must **not** be copied into analysis prompt text.

Implementation rule:

- prompt changes must use abstract examples only
- no test-case vocabulary copied from this WIP doc into `claimboundary.prompt.md`
- no ecology/economics/technical domain wording in prompt examples unless expressed abstractly

---

## 5. Proposed Combined Execution Plan

## Phase A — Safe Stage 3 Cleanup

**Goal:** Reduce UI/report noise immediately with minimal semantic risk.

### A1. Prune empty boundaries

Implement the downstream pruning fix from [Empty_Boundary_Pruning_Plan_2026-03-16.md](Empty_Boundary_Pruning_Plan_2026-03-16.md):

- after evidence assignment and `evidenceCount` computation
- remove boundaries with zero evidence
- preserve fallback behavior if all boundaries would disappear

### A2. Add evidence concentration warning

Also implement the downstream concentration warning:

- info-level only
- no verdict change
- signals when one boundary contains most of the evidence

Configuration note:

- the concentration threshold should be implemented as a UCM-configurable parameter rather than a hardcoded constant
- the original `0.8` proposal is an initial default, not a fixed design constant

### Why Phase A goes first

- low risk
- no schema change
- no Stage 1 semantic behavior change
- improves matrix/readability immediately
- can be validated as non-semantic cleanup before any claim-contract changes ship

### Explicitly not included in Phase A

- no `analyticalDimension` field yet
- no clustering semantic redesign yet
- no claim decomposition changes yet
- no verdict logic changes yet

### Phase A acceptance criteria

Phase A is only considered "safe" if the following hold on validation runs:

1. zero-evidence boundaries are removed from output
2. the new concentration warning appears only when threshold conditions are met
3. evidence assignment to non-empty boundaries is unchanged
4. deterministic pipeline outputs are unchanged apart from pruning true zero-evidence boundaries
5. any LLM-dependent outputs remain within expected run-to-run variance and show no material regression

If Phase A changes evidence assignment or deterministic boundary structure beyond pruning true zero-evidence boundaries, it must not ship as the standalone cleanup slice.

### Phase A explicit edge-case intent

- an empty `CB_GENERAL` boundary should be pruned like any other zero-evidence boundary
- validation must include both:
  - one positive case with empty boundaries
  - one negative case where all boundaries are non-empty and no pruning should occur

---

## Phase B — Claim Contract Tightening

**Goal:** Fix the root cause of bad broad-claim reports such as `Plastik recycling bringt nichts`.

### B1. Tighten Stage 1 decomposition for broad rhetorical evaluative claims

For claims like:

- `X bringt nichts`
- `X ist nutzlos`
- `X is useless`

Stage 1 may decompose into broad dimensions, but only with **neutral scope labels**:

- ecological
- economic
- technical
- procedural

It must not inject narrower causal/comparator predicates unless present in the input.

Allowed:

- `X has no ecological benefit`
- `X has no economic benefit`

Not allowed unless input-grounded:

- `X costs more than alternative disposal methods`
- `X fails because equal-quality reuse is impossible`
- `X has no ecological benefit regarding resource conservation and emissions reduction`

Implementation target:

1. update the ambiguous-claim decomposition guidance in the `CLAIM_EXTRACTION_PASS2` prompt section
2. tighten the Stage 1 atomicity/fidelity instructions that currently govern how dimension labels are formed
3. make any corresponding Gate 1 prompt tightening explicit where fidelity-to-input wording is checked

Phase B is not complete unless the implementation identifies the exact prompt sections it changes and keeps those changes abstract/example-safe.

### B2. Tighten Gate 1 retention behavior

The observed problem is not the existing final "rescue one claim if all are filtered" safety net.

The actual issue is earlier:

- dimension-decomposed claims currently bypass part of the fidelity filtering path
- and can numerically clear the specificity threshold even when Gate 1 reasoning still describes them as too broad

So Phase B2 must target the real mechanism:

1. tighten the fidelity exemption for `isDimensionDecomposition`
2. tighten how specificity is judged/applied for broad dimension-decomposed claims
3. ensure multiple vague dimension claims do not all pass Gate 1 simultaneously just because their numeric `specificityScore` remains above threshold

If tighter filtering would otherwise leave zero valid claims:

- rescue at most one broad faithful central claim
- avoid analyzing three vague claims just because they were marked dimension decompositions

Definition of "faithful":

- use the existing `impliedClaim` from Pass 2 as the rescue baseline
- this is the safest broad-thesis representation already produced by the LLM
- do not invent a new deterministic re-synthesis rule in code

Downstream contract note:

- the rescued output must still be emitted as a valid `AtomicClaim`, not as a raw string
- `statement` should use the `impliedClaim` text
- `centrality` should be `high`
- `isCentral` should be `true`
- `claimDirection` should remain `supports_thesis`
- `thesisRelevance` should remain `direct`
- other required fields should be inherited from the most faithful surviving broad-claim context or filled with conservative defaults that keep downstream stages valid

Important implementation constraint:

- the "rescue one" selection must be LLM-driven
- do not implement this as deterministic pick-first, pick-by-order, or pick-by-centrality code
- if filtering would otherwise leave zero valid claims, the system should preserve the LLM-produced broad thesis representation anchored on `impliedClaim`, rather than choosing among narrow dimension claims deterministically

### B2a. Reprompt-loop interaction

Phase B is expected to interact with the Stage 1 reprompt loop:

- stricter Gate 1 filtering may cause more runs to fall below `minCoreClaims`
- this can trigger additional reprompts
- additional reprompts increase cost and latency

That tradeoff is acceptable if claim quality improves, but it must be measured during validation.

Validation bound:

- Phase B should not ship without explicit approval if reprompt frequency or Stage 1 latency rises materially beyond the current run-to-run envelope
- a practical review default is to treat increases above roughly 15% on the targeted validation set as requiring explicit sign-off rather than silent acceptance

### B3. Keep the change generic

This is not a plastics fix.

The rule should apply to any broad rhetorical claim whose predicate implies value or uselessness without specifying mechanisms.

### B4. Prompt-scope clarification

Phase B should primarily tighten:

- Stage 1 dimension-label fidelity
- the conditions under which broad ambiguous predicates may be narrowed

It should not remove decomposition as a concept.

The intent is:

- keep legitimate multi-dimensional decomposition
- prevent over-specific dimension wording that inserts narrower mechanisms not present in the input

---

## Phase C — Verdict Integrity Containment

**Goal:** Prevent degraded verdict objects from shipping as normal-quality reports.

### C1. Treat integrity failures as quality blockers

For runs emitting:

- `verdict_grounding_issue`
- `verdict_direction_issue`
- `structural_consistency`

the system should not silently proceed as if report quality were normal.

Clarification on current code state:

- grounding and direction containment machinery already exists in code
- the relevant policies are currently disabled by default
- so Phase C is partly a policy/default-enablement change, not wholly new infrastructure

### C2. Allowed enforcement options

For existing warning types, Phase C should preferentially use already-supported enforcement where available:

1. enable/configure existing grounding and direction policies
2. add report-level degraded handling only where no current enforcement path exists

Default Phase C posture for implementation:

1. degraded-report marking is the default containment posture
2. safe downgrade is additionally used for structural metadata / integrity errors where a claim-level downgrade is more appropriate than only flagging the whole report
3. rerun is **not** a Phase C default and should remain reserved for future investigation or narrowly justified cases

### Why this phase is separate

This does not solve semantic decomposition, but it stops the system from presenting obviously compromised results as normal-quality outputs.

### Preferred rollout posture

Phase C should preferably ship **together with Phase B**, not alone.

Reason:

- Phase B changes claim extraction and Gate 1 retention behavior
- shipping Phase B without Phase C would allow newly reshaped claims to flow into user-facing reports without stronger integrity containment

So the preferred packaging is:

- `Phase A` alone first
- `Phase B + Phase C` together second

### Preferred enforcement by warning type

Do **not** use a blanket "rerun everything once" policy.

Recommended default mapping:

1. `verdict_grounding_issue`
   - default: degraded-report marking
   - rerun is not the default in this phase
   - rationale: visibility is lower risk than silently retrying and hiding the underlying issue
2. `verdict_direction_issue`
   - default: degraded-report marking
   - rationale: this usually signals a real mismatch between verdict direction and evidence structure, not random noise
3. `structural_consistency`
   - default: degraded-report marking
   - if the issue is claim-local metadata corruption, safe downgrade may also be appropriate
   - rationale: this indicates a broader pipeline/report integrity problem and should not be hidden behind variance

Any alternative mapping should be explicitly justified during implementation review.

Important scope note:

- grounding and direction containment can largely be implemented by enabling existing disabled policy/config paths
- `structural_consistency` does **not** currently have equivalent built-in containment and will require new report-level handling if included in Phase C

Minimum scope for `structural_consistency` in Phase C:

- start with an API/report-output metadata flag or equivalent report-level degraded marker
- do not require a broad UI redesign to ship `Phase B + C`
- richer UI treatment can follow later if needed

---

## Phase D — Upstream Boundary Quality

**Goal:** Make Stage 3 boundaries reflect real analytical differences rather than generic methodology buckets.

### D1. Add optional `analyticalDimension` to `EvidenceScope`

Add:

```ts
analyticalDimension?: string;
```

Meaning:

- the property or metric the evidence measures

Why this should be a first-class field instead of `additionalDimensions["analyticalDimension"]`:

- it is an explicit clustering axis
- it must participate in scope fingerprinting
- it needs stable visibility in normalization/clustering code and prompts
- putting it only inside `additionalDimensions` would make fingerprinting and contract review less explicit

Examples:

- energy conversion efficiency
- total cost of ownership
- storage capacity per unit mass
- procedural compliance

### D2. Extract `analyticalDimension` in Stage 2

Update the evidence extraction schema and prompt so each evidence item can carry:

- `methodology`
- `analyticalDimension`

with clear separation of meaning.

### D2a. Multilingual normalization requirement

`analyticalDimension` must not become a second free-text drift field that breaks cross-lingual grouping.

Preferred approach:

- keep the extracted field in the source/job language when appropriate
- update scope normalization so `analyticalDimension` values are compared semantically, not by raw string equality

Do **not** rely only on deterministic string equality of:

- `energy conversion efficiency`
- `Energieumwandlungseffizienz`
- `rendement de conversion`

Those must be treated as potentially equivalent by the normalization/clustering intelligence.

### D3. Use `analyticalDimension` in normalization and clustering

Update:

- scope fingerprinting
- scope normalization prompt/input
- Stage 3 clustering prompt

so same-methodology / different-dimension evidence is not over-merged.

Required implementation detail:

- update `scopeFingerprint()` to include `analyticalDimension`
- otherwise same-methodology / different-dimension scopes will still silently collide during unique-scope deduplication before clustering ever sees them

Important constraint:

- `analyticalDimension` should be a strong clustering signal, not an unconditional hard separator
- same methodology + different dimension often implies separate boundaries
- but final clustering still needs holistic congruence judgment across methodology, boundaries, geography, temporal scope, and evidence purpose

### Why Phase D comes after B

If we do this first, we risk producing cleaner boundaries around bad claims.

Phase B stabilizes what the pipeline is trying to prove. Phase D stabilizes how supporting evidence is organized.

---

## Phase E — Research Allocation Improvement

**Goal:** Stop Stage 2 from amplifying weak or skewed claim decomposition.

### E1. Minimum balanced coverage

Guarantee at least one substantive main-loop research pass per central claim before the scheduler begins recycling claims by count.

### E2. Improve targeting metric

Move beyond:

- "fewest total evidence items"

Toward:

- least contradiction coverage
- least institutional coverage
- weakest evidence diversity

Important implementation note:

- simple structural counts are acceptable only for structural signals already present in the data contract
- if the team wants to judge which claim has the weakest *substantive* contradiction portfolio, that choice must be LLM-driven

The implementation review should explicitly choose between:

1. a cheaper structural-count improvement, or
2. an LLM-assessed evidence-portfolio prioritization step

Do not let this phase drift into hidden deterministic semantic scoring.

### Why this is later

This phase should be implemented only after the claim and boundary contracts are stable. Otherwise it optimizes around unstable semantics.

---

## 6. What This Combined Plan Avoids

This sequence is explicitly designed to avoid these failure modes:

### 6.1 Avoid cleaner boundaries around bad claims

If Stage 3 is upgraded before Stage 1/Gate 1 are fixed, the system may look better while still testing the wrong claim shapes.

### 6.2 Avoid schema churn without payoff

By shipping Phase A first, the team gets immediate improvement without touching the schema.

### 6.3 Avoid topic-specific prompt patching

Neither problem should be solved with case-specific examples or claim-specific rules.

### 6.4 Avoid verdict drift from clustering-only changes

Stage 3 changes can alter the narrative and coherence of the report. Doing them after claim tightening makes regression attribution cleaner.

---

## 7. Validation Strategy

Each phase should be validated separately.

## Validation Set

### A. Boundary case

Use the hydrogen/electric empty-boundary case:

- `09e356e4`

Expected:

- no empty boundaries in report output
- coverage matrix no longer implies phantom analytical frames
- concentration warning appears only when justified
- claim verdicts and aggregate verdict remain unchanged

Also require a negative control:

- one job where all boundaries are already non-empty
- expected result: Phase A makes no pruning change

### B. Broad rhetorical claim case

Use:

- `Plastik recycling bringt nichts`

Expected after Phases B/C:

- broader, more faithful dimension claims
- fewer or no verdict integrity failures
- stronger anti-thesis contradiction balance than `64c44032...`

### C. English analogue

Use one broad English value claim:

- e.g. `X is useless`

Expected:

- same broad-dimension behavior
- no German-specific dependence

### D. Non-English non-German analogue

Use one additional language:

- e.g. French, Portuguese, or Spanish

Expected:

- stable decomposition behavior across languages
- no raw-string fragmentation of analytical-dimension grouping once Phase D is active

---

## 8. Success Criteria

The combined plan succeeds if:

1. empty boundaries disappear from the matrix without damaging valid boundaries
2. broad rhetorical claims remain broad during decomposition
3. Gate 1 no longer keeps multiple weak dimension claims by default
4. degraded verdict objects no longer ship as normal-quality reports
5. Stage 3 boundaries become more coherent after `analyticalDimension` is added
6. multilingual behavior remains stable
7. Phase D does not fragment semantically equivalent analytical dimensions by language wording alone
8. Phase D does not silently collapse different analytical dimensions through unchanged scope fingerprinting

---

## 9. Recommended Review Decision

Approve the combined plan with this exact sequencing:

1. **Phase A now**
   - empty-boundary pruning
   - concentration warning
2. **Phase B + C together next**
   - broad-claim decomposition tightening
   - Gate 1 retention tightening
   - verdict-integrity containment
3. **Phase D after B/C validation**
   - `analyticalDimension` field and Stage 3 redesign
4. **Phase E last**
   - research allocation improvement

### Shipment condition for `Phase B + C`

`Phase B + C` should ship together only if validation confirms:

1. the plastics case improves materially over `64c44032...`
2. one English analogue remains stable
3. one non-English non-German analogue remains stable
4. at least one unrelated non-rhetorical claim does not regress materially
5. verdict-integrity containment is explainable and not excessively trigger-happy

If these conditions are not met, do **not** split `B` from `C`. Rework the containment behavior first.

---

## 10. Review Questions

1. Is the proposed sequence acceptable: `Phase A` first, `Phase B + C` together second, Stage 3 redesign third?
2. Which verdict-integrity containment posture is preferred for `Phase B + C`: rerun, safe downgrade, degraded-report marking, or a defined combination?
3. Should Gate 1 rescue only one faithful broad claim when all decomposed claims fail specificity?
4. Is `analyticalDimension` the right typed field, or should the team prefer another explicit scope field?
5. Should Stage 2 balancing be upgraded only after the claim and boundary contracts stabilize?
6. Should existing verdict-integrity work from the inverse-claim asymmetry track be treated as a coordinated dependency for Phase C?

---

## 11. Bottom Line

The two open WIP issues are not competing plans.

They are parts of one quality problem at different layers:

- the plastics regression is primarily a **claim-quality problem**
- the empty-boundary issue is primarily a **boundary-structure problem**

The safe way to solve both is:

- clean up Stage 3 output immediately where risk is low,
- fix Stage 1/Gate 1 next where the real semantic regression lives,
- then make Stage 3 dimension-aware with an explicit `analyticalDimension` field,
- and only then tune Stage 2 allocation.

That sequence solves both problems while minimizing the chance of creating a new one.
