---
version: "1.0.9"
pipeline: "claimboundary"
description: "ClaimBoundary pipeline prompts — all stages (extraction, clustering, verdict, narrative, grouping)"
lastModified: "2026-04-26T23:25:00Z"
variables:
  - currentDate
  - analysisInput
  - originalClaim
  - atomicityGuidance
  - scopes
  - inferredGeography
  - relevantGeographies
  - claimsJson
  - maxConfidenceDelta
  - unknownDominanceThreshold
  - reasoningMaxChars
  - inputClassification
  - impliedClaim
  - articleThesis
  - atomicClaimsJson
  - maxRecommendedClaims
  - anchorText
  - salienceBindingContextJson
requiredSections:
  - "CLAIM_EXTRACTION_PASS1"
  - "CLAIM_SALIENCE_COMMITMENT"
  - "CLAIM_EXTRACTION_PASS2"
  - "CLAIM_EXTRACTION_PASS2_BINDING_APPENDIX"
  - "CLAIM_CONTRACT_VALIDATION"
  - "CLAIM_SINGLE_CLAIM_ATOMICITY_VALIDATION"
  - "CLAIM_CONTRACT_VALIDATION_BINDING_APPENDIX"
  - "CLAIM_SELECTION_RECOMMENDATION"
  - "CLAIM_CONTRACT_REPAIR"
  - "CLAIM_VALIDATION"
  - "GENERATE_QUERIES"
  - "RELEVANCE_CLASSIFICATION"
  - "EXTRACT_EVIDENCE"
  - "SCOPE_NORMALIZATION"
  - "BOUNDARY_CLUSTERING"
  - "VERDICT_ADVOCATE"
  - "VERDICT_CHALLENGER"
  - "VERDICT_RECONCILIATION"
  - "VERDICT_GROUNDING_VALIDATION"
  - "VERDICT_DIRECTION_VALIDATION"
  - "VERDICT_DIRECTION_REPAIR"
  - "VERDICT_CITATION_DIRECTION_ADJUDICATION"
  - "VERDICT_NARRATIVE"
  - "ARTICLE_ADJUDICATION"
  - "CLAIM_GROUPING"
  - "EXPLANATION_QUALITY_RUBRIC"
  - "TIGER_SCORE_EVAL"
  - "APPLICABILITY_ASSESSMENT"
  - "SR_CALIBRATION"
  - "REMAP_SEEDED_EVIDENCE"
---
