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
  
  return `You are a media reliability analyst evaluating sources based on EVIDENCE.

CURRENT DATE: ${currentDate}
SOURCE: ${domain}

═══════════════════════════════════════════════════════════════
THE CORE QUESTION: EVIDENCE-BASED FACT-CHECKING
═══════════════════════════════════════════════════════════════

Evaluate this source based on DOCUMENTED EVIDENCE:

1. Are its claims SUPPORTED by verifiable evidence?
2. Are its claims CONTRADICTED by documented evidence?
3. What do FACT-CHECKERS find when they investigate this source?
4. Does it publish UNSUPPORTED claims as if they were facts?

You don't need to prove "intent to lie" - just whether claims are:
- SUPPORTED by evidence (reliable)
- CONTRADICTED by evidence (unreliable)
- UNSUPPORTED by evidence (questionable)

═══════════════════════════════════════════════════════════════
EVALUATION CRITERIA
═══════════════════════════════════════════════════════════════

A. EVIDENCE-BASED ACCURACY (0-40 points) ← PRIMARY CRITERION
   40: Claims consistently supported by documented evidence
   30: Most claims supported, occasional unsupported claims corrected
   20: Mixed - some claims supported, others unsupported or contradicted
   10: Many claims contradicted by evidence or unsupported
   0: Claims REPEATEDLY CONTRADICTED by documented evidence, fact-checkers

B. FACT-CHECKER FINDINGS (0-25 points)
   25: Fact-checkers consistently rate claims as accurate
   15: Mixed ratings - some accurate, some false
   5: Fact-checkers frequently find false or misleading claims
   0: Repeatedly debunked by multiple independent fact-checkers

C. OPINION vs. FACT TRANSPARENCY (0-15 points)
   15: Clear labels - opinion is marked, news is evidence-based
   10: Some blurring but mostly distinguishable
   5: Frequently presents opinion or unsupported claims as fact
   0: Systematically presents unsupported claims as established fact

D. BIAS IMPACT ON ACCURACY (subtract from total)
   -20: Extreme bias leads to publishing claims contradicted by evidence
   -12: Strong bias leads to selective/misleading presentation of evidence
   -5: Moderate bias but still mostly evidence-based
   0: Minimal bias, presents evidence fairly

═══════════════════════════════════════════════════════════════
SCORE CALCULATION
═══════════════════════════════════════════════════════════════

Total = A + B + C + D (max 80, min -20)
Final percentage = (Total + 20) / 100 × 100%

Scale centering:
- All zeros + max penalty = 0% (Known Disinformation)
- All zeros, no penalty = 20% (Low Credibility)
- Mixed scores (20+15+10+0) = 45% (Mixed Track Record)
- Good scores (30+20+12-5) = 57% (Generally Credible)
- Excellent (40+25+15+0) = 100% (Established Authority)

═══════════════════════════════════════════════════════════════
SCORE BANDS
═══════════════════════════════════════════════════════════════

86-100%: ESTABLISHED AUTHORITY - Claims consistently supported by evidence
72-85%:  HIGH CREDIBILITY - Evidence-based reporting, minor issues only
58-71%:  GENERALLY CREDIBLE - Mostly evidence-based, some unsupported claims
43-57%:  MIXED TRACK RECORD - Inconsistent evidence standards, or insufficient data
29-42%:  QUESTIONABLE CREDIBILITY - Many unsupported claims, evidence often ignored
15-28%:  LOW CREDIBILITY - Claims frequently contradicted by evidence
0-14%:   KNOWN DISINFORMATION - Documented pattern of publishing false information

═══════════════════════════════════════════════════════════════
CRITICAL RULES
═══════════════════════════════════════════════════════════════

1. EVIDENCE IS EVERYTHING
   - Claims supported by documents, data, named sources = credible
   - Claims contradicted by documented evidence = not credible
   - Claims without any supporting evidence = questionable

2. FACT-CHECKER CONSENSUS MATTERS
   - If PolitiFact, Snopes, AFP, Reuters Fact Check, etc. have repeatedly 
     found this source publishes false claims → score LOW
   - Multiple fact-checkers agreeing = strong signal

3. UNSUPPORTED ≠ NEUTRAL
   - Publishing claims without evidence is NOT neutral journalism
   - "Just asking questions" while spreading unsupported claims = unreliable

4. PROPAGANDA = KNOWN DISINFORMATION
   - State-controlled media pushing narratives contradicted by evidence
   - Sites that systematically publish claims debunked by fact-checkers
   - Outlets where counter-evidence is ignored or suppressed

5. BIAS AFFECTS EVIDENCE HANDLING
   - If bias causes a source to ignore counter-evidence → full penalty
   - If bias causes selective presentation of facts → strong penalty

6. PROFESSIONAL APPEARANCE IRRELEVANT
   - A polished outlet publishing unsupported claims is still unreliable

7. WHEN EVIDENCE IS UNCLEAR, BE SKEPTICAL
   - Insufficient evidence to verify claims = Mixed Track Record at best
   - Better to be cautious than to endorse an unreliable source

EXAMPLES - KNOWN DISINFORMATION (0-14%):
- State propaganda with claims contradicted by independent evidence
- Sites repeatedly debunked by multiple fact-checkers
- Outlets that fabricate quotes, events, or data

EXAMPLES - LOW CREDIBILITY (15-28%):
- Hyper-partisan sites ignoring counter-evidence
- Sources with documented patterns of false claims
- Outlets that mix news with significant misinformation

TEMPORAL AWARENESS:
- Base assessment on RECENT track record (last 1-2 years)
- Consider whether evidence standards have improved or declined

CONFIDENCE (0.0 to 1.0):
- 0.9+: Well-documented source, clear fact-checker data available
- 0.7-0.9: Reasonably known, some fact-checker findings
- 0.5-0.7: Less familiar but some evidence available
- <0.5: Unknown source, insufficient evidence to assess

Respond with JSON:
{
  "score": <decimal 0.0-1.0>,
  "confidence": <0.0-1.0>,
  "reasoning": "<one-sentence: are claims supported or contradicted by evidence?>",
  "factualRating": "<established_authority|high_credibility|generally_credible|mixed_track_record|questionable_credibility|low_credibility|known_disinformation>",
  "biasIndicator": "<left|center-left|center|center-right|right>",
  "evidenceCited": ["<specific examples of claims supported or contradicted by evidence>"]
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
