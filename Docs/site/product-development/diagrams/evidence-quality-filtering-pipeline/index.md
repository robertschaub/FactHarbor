# Evidence Quality Filtering Pipeline

This diagram shows the evidence quality filtering layers across both pipeline variants. The **ClaimAssessmentBoundary pipeline** (default, production) uses Layers 1, 6, and 7. Layers 2-5 are defined in shared modules but currently only active in the **Monolithic Dynamic pipeline** (alternative).

![Evidence Quality Filtering Pipeline diagram 1](../../../diagrams/diagram-e01d1f6ca2d2966d.svg)

[Full-size diagram](../../../diagrams/diagram-e01d1f6ca2d2966d.svg) · [Mermaid source](../../../diagrams/diagram-e01d1f6ca2d2966d.mmd)

*Green = structural evidence filter (deterministic field checks). Orange = baseless challenge enforcement (hybrid: deterministic revert of LLM-assessed challenges). Blue = boundary clustering (LLM-powered Stage 3). Yellow = deterministic enforcement layers (Monolithic Dynamic pipeline only).*

## Layer Details

### Layer 1: Evidence Quality Filtering (both pipelines)

**File:** `evidence-filter.ts` \| **Function:** `filterByProbativeValue`

Deterministic structural safety net. Semantic quality assessment (vague phrases, attribution, deduplication) is handled by the LLM evidence quality service (`assessEvidenceQuality`) which runs before this filter.

Structural checks:

-   Opinion sources (`sourceAuthority === "opinion"`)
-   Low probativeValue (LLM-assigned field, `probativeValue === "low"`)
-   Statement too short (\< 20 characters)
-   Missing or short source excerpt (\< 30 characters)
-   Missing source URL
-   Statistics without numbers (digit presence check)

### Layer 6: Baseless Challenge Enforcement (CB pipeline)

**File:** `verdict-stage.ts` \| **Function:** `enforceBaselessChallengePolicy`

After the 5-step LLM debate pattern (advocate, consistency, challenge, reconcile, validate), this layer reverts any verdict adjustments caused by challenges that lack documented counter-evidence. Satisfies the AGENTS.md rule: *evidence-weighted contestation -- baseless challenges MUST NOT reduce truth% or confidence.*

### Layer 7: Boundary Clustering (CB pipeline)

**File:** `claimboundary-pipeline.ts` \| **Function:** `clusterBoundaries`

Stage 3 of the ClaimAssessmentBoundary pipeline. A single Sonnet-tier LLM call groups EvidenceScopes with compatible methodology, geography, temporal period, and analytical boundaries into ClaimAssessmentBoundaries.

### Layers 2-5: Monolithic Dynamic Pipeline Only

These layers are defined in shared modules (`provenance-validation.ts`, `aggregation.ts`) but are not imported or called by the ClaimAssessmentBoundary pipeline. They remain active in the Monolithic Dynamic pipeline variant.

-   **Layer 2** (`filterEvidenceByProvenance`): Validates source URL format (HTTP/S) and excerpt presence. Evidence items without valid provenance are rejected before verdict processing.
-   **Layer 3** (`pruneTangentialBaselessClaims`): Removes tangential or irrelevant claims that have fewer than 2 supporting evidence items, or whose evidence lacks medium/high probativeValue.
-   **Layer 4** (`getClaimWeight` / `calculateWeightedVerdictAverage`): Non-direct claims (`thesisRelevance !== "direct"`) receive weight=0, excluding them from the weighted verdict average.
-   **Layer 5** (`pruneOpinionOnlyContestation`): Drops contestation markers where `factualBasis` is "opinion" or "unknown". Only contestation with documented evidence ("established" or "disputed") is kept.
