## Sequential LLM Refinement Review (Local Changes Report)

**Date**: 2026-01-25  
**Scope**: Review of current local changes vs plan intent for sequential LLM refinement (no code changes proposed/applied in this document).

### Inputs reviewed

- **Plan**: `C:\Users\rober\.cursor\plans\sequential_llm_refinement_c7b90262.plan.md`
- **Implementation**: `apps/web/src/app/api/internal/evaluate-source/route.ts`
- **Docs**: `Docs/ARCHITECTURE/Source_Reliability.md`

---

## Executive summary

Your local changes **do implement the plan’s sequential refinement architecture**:

- **LLM1 (Claude)** performs the initial evaluation.
- **LLM2 (GPT-5 mini)** performs a structured cross-check and optional refinement.
- The response includes **refinement tracking fields**.

Beyond the plan, the implementation also adds substantial **prompt hardening** and **evidence-pack improvements** intended to improve stability and reduce systematic under/over-rating under weak evidence.

### Update note (latest local changes)

Since the initial draft of this review, the local `route.ts` changes improved materially:

- **`identifiedEntity` nullability aligned**: the Zod schema and payload typing now allow `null`, matching prompt examples.
- **Prompts made more AGENTS.md-friendly**: real organization names were removed from prompt guidance (remaining references are in code comments, not prompt text).
- **Shared prompt sections introduced**: shared constants are reused by both evaluation and refinement prompts to reduce wording drift.

### Highest-impact remaining risks found

1) **Cap messaging inconsistency inside prompts (stability risk)**  
The evaluation prompt includes both:
- language implying **hard caps** (“MUST be ≤ X”), and
- language allowing **exceptions** (“unless evidence demonstrates…”),
while also injecting shared blocks that describe caps as “hard limits.” Mixed messaging can reduce stability near boundaries and increase cross-model disagreement.

2) **Refinement is now less “deterministically corrective” for conservative first-pass scores**  
The plan’s earlier baseline numeric ranges for certain organization types were removed in favor of generic evidence-signal guidance. This is better for generality, but may reduce how often the refinement stage reliably “rescues” overly conservative initial scores when evidence is sparse-but-positive.

---

## Plan vs implementation alignment

### What the plan asked for (high level)

- Add `getRefinementPrompt(...)` with explicit cross-check + entity identification guidance.
- Add `refineEvaluation(...)` to call the secondary model with the refinement prompt.
- Replace parallel multi-model consensus with **sequential refinement**.
- Add response payload fields to track refinement.
- Update documentation to reflect the new architecture.

### What is implemented (matches the plan)

- **Refinement prompt exists**: `getRefinementPrompt(...)` is present and includes initial-result context + evidence pack + structured JSON output instructions.
- **Refinement call exists**: `refineEvaluation(...)` calls OpenAI (`gpt-5-mini`) and parses refinement JSON via `RefinementResultSchema`.
- **Main flow uses sequential refinement**: `evaluateSourceWithConsensus(...)` follows the plan’s “Claude → GPT cross-check” pipeline.
- **Response payload includes refinement tracking**: `refinementApplied`, `refinementNotes`, `originalScore`.
- **Docs reflect v1.3 sequential refinement**: `Docs/ARCHITECTURE/Source_Reliability.md` includes the sequential refinement section and response fields.

---

## Review of current local changes (implementation details)

### Evidence pack building (quality + practicality)

The evidence-pack builder now uses:

- **Brand token derivation** and **brand variants** for relevance matching
- **Three query phases**:
  - Standard domain+brand queries (reliability / bias / standards)
  - Entity-focused queries (brand only, ownership/standards)
  - Negative-signal queries (disinformation / debunked / propaganda) if still under evidence target
- **Relevance filtering** that checks:
  - Direct domain mention in title/snippet/url
  - URL host match (domain/subdomain)
  - Brand variant mention

Practical impact: This should reduce “empty evidence” outcomes and increase the chance that the pack contains both positive and negative signals, improving score stability.

### Evaluation prompt hardening (LLM effectiveness)

`getEvaluationPrompt(...)` is now a deeply structured prompt with:

- **Hard caps** based on negative evidence and on source type (propaganda/disinfo/state-controlled/platform UGC)
- **Evidence-only** enforcement and “self-published pages don’t count” guidance
- **Mechanistic confidence formula**
- **Assessor tiers** and evidence hierarchy
- **Few-shot examples** (intended to be abstract per comment)

This generally improves determinism and reduces “model drift,” but prompt length and schema consistency must be managed carefully (see risks).

### Shared prompt sections (consistency benefit)

Shared prompt blocks (rating scale, bias values, source type definitions, score caps, evidence signals) are now reused across both the initial evaluation and the refinement prompts. This reduces drift where LLM1 and LLM2 interpret the same evidence differently due purely to wording differences.

### Sequential refinement architecture (stability benefit)

The sequential design is a meaningful improvement over parallel consensus when:

- The initial evaluation is conservative due to skeptical defaults, and
- The second model can find overlooked entity-level signals in the same evidence pack.

This is consistent with the doc update and the plan rationale.

---

## LLM effectivity & stability assessment

### Strengths (stability-positive)

- **Strong instruction hierarchy**: critical rules and caps are front-loaded.
- **Mechanistic confidence**: tends to reduce arbitrary confidence values.
- **Entity-level requirement** is explicit in evaluation and reinforced in refinement.
- **Structured refinement schema** encourages stable, parseable outputs.

### Risks / fragility (stability-negative)

#### A) `identifiedEntity` nullability mismatch (previously high severity — now resolved)

This mismatch was addressed by making `identifiedEntity` nullable in the schema/typing, matching the prompt examples.

#### B) AGENTS.md prompt compliance (previously high severity — largely improved)

Real organization names were removed from the prompt guidance and replaced with organization-type descriptions.

#### C) Cap messaging inconsistency (medium-to-high severity)

Caps are sometimes described as strict hard limits and sometimes as “hard unless X.” This is a common source of unstable scoring and inconsistent `sourceType` selection near boundaries.

#### D) Cross-stage rule tension (medium severity)

Stage 1 emphasizes skeptical default (“absence of negative evidence is not positive evidence”), while Stage 2 guidance suggests that for established org types, lack of negative evidence can support a baseline.

This is not necessarily wrong, but it can create variability:

- Sometimes Stage 2 adjusts upward; sometimes it doesn’t, depending on whether the evidence pack contains clear “established org” signals.

#### E) Prompt length / token cost / compliance (medium severity)

The evaluation prompt is very long. Longer prompts can:

- Increase latency/cost
- Increase chance of partial/truncated output under timeouts/token ceilings
- Increase risk of “schema drift” toward the end of the prompt

---

## Practicality & operations review

### What’s good

- Clear logging around major stages and failure modes (primary fail, refinement fail, refined vs confirmed).
- Dedicated refinement schema (`RefinementResultSchema`) and a structured `refinementNotes` summary.
- Response payload supports tracing (`originalScore`, `refinementApplied`, `refinementNotes`), aligned with docs.

### Potential consumer surprises

- `identifiedEntity` can now be **`null`**. Any UI/consumer should treat `null` as “unknown” (avoid rendering `"null"`).
- The refinement prompt summary line uses a falsy check (`identifiedEntity || "Not identified"`). With nullable values, `null` and `""` both render as “Not identified,” which may hide the difference between explicit-unknown and empty-string.
- `ResponsePayload` includes `identifiedEntity?: string | null`, but `buildResponsePayload(...)` does not populate it by default; it is set later in some branches. Downstream consumers should not assume it is always present even when the model produced it.

---

## Recommendations (no code changes in this report)

### Priority 1: Confirm `identifiedEntity` semantics end-to-end

The current direction (nullable `identifiedEntity`) is consistent with prompt examples. Ensure this is consistent across:

- `EvaluationResultSchema`
- Evaluation prompt output schema + examples
- `RefinementResultSchema`
- UI / downstream consumers

Recommended: treat `null` as canonical “unknown,” and avoid using `""` for unknown.

### Priority 2: Resolve AGENTS.md prompt compliance

This has been largely addressed by removing real organization names from prompt guidance. If you want to be extra strict, also consider removing the remaining real-name examples from code comments (even though they are not part of the prompts).

### Secondary improvements

- Reduce duplication and overall prompt size by moving stable constraints into the system message and trimming repeated long lists.
- Make the refinement stage explicitly depend on **positive signals present in the evidence pack** (institutional use, independent mentions), rather than relying on “absence alone,” to reduce variability.

---

## Notes on documentation alignment

`Docs/ARCHITECTURE/Source_Reliability.md` already documents v1.3 sequential refinement and the response tracking fields, and appears consistent with the current route implementation.

---

## Open decisions (recommended to confirm)

1) **Caps wording**: should caps be treated as truly hard limits in the prompt text, or should “exception” language be kept (and then reflected consistently in the shared caps block)?
2) **Refinement guidance**: do you want to reintroduce “baseline” guidance in a more generic way (without naming specific orgs), or keep refinement purely evidence-signal driven?

