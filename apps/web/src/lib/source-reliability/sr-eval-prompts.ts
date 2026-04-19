/**
 * Prompt templates for Source Reliability Evaluation.
 *
 * Contains the shared prompt sections, evaluation prompt builder,
 * and refinement prompt builder.
 *
 * @module source-reliability/sr-eval-prompts
 */

import type { EvidencePack, EvaluationResult } from "./sr-eval-types";
import { formatEvidenceForEvaluationPrompt } from "@/lib/source-reliability/evidence-quality-assessment";
import { SOURCE_TYPE_EXPECTED_CAPS } from "@/lib/source-reliability-config";

// ============================================================================
// SHARED PROMPT SECTIONS
// ============================================================================
// These sections are used by both the initial evaluation and refinement prompts
// to ensure consistency in how both LLMs interpret evidence and apply ratings.

/**
 * Rating scale - MUST be identical in both prompts
 */
export const SHARED_RATING_SCALE = `
  0.86–1.00 → highly_reliable     (highest standards, fact-checked, proactively corrects)
  0.72–0.85 → reliable            (good standards, accurate, corrects promptly)
  0.58–0.71 → leaning_reliable    (basic standards, mostly accurate, corrects when notified)
  0.43–0.57 → mixed               (mixed standards, mixed accuracy, mixed corrections)
  0.29–0.42 → leaning_unreliable  (lax standards, often inaccurate, slow to correct)
  0.15–0.28 → unreliable          (poor standards, inaccurate, rarely corrects)
  0.00–0.14 → highly_unreliable   (lowest standards, fabricates, resists correction)
  null      → insufficient_data   (cannot evaluate — sparse/no evidence)

  USE THE FULL RANGE of each band — do not default to the midpoint.
  Strong evidence for the band description → score toward the EDGES (closer to adjacent bands).
  Differentiate within bands: 1 failure vs 5 failures matters, even if both land in the same band.

  AVOID CENTER-GRAVITY BIAS: Resist the tendency to regress scores toward 0.50.
  Clearly reliable → 0.72-0.90, not pulled toward 0.60. Clearly unreliable → 0.15-0.35, not pulled toward 0.40.
  Only score near 0.50 when evidence genuinely shows BOTH positive and negative signals equally.`;

/**
 * Evidence quality signals - shared understanding of what counts as positive/negative
 */
export const SHARED_EVIDENCE_SIGNALS = `
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
  - Awards from industry organizations (without independent verification)`;

/**
 * Bias value definitions - MUST be identical in both prompts
 */
export const SHARED_BIAS_VALUES = `
politicalBias: far_left | left | center_left | center | center_right | right | far_right | not_applicable
otherBias: pro_government | anti_government | corporate_interest | sensationalist | ideological_other | none_detected | null`;

/**
 * Source type definitions with score caps - MUST be consistent across prompts
 */
export const SHARED_SOURCE_TYPES = `
- editorial_publisher: Traditional news outlet with editorial oversight (newspaper, magazine, TV news)

- wire_service: News agency providing content to other outlets (neutral aggregation)

- government: Official government communication (not journalism)

- state_media: Government-FUNDED but editorially INDEPENDENT (national public broadcasters).
  Key test: Does it criticize its own government? If yes → state_media, not state_controlled.

- state_controlled_media: Government DIRECTLY CONTROLS editorial decisions
  STRICT: Requires evidence of editorial control, not just government funding.
  If evidence is ambiguous → use state_media instead.

- collaborative_reference: Collaborative knowledge platforms with structured editorial processes,
  citation requirements, and systematic quality control (e.g., encyclopedias with mandatory sourcing,
  editorial review boards, vandalism prevention). USE THIS instead of platform_ugc when the platform
  enforces verifiability standards and has formal content governance beyond simple user moderation.

- platform_ugc: User-generated content platforms WITHOUT structured editorial governance
  (e.g., forums, comment sections, open blogs, social media). Do NOT use for platforms that enforce
  citation requirements, have formal review processes, or employ systematic quality control.

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

- unknown: Cannot determine from evidence`;

/**
 * Score caps for severe source types - MUST be enforced consistently
 */
export const SHARED_SCORE_CAPS = `
SOURCE TYPE SCORE CAPS (hard limits):
  - propaganda_outlet:       MAX 0.14 (highly_unreliable)
  - known_disinformation:    MAX 0.14 (highly_unreliable)
  - state_controlled_media:  MAX 0.42 (leaning_unreliable)
  - platform_ugc:            MAX 0.42 (leaning_unreliable)
  - collaborative_reference: NO CAP (scored purely on evidence)
Note: If evidence suggests a source has reformed, reclassify the sourceType instead.
Note: collaborative_reference is NOT capped — these platforms are evaluated on evidence alone.`;

// ============================================================================
// HARDENED EVALUATION PROMPT
// ============================================================================

/**
 * Generate LLM evaluation prompt with CRITICAL RULES and mechanistic guidance.
 *
 * Key features:
 * - CRITICAL RULES at top (evidence-only, insufficient-data thresholds, caps)
 * - Mechanistic confidence calculation
 * - SOURCE TYPE SCORE CAPS
 * - Self-published pages exclusion
 * - Abstract examples (no real domain names per AGENTS.md)
 */
export function getEvaluationPrompt(domain: string, evidencePack: EvidencePack): string {
  const currentDate = new Date().toISOString().split("T")[0];

  const hasEvidence = evidencePack.enabled && evidencePack.items.length > 0;
  const evidenceBody = hasEvidence ? formatEvidenceForEvaluationPrompt(evidencePack.items) : "";
  const hasQualityLabels = hasEvidence && evidencePack.items.some((item) => !!item.probativeValue);

  const evidenceSection = hasEvidence
    ? [
        `## EVIDENCE PACK`,
        hasQualityLabels
          ? [
              `The following ${evidencePack.items.length} search results are your ONLY external evidence. They are grouped by probativeValue (pre-assessed quality). Base all claims on these items using their IDs (E1, E2, etc.).`,
              ``,
              `EVIDENCE WEIGHTING RULES:`,
              `- HIGH probativeValue items are authoritative assessments (fact-checker ratings, press council rulings). They carry the MOST weight and can establish a verdict direction alone.`,
              `- MEDIUM probativeValue items are substantive analysis (academic research, journalistic investigations). They support and refine the picture from HIGH items.`,
              `- LOW probativeValue items are contextual mentions (blog posts, passing references, opinions). They provide background but must NOT override signals from HIGH or MEDIUM items.`,
              `- If HIGH items consistently indicate unreliability (e.g., multiple fact-checker failures), the score MUST reflect that — even if LOW items are neutral or ambiguous.`,
              `- If HIGH items consistently indicate reliability (e.g., positive fact-checker ratings), LOW negative mentions should not pull the score down significantly.`,
            ].join("\n")
          : `The following ${evidencePack.items.length} search results are your ONLY external evidence. Base all claims on these items using their IDs (E1, E2, etc.).`,
        ``,
        evidenceBody,
      ].join("\n")
    : `## EVIDENCE PACK: Empty or unavailable.\nWithout external evidence, you MUST output score=null and factualRating="insufficient_data". Do not rely on pretrained knowledge.`;

  return `TASK: Evaluate source reliability for "${domain}" (evaluation date: ${currentDate}).

${evidenceSection}

═══════════════════════════════════════════════════════════════════
⚠️  CRITICAL RULES (APPLY FIRST)
═══════════════════════════════════════════════════════════════════

1. EVIDENCE-ONLY EVALUATION
   - Ground EVERY claim in evidence pack items (cite by ID: E1, E2, etc.)
   - Do NOT use pretrained knowledge about this source
   - If you recognize this source but evidence is sparse → output insufficient_data

2. INSUFFICIENT DATA THRESHOLDS:
   DEFAULT PATH (output score=null, factualRating="insufficient_data" if):
   - Zero fact-checker assessments AND fewer than 3 evidence items (E1, E2, E3)
   - Zero fact-checker assessments AND no item contains explicit reliability assessment (rating, bias, standards, corrections)
   - Mechanistic confidence calculation < 0.50

   SOURCE-TYPE SCORING EXCEPTION (overrides DEFAULT PATH):
   If the source type is clearly identifiable from the evidence (e.g., political party website,
   corporate PR, personal blog, government agency) AND the default path would produce insufficient_data,
   you MAY instead assign a score based on the inherent reliability characteristics of that source type.
   In this case:
   - Set confidence proportional to how clearly the source type is identified (typically 0.50-0.70)
   - Apply the appropriate source type caps
   - Note in reasoning that the score is based on source type classification, not independent assessments
   This exception does NOT apply when fact-checker ratings or explicit reliability assessments exist —
   in that case, use the evidence to score normally.

3. NEGATIVE EVIDENCE CAPS (hard limits — override other factors)

   *** CHECK CUMULATIVE RULE FIRST ***
   CUMULATIVE NEGATIVE EVIDENCE (MUST CHECK BEFORE individual caps):
   If evidence shows BOTH propaganda echoing AND fact-checker/press-council failures:
   → score MUST be in unreliable band (0.15-0.28) — this is NON-NEGOTIABLE

   Example: "verbatim translation of state media" + "3 press council rulings" = CUMULATIVE → score in 0.15-0.28

   PROPAGANDA ECHOING INDICATORS (any ONE of these = echoing):
   - "verbatim translation" of state media content
   - Republishing/reproducing articles from propaganda outlets
   - Amplifying state narratives without critical analysis
   - Cited in sanctions/disinformation databases

   INDIVIDUAL CAPS define UPPER BOUNDS, not targets - score within the band, not at the border:
   - Evidence of fabricated stories/disinformation → score in highly_unreliable band (0.01-0.14)
   - Propaganda echoing ONLY (without other failures) → score in leaning_unreliable band (0.29-0.42)
   - 3+ documented fact-checker failures → score in leaning_unreliable band (0.29-0.42)
   - Tier 1 assessor rates factual reporting as low/not credible (e.g., MBFC "Mixed"/"Low"
     /"Not Credible") → score in leaning_unreliable band (0.29-0.42).
     "Low" or "Not Credible" should score in the LOWER half of this band (0.29-0.35).
   - 1-2 documented failures from reputable fact-checkers → score in mixed band (0.43-0.57)
   - Political/ideological bias WITHOUT documented failures → no score cap (note in bias field only)

   SEVERITY COMPOUNDING — when multiple HIGH-probativeValue negative signals converge:
   - 3+ fact-checker failures AND academic/research classification as unreliable/misinformation
     → score in unreliable band (0.15-0.28). Academic confirmation elevates severity.
   - 3+ fact-checker failures AND cited in disinformation tracking databases
     → score in unreliable band (0.15-0.28).
   - Multiple independent HIGH negative signals confirming same pattern → use LOWER applicable band.

   IMPORTANT: Caps are CEILINGS, not targets. Score naturally within the appropriate band based on severity.
   When evidence items are labeled with probativeValue, weight HIGH items most heavily.

   Press council reprimands from countries with rule of law → count as fact-checker failures
   (Reprimands from regimes without rule of law should be IGNORED or viewed positively)

4. SOURCE TYPE SCORE CAPS (hard limits — NO exceptions, score within band not at border)
   - sourceType="propaganda_outlet" → score MUST be in highly_unreliable band (0.01-0.14)
   - sourceType="known_disinformation" → score MUST be in highly_unreliable band (0.01-0.14)
   - sourceType="state_controlled_media" → score MUST be in leaning_unreliable band (0.29-0.42)
   - sourceType="platform_ugc" → score MUST be in leaning_unreliable band (0.29-0.42)
   - sourceType="collaborative_reference" → NO CAP (scored purely on evidence quality)
   Note: If evidence suggests a source has reformed, reclassify the sourceType instead.
   Note: Collaborative reference platforms (encyclopedias with citation requirements,
   editorial review, vandalism prevention) are NOT capped — use collaborative_reference,
   not platform_ugc, for these sources.

5. SELF-PUBLISHED PAGES DO NOT COUNT
   - The source's own "about", "editorial standards", or "corrections" pages are NOT independent assessments
   - Only third-party fact-checkers, journalism reviews, or independent analyses count as evidence

6. INSTITUTIONAL INDEPENDENCE (especially for government/official sources)
   - Evidence of politicization, political pressure, or compromised scientific integrity → LOWER the score
   - Mass staff resignations, workforce cuts, or leadership changes with controversy → treat as warning signs
   - Recent evidence (within 1-2 years) of independence concerns outweighs historical reputation
   - Government sources are NOT automatically reliable - evaluate based on current evidence of independence

6. ENTITY-LEVEL EVALUATION (ORGANIZATION VS DOMAIN)
   - If the domain is the primary outlet for a larger organization (e.g., a TV channel, newspaper, or media group), you MUST evaluate the reliability of the WHOLE ORGANIZATION.
   - ONLY use organization-level reputation if the evidence pack explicitly documents it (ratings, standards, corrections, independent assessments).
   - Do NOT raise scores based on size, influence, reach, or "legacy" status unless evidence cites concrete reliability practices.
   - If organization identity or reputation is not explicitly supported by evidence, set identifiedEntity=null and do NOT infer.

7. MULTILINGUAL EVIDENCE HANDLING
   - Evidence items may be in languages OTHER than English (German, French, Spanish, etc.)
   - Evaluate ALL evidence regardless of language — non-English evidence is equally valid
   - Regional fact-checkers are authoritative for sources in their region
   - Regional fact-checkers are Tier 1 assessors (same authority as IFCN signatories)
   - Evidence from regional fact-checkers should be weighted equally to global fact-checkers

─────────────────────────────────────────────────────────────────────
RATING SCALE (score → factualRating — MUST match exactly)
─────────────────────────────────────────────────────────────────────
${SHARED_RATING_SCALE}

─────────────────────────────────────────────────────────────────────
CONFIDENCE ASSESSMENT
─────────────────────────────────────────────────────────────────────
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
  - Multiple consistent assessors → confidence should be strong
  - One assessor with clear findings → confidence should be moderate
  - No assessors or contradictory evidence → confidence should be weak
  - When confidence is weak, strongly consider insufficient_data

─────────────────────────────────────────────────────────────────────
SOURCE TYPE CLASSIFICATION (USE STRICT CRITERIA - prefer LESS SEVERE)
─────────────────────────────────────────────────────────────────────
⚠️ CRITICAL: Use the LEAST severe classification that fits the evidence.
   Political bias alone does NOT make a source propaganda or disinformation.
${SHARED_SOURCE_TYPES}

ADDITIONAL GUIDANCE for severe classifications:
  - propaganda_outlet: DO NOT USE for mainstream outlets with political bias, advocacy journalism
  - known_disinformation: DO NOT USE for outlets with occasional fact-check failures but real journalistic operation

${SHARED_SCORE_CAPS}

─────────────────────────────────────────────────────────────────────
RECOGNIZED INDEPENDENT ASSESSORS (any of these count as "fact-checker")
─────────────────────────────────────────────────────────────────────
TIER 1 - Full Authority (single mention can establish verdict):
  • IFCN signatories (International Fact-Checking Network)
  • Media credibility rating services (source rating databases)
  • Academic disinformation research labs (university-affiliated)
  • EU/government disinformation tracking units
  • Press freedom organizations (journalist protection NGOs)
  • Digital forensics/open-source intelligence organizations

TIER 2 - High Authority (corroboration recommended):
  • Major news organizations' analyses of other outlets
  • Think tanks with media research programs
  • Journalism school studies and reports
  • Parliamentary/congressional reports on disinformation

TIER 3 - Supporting (cannot establish alone):
  • Wikipedia's "Reliability" discussions
  • Crowdsourced credibility assessments
  • Social media platform labeling/bans

NOT INDEPENDENT ASSESSORS:
  • The source's own statements about itself
  • Competitor news outlets without research backing
  • Anonymous blogs or forums
  • Partisan attack pieces without evidence

─────────────────────────────────────────────────────────────────────
EVIDENCE QUALITY HIERARCHY
─────────────────────────────────────────────────────────────────────
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

${SHARED_EVIDENCE_SIGNALS}

─────────────────────────────────────────────────────────────────────
RECENCY WEIGHTING (apply temporal discount to evidence)
─────────────────────────────────────────────────────────────────────
  0-12 months:   1.0× (full weight)
  12-24 months:  0.8× (high weight)
  2-5 years:     0.5× (moderate weight — organization may have changed)
  >5 years:      0.2× (low weight — only if recent evidence confirms pattern persists)

If relying on evidence >2 years old, add caveat: "Assessment based on [year]
evidence; may not reflect current state."

─────────────────────────────────────────────────────────────────────
BIAS VALUES (exact strings only)
─────────────────────────────────────────────────────────────────────
${SHARED_BIAS_VALUES}

─────────────────────────────────────────────────────────────────────
OUTPUT FORMAT (JSON only, no markdown, no commentary)
CRITICAL: Output MUST be raw JSON. Do NOT wrap in code fences.
First character MUST be "{" and last character MUST be "}".
MANDATORY: "sourceType" MUST be populated with the most specific applicable type. Do NOT leave empty or omit. Use "unknown" ONLY when evidence is truly insufficient to determine any type. If your reasoning identifies the source as state-controlled, propaganda, or disinformation, sourceType MUST reflect that — score caps depend on it.
─────────────────────────────────────────────────────────────────────
{
  "sourceType": "REQUIRED — editorial_publisher | wire_service | government | state_media | state_controlled_media | collaborative_reference | platform_ugc | advocacy | aggregator | propaganda_outlet | known_disinformation | unknown",
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
  "reasoning": "string, 2-4 sentences explaining verdict. Use DIRECT framing: explain what evidence SHOWS and why score IS what it is. IMPORTANT: Use CONSISTENT terminology matching the factualRating (e.g., if rating is 'reliable', say 'reliable' not 'highly reliable'). Never write 'does not support X rating'.",
  "evidenceCited": [
    {
      "claim": "string, what you assert about the source",
      "basis": "string, MUST cite evidence ID (e.g. 'E1 shows...', 'Per E2 and E3...')",
      "recency": "string, time period if known (e.g. '2024', '2023-2025', 'unknown')"
    }
  ],
  "caveats": ["string array of limitations, gaps, or uncertainties"]
}

─────────────────────────────────────────────────────────────────────
FEW-SHOT EXAMPLES (Follow these patterns — abstract domains only)
─────────────────────────────────────────────────────────────────────

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

**Example 3: State-Controlled Media**
Input: "example-state-outlet.example"
Evidence: [E1] Independent assessor: Government-controlled, limited editorial independence. [E2] Press freedom organization: Content reflects state narratives.
Output:
{
  "sourceType": "state_controlled_media",
  "identifiedEntity": "Example State News Agency",
  "evidenceQuality": { "independentAssessmentsCount": 2, "recencyWindowUsed": "2024-2025", "notes": "Multiple assessments identify state control." },
  "score": 0.27,
  "confidence": 0.85,
  "factualRating": "unreliable",
  "bias": { "politicalBias": "not_applicable", "otherBias": "pro_government" },
  "reasoning": "Evidence indicates state-controlled media without editorial independence. Content reflects government narratives. Score capped at state_controlled_media ceiling (≤0.42).",
  "evidenceCited": [
    { "claim": "Government-controlled with limited editorial independence", "basis": "E1", "recency": "2024" },
    { "claim": "Content reflects state narratives", "basis": "E2", "recency": "2025" }
  ],
  "caveats": ["Assessment based on editorial structure, not specific fact-checks of individual claims"]
}

**Example 4: Propaganda Outlet**
Input: "example-propaganda-site.example"
Evidence: [E1] Disinformation tracker: Identified as propaganda outlet. [E2] Independent assessor: Publishes false and misleading content.
Output:
{
  "sourceType": "propaganda_outlet",
  "identifiedEntity": null,
  "evidenceQuality": { "independentAssessmentsCount": 2, "recencyWindowUsed": "2023-2025", "notes": "Multiple independent assessments identify propaganda operations." },
  "score": 0.08,
  "confidence": 0.92,
  "factualRating": "highly_unreliable",
  "bias": { "politicalBias": "not_applicable", "otherBias": "pro_government" },
  "reasoning": "Multiple independent disinformation trackers and assessors identify this as a propaganda outlet. Score capped at propaganda_outlet ceiling (≤0.14).",
  "evidenceCited": [
    { "claim": "Identified as propaganda outlet", "basis": "E1", "recency": "2024" },
    { "claim": "Publishes false and misleading content", "basis": "E2", "recency": "2023" }
  ],
  "caveats": []
}

**Example 5: Identifiable Source Type Without Fact-Checker Ratings**
Input: "party-website.example"
Evidence: [E1] Government directory listing: official website of political party X. [E2] Academic paper citing party publications. [E3] News article mentioning party's political positions.
Output:
{
  "sourceType": "advocacy",
  "identifiedEntity": "Political Party X",
  "evidenceQuality": { "independentAssessmentsCount": 0, "recencyWindowUsed": "2020-2025", "notes": "Source type clearly identifiable from evidence. No independent reliability assessments but source type characteristics allow scoring." },
  "score": 0.30,
  "confidence": 0.60,
  "factualRating": "leaning_unreliable",
  "bias": { "politicalBias": "right", "otherBias": null },
  "reasoning": "Evidence clearly identifies this as an official political party website. That makes it an advocacy source rather than an editorial publisher. Score of 0.30 reflects the inherent limitations of advocacy sources. No independent fact-checker ratings exist to adjust this assessment up or down.",
  "evidenceCited": [
    { "claim": "Official political party website", "basis": "E1", "recency": "2023" },
    { "claim": "Referenced in academic research as party source", "basis": "E2", "recency": "2020" }
  ],
  "caveats": ["Score based on source type classification (advocacy), not independent fact-checker assessments", "No independent reliability ratings available"]
}

**Example 6: Insufficient Data (truly unknown)**
Input: "unknown-local-outlet.example"
Evidence: (empty evidence pack)
Output:
{
  "sourceType": "unknown",
  "identifiedEntity": null,
  "evidenceQuality": { "independentAssessmentsCount": 0, "recencyWindowUsed": "unknown", "notes": "No evidence available at all." },
  "score": null,
  "confidence": 0.15,
  "factualRating": "insufficient_data",
  "bias": { "politicalBias": "not_applicable", "otherBias": null },
  "reasoning": "Empty evidence pack — no information available to assess this source. Cannot determine source type or reliability.",
  "evidenceCited": [],
  "caveats": ["No evidence available", "Source type unknown"]
}

─────────────────────────────────────────────────────────────────────
FINAL VALIDATION (check before responding)
─────────────────────────────────────────────────────────────────────
□ Score falls within correct range for factualRating
□ Every claim in evidenceCited references an evidence ID (E1, E2, etc.)
□ Applied evidence-only rule (no pretrained knowledge used)
□ Applied SOURCE TYPE CAPS if sourceType is propaganda_outlet/known_disinformation/state_controlled_media/platform_ugc (NOT collaborative_reference)
□ Applied negative evidence caps if applicable
□ If confidence < 0.50 or zero fact-checkers + weak mentions → considered insufficient_data
□ EXCEPTION: If source type clearly identifiable → scored by source type even without fact-checker ratings
□ Recency weighting applied (discounted old evidence appropriately)
□ Political bias noted but did NOT reduce score unless paired with documented failures
□ Self-published pages were NOT counted as independent assessments
□ Follow the schema above exactly
□ Return only valid JSON (no markdown, no extra commentary)
`;
}

// ============================================================================
// REFINEMENT PROMPT (Sequential LLM Chain)
// ============================================================================

/**
 * Generate a refinement prompt for the second LLM to cross-check and refine
 * the initial evaluation. This enables sequential refinement where LLM2
 * can catch what LLM1 missed, especially for entity-level evaluation.
 */
export function getRefinementPrompt(
  domain: string,
  evidenceSection: string,
  initialResult: EvaluationResult,
  initialModelName: string
): string {
  const scoreStr = initialResult.score !== null
    ? `${(initialResult.score * 100).toFixed(0)}%`
    : "null (insufficient_data)";

  const evidenceCitedSummary = (initialResult.evidenceCited ?? [])
    .map(e => `- ${e.claim} (${e.basis})`)
    .join("\n") || "(none cited)";

  return `You are a senior fact-check analyst performing a CROSS-CHECK and REFINEMENT of an initial source reliability evaluation.

═══════════════════════════════════════════════════════════════════════════════
DOMAIN UNDER EVALUATION: ${domain}
═══════════════════════════════════════════════════════════════════════════════

═══════════════════════════════════════════════════════════════════════════════
INITIAL EVALUATION (by ${initialModelName})
═══════════════════════════════════════════════════════════════════════════════
Score: ${scoreStr}
Rating: ${initialResult.factualRating}
Source Type: ${initialResult.sourceType || "unknown"}
Identified Entity: ${initialResult.identifiedEntity || "Not identified"}
Confidence: ${(initialResult.confidence * 100).toFixed(0)}%

Initial Reasoning:
${initialResult.reasoning}

Evidence Cited by Initial Evaluation:
${evidenceCitedSummary}

Caveats from Initial Evaluation:
${(initialResult.caveats ?? []).map(c => `- ${c}`).join("\n") || "(none)"}

═══════════════════════════════════════════════════════════════════════════════
EVIDENCE PACK (Same evidence the initial evaluation used)
═══════════════════════════════════════════════════════════════════════════════

EVIDENCE WEIGHTING RULES (if items are grouped by probativeValue):
- HIGH = authoritative assessments (fact-checker ratings, press council rulings). Carry the MOST weight.
- MEDIUM = substantive analysis (academic research, journalistic investigations). Support/refine.
- LOW = contextual mentions (blog posts, passing references). Must NOT override HIGH/MEDIUM signals.
- If HIGH items consistently indicate unreliability, the score MUST reflect that regardless of LOW items.

${evidenceSection}

═══════════════════════════════════════════════════════════════════════════════
YOUR TASK: CROSS-CHECK AND REFINE
═══════════════════════════════════════════════════════════════════════════════

1. CROSS-CHECK the initial evaluation against the evidence
   - Did the initial evaluation interpret the evidence correctly?
   - Are there any errors or oversights?

2. IDENTIFY what the initial evaluation missed or got wrong
   - Look for evidence the initial evaluation didn't cite
   - Check if evidence was misinterpreted

3. SHARPEN the entity identification
   - Is this domain the PRIMARY outlet for a larger organization?
   - What type of organization is it? (public broadcaster, wire service, newspaper, etc.)
   - Only mark "well-known/established" if the evidence pack explicitly says so

4. ENRICH with organizational context
   - For PUBLIC BROADCASTERS (national/public media funded by government but editorially independent):
     * Government-funded but editorially independent
     * Institutional history and accountability structures
   - For WIRE SERVICES (news agencies providing content to other outlets):
     * Industry standard for factual reporting
     * Used by other news organizations worldwide
   - For LEGACY NEWSPAPERS/BROADCASTERS (established media with decades of operation):
     * Established editorial standards and correction policies
     * Track record matters
   IMPORTANT: Only include organization-level context if the evidence pack explicitly documents it.

5. CROSS-CHECK AND ADJUST the score
   - Verify the initial evaluation is correct
   - Add entity-level context if the initial evaluation missed it

   ADJUSTMENT RULES (must follow strictly):
   - UPWARD adjustment when positive signals are PRESENT and score doesn't match evidence:
     * Fact-checker explicitly rates "HIGH" or "VERY HIGH" factual → score in reliable/highly_reliable range
     * Multiple Tier 1 assessors give positive ratings → score should reflect the consensus
     * If assessors say source is highly reliable but initial score seems low, adjust upward
     * Don't be artificially conservative when assessors explicitly rate a source highly
   - UPWARD adjustment also supported by:
     * Academic citations of the source as reference material
     * Professional/institutional use documented
     * Independent mentions treating it as authoritative
     * Explicit evidence of editorial standards, corrections, or reliability ratings
   - DOWNWARD adjustment if negative signals were missed or underweighted:
     * Fact-checker failures (CORRECTIV, Snopes, etc. found misleading content)
     * ECHOING or AMPLIFYING propaganda from other sources (even if not creating it)
     * Publishing unverified claims from propaganda outlets
     * Multiple documented instances of misleading content
   - ENFORCE NEGATIVE EVIDENCE CAPS (CHECK CUMULATIVE FIRST):
     *** CUMULATIVE RULE (check FIRST, takes precedence): ***
     If evidence shows BOTH propaganda echoing AND fact-checker/press-council failures:
     → score MUST be in unreliable band (0.15-0.28) — NON-NEGOTIABLE

     PROPAGANDA ECHOING = "verbatim translation", republishing state media, cited in disinformation databases
     Press council rulings from rule-of-law countries = fact-checker failures

     Example: "verbatim translation" + "3 press council rulings" = CUMULATIVE → score in 0.15-0.28

     Individual caps define UPPER BOUNDS - score within the band, not at the border:
     * Echoing ONLY → score in 0.29-0.42 band
     * Failures ONLY → score in 0.29-0.57 depending on severity
     * Tier 1 assessor rates factual reporting as "Low"/"Not Credible"/"Mixed" → score ≤ 0.42
       ("Low"/"Not Credible" should be in lower half: 0.29-0.35)

     SEVERITY COMPOUNDING — multiple HIGH-probativeValue negative signals:
     * 3+ fact-checker failures + academic/research classification as unreliable → unreliable band (0.15-0.28)
     * 3+ fact-checker failures + cited in disinformation databases → unreliable band (0.15-0.28)
     * Multiple independent HIGH negative signals confirming same pattern → use LOWER applicable band

     IMPORTANT: Caps are CEILINGS, not targets. Score naturally within appropriate band.
     Weight HIGH probativeValue evidence most heavily when determining which band applies.

     If initial evaluation scored above these caps despite evidence, LOWER THE SCORE
   - NO adjustment if evidence is simply sparse (sparse ≠ positive)
   - Absence of negative evidence alone does NOT justify upward adjustment
   - Do NOT adjust upward based on popularity, audience size, influence, or "legacy" status without evidence

6. MULTILINGUAL EVIDENCE CHECK
   - Evidence may be in languages OTHER than English
   - Regional fact-checkers are Tier 1 assessors (same weight as global fact-checkers)
   - Did the initial evaluation properly weigh non-English evidence?
   - Check if regional fact-checker assessments were overlooked

═══════════════════════════════════════════════════════════════════════════════
EVIDENCE SIGNALS (same as initial evaluation)
═══════════════════════════════════════════════════════════════════════════════
${SHARED_EVIDENCE_SIGNALS}

REFINEMENT-SPECIFIC RULES:
- Absence of explicit fact-checker ratings does NOT penalize sources
  (fact-checkers focus on problematic sources), but it also does NOT justify upward adjustment
- Upward adjustment requires POSITIVE signals to be documented in the evidence pack

═══════════════════════════════════════════════════════════════════════════════
RATING SCALE (must match initial evaluation)
═══════════════════════════════════════════════════════════════════════════════
${SHARED_RATING_SCALE}

═══════════════════════════════════════════════════════════════════════════════
SOURCE TYPES (must match initial evaluation)
═══════════════════════════════════════════════════════════════════════════════
${SHARED_SOURCE_TYPES}

${SHARED_SCORE_CAPS}

═══════════════════════════════════════════════════════════════════════════════
OUTPUT FORMAT (JSON only, no markdown, no extra commentary)
CRITICAL: Output MUST be raw JSON. Do NOT wrap in code fences.
First character MUST be "{" and last character MUST be "}".
═══════════════════════════════════════════════════════════════════════════════
{
  "crossCheckFindings": "string: What did the initial evaluation miss, get wrong, or interpret incorrectly? Be specific.",
  "entityRefinement": {
    "identifiedEntity": "string: The organization name or null if unknown",
    "organizationType": "string: public_broadcaster | wire_service | legacy_newspaper | legacy_broadcaster | digital_native | other",
    "isWellKnown": "boolean: Is this a well-established, recognized organization?",
    "notes": "string: Brief explanation of the organization's status"
  },
  "scoreAdjustment": {
    "originalScore": ${initialResult.score !== null ? initialResult.score.toFixed(2) : "null"},
    "refinedScore": "number (0.00-1.00) or null if insufficient_data",
    "adjustmentReason": "string: Why the score was adjusted, or 'No adjustment - initial score is appropriate'"
  },
  "refinedRating": "string: highly_reliable | reliable | leaning_reliable | mixed | leaning_unreliable | unreliable | highly_unreliable | insufficient_data",
  "refinedConfidence": "number (0.00-1.00): Your confidence in the refined assessment",
  "combinedReasoning": "string: Updated reasoning. Use DIRECT framing and CONSISTENT terminology matching the refinedRating (e.g., 'reliable' not 'highly reliable'). Never write 'does not support X rating'"
}

Return ONLY valid JSON. No markdown fences, no extra text.`;
}
