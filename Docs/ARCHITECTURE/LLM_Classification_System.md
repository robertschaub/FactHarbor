# LLM Classification System

FactHarbor utilizes a purely LLM-driven classification system for all semantic text analysis decisions. This system replaces legacy regex patterns, keyword lists, and heuristic rules with stage-aware LLM calls, ensuring multilingual robustness and semantic accuracy.

## 1. The LLM-Only Contract

Per the `AGENTS.md` mandate, all semantic decisions — understanding, classifying, comparing, or interpreting text meaning — **must** use LLM intelligence.

*   **No Heuristic Fallbacks**: The system does not use hybrid logic or pattern-based fallbacks.
*   **Fail-Fast Policy**: If an LLM call for text analysis fails, the pipeline generates a structured warning or error rather than reverting to deterministic guesses.
*   **UCM-Managed**: All classification prompts and parameters are managed via Unified Configuration Management (UCM).

## 2. Strategic Analysis Points

The system is organized around four strategic analysis points, each executed at specific stages of the analysis pipeline.

### 2.1 Input Classification (UNDERSTAND Stage)
Decomposes the user input into its constituent claims and classifies the overall nature of the request.
*   **Task**: Identify if the input is comparative, compound, or single-assertion.
*   **Classification**: Assigns claim types (evaluative, factual, predictive, mixed) and complexity levels.
*   **Decomposition**: Breaks complex input into `DecomposedClaim` objects with assigned roles (primary, supporting, context).

### 2.2 Evidence Quality Assessment (EXTRACT_EVIDENCE Stage)
Filters and scores extracted evidence items before they are used for verdict generation.
*   **Task**: Evaluate if an evidence item is highly probative or merely tangential.
*   **Scoring**: Assigns `high`, `medium`, or `low` quality assessments.
*   **Filtering**: Recommends filtering items that lack concrete relevance or factual basis.

### 2.3 Context Similarity Analysis (CONTEXT_REFINE / CLUSTER Stage)
Determines when analytical frames (ClaimAssessmentBoundaries or legacy AnalysisContexts) are semantically equivalent and should be merged.
*   **Task**: Compare two frames and compute a similarity score.
*   **Decision**: Recommends merging if similarity exceeds thresholds.
*   **Normalization**: Suggests a canonical name for the merged frame.

### 2.4 Verdict Validation (VERDICT Stage)
Performs a final adversarial check on generated verdicts to ensure internal consistency and safety.
*   **Task**: Verify if the verdict percentage matches the reasoning and evidence direction.
*   **Harm Potential**: Assesses if the claim involves high-risk topics (death, injury, fraud).
*   **Contestation**: Classifies if a claim is `established`, `disputed`, or merely an `opinion`.

## 3. Implementation Details

### 3.1 Components
*   **`ITextAnalysisService`**: The TypeScript interface defining the four analysis points.
*   **`LLMTextAnalysisService`**: Implementation using the AI SDK to route requests to tiered LLM providers.
*   **Prompt Externalization**: Prompts are stored in `apps/web/prompts/text-analysis/` and loaded via UCM.

### 3.2 Tiered Routing
Text analysis tasks are typically classification-heavy but reason-light. To optimize for cost and latency:
*   **Haiku Tier**: Used for most classification and decomposition tasks.
*   **Sonnet Tier**: Used for complex verdict validation or sensitive harm potential assessments.

### 3.3 Telemetry & Metrics
Every text analysis call is tracked for:
*   **Latency**: Processing time per analysis point.
*   **Success Rate**: Monitoring for schema validation or provider failures.
*   **Fallback Rate**: Tracking how often LLM failures require operational defaults.

## 4. Multilingual Robustness

By delegating classification to LLMs, FactHarbor achieves multilingual support without language-specific code:
*   **Meaning over Wording**: Decisions are based on semantic intent, not English-specific keywords.
*   **Unicode Awareness**: All structural checks use Unicode-aware patterns, ensuring consistent behavior across languages.

---
**See Also:**
* [`AGENTS.md`](../../AGENTS.md) — Engineering mandates for LLM intelligence.
* [`Prompt_Architecture.md`](Prompt_Architecture.md) — Detailed prompt structure and storage.
* [`Evidence_Quality_Filtering.md`](Evidence_Quality_Filtering.md) — How evidence scoring is applied.
