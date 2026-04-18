# Flat-Earth False-Ambiguity — Reviewer Notes

**Date:** 2026-03-30
**Role:** Code/Architecture Reviewer
**Subject:** Flat-Earth `c7c3528...` False-Ambiguity & Representational Drift Path

---

## 1. Executive summary

An evaluation of job `c7c3528ce21b46abb1b4965466ad0c3d` (and `c492414...`) reveals a clear pipeline vulnerability: Stage 1 is improperly classifying direct physical-property questions ("Ist die Erde flach?") as `ambiguous_single_claim`. This over-application prompts the LLM to invent additional interpretation dimensions, leading to representational drift (e.g., extracting a second claim about "prevalence of flat-earth beliefs").

Because this improper dimension is finalized at Stage 1, all downstream stages (research, verdicts, matrices) faithfully process the irrelevant claim. The proposed fix path is low-risk and structurally sound, directly addressing the underlying misclassification without resorting to deterministic code refactoring.

## 2. What the two jobs prove

The observations from `c7c3528ce21b46abb1b4965466ad0c3d` and `c492414da7fa422c8ef51156488b9e04` decisively demonstrate:
1. **The bug is localized to Stage 1:** Both runs show the incorrect claim is present in the initial extraction out of Stage 1. This means downstream code (stages 2–5) is not at fault; those stages are correctly analyzing the bad inputs they were handed.
2. **The trigger is `ambiguous_single_claim`:** This classification causes the extraction step to assume it *must* find multiple dimensions, prompting it to "hallucinate" public perception / societal prevalence as a legitimate interpretative dimension.
3. **The problem predates general Stage 1 over-fragmentation refactoring:** This is a distinct sub-type of extraction drift (representational drift) rather than strict factual conjunct splitting (like the `Werkzeuge/Methoden` issue).

## 3. Root-cause assessment

This is definitively a Stage-1 false-ambiguity problem.
*   **Over-application:** `ambiguous_single_claim` is being applied too permissively. A question about a literal, real-world physical property is inherently *unambiguous* — it demands a single, objective answer.
*   **Representational Drift:** The second claim regarding public perception or belief popularity is not an "interpretation" of the original question; it is a subject change (sociology/polling vs. physics). Unless the user explicitly asks "Do people believe...?", introducing a prevalence metric is a breach of the user's intended claim contract. 

## 4. Evaluation of the proposed fix path

The updated, low-risk proposal elegantly restricts intervention to strictly prompt-based mechanisms, aligning perfectly with `AGENTS.md`. The revised scope prevents regression on prior functionality. 

1.  **Narrow `ambiguous_single_claim` restriction (Primary):** *Strongly Supported.* Targeting *only* direct physical/factual-property questions ("Is X flat?", "Did Y happen?", "Does Z exist?") prevents this change from interfering with legitimately ambiguous assertions.
2.  **Explicit prohibition rules for Contract Validation (Backup):** *Strongly Supported.* Explicitly instructing the LLM that real-world material claims cannot expand into "discourse" or "public perception" claims safely prevents representational drift without resorting to deterministic logic traps. 
3.  **Deprioritizing Observability (for now):** *Supported.* Removing the retry-diagnostic tracking from the critical path helps minimize the size and risk profile of this PR, letting it focus strictly on prompt refinement.

## 5. Risks / cautions

Implementation must adhere strictly to the following constraints to preserve the pipeline state:
*   **No deterministic keywords:** Do not use regex, language-specific strings (e.g., "Erde", "flach", "beliefs"), or hardcoded filters anywhere in the pipeline code. The semantic interpretation stringency belongs strictly in LLM prompt instructions.
*   **No downstream cleanup:** Do not implement filters in Stage 4 or Stage 5 that try to retroactively drop "belief" claims. If a claim makes it out of Stage 1, the pipeline must process it. Fix it at the source.
*   **Do not touch genuine evaluative ambiguity handling:** The prompt instructions for `ambiguous_single_claim` must remain intact for genuinely debatable evaluative inputs ("Does X work?", "Is Y harmful?").
*   **Do not change Code flow:** Do not touch Gate 1 code logic, D5 limits, verdict thresholds, or the architecture of Stage 1. This must remain a strict prompt-text update.

### Recommended Validation Suite
The implemented prompt changes must strictly be validated against a test suite covering:
*   *Factual-state properties (Must remain 1 claim):* "Ist die Erde flach?", "Is the Earth round?", "Did event X happen?".
*   *Genuinely ambiguous evaluative controls (Must maintain ambiguous path):* "Does homeopathy work?", "Plastic recycling bringt nichts".

## 6. Final judgment

Approved. This is the lowest-risk fix path that cleanly targets the false-positive class without breaking existing evaluative paths.

`Proposed fix path justified`
