/**
 * FactHarbor POC1 Analyzer v2.6.18
 *
 * Features:
 * - 7-level symmetric scale (True/Mostly True/Leaning True/Unverified/Leaning False/Mostly False/False)
 * - Multi-Proceeding analysis with Contested Factors
 * - Search tracking with LLM call counting
 * - Configurable source reliability via FH_SOURCE_BUNDLE_PATH
 * - Configurable search with FH_SEARCH_ENABLED and FH_SEARCH_DOMAIN_WHITELIST
 * - Fixed AI SDK output handling for different versions (output vs experimental_output)
 * - Claim dependency tracking (claimRole: attribution/source/timing/core)
 * - Dependency propagation (if prerequisite false, dependent claims flagged)
 * - NEW: Unified analysis for questions and statements (same depth regardless of punctuation)
 * - NEW: Key Factors generated for procedural/legal topics in both modes
 * - NEW: Simplified schemas for better cross-provider compatibility
 *
 * @version 2.6.18
 * @date January 2026
 */

import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { mistral } from "@ai-sdk/mistral";
import { generateText, Output } from "ai";
import { extractTextFromUrl } from "@/lib/retrieval";
import { searchWebWithProvider, getActiveSearchProviders } from "@/lib/web-search";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// DEBUG LOGGING - writes to file for easy checking
// ============================================================================

// Write debug log to a fixed location that's easy to find
const DEBUG_LOG_PATH = "c:\\DEV\\FactHarbor\\apps\\web\\debug-analyzer.log";

function debugLog(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  let logLine = `[${timestamp}] ${message}`;
  if (data !== undefined) {
    logLine += ` | ${typeof data === 'string' ? data : JSON.stringify(data, null, 2)}`;
  }
  logLine += "\n";

  // Write to file (append)
  try {
    fs.appendFileSync(DEBUG_LOG_PATH, logLine);
  } catch (err) {
    // Silently ignore file write errors
  }

  // Also log to console
  console.log(logLine.trim());
}

function clearDebugLog() {
  try {
    fs.writeFileSync(DEBUG_LOG_PATH, `=== FactHarbor Debug Log Started at ${new Date().toISOString()} ===\n`);
  } catch (err) {
    // Silently ignore
  }
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  schemaVersion: "2.6.18",
  deepModeEnabled:
    (process.env.FH_ANALYSIS_MODE ?? "quick").toLowerCase() === "deep",

  // Search configuration (FH_ prefixed for consistency)
  searchEnabled:
    (process.env.FH_SEARCH_ENABLED ?? "true").toLowerCase() === "true",
  searchProvider: detectSearchProvider(),
  searchDomainWhitelist: parseWhitelist(process.env.FH_SEARCH_DOMAIN_WHITELIST),

  // Source reliability configuration
  sourceBundlePath: process.env.FH_SOURCE_BUNDLE_PATH || null,

  // Report configuration
  reportStyle: (process.env.FH_REPORT_STYLE ?? "standard").toLowerCase(),
  allowModelKnowledge:
    (process.env.FH_ALLOW_MODEL_KNOWLEDGE ?? "false").toLowerCase() === "true",

  // KeyFactors configuration
  // Optional hints for KeyFactors (suggestions only, not enforced)
  // Format: JSON array of objects with {question, factor, category}
  // Example: FH_KEYFACTOR_HINTS='[{"question":"Was due process followed?","factor":"Due Process","category":"procedural"}]'
  keyFactorHints: parseKeyFactorHints(process.env.FH_KEYFACTOR_HINTS),

  quick: {
    maxResearchIterations: 2,
    maxSourcesPerIteration: 3,
    maxTotalSources: 8,
    articleMaxChars: 4000,
    minFactsRequired: 6,
  },
  deep: {
    maxResearchIterations: 5,
    maxSourcesPerIteration: 4,
    maxTotalSources: 20,
    articleMaxChars: 8000,
    minFactsRequired: 12,
  },

  minCategories: 2,
  fetchTimeoutMs: 30000, // 30 seconds for large PDFs
};

/**
 * Parse comma-separated whitelist into array
 */
function parseWhitelist(whitelist: string | undefined): string[] | null {
  if (!whitelist) return null;
  return whitelist
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter((d) => d.length > 0);
}

/**
 * Parse optional KeyFactor hints from environment variable
 * Returns array of hint objects or null if not configured
 * These are suggestions only - the LLM can use them but is not required to
 */
function parseKeyFactorHints(
  hintsJson: string | undefined,
): Array<{ question: string; factor: string; category: string }> | null {
  if (!hintsJson) return null;
  try {
    const parsed = JSON.parse(hintsJson);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(
      (hint) =>
        typeof hint === "object" &&
        hint !== null &&
        typeof hint.question === "string" &&
        typeof hint.factor === "string" &&
        typeof hint.category === "string",
    ) as Array<{ question: string; factor: string; category: string }>;
  } catch {
    return null;
  }
}

/**
 * Detect which search provider is configured (uses FH_ prefix first, then fallback)
 */
function detectSearchProvider(): string {
  // Check for explicit FH_ config first
  if (process.env.FH_SEARCH_PROVIDER) {
    return process.env.FH_SEARCH_PROVIDER;
  }
  // Check for Google Custom Search
  if (
    process.env.GOOGLE_CSE_API_KEY ||
    process.env.GOOGLE_SEARCH_API_KEY ||
    process.env.GOOGLE_API_KEY
  ) {
    return "Google Custom Search";
  }
  // Check for Bing
  if (process.env.BING_API_KEY || process.env.AZURE_BING_KEY) {
    return "Bing Search";
  }
  // Check for SerpAPI (check both variants)
  if (
    process.env.SERPAPI_API_KEY ||
    process.env.SERPAPI_KEY ||
    process.env.SERP_API_KEY
  ) {
    return "SerpAPI";
  }
  // Check for Tavily
  if (process.env.TAVILY_API_KEY) {
    return "Tavily";
  }
  // Check for Brave
  if (process.env.BRAVE_API_KEY || process.env.BRAVE_SEARCH_KEY) {
    return "Brave Search";
  }
  // Legacy fallback
  if (process.env.SEARCH_PROVIDER) {
    return process.env.SEARCH_PROVIDER;
  }
  // Default
  return "Web Search";
}

function getActiveConfig() {
  return CONFIG.deepModeEnabled ? CONFIG.deep : CONFIG.quick;
}

/**
 * Detect if a topic likely requires recent data
 * Returns true if dates, recent keywords, or temporal indicators suggest recency matters
 */
function isRecencySensitive(text: string, understanding?: ClaimUnderstanding): boolean {
  const lowerText = text.toLowerCase();

  // Check for recent date mentions (within last 2 years from current date)
  const currentYear = new Date().getFullYear();
  const recentYears = [currentYear, currentYear - 1, currentYear - 2];
  const yearPattern = /\b(20\d{2})\b/;
  const yearMatch = text.match(yearPattern);
  if (yearMatch) {
    const mentionedYear = parseInt(yearMatch[1]);
    if (recentYears.includes(mentionedYear)) {
      return true;
    }
  }

  // Check for recent temporal keywords
  const recentKeywords = [
    'recent', 'recently', 'latest', 'newest', 'current', 'now', 'today',
    'this year', 'this month', 'last month', 'last week', 'yesterday',
    'november 2025', 'december 2025', 'january 2026', '2025', '2026',
    'announced', 'released', 'published', 'unveiled', 'revealed'
  ];

  if (recentKeywords.some(keyword => lowerText.includes(keyword))) {
    return true;
  }

  // Check understanding for recent dates in proceedings
  if (understanding?.distinctProceedings) {
    for (const proc of understanding.distinctProceedings) {
      if (proc.date && recentYears.some(year => proc.date.includes(String(year)))) {
        return true;
      }
    }
  }

  return false;
}

function getKnowledgeInstruction(text?: string, understanding?: ClaimUnderstanding): string {
  const recencyMatters = text ? isRecencySensitive(text, understanding) : false;

  if (CONFIG.allowModelKnowledge) {
    const recencyGuidance = recencyMatters ? `
### ⚠️ RECENT DATA DETECTED - PRIORITIZE WEB SEARCH RESULTS:

This topic appears to involve recent events, dates, or announcements. For recent information:
- **PRIORITIZE**: Web search results and fetched sources (these contain the most current data)
- **USE CAUTIOUSLY**: Your training knowledge may be outdated for recent events
- **WHEN TO USE KNOWLEDGE**: Only for established facts, standard procedures, or historical context that hasn't changed
- **WHEN TO USE SEARCH**: For specific dates, recent announcements, current status, or events from the past 1-2 years

Example: If sources say "November 2025" and your knowledge cutoff is earlier, TRUST THE SOURCES, not your training data.
` : '';

    return `## KNOWLEDGE SOURCE INSTRUCTIONS (CRITICAL - READ CAREFULLY)

You MUST actively use your background knowledge as evidence. This is NOT optional.
${recencyGuidance}
### WHAT YOU KNOW (USE IT!):
- Standard legal procedures in major jurisdictions (Brazil, US, EU, etc.)
- Well-documented public figures and their roles (e.g., Alexandre de Moraes is a Brazilian Supreme Court justice)
- Major court cases and their outcomes that were widely reported
- Established institutional processes (how courts work, due process standards)
- Historical events and their documented outcomes

### WHEN TO USE BACKGROUND KNOWLEDGE:
1. **Due process claims**: If you know a court follows standard procedures, mark supports="yes", NOT "neutral"
2. **Decision-maker roles**: If you know who presided over a case, use that knowledge
3. **Established facts**: If something is widely documented (e.g., a trial followed proper procedures), don't mark it "unknown"
4. **Legal standards**: If you know what legal standards apply, use that to assess "correct application of law"

### CRITICAL RULES:
- NEVER mark a factor as "neutral" or "unknown" if you have relevant background knowledge
- NEVER say "INSUFFICIENT-EVIDENCE" if you actually know the answer from your training data
- Political contestation ("critics say X") is NOT the same as factual uncertainty
- If you know a trial followed due process, say supports="yes" even without explicit source confirmation

### EXAMPLE - CORRECT USAGE:
For "The STF followed proper due process procedures":
- You KNOW the STF (Brazil's Supreme Court) follows established constitutional procedures
- You KNOW criminal trials in Brazil have formal due process requirements
- Therefore: This claim is WELL-SUPPORTED, NOT "uncertain" or "unknown"

Prioritize provided sources when available, but actively supplement with your knowledge.`;
  }
  return "Use ONLY the provided facts and sources. If information is missing, say INSUFFICIENT-EVIDENCE. Do not add facts not present in the sources.";
}

/**
 * Get provider-specific prompt hints for better cross-provider compatibility
 * Different LLMs have different strengths/weaknesses with structured output
 */
function getProviderPromptHint(): string {
  const provider = (process.env.LLM_PROVIDER ?? "anthropic").toLowerCase();

  if (provider === "openai" || provider === "gpt") {
    return `
## OUTPUT FORMAT (IMPORTANT)
Return ONLY valid JSON matching the schema. All string fields must be non-empty (use descriptive text, not empty strings for required fields).
For array fields, always include at least one item where appropriate.`;
  }

  if (provider === "google" || provider === "gemini") {
    return `
## OUTPUT FORMAT (CRITICAL)
Return ONLY valid JSON. Do NOT include any explanation text outside the JSON.
- All enum fields must use EXACT values from the allowed options
- All boolean fields must be true or false (not strings)
- All number fields must be numbers (not strings)
- For empty arrays, use [] not null`;
  }

  if (provider === "mistral") {
    return `
## OUTPUT FORMAT (CRITICAL)
Return ONLY valid JSON matching the exact schema structure.
- Use the exact enum values specified (case-sensitive)
- Do not omit any required fields
- Use empty string "" for optional string fields with no value
- Use empty array [] for optional array fields with no items`;
  }

  // Anthropic/Claude handles structured output well, minimal hints needed
  return "";
}

/**
 * Safely extract structured output from AI SDK generateText result
 * Handles different SDK versions and result structures
 * Prevents "Cannot read properties of undefined (reading 'value')" errors
 */
function extractStructuredOutput(result: any): any {
  // Guard against null/undefined result
  if (!result) {
    console.log("[Analyzer] extractStructuredOutput: result is null/undefined");
    return null;
  }

  console.log("[Analyzer] extractStructuredOutput: Checking result with keys:", Object.keys(result));

  const safeGet = (getter: () => any) => {
    try {
      return getter();
    } catch {
      return undefined;
    }
  };

  // Try different possible locations for the output
  // Priority: result.output > result._output > result.experimental_output?.value > result.experimental_output > result.object
  // Note: AI SDK 6.x uses _output for structured output
  const output = safeGet(() => result.output);
  console.log("[Analyzer] extractStructuredOutput: result.output =", output !== undefined ? "exists" : "undefined");
  if (output !== undefined && output !== null) {
    const outputValue = safeGet(() => output?.value);
    if (outputValue !== undefined) {
      console.log("[Analyzer] extractStructuredOutput: Found in output.value");
      return outputValue;
    }
    console.log("[Analyzer] extractStructuredOutput: Found in output directly");
    return output;
  }

  // AI SDK 6.x stores structured output in _output
  const _output = safeGet(() => result._output);
  console.log("[Analyzer] extractStructuredOutput: result._output =", _output !== undefined ? "exists" : "undefined");
  if (_output !== undefined && _output !== null) {
    console.log("[Analyzer] extractStructuredOutput: Found structured output in result._output");
    return _output;
  }

  // Handle experimental_output safely (avoid "reading 'value' of undefined")
  const experimental = safeGet(() => result.experimental_output);
  if (experimental !== undefined && experimental !== null) {
    const experimentalValue = safeGet(() => experimental?.value);
    if (experimentalValue !== undefined) {
      return experimentalValue;
    }
    if (typeof experimental === "object" && !Array.isArray(experimental)) {
      return experimental;
    }
  }

  // Some SDK versions might put it directly in result.object
  const objectOutput = safeGet(() => result.object);
  if (objectOutput !== undefined && objectOutput !== null) {
    return objectOutput;
  }

  // Last resort: return the result itself if it looks like structured data
  if (typeof result === "object" && !Array.isArray(result) && result !== null) {
    // Check if it has properties that suggest it's the output object
    const keys = Object.keys(result);
    if (keys.length > 0 && !keys.includes("text") && !keys.includes("usage")) {
      return result;
    }
  }

  return null;
}

// ============================================================================
// QUALITY GATES (POC1 Specification)
// ============================================================================

/**
 * Gate 1: Claim Validation Result
 * Determines if a claim is factual (verifiable) vs opinion/prediction
 */
interface ClaimValidationResult {
  claimId: string;
  isFactual: boolean;
  opinionScore: number;        // 0-1 (higher = more opinion-like)
  specificityScore: number;    // 0-1 (higher = more specific/concrete)
  futureOriented: boolean;
  claimType: "FACTUAL" | "OPINION" | "PREDICTION" | "AMBIGUOUS";
  passed: boolean;
  failureReason?: string;
  validatedAt: Date;
}

/**
 * Gate 4: Verdict Validation Result
 * Determines if verdict has sufficient evidence confidence to publish
 */
interface VerdictValidationResult {
  verdictId: string;
  evidenceCount: number;
  averageSourceQuality: number;     // 0-1
  evidenceAgreement: number;        // 0-1 (% supporting vs contradicting)
  uncertaintyFactors: number;       // Count of hedging statements
  confidenceTier: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";
  publishable: boolean;
  failureReasons?: string[];
  validatedAt: Date;
}

// Opinion/hedging markers that indicate non-factual claims
const OPINION_MARKERS = [
  /\bi\s+think\b/i,
  /\bi\s+believe\b/i,
  /\bin\s+my\s+(view|opinion)\b/i,
  /\bprobably\b/i,
  /\bpossibly\b/i,
  /\bperhaps\b/i,
  /\bmaybe\b/i,
  /\bmight\b/i,
  /\bcould\s+be\b/i,
  /\bseems\s+to\b/i,
  /\bappears\s+to\b/i,
  /\blooks\s+like\b/i,
  /\bbest\b/i,
  /\bworst\b/i,
  /\bshould\b/i,
  /\bought\s+to\b/i,
  /\bbeautiful\b/i,
  /\bterrible\b/i,
  /\bamazing\b/i,
  /\bwonderful\b/i,
  /\bhorrible\b/i,
];

// Future prediction markers
const FUTURE_MARKERS = [
  /\bwill\s+(be|have|become|happen|occur|result)\b/i,
  /\bgoing\s+to\b/i,
  /\bin\s+the\s+future\b/i,
  /\bby\s+(2026|2027|2028|2029|2030|next\s+year|next\s+month)\b/i,
  /\bwill\s+likely\b/i,
  /\bpredicted\s+to\b/i,
  /\bforecast/i,
  /\bexpected\s+to\s+(increase|decrease|grow|rise|fall)\b/i,
];

// Specificity indicators (names, numbers, dates, locations)
const SPECIFICITY_PATTERNS = [
  /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/, // Dates
  /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}/i,
  /\b\d+\s*(percent|%)\b/i, // Percentages
  /\b\d+\s*(million|billion|thousand)\b/i, // Large numbers
  /\b\$\s*\d+/i, // Dollar amounts
  /\b(Dr\.|Prof\.|President|CEO|Director)\s+[A-Z][a-z]+/i, // Named individuals
  /\b[A-Z][a-z]+\s+(University|Institute|Hospital|Corporation|Inc\.|Ltd\.)/i, // Organizations
  /\b(said|stated|announced|declared|confirmed)\s+(that|in)/i, // Attribution
  /\bat\s+least\s+\d+/i, // Specific quantities
  /\baccording\s+to\b/i, // Source attribution
];

// Uncertainty markers in verdict reasoning
const UNCERTAINTY_MARKERS = [
  /\bunclear\b/i,
  /\bnot\s+(certain|sure|definitive)\b/i,
  /\blimited\s+evidence\b/i,
  /\binsufficient\s+data\b/i,
  /\bconflicting\s+(reports|evidence|sources)\b/i,
  /\bcannot\s+(confirm|verify|determine)\b/i,
  /\bno\s+(reliable|credible)\s+sources?\b/i,
  /\bmay\s+or\s+may\s+not\b/i,
];

/**
 * Gate 1: Validate if a claim is factual (verifiable) vs opinion/prediction
 *
 * IMPORTANT: Central claims are ALWAYS passed through Gate 1, even if they
 * technically fail validation. This ensures important claims aren't lost.
 */
function validateClaimGate1(
  claimId: string,
  claimText: string,
  isCentral: boolean = false
): ClaimValidationResult {
  // 1. Calculate opinion score (0-1)
  let opinionMatches = 0;
  for (const pattern of OPINION_MARKERS) {
    if (pattern.test(claimText)) {
      opinionMatches++;
    }
  }
  // Normalize: 0 matches = 0.0, 3+ matches = 1.0
  const opinionScore = Math.min(opinionMatches / 3, 1);

  // 2. Calculate specificity score (0-1)
  let specificityMatches = 0;
  for (const pattern of SPECIFICITY_PATTERNS) {
    if (pattern.test(claimText)) {
      specificityMatches++;
    }
  }
  // Normalize: 0 matches = 0.0, 3+ matches = 1.0
  const specificityScore = Math.min(specificityMatches / 3, 1);

  // 3. Check for future predictions
  let futureOriented = false;
  for (const pattern of FUTURE_MARKERS) {
    if (pattern.test(claimText)) {
      futureOriented = true;
      break;
    }
  }

  // 4. Determine claim type
  let claimType: "FACTUAL" | "OPINION" | "PREDICTION" | "AMBIGUOUS";
  if (futureOriented) {
    claimType = "PREDICTION";
  } else if (opinionScore > 0.5) {
    claimType = "OPINION";
  } else if (specificityScore >= 0.3 && opinionScore <= 0.3) {
    claimType = "FACTUAL";
  } else {
    claimType = "AMBIGUOUS";
  }

  // 5. Determine if it can be verified
  const isFactual = claimType === "FACTUAL" || claimType === "AMBIGUOUS";

  // 6. Pass criteria (spec: opinionScore <= 0.3, specificityScore >= 0.3, not future)
  const wouldPass = isFactual &&
                    opinionScore <= 0.3 &&
                    specificityScore >= 0.3 &&
                    !futureOriented;

  // CRITICAL: Central claims always pass Gate 1 to prevent losing important claims
  // They're flagged but not filtered out
  const passed = wouldPass || isCentral;

  // Generate failure reason if applicable
  let failureReason: string | undefined;
  if (!wouldPass) {
    if (futureOriented) {
      failureReason = "Future prediction (cannot be verified yet)";
    } else if (opinionScore > 0.3) {
      failureReason = "Contains opinion language";
    } else if (specificityScore < 0.3) {
      failureReason = "Lacks specific verifiable details";
    }

    // Add note if central claim is being passed despite failing
    if (isCentral && failureReason) {
      failureReason = `[CENTRAL CLAIM - kept for analysis] ${failureReason}`;
    }
  }

  return {
    claimId,
    isFactual,
    opinionScore,
    specificityScore,
    futureOriented,
    claimType,
    passed,
    failureReason: passed && !isCentral ? undefined : failureReason,
    validatedAt: new Date(),
  };
}

/**
 * Gate 4: Validate verdict confidence based on evidence quality
 *
 * Confidence Tiers:
 * - HIGH (80-100%): ≥3 sources, ≥0.7 avg quality, ≥80% agreement
 * - MEDIUM (50-79%): ≥2 sources, ≥0.6 avg quality, ≥60% agreement
 * - LOW (0-49%): ≥2 sources but low quality/agreement
 * - INSUFFICIENT: <2 sources → DO NOT PUBLISH
 *
 * Publication Rule: Minimum MEDIUM confidence required
 */
function validateVerdictGate4(
  verdictId: string,
  sources: Array<{url: string; trackRecordScore?: number | null}>,
  supportingFactIds: string[],
  contradictingFactCount: number,
  verdictReasoning: string,
  isCentral: boolean = false
): VerdictValidationResult {
  // 1. Count evidence sources
  const evidenceCount = sources.length;

  // 2. Calculate average source quality
  // Default to 0.5 if no track record available
  // Note: trackRecordScore is already 0-1 scale (see Source Reliability Bundle docs)
  const qualityScores = sources.map(s =>
    s.trackRecordScore != null ? s.trackRecordScore : 0.5
  );
  const averageSourceQuality = qualityScores.length > 0
    ? qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length
    : 0;

  // 3. Calculate evidence agreement
  const totalEvidence = supportingFactIds.length + contradictingFactCount;
  const evidenceAgreement = totalEvidence > 0
    ? supportingFactIds.length / totalEvidence
    : 0;

  // 4. Count uncertainty factors in reasoning
  let uncertaintyFactors = 0;
  for (const pattern of UNCERTAINTY_MARKERS) {
    if (pattern.test(verdictReasoning)) {
      uncertaintyFactors++;
    }
  }

  // 5. Determine confidence tier
  let confidenceTier: "HIGH" | "MEDIUM" | "LOW" | "INSUFFICIENT";

  if (evidenceCount < 2) {
    confidenceTier = "INSUFFICIENT";
  } else if (evidenceCount >= 3 && averageSourceQuality >= 0.7 && evidenceAgreement >= 0.8) {
    confidenceTier = "HIGH";
  } else if (evidenceCount >= 2 && averageSourceQuality >= 0.6 && evidenceAgreement >= 0.6) {
    confidenceTier = "MEDIUM";
  } else {
    confidenceTier = "LOW";
  }

  // 6. Publication decision
  // CRITICAL: Central claims are always publishable (with appropriate caveats)
  // to prevent losing important claims from the analysis
  const wouldPublish = confidenceTier === "MEDIUM" || confidenceTier === "HIGH";
  const publishable = wouldPublish || isCentral;

  // 7. Generate failure reasons if not publishable
  const failureReasons: string[] = [];
  if (!wouldPublish) {
    if (evidenceCount < 2) {
      failureReasons.push(`Insufficient sources (${evidenceCount}, need ≥2)`);
    }
    if (averageSourceQuality < 0.6) {
      failureReasons.push(`Low source quality (${(averageSourceQuality * 100).toFixed(0)}%, need ≥60%)`);
    }
    if (evidenceAgreement < 0.6) {
      failureReasons.push(`Low evidence agreement (${(evidenceAgreement * 100).toFixed(0)}%, need ≥60%)`);
    }

    // Add note if central claim is being published despite failing
    if (isCentral && failureReasons.length > 0) {
      failureReasons.unshift("[CENTRAL CLAIM - published with caveats]");
    }
  }

  return {
    verdictId,
    evidenceCount,
    averageSourceQuality,
    evidenceAgreement,
    uncertaintyFactors,
    confidenceTier,
    publishable,
    failureReasons: failureReasons.length > 0 ? failureReasons : undefined,
    validatedAt: new Date(),
  };
}

/**
 * Apply Gate 1 validation to all claims and filter non-factual ones
 * IMPORTANT: Central claims are never filtered, only flagged
 * Uses generic type T to preserve the full claim structure
 */
function applyGate1ToClaims<T extends { id: string; text: string; isCentral: boolean }>(
  claims: T[]
): {
  validatedClaims: (T & { gate1Validation?: ClaimValidationResult })[];
  validationResults: ClaimValidationResult[];
  stats: { total: number; passed: number; filtered: number; centralKept: number };
} {
  const validationResults: ClaimValidationResult[] = [];
  const validatedClaims: (T & { gate1Validation?: ClaimValidationResult })[] = [];
  let centralKept = 0;

  for (const claim of claims) {
    const validation = validateClaimGate1(claim.id, claim.text, claim.isCentral);
    validationResults.push(validation);

    if (validation.passed) {
      validatedClaims.push({
        ...claim,
        gate1Validation: validation,
      });

      if (claim.isCentral && !validation.isFactual) {
        centralKept++;
      }
    } else {
      console.log(`[Gate1] Filtered claim ${claim.id}: ${validation.failureReason}`);
    }
  }

  const stats = {
    total: claims.length,
    passed: validatedClaims.length,
    filtered: claims.length - validatedClaims.length,
    centralKept,
  };

  console.log(`[Gate1] Stats: ${stats.passed}/${stats.total} passed, ${stats.filtered} filtered, ${stats.centralKept} central claims kept despite issues`);

  return { validatedClaims, validationResults, stats };
}

/**
 * Apply Gate 4 validation to all verdicts
 * Adds confidence tier and publication status to each verdict
 */
function applyGate4ToVerdicts(
  verdicts: ClaimVerdict[],
  sources: FetchedSource[],
  facts: ExtractedFact[]
): {
  validatedVerdicts: (ClaimVerdict & { gate4Validation: VerdictValidationResult })[];
  validationResults: VerdictValidationResult[];
  stats: {
    total: number;
    publishable: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
    insufficient: number;
    centralKept: number;
  };
} {
  const validationResults: VerdictValidationResult[] = [];
  const validatedVerdicts: (ClaimVerdict & { gate4Validation: VerdictValidationResult })[] = [];

  let highConfidence = 0;
  let mediumConfidence = 0;
  let lowConfidence = 0;
  let insufficient = 0;
  let centralKept = 0;

  for (const verdict of verdicts) {
    // Find sources that support this verdict
    const supportingSources = sources.filter(s =>
      verdict.supportingFactIds.some(factId =>
        facts.some(f => f.id === factId && f.sourceId === s.id)
      )
    );

    // Count contradicting facts (estimate based on criticism category)
    // "criticism" is the category used for opposing/contradicting evidence
    const contradictingFactCount = facts.filter(f =>
      !verdict.supportingFactIds.includes(f.id) &&
      f.category === "criticism"
    ).length;

    const validation = validateVerdictGate4(
      verdict.claimId,
      supportingSources,
      verdict.supportingFactIds,
      contradictingFactCount,
      verdict.reasoning,
      verdict.isCentral
    );

    validationResults.push(validation);

    // Track stats
    switch (validation.confidenceTier) {
      case "HIGH": highConfidence++; break;
      case "MEDIUM": mediumConfidence++; break;
      case "LOW": lowConfidence++; break;
      case "INSUFFICIENT": insufficient++; break;
    }

    if (verdict.isCentral && !validation.publishable) {
      centralKept++;
    }

    // Always include the verdict but with validation info
    validatedVerdicts.push({
      ...verdict,
      gate4Validation: validation,
    });
  }

  const stats = {
    total: verdicts.length,
    publishable: validatedVerdicts.filter(v => v.gate4Validation.publishable).length,
    highConfidence,
    mediumConfidence,
    lowConfidence,
    insufficient,
    centralKept,
  };

  console.log(`[Gate4] Stats: ${stats.publishable}/${stats.total} publishable, HIGH=${stats.highConfidence}, MED=${stats.mediumConfidence}, LOW=${stats.lowConfidence}, INSUFF=${stats.insufficient}, central kept=${stats.centralKept}`);

  return { validatedVerdicts, validationResults, stats };
}

// ============================================================================
// PSEUDOSCIENCE DETECTION
// ============================================================================

/**
 * Patterns that indicate pseudoscientific claims
 * These are mechanisms that contradict established physics/chemistry/biology
 */
const PSEUDOSCIENCE_PATTERNS = {
  // Water pseudoscience
  waterMemory: [
    /water\s*memory/i,
    /information\s*water/i,
    /informed\s*water/i,
    /structured\s*water/i,
    /hexagonal\s*water/i,
    /water\s*structur(e|ing)/i,
    /molecular\s*(re)?structur/i,
    /water\s*cluster/i,
    /energi[sz]ed\s*water/i,
    /revitali[sz]ed\s*water/i,
    /living\s*water/i,
    /grander/i,
    /emoto/i, // Masaru Emoto's debunked water crystal claims
  ],

  // Energy/vibration pseudoscience
  energyFields: [
    /life\s*force/i,
    /vital\s*energy/i,
    /bio[\s-]*energy/i,
    /subtle\s*energy/i,
    /energy\s*field/i,
    /healing\s*frequencies/i,
    /vibrational\s*(healing|medicine|therapy)/i,
    /frequency\s*(healing|therapy)/i,
    /chakra/i,
    /aura\s*(reading|healing|cleansing)/i,
  ],

  // Quantum misuse
  quantumMisuse: [
    /quantum\s*(healing|medicine|therapy|wellness)/i,
    /quantum\s*consciousness/i,
    /quantum\s*energy/i,
  ],

  // Homeopathy
  homeopathy: [
    /homeopath/i,
    /potenti[sz]ation/i,
    /succussion/i,
    /dilution.*memory/i,
    /like\s*cures\s*like/i,
  ],

  // Detox pseudoscience
  detoxPseudo: [
    /detox\s*(foot|ion|cleanse)/i,
    /toxin\s*removal.*(?:crystal|magnet|ion)/i,
    /ionic\s*cleanse/i,
  ],

  // Other pseudoscience
  other: [
    /crystal\s*(healing|therapy|energy)/i,
    /magnet\s*therapy/i,
    /magnetic\s*healing/i,
    /earthing\s*(therapy|healing)/i,
    /grounding\s*(therapy|healing|mat)/i,
    /orgone/i,
    /scalar\s*(wave|energy)/i,
    /tachyon/i,
    /zero[\s-]*point\s*energy.*healing/i,
  ],
};

/**
 * Known pseudoscience products/brands
 */
const PSEUDOSCIENCE_BRANDS = [
  /grander/i,
  /pimag/i,
  /kangen/i,
  /enagic/i,
  /alkaline\s*ionizer/i,
  /structured\s*water\s*unit/i,
];

/**
 * Scientific consensus statements that indicate a claim is debunked
 */
const DEBUNKED_INDICATORS = [
  /no\s*(scientific\s*)?(evidence|proof|basis)/i,
  /not\s*(scientifically\s*)?(proven|supported|verified)/i,
  /lacks?\s*(scientific\s*)?(evidence|proof|basis|foundation)/i,
  /contradict.*(?:physics|chemistry|biology|science)/i,
  /violates?\s*(?:laws?\s*of\s*)?(?:physics|thermodynamics)/i,
  /pseudoscien/i,
  /debunked/i,
  /disproven/i,
  /no\s*plausible\s*mechanism/i,
  /implausible/i,
  /scientifically\s*impossible/i,
];

interface PseudoscienceAnalysis {
  isPseudoscience: boolean;
  confidence: number; // 0-1
  categories: string[];
  matchedPatterns: string[];
  debunkIndicatorsFound: string[];
  recommendation: "REFUTED" | "FALSE" | "UNCERTAIN" | null;
}

/**
 * Analyze text for pseudoscience patterns
 */
function detectPseudoscience(
  text: string,
  claimText?: string,
): PseudoscienceAnalysis {
  const result: PseudoscienceAnalysis = {
    isPseudoscience: false,
    confidence: 0,
    categories: [],
    matchedPatterns: [],
    debunkIndicatorsFound: [],
    recommendation: null,
  };

  const combinedText = `${text} ${claimText || ""}`.toLowerCase();

  // Check each pseudoscience category
  for (const [category, patterns] of Object.entries(PSEUDOSCIENCE_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(combinedText)) {
        if (!result.categories.includes(category)) {
          result.categories.push(category);
        }
        result.matchedPatterns.push(pattern.toString());
      }
    }
  }

  // Check for known pseudoscience brands
  for (const brand of PSEUDOSCIENCE_BRANDS) {
    if (brand.test(combinedText)) {
      result.matchedPatterns.push(brand.toString());
      if (!result.categories.includes("knownBrand")) {
        result.categories.push("knownBrand");
      }
    }
  }

  // Check for debunked indicators in sources
  for (const indicator of DEBUNKED_INDICATORS) {
    if (indicator.test(combinedText)) {
      result.debunkIndicatorsFound.push(indicator.toString());
    }
  }

  // Calculate confidence
  const patternScore = Math.min(result.matchedPatterns.length * 0.15, 0.6);
  const categoryScore = Math.min(result.categories.length * 0.2, 0.4);
  const debunkScore = Math.min(result.debunkIndicatorsFound.length * 0.2, 0.4);

  result.confidence = Math.min(patternScore + categoryScore + debunkScore, 1.0);

  // Determine if it's pseudoscience
  if (result.categories.length >= 1 && result.confidence >= 0.3) {
    result.isPseudoscience = true;

    // Recommend verdict based on confidence
    // Note: We never recommend FALSE for pseudoscience - that requires 99%+ certainty
    // REFUTED is appropriate for "strong evidence against, contradicts scientific consensus"
    if (result.confidence >= 0.7 || result.debunkIndicatorsFound.length >= 2) {
      result.recommendation = "REFUTED"; // Changed from FALSE
    } else if (
      result.confidence >= 0.5 ||
      result.debunkIndicatorsFound.length >= 1
    ) {
      result.recommendation = "REFUTED";
    } else {
      result.recommendation = "UNCERTAIN";
    }
  }

  return result;
}

/**
 * Escalate verdict when pseudoscience is detected
 */
function escalatePseudoscienceVerdict(
  originalVerdict: string,
  originalConfidence: number,
  pseudoAnalysis: PseudoscienceAnalysis,
): { verdict: string; confidence: number; escalationReason?: string } {
  if (!pseudoAnalysis.isPseudoscience) {
    return { verdict: originalVerdict, confidence: originalConfidence };
  }

  // Verdict calibration:
  // - FALSE/TRUE: Only for 99%+ certainty (e.g., "2+2=5", definitively proven false)
  // - REFUTED: Strong evidence against, scientific consensus disagrees (70-98%)
  // - MISLEADING: Contains misleading elements, lacks support
  // - UNCERTAIN: Not enough evidence either way

  const verdictStrength: Record<string, number> = {
    "WELL-SUPPORTED": 4,
    "PARTIALLY-SUPPORTED": 3,
    UNCERTAIN: 2,
    REFUTED: 1,
    FALSE: 0,
  };

  const currentStrength = verdictStrength[originalVerdict] ?? 2;
  let newVerdict = originalVerdict;
  let newConfidence = originalConfidence;
  let escalationReason: string | undefined;

  // If claim is UNCERTAIN but pseudoscience detected with high confidence
  // Escalate to REFUTED (not FALSE - that requires 99%+ certainty)
  if (currentStrength >= 2 && pseudoAnalysis.confidence >= 0.5) {
    if (pseudoAnalysis.debunkIndicatorsFound.length >= 2) {
      // Strong debunking evidence -> REFUTED with high confidence
      newVerdict = "REFUTED";
      newConfidence = Math.min(Math.max(originalConfidence, 80), 95); // Cap at 95%, not 99%
      escalationReason = `Claim contradicts scientific consensus (${pseudoAnalysis.categories.join(", ")}) - multiple debunk sources found`;
    } else if (pseudoAnalysis.debunkIndicatorsFound.length >= 1) {
      newVerdict = "REFUTED";
      newConfidence = Math.min(Math.max(originalConfidence, 70), 90);
      escalationReason = `Claim based on pseudoscience (${pseudoAnalysis.categories.join(", ")}) - contradicts established science`;
    } else if (pseudoAnalysis.confidence >= 0.6) {
      newVerdict = "REFUTED";
      newConfidence = Math.min(Math.max(originalConfidence, 65), 85);
      escalationReason = `Multiple pseudoscience patterns detected (${pseudoAnalysis.categories.join(", ")}) - no scientific basis`;
    }
  }

  // If claim is PARTIALLY-SUPPORTED but relies on pseudoscience mechanism
  if (currentStrength === 3 && pseudoAnalysis.confidence >= 0.4) {
    newVerdict = "UNCERTAIN";
    newConfidence = Math.min(originalConfidence, 40);
    escalationReason = `Claimed mechanism (${pseudoAnalysis.categories.join(", ")}) lacks scientific basis`;
  }

  return { verdict: newVerdict, confidence: newConfidence, escalationReason };
}

/**
 * Determine article-level verdict considering pseudoscience
 *
 * Verdict Calibration:
 * - FALSE: Only for 99%+ certainty (definitively proven false, e.g., "2+2=5")
 * - REFUTED: Strong evidence against, scientific consensus disagrees (70-98%)
 * - MISLEADING: Contains misleading elements, mixes true/false, lacks support
 * - MOSTLY-CREDIBLE: Generally accurate with minor issues
 * - CREDIBLE: Well-supported by evidence
 */
function calculateArticleVerdictWithPseudoscience(
  claimVerdicts: Array<{
    verdict: string;
    confidence: number;
    isPseudoscience?: boolean;
  }>,
  pseudoAnalysis: PseudoscienceAnalysis,
): { verdict: string; confidence: number; reason?: string } {
  const refutedCount = claimVerdicts.filter(
    (v) => v.verdict === "REFUTED" || v.verdict === "FALSE",
  ).length;
  const uncertainCount = claimVerdicts.filter(
    (v) => v.verdict === "UNCERTAIN",
  ).length;
  const supportedCount = claimVerdicts.filter(
    (v) =>
      v.verdict === "WELL-SUPPORTED" || v.verdict === "PARTIALLY-SUPPORTED",
  ).length;
  const total = claimVerdicts.length;

  // If pseudoscience detected at article level
  if (pseudoAnalysis.isPseudoscience && pseudoAnalysis.confidence >= 0.5) {
    // Pseudoscience -> REFUTED (not FALSE - that requires 99%+ certainty)
    // We can't prove a negative with absolute certainty, but we can say claims lack scientific basis
    if (
      uncertainCount >= total * 0.5 &&
      pseudoAnalysis.debunkIndicatorsFound.length >= 1
    ) {
      return {
        verdict: "REFUTED",
        confidence: Math.min(
          85,
          70 + pseudoAnalysis.debunkIndicatorsFound.length * 5,
        ), // Cap at 85%
        reason: `Claims based on pseudoscience (${pseudoAnalysis.categories.join(", ")}) - contradicted by scientific consensus`,
      };
    }

    // If any pseudoscience claims and debunk found
    if (pseudoAnalysis.debunkIndicatorsFound.length >= 1) {
      const avgConfidence =
        claimVerdicts.reduce((sum, v) => sum + v.confidence, 0) / total;
      return {
        verdict: "REFUTED",
        confidence: Math.min(avgConfidence, 90), // Cap confidence
        reason: `Contains pseudoscientific claims (${pseudoAnalysis.categories.join(", ")}) - no scientific basis`,
      };
    }

    // Pseudoscience patterns but no explicit debunk found -> MISLEADING
    return {
      verdict: "MISLEADING",
      confidence: 70,
      reason: `Claims rely on unproven mechanisms (${pseudoAnalysis.categories.join(", ")})`,
    };
  }

  // Standard verdict calculation (also updated for proper calibration)
  if (refutedCount >= total * 0.8) {
    // Only FALSE if nearly all claims are definitively refuted
    return { verdict: "REFUTED", confidence: 85 }; // Changed from FALSE
  }
  if (refutedCount >= total * 0.5) {
    return { verdict: "REFUTED", confidence: 80 };
  }
  if (refutedCount > 0 || uncertainCount >= total * 0.5) {
    return { verdict: "MISLEADING", confidence: 70 };
  }
  if (supportedCount >= total * 0.7) {
    return { verdict: "CREDIBLE", confidence: 80 };
  }
  return { verdict: "MOSTLY-CREDIBLE", confidence: 65 };
}

// ============================================================================
// 7-POINT TRUTH SCALE (Symmetric, neutral)
// ============================================================================

/**
 * SYMMETRIC 7-LEVEL SCALE (centered on 50%):
 *
 * | Range    | Verdict       | Score |
 * |----------|---------------|-------|
 * | 86-100%  | True          | +3    |
 * | 72-85%   | Mostly True   | +2    |
 * | 58-71%   | Leaning True  | +1    |
 * | 43-57%   | Unverified    |  0    |
 * | 29-42%   | Leaning False | -1    |
 * | 15-28%   | Mostly False  | -2    |
 * | 0-14%    | False         | -3    |
 */

type ClaimVerdict7Point =
  | "TRUE" // 86-100%, Score +3
  | "MOSTLY-TRUE" // 72-85%,  Score +2
  | "LEANING-TRUE" // 58-71%,  Score +1
  | "UNVERIFIED" // 43-57%,  Score  0
  | "LEANING-FALSE" // 29-42%,  Score -1
  | "MOSTLY-FALSE" // 15-28%,  Score -2
  | "FALSE"; // 0-14%,   Score -3

type QuestionAnswer7Point =
  | "YES" // 86-100%, Score +3
  | "MOSTLY-YES" // 72-85%,  Score +2
  | "LEANING-YES" // 58-71%,  Score +1
  | "UNVERIFIED" // 43-57%,  Score  0
  | "LEANING-NO" // 29-42%,  Score -1
  | "MOSTLY-NO" // 15-28%,  Score -2
  | "NO"; // 0-14%,   Score -3

type ArticleVerdict7Point =
  | "TRUE" // 86-100%, Score +3
  | "MOSTLY-TRUE" // 72-85%,  Score +2
  | "LEANING-TRUE" // 58-71%,  Score +1
  | "UNVERIFIED" // 43-57%,  Score  0
  | "LEANING-FALSE" // 29-42%,  Score -1
  | "MOSTLY-FALSE" // 15-28%,  Score -2
  | "FALSE"; // 0-14%,   Score -3

/**
 * Calculate truth percentage from LLM verdict + confidence
 * Returns 0-100% on symmetric scale
 */
function calculateTruthPercentage(
  llmVerdict: string,
  llmConfidence: number,
): number {
  // Normalize: if LLM returned decimal (0-1), convert to percentage (0-100)
  const normalizedConfidence = llmConfidence <= 1 && llmConfidence > 0
    ? llmConfidence * 100
    : llmConfidence;
  const conf = Math.max(0, Math.min(100, normalizedConfidence)) / 100;

  switch (llmVerdict) {
    case "WELL-SUPPORTED":
      // Strong support → 72-100% (MOSTLY-TRUE to TRUE)
      return Math.round(72 + 28 * conf);

    case "PARTIALLY-SUPPORTED":
      // Partial → 50-85% (UNVERIFIED to MOSTLY-TRUE)
      return Math.round(50 + 35 * conf);

    case "UNCERTAIN":
      // Uncertain → 35-65% (around UNVERIFIED)
      return Math.round(35 + 30 * conf);

    case "REFUTED":
    case "FALSE":
      // Refuted → 0-28% (higher confidence = lower truth)
      return Math.round(28 * (1 - conf));

    default:
      return 50;
  }
}

/**
 * Calculate truth percentage for question answers
 */
function calculateQuestionTruthPercentage(
  llmAnswer: string,
  llmConfidence: number,
): number {
  // Normalize: if LLM returned decimal (0-1), convert to percentage (0-100)
  const normalizedConfidence = llmConfidence <= 1 && llmConfidence > 0
    ? llmConfidence * 100
    : llmConfidence;
  const conf = Math.max(0, Math.min(100, normalizedConfidence)) / 100;

  switch (llmAnswer) {
    case "YES":
      return Math.round(72 + 28 * conf);
    case "PARTIALLY":
      return Math.round(43 + 28 * conf);
    case "NO":
      return Math.round(28 * (1 - conf));
    case "INSUFFICIENT-EVIDENCE":
      return 50;
    default:
      return 50;
  }
}

/**
 * Map truth percentage to 7-point claim verdict
 */
function percentageToClaimVerdict(truthPercentage: number): ClaimVerdict7Point {
  if (truthPercentage >= 86) return "TRUE";
  if (truthPercentage >= 72) return "MOSTLY-TRUE";
  if (truthPercentage >= 58) return "LEANING-TRUE";
  if (truthPercentage >= 43) return "UNVERIFIED";
  if (truthPercentage >= 29) return "LEANING-FALSE";
  if (truthPercentage >= 15) return "MOSTLY-FALSE";
  return "FALSE";
}

/**
 * Map truth percentage to question answer
 */
function percentageToQuestionAnswer(
  truthPercentage: number,
): QuestionAnswer7Point {
  if (truthPercentage >= 86) return "YES";
  if (truthPercentage >= 72) return "MOSTLY-YES";
  if (truthPercentage >= 58) return "LEANING-YES";
  if (truthPercentage >= 43) return "UNVERIFIED";
  if (truthPercentage >= 29) return "LEANING-NO";
  if (truthPercentage >= 15) return "MOSTLY-NO";
  return "NO";
}

/**
 * Map truth percentage to article verdict
 */
function percentageToArticleVerdict(
  truthPercentage: number,
): ArticleVerdict7Point {
  if (truthPercentage >= 86) return "TRUE";
  if (truthPercentage >= 72) return "MOSTLY-TRUE";
  if (truthPercentage >= 58) return "LEANING-TRUE";
  if (truthPercentage >= 43) return "UNVERIFIED";
  if (truthPercentage >= 29) return "LEANING-FALSE";
  if (truthPercentage >= 15) return "MOSTLY-FALSE";
  return "FALSE";
}

/**
 * Calculate article truth percentage from LLM article verdict
 */
function calculateArticleTruthPercentage(
  llmVerdict: string,
  llmConfidence: number,
): number {
  const conf = Math.max(0, Math.min(100, llmConfidence)) / 100;

  switch (llmVerdict) {
    case "CREDIBLE":
    case "TRUE":
      return Math.round(72 + 28 * conf);
    case "MOSTLY-CREDIBLE":
    case "MOSTLY-TRUE":
      return Math.round(58 + 27 * conf);
    case "MISLEADING":
      // MISLEADING = false-side (15-42% range)
      // Higher confidence = MORE false = LOWER truth %
      return Math.round(42 - 27 * conf);
    case "MOSTLY-FALSE":
    case "LEANING-FALSE":
      return Math.round(15 + 14 * (1 - conf));
    case "FALSE":
    case "REFUTED":
      return Math.round(14 * (1 - conf));
    default:
      return 50; // Will be replaced by claims average if different
  }
}

/**
 * Legacy: Map confidence to claim verdict (for backward compatibility)
 */
function calibrateClaimVerdict(
  llmVerdict: string,
  confidence: number,
): ClaimVerdict7Point {
  const truthPct = calculateTruthPercentage(llmVerdict, confidence);
  return percentageToClaimVerdict(truthPct);
}

/**
 * Legacy: Map confidence to question answer (for backward compatibility)
 */
function calibrateQuestionAnswer(
  llmAnswer: string,
  confidence: number,
): QuestionAnswer7Point {
  const truthPct = calculateQuestionTruthPercentage(llmAnswer, confidence);
  return percentageToQuestionAnswer(truthPct);
}

/**
 * Map confidence to article verdict
 */
function calibrateArticleVerdict(
  llmVerdict: string,
  confidence: number,
): ArticleVerdict7Point {
  // Handle negative verdicts
  if (
    llmVerdict === "FALSE" ||
    llmVerdict === "REFUTED" ||
    llmVerdict === "FALSE"
  ) {
    if (confidence >= 95) return "FALSE";
    if (confidence >= 75) return "FALSE";
    if (confidence >= 55) return "MOSTLY-FALSE";
    return "UNVERIFIED";
  }

  if (llmVerdict === "MISLEADING") {
    if (confidence >= 75) return "MOSTLY-FALSE";
    if (confidence >= 55) return "LEANING-TRUE";
    return "UNVERIFIED";
  }

  if (llmVerdict === "MOSTLY-CREDIBLE") {
    if (confidence >= 75) return "MOSTLY-TRUE";
    return "LEANING-TRUE";
  }

  if (llmVerdict === "CREDIBLE") {
    if (confidence >= 95) return "TRUE";
    if (confidence >= 75) return "MOSTLY-TRUE";
    return "LEANING-TRUE";
  }

  // Default
  if (confidence >= 95) return "TRUE";
  if (confidence >= 75) return "MOSTLY-TRUE";
  if (confidence >= 55) return "LEANING-TRUE";
  if (confidence >= 45) return "UNVERIFIED";
  if (confidence >= 25) return "MOSTLY-FALSE";
  if (confidence >= 5) return "FALSE";
  return "FALSE";
}

/**
 * Get color for 7-level verdict display
 */
function getVerdictColor(verdict: string): {
  bg: string;
  text: string;
  border: string;
} {
  switch (verdict) {
    case "TRUE":
    case "YES":
      return { bg: "#d4edda", text: "#155724", border: "#28a745" }; // Green
    case "MOSTLY-TRUE":
    case "MOSTLY-YES":
      return { bg: "#e8f5e9", text: "#2e7d32", border: "#66bb6a" }; // Light green
    case "LEANING-TRUE":
    case "LEANING-YES":
      return { bg: "#fff9c4", text: "#f57f17", border: "#ffeb3b" }; // Yellow
    case "UNVERIFIED":
      return { bg: "#fff3e0", text: "#e65100", border: "#ff9800" }; // Orange
    case "LEANING-FALSE":
    case "LEANING-NO":
      return { bg: "#ffccbc", text: "#bf360c", border: "#ff5722" }; // Dark orange
    case "MOSTLY-FALSE":
    case "MOSTLY-NO":
      return { bg: "#ffcdd2", text: "#c62828", border: "#f44336" }; // Red
    case "FALSE":
    case "NO":
      return { bg: "#b71c1c", text: "#ffffff", border: "#b71c1c" }; // Dark red
    default:
      return { bg: "#fff3e0", text: "#e65100", border: "#ff9800" }; // Orange default
  }
}

/**
 * Get highlight color for verdicts
 *
 * Maps 7-point verdicts to 3-color UI system:
 * - Green: TRUE, MOSTLY-TRUE, YES, MOSTLY-YES (well-supported)
 * - Yellow: LEANING-TRUE, LEANING-YES, UNVERIFIED, LEANING-FALSE, LEANING-NO (uncertain)
 * - Red: MOSTLY-FALSE, MOSTLY-NO, FALSE, NO (refuted)
 */
function getHighlightColor7Point(
  verdict: string,
): "green" | "yellow" | "red" {
  switch (verdict) {
    // Green: Well-supported
    case "TRUE":
    case "YES":
    case "MOSTLY-TRUE":
    case "MOSTLY-YES":
    case "WELL-SUPPORTED":
      return "green";
    // Yellow: Uncertain/Partial
    case "LEANING-TRUE":
    case "LEANING-YES":
    case "UNVERIFIED":
    case "LEANING-FALSE":
    case "LEANING-NO":
    case "PARTIALLY-SUPPORTED":
    case "UNCERTAIN":
      return "yellow";
    // Red: Refuted
    case "MOSTLY-FALSE":
    case "MOSTLY-NO":
    case "FALSE":
    case "NO":
    case "REFUTED":
      return "red";
    default:
      return "yellow";
  }
}

// ============================================================================
// TYPES
// ============================================================================

type InputType = "question" | "claim" | "article";
type QuestionIntent = "verification" | "exploration" | "comparison" | "none";
type ClaimRole = "attribution" | "source" | "timing" | "core" | "unknown";

interface DecisionMaker {
  name: string;
  role: string;
  affiliation: string;
}

interface DistinctProceeding {
  id: string;
  name: string;
  shortName: string;
  court: string;
  jurisdiction: string;
  date: string;
  subject: string;
  charges: string[];
  outcome: string;
  status: "concluded" | "ongoing" | "pending" | "unknown";
  // NEW: Track decision-makers for conflict detection
  decisionMakers: DecisionMaker[];
}

interface KeyFactor {
  factor: string;
  supports: "yes" | "no" | "neutral";
  explanation: string;
  isContested: boolean;
  contestedBy: string;
  contestationReason: string;
  factualBasis: "established" | "disputed" | "alleged" | "opinion" | "unknown";
}

interface FactorAnalysis {
  positiveFactors: number;
  negativeFactors: number;
  neutralFactors: number;
  contestedNegatives: number;
  verdictExplanation: string;
}

interface ProceedingAnswer {
  proceedingId: string;
  proceedingName: string;
  // Original LLM answer (for debugging)
  llmAnswer?: "YES" | "NO" | "PARTIALLY" | "INSUFFICIENT-EVIDENCE";
  // Calibrated 7-point answer
  answer: QuestionAnswer7Point;
  confidence: number;
  // Truth percentage for display (0-100%)
  truthPercentage: number;
  shortAnswer: string;
  keyFactors: KeyFactor[];
  factorAnalysis?: FactorAnalysis;
}

// NEW v2.4.3: Search tracking
interface SearchQuery {
  query: string;
  iteration: number;
  focus: string;
  resultsCount: number;
  timestamp: string;
  searchProvider?: string;
}

interface ResearchState {
  originalInput: string;
  originalText: string;
  inputType: "text" | "url";
  understanding: ClaimUnderstanding | null;
  iterations: ResearchIteration[];
  facts: ExtractedFact[];
  sources: FetchedSource[];
  contradictionSearchPerformed: boolean;
  contradictionSourcesFound: number;
  // NEW v2.4.3: Track all searches
  searchQueries: SearchQuery[];
  // NEW v2.6.6: Track LLM calls
  llmCalls: number;
  // NEW v2.6.18: Track which research questions have been searched
  researchQuestionsSearched: Set<number>;
  // NEW v2.6.18: Track if decision-maker search was performed
  decisionMakerSearchPerformed: boolean;
}

interface ClaimUnderstanding {
  detectedInputType: InputType;
  questionIntent: QuestionIntent;
  questionBeingAsked: string;
  impliedClaim: string;

  distinctProceedings: DistinctProceeding[];
  requiresSeparateAnalysis: boolean;
  proceedingContext: string;

  mainQuestion: string;
  articleThesis: string;
  subClaims: Array<{
    id: string;
    text: string;
    type: "legal" | "procedural" | "factual" | "evaluative";
    claimRole: ClaimRole;
    dependsOn: string[];
    keyEntities: string[];
    // Three-attribute assessment for claim importance
    checkWorthiness: "high" | "medium" | "low"; // Is it a factual assertion a reader would question?
    harmPotential: "high" | "medium" | "low";   // Does it impact high-stakes areas?
    centrality: "high" | "medium" | "low";      // Is it pivotal to the author's argument?
    isCentral: boolean; // Derived: true only if harmPotential OR centrality is "high"
    relatedProceedingId: string;
    approximatePosition: string;
    keyFactorId: string; // empty string if not mapped to any factor
  }>;
  distinctEvents: Array<{
    name: string;
    date: string;
    description: string;
  }>;
  legalFrameworks: string[];
  researchQuestions: string[];
  riskTier: "A" | "B" | "C";
  // NEW: KeyFactors discovered during understanding phase
  keyFactors: Array<{
    id: string;
    question: string;
    factor: string;
    category: "procedural" | "evidential" | "methodological" | "factual" | "evaluative";
  }>;
  // Gate 1 statistics (POC1 quality gate)
  gate1Stats?: {
    total: number;
    passed: number;
    filtered: number;
    centralKept: number;
  };
}

interface ResearchIteration {
  number: number;
  focus: string;
  queries: string[];
  sourcesFound: number;
  factsExtracted: number;
}

interface ExtractedFact {
  id: string;
  fact: string;
  category:
    | "legal_provision"
    | "evidence"
    | "expert_quote"
    | "statistic"
    | "event"
    | "criticism";
  specificity: "high" | "medium";
  sourceId: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceExcerpt: string;
  relatedProceedingId?: string;
  isContestedClaim?: boolean;
  claimSource?: string;
}

interface FetchedSource {
  id: string;
  url: string;
  title: string;
  trackRecordScore: number | null;
  fullText: string;
  fetchedAt: string;
  category: string;
  fetchSuccess: boolean;
  searchQuery?: string; // Which query found this
}

interface ClaimVerdict {
  claimId: string;
  claimText: string;
  isCentral: boolean;
  // NEW: Claim role and dependencies
  claimRole?: "attribution" | "source" | "timing" | "core";
  dependsOn?: string[]; // Claim IDs this depends on
  dependencyFailed?: boolean; // True if a prerequisite claim was false
  failedDependencies?: string[]; // Which dependencies failed
  // Original LLM verdict (for debugging)
  llmVerdict:
    | "WELL-SUPPORTED"
    | "PARTIALLY-SUPPORTED"
    | "UNCERTAIN"
    | "REFUTED";
  // Calibrated 7-point verdict
  verdict: ClaimVerdict7Point;
  // LLM's confidence in the verdict (internal use)
  confidence: number;
  // Truth percentage for display (0-100% where 100 = completely true)
  truthPercentage: number;
  // Evidence weighting derived from source track record scores
  evidenceWeight?: number;
  riskTier: "A" | "B" | "C";
  reasoning: string;
  supportingFactIds: string[];
  keyFactorId?: string; // Maps claim to KeyFactor for aggregation
  relatedProceedingId?: string;
  startOffset?: number;
  endOffset?: number;
  highlightColor: "green" | "yellow" | "red";
  isPseudoscience?: boolean;
  escalationReason?: string;
  isContested?: boolean;
  contestedBy?: string;
  factualBasis?: "established" | "disputed" | "alleged" | "opinion" | "unknown";
}

interface QuestionAnswer {
  question: string;
  // Original LLM answer (for debugging)
  llmAnswer: "YES" | "NO" | "PARTIALLY" | "INSUFFICIENT-EVIDENCE";
  // Calibrated 7-point answer
  answer: QuestionAnswer7Point;
  confidence: number;
  // Truth percentage for display (0-100%)
  truthPercentage: number;
  shortAnswer: string;
  nuancedAnswer: string;
  keyFactors: KeyFactor[];

  hasMultipleProceedings: boolean;
  proceedingAnswers?: ProceedingAnswer[];
  proceedingSummary?: string;
  calibrationNote?: string;
  hasContestedFactors?: boolean;
}

interface ArticleAnalysis {
  inputType: InputType;
  isQuestion: boolean;
  questionAnswer?: QuestionAnswer;

  hasMultipleProceedings: boolean;
  proceedings?: DistinctProceeding[];

  articleThesis: string;
  logicalFallacies: Array<{
    type: string;
    description: string;
    affectedClaims: string[];
  }>;

  // CLAIMS SUMMARY (average of individual claim verdicts)
  claimsAverageTruthPercentage: number;
  claimsAverageVerdict: ArticleVerdict7Point;

  // ARTICLE VERDICT (LLM's independent assessment of thesis/conclusion)
  // May differ from claims average! E.g., true facts used to support false conclusion
  articleTruthPercentage: number;
  articleVerdict: ArticleVerdict7Point;
  articleVerdictReason?: string;

  // Original LLM outputs (for debugging)
  llmArticleVerdict?: string;
  llmArticleConfidence?: number;

  claimPattern: {
    total: number;
    supported: number;
    uncertain: number;
    refuted: number;
    centralClaimsSupported: number;
    centralClaimsTotal: number;
  };
  // Pseudoscience detection (v2.4.6+)
  isPseudoscience?: boolean;
  pseudoscienceCategories?: string[];
  // NEW v2.6.18: Key Factors for article mode (unified with question mode)
  // Generated when topic involves legal/procedural/institutional analysis
  keyFactors?: KeyFactor[];
  hasContestedFactors?: boolean;
}

interface TwoPanelSummary {
  articleSummary: {
    title: string;
    source: string;
    mainArgument: string;
    keyFindings: string[];
    reasoning: string;
    conclusion: string;
  };
  factharborAnalysis: {
    sourceCredibility: string;
    claimVerdicts: Array<{
      claim: string;
      verdict: ClaimVerdict7Point;
      truthPercentage: number;
    }>;
    methodologyAssessment: string;
    overallVerdict: string;
    analysisId: string;
  };
}

// ============================================================================
// SOURCE TRACK RECORD (Configurable via FH_SOURCE_BUNDLE_PATH)
// ============================================================================

/**
 * Source reliability scores loaded from FH_SOURCE_BUNDLE_PATH
 * No hard-coded scores - all scores must come from the configured bundle.
 * If no bundle is configured, all sources return null (unknown reliability).
 */
let SOURCE_TRACK_RECORDS: Record<string, number> = {};

/**
 * Load source reliability scores from external bundle if configured
 */
function loadSourceBundle(): void {
  if (!CONFIG.sourceBundlePath) {
    console.log(
      `[FactHarbor] No source bundle configured (FH_SOURCE_BUNDLE_PATH not set)`,
    );
    return;
  }

  try {
    const bundlePath = path.resolve(CONFIG.sourceBundlePath);
    if (fs.existsSync(bundlePath)) {
      const bundle = JSON.parse(fs.readFileSync(bundlePath, "utf-8"));
      if (bundle.sources && typeof bundle.sources === "object") {
        SOURCE_TRACK_RECORDS = bundle.sources;
        console.log(
          `[FactHarbor] Loaded ${Object.keys(bundle.sources).length} source scores from bundle`,
        );
      }
    } else {
      console.warn(`[FactHarbor] Source bundle not found: ${bundlePath}`);
    }
  } catch (err) {
    console.error(`[FactHarbor] Failed to load source bundle:`, err);
  }
}

// Load source bundle at startup
loadSourceBundle();

/**
 * Get track record score for a URL
 * Returns score from bundle if available, otherwise null (unknown).
 */
function getTrackRecordScore(url: string): number | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");

    // Check exact match from bundle
    if (SOURCE_TRACK_RECORDS[hostname] !== undefined) {
      return SOURCE_TRACK_RECORDS[hostname];
    }

    // Check subdomain match from bundle
    for (const [domain, score] of Object.entries(SOURCE_TRACK_RECORDS)) {
      if (hostname.endsWith("." + domain)) return score;
    }

    // No default - unknown reliability
    return null;
  } catch {
    return null;
  }
}

function applyEvidenceWeighting(
  claimVerdicts: ClaimVerdict[],
  facts: ExtractedFact[],
  sources: FetchedSource[],
): ClaimVerdict[] {
  const sourceScoreById = new Map(
    sources.map((s) => [s.id, s.trackRecordScore]),
  );
  const factScoreById = new Map(
    facts.map((f) => [f.id, sourceScoreById.get(f.sourceId) ?? null]),
  );

  return claimVerdicts.map((verdict) => {
    const factIds = verdict.supportingFactIds ?? [];
    const scores = factIds
      .map((id) => factScoreById.get(id))
      .filter((score): score is number => typeof score === "number");

    if (scores.length === 0) return verdict;

    const avg = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const adjustedTruth = Math.round(50 + (verdict.truthPercentage - 50) * avg);
    const adjustedConfidence = Math.round(verdict.confidence * (0.5 + avg / 2));
    const adjustedVerdict = percentageToClaimVerdict(adjustedTruth);

    return {
      ...verdict,
      evidenceWeight: avg,
      truthPercentage: adjustedTruth,
      confidence: adjustedConfidence,
      verdict: adjustedVerdict,
      highlightColor: getHighlightColor7Point(adjustedVerdict),
    };
  });
}

// ============================================================================
// TOPIC DETECTION (for unified analysis)
// ============================================================================

/**
 * Detect if the topic involves procedural/legal/institutional analysis
 * This determines whether Key Factors should be generated (unified with question mode)
 *
 * Key Factors are appropriate for topics involving:
 * - Legal proceedings (trials, court decisions, rulings)
 * - Institutional processes (government actions, regulatory decisions)
 * - Procedural fairness (due process, impartiality, evidence basis)
 * - Political/governmental actions with legal implications
 */
function detectProceduralTopic(understanding: ClaimUnderstanding, originalText: string): boolean {
  // Check 1: Has distinct proceedings detected
  if (understanding.distinctProceedings && understanding.distinctProceedings.length > 0) {
    return true;
  }

  // Check 2: Has legal frameworks identified
  if (understanding.legalFrameworks && understanding.legalFrameworks.length > 0) {
    return true;
  }

  // Check 3: Claims are predominantly legal/procedural type
  const legalProceduralClaims = understanding.subClaims.filter(
    (c: any) => c.type === "legal" || c.type === "procedural"
  );
  if (legalProceduralClaims.length >= understanding.subClaims.length * 0.4) {
    return true;
  }

  // Check 4: Text contains procedural/legal keywords
  const proceduralKeywords = [
    /\b(trial|court|judge|ruling|verdict|sentence|conviction|acquittal)\b/i,
    /\b(lawsuit|litigation|prosecution|defendant|plaintiff)\b/i,
    /\b(due process|fair trial|impartial|jurisdiction)\b/i,
    /\b(electoral|election|ballot|vote|ineligibility)\b/i,
    /\b(investigation|indictment|charges|allegations)\b/i,
    /\b(supreme court|federal court|tribunal|justice)\b/i,
    /\b(constitutional|legislation|statute|law|legal)\b/i,
    /\b(regulatory|agency|commission|board|authority)\b/i,
    /\b(proceeding|hearing|testimony|evidence|witness)\b/i,
  ];

  const textToCheck = `${understanding.articleThesis} ${originalText}`.toLowerCase();
  const keywordMatches = proceduralKeywords.filter(pattern => pattern.test(textToCheck));

  // If 3+ procedural keywords found, it's a procedural topic
  if (keywordMatches.length >= 3) {
    return true;
  }

  return false;
}

// ============================================================================
// STEP 1: UNDERSTAND
// ============================================================================

// NOTE: OpenAI structured output requires ALL properties to be in "required" array.
// Using union types with explicit "unknown" or empty values instead of nullable/optional.
const SUBCLAIM_SCHEMA = z.object({
  id: z.string(),
  text: z.string(),
  type: z.enum(["legal", "procedural", "factual", "evaluative"]),
  claimRole: z.enum(["attribution", "source", "timing", "core", "unknown"]),
  dependsOn: z.array(z.string()), // empty array if no dependencies
  keyEntities: z.array(z.string()),
  // Three-attribute assessment
  checkWorthiness: z.enum(["high", "medium", "low"]),
  harmPotential: z.enum(["high", "medium", "low"]),
  centrality: z.enum(["high", "medium", "low"]),
  isCentral: z.boolean(), // true only if harmPotential OR centrality is "high"
  relatedProceedingId: z.string(), // empty string if not applicable
  approximatePosition: z.string(), // empty string if not applicable
  keyFactorId: z.string(), // empty string if not mapped to any factor
});

const UNDERSTANDING_SCHEMA = z.object({
  detectedInputType: z.enum(["question", "claim", "article"]),
  questionIntent: z.enum(["verification", "exploration", "comparison", "none"]),
  questionBeingAsked: z.string(), // empty string if not applicable
  impliedClaim: z.string(), // empty string if not applicable

  distinctProceedings: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      shortName: z.string(),
      court: z.string(), // "unknown" if not known
      jurisdiction: z.string(), // "unknown" if not known
      date: z.string(),
      subject: z.string(),
      charges: z.array(z.string()), // empty array if none
      outcome: z.string(), // "pending" or "unknown" if not known
      status: z.enum(["concluded", "ongoing", "pending", "unknown"]),
      // NEW: Track key decision-makers for conflict detection
      decisionMakers: z.array(
        z.object({
          name: z.string(), // e.g., "Alexandre de Moraes"
          role: z.string(), // e.g., "presiding judge", "rapporteur", "prosecutor"
          affiliation: z.string(), // e.g., "TSE", "STF"
        }),
      ),
    }),
  ),
  requiresSeparateAnalysis: z.boolean(),
  proceedingContext: z.string(), // empty string if not applicable

  mainQuestion: z.string(),
  articleThesis: z.string(),
  subClaims: z.array(SUBCLAIM_SCHEMA),
  distinctEvents: z.array(
    z.object({
      name: z.string(),
      date: z.string(),
      description: z.string(),
    }),
  ),
  legalFrameworks: z.array(z.string()),
  researchQuestions: z.array(z.string()),
  riskTier: z.enum(["A", "B", "C"]),
  // NEW: KeyFactors discovered during understanding phase (emergent, not forced)
  keyFactors: z.array(
    z.object({
      id: z.string(),
      question: z.string(), // The decomposition question (e.g., "Was due process followed?")
      factor: z.string(), // Short label (e.g., "Due Process")
      category: z.enum(["procedural", "evidential", "methodological", "factual", "evaluative"]),
    }),
  ),
});

const SUPPLEMENTAL_SUBCLAIMS_SCHEMA = z.object({
  subClaims: z.array(SUBCLAIM_SCHEMA),
});

const MIN_CENTRAL_CORE_CLAIMS_PER_PROCEEDING = 2;
const MIN_TOTAL_CLAIMS_WITH_SINGLE_CENTRAL = 3;
const SUPPLEMENTAL_REPROMPT_MAX_ATTEMPTS = 1;
const SHORT_SIMPLE_INPUT_MAX_CHARS = 60;

async function understandClaim(
  input: string,
  model: any,
): Promise<ClaimUnderstanding> {
  // Get current date for temporal reasoning
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 1-12
  const currentDay = currentDate.getDate();
  const currentDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
  const currentDateReadable = currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  // Detect recency sensitivity for this analysis
  const recencyMatters = isRecencySensitive(input, undefined);

  const systemPrompt = `You are a fact-checking analyst. Analyze the input with special attention to MULTIPLE DISTINCT EVENTS or PROCEEDINGS.

${recencyMatters ? `## ⚠️ RECENT DATA DETECTED

This input appears to involve recent events, dates, or announcements. When generating research questions:
- **PRIORITIZE**: Questions that will help find the most current information via web search
- **INCLUDE**: Date-specific queries (e.g., "November 2025", "2025", "recent")
- **FOCUS**: Recent developments, current status, latest announcements
- **NOTE**: Web search will be used to find current sources - structure your research questions accordingly

` : ''}## CRITICAL: TEMPORAL REASONING

**CURRENT DATE**: Today is ${currentDateReadable} (${currentDateStr}).

**DATE REASONING RULES**:
- When evaluating dates mentioned in claims, compare them to the CURRENT DATE above
- Do NOT assume dates are in the future without checking against the current date
- A date like "November 2025" is in the PAST if the current date is January 2026 or later
- Do NOT reject claims as "impossible" based on incorrect temporal assumptions
- If a date seems inconsistent, verify it against the current date before making judgments
- When in doubt about temporal relationships, use the evidence from sources rather than making assumptions

**EXAMPLE**: If the current date is January 6, 2026, then "late November 2025" is in the PAST (approximately 6 weeks ago), not the future.

## CRITICAL: ARTICLE THESIS (articleThesis)

The articleThesis should NEUTRALLY SUMMARIZE what the article claims, covering ALL main points.
- Include ALL major claims, not just one
- Use neutral language ("claims that", "alleges that")
- Keep the source attribution ("according to X", "allegedly from Y")
- Example: "The article claims FDA official Prasad announced stricter vaccine regulations and alleges an internal review found child deaths linked to vaccines."

## CRITICAL: CLAIM STRUCTURE ANALYSIS

When extracting claims, identify their ROLE and DEPENDENCIES:

### Claim Roles:
- **attribution**: WHO said it (person's identity, role) - e.g., "Vinay Prasad is CBER director"
- **source**: WHERE/HOW it was communicated (document type, channel) - e.g., "in an internal email"
- **timing**: WHEN it happened - e.g., "in late November"
- **core**: THE ACTUAL VERIFIABLE ASSERTION - MUST be isolated from source/attribution

### CRITICAL: ISOLATING CORE CLAIMS

Core claims must be PURE FACTUAL ASSERTIONS without embedded source/attribution:
- WRONG: "An internal FDA review found that 10 children died from vaccines" (embeds source)
- CORRECT: "At least 10 children died because of COVID-19 vaccines" (pure factual claim)

The source attribution belongs in a SEPARATE claim:
- SC1: "An internal FDA review exists" (source claim)
- SC2: "At least 10 children died because of COVID-19 vaccines" (core claim, depends on SC1)

### CRITICAL: SEPARATING ATTRIBUTION FROM EVALUATIVE CONTENT

**THIS IS MANDATORY** - When someone CRITICIZES, CLAIMS, or ASSERTS something, YOU MUST create separate claims:
1. The FACT that they said/criticized it (attribution - verifiable: did they say it?)
2. The CONTENT of what they said (the actual claim to verify - is it TRUE?)

**NEVER CREATE CLAIMS LIKE THESE** (they conflate attribution with content):
❌ WRONG: "Dr. Prasad criticized FDA processes as based on weak and misleading science"
❌ WRONG: "Expert claims the treatment is dangerous"
❌ WRONG: "Study found that X causes Y"

**ALWAYS SPLIT INTO TWO CLAIMS:**

Example 1: "Dr. Prasad criticized FDA processes as based on weak science"
✅ SC-A: "Dr. Prasad has publicly criticized past FDA processes"
   → claimRole: "attribution", type: "factual", centrality: LOW
   → Verifies: Did Prasad make critical statements about FDA?
✅ SC-B: "Past FDA processes were based on weak and misleading science"
   → claimRole: "core", type: "evaluative", centrality: HIGH, dependsOn: ["SC-A"]
   → Verifies: Is this assessment ACCURATE based on evidence?

Example 2: "An internal review found 10 children died from vaccines"
✅ SC-A: "An internal FDA review exists making claims about child deaths"
   → claimRole: "source", type: "factual", centrality: LOW
✅ SC-B: "At least 10 children died because of COVID-19 vaccines"
   → claimRole: "core", type: "factual", centrality: HIGH, dependsOn: ["SC-A"]
   → This is THE claim readers care about - is it TRUE?

**WHY THIS MATTERS:**
- SC-A (attribution) might be TRUE (yes, he said it)
- SC-B (content) might be FALSE (what he said is wrong)
- If you only verify SC-A, you're NOT fact-checking the article's actual claims!
- The article's credibility depends on SC-B, not SC-A.

### Claim Dependencies (dependsOn):
Core claims often DEPEND on attribution/source/timing claims being true.

EXAMPLE: "CBER director Prasad claimed in an internal memo that 10 children died from vaccines"
- SC1 (attribution): "Vinay Prasad is CBER director" → claimRole: "attribution", dependsOn: []
- SC2 (source): "Prasad sent an internal memo making claims about child deaths" → claimRole: "source", dependsOn: ["SC1"]
- SC3 (core): "At least 10 children died because of COVID-19 vaccines" → claimRole: "core", dependsOn: ["SC2"], isCentral: true

If SC2 is FALSE (no such memo exists), then SC3 has NO evidential basis from this source.

### THREE-ATTRIBUTE CLAIM ASSESSMENT

For EACH claim, assess these three attributes (high/medium/low):

**1. checkWorthiness** - Is it a factual assertion a reader would question?
- HIGH: Specific factual claim that can be verified, readers would want proof
- MEDIUM: Somewhat verifiable but less likely to be questioned
- LOW: Pure opinion with no factual component, or not independently verifiable

NOTE: Broad institutional claims ARE verifiable (checkWorthiness: HIGH):
- "The FDA has acted on weak science" → Can check documented cases, GAO reports, expert analyses
- "The government has lied about X" → Can check historical record, declassified documents
- "Company X has a history of fraud" → Can check court records, SEC filings, news archives
These are not opinions - they're historical assertions that can be fact-checked.

**2. harmPotential** - Does it impact high-stakes areas?
- HIGH: Public health, safety, democratic integrity, financial markets, legal outcomes
- MEDIUM: Affects specific groups or has moderate societal impact
- LOW: Limited impact, affects few people, low stakes

**3. centrality** - Is it pivotal to the author's argument?
- HIGH: Core assertion the argument depends on; removing it collapses the narrative
- MEDIUM: Supports the main argument but not essential
- LOW: Peripheral detail, context, or attribution

**CRITICAL: Source/Attribution claims are NEVER centrality HIGH**
Claims with claimRole "source", "attribution", or "timing" should ALWAYS have centrality: LOW
- "An internal email exists" → centrality: LOW (source claim, not the argument itself)
- "Dr. X is director of Y" → centrality: LOW (attribution, establishes who said it)
- "The statement was made in November" → centrality: LOW (timing detail)

Only CORE claims (claimRole: "core") can have centrality: HIGH
- The existence of a document is not the argument - what the document SAYS is the argument
- Who said something is not the argument - what they SAID is the argument

**CRITICAL: Policy/Action claims that DEPEND on source claims are NOT central**
If a policy claim depends on a source claim being true, it inherits LOW centrality:
- "FDA will impose stricter regulations" (depends on email existing) → centrality: LOW
- "Company will lay off 1000 workers" (depends on memo existing) → centrality: LOW
These are CONDITIONAL claims - they're only meaningful IF the source exists.

The CENTRAL claims are the **factual assertions about real-world impact**:
- "10 children died from vaccines" → centrality: HIGH (factual impact claim)
- "Past FDA processes were based on weak science" → centrality: HIGH (evaluative but verifiable)

**RULE: When multiple claims compete for centrality, ask: "Which claim, if false, would completely undermine the article's credibility?"**
- If "FDA will impose stricter regulations" is false → article is wrong about policy
- If "10 children died from vaccines" is false → article is spreading dangerous misinformation
The second is MORE CENTRAL because it has greater real-world harm potential.

**isCentral = true** ONLY if harmPotential OR centrality is "high"
- checkWorthiness does NOT affect isCentral (a high checkWorthiness alone doesn't make it central)
- However, if checkWorthiness is "low", the claim should NOT be investigated or displayed

**FILTERING RULE**: Claims with checkWorthiness = "low" should be excluded from investigation

**Examples:**

"At least 10 children died because of COVID-19 vaccines"
→ checkWorthiness: HIGH (specific factual claim, readers want proof)
→ harmPotential: HIGH (public health, vaccine safety) ← HIGH
→ centrality: HIGH (core assertion of the article) ← HIGH
→ isCentral: TRUE (harmPotential OR centrality is HIGH)

"FDA will require randomized trials for all vaccines"
→ checkWorthiness: HIGH (policy claim that can be verified)
→ harmPotential: HIGH (affects drug development, public health) ← HIGH
→ centrality: HIGH (major policy change claim) ← HIGH
→ isCentral: TRUE (harmPotential OR centrality is HIGH)

"Prasad is CBER director"
→ claimRole: attribution
→ checkWorthiness: MEDIUM (verifiable but routine)
→ harmPotential: LOW (credential, not harmful if wrong)
→ centrality: LOW (attribution, not the main point)
→ isCentral: FALSE (neither harmPotential nor centrality is HIGH)

"An internal email from Dr. Prasad exists stating the FDA will impose stricter regulations"
→ claimRole: source (establishes document existence)
→ checkWorthiness: HIGH (verifiable - does such email exist?)
→ harmPotential: MEDIUM (affects credibility of subsequent claims)
→ centrality: LOW ← MUST BE LOW - this is a source claim, not the core argument!
→ isCentral: FALSE
→ NOTE: Even though this claim is important as a prerequisite, it's NOT central to the ARGUMENT.
→ The argument is about FDA policy, not about email existence.

"The email was sent on November 28"
→ checkWorthiness: LOW (timing detail) ← LOW = EXCLUDE FROM INVESTIGATION
→ harmPotential: LOW (no significant impact)
→ centrality: LOW (peripheral detail)
→ isCentral: FALSE
→ NOTE: This claim should NOT be investigated or displayed (checkWorthiness is LOW)

"The FDA has acted on weak and misleading science in the past"
→ checkWorthiness: HIGH (historical claim, verifiable via documented cases, GAO reports)
→ harmPotential: HIGH (public health, regulatory trust) ← HIGH
→ centrality: MEDIUM (supports main argument but not the core claim)
→ isCentral: TRUE (harmPotential is HIGH)

"Expert says the policy change is controversial"
→ checkWorthiness: HIGH (verifiable who said what)
→ harmPotential: MEDIUM (affects policy debate)
→ centrality: MEDIUM (contextual, not core)
→ isCentral: FALSE (neither harmPotential nor centrality is HIGH, even though checkWorthiness is HIGH)

### EXAMPLE: Attribution vs Evaluative Content Split

Original text: "Dr. Prasad criticized FDA processes as based on weak science"

CORRECT claim extraction (2 separate claims):

SC5: "Dr. Prasad has publicly criticized past FDA processes"
→ type: factual (did he criticize? YES/NO)
→ claimRole: attribution
→ checkWorthiness: MEDIUM (routine verification)
→ harmPotential: LOW (just confirms he said something)
→ centrality: LOW (attribution only)
→ isCentral: FALSE
→ dependsOn: []

SC6: "Past FDA processes were based on weak and misleading science"
→ type: evaluative (is this assessment accurate?)
→ claimRole: core
→ checkWorthiness: HIGH (historical claim about FDA, verifiable)
→ harmPotential: HIGH (public health, regulatory trust)
→ centrality: HIGH (core evaluative assertion)
→ isCentral: TRUE
→ dependsOn: ["SC5"] (claim originates from Prasad's criticism)

NOTE: SC5 may be TRUE (he did criticize) while SC6 may be UNCERTAIN or PARTIALLY-SUPPORTED.
The system must verify BOTH: (1) did he say it? AND (2) is what he said accurate?

### Dependencies:
1. List dependencies in dependsOn array (claim IDs that must be true for this claim to matter)
2. Core claims typically depend on attribution claims

## MULTI-EVENT DETECTION

Look for multiple court cases, temporal distinctions, or different proceedings.

### BOLSONARO EXAMPLE - MUST DETECT 2 PROCEEDINGS:

1. **TSE-2023**: TSE Electoral Ineligibility Trial
   - Court: Superior Electoral Court (TSE)
   - Date: June 2023
   - Subject: Abuse of political power and media misuse
   - Outcome: 8-year ineligibility
   - Status: concluded
   - decisionMakers: [{ name: "Alexandre de Moraes", role: "presiding judge", affiliation: "TSE" }]

2. **STF-2025**: STF Criminal Trial for Coup Attempt
   - Court: Supreme Federal Court (STF)
   - Date: 2024-2025
   - Subject: Attempted coup d'état
   - Status: concluded
   - decisionMakers: [{ name: "Alexandre de Moraes", role: "rapporteur", affiliation: "STF" }]

**CRITICAL: decisionMakers field is REQUIRED for each proceeding!**
- Extract ALL key decision-makers (judges, prosecutors, rapporteurs) mentioned or known
- Use your background knowledge to fill in known decision-makers for well-documented trials
- This enables cross-proceeding conflict of interest detection

Set requiresSeparateAnalysis = true when multiple proceedings detected.

## FOR QUESTIONS

- **impliedClaim**: What claim would "YES" confirm? Must be AFFIRMATIVE.
  - CORRECT: "The Bolsonaro judgment was fair and based on Brazil's law"
  - WRONG: "may or may not have been fair"

- **subClaims**: Even for questions, generate sub-claims that need to be verified to answer the question.
  - Break down the implied claim into verifiable components
  - For multi-proceeding cases, ensure meaningful coverage across all proceedings (set relatedProceedingId appropriately)
  - **DECOMPOSE COMPOUND CLAIMS**: Split claims that combine multiple assertions into separate claims:
    - Isolate the core factual assertion as the CENTRAL claim (isCentral: true, claimRole: "core")
    - Separate source/attribution claims as non-central (isCentral: false, claimRole: "source" or "attribution")
    - Use dependsOn to link claims to their prerequisites
  - For each proceeding/event, consider claims covering:
    - Correct application (were proper rules/standards/methods applied?)
    - Process fairness (were proper procedures followed?)
    - Evidence basis (were decisions based on evidence?)
    - Decision-maker impartiality (were there any conflicts of interest?)
    - Outcome proportionality (was the outcome proportionate compared to similar cases?)
  - Example for "Was the Bolsonaro judgment fair?":
    - SC1: "The TSE applied Brazilian electoral law correctly" (type: legal, isCentral: true)
    - SC2: "The TSE followed proper due process procedures" (type: procedural, isCentral: true)
    - SC3: "The ruling was based on documented evidence" (type: factual, isCentral: true)
    - SC4: "The decision-makers had no conflicts of interest" (type: procedural, isCentral: true)
    - SC5: "The outcome was proportionate to similar cases" (type: evaluative, isCentral: true)
    - etc.

- **researchQuestions**: Generate specific questions to research, including:
  - Potential conflicts of interest for key decision-makers
  - Comparisons to similar cases or precedents
  - Criticisms and rebuttals with documented evidence

## KEY FACTORS (Emergent Decomposition)

**IMPORTANT**: KeyFactors are OPTIONAL and EMERGENT - only generate them if the thesis naturally decomposes into distinct evaluation dimensions.

${CONFIG.keyFactorHints && CONFIG.keyFactorHints.length > 0
  ? `\n**OPTIONAL HINTS** (you may consider these, but are not required to use them):
The following KeyFactor dimensions have been suggested as potentially relevant. Use them only if they genuinely apply to this thesis. If they don't fit, ignore them and generate factors that actually match the thesis:
${CONFIG.keyFactorHints.map((hint, i) => `- ${hint.factor} (${hint.category}): "${hint.question}"`).join("\n")}`
  : ""}

**WHEN TO GENERATE**: Create keyFactors array when the thesis involves:
- Complex multi-dimensional evaluation (e.g., fairness, legitimacy, effectiveness)
- Topics where truth depends on multiple independent criteria
- Situations requiring structured assessment beyond simple yes/no

**WHEN NOT TO GENERATE**: Leave keyFactors as empty array [] for:
- Simple factual claims ("Did X happen?")
- Single-dimension questions ("Is Y true?")
- Straightforward verifications

**HOW TO GENERATE**: Break down the thesis into 2-5 fundamental questions that must ALL be answered "yes" for the thesis to be true.

**FORMAT**:
- **id**: Unique identifier (KF1, KF2, etc.)
- **question**: The decomposition question (e.g., "Was due process followed?")
- **factor**: Short descriptive label (e.g., "Due Process")
- **category**: Choose from: "procedural", "evidential", "methodological", "factual", "evaluative"

**EXAMPLES**:

For "Was the Bolsonaro trial fair?"
[
  {
    "id": "KF1",
    "question": "Were proper legal procedures and due process followed throughout the trial?",
    "factor": "Procedural Fairness",
    "category": "procedural"
  },
  {
    "id": "KF2",
    "question": "Were decisions based on documented evidence rather than assumptions or bias?",
    "factor": "Evidence Basis",
    "category": "evidential"
  },
  {
    "id": "KF3",
    "question": "Were the judges and decision-makers free from conflicts of interest?",
    "factor": "Impartiality",
    "category": "procedural"
  }
]

For "Does this vaccine cause autism?"
[
  {
    "id": "KF1",
    "question": "Is there documented scientific evidence of a causal mechanism linking vaccines to autism?",
    "factor": "Causal Mechanism",
    "category": "factual"
  },
  {
    "id": "KF2",
    "question": "Do controlled studies and clinical trials support this causal relationship?",
    "factor": "Clinical Evidence",
    "category": "evidential"
  },
  {
    "id": "KF3",
    "question": "What does the scientific consensus and expert opinion conclude about this relationship?",
    "factor": "Scientific Consensus",
    "category": "evaluative"
  }
]
**CLAIM-TO-FACTOR MAPPING**: If you generate keyFactors, map each claim to the most relevant factor using keyFactorId. Claims can only map to one factor. Use empty string "" for claims that don't address any specific factor.`;

  const userPrompt = `Analyze for fact-checking:\n\n"${input}"`;

  let result: any;

  try {
    const startTime = Date.now();
    debugLog("understandClaim: STARTING LLM CALL");
    debugLog("understandClaim: Input (first 100 chars)", input.substring(0, 100));
    debugLog("understandClaim: Model", String(model));

    result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      output: Output.object({ schema: UNDERSTANDING_SCHEMA }),
    });

    const elapsed = Date.now() - startTime;
    debugLog(`understandClaim: LLM CALL COMPLETED in ${elapsed}ms`);
    debugLog("understandClaim: Result keys", result ? Object.keys(result) : "null");

    // Debug: Log the actual result structure
    if (result) {
      debugLog("understandClaim: Has result.output", result.output !== undefined);
      debugLog("understandClaim: Has result._output", result._output !== undefined);
      if (result._output) {
        debugLog("understandClaim: _output preview", JSON.stringify(result._output).substring(0, 500));
      } else if (result.output) {
        debugLog("understandClaim: output preview", JSON.stringify(result.output).substring(0, 500));
      }
    }

    if (result?.usage || result?.totalUsage) {
      debugLog("understandClaim: Token usage", result.usage || result.totalUsage);
    }
    if (elapsed < 1000) {
      debugLog(`understandClaim: WARNING - LLM responded suspiciously fast (${elapsed}ms)`);
    }
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    debugLog("understandClaim: FAILED", errMsg);
    console.error("[Analyzer] generateText failed in understandClaim:", errMsg);

    // Check for specific API errors
    if (errMsg.includes("credit balance is too low") || errMsg.includes("insufficient_quota")) {
      console.error("[Analyzer] ❌ ANTHROPIC API CREDITS EXHAUSTED - Please add credits at https://console.anthropic.com/settings/plans");
      throw new Error("Anthropic API credits exhausted. Please add credits or switch to a different LLM provider (LLM_PROVIDER=openai)");
    }
    if (errMsg.includes("invalid_api_key") || errMsg.includes("401")) {
      console.error("[Analyzer] ❌ INVALID API KEY - Check your ANTHROPIC_API_KEY or OPENAI_API_KEY");
      throw new Error("Invalid API key. Please check your LLM provider API key.");
    }

    // Return a basic understanding if the structured output fails
    throw new Error(`Failed to understand claim: ${errMsg}`);
  }

  // Handle different AI SDK versions - safely extract structured output
  const rawOutput = extractStructuredOutput(result);

  if (!rawOutput) {
    console.error(
      "[Analyzer] No structured output from LLM. Result type:",
      typeof result,
    );
    console.error(
      "[Analyzer] Result keys:",
      result ? Object.keys(result) : "result is null/undefined",
    );
    console.error(
      "[Analyzer] Full result (first 1000 chars):",
      result ? JSON.stringify(result, null, 2).slice(0, 1000) : "null",
    );
    throw new Error("LLM did not return structured output");
  }

  const parsed = rawOutput as z.infer<typeof UNDERSTANDING_SCHEMA>;

  // Post-processing: Force question detection if input clearly looks like a question
  const trimmedInput = input.trim();
  const looksLikeQuestion = trimmedInput.endsWith("?") ||
    /^(was|is|are|were|did|do|does|has|have|had|can|could|will|would|should|may|might)\s/i.test(trimmedInput);

  if (looksLikeQuestion && parsed.detectedInputType !== "question") {
    console.log(`[Analyzer] Overriding detectedInputType from "${parsed.detectedInputType}" to "question" (input ends with ? or starts with question word)`);
    parsed.detectedInputType = "question";
    // Also set questionBeingAsked if not already set
    if (!parsed.questionBeingAsked) {
      parsed.questionBeingAsked = trimmedInput;
    }
  }

  // Post-processing: Fix impliedClaim for questions - convert question to affirmative statement
  if (parsed.detectedInputType === "question") {
    // Check if impliedClaim is still a question (ends with ?) or is missing
    if (!parsed.impliedClaim || parsed.impliedClaim.endsWith("?")) {
      // Convert question to affirmative claim (what "YES" would confirm)
      let affirmativeClaim = trimmedInput
        .replace(/\?+$/, "") // Remove trailing question marks
        .replace(/^(was|is|are|were|did|do|does|has|have|had|can|could|will|would|should|may|might)\s+/i, "")
        .trim();

      // Capitalize first letter
      affirmativeClaim = affirmativeClaim.charAt(0).toUpperCase() + affirmativeClaim.slice(1);

      // Add a verb if missing (simple heuristic)
      if (!/\b(is|are|was|were|has|have|had|will|would|can|could|should|may|might)\b/i.test(affirmativeClaim)) {
        affirmativeClaim = "The " + affirmativeClaim.charAt(0).toLowerCase() + affirmativeClaim.slice(1) + " is true";
      }

      console.log(`[Analyzer] Fixed impliedClaim from question "${parsed.impliedClaim || trimmedInput}" to affirmative: "${affirmativeClaim}"`);
      parsed.impliedClaim = affirmativeClaim;
    }
  }

  // Validate parsed has required fields
  if (!parsed.subClaims || !Array.isArray(parsed.subClaims)) {
    console.error(
      "[Analyzer] Invalid parsed output - missing subClaims:",
      parsed,
    );
    throw new Error("LLM output missing required fields");
  }

  const isShortSimpleNonQuestion =
    parsed.detectedInputType !== "question" &&
    input.trim().length > 0 &&
    input.trim().length <= SHORT_SIMPLE_INPUT_MAX_CHARS &&
    parsed.subClaims.length <= 1 &&
    (parsed.keyFactors?.length ?? 0) <= 1;

  // Post-processing: Re-prompt if coverage is thin (single attempt only)
  // Skip for short, simple non-question inputs.
  if (!isShortSimpleNonQuestion) {
    for (let attempt = 0; attempt < SUPPLEMENTAL_REPROMPT_MAX_ATTEMPTS; attempt++) {
      const supplementalClaims = await requestSupplementalSubClaims(
        input,
        model,
        parsed
      );
      if (supplementalClaims.length === 0) break;
      parsed.subClaims.push(...supplementalClaims);
      console.log(`[Analyzer] Added ${supplementalClaims.length} supplemental claims to balance proceeding coverage`);
      break;
    }
  }

  // Post-processing: Ensure keyEntities are populated for each claim
  for (const claim of parsed.subClaims) {
    if (!claim.keyEntities || claim.keyEntities.length === 0) {
      // Extract key terms from claim text
      const stopWords = new Set(["the", "a", "an", "is", "was", "were", "are", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "shall", "can", "need", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into", "through", "during", "before", "after", "and", "but", "if", "or", "because", "this", "that", "these", "those", "it", "its", "what", "which", "who", "whom", "whose", "based"]);
      const words = claim.text
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((word: string) => word.length > 2 && !stopWords.has(word));
      // Take unique words, prioritize capitalized words from original text
      const capitalizedWords = claim.text
        .match(/[A-Z][a-z]+/g) || [];
      const uniqueTerms = [...new Set([...capitalizedWords, ...words])].slice(0, 5);
      claim.keyEntities = uniqueTerms;
      console.log(`[Analyzer] Auto-populated keyEntities for claim "${claim.id}": ${uniqueTerms.join(", ")}`);
    }
  }

  const claimsWithPositions = parsed.subClaims.map((claim: any) => {
    const positions = findClaimPosition(input, claim.text);
    return {
      ...claim,
      startOffset: positions?.start,
      endOffset: positions?.end,
    };
  });

  // Filter out claims with low checkWorthiness - they should not be investigated or displayed
  const filteredClaims = claimsWithPositions.filter((claim: any) => {
    if (claim.checkWorthiness === "low") {
      console.log(`[Analyzer] Excluding claim "${claim.id}" with low checkWorthiness: "${claim.text.slice(0, 50)}..."`);
      return false;
    }
    return true;
  });

  console.log(`[Analyzer] Filtered ${claimsWithPositions.length - filteredClaims.length} claims with low checkWorthiness, ${filteredClaims.length} remaining`);

  // Apply Gate 1: Claim Validation (filter opinions, predictions, low-specificity claims)
  // CRITICAL: Central claims are NEVER filtered, only flagged for review
  const { validatedClaims, stats: gate1Stats } = applyGate1ToClaims(filteredClaims);
  console.log(`[Analyzer] Gate 1 applied: ${gate1Stats.passed}/${gate1Stats.total} claims passed, ${gate1Stats.centralKept} central claims kept despite issues`);

  return { ...parsed, subClaims: validatedClaims, gate1Stats };
}

async function requestSupplementalSubClaims(
  input: string,
  model: any,
  understanding: ClaimUnderstanding,
): Promise<ClaimUnderstanding["subClaims"]> {
  const proceedings = understanding.distinctProceedings || [];
  const hasProceedings = proceedings.length > 0;
  const isMultiProceeding = proceedings.length > 1;
  const singleProceedingId = proceedings.length === 1 ? proceedings[0].id : "";

  const normalizeText = (text: string) =>
    text.toLowerCase().replace(/\s+/g, " ").trim();

  const claimsByProc = new Map<string, ClaimUnderstanding["subClaims"]>();
  const centralCoreCounts = new Map<string, number>();
  const existingTextByProc = new Map<string, Set<string>>();
  const existingTextGlobal = new Set<string>();

  const coverageTargets = hasProceedings
    ? proceedings.map((proc) => ({ id: proc.id, name: proc.name }))
    : [{ id: "", name: "General" }];

  for (const target of coverageTargets) {
    claimsByProc.set(target.id, []);
    existingTextByProc.set(target.id, new Set());
    centralCoreCounts.set(target.id, 0);
  }

  for (const claim of understanding.subClaims) {
    const normalized = normalizeText(claim.text || "");
    if (normalized) {
      existingTextGlobal.add(normalized);
    }

    let procId = claim.relatedProceedingId || "";
    if (!isMultiProceeding) {
      procId = procId || singleProceedingId;
    }

    if (isMultiProceeding && !procId) continue;
    if (!claimsByProc.has(procId)) continue;

    claimsByProc.get(procId)!.push(claim);
    existingTextByProc.get(procId)!.add(normalized);
    if (claim.isCentral && claim.claimRole === "core") {
      centralCoreCounts.set(procId, (centralCoreCounts.get(procId) || 0) + 1);
    }
  }

  const missingProceedings = coverageTargets
    .map((target) => {
      const totalClaims = claimsByProc.get(target.id)?.length ?? 0;
      const centralCore = centralCoreCounts.get(target.id) || 0;
      const needsCoverage =
        centralCore < MIN_CENTRAL_CORE_CLAIMS_PER_PROCEEDING &&
        !(centralCore === 1 && totalClaims >= MIN_TOTAL_CLAIMS_WITH_SINGLE_CENTRAL);
      return { target, totalClaims, centralCore, needsCoverage };
    })
    .filter((entry) => entry.needsCoverage);

  if (missingProceedings.length === 0) return [];

  const missingSummary = missingProceedings
    .map(({ target, totalClaims, centralCore }) => {
      const neededCentral = Math.max(0, MIN_CENTRAL_CORE_CLAIMS_PER_PROCEEDING - centralCore);
      const label = target.id ? `${target.id}: ${target.name}` : `${target.name}`;
      return `- ${label} (total=${totalClaims}, central core=${centralCore}, need +${neededCentral} central core)`;
    })
    .join("\n");

  const existingClaimsSummary = missingProceedings
    .map(({ target }) => {
      const claims = claimsByProc.get(target.id) || [];
      const label = target.id ? `${target.id}` : `${target.name}`;
      if (claims.length === 0) return `- ${label}: (no claims yet)`;
      return `- ${label}:\n${claims
        .map((claim) => `  - ${claim.id}: ${claim.text}`)
        .join("\n")}`;
    })
    .join("\n");

  const systemPrompt = `You are a fact-checking assistant. Add missing subClaims ONLY for the listed proceedings.
- Return ONLY new claims (do not repeat existing ones).
- Each claim must be tied to a single proceeding via relatedProceedingId.${hasProceedings ? "" : " Use an empty string if no proceedings are listed."}
- Use claimRole="core", checkWorthiness="high", harmPotential="high", centrality="high", isCentral=true.
- Use dependsOn=[] unless a dependency is truly required.
- Ensure each listed proceeding reaches at least ${MIN_CENTRAL_CORE_CLAIMS_PER_PROCEEDING} central core claims.`;

  const userPrompt = `INPUT:\n"${input}"\n\nPROCEEDINGS NEEDING MORE CLAIMS:\n${missingSummary}\n\nEXISTING CLAIMS (DO NOT DUPLICATE):\n${existingClaimsSummary}`;

  let supplemental: any;
  try {
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      output: Output.object({ schema: SUPPLEMENTAL_SUBCLAIMS_SCHEMA }),
    });

    supplemental = extractStructuredOutput(result);
  } catch (err: any) {
    debugLog("requestSupplementalSubClaims: FAILED", err?.message || String(err));
    return [];
  }

  if (!supplemental?.subClaims || !Array.isArray(supplemental.subClaims)) {
    debugLog("requestSupplementalSubClaims: No supplemental claims returned");
    return [];
  }

  const allowedProcIds = new Set(missingProceedings.map((entry) => entry.target.id));
  const existingIds = new Set(understanding.subClaims.map((c) => c.id));
  const idRemap = new Map<string, string>();

  let maxId = 0;
  for (const claim of understanding.subClaims) {
    const match = /^SC(\d+)$/i.exec(claim.id || "");
    if (match) {
      const num = Number(match[1]);
      if (!Number.isNaN(num)) maxId = Math.max(maxId, num);
    }
  }

  const nextId = () => {
    let candidate = `SC${++maxId}`;
    while (existingIds.has(candidate)) {
      candidate = `SC${++maxId}`;
    }
    return candidate;
  };

  const supplementalClaims: ClaimUnderstanding["subClaims"] = [];
  for (const claim of supplemental.subClaims) {
    let procId = claim?.relatedProceedingId || "";
    if (!isMultiProceeding) {
      procId = procId || singleProceedingId;
    }
    if (isMultiProceeding && !procId) {
      continue;
    }
    if (!allowedProcIds.has(procId)) {
      continue;
    }

    const normalized = normalizeText(claim.text || "");
    if (!normalized) continue;

    if (existingTextGlobal.has(normalized)) continue;

    const existingTexts = existingTextByProc.get(procId) || new Set();
    if (existingTexts.has(normalized)) continue;

    let newId = claim.id || "";
    if (!newId || existingIds.has(newId)) {
      newId = nextId();
      if (claim.id) idRemap.set(claim.id, newId);
    }

    existingIds.add(newId);
    existingTexts.add(normalized);

    supplementalClaims.push({
      ...claim,
      id: newId,
      relatedProceedingId: procId,
      dependsOn: Array.isArray(claim.dependsOn) ? claim.dependsOn : [],
      keyEntities: Array.isArray(claim.keyEntities) ? claim.keyEntities : [],
    });
  }

  if (idRemap.size > 0) {
    for (const claim of supplementalClaims) {
      if (!Array.isArray(claim.dependsOn)) continue;
      claim.dependsOn = claim.dependsOn.map((dep) => idRemap.get(dep) || dep);
    }
  }

  return supplementalClaims;
}

function findClaimPosition(
  text: string,
  claimText: string,
): { start: number; end: number } | null {
  const normalizedText = text.toLowerCase();
  const normalizedClaim = claimText.toLowerCase();

  let index = normalizedText.indexOf(normalizedClaim);
  if (index !== -1) {
    return { start: index, end: index + claimText.length };
  }
  return null;
}

// ============================================================================
// STEP 2-4: Research with Search Tracking
// ============================================================================

interface ResearchDecision {
  complete: boolean;
  focus?: string;
  queries?: string[];
  category?: string;
  isContradictionSearch?: boolean;
  targetProceedingId?: string;
}

function decideNextResearch(state: ResearchState): ResearchDecision {
  const config = getActiveConfig();
  const categories = [
    ...new Set(state.facts.map((f: ExtractedFact) => f.category)),
  ];
  const understanding = state.understanding!;

  const entities = understanding.subClaims
    .flatMap((c) => c.keyEntities)
    .slice(0, 4);

  // For questions, prioritize the implied claim for better search results
  const isQuestion = understanding.detectedInputType === "question";
  const stopWords = new Set(["the", "a", "an", "is", "was", "were", "are", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "shall", "can", "need", "dare", "ought", "used", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into", "through", "during", "before", "after", "above", "below", "between", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", "how", "all", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "just", "and", "but", "if", "or", "because", "until", "while", "although", "though", "whether", "this", "that", "these", "those", "it", "its", "what", "which", "who", "whom", "whose", "based"]);

  let entityStr = "";

  // For questions, always use the implied claim as primary search basis
  if (isQuestion && understanding.impliedClaim) {
    entityStr = understanding.impliedClaim
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 8)
      .join(" ");
  } else {
    // For articles/claims, use keyEntities
    entityStr = entities.join(" ");
  }

  // Fallback: if entityStr is empty, extract terms from claim text or thesis
  if (!entityStr.trim()) {
    const fallbackText = understanding.impliedClaim
      || understanding.articleThesis
      || understanding.subClaims[0]?.text
      || state.originalText?.slice(0, 150)
      || "";
    entityStr = fallbackText
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .slice(0, 6)
      .join(" ");
  }

  const hasLegal = categories.includes("legal_provision");
  const hasEvidence = categories.includes("evidence");

  // Detect if this topic requires recent data
  const recencyMatters = isRecencySensitive(
    state.originalInput || understanding.articleThesis || understanding.questionBeingAsked || "",
    understanding
  );

  // Get current year for date-specific queries
  const currentYear = new Date().getFullYear();

  if (recencyMatters && CONFIG.searchEnabled) {
    debugLog("Research phase: Recency-sensitive topic detected - prioritizing web search", {
      input: state.originalInput?.substring(0, 100),
    });
  }

  const proceedings = understanding.distinctProceedings || [];
  const proceedingsWithFacts = new Set(
    state.facts
      .map((f: ExtractedFact) => f.relatedProceedingId)
      .filter(Boolean),
  );

  if (
    state.facts.length >= config.minFactsRequired &&
    categories.length >= CONFIG.minCategories &&
    state.contradictionSearchPerformed &&
    (proceedings.length === 0 ||
      proceedings.every((p: DistinctProceeding) =>
        proceedingsWithFacts.has(p.id),
      ))
  ) {
    return { complete: true };
  }

  // Research each proceeding
  if (
    proceedings.length > 0 &&
    state.iterations.length < proceedings.length * 2
  ) {
    for (const proc of proceedings) {
      const procFacts = state.facts.filter(
        (f) => f.relatedProceedingId === proc.id,
      );
      if (procFacts.length < 2) {
        return {
          complete: false,
          focus: `${proc.name} - ${proc.subject}`,
          targetProceedingId: proc.id,
          category: "evidence",
          queries: [
            `${proc.court || ""} ${proc.shortName} ${proc.subject}`.trim(),
            `${entityStr} ${proc.date} ${proc.jurisdiction || "ruling"}`.trim(),
            `${proc.name} decision outcome ${proc.date}`,
          ],
        };
      }
    }
  }

  if (
    !hasLegal &&
    understanding.legalFrameworks.length > 0 &&
    state.iterations.length === 0
  ) {
    return {
      complete: false,
      focus: "Legal framework",
      category: "legal_provision",
      queries: [
        `${entityStr} legal basis statute`,
        `${understanding.legalFrameworks[0]} law provisions`,
      ],
    };
  }

  if (!hasEvidence && state.iterations.length <= 1) {
    // For recency-sensitive topics, add date-specific queries
    const baseQueries = [
      `${entityStr} evidence documents`,
      `${entityStr} facts findings`,
    ];

    const queries = recencyMatters ? [
      ...baseQueries,
      `${entityStr} ${currentYear} ${currentYear - 1} latest news`,
      `${entityStr} recent announcement update`,
    ] : baseQueries;

    return {
      complete: false,
      focus: recencyMatters ? "Recent evidence and facts (prioritizing current data)" : "Evidence and facts",
      category: "evidence",
      queries,
    };
  }

  if (!state.contradictionSearchPerformed) {
    return {
      complete: false,
      focus: "Criticism and opposing views",
      category: "criticism",
      isContradictionSearch: true,
      queries: [
        `${entityStr} criticism concerns`,
        `${entityStr} controversy disputed unfair`,
      ],
    };
  }

  // NEW v2.6.18: Search for decision-makers and potential conflicts of interest
  if (!state.decisionMakerSearchPerformed && proceedings.length > 0) {
    // Extract decision-maker names from all proceedings
    const decisionMakerNames = proceedings
      .flatMap((p: DistinctProceeding) => p.decisionMakers?.map(dm => dm.name) || [])
      .filter((name, index, arr) => arr.indexOf(name) === index); // unique names

    if (decisionMakerNames.length > 0) {
      return {
        complete: false,
        focus: "Decision-maker conflicts of interest",
        category: "conflict_of_interest",
        queries: [
          `${decisionMakerNames[0]} conflict of interest ${entityStr}`,
          `${decisionMakerNames[0]} impartiality bias ${proceedings[0]?.court || ""}`,
          ...(decisionMakerNames.length > 1 ? [`${decisionMakerNames.slice(0, 2).join(" ")} role multiple trials`] : []),
        ],
      };
    }
  }

  // NEW v2.6.18: Use generated research questions for additional searches
  const researchQuestions = understanding.researchQuestions || [];
  const nextQuestionIdx = Array.from({ length: researchQuestions.length }, (_, i) => i)
    .find(i => !state.researchQuestionsSearched.has(i));

  if (nextQuestionIdx !== undefined && state.iterations.length < config.maxResearchIterations) {
    const question = researchQuestions[nextQuestionIdx];
    // Convert research question to search query by extracting key terms
    const queryTerms = question
      .toLowerCase()
      .replace(/[?.,!]/g, "")
      .split(/\s+/)
      .filter(word => word.length > 3 && !stopWords.has(word))
      .slice(0, 6)
      .join(" ");

    if (queryTerms.trim()) {
      return {
        complete: false,
        focus: `Research: ${question.slice(0, 50)}...`,
        category: "research_question",
        queries: [
          queryTerms,
          `${entityStr} ${queryTerms.split(" ").slice(0, 3).join(" ")}`,
        ],
      };
    }
  }

  return { complete: true };
}

// Helper to decode HTML entities in text
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&#x27;": "'",
    "&#x2d;": "-",
    "&#x2D;": "-",
    "&nbsp;": " ",
    "&#160;": " ",
    "&ndash;": "–",
    "&mdash;": "—",
  };

  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, "gi"), char);
  }
  // Also handle numeric entities like &#45;
  result = result.replace(/&#(\d+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 10)),
  );
  // Handle hex entities like &#x2d;
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, code) =>
    String.fromCharCode(parseInt(code, 16)),
  );

  return result;
}

/**
 * Extract a readable title from URL path/filename
 */
function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    // Get filename from path
    const filename = pathname.split("/").pop() || "";

    if (filename) {
      // Remove extension and clean up
      let title = filename
        .replace(/\.(pdf|html|htm|php|aspx?)$/i, "")
        .replace(/[-_]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      // Capitalize first letter of each word
      if (title.length > 3) {
        title = title
          .split(" ")
          .map(
            (word) =>
              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
          )
          .join(" ");
        return title.slice(0, 100);
      }
    }

    // Fallback to hostname
    return urlObj.hostname.replace(/^www\./, "");
  } catch {
    return "Unknown Source";
  }
}

/**
 * Extract title from document text with PDF header detection
 */
function extractTitle(text: string, url: string): string {
  const firstLine = text.split("\n")[0]?.trim().slice(0, 150) || "";

  // Check for PDF header patterns - these indicate raw PDF bytes
  const isPdfHeader =
    /^%PDF-\d+\.\d+/.test(firstLine) ||
    firstLine.includes("%���") ||
    firstLine.includes("\x00") ||
    /^[\x00-\x1f\x7f-\xff]{3,}/.test(firstLine);

  // Check for other binary/garbage patterns
  const isGarbage =
    firstLine.length < 3 ||
    !/[a-zA-Z]{3,}/.test(firstLine) || // Must have some letters
    (firstLine.match(/[^\x20-\x7E]/g)?.length || 0) > firstLine.length * 0.3; // >30% non-printable

  if (isPdfHeader || isGarbage) {
    // Try to find a better title in the first few lines
    const lines = text.split("\n").slice(0, 10);
    for (const line of lines) {
      const cleaned = line.trim();
      // Look for a line that looks like a title (has letters, reasonable length)
      if (
        cleaned.length >= 10 &&
        cleaned.length <= 150 &&
        /[a-zA-Z]{4,}/.test(cleaned) &&
        !/^%PDF/.test(cleaned) &&
        (cleaned.match(/[^\x20-\x7E]/g)?.length || 0) < cleaned.length * 0.1
      ) {
        return cleaned.slice(0, 100);
      }
    }

    // Fallback to URL-based title
    return extractTitleFromUrl(url);
  }

  return firstLine.slice(0, 100) || extractTitleFromUrl(url);
}

async function fetchSource(
  url: string,
  id: string,
  category: string,
  searchQuery?: string,
): Promise<FetchedSource | null> {
  const config = getActiveConfig();
  const trackRecord = getTrackRecordScore(url);

  try {
    const result = await Promise.race([
      extractTextFromUrl(url),
      new Promise<{ text: string; title: string; contentType: string }>(
        (_, reject) =>
          setTimeout(() => reject(new Error("timeout")), CONFIG.fetchTimeoutMs),
      ),
    ]);

    // Handle both old (string) and new (object) return types for compatibility
    const text = typeof result === "string" ? result : result.text;
    const extractedTitle = typeof result === "string" ? null : result.title;

    // Use extracted title if available, otherwise fall back to extraction
    let title = extractedTitle || extractTitle(text, url);
    title = decodeHtmlEntities(title);

    return {
      id,
      url,
      title,
      trackRecordScore: trackRecord,
      fullText: text.slice(0, config.articleMaxChars),
      fetchedAt: new Date().toISOString(),
      category,
      fetchSuccess: true,
      searchQuery,
    };
  } catch (err) {
    console.warn(`Fetch failed for ${url}:`, err);
    return {
      id,
      url,
      title: extractTitleFromUrl(url),
      trackRecordScore: trackRecord,
      fullText: "",
      fetchedAt: new Date().toISOString(),
      category,
      fetchSuccess: false,
      searchQuery,
    };
  }
}

// NOTE: OpenAI structured output requires ALL properties to be in "required" array.
// Using empty string "" instead of optional for string fields.
const FACT_SCHEMA = z.object({
  facts: z.array(
    z.object({
      fact: z.string(),
      category: z.enum([
        "legal_provision",
        "evidence",
        "expert_quote",
        "statistic",
        "event",
        "criticism",
      ]),
      specificity: z.enum(["high", "medium", "low"]),
      sourceExcerpt: z.string().min(20),
      relatedProceedingId: z.string(), // empty string if not applicable
      isContestedClaim: z.boolean(),
      claimSource: z.string(), // empty string if not applicable
    }),
  ),
});

async function extractFacts(
  source: FetchedSource,
  focus: string,
  model: any,
  proceedings: DistinctProceeding[],
  targetProceedingId?: string,
): Promise<ExtractedFact[]> {
  console.log(`[Analyzer] extractFacts called for source ${source.id}: "${source.title?.substring(0, 50)}..."`);
  console.log(`[Analyzer] extractFacts: fetchSuccess=${source.fetchSuccess}, fullText length=${source.fullText?.length ?? 0}`);

  if (!source.fetchSuccess || !source.fullText) {
    console.warn(`[Analyzer] extractFacts: Skipping ${source.id} - no content (fetchSuccess=${source.fetchSuccess}, hasText=${!!source.fullText})`);
    return [];
  }

  const proceedingsList =
    proceedings.length > 0
      ? `\n\nKNOWN PROCEEDINGS:\n${proceedings.map((p: DistinctProceeding) => `- ${p.id}: ${p.name}`).join("\n")}`
      : "";

  // Get current date for temporal reasoning
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDay = currentDate.getDate();
  const currentDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
  const currentDateReadable = currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const systemPrompt = `Extract SPECIFIC facts. Focus: ${focus}
${targetProceedingId ? `Target proceeding: ${targetProceedingId}` : ""}
Track contested claims with isContestedClaim and claimSource.
Only HIGH/MEDIUM specificity.

**CURRENT DATE**: Today is ${currentDateReadable} (${currentDateStr}). When extracting dates, compare them to this current date.${proceedingsList}`;

  debugLog(`extractFacts: Calling LLM for ${source.id}`, {
    textLength: source.fullText.length,
    title: source.title?.substring(0, 50),
    focus: focus.substring(0, 100),
  });

  try {
    const startTime = Date.now();
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Source: ${source.title}\nURL: ${source.url}\n\n${source.fullText}`,
        },
      ],
      temperature: 0.2,
      output: Output.object({ schema: FACT_SCHEMA }),
    });
    const elapsed = Date.now() - startTime;

    debugLog(`extractFacts: LLM returned for ${source.id} in ${elapsed}ms`);
    debugLog(`extractFacts: Result keys`, result ? Object.keys(result) : "null");

    if (elapsed < 2000) {
      debugLog(`extractFacts: WARNING - LLM responded suspiciously fast (${elapsed}ms) for ${source.fullText.length} chars`);
    }

    // Handle different AI SDK versions - safely extract structured output
    const rawOutput = extractStructuredOutput(result);
    if (!rawOutput) {
      debugLog(`extractFacts: No structured output for ${source.id}`, {
        resultType: typeof result,
        resultKeys: result ? Object.keys(result) : "null",
        resultPreview: result && typeof result === 'object' ? JSON.stringify(result).substring(0, 500) : "N/A",
      });
      return [];
    }

    const extraction = rawOutput as z.infer<typeof FACT_SCHEMA>;
    console.log(`[Analyzer] extractFacts: Raw extraction has ${extraction.facts?.length ?? 0} facts`);

    if (!extraction.facts || !Array.isArray(extraction.facts)) {
      console.warn(`[Analyzer] Invalid fact extraction from ${source.id} - facts is not an array`);
      return [];
    }

    const filteredFacts = extraction.facts
      .filter((f) => f.specificity !== "low" && f.sourceExcerpt?.length >= 20);

    console.log(`[Analyzer] extractFacts: After filtering (non-low specificity, excerpt >= 20 chars): ${filteredFacts.length} facts`);

    if (filteredFacts.length === 0 && extraction.facts.length > 0) {
      console.warn(`[Analyzer] extractFacts: All ${extraction.facts.length} facts were filtered out!`);
      extraction.facts.forEach((f, i) => {
        console.warn(`[Analyzer]   Fact ${i}: specificity="${f.specificity}", excerptLen=${f.sourceExcerpt?.length ?? 0}`);
      });
    }

    return filteredFacts.map((f, i) => ({
        id: `${source.id}-F${i + 1}`,
        fact: f.fact,
        category: f.category,
        specificity: f.specificity as "high" | "medium",
        sourceId: source.id,
        sourceUrl: source.url,
        sourceTitle: source.title,
        sourceExcerpt: f.sourceExcerpt,
        relatedProceedingId: f.relatedProceedingId || targetProceedingId,
        isContestedClaim: f.isContestedClaim,
        claimSource: f.claimSource,
      }));
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    debugLog(`extractFacts: ERROR for ${source.id}`, {
      error: errorMsg,
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5).join('\n') : undefined,
    });

    // Check for specific API errors
    if (errorMsg.includes("credit balance is too low") || errorMsg.includes("insufficient_quota")) {
      debugLog("❌ ANTHROPIC API CREDITS EXHAUSTED");
    }

    // Check for OpenAI schema validation errors
    if (errorMsg.includes("Invalid schema") || errorMsg.includes("required")) {
      debugLog("❌ OpenAI SCHEMA VALIDATION ERROR - check for .optional() fields in FACT_SCHEMA");
    }

    return [];
  }
}

// ============================================================================
// STEP 5: GENERATE VERDICTS - FIX: Calculate factorAnalysis from actual factors
// ============================================================================

// NOTE: OpenAI structured output requires ALL properties to be in "required" array.
const KEY_FACTOR_SCHEMA = z.object({
  factor: z.string(),
  supports: z.enum(["yes", "no", "neutral"]),
  explanation: z.string(),
  isContested: z.boolean(),
  contestedBy: z.string(), // empty string if not contested
  contestationReason: z.string(), // empty string if not contested
  factualBasis: z.enum(["established", "disputed", "alleged", "opinion", "unknown"]),
});

// NOTE: OpenAI structured output requires ALL properties to be in "required" array.
const VERDICTS_SCHEMA_MULTI_PROCEEDING = z.object({
  questionAnswer: z.object({
    answer: z.enum(["YES", "NO", "PARTIALLY", "INSUFFICIENT-EVIDENCE"]),
    confidence: z.number().min(0).max(100),
    shortAnswer: z.string(),
    nuancedAnswer: z.string(),
    keyFactors: z.array(KEY_FACTOR_SCHEMA),
    calibrationNote: z.string(), // empty string if not applicable
  }),
  proceedingAnswers: z.array(
    z.object({
      proceedingId: z.string(),
      proceedingName: z.string(),
      answer: z.enum(["YES", "NO", "PARTIALLY", "INSUFFICIENT-EVIDENCE"]),
      confidence: z.number().min(0).max(100),
      shortAnswer: z.string(),
      keyFactors: z.array(KEY_FACTOR_SCHEMA),
    }),
  ),
  proceedingSummary: z.string(),
  claimVerdicts: z.array(
    z.object({
      claimId: z.string(),
      verdict: z.enum([
        "WELL-SUPPORTED",
        "PARTIALLY-SUPPORTED",
        "UNCERTAIN",
        "REFUTED",
      ]),
      confidence: z.number().min(0).max(100),
      riskTier: z.enum(["A", "B", "C"]),
      reasoning: z.string(),
      supportingFactIds: z.array(z.string()),
      relatedProceedingId: z.string(), // empty string if not applicable
    }),
  ),
});

const VERDICTS_SCHEMA_SIMPLE = z.object({
  questionAnswer: z.object({
    answer: z.enum(["YES", "NO", "PARTIALLY", "INSUFFICIENT-EVIDENCE"]),
    confidence: z.number().min(0).max(100),
    shortAnswer: z.string(),
    nuancedAnswer: z.string(),
    keyFactors: z.array(KEY_FACTOR_SCHEMA),
  }),
  claimVerdicts: z.array(
    z.object({
      claimId: z.string(),
      verdict: z.enum([
        "WELL-SUPPORTED",
        "PARTIALLY-SUPPORTED",
        "UNCERTAIN",
        "REFUTED",
      ]),
      confidence: z.number().min(0).max(100),
      riskTier: z.enum(["A", "B", "C"]),
      reasoning: z.string(),
      supportingFactIds: z.array(z.string()),
    }),
  ),
});

const VERDICTS_SCHEMA_CLAIM = z.object({
  claimVerdicts: z.array(
    z.object({
      claimId: z.string(),
      verdict: z.enum([
        "WELL-SUPPORTED",
        "PARTIALLY-SUPPORTED",
        "UNCERTAIN",
        "REFUTED",
      ]),
      confidence: z.number().min(0).max(100),
      riskTier: z.enum(["A", "B", "C"]),
      reasoning: z.string(),
      supportingFactIds: z.array(z.string()),
      // Contestation fields
      isContested: z.boolean(),
      contestedBy: z.string(), // empty string if not contested
      factualBasis: z.enum(["established", "disputed", "alleged", "opinion", "unknown"]),
    }),
  ),
  articleAnalysis: z.object({
    thesisSupported: z.boolean(),
    logicalFallacies: z.array(
      z.object({
        type: z.string(),
        description: z.string(),
        affectedClaims: z.array(z.string()),
      }),
    ),
    articleVerdict: z.enum([
      "CREDIBLE",
      "MOSTLY-CREDIBLE",
      "MISLEADING",
      "FALSE",
    ]),
    articleConfidence: z.number().min(0).max(100),
    verdictDiffersFromClaimAverage: z.boolean(),
    verdictDifferenceReason: z.string(), // empty string if not applicable
  }),
});

async function generateVerdicts(
  state: ResearchState,
  model: any,
): Promise<{
  claimVerdicts: ClaimVerdict[];
  articleAnalysis: ArticleAnalysis;
  questionAnswer?: QuestionAnswer;
  pseudoscienceAnalysis?: PseudoscienceAnalysis;
}> {
  const understanding = state.understanding!;
  const isQuestion = understanding.detectedInputType === "question";
  const hasMultipleProceedings =
    understanding.requiresSeparateAnalysis &&
    understanding.distinctProceedings.length > 1;

  // Detect pseudoscience based on the article/question content and extracted claims
  const allText = [
    understanding.articleThesis,
    understanding.questionBeingAsked,
    understanding.impliedClaim,
    ...understanding.subClaims.map((c: any) => c.text),
  ]
    .filter(Boolean)
    .join(" ");

  const pseudoscienceAnalysis = detectPseudoscience(allText);

  const factsFormatted = state.facts
    .map((f: ExtractedFact) => {
      let factLine = `[${f.id}]`;
      if (f.relatedProceedingId) factLine += ` (${f.relatedProceedingId})`;
      if (f.isContestedClaim)
        factLine += ` [CONTESTED by ${f.claimSource || "critics"}]`;
      factLine += ` ${f.fact} (Source: ${f.sourceTitle})`;
      return factLine;
    })
    .join("\n");

  const claimsFormatted = understanding.subClaims
    .map(
      (c: any) =>
        `${c.id}${c.relatedProceedingId ? ` (${c.relatedProceedingId})` : ""}: "${c.text}" [${c.isCentral ? "CENTRAL" : "Supporting"}]`,
    )
    .join("\n");

  if (isQuestion && hasMultipleProceedings) {
    const result = await generateMultiProceedingVerdicts(
      state,
      understanding,
      factsFormatted,
      claimsFormatted,
      model,
    );
    return { ...result, pseudoscienceAnalysis };
  } else if (isQuestion) {
    const result = await generateQuestionVerdicts(
      state,
      understanding,
      factsFormatted,
      claimsFormatted,
      model,
    );
    return { ...result, pseudoscienceAnalysis };
  } else {
    const result = await generateClaimVerdicts(
      state,
      understanding,
      factsFormatted,
      claimsFormatted,
      model,
      pseudoscienceAnalysis,
    );
    return { ...result, pseudoscienceAnalysis };
  }
}

async function generateMultiProceedingVerdicts(
  state: ResearchState,
  understanding: ClaimUnderstanding,
  factsFormatted: string,
  claimsFormatted: string,
  model: any,
): Promise<{
  claimVerdicts: ClaimVerdict[];
  articleAnalysis: ArticleAnalysis;
  questionAnswer: QuestionAnswer;
}> {
  const proceedingsFormatted = understanding.distinctProceedings
    .map(
      (p: DistinctProceeding) =>
        `- **${p.id}**: ${p.name}\n  Court: ${p.court || "N/A"} | Date: ${p.date} | Status: ${p.status}\n  Subject: ${p.subject}`,
    )
    .join("\n\n");

  // Get current date for temporal reasoning
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDay = currentDate.getDate();
  const currentDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
  const currentDateReadable = currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const systemPrompt = `You are FactHarbor's verdict generator. Analyze MULTIPLE DISTINCT PROCEEDINGS separately.

## CRITICAL: TEMPORAL REASONING

**CURRENT DATE**: Today is ${currentDateReadable} (${currentDateStr}).

**DATE REASONING RULES**:
- When evaluating dates mentioned in claims, compare them to the CURRENT DATE above
- Do NOT assume dates are in the future without checking against the current date
- A date like "November 2025" is in the PAST if the current date is January 2026 or later
- Do NOT reject claims as "impossible" based on incorrect temporal assumptions
- If a date seems inconsistent, verify it against the current date before making judgments
- When in doubt about temporal relationships, use the evidence from sources rather than making assumptions

## QUESTION
"${understanding.questionBeingAsked || state.originalInput}"

## PROCEEDINGS - PROVIDE SEPARATE ANSWER FOR EACH
${proceedingsFormatted}

## INSTRUCTIONS

1. For EACH proceeding, provide:
   - proceedingId (must match: ${understanding.distinctProceedings.map((p: DistinctProceeding) => p.id).join(", ")})
   - answer: YES | NO | PARTIALLY | INSUFFICIENT-EVIDENCE
   - shortAnswer: A complete sentence summarizing the finding (e.g., "The trial followed proper procedures based on documented evidence.")
     * MUST be a descriptive sentence, NOT just a verdict word like "PARTIALLY"
   - keyFactors: Array of factors covering ALL these aspects:
     * Correct application (were proper rules/standards/methods applied?)
     * Process fairness (were proper procedures followed?)
     * Evidence basis (were decisions based on documented evidence?)
     * Decision-maker impartiality (were there any conflicts of interest?)
     * Outcome proportionality (was the outcome proportionate? Identify and analyze any significant consequences - compare to similar cases)

2. KEY FACTOR SCORING RULES - VERY IMPORTANT:
   - supports="yes": Factor supports the claim with evidence (from sources OR your background knowledge of widely-reported facts)
   - supports="no": Factor refutes the claim with counter-evidence (NOT just disputed/contested)
   - supports="neutral": Use ONLY when you genuinely have no information about this factor

   ${CONFIG.allowModelKnowledge ? `IMPORTANT: You MUST use your background knowledge! For well-known public events, established legal procedures, and widely-reported facts, you ALREADY KNOW the relevant information - use it!
   DO NOT mark factors as "neutral" if you know the answer from your training data.
   Example: If you know a trial followed standard procedures, mark it "yes" even if sources don't explicitly state it.` : "Use ONLY the provided facts and sources."}

   CRITICAL: Being "contested" or "disputed" by political opponents = supports="yes" (if facts support it), NOT "neutral"
   Example: "Critics claim X was unfair" but X followed proper procedures = "yes", not "neutral"

3. Mark contested factors:
   - isContested: true if this factor is disputed
   - contestedBy: Be SPECIFIC about who disputes it (e.g., "Bolsonaro supporters", "Trump administration")
     * Do NOT use vague terms like "government supporters" - specify WHICH government/person
   - factualBasis: Does the opposition have ACTUAL DOCUMENTED COUNTER-EVIDENCE?
     * "established" = Opposition cites SPECIFIC DOCUMENTED FACTS that contradict (e.g., court transcripts showing bias, leaked documents proving misconduct)
     * "disputed" = Opposition has some factual counter-evidence but it's debatable
     * "opinion" = Opposition has NO factual counter-evidence - just claims, rhetoric, political actions
     * "unknown" = Cannot determine

   CRITICAL - factualBasis MUST be "opinion" for ALL of these:
   - Executive orders, sanctions, or government decrees (political ACTIONS, not evidence)
   - Statements by supporters, politicians, officials, or civil society groups (claims are not evidence)
   - Calling something "unfair", "persecution", or "political" without citing specific documented violations
   - Diplomatic protests, travel bans, or other political responses

   factualBasis can ONLY be "established" or "disputed" when opposition provides:
   - Specific court documents, transcripts, or records showing actual procedural violations
   - Verifiable data or documents contradicting the findings
   - Documented evidence of specific errors, bias, or misconduct (not just allegations)

4. Calibration: Neutral contested factors don't reduce verdicts
   - Positive factors with evidence + Neutral contested factors = YES, not PARTIALLY
   - Only actual negative factors with documented evidence can reduce verdict

5. CLAIM VERDICT RULES (for claimVerdicts array):
   **CRITICAL**: You MUST generate verdicts for ALL claims listed in the CLAIMS section above. Every claim must have a corresponding entry in claimVerdicts.

   - For each proceeding, ensure ALL claims with that proceedingId (or claims that logically belong to that proceeding) have verdicts
   - If a claim doesn't have a relatedProceedingId, assign it to the most relevant proceeding based on the claim content
   - WELL-SUPPORTED: Use when evidence supports the claim AND no actual counter-evidence exists
     * Example: "Proper procedures were followed" - if you know procedures were followed and no documented violations exist, this is WELL-SUPPORTED, not UNCERTAIN
   - PARTIALLY-SUPPORTED: Mix of supporting and refuting evidence
   - UNCERTAIN: Only when you genuinely have NO information either way (extremely rare - you usually know something!)
   - REFUTED: Actual evidence contradicts the claim

   CRITICAL: Political contestation ("critics say it was unfair") is NOT the same as counter-evidence.
   Use WELL-SUPPORTED, not UNCERTAIN, if you know the facts support the claim despite political opposition.

${getKnowledgeInstruction(state.originalInput, understanding)}
${getProviderPromptHint()}`;

  const userPrompt = `## QUESTION
"${understanding.questionBeingAsked || state.originalInput}"

## PROCEEDINGS
${proceedingsFormatted}

## CLAIMS
${claimsFormatted}

## FACTS
${factsFormatted}

Provide SEPARATE answers for each proceeding.`;

  let parsed: z.infer<typeof VERDICTS_SCHEMA_MULTI_PROCEEDING> | null = null;

  try {
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      output: Output.object({ schema: VERDICTS_SCHEMA_MULTI_PROCEEDING }),
    });
    state.llmCalls++;

    // Handle different AI SDK versions - safely extract structured output
    const rawOutput = extractStructuredOutput(result);
    if (rawOutput) {
      parsed = rawOutput as z.infer<typeof VERDICTS_SCHEMA_MULTI_PROCEEDING>;
      debugLog("generateMultiProceedingVerdicts: SUCCESS", {
        hasQuestionAnswer: !!parsed.questionAnswer,
        proceedingAnswersCount: parsed.proceedingAnswers?.length,
        claimVerdictsCount: parsed.claimVerdicts?.length,
      });
    } else {
      debugLog("generateMultiProceedingVerdicts: No rawOutput returned");
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    debugLog("generateMultiProceedingVerdicts: ERROR", {
      error: errMsg,
      stack: err instanceof Error ? err.stack?.split('\n').slice(0, 5).join('\n') : undefined,
    });

    // Check for OpenAI schema validation errors
    if (errMsg.includes("Invalid schema") || errMsg.includes("required")) {
      debugLog("❌ OpenAI SCHEMA VALIDATION ERROR in VERDICTS_SCHEMA_MULTI_PROCEEDING");
    }
    state.llmCalls++;
  }

  // Fallback if structured output failed
  if (!parsed || !parsed.proceedingAnswers) {
    debugLog("generateMultiProceedingVerdicts: Using FALLBACK (parsed failed)", {
      hasParsed: !!parsed,
      hasProceedingAnswers: !!parsed?.proceedingAnswers,
    });

    const fallbackVerdicts: ClaimVerdict[] = understanding.subClaims.map(
      (claim: any) => ({
        claimId: claim.id,
        claimText: claim.text,
        llmVerdict: "UNCERTAIN",
        verdict: "UNVERIFIED" as const,
        confidence: 50,
        truthPercentage: 50,
        riskTier: "B" as const,
        reasoning: "Unable to generate verdict due to schema validation error.",
        supportingFactIds: [],
        isCentral: claim.isCentral || false,
        highlightColor: getHighlightColor7Point("UNVERIFIED"),
        isContested: false,
        contestedBy: "",
        factualBasis: "unknown" as const,
      }),
    );

    const questionAnswer: QuestionAnswer = {
      question: understanding.questionBeingAsked || state.originalInput || "",
      llmAnswer: "INSUFFICIENT-EVIDENCE",
      answer: "UNVERIFIED",
      confidence: 50,
      truthPercentage: 50,
      shortAnswer: "Unable to determine - analysis failed",
      nuancedAnswer:
        "The structured output generation failed. Manual review recommended.",
      keyFactors: [],
      hasMultipleProceedings: true,
      proceedingAnswers: understanding.distinctProceedings.map(
        (p: DistinctProceeding) => ({
          proceedingId: p.id,
          proceedingName: p.name,
          llmAnswer: "INSUFFICIENT-EVIDENCE",
          answer: "UNVERIFIED",
          truthPercentage: 50,
          confidence: 50,
          shortAnswer: "Analysis failed",
          keyFactors: [],
        }),
      ),
    };

    const centralTotal = fallbackVerdicts.filter((v) => v.isCentral).length;
    const centralSupported = fallbackVerdicts.filter(
      (v) => v.isCentral && v.truthPercentage >= 72,
    ).length;
    const articleAnalysis: ArticleAnalysis = {
      inputType: "question",
      isQuestion: true,
      questionAnswer,
      hasMultipleProceedings: true,
      proceedings: understanding.distinctProceedings,
      articleThesis: understanding.articleThesis,
      logicalFallacies: [],
      claimsAverageTruthPercentage: 50,
      claimsAverageVerdict: "UNVERIFIED",
      articleTruthPercentage: 50,
      articleVerdict: "UNVERIFIED",
      claimPattern: {
        total: fallbackVerdicts.length,
        supported: 0,
        uncertain: fallbackVerdicts.length,
        refuted: 0,
        centralClaimsTotal: centralTotal,
        centralClaimsSupported: centralSupported,
      },
    };

    return { claimVerdicts: fallbackVerdicts, articleAnalysis, questionAnswer };
  }

  // Normal flow with parsed output

  // FIX v2.4.3: Calculate factorAnalysis from ACTUAL keyFactors array
  // v2.5.0: Calibrate to 7-point scale
  // v2.5.1: Contested factors without evidence don't reduce rating
  const correctedProceedingAnswers = parsed.proceedingAnswers.map((pa: any) => {
    const factors = pa.keyFactors as KeyFactor[];

    // Calculate from actual factors - NOT from LLM-reported numbers
    const positiveFactors = factors.filter((f) => f.supports === "yes").length;
    const negativeFactors = factors.filter((f) => f.supports === "no").length;
    const neutralFactors = factors.filter(
      (f) => f.supports === "neutral",
    ).length;

    // v2.5.1: Count negative factors that are contested without evidence
    // Only count "no" factors with established factualBasis as true negatives
    const evidencedNegatives = factors.filter(
      (f) => f.supports === "no" && f.factualBasis === "established",
    ).length;
    const contestedNegatives = factors.filter(
      (f) => f.supports === "no" && f.isContested,
    ).length;
    // Contested neutrals (opinions without evidence) should not count negatively
    const contestedNeutrals = factors.filter(
      (f) => f.supports === "neutral" && f.isContested,
    ).length;

    // Debug: Log factor details for this proceeding
    debugLog(`Factor analysis for ${pa.proceedingId}`, {
      llmAnswer: pa.answer,
      factorCounts: {
        positive: positiveFactors,
        negative: negativeFactors,
        neutral: neutralFactors,
        evidencedNegatives,
        contestedNegatives,
        contestedNeutrals,
      },
      factors: factors.map((f) => ({
        factor: f.factor?.substring(0, 50),
        supports: f.supports,
        isContested: f.isContested,
        factualBasis: f.factualBasis,
      })),
    });

    const factorAnalysis: FactorAnalysis = {
      positiveFactors,
      negativeFactors,
      neutralFactors,
      contestedNegatives,
      verdictExplanation: `${positiveFactors} positive, ${negativeFactors} negative (${evidencedNegatives} evidenced, ${contestedNegatives} contested), ${neutralFactors} neutral (${contestedNeutrals} disputed)`,
    };

    // Apply calibration correction based on factors
    let llmAnswer = pa.answer;
    // Normalize confidence: if LLM returned decimal (0-1), convert to percentage (0-100)
    let correctedConfidence = pa.confidence <= 1 && pa.confidence > 0
      ? Math.round(pa.confidence * 100)
      : pa.confidence;

    // v2.5.1: Only evidenced negatives count at full weight
    // Contested negatives without established basis count at 25%
    // Neutral contested don't count negatively at all
    const effectiveNegatives = evidencedNegatives + (negativeFactors - evidencedNegatives) * 0.25;

    // If there are positive factors and NO evidenced negatives, should lean YES
    if (positiveFactors > 0 && evidencedNegatives === 0) {
      if (pa.answer === "NO" || pa.answer === "PARTIALLY") {
        llmAnswer = "YES";
        correctedConfidence = Math.max(pa.confidence, 70);
        factorAnalysis.verdictExplanation = `Corrected to YES: ${positiveFactors} positive, 0 evidenced negatives (${contestedNegatives} contested without evidence don't count)`;
        debugLog(`Proceeding ${pa.proceedingId}: CORRECTED to YES`, {
          from: pa.answer,
          reason: `${positiveFactors} positive, 0 evidenced negatives`,
        });
      } else {
        // Already YES, no change needed but log it
        debugLog(`Proceeding ${pa.proceedingId}: Already positive (${pa.answer}), no correction needed`, {
          positiveFactors,
          evidencedNegatives,
        });
      }
    } else if (pa.answer === "NO" && positiveFactors > effectiveNegatives) {
      llmAnswer = "PARTIALLY";
      correctedConfidence = Math.min(pa.confidence, 72);
      factorAnalysis.verdictExplanation = `Corrected from NO: ${positiveFactors} positive > ${effectiveNegatives.toFixed(1)} effective negative`;
    } else if (
      pa.answer === "NO" &&
      contestedNegatives > 0 &&
      contestedNegatives === negativeFactors
    ) {
      llmAnswer = "PARTIALLY";
      correctedConfidence = Math.min(pa.confidence, 68);
      factorAnalysis.verdictExplanation = `Corrected: All ${negativeFactors} negative factors are contested`;
    }

    // Calculate truth percentage and derive 7-point answer
    const truthPct = calculateQuestionTruthPercentage(
      llmAnswer,
      correctedConfidence,
    );
    const calibratedAnswer = percentageToQuestionAnswer(truthPct);

    return {
      ...pa,
      llmAnswer: pa.answer, // Original LLM answer
      answer: calibratedAnswer, // 7-point calibrated answer
      confidence: correctedConfidence,
      truthPercentage: truthPct,
      factorAnalysis,
    } as ProceedingAnswer;
  });

  // Recalculate overall using truth percentages
  const avgTruthPct = Math.round(
    correctedProceedingAnswers.reduce(
      (sum, pa) => sum + pa.truthPercentage,
      0,
    ) / correctedProceedingAnswers.length,
  );

  // Determine overall LLM-style answer for logging
  const answers = correctedProceedingAnswers.map(
    (pa: ProceedingAnswer) => pa.answer,
  );
  let overallLlmAnswer = parsed.questionAnswer.answer;
  const yesCount = answers.filter(
    (a) => a === "YES" || a === "MOSTLY-YES",
  ).length;
  const noCount = answers.filter((a) => a === "NO" || a === "MOSTLY-NO").length;
  if (yesCount > 0 && noCount > 0) overallLlmAnswer = "PARTIALLY";

  const avgConfidence = Math.round(
    correctedProceedingAnswers.reduce((sum, pa) => sum + pa.confidence, 0) /
      correctedProceedingAnswers.length,
  );

  // Calculate overall factorAnalysis
  const allFactors = correctedProceedingAnswers.flatMap((pa) => pa.keyFactors);
  // Only flag contested negatives with evidence-based contestation
  const hasContestedFactors = allFactors.some(
    (f) =>
      f.supports === "no" &&
      f.isContested &&
      (f.factualBasis === "established" || f.factualBasis === "disputed")
  );

  // Build claim verdicts with 7-point calibration
  // v2.5.1: Apply correction based on proceeding-level factor analysis

  // v2.6.19: Ensure ALL claims have verdicts - add missing ones
  const claimIdsWithVerdicts = new Set(parsed.claimVerdicts.map((cv: any) => cv.claimId));
  const missingClaims = understanding.subClaims.filter(
    (claim: any) => !claimIdsWithVerdicts.has(claim.id)
  );

  if (missingClaims.length > 0) {
    debugLog(`generateMultiProceedingVerdicts: Missing verdicts for ${missingClaims.length} claims`, {
      missingClaimIds: missingClaims.map((c: any) => c.id),
      totalClaims: understanding.subClaims.length,
      verdictsGenerated: parsed.claimVerdicts.length,
    });

    // Add fallback verdicts for missing claims
    for (const claim of missingClaims) {
      const proceedingId = claim.relatedProceedingId || "";
      const relatedProceeding = correctedProceedingAnswers.find(
        (pa) => pa.proceedingId === proceedingId
      );

      // Use proceeding-level answer as fallback
      const fallbackVerdict = relatedProceeding?.answer === "YES" ? "WELL-SUPPORTED" : "UNCERTAIN";
      const fallbackConfidence = relatedProceeding?.confidence || 50;

      parsed.claimVerdicts.push({
        claimId: claim.id,
        verdict: fallbackVerdict,
        confidence: fallbackConfidence,
        riskTier: "B",
        reasoning: `Fallback verdict based on proceeding-level analysis (${relatedProceeding?.proceedingId || "unknown"}). Original verdict generation did not include this claim.`,
        supportingFactIds: [],
        relatedProceedingId: proceedingId,
      });

      debugLog(`Added fallback verdict for claim ${claim.id}`, {
        proceedingId,
        verdict: fallbackVerdict,
        reason: "Missing from LLM output",
      });
    }
  }

  const claimVerdicts: ClaimVerdict[] = parsed.claimVerdicts.map((cv: any) => {
    const claim = understanding.subClaims.find((c: any) => c.id === cv.claimId);
    const proceedingId = cv.relatedProceedingId || claim?.relatedProceedingId || "";

    // Find the corrected proceeding answer for this claim
    const relatedProceeding = correctedProceedingAnswers.find(
      (pa) => pa.proceedingId === proceedingId
    );

    // Calculate base truth percentage from LLM verdict
    let truthPct = calculateTruthPercentage(cv.verdict, cv.confidence);
    let correctedVerdict = cv.verdict;

    // v2.5.2: If the proceeding has positive factors and no evidenced negatives,
    // boost claims that are below 72% to WELL-SUPPORTED
    if (relatedProceeding && relatedProceeding.factorAnalysis) {
      const fa = relatedProceeding.factorAnalysis;
      // Check if proceeding has positive factors and no evidenced negatives
      const proceedingIsPositive =
        fa.verdictExplanation?.includes("0 evidenced negatives") ||
        fa.verdictExplanation?.includes("Corrected to YES") ||
        fa.verdictExplanation?.includes("Already positive") ||
        relatedProceeding.answer === "YES";

      // If proceeding is positive and claim is below threshold, boost it
      // This applies to UNCERTAIN, PARTIALLY-SUPPORTED, or any claim with low truth %
      if (proceedingIsPositive && truthPct < 72) {
        const originalVerdict = cv.verdict;
        truthPct = 72; // Minimum for MOSTLY-TRUE
        correctedVerdict = "WELL-SUPPORTED";
        debugLog("claimVerdict: Corrected based on proceeding factors", {
          claimId: cv.claimId,
          proceedingId,
          from: originalVerdict,
          to: correctedVerdict,
          truthPctBefore: calculateTruthPercentage(cv.verdict, cv.confidence),
          truthPctAfter: truthPct,
          reason: "Proceeding is positive with no evidenced negatives",
        });
      }
    }

    // Derive 7-point verdict from percentage
    const calibratedVerdict = percentageToClaimVerdict(truthPct);
    return {
      ...cv,
      llmVerdict: cv.verdict,
      verdict: calibratedVerdict,
      truthPercentage: truthPct,
      claimText: claim?.text || "",
      isCentral: claim?.isCentral || false,
      keyFactorId: claim?.keyFactorId || "", // Preserve KeyFactor mapping for aggregation
      relatedProceedingId: proceedingId,
      highlightColor: getHighlightColor7Point(calibratedVerdict),
    };
  });

  const weightedClaimVerdicts = applyEvidenceWeighting(
    claimVerdicts,
    state.facts,
    state.sources,
  );

  const claimPattern = {
    total: weightedClaimVerdicts.length,
    supported: weightedClaimVerdicts.filter((v) => v.truthPercentage >= 72)
      .length,
    uncertain: weightedClaimVerdicts.filter(
      (v) => v.truthPercentage >= 43 && v.truthPercentage < 72,
    ).length,
    refuted: weightedClaimVerdicts.filter((v) => v.truthPercentage < 43).length,
    centralClaimsTotal: weightedClaimVerdicts.filter((v) => v.isCentral).length,
    centralClaimsSupported: weightedClaimVerdicts.filter(
      (v) => v.isCentral && v.truthPercentage >= 72,
    ).length,
  };

  const calibrationNote = hasContestedFactors
    ? "Some negative factors are politically contested claims and given reduced weight."
    : undefined;

  // Use average truth percentage from proceedings
  const derivedAnswer = percentageToQuestionAnswer(avgTruthPct);

  const questionAnswer: QuestionAnswer = {
    question: understanding.questionBeingAsked || state.originalInput,
    llmAnswer: overallLlmAnswer,
    answer: derivedAnswer,
    confidence: avgConfidence,
    truthPercentage: avgTruthPct,
    shortAnswer: parsed.questionAnswer.shortAnswer,
    nuancedAnswer: parsed.questionAnswer.nuancedAnswer,
    keyFactors: parsed.questionAnswer.keyFactors,
    hasMultipleProceedings: true,
    proceedingAnswers: correctedProceedingAnswers,
    proceedingSummary: parsed.proceedingSummary,
    calibrationNote,
    hasContestedFactors,
  };

  // Calculate claims average truth percentage
  const claimsAvgTruthPct = Math.round(
    weightedClaimVerdicts.reduce((sum, v) => sum + v.truthPercentage, 0) /
      weightedClaimVerdicts.length,
  );

  const articleAnalysis: ArticleAnalysis = {
    inputType: "question",
    isQuestion: true,
    questionAnswer,
    hasMultipleProceedings: true,
    proceedings: understanding.distinctProceedings,
    articleThesis: understanding.impliedClaim || understanding.articleThesis,
    logicalFallacies: [],

    // Claims summary
    claimsAverageTruthPercentage: claimsAvgTruthPct,
    claimsAverageVerdict: percentageToArticleVerdict(claimsAvgTruthPct),

    // Article verdict (for questions = question answer)
    articleTruthPercentage: avgTruthPct,
    articleVerdict: percentageToArticleVerdict(avgTruthPct),
    articleVerdictReason: undefined,

    claimPattern,
  };

  return {
    claimVerdicts: weightedClaimVerdicts,
    articleAnalysis,
    questionAnswer,
  };
}

async function generateQuestionVerdicts(
  state: ResearchState,
  understanding: ClaimUnderstanding,
  factsFormatted: string,
  claimsFormatted: string,
  model: any,
): Promise<{
  claimVerdicts: ClaimVerdict[];
  articleAnalysis: ArticleAnalysis;
  questionAnswer: QuestionAnswer;
}> {
  // Get current date for temporal reasoning
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDay = currentDate.getDate();
  const currentDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
  const currentDateReadable = currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const systemPrompt = `Answer the question based on documented evidence.

## CRITICAL: TEMPORAL REASONING

**CURRENT DATE**: Today is ${currentDateReadable} (${currentDateStr}).

**DATE REASONING RULES**:
- When evaluating dates mentioned in claims, compare them to the CURRENT DATE above
- Do NOT assume dates are in the future without checking against the current date
- Do NOT reject claims as "impossible" based on incorrect temporal assumptions
- If a date seems inconsistent, verify it against the current date before making judgments

## SHORT ANSWER GUIDANCE:
- shortAnswer MUST be a complete descriptive sentence summarizing the finding
- Example: "The evidence shows proper procedures were followed."
- NEVER use just a verdict word like "YES" or "PARTIALLY" as the shortAnswer

## KEY FACTOR SCORING RULES - VERY IMPORTANT:
- supports="yes": Factor supports the claim with evidence (from sources OR your background knowledge)
- supports="no": Factor refutes the claim with counter-evidence (NOT just disputed/contested)
- supports="neutral": Use ONLY when you genuinely have no information about this factor

${CONFIG.allowModelKnowledge ? `IMPORTANT: You MUST use your background knowledge! For well-known public events and widely-reported facts, use what you know!
DO NOT mark factors as "neutral" if you know the answer from your training data.` : "Use ONLY the provided facts and sources."}

CRITICAL: Being "contested" by political opponents does NOT make something neutral.
Example: "Critics claim X was unfair" but X followed proper procedures = "yes", not "neutral"

## Mark contested factors:
- isContested: true if this claim is politically disputed
- contestedBy: Who disputes it (empty string if not contested)
- factualBasis: Does opposition have ACTUAL DOCUMENTED COUNTER-EVIDENCE?
  * "established" = Opposition cites SPECIFIC DOCUMENTED FACTS (court records, leaked documents)
  * "disputed" = Opposition has some factual counter-evidence but debatable
  * "opinion" = NO factual counter-evidence (just claims, political statements, executive orders)
  * "unknown" = Cannot determine

CRITICAL - factualBasis MUST be "opinion" for:
- Executive orders, sanctions, government decrees (political actions, not evidence)
- Statements by supporters, politicians, officials (claims are not evidence)
- Calling something "unfair" or "persecution" without documented violations

## CLAIM VERDICT RULES:
- WELL-SUPPORTED: Evidence supports the claim AND no actual counter-evidence exists
  * Example: "Proper procedures were followed" - if you know procedures were followed = WELL-SUPPORTED
- PARTIALLY-SUPPORTED: Mix of supporting and refuting evidence
- UNCERTAIN: Only when you genuinely have NO information either way (extremely rare!)
- REFUTED: Actual evidence contradicts the claim

CRITICAL: Political contestation is NOT counter-evidence.
Use WELL-SUPPORTED if you know the facts support the claim despite political opposition.

${getKnowledgeInstruction(state.originalInput, understanding)}
${getProviderPromptHint()}`;

  const userPrompt = `## QUESTION
"${understanding.questionBeingAsked || state.originalInput}"

## CLAIMS
${claimsFormatted}

## FACTS
${factsFormatted}`;

  let parsed: z.infer<typeof VERDICTS_SCHEMA_SIMPLE> | null = null;

  try {
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      output: Output.object({ schema: VERDICTS_SCHEMA_SIMPLE }),
    });
    state.llmCalls++;

    // Handle different AI SDK versions - safely extract structured output
    const rawOutput = extractStructuredOutput(result);
    if (rawOutput) {
      parsed = rawOutput as z.infer<typeof VERDICTS_SCHEMA_SIMPLE>;
    }
  } catch (err) {
    console.warn(
      "[Analyzer] Structured output failed for question verdicts, using fallback:",
      err,
    );
    state.llmCalls++;
  }

  // Fallback if structured output failed or questionAnswer is missing
  if (!parsed || !parsed.claimVerdicts || !parsed.questionAnswer) {
    console.log("[Analyzer] Using fallback question verdict generation (parsed:", !!parsed, ", claimVerdicts:", !!parsed?.claimVerdicts, ", questionAnswer:", !!parsed?.questionAnswer, ")");

    const fallbackVerdicts: ClaimVerdict[] = understanding.subClaims.map(
      (claim: any) => ({
        claimId: claim.id,
        claimText: claim.text,
        llmVerdict: "UNCERTAIN",
        verdict: "UNVERIFIED" as const,
        confidence: 50,
        truthPercentage: 50,
        riskTier: "B" as const,
        reasoning: "Unable to generate verdict due to schema validation error.",
        supportingFactIds: [],
        isCentral: claim.isCentral || false,
        highlightColor: getHighlightColor7Point("UNVERIFIED"),
        isContested: false,
        contestedBy: "",
        factualBasis: "unknown" as const,
      }),
    );

    const questionAnswer: QuestionAnswer = {
      question: understanding.questionBeingAsked || state.originalInput || "",
      llmAnswer: "INSUFFICIENT-EVIDENCE",
      answer: "UNVERIFIED",
      confidence: 50,
      truthPercentage: 50,
      shortAnswer: "Unable to determine - analysis failed",
      nuancedAnswer:
        "The structured output generation failed. Manual review recommended.",
      keyFactors: [],
      hasMultipleProceedings: false,
    };

    const centralTotal = fallbackVerdicts.filter((v) => v.isCentral).length;
    const centralSupported = fallbackVerdicts.filter(
      (v) => v.isCentral && v.truthPercentage >= 72,
    ).length;
    const articleAnalysis: ArticleAnalysis = {
      inputType: "question",
      isQuestion: true,
      questionAnswer,
      hasMultipleProceedings: false,
      articleThesis: understanding.articleThesis,
      logicalFallacies: [],
      claimsAverageTruthPercentage: 50,
      claimsAverageVerdict: "UNVERIFIED",
      articleTruthPercentage: 50,
      articleVerdict: "UNVERIFIED",
      claimPattern: {
        total: fallbackVerdicts.length,
        supported: 0,
        uncertain: fallbackVerdicts.length,
        refuted: 0,
        centralClaimsTotal: centralTotal,
        centralClaimsSupported: centralSupported,
      },
    };

    return { claimVerdicts: fallbackVerdicts, articleAnalysis, questionAnswer };
  }

  // Normal flow with parsed output

  // Map LLM verdicts by claim ID for quick lookup
  const llmVerdictMap = new Map(
    (parsed.claimVerdicts || []).map((cv: any) => [cv.claimId, cv]),
  );

  // Ensure ALL claims get a verdict
  const claimVerdicts: ClaimVerdict[] = understanding.subClaims.map(
    (claim: any) => {
      const cv = llmVerdictMap.get(claim.id);

      if (!cv) {
        console.warn(
          `[Analyzer] Missing verdict for claim ${claim.id}, using default`,
        );
        return {
          claimId: claim.id,
          claimText: claim.text,
          llmVerdict: "UNCERTAIN",
          verdict: "UNVERIFIED" as const,
          confidence: 50,
          truthPercentage: 50,
          riskTier: "B" as const,
          reasoning: "No verdict returned by LLM for this claim.",
          supportingFactIds: [],
          isCentral: claim.isCentral || false,
          startOffset: claim.startOffset,
          endOffset: claim.endOffset,
          highlightColor: getHighlightColor7Point("UNVERIFIED"),
        } as ClaimVerdict;
      }

      const truthPct = calculateTruthPercentage(cv.verdict, cv.confidence);
      const calibratedVerdict = percentageToClaimVerdict(truthPct);
      return {
        ...cv,
        claimId: claim.id,
        llmVerdict: cv.verdict,
        verdict: calibratedVerdict,
        truthPercentage: truthPct,
        claimText: claim.text || "",
        isCentral: claim.isCentral || false,
        startOffset: claim.startOffset,
        endOffset: claim.endOffset,
        highlightColor: getHighlightColor7Point(calibratedVerdict),
      } as ClaimVerdict;
    },
  );

  const weightedClaimVerdicts = applyEvidenceWeighting(
    claimVerdicts,
    state.facts,
    state.sources,
  );

  const claimPattern = {
    total: weightedClaimVerdicts.length,
    supported: weightedClaimVerdicts.filter((v) => v.truthPercentage >= 72)
      .length,
    uncertain: weightedClaimVerdicts.filter(
      (v) => v.truthPercentage >= 43 && v.truthPercentage < 72,
    ).length,
    refuted: weightedClaimVerdicts.filter((v) => v.truthPercentage < 43).length,
    centralClaimsTotal: weightedClaimVerdicts.filter((v) => v.isCentral).length,
    centralClaimsSupported: weightedClaimVerdicts.filter(
      (v) => v.isCentral && v.truthPercentage >= 72,
    ).length,
  };

  const keyFactors = parsed.questionAnswer.keyFactors || [];
  // Only flag contested negatives with evidence-based contestation
  const hasContestedFactors = keyFactors.some(
    (kf: any) =>
      kf.supports === "no" &&
      kf.isContested &&
      (kf.factualBasis === "established" || kf.factualBasis === "disputed"),
  );

  // v2.5.1: Apply factor-based correction for single-proceeding questions
  const positiveFactors = keyFactors.filter((f: KeyFactor) => f.supports === "yes").length;
  const evidencedNegatives = keyFactors.filter(
    (f: KeyFactor) => f.supports === "no" && f.factualBasis === "established",
  ).length;
  const contestedNegatives = keyFactors.filter(
    (f: KeyFactor) => f.supports === "no" && f.isContested,
  ).length;

  let correctedLlmAnswer = parsed.questionAnswer.answer;
  // Normalize confidence: if LLM returned decimal (0-1), convert to percentage (0-100)
  let correctedConfidence = parsed.questionAnswer.confidence <= 1 && parsed.questionAnswer.confidence > 0
    ? Math.round(parsed.questionAnswer.confidence * 100)
    : parsed.questionAnswer.confidence;

  // If there are positive factors and NO evidenced negatives, should lean YES
  if (positiveFactors > 0 && evidencedNegatives === 0) {
    if (correctedLlmAnswer === "NO" || correctedLlmAnswer === "PARTIALLY") {
      correctedLlmAnswer = "YES";
      correctedConfidence = Math.max(correctedConfidence, 70);
      debugLog("generateQuestionVerdicts: Corrected answer", {
        from: parsed.questionAnswer.answer,
        to: correctedLlmAnswer,
        reason: `${positiveFactors} positive, 0 evidenced negatives (${contestedNegatives} contested without evidence)`,
      });
    }
  }

  // Calculate truth percentage and derive answer
  const answerTruthPct = calculateQuestionTruthPercentage(
    correctedLlmAnswer,
    correctedConfidence,
  );
  const calibratedAnswer = percentageToQuestionAnswer(answerTruthPct);

  const questionAnswer: QuestionAnswer = {
    question: understanding.questionBeingAsked || state.originalInput,
    llmAnswer: parsed.questionAnswer.answer,
    answer: calibratedAnswer,
    confidence: correctedConfidence,
    truthPercentage: answerTruthPct,
    shortAnswer: parsed.questionAnswer.shortAnswer || "",
    nuancedAnswer: parsed.questionAnswer.nuancedAnswer || "",
    keyFactors,
    hasMultipleProceedings: false,
    hasContestedFactors,
  };

  // Calculate claims average truth percentage
  const claimsAvgTruthPct =
    weightedClaimVerdicts.length > 0
      ? Math.round(
          weightedClaimVerdicts.reduce((sum, v) => sum + v.truthPercentage, 0) /
            weightedClaimVerdicts.length,
        )
      : 50;

  const articleAnalysis: ArticleAnalysis = {
    inputType: "question",
    isQuestion: true,
    questionAnswer,
    hasMultipleProceedings: false,
    articleThesis: understanding.impliedClaim || understanding.articleThesis,
    logicalFallacies: [],

    // Claims summary
    claimsAverageTruthPercentage: claimsAvgTruthPct,
    claimsAverageVerdict: percentageToArticleVerdict(claimsAvgTruthPct),

    // Article verdict (for questions = question answer)
    articleTruthPercentage: answerTruthPct,
    articleVerdict: percentageToArticleVerdict(answerTruthPct),
    articleVerdictReason:
      Math.abs(answerTruthPct - claimsAvgTruthPct) > 15
        ? `Claims avg: ${percentageToArticleVerdict(claimsAvgTruthPct)} (${claimsAvgTruthPct}%)`
        : undefined,

    claimPattern,
  };

  return {
    claimVerdicts: weightedClaimVerdicts,
    articleAnalysis,
    questionAnswer,
  };
}

async function generateClaimVerdicts(
  state: ResearchState,
  understanding: ClaimUnderstanding,
  factsFormatted: string,
  claimsFormatted: string,
  model: any,
  pseudoscienceAnalysis?: PseudoscienceAnalysis,
): Promise<{
  claimVerdicts: ClaimVerdict[];
  articleAnalysis: ArticleAnalysis;
}> {
  // Detect if topic involves procedural/legal/institutional analysis
  // This determines whether to generate Key Factors (unified with question mode)
  const isProceduralTopic = detectProceduralTopic(understanding, state.originalText);

  // Add pseudoscience context and verdict calibration to prompt
  // Also add Article Verdict Problem analysis per POC1 spec
  // Get current date for temporal reasoning
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDay = currentDate.getDate();
  const currentDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
  const currentDateReadable = currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  let systemPrompt = `Generate verdicts for each claim AND an independent article-level verdict.

## CRITICAL: TEMPORAL REASONING

**CURRENT DATE**: Today is ${currentDateReadable} (${currentDateStr}).

**DATE REASONING RULES**:
- When evaluating dates mentioned in claims, compare them to the CURRENT DATE above
- Do NOT assume dates are in the future without checking against the current date
- Do NOT reject claims as "impossible" based on incorrect temporal assumptions
- If a date seems inconsistent, verify it against the current date before making judgments

## CLAIM VERDICT CALIBRATION (IMPORTANT):
- WELL-SUPPORTED: Strong evidence supports the claim
- PARTIALLY-SUPPORTED: Some evidence, but incomplete
- UNCERTAIN: Insufficient evidence to determine
- REFUTED: Strong evidence against the claim, including definitively false claims (e.g., "2+2=5")

Use REFUTED for any claim that evidence contradicts, regardless of certainty level.

## CLAIM CONTESTATION (for each claim):
- isContested: true if this claim is politically disputed or challenged
- contestedBy: Who disputes it (e.g., "climate skeptics", "vaccine opponents") - empty string if not contested
- factualBasis: Does the opposition have ACTUAL DOCUMENTED COUNTER-EVIDENCE?
  * "established" = Opposition cites SPECIFIC DOCUMENTED FACTS (studies, data, records)
  * "disputed" = Opposition has some factual counter-evidence but debatable
  * "opinion" = NO factual counter-evidence (just claims, political statements)
  * "unknown" = Cannot determine

CRITICAL - factualBasis MUST be "opinion" for:
- Political statements or rhetoric without documented evidence
- Ideological objections without factual basis
- "Some people say" or "critics claim" without specific counter-evidence

## ARTICLE VERDICT ANALYSIS (CRITICAL - Article Verdict Problem)

The article's overall credibility is NOT simply the average of individual claim verdicts!
An article with mostly accurate facts can still be MISLEADING if:
1. The main conclusion doesn't follow from the evidence
2. There are logical fallacies (correlation ≠ causation, cherry-picking, etc.)
3. The framing creates a false impression despite accurate individual facts

AFTER analyzing individual claims, evaluate the article as a whole:

1. What is the article's main argument or conclusion (thesis)?
2. Does this conclusion LOGICALLY FOLLOW from the evidence presented?
3. Are there LOGICAL FALLACIES?
   - Correlation presented as causation
   - Cherry-picking evidence
   - False equivalence
   - Appeal to authority without substance
   - Hasty generalization
4. Even if individual facts are accurate, is the article's framing MISLEADING?
5. Are CENTRAL claims (marked [CENTRAL]) true? If central claims are FALSE but supporting claims are TRUE, the article is MISLEADING.

ARTICLE VERDICT OPTIONS:
- CREDIBLE: Main thesis is well-supported, no significant logical issues
- MOSTLY-CREDIBLE: Some minor issues but overall sound reasoning
- MISLEADING: Contains accurate facts BUT draws unsupported conclusions OR uses misleading framing
- FALSE: Central claims are demonstrably false

IMPORTANT: Set verdictDiffersFromClaimAverage=true if the article verdict differs from what a simple average would suggest.
Example: If 3/4 claims are TRUE but the main conclusion is FALSE → article verdict = MISLEADING (not MOSTLY-CREDIBLE)

${getKnowledgeInstruction(state.originalInput, understanding)}
${getProviderPromptHint()}`;

  // KeyFactors are now generated in understanding phase, not verdict generation
  systemPrompt += `

## KEY FACTORS
KeyFactors are handled in the understanding phase. Provide an empty keyFactors array: []`;

  if (pseudoscienceAnalysis?.isPseudoscience) {
    systemPrompt += `\n\nPSEUDOSCIENCE DETECTED: This content contains patterns associated with pseudoscience (${pseudoscienceAnalysis.categories.join(", ")}).
Claims relying on mechanisms that contradict established science (like "water memory", "molecular restructuring", etc.) should be marked as REFUTED, not UNCERTAIN.
However, do NOT mark them as FALSE unless you can prove them wrong with 99%+ certainty - we can't prove a negative absolutely.`;
  }

  let parsed: z.infer<typeof VERDICTS_SCHEMA_CLAIM> | null = null;

  try {
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `THESIS: "${understanding.articleThesis}"\n\nCLAIMS:\n${claimsFormatted}\n\nFACTS:\n${factsFormatted}`,
        },
      ],
      temperature: 0.3,
      output: Output.object({ schema: VERDICTS_SCHEMA_CLAIM }),
    });
    state.llmCalls++;

    // Handle different AI SDK versions - safely extract structured output
    const rawOutput = extractStructuredOutput(result);
    if (rawOutput) {
      parsed = rawOutput as z.infer<typeof VERDICTS_SCHEMA_CLAIM>;
    }
  } catch (err: any) {
    console.error(
      "[Analyzer] Structured output failed for claim verdicts:",
      err?.message || err,
    );
    console.error("[Analyzer] Full error:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2).slice(0, 2000));
    state.llmCalls++;
  }

  // If structured output failed, create fallback verdicts
  if (!parsed || !parsed.claimVerdicts) {
    console.log("[Analyzer] Using fallback verdict generation");

    // Create default verdicts for each claim
    const fallbackVerdicts: ClaimVerdict[] = understanding.subClaims.map(
      (claim: any) => {
        const calibratedVerdict = "UNVERIFIED" as const;
        return {
          claimId: claim.id,
          claimText: claim.text,
          llmVerdict: "UNCERTAIN",
          verdict: calibratedVerdict,
          confidence: 50,
          truthPercentage: 50,
          riskTier: "B" as const,
          reasoning:
            "Unable to generate verdict due to schema validation error. Manual review recommended.",
          supportingFactIds: [],
          isCentral: claim.isCentral || false,
          startOffset: claim.startOffset,
          endOffset: claim.endOffset,
          highlightColor: getHighlightColor7Point(calibratedVerdict),
          isContested: false,
          contestedBy: "",
          factualBasis: "unknown" as const,
        };
      },
    );

    const centralTotal = fallbackVerdicts.filter((v) => v.isCentral).length;
    const centralSupported = fallbackVerdicts.filter(
      (v) => v.isCentral && v.truthPercentage >= 72,
    ).length;
    const articleAnalysis: ArticleAnalysis = {
      inputType: "article",
      isQuestion: false,
      hasMultipleProceedings: false,
      articleThesis: understanding.articleThesis,
      logicalFallacies: [],
      claimsAverageTruthPercentage: 50,
      claimsAverageVerdict: "UNVERIFIED",
      articleTruthPercentage: 50,
      articleVerdict: "UNVERIFIED",
      articleVerdictReason:
        "Verdict generation failed - manual review recommended",
      claimPattern: {
        total: fallbackVerdicts.length,
        supported: 0,
        uncertain: fallbackVerdicts.length,
        refuted: 0,
        centralClaimsTotal: centralTotal,
        centralClaimsSupported: centralSupported,
      },
    };

    return { claimVerdicts: fallbackVerdicts, articleAnalysis };
  }

  // Normal flow with parsed output

  // Map LLM verdicts by claim ID for quick lookup
  const llmVerdictMap = new Map(
    (parsed.claimVerdicts || []).map((cv: any) => [cv.claimId, cv]),
  );

  // Ensure ALL claims get a verdict (fill in missing ones)
  const claimVerdicts: ClaimVerdict[] = understanding.subClaims.map(
    (claim: any) => {
      const cv = llmVerdictMap.get(claim.id);

      // If LLM didn't return a verdict for this claim, create a default one
      if (!cv) {
        console.warn(
          `[Analyzer] Missing verdict for claim ${claim.id}, using default`,
        );
        return {
          claimId: claim.id,
          claimText: claim.text,
          llmVerdict: "UNCERTAIN",
          verdict: "UNVERIFIED" as const,
          confidence: 50,
          truthPercentage: 50,
          riskTier: "B" as const,
          reasoning: "No verdict returned by LLM for this claim.",
          supportingFactIds: [],
          isContested: false,
          contestedBy: "",
          factualBasis: "unknown",
          isCentral: claim.isCentral || false,
          claimRole: claim.claimRole || "core",
          dependsOn: claim.dependsOn || [],
          keyFactorId: claim.keyFactorId || "", // Preserve KeyFactor mapping
          startOffset: claim.startOffset,
          endOffset: claim.endOffset,
          highlightColor: getHighlightColor7Point("UNVERIFIED"),
        } as ClaimVerdict;
      }

      let llmVerdict = cv.verdict;
      let finalConfidence = cv.confidence;
      let escalationReason: string | undefined;

      const claimPseudo = detectPseudoscience(claim.text || cv.claimId);

      // Apply pseudoscience escalation only when the claim itself matches pseudoscience patterns
      if (claimPseudo.isPseudoscience) {
        const escalation = escalatePseudoscienceVerdict(
          cv.verdict,
          cv.confidence,
          claimPseudo,
        );
        llmVerdict = escalation.verdict;
        finalConfidence = escalation.confidence;
        escalationReason = escalation.escalationReason;
      }

      // Calibrate to 7-point scale
      let truthPct = calculateTruthPercentage(llmVerdict, finalConfidence);
      const evidenceBasedContestation =
        cv.isContested &&
        (cv.factualBasis === "established" || cv.factualBasis === "disputed");
      if (evidenceBasedContestation) {
        const penalty = cv.factualBasis === "established" ? 12 : 8;
        truthPct = Math.max(0, truthPct - penalty);
      }
      const calibratedVerdict = percentageToClaimVerdict(truthPct);

      return {
        ...cv,
        claimId: claim.id,
        llmVerdict: cv.verdict, // Original LLM output
        verdict: calibratedVerdict,
        truthPercentage: truthPct,
        confidence: finalConfidence,
        claimText: claim.text || "",
        isCentral: claim.isCentral || false,
        claimRole: claim.claimRole || "core",
        dependsOn: claim.dependsOn || [],
        keyFactorId: claim.keyFactorId || "", // Preserve KeyFactor mapping for aggregation
        startOffset: claim.startOffset,
        endOffset: claim.endOffset,
        highlightColor: getHighlightColor7Point(calibratedVerdict),
        isPseudoscience: claimPseudo.isPseudoscience,
        escalationReason,
      } as ClaimVerdict;
    },
  );

  const weightedClaimVerdicts = applyEvidenceWeighting(
    claimVerdicts,
    state.facts,
    state.sources,
  );

  // DEPENDENCY PROPAGATION: If a prerequisite claim is false, flag dependent claims
  const verdictMap = new Map(weightedClaimVerdicts.map((v) => [v.claimId, v]));

  for (const verdict of weightedClaimVerdicts) {
    const claim = understanding.subClaims.find(
      (c: any) => c.id === verdict.claimId,
    );
    const dependencies = claim?.dependsOn || [];

    if (dependencies.length > 0) {
      // Check if any dependency is false (truthPercentage < 43%)
      const failedDeps = dependencies.filter((depId: string) => {
        const depVerdict = verdictMap.get(depId);
        return depVerdict && depVerdict.truthPercentage < 43;
      });

      if (failedDeps.length > 0) {
        // Mark this claim as having failed prerequisites
        verdict.dependencyFailed = true;
        verdict.failedDependencies = failedDeps;

        // Add note to reasoning
        const depNames = failedDeps
          .map((id: string) => {
            const dv = verdictMap.get(id);
            return dv ? `${id}: "${dv.claimText.slice(0, 50)}..."` : id;
          })
          .join(", ");

        verdict.reasoning = `[PREREQUISITE FAILED: ${depNames}] ${verdict.reasoning || ""}`;

        // For display purposes, we keep the original verdict but flag it
        // The UI can choose to show this differently
      }
    }
  }

  // Filter out claims with failed dependencies for verdict calculations
  // These claims are shown but don't contribute to the overall verdict to avoid double-counting
  // (the failed prerequisite already contributes its false verdict)
  const independentVerdicts = weightedClaimVerdicts.filter((v) => !v.dependencyFailed);

  // Calculate claim pattern using truth percentages (only independent claims)
  const claimPattern = {
    total: weightedClaimVerdicts.length,
    supported: independentVerdicts.filter((v) => v.truthPercentage >= 72)
      .length,
    uncertain: independentVerdicts.filter(
      (v) => v.truthPercentage >= 43 && v.truthPercentage < 72,
    ).length,
    refuted: independentVerdicts.filter((v) => v.truthPercentage < 43).length,
    centralClaimsTotal: independentVerdicts.filter((v) => v.isCentral).length,
    centralClaimsSupported: independentVerdicts.filter(
      (v) => v.isCentral && v.truthPercentage >= 72,
    ).length,
    // Track excluded claims for transparency
    dependencyFailedCount: weightedClaimVerdicts.filter((v) => v.dependencyFailed).length,
  };

  // Calculate claims average truth percentage (only independent claims)
  const claimsAvgTruthPct =
    independentVerdicts.length > 0
      ? Math.round(
          independentVerdicts.reduce((sum, v) => sum + v.truthPercentage, 0) /
            independentVerdicts.length,
        )
      : 50;

  // Article Verdict Problem: Check central claims specifically (using independent verdicts only)
  // If central claims are refuted but supporting claims are true, article is MISLEADING
  const centralClaims = independentVerdicts.filter((v) => v.isCentral);
  const centralRefuted = centralClaims.filter((v) => v.truthPercentage < 43);
  const centralSupported = centralClaims.filter((v) => v.truthPercentage >= 72);
  const nonCentralClaims = independentVerdicts.filter((v) => !v.isCentral);
  const nonCentralSupported = nonCentralClaims.filter((v) => v.truthPercentage >= 72);

  // Detect Article Verdict Problem pattern: accurate supporting facts but false central claim
  const hasMisleadingPattern =
    centralRefuted.length > 0 &&
    nonCentralSupported.length >= 2 &&
    claimsAvgTruthPct >= 50; // Average looks OK but central claim is false

  // Calculate article truth percentage from LLM's article verdict
  let articleTruthPct = calculateArticleTruthPercentage(
    parsed.articleAnalysis.articleVerdict,
    parsed.articleAnalysis.articleConfidence,
  );

  let articleVerdictOverrideReason: string | undefined;

  // If LLM returned default/unknown verdict (50%), use claims average instead
  if (articleTruthPct === 50 && claimsAvgTruthPct !== 50) {
    articleTruthPct = claimsAvgTruthPct;
  }

  // Article Verdict Problem Override: Central claim refuted = article MISLEADING
  // This catches the "Coffee cures cancer" pattern where supporting facts are true
  // but the main conclusion is false
  if (hasMisleadingPattern && articleTruthPct > 35) {
    console.log(`[Analyzer] Article Verdict Problem detected: ${centralRefuted.length} central claims refuted, ${nonCentralSupported.length} supporting claims true, but avg=${claimsAvgTruthPct}%. Overriding to MISLEADING.`);
    articleTruthPct = 35; // MISLEADING range (29-42%)
    articleVerdictOverrideReason = `Central claim(s) refuted despite ${nonCentralSupported.length} accurate supporting facts - article draws unsupported conclusions`;
  }

  const hasPseudoscienceClaims = weightedClaimVerdicts.some((v) => v.isPseudoscience);

  // For pseudoscience: article verdict cannot be higher than claims average
  // (can't have a credible article with false claims)
  if (
    pseudoscienceAnalysis?.isPseudoscience &&
    hasPseudoscienceClaims &&
    articleTruthPct > claimsAvgTruthPct
  ) {
    articleTruthPct = Math.min(claimsAvgTruthPct, 28); // Cap at FALSE level for pseudoscience
    articleVerdictOverrideReason = `Pseudoscience detected - article verdict capped`;
  }

  // Check if article verdict differs significantly from claims average
  const verdictDiffers = Math.abs(articleTruthPct - claimsAvgTruthPct) > 15 || hasMisleadingPattern;

  // Process Key Factors by aggregating claim verdicts (moved from verdict generation to understanding)
  const keyFactors: KeyFactor[] = [];

  // Only process KeyFactors if they were discovered during understanding
  if (understanding.keyFactors && understanding.keyFactors.length > 0) {
    for (const factor of understanding.keyFactors) {
      // Find all claims mapped to this factor
      const factorClaims = weightedClaimVerdicts.filter(v => v.keyFactorId === factor.id);

      if (factorClaims.length > 0) {
        // Aggregate verdicts for this factor
        const factorAvgTruthPct = Math.round(
          factorClaims.reduce((sum, v) => sum + v.truthPercentage, 0) / factorClaims.length
        );

        // Determine factor support based on average
        let supports: "yes" | "no" | "neutral";
        if (factorAvgTruthPct >= 72) {
          supports = "yes";
        } else if (factorAvgTruthPct < 43) {
          supports = "no";
        } else {
          supports = "neutral";
        }

        // Create explanation from aggregated claim verdicts
        const supportedCount = factorClaims.filter(v => v.truthPercentage >= 72).length;
        const refutedCount = factorClaims.filter(v => v.truthPercentage < 43).length;
        const explanation = `${supportedCount}/${factorClaims.length} claims support this factor, ${refutedCount} refute it. Average truth: ${factorAvgTruthPct}%.`;

        keyFactors.push({
          factor: factor.factor,
          supports,
          explanation,
          isContested: false, // Will be determined by contestation analysis
          contestedBy: "",
          contestationReason: "",
          factualBasis: "unknown",
        });
      }
    }
  }

  // Check if any negative factors are contested with evidence-based contestation
  const hasContestedFactors = keyFactors.some(
    (f) =>
      f.supports === "no" &&
      f.isContested &&
      (f.factualBasis === "established" || f.factualBasis === "disputed")
  );

  console.log(`[Analyzer] Key Factors aggregated: ${keyFactors.length} factors from ${understanding.keyFactors?.length || 0} discovered, ${hasContestedFactors ? "has" : "no"} contested factors`);

  return {
    claimVerdicts: weightedClaimVerdicts,
    articleAnalysis: {
      inputType: understanding.detectedInputType,
      isQuestion: false,
      hasMultipleProceedings: false,
      articleThesis: understanding.articleThesis,
      logicalFallacies: parsed.articleAnalysis.logicalFallacies,

      // Claims summary
      claimsAverageTruthPercentage: claimsAvgTruthPct,
      claimsAverageVerdict: percentageToArticleVerdict(claimsAvgTruthPct),

      // Article verdict (LLM's independent assessment, with Article Verdict Problem override)
      articleTruthPercentage: articleTruthPct,
      articleVerdict: percentageToArticleVerdict(articleTruthPct),
      articleVerdictReason: articleVerdictOverrideReason
        ? articleVerdictOverrideReason
        : verdictDiffers
          ? articleTruthPct < claimsAvgTruthPct
            ? "Article uses facts misleadingly or draws unsupported conclusions"
            : "Article's conclusion is better supported than individual claims suggest"
          : undefined,

      // LLM outputs for debugging
      llmArticleVerdict: parsed.articleAnalysis.articleVerdict,
      llmArticleConfidence: parsed.articleAnalysis.articleConfidence,

      claimPattern,
      isPseudoscience: pseudoscienceAnalysis?.isPseudoscience,
      pseudoscienceCategories: pseudoscienceAnalysis?.categories,

      // NEW v2.6.18: Key Factors for article mode (unified with question mode)
      keyFactors: keyFactors.length > 0 ? keyFactors : undefined,
      hasContestedFactors: keyFactors.length > 0 ? hasContestedFactors : undefined,
    },
  };
}

function getHighlightColor(verdict: string): "green" | "yellow" | "red" {
  switch (verdict) {
    case "WELL-SUPPORTED":
      return "green";
    case "PARTIALLY-SUPPORTED":
    case "UNCERTAIN":
      return "yellow";
    case "REFUTED":
      return "red";
    default:
      return "yellow";
  }
}

// ============================================================================
// STEP 6-7: Summary & Report
// ============================================================================

async function generateTwoPanelSummary(
  state: ResearchState,
  claimVerdicts: ClaimVerdict[],
  articleAnalysis: ArticleAnalysis,
  model: any,
): Promise<TwoPanelSummary> {
  const understanding = state.understanding!;
  const isQuestion = articleAnalysis.isQuestion;
  const hasMultipleProceedings = articleAnalysis.hasMultipleProceedings;

  let title = isQuestion
    ? `Question: ${understanding.questionBeingAsked || state.originalInput}`
    : state.originalText.split("\n")[0]?.trim().slice(0, 100) ||
      "Analyzed Content";

  if (hasMultipleProceedings) {
    title += ` (${understanding.distinctProceedings.length} proceedings)`;
  }

  // Get the implied claim, filtering out placeholder values
  const impliedClaim = understanding.impliedClaim || understanding.articleThesis;
  const isValidImpliedClaim = impliedClaim &&
    !impliedClaim.toLowerCase().includes("unknown") &&
    impliedClaim !== "<UNKNOWN>" &&
    impliedClaim.length > 10;

  const articleSummary = {
    title,
    source:
      state.inputType === "url" ? state.originalInput : "User-provided text",
    mainArgument: isValidImpliedClaim
      ? impliedClaim
      : (understanding.subClaims[0]?.text || "Analysis of provided content"),
    keyFindings: understanding.subClaims.slice(0, 4).map((c: any) => c.text),
    reasoning: hasMultipleProceedings
      ? `Covers ${understanding.distinctProceedings.length} proceedings: ${understanding.distinctProceedings.map((p: DistinctProceeding) => p.shortName).join(", ")}`
      : `Examined ${understanding.subClaims.length} claims`,
    conclusion:
      articleAnalysis.questionAnswer?.shortAnswer ||
      (isValidImpliedClaim ? impliedClaim : understanding.subClaims[0]?.text || "See claims analysis"),
  };

  const analysisId = `FH-${Date.now().toString(36).toUpperCase()}`;

  let overallVerdict: string;
  if (isQuestion && articleAnalysis.questionAnswer) {
    const qa = articleAnalysis.questionAnswer;
    overallVerdict = `${qa.answer} (${qa.truthPercentage}%)`;
    if (hasMultipleProceedings && qa.proceedingSummary) {
      overallVerdict += `\n${qa.proceedingSummary}`;
    }
    if (qa.calibrationNote) {
      overallVerdict += `\n⚠️ ${qa.calibrationNote}`;
    }
  } else {
    overallVerdict = `${articleAnalysis.articleVerdict} (${articleAnalysis.articleTruthPercentage}%)`;
  }

  const inputUrl = state.inputType === "url" ? state.originalInput : undefined;

  const factharborAnalysis = {
    sourceCredibility: calculateOverallCredibility(state.sources, inputUrl),
    claimVerdicts: claimVerdicts.map((cv: ClaimVerdict) => ({
      claim:
        cv.claimText.slice(0, 80) + (cv.claimText.length > 80 ? "..." : ""),
      verdict: cv.verdict,
      truthPercentage: cv.truthPercentage,
    })),
    methodologyAssessment: generateMethodologyAssessment(
      state,
      articleAnalysis,
    ),
    overallVerdict,
    analysisId,
  };

  return { articleSummary, factharborAnalysis };
}

function calculateOverallCredibility(
  sources: FetchedSource[],
  inputUrl?: string,
): string {
  // First, check input source credibility if URL provided
  let inputSourceInfo = "";
  if (inputUrl && inputUrl.startsWith("http")) {
    try {
      const hostname = new URL(inputUrl).hostname.replace(/^www\./, "");
      const inputScore = getTrackRecordScore(inputUrl);
      if (inputScore !== null) {
        const level =
          inputScore >= 0.85
            ? "Very High"
            : inputScore >= 0.7
              ? "High"
              : inputScore >= 0.55
                ? "Medium"
                : "Low";
        inputSourceInfo = `${hostname}: ${level} (${(inputScore * 100).toFixed(0)}%)`;
      } else {
        inputSourceInfo = `${hostname}: Unknown`;
      }
    } catch {
      inputSourceInfo = "Unknown source";
    }
  }

  // Then check research sources
  const withScore = sources.filter(
    (s) => s.trackRecordScore !== null && s.fetchSuccess,
  );
  if (withScore.length === 0) {
    return inputSourceInfo || "Unknown";
  }

  const avg =
    withScore.reduce((sum, s) => sum + (s.trackRecordScore || 0), 0) /
    withScore.length;
  const researchLevel =
    avg >= 0.85
      ? "Very High"
      : avg >= 0.7
        ? "High"
        : avg >= 0.55
          ? "Medium"
          : "Low";
  const researchInfo = `Research sources: ${researchLevel} (${(avg * 100).toFixed(0)}%)`;

  if (inputSourceInfo) {
    return `${inputSourceInfo}\n${researchInfo}`;
  }
  return researchInfo;
}

function generateMethodologyAssessment(
  state: ResearchState,
  articleAnalysis: ArticleAnalysis,
): string {
  const parts: string[] = [];
  parts.push("Question-answering mode");
  if (articleAnalysis.hasMultipleProceedings)
    parts.push(`Multi-proceeding (${articleAnalysis.proceedings?.length})`);
  if (articleAnalysis.questionAnswer?.hasContestedFactors)
    parts.push("Contested factors flagged");
  parts.push(`${state.searchQueries.length} searches`);
  parts.push(`${state.sources.filter((s) => s.fetchSuccess).length} sources`);
  return parts.join("; ");
}

async function generateReport(
  state: ResearchState,
  claimVerdicts: ClaimVerdict[],
  articleAnalysis: ArticleAnalysis,
  twoPanelSummary: TwoPanelSummary,
  model: any,
): Promise<string> {
  const understanding = state.understanding!;
  const isQuestion = articleAnalysis.isQuestion;
  const hasMultipleProceedings = articleAnalysis.hasMultipleProceedings;
  const useRich = CONFIG.reportStyle === "rich";
  const iconPositive = useRich ? "✅" : "";
  const iconNegative = useRich ? "❌" : "";
  const iconNeutral = useRich ? "❓" : "";
  const iconWarning = useRich ? "⚠️" : "";
  const iconOk = useRich ? "✅" : "";
  const iconFail = useRich ? "❌" : "";

  let report = `# FactHarbor Analysis Report\n\n`;
  report += `**Analysis ID:** ${twoPanelSummary.factharborAnalysis.analysisId}\n`;
  report += `**Schema:** ${CONFIG.schemaVersion}\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;

  // Executive Summary (moved to top - public-facing content first)
  report += `## Executive Summary\n\n`;

  if (isQuestion && articleAnalysis.questionAnswer) {
    const qa = articleAnalysis.questionAnswer;
    report += `### Question\n"${qa.question}"\n\n`;
    report += `### Answer: ${qa.answer} (${qa.truthPercentage}%)\n\n`;

    if (qa.calibrationNote)
      report += `> ${iconWarning} ${qa.calibrationNote}\n\n`;

    report += `**Short Answer:** ${qa.shortAnswer}\n\n`;

    if (hasMultipleProceedings && qa.proceedingAnswers) {
      report += `## Proceedings Analysis\n\n`;
      for (const pa of qa.proceedingAnswers) {
        const proc = understanding.distinctProceedings.find(
          (p: DistinctProceeding) => p.id === pa.proceedingId,
        );
        const emoji =
          pa.truthPercentage >= 72
            ? iconPositive
            : pa.truthPercentage < 43
              ? iconNegative
              : iconNeutral;

        report += `### ${proc?.name || pa.proceedingName}\n\n`;
        report += `**Answer:** ${emoji} ${pa.answer} (${pa.truthPercentage}%)\n\n`;

        if (pa.factorAnalysis) {
          report += `**Factors:** ${pa.factorAnalysis.positiveFactors} positive, ${pa.factorAnalysis.negativeFactors} negative (${pa.factorAnalysis.contestedNegatives} contested)\n\n`;
        }

        report += `${pa.shortAnswer}\n\n`;

        if (pa.keyFactors?.length > 0) {
          report += `**Key Factors:**\n`;
          for (const f of pa.keyFactors) {
            const icon =
              f.supports === "yes"
                ? iconPositive
                : f.supports === "no"
                  ? iconNegative
                  : iconNeutral;
            report += `- ${icon} ${f.factor}${f.isContested ? ` ${iconWarning} CONTESTED` : ""}\n`;
          }
          report += `\n`;
        }
        report += `---\n\n`;
      }
    }
  } else {
    // Article mode - show Article Verdict prominently
    const verdictEmoji =
      articleAnalysis.articleTruthPercentage >= 72
        ? iconPositive
        : articleAnalysis.articleTruthPercentage >= 43
          ? iconNeutral
          : iconNegative;

    report += `### Article Verdict: ${verdictEmoji} ${articleAnalysis.articleVerdict} (${articleAnalysis.articleTruthPercentage}%)\n\n`;

    if (articleAnalysis.articleVerdictReason) {
      report += `> ${articleAnalysis.articleVerdictReason}\n\n`;
    }

    if (articleAnalysis.articleThesis &&
        articleAnalysis.articleThesis !== "<UNKNOWN>" &&
        !articleAnalysis.articleThesis.toLowerCase().includes("unknown")) {
      report += `**Implied Claim:** ${articleAnalysis.articleThesis}\n\n`;
    }

    // NEW: KeyFactors display for article mode (unified with question mode)
    if (articleAnalysis.keyFactors && articleAnalysis.keyFactors.length > 0) {
      report += `**Key Factors:**\n`;
      for (const f of articleAnalysis.keyFactors) {
        const icon =
          f.supports === "yes"
            ? iconPositive
            : f.supports === "no"
              ? iconNegative
              : iconNeutral;
        report += `- ${icon} ${f.factor}${f.isContested ? ` ${iconWarning} CONTESTED` : ""}\n`;
      }
      report += `\n`;
    }
  }

  // Claims
  report += `## Claims\n\n`;
  for (const cv of claimVerdicts) {
    // 7-level scale emoji mapping based on truthPercentage
    const emoji =
      cv.truthPercentage >= 72
        ? iconPositive
        : cv.truthPercentage >= 43
          ? iconNeutral
          : iconNegative;

    report += `**${cv.claimId}:** ${cv.claimText} ${emoji} ${cv.verdict} (${cv.truthPercentage}% truth)\n\n`;
  }

  // Sources
  report += `## Sources\n\n`;
  for (const s of state.sources) {
    const status = s.fetchSuccess ? iconOk : iconFail;
    report += `- ${status} [${s.title}](${s.url})`;
    if (s.trackRecordScore)
      report += ` (${(s.trackRecordScore * 100).toFixed(0)}%)`;
    report += `\n`;
  }

  // Technical Notes (moved to bottom - development/technical info)
  report += `\n---\n\n`;
  report += `## Technical Notes\n\n`;
  report += `### Research Summary\n\n`;
  report += `| Metric | Value |\n`;
  report += `| --- | --- |\n`;
  report += `| Web searches | ${state.searchQueries.length} |\n`;
  report += `| LLM calls | ${state.llmCalls} |\n`;
  report += `| Sources fetched | ${state.sources.length} |\n`;
  report += `| Sources successful | ${state.sources.filter((s: FetchedSource) => s.fetchSuccess).length} |\n`;
  report += `| Facts extracted | ${state.facts.length} |\n`;
  report += `| Search provider | ${CONFIG.searchProvider} |\n`;
  report += `| Analysis mode | ${CONFIG.deepModeEnabled ? "deep" : "quick"} |\n\n`;

  if (state.searchQueries.length > 0) {
    report += `### Web Search Queries\n\n`;
    for (const sq of state.searchQueries) {
      report += `- \`${sq.query}\` → ${sq.resultsCount} results (${sq.focus})\n`;
    }
    report += `\n`;
  }

  return report;
}

// ============================================================================
// MODEL SELECTION
// ============================================================================

function getModel(providerOverride?: string) {
  const provider = (
    providerOverride ??
    process.env.LLM_PROVIDER ??
    "anthropic"
  ).toLowerCase();

  if (provider === "anthropic" || provider === "claude") {
    return {
      provider: "anthropic",
      modelName: "claude-sonnet-4-20250514",
      model: anthropic("claude-sonnet-4-20250514"),
    };
  }
  if (provider === "google" || provider === "gemini") {
    return {
      provider: "google",
      modelName: "gemini-1.5-pro",
      model: google("gemini-1.5-pro"),
    };
  }
  if (provider === "mistral") {
    return {
      provider: "mistral",
      modelName: "mistral-large-latest",
      model: mistral("mistral-large-latest"),
    };
  }
  return { provider: "openai", modelName: "gpt-4o", model: openai("gpt-4o") };
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

type AnalysisInput = {
  inputType: "text" | "url";
  inputValue: string;
  onEvent?: (message: string, progress: number) => void;
};

export async function runFactHarborAnalysis(input: AnalysisInput) {
  // Clear debug log at start of each analysis
  clearDebugLog();
  debugLog("=== ANALYSIS STARTED ===");
  debugLog("Input", { inputType: input.inputType, inputValue: input.inputValue.substring(0, 200) });

  const startTime = Date.now();
  const emit = input.onEvent ?? (() => {});
  const config = getActiveConfig();
  const mode = CONFIG.deepModeEnabled ? "deep" : "quick";

  const { provider, modelName, model } = getModel();
  debugLog(`LLM Provider: ${provider}, Model: ${modelName}`);
  console.log(`[Analyzer] Using LLM provider: ${provider}, model: ${modelName}`);

  await emit(`Analysis mode: ${mode} (v${CONFIG.schemaVersion}) | LLM: ${provider}/${modelName}`, 2);

  const state: ResearchState = {
    originalInput: input.inputValue,
    originalText: "",
    inputType: input.inputType,
    understanding: null,
    iterations: [],
    facts: [],
    sources: [],
    contradictionSearchPerformed: false,
    contradictionSourcesFound: 0,
    searchQueries: [], // NEW v2.4.3
    llmCalls: 0, // NEW v2.6.6
    researchQuestionsSearched: new Set(), // NEW v2.6.18
    decisionMakerSearchPerformed: false, // NEW v2.6.18
  };

  // Handle URL
  let textToAnalyze = input.inputValue;
  if (input.inputType === "url") {
    await emit("Fetching URL content", 3);
    try {
      const result = await extractTextFromUrl(input.inputValue);
      // Handle both old (string) and new (object) return types
      textToAnalyze = typeof result === "string" ? result : result.text;
    } catch (err) {
      throw new Error(`Failed to fetch URL: ${err}`);
    }
  }
  state.originalText = textToAnalyze;

  // STEP 1: Understand
  debugLog("=== STEP 1: UNDERSTAND CLAIM ===");
  debugLog("Text to analyze (first 300 chars)", textToAnalyze.substring(0, 300));
  await emit(`Step 1: Analyzing input [LLM: ${provider}/${modelName}]`, 5);
  const step1Start = Date.now();
  try {
    debugLog("Calling understandClaim...");
    state.understanding = await understandClaim(textToAnalyze, model);
    state.llmCalls++; // understandClaim uses 1 LLM call
    const step1Elapsed = Date.now() - step1Start;
    debugLog(`Step 1 completed in ${step1Elapsed}ms`);
    debugLog("Understanding result", {
      detectedInputType: state.understanding?.detectedInputType,
      subClaimsCount: state.understanding?.subClaims?.length,
      researchQuestionsCount: state.understanding?.researchQuestions?.length,
    });
    console.log(`[Analyzer] Step 1 completed in ${step1Elapsed}ms`);
    if (step1Elapsed < 2000) {
      debugLog(`WARNING: Step 1 completed too fast (${step1Elapsed}ms). LLM call may have failed silently.`);
      console.warn(`[Analyzer] WARNING: Step 1 completed too fast (${step1Elapsed}ms). LLM call may have failed silently.`);
    }
  } catch (err: any) {
    debugLog("!!! STEP 1 FAILED !!!", err?.message || String(err));
    console.error(`\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
    console.error(`[Analyzer] STEP 1 FAILED - understandClaim threw an error!`);
    console.error(`[Analyzer] Error message:`, err?.message || err);
    console.error(`[Analyzer] Full error:`, err);
    console.error(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n`);

    // Re-throw if it's a critical API error so the user knows
    const errMsg = err?.message || String(err);
    if (errMsg.includes("credit balance") || errMsg.includes("insufficient_quota") || errMsg.includes("API")) {
      throw err; // Don't swallow API errors
    }

    state.understanding = {
      detectedInputType: "claim",
      questionIntent: "none",
      questionBeingAsked: "",
      impliedClaim: "",
      distinctProceedings: [],
      requiresSeparateAnalysis: false,
      proceedingContext: "",
      mainQuestion: textToAnalyze.slice(0, 200),
      articleThesis: textToAnalyze.slice(0, 200),
      subClaims: [
        {
          id: "C1",
          text: textToAnalyze.slice(0, 200),
          type: "factual",
          claimRole: "core",
          dependsOn: [],
          keyEntities: [],
          checkWorthiness: "high",
          harmPotential: "medium",
          centrality: "high",
          isCentral: true,
          relatedProceedingId: "",
          approximatePosition: "",
          keyFactorId: "",
        },
      ],
      distinctEvents: [],
      legalFrameworks: [],
      researchQuestions: [],
      riskTier: "B",
      keyFactors: [],
    };
  }

  const proceedingCount = state.understanding.distinctProceedings.length;
  let statusMsg = `Detected: ${state.understanding.detectedInputType.toUpperCase()} with ${state.understanding.subClaims.length} claims`;
  if (proceedingCount > 1) statusMsg += ` | ${proceedingCount} PROCEEDINGS`;
  await emit(statusMsg, 10);

  // STEP 2-4: Research with search tracking
  let iteration = 0;
  while (
    iteration < config.maxResearchIterations &&
    state.sources.length < config.maxTotalSources
  ) {
    iteration++;
    const baseProgress = 10 + (iteration / config.maxResearchIterations) * 50;

    const decision = decideNextResearch(state);
    if (decision.complete) {
      await emit(
        `Research complete: ${state.facts.length} facts, ${state.searchQueries.length} searches`,
        baseProgress,
      );
      break;
    }

    let focusMsg = `Step 2.${iteration}: ${decision.focus}`;
    if (decision.targetProceedingId)
      focusMsg += ` [${decision.targetProceedingId}]`;
    await emit(focusMsg, baseProgress);

    if (decision.isContradictionSearch)
      state.contradictionSearchPerformed = true;

    // NEW v2.6.18: Track decision-maker and research question searches
    if (decision.category === "conflict_of_interest")
      state.decisionMakerSearchPerformed = true;
    if (decision.category === "research_question") {
      // Mark all matching research questions as searched
      const researchQuestions = state.understanding?.researchQuestions || [];
      researchQuestions.forEach((q, idx) => {
        if (decision.focus?.includes(q.slice(0, 30))) {
          state.researchQuestionsSearched.add(idx);
        }
      });
      // Also just mark the next one as searched to avoid infinite loops
      const nextIdx = Array.from({ length: researchQuestions.length }, (_, i) => i)
        .find(i => !state.researchQuestionsSearched.has(i));
      if (nextIdx !== undefined) state.researchQuestionsSearched.add(nextIdx);
    }

    // Check if search is enabled
    if (!CONFIG.searchEnabled) {
      await emit(
        `⚠️ Search disabled (FH_SEARCH_ENABLED=false)`,
        baseProgress + 1,
      );
      state.searchQueries.push({
        query: decision.queries?.[0] || "search disabled",
        iteration,
        focus: decision.focus!,
        resultsCount: 0,
        timestamp: new Date().toISOString(),
        searchProvider: "Disabled",
      });
      continue;
    }

    // Perform searches and track them
    const searchResults: Array<{ url: string; title: string; query: string }> =
      [];
    for (const query of decision.queries || []) {
      // Get providers before search to show in event
      const searchProviders = getActiveSearchProviders().join("+");
      await emit(
        `🔍 Searching [${searchProviders}]: "${query}"`,
        baseProgress + 1,
      );

      try {
        const searchResponse = await searchWebWithProvider({
          query,
          maxResults: config.maxSourcesPerIteration,
        });
        let results = searchResponse.results;
        const actualProviders = searchResponse.providersUsed.join("+");
        console.log(`[Analyzer] Search used: ${actualProviders}, returned ${results.length} results`);

        // Apply domain whitelist if configured
        if (
          CONFIG.searchDomainWhitelist &&
          CONFIG.searchDomainWhitelist.length > 0
        ) {
          const beforeCount = results.length;
          results = results.filter((r: any) => {
            try {
              const hostname = new URL(r.url).hostname
                .replace(/^www\./, "")
                .toLowerCase();
              return CONFIG.searchDomainWhitelist!.some(
                (domain) =>
                  hostname === domain || hostname.endsWith("." + domain),
              );
            } catch {
              return false;
            }
          });
          if (beforeCount > results.length) {
            await emit(
              `  → Filtered ${beforeCount - results.length} results (domain whitelist)`,
              baseProgress + 1,
            );
          }
        }

        // Track the search with provider info
        state.searchQueries.push({
          query,
          iteration,
          focus: decision.focus!,
          resultsCount: results.length,
          timestamp: new Date().toISOString(),
          searchProvider: CONFIG.searchProvider,
        });

        searchResults.push(...results.map((r: any) => ({ ...r, query })));
        await emit(`  → ${results.length} results`, baseProgress + 2);
      } catch (err) {
        await emit(`  → Search failed: ${err}`, baseProgress + 2);
        state.searchQueries.push({
          query,
          iteration,
          focus: decision.focus!,
          resultsCount: 0,
          timestamp: new Date().toISOString(),
          searchProvider: CONFIG.searchProvider,
        });
      }
    }

    const seenUrls = new Set(state.sources.map((s: FetchedSource) => s.url));
    const newResults = searchResults.filter((r) => !seenUrls.has(r.url));
    const uniqueResults = [
      ...new Map(newResults.map((r: any) => [r.url, r])).values(),
    ].slice(0, config.maxSourcesPerIteration);

    if (uniqueResults.length === 0) {
      state.iterations.push({
        number: iteration,
        focus: decision.focus!,
        queries: decision.queries!,
        sourcesFound: 0,
        factsExtracted: state.facts.length,
      });
      continue;
    }

    await emit(`Fetching ${uniqueResults.length} sources`, baseProgress + 3);

    const fetchPromises = uniqueResults.map((r: any, i: number) =>
      fetchSource(
        r.url,
        `S${state.sources.length + i + 1}`,
        decision.category || "general",
        r.query,
      ),
    );
    const fetchedSources = await Promise.all(fetchPromises);
    const validSources = fetchedSources.filter(
      (s): s is FetchedSource => s !== null,
    );
    state.sources.push(...validSources);

    const successfulSources = validSources.filter((s) => s.fetchSuccess);
    await emit(
      `  → ${successfulSources.length}/${validSources.length} fetched successfully`,
      baseProgress + 5,
    );

    if (decision.isContradictionSearch)
      state.contradictionSourcesFound = successfulSources.length;

    await emit(`Extracting facts [LLM: ${provider}/${modelName}]`, baseProgress + 8);
    const extractStart = Date.now();
    for (const source of successfulSources) {
      const facts = await extractFacts(
        source,
        decision.focus!,
        model,
        state.understanding!.distinctProceedings,
        decision.targetProceedingId,
      );
      state.facts.push(...facts);
      state.llmCalls++; // Each extractFacts call is 1 LLM call
    }
    const extractElapsed = Date.now() - extractStart;
    console.log(`[Analyzer] Fact extraction for iteration ${iteration} completed in ${extractElapsed}ms for ${successfulSources.length} sources`);

    state.iterations.push({
      number: iteration,
      focus: decision.focus!,
      queries: decision.queries!,
      sourcesFound: successfulSources.length,
      factsExtracted: state.facts.length,
    });
    await emit(
      `Iteration ${iteration}: ${state.facts.length} facts from ${state.sources.length} sources (${extractElapsed}ms)`,
      baseProgress + 12,
    );
  }

  // STEP 5: Verdicts
  await emit(`Step 3: Generating verdicts [LLM: ${provider}/${modelName}]`, 65);
  const verdictStart = Date.now();
  const {
    claimVerdicts,
    articleAnalysis,
    questionAnswer,
    pseudoscienceAnalysis,
  } = await generateVerdicts(state, model);
  const verdictElapsed = Date.now() - verdictStart;
  console.log(`[Analyzer] Verdict generation completed in ${verdictElapsed}ms`);

  // Apply Gate 4: Verdict Confidence Assessment
  // Adds confidence tier and publication status to each verdict
  // CRITICAL: Central claims are ALWAYS kept publishable
  const { validatedVerdicts, stats: gate4Stats } = applyGate4ToVerdicts(
    claimVerdicts,
    state.sources,
    state.facts
  );
  console.log(`[Analyzer] Gate 4 applied: ${gate4Stats.publishable}/${gate4Stats.total} publishable, HIGH=${gate4Stats.highConfidence}, MED=${gate4Stats.mediumConfidence}, LOW=${gate4Stats.lowConfidence}, INSUFF=${gate4Stats.insufficient}`);

  // Use validated verdicts going forward (includes gate4Validation metadata)
  const finalClaimVerdicts = validatedVerdicts;

  if (pseudoscienceAnalysis?.isPseudoscience) {
    await emit(
      `⚠️ Pseudoscience detected: ${pseudoscienceAnalysis.categories.join(", ")}`,
      67,
    );
  }

  // STEP 6: Summary
  await emit("Step 4: Building summary", 75);
  const twoPanelSummary = await generateTwoPanelSummary(
    state,
    finalClaimVerdicts,
    articleAnalysis,
    model,
  );

  // STEP 7: Report
  await emit("Step 5: Generating report", 85);
  const reportMarkdown = await generateReport(
    state,
    finalClaimVerdicts,
    articleAnalysis,
    twoPanelSummary,
    model,
  );

  await emit("Analysis complete", 100);

  // Result JSON with search data (NEW v2.4.3)
  const resultJson = {
    meta: {
      schemaVersion: CONFIG.schemaVersion,
      generatedUtc: new Date().toISOString(),
      analysisMode: mode,
      llmProvider: provider,
      llmModel: modelName,
      searchProvider: CONFIG.searchProvider,
      inputType: input.inputType,
      detectedInputType: state.understanding!.detectedInputType,
      isQuestion: articleAnalysis.isQuestion,
      hasMultipleProceedings: articleAnalysis.hasMultipleProceedings,
      proceedingCount: state.understanding!.distinctProceedings.length,
      hasContestedFactors:
        articleAnalysis.questionAnswer?.hasContestedFactors || false,
      // NEW v2.4.5: Pseudoscience detection
      isPseudoscience: pseudoscienceAnalysis?.isPseudoscience || false,
      pseudoscienceCategories: pseudoscienceAnalysis?.categories || [],
      pseudoscienceConfidence: pseudoscienceAnalysis?.confidence || 0,
      inputLength: textToAnalyze.length,
      analysisTimeMs: Date.now() - startTime,
      analysisId: twoPanelSummary.factharborAnalysis.analysisId,
      // Gate statistics (POC1)
      gate4Stats: {
        publishable: gate4Stats.publishable,
        total: gate4Stats.total,
        highConfidence: gate4Stats.highConfidence,
        mediumConfidence: gate4Stats.mediumConfidence,
        lowConfidence: gate4Stats.lowConfidence,
        insufficient: gate4Stats.insufficient,
        centralKept: gate4Stats.centralKept,
      },
    },
    questionAnswer: questionAnswer || null,
    proceedings: state.understanding!.distinctProceedings,
    twoPanelSummary,
    articleAnalysis,
    claimVerdicts: finalClaimVerdicts,
    understanding: state.understanding,
    facts: state.facts,
    // Enhanced source data (v2.4.3)
    sources: state.sources.map((s: FetchedSource) => ({
      id: s.id,
      url: s.url,
      title: s.title,
      trackRecordScore: s.trackRecordScore,
      category: s.category,
      fetchSuccess: s.fetchSuccess,
      searchQuery: s.searchQuery,
    })),
    // NEW v2.4.3: Search queries
    searchQueries: state.searchQueries,
    iterations: state.iterations,
    // Research stats
    researchStats: {
      totalSearches: state.searchQueries.length,
      totalResults: state.searchQueries.reduce(
        (sum, q) => sum + q.resultsCount,
        0,
      ),
      sourcesFetched: state.sources.length,
      sourcesSuccessful: state.sources.filter((s) => s.fetchSuccess).length,
      factsExtracted: state.facts.length,
      contradictionSearchPerformed: state.contradictionSearchPerformed,
      llmCalls: state.llmCalls,
    },
    // NEW v2.4.5: Pseudoscience analysis
    pseudoscienceAnalysis: pseudoscienceAnalysis
      ? {
          isPseudoscience: pseudoscienceAnalysis.isPseudoscience,
          confidence: pseudoscienceAnalysis.confidence,
          categories: pseudoscienceAnalysis.categories,
          recommendation: pseudoscienceAnalysis.recommendation,
          debunkIndicatorsFound:
            pseudoscienceAnalysis.debunkIndicatorsFound.length,
        }
      : null,
    qualityGates: {
      passed:
        state.facts.length >= config.minFactsRequired &&
        state.contradictionSearchPerformed &&
        gate4Stats.publishable > 0,
      // Gate 1: Claim Validation (filters opinions, predictions, low-specificity claims)
      gate1Stats: state.understanding?.gate1Stats || {
        total: 0,
        passed: 0,
        filtered: 0,
        centralKept: 0,
      },
      // Gate 4: Verdict Confidence Assessment (validates evidence quality)
      gate4Stats: {
        total: gate4Stats.total,
        publishable: gate4Stats.publishable,
        highConfidence: gate4Stats.highConfidence,
        mediumConfidence: gate4Stats.mediumConfidence,
        lowConfidence: gate4Stats.lowConfidence,
        insufficient: gate4Stats.insufficient,
        centralKept: gate4Stats.centralKept,
      },
      summary: {
        totalFacts: state.facts.length,
        totalSources: state.sources.length,
        searchesPerformed: state.searchQueries.length,
        contradictionSearchPerformed: state.contradictionSearchPerformed,
      },
    },
  };

  return { resultJson, reportMarkdown };
}

export function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, value));
}
