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
import { generateText, Output } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { getDeterministicTemperature } from "@/lib/analyzer/config";

export const runtime = "nodejs";
export const maxDuration = 60; // Allow up to 60s for multi-model evaluation

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
  factualRating: z.enum(["very_high", "high", "mostly_factual", "mixed", "low", "very_low"]),
  evidenceCited: z.array(z.string()).optional(),
});

type EvaluationResult = z.infer<typeof EvaluationResultSchema>;

interface ResponsePayload {
  score: number;
  confidence: number;
  modelPrimary: string;
  modelSecondary: string | null;
  consensusAchieved: boolean;
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

const EVALUATION_PROMPT = `You are an expert media analyst evaluating the reliability of news sources and websites.

TASK: Evaluate the factual reliability of the domain: {DOMAIN}

IMPORTANT GUIDELINES:
1. Focus ONLY on factual accuracy and reliability, NOT political bias
2. Base your assessment on the source's demonstrated track record
3. Consider: fact-checking record, corrections policy, editorial standards, transparency
4. Do NOT rely on the domain name alone - consider actual reporting history
5. If you don't have sufficient information about this source, say so

RATING SCALE (factualRating):
- "very_high": Wire services, major fact-checkers (AP, Reuters, FactCheck.org)
- "high": Quality journalism with strong fact-checking (BBC, NPR, Economist)
- "mostly_factual": Generally reliable with occasional issues
- "mixed": Inconsistent accuracy, verify claims independently
- "low": Frequently misleading or inaccurate
- "very_low": Conspiracy theories, fake news, pseudoscience

SCORE SCALE (0.0 to 1.0):
- 0.90-0.99: very_high factual rating
- 0.80-0.89: high factual rating
- 0.70-0.79: mostly_factual rating
- 0.50-0.69: mixed rating
- 0.30-0.49: low rating
- 0.05-0.29: very_low rating

CONFIDENCE (0.0 to 1.0):
- 0.9+: Well-known major source with documented track record
- 0.7-0.9: Reasonably well-known source
- 0.5-0.7: Less familiar but some information available
- <0.5: Insufficient information for reliable assessment

Respond with a JSON object matching this schema:
{
  "score": <number 0-1>,
  "confidence": <number 0-1>,
  "reasoning": "<brief explanation of your assessment>",
  "factualRating": "<one of: very_high, high, mostly_factual, mixed, low, very_low>",
  "evidenceCited": ["<specific facts supporting your rating>"]
}`;

async function evaluateWithModel(
  domain: string,
  modelProvider: "anthropic" | "openai"
): Promise<{ result: EvaluationResult; modelName: string } | null> {
  const prompt = EVALUATION_PROMPT.replace("{DOMAIN}", domain);
  const temperature = getDeterministicTemperature(0.3);

  const modelName = modelProvider === "anthropic" 
    ? "claude-3-5-haiku-20241022" 
    : "gpt-4o-mini";
  
  const model = modelProvider === "anthropic"
    ? anthropic(modelName)
    : openai(modelName);

  try {
    const response = await generateText({
      model,
      prompt,
      temperature,
      output: Output.object({ schema: EvaluationResultSchema }),
    });

    // Extract structured output
    const output = (response as any).output ?? (response as any)._output ?? (response as any).experimental_output;
    
    if (!output) {
      console.error(`[SR-Eval] No structured output from ${modelProvider}`);
      return null;
    }

    const result = EvaluationResultSchema.parse(output);
    return { result, modelName };
  } catch (err) {
    console.error(`[SR-Eval] Error with ${modelProvider}:`, err);
    return null;
  }
}

async function evaluateSourceWithConsensus(
  domain: string,
  multiModel: boolean,
  confidenceThreshold: number,
  consensusThreshold: number
): Promise<ResponsePayload | null> {
  // Primary evaluation (Anthropic Claude)
  const primary = await evaluateWithModel(domain, "anthropic");
  if (!primary) {
    console.log(`[SR-Eval] Primary evaluation failed for ${domain}`);
    return null;
  }

  // Check confidence threshold
  if (primary.result.confidence < confidenceThreshold) {
    console.log(`[SR-Eval] Confidence too low for ${domain}: ${primary.result.confidence} < ${confidenceThreshold}`);
    return null;
  }

  // Single model mode
  if (!multiModel) {
    return {
      score: primary.result.score,
      confidence: primary.result.confidence,
      modelPrimary: primary.modelName,
      modelSecondary: null,
      consensusAchieved: true, // Single model = automatic "consensus"
    };
  }

  // Multi-model: Secondary evaluation (OpenAI GPT-4)
  const secondary = await evaluateWithModel(domain, "openai");
  if (!secondary) {
    console.log(`[SR-Eval] Secondary evaluation failed for ${domain}, using primary only`);
    return {
      score: primary.result.score,
      confidence: primary.result.confidence * 0.8, // Reduce confidence without consensus
      modelPrimary: primary.modelName,
      modelSecondary: null,
      consensusAchieved: false,
    };
  }

  // Check consensus
  const scoreDiff = Math.abs(primary.result.score - secondary.result.score);
  const consensusAchieved = scoreDiff <= consensusThreshold;

  if (!consensusAchieved) {
    console.log(
      `[SR-Eval] No consensus for ${domain}: ${primary.result.score.toFixed(2)} vs ${secondary.result.score.toFixed(2)} (diff: ${scoreDiff.toFixed(2)} > ${consensusThreshold})`
    );
    return null;
  }

  // Consensus achieved - average the scores
  const avgScore = (primary.result.score + secondary.result.score) / 2;
  const avgConfidence = (primary.result.confidence + secondary.result.confidence) / 2;

  console.log(
    `[SR-Eval] Consensus for ${domain}: score=${avgScore.toFixed(2)}, conf=${avgConfidence.toFixed(2)}`
  );

  return {
    score: avgScore,
    confidence: avgConfidence,
    modelPrimary: primary.modelName,
    modelSecondary: secondary.modelName,
    consensusAchieved: true,
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

  if (!result) {
    return NextResponse.json(
      { error: "Evaluation failed or no consensus" },
      { status: 422 }
    );
  }

  return NextResponse.json(result);
}
