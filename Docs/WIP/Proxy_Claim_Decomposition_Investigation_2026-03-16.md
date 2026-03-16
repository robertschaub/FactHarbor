# Proxy Claim Decomposition Fix Plan

**Date:** 2026-03-16  
**Status:** Ready for Review (corrected after deputy review)  
**Investigated by:** Senior Developer  
**Primary job:** `b0e49796fd66464da62fca5700201850`  
**Related docs:** [Ambiguous_Claim_Decomposition_Quality.md](Ambiguous_Claim_Decomposition_Quality.md), [Gate1_Investigation_2026-03-09.md](Gate1_Investigation_2026-03-09.md)

---

## 1. Problem Statement

For the input claim:

> "Muslims are more violent than Christians."

the pipeline extracted this atomic claim:

> "Muslims are perceived or portrayed as more violent than Christians in terms of media representation and public discourse."

That claim is verifiable, but it is not the same real-world claim as the user's input. It is a **proxy / representation claim** about portrayal and discourse, not a direct claim about comparative violence.

The current pipeline still:
- keeps this claim as central,
- researches it,
- produces a high-truth verdict for it,
- and includes it in the overall verdict aggregation.

This is undesirable. A claim about media portrayal should not count toward the overall verdict of a direct claim about whether one group is actually more violent than another, unless the user explicitly asked about portrayal, perception, framing, or discourse.

---

## 2. Observed Behavior In The Investigated Job

### Input

`Muslims are more violent than Christians.`

### Extracted atomic claims

From `resultJson.understanding.atomicClaims`:

1. `AC_01`
   - `Muslims commit acts of violence at higher rates than Christians in terms of actual violent incidents and deaths.`
2. `AC_02`
   - `Muslims are perceived or portrayed as more violent than Christians in terms of media representation and public discourse.`
3. `AC_03`
   - `Muslims are more violent than Christians in terms of organized extremist group violence and terrorism.`

All three were:
- `isCentral: true`
- `centrality: high`
- `checkWorthiness: high`
- `harmPotential: high`
- `isDimensionDecomposition: true`

### Gate 1 stats

From `resultJson.understanding.gate1Stats`:

- `totalClaims: 3`
- `passedOpinion: 3`
- `passedSpecificity: 1`
- `passedFidelity: 3`
- `filteredCount: 0`

So Gate 1 removed nothing.

### Claim verdicts

From `resultJson.claimVerdicts`:

- `AC_01`: `25%` truth, `58` confidence
- `AC_02`: `73%` truth, `73` confidence
- `AC_03`: `51%` truth, `46` confidence

### Overall result

- Overall truth: `50.9%`
- Verdict: `MIXED`
- Confidence: `60.8`

### Why this matters

`AC_02` is the strongest positive claim in the set and materially lifts the aggregate result.

Even a simple arithmetic check shows the distortion:
- Average of all 3 claims: `(25 + 73 + 51) / 3 = 49.7`
- Average without `AC_02`: `(25 + 51) / 2 = 38.0`

Stage 5 uses weighted aggregation, not a simple average, but this still demonstrates the direction and magnitude of the problem: the proxy claim is substantially raising the overall verdict.

---

## 3. Root Cause

This is not a random one-off bad extraction. It is a structural opening in the current design.

### 3.1 Pass 2 explicitly allows ambiguous-predicate decomposition

In `apps/web/prompts/claimboundary.prompt.md`, ambiguous single claims are intentionally decomposed into multiple "interpretation dimensions".

For this input, the model treated `"more violent"` as including:
- actual violent incidents,
- organized extremist violence,
- media/public portrayal of violence.

The first two are arguable direct dimensions of the claim. The third is not.

### 3.2 Gate 1 checks the wrong boundary

Gate 1 currently checks:
- opinion,
- specificity,
- fidelity to the original input.

But the current fidelity rule is mainly about preventing evidence contamination, not about blocking semantic drift from a direct-world claim to a proxy claim.

So this claim can pass fidelity because it is not importing a dataset or numerical qualifier from evidence. It is instead reframing the predicate into a discourse / representation dimension.

### 3.3 Aggregation has an exclusion mechanism, but this pipeline does not feed it

The aggregation layer already supports excluding claims via:

- `thesisRelevance = direct | tangential | irrelevant`

in:
- `apps/web/src/lib/analyzer/aggregation.ts`

However, in this ClaimBoundary path, the claims/verdicts for this job had no useful `thesisRelevance` assigned, so `AC_02` was counted by default.

Important implementation note:

- the shared `aggregation.ts` helpers already understand `thesisRelevance`
- but `aggregateAssessment()` in `apps/web/src/lib/analyzer/claimboundary-pipeline.ts` does **not** call those helpers
- it computes weights inline in its own `weightsData` block

So the actual enforcement must be added in `claimboundary-pipeline.ts`, not assumed to happen automatically through `aggregation.ts`.

### 3.4 ClaimBoundary schema support is incomplete

The repository already contains `thesisRelevance` in older/shared verdict concepts, which is why the idea is not new.

But the active ClaimBoundary path is still missing explicit end-to-end support:

- the ClaimBoundary `AtomicClaim` contract does not currently preserve it
- `Pass2AtomicClaimSchema` in `claimboundary-pipeline.ts` does not parse it
- `CBClaimVerdict` does not currently carry it for downstream transparency

So the implementation gap is not just "turn on an existing field". The ClaimBoundary path still needs its own schema and propagation work.

### 3.5 Gate 1 specificity is also weaker than it looks

The current Gate 1 logic does **not** remove a claim simply because the LLM says `passedSpecificity = false`.

A claim is filtered only when:
- it fails fidelity, or
- it fails both opinion and specificity, or
- its numeric `specificityScore` falls below threshold.

This means Gate 1 currently has no direct way to say:

> "This is a valid, verifiable claim, but it is the wrong kind of claim for the user's thesis."

That missing classification is the real gap.

---

## 4. Why This Is A Quality Problem

This issue directly affects report quality because it mixes two different analytical objects:

- **Direct claim**: whether the underlying real-world proposition is true
- **Proxy claim**: whether institutions, media, or public discourse portray it as true

Those are not interchangeable.

If the user asks:

> "Are Muslims more violent than Christians?"

then these are different questions:

- Are Muslims actually more violent than Christians?
- Are Muslims portrayed as more violent than Christians?
- Do people perceive Muslims as more violent than Christians?

The second and third may be relevant context, but they must not be treated as equally valid inputs to the final truth percentage of the first.

---

## 5. Approved Solution Direction

### Recommendation: introduce an LLM-classified directness field and use it in aggregation

The cleanest fix is to add an explicit semantic classification for whether an extracted claim is:
- a **direct** expression of the user's thesis, or
- a **proxy / representation / meta** claim that should be contextual only.

This should be LLM-classified, not regex-based, to remain compliant with `AGENTS.md`.

### Proposed field

Prefer reusing the existing aggregation language if possible:

- `thesisRelevance: "direct" | "tangential" | "irrelevant"`

This aligns with the existing shared aggregation logic and avoids overloading `claimDirection`.

Interpretation guidance:
- direct real-world dimensions of the input thesis => `direct`
- portrayal / perception / labeling / discourse / representation claims => `tangential` or `irrelevant`
  unless the user explicitly asked about portrayal/perception/discourse

### Behavioral rule

For direct real-world inputs:

- contextual proxy claims may still be shown in the report if useful
- but they must **not contribute to the overall truth percentage**

That means:
- `direct` claims retain aggregate weight
- `tangential` and `irrelevant` claims get aggregate weight `0`

---

## 6. Implementation Plan

### Phase 1: schema + prompt plumbing

#### 1. Extend Stage 1 extracted-claim schema

Existing codebase note:

- `thesisRelevance` already exists in legacy/shared aggregation concepts elsewhere in the repo
- but the ClaimBoundary `AtomicClaim` contract and Pass 2 parser do not currently preserve it end-to-end

Implementation target:

- add `thesisRelevance?: "direct" | "tangential" | "irrelevant"` to the ClaimBoundary `AtomicClaim` contract in `apps/web/src/lib/analyzer/types.ts`
- add the field to `Pass2AtomicClaimSchema` in `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`, e.g.

```ts
thesisRelevance: z.enum(["direct", "tangential", "irrelevant"]).optional().catch(undefined)
```

Purpose:
- make direct-vs-proxy classification an explicit part of the claim contract
- preserve it through understanding, verdict, and aggregation

#### 2. Extend the Pass 2 prompt

In `apps/web/prompts/claimboundary.prompt.md`:

- ask the LLM to classify each extracted claim's relationship to the original input thesis
- define `direct` as a claim that answers the same real-world proposition as the input
- define `tangential` as contextual or proxy claims such as portrayal, framing, labeling, discourse, or perception when the input did not ask about those
- define `irrelevant` for claims that do not meaningfully answer the input thesis

This classification must be based on semantic relationship to the original input, not on keywords.

#### 3. Tighten Gate 1 prompt guidance

Update `CLAIM_VALIDATION` guidance so the LLM explicitly understands that:

- a claim can be verifiable yet still not be a direct thesis claim
- shifting from a direct real-world predicate to a representation/perception/discourse predicate is not fidelity-preserving for the purpose of overall claim assessment

Gate 1 should not be the only enforcement layer, but the prompt should reinforce the distinction so extraction and validation remain aligned.

---

### Phase 2: pipeline propagation

#### 4. Preserve `thesisRelevance` through Stage 1

Ensure the field survives:

- Pass 2 parsing
- centrality filtering
- Gate 1 validation output handling
- `state.understanding.atomicClaims`

Guardrail:
- missing `thesisRelevance` should not silently default to `direct` forever
- if backward compatibility requires a fallback, it should be explicit and temporary

#### 5. Propagate `thesisRelevance` into verdicts

Ensure `CBClaimVerdict` and related verdict structures carry the field into Stage 5.

Required schema consistency:
- `AtomicClaim`
- `CBClaimVerdict`
- any intermediate shaping layer that maps claims into verdicts

This was a specific review concern and should be implemented explicitly, not assumed by spread copying or by the presence of similarly named legacy fields elsewhere in the repo.

---

### Phase 3: aggregation enforcement

#### 6. Exclude non-direct claims from overall truth calculation

Enforcement location:

- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
- inside `aggregateAssessment()`
- specifically in the inline `weightsData` computation block, not in `aggregation.ts`

Required behavior in Stage 5 aggregation:

- `direct` claims retain weight
- `tangential` and `irrelevant` claims get weight `0`

Behavioral rule:
- keep proxy claims visible in the report if useful for context
- do not let them affect overall truth percentage or overall confidence

Concrete implementation note:

- `aggregateAssessment()` already looks up the source claim with `const claim = claims.find((c) => c.id === verdict.claimId)`
- use `claim?.thesisRelevance` there
- after computing the inline weight inputs, explicitly zero out non-direct claims in that same block

Pseudo-shape:

```ts
const thesisRelevance = claim?.thesisRelevance;
if (thesisRelevance && thesisRelevance !== "direct") {
  return {
    truthPercentage: effectiveTruth,
    confidence: verdict.confidence,
    truthPercentageRange: effectiveRange,
    weight: 0,
  };
}
```

This uses the existing aggregation concept, but the enforcement point is the inline CB aggregation block. Do not document or implement this as if `aggregation.ts` were the active execution path for ClaimBoundary Stage 5.

#### 7. Keep visibility in the report

Do not hide proxy claims entirely.

Recommended first-pass behavior:
- keep them in `claimVerdicts`
- add a UI cue later if needed, such as `Contextual` or `Not counted in overall verdict`

This keeps the report transparent while solving the aggregate-truth bug.

---

### Phase 4: regression coverage

#### 8. Add a regression test for the proxy-claim failure mode

Use a case equivalent to:

> "Muslims are more violent than Christians."

Expected:
- if a portrayal/perception/media-framing claim is extracted, it must be marked non-direct
- it must not contribute to the overall verdict

Test should verify both:
- classification behavior
- aggregation exclusion behavior

#### 9. Add a schema/backward-compatibility check if needed

If old results may lack `thesisRelevance`, tests should cover the chosen compatibility behavior explicitly.

---

## 7. Concrete File Touchpoints

Likely implementation files:

- `apps/web/prompts/claimboundary.prompt.md`
- `apps/web/src/lib/analyzer/types.ts`
- `apps/web/src/lib/analyzer/claimboundary-pipeline.ts`
- `apps/web/src/lib/analyzer/verdict-stage.ts`
- `apps/web/test/unit/lib/analyzer/claimboundary-pipeline.test.ts`
- possibly `apps/web/test/unit/lib/analyzer/verdict-stage.test.ts`
- possibly `apps/web/test/unit/lib/analyzer/schema-backward-compatibility.test.ts`

Reference-only file:

- `apps/web/src/lib/analyzer/aggregation.ts`
  - reference-only for `thesisRelevance` semantics
  - no enforcement change expected for the first ClaimBoundary fix

---

## 8. Implementation Guardrails

### 8.1 Relevance over direction

Do not overload `claimDirection`.

`claimDirection` answers:
- supports thesis
- contradicts thesis
- contextual

That is not the same question as:
- is this a direct thesis claim or a proxy/context claim?

`thesisRelevance` is the correct abstraction because aggregation already understands it.

### 8.2 No deterministic keyword filter

Do not implement this with regexes or string lists such as:
- `perceived`
- `portrayed`
- `framed`
- `labeled`

That would violate repository guidance and fail across languages.

### 8.3 Proxy claims should be excluded, not just down-weighted

The issue is conceptual, not merely statistical.

A proxy claim is not a weaker version of the same claim. It is a different class of claim.

So the first implementation should use:
- weight `0`

not:
- partial penalty

### 8.4 Keep harm-potential out of this first fix

The investigated job also suggests that `harmPotential` may be overly anchored to topic rather than predicate, since the media-portrayal claim also received `high`.

That is a legitimate follow-up concern, but it is not the causal bug here.

Recommendation:
- defer harm-potential tuning to a separate small review after the proxy-claim fix ships

---

## 9. Review Questions

The implementation phase should be approved if the team agrees on these points:

1. Claims about portrayal, framing, perception, or discourse are not equivalent to direct claims about the underlying phenomenon.
2. Such claims may remain visible for context but must not affect the overall verdict unless explicitly requested by the input.
3. `thesisRelevance` is the correct mechanism to carry this distinction into aggregation.
4. The first implementation should solve this by exclusion from aggregation, not by penalty weighting.

---

## 10. Rollout Order

Recommended order:

1. Prompt/schema addition for `thesisRelevance`
2. Pipeline propagation into verdicts
3. Aggregation exclusion
4. Regression tests
5. Optional UI badge for contextual claims

This keeps the first patch focused on correctness and minimizes review surface.

---

## 11. Deferred Follow-Up

### Harm potential anchoring

Observed in the investigated job:
- `AC_02` is a portrayal/public-discourse claim
- it still received `harmPotential: high`

This suggests the model may currently anchor harm severity too strongly on the topic area (`religion`, `violence`) rather than the exact claim predicate.

Recommendation:
- do not bundle this into the proxy-claim fix
- open a separate minor review if the team wants to recalibrate harm-potential assessment

---

## 12. Prompt-Level Tightening Recommended

In addition to adding the field, the Stage 1 prompt should explicitly warn against this failure mode.

Suggested generic rule for `CLAIM_EXTRACTION_PASS2` and/or `CLAIM_VALIDATION`:

> When the user input asserts a direct real-world property, do not decompose it into claims about media representation, labeling, public perception, discourse, or portrayal unless the input itself explicitly asks about those representational phenomena.

And for Gate 1:

> Claims that shift from the input's real-world proposition to a representation/proxy proposition may be verifiable, but they are not fidelity-preserving and must not be treated as direct thesis claims.

This remains generic, multilingual-safe, and LLM-based.

---

## 13. Why Not Solve This Deterministically

A deterministic keyword rule such as filtering words like:

- `perceived`
- `portrayed`
- `framed`
- `labeled`

would violate repository guidance for semantic decisions and would be brittle across languages.

This classification must stay LLM-based.

---

## 14. Alternatives Considered

### A. Tighten Gate 1 fidelity only

Pros:
- small change

Cons:
- overloads fidelity with a concept it does not currently represent
- still leaves no explicit downstream signal for aggregation
- less observable/debuggable than an explicit field

### B. Down-weight proxy claims instead of excluding them

Pros:
- less aggressive

Cons:
- still lets the wrong claim shape the overall verdict
- does not solve the conceptual error

### C. Ban ambiguous-claim decomposition more broadly

Pros:
- avoids this class of mistake

Cons:
- loses useful decomposition in many valid cases
- too blunt

### Preferred

Use explicit LLM-classified directness / thesis relevance and exclude non-direct claims from aggregation.

---

## 15. Proposed Review Decision

Approve implementation if the team agrees with all three statements:

1. Claims about portrayal/perception/discourse are not equivalent to direct claims about the underlying phenomenon.
2. Such claims should not affect the overall verdict unless explicitly part of the user's input.
3. The correct fix is an explicit LLM-classified directness signal propagated into aggregation.

---

## 16. Regression Test To Add

Use a case equivalent to:

> "Muslims are more violent than Christians."

Expected behavior:

- direct violence-related dimensions may remain
- a portrayal/perception/media-framing claim must not contribute to the overall verdict

Success condition:

- if such a claim is extracted, it is marked non-direct and excluded from aggregation
- or it is filtered earlier and never reaches aggregation

---

## 17. Review Outcome

Latest review conclusion:

- causal chain confirmed
- `thesisRelevance` chosen over overloading `claimDirection`
- parser gap identified explicitly: `Pass2AtomicClaimSchema` must ingest `thesisRelevance`
- ClaimBoundary path still needs explicit schema consistency across `AtomicClaim` and `CBClaimVerdict`; similarly named legacy/shared fields elsewhere in the repo do not remove that requirement
- exclusion rule approved: proxy claims remain visible but receive aggregate weight `0`
- enforcement location corrected: `aggregateAssessment()` inline weight block in `claimboundary-pipeline.ts`
- `aggregation.ts` remains the semantic reference, not the execution hook for this pipeline path
- harm-potential over-classification noted as a separate follow-up, not part of this fix

---

## 18. Summary

The reviewed direction is now implementation-ready.

The core change is:

- add explicit LLM-classified `thesisRelevance`
- preserve it end-to-end
- exclude non-direct proxy claims from Stage 5 aggregation

This solves the investigated bug without using brittle heuristics, points implementers to the real ClaimBoundary enforcement location, stays aligned with existing aggregation design, and keeps contextual transparency in the report.
