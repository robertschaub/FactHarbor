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

const EvaluationResultSchema = z.object({
  domain: z.string().optional(),
  evaluationDate: z.string().optional(),
  score: z.number().min(0).max(1).nullable(),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  factualRating: z.enum([
    "highly_reliable",            // 0.86-1.00 - Highest standards, verified, proactively corrects
    "reliable",                   // 0.72-0.85 - Professional standards, accurate, corrects promptly
    "generally_reliable",         // 0.58-0.71 - Decent standards, often accurate, corrects when notified
    "mixed",                      // 0.43-0.57 - Known source with variable/inconsistent track record
    "generally_unreliable",       // 0.29-0.42 - Lax standards, often inaccurate, slow to correct
    "unreliable",                 // 0.15-0.28 - Poor standards, inaccurate, seldom corrects
    "highly_unreliable",          // 0.00-0.14 - Lowest standards, fabricates, resists correction
    "insufficient_data",          // null score - Unknown source, no assessments exist
  ]),
  // Dimension scores for multi-criteria evaluation
  dimensionScores: z.object({
    factualAccuracy: z.number().min(0).max(30),       // 0-30 points
    opinionFactSeparation: z.number().min(0).max(25), // 0-25 points
    sourceAttribution: z.number().min(0).max(20),     // 0-20 points
    correctionPractices: z.number().min(0).max(15),   // 0-15 points
    biasPenalty: z.number().min(-10).max(0),          // -10 to 0 points
  }).optional(),
  biasIndicator: z.enum([
    "left", "center-left", "center", "center-right", "right"
  ]).optional(),
  bias: z.object({
    politicalBias: z.enum([
      "far_left", "left", "center_left", "center",
      "center_right", "right", "far_right", "not_applicable"
    ]),
    otherBias: z.enum([
      "pro_government", "anti_government", "corporate_interest",
      "ideological_other", "sensationalist", "none_detected"
    ]).nullable().optional(),
  }).optional(),
  evidenceCited: z.array(z.object({
    claim: z.string(),
    basis: z.string(),
    recency: z.string().optional(),
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

/**
 * Generate LLM evaluation prompt for source reliability assessment.
 * @param domain - The domain to evaluate
 * @param hasWebSearch - Whether the model has web search capability
 * 
 * PROMPT DESIGN NOTES:
 * 
 * 1. PERSONA: "As a professional fact-checker"
 *    - Establishes expert role to encourage rigorous, evidence-based evaluation
 *    - Reduces tendency to give benefit of the doubt without evidence
 * 
 * 2. SKEPTICAL DEFAULT: "Reliability is earned; lack of positive evidence degrades score"
 *    - Prevents score inflation for sources with no documented track record
 *    - Unknown ≠ neutral; absence of positive evidence should pull toward lower bands
 *    - Contrast with insufficient_data (null) which is for truly unknown sources
 * 
 * 3. CONFIDENCE MECHANISM: "Low confidence (<0.5) pulls score toward 0.5"
 *    - When LLM is uncertain about its assessment, the effective weight is reduced
 *    - Formula: effectiveWeight = 0.5 + (score - 0.5) × confidence
 *    - High confidence → score preserved; low confidence → pulled to neutral
 * 
 * 4. BIAS TREATMENT: "Bias alone is noted. Combined with other issues, it degrades further"
 *    - Bias without accuracy issues: noted but doesn't automatically lower score
 *    - Bias + inaccuracies: compounds the reliability penalty
 *    - Prevents penalizing sources solely for having a perspective
 */
function getEvaluationPrompt(domain: string, hasWebSearch: boolean = false): string {
  const currentDate = new Date().toISOString().split("T")[0];

  const webSearchLine = hasWebSearch
    ? `
SEARCH: Query "${domain} fact check", "${domain} bias rating", "${domain} credibility".
CONSULT: IFCN members, Media Bias/Fact Check, Ad Fontes Media, Wikipedia controversies section.
`
    : "";

  return `As a professional fact-checker, evaluate factual reliability of: ${domain}
Date: ${currentDate}
${webSearchLine}

RATING SCALE (symmetric around 0.5)
- 0.86-1.00: highly_reliable (Highest standards, verified, proactively corrects)
- 0.72-0.85: reliable (Professional standards, accurate, corrects promptly)
- 0.58-0.71: generally_reliable (Decent standards, often accurate, corrects when notified)
- 0.43-0.57: mixed (Known source with variable/inconsistent track record)
- 0.29-0.42: generally_unreliable (Lax standards, often inaccurate, slow to correct)
- 0.15-0.28: unreliable (Poor standards, inaccurate, seldom corrects)
- 0.00-0.14: highly_unreliable (Lowest standards, fabricates, resists correction)
- null: insufficient_data (Unknown source, no assessments exist)

CALIBRATION
- Be skeptical. Reliability is earned; lack of positive evidence degrades score.
- Match bands by overall pattern, not all criteria required.
- Low confidence (<0.5) pulls score toward 0.5

PRIORITIES
- RECENCY: Findings from the last 24 months carry the most weight.
- VERIFICATION: Results from established fact-checkers are the strongest signal.
- PROMINENCE: Misinformation in prominent content significantly impacts source score.
- BIAS IMPACT: Bias alone is noted. Combined with other issues, it degrades score further.

CONFIDENCE: How much evidence supports your assessment (0.0-1.0).

BIAS
- politicalBias: far_left | left | center_left | center | center_right | right | far_right | not_applicable
- otherBias: pro_government | anti_government | corporate_interest | sensationalist | ideological_other | none_detected

OUTPUT (JSON only)
{
  "domain": "${domain}",
  "evaluationDate": "${currentDate}",
  "score": <0.0-1.0 | null>,
  "confidence": <0.0-1.0>,
  "factualRating": "<rating_label>",
  "bias": {"politicalBias": "<value>", "otherBias": "<value|null>"},
  "reasoning": "<2-3 sentence justification>",
  "evidenceCited": [{"claim": "<assertion>", "basis": "<source>", "recency": "<period>"}],
  "caveats": ["<limitations>"]
}

EXAMPLE
{"domain":"example-news.com","evaluationDate":"${currentDate}","score":0.35,"confidence":0.72,"factualRating":"generally_unreliable","bias":{"politicalBias":"right","otherBias":"sensationalist"},"reasoning":"Multiple fact-checkers documented false claims. 2023 defamation settlement revealed internal awareness claims lacked evidence.","evidenceCited":[{"claim":"False election claims in prime-time","basis":"PolitiFact, FactCheck.org","recency":"2022-2023"},{"claim":"Defamation settlement","basis":"Court records","recency":"2023"}],"caveats":["News division may differ from opinion programming"]}`;
}

async function evaluateWithModel(
  domain: string,
  modelProvider: "anthropic" | "openai"
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

  const prompt = getEvaluationPrompt(domain);
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
        { role: "system", content: "You are a media reliability analyst. Evaluate sources based on EVIDENCE: Are claims supported or contradicted by documented evidence? What do fact-checkers find? Sources with claims contradicted by evidence are UNRELIABLE. Always respond with valid JSON only." },
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

interface EvaluationError {
  reason:
    | "primary_model_failed"
    | "confidence_too_low"
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
  // Primary evaluation (Anthropic Claude)
  const primary = await evaluateWithModel(domain, "anthropic");
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
      data: buildResponsePayload(primary.result, primary.modelName, null, true),
    };
  }

  // Check confidence threshold
  if (primary.result.confidence < confidenceThreshold) {
    console.log(`[SR-Eval] Confidence too low for ${domain}: ${primary.result.confidence} < ${confidenceThreshold}`);
    return {
      success: false,
      error: {
        reason: "confidence_too_low",
        details: `LLM confidence ${(primary.result.confidence * 100).toFixed(0)}% is below threshold ${(confidenceThreshold * 100).toFixed(0)}%. Source may be unknown or insufficient information available.`,
        primaryScore: primary.result.score,
        primaryConfidence: primary.result.confidence,
      },
    };
  }

  // Single model mode
  if (!multiModel) {
    return {
      success: true,
      data: buildResponsePayload(primary.result, primary.modelName, null, true),
    };
  }

  // Multi-model: Secondary evaluation (OpenAI GPT-4)
  const secondary = await evaluateWithModel(domain, "openai");
  if (!secondary) {
    console.log(`[SR-Eval] Secondary evaluation failed for ${domain}, using primary only`);
    return {
      success: true,
      data: buildResponsePayload(
        primary.result,
        primary.modelName,
        null,
        false,
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

  // Consensus achieved - average the scores
  const avgScore = (primary.result.score + secondary.result.score) / 2;
  const avgConfidence = (primary.result.confidence + secondary.result.confidence) / 2;

  console.log(
    `[SR-Eval] Consensus for ${domain}: score=${avgScore.toFixed(2)}, conf=${avgConfidence.toFixed(2)}`
  );

  return {
    success: true,
    data: buildResponsePayload(
      primary.result,
      primary.modelName,
      secondary.modelName,
      true,
      avgScore,
      avgConfidence
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
