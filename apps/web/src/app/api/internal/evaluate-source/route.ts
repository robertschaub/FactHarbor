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
  score: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
  factualRating: z.enum([
    "established_authority",      // 0.86-1.00
    "high_credibility",           // 0.72-0.86
    "generally_credible",         // 0.58-0.72
    "mixed_track_record",         // 0.43-0.57 (neutral center)
    "questionable_credibility",   // 0.29-0.43
    "low_credibility",            // 0.15-0.29
    "known_disinformation",       // 0.00-0.15
  ]),
  biasIndicator: z.enum(["left", "center-left", "center", "center-right", "right"]).nullable().optional(),
  evidenceCited: z.array(z.string()).optional(),
});

type EvaluationResult = z.infer<typeof EvaluationResultSchema>;

interface ResponsePayload {
  score: number;
  confidence: number;
  modelPrimary: string;
  modelSecondary: string | null;
  consensusAchieved: boolean;
  reasoning: string;
  category: string;
  biasIndicator: string | null | undefined;
  evidenceCited: string[] | undefined;
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

// Generate prompt with current date for temporal awareness
function getEvaluationPrompt(domain: string): string {
  const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  
  return `You are a media reliability analyst evaluating source credibility.

CURRENT DATE: ${currentDate}
SOURCE: ${domain}

TASK: Rate the FACTUAL RELIABILITY of this source. Focus on:
- Does it publish FACTS with evidence, or BASELESS CLAIMS?
- Does it clearly separate OPINION from NEWS?
- Does it have a pattern of TRUTH or FALSEHOODS?

═══════════════════════════════════════════════════════════════
EVALUATION CRITERIA (Score each dimension, then sum for total)
═══════════════════════════════════════════════════════════════

A. FACTUAL ACCURACY (0-30 points)
   30: Excellent - Rigorous fact-checking, rarely wrong, third-party verification
   20: Good - Generally accurate, occasional minor errors corrected
   10: Poor - Frequent errors, unverified claims, selective facts
   0: Failing - Pattern of publishing falsehoods or fabrications

B. OPINION/FACT SEPARATION (0-25 points)
   25: Excellent - Clear labels, distinct sections, transparent editorial stance
   15: Adequate - Some blurring but news vs opinion mostly distinguishable
   5: Poor - Opinions routinely presented as news, editorializing in reporting
   0: Failing - Propaganda disguised as journalism, no separation

C. SOURCE ATTRIBUTION (0-20 points)
   20: Excellent - Primary sources cited, documents linked, named experts
   12: Good - Generally sourced, some anonymous but justified
   5: Poor - Vague attribution ("sources say"), unverifiable claims
   0: Failing - Baseless claims presented as fact, no sourcing

D. CORRECTION PRACTICES (0-15 points)
   15: Excellent - Prompt corrections, transparent policy, accountable
   10: Good - Corrects errors but not always prominently
   5: Poor - Rarely corrects, defensive when challenged
   0: Failing - Doubles down on falsehoods, no accountability

E. BIAS PENALTY (subtract from total)
   -20: Extreme bias - Propaganda-level, completely one-sided, narrative over facts
   -12: Strong bias - Consistently slanted coverage, omits inconvenient facts
   -5: Moderate bias - Noticeable partisan lean but still reports facts
   0: Minimal bias - Balanced coverage or neutral presentation

═══════════════════════════════════════════════════════════════
SCORE CALCULATION
═══════════════════════════════════════════════════════════════

Total = A + B + C + D + E (max 90, min -20, clamp to 0-90)
Final percentage = Total / 90 × 100%

═══════════════════════════════════════════════════════════════
SCORE BANDS
═══════════════════════════════════════════════════════════════

86-100%: ESTABLISHED AUTHORITY - Rigorous fact-checking, transparent corrections
72-85%:  HIGH CREDIBILITY - Professional standards, good sourcing, minor issues
58-71%:  GENERALLY CREDIBLE - Factual core, some unsourced claims, moderate bias
43-57%:  MIXED TRACK RECORD - Inconsistent quality, insufficient info, OR conflicting indicators
29-42%:  QUESTIONABLE CREDIBILITY - Opinion as news, selective facts, strong bias
15-28%:  LOW CREDIBILITY - Persistent falsehoods, extreme bias, baseless claims
0-14%:   KNOWN DISINFORMATION - Pattern of lies, propaganda, coordinated deception

═══════════════════════════════════════════════════════════════
CRITICAL RULES
═══════════════════════════════════════════════════════════════

1. BASELESS CLAIMS are a major penalty - lack of evidence = unreliable
2. MIXING OPINION WITH NEWS is deceptive - penalize heavily
3. POLITICAL BIAS affects reliability when extreme - apply full penalty
4. CORRECTIONS matter - refusing to correct errors = unreliable
5. Do NOT give credit for "brand recognition" or "longevity"
6. Pattern of falsehoods = Known Disinformation (no "intent" required)

TEMPORAL AWARENESS:
- Base assessment on RECENT track record (last 1-2 years)
- Consider ownership changes, editorial shifts, quality trends

CONFIDENCE (0.0 to 1.0):
- 0.9+: Well-known major source with documented track record
- 0.7-0.9: Reasonably well-known source
- 0.5-0.7: Less familiar but some information available
- <0.5: Insufficient information for reliable assessment

Respond with JSON:
{
  "score": <decimal 0.0-1.0>,
  "confidence": <0.0-1.0>,
  "reasoning": "<one-sentence justification citing key factors>",
  "factualRating": "<established_authority|high_credibility|generally_credible|mixed_track_record|questionable_credibility|low_credibility|known_disinformation>",
  "biasIndicator": "<left|center-left|center|center-right|right>",
  "evidenceCited": ["<specific facts about the source>"]
}`;
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
        { role: "system", content: "You are a media reliability analyst. Evaluate sources based on FACTUAL ACCURACY, not reputation or prestige. Penalize baseless claims, opinion-as-news, and political bias. Always respond with valid JSON only." },
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
    console.log(`[SR-Eval] ${modelProvider.toUpperCase()} SUCCESS: score=${result.score.toFixed(2)}, confidence=${result.confidence.toFixed(2)}`);
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
  primaryScore?: number;
  primaryConfidence?: number;
  secondaryScore?: number;
  secondaryConfidence?: number;
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
      data: {
        score: primary.result.score,
        confidence: primary.result.confidence,
        modelPrimary: primary.modelName,
        modelSecondary: null,
        consensusAchieved: true, // Single model = automatic "consensus"
        reasoning: primary.result.reasoning,
        category: primary.result.factualRating,
        biasIndicator: primary.result.biasIndicator,
        evidenceCited: primary.result.evidenceCited,
      },
    };
  }

  // Multi-model: Secondary evaluation (OpenAI GPT-4)
  const secondary = await evaluateWithModel(domain, "openai");
  if (!secondary) {
    console.log(`[SR-Eval] Secondary evaluation failed for ${domain}, using primary only`);
    return {
      success: true,
      data: {
        score: primary.result.score,
        confidence: primary.result.confidence * 0.8, // Reduce confidence without consensus
        modelPrimary: primary.modelName,
        modelSecondary: null,
        consensusAchieved: false,
        reasoning: primary.result.reasoning,
        category: primary.result.factualRating,
        biasIndicator: primary.result.biasIndicator,
        evidenceCited: primary.result.evidenceCited,
      },
    };
  }

  // Check consensus
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
    data: {
      score: avgScore,
      confidence: avgConfidence,
      modelPrimary: primary.modelName,
      modelSecondary: secondary.modelName,
      consensusAchieved: true,
      // Use primary model's reasoning and category as the "canonical" one
      reasoning: primary.result.reasoning,
      category: primary.result.factualRating,
      biasIndicator: primary.result.biasIndicator,
      evidenceCited: primary.result.evidenceCited,
    },
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
