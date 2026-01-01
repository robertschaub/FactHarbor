/**
 * FactHarbor POC1 Analyzer v2.6.17
 * 
 * Features:
 * - 7-level symmetric scale (True/Mostly True/Leaning True/Unverified/Leaning False/Mostly False/False)
 * - Multi-Proceeding analysis with Contested Factors
 * - Search tracking with LLM call counting
 * - Configurable source reliability via FH_SOURCE_BUNDLE_PATH
 * - Configurable search with FH_SEARCH_ENABLED and FH_SEARCH_DOMAIN_WHITELIST
 * - Fixed AI SDK output handling for different versions (output vs experimental_output)
 * - NEW: Claim dependency tracking (claimRole: attribution/source/timing/core)
 * - NEW: Dependency propagation (if prerequisite false, dependent claims flagged)
 * 
 * @version 2.6.17
 * @date January 2026
 */

import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { mistral } from "@ai-sdk/mistral";
import { generateText, Output } from "ai";
import { extractTextFromUrl } from "@/lib/retrieval";
import { searchWeb } from "@/lib/web-search";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  schemaVersion: "2.6.17",
  deepModeEnabled: (process.env.FH_ANALYSIS_MODE ?? "quick").toLowerCase() === "deep",
  
  // Search configuration (FH_ prefixed for consistency)
  searchEnabled: (process.env.FH_SEARCH_ENABLED ?? "true").toLowerCase() === "true",
  searchProvider: detectSearchProvider(),
  searchDomainWhitelist: parseWhitelist(process.env.FH_SEARCH_DOMAIN_WHITELIST),
  
  // Source reliability configuration
  sourceBundlePath: process.env.FH_SOURCE_BUNDLE_PATH || null,
  
  // Report configuration
  reportStyle: (process.env.FH_REPORT_STYLE ?? "standard").toLowerCase(),
  allowModelKnowledge: (process.env.FH_ALLOW_MODEL_KNOWLEDGE ?? "false").toLowerCase() === "true",
  
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
  fetchTimeoutMs: 10000,
};

/**
 * Parse comma-separated whitelist into array
 */
function parseWhitelist(whitelist: string | undefined): string[] | null {
  if (!whitelist) return null;
  return whitelist.split(",").map(d => d.trim().toLowerCase()).filter(d => d.length > 0);
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
  if (process.env.GOOGLE_CSE_API_KEY || process.env.GOOGLE_SEARCH_API_KEY || process.env.GOOGLE_API_KEY) {
    return "Google Custom Search";
  }
  // Check for Bing
  if (process.env.BING_API_KEY || process.env.AZURE_BING_KEY) {
    return "Bing Search";
  }
  // Check for SerpAPI (check both variants)
  if (process.env.SERPAPI_API_KEY || process.env.SERPAPI_KEY || process.env.SERP_API_KEY) {
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
    /emoto/i,  // Masaru Emoto's debunked water crystal claims
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
  ]
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
  confidence: number;  // 0-1
  categories: string[];
  matchedPatterns: string[];
  debunkIndicatorsFound: string[];
  recommendation: "REFUTED" | "FALSE" | "UNCERTAIN" | null;
}

/**
 * Analyze text for pseudoscience patterns
 */
function detectPseudoscience(text: string, claimText?: string): PseudoscienceAnalysis {
  const result: PseudoscienceAnalysis = {
    isPseudoscience: false,
    confidence: 0,
    categories: [],
    matchedPatterns: [],
    debunkIndicatorsFound: [],
    recommendation: null
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
    } else if (result.confidence >= 0.5 || result.debunkIndicatorsFound.length >= 1) {
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
  pseudoAnalysis: PseudoscienceAnalysis
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
    "UNCERTAIN": 2,
    "REFUTED": 1,
    "FALSE": 0
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
  claimVerdicts: Array<{ verdict: string; confidence: number; isPseudoscience?: boolean }>,
  pseudoAnalysis: PseudoscienceAnalysis
): { verdict: string; confidence: number; reason?: string } {
  
  const refutedCount = claimVerdicts.filter(v => v.verdict === "REFUTED" || v.verdict === "FALSE").length;
  const uncertainCount = claimVerdicts.filter(v => v.verdict === "UNCERTAIN").length;
  const supportedCount = claimVerdicts.filter(v => v.verdict === "WELL-SUPPORTED" || v.verdict === "PARTIALLY-SUPPORTED").length;
  const total = claimVerdicts.length;
  
  // If pseudoscience detected at article level
  if (pseudoAnalysis.isPseudoscience && pseudoAnalysis.confidence >= 0.5) {
    // Pseudoscience -> REFUTED (not FALSE - that requires 99%+ certainty)
    // We can't prove a negative with absolute certainty, but we can say claims lack scientific basis
    if (uncertainCount >= total * 0.5 && pseudoAnalysis.debunkIndicatorsFound.length >= 1) {
      return {
        verdict: "REFUTED",
        confidence: Math.min(85, 70 + pseudoAnalysis.debunkIndicatorsFound.length * 5), // Cap at 85%
        reason: `Claims based on pseudoscience (${pseudoAnalysis.categories.join(", ")}) - contradicted by scientific consensus`
      };
    }
    
    // If any pseudoscience claims and debunk found
    if (pseudoAnalysis.debunkIndicatorsFound.length >= 1) {
      const avgConfidence = claimVerdicts.reduce((sum, v) => sum + v.confidence, 0) / total;
      return {
        verdict: "REFUTED",
        confidence: Math.min(avgConfidence, 90), // Cap confidence
        reason: `Contains pseudoscientific claims (${pseudoAnalysis.categories.join(", ")}) - no scientific basis`
      };
    }
    
    // Pseudoscience patterns but no explicit debunk found -> MISLEADING
    return {
      verdict: "MISLEADING",
      confidence: 70,
      reason: `Claims rely on unproven mechanisms (${pseudoAnalysis.categories.join(", ")})`
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
  | "TRUE"          // 86-100%, Score +3
  | "MOSTLY-TRUE"   // 72-85%,  Score +2
  | "LEANING-TRUE"  // 58-71%,  Score +1
  | "UNVERIFIED"    // 43-57%,  Score  0
  | "LEANING-FALSE" // 29-42%,  Score -1
  | "MOSTLY-FALSE"  // 15-28%,  Score -2
  | "FALSE";        // 0-14%,   Score -3

type QuestionAnswer7Point =
  | "YES"           // 86-100%, Score +3
  | "MOSTLY-YES"    // 72-85%,  Score +2
  | "LEANING-YES"   // 58-71%,  Score +1
  | "UNVERIFIED"    // 43-57%,  Score  0
  | "LEANING-NO"    // 29-42%,  Score -1
  | "MOSTLY-NO"     // 15-28%,  Score -2
  | "NO";           // 0-14%,   Score -3

type ArticleVerdict7Point =
  | "TRUE"          // 86-100%, Score +3
  | "MOSTLY-TRUE"   // 72-85%,  Score +2
  | "LEANING-TRUE"  // 58-71%,  Score +1
  | "UNVERIFIED"    // 43-57%,  Score  0
  | "LEANING-FALSE" // 29-42%,  Score -1
  | "MOSTLY-FALSE"  // 15-28%,  Score -2
  | "FALSE";        // 0-14%,   Score -3

/**
 * Calculate truth percentage from LLM verdict + confidence
 * Returns 0-100% on symmetric scale
 */
function calculateTruthPercentage(llmVerdict: string, llmConfidence: number): number {
  const conf = Math.max(0, Math.min(100, llmConfidence)) / 100;
  
  switch (llmVerdict) {
    case "WELL-SUPPORTED":
      // Strong support → 72-100% (MOSTLY-TRUE to TRUE)
      return Math.round(72 + (28 * conf));
      
    case "PARTIALLY-SUPPORTED":
      // Partial → 50-85% (UNVERIFIED to MOSTLY-TRUE)
      return Math.round(50 + (35 * conf));
      
    case "UNCERTAIN":
      // Uncertain → 35-65% (around UNVERIFIED)
      return Math.round(35 + (30 * conf));
      
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
function calculateQuestionTruthPercentage(llmAnswer: string, llmConfidence: number): number {
  const conf = Math.max(0, Math.min(100, llmConfidence)) / 100;
  
  switch (llmAnswer) {
    case "YES":
      return Math.round(72 + (28 * conf));
    case "PARTIALLY":
      return Math.round(43 + (28 * conf));
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
function percentageToQuestionAnswer(truthPercentage: number): QuestionAnswer7Point {
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
function percentageToArticleVerdict(truthPercentage: number): ArticleVerdict7Point {
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
function calculateArticleTruthPercentage(llmVerdict: string, llmConfidence: number): number {
  const conf = Math.max(0, Math.min(100, llmConfidence)) / 100;
  
  switch (llmVerdict) {
    case "CREDIBLE":
    case "TRUE":
      return Math.round(72 + (28 * conf));
    case "MOSTLY-CREDIBLE":
    case "MOSTLY-TRUE":
      return Math.round(58 + (27 * conf));
    case "MISLEADING":
      // MISLEADING = false-side (15-42% range)
      return Math.round(15 + (27 * (1 - conf)));
    case "MOSTLY-FALSE":
    case "LEANING-FALSE":
      return Math.round(15 + (14 * (1 - conf)));
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
function calibrateClaimVerdict(llmVerdict: string, confidence: number): ClaimVerdict7Point {
  const truthPct = calculateTruthPercentage(llmVerdict, confidence);
  return percentageToClaimVerdict(truthPct);
}

/**
 * Legacy: Map confidence to question answer (for backward compatibility)
 */
function calibrateQuestionAnswer(llmAnswer: string, confidence: number): QuestionAnswer7Point {
  const truthPct = calculateQuestionTruthPercentage(llmAnswer, confidence);
  return percentageToQuestionAnswer(truthPct);
}

/**
 * Map confidence to article verdict
 */
function calibrateArticleVerdict(llmVerdict: string, confidence: number): ArticleVerdict7Point {
  // Handle negative verdicts
  if (llmVerdict === "FALSE" || llmVerdict === "REFUTED" || llmVerdict === "FALSE") {
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
function getVerdictColor(verdict: string): { bg: string; text: string; border: string } {
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
 * Get highlight color class for 7-level scale
 */
function getHighlightColor7Point(verdict: string): "green" | "light-green" | "yellow" | "orange" | "dark-orange" | "red" | "dark-red" {
  switch (verdict) {
    case "TRUE":
    case "YES":
      return "green";
    case "MOSTLY-TRUE":
    case "MOSTLY-YES":
      return "light-green";
    case "LEANING-TRUE":
    case "LEANING-YES":
      return "yellow";
    case "UNVERIFIED":
      return "orange";
    case "LEANING-FALSE":
    case "LEANING-NO":
      return "dark-orange";
    case "MOSTLY-FALSE":
    case "MOSTLY-NO":
      return "red";
    case "FALSE":
    case "NO":
      return "dark-red";
    default:
      return "orange";
  }
}

// ============================================================================
// TYPES
// ============================================================================

type InputType = "question" | "claim" | "article";
type QuestionIntent = "verification" | "exploration" | "comparison";

interface DistinctProceeding {
  id: string;
  name: string;
  shortName: string;
  court?: string;
  jurisdiction?: string;
  date: string;
  subject: string;
  charges?: string[];
  outcome?: string;
  status: "concluded" | "ongoing" | "pending" | "unknown";
}

interface KeyFactor {
  factor: string;
  supports: "yes" | "no" | "neutral";
  explanation: string;
  isContested?: boolean;
  contestedBy?: string;
  contestationReason?: string;
  factualBasis?: "established" | "disputed" | "alleged" | "opinion";
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
}

interface ClaimUnderstanding {
  detectedInputType: InputType;
  questionIntent?: QuestionIntent;
  questionBeingAsked?: string;
  impliedClaim?: string;
  
  distinctProceedings: DistinctProceeding[];
  requiresSeparateAnalysis: boolean;
  proceedingContext?: string;
  
  mainQuestion: string;
  articleThesis: string;
  subClaims: Array<{
    id: string;
    text: string;
    type: "legal" | "procedural" | "factual" | "evaluative";
    keyEntities: string[];
    isCentral: boolean;
    relatedProceedingId?: string;
    startOffset?: number;
    endOffset?: number;
  }>;
  distinctEvents: Array<{
    name: string;
    date: string;
    description: string;
  }>;
  legalFrameworks: string[];
  researchQuestions: string[];
  riskTier: "A" | "B" | "C";
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
  category: "legal_provision" | "evidence" | "expert_quote" | "statistic" | "event" | "criticism";
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
  searchQuery?: string;  // Which query found this
}

interface ClaimVerdict {
  claimId: string;
  claimText: string;
  isCentral: boolean;
  // NEW: Claim role and dependencies
  claimRole?: "attribution" | "source" | "timing" | "core";
  dependsOn?: string[];  // Claim IDs this depends on
  dependencyFailed?: boolean;  // True if a prerequisite claim was false
  failedDependencies?: string[];  // Which dependencies failed
  // Original LLM verdict (for debugging)
  llmVerdict: "WELL-SUPPORTED" | "PARTIALLY-SUPPORTED" | "UNCERTAIN" | "REFUTED";
  // Calibrated 7-point verdict
  verdict: ClaimVerdict7Point;
  // LLM's confidence in the verdict (internal use)
  confidence: number;
  // Truth percentage for display (0-100% where 100 = completely true)
  truthPercentage: number;
  riskTier: "A" | "B" | "C";
  reasoning: string;
  supportingFactIds: string[];
  relatedProceedingId?: string;
  startOffset?: number;
  endOffset?: number;
  highlightColor: "green" | "light-green" | "yellow" | "orange" | "dark-orange" | "red" | "dark-red";
  isPseudoscience?: boolean;
  escalationReason?: string;
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
    console.log(`[FactHarbor] No source bundle configured (FH_SOURCE_BUNDLE_PATH not set)`);
    return;
  }
  
  try {
    const bundlePath = path.resolve(CONFIG.sourceBundlePath);
    if (fs.existsSync(bundlePath)) {
      const bundle = JSON.parse(fs.readFileSync(bundlePath, "utf-8"));
      if (bundle.sources && typeof bundle.sources === "object") {
        SOURCE_TRACK_RECORDS = bundle.sources;
        console.log(`[FactHarbor] Loaded ${Object.keys(bundle.sources).length} source scores from bundle`);
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
  } catch { return null; }
}

// ============================================================================
// STEP 1: UNDERSTAND
// ============================================================================

const UNDERSTANDING_SCHEMA = z.object({
  detectedInputType: z.enum(["question", "claim", "article"]),
  questionIntent: z.enum(["verification", "exploration", "comparison"]).optional(),
  questionBeingAsked: z.string().optional(),
  impliedClaim: z.string().optional(),
  
  distinctProceedings: z.array(z.object({
    id: z.string(),
    name: z.string(),
    shortName: z.string(),
    court: z.string().optional(),
    jurisdiction: z.string().optional(),
    date: z.string(),
    subject: z.string(),
    charges: z.array(z.string()).optional(),
    outcome: z.string().optional(),
    status: z.enum(["concluded", "ongoing", "pending", "unknown"])
  })),
  requiresSeparateAnalysis: z.boolean(),
  proceedingContext: z.string().optional(),
  
  mainQuestion: z.string(),
  articleThesis: z.string(),
  subClaims: z.array(z.object({
    id: z.string(),
    text: z.string(),
    type: z.enum(["legal", "procedural", "factual", "evaluative"]),
    // NEW: Claim role - distinguishes framing from core claims
    claimRole: z.enum([
      "attribution",    // WHO said it (person, position, authority)
      "source",         // WHERE it was said (document, email, speech)  
      "timing",         // WHEN it was said
      "core"            // WHAT was actually claimed (the verifiable assertion)
    ]).optional(),
    // NEW: Dependencies - which claims must be true for this claim to matter
    dependsOn: z.array(z.string()).optional(),  // List of claim IDs this depends on
    keyEntities: z.array(z.string()),
    isCentral: z.boolean(),
    relatedProceedingId: z.string().optional(),
    approximatePosition: z.string().optional()
  })),
  distinctEvents: z.array(z.object({
    name: z.string(),
    date: z.string(),
    description: z.string()
  })),
  legalFrameworks: z.array(z.string()),
  researchQuestions: z.array(z.string()),
  riskTier: z.enum(["A", "B", "C"])
});

async function understandClaim(input: string, model: any): Promise<ClaimUnderstanding> {
  const systemPrompt = `You are a fact-checking analyst. Analyze the input with special attention to MULTIPLE DISTINCT EVENTS or PROCEEDINGS.

## CRITICAL: CLAIM STRUCTURE ANALYSIS

When extracting claims, identify their ROLE and DEPENDENCIES:

### Claim Roles:
- **attribution**: WHO said it (person's identity, position, authority) - e.g., "Vinay Prasad is CBER director"
- **source**: WHERE/HOW it was communicated (document type, channel) - e.g., "in an internal email"
- **timing**: WHEN it happened - e.g., "in late November"
- **core**: THE ACTUAL VERIFIABLE ASSERTION - e.g., "10 children died from COVID vaccines"

### Claim Dependencies (dependsOn):
Core claims often DEPEND on attribution/source/timing claims being true.

EXAMPLE: "CBER director Prasad claimed in an internal memo that 10 children died from vaccines"
- SC1 (attribution): "Vinay Prasad is CBER director" → claimRole: "attribution", dependsOn: []
- SC2 (source): "Prasad sent an internal memo" → claimRole: "source", dependsOn: ["SC1"]
- SC3 (core): "10 children died from COVID vaccines" → claimRole: "core", dependsOn: ["SC1", "SC2"], isCentral: true

If SC1 is FALSE (Prasad is NOT the CBER director), then SC2 and SC3's framing collapses.

### Rules:
1. Mark "core" claims as isCentral: true
2. Attribution/source/timing claims support the core - mark as isCentral: false
3. List dependencies in dependsOn array (claim IDs that must be true for this claim to matter)
4. Core claims typically depend on attribution claims

## MULTI-EVENT DETECTION

Look for multiple court cases, temporal distinctions, or different proceedings.

### BOLSONARO EXAMPLE - MUST DETECT 2 PROCEEDINGS:

1. **TSE-2023**: TSE Electoral Ineligibility Trial
   - Court: Superior Electoral Court (TSE)
   - Date: June 2023
   - Subject: Abuse of political power and media misuse
   - Outcome: 8-year ineligibility
   - Status: concluded

2. **STF-2025**: STF Criminal Trial for Coup Attempt
   - Court: Supreme Federal Court (STF)
   - Date: 2024-2025
   - Subject: Attempted coup d'état
   - Status: concluded

Set requiresSeparateAnalysis = true when multiple proceedings detected.

## FOR QUESTIONS

- **impliedClaim**: What claim would "YES" confirm? Must be AFFIRMATIVE.
  - CORRECT: "The Bolsonaro judgment was fair and based on Brazil's law"
  - WRONG: "may or may not have been fair"`;

  const userPrompt = `Analyze for fact-checking:\n\n"${input}"`;

  let result: any;
  
  try {
    result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      output: Output.object({ schema: UNDERSTANDING_SCHEMA })
    });
  } catch (err) {
    console.error("[Analyzer] generateText failed in understandClaim:", err);
    // Return a basic understanding if the structured output fails
    throw new Error(`Failed to understand claim: ${err}`);
  }

  // Handle different AI SDK versions - some use 'output', some use 'experimental_output'
  // @ts-ignore - experimental_output may exist in some SDK versions
  const rawOutput = result.output ?? result.experimental_output?.value ?? result.experimental_output;
  
  if (!rawOutput) {
    console.error("[Analyzer] No structured output from LLM. Result keys:", Object.keys(result));
    console.error("[Analyzer] Full result:", JSON.stringify(result, null, 2).slice(0, 500));
    throw new Error("LLM did not return structured output");
  }
  
  const parsed = rawOutput as z.infer<typeof UNDERSTANDING_SCHEMA>;
  
  // Validate parsed has required fields
  if (!parsed.subClaims || !Array.isArray(parsed.subClaims)) {
    console.error("[Analyzer] Invalid parsed output - missing subClaims:", parsed);
    throw new Error("LLM output missing required fields");
  }
  
  const claimsWithPositions = parsed.subClaims.map((claim: any) => {
    const positions = findClaimPosition(input, claim.text);
    return { ...claim, startOffset: positions?.start, endOffset: positions?.end };
  });

  return { ...parsed, subClaims: claimsWithPositions };
}

function findClaimPosition(text: string, claimText: string): { start: number; end: number } | null {
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
  const categories = [...new Set(state.facts.map((f: ExtractedFact) => f.category))];
  const understanding = state.understanding!;
  
  const entities = understanding.subClaims.flatMap(c => c.keyEntities).slice(0, 4);
  const entityStr = entities.join(" ");
  
  const hasLegal = categories.includes("legal_provision");
  const hasEvidence = categories.includes("evidence");
  
  const proceedings = understanding.distinctProceedings || [];
  const proceedingsWithFacts = new Set(state.facts.map((f: ExtractedFact) => f.relatedProceedingId).filter(Boolean));
  
  if (
    state.facts.length >= config.minFactsRequired &&
    categories.length >= CONFIG.minCategories &&
    state.contradictionSearchPerformed &&
    (proceedings.length === 0 || proceedings.every((p: DistinctProceeding) => proceedingsWithFacts.has(p.id)))
  ) {
    return { complete: true };
  }
  
  // Research each proceeding
  if (proceedings.length > 0 && state.iterations.length < proceedings.length * 2) {
    for (const proc of proceedings) {
      const procFacts = state.facts.filter(f => f.relatedProceedingId === proc.id);
      if (procFacts.length < 2) {
        return {
          complete: false,
          focus: `${proc.name} - ${proc.subject}`,
          targetProceedingId: proc.id,
          category: "evidence",
          queries: [
            `${proc.court || ""} ${proc.shortName} ${proc.subject}`.trim(),
            `${entityStr} ${proc.date} ${proc.jurisdiction || "ruling"}`.trim(),
            `${proc.name} decision outcome ${proc.date}`
          ]
        };
      }
    }
  }
  
  if (!hasLegal && understanding.legalFrameworks.length > 0 && state.iterations.length === 0) {
    return {
      complete: false,
      focus: "Legal framework",
      category: "legal_provision",
      queries: [
        `${entityStr} legal basis statute`,
        `${understanding.legalFrameworks[0]} law provisions`,
      ]
    };
  }
  
  if (!hasEvidence && state.iterations.length <= 1) {
    return {
      complete: false,
      focus: "Evidence and facts",
      category: "evidence",
      queries: [
        `${entityStr} evidence documents`,
        `${entityStr} facts findings`
      ]
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
        `${entityStr} controversy disputed unfair`
      ]
    };
  }
  
  return { complete: true };
}

// Helper to decode HTML entities in text
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x27;': "'",
    '&#x2d;': '-',
    '&#x2D;': '-',
    '&nbsp;': ' ',
    '&#160;': ' ',
    '&ndash;': '–',
    '&mdash;': '—',
  };
  
  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, 'gi'), char);
  }
  // Also handle numeric entities like &#45;
  result = result.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
  // Handle hex entities like &#x2d;
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
  
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
    const filename = pathname.split('/').pop() || '';
    
    if (filename) {
      // Remove extension and clean up
      let title = filename
        .replace(/\.(pdf|html|htm|php|aspx?)$/i, '')
        .replace(/[-_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Capitalize first letter of each word
      if (title.length > 3) {
        title = title.split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        return title.slice(0, 100);
      }
    }
    
    // Fallback to hostname
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    return 'Unknown Source';
  }
}

/**
 * Extract title from document text with PDF header detection
 */
function extractTitle(text: string, url: string): string {
  const firstLine = text.split("\n")[0]?.trim().slice(0, 150) || '';
  
  // Check for PDF header patterns - these indicate raw PDF bytes
  const isPdfHeader = /^%PDF-\d+\.\d+/.test(firstLine) ||
                      firstLine.includes('%���') ||
                      firstLine.includes('\x00') ||
                      /^[\x00-\x1f\x7f-\xff]{3,}/.test(firstLine);
  
  // Check for other binary/garbage patterns
  const isGarbage = firstLine.length < 3 ||
                    !/[a-zA-Z]{3,}/.test(firstLine) ||  // Must have some letters
                    (firstLine.match(/[^\x20-\x7E]/g)?.length || 0) > firstLine.length * 0.3;  // >30% non-printable
  
  if (isPdfHeader || isGarbage) {
    // Try to find a better title in the first few lines
    const lines = text.split("\n").slice(0, 10);
    for (const line of lines) {
      const cleaned = line.trim();
      // Look for a line that looks like a title (has letters, reasonable length)
      if (cleaned.length >= 10 && 
          cleaned.length <= 150 &&
          /[a-zA-Z]{4,}/.test(cleaned) &&
          !/^%PDF/.test(cleaned) &&
          (cleaned.match(/[^\x20-\x7E]/g)?.length || 0) < cleaned.length * 0.1) {
        return cleaned.slice(0, 100);
      }
    }
    
    // Fallback to URL-based title
    return extractTitleFromUrl(url);
  }
  
  return firstLine.slice(0, 100) || extractTitleFromUrl(url);
}

async function fetchSource(url: string, id: string, category: string, searchQuery?: string): Promise<FetchedSource | null> {
  const config = getActiveConfig();
  const trackRecord = getTrackRecordScore(url);
  
  try {
    const result = await Promise.race([
      extractTextFromUrl(url),
      new Promise<{ text: string; title: string; contentType: string }>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), CONFIG.fetchTimeoutMs)
      )
    ]);
    
    // Handle both old (string) and new (object) return types for compatibility
    const text = typeof result === "string" ? result : result.text;
    const extractedTitle = typeof result === "string" ? null : result.title;
    
    // Use extracted title if available, otherwise fall back to extraction
    let title = extractedTitle || extractTitle(text, url);
    title = decodeHtmlEntities(title);
    
    return {
      id, url,
      title,
      trackRecordScore: trackRecord,
      fullText: text.slice(0, config.articleMaxChars),
      fetchedAt: new Date().toISOString(),
      category,
      fetchSuccess: true,
      searchQuery
    };
  } catch (err) {
    console.warn(`Fetch failed for ${url}:`, err);
    return {
      id, url,
      title: extractTitleFromUrl(url),
      trackRecordScore: trackRecord,
      fullText: "",
      fetchedAt: new Date().toISOString(),
      category,
      fetchSuccess: false,
      searchQuery
    };
  }
}

const FACT_SCHEMA = z.object({
  facts: z.array(z.object({
    fact: z.string(),
    category: z.enum(["legal_provision", "evidence", "expert_quote", "statistic", "event", "criticism"]),
    specificity: z.enum(["high", "medium", "low"]),
    sourceExcerpt: z.string().min(20),
    relatedProceedingId: z.string().optional(),
    isContestedClaim: z.boolean().optional(),
    claimSource: z.string().optional()
  }))
});

async function extractFacts(
  source: FetchedSource, 
  focus: string, 
  model: any,
  proceedings: DistinctProceeding[],
  targetProceedingId?: string
): Promise<ExtractedFact[]> {
  if (!source.fetchSuccess || !source.fullText) return [];
  
  const proceedingsList = proceedings.length > 0 
    ? `\n\nKNOWN PROCEEDINGS:\n${proceedings.map((p: DistinctProceeding) => `- ${p.id}: ${p.name}`).join("\n")}`
    : "";
    
  const systemPrompt = `Extract SPECIFIC facts. Focus: ${focus}
${targetProceedingId ? `Target proceeding: ${targetProceedingId}` : ""}
Track contested claims with isContestedClaim and claimSource.
Only HIGH/MEDIUM specificity.${proceedingsList}`;

  try {
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Source: ${source.title}\nURL: ${source.url}\n\n${source.fullText}` }
      ],
      temperature: 0.2,
      output: Output.object({ schema: FACT_SCHEMA })
    });

    // Handle different AI SDK versions
    // @ts-ignore - experimental_output may exist in some SDK versions
    const rawOutput = result.output ?? result.experimental_output?.value ?? result.experimental_output;
    if (!rawOutput) {
      console.warn(`[Analyzer] No structured output for fact extraction from ${source.id}`);
      return [];
    }
    
    const extraction = rawOutput as z.infer<typeof FACT_SCHEMA>;
    if (!extraction.facts || !Array.isArray(extraction.facts)) {
      console.warn(`[Analyzer] Invalid fact extraction from ${source.id}`);
      return [];
    }
    
    return extraction.facts
      .filter(f => f.specificity !== "low" && f.sourceExcerpt?.length >= 20)
      .map((f, i) => ({
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
        claimSource: f.claimSource
      }));
  } catch {
    return [];
  }
}

// ============================================================================
// STEP 5: GENERATE VERDICTS - FIX: Calculate factorAnalysis from actual factors
// ============================================================================

const KEY_FACTOR_SCHEMA = z.object({
  factor: z.string(),
  supports: z.enum(["yes", "no", "neutral"]),
  explanation: z.string(),
  isContested: z.boolean().optional(),
  contestedBy: z.string().optional(),
  contestationReason: z.string().optional(),
  factualBasis: z.enum(["established", "disputed", "alleged", "opinion"]).optional()
});

const VERDICTS_SCHEMA_MULTI_PROCEEDING = z.object({
  questionAnswer: z.object({
    answer: z.enum(["YES", "NO", "PARTIALLY", "INSUFFICIENT-EVIDENCE"]),
    confidence: z.number().min(0).max(100),
    shortAnswer: z.string(),
    nuancedAnswer: z.string(),
    keyFactors: z.array(KEY_FACTOR_SCHEMA),
    calibrationNote: z.string().optional()
  }),
  proceedingAnswers: z.array(z.object({
    proceedingId: z.string(),
    proceedingName: z.string(),
    answer: z.enum(["YES", "NO", "PARTIALLY", "INSUFFICIENT-EVIDENCE"]),
    confidence: z.number().min(0).max(100),
    shortAnswer: z.string(),
    keyFactors: z.array(KEY_FACTOR_SCHEMA)
  })),
  proceedingSummary: z.string(),
  claimVerdicts: z.array(z.object({
    claimId: z.string(),
    verdict: z.enum(["WELL-SUPPORTED", "PARTIALLY-SUPPORTED", "UNCERTAIN", "REFUTED"]),
    confidence: z.number().min(0).max(100),
    riskTier: z.enum(["A", "B", "C"]),
    reasoning: z.string(),
    supportingFactIds: z.array(z.string()),
    relatedProceedingId: z.string().optional()
  }))
});

const VERDICTS_SCHEMA_SIMPLE = z.object({
  questionAnswer: z.object({
    answer: z.enum(["YES", "NO", "PARTIALLY", "INSUFFICIENT-EVIDENCE"]),
    confidence: z.number().min(0).max(100),
    shortAnswer: z.string(),
    nuancedAnswer: z.string(),
    keyFactors: z.array(KEY_FACTOR_SCHEMA)
  }),
  claimVerdicts: z.array(z.object({
    claimId: z.string(),
    verdict: z.enum(["WELL-SUPPORTED", "PARTIALLY-SUPPORTED", "UNCERTAIN", "REFUTED"]),
    confidence: z.number().min(0).max(100),
    riskTier: z.enum(["A", "B", "C"]),
    reasoning: z.string(),
    supportingFactIds: z.array(z.string())
  }))
});

const VERDICTS_SCHEMA_CLAIM = z.object({
  claimVerdicts: z.array(z.object({
    claimId: z.string(),
    verdict: z.enum(["WELL-SUPPORTED", "PARTIALLY-SUPPORTED", "UNCERTAIN", "REFUTED"]),
    confidence: z.number().min(0).max(100),
    riskTier: z.enum(["A", "B", "C"]),
    reasoning: z.string(),
    supportingFactIds: z.array(z.string())
  })),
  articleAnalysis: z.object({
    thesisSupported: z.boolean(),
    logicalFallacies: z.array(z.object({
      type: z.string(),
      description: z.string(),
      affectedClaims: z.array(z.string())
    })),
    articleVerdict: z.enum(["CREDIBLE", "MOSTLY-CREDIBLE", "MISLEADING", "FALSE"]),
    articleConfidence: z.number().min(0).max(100),
    verdictDiffersFromClaimAverage: z.boolean(),
    verdictDifferenceReason: z.string().optional()
  })
});

async function generateVerdicts(
  state: ResearchState,
  model: any
): Promise<{ claimVerdicts: ClaimVerdict[]; articleAnalysis: ArticleAnalysis; questionAnswer?: QuestionAnswer; pseudoscienceAnalysis?: PseudoscienceAnalysis }> {
  const understanding = state.understanding!;
  const isQuestion = understanding.detectedInputType === "question";
  const hasMultipleProceedings = understanding.requiresSeparateAnalysis && 
                                  understanding.distinctProceedings.length > 1;
  
  // Detect pseudoscience in the input and facts
  const allText = [
    state.originalText,
    understanding.articleThesis,
    ...understanding.subClaims.map((c: any) => c.text),
    ...state.facts.map((f: ExtractedFact) => f.fact),
    ...state.sources.map((s: FetchedSource) => s.fullText)
  ].join(" ");
  
  const pseudoscienceAnalysis = detectPseudoscience(allText);
  
  const factsFormatted = state.facts.map((f: ExtractedFact) => {
    let factLine = `[${f.id}]`;
    if (f.relatedProceedingId) factLine += ` (${f.relatedProceedingId})`;
    if (f.isContestedClaim) factLine += ` [CONTESTED by ${f.claimSource || "critics"}]`;
    factLine += ` ${f.fact} (Source: ${f.sourceTitle})`;
    return factLine;
  }).join("\n");

  const claimsFormatted = understanding.subClaims.map((c: any) =>
    `${c.id}${c.relatedProceedingId ? ` (${c.relatedProceedingId})` : ""}: "${c.text}" [${c.isCentral ? "CENTRAL" : "Supporting"}]`
  ).join("\n");

  if (isQuestion && hasMultipleProceedings) {
    const result = await generateMultiProceedingVerdicts(state, understanding, factsFormatted, claimsFormatted, model);
    return { ...result, pseudoscienceAnalysis };
  } else if (isQuestion) {
    const result = await generateQuestionVerdicts(state, understanding, factsFormatted, claimsFormatted, model);
    return { ...result, pseudoscienceAnalysis };
  } else {
    const result = await generateClaimVerdicts(state, understanding, factsFormatted, claimsFormatted, model, pseudoscienceAnalysis);
    return { ...result, pseudoscienceAnalysis };
  }
}

async function generateMultiProceedingVerdicts(
  state: ResearchState,
  understanding: ClaimUnderstanding,
  factsFormatted: string,
  claimsFormatted: string,
  model: any
): Promise<{ claimVerdicts: ClaimVerdict[]; articleAnalysis: ArticleAnalysis; questionAnswer: QuestionAnswer }> {
  
  const proceedingsFormatted = understanding.distinctProceedings.map((p: DistinctProceeding) =>
    `- **${p.id}**: ${p.name}\n  Court: ${p.court || "N/A"} | Date: ${p.date} | Status: ${p.status}\n  Subject: ${p.subject}`
  ).join("\n\n");

  const systemPrompt = `You are FactHarbor's verdict generator. Analyze MULTIPLE DISTINCT PROCEEDINGS separately.

## QUESTION
"${understanding.questionBeingAsked || state.originalInput}"

## PROCEEDINGS - PROVIDE SEPARATE ANSWER FOR EACH
${proceedingsFormatted}

## INSTRUCTIONS

1. For EACH proceeding, provide:
   - proceedingId (must match: ${understanding.distinctProceedings.map((p: DistinctProceeding) => p.id).join(", ")})
   - answer: YES | NO | PARTIALLY | INSUFFICIENT-EVIDENCE
   - keyFactors: Array of factors with supports (yes/no/neutral) and isContested flag

2. Mark contested factors:
   - isContested: true if this criticism is itself politically disputed
   - contestedBy: Who disputes it
   - factualBasis: "established" | "disputed" | "alleged" | "opinion"

3. Calibration: Contested negatives don't flip verdicts
   - 2+ positive (established) + 1 negative (contested) = PARTIALLY, not NO`;

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
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      output: Output.object({ schema: VERDICTS_SCHEMA_MULTI_PROCEEDING })
    });
    state.llmCalls++;

    // Handle different AI SDK versions
    // @ts-ignore - experimental_output may exist in some SDK versions
    const rawOutput = result.output ?? result.experimental_output?.value ?? result.experimental_output;
    if (rawOutput) {
      parsed = rawOutput as z.infer<typeof VERDICTS_SCHEMA_MULTI_PROCEEDING>;
    }
  } catch (err) {
    console.warn("[Analyzer] Structured output failed for multi-proceeding verdicts, using fallback:", err);
    state.llmCalls++;
  }
  
  // Fallback if structured output failed
  if (!parsed || !parsed.proceedingAnswers) {
    console.log("[Analyzer] Using fallback multi-proceeding verdict generation");
    
    const fallbackVerdicts: ClaimVerdict[] = understanding.subClaims.map((claim: any) => ({
      claimId: claim.id,
      claimText: claim.text,
      llmVerdict: "UNCERTAIN",
      verdict: "Unverified" as const,
      confidence: 50,
      truthPercentage: 50,
      riskTier: "B" as const,
      reasoning: "Unable to generate verdict due to schema validation error.",
      supportingFactIds: [],
      isCentral: claim.isCentral || false,
      highlightColor: getHighlightColor7Point("Unverified")
    }));
    
    const questionAnswer: QuestionAnswer = {
      question: understanding.questionBeingAsked || state.originalInput || "",
      answer: "INSUFFICIENT-EVIDENCE",
      confidence: 50,
      truthPercentage: 50,
      shortAnswer: "Unable to determine - analysis failed",
      nuancedAnswer: "The structured output generation failed. Manual review recommended.",
      keyFactors: [],
      proceedingAnswers: understanding.distinctProceedings.map((p: DistinctProceeding) => ({
        proceedingId: p.id,
        proceedingName: p.name,
        answer: "INSUFFICIENT-EVIDENCE",
        truthPercentage: 50,
        confidence: 50,
        shortAnswer: "Analysis failed",
        keyFactors: []
      }))
    };
    
    const articleAnalysis: ArticleAnalysis = {
      inputType: "question",
      isQuestion: true,
      questionAnswer,
      hasMultipleProceedings: true,
      proceedings: understanding.distinctProceedings,
      articleThesis: understanding.articleThesis,
      logicalFallacies: [],
      claimsAverageTruthPercentage: 50,
      claimsAverageVerdict: "Unverified",
      articleTruthPercentage: 50,
      articleVerdict: "Unverified",
      claimPattern: { total: fallbackVerdicts.length, supported: 0, uncertain: fallbackVerdicts.length, refuted: 0 }
    };
    
    return { claimVerdicts: fallbackVerdicts, articleAnalysis, questionAnswer };
  }
  
  // Normal flow with parsed output
  
  // FIX v2.4.3: Calculate factorAnalysis from ACTUAL keyFactors array
  // v2.5.0: Calibrate to 7-point scale
  const correctedProceedingAnswers = parsed.proceedingAnswers.map((pa: any) => {
    const factors = pa.keyFactors as KeyFactor[];
    
    // Calculate from actual factors - NOT from LLM-reported numbers
    const positiveFactors = factors.filter(f => f.supports === "yes").length;
    const negativeFactors = factors.filter(f => f.supports === "no").length;
    const neutralFactors = factors.filter(f => f.supports === "neutral").length;
    const contestedNegatives = factors.filter(f => f.supports === "no" && f.isContested).length;
    
    const factorAnalysis: FactorAnalysis = {
      positiveFactors,
      negativeFactors,
      neutralFactors,
      contestedNegatives,
      verdictExplanation: `${positiveFactors} positive, ${negativeFactors} negative (${contestedNegatives} contested), ${neutralFactors} neutral`
    };
    
    // Apply calibration correction based on factors
    let llmAnswer = pa.answer;
    let correctedConfidence = pa.confidence;
    
    const effectiveNegatives = negativeFactors - (contestedNegatives * 0.5);
    
    if (pa.answer === "NO" && positiveFactors > effectiveNegatives) {
      llmAnswer = "PARTIALLY";
      correctedConfidence = Math.min(pa.confidence, 72);
      factorAnalysis.verdictExplanation = `Corrected from NO: ${positiveFactors} positive > ${effectiveNegatives.toFixed(1)} effective negative`;
    } else if (pa.answer === "NO" && contestedNegatives > 0 && contestedNegatives === negativeFactors) {
      llmAnswer = "PARTIALLY";
      correctedConfidence = Math.min(pa.confidence, 68);
      factorAnalysis.verdictExplanation = `Corrected: All ${negativeFactors} negative factors are contested`;
    }
    
    // Calculate truth percentage and derive 7-point answer
    const truthPct = calculateQuestionTruthPercentage(llmAnswer, correctedConfidence);
    const calibratedAnswer = percentageToQuestionAnswer(truthPct);
    
    return {
      ...pa,
      llmAnswer: pa.answer, // Original LLM answer
      answer: calibratedAnswer, // 7-point calibrated answer
      confidence: correctedConfidence,
      truthPercentage: truthPct,
      factorAnalysis
    } as ProceedingAnswer;
  });
  
  // Recalculate overall using truth percentages
  const avgTruthPct = Math.round(
    correctedProceedingAnswers.reduce((sum, pa) => sum + pa.truthPercentage, 0) / correctedProceedingAnswers.length
  );
  
  // Determine overall LLM-style answer for logging
  const answers = correctedProceedingAnswers.map((pa: ProceedingAnswer) => pa.answer);
  let overallLlmAnswer = parsed.questionAnswer.answer;
  const yesCount = answers.filter(a => a === "YES" || a === "MOSTLY-YES").length;
  const noCount = answers.filter(a => a === "NO" || a === "MOSTLY-NO").length;
  if (yesCount > 0 && noCount > 0) overallLlmAnswer = "PARTIALLY";
  
  const avgConfidence = Math.round(
    correctedProceedingAnswers.reduce((sum, pa) => sum + pa.confidence, 0) / correctedProceedingAnswers.length
  );
  
  // Calculate overall factorAnalysis
  const allFactors = correctedProceedingAnswers.flatMap(pa => pa.keyFactors);
  const hasContestedFactors = allFactors.some(f => f.isContested);
  
  // Build claim verdicts with 7-point calibration
  const claimVerdicts: ClaimVerdict[] = parsed.claimVerdicts.map((cv: any) => {
    const claim = understanding.subClaims.find((c: any) => c.id === cv.claimId);
    // Calculate truth percentage from LLM verdict
    const truthPct = calculateTruthPercentage(cv.verdict, cv.confidence);
    // Derive 7-point verdict from percentage
    const calibratedVerdict = percentageToClaimVerdict(truthPct);
    return {
      ...cv,
      llmVerdict: cv.verdict,
      verdict: calibratedVerdict,
      truthPercentage: truthPct,
      claimText: claim?.text || "",
      isCentral: claim?.isCentral || false,
      relatedProceedingId: cv.relatedProceedingId || claim?.relatedProceedingId,
      startOffset: claim?.startOffset,
      endOffset: claim?.endOffset,
      highlightColor: getHighlightColor7Point(calibratedVerdict)
    };
  });
  
  const claimPattern = {
    total: claimVerdicts.length,
    supported: claimVerdicts.filter(v => v.truthPercentage >= 72).length,
    uncertain: claimVerdicts.filter(v => v.truthPercentage >= 43 && v.truthPercentage < 72).length,
    refuted: claimVerdicts.filter(v => v.truthPercentage < 43).length,
    centralClaimsTotal: claimVerdicts.filter(v => v.isCentral).length,
    centralClaimsSupported: claimVerdicts.filter(v => v.isCentral && v.truthPercentage >= 72).length
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
    hasContestedFactors
  };

  // Calculate claims average truth percentage
  const claimsAvgTruthPct = Math.round(
    claimVerdicts.reduce((sum, v) => sum + v.truthPercentage, 0) / claimVerdicts.length
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
    articleVerdictReason: Math.abs(avgTruthPct - claimsAvgTruthPct) > 15 
      ? `Claims avg: ${percentageToArticleVerdict(claimsAvgTruthPct)} (${claimsAvgTruthPct}%)` 
      : undefined,
    
    claimPattern
  };

  return { claimVerdicts, articleAnalysis, questionAnswer };
}

async function generateQuestionVerdicts(
  state: ResearchState,
  understanding: ClaimUnderstanding,
  factsFormatted: string,
  claimsFormatted: string,
  model: any
): Promise<{ claimVerdicts: ClaimVerdict[]; articleAnalysis: ArticleAnalysis; questionAnswer: QuestionAnswer }> {
  
  const systemPrompt = `Answer the question. Mark contested factors with isContested=true.`;

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
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      output: Output.object({ schema: VERDICTS_SCHEMA_SIMPLE })
    });
    state.llmCalls++;

    // Handle different AI SDK versions
    // @ts-ignore - experimental_output may exist in some SDK versions
    const rawOutput = result.output ?? result.experimental_output?.value ?? result.experimental_output;
    if (rawOutput) {
      parsed = rawOutput as z.infer<typeof VERDICTS_SCHEMA_SIMPLE>;
    }
  } catch (err) {
    console.warn("[Analyzer] Structured output failed for question verdicts, using fallback:", err);
    state.llmCalls++;
  }
  
  // Fallback if structured output failed
  if (!parsed || !parsed.claimVerdicts) {
    console.log("[Analyzer] Using fallback question verdict generation");
    
    const fallbackVerdicts: ClaimVerdict[] = understanding.subClaims.map((claim: any) => ({
      claimId: claim.id,
      claimText: claim.text,
      llmVerdict: "UNCERTAIN",
      verdict: "Unverified" as const,
      confidence: 50,
      truthPercentage: 50,
      riskTier: "B" as const,
      reasoning: "Unable to generate verdict due to schema validation error.",
      supportingFactIds: [],
      isCentral: claim.isCentral || false,
      startOffset: claim.startOffset,
      endOffset: claim.endOffset,
      highlightColor: getHighlightColor7Point("Unverified")
    }));
    
    const questionAnswer: QuestionAnswer = {
      question: understanding.questionBeingAsked || state.originalInput || "",
      answer: "INSUFFICIENT-EVIDENCE",
      confidence: 50,
      truthPercentage: 50,
      shortAnswer: "Unable to determine - analysis failed",
      nuancedAnswer: "The structured output generation failed. Manual review recommended.",
      keyFactors: []
    };
    
    const articleAnalysis: ArticleAnalysis = {
      inputType: "question",
      isQuestion: true,
      questionAnswer,
      hasMultipleProceedings: false,
      articleThesis: understanding.articleThesis,
      logicalFallacies: [],
      claimsAverageTruthPercentage: 50,
      claimsAverageVerdict: "Unverified",
      articleTruthPercentage: 50,
      articleVerdict: "Unverified",
      claimPattern: { total: fallbackVerdicts.length, supported: 0, uncertain: fallbackVerdicts.length, refuted: 0 }
    };
    
    return { claimVerdicts: fallbackVerdicts, articleAnalysis, questionAnswer };
  }
  
  // Normal flow with parsed output
  
  // Map LLM verdicts by claim ID for quick lookup
  const llmVerdictMap = new Map(
    (parsed.claimVerdicts || []).map((cv: any) => [cv.claimId, cv])
  );
  
  // Ensure ALL claims get a verdict
  const claimVerdicts: ClaimVerdict[] = understanding.subClaims.map((claim: any) => {
    const cv = llmVerdictMap.get(claim.id);
    
    if (!cv) {
      console.warn(`[Analyzer] Missing verdict for claim ${claim.id}, using default`);
      return {
        claimId: claim.id,
        claimText: claim.text,
        llmVerdict: "UNCERTAIN",
        verdict: "Unverified" as const,
        confidence: 50,
        truthPercentage: 50,
        riskTier: "B" as const,
        reasoning: "No verdict returned by LLM for this claim.",
        supportingFactIds: [],
        isCentral: claim.isCentral || false,
        startOffset: claim.startOffset,
        endOffset: claim.endOffset,
        highlightColor: getHighlightColor7Point("Unverified")
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
      highlightColor: getHighlightColor7Point(calibratedVerdict)
    } as ClaimVerdict;
  });
  
  const claimPattern = {
    total: claimVerdicts.length,
    supported: claimVerdicts.filter(v => v.truthPercentage >= 72).length,
    uncertain: claimVerdicts.filter(v => v.truthPercentage >= 43 && v.truthPercentage < 72).length,
    refuted: claimVerdicts.filter(v => v.truthPercentage < 43).length,
    centralClaimsTotal: claimVerdicts.filter(v => v.isCentral).length,
    centralClaimsSupported: claimVerdicts.filter(v => v.isCentral && v.truthPercentage >= 72).length
  };

  const hasContestedFactors = parsed.questionAnswer.keyFactors.some((kf: any) => kf.isContested);

  // Calculate truth percentage and derive answer
  const answerTruthPct = calculateQuestionTruthPercentage(parsed.questionAnswer.answer, parsed.questionAnswer.confidence);
  const calibratedAnswer = percentageToQuestionAnswer(answerTruthPct);

  const questionAnswer: QuestionAnswer = {
    question: understanding.questionBeingAsked || state.originalInput,
    llmAnswer: parsed.questionAnswer.answer,
    answer: calibratedAnswer,
    confidence: parsed.questionAnswer.confidence,
    truthPercentage: answerTruthPct,
    shortAnswer: parsed.questionAnswer.shortAnswer,
    nuancedAnswer: parsed.questionAnswer.nuancedAnswer,
    keyFactors: parsed.questionAnswer.keyFactors,
    hasMultipleProceedings: false,
    hasContestedFactors
  };

  // Calculate claims average truth percentage
  const claimsAvgTruthPct = claimVerdicts.length > 0 
    ? Math.round(claimVerdicts.reduce((sum, v) => sum + v.truthPercentage, 0) / claimVerdicts.length)
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
    articleVerdictReason: Math.abs(answerTruthPct - claimsAvgTruthPct) > 15 
      ? `Claims avg: ${percentageToArticleVerdict(claimsAvgTruthPct)} (${claimsAvgTruthPct}%)` 
      : undefined,
    
    claimPattern
  };

  return { claimVerdicts, articleAnalysis, questionAnswer };
}

async function generateClaimVerdicts(
  state: ResearchState,
  understanding: ClaimUnderstanding,
  factsFormatted: string,
  claimsFormatted: string,
  model: any,
  pseudoscienceAnalysis?: PseudoscienceAnalysis
): Promise<{ claimVerdicts: ClaimVerdict[]; articleAnalysis: ArticleAnalysis }> {
  
  // Add pseudoscience context and verdict calibration to prompt
  let systemPrompt = `Generate verdicts for each claim and article-level verdict.

VERDICT CALIBRATION (IMPORTANT):
- WELL-SUPPORTED: Strong evidence supports the claim
- PARTIALLY-SUPPORTED: Some evidence, but incomplete
- UNCERTAIN: Insufficient evidence to determine
- REFUTED: Strong evidence against, scientific consensus disagrees (use for 70-98% certainty)
- FALSE: ONLY for claims that are definitively, conclusively false with 99%+ certainty (e.g., "2+2=5", "the earth is flat")

For pseudoscience claims that lack scientific basis but can't be proven absolutely false, use REFUTED, not FALSE.`;

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
        { role: "user", content: `THESIS: "${understanding.articleThesis}"\n\nCLAIMS:\n${claimsFormatted}\n\nFACTS:\n${factsFormatted}` }
      ],
      temperature: 0.3,
      output: Output.object({ schema: VERDICTS_SCHEMA_CLAIM })
    });
    state.llmCalls++;

    // Handle different AI SDK versions
    // @ts-ignore - experimental_output may exist in some SDK versions
    const rawOutput = result.output ?? result.experimental_output?.value ?? result.experimental_output;
    if (rawOutput) {
      parsed = rawOutput as z.infer<typeof VERDICTS_SCHEMA_CLAIM>;
    }
  } catch (err) {
    console.warn("[Analyzer] Structured output failed for claim verdicts, using fallback:", err);
    state.llmCalls++;
  }
  
  // If structured output failed, create fallback verdicts
  if (!parsed || !parsed.claimVerdicts) {
    console.log("[Analyzer] Using fallback verdict generation");
    
    // Create default verdicts for each claim
    const fallbackVerdicts: ClaimVerdict[] = understanding.subClaims.map((claim: any) => {
      const calibratedVerdict = "Unverified" as const;
      return {
        claimId: claim.id,
        claimText: claim.text,
        llmVerdict: "UNCERTAIN",
        verdict: calibratedVerdict,
        confidence: 50,
        truthPercentage: 50,
        riskTier: "B" as const,
        reasoning: "Unable to generate verdict due to schema validation error. Manual review recommended.",
        supportingFactIds: [],
        isCentral: claim.isCentral || false,
        startOffset: claim.startOffset,
        endOffset: claim.endOffset,
        highlightColor: getHighlightColor7Point(calibratedVerdict)
      };
    });
    
    const articleAnalysis: ArticleAnalysis = {
      inputType: "article",
      isQuestion: false,
      hasMultipleProceedings: false,
      articleThesis: understanding.articleThesis,
      logicalFallacies: [],
      claimsAverageTruthPercentage: 50,
      claimsAverageVerdict: "Unverified",
      articleTruthPercentage: 50,
      articleVerdict: "Unverified",
      articleVerdictReason: "Verdict generation failed - manual review recommended",
      claimPattern: {
        total: fallbackVerdicts.length,
        supported: 0,
        uncertain: fallbackVerdicts.length,
        refuted: 0
      }
    };
    
    return { claimVerdicts: fallbackVerdicts, articleAnalysis };
  }
  
  // Normal flow with parsed output
  
  // Map LLM verdicts by claim ID for quick lookup
  const llmVerdictMap = new Map(
    (parsed.claimVerdicts || []).map((cv: any) => [cv.claimId, cv])
  );
  
  // Ensure ALL claims get a verdict (fill in missing ones)
  const claimVerdicts: ClaimVerdict[] = understanding.subClaims.map((claim: any) => {
    const cv = llmVerdictMap.get(claim.id);
    
    // If LLM didn't return a verdict for this claim, create a default one
    if (!cv) {
      console.warn(`[Analyzer] Missing verdict for claim ${claim.id}, using default`);
      return {
        claimId: claim.id,
        claimText: claim.text,
        llmVerdict: "UNCERTAIN",
        verdict: "Unverified" as const,
        confidence: 50,
        truthPercentage: 50,
        riskTier: "B" as const,
        reasoning: "No verdict returned by LLM for this claim.",
        supportingFactIds: [],
        isCentral: claim.isCentral || false,
        claimRole: claim.claimRole || "core",
        dependsOn: claim.dependsOn || [],
        startOffset: claim.startOffset,
        endOffset: claim.endOffset,
        highlightColor: getHighlightColor7Point("Unverified")
      } as ClaimVerdict;
    }
    
    let llmVerdict = cv.verdict;
    let finalConfidence = cv.confidence;
    let escalationReason: string | undefined;
    
    // Apply pseudoscience escalation (adjusts LLM verdict before calibration)
    if (pseudoscienceAnalysis?.isPseudoscience) {
      const claimPseudo = detectPseudoscience(claim.text || cv.claimId);
      if (claimPseudo.isPseudoscience || pseudoscienceAnalysis.confidence >= 0.5) {
        const escalation = escalatePseudoscienceVerdict(cv.verdict, cv.confidence, pseudoscienceAnalysis);
        llmVerdict = escalation.verdict;
        finalConfidence = escalation.confidence;
        escalationReason = escalation.escalationReason;
      }
    }
    
    // Calibrate to 7-point scale
    const truthPct = calculateTruthPercentage(llmVerdict, finalConfidence);
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
      startOffset: claim.startOffset,
      endOffset: claim.endOffset,
      highlightColor: getHighlightColor7Point(calibratedVerdict),
      isPseudoscience: pseudoscienceAnalysis?.isPseudoscience,
      escalationReason
    } as ClaimVerdict;
  });
  
  // DEPENDENCY PROPAGATION: If a prerequisite claim is false, flag dependent claims
  const verdictMap = new Map(claimVerdicts.map(v => [v.claimId, v]));
  
  for (const verdict of claimVerdicts) {
    const claim = understanding.subClaims.find((c: any) => c.id === verdict.claimId);
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
        const depNames = failedDeps.map((id: string) => {
          const dv = verdictMap.get(id);
          return dv ? `${id}: "${dv.claimText.slice(0, 50)}..."` : id;
        }).join(", ");
        
        verdict.reasoning = `[PREREQUISITE FAILED: ${depNames}] ${verdict.reasoning || ""}`;
        
        // For display purposes, we keep the original verdict but flag it
        // The UI can choose to show this differently
      }
    }
  }
  
  // Calculate claim pattern using truth percentages
  const claimPattern = {
    total: claimVerdicts.length,
    supported: claimVerdicts.filter(v => v.truthPercentage >= 72).length,
    uncertain: claimVerdicts.filter(v => v.truthPercentage >= 43 && v.truthPercentage < 72).length,
    refuted: claimVerdicts.filter(v => v.truthPercentage < 43).length,
    centralClaimsTotal: claimVerdicts.filter(v => v.isCentral).length,
    centralClaimsSupported: claimVerdicts.filter(v => v.isCentral && v.truthPercentage >= 72).length
  };

  // Calculate claims average truth percentage
  const claimsAvgTruthPct = claimVerdicts.length > 0 
    ? Math.round(claimVerdicts.reduce((sum, v) => sum + v.truthPercentage, 0) / claimVerdicts.length)
    : 50;
  
  // Calculate article truth percentage from LLM's article verdict
  let articleTruthPct = calculateArticleTruthPercentage(
    parsed.articleAnalysis.articleVerdict,
    parsed.articleAnalysis.articleConfidence
  );
  
  // If LLM returned default/unknown verdict (50%), use claims average instead
  if (articleTruthPct === 50 && claimsAvgTruthPct !== 50) {
    articleTruthPct = claimsAvgTruthPct;
  }
  
  // For pseudoscience: article verdict cannot be higher than claims average
  // (can't have a credible article with false claims)
  if (pseudoscienceAnalysis?.isPseudoscience && articleTruthPct > claimsAvgTruthPct) {
    articleTruthPct = Math.min(claimsAvgTruthPct, 28); // Cap at FALSE level for pseudoscience
  }
  
  // Check if article verdict differs significantly from claims average
  const verdictDiffers = Math.abs(articleTruthPct - claimsAvgTruthPct) > 15;

  return {
    claimVerdicts,
    articleAnalysis: {
      inputType: understanding.detectedInputType,
      isQuestion: false,
      hasMultipleProceedings: false,
      articleThesis: understanding.articleThesis,
      logicalFallacies: parsed.articleAnalysis.logicalFallacies,
      
      // Claims summary
      claimsAverageTruthPercentage: claimsAvgTruthPct,
      claimsAverageVerdict: percentageToArticleVerdict(claimsAvgTruthPct),
      
      // Article verdict (LLM's independent assessment)
      articleTruthPercentage: articleTruthPct,
      articleVerdict: percentageToArticleVerdict(articleTruthPct),
      articleVerdictReason: verdictDiffers 
        ? (articleTruthPct < claimsAvgTruthPct 
            ? "Article uses facts misleadingly or draws unsupported conclusions"
            : "Article's conclusion is better supported than individual claims suggest")
        : undefined,
      
      // LLM outputs for debugging
      llmArticleVerdict: parsed.articleAnalysis.articleVerdict,
      llmArticleConfidence: parsed.articleAnalysis.articleConfidence,
      
      claimPattern,
      isPseudoscience: pseudoscienceAnalysis?.isPseudoscience,
      pseudoscienceCategories: pseudoscienceAnalysis?.categories
    }
  };
}

function getHighlightColor(verdict: string): "green" | "yellow" | "red" {
  switch (verdict) {
    case "WELL-SUPPORTED": return "green";
    case "PARTIALLY-SUPPORTED":
    case "UNCERTAIN": return "yellow";
    case "REFUTED": return "red";
    default: return "yellow";
  }
}

// ============================================================================
// STEP 6-7: Summary & Report
// ============================================================================

async function generateTwoPanelSummary(
  state: ResearchState,
  claimVerdicts: ClaimVerdict[],
  articleAnalysis: ArticleAnalysis,
  model: any
): Promise<TwoPanelSummary> {
  const understanding = state.understanding!;
  const isQuestion = articleAnalysis.isQuestion;
  const hasMultipleProceedings = articleAnalysis.hasMultipleProceedings;
  
  let title = isQuestion 
    ? `Question: ${understanding.questionBeingAsked || state.originalInput}`
    : state.originalText.split("\n")[0]?.trim().slice(0, 100) || "Analyzed Content";
    
  if (hasMultipleProceedings) {
    title += ` (${understanding.distinctProceedings.length} proceedings)`;
  }
  
  const articleSummary = {
    title,
    source: state.inputType === "url" ? state.originalInput : "User-provided text",
    mainArgument: `Implied claim: ${understanding.impliedClaim || understanding.articleThesis}`,
    keyFindings: understanding.subClaims.slice(0, 4).map((c: any) => c.text),
    reasoning: hasMultipleProceedings
      ? `Covers ${understanding.distinctProceedings.length} proceedings: ${understanding.distinctProceedings.map((p: DistinctProceeding) => p.shortName).join(", ")}`
      : `Examined ${understanding.subClaims.length} claims`,
    conclusion: articleAnalysis.questionAnswer?.shortAnswer || understanding.articleThesis
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
    // Show claims average if different
    if (articleAnalysis.articleVerdictReason) {
      overallVerdict += `\nClaims: ${articleAnalysis.claimsAverageVerdict} (${articleAnalysis.claimsAverageTruthPercentage}%)`;
    }
  }
  
  const inputUrl = state.inputType === "url" ? state.originalInput : undefined;
  
  const factharborAnalysis = {
    sourceCredibility: calculateOverallCredibility(state.sources, inputUrl),
    claimVerdicts: claimVerdicts.map((cv: ClaimVerdict) => ({
      claim: cv.claimText.slice(0, 80) + (cv.claimText.length > 80 ? "..." : ""),
      verdict: cv.verdict,
      truthPercentage: cv.truthPercentage
    })),
    methodologyAssessment: generateMethodologyAssessment(state, articleAnalysis),
    overallVerdict,
    analysisId
  };
  
  return { articleSummary, factharborAnalysis };
}

function calculateOverallCredibility(sources: FetchedSource[], inputUrl?: string): string {
  // First, check input source credibility if URL provided
  let inputSourceInfo = "";
  if (inputUrl && inputUrl.startsWith("http")) {
    try {
      const hostname = new URL(inputUrl).hostname.replace(/^www\./, "");
      const inputScore = getTrackRecordScore(inputUrl);
      if (inputScore !== null) {
        const level = inputScore >= 0.85 ? "Very High" : inputScore >= 0.70 ? "High" : inputScore >= 0.55 ? "Medium" : "Low";
        inputSourceInfo = `${hostname}: ${level} (${(inputScore * 100).toFixed(0)}%)`;
      } else {
        inputSourceInfo = `${hostname}: Unknown`;
      }
    } catch {
      inputSourceInfo = "Unknown source";
    }
  }
  
  // Then check research sources
  const withScore = sources.filter(s => s.trackRecordScore !== null && s.fetchSuccess);
  if (withScore.length === 0) {
    return inputSourceInfo || "Unknown";
  }
  
  const avg = withScore.reduce((sum, s) => sum + (s.trackRecordScore || 0), 0) / withScore.length;
  const researchLevel = avg >= 0.85 ? "Very High" : avg >= 0.70 ? "High" : avg >= 0.55 ? "Medium" : "Low";
  const researchInfo = `Research sources: ${researchLevel} (${(avg * 100).toFixed(0)}%)`;
  
  if (inputSourceInfo) {
    return `${inputSourceInfo}\n${researchInfo}`;
  }
  return researchInfo;
}

function generateMethodologyAssessment(state: ResearchState, articleAnalysis: ArticleAnalysis): string {
  const parts: string[] = [];
  parts.push("Question-answering mode");
  if (articleAnalysis.hasMultipleProceedings) parts.push(`Multi-proceeding (${articleAnalysis.proceedings?.length})`);
  if (articleAnalysis.questionAnswer?.hasContestedFactors) parts.push("Contested factors flagged");
  parts.push(`${state.searchQueries.length} searches`);
  parts.push(`${state.sources.filter(s => s.fetchSuccess).length} sources`);
  return parts.join("; ");
}

async function generateReport(
  state: ResearchState,
  claimVerdicts: ClaimVerdict[],
  articleAnalysis: ArticleAnalysis,
  twoPanelSummary: TwoPanelSummary,
  model: any
): Promise<string> {
  const understanding = state.understanding!;
  const isQuestion = articleAnalysis.isQuestion;
  const hasMultipleProceedings = articleAnalysis.hasMultipleProceedings;
  
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
    
    if (qa.calibrationNote) report += `> ⚠️ ${qa.calibrationNote}\n\n`;
    
    report += `**Short Answer:** ${qa.shortAnswer}\n\n`;
    
    if (hasMultipleProceedings && qa.proceedingAnswers) {
      report += `## Proceedings Analysis\n\n`;
      for (const pa of qa.proceedingAnswers) {
        const proc = understanding.distinctProceedings.find((p: DistinctProceeding) => p.id === pa.proceedingId);
        const emoji = pa.truthPercentage >= 72 ? "✅" : pa.truthPercentage < 43 ? "❌" : "⚠️";
        
        report += `### ${proc?.name || pa.proceedingName}\n\n`;
        report += `**Answer:** ${emoji} ${pa.answer} (${pa.truthPercentage}%)\n\n`;
        
        if (pa.factorAnalysis) {
          report += `**Factors:** ${pa.factorAnalysis.positiveFactors} positive, ${pa.factorAnalysis.negativeFactors} negative (${pa.factorAnalysis.contestedNegatives} contested)\n\n`;
        }
        
        report += `${pa.shortAnswer}\n\n`;
        
        if (pa.keyFactors?.length > 0) {
          report += `**Key Factors:**\n`;
          for (const f of pa.keyFactors) {
            const icon = f.supports === "yes" ? "✅" : f.supports === "no" ? "❌" : "➖";
            report += `- ${icon} ${f.factor}${f.isContested ? " ⚠️ CONTESTED" : ""}\n`;
          }
          report += `\n`;
        }
        report += `---\n\n`;
      }
    }
  }
  
  // Claims
  report += `## Claims\n\n`;
  for (const cv of claimVerdicts) {
    // 7-level scale emoji mapping based on truthPercentage
    const emoji = 
      cv.truthPercentage >= 72 ? "🟢" :
      cv.truthPercentage >= 43 ? "🟡" :
      "🔴";
    report += `**${cv.claimId}:** ${cv.claimText}\n`;
    report += `${emoji} ${cv.verdict} (${cv.truthPercentage}% truth)\n\n`;
  }
  
  // Sources
  report += `## Sources\n\n`;
  for (const s of state.sources) {
    const status = s.fetchSuccess ? "✅" : "❌";
    report += `- ${status} [${s.title}](${s.url})`;
    if (s.trackRecordScore) report += ` (${(s.trackRecordScore * 100).toFixed(0)}%)`;
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
  const provider = (providerOverride ?? process.env.LLM_PROVIDER ?? "anthropic").toLowerCase();
  
  if (provider === "anthropic" || provider === "claude") {
    return { provider: "anthropic", modelName: "claude-sonnet-4-20250514", model: anthropic("claude-sonnet-4-20250514") };
  }
  if (provider === "google" || provider === "gemini") {
    return { provider: "google", modelName: "gemini-1.5-pro", model: google("gemini-1.5-pro") };
  }
  if (provider === "mistral") {
    return { provider: "mistral", modelName: "mistral-large-latest", model: mistral("mistral-large-latest") };
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
  const startTime = Date.now();
  const emit = input.onEvent ?? (() => {});
  const config = getActiveConfig();
  const mode = CONFIG.deepModeEnabled ? "deep" : "quick";
  
  const { provider, modelName, model } = getModel();
  
  await emit(`Analysis mode: ${mode} (v${CONFIG.schemaVersion})`, 2);
  
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
    searchQueries: [],  // NEW v2.4.3
    llmCalls: 0  // NEW v2.6.6
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
  await emit("Step 1: Analyzing input", 5);
  try {
    state.understanding = await understandClaim(textToAnalyze, model);
    state.llmCalls++;  // understandClaim uses 1 LLM call
  } catch (err) {
    console.error("Understanding failed:", err);
    state.understanding = {
      detectedInputType: "claim",
      distinctProceedings: [],
      requiresSeparateAnalysis: false,
      mainQuestion: textToAnalyze.slice(0, 200),
      articleThesis: textToAnalyze.slice(0, 200),
      subClaims: [{ id: "C1", text: textToAnalyze.slice(0, 200), type: "factual", keyEntities: [], isCentral: true }],
      distinctEvents: [],
      legalFrameworks: [],
      researchQuestions: [],
      riskTier: "B"
    };
  }
  
  const proceedingCount = state.understanding.distinctProceedings.length;
  let statusMsg = `Detected: ${state.understanding.detectedInputType.toUpperCase()} with ${state.understanding.subClaims.length} claims`;
  if (proceedingCount > 1) statusMsg += ` | ${proceedingCount} PROCEEDINGS`;
  await emit(statusMsg, 10);
  
  // STEP 2-4: Research with search tracking
  let iteration = 0;
  while (iteration < config.maxResearchIterations && state.sources.length < config.maxTotalSources) {
    iteration++;
    const baseProgress = 10 + (iteration / config.maxResearchIterations) * 50;
    
    const decision = decideNextResearch(state);
    if (decision.complete) {
      await emit(`Research complete: ${state.facts.length} facts, ${state.searchQueries.length} searches`, baseProgress);
      break;
    }
    
    let focusMsg = `Step 2.${iteration}: ${decision.focus}`;
    if (decision.targetProceedingId) focusMsg += ` [${decision.targetProceedingId}]`;
    await emit(focusMsg, baseProgress);
    
    if (decision.isContradictionSearch) state.contradictionSearchPerformed = true;
    
    // Check if search is enabled
    if (!CONFIG.searchEnabled) {
      await emit(`⚠️ Search disabled (FH_SEARCH_ENABLED=false)`, baseProgress + 1);
      state.searchQueries.push({
        query: decision.queries?.[0] || "search disabled",
        iteration,
        focus: decision.focus!,
        resultsCount: 0,
        timestamp: new Date().toISOString(),
        searchProvider: "Disabled"
      });
      continue;
    }
    
    // Perform searches and track them
    const searchResults: Array<{ url: string; title: string; query: string }> = [];
    for (const query of decision.queries || []) {
      await emit(`🔍 Searching [${CONFIG.searchProvider}]: "${query}"`, baseProgress + 1);
      
      try {
        let results = await searchWeb({ query, maxResults: config.maxSourcesPerIteration });
        
        // Apply domain whitelist if configured
        if (CONFIG.searchDomainWhitelist && CONFIG.searchDomainWhitelist.length > 0) {
          const beforeCount = results.length;
          results = results.filter((r: any) => {
            try {
              const hostname = new URL(r.url).hostname.replace(/^www\./, "").toLowerCase();
              return CONFIG.searchDomainWhitelist!.some(domain => 
                hostname === domain || hostname.endsWith("." + domain)
              );
            } catch { return false; }
          });
          if (beforeCount > results.length) {
            await emit(`  → Filtered ${beforeCount - results.length} results (domain whitelist)`, baseProgress + 1);
          }
        }
        
        // Track the search with provider info
        state.searchQueries.push({
          query,
          iteration,
          focus: decision.focus!,
          resultsCount: results.length,
          timestamp: new Date().toISOString(),
          searchProvider: CONFIG.searchProvider
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
          searchProvider: CONFIG.searchProvider
        });
      }
    }
    
    const seenUrls = new Set(state.sources.map((s: FetchedSource) => s.url));
    const newResults = searchResults.filter(r => !seenUrls.has(r.url));
    const uniqueResults = [...new Map(newResults.map((r: any) => [r.url, r])).values()].slice(0, config.maxSourcesPerIteration);
    
    if (uniqueResults.length === 0) {
      state.iterations.push({ number: iteration, focus: decision.focus!, queries: decision.queries!, sourcesFound: 0, factsExtracted: state.facts.length });
      continue;
    }
    
    await emit(`Fetching ${uniqueResults.length} sources`, baseProgress + 3);
    
    const fetchPromises = uniqueResults.map((r: any, i: number) =>
      fetchSource(r.url, `S${state.sources.length + i + 1}`, decision.category || "general", r.query)
    );
    const fetchedSources = await Promise.all(fetchPromises);
    const validSources = fetchedSources.filter((s): s is FetchedSource => s !== null);
    state.sources.push(...validSources);
    
    const successfulSources = validSources.filter(s => s.fetchSuccess);
    await emit(`  → ${successfulSources.length}/${validSources.length} fetched successfully`, baseProgress + 5);
    
    if (decision.isContradictionSearch) state.contradictionSourcesFound = successfulSources.length;
    
    await emit(`Extracting facts`, baseProgress + 8);
    for (const source of successfulSources) {
      const facts = await extractFacts(source, decision.focus!, model, state.understanding!.distinctProceedings, decision.targetProceedingId);
      state.facts.push(...facts);
      state.llmCalls++;  // Each extractFacts call is 1 LLM call
    }
    
    state.iterations.push({ number: iteration, focus: decision.focus!, queries: decision.queries!, sourcesFound: successfulSources.length, factsExtracted: state.facts.length });
    await emit(`Iteration ${iteration}: ${state.facts.length} facts from ${state.sources.length} sources`, baseProgress + 12);
  }
  
  // STEP 5: Verdicts
  await emit("Step 3: Generating verdicts", 65);
  const { claimVerdicts, articleAnalysis, questionAnswer, pseudoscienceAnalysis } = await generateVerdicts(state, model);
  
  if (pseudoscienceAnalysis?.isPseudoscience) {
    await emit(`⚠️ Pseudoscience detected: ${pseudoscienceAnalysis.categories.join(", ")}`, 67);
  }
  
  // STEP 6: Summary
  await emit("Step 4: Building summary", 75);
  const twoPanelSummary = await generateTwoPanelSummary(state, claimVerdicts, articleAnalysis, model);
  
  // STEP 7: Report
  await emit("Step 5: Generating report", 85);
  const reportMarkdown = await generateReport(state, claimVerdicts, articleAnalysis, twoPanelSummary, model);
  
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
      hasContestedFactors: articleAnalysis.questionAnswer?.hasContestedFactors || false,
      // NEW v2.4.5: Pseudoscience detection
      isPseudoscience: pseudoscienceAnalysis?.isPseudoscience || false,
      pseudoscienceCategories: pseudoscienceAnalysis?.categories || [],
      pseudoscienceConfidence: pseudoscienceAnalysis?.confidence || 0,
      inputLength: textToAnalyze.length,
      analysisTimeMs: Date.now() - startTime,
      analysisId: twoPanelSummary.factharborAnalysis.analysisId
    },
    questionAnswer: questionAnswer || null,
    proceedings: state.understanding!.distinctProceedings,
    twoPanelSummary,
    articleAnalysis,
    claimVerdicts,
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
      searchQuery: s.searchQuery
    })),
    // NEW v2.4.3: Search queries
    searchQueries: state.searchQueries,
    iterations: state.iterations,
    // Research stats
    researchStats: {
      totalSearches: state.searchQueries.length,
      totalResults: state.searchQueries.reduce((sum, q) => sum + q.resultsCount, 0),
      sourcesFetched: state.sources.length,
      sourcesSuccessful: state.sources.filter(s => s.fetchSuccess).length,
      factsExtracted: state.facts.length,
      contradictionSearchPerformed: state.contradictionSearchPerformed,
      llmCalls: state.llmCalls
    },
    // NEW v2.4.5: Pseudoscience analysis
    pseudoscienceAnalysis: pseudoscienceAnalysis ? {
      isPseudoscience: pseudoscienceAnalysis.isPseudoscience,
      confidence: pseudoscienceAnalysis.confidence,
      categories: pseudoscienceAnalysis.categories,
      recommendation: pseudoscienceAnalysis.recommendation,
      debunkIndicatorsFound: pseudoscienceAnalysis.debunkIndicatorsFound.length
    } : null,
    qualityGates: {
      passed: state.facts.length >= config.minFactsRequired && state.contradictionSearchPerformed,
      summary: {
        totalFacts: state.facts.length,
        totalSources: state.sources.length,
        searchesPerformed: state.searchQueries.length,
        contradictionSearchPerformed: state.contradictionSearchPerformed
      }
    }
  };
  
  return { resultJson, reportMarkdown };
}

export function clampConfidence(value: number): number {
  return Math.max(0.1, Math.min(1, value));
}
