# Scope Detection and Filtering (EvidenceScope)

This document explains how FactHarbor detects and manages **Scopes** (a.k.a. **EvidenceScopes** / bounded analytical frames), how scope relevance is enforced, and how claim relevance (`thesisRelevance`) affects research, verdicting, and UI.

## Terminology (critical)

- **ArticleContext**: Narrative/background framing of the article or user input. ArticleContext is **not** a reason to split analysis.
- **EvidenceScope (analysis scope)**: A bounded analytical frame that should be analyzed separately. In code this is `distinctProceedings` and `relatedProceedingId`.
- **per-fact evidenceScope (source scope)**: The scope metadata attached to *individual facts* (`ExtractedFact.evidenceScope`) describing methodology/boundaries/geography/temporal, etc.

### Prompt note (synonyms)

Prompts may use **scope / bounded context / boundary** as synonyms for *EvidenceScope (analysis scope)* **only if** the prompt includes the glossary above. Avoid the bare word “context” unless explicitly referring to **ArticleContext** or “bounded context”.

## Where scopes come from (pipeline)

At a high level:

1. **Step 1 (Understand)**: The model proposes initial `distinctProceedings` (EvidenceScopes) and assigns `relatedProceedingId` to sub-claims when applicable.
2. **Supplemental scope pass (optional)**: If the initial understanding under-splits, a best-effort scope-only prompt may propose additional scopes.
3. **Evidence-driven refinement**: After research produces facts, the system may refine scopes using facts (and per-fact `evidenceScope`) and remap assignments.

Regardless of the model output, deterministic checks enforce invariants (see below).

## Scope Relevance Requirement (CRITICAL)

**Every EvidenceScope must be directly relevant to the specific input topic.**

Practical implications:

- Do **not** create scopes from unrelated domains just because they share a broad category.
- Do **not** create “perspective scopes” (e.g., “US view” vs “Brazil view”) unless the evidence defines a distinct analytical frame.
- Prefer fewer scopes when uncertain.
- A scope with **zero relevant claims and zero relevant evidence** must not persist.

### Enforcement

FactHarbor enforces this in two layers:

- **Prompt constraints**: Scope-producing prompts explicitly include the Scope Relevance Requirement.
- **Deterministic backstop**: Scopes with **zero claims and zero facts** are pruned before verdict generation, and `requiresSeparateAnalysis` is recomputed.

Additionally, when analysis has **2+ scopes** and some claims cannot be assigned to a specific scope, FactHarbor creates a special scope:

- **`CTX_UNSCOPED`**: **General** (unassigned claims; no specific EvidenceScope identified)

This keeps evidence transparent (“unassigned” is explicit) without guessing the best scope.

## Claim relevance: `thesisRelevance` (Policy B)

`thesisRelevance` answers: “Does this claim affect whether the thesis is true/false?”

Allowed values:

- **direct**: The claim directly tests the thesis and must contribute to analysis.
- **tangential**: On-topic context that does not test the thesis (reactions, consequences, background).
- **irrelevant**: Off-topic noise.

### Policy B behavior (current)

- **direct**
  - Drives research targeting.
  - Receives a verdict entry in `claimVerdicts`.
  - Contributes to verdict aggregation.
- **tangential**
  - **Displayed** in the UI in a collapsed “Related context (excluded from verdict)” section.
  - Does **not** drive research targeting.
  - Does **not** receive a verdict entry in `claimVerdicts`.
  - Does **not** contribute to aggregation.
- **irrelevant**
  - Dropped deterministically (not shown; does not drive research; no verdicting).

### Invariants

Deterministic rules ensure stability across models/providers:

- If a claim is marked **central**, it is forced to `thesisRelevance="direct"`.
- If `thesisRelevance != "direct"`, then `centrality="low"` and `isCentral=false`.

These invariants prevent accidental weighting/drift when a provider emits inconsistent labels.

## Evidence transparency vs “filtering”

FactHarbor does **not** drop facts/claims for “prompt optimization” in a way that would remove evidence from the overall analysis.

When selection is needed for prompt size limits, the system should:

- **Rank/select for prompts only** (e.g., choose the most relevant facts to show the model),
- while keeping the full evidence set in the job result for transparency and auditability.

## Notes for contributors

- Keep logic **Generic by Design**: no domain-specific keyword lists or hardcoded topics.
- Maintain **Input Neutrality**: question vs statement forms must converge to the same analysis path.
- Preserve **Pipeline Integrity**: Understand → Research → Verdict stages must run; do not “skip” by dropping required data.
- Preserve **Evidence Transparency**: verdicts must cite facts; avoid introducing filters that hide or delete evidence.

