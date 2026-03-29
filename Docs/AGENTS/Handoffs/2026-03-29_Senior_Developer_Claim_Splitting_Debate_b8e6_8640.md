## Executive Summary

Jobs `b8e616ef9a5e4678b074f2bb8614b2d1` and `8640e06255c4455cb97c9c699700b5ed` are related, but not identical.

- `b8e6...` shows a **Stage-1 fallback mis-tagging problem**:
  - `understanding.inputClassification = "single_atomic_claim"`
  - Pass 2 still emitted two near-duplicate claims (`Werkzeuge` vs `Methoden`)
  - fallback logic then auto-tagged them as `isDimensionDecomposition = true`
  - Gate 1 fidelity exemption let both survive

- `8640...` shows a **broader claim-splitting / independence problem**:
  - `understanding.inputClassification = "ambiguous_single_claim"`
  - three claims were produced:
    - AC_01: modern methods/tools
    - AC_02: efficient
    - AC_03: effective
  - AC_02 and AC_03 are not literal duplicates, but they are close evaluative neighbors and both starved at D5 (`UNVERIFIED` with only 1 evidence item each)

So the two jobs share a family-level issue:

> Stage 1 is too willing to preserve multi-claim decompositions without a robust check that the resulting claims are genuinely independent, non-overlapping, and evidence-separable.

But they do **not** share the exact same immediate cause:

- `b8e6...` is strongly tied to the `single_atomic_claim` fallback heuristic.
- `8640...` is more about permissive decomposition / contract validation for co-predicated evaluative inputs.

There is **no evidence that a committed change from the last 3 days caused this family**. The key behavioral fallback was introduced on 2026-03-23, and the last-3-day committed changes around this path were verdict/research work plus one Stage-1 observability change only.

## Track A: Job / Output Investigation

### Job `b8e616ef9a5e4678b074f2bb8614b2d1`

Stored facts:

- Executed build: `f1e5cc963849cb2745613eb6ca0f253e68e2a144+cbdf73b6`
- Input:
  - `Die SRG SSR und ihre Unternehmenseinheiten legen offen welche Fact-Checking-Werkzeuge und Methoden sie benutzen.`
- Classification:
  - `single_atomic_claim`
- Contract validation summary:
  - `preservesContract = true`
  - `rePromptRequired = false`
  - summary claims the extraction "perfectly preserves" the original contract

Extracted atomic claims:

1. `Die SRG SSR und ihre Unternehmenseinheiten machen öffentlich bekannt, welche Fact-Checking-Werkzeuge sie verwenden.`
2. `Die SRG SSR und ihre Unternehmenseinheiten machen öffentlich bekannt, welche Fact-Checking-Methoden sie anwenden.`

Both claims:

- `centrality = high`
- `claimDirection = supports_thesis`
- `isDimensionDecomposition = true`
- `passedFidelity = true`
- `passedSpecificity = false`

Interpretation:

- These are extremely similar conjunct splits of one disclosure proposition.
- They were treated as legitimate dimension claims even though the run itself still classified the input as `single_atomic_claim`.

### Job `8640e06255c4455cb97c9c699700b5ed`

Remote API facts:

- Executed build: `f1e5cc963849cb2745613eb6ca0f253e68e2a144`
- Input:
  - `Die SRG SSR und ihre Unternehmenseinheiten setzen moderne Fact-Checking-Methoden und -Werkzeuge ein und betreiben Fact-Checking effizient und wirksam`
- Classification:
  - `ambiguous_single_claim`
- Contract validation summary:
  - accepts all three claims as faithful

Extracted atomic claims:

1. `Die SRG SSR und ihre Unternehmenseinheiten setzen moderne Fact-Checking-Methoden und -Werkzeuge ein`
2. `Die SRG SSR und ihre Unternehmenseinheiten betreiben Fact-Checking effizient`
3. `Die SRG SSR und ihre Unternehmenseinheiten betreiben Fact-Checking wirksam`

Evidence / D5 outcome:

- AC_01: 6 evidence items, 3 domains, publishable verdict
- AC_02: 1 evidence item, 1 source type, 1 domain → `UNVERIFIED`
- AC_03: 1 evidence item, 1 source type, 1 domain → `UNVERIFIED`
- AC_02 and AC_03 did not share evidence items, but both were under-evidenced and both failed the same D5 sufficiency gate

Interpretation:

- AC_02 and AC_03 are not exact duplicates.
- But they are both close evaluative sub-claims carved from the same predicate neighborhood and both proved too fine-grained for the available evidence.
- This is an over-decomposition / independence-validation problem rather than a pure duplicate-string problem.

## Track B: Code / History Investigation

### Relevant code path

The critical logic is in `apps/web/src/lib/analyzer/claim-extraction-stage.ts`:

- Dimension-decomposition tagging block
- Gate 1 fidelity exemption for `isDimensionDecomposition`

Current behavior:

- if `inputClassification === "ambiguous_single_claim"` → tag all filtered claims as dimension decomposition
- fallback also tags claims when:
  - `inputClassification === "single_atomic_claim"`
  - `filteredClaims.length > 1`
  - every claim has `centrality = high` and `claimDirection = supports_thesis`

That fallback is broad enough to misclassify conjunct splits as legitimate dimensions.

### Commit history

Recent relevant committed history:

- 2026-03-29: verdict citation-carriage fix — unrelated
- 2026-03-28: warning/type cleanup — unrelated
- 2026-03-27: verdict/research changes — unrelated to Stage 1 extraction
- 2026-03-26: observability-only Stage 1 change — non-behavioral
- 2026-03-23: extraction refactor commit contains the current fallback dimension-tagging logic

Conclusion:

- No evidence of a last-3-day committed regression causing this.
- The problematic behavior predates that window.

## Debate

### Position 1: This is mostly a recent regression

Argument:

- Both jobs executed the same recent base commit (`f1e5...`)
- the family surfaced only now in visible investigations
- `8640...` and `b8e6...` both produce suspicious extra claims

Weakness:

- `f1e5...` is UI-only
- the Stage-1 behavioral logic was already present earlier
- the same pattern appears in jobs from 2026-03-26 to 2026-03-28

Verdict:

- Rejected

### Position 2: This is one unified duplicate-claim bug

Argument:

- both jobs have claims that are too similar
- fix should be a generic duplicate detector/merger

Weakness:

- `8640...` does not show literal duplicates; it shows evidence-inseparable evaluative sub-claims
- a pure duplicate detector would address `b8e6...` better than `8640...`

Verdict:

- Partially right, but too narrow

### Position 3: This is a broader Stage-1 independence-validation failure

Argument:

- `b8e6...` = bad fallback tagging for `single_atomic_claim`
- `8640...` = permissive decomposition accepted without enough check that resulting claims are independently falsifiable and likely evidence-separable
- both are manifestations of the same missing control:
  - after Pass 2, the system needs a better check that multi-claim outputs are genuinely distinct enough to keep separate

Verdict:

- Accepted

## Consolidated Solution

The best fix is **not** a narrow string-similarity rule and **not** a last-3-day rollback.

It should be a two-part Stage-1 hardening:

1. **Narrow the `single_atomic_claim` fallback dimension-tagging path**
   - do not auto-upgrade multi-claim `single_atomic_claim` outputs to dimension decompositions so easily
   - this directly addresses `b8e6...`

2. **Add an LLM-based claim independence / overlap validation step after Pass 2**
   - for any multi-claim output, ask whether the claims are:
     - genuinely distinct
     - independently falsifiable
     - non-overlapping in practical evidence needs
   - if not, merge or request retry
   - this addresses both:
     - near-duplicate conjunct splits (`b8e6...`)
     - overly fine evaluative splits that starve downstream (`8640...`)

This should be LLM-based, not deterministic text similarity logic, to stay within repository rules.

## Proposed Plan

1. **Immediate characterization**
   - sample 10-15 recent multi-claim Stage-1 runs
   - classify failure modes:
     - conjunct split
     - ambiguous-predicate dimension split
     - explicit multi-assertion input
     - legitimate decomposition

2. **Code-only first refinement**
   - tighten or remove the `single_atomic_claim` fallback auto-tag for dimension decomposition
   - require stronger evidence than `high + supports_thesis + >1 claim`

3. **LLM overlap / independence validator**
   - batched step after Pass 2
   - outputs per claim pair / whole set:
     - keep separate
     - merge
     - retry extraction

4. **Validation set**
   - `b8e6...`
   - `8640...`
   - Bolsonaro multi-claim family
   - one clearly legitimate ambiguous decomposition control

## Recommended Next Task

Design review first, then a narrow implementation experiment.

Reason:

- `b8e6...` has a clear code-level fallback problem
- `8640...` broadens the scope beyond literal duplicates
- a rushed single-rule fix would likely solve one and miss the other
