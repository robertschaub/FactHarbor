/**
 * FactHarbor - Internal Source Reliability Evaluation API
 *
 * LLM-powered evaluation of source reliability with optional multi-model consensus.
 * This endpoint is INTERNAL ONLY - requires FH_INTERNAL_RUNNER_KEY.
 *
 * v2.6.36 Hardening:
 * - Adaptive negative-signal queries for better propaganda/misinformation coverage
 * - Brand variant matching for improved relevance filtering
 * - CRITICAL RULES + mechanistic confidence + numeric caps in prompt
 * - SOURCE TYPE SCORE CAPS with deterministic enforcement
 * - Grounding gates to reduce overrating under weak evidence
 * - Abstract examples (AGENTS.md compliant - no real domain names)
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
import {
  DEFAULT_CONFIDENCE_THRESHOLD,
  DEFAULT_CONSENSUS_THRESHOLD,
  SOURCE_TYPE_CAPS,
  scoreToFactualRating,
  meetsConfidenceRequirement,
  MIN_EVIDENCE_IDS_FOR_SCORE,
  MIN_FOUNDEDNESS_FOR_HIGH_SCORES,
  type FactualRating,
} from "@/lib/source-reliability-config";

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
  confidenceThreshold: z.number().min(0).max(1).default(DEFAULT_CONFIDENCE_THRESHOLD),
  consensusThreshold: z.number().min(0).max(1).default(DEFAULT_CONSENSUS_THRESHOLD),
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
  sourceType: z.string().optional(),
  identifiedEntity: z.string().optional(), // The organization evaluated (e.g. "SRF", "BBC")
  evidenceQuality: z.object({
    independentAssessmentsCount: z.coerce.number().min(0).max(10).optional(),
    recencyWindowUsed: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
  score: z.number().min(0).max(1).nullable(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  factualRating: FactualRatingSchema,
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
  identifiedEntity?: string; // The organization evaluated
  evidencePack?: {
    providersUsed: string[];
    queries: string[];
    items: EvidencePackItem[];
  };
  biasIndicator: string | null | undefined;
  bias?: {
    politicalBias: string;
    otherBias?: string | null;
  };
  evidenceCited?: EvidenceItem[];
  caveats?: string[];
  /** When consensus fails but primary (Claude) has higher confidence, we use its result */
  fallbackUsed?: boolean;
  fallbackReason?: string;
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

  const ipState = rateLimitState.ipRequests.get(ip);
  if (ipState) {
    if (now < ipState.resetAt) {
      if (ipState.count >= RATE_LIMIT_PER_IP) {
        return { allowed: false, reason: `IP rate limit exceeded (${RATE_LIMIT_PER_IP}/min)` };
      }
      ipState.count++;
    } else {
      rateLimitState.ipRequests.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_SEC * 1000 });
    }
  } else {
    rateLimitState.ipRequests.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_SEC * 1000 });
  }

  const lastEval = rateLimitState.domainLastEval.get(domain);
  if (lastEval && now - lastEval < DOMAIN_COOLDOWN_SEC * 1000) {
    return { allowed: false, reason: `Domain cooldown (${DOMAIN_COOLDOWN_SEC}s)` };
  }
  rateLimitState.domainLastEval.set(domain, now);

  return { allowed: true };
}

// ============================================================================
// BRAND VARIANT GENERATION (for improved relevance matching)
// ============================================================================

type EvidencePackItem = {
  id: string;
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

/**
 * Generate brand variants for more flexible relevance matching.
 * Handles hyphen/space/concatenation variants and common suffixes.
 *
 * Examples:
 * - "my-brand" → ["my-brand", "my brand", "mybrand"]
 * - "dailynews" → ["dailynews", "daily news", "daily"]
 * - "medianet" → ["medianet", "media"]
 */
function generateBrandVariants(brand: string): string[] {
  const variants = new Set<string>();
  const b = (brand ?? "").toLowerCase().trim();
  if (!b || b.length < 3) return [];

  variants.add(b);

  // Hyphen variants: split on hyphens
  if (b.includes("-")) {
    const parts = b.split("-").filter(Boolean);
    if (parts.length >= 2) {
      variants.add(parts.join(" ")); // "anti spiegel"
      variants.add(parts.join("")); // "antispiegel"
      // Add individual parts if long enough
      for (const p of parts) {
        if (p.length >= 4) variants.add(p);
      }
    }
  }

  // CamelCase-like detection: split before uppercase letters or at transitions
  // e.g., "DailyNews" → "Daily News" → "daily news"
  const camelSplit = b.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  if (camelSplit !== b && camelSplit.includes(" ")) {
    variants.add(camelSplit);
    variants.add(camelSplit.replace(/\s+/g, ""));
  }

  // Common suffix stripping: *news, *net, *media, *times, *post
  const suffixes = ["news", "net", "media", "times", "post", "daily", "tribune", "herald"];
  for (const suffix of suffixes) {
    if (b.endsWith(suffix) && b.length > suffix.length + 2) {
      const base = b.slice(0, -suffix.length);
      if (base.length >= 3) {
        variants.add(base);
        variants.add(`${base} ${suffix}`);
      }
    }
  }

  // Filter out too-short or stopword-like variants
  const stopwords = new Set(["the", "and", "for", "www", "com", "org", "net"]);
  return [...variants].filter((v) => v.length >= 3 && !stopwords.has(v));
}

function deriveBrandToken(domain: string): string {
  const labels = String(domain || "")
    .toLowerCase()
    .split(".")
    .map((s) => s.trim())
    .filter(Boolean);
  if (labels.length === 0) return "";
  
  // Special case: known media abbreviations or short brands
  // e.g., srf.ch -> srf, bbc.co.uk -> bbc
  if (labels.length >= 2) {
    const first = labels[0];
    if (first.length >= 2 && first.length <= 4) {
      // Likely an abbreviation like SRF, BBC, NZZ, CNN
      return first;
    }
  }

  if (labels.length === 1) return labels[0];

  const registryLike = new Set(["co", "com", "net", "org", "gov", "edu", "ac"]);

  for (let i = labels.length - 2; i >= 0; i--) {
    const candidate = labels[i];
    if (registryLike.has(candidate)) continue;
    if (candidate === "www") continue;
    return candidate;
  }

  return labels[0];
}

function isUsableBrandToken(token: string): boolean {
  const t = (token ?? "").trim().toLowerCase();
  if (t.length < 2) return false; // Allow 2-char tokens for brands like AP
  if (t === "www") return false;
  return true;
}

/**
 * Check if a search result is relevant to the domain being evaluated.
 * Now uses brand variants for more flexible matching.
 */
function isRelevantSearchResult(
  r: WebSearchResult,
  domain: string,
  brandVariants: string[]
): boolean {
  const url = (r.url ?? "").toLowerCase();
  const title = (r.title ?? "").toLowerCase();
  const snippet = (r.snippet ?? "").toLowerCase();
  const blob = `${title} ${snippet} ${url}`;

  const d = String(domain || "").toLowerCase();
  if (!d) return true;

  // Direct domain mention
  if (blob.includes(d) || blob.includes(`www.${d}`)) return true;

  // URL host match
  try {
    const host = new URL(r.url).hostname.toLowerCase().replace(/^www\./, "");
    if (host === d || host.endsWith(`.${d}`)) return true;
  } catch {
    // ignore URL parse errors
  }

  // Brand variant matching (flexible)
  for (const variant of brandVariants) {
    if (variant.length >= 4 && blob.includes(variant)) return true;
  }

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

// ============================================================================
// ADAPTIVE EVIDENCE PACK BUILDING
// ============================================================================

/**
 * Build evidence pack with adaptive negative-signal queries.
 *
 * Strategy:
 * 1. Run initial queries (reliability, bias, standards)
 * 2. If results are sparse or lack strong signals, add negative-signal queries
 * 3. No domain/TLD hardcoding - applies equally to all domains
 */
async function buildEvidencePack(domain: string): Promise<EvidencePack> {
  const { enabled, providersUsed } = isSearchEnabledForSrEval();
  if (!enabled) return { enabled: false, providersUsed, queries: [], items: [] };

  const brand = deriveBrandToken(domain);
  const brandVariants = generateBrandVariants(brand);
  const brandPrefix = isUsableBrandToken(brand) ? `${brand} ` : "";
  const domainToken = `"${domain}"`;

  // Phase 1: Standard queries (Domain + Brand)
  const standardQueries = [
    `${brandPrefix}${domainToken} fact check reliability`,
    `${brandPrefix}${domainToken} media bias fact check credibility rating`,
    `${brandPrefix}${domainToken} corrections policy editorial standards`,
  ];

  // Phase 2: Entity-focused queries (Organization/Brand only)
  // This helps identify the parent organization standards
  const entityQueries = isUsableBrandToken(brand) ? [
    `${brand} organization journalistic standards`,
    `${brand} media group ownership and reliability`,
    `${brand} parent company editorial policy`,
  ] : [];

  // Phase 3: Negative-signal queries (added adaptively if needed)
  const negativeSignalQueries = [
    `${brandPrefix}${domainToken} propaganda disinformation misinformation`,
    `${brandPrefix}${domainToken} false claims debunked fake news`,
  ];

  const maxResultsPerQuery = Math.max(
    1,
    Math.min(parseInt(process.env.FH_SR_EVAL_SEARCH_MAX_RESULTS_PER_QUERY || "3", 10), 10)
  );
  const maxEvidenceItems = Math.max(
    1,
    Math.min(parseInt(process.env.FH_SR_EVAL_MAX_EVIDENCE_ITEMS || "8", 10), 20)
  );
  const dateRestrict =
    parseDateRestrictEnv(process.env.FH_SR_EVAL_SEARCH_DATE_RESTRICT) ??
    parseDateRestrictEnv(process.env.FH_SEARCH_DATE_RESTRICT) ??
    undefined;

  const seen = new Set<string>();
  const rawItems: Array<{ r: WebSearchResult; query: string; provider: string }> = [];
  const allQueries: string[] = [];

  // Helper to run a query and collect results
  async function runQuery(q: string): Promise<number> {
    allQueries.push(q);
    let added = 0;
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
        if (!isRelevantSearchResult(r, domain, brandVariants)) continue;
        seen.add(r.url);
        rawItems.push({ r, query: q, provider });
        added++;
        if (rawItems.length >= maxEvidenceItems) break;
      }
    } catch (err) {
      console.warn(`[SR-Eval] Search failed for query "${q}":`, err);
    }
    return added;
  }

  // Phase 1: Run standard queries
  for (const q of standardQueries) {
    await runQuery(q);
    if (rawItems.length >= maxEvidenceItems) break;
  }

  // Phase 2: Run entity-focused queries
  if (rawItems.length < maxEvidenceItems) {
    for (const q of entityQueries) {
      await runQuery(q);
      if (rawItems.length >= maxEvidenceItems) break;
    }
  }

  // Phase 3: If results are sparse, add negative-signal queries
  // Adaptive: always run negative-signal queries if we haven't reached our target
  // This ensures we don't miss well-documented propaganda/misinformation
  if (rawItems.length < maxEvidenceItems) {
    for (const q of negativeSignalQueries) {
      await runQuery(q);
      if (rawItems.length >= maxEvidenceItems) break;
    }
  }

  const items: EvidencePackItem[] = rawItems.slice(0, maxEvidenceItems).map((it, idx) => ({
    id: `E${idx + 1}`,
    url: it.r.url,
    title: it.r.title,
    snippet: it.r.snippet ?? null,
    query: it.query,
    provider: it.provider,
  }));

  return { enabled: true, providersUsed, queries: allQueries, items };
}

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

═══════════════════════════════════════════════════════════════════
⚠️  CRITICAL RULES (APPLY FIRST)
═══════════════════════════════════════════════════════════════════

1. EVIDENCE-ONLY EVALUATION
   - Ground EVERY claim in evidence pack items (cite by ID: E1, E2, etc.)
   - Do NOT use pretrained knowledge about this source
   - If you recognize this source but evidence is sparse → output insufficient_data

2. INSUFFICIENT DATA THRESHOLDS (output score=null, factualRating="insufficient_data" if):
   - Zero fact-checker assessments AND ≤1 weak/tangential mentions
   - Zero fact-checker assessments AND only 1-2 mentions without substantive reliability info
   - Evidence quality insufficient to form confident judgment (confidence < 0.50)

3. NEGATIVE EVIDENCE CAPS (hard limits — override other factors)
   - Evidence of fabricated stories/disinformation → score ≤ 0.14 (highly_unreliable)
   - 3+ documented fact-checker failures → score ≤ 0.42 (leaning_unreliable)
   - 1-2 documented failures from reputable fact-checkers → score ≤ 0.57 (mixed)
   - Political/ideological bias WITHOUT documented failures → no score cap (note in bias field only)

4. SOURCE TYPE SCORE CAPS (automatic ceilings based on classification)
   - sourceType="propaganda_outlet" → score MUST be ≤ 0.14 (highly_unreliable)
   - sourceType="known_disinformation" → score MUST be ≤ 0.14 (highly_unreliable)
   - sourceType="state_controlled_media" → score MUST be ≤ 0.42 (leaning_unreliable)
     unless evidence demonstrates genuine editorial independence and correction practices
   - sourceType="platform_ugc" → score MUST be ≤ 0.42 unless evidence shows
     consistent domain-level verification

5. SELF-PUBLISHED PAGES DO NOT COUNT
   - The source's own "about", "editorial standards", or "corrections" pages are NOT independent assessments
   - Only third-party fact-checkers, journalism reviews, or independent analyses count as evidence

6. ENTITY-LEVEL EVALUATION (ORGANIZATION VS DOMAIN)
   - If the domain is the primary outlet for a larger organization (e.g., a TV channel, newspaper, or media group), you MUST evaluate the reliability of the WHOLE ORGANIZATION.
   - Legacy media and public broadcasters (e.g., BBC, NPR, SRF) with established journalistic standards should be rated based on their organizational reputation.
   - High-quality public broadcasters with independent editorial oversight typically score in the 0.80–0.85 (reliable) range.
   - Identify the organization name in the "identifiedEntity" field.

─────────────────────────────────────────────────────────────────────
RATING SCALE (score → factualRating — MUST match exactly)
─────────────────────────────────────────────────────────────────────
  0.86–1.00 → highly_reliable     (exemplary standards, global gold standard, rare errors)
  0.72–0.85 → reliable            (professional standards, legacy media, public broadcasters)
  0.58–0.71 → leaning_reliable    (generally accurate, some concerns noted)
  0.43–0.57 → mixed               (inconsistent accuracy, notable failures alongside successes)
  0.29–0.42 → leaning_unreliable  (recurring accuracy issues, some misleading content)
  0.15–0.28 → unreliable          (systematic accuracy problems, poor editorial standards)
  0.00–0.14 → highly_unreliable   (disinformation, propaganda, fabrication)
  null      → insufficient_data   (cannot evaluate — sparse/no evidence)

─────────────────────────────────────────────────────────────────────
CONFIDENCE CALCULATION (mechanistic formula)
─────────────────────────────────────────────────────────────────────
Calculate confidence score using this formula:

Base: 0.40

ADD:
  +0.15 per independent fact-checker assessment (max +0.45 for 3+)
  +0.10 if most evidence is within last 12 months
  +0.10 if evidence shows consistent pattern (3+ sources agree)
  +0.05 per additional corroborating source beyond first (max +0.15)

SUBTRACT:
  -0.15 if evidence is contradictory/mixed signals
  -0.10 if evidence is mostly >2 years old

Final confidence: clamp result to [0.0, 1.0]

THRESHOLD: If calculated confidence < 0.50, strongly consider outputting 
score=null and factualRating="insufficient_data"

─────────────────────────────────────────────────────────────────────
SOURCE TYPE CLASSIFICATION (USE STRICT CRITERIA - prefer LESS SEVERE)
─────────────────────────────────────────────────────────────────────
⚠️ CRITICAL: Use the LEAST severe classification that fits the evidence.
   Political bias alone does NOT make a source propaganda or disinformation.

- editorial_publisher: Independent newsroom with editorial standards.
  USE THIS for mainstream news outlets with editorial processes, even if biased.
  
- wire_service: News agency providing content to other outlets

- government: Official government communication (not journalism)

- state_media: Government-FUNDED but editorially INDEPENDENT (like BBC, NPR, SRF).
  Key test: Does it criticize its own government? If yes → state_media, not state_controlled.
  
- state_controlled_media: Government DIRECTLY CONTROLS editorial decisions (cap: ≤0.42)
  STRICT: Requires evidence of editorial control, not just government funding.
  If evidence is ambiguous → use state_media instead.
  
- platform_ugc: User-generated content platforms (cap: ≤0.42)

- advocacy: Organization promoting specific cause/viewpoint.
  USE THIS for outlets with strong political slant but legitimate editorial operations.
  
- aggregator: Republishes content from other sources

- propaganda_outlet: PRIMARY PURPOSE is coordinated influence operations (cap: ≤0.14)
  STRICT CRITERIA — ALL must apply:
  (1) Evidence of coordinated messaging aligned with state/political actor
  (2) Primary purpose is influence, not news reporting
  (3) Multiple independent assessors identify it as propaganda
  DO NOT USE for: mainstream outlets with political bias, advocacy journalism
  
- known_disinformation: DOCUMENTED source of FABRICATED content (cap: ≤0.14)
  STRICT CRITERIA — requires:
  (1) Multiple fact-checkers document FABRICATED (invented) content
  (2) Pattern of intentional falsehoods, not just errors or bias
  DO NOT USE for: outlets with failed fact-checks but real journalistic operation
  
- unknown: Cannot determine from evidence

─────────────────────────────────────────────────────────────────────
EVIDENCE QUALITY HIERARCHY
─────────────────────────────────────────────────────────────────────
HIGH WEIGHT (can establish verdict alone):
  - Explicit fact-checker assessments (independent fact-check organizations)
  - Documented corrections/retractions tracked by third parties
  - Journalism reviews from reputable organizations

MEDIUM WEIGHT (support but don't establish alone):
  - Newsroom analyses of editorial standards
  - Academic studies on source reliability
  - Awards/recognition from journalism organizations

LOW WEIGHT (context only, cannot trigger caps):
  - Single blog posts or forum discussions
  - Passing mentions without substantive analysis
  - Generic references without reliability details
  - Self-published claims (source's own website)

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
FEW-SHOT EXAMPLES (Follow these patterns — abstract domains only)
─────────────────────────────────────────────────────────────────────

**Example 1: Reliable Wire Service**
Input: "example-wire-service.com"
Evidence: [E1] Independent assessor A: High factual accuracy rating. [E2] Independent assessor B: Strong editorial standards documented.
Output:
{
  "sourceType": "wire_service",
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

**Example 5: Insufficient Data**
Input: "unknown-local-outlet.example"
Evidence: [E1] Mention in a directory listing.
Output:
{
  "sourceType": "unknown",
  "evidenceQuality": { "independentAssessmentsCount": 0, "recencyWindowUsed": "unknown", "notes": "No independent assessments or detailed information available." },
  "score": null,
  "confidence": 0.20,
  "factualRating": "insufficient_data",
  "bias": { "politicalBias": "not_applicable", "otherBias": null },
  "reasoning": "There is insufficient evidence to form a reliable assessment. No fact-checker data found. Confidence below threshold.",
  "evidenceCited": [],
  "caveats": ["No fact-checker data found", "Source is not widely indexed", "Confidence 20% below 50% threshold"]
}

─────────────────────────────────────────────────────────────────────
FINAL VALIDATION (check before responding)
─────────────────────────────────────────────────────────────────────
□ Score falls within correct range for factualRating
□ Every claim in evidenceCited references an evidence ID (E1, E2, etc.)
□ Applied evidence-only rule (no pretrained knowledge used)
□ Applied SOURCE TYPE CAPS if sourceType is propaganda_outlet/known_disinformation/state_controlled_media/platform_ugc
□ Applied negative evidence caps if applicable
□ If confidence < 0.50 or zero fact-checkers + weak mentions → considered insufficient_data
□ Recency weighting applied (discounted old evidence appropriately)
□ Political bias noted but did NOT reduce score unless paired with documented failures
□ Self-published pages were NOT counted as independent assessments
□ Follow the schema above exactly
□ Return only valid JSON (no markdown, no extra commentary)
`;
}

// ============================================================================
// POST-PROCESSING & VALIDATION
// ============================================================================

/**
 * Count unique evidence IDs referenced in the evaluation.
 */
function countUniqueEvidenceIds(result: EvaluationResult, evidencePack: EvidencePack): number {
  const cited = result.evidenceCited ?? [];
  if (cited.length === 0) return 0;

  const ids = new Set(evidencePack.items.map((i) => i.id));
  const uniqueRefs = new Set<string>();

  for (const item of cited) {
    const basis = item.basis || "";
    const matches = basis.match(/\bE\d+\b/g) ?? [];
    for (const m of matches) {
      if (ids.has(m)) {
        uniqueRefs.add(m);
      }
    }
  }

  return uniqueRefs.size;
}

/**
 * Compute foundedness score based on evidence grounding.
 */
function computeFoundednessScore(result: EvaluationResult, evidencePack: EvidencePack): number {
  const cited = result.evidenceCited ?? [];
  if (cited.length === 0) return 0;

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

    return totalRefs * 2 + uniqueRefs.size * 1 + recencyCount * 0.25 + independentBonus;
  }

  const recencyCount = cited.filter((c) => (c.recency ?? "").trim().length > 0).length;
  return cited.length + recencyCount * 0.25;
}

/**
 * Apply deterministic post-processing to enforce consistency and caps.
 *
 * 1. Enforce source type caps
 * 2. Align factualRating with score
 * 3. Add caveats when caps are applied
 */
function applyPostProcessing(result: EvaluationResult, evidencePack: EvidencePack): EvaluationResult {
  // Make a mutable copy
  const processed = { ...result, caveats: [...(result.caveats ?? [])] };

  // Skip if score is null (insufficient_data)
  if (processed.score === null) {
    processed.factualRating = "insufficient_data";
    return processed;
  }

  // 1. Enforce source type caps
  const sourceType = processed.sourceType ?? "";
  const cap = SOURCE_TYPE_CAPS[sourceType];
  
  if (cap !== undefined && processed.score > cap) {
    console.log(`[SR-Eval] Enforcing ${sourceType} cap: ${processed.score.toFixed(2)} → ${cap.toFixed(2)}`);
    processed.caveats.push(
      `Score capped from ${(processed.score * 100).toFixed(0)}% to ${(cap * 100).toFixed(0)}% due to sourceType="${sourceType}" classification.`
    );
    processed.score = cap;
  }

  // 2. Align factualRating with (potentially capped) score
  const expectedRating = scoreToFactualRating(processed.score);
  if (processed.factualRating !== expectedRating) {
    console.log(`[SR-Eval] Aligning factualRating: ${processed.factualRating} → ${expectedRating}`);
    processed.factualRating = expectedRating;
  }

  // 3. Check grounding for high scores (asymmetric skepticism)
  const foundedness = computeFoundednessScore(processed, evidencePack);
  const uniqueEvidence = countUniqueEvidenceIds(processed, evidencePack);

  if (processed.score >= 0.72 && foundedness < MIN_FOUNDEDNESS_FOR_HIGH_SCORES) {
    // High score with weak grounding - add caveat
    processed.caveats.push(
      `High reliability score (${(processed.score * 100).toFixed(0)}%) with limited evidence grounding (foundedness: ${foundedness.toFixed(1)}).`
    );
  }

  if (processed.score !== null && uniqueEvidence < MIN_EVIDENCE_IDS_FOR_SCORE) {
    // Score without minimum evidence citations
    processed.caveats.push(
      `Score issued with only ${uniqueEvidence} unique evidence citations.`
    );
  }

  return processed;
}

// ============================================================================
// MODEL EVALUATION
// ============================================================================

interface EvaluationError {
  reason:
    | "primary_model_failed"
    | "no_consensus"
    | "evaluation_error"
    | "grounding_failed";
  details: string;
  primaryScore?: number | null;
  primaryConfidence?: number;
  secondaryScore?: number | null;
  secondaryConfidence?: number;
}

function extractBiasIndicator(bias?: EvaluationResult["bias"]): string | null {
  if (!bias) return null;
  const spectrum = bias.politicalBias;
  if (spectrum === "not_applicable") return null;
  return spectrum.replace(/_/g, "-");
}

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

async function evaluateWithModel(
  domain: string,
  modelProvider: "anthropic" | "openai",
  evidencePack: EvidencePack
): Promise<{ result: EvaluationResult; modelName: string } | null> {
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
    : "gpt-5-mini"; // Upgraded from gpt-4o-mini for better classification accuracy

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
          content: `You are a media reliability analyst using EVIDENCE-ONLY methodology. CRITICAL RULES:
(1) Evaluate sources based solely on PROVIDED EVIDENCE - cite evidence pack items (E1, E2, etc.) for every claim.
(2) Apply SOURCE TYPE CAPS: propaganda_outlet/known_disinformation → ≤14%, state_controlled_media/platform_ugc → ≤42%.
(3) Apply negative evidence caps: fabrication/disinformation → ≤14%, 3+ failures → ≤42%, 1-2 failures → ≤57%.
(4) Never use pretrained knowledge about sources.
(5) Self-published pages (source's own website) do NOT count as independent assessments.
(6) Default to insufficient_data when evidence is sparse (confidence < 0.50).
(7) Separate political bias from accuracy - bias alone does not reduce score.
Always respond with valid JSON only.`
        },
        { role: "user", content: prompt },
      ],
      temperature,
    });

    const text = response.text?.trim() || "";
    if (!text) {
      console.error(`[SR-Eval] ${modelProvider.toUpperCase()} FAILED: Empty response`);
      return null;
    }

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

    let result = EvaluationResultSchema.parse(parsed);

    // Apply post-processing (caps, alignment)
    result = applyPostProcessing(result, evidencePack);

    const scoreStr = result.score !== null ? result.score.toFixed(2) : "null";
    console.log(`[SR-Eval] ${modelProvider.toUpperCase()} SUCCESS: score=${scoreStr}, confidence=${result.confidence.toFixed(2)}, rating=${result.factualRating}, type=${result.sourceType || "unknown"}`);
    return { result, modelName };
  } catch (err: any) {
    const errorMessage = err?.message || String(err);
    const errorCode = err?.code || err?.status || "unknown";

    console.error(`[SR-Eval] ${modelProvider.toUpperCase()} FAILED for ${domain}:`);
    console.error(`  - Error code: ${errorCode}`);
    console.error(`  - Message: ${errorMessage}`);

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

// ============================================================================
// CONSENSUS EVALUATION
// ============================================================================

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

  // Single-model mode: Skip secondary evaluation if multiModel is disabled
  if (!multiModel) {
    console.log(`[SR-Eval] Single-model mode: Using primary only for ${domain}`);
    return {
      success: true,
      data: buildResponsePayload(
        primary.result,
        primary.modelName,
        null,
        true, // consensusAchieved = true in single-model mode (no disagreement possible)
        evidencePack
        // No score/confidence override - use full primary confidence
      ),
    };
  }

  // Multi-model: Secondary evaluation (OpenAI GPT-5 mini)
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
        primary.result.confidence * 0.8 // Reduced confidence when secondary fails in multi-model mode
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

  // ============================================================================
  // SOURCE TYPE DISAGREEMENT HANDLING
  // When models disagree on sourceType, prefer the LESS SEVERE classification
  // This prevents over-aggressive secondary model from triggering caps
  // ============================================================================
  const severeTypes = new Set(["propaganda_outlet", "known_disinformation", "state_controlled_media"]);
  const primaryType = primary.result.sourceType ?? "";
  const secondaryType = secondary.result.sourceType ?? "";
  
  let adjustedSecondary = secondary;
  if (severeTypes.has(secondaryType) && !severeTypes.has(primaryType)) {
    // Secondary is more severe - adjust it
    console.log(`[SR-Eval] SourceType disagreement: primary="${primaryType}" vs secondary="${secondaryType}"`);
    
    // Create adjusted copy with less severe classification
    const adjustedResult = {
      ...secondary.result,
      sourceType: primaryType,
      caveats: [
        ...(secondary.result.caveats ?? []),
        `SourceType adjusted from "${secondaryType}" to "${primaryType}" due to model disagreement.`
      ]
    };
    
    // If score was capped due to severe type, adjust score
    // TODO: Review this heuristic - currently uses min(primary, 0.57) which may be too aggressive
    if (secondary.result.score !== null && SOURCE_TYPE_CAPS[secondaryType] !== undefined) {
      const capApplied = secondary.result.score <= SOURCE_TYPE_CAPS[secondaryType];
      if (capApplied) {
        // Use average biased toward primary since secondary was over-aggressive
        adjustedResult.score = Math.min(primary.result.score, 0.57);
        console.log(`[SR-Eval] Adjusted secondary score from ${secondary.result.score?.toFixed(2)} to ${adjustedResult.score.toFixed(2)}`);
      }
    }
    
    adjustedSecondary = { result: adjustedResult, modelName: secondary.modelName };
  }

  // Check consensus (both scores are non-null at this point)
  const scoreDiff = Math.abs(primary.result.score - (adjustedSecondary.result.score ?? 0));
  const consensusAchieved = scoreDiff <= consensusThreshold;

  if (!consensusAchieved) {
    console.log(
      `[SR-Eval] No consensus for ${domain}: ${primary.result.score.toFixed(2)} vs ${adjustedSecondary.result.score?.toFixed(2)} (diff: ${scoreDiff.toFixed(2)} > ${consensusThreshold})`
    );
    
    // FALLBACK LOGIC: When consensus fails, trust Claude if it has higher confidence
    const primaryConf = primary.result.confidence;
    const secondaryConf = adjustedSecondary.result.confidence;
    
    if (primaryConf >= secondaryConf) {
      // Claude has higher or equal confidence - use its result with fallback flag
      const fallbackReason = `Models disagreed (${(scoreDiff * 100).toFixed(0)}% diff). Using Claude result (${(primaryConf * 100).toFixed(0)}% confidence vs GPT-5 mini ${(secondaryConf * 100).toFixed(0)}%).`;
      
      console.log(`[SR-Eval] Fallback to Claude for ${domain}: ${fallbackReason}`);
      
      // Build response with fallback indicators
      const payload = buildResponsePayload(
        primary.result,
        primary.modelName,
        adjustedSecondary.modelName,
        false, // consensusAchieved = false
        evidencePack,
        primary.result.score,
        primary.result.confidence // No confidence reduction
      );
      payload.fallbackUsed = true;
      payload.fallbackReason = fallbackReason;
      payload.identifiedEntity = primary.result.identifiedEntity;
      payload.caveats = [
        ...(payload.caveats ?? []),
        `⚠️ Fallback: ${fallbackReason}`
      ];
      
      return {
        success: true,
        data: payload,
      };
    }
    
    // Secondary has higher confidence - use GPT-5 mini (the more confident model)
    const fallbackReason = `Models disagreed (${(scoreDiff * 100).toFixed(0)}% diff). Using GPT-5 mini (${(secondaryConf * 100).toFixed(0)}% confidence vs Claude ${(primaryConf * 100).toFixed(0)}%).`;
    
    console.log(`[SR-Eval] Fallback to GPT-5 mini for ${domain}: ${fallbackReason}`);
    
    // Build response with fallback indicators - use secondary (more confident) model's result
    const payload = buildResponsePayload(
      adjustedSecondary.result,
      primary.modelName,
      adjustedSecondary.modelName,
      false, // consensusAchieved = false
      evidencePack,
      adjustedSecondary.result.score,
      secondaryConf // No confidence reduction
    );
    payload.fallbackUsed = true;
    payload.fallbackReason = fallbackReason;
    payload.identifiedEntity = adjustedSecondary.result.identifiedEntity;
    payload.caveats = [
      ...(payload.caveats ?? []),
      `⚠️ Fallback: ${fallbackReason}`
    ];
    
    return {
      success: true,
      data: payload,
    };
  }

  // Consensus achieved - choose the "better founded" score
  // Tie-breaker: choose the lower score (skeptical default)
  const primaryFounded = computeFoundednessScore(primary.result, evidencePack);
  const secondaryFounded = computeFoundednessScore(adjustedSecondary.result, evidencePack);

  let winner = secondaryFounded > primaryFounded ? adjustedSecondary : primary;
  if (secondaryFounded === primaryFounded) {
    const adjScore = adjustedSecondary.result.score ?? 0;
    // Tie-breaker: for positive scores, average; for negative/borderline, prefer lower
    if (primary.result.score >= 0.58 && adjScore >= 0.58) {
      winner = primary; // Will use average below
    } else {
      winner = primary.result.score <= adjScore ? primary : adjustedSecondary;
    }
  }

  const adjScore2 = adjustedSecondary.result.score ?? 0;
  const finalScore =
    primaryFounded === secondaryFounded &&
    primary.result.score >= 0.58 &&
    adjScore2 >= 0.58
      ? (primary.result.score + adjScore2) / 2
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

  const baseConfidence = (primary.result.confidence + adjustedSecondary.result.confidence) / 2;
  
  // ============================================================================
  // CONSENSUS CONFIDENCE BOOST
  // If models agree (consensus achieved), boost the final confidence.
  // Agreement between two independent models is a strong signal of reliability.
  // ============================================================================
  const finalConfidence = consensusAchieved 
    ? Math.min(0.95, baseConfidence + 0.15) // +15% boost for agreement
    : baseConfidence;

  // Align final rating with potentially averaged score
  const finalRating = scoreToFactualRating(finalScore);

  // ============================================================================
  // FINAL CONFIDENCE CHECK (Moved here from early exit)
  // Check if the final result meets the asymmetric confidence requirement.
  // ============================================================================
  const meetsConfReq = meetsConfidenceRequirement(finalRating, finalConfidence);
  
  if (!meetsConfReq) {
    console.log(`[SR-Eval] Final confidence ${finalConfidence.toFixed(2)} too low for rating "${finalRating}" for ${domain}`);
    
    // Build response but with null score (insufficient data)
    const payload = buildResponsePayload(
      winner.result,
      primary.modelName,
      adjustedSecondary.modelName,
      consensusAchieved,
      evidencePack,
      null, // Force null score due to low confidence
      finalConfidence
    );
    payload.category = "insufficient_data";
    payload.identifiedEntity = winner.result.identifiedEntity;
    payload.caveats = [
      ...(payload.caveats ?? []),
      `Confidence ${(finalConfidence * 100).toFixed(0)}% insufficient for "${finalRating}" rating; returning insufficient_data.`
    ];
    
    return {
      success: true,
      data: payload,
    };
  }

  // Legacy confidence threshold check (backward compatibility)
  if (finalConfidence < confidenceThreshold) {
    console.log(`[SR-Eval] Final confidence too low for ${domain}: ${finalConfidence} < ${confidenceThreshold}`);
    return {
      success: true,
      data: {
        score: null,
        confidence: finalConfidence,
        modelPrimary: primary.modelName,
        modelSecondary: adjustedSecondary.modelName,
        consensusAchieved: consensusAchieved,
        reasoning: winner.result.reasoning,
        category: "insufficient_data",
        identifiedEntity: winner.result.identifiedEntity,
        evidencePack: {
          providersUsed: evidencePack.providersUsed,
          queries: evidencePack.queries,
          items: evidencePack.items,
        },
        biasIndicator: extractBiasIndicator(winner.result.bias),
        bias: winner.result.bias,
        evidenceCited: winner.result.evidenceCited,
        caveats: [
          ...(winner.result.caveats ?? []),
          `Low confidence ${(finalConfidence * 100).toFixed(0)}% is below threshold ${(confidenceThreshold * 100).toFixed(0)}%; returning insufficient_data (score=null).`,
        ],
      },
    };
  }

  console.log(
    `[SR-Eval] Consensus for ${domain}: score=${finalScore.toFixed(2)}, conf=${finalConfidence.toFixed(2)}, foundedness=${primaryFounded.toFixed(2)} vs ${secondaryFounded.toFixed(2)}`
  );

  // Build payload with potentially overridden score and aligned rating
  const payload = buildResponsePayload(
    winner.result,
    primary.modelName,
    adjustedSecondary.modelName,
    true,
    evidencePack,
    finalScore,
    finalConfidence
  );
  payload.category = finalRating; // Ensure rating matches final score
  payload.identifiedEntity = winner.result.identifiedEntity; // Track the organization evaluated

  return {
    success: true,
    data: payload,
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
