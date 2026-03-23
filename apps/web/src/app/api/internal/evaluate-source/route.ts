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
import { debugLog } from "@/lib/analyzer/debug";
import { getConfig } from "@/lib/config-storage";
import {
  DEFAULT_SR_CONFIG,
  type SearchConfig,
  type SourceReliabilityConfig,
} from "@/lib/config-schemas";
import {
  DEFAULT_CONFIDENCE_THRESHOLD,
  DEFAULT_CONSENSUS_THRESHOLD,
} from "@/lib/source-reliability-config";
import type { EvidenceQualityAssessmentConfig } from "@/lib/source-reliability/evidence-quality-assessment";
import { checkRunnerKey } from "@/lib/auth";
import { normalizeEvidenceQualityAssessmentConfig } from "@/lib/source-reliability/sr-eval-enrichment";
import { evaluateSourceWithConsensus } from "@/lib/source-reliability/sr-eval-engine";
import type { SrEvalConfig } from "@/lib/source-reliability/sr-eval-types";

export const runtime = "nodejs";
export const maxDuration = 60; // Allow up to 60s for multi-model evaluation

// ============================================================================
// CONFIGURATION DIAGNOSTICS (logs once on module load)
// ============================================================================

const hasAnthropicKey = !!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.startsWith("PASTE_");
const hasOpenAIKey = !!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith("PASTE_");

const SR_DEFAULT_EVALUATION_SEARCH = DEFAULT_SR_CONFIG.evaluationSearch!;
const SR_DEFAULT_EQA_CONFIG: EvidenceQualityAssessmentConfig =
  DEFAULT_SR_CONFIG.evidenceQualityAssessment ?? {
    enabled: true,
    model: "haiku",
    timeoutMs: 8000,
    maxItemsPerAssessment: 30,
    minRemainingBudgetMs: 20000,
  };

const DEFAULT_EVIDENCE_QUALITY_ASSESSMENT_CONFIG: EvidenceQualityAssessmentConfig = {
  enabled: SR_DEFAULT_EQA_CONFIG.enabled,
  model: SR_DEFAULT_EQA_CONFIG.model,
  timeoutMs: SR_DEFAULT_EQA_CONFIG.timeoutMs,
  maxItemsPerAssessment: SR_DEFAULT_EQA_CONFIG.maxItemsPerAssessment,
  minRemainingBudgetMs: SR_DEFAULT_EQA_CONFIG.minRemainingBudgetMs,
};

function buildSrSearchConfigFromEvalSearch(
  evalSearch: SourceReliabilityConfig["evaluationSearch"],
): SearchConfig {
  const cfg = evalSearch ?? SR_DEFAULT_EVALUATION_SEARCH;
  return {
    enabled: true,
    provider: cfg.provider,
    mode: "standard",
    // SR evaluation always accumulates across enabled providers. Keep this explicit
    // instead of inheriting the main pipeline default by reference.
    autoMode: "accumulate",
    maxResults: cfg.maxResultsPerQuery,
    maxSourcesPerIteration: cfg.maxResultsPerQuery,
    timeoutMs: cfg.timeoutMs,
    dateRestrict: cfg.dateRestrict,
    domainWhitelist: [],
    domainBlacklist: [],
    providers: {
      googleCse: {
        ...SR_DEFAULT_EVALUATION_SEARCH.providers.googleCse,
        ...cfg.providers.googleCse,
        dailyQuotaLimit:
          cfg.providers.googleCse.dailyQuotaLimit ??
          SR_DEFAULT_EVALUATION_SEARCH.providers.googleCse.dailyQuotaLimit ??
          0,
      },
      serpapi: {
        ...SR_DEFAULT_EVALUATION_SEARCH.providers.serpapi,
        ...cfg.providers.serpapi,
        dailyQuotaLimit:
          cfg.providers.serpapi.dailyQuotaLimit ??
          SR_DEFAULT_EVALUATION_SEARCH.providers.serpapi.dailyQuotaLimit ??
          0,
      },
      brave: {
        ...SR_DEFAULT_EVALUATION_SEARCH.providers.brave,
        ...cfg.providers.brave,
        dailyQuotaLimit:
          cfg.providers.brave.dailyQuotaLimit ??
          SR_DEFAULT_EVALUATION_SEARCH.providers.brave.dailyQuotaLimit ??
          0,
      },
      serper: {
        ...SR_DEFAULT_EVALUATION_SEARCH.providers.serper,
        ...cfg.providers.serper,
        dailyQuotaLimit:
          cfg.providers.serper.dailyQuotaLimit ??
          SR_DEFAULT_EVALUATION_SEARCH.providers.serper.dailyQuotaLimit ??
          0,
      },
    },
    cache: { enabled: true, ttlDays: 7 },
  };
}

debugLog(`[SR-Eval] Configuration check`, {
  anthropicKey: hasAnthropicKey ? "configured" : "MISSING",
  openaiKey: hasOpenAIKey ? "configured" : "MISSING",
  multiModelAvailable: hasAnthropicKey && hasOpenAIKey,
});

// ============================================================================
// TYPES & SCHEMAS
// ============================================================================

const RequestSchema = z.object({
  domain: z.string().min(1),
  multiModel: z.boolean().default(true),
  confidenceThreshold: z.number().min(0).max(1).default(DEFAULT_CONFIDENCE_THRESHOLD),
  consensusThreshold: z.number().min(0).max(1).default(DEFAULT_CONSENSUS_THRESHOLD),
  budgetMs: z.number().int().min(10000).max(300000).optional(),
});

// ============================================================================
// RATE LIMITING (In-Memory) — intentionally cross-request shared state
// ============================================================================

interface RateLimitState {
  ipRequests: Map<string, { count: number; resetAt: number }>;
  domainLastEval: Map<string, number>;
}

const rateLimitState: RateLimitState = {
  ipRequests: new Map(),
  domainLastEval: new Map(),
};

const RATE_LIMIT_WINDOW_SEC = 60;

function checkRateLimit(
  ip: string,
  domain: string,
  rateLimitPerIp: number,
  domainCooldownSec: number,
): { allowed: boolean; reason?: string } {
  const now = Date.now();

  const ipState = rateLimitState.ipRequests.get(ip);
  if (ipState) {
    if (now < ipState.resetAt) {
      if (ipState.count >= rateLimitPerIp) {
        return { allowed: false, reason: `IP rate limit exceeded (${rateLimitPerIp}/min)` };
      }
      ipState.count++;
    } else {
      rateLimitState.ipRequests.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_SEC * 1000 });
    }
  } else {
    rateLimitState.ipRequests.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_SEC * 1000 });
  }

  const lastEval = rateLimitState.domainLastEval.get(domain);
  if (lastEval && now - lastEval < domainCooldownSec * 1000) {
    return { allowed: false, reason: `Domain cooldown (${domainCooldownSec}s)` };
  }
  rateLimitState.domainLastEval.set(domain, now);

  return { allowed: true };
}

// ============================================================================
// API HANDLER
// ============================================================================

export async function POST(req: Request) {
  // Authentication
  if (!checkRunnerKey(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse request
  let body: z.infer<typeof RequestSchema>;
  let raw: any;
  try {
    raw = await req.json();
    body = RequestSchema.parse(raw);
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body", details: String(err) },
      { status: 400 }
    );
  }

  const srConfigResult = await getConfig("sr", "default");
  const srConfig = srConfigResult.config;

  // Decision A1/A2: Derive search config directly from SR evaluationSearch settings.
  // No longer loads shared 'search' profile from UCM and NO LONGER spreads DEFAULT_SEARCH_CONFIG.
  // This ensures SR is fully independent from Analysis-side default changes (e.g. domainBlacklist).
  const evalSearch = srConfig.evaluationSearch || SR_DEFAULT_EVALUATION_SEARCH;

  const searchConfig = buildSrSearchConfigFromEvalSearch(evalSearch);
  const rateLimitPerIp = srConfig.rateLimitPerIp ?? (DEFAULT_SR_CONFIG.rateLimitPerIp ?? 10);
  const domainCooldownSec = srConfig.domainCooldownSec ?? (DEFAULT_SR_CONFIG.domainCooldownSec ?? 60);

  const effectiveMultiModel = raw.multiModel !== undefined ? body.multiModel : srConfig.multiModel;
  const effectiveConfidenceThreshold =
    raw.confidenceThreshold !== undefined ? body.confidenceThreshold : srConfig.confidenceThreshold;
  const evidenceQualityAssessmentConfig = normalizeEvidenceQualityAssessmentConfig(
    srConfig.evidenceQualityAssessment,
    DEFAULT_EVIDENCE_QUALITY_ASSESSMENT_CONFIG,
  );
  const requestStartedAtMs = Date.now();
  const requestBudgetMs = raw.budgetMs !== undefined
    ? body.budgetMs ?? (srConfig.evalTimeoutMs ?? DEFAULT_SR_CONFIG.evalTimeoutMs ?? 90000)
    : (srConfig.evalTimeoutMs ?? DEFAULT_SR_CONFIG.evalTimeoutMs ?? 90000);

  // Build request-scoped config (replaces 8 mutable module-level lets)
  const config: SrEvalConfig = {
    openaiModel: srConfig.openaiModel,
    searchConfig,
    evalUseSearch: srConfig.evalUseSearch ?? (DEFAULT_SR_CONFIG.evalUseSearch ?? true),
    evalMaxResultsPerQuery: evalSearch.maxResultsPerQuery,
    evalMaxEvidenceItems: evalSearch.maxEvidenceItems,
    evalDateRestrict: evalSearch.dateRestrict,
    rateLimitPerIp,
    domainCooldownSec,
    evidenceQualityAssessment: evidenceQualityAssessmentConfig,
    requestStartedAtMs,
    requestBudgetMs,
  };

  // Rate limiting
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const rateCheck = checkRateLimit(ip, body.domain, config.rateLimitPerIp, config.domainCooldownSec);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded", reason: rateCheck.reason },
      { status: 429 }
    );
  }

  // Evaluate
  const result = await evaluateSourceWithConsensus(
    body.domain,
    effectiveMultiModel,
    effectiveConfidenceThreshold,
    config,
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
