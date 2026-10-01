# Stage responsibilities and public contracts

The ClaimAssessmentBoundary pipeline keeps claims, evidence, analytical boundaries and verdicts distinct. Contributors should preserve these responsibilities across languages and topics.

## 1. Understand the input

Extract **AtomicClaims** that faithfully represent the user's assertions. Claim validation checks whether those assertions are suitable for evidential assessment. Input wording should not change analysis depth or verdict merely because it is phrased as a question rather than a statement.

## 2. Research evidence

Collect relevant supporting and opposing evidence. Each **EvidenceItem** retains its source and **EvidenceScope**. Source quality and probative value inform how evidence is used; an extracted statement is not automatically a verified fact.

## 3. Form analytical boundaries

Group compatible EvidenceScopes into **ClaimAssessmentBoundaries**. Boundaries emerge after research and express the conditions under which evidence can be assessed together. Preserve differences that affect interpretation instead of forcing unrelated findings into a single frame.

## 4. Generate, challenge and validate verdicts

Assess claims against evidence through the [structured debate](verdict-debate.md). Evidence-backed challenges may change an assessment; unsupported disagreement must not reduce truth or confidence. Validation checks grounding and the alignment between the verdict and its explanation.

## 5. Aggregate and explain

Combine claim-level assessments into the overall report without losing their evidence, boundaries or uncertainty. Confidence assessment is required. A report should let a reader inspect what was assessed, which evidence mattered and where conclusions are limited.

## Implementation and verification

Use the public [pipeline entry point](https://github.com/robertschaub/FactHarbor/blob/main/apps/web/src/lib/analyzer/claimboundary-pipeline.ts), [data contracts](https://github.com/robertschaub/FactHarbor/blob/main/apps/web/src/lib/analyzer/types.ts) and [contribution instructions](https://github.com/robertschaub/FactHarbor/blob/main/CONTRIBUTING.md) for implementation work. Semantic judgements remain model-based; structural validation, identifiers and resource control remain deterministic. Changes must retain multilingual robustness and evidence traceability.

This page defines responsibilities. It does not prescribe a fixed call schedule, provider selection or tuning recipe.
