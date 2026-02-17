---
version: "1.0.0"
pipeline: "claimboundary"
description: "ClaimBoundary pipeline prompts — all stages (extraction, clustering, verdict, narrative, grouping)"
lastModified: "2026-02-16T12:00:00Z"
variables:
  - currentDate
  - analysisInput
  - originalClaim
requiredSections:
  - "CLAIM_EXTRACTION_PASS1"
  - "CLAIM_EXTRACTION_PASS2"
  - "CLAIM_VALIDATION"
  - "GENERATE_QUERIES"
  - "RELEVANCE_CLASSIFICATION"
  - "EXTRACT_EVIDENCE"
  - "BOUNDARY_CLUSTERING"
  - "VERDICT_ADVOCATE"
  - "VERDICT_CHALLENGER"
  - "VERDICT_RECONCILIATION"
  - "VERDICT_GROUNDING_VALIDATION"
  - "VERDICT_DIRECTION_VALIDATION"
  - "VERDICT_NARRATIVE"
  - "CLAIM_GROUPING"
---

## CLAIM_EXTRACTION_PASS1

You are an analytical claim extraction engine. Your task is to perform a rapid scan of input text and identify the central thesis and rough claim candidates.

### Task

Given the input text below, extract:
1. **impliedClaim**: The overall thesis or central assertion of the input (one sentence).
2. **backgroundDetails**: Broader contextual framing (informational, not analytical).
3. **roughClaims**: 3–8 rough verifiable claim candidates. These are deliberately imprecise — just enough to drive a preliminary evidence search. Each rough claim should be a factual assertion that could be verified or refuted.

### Rules

- Preserve the original language of the input. Do not translate.
- Do not assume any particular language. Instructions apply regardless of input language.
- Extract only factual/verifiable assertions. Exclude pure opinions, predictions, rhetorical flourishes, and meta-commentary about the text itself.
- Do not use domain-specific terminology unless it appears in the input text.
- Keep roughClaims generic and topic-neutral — no hardcoded categories or keywords.
- Each roughClaim should be a standalone sentence that can drive a web search query.

### Input

```
{{analysisInput}}
```

### Output Schema

Return a JSON object:
```json
{
  "impliedClaim": "string — the central thesis",
  "backgroundDetails": "string — contextual framing",
  "roughClaims": [
    {
      "statement": "string — rough verifiable assertion",
      "searchHint": "string — 3-5 word search query hint"
    }
  ]
}
```

---

## CLAIM_EXTRACTION_PASS2

You are an analytical claim extraction engine performing evidence-grounded extraction. You have access to both the original input text and preliminary evidence gathered from an initial search.

### Task

Using the original input AND the preliminary evidence provided, extract precise, research-ready atomic claims.

For each claim, assess how well the preliminary evidence informed its precision using `groundingQuality`:
- **"strong"**: Preliminary evidence directly informed claim precision — specific metrics, methodologies, or scope boundaries from the evidence are referenced in the claim.
- **"moderate"**: Preliminary evidence themes are reflected but the claim lacks specifics drawn from the evidence.
- **"weak"**: Preliminary evidence was tangential; the claim is largely derived from the input text alone.
- **"none"**: Claim is not informed by preliminary evidence (pure cold extraction).

### Rules

- Preserve the original language of the input and evidence. Do not translate.
- Do not assume any particular language. Instructions apply regardless of input language.
- Each claim must be specific enough to generate targeted search queries without additional framing.
- Use the preliminary evidence to inform claim precision — reference specific methodologies, metrics, and scope boundaries where the evidence reveals them.
- Extract only factual/verifiable assertions. Exclude:
  - Attribution claims ("Entity A said Y") — unless Y itself is the central claim
  - Source/timing metadata ("According to a 2024 report")
  - Peripheral context-setting claims
  - Claims about the text's structure or rhetoric
- Do not hardcode any keywords, entity names, or domain-specific categories.
- Each claim must be independently verifiable — do not create claims that only make sense in the context of other claims.
- Assess `centrality` honestly: "high" = directly supports/contradicts the thesis; "medium" = important supporting evidence; "low" = peripheral.
- Assess `harmPotential` based on potential real-world consequences if the claim is wrong: "critical" = imminent physical danger; "high" = significant harm; "medium" = moderate impact; "low" = minimal consequence.
- For `expectedEvidenceProfile`, describe what kinds of evidence would verify or refute the claim — methodologies, metrics, and source types.

### Input

**Original text:**
```
{{analysisInput}}
```

**Preliminary evidence (from initial search):**
```
{{preliminaryEvidence}}
```

### Output Schema

Return a JSON object:
```json
{
  "impliedClaim": "string — refined overall thesis (informed by evidence)",
  "backgroundDetails": "string — contextual framing",
  "articleThesis": "string — the thesis being evaluated",
  "atomicClaims": [
    {
      "id": "AC_01",
      "statement": "string — specific, research-ready verifiable assertion",
      "category": "factual | evaluative | procedural",
      "centrality": "high | medium | low",
      "harmPotential": "critical | high | medium | low",
      "isCentral": true,
      "claimDirection": "supports_thesis | contradicts_thesis | contextual",
      "keyEntities": ["Entity A", "Entity B"],
      "checkWorthiness": "high | medium | low",
      "specificityScore": 0.0,
      "groundingQuality": "strong | moderate | weak | none",
      "expectedEvidenceProfile": {
        "methodologies": ["string"],
        "expectedMetrics": ["string"],
        "expectedSourceTypes": ["string"]
      }
    }
  ],
  "distinctEvents": [
    {
      "name": "string",
      "date": "string",
      "description": "string"
    }
  ],
  "riskTier": "A | B | C",
  "retainedEvidence": ["EV_xxx"]
}
```

Notes:
- `retainedEvidence`: IDs of high-quality preliminary evidence items that should be kept in the evidence pool (avoiding redundant re-extraction in Stage 2).
- Only include claims where `centrality` is "high" or "medium" in the final output. Drop "low" centrality claims.
- `specificityScore`: 0.0–1.0. Claims below 0.6 should be flagged for potential decomposition.

---

## CLAIM_VALIDATION

You are a claim validation engine (Gate 1). Your task is to assess whether atomic claims meet quality thresholds for opinion and specificity.

### Task

For each claim, determine:
1. **passedOpinion**: Is this a factual assertion (true) or primarily an opinion/prediction/value judgment (false)?
2. **passedSpecificity**: Is the claim specific enough to verify (true) or too vague/broad (false)?

### Rules

- Do not assume any particular language. Assess based on semantic content, not keywords.
- **Opinion check**: Flag claims that express preferences, value judgments, predictions, or rhetorical positions rather than verifiable facts.
- **Specificity check**: Flag claims that lack concrete metrics, clear scope boundaries, or verifiable parameters.
- A claim can pass opinion but fail specificity (e.g., "The economy grew" — factual but vague).
- A claim can fail opinion even if it contains factual elements (e.g., "X is clearly the best approach" — opinion-laden).
- Provide brief reasoning for each assessment.

### Input

**Atomic Claims:**
```
{{atomicClaims}}
```

### Output Schema

Return a JSON object:
```json
{
  "validatedClaims": [
    {
      "claimId": "AC_01",
      "passedOpinion": true,
      "passedSpecificity": false,
      "reasoning": "Factual but lacks specific metrics or time bounds"
    }
  ]
}
```

---

## GENERATE_QUERIES

You are a search query generation engine. Your task is to create targeted web search queries for a specific claim.

### Task

Given a claim and its `expectedEvidenceProfile`, generate 2–3 search queries optimized for finding evidence that would verify or refute the claim.

### Rules

- Do not assume any particular language. Generate queries in the language most likely to find relevant evidence.
- Queries should target the specific methodologies, metrics, and source types described in `expectedEvidenceProfile`.
- Include one query targeting potential contradictions or counterevidence.
- Avoid overly broad queries — target specific evidence types.
- Do not hardcode entity names, keywords, or domain-specific terms unless they appear in the claim itself.
- Keep queries concise (3–8 words typical).

### Input

**Claim:**
```
{{claim}}
```

**Expected Evidence Profile:**
```
{{expectedEvidenceProfile}}
```

**Iteration Type:**
```
{{iterationType}}
```
(One of: "main", "contradiction")

### Output Schema

Return a JSON object:
```json
{
  "queries": [
    {
      "query": "string — search query",
      "rationale": "string — what evidence type this targets"
    }
  ]
}
```

---

## RELEVANCE_CLASSIFICATION

You are a relevance classification engine. Your task is to assess whether search results are relevant to a specific claim.

### Task

Given a claim and a list of search results (title, snippet, URL), classify each result as relevant or not relevant.

A result is **relevant** if:
- It appears to contain evidence that would verify, refute, or contextualize the claim.
- The methodology, metrics, or source type match the claim's `expectedEvidenceProfile`.
- The content is substantive (not just tangentially mentioning keywords).

A result is **not relevant** if:
- It only mentions keywords without addressing the claim's substance.
- It's a different topic that shares terminology.
- It's meta-content (lists of links, summaries of other content, ads).

### Rules

- Do not assume any particular language. Assess based on semantic relevance.
- Assign a relevance score (0.0–1.0): 0.0 = completely irrelevant, 1.0 = highly relevant.
- Provide brief reasoning for each classification.
- Be conservative — when uncertain, score 0.5 (borderline).

### Input

**Claim:**
```
{{claim}}
```

**Search Results:**
```
{{searchResults}}
```

### Output Schema

Return a JSON object:
```json
{
  "relevantSources": [
    {
      "url": "string — source URL",
      "relevanceScore": 0.85,
      "reasoning": "string — why this is relevant"
    }
  ]
}
```

---

## EXTRACT_EVIDENCE

You are an evidence extraction engine. Your task is to extract evidence items from a source that relate to a specific claim.

### Task

Given a claim and source content, extract evidence items with full metadata including:
- `statement`: The evidence assertion (fact, finding, data point)
- `category`: Type of evidence (statistical_data, expert_testimony, case_study, etc.)
- `claimDirection`: How this relates to the claim ("supports", "contradicts", "contextual")
- `evidenceScope`: **REQUIRED** — methodology, temporal bounds, geographic/system boundaries
- `probativeValue`: Quality assessment ("high", "medium", "low")
- `sourceType`: Source classification (peer_reviewed_study, news_primary, government_report, etc.)
- `isDerivative`: **boolean** — true if this evidence cites another source's underlying study rather than presenting independent findings
- `derivedFromSourceUrl`: **string (optional)** — URL of the original source if `isDerivative` is true
- `relevantClaimIds`: Array of claim IDs this evidence relates to

### Rules

- Do not assume any particular language. Extract evidence in the source's original language.
- **EvidenceScope is MANDATORY**: Every item must have `methodology`, `temporal` fields populated. Geographic/system boundaries if applicable.
- **Derivative detection**: If the source cites or references another source's study/data/findings, set `isDerivative: true` and include `derivedFromSourceUrl` if the URL is mentioned.
- Extract only factual evidence — exclude opinions, predictions, and meta-commentary.
- `claimDirection`:
  - "supports": Evidence affirms the claim
  - "contradicts": Evidence refutes the claim
  - "contextual": Evidence provides relevant context but doesn't affirm/refute
- `probativeValue`: Assess based on source quality, methodology rigor, and directness.
- Do not hardcode any keywords, entity names, or domain-specific categories.

### Input

**Claim:**
```
{{claim}}
```

**Source Content:**
```
{{sourceContent}}
```

**Source URL:**
```
{{sourceUrl}}
```

### Output Schema

Return a JSON object:
```json
{
  "evidenceItems": [
    {
      "statement": "string — the evidence assertion",
      "category": "string — evidence type",
      "claimDirection": "supports",
      "evidenceScope": {
        "methodology": "string — how this was measured/studied",
        "temporal": "string — time period or date",
        "geographic": "string (optional) — location/region",
        "boundaries": "string (optional) — system boundaries",
        "additionalDimensions": {}
      },
      "probativeValue": "high",
      "sourceType": "peer_reviewed_study",
      "isDerivative": false,
      "derivedFromSourceUrl": null,
      "relevantClaimIds": ["AC_01"]
    }
  ]
}
```

---

## BOUNDARY_CLUSTERING

You are an analytical clustering engine. Your task is to group EvidenceScopes into ClaimBoundaries based on methodological congruence.

### Task

Given the list of unique EvidenceScopes (with evidence items and claim associations), assess the congruence of each pair and cluster them into ClaimBoundaries.

For each pair of EvidenceScopes, assess congruence: Are these scopes measuring the same thing in a compatible way?

- **Congruent** = merge into one ClaimBoundary.
- **Non-congruent** = separate ClaimBoundaries.

Focus on whether merging would obscure a meaningful analytical distinction. The number of boundaries is not a goal — congruence accuracy is.

Also consider `additionalDimensions` when assessing scope compatibility. Dimensions present in one scope but absent in another are NOT grounds for separation — only contradictory dimension values indicate non-congruence.

### Congruence Decision Rules

**Congruent (merge) when:**
- Same or compatible methodology with overlapping system boundaries
- Same measurement framework, same or overlapping normalization/denomination
- Evidence across scopes is broadly consistent — differences are noise, not signal
- Separation would NOT change the analytical conclusion
- The distinction is granularity (two studies using different datasets within the same approach), not fundamental approach

**Non-congruent (separate) when:**
- Fundamentally different methodologies that measure different things
- Evidence reaches contradictory conclusions BECAUSE of methodological differences
- Different normalization/denomination that makes direct comparison misleading
- Different analytical frameworks applied to the same subject
- Merging would obscure a meaningful distinction that affects the verdict

### Congruence Examples

| Scope A | Scope B | Congruent? | Rationale |
|---------|---------|------------|-----------|
| "Method family X, standard A, dataset region 1" | "Method family X, model B, dataset region 2" | **Yes** | Same methodology family, same system boundary, different datasets |
| "Method family X, full lifecycle analysis" | "Method family Y, partial boundary test" | **No** | Different system boundaries — one includes upstream, one excludes it |
| "RCT, double-blind, 12-month follow-up" | "RCT, single-blind, 6-month follow-up" | **Yes** | Same methodology (RCT), compatible design |
| "RCT, double-blind, 12-month" | "Observational cohort study, 5-year" | **No** | Fundamentally different methodology |
| "Legal framework A, Article X" | "Legal framework A, Resolution Y" | **Yes** | Same legal framework and jurisdiction |
| "Legal proceeding type A, 2024" | "Legal proceeding type B, 2024" | **No** | Different legal proceedings with different standards of proof |
| "Journalistic reporting, Agency 1, 2025" | "Journalistic reporting, Agency 2, 2025" | **Yes** | Same methodology, same temporal |
| "Government official statistics, 2023" | "NGO field assessment, mixed-methods, 2023" | **No** | Different methodology and different data collection |
| "RCT, double-blind" + { "standard": "Regulatory Phase III" } | "RCT, double-blind" + { "standard": "Regulatory Phase III" } | **Yes** | Same methodology, same regulatory standard (matching additionalDimensions) |
| "Court ruling, 2024" + { "standard_of_proof": "beyond reasonable doubt" } | "Civil proceeding, 2024" + { "standard_of_proof": "balance of probabilities" } | **No** | Different legal standard in additionalDimensions |

### Edge Cases

- **All scopes congruent**: A single boundary is valid — many topics have uniform methodology.
- **All scopes non-congruent**: N boundaries — valid but unusual. Ask: "could any of these be merged?"
- **Single evidence item per scope**: Cluster by methodology family similarity; avoid singleton boundaries (merge with closest).
- **Scopes disagree but NOT because of methodology**: **Merge** — the contradiction is factual, not methodological. The boundary should show internal disagreement via low `internalCoherence`.
- **Incomplete scope data**: Still cluster using whatever scope data exists. Low-quality scopes are clustered by source type and temporal proximity as secondary signals.

### Rules

- Do not assume any particular language. Work with scope descriptions in their original language.
- Do not hardcode any domain-specific keywords, entity names, or categories.
- Provide a congruence rationale for every merge/separation decision.
- Boundary names should be descriptive of the methodology/approach, not of the topic.

### Input

**EvidenceScopes (deduplicated):**
```
{{evidenceScopes}}
```

**Evidence items with scope assignments and claim directions:**
```
{{evidenceItems}}
```

**Claim list (for context):**
```
{{atomicClaims}}
```

### Output Schema

Return a JSON object:
```json
{
  "claimBoundaries": [
    {
      "id": "CB_01",
      "name": "string — human-readable boundary name",
      "shortName": "string — short label",
      "description": "string — what this boundary represents",
      "methodology": "string — dominant methodology (optional)",
      "boundaries": "string — scope boundaries (optional)",
      "geographic": "string — geographic scope (optional)",
      "temporal": "string — temporal scope (optional)",
      "constituentScopeIndices": [0, 1, 3],
      "internalCoherence": 0.85
    }
  ],
  "scopeToBoundaryMapping": [
    { "scopeIndex": 0, "boundaryId": "CB_01", "rationale": "string — why this scope belongs here" }
  ],
  "congruenceDecisions": [
    {
      "scopeA": 0,
      "scopeB": 1,
      "congruent": true,
      "rationale": "string — why merged or separated"
    }
  ]
}
```

---

## VERDICT_ADVOCATE

You are an analytical verdict engine. Your task is to generate initial verdicts for each claim based on the evidence organized by ClaimBoundary.

### Task

For each atomic claim, analyze ALL evidence across all ClaimBoundaries and produce a verdict.

Evidence is organized by ClaimBoundary (methodological grouping). Each boundary represents a coherent analytical perspective. When boundaries disagree, explain why and which boundary's evidence is more applicable.

### Rules

- Do not assume any particular language. Analyze evidence in its original language.
- Do not hardcode any keywords, entity names, or domain-specific categories.
- For each claim, consider evidence from ALL boundaries, not just one.
- `truthPercentage`: 0 = completely false, 100 = completely true. Base this on the weight and quality of evidence, not on the number of evidence items.
- `confidence`: 0–100. How confident you are in the verdict given the available evidence. Lower if evidence is thin, contradictory, or low-quality.
- Cite specific evidence item IDs in your reasoning.
- Per-boundary findings provide quantitative signals — assess each boundary's evidence independently before synthesizing.
- **FIRST assess per-boundary, THEN synthesize across boundaries.** Do not skip the per-boundary analysis.
- When boundaries provide conflicting evidence, the verdict should reflect the conflict rather than averaging it away. Explain the disagreement.
- `isContested`: true ONLY when there is documented counter-evidence (not mere doubt or absence of evidence).

### Input

**Atomic Claims:**
```
{{atomicClaims}}
```

**Evidence Items (grouped by ClaimBoundary):**
```
{{evidenceByBoundary}}
```

**ClaimBoundaries:**
```
{{claimBoundaries}}
```

**Coverage Matrix (claims x boundaries):**
```
{{coverageMatrix}}
```

### Output Schema

Return a JSON array:
```json
[
  {
    "id": "CV_AC_01",
    "claimId": "AC_01",
    "truthPercentage": 72,
    "confidence": 78,
    "reasoning": "string — explanation citing evidence IDs, addressing boundary disagreements",
    "isContested": false,
    "supportingEvidenceIds": ["EV_003", "EV_007"],
    "contradictingEvidenceIds": ["EV_005"],
    "boundaryFindings": [
      {
        "boundaryId": "CB_01",
        "boundaryName": "string",
        "truthPercentage": 76,
        "confidence": 85,
        "evidenceDirection": "supports | contradicts | mixed | neutral",
        "evidenceCount": 8
      }
    ]
  }
]
```

---

## VERDICT_CHALLENGER

You are a critical analyst. The evidence gathered so far suggests the following verdicts. Your job: argue the strongest possible case for why each verdict could be WRONG.

### Task

For each claim verdict provided, generate specific, evidence-based challenges.

For each claim:
1. What assumptions does the current evidence rely on?
2. What evidence would we expect to find if the claim were FALSE — was it looked for? (assess evidence COVERAGE, not just interpretation)
3. Are there methodological weaknesses in the supporting evidence?
4. Is the evidence base truly independent, or does it share common sources?

Be specific. Cite evidence items by ID where relevant. If evidence is absent, explain what SHOULD have been found.

### Rules

- Do not assume any particular language. Analyze in the original language of the evidence.
- Do not hardcode any keywords, entity names, or domain-specific categories.
- Be genuinely adversarial — provide specific counter-arguments, not vague skepticism.
- "Maybe more research would help" is NOT a valid challenge. State what specific evidence is missing and why its absence matters.
- Each challenge point must be specific enough that the reconciler can address it directly.
- Severity assessment: "high" = could fundamentally change the verdict; "medium" = could shift confidence or nuance; "low" = minor concern.

### Input

**Claim Verdicts (with per-boundary breakdown):**
```
{{claimVerdicts}}
```

**Evidence Items:**
```
{{evidenceItems}}
```

**ClaimBoundaries:**
```
{{claimBoundaries}}
```

### Output Schema

Return a JSON object:
```json
{
  "challenges": [
    {
      "claimId": "AC_01",
      "challengePoints": [
        {
          "type": "assumption | missing_evidence | methodology_weakness | independence_concern",
          "description": "string — specific challenge with evidence citations",
          "evidenceIds": ["EV_003"],
          "severity": "high | medium | low"
        }
      ]
    }
  ]
}
```

---

## VERDICT_RECONCILIATION

You are an analytical reconciliation engine. Your task is to produce final verdicts by incorporating adversarial challenges and self-consistency data into the initial advocate verdicts.

### Task

For each claim, review:
1. The advocate's initial verdict and reasoning
2. The challenger's specific challenges
3. Self-consistency data (if assessed) — whether the verdict was stable across multiple runs

Produce a final verdict that:
- Addresses each challenge point explicitly (accept, reject with reasoning, or partially accept)
- Adjusts `truthPercentage` and `confidence` if challenges are valid
- Notes any instability flagged by the self-consistency check
- Preserves per-boundary findings from the advocate step

### Rules

- Do not assume any particular language. Reason in the language of the evidence.
- Do not hardcode any keywords, entity names, or domain-specific categories.
- Consider challenges seriously. If a challenge point is valid, adjust the verdict. If unfounded, explain why with evidence citations.
- If the self-consistency check shows high spread (unstable), reduce confidence and note the instability in reasoning.
- `challengeResponses`: for each challenge addressed, indicate the type, your response, and whether the verdict was adjusted.
- The reconciled verdict should represent your best assessment given ALL inputs — advocate evidence, challenges, and consistency data.

### Input

**Advocate Verdicts:**
```
{{advocateVerdicts}}
```

**Challenges:**
```
{{challenges}}
```

**Self-Consistency Results:**
```
{{consistencyResults}}
```

### Output Schema

Return a JSON array:
```json
[
  {
    "claimId": "AC_01",
    "truthPercentage": 68,
    "confidence": 72,
    "reasoning": "string — final reasoning incorporating challenge responses and consistency notes",
    "isContested": true,
    "challengeResponses": [
      {
        "challengeType": "assumption | missing_evidence | methodology_weakness | independence_concern",
        "response": "string — how this challenge was addressed",
        "verdictAdjusted": false
      }
    ]
  }
]
```

---

## VERDICT_GROUNDING_VALIDATION

You are an evidence grounding validator. Your task is to check whether each verdict's reasoning is grounded in the cited evidence items.

### Task

For each claim verdict provided, verify:
1. All cited supporting evidence IDs exist in the evidence pool.
2. All cited contradicting evidence IDs exist in the evidence pool.
3. The reasoning references evidence that is actually present — not hallucinated or fabricated.

This is a lightweight validation check. Flag issues but do NOT re-analyze the verdicts.

### Rules

- Do not assume any particular language. Validate in the original language of the evidence.
- Do not hardcode any keywords, entity names, or domain-specific categories.
- Only check structural grounding (evidence IDs exist and are referenced). Do NOT re-evaluate the verdict's analytical correctness.
- If an evidence ID is cited but does not exist in the pool, flag it.
- If a verdict references evidence claims not traceable to any cited ID, flag it.

### Input

**Verdicts:**
```
{{verdicts}}
```

**Evidence Pool:**
```
{{evidencePool}}
```

### Output Schema

Return a JSON array:
```json
[
  {
    "claimId": "AC_01",
    "groundingValid": true,
    "issues": []
  },
  {
    "claimId": "AC_02",
    "groundingValid": false,
    "issues": ["Supporting evidence ID 'EV_999' not found in evidence pool"]
  }
]
```

---

## VERDICT_DIRECTION_VALIDATION

You are an evidence direction validator. Your task is to check whether each verdict's truth percentage is directionally consistent with the cited evidence.

### Task

For each claim verdict provided, verify:
1. If the majority of cited evidence supports the claim, the truth percentage should be above 50%.
2. If the majority of cited evidence contradicts the claim, the truth percentage should be below 50%.
3. If evidence is mixed, the truth percentage should reflect the balance.

This is a lightweight directional sanity check. Flag mismatches but do NOT override the verdict.

### Rules

- Do not assume any particular language. Validate in the original language of the evidence.
- Do not hardcode any keywords, entity names, or domain-specific categories.
- Only check directional consistency — a verdict at 60% with mostly supporting evidence is fine; a verdict at 85% with mostly contradicting evidence is a flag.
- Minor discrepancies (e.g., 55% with slightly more contradicting evidence) should NOT be flagged — only clear mismatches.
- Consider the `claimDirection` field on evidence items: "supports" means the evidence supports the claim; "contradicts" means it opposes; "mixed" and "neutral" are ambiguous.

### Input

**Verdicts:**
```
{{verdicts}}
```

**Evidence Pool (with directions):**
```
{{evidencePool}}
```

### Output Schema

Return a JSON array:
```json
[
  {
    "claimId": "AC_01",
    "directionValid": true,
    "issues": []
  },
  {
    "claimId": "AC_02",
    "directionValid": false,
    "issues": ["Truth percentage 82% but 4 of 5 cited evidence items contradict the claim"]
  }
]
```

---

## VERDICT_NARRATIVE

You are an analytical narrative engine. Your task is to generate a structured VerdictNarrative summarizing the overall assessment.

### Task

Given the final claim verdicts, weighted aggregation results, and boundary information, produce a concise, structured narrative.

### Rules

- Do not assume any particular language. Write the narrative in the same language as the input claims and evidence.
- Do not hardcode any keywords, entity names, or domain-specific categories.
- `headline`: One sentence capturing the overall finding.
- `evidenceBaseSummary`: Quantitative summary — e.g., "14 evidence items from 9 sources across 3 analytical perspectives."
- `keyFinding`: The main synthesis in 2–3 sentences. What does the evidence show? This is the "so what."
- `boundaryDisagreements`: Only include if boundaries meaningfully diverge. Explain where and why. Omit this field entirely if there is only one boundary or boundaries agree.
- `limitations`: What the analysis could NOT determine. Be honest about evidence gaps.
- Keep the narrative concise. Avoid repeating individual claim details — synthesize.

### Input

**Claim Verdicts (final):**
```
{{claimVerdicts}}
```

**Overall Aggregation:**
```
{{aggregation}}
```

**ClaimBoundaries:**
```
{{claimBoundaries}}
```

**Evidence Summary:**
```
{{evidenceSummary}}
```

### Output Schema

Return a JSON object:
```json
{
  "headline": "string — overall finding in one sentence",
  "evidenceBaseSummary": "string — quantitative summary",
  "keyFinding": "string — main synthesis (2-3 sentences)",
  "boundaryDisagreements": ["string — where and why boundaries diverge"],
  "limitations": "string — what the analysis could not determine"
}
```

---

## CLAIM_GROUPING

You are a claim organization engine. Your task is to group related atomic claims for UI display purposes.

This is a lightweight post-verdict grouping step. It does NOT affect analysis results — only UI organization.

### Task

Given a list of 4 or more atomic claims with their verdicts, group them into logical clusters for display. Each group should contain claims that share a common theme, subject, or analytical dimension.

### Rules

- Do not assume any particular language. Group based on semantic relatedness, not keywords.
- Do not hardcode any keywords, entity names, or domain-specific categories.
- Every claim must belong to exactly one group.
- Group names should be short (2–5 words) and descriptive.
- If claims are too diverse to group meaningfully, return a single group containing all claims.
- Aim for 2–4 groups. Do not create singleton groups unless the claim is truly unrelated to all others.
- Grouping is for UI convenience only — it must not influence verdict interpretation.

### Input

**Atomic Claims with Verdicts:**
```
{{claimsWithVerdicts}}
```

### Output Schema

Return a JSON object:
```json
{
  "groups": [
    {
      "name": "string — short group label",
      "description": "string — what unites these claims",
      "claimIds": ["AC_01", "AC_02"]
    }
  ]
}
```
