/**
 * FactHarbor - Internal Source Reliability Evaluation API
 *
 * LLM-powered evaluation of source reliability with optional multi-model consensus.
 * This endpoint is INTERNAL ONLY - requires FH_INTERNAL_RUNNER_KEY.
 *
 * @module api/internal/evaluate-source
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { getDeterministicTemperature } from "@/lib/analyzer/config";
import { getActiveSearchProviders, searchWebWithProvider, type WebSearchResult } from "@/lib/web-search";

export const runtime = "nodejs";
export const maxDuration = 60; // Allow up to 60s for multi-model evaluation

// ============================================================================
// CONFIGURATION DIAGNOSTICS (logs once on module load)
// ============================================================================

const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.startsWith("PASTE_");
const hasOpenAIKey = !!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith("PASTE_");

console.log(`[SR-Eval] Configuration check:`);
console.log(`  - ANTHROPIC_API_KEY: ${hasAnthropicKey ? "✓ configured" : "✗ MISSING or placeholder"}`);
console.log(`  - OPENAI_API_KEY: ${hasOpenAIKey ? "✓ configured" : "✗ MISSING or placeholder"}`);
console.log(`  - Multi-model consensus: ${hasAnthropicKey && hasOpenAIKey ? "✓ available" : "⚠ unavailable (need both keys)"}`);

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const RequestSchema = z.object({
  domain: z.string().min(1),
  multiModel: z.boolean().default(true),
  confidenceThreshold: z.number().min(0).max(1).default(0.8),
  consensusThreshold: z.number().min(0).max(1).default(0.15),
});

const FactualRatingSchema = z
  .enum([
    "highly_reliable", // 0.86-1.00
    "reliable", // 0.72-0.85
    "leaning_reliable", // 0.58-0.71 (formerly generally_reliable)
    "mixed", // 0.43-0.57
    "leaning_unreliable", // 0.29-0.42 (formerly generally_unreliable)
    "unreliable", // 0.15-0.28
    "highly_unreliable", // 0.00-0.14
    "insufficient_data", // null score - Unknown source, no assessments exist
    // Legacy aliases (accept but normalize)
    "generally_reliable",
    "generally_unreliable",
  ])
  .transform((v) => {
    if (v === "generally_reliable") return "leaning_reliable";
    if (v === "generally_unreliable") return "leaning_unreliable";
    return v;
  });

const EvaluationResultSchema = z.object({
  domain: z.string().optional(),
  evaluationDate: z.string().optional(),
  // Keep these fields permissive to avoid failing the entire evaluation if a model
  // uses slightly different labels/typing. We still instruct exact values in the prompt.
  sourceType: z.string().optional(),
  evidenceQuality: z.object({
    independentAssessmentsCount: z.coerce.number().min(0).max(10).optional(),
    recencyWindowUsed: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
  score: z.number().min(0).max(1).nullable(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  factualRating: FactualRatingSchema,
  // Dimension scores for multi-criteria evaluation
  dimensionScores: z.object({
    factualAccuracy: z.number().min(0).max(30),       // 0-30 points
    opinionFactSeparation: z.number().min(0).max(25), // 0-25 points
    sourceAttribution: z.number().min(0).max(20),     // 0-20 points
    correctionPractices: z.number().min(0).max(15),   // 0-15 points
    biasPenalty: z.number().min(-10).max(0),          // -10 to 0 points
  }).optional(),
  // Bias fields are informational only; keep permissive to avoid hard-failing
  // the entire evaluation on minor label differences.
  biasIndicator: z.string().optional(),
  bias: z
    .object({
      politicalBias: z.string(),
      otherBias: z.string().nullable().optional(),
    })
    .optional(),
  evidenceCited: z.array(z.object({
    claim: z.string(),
    basis: z.string(),
    recency: z.string().optional(),
    evidenceId: z.string().optional(),
    url: z.string().optional(),
  })).optional(),
  caveats: z.array(z.string()).optional(),
});

type EvaluationResult = z.infer<typeof EvaluationResultSchema>;

interface EvidenceItem {
  claim: string;
  basis: string;
  recency?: string;
}

interface ResponsePayload {
  score: number | null;
  confidence: number;
  modelPrimary: string;
  modelSecondary: string | null;
  consensusAchieved: boolean;
  reasoning: string;
  category: string;
  evidencePack?: {
    providersUsed: string[];
    queries: string[];
    items: EvidencePackItem[];
  };
  // Keep biasIndicator for backward compatibility with cache
  biasIndicator: string | null | undefined;
  bias?: {
    politicalBias: string;
    otherBias?: string | null;
  };
  evidenceCited?: EvidenceItem[];
  caveats?: string[];
}

// ============================================================================
// RATE LIMITING (In-Memory)
// ============================================================================

interface RateLimitState {
  ipRequests: Map<string, { count: number; resetAt: number }>;
  domainLastEval: Map<string, number>;
}

const rateLimitState: RateLimitState = {
  ipRequests: new Map(),
  domainLastEval: new Map(),
};

const RATE_LIMIT_PER_IP = parseInt(process.env.FH_SR_RATE_LIMIT_PER_IP || "10", 10);
const DOMAIN_COOLDOWN_SEC = parseInt(process.env.FH_SR_RATE_LIMIT_DOMAIN_COOLDOWN || "60", 10);
const RATE_LIMIT_WINDOW_SEC = 60;

function checkRateLimit(ip: string, domain: string): { allowed: boolean; reason?: string } {
  const now = Date.now();

  // Check IP rate limit
  const ipState = rateLimitState.ipRequests.get(ip);
  if (ipState) {
    if (now < ipState.resetAt) {
      if (ipState.count >= RATE_LIMIT_PER_IP) {
        return { allowed: false, reason: `IP rate limit exceeded (${RATE_LIMIT_PER_IP}/min)` };
      }
      ipState.count++;
    } else {
      // Reset window
      rateLimitState.ipRequests.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_SEC * 1000 });
    }
  } else {
    rateLimitState.ipRequests.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_SEC * 1000 });
  }

  // Check domain cooldown
  const lastEval = rateLimitState.domainLastEval.get(domain);
  if (lastEval && now - lastEval < DOMAIN_COOLDOWN_SEC * 1000) {
    return { allowed: false, reason: `Domain cooldown (${DOMAIN_COOLDOWN_SEC}s)` };
  }
  rateLimitState.domainLastEval.set(domain, now);

  return { allowed: true };
}

// ============================================================================
// LLM EVALUATION
// ============================================================================

type EvidencePackItem = {
  id: string; // E1, E2, ...
  url: string;
  title: string;
  snippet: string | null;
  query: string;
  provider: string;
};

type EvidencePack = {
  enabled: boolean;
  providersUsed: string[];
  queries: string[];
  items: EvidencePackItem[];
};

function deriveBrandToken(domain: string): string {
  const labels = String(domain || "")
    .toLowerCase()
    .split(".")
    .map((s) => s.trim())
    .filter(Boolean);
  if (labels.length === 0) return "";
  if (labels.length === 1) return labels[0];

  // For common ccTLD patterns like bbc.co.uk, skip registry-like second-level labels.
  // This is a generic heuristic (not a domain list).
  const registryLike = new Set(["co", "com", "net", "org", "gov", "edu", "ac"]);

  // Start just left of the TLD and walk left until we find a non-registry-like label.
  for (let i = labels.length - 2; i >= 0; i--) {
    const candidate = labels[i];
    if (registryLike.has(candidate)) continue;
    if (candidate === "www") continue;
    return candidate;
  }

  // Fallback
  return labels[0];
}

function isUsableBrandToken(token: string): boolean {
  const t = (token ?? "").trim().toLowerCase();
  // Too short tends to be ambiguous/noisy (e.g., "x").
  if (t.length < 3) return false;
  // Avoid extremely generic placeholders.
  if (t === "www") return false;
  return true;
}

function isRelevantSearchResult(
  r: WebSearchResult,
  domain: string,
  brand: string
): boolean {
  const url = (r.url ?? "").toLowerCase();
  const title = (r.title ?? "").toLowerCase();
  const snippet = (r.snippet ?? "").toLowerCase();
  const blob = `${title} ${snippet} ${url}`;

  const d = String(domain || "").toLowerCase();
  if (!d) return true;

  // Any direct domain mention is relevant (including in URL).
  if (blob.includes(d) || blob.includes(`www.${d}`)) return true;

  // If URL host is the domain (or subdomain), treat as relevant even if snippet/title omit it.
  try {
    const host = new URL(r.url).hostname.toLowerCase().replace(/^www\./, "");
    if (host === d || host.endsWith(`.${d}`)) return true;
  } catch {
    // ignore URL parse errors
  }

  // Brand mention can be relevant, but only if it's a usable (non-ambiguous) token.
  const b = (brand ?? "").toLowerCase().trim();
  if (isUsableBrandToken(b) && blob.includes(b)) return true;

  return false;
}

function parseDateRestrictEnv(v: string | undefined): "y" | "m" | "w" | undefined {
  const s = (v ?? "").toLowerCase().trim();
  if (s === "y" || s === "m" || s === "w") return s;
  return undefined;
}

function isSearchEnabledForSrEval(): { enabled: boolean; providersUsed: string[] } {
  const useSearch = (process.env.FH_SR_EVAL_USE_SEARCH ?? "true").toLowerCase() !== "false";
  const searchEnabled = (process.env.FH_SEARCH_ENABLED ?? "true").toLowerCase() === "true";
  if (!useSearch || !searchEnabled) return { enabled: false, providersUsed: [] };

  const providersUsed = getActiveSearchProviders();
  const hasProvider = providersUsed.some((p) => p && p !== "None" && p !== "Unknown");
  return { enabled: hasProvider, providersUsed };
}

async function buildEvidencePack(domain: string): Promise<EvidencePack> {
  const { enabled, providersUsed } = isSearchEnabledForSrEval();
  if (!enabled) return { enabled: false, providersUsed, queries: [], items: [] };

  const brand = deriveBrandToken(domain);
  const brandPrefix = isUsableBrandToken(brand) ? `${brand} ` : "";
  const domainToken = `"${domain}"`;

  // Keep search small to fit the 60s route budget.
  // Goal: enough signal to avoid inflated "mixed" scores.
  const queries = [
    `${brandPrefix}${domainToken} fact check reliability`,
    `${brandPrefix}${domainToken} media bias fact check credibility rating`,
    `${brandPrefix}${domainToken} corrections policy editorial standards retractions`,
  ];

  const maxResultsPerQuery = Math.max(
    1,
    Math.min(parseInt(process.env.FH_SR_EVAL_SEARCH_MAX_RESULTS_PER_QUERY || "3", 10), 10)
  );
  const maxEvidenceItems = Math.max(
    1,
    Math.min(parseInt(process.env.FH_SR_EVAL_MAX_EVIDENCE_ITEMS || "6", 10), 20)
  );
  const dateRestrict =
    parseDateRestrictEnv(process.env.FH_SR_EVAL_SEARCH_DATE_RESTRICT) ??
    parseDateRestrictEnv(process.env.FH_SEARCH_DATE_RESTRICT) ??
    undefined;

  const seen = new Set<string>();
  const rawItems: Array<{ r: WebSearchResult; query: string; provider: string }> = [];

  for (const q of queries) {
    try {
      const resp = await searchWebWithProvider({
        query: q,
        maxResults: maxResultsPerQuery,
        dateRestrict,
      });

      const provider = resp.providersUsed.join("+") || "unknown";
      for (const r of resp.results) {
        if (!r.url) continue;
        if (seen.has(r.url)) continue;
        if (!isRelevantSearchResult(r, domain, brand)) continue;
        seen.add(r.url);
        rawItems.push({ r, query: q, provider });
        if (rawItems.length >= maxEvidenceItems) break;
      }
    } catch (err) {
      console.warn(`[SR-Eval] Search failed for query "${q}":`, err);
    }
    if (rawItems.length >= maxEvidenceItems) break;
  }

  const items: EvidencePackItem[] = rawItems.slice(0, maxEvidenceItems).map((it, idx) => ({
    id: `E${idx + 1}`,
    url: it.r.url,
    title: it.r.title,
    snippet: it.r.snippet ?? null,
    query: it.query,
    provider: it.provider,
  }));

  return { enabled: true, providersUsed, queries, items };
}

/**
 * Generate LLM evaluation prompt for source reliability assessment.
 * @param domain - The domain to evaluate
 * @param evidencePack - Retrieved evidence pack (may be empty if search is disabled/unavailable)
 */
function getEvaluationPrompt(domain: string, evidencePack: EvidencePack): string {
  const currentDate = new Date().toISOString().split("T")[0];

  const hasEvidence = evidencePack.enabled && evidencePack.items.length > 0;

  const evidenceSection = hasEvidence
    ? [
        `## EVIDENCE PACK`,
        `The following ${evidencePack.items.length} search results are your ONLY external evidence. Base all claims on these items using their IDs (E1, E2, etc.).`,
        ``,
        ...evidencePack.items.map((it) => {
          const snip = (it.snippet ?? "").replace(/\s+/g, " ").trim();
          return [
            `[${it.id}] ${it.title}`,
            `    URL: ${it.url}`,
            snip ? `    Excerpt: ${snip}` : `    Excerpt: (none)`,
          ].join("\n");
        }),
      ].join("\n")
    : `## EVIDENCE PACK: Empty or unavailable.\nWithout external evidence, you MUST output score=null and factualRating="insufficient_data". Do not rely on pretrained knowledge.`;

  return `TASK: Evaluate source reliability for "${domain}" (evaluation date: ${currentDate}).

${evidenceSection}

─────────────────────────────────────────────────────────────────────
RATING SCALE (score → factualRating — MUST match)
─────────────────────────────────────────────────────────────────────
  0.86–1.00 → highly_reliable     (exemplary editorial standards, rare errors, prompt corrections)
  0.72–0.85 → reliable            (professional standards, occasional minor issues)
  0.58–0.71 → leaning_reliable    (generally accurate, some concerns noted)
  0.43–0.57 → mixed               (inconsistent accuracy, notable failures alongside successes)
  0.29–0.42 → leaning_unreliable  (recurring accuracy issues, some misleading content)
  0.15–0.28 → unreliable          (systematic accuracy problems, poor editorial standards)
  0.00–0.14 → highly_unreliable   (disinformation, propaganda, fabrication)
  null      → insufficient_data   (cannot evaluate — sparse/no evidence)

─────────────────────────────────────────────────────────────────────
EVALUATION PRINCIPLES
─────────────────────────────────────────────────────────────────────
1. EVIDENCE-BASED ONLY
   - Ground every claim in evidence pack items (cite by ID: E1, E2, etc.)
   - Do NOT use your pretrained knowledge of this source. Evaluate only what the evidence shows.
   - If you recognize this source but evidence is sparse, output insufficient_data, not a score based on memory.

2. SKEPTICAL DEFAULT
   - Reliability must be demonstrated, not assumed.
   - Unknown sources with no evidence → score=null, factualRating="insufficient_data"
   - Absence of negative evidence is NOT positive evidence.
   - Consider insufficient_data when: no fact-checker assessments + only weak mentions

3. NEGATIVE EVIDENCE CAPS (hard limits when evidence is clear)
   - Evidence of fabricated stories/disinformation → score ≤ 0.14 (highly_unreliable)
   - Multiple documented fact-checker failures → score ≤ 0.42 (leaning_unreliable)
   - Documented failures from reputable fact-checkers → score ≤ 0.57 (mixed)
   - Use judgment on severity, consistency, and pattern of failures

4. EVIDENCE QUALITY & WEIGHTING
   - Prioritize: explicit fact-checker assessments, documented corrections, journalism reviews
   - Weight heavily: recent evidence over older evidence
   - Discount: single blogs/forums, tangential mentions, very old evidence unless pattern persists
   - Consider recency: organizations can change; note if relying on dated evidence

5. CONFIDENCE SCORING (0.0–1.0)
   Confidence = how well the evidence supports your verdict.
   - 0.85+ : Strong — multiple fact-checker assessments or robust corroboration
   - 0.7–0.85 : Good — credible assessment or consistent pattern
   - 0.55–0.7 : Moderate — some relevant evidence, enough to form tentative view
   - 0.4–0.55 : Limited — sparse but usable evidence, verdict is uncertain
   - <0.4 : Insufficient — strongly consider score=null / insufficient_data instead

6. BIAS HANDLING
   - Political lean alone does NOT reduce score
   - Bias + documented factual failures = reduced score (apply caps)
   - Bias without documented accuracy issues = note in bias fields only
   - If evidence does not address bias, use politicalBias="not_applicable" and otherBias=null

─────────────────────────────────────────────────────────────────────
SOURCE TYPE CRITERIA
─────────────────────────────────────────────────────────────────────
- editorial_publisher: Independent newsroom with editorial standards
- wire_service: News agency providing content to other outlets (AP, Reuters, AFP)
- government: Official government communication (not journalism)
- state_media: Government-funded but editorially independent (BBC, NPR model)
- state_controlled_media: Government controls editorial content
- platform_ugc: User-generated content platforms (social media, forums)
- advocacy: Organization promoting specific cause/viewpoint
- aggregator: Republishes content from other sources
- propaganda_outlet: Primary purpose is influence operations
- known_disinformation: Documented source of fabricated content
- unknown: Cannot determine from evidence

─────────────────────────────────────────────────────────────────────
BIAS VALUES (exact strings only)
─────────────────────────────────────────────────────────────────────
politicalBias: far_left | left | center_left | center | center_right | right | far_right | not_applicable
otherBias: pro_government | anti_government | corporate_interest | sensationalist | ideological_other | none_detected | null

─────────────────────────────────────────────────────────────────────
OUTPUT FORMAT (JSON only, no markdown, no commentary)
─────────────────────────────────────────────────────────────────────
{
  "sourceType": "editorial_publisher | wire_service | government | state_media | state_controlled_media | platform_ugc | advocacy | aggregator | propaganda_outlet | known_disinformation | unknown",
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
  "reasoning": "string, 2-4 sentences explaining verdict and key evidence factors",
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
FEW-SHOT EXAMPLES (Follow these patterns)
─────────────────────────────────────────────────────────────────────

**Example 1: Reliable Source (e.g. Reuters)**
Input: "reuters.com"
Evidence: [E1] Reuters Fact Check: Claim X is false. [E2] Reuters Editorial Standards: Strict verification...
Output:
{
  "sourceType": "wire_service",
  "evidenceQuality": { "independentAssessmentsCount": 2, "recencyWindowUsed": "2024-2026", "notes": "Strong documentation of standards and active fact-checking." },
  "score": 0.95,
  "confidence": 0.95,
  "factualRating": "highly_reliable",
  "bias": { "politicalBias": "center", "otherBias": "none_detected" },
  "reasoning": "Reuters is a major wire service with documented high editorial standards and a robust fact-checking operation. Evidence shows consistent accuracy and prompt corrections.",
  "evidenceCited": [
    { "claim": "Maintains strict editorial and verification standards", "basis": "E2", "recency": "2024" },
    { "claim": "Operates active, transparent fact-checking department", "basis": "E1", "recency": "2025" }
  ],
  "caveats": []
}

**Example 2: Mixed/Unreliable Source**
Input: "example-tabloid.com"
Evidence: [E1] PolitiFact: example-tabloid.com claim about Y is False. [E2] Snopes: example-tabloid.com fabricated story Z.
Output:
{
  "sourceType": "editorial_publisher",
  "evidenceQuality": { "independentAssessmentsCount": 2, "recencyWindowUsed": "2023-2025", "notes": "Multiple documented failures from reputable fact-checkers." },
  "score": 0.25,
  "confidence": 0.90,
  "factualRating": "unreliable",
  "bias": { "politicalBias": "right", "otherBias": "sensationalist" },
  "reasoning": "The source has multiple documented instances of fabricating content and failing fact-checks by reputable organizations. This indicates systematic accuracy problems.",
  "evidenceCited": [
    { "claim": "Documented fabrication of news stories", "basis": "E2", "recency": "2023" },
    { "claim": "Failed multiple independent fact-checks", "basis": "E1", "recency": "2024" }
  ],
  "caveats": ["Evaluation based on specific documented failures; overall volume of output not assessed."]
}

**Example 3: Insufficient Data**
Input: "new-local-blog.org"
Evidence: [E1] Mention of new-local-blog.org in a directory.
Output:
{
  "sourceType": "unknown",
  "evidenceQuality": { "independentAssessmentsCount": 0, "recencyWindowUsed": "unknown", "notes": "No independent assessments or detailed information available." },
  "score": null,
  "confidence": 0.20,
  "factualRating": "insufficient_data",
  "bias": { "politicalBias": "not_applicable", "otherBias": null },
  "reasoning": "There is insufficient evidence to form a reliable assessment of this source's factual accuracy or editorial standards.",
  "evidenceCited": [],
  "caveats": ["No fact-checker data found", "Source is not widely indexed"]
}

─────────────────────────────────────────────────────────────────────
FINAL VALIDATION (check before responding)
─────────────────────────────────────────────────────────────────────
□ score falls within correct range for factualRating
□ Every claim in evidenceCited references an evidence ID (E1, E2, etc.)
□ Applied evidence-only rule (no pretrained knowledge)
□ If sparse evidence or low confidence → output insufficient_data
□ Follow the schema above exactly.
□ Return only valid JSON (no markdown, no extra commentary).
`;
}

async function evaluateWithModel(
  domain: string,
  modelProvider: "anthropic" | "openai",
  evidencePack: EvidencePack
): Promise<{ result: EvaluationResult; modelName: string } | null> {
  // Check API key availability
  const apiKeyEnvVar = modelProvider === "anthropic" ? "ANTHROPIC_API_KEY" : "OPENAI_API_KEY";
  const apiKey = process.env[apiKeyEnvVar];

  if (!apiKey) {
    console.error(`[SR-Eval] ${modelProvider.toUpperCase()} FAILED: ${apiKeyEnvVar} not set in environment`);
    return null;
  }

  if (apiKey.startsWith("PASTE_") || apiKey === "sk-...") {
    console.error(`[SR-Eval] ${modelProvider.toUpperCase()} FAILED: ${apiKeyEnvVar} appears to be a placeholder value`);
    return null;
  }

  const prompt = getEvaluationPrompt(domain, evidencePack);
  const temperature = getDeterministicTemperature(0.3);

  const modelName = modelProvider === "anthropic"
    ? "claude-3-5-haiku-20241022"
    : "gpt-4o-mini";

  console.log(`[SR-Eval] Calling ${modelProvider} (${modelName}) for ${domain}...`);

  const model = modelProvider === "anthropic"
    ? anthropic(modelName)
    : openai(modelName);

  try {
    const response = await generateText({
      model,
      messages: [
        {
          role: "system",
          content: "You are a media reliability analyst. Evaluate sources based solely on PROVIDED EVIDENCE - cite evidence pack items (E1, E2, etc.) for every claim. Never use pretrained knowledge about sources. Apply negative evidence caps when warranted (disinformation ≤0.14, multiple failures ≤0.42, 1-2 failures ≤0.57). Separate political bias from accuracy - bias alone does not reduce score. Default to insufficient_data when evidence is sparse. Always respond with valid JSON only."
        },
        { role: "user", content: prompt },
      ],
      temperature,
    });

    // Parse JSON from text response (works reliably across all providers)
    const text = response.text?.trim() || "";
    if (!text) {
      console.error(`[SR-Eval] ${modelProvider.toUpperCase()} FAILED: Empty response`);
      return null;
    }

    // Extract JSON from response (handle markdown code blocks if present)
    let jsonStr = text;
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error(`[SR-Eval] ${modelProvider.toUpperCase()} FAILED: Invalid JSON`);
      console.error(`  - Raw response: ${text.slice(0, 200)}...`);
      return null;
    }

    const result = EvaluationResultSchema.parse(parsed);
    const scoreStr = result.score !== null ? result.score.toFixed(2) : "null";
    console.log(`[SR-Eval] ${modelProvider.toUpperCase()} SUCCESS: score=${scoreStr}, confidence=${result.confidence.toFixed(2)}, rating=${result.factualRating}`);
    return { result, modelName };
  } catch (err: any) {
    // Detailed error logging
    const errorMessage = err?.message || String(err);
    const errorCode = err?.code || err?.status || "unknown";

    console.error(`[SR-Eval] ${modelProvider.toUpperCase()} FAILED for ${domain}:`);
    console.error(`  - Error code: ${errorCode}`);
    console.error(`  - Message: ${errorMessage}`);

    // Check for common error types
    if (errorMessage.includes("401") || errorMessage.includes("Unauthorized") || errorMessage.includes("invalid_api_key")) {
      console.error(`  - DIAGNOSIS: API key is invalid or expired. Check ${apiKeyEnvVar}`);
    } else if (errorMessage.includes("429") || errorMessage.includes("rate_limit")) {
      console.error(`  - DIAGNOSIS: Rate limit exceeded. Wait and retry.`);
    } else if (errorMessage.includes("500") || errorMessage.includes("503")) {
      console.error(`  - DIAGNOSIS: Provider service error. Try again later.`);
    } else if (errorMessage.includes("timeout") || errorMessage.includes("ETIMEDOUT")) {
      console.error(`  - DIAGNOSIS: Request timed out. Network issue or slow response.`);
    }

    return null;
  }
}

function computeFoundednessScore(result: EvaluationResult, evidencePack: EvidencePack): number {
  const cited = result.evidenceCited ?? [];
  if (cited.length === 0) return 0;

  // If we have an evidence pack, score based on explicit references to it.
  if (evidencePack.enabled && evidencePack.items.length > 0) {
    const ids = new Set(evidencePack.items.map((i) => i.id));
    const urls = new Set(evidencePack.items.map((i) => i.url));

    let totalRefs = 0;
    const uniqueRefs = new Set<string>();
    let recencyCount = 0;

    for (const item of cited) {
      if (item.recency && item.recency.trim()) recencyCount++;

      if (item.evidenceId && ids.has(item.evidenceId)) {
        totalRefs++;
        uniqueRefs.add(item.evidenceId);
      }

      const basis = item.basis || "";
      const matches = basis.match(/\bE\d+\b/g) ?? [];
      for (const m of matches) {
        if (ids.has(m)) {
          totalRefs++;
          uniqueRefs.add(m);
        }
      }

      if (item.url && urls.has(item.url)) {
        totalRefs++;
        uniqueRefs.add(item.url);
      }
    }

    const independentBonus = result.evidenceQuality?.independentAssessmentsCount
      ? Math.min(2, Math.max(0, result.evidenceQuality.independentAssessmentsCount) / 5)
      : 0;

    // Heuristic: prefer more (and more varied) grounded citations, with some reward for recency.
    return totalRefs * 2 + uniqueRefs.size * 1 + recencyCount * 0.25 + independentBonus;
  }

  // Fallback: no evidence pack available → reward structured citations and recency.
  const recencyCount = cited.filter((c) => (c.recency ?? "").trim().length > 0).length;
  return cited.length + recencyCount * 0.25;
}

interface EvaluationError {
  reason:
    | "primary_model_failed"
    | "no_consensus"
    | "evaluation_error";
  details: string;
  primaryScore?: number | null;
  primaryConfidence?: number;
  secondaryScore?: number | null;
  secondaryConfidence?: number;
}

// Helper to extract biasIndicator string from bias object (for backward compatibility)
function extractBiasIndicator(bias?: EvaluationResult["bias"]): string | null {
  if (!bias) return null;
  // Map new spectrum values to old format where needed
  const spectrum = bias.politicalBias;
  if (spectrum === "not_applicable") return null;
  // Convert underscores to hyphens for backward compatibility (center_left -> center-left)
  return spectrum.replace(/_/g, "-");
}

// Helper to build ResponsePayload from evaluation result
function buildResponsePayload(
  result: EvaluationResult,
  modelPrimary: string,
  modelSecondary: string | null,
  consensusAchieved: boolean,
  evidencePack: EvidencePack,
  overrideScore?: number | null,
  overrideConfidence?: number
): ResponsePayload {
  return {
    score: overrideScore !== undefined ? overrideScore : result.score,
    confidence: overrideConfidence !== undefined ? overrideConfidence : result.confidence,
    modelPrimary,
    modelSecondary,
    consensusAchieved,
    reasoning: result.reasoning,
    category: result.factualRating,
    evidencePack: {
      providersUsed: evidencePack.providersUsed,
      queries: evidencePack.queries,
      items: evidencePack.items,
    },
    biasIndicator: extractBiasIndicator(result.bias),
    bias: result.bias,
    evidenceCited: result.evidenceCited,
    caveats: result.caveats,
  };
}

async function evaluateSourceWithConsensus(
  domain: string,
  multiModel: boolean,
  confidenceThreshold: number,
  consensusThreshold: number
): Promise<{ success: true; data: ResponsePayload } | { success: false; error: EvaluationError }> {
  const evidencePack = await buildEvidencePack(domain);
  if (evidencePack.enabled) {
    console.log(
      `[SR-Eval] Evidence pack for ${domain}: ${evidencePack.items.length} items (providers: ${evidencePack.providersUsed.join(", ") || "unknown"})`
    );
  }

  // Primary evaluation (Anthropic Claude)
  const primary = await evaluateWithModel(domain, "anthropic", evidencePack);
  if (!primary) {
    console.log(`[SR-Eval] Primary evaluation failed for ${domain}`);
    return {
      success: false,
      error: {
        reason: "primary_model_failed",
        details: "Claude evaluation failed. Check API key or service availability.",
      },
    };
  }

  // Handle insufficient_data case
  if (primary.result.factualRating === "insufficient_data" || primary.result.score === null) {
    console.log(`[SR-Eval] Insufficient data for ${domain}`);
    return {
      success: true,
      data: buildResponsePayload(primary.result, primary.modelName, null, true, evidencePack),
    };
  }

  // Check confidence threshold
  if (primary.result.confidence < confidenceThreshold) {
    console.log(`[SR-Eval] Confidence too low for ${domain}: ${primary.result.confidence} < ${confidenceThreshold}`);
    return {
      success: true,
      data: {
        score: null,
        confidence: primary.result.confidence,
        modelPrimary: primary.modelName,
        modelSecondary: null,
        consensusAchieved: false,
        reasoning: primary.result.reasoning,
        category: "insufficient_data",
        evidencePack: {
          providersUsed: evidencePack.providersUsed,
          queries: evidencePack.queries,
          items: evidencePack.items,
        },
        biasIndicator: extractBiasIndicator(primary.result.bias),
        bias: primary.result.bias,
        evidenceCited: primary.result.evidenceCited,
        caveats: [
          ...(primary.result.caveats ?? []),
          `Low confidence ${(primary.result.confidence * 100).toFixed(0)}% is below threshold ${(confidenceThreshold * 100).toFixed(0)}%; returning insufficient_data (score=null).`,
        ],
      },
    };
  }

  // Single model mode
  if (!multiModel) {
    return {
      success: true,
      data: buildResponsePayload(primary.result, primary.modelName, null, true, evidencePack),
    };
  }

  // Multi-model: Secondary evaluation (OpenAI GPT-4)
  const secondary = await evaluateWithModel(domain, "openai", evidencePack);
  if (!secondary) {
    console.log(`[SR-Eval] Secondary evaluation failed for ${domain}, using primary only`);
    return {
      success: true,
      data: buildResponsePayload(
        primary.result,
        primary.modelName,
        null,
        false,
        evidencePack,
        primary.result.score,
        primary.result.confidence * 0.8 // Reduce confidence without consensus
      ),
    };
  }

  // Handle case where secondary returns insufficient_data
  if (secondary.result.factualRating === "insufficient_data" || secondary.result.score === null) {
    console.log(`[SR-Eval] Secondary model returned insufficient_data for ${domain}, using primary only`);
    return {
      success: true,
      data: buildResponsePayload(
        primary.result,
        primary.modelName,
        secondary.modelName,
        false,
        evidencePack,
        primary.result.score,
        primary.result.confidence * 0.8
      ),
    };
  }

  // Check consensus (both scores are non-null at this point)
  const scoreDiff = Math.abs(primary.result.score - secondary.result.score);
  const consensusAchieved = scoreDiff <= consensusThreshold;

  if (!consensusAchieved) {
    console.log(
      `[SR-Eval] No consensus for ${domain}: ${primary.result.score.toFixed(2)} vs ${secondary.result.score.toFixed(2)} (diff: ${scoreDiff.toFixed(2)} > ${consensusThreshold})`
    );
    return {
      success: false,
      error: {
        reason: "no_consensus",
        details: `Models disagree: Claude scored ${(primary.result.score * 100).toFixed(0)}%, GPT-4 scored ${(secondary.result.score * 100).toFixed(0)}% (difference ${(scoreDiff * 100).toFixed(0)}% exceeds ${(consensusThreshold * 100).toFixed(0)}% threshold).`,
        primaryScore: primary.result.score,
        primaryConfidence: primary.result.confidence,
        secondaryScore: secondary.result.score,
        secondaryConfidence: secondary.result.confidence,
      },
    };
  }

  // Consensus achieved - choose the "better founded" score using the evidence pack.
  // Tie-breaker: choose the lower score (skeptical default).
  const primaryFounded = computeFoundednessScore(primary.result, evidencePack);
  const secondaryFounded = computeFoundednessScore(secondary.result, evidencePack);

  let winner: typeof primary | typeof secondary = primary;
  if (secondaryFounded > primaryFounded) {
    winner = secondary;
  } else if (secondaryFounded === primaryFounded) {
    // Tie-breaker:
    // - If both scores are on the "positive side" (>= leaning_reliable lower bound), avoid
    //   systematically biasing downward: use the average.
    // - Otherwise (negative-side / borderline), prefer the lower score (skeptical default).
    if (primary.result.score >= 0.58 && secondary.result.score >= 0.58) {
      // Keep winner as primary but override score later via buildResponsePayload override.
      winner = primary;
    } else {
      winner = primary.result.score <= secondary.result.score ? primary : secondary;
    }
  }

  const finalScore =
    primaryFounded === secondaryFounded &&
    primary.result.score >= 0.58 &&
    secondary.result.score >= 0.58
      ? (primary.result.score + secondary.result.score) / 2
      : winner.result.score;
  if (finalScore === null) {
    return {
      success: false,
      error: {
        reason: "evaluation_error",
        details: "Unexpected null score after consensus (internal invariant).",
      },
    };
  }
  const finalConfidence = (primary.result.confidence + secondary.result.confidence) / 2;

  console.log(
    `[SR-Eval] Consensus for ${domain}: score=${finalScore.toFixed(2)}, conf=${finalConfidence.toFixed(2)}, foundedness=${primaryFounded.toFixed(2)} vs ${secondaryFounded.toFixed(2)}`
  );

  return {
    success: true,
    data: buildResponsePayload(
      winner.result,
      primary.modelName,
      secondary.modelName,
      true,
      evidencePack,
      finalScore,
      finalConfidence
    ),
  };
}

// ============================================================================
// API HANDLER
// ============================================================================

function getEnv(name: string): string | null {
  const v = process.env[name];
  return v && v.trim() ? v : null;
}

export async function POST(req: Request) {
  // Authentication
  const expectedRunnerKey = getEnv("FH_INTERNAL_RUNNER_KEY");
  if (expectedRunnerKey) {
    const got = req.headers.get("x-runner-key");
    if (got !== expectedRunnerKey) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "FH_INTERNAL_RUNNER_KEY not set" },
      { status: 503 }
    );
  }

  // Parse request
  let body: z.infer<typeof RequestSchema>;
  try {
    const raw = await req.json();
    body = RequestSchema.parse(raw);
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body", details: String(err) },
      { status: 400 }
    );
  }

  // Rate limiting
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const rateCheck = checkRateLimit(ip, body.domain);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", reason: rateCheck.reason },
      { status: 429 }
    );
  }

  // Evaluate
  const result = await evaluateSourceWithConsensus(
    body.domain,
    body.multiModel,
    body.confidenceThreshold,
    body.consensusThreshold
  );

  if (!result.success) {
    return NextResponse.json(
      {
        error: "Evaluation failed",
        reason: result.error.reason,
        details: result.error.details,
        primaryScore: result.error.primaryScore,
        primaryConfidence: result.error.primaryConfidence,
        secondaryScore: result.error.secondaryScore,
        secondaryConfidence: result.error.secondaryConfidence,
      },
      { status: 422 }
    );
  }

  return NextResponse.json(result.data);
}
