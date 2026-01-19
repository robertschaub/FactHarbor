# Context Detection and Filtering (AnalysisContext)

This document explains how FactHarbor detects and manages **AnalysisContexts** (bounded analytical frames), how relevance is enforced, and how claim relevance (`thesisRelevance`) affects research, verdicting, and UI.

## Terminology (CRITICAL)

| Term | Meaning | Code Location |
|------|---------|---------------|
| **AnalysisContext** | A bounded analytical frame that should be analyzed separately. Shown in UI as "Contexts". | `analysisContexts` field (legacy: `distinctProceedings`) |
| **ArticleFrame** | Narrative/background framing of the input. NOT a reason to split. | `analysisContext` field (legacy: `proceedingContext`) |
| **EvidenceScope** | Per-fact source methodology/boundaries. Attached to individual facts. | `ExtractedFact.evidenceScope` |

### Key distinctions

- **AnalysisContext** = TOP-LEVEL analytical frames (e.g., "Case A", "Method A vs Method B")
- **EvidenceScope** = PER-FACT source metadata (e.g., "WTW methodology", "EU regulatory framework")
- **ArticleFrame** = Background narrative (NOT a reason to create separate AnalysisContexts)

### Prompt note (synonyms)

In prompts, you may use **scope / bounded context / boundary** as synonyms for *AnalysisContext* **only if** the prompt includes a terminology glossary. Avoid the bare word "context" unless explicitly referring to **ArticleFrame** or "bounded context" (AnalysisContext).

## Where analysis contexts come from (pipeline)

At a high level:

1. **Step 1 (Understand)**: The model proposes initial `analysisContexts` (AnalysisContexts) and assigns `contextId` to sub-claims when applicable.
2. **Supplemental pass (optional)**: If the initial understanding under-splits, a best-effort prompt may propose additional analysis contexts.
3. **Evidence-driven refinement**: After research produces facts, the system may refine analysis contexts using facts (and per-fact `evidenceScope`) and remap assignments.

Regardless of the model output, deterministic checks enforce invariants (see below).

## Relevance Requirement (CRITICAL)

**Every AnalysisContext must be directly relevant to the specific input topic.**

Practical implications:

- Do **not** create analysis contexts from unrelated domains just because they share a broad category.
- Do **not** create "perspective contexts" (e.g., "Country A view" vs "Country B view") unless the evidence defines a distinct analytical frame.
- Prefer fewer analysis contexts when uncertain.
- An analysis context with **zero relevant claims and zero relevant evidence** must not persist.

### Enforcement

FactHarbor enforces this in two layers:

- **Prompt constraints**: Context-producing prompts explicitly include the relevance requirement.
- **Deterministic backstop**: Analysis contexts with **zero claims and zero facts** are pruned before verdict generation, and `requiresSeparateAnalysis` is recomputed.

Additionally, when analysis has **2+ analysis contexts** and some claims cannot be assigned to a specific context, FactHarbor creates a special context:

- **`CTX_UNSCOPED`**: **General** (unassigned claims; no specific AnalysisContext identified)

This keeps evidence transparent ("unassigned" is explicit) without guessing the best context.

## Claim relevance: `thesisRelevance` (Policy B)

`thesisRelevance` answers: "Does this claim affect whether the thesis is true/false?"

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
  - **Displayed** in the UI in a collapsed "Related context (excluded from verdict)" section.
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

## Evidence transparency vs "filtering"

FactHarbor does **not** drop facts/claims for "prompt optimization" in a way that would remove evidence from the overall analysis.

When selection is needed for prompt size limits, the system should:

- **Rank/select for prompts only** (e.g., choose the most relevant facts to show the model),
- while keeping the full evidence set in the job result for transparency and auditability.

## Notes for contributors

- Keep logic **Generic by Design**: no domain-specific keyword lists or hardcoded topics.
- Maintain **Input Neutrality**: question vs statement forms must converge to the same analysis path.
- Preserve **Pipeline Integrity**: Understand → Research → Verdict stages must run; do not "skip" by dropping required data.
- Preserve **Evidence Transparency**: verdicts must cite facts; avoid introducing filters that hide or delete evidence.
