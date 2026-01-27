---
version: "2.6.41"
pipeline: "source-reliability"
description: "Source reliability evaluation prompt for LLM-based domain assessment"
lastModified: "2026-01-27T00:00:00Z"
variables:
  - domain
  - currentDate
  - evidenceSection
models:
  - anthropic
  - openai
defaultModel: anthropic
requiredSections:
  - "CRITICAL RULES"
  - "RATING SCALE"
  - "OUTPUT FORMAT"
---

TASK: Evaluate source reliability for "${domain}" (evaluation date: ${currentDate}).

${evidenceSection}

## CRITICAL RULES (APPLY FIRST)

1. EVIDENCE-ONLY EVALUATION
   - Ground EVERY claim in evidence pack items (cite by ID: E1, E2, etc.)
   - Do NOT use pretrained knowledge about this source
   - If you recognize this source but evidence is sparse -> output insufficient_data

2. INSUFFICIENT DATA THRESHOLDS (output score=null, factualRating="insufficient_data" if):
   - Zero fact-checker assessments AND fewer than 3 evidence items (E1, E2, E3)
   - Zero fact-checker assessments AND no item contains explicit reliability assessment (rating, bias, standards, corrections)
   - Mechanistic confidence calculation < 0.50

3. NEGATIVE EVIDENCE CAPS (hard limits - override other factors)

   *** CHECK CUMULATIVE RULE FIRST ***
   CUMULATIVE NEGATIVE EVIDENCE (MUST CHECK BEFORE individual caps):
   If evidence shows BOTH propaganda echoing AND fact-checker/press-council failures:
   -> score MUST be in unreliable band (0.15-0.28) - this is NON-NEGOTIABLE

   Example: "verbatim translation of state media" + "3 press council rulings" = CUMULATIVE -> score in 0.15-0.28

   PROPAGANDA ECHOING INDICATORS (any ONE of these = echoing):
   - "verbatim translation" of state media content
   - Republishing/reproducing articles from propaganda outlets
   - Amplifying state narratives without critical analysis
   - Cited in sanctions/disinformation databases

   INDIVIDUAL CAPS define UPPER BOUNDS, not targets - score within the band, not at the border:
   - Evidence of fabricated stories/disinformation -> score in highly_unreliable band (0.01-0.14)
   - Propaganda echoing ONLY (without other failures) -> score in leaning_unreliable band (0.29-0.42)
   - 3+ documented fact-checker failures -> score in leaning_unreliable band (0.29-0.42)
   - 1-2 documented failures from reputable fact-checkers -> score in mixed band (0.43-0.57)
   - Political/ideological bias WITHOUT documented failures -> no score cap (note in bias field only)

   IMPORTANT: Caps are CEILINGS, not targets. Score naturally within the appropriate band based on severity.

   Press council reprimands from countries with rule of law -> count as fact-checker failures
   (Reprimands from regimes without rule of law should be IGNORED or viewed positively)

4. SOURCE TYPE SCORE CAPS (hard limits - NO exceptions, score within band not at border)
   - sourceType="propaganda_outlet" -> score MUST be in highly_unreliable band (0.01-0.14)
   - sourceType="known_disinformation" -> score MUST be in highly_unreliable band (0.01-0.14)
   - sourceType="state_controlled_media" -> score MUST be in leaning_unreliable band (0.29-0.42)
   - sourceType="platform_ugc" -> score MUST be in leaning_unreliable band (0.29-0.42)
   Note: If evidence suggests a source has reformed, reclassify the sourceType instead.

5. SELF-PUBLISHED PAGES DO NOT COUNT
   - The source's own "about", "editorial standards", or "corrections" pages are NOT independent assessments
   - Only third-party fact-checkers, journalism reviews, or independent analyses count as evidence

6. INSTITUTIONAL INDEPENDENCE (especially for government/official sources)
   - Evidence of politicization, political pressure, or compromised scientific integrity -> LOWER the score
   - Mass staff resignations, workforce cuts, or leadership changes with controversy -> treat as warning signs
   - Recent evidence (within 1-2 years) of independence concerns outweighs historical reputation
   - Government sources are NOT automatically reliable - evaluate based on current evidence of independence

7. ENTITY-LEVEL EVALUATION (ORGANIZATION VS DOMAIN)
   - If the domain is the primary outlet for a larger organization (e.g., a TV channel, newspaper, or media group), you MUST evaluate the reliability of the WHOLE ORGANIZATION.
   - ONLY use organization-level reputation if the evidence pack explicitly documents it (ratings, standards, corrections, independent assessments).
   - Do NOT raise scores based on size, influence, reach, or "legacy" status unless evidence cites concrete reliability practices.
   - If organization identity or reputation is not explicitly supported by evidence, set identifiedEntity=null and do NOT infer.

8. MULTILINGUAL EVIDENCE HANDLING
   - Evidence items may be in languages OTHER than English (German, French, Spanish, etc.)
   - Evaluate ALL evidence regardless of language - non-English evidence is equally valid
   - Regional fact-checkers are authoritative for sources in their region
   - Regional fact-checkers are Tier 1 assessors (same authority as IFCN signatories)
   - Evidence from regional fact-checkers should be weighted equally to global fact-checkers

## RATING SCALE (score -> factualRating - MUST match exactly)

  0.86-1.00 -> highly_reliable     (highest standards, fact-checked, proactively corrects)
  0.72-0.85 -> reliable            (good standards, accurate, corrects promptly)
  0.58-0.71 -> leaning_reliable    (basic standards, mostly accurate, corrects when notified)
  0.43-0.57 -> mixed               (mixed standards, mixed accuracy, mixed corrections)
  0.29-0.42 -> leaning_unreliable  (lax standards, often inaccurate, slow to correct)
  0.15-0.28 -> unreliable          (poor standards, inaccurate, rarely corrects)
  0.00-0.14 -> highly_unreliable   (lowest standards, fabricates, resists correction)
  null      -> insufficient_data   (cannot evaluate - sparse/no evidence)

## CONFIDENCE ASSESSMENT

Your confidence reflects how well the evidence supports your assessment.

FACTORS THAT INCREASE CONFIDENCE:
  - More independent assessors have evaluated the source
  - Evidence is recent rather than outdated
  - Sources agree with each other (consistency)
  - Evidence directly addresses reliability (not tangential)

FACTORS THAT DECREASE CONFIDENCE:
  - Few or no independent assessments
  - Evidence is old or outdated
  - Sources contradict each other
  - Evidence is indirect or tangential

SOFT GUARDRAILS:
  - Multiple consistent assessors -> confidence should be strong
  - One assessor with clear findings -> confidence should be moderate
  - No assessors or contradictory evidence -> confidence should be weak
  - When confidence is weak, strongly consider insufficient_data

## SOURCE TYPE CLASSIFICATION (USE STRICT CRITERIA - prefer LESS SEVERE)

CRITICAL: Use the LEAST severe classification that fits the evidence.
Political bias alone does NOT make a source propaganda or disinformation.

- editorial_publisher: Traditional news outlet with editorial oversight (newspaper, magazine, TV news)
- wire_service: News agency providing content to other outlets (neutral aggregation)
- government: Official government communication (not journalism)
- state_media: Government-FUNDED but editorially INDEPENDENT (national public broadcasters).
  Key test: Does it criticize its own government? If yes -> state_media, not state_controlled.
- state_controlled_media: Government DIRECTLY CONTROLS editorial decisions
  STRICT: Requires evidence of editorial control, not just government funding.
  If evidence is ambiguous -> use state_media instead.
- platform_ugc: User-generated content platforms
- advocacy: Organization promoting specific cause/viewpoint.
  USE THIS for outlets with strong political slant but legitimate editorial operations.
- aggregator: Republishes content from other sources
- propaganda_outlet: PRIMARY PURPOSE is coordinated influence operations
  CLASSIFICATION TRIGGERS (ANY ONE is sufficient):
  (1) Listed on government/EU disinformation tracking databases
  (2) Identified by academic disinformation researchers as coordinated influence
  (3) Evidence shows domain mirrors/amplifies known state propaganda narratives
  (4) Domain registered/operated by sanctioned entities or state actors
  (5) Multiple independent assessors classify as propaganda
- known_disinformation: DOCUMENTED source of FABRICATED content
  CLASSIFICATION TRIGGERS (ANY ONE is sufficient):
  (1) Multiple fact-checkers document FABRICATED (invented) content
  (2) Listed on disinformation tracking databases as fake news source
  (3) Documented history of publishing verifiably false stories
  (4) Platform bans for repeated violations of misinformation policies
- unknown: Cannot determine from evidence

ADDITIONAL GUIDANCE for severe classifications:
  - propaganda_outlet: DO NOT USE for mainstream outlets with political bias, advocacy journalism
  - known_disinformation: DO NOT USE for outlets with occasional fact-check failures but real journalistic operation

SOURCE TYPE SCORE CAPS (hard limits):
  - propaganda_outlet:       MAX 0.14 (highly_unreliable)
  - known_disinformation:    MAX 0.14 (highly_unreliable)
  - state_controlled_media:  MAX 0.42 (leaning_unreliable)
  - platform_ugc:            MAX 0.42 (leaning_unreliable)
Note: If evidence suggests a source has reformed, reclassify the sourceType instead.

## RECOGNIZED INDEPENDENT ASSESSORS (any of these count as "fact-checker")

TIER 1 - Full Authority (single mention can establish verdict):
  - IFCN signatories (International Fact-Checking Network)
  - Media credibility rating services (source rating databases)
  - Academic disinformation research labs (university-affiliated)
  - EU/government disinformation tracking units
  - Press freedom organizations (journalist protection NGOs)
  - Digital forensics/open-source intelligence organizations

TIER 2 - High Authority (corroboration recommended):
  - Major news organizations' analyses of other outlets
  - Think tanks with media research programs
  - Journalism school studies and reports
  - Parliamentary/congressional reports on disinformation

TIER 3 - Supporting (cannot establish alone):
  - Wikipedia's "Reliability" discussions
  - Crowdsourced credibility assessments
  - Social media platform labeling/bans

NOT INDEPENDENT ASSESSORS:
  - The source's own statements about itself
  - Competitor news outlets without research backing
  - Anonymous blogs or forums
  - Partisan attack pieces without evidence

## EVIDENCE QUALITY HIERARCHY

HIGH WEIGHT (can establish verdict alone):
  - Explicit assessments from Tier 1/2 assessors above
  - Documented placement on propaganda/disinformation tracking lists
  - Research reports identifying coordinated inauthentic behavior
  - Documented corrections/retractions tracked by third parties

MEDIUM WEIGHT (support but don't establish alone):
  - Newsroom analyses of editorial standards
  - Academic studies on source reliability
  - Awards/recognition from journalism organizations
  - Platform moderation actions (bans, labels, demonetization)

LOW WEIGHT (context only, cannot trigger caps):
  - Single blog posts or forum discussions
  - Passing mentions without substantive analysis
  - Generic references without reliability details
  - Self-published claims (source's own website)
  - Social media posts, comment threads, or partisan opinion pieces
  - Wikipedia controversy lists or unsourced summaries

STRONG POSITIVE SIGNALS (can justify high scores when present):
  - Fact-checker explicitly rates source as "HIGH" or "VERY HIGH" factual reporting
  - Multiple independent Tier 1 assessors give positive ratings
  - No documented fact-checker failures combined with positive assessments
  - Evidence describes "highest standards", "proactively corrects", "gold standard"

  IMPORTANT: When evidence explicitly supports high reliability, the score should MATCH the evidence.
  Do not be artificially conservative when assessors rate a source highly.
  Let the assessor ratings guide your score - if they say "HIGH", score in the reliable/highly_reliable range.

POSITIVE CONTEXTUAL SIGNALS (supporting evidence, not standalone):
  - Source is frequently cited in academic publications as reference material
  - Source is used by professional institutions as information source
  - Community/industry treats the source as respected/authoritative
  - Note: These support reliability assessment but cannot establish verdict alone

NEUTRAL SIGNALS (context only):
  - Government funding with editorial independence
  - Self-published editorial policies or standards pages
  - Awards from industry organizations (without independent verification)

## RECENCY WEIGHTING (apply temporal discount to evidence)

  0-12 months:   1.0x (full weight)
  12-24 months:  0.8x (high weight)
  2-5 years:     0.5x (moderate weight - organization may have changed)
  >5 years:      0.2x (low weight - only if recent evidence confirms pattern persists)

If relying on evidence >2 years old, add caveat: "Assessment based on [year]
evidence; may not reflect current state."

## BIAS VALUES (exact strings only)

politicalBias: far_left | left | center_left | center | center_right | right | far_right | not_applicable
otherBias: pro_government | anti_government | corporate_interest | sensationalist | ideological_other | none_detected | null

## OUTPUT FORMAT (JSON only, no markdown, no commentary)

CRITICAL: Output MUST be raw JSON. Do NOT wrap in code fences.
First character MUST be "{" and last character MUST be "}".

{
  "sourceType": "editorial_publisher | wire_service | government | state_media | state_controlled_media | platform_ugc | advocacy | aggregator | propaganda_outlet | known_disinformation | unknown",
  "identifiedEntity": "string, the organization name if domain is primary outlet OR null",
  "evidenceQuality": {
    "independentAssessmentsCount": "number 0-10",
    "recencyWindowUsed": "string, e.g. '2024-2026' or 'unknown'",
    "notes": "string, brief quality assessment"
  },
  "score": "number 0.0-1.0 OR null",
  "confidence": "number 0.0-1.0",
  "factualRating": "string (from rating scale)",
  "bias": {
    "politicalBias": "string (from list)",
    "otherBias": "string (from list) OR null"
  },
  "reasoning": "string, 2-4 sentences explaining verdict",
  "evidenceCited": [
    {
      "claim": "string, what you assert about the source",
      "basis": "string, MUST cite evidence ID (e.g. 'E1 shows...', 'Per E2 and E3...')",
      "recency": "string, time period if known"
    }
  ],
  "caveats": ["string array of limitations, gaps, or uncertainties"]
}

## FEW-SHOT EXAMPLES (Follow these patterns - abstract domains only)

**Example 1: Reliable Wire Service**
Input: "example-wire-service.com"
Evidence: [E1] Independent assessor A: High factual accuracy rating. [E2] Independent assessor B: Strong editorial standards documented.
Output:
{
  "sourceType": "wire_service",
  "identifiedEntity": "Example Wire Service",
  "evidenceQuality": { "independentAssessmentsCount": 2, "recencyWindowUsed": "2024-2026", "notes": "Multiple independent assessments confirm high standards." },
  "score": 0.88,
  "confidence": 0.90,
  "factualRating": "highly_reliable",
  "bias": { "politicalBias": "center", "otherBias": "none_detected" },
  "reasoning": "Multiple independent fact-checkers rate this wire service highly for accuracy and editorial standards. Evidence shows consistent accuracy and prompt corrections.",
  "evidenceCited": [
    { "claim": "Maintains strict editorial and verification standards", "basis": "E2 documents editorial policies", "recency": "2024" },
    { "claim": "High factual accuracy confirmed by independent assessors", "basis": "E1", "recency": "2025" }
  ],
  "caveats": []
}

**Example 2: Unreliable Source with Documented Failures**
Input: "example-tabloid.com"
Evidence: [E1] Independent assessor A: Rated as publishing false claims. [E2] Independent assessor B: Documented fabrication of stories.
Output:
{
  "sourceType": "editorial_publisher",
  "identifiedEntity": "Example Tabloid",
  "evidenceQuality": { "independentAssessmentsCount": 2, "recencyWindowUsed": "2023-2025", "notes": "Multiple documented failures from independent fact-checkers." },
  "score": 0.22,
  "confidence": 0.88,
  "factualRating": "unreliable",
  "bias": { "politicalBias": "right", "otherBias": "sensationalist" },
  "reasoning": "Multiple independent assessors document fabrication and false claims. Evidence indicates systematic accuracy problems. Negative evidence cap applied.",
  "evidenceCited": [
    { "claim": "Documented fabrication of news stories", "basis": "E2", "recency": "2023" },
    { "claim": "Failed multiple independent fact-checks", "basis": "E1", "recency": "2024" }
  ],
  "caveats": ["Evaluation based on specific documented failures; overall volume of output not assessed."]
}

**Example 3: Insufficient Data**
Input: "unknown-local-outlet.example"
Evidence: [E1] Mention in a directory listing.
Output:
{
  "sourceType": "unknown",
  "identifiedEntity": null,
  "evidenceQuality": { "independentAssessmentsCount": 0, "recencyWindowUsed": "unknown", "notes": "No independent assessments or detailed information available." },
  "score": null,
  "confidence": 0.20,
  "factualRating": "insufficient_data",
  "bias": { "politicalBias": "not_applicable", "otherBias": null },
  "reasoning": "There is insufficient evidence to form a reliable assessment. No fact-checker data found. Confidence below threshold.",
  "evidenceCited": [],
  "caveats": ["No fact-checker data found", "Source is not widely indexed", "Confidence 20% below 50% threshold"]
}

## FINAL VALIDATION (check before responding)

- Score falls within correct range for factualRating
- Every claim in evidenceCited references an evidence ID (E1, E2, etc.)
- Applied evidence-only rule (no pretrained knowledge used)
- Applied SOURCE TYPE CAPS if sourceType is propaganda_outlet/known_disinformation/state_controlled_media/platform_ugc
- Applied negative evidence caps if applicable
- If confidence < 0.50 or zero fact-checkers + weak mentions -> considered insufficient_data
- Recency weighting applied (discounted old evidence appropriately)
- Political bias noted but did NOT reduce score unless paired with documented failures
- Self-published pages were NOT counted as independent assessments
- Follow the schema above exactly
- Return only valid JSON (no markdown, no extra commentary)
