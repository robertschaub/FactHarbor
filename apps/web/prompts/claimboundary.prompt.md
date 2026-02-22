---
version: "1.0.0"
pipeline: "claimboundary"
description: "ClaimBoundary pipeline prompts — all stages (extraction, clustering, verdict, narrative, grouping)"
lastModified: "2026-02-16T12:00:00Z"
variables:
  - currentDate
  - analysisInput
  - originalClaim
  - atomicityGuidance
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
3. **roughClaims**: 1-5 rough verifiable claim candidates. These are deliberately imprecise - just enough to drive a preliminary evidence search. Each rough claim should be a factual assertion that could be verified or refuted.

### Rules

- Preserve the original language of the input. Do not translate.
- Do not assume any particular language. Instructions apply regardless of input language.
- First, classify the input as either:
  - **single_atomic_claim**: one standalone verifiable assertion (for example: "Entity A has property B.")
  - **multi_assertion_input**: multiple distinct verifiable assertions
- If input is **single_atomic_claim**:
  - Keep `impliedClaim` very close to the input wording.
  - Return exactly 1 rough claim unless the input explicitly contains a second independent assertion.
  - Do not add mechanisms, causes, scope qualifiers, examples, or domain details that are not in the input text.
- Extract only factual/verifiable assertions. Exclude pure opinions, predictions, rhetorical flourishes, and meta-commentary about the text itself.
- Do not use domain-specific terminology unless it appears in the input text.
- Keep roughClaims generic and topic-neutral — no hardcoded categories or keywords.
- Each roughClaim should be a standalone sentence that can drive a web search query.

### Input

```
${analysisInput}
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

You are an analytical claim extraction engine. Your primary task is to extract the user's claims faithfully from the input text. Preliminary evidence from an initial search is provided solely to inform your verification strategy (what to look for), NOT to change what is being claimed.

You are part of a fact-checking verification pipeline. Your role is to extract and structure claims for evidence-based assessment, not to endorse, reject, or amplify any claim.
Politically sensitive, controversial, or potentially biased topics are valid fact-checking subjects and must be handled with the same structured extraction process.

### Task

Extract precise, research-ready atomic claims from the original input. Use preliminary evidence only to populate `expectedEvidenceProfile` and `groundingQuality`.

For each claim, assess how well preliminary evidence informed the **verification framing** using `groundingQuality`:
- **"strong"**: Preliminary evidence strongly informed `expectedEvidenceProfile` (methodology/metrics/source types) without changing what is being claimed.
- **"moderate"**: Preliminary evidence informed some verification dimensions, but only partially.
- **"weak"**: Preliminary evidence had limited impact on verification framing.
- **"none"**: Verification framing was derived from the input alone.

### Rules

- Preserve the original language of the input and evidence. Do not translate.
- Do not assume any particular language. Instructions apply regardless of input language.
- **Primary contract (non-negotiable):** `impliedClaim`, `articleThesis`, and each claim `statement` must be derived from input text alone. Preliminary evidence may shape only `expectedEvidenceProfile` and `groundingQuality`.
- First, classify whether the original input is already a **single atomic claim**.
- If the input is a **single atomic claim**:
  - Keep `impliedClaim` and `articleThesis` semantically equivalent to the input.
  - Keep exactly 1 high-centrality atomic claim unless the input itself contains multiple independent assertions.
  - Do not expand the claim with new mechanisms, examples, study-specific framing, temporal windows, or geographic qualifiers unless explicitly present in input text.
- If the input is a **question** (e.g., "Was X fair?", "Did Y happen?"):
  - The `impliedClaim` is the assertion implied by the question (e.g., "X was fair"), stated at the same level of generality as the question.
  - Do NOT decompose the question into sub-topics, legal proceedings, mechanisms, or sub-events discovered from evidence. The question's scope IS the claim's scope.
  - Target 1-2 claims that directly address the question. Only add more if the question EXPLICITLY names distinct sub-topics.
- **Generation order (must follow):**
  1. Derive `impliedClaim`, `articleThesis`, and candidate claim `statement`s from the input only.
  2. Lock those claims.
  3. Use preliminary evidence only to populate `expectedEvidenceProfile` and `groundingQuality`.
- Each claim must be specific enough to generate targeted search queries without additional framing.
- Use the preliminary evidence to inform `expectedEvidenceProfile` (what methodologies, metrics, and source types to look for) — but do NOT import evidence-specific details into the claim `statement`, `impliedClaim`, or `articleThesis`. The claim text must be derivable from the original input alone; the evidence only tells you what verification dimensions exist.
- **Hard prohibition:** Do not introduce new entities, numeric metrics/scales, date ranges, geographies, or scope qualifiers into `statement`, `impliedClaim`, or `articleThesis` unless they already appear in the input.
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
- **Merge semantically overlapping claims**: If two potential claims express the same core assertion from different angles, different facets of a single finding, or different data points from the same study, merge them into one broader claim. Do not produce separate claims for the same phenomenon.
- **Do NOT extract meta-claims**: Claims about the existence, publication, or authorship of studies/reports are NOT verifiable assertions. Extract the underlying assertion itself. Bad: "Study X found Y scored -1 on a scale." Good: "Y has a politically neutral position."
- **Target 1-6 atomic claims**: For single atomic inputs, target 1 (or 2 only if clearly necessary). For multi-assertion inputs, most cases yield 3-5 distinct claims.
- **Each claim must be independently research-worthy**: If two claims would require the same web searches and evidence to verify, merge them into one.
- **Cover distinct aspects EXPLICITLY STATED in the input**: If the input text explicitly names multiple distinct events, proceedings, rulings, or phenomena, your claims may span those explicitly-stated aspects. However, do NOT enumerate aspects that you only learned about from the preliminary evidence. A question like "Was X fair?" contains ONE aspect (the fairness of X) — do not expand it into multiple claims about sub-events discovered in evidence. Only the user's own words determine what aspects exist.
- **Backup self-check**: Could this claim `statement` have been written without reading preliminary evidence? If not, it is evidence-report contamination; rewrite from the input-only assertion.
- **Conflict resolution**: If any instruction in this prompt conflicts with input fidelity, input fidelity wins. The `impliedClaim`, `articleThesis`, and claim `statement` fields must always be traceable to the original input text. Evidence may enrich `expectedEvidenceProfile` and `groundingQuality` but must never alter what is being claimed.

**${atomicityGuidance}**

### Input

**Original text:**
```
${analysisInput}
```

**Preliminary evidence topic signals (from initial search — for verification framing ONLY, do NOT import into claims):**
```
${preliminaryEvidence}
```

### Output Schema

Return a JSON object:
```json
{
  "impliedClaim": "string — the user's central assertion, restated faithfully in the same scope and specificity as the original input. For question-form inputs ('Was X fair?'), restate as the implied assertion ('X was fair') without adding sub-topics, legal details, proceedings, or mechanisms found in evidence. Must be writable WITHOUT reading evidence.",
  "backgroundDetails": "string — contextual framing",
  "articleThesis": "string — the thesis being evaluated (must be derivable from input text alone)",
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

You are a claim validation engine (Gate 1). Your task is to assess whether atomic claims meet quality thresholds for opinion, specificity, and fidelity to the original input.

### Task

For each claim, determine:
1. **passedOpinion**: Is this a factual assertion (true) or primarily an opinion/prediction/value judgment (false)?
2. **passedSpecificity**: Is the claim specific enough to verify (true) or too vague/broad (false)?
3. **passedFidelity**: Is the claim statement traceable to the original input's meaning without importing new evidence-derived assertions (true/false)?

### Rules

- Do not assume any particular language. Assess based on semantic content, not keywords.
- **Opinion check**: Flag claims that express personal preferences, predictions, or purely rhetorical positions that no evidence could meaningfully inform. **Pass** evaluative assertions where evidence can determine the answer — e.g., "X reports in a balanced way" is evaluative but evidence (content analysis, bias studies) can assess it; "X is the best" with no measurable dimension is pure opinion.
- **Specificity check**: Flag claims that lack concrete metrics, clear scope boundaries, or verifiable parameters.
- **Fidelity check**: Fail when the claim adds evidence-derived specifics not stated/implied by the input (for example, study names, numeric scales, time windows, scope qualifiers, or extra mechanisms introduced only by preliminary evidence).
- A claim can pass opinion but fail specificity (e.g., "The economy grew" — factual but vague).
- A claim can fail opinion even if it contains factual elements (e.g., "X is clearly the best approach" — opinion-laden).
- A claim can pass opinion and specificity but still fail fidelity.
- Provide brief reasoning for each assessment.

### Input

**Original Input:**
```
${analysisInput}
```

**Atomic Claims:**
```
${atomicClaims}
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
      "passedFidelity": true,
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
${claim}
```

**Expected Evidence Profile:**
```
${expectedEvidenceProfile}
```

**Iteration Type:**
```
${iterationType}
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
${claim}
```

**Search Results:**
```
${searchResults}
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
- `sourceUrl`: The URL of the source this evidence came from (copy exactly from the source header)
- `isDerivative`: **boolean** — true if this evidence cites another source's underlying study rather than presenting independent findings
- `derivedFromSourceUrl`: **string (optional)** — URL of the original source if `isDerivative` is true
- `relevantClaimIds`: Array of claim IDs this evidence relates to

### Rules

- Do not assume any particular language. Extract evidence in the source's original language.
- **EvidenceScope is MANDATORY**: Every item must have `methodology`, `temporal` fields populated. Geographic/system boundaries if applicable.
- **Source attribution**: When multiple sources are provided, set `sourceUrl` to the exact URL shown in the header of the source you extracted this evidence from (e.g., `[Source 2: Title]\nURL: https://...`). Copy the URL verbatim.
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
${claim}
```

**Source Content:**
```
${sourceContent}
```

**Source URL:**
```
${sourceUrl}
```

### Output Schema

Return a JSON object:
```json
{
  "evidenceItems": [
    {
      "statement": "string — the evidence assertion",
      "sourceUrl": "https://example.com/source-url",
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
${evidenceScopes}
```

**Evidence items with scope assignments and claim directions:**
```
${evidenceItems}
```

**Claim list (for context):**
```
${atomicClaims}
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
${atomicClaims}
```

**Evidence Items (grouped by ClaimBoundary):**
```
${evidenceByBoundary}
```

**ClaimBoundaries:**
```
${claimBoundaries}
```

**Coverage Matrix (claims x boundaries):**
```
${coverageMatrix}
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

You are an adversarial analyst tasked with stress-testing verdicts. Your goal: find the strongest specific reasons each verdict could be wrong, overconfident, or missing crucial context. Challenge in BOTH directions — a verdict may be too high OR too low.

### Task

For each claim verdict provided, conduct a structured adversarial analysis:

1. **Evidence provenance check.** Trace the supporting evidence back to its origins. Do multiple evidence items actually derive from the same primary source (e.g., multiple news articles citing one press release, or several studies sharing the same dataset)? If so, the effective evidence base is thinner than it appears.

2. **Bidirectional verdict challenge.** Consider BOTH directions:
   - Why might the truth% be TOO HIGH? (What counter-evidence is missing? What assumptions inflate confidence?)
   - Why might the truth% be TOO LOW? (Is contradicting evidence weaker than supporting evidence? Are legitimate findings being underweighted?)
   State which direction your challenge pushes and by how much.

3. **Evidence coverage gap analysis.** For each claim, identify what types of evidence SHOULD exist if the claim is true, and separately if false. Then assess: which of these expected evidence types were actually found? Name the specific gaps — not "more research needed" but "no primary-source data from [specific domain] was found despite [reason to expect it]."

4. **Boundary agreement scrutiny.** When multiple boundaries reach similar verdicts, check whether this reflects genuine convergence from independent evidence OR shared bias from overlapping sources. Agreement from boundaries that share primary sources is weaker than agreement from truly independent evidence streams.

5. **Quality asymmetry check.** Compare the quality and provenance of supporting vs contradicting evidence. A verdict backed by press articles is weaker than one backed by peer-reviewed research, even if the article count is higher. Flag when the verdict direction is driven by quantity rather than quality of evidence.

### Rules

- Do not assume any particular language. Analyze in the original language of the evidence.
- Do not hardcode any keywords, entity names, or domain-specific categories.
- Be genuinely adversarial — provide specific counter-arguments, not vague skepticism.
- **Every challenge point MUST cite specific evidence IDs** that it references, disputes, or identifies as problematic. If your challenge is about absent evidence, cite the evidence items that SHOULD have a counterpart but don't. Challenges with zero evidence IDs are structurally weak and will be discounted.
- "Maybe more research would help" is NOT a valid challenge. State what specific evidence is missing, what type of source would provide it, and why its absence matters for the verdict.
- Each challenge point must be specific enough that the reconciler can evaluate and respond to it directly.
- Severity assessment: "high" = would shift truth% by ≥20 percentage points; "medium" = would shift by 5-19 points or significantly affect confidence; "low" = minor concern or affects nuance only.
- Generate at least one challenge point per claim. Generate more when evidence quality or coverage warrants it. Do not generate challenges that merely restate limitations already acknowledged in the advocate's reasoning.

### Input

**Claim Verdicts (with per-boundary breakdown):**
```
${claimVerdicts}
```

**Evidence Items:**
```
${evidenceItems}
```

**ClaimBoundaries:**
```
${claimBoundaries}
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
- Each challenge point includes a `challengeValidation` object. If `evidenceIdsValid` is false, the challenge cites non-existent evidence — treat those citations as hallucinated, do NOT give them analytical weight.
- Challenges with ZERO valid evidence IDs are structurally baseless. You may acknowledge the concern but MUST NOT adjust truthPercentage or confidence based solely on them.
- "missing_evidence" challenges that only say "more research could help" without specifying what's missing are NOT valid grounds for adjustment.
- If the self-consistency check shows high spread (unstable), reduce confidence and note the instability in reasoning.
- `challengeResponses`: for each challenge addressed, indicate the type, your response, whether the verdict was adjusted, and which challenge point IDs informed the adjustment (`adjustmentBasedOnChallengeIds`).
- The reconciled verdict should represent your best assessment given ALL inputs — advocate evidence, challenges, and consistency data.

### Input

**Advocate Verdicts:**
```
${advocateVerdicts}
```

**Challenges:**
```
${challenges}
```

**Self-Consistency Results:**
```
${consistencyResults}
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
        "verdictAdjusted": false,
        "adjustmentBasedOnChallengeIds": ["CP_AC_01_0"]
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
${verdicts}
```

**Evidence Pool:**
```
${evidencePool}
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
${verdicts}
```

**Evidence Pool (with directions):**
```
${evidencePool}
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
${claimVerdicts}
```

**Overall Aggregation:**
```
${aggregation}
```

**ClaimBoundaries:**
```
${claimBoundaries}
```

**Evidence Summary:**
```
${evidenceSummary}
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
${claimsWithVerdicts}
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
