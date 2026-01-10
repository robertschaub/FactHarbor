/**
 * FactHarbor POC1 Analyzer v2.6.23
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
 * - Unified analysis for questions and statements (same depth regardless of punctuation)
 * - Key Factors generated for procedural/legal topics in both modes
 * - Simplified schemas for better cross-provider compatibility
 * - Enhanced recency detection with news-related keywords (v2.6.22)
 * - Date-aware query variants for ALL search types (v2.6.22)
 * - Optional Gemini Grounded Search mode (v2.6.22)
 * - NEW v2.6.23: Fixed input neutrality - canonicalizeScopes uses normalized input
 * - NEW v2.6.23: Strengthened centrality heuristic with explicit examples
 * - NEW v2.6.23: Generic recency detection (removed person names)
 *
 * @version 2.6.23
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
import { searchWithGrounding, isGroundedSearchAvailable, convertToFetchedSources } from "@/lib/search-gemini-grounded";
import * as fs from "fs";
import * as path from "path";

// ============================================================================
// DEBUG LOGGING - writes to file for easy checking
// ============================================================================

// Agent debug logging - only runs on local development machine
const IS_LOCAL_DEV = process.env.NODE_ENV === "development" &&
  (process.env.HOSTNAME === "localhost" || !process.env.VERCEL);

function agentLog(location: string, message: string, data: any, hypothesisId: string) {
  if (!IS_LOCAL_DEV) return;
  fetch('http://127.0.0.1:7242/ingest/6ba69d74-cd95-4a82-aebe-8b8eeb32980a', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location,
      message,
      data,
      timestamp: Date.now(),
      sessionId: 'debug-session',
      runId: 'pre-fix',
      hypothesisId
    })
  }).catch(() => {});
}

// Write debug log to a fixed location that's easy to find
const DEBUG_LOG_PATH = "c:\\DEV\\FactHarbor\\apps\\web\\debug-analyzer.log";
const DEBUG_LOG_FILE_ENABLED =
  (process.env.FH_DEBUG_LOG_FILE ?? "true").toLowerCase() === "true";
const DEBUG_LOG_CLEAR_ON_START =
  (process.env.FH_DEBUG_LOG_CLEAR_ON_START ?? "false").toLowerCase() === "true";
const DEBUG_LOG_MAX_DATA_CHARS = 8000;

function debugLog(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  let logLine = `[${timestamp}] ${message}`;
  if (data !== undefined) {
    let payload: string;
    try {
      payload =
        typeof data === "string"
          ? data
          : JSON.stringify(data, null, 2);
    } catch {
      payload = "[unserializable]";
    }
    if (payload.length > DEBUG_LOG_MAX_DATA_CHARS) {
      payload = payload.slice(0, DEBUG_LOG_MAX_DATA_CHARS) + "…[truncated]";
    }
    logLine += ` | ${payload}`;
  }
  logLine += "\n";

  // Write to file (append) - async to avoid blocking the Node event loop during long analyses
  if (DEBUG_LOG_FILE_ENABLED) {
    fs.promises.appendFile(DEBUG_LOG_PATH, logLine).catch(() => {
      // Silently ignore file write errors
    });
  }

  // Also log to console
  console.log(logLine.trim());
}

function clearDebugLog() {
  if (!DEBUG_LOG_FILE_ENABLED) return;
  if (!DEBUG_LOG_CLEAR_ON_START) return;
  fs.promises
    .writeFile(
      DEBUG_LOG_PATH,
      `=== FactHarbor Debug Log Started at ${new Date().toISOString()} ===\n`,
    )
    .catch(() => {
      // Silently ignore
    });
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  schemaVersion: "2.6.24",
  deepModeEnabled:
    (process.env.FH_ANALYSIS_MODE ?? "quick").toLowerCase() === "deep",
  // Reduce run-to-run drift by removing sampling noise and stabilizing selection.
  deterministic:
    (process.env.FH_DETERMINISTIC ?? "true").toLowerCase() === "true",

  // Search configuration (FH_ prefixed for consistency)
  searchEnabled:
    (process.env.FH_SEARCH_ENABLED ?? "true").toLowerCase() === "true",
  searchProvider: detectSearchProvider(),
  searchDomainWhitelist: parseWhitelist(process.env.FH_SEARCH_DOMAIN_WHITELIST),
  // Search mode: "standard" (default) or "grounded" (uses Gemini's built-in Google Search)
  // Note: "grounded" mode only works when LLM_PROVIDER=gemini
  searchMode: (process.env.FH_SEARCH_MODE ?? "standard").toLowerCase() as "standard" | "grounded",
  // Optional global recency bias for search results.
  // If set to y|m|w, applies to ALL searches. If unset, date filtering is only applied when recency is detected.
  searchDateRestrict: (() => {
    const v = (process.env.FH_SEARCH_DATE_RESTRICT ?? "").toLowerCase().trim();
    if (v === "y" || v === "m" || v === "w") return v as "y" | "m" | "w";
    return null;
  })(),

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

function getDeterministicTemperature(defaultTemp: number): number {
  return CONFIG.deterministic ? 0 : defaultTemp;
}

function extractParenAcronym(text: string): string {
  const m = text.match(/\(([A-Z]{2,10})\)/);
  return m?.[1] ?? "";
}

function extractAllCapsToken(text: string): string {
  // Prefer explicit parenthetical acronyms, otherwise look for standalone ALLCAPS tokens.
  const paren = extractParenAcronym(text);
  if (paren) return paren;
  const m = text.match(/\b([A-Z]{2,6})\b/);
  return m?.[1] ?? "";
}

function inferScopeTypeLabel(p: any): string {
  const hay = [
    p?.name,
    p?.shortName,
    p?.metadata?.court,
    p?.metadata?.institution,
    p?.subject,
    ...(Array.isArray(p?.metadata?.charges) ? p.metadata.charges : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (/(election|electoral|ballot|campaign|ineligib|tse)\b/.test(hay)) return "Electoral";
  if (/(criminal|prosecut|indict|investigat|police|coup|stf|supreme)\b/.test(hay))
    return "Criminal";
  if (/\bcivil\b/.test(hay)) return "Civil";
  if (/(regulator|administrat|agency|licens|compliance)\b/.test(hay)) return "Regulatory";
  if (/(wtw|ttw|wtt|lifecycle|lca|iso\s*\d|methodology)\b/i.test(hay)) return "Methodological";
  if (/(efficien|performance|measure|benchmark|comparison)\b/i.test(hay)) return "Analytical";
  return "General";
}

function scopeTypeRank(label: string): number {
  // Stable ordering across runs: legal scopes first, then analytical, then general.
  switch (label) {
    case "Electoral":
      return 1;
    case "Criminal":
      return 2;
    case "Civil":
      return 3;
    case "Regulatory":
      return 4;
    case "Methodological":
      return 5;
    case "Analytical":
      return 6;
    case "General":
      return 7;
    default:
      return 9;
  }
}

// Backward compatibility alias
const proceedingTypeRank = scopeTypeRank;

function sanitizeScopeShortAnswer(shortAnswer: string, proceedingStatus: string): string {
  if (!shortAnswer) return shortAnswer;
  if ((proceedingStatus || "").toLowerCase() !== "unknown") return shortAnswer;

  let out = shortAnswer;
  // If we don't have an anchored procedural status, avoid asserting it in the narrative.
  out = out.replace(/\b(remains\s+ongoing)\b/gi, "status is unclear");
  out = out.replace(/\b(remains\s+in\s+progress)\b/gi, "status is unclear");
  out = out.replace(/\bongoing\b/gi, "unresolved");
  out = out.replace(/\bconcluded\b/gi, "reported concluded");
  out = out.replace(/\bpending\b/gi, "unresolved");
  return out;
}

function detectInstitutionCode(p: any): string {
  const fromCourt = extractAllCapsToken(String(p?.metadata?.court || ""));
  if (fromCourt) return fromCourt;
  const fromInstitution = extractAllCapsToken(String(p?.metadata?.institution || ""));
  if (fromInstitution) return fromInstitution;
  const fromShort = extractAllCapsToken(String(p?.shortName || ""));
  if (fromShort) return fromShort;
  const fromName = extractAllCapsToken(String(p?.name || ""));
  if (fromName) return fromName;
  const dms = Array.isArray(p?.metadata?.decisionMakers) ? p.metadata.decisionMakers : [];
  for (const dm of dms) {
    const code = extractAllCapsToken(String(dm?.affiliation || "")) || extractAllCapsToken(String(dm?.role || ""));
    if (code) return code;
  }
  return "";
}

function canonicalizeScopes(
  input: string,
  understanding: ClaimUnderstanding,
): ClaimUnderstanding {
  const procs = Array.isArray(understanding.distinctProceedings)
    ? understanding.distinctProceedings
    : [];
  if (procs.length === 0) return understanding;

  // #region agent log
  if (IS_LOCAL_DEV) fetch('http://127.0.0.1:7242/ingest/6ba69d74-cd95-4a82-aebe-8b8eeb32980a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apps/web/src/lib/analyzer.ts:canonicalizeScopes:entry',message:'canonicalizeScopes entry',data:{inputPreview:String(input).slice(0,200),count:procs.length,ids:procs.map((p:any)=>p?.id).slice(0,5)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  // Stable ordering to prevent run-to-run drift in labeling and downstream selection.
  // Use a lightweight, mostly-provider-invariant key: inferred type + institution code + court string.
  const sorted = [...procs].sort((a: any, b: any) => {
    const al = inferScopeTypeLabel(a);
    const bl = inferScopeTypeLabel(b);
    const ar = proceedingTypeRank(al);
    const br = proceedingTypeRank(bl);
    if (ar !== br) return ar - br;

    const ak = `${detectInstitutionCode(a)}|${String(a.metadata?.court || a.metadata?.institution || "").toLowerCase()}|${String(a.name || "").toLowerCase()}`;
    const bk = `${detectInstitutionCode(b)}|${String(b.metadata?.court || b.metadata?.institution || "").toLowerCase()}|${String(b.name || "").toLowerCase()}`;
    return ak.localeCompare(bk);
  });

  const idRemap = new Map<string, string>();
  const usedIds = new Set<string>();
  const hasExplicitYear = /\b(19|20)\d{2}\b/.test(input);
  const inputLower = input.toLowerCase();
  const hasExplicitStatusAnchor =
    /\b(sentenced|convicted|acquitted|indicted|charged|ongoing|pending|concluded)\b/.test(
      inputLower,
    );

  // #region agent log
  if (IS_LOCAL_DEV) fetch('http://127.0.0.1:7242/ingest/6ba69d74-cd95-4a82-aebe-8b8eeb32980a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apps/web/src/lib/analyzer.ts:canonicalizeScopes:anchors',message:'canonicalizeScopes anchors',data:{hasExplicitYear,hasExplicitStatusAnchor},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'C'})}).catch(()=>{});
  // #endregion

  const canonicalProceedings = sorted.map((p: any, idx: number) => {
    const typeLabel = inferScopeTypeLabel(p);
    const inst = detectInstitutionCode(p);
    let newId = inst ? `CTX_${inst}` : `CTX_${idx + 1}`;
    if (usedIds.has(newId)) newId = `${newId}_${idx + 1}`;
    usedIds.add(newId);
    idRemap.set(p.id, newId);
    const shortName = inst || p.shortName || `CTX${idx + 1}`;
    return {
      ...p,
      id: newId,
      // Make the primary display label stable and human-friendly across runs.
      name: inst ? `${typeLabel} proceeding (${inst})` : `${typeLabel} proceeding`,
      shortName,
      // Avoid presenting unanchored specifics as facts.
      date: hasExplicitYear ? p.date : "",
      status: hasExplicitStatusAnchor ? p.status : "unknown",
    };
  });

  const remappedClaims = (understanding.subClaims || []).map((c: any) => {
    const rp = c.relatedProceedingId;
    return {
      ...c,
      relatedProceedingId: rp && idRemap.has(rp) ? idRemap.get(rp) : rp,
    };
  });

  return {
    ...understanding,
    distinctProceedings: canonicalProceedings,
    subClaims: remappedClaims,
  };
}

function normalizeYesNoQuestionToStatement(input: string): string {
  // #region agent log
  if (IS_LOCAL_DEV) fetch('http://127.0.0.1:7242/ingest/6ba69d74-cd95-4a82-aebe-8b8eeb32980a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apps/web/src/lib/analyzer.ts:normalizeYesNoQuestionToStatement:entry',message:'normalizeYesNoQuestionToStatement entry',data:{input: String(input).slice(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  const trimmed = input.trim().replace(/\?+$/, "");

  // Handle the common yes/no forms in a way that is stable and avoids bad grammar.
  // Goal: "Was the X fair and based on Y?" -> "The X was fair and based on Y"
  const m = trimmed.match(/^(was|were|is|are)\s+(.+)$/i);
  if (!m) {
    // #region agent log
  if (IS_LOCAL_DEV) fetch('http://127.0.0.1:7242/ingest/6ba69d74-cd95-4a82-aebe-8b8eeb32980a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apps/web/src/lib/analyzer.ts:normalizeYesNoQuestionToStatement:no-match',message:'normalizeYesNoQuestionToStatement no-match',data:{trimmed: String(trimmed).slice(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return trimmed;
  }

  const aux = m[1].toLowerCase(); // was|were|is|are
  const rest = m[2].trim();
  if (!rest) return trimmed;

  // Prefer splitting on a clear subject boundary (parentheses / comma) when present.
  const lastParen = rest.lastIndexOf(")");
  if (lastParen > 0 && lastParen < rest.length - 1) {
    const subject = rest.slice(0, lastParen + 1).trim();
    const predicate = rest.slice(lastParen + 1).trim();
    const capSubject = subject.charAt(0).toUpperCase() + subject.slice(1);
    const out = `${capSubject} ${aux} ${predicate}`.replace(/\s+/g, " ").trim();
    // #region agent log
  if (IS_LOCAL_DEV) fetch('http://127.0.0.1:7242/ingest/6ba69d74-cd95-4a82-aebe-8b8eeb32980a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apps/web/src/lib/analyzer.ts:normalizeYesNoQuestionToStatement:paren-split',message:'normalizeYesNoQuestionToStatement paren-split',data:{aux,subject:subject.slice(0,120),predicate:predicate.slice(0,120),out:out.slice(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return out;
  }

  const commaIdx = rest.indexOf(",");
  if (commaIdx > 0 && commaIdx < rest.length - 1) {
    const subject = rest.slice(0, commaIdx).trim();
    const predicate = rest.slice(commaIdx + 1).trim();
    const capSubject = subject.charAt(0).toUpperCase() + subject.slice(1);
    const out = `${capSubject} ${aux} ${predicate}`.replace(/\s+/g, " ").trim();
    // #region agent log
  if (IS_LOCAL_DEV) fetch('http://127.0.0.1:7242/ingest/6ba69d74-cd95-4a82-aebe-8b8eeb32980a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apps/web/src/lib/analyzer.ts:normalizeYesNoQuestionToStatement:comma-split',message:'normalizeYesNoQuestionToStatement comma-split',data:{aux,subject:subject.slice(0,120),predicate:predicate.slice(0,120),out:out.slice(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    return out;
  }

  // Heuristic: split before common predicate starters (covers lots of "Was X fair/true/based..." questions).
  const predicateStarters = [
    "fair",
    "true",
    "false",
    "accurate",
    "correct",
    "legitimate",
    "legal",
    "valid",
    "based",
    "justified",
    "reasonable",
    "biased",
  ];
  const starterRe = new RegExp(`\\b(${predicateStarters.join("|")})\\b`, "i");
  const starterMatch = rest.match(starterRe);
  if (starterMatch && typeof starterMatch.index === "number" && starterMatch.index > 0) {
    const subject = rest.slice(0, starterMatch.index).trim();
    const predicate = rest.slice(starterMatch.index).trim();
    const capSubject = subject.charAt(0).toUpperCase() + subject.slice(1);
    if (subject && predicate) {
      const out = `${capSubject} ${aux} ${predicate}`.replace(/\s+/g, " ").trim();
      // #region agent log
  if (IS_LOCAL_DEV) fetch('http://127.0.0.1:7242/ingest/6ba69d74-cd95-4a82-aebe-8b8eeb32980a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apps/web/src/lib/analyzer.ts:normalizeYesNoQuestionToStatement:starter-split',message:'normalizeYesNoQuestionToStatement starter-split',data:{aux,starter:starterMatch[0],subject:subject.slice(0,120),predicate:predicate.slice(0,120),out:out.slice(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return out;
    }
  }

  // Fallback: don't guess a subject/predicate split; keep the remainder intact and use "It <aux> the case that …"
  // This is grammatical and stable, though not identical to a hand-written statement.
  const out = `It ${aux} the case that ${rest}`.replace(/\s+/g, " ").trim();
  // #region agent log
  if (IS_LOCAL_DEV) fetch('http://127.0.0.1:7242/ingest/6ba69d74-cd95-4a82-aebe-8b8eeb32980a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apps/web/src/lib/analyzer.ts:normalizeYesNoQuestionToStatement:fallback',message:'normalizeYesNoQuestionToStatement fallback',data:{aux,rest:rest.slice(0,200),out:out.slice(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
  // #endregion
  return out;
}

/**
 * Detect if a topic likely requires recent data
 * Returns true if dates, recent keywords, or temporal indicators suggest recency matters
 * v2.6.23: Removed domain-specific person names to comply with Generic by Design principle
 */
function isRecencySensitive(text: string, understanding?: ClaimUnderstanding): boolean {
  const lowerText = text.toLowerCase();

  // Check for recent date mentions (within last 3 years from current date - extended for better coverage)
  const currentYear = new Date().getFullYear();
  const recentYears = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3];
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

  // Check for news-related keywords that typically involve recent events (GENERIC - no person names)
  // These topics often have ongoing developments that require fresh search results
  const newsIndicatorKeywords = [
    // Legal/court outcomes (often have recent rulings)
    'trial', 'verdict', 'sentence', 'sentenced', 'ruling', 'ruled', 'convicted', 'acquitted',
    'indicted', 'charged', 'plea', 'appeal', 'court', 'judge', 'judgment',
    // Political events
    'election', 'elected', 'voted', 'vote', 'poll', 'campaign', 'inauguration',
    // Announcements and decisions
    'decision', 'announced', 'confirmed', 'approved', 'rejected', 'signed',
    // Investigations and proceedings
    'investigation', 'hearing', 'testimony', 'inquiry', 'probe',
    // Breaking news indicators
    'breaking', 'update', 'developing', 'just', 'new'
  ];

  if (newsIndicatorKeywords.some(keyword => lowerText.includes(keyword))) {
    return true;
  }

  // Check understanding for recent dates in scopes
  if (understanding?.distinctProceedings) {
    for (const scope of understanding.distinctProceedings) {
      const dateStr = scope.date || scope.temporal || "";
      if (dateStr && recentYears.some(year => dateStr.includes(String(year)))) {
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
- Standard procedures in well-documented domains (regulatory, scientific, organizational, etc.)
- Well-documented public roles and responsibilities (e.g., who is responsible for a decision or process)
- Major public events and their outcomes that were widely reported
- Established institutional processes (how reviews, audits, or decisions are typically handled)
- Historical events and their documented outcomes

### WHEN TO USE BACKGROUND KNOWLEDGE:
1. **Process integrity claims**: If you know a process follows standard procedures, mark supports="yes", NOT "neutral"
2. **Decision-maker roles**: If you know who was responsible for a process or decision, use that knowledge
3. **Established facts**: If something is widely documented (e.g., a process followed proper procedures), don't mark it "unknown"
4. **Applicable standards**: If you know which standards apply, use that to assess correct application

### CRITICAL RULES:
- NEVER mark a factor as "neutral" or "unknown" if you have relevant background knowledge
- NEVER place the answer in the UNVERIFIED band (43-57%) if you actually know the answer from your training data
- Stakeholder contestation ("critics say X") is NOT the same as factual uncertainty
- If you know a process followed standard procedures, say supports="yes" even without explicit source confirmation

### EXAMPLE - CORRECT USAGE:
For "The review followed proper procedures":
- You KNOW the review process has established procedural requirements
- You KNOW standard procedure requirements apply in this context
- Therefore: Assign a truth percentage in the TRUE/MOSTLY-TRUE band (72-100%), not the UNVERIFIED band (43-57%).

Prioritize provided sources when available, but actively supplement with your knowledge.`;
  }
  return "Use ONLY the provided facts and sources. If information is missing, keep the answer in the UNVERIFIED band (43-57%). Do not add facts not present in the sources.";
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
  recommendation: number | null;
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

    const refutedRecommendation = 10;
    const uncertainRecommendation = 50;

    if (result.confidence >= 0.7 || result.debunkIndicatorsFound.length >= 2) {
      result.recommendation = refutedRecommendation;
    } else if (
      result.confidence >= 0.5 ||
      result.debunkIndicatorsFound.length >= 1
    ) {
      result.recommendation = refutedRecommendation;
    } else {
      result.recommendation = uncertainRecommendation;
    }
  }

  return result;
}


/**
 * Escalate verdict when pseudoscience is detected
 */
function escalatePseudoscienceVerdict(
  originalTruthPercentage: number,
  originalConfidence: number,
  pseudoAnalysis: PseudoscienceAnalysis,
): { truthPercentage: number; confidence: number; escalationReason?: string } {
  const normalizedTruth = normalizePercentage(originalTruthPercentage);
  const normalizedConfidence = normalizePercentage(originalConfidence);

  if (!pseudoAnalysis.isPseudoscience) {
    return { truthPercentage: normalizedTruth, confidence: normalizedConfidence };
  }

  const strength = normalizedTruth >= 72 ? 4 : normalizedTruth >= 50 ? 3 : normalizedTruth >= 35 ? 2 : 1;
  let newTruth = normalizedTruth;
  let newConfidence = normalizedConfidence;
  let escalationReason: string | undefined;

  if (strength >= 2 && pseudoAnalysis.confidence >= 0.5) {
    if (pseudoAnalysis.debunkIndicatorsFound.length >= 2) {
      newConfidence = Math.min(Math.max(newConfidence, 80), 95);
      newTruth = truthFromBand("refuted", newConfidence);
      escalationReason = `Claim contradicts scientific consensus (${pseudoAnalysis.categories.join(", ")}) - multiple debunk sources found`;
    } else if (pseudoAnalysis.debunkIndicatorsFound.length >= 1) {
      newConfidence = Math.min(Math.max(newConfidence, 70), 90);
      newTruth = truthFromBand("refuted", newConfidence);
      escalationReason = `Claim based on pseudoscience (${pseudoAnalysis.categories.join(", ")}) - contradicts established science`;
    } else if (pseudoAnalysis.confidence >= 0.6) {
      newConfidence = Math.min(Math.max(newConfidence, 65), 85);
      newTruth = truthFromBand("refuted", newConfidence);
      escalationReason = `Multiple pseudoscience patterns detected (${pseudoAnalysis.categories.join(", ")}) - no scientific basis`;
    }
  }

  if (strength == 3 && pseudoAnalysis.confidence >= 0.4) {
    newConfidence = Math.min(newConfidence, 40);
    newTruth = truthFromBand("uncertain", newConfidence);
    escalationReason = `Claimed mechanism (${pseudoAnalysis.categories.join(", ")}) lacks scientific basis`;
  }

  return { truthPercentage: newTruth, confidence: newConfidence, escalationReason };
}


/**
 * Determine article-level verdict considering pseudoscience
 *
 * Verdict Calibration:
 * - Returns a truth percentage (0-100) based on claim pattern and evidence strength
 */
function calculateArticleVerdictWithPseudoscience(
  claimVerdicts: Array<{
    verdict: number;
    confidence: number;
    isPseudoscience?: boolean;
  }>,
  pseudoAnalysis: PseudoscienceAnalysis,
): { verdict: number; confidence: number; reason?: string } {
  const refutedCount = claimVerdicts.filter((v) => v.verdict < 43).length;
  const uncertainCount = claimVerdicts.filter(
    (v) => v.verdict >= 43 && v.verdict < 72,
  ).length;
  const supportedCount = claimVerdicts.filter((v) => v.verdict >= 72).length;
  const total = claimVerdicts.length;

  if (pseudoAnalysis.isPseudoscience && pseudoAnalysis.confidence >= 0.5) {
    if (
      uncertainCount >= total * 0.5 &&
      pseudoAnalysis.debunkIndicatorsFound.length >= 1
    ) {
      const confidence = Math.min(
        85,
        70 + pseudoAnalysis.debunkIndicatorsFound.length * 5,
      );
      return {
        verdict: truthFromBand("refuted", confidence),
        confidence,
        reason: `Claims based on pseudoscience (${pseudoAnalysis.categories.join(", ")}) - contradicted by scientific consensus`,
      };
    }

    if (pseudoAnalysis.debunkIndicatorsFound.length >= 1) {
      const avgConfidence =
        claimVerdicts.reduce((sum, v) => sum + v.confidence, 0) / total;
      const confidence = Math.min(avgConfidence, 90);
      return {
        verdict: truthFromBand("refuted", confidence),
        confidence,
        reason: `Contains pseudoscientific claims (${pseudoAnalysis.categories.join(", ")}) - no scientific basis`,
      };
    }

    return {
      verdict: Math.round(35),
      confidence: 70,
      reason: `Claims rely on unproven mechanisms (${pseudoAnalysis.categories.join(", ")})`,
    };
  }

  if (refutedCount >= total * 0.8) {
    const confidence = 85;
    return { verdict: truthFromBand("refuted", confidence), confidence };
  }
  if (refutedCount >= total * 0.5) {
    const confidence = 80;
    return { verdict: truthFromBand("refuted", confidence), confidence };
  }
  if (refutedCount > 0 || uncertainCount >= total * 0.5) {
    return { verdict: Math.round(35), confidence: 70 };
  }
  if (supportedCount >= total * 0.7) {
    const confidence = 80;
    return { verdict: truthFromBand("strong", confidence), confidence };
  }
  const confidence = 65;
  return { verdict: truthFromBand("partial", confidence), confidence };
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
  | "BALANCED" // 43-57%,  Score  0, high confidence (evidence on both sides)
  | "UNVERIFIED" // 43-57%,  Score  0, low confidence (insufficient evidence)
  | "LEANING-FALSE" // 29-42%,  Score -1
  | "MOSTLY-FALSE" // 15-28%,  Score -2
  | "FALSE"; // 0-14%,   Score -3

type QuestionAnswer7Point =
  | "YES" // 86-100%, Score +3
  | "MOSTLY-YES" // 72-85%,  Score +2
  | "LEANING-YES" // 58-71%,  Score +1
  | "BALANCED" // 43-57%,  Score  0, high confidence
  | "UNVERIFIED" // 43-57%,  Score  0, low confidence
  | "LEANING-NO" // 29-42%,  Score -1
  | "MOSTLY-NO" // 15-28%,  Score -2
  | "NO"; // 0-14%,   Score -3

type ArticleVerdict7Point =
  | "TRUE" // 86-100%, Score +3
  | "MOSTLY-TRUE" // 72-85%,  Score +2
  | "LEANING-TRUE" // 58-71%,  Score +1
  | "BALANCED" // 43-57%,  Score  0, high confidence (evidence on both sides)
  | "UNVERIFIED" // 43-57%,  Score  0, low confidence (insufficient evidence)
  | "LEANING-FALSE" // 29-42%,  Score -1
  | "MOSTLY-FALSE" // 15-28%,  Score -2
  | "FALSE"; // 0-14%,   Score -3

// Confidence threshold to distinguish BALANCED from UNVERIFIED
const BALANCED_CONFIDENCE_THRESHOLD = 60;

/**
 * Normalize truth percentage values (0-100)
 */
function normalizePercentage(value: number): number {
  if (!Number.isFinite(value)) return 50;
  const normalized = value >= 0 && value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, Math.round(normalized)));
}

function truthFromBand(
  band: "strong" | "partial" | "uncertain" | "refuted",
  confidence: number,
): number {
  const conf = normalizePercentage(confidence) / 100;
  switch (band) {
    case "strong":
      return Math.round(72 + 28 * conf);
    case "partial":
      return Math.round(50 + 35 * conf);
    case "uncertain":
      return Math.round(35 + 30 * conf);
    case "refuted":
      return Math.round(28 * (1 - conf));
  }
}


function calculateTruthPercentage(
  verdictPercentage: number,
  _confidence: number,
): number {
  return normalizePercentage(verdictPercentage);
}


/**
 * Normalize question truth percentage (0-100)
 */
function calculateQuestionTruthPercentage(
  answerPercentage: number,
  _confidence: number,
): number {
  return normalizePercentage(answerPercentage);
}


/**
 * Map truth percentage to 7-point claim verdict
 * @param truthPercentage - The truth percentage (0-100)
 * @param confidence - Optional confidence score (0-100). Used to distinguish BALANCED from UNVERIFIED in 43-57% range.
 */
function percentageToClaimVerdict(truthPercentage: number, confidence?: number): ClaimVerdict7Point {
  if (truthPercentage >= 86) return "TRUE";
  if (truthPercentage >= 72) return "MOSTLY-TRUE";
  if (truthPercentage >= 58) return "LEANING-TRUE";
  if (truthPercentage >= 43) {
    // Distinguish BALANCED (high confidence, evidence on both sides) from UNVERIFIED (low confidence, insufficient evidence)
    const conf = confidence !== undefined ? normalizePercentage(confidence) : 0;
    return conf >= BALANCED_CONFIDENCE_THRESHOLD ? "BALANCED" : "UNVERIFIED";
  }
  if (truthPercentage >= 29) return "LEANING-FALSE";
  if (truthPercentage >= 15) return "MOSTLY-FALSE";
  return "FALSE";
}

/**
 * Map truth percentage to question answer
 * @param truthPercentage - The truth percentage (0-100)
 * @param confidence - Optional confidence score (0-100). Used to distinguish BALANCED from UNVERIFIED in 43-57% range.
 */
function percentageToQuestionAnswer(
  truthPercentage: number,
  confidence?: number,
): QuestionAnswer7Point {
  if (truthPercentage >= 86) return "YES";
  if (truthPercentage >= 72) return "MOSTLY-YES";
  if (truthPercentage >= 58) return "LEANING-YES";
  if (truthPercentage >= 43) {
    const conf = confidence !== undefined ? normalizePercentage(confidence) : 0;
    return conf >= BALANCED_CONFIDENCE_THRESHOLD ? "BALANCED" : "UNVERIFIED";
  }
  if (truthPercentage >= 29) return "LEANING-NO";
  if (truthPercentage >= 15) return "MOSTLY-NO";
  return "NO";
}

/**
 * Map truth percentage to article verdict
 * @param truthPercentage - The truth percentage (0-100)
 * @param confidence - Optional confidence score (0-100). Used to distinguish BALANCED from UNVERIFIED in 43-57% range.
 */
function percentageToArticleVerdict(
  truthPercentage: number,
  confidence?: number,
): ArticleVerdict7Point {
  if (truthPercentage >= 86) return "TRUE";
  if (truthPercentage >= 72) return "MOSTLY-TRUE";
  if (truthPercentage >= 58) return "LEANING-TRUE";
  if (truthPercentage >= 43) {
    const conf = confidence !== undefined ? normalizePercentage(confidence) : 0;
    return conf >= BALANCED_CONFIDENCE_THRESHOLD ? "BALANCED" : "UNVERIFIED";
  }
  if (truthPercentage >= 29) return "LEANING-FALSE";
  if (truthPercentage >= 15) return "MOSTLY-FALSE";
  return "FALSE";
}

/**
 * Normalize article truth percentage (0-100)
 */
function calculateArticleTruthPercentage(
  verdictPercentage: number,
  _confidence: number,
): number {
  return normalizePercentage(verdictPercentage);
}


/**
 * Legacy: Map confidence to claim verdict (for backward compatibility)
 */
function calibrateClaimVerdict(
  truthPercentage: number,
  confidence: number,
): ClaimVerdict7Point {
  const truthPct = calculateTruthPercentage(truthPercentage, confidence);
  return percentageToClaimVerdict(truthPct);
}


/**
 * Legacy: Map confidence to question answer (for backward compatibility)
 */
function calibrateQuestionAnswer(
  truthPercentage: number,
  confidence: number,
): QuestionAnswer7Point {
  const truthPct = calculateQuestionTruthPercentage(truthPercentage, confidence);
  return percentageToQuestionAnswer(truthPct);
}


/**
 * Map confidence to article verdict
 */
function calibrateArticleVerdict(
  truthPercentage: number,
  confidence: number,
): ArticleVerdict7Point {
  const truthPct = calculateArticleTruthPercentage(truthPercentage, confidence);
  return percentageToArticleVerdict(truthPct);
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
  truthPercentage: number,
): "green" | "yellow" | "red" {
  const normalized = normalizePercentage(truthPercentage);
  if (normalized >= 72) return "green";
  if (normalized >= 43) return "yellow";
  return "red";
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

// Scope = A bounded analytical frame (unifies: legal proceedings, scientific methodologies, regulatory contexts)
// Replaces: DistinctProceeding, Context
interface Scope {
  id: string;                // e.g., "SCOPE_TSE", "SCOPE_WTW"
  name: string;              // Human-readable name
  shortName: string;         // Abbreviation

  // Unified fields (generic across domains)
  institution?: string;      // Court, agency, organization (was: court)
  jurisdiction?: string;     // Geographic/legal jurisdiction
  methodology?: string;      // Standard/method used (e.g., "ISO 14040", "WTW")
  boundaries?: string;       // What's included/excluded
  temporal?: string;         // Time period (was: date)
  subject: string;           // What's being analyzed
  criteria?: string[];       // Evaluation criteria (was: charges)
  outcome?: string;          // Result if known
  status: "concluded" | "ongoing" | "pending" | "unknown";

  // Legacy field mappings for backward compatibility
  court?: string;            // Alias for institution (legal domain)
  date?: string;             // Alias for temporal
  charges?: string[];        // Alias for criteria (legal domain)

  decisionMakers?: DecisionMaker[];
}

// Backward compatibility alias
type DistinctProceeding = Scope;

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
  // Answer truth percentage (0-100)
  answer: number;
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
  // NEW v2.6.22: Track if claim-level recency search was performed
  recentClaimsSearched: boolean;
}

interface ClaimUnderstanding {
  detectedInputType: InputType;
  questionIntent: QuestionIntent;
  questionBeingAsked: string;
  impliedClaim: string;
  wasOriginallyQuestion: boolean; // v2.6.24: Track if input was actually a question (not just LLM interpretation)

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
  // EvidenceScope: Captures the methodology/boundaries of the source document
  evidenceScope?: {
    name: string;           // Short label (e.g., "WTW", "TTW", "EU-LCA", "US jurisdiction")
    methodology?: string;   // Standard/method referenced (e.g., "ISO 14040", "EU RED II")
    boundaries?: string;    // What's included/excluded (e.g., "Primary energy to vehicle motion")
    geographic?: string;    // Geographic scope (e.g., "European Union", "California")
    temporal?: string;      // Time period (e.g., "2020-2025", "FY2024")
  };
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
  // Verdict truth percentage (0-100 where 100 = completely true)
  verdict: number;
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
  // Answer truth percentage (0-100)
  answer: number;
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
  claimsAverageVerdict: number;

  // ARTICLE VERDICT (LLM's independent assessment of thesis/conclusion)
  // May differ from claims average! E.g., true facts used to support false conclusion
  articleTruthPercentage: number;
  articleVerdict: number;
  articleVerdictReason?: string;

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
      verdict: number;
      truthPercentage: number;
    }>;
    methodologyAssessment: string;
    overallVerdict: number;
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

/**
 * Calculate de-duplicated weighted average truth percentage
 * Clusters near-duplicate claims and down-weights them so each semantic cluster
 * contributes approximately 1 unit to the average (prevents double-counting)
 */
function dedupeWeightedAverageTruth(verdicts: ClaimVerdict[]): number {
  if (verdicts.length === 0) return 50;
  if (verdicts.length === 1) return Math.round(verdicts[0].truthPercentage);

  // Simple token-based similarity clustering
  const tokenize = (text: string): Set<string> => {
    return new Set(
      text
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 3) // Ignore short words
    );
  };

  const jaccardSimilarity = (setA: Set<string>, setB: Set<string>): number => {
    const intersection = new Set([...setA].filter((x) => setB.has(x)));
    const union = new Set([...setA, ...setB]);
    return union.size === 0 ? 0 : intersection.size / union.size;
  };

  // Cluster claims by similarity (threshold 0.6)
  const clusters: ClaimVerdict[][] = [];
  for (const verdict of verdicts) {
    const tokens = tokenize(verdict.claimText);
    let addedToCluster = false;

    for (const cluster of clusters) {
      const clusterTokens = tokenize(cluster[0].claimText);
      if (jaccardSimilarity(tokens, clusterTokens) >= 0.6) {
        cluster.push(verdict);
        addedToCluster = true;
        break;
      }
    }

    if (!addedToCluster) {
      clusters.push([verdict]);
    }
  }

  // Calculate weighted average: each cluster contributes ~1 unit
  let totalWeight = 0;
  let weightedSum = 0;

  for (const cluster of clusters) {
    // Primary claim gets weight 1.0, duplicates share remaining weight
    const primaryWeight = 1.0;
    const duplicateWeight = cluster.length > 1 ? 0.5 / (cluster.length - 1) : 0;

    // Sort by truthPercentage descending to pick primary
    const sorted = [...cluster].sort((a, b) => b.truthPercentage - a.truthPercentage);

    weightedSum += sorted[0].truthPercentage * primaryWeight;
    totalWeight += primaryWeight;

    for (let i = 1; i < sorted.length; i++) {
      weightedSum += sorted[i].truthPercentage * duplicateWeight;
      totalWeight += duplicateWeight;
    }
  }

  return Math.round(weightedSum / totalWeight);
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
    return {
      ...verdict,
      evidenceWeight: avg,
      truthPercentage: adjustedTruth,
      confidence: adjustedConfidence,
      verdict: adjustedTruth,
      highlightColor: getHighlightColor7Point(adjustedTruth),
    };
  });
}

/**
 * Sanitize temporal error phrases from LLM-generated reasoning
 * Removes false "temporal error", "in the future", "date discrepancy" comments
 * that occur when LLM incorrectly assumes dates are impossible
 */
function sanitizeTemporalErrors(reasoning: string, currentDate: Date): string {
  const temporalErrorPatterns = [
    /temporal\s+error/gi,
    /in\s+the\s+future\s+from\s+the\s+current\s+date/gi,
    /date\s+discrepancy/gi,
    /(?:claim|statement|event)\s+(?:is|was)\s+(?:in\s+the\s+)?future/gi,
    /(?:occurred|happened)\s+in\s+the\s+future/gi,
    /cannot\s+have\s+occurred\s+yet/gi,
    /has\s+not\s+yet\s+happened/gi,
    /impossible\s+(?:date|timing)/gi,
  ];

  let sanitized = reasoning;
  let hasTemporalError = false;

  for (const pattern of temporalErrorPatterns) {
    if (pattern.test(sanitized)) {
      hasTemporalError = true;
      // Replace with neutral phrasing
      sanitized = sanitized.replace(pattern, "[date evaluated]");
    }
  }

  if (hasTemporalError) {
    debugLog("sanitizeTemporalErrors: Cleaned temporal error text", {
      before: reasoning.substring(0, 150),
      after: sanitized.substring(0, 150),
    });
  }

  return sanitized;
}

// ============================================================================
// TOPIC DETECTION (for unified analysis)
// ============================================================================

/**
 * Detect if the topic involves procedural or institutional analysis
 * This determines whether Key Factors should be generated (unified with question mode)
 *
 * Key Factors are appropriate for topics involving:
 * - Multi-step processes (rollouts, audits, reviews, investigations)
 * - Institutional decisions (regulatory, organizational, or governance actions)
 * - Procedural integrity (process fairness, evidence basis, role conflicts)
 * - High-impact decisions with formal standards or rules
 */
function detectProceduralTopic(understanding: ClaimUnderstanding, originalText: string): boolean {
  // Check 1: Has distinct proceedings detected
  if (understanding.distinctProceedings && understanding.distinctProceedings.length > 0) {
    return true;
  }

  // Check 2: Has formal frameworks identified
  if (understanding.legalFrameworks && understanding.legalFrameworks.length > 0) {
    return true;
  }

  // Check 3: Claims are predominantly procedural type
  const legalProceduralClaims = understanding.subClaims.filter(
    (c: any) => c.type === "legal" || c.type === "procedural"
  );
  if (legalProceduralClaims.length >= understanding.subClaims.length * 0.4) {
    return true;
  }

  // Check 4: Text contains procedural or governance keywords
  const proceduralKeywords = [
    /\b(phase|stage|episode|cycle|version|iteration|rollout|release)\b/i,
    /\b(process|procedure|protocol|standard|policy|framework)\b/i,
    /\b(review|audit|assessment|evaluation|investigation|probe)\b/i,
    /\b(committee|board|panel|commission|authority|agency)\b/i,
    /\b(conflict|impartial|independent|oversight|compliance)\b/i,
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
  isCentral: z.boolean(), // true only if BOTH harmPotential AND centrality are "high"
  relatedProceedingId: z.string(), // empty string if not applicable
  approximatePosition: z.string(), // empty string if not applicable
  keyFactorId: z.string(), // empty string if not mapped to any factor
});

// Lenient subclaim schema for providers that invent extra labels (e.g. "evidential").
// We normalize them back into the supported set so downstream code stays consistent.
const SUBCLAIM_SCHEMA_LENIENT = z.object({
  id: z.string(),
  text: z.string(),
  type: z
    .enum(["legal", "procedural", "factual", "evaluative", "evidential", "methodological"])
    .catch("factual")
    .transform((t) => (t === "evidential" || t === "methodological" ? "factual" : t)),
  claimRole: z.enum(["attribution", "source", "timing", "core", "unknown"]).catch("unknown"),
  dependsOn: z.array(z.string()).default([]),
  keyEntities: z.array(z.string()).default([]),
  checkWorthiness: z.enum(["high", "medium", "low"]).catch("medium"),
  harmPotential: z.enum(["high", "medium", "low"]).catch("medium"),
  centrality: z.enum(["high", "medium", "low"]).catch("medium"),
  isCentral: z.boolean().catch(false),
  relatedProceedingId: z.string().default(""),
  approximatePosition: z.string().default(""),
  keyFactorId: z.string().default(""),
});

// Generic AnalysisContext schema (replaces legal-specific DISTINCT_PROCEEDING_SCHEMA)
// Domain-specific fields (court, jurisdiction, charges, etc.) are now in metadata
const ANALYSIS_CONTEXT_SCHEMA = z.object({
  id: z.string(),
  name: z.string(),
  shortName: z.string(),
  subject: z.string().default(""),
  temporal: z.string().default(""),
  status: z.enum(["concluded", "ongoing", "pending", "unknown"]).catch("unknown"),
  outcome: z.string().default("unknown"),
  metadata: z.object({
    // Legal domain (backward compatibility)
    institution: z.string().optional(),
    court: z.string().optional(),
    jurisdiction: z.string().optional(),
    charges: z.array(z.string()).optional(),
    decisionMakers: z.array(z.object({
      name: z.string(),
      role: z.string(),
      affiliation: z.string().optional(),
    })).optional(),

    // Scientific domain
    methodology: z.string().optional(),
    boundaries: z.string().optional(),
    geographic: z.string().optional(),
    dataSource: z.string().optional(),

    // Regulatory domain
    regulatoryBody: z.string().optional(),
    standardApplied: z.string().optional(),
  }).passthrough().default({}),  // passthrough allows any additional fields
});

// NOTE: OpenAI structured output requires ALL properties to be in "required" array.
// Some providers are more tolerant and benefit from a more lenient schema.
const UNDERSTANDING_SCHEMA_OPENAI = z.object({
  detectedInputType: z.enum(["question", "claim", "article"]),
  questionIntent: z.enum(["verification", "exploration", "comparison", "none"]),
  questionBeingAsked: z.string(), // empty string if not applicable
  impliedClaim: z.string(), // empty string if not applicable

  distinctProceedings: z.array(ANALYSIS_CONTEXT_SCHEMA),
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
  // factor MUST be abstract label (2-5 words), NOT specific claims or quotes
  keyFactors: z.array(
    z.object({
      id: z.string(),
      question: z.string(), // The decomposition question (e.g., "Was due process followed?")
      factor: z.string(), // ABSTRACT label only (2-5 words, e.g., "Due Process", "Expert Consensus")
      category: z.enum(["procedural", "evidential", "methodological", "factual", "evaluative"]),
    }),
  ),
});

const SUPPLEMENTAL_SUBCLAIMS_SCHEMA = z.object({
  subClaims: z.array(SUBCLAIM_SCHEMA),
});

// Lenient variant for providers that sometimes omit arrays/fields; defaults prevent hard failures.
const UNDERSTANDING_SCHEMA_LENIENT = z.object({
  detectedInputType: z.enum(["question", "claim", "article"]).catch("claim"),
  // Some models invent new labels (e.g. "evaluation"); coerce unknowns to "none" then post-process.
  questionIntent: z.enum(["verification", "exploration", "comparison", "none"]).catch("none"),
  questionBeingAsked: z.string().default(""),
  impliedClaim: z.string().default(""),

  distinctProceedings: z.array(ANALYSIS_CONTEXT_SCHEMA).default([]),
  requiresSeparateAnalysis: z.boolean().default(false),
  proceedingContext: z.string().default(""),

  mainQuestion: z.string().default(""),
  articleThesis: z.string().default(""),
  subClaims: z.array(SUBCLAIM_SCHEMA_LENIENT).default([]),
  distinctEvents: z
    .array(
      z.object({
        name: z.string(),
        date: z.string(),
        description: z.string(),
      }),
    )
    .default([]),
  legalFrameworks: z.array(z.string()).default([]),
  researchQuestions: z.array(z.string()).default([]),
  riskTier: z.enum(["A", "B", "C"]).catch("B"),
  keyFactors: z
    .array(
      z.object({
        id: z.string(),
        question: z.string(),
        factor: z.string(),
        category: z
          .enum(["procedural", "evidential", "methodological", "factual", "evaluative"])
          .catch("evaluative"),
      }),
    )
    .default([]),
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

  // =========================================================================
  // EARLY INPUT NORMALIZATION: Convert questions to statements BEFORE LLM call
  // This ensures both "Was X fair?" and "X was fair" take the same analysis path
  // =========================================================================
  const trimmedInputRaw = input.trim();
  const looksLikeQuestionEarly =
    trimmedInputRaw.endsWith("?") ||
    /^(was|is|are|were|did|do|does|has|have|had|can|could|will|would|should|may|might)\s/i.test(
      trimmedInputRaw,
    );

  // Preserve original input for UI display, but normalize for analysis
  const originalQuestionInput = looksLikeQuestionEarly ? trimmedInputRaw : null;
  const normalizedInput = looksLikeQuestionEarly
    ? normalizeYesNoQuestionToStatement(trimmedInputRaw)
    : trimmedInputRaw;

  if (looksLikeQuestionEarly) {
    console.log(`[Analyzer] Input Neutrality: Normalized question to statement BEFORE LLM call`);
    console.log(`[Analyzer]   Original: "${trimmedInputRaw.substring(0, 100)}..."`);
    console.log(`[Analyzer]   Normalized: "${normalizedInput.substring(0, 100)}..."`);
  }

  // Use normalizedInput for all analysis from this point forward
  const analysisInput = normalizedInput;

  // Detect recency sensitivity for this analysis (using normalized input)
  const recencyMatters = isRecencySensitive(analysisInput, undefined);

  const systemPrompt = `You are a fact-checking analyst. Analyze the input with special attention to MULTIPLE DISTINCT EVENTS or CONTEXTS/THREADS.

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
- "The methodology used is scientifically valid" → centrality: LOW (meta-claim about analysis, not the subject)
- "The study followed ISO standards" → centrality: LOW (methodology validation, not the main claim)
- "The data collection methods were appropriate" → centrality: LOW (methodological, not substantive)

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

**isCentral = true** ONLY if BOTH harmPotential AND centrality are "high"
- checkWorthiness does NOT affect isCentral (a high checkWorthiness alone doesn't make it central)
- However, if checkWorthiness is "low", the claim should NOT be investigated or displayed
- Attribution, source, and timing claims should typically have centrality = "low" (not central to the argument)
- Only core evaluative claims that are the main thesis should have centrality = "high"

**CRITICAL HEURISTIC for centrality = "high"**:
Ask yourself: "If only ONE claim could be investigated, which would readers most want verified?"
→ That's the central claim. Others are supporting.

**EXPECT 0-2 CENTRAL CLAIMS MAXIMUM** in most analyses. More than 2 central claims indicates over-marking.

Only assign centrality: "high" when the claim is:
1. The PRIMARY thesis of the article/argument, AND
2. If false, would COMPLETELY invalidate the main conclusion

**Examples of NON-central claims (centrality = "low" or "medium")**:
- ❌ "Source X stated Y" (attribution - NOT central)
- ❌ "Event happened on date Z" (timing/background - NOT central)
- ❌ "Document was published by institution W" (source verification - NOT central)
- ❌ "Person A has credentials B" (background context - NOT central)
- ❌ "Study used methodology M" (methodological detail - NOT central unless methodology IS the main claim)
- ❌ "The TTW methodology is valid" (methodology validation - NOT central, the claim is about efficiency, not methodology)
- ❌ "The study framework is appropriate" (meta-analysis about methods - NOT central)
- ❌ "The analysis excludes/includes factor X" (methodological scope - NOT central)
- ❌ Supporting evidence for the main thesis (evidence - NOT central, only the thesis itself is central)

**CRITICAL FOR COMPARATIVE CLAIMS**: If the main claim is "X is better/more/faster than Y", then:
- ✓ CENTRAL: "X performs better than Y" or direct comparisons
- ❌ NOT CENTRAL: "The methodology for comparing X and Y is valid"
- ❌ NOT CENTRAL: "The analysis framework is appropriate"
- ❌ NOT CENTRAL: "The comparison includes/excludes certain factors"

**Examples of CENTRAL claims (centrality = "high")**:
- ✓ "The trial was fair and impartial" (PRIMARY evaluative thesis)
- ✓ "The vaccine causes serious side effects" (PRIMARY factual thesis)
- ✓ "The policy violated constitutional rights" (PRIMARY legal thesis)

**Rule of thumb**: In an analysis of "Was X fair?", only the fairness conclusion itself is central. All supporting facts, sources, dates, and background are NOT central.

NOT "high" for:
- Supporting evidence (even if important)
- Attribution claims (who said what)
- Source verification (does document exist)
- Background context
- Peripheral details

**FILTERING RULE**: Claims with checkWorthiness = "low" should be excluded from investigation

**Examples:**

"At least 10 children died because of COVID-19 vaccines"
→ checkWorthiness: HIGH (specific factual claim, readers want proof)
→ harmPotential: HIGH (public health, vaccine safety) ← HIGH
→ centrality: HIGH (core assertion of the article) ← HIGH
→ isCentral: TRUE (BOTH harmPotential AND centrality are HIGH)

"FDA will require randomized trials for all vaccines"
→ checkWorthiness: HIGH (policy claim that can be verified)
→ harmPotential: HIGH (affects drug development, public health) ← HIGH
→ centrality: HIGH (major policy change claim) ← HIGH
→ isCentral: TRUE (BOTH harmPotential AND centrality are HIGH)

"Prasad is CBER director"
→ claimRole: attribution
→ checkWorthiness: MEDIUM (verifiable but routine)
→ harmPotential: LOW (credential, not harmful if wrong)
→ centrality: LOW (attribution, not the main point)
→ isCentral: FALSE (centrality is not HIGH)

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
→ isCentral: FALSE (centrality is not HIGH, even though harmPotential is HIGH)

"Expert says the policy change is controversial"
→ checkWorthiness: HIGH (verifiable who said what)
→ harmPotential: MEDIUM (affects policy debate)
→ centrality: MEDIUM (contextual, not core)
→ isCentral: FALSE (neither harmPotential nor centrality is HIGH)

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

NOTE: SC5 may be TRUE (he did criticize) while SC6 may fall in the UNVERIFIED or LEANING-TRUE bands (43-71%).
The system must verify BOTH: (1) did he say it? AND (2) is what he said accurate?

### Dependencies:
1. List dependencies in dependsOn array (claim IDs that must be true for this claim to matter)
2. Core claims typically depend on attribution claims

## MULTI-SCOPE DETECTION

Look for multiple distinct scopes that should be analyzed separately.
**Definition**: A "Scope" is a bounded analytical frame with defined boundaries, methodology, temporal period, and subject matter.

If the input mixes timelines, distinct scopes, or different analytical frames, split them.

### IMPORTANT: What is a VALID distinct scope
- Separate formal proceedings (e.g., TSE electoral case vs STF criminal case)
- Distinct temporal events (e.g., 2023 rollout vs 2024 review)
- Different jurisdictional processes (e.g., state court vs federal court)
- Different analytical methodologies (e.g., WTW vs TTW vs WTT efficiency analysis)
- Different measurement boundaries (e.g., vehicle-only vs full-lifecycle)
- Different regulatory frameworks (e.g., EU vs US regulations)

### IMPORTANT: What is NOT a distinct scope
- Different national/political perspectives on the SAME event (e.g., "Venezuela's view" vs "US view")
- Different stakeholder viewpoints on a single topic
- Contested interpretations of the same event
- Pro vs con arguments about the same topic
- Claims and counter-claims about one event

**Only create separate scopes for GENUINELY DISTINCT events, proceedings, or analytical frames - not for different perspectives on the same event.**

### GENERIC EXAMPLES - MUST DETECT MULTIPLE SCOPES:

**Legal Domain:**
1. **CTX_TSE**: Electoral proceeding
   - subject: Electoral fraud allegations
   - temporal: 2024
   - status: concluded
   - outcome: Ineligibility ruling
   - metadata: { institution: "Superior Electoral Court", charges: ["Electoral fraud"], decisionMakers: [...] }

2. **CTX_STF**: Criminal proceeding
   - subject: Coup attempt charges
   - temporal: 2024
   - status: concluded
   - outcome: Prison sentence
   - metadata: { institution: "Supreme Federal Court", charges: ["Coup attempt"], decisionMakers: [...] }

**Scientific Domain:**
1. **CTX_WTW**: Well-to-Wheel analysis
   - subject: Full energy chain efficiency
   - temporal: 2024
   - status: concluded
   - outcome: 40% efficiency
   - metadata: { methodology: "ISO 14040", boundaries: "Primary energy to wheel", geographic: "EU" }

2. **CTX_TTW**: Tank-to-Wheel analysis
   - subject: Vehicle-only efficiency
   - temporal: 2024
   - status: concluded
   - outcome: 85% efficiency
   - metadata: { methodology: "SAE J1711", boundaries: "Stored energy to wheel" }

**CRITICAL: metadata.decisionMakers field is IMPORTANT for legal/regulatory contexts!**
- Extract ALL key decision-makers or primary actors mentioned or known
- Use your background knowledge to fill in known decision-makers for well-documented cases
- This enables cross-scope conflict of interest detection

Set requiresSeparateAnalysis = true when multiple scopes are detected.

## FOR QUESTIONS OR STATEMENTS

- **impliedClaim**: What claim would "YES" confirm? Must be AFFIRMATIVE.
  - CORRECT: "The process was fair and followed applicable standards"
  - WRONG: "may or may not have been fair"

- **subClaims**: Even for questions, generate sub-claims that need to be verified to answer the question.
  - Break down the implied claim into verifiable components
  - For multi-context cases, ensure meaningful coverage across all contexts (set relatedProceedingId appropriately)
  - **DECOMPOSE COMPOUND CLAIMS**: Split claims that combine multiple assertions into separate claims:
    - Isolate the core factual assertion as the CENTRAL claim (isCentral: true, claimRole: "core")
    - Separate source/attribution claims as non-central (isCentral: false, claimRole: "source" or "attribution")
    - Use dependsOn to link claims to their prerequisites
  - For each scope, consider claims covering:
    - Standards application (were relevant rules/standards/methods applied correctly?)
    - Process integrity (were appropriate procedures followed?)
    - Evidence basis (were conclusions based on evidence?)
    - Decision-maker independence (any conflicts of interest?)
    - Outcome proportionality/impact (was the outcome proportionate and consistent with similar situations?)
  - **CRITICAL: DECOMPOSE SPECIFIC OUTCOMES**: When specific outcomes, penalties, or consequences are mentioned (e.g., an \(N\)-year term, a monetary fine, a time-bound ban, ineligibility duration), create a SEPARATE claim evaluating whether that specific outcome was fair, proportionate, or appropriate for the context.

- **researchQuestions**: Generate specific questions to research, including:
  - Potential conflicts of interest for key decision-makers
  - Comparisons to similar cases, phases, or precedents
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
- **factor**: SHORT ABSTRACT LABEL (2-5 words ONLY, e.g., "Due Process", "Expert Consensus", "Energy Efficiency")
- **category**: Choose from: "procedural", "evidential", "methodological", "factual", "evaluative"

**CRITICAL: factor MUST be abstract, NOT claim text**:
- GOOD: "Energy efficiency comparison", "Expert consensus", "Procedural fairness"
- BAD: "Professor David Cebon states hydrogen cars need 3x more electricity" (TOO SPECIFIC)
- BAD: "Multiple industry experts say BEVs are more efficient" (CONTAINS ATTRIBUTION)
- BAD: "The well-to-wheel efficiency of hydrogen exceeds electric" (THIS IS A CLAIM)

KeyFactors are CATEGORIES for evaluation, NOT the claims themselves. Specific claims belong in subClaims array.

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

  // Use normalized analysisInput (question→statement) for consistent LLM analysis
  const userPrompt = `Analyze for fact-checking:\n\n"${analysisInput}"`;

  function extractFirstJsonObject(text: string): string | null {
    const start = text.indexOf("{");
    if (start < 0) return null;
    let depth = 0;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (ch === "{") depth++;
      if (ch === "}") depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
    return null;
  }

  const providerName = (process.env.LLM_PROVIDER ?? "anthropic").toLowerCase();
  const isOpenAiProvider =
    providerName === "openai" || providerName.startsWith("gpt") || providerName.includes("openai");
  const understandingSchemaForProvider = isOpenAiProvider
    ? UNDERSTANDING_SCHEMA_OPENAI
    : UNDERSTANDING_SCHEMA_LENIENT;

  const tryStructured = async (prompt: string, attemptLabel: string) => {
    const startTime = Date.now();
    debugLog(`understandClaim: STARTING LLM CALL (${attemptLabel})`);
    debugLog("understandClaim: Input (first 100 chars)", input.substring(0, 100));
    debugLog("understandClaim: Model", String(model));

    const result = await generateText({
      model,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: userPrompt },
      ],
      temperature: getDeterministicTemperature(0.3),
      output: Output.object({ schema: understandingSchemaForProvider }),
    });

    const elapsed = Date.now() - startTime;
    debugLog(`understandClaim: LLM CALL COMPLETED (${attemptLabel}) in ${elapsed}ms`);
    debugLog("understandClaim: Result keys", result ? Object.keys(result) : "null");

    if (result?.usage || result?.totalUsage) {
      debugLog("understandClaim: Token usage", (result as any).usage || (result as any).totalUsage);
    }
    if (elapsed < 1000) {
      debugLog(`understandClaim: WARNING - LLM responded suspiciously fast (${elapsed}ms)`);
    }

    const rawOutput = extractStructuredOutput(result);
    if (!rawOutput) {
      debugLog(`understandClaim: No structured output (${attemptLabel})`, {
        resultType: typeof result,
        resultKeys: result ? Object.keys(result) : "null",
      });
      return null;
    }
    return rawOutput as any;
  };

  const tryRecoverFromNoObjectGeneratedError = (err: any): ClaimUnderstanding | null => {
    // ai-sdk throws AI_NoObjectGeneratedError with a cause stack containing:
    // "Type validation failed: Value: {...json...}"
    const causeStack = err?.cause?.stack ?? err?.cause?.message ?? "";
    if (typeof causeStack !== "string") return null;
    const idx = causeStack.indexOf("Value:");
    if (idx < 0) return null;
    const jsonStr = extractFirstJsonObject(causeStack.slice(idx));
    if (!jsonStr) return null;
    try {
      const obj = JSON.parse(jsonStr);
      const sp = UNDERSTANDING_SCHEMA_LENIENT.safeParse(obj);
      if (!sp.success) {
        debugLog("understandClaim: recovered Value failed lenient safeParse", {
          issues: sp.error.issues?.slice(0, 10),
        });
        return null;
      }
      debugLog("understandClaim: recovered Value from schema-mismatch error", {
        detectedInputType: sp.data.detectedInputType,
        proceedings: sp.data.distinctProceedings?.length ?? 0,
        requiresSeparateAnalysis: sp.data.requiresSeparateAnalysis,
        subClaims: sp.data.subClaims?.length ?? 0,
      });
      return sp.data;
    } catch (e: any) {
      debugLog("understandClaim: failed to parse recovered Value JSON", e?.message || String(e));
      return null;
    }
  };

  const tryJsonTextFallback = async () => {
    debugLog("understandClaim: FALLBACK JSON TEXT ATTEMPT");
    const system = `Return ONLY a single JSON object matching the expected schema.\n- Do NOT include markdown.\n- Do NOT include explanations.\n- Do NOT wrap in code fences.\n- Use empty strings \"\" and empty arrays [] when unknown.\n\nThe JSON object MUST contain at least these top-level keys:\n- detectedInputType\n- questionIntent\n- questionBeingAsked\n- impliedClaim\n- distinctProceedings\n- requiresSeparateAnalysis\n- proceedingContext\n- mainQuestion\n- articleThesis\n- subClaims\n- distinctEvents\n- legalFrameworks\n- researchQuestions\n- riskTier\n- keyFactors`;
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `${userPrompt}\n\nReturn JSON only.` },
      ],
      temperature: getDeterministicTemperature(0.2),
    });

    const txt = (result as any)?.text as string | undefined;
    if (!txt || typeof txt !== "string") return null;
    const jsonStr = extractFirstJsonObject(txt);
    if (!jsonStr) return null;
    try {
      const obj = JSON.parse(jsonStr);
      const parsed = UNDERSTANDING_SCHEMA_LENIENT.safeParse(obj);
      if (!parsed.success) {
        debugLog("understandClaim: JSON fallback safeParse failed", {
          issues: parsed.error.issues?.slice(0, 10),
        });
        return null;
      }
      return parsed.data;
    } catch (e: any) {
      debugLog("understandClaim: JSON fallback parse failed", e?.message || String(e));
      return null;
    }
  };

  const handleApiKeyOrQuota = (errMsg: string) => {
    if (errMsg.includes("credit balance is too low") || errMsg.includes("insufficient_quota")) {
      console.error("[Analyzer] ❌ ANTHROPIC API CREDITS EXHAUSTED - Please add credits at https://console.anthropic.com/settings/plans");
      throw new Error("Anthropic API credits exhausted. Please add credits or switch to a different LLM provider (LLM_PROVIDER=openai)");
    }
    if (errMsg.includes("invalid_api_key") || errMsg.includes("401")) {
      console.error("[Analyzer] ❌ INVALID API KEY - Check your ANTHROPIC_API_KEY or OPENAI_API_KEY");
      throw new Error("Invalid API key. Please check your LLM provider API key.");
    }
  };

  let parsed: ClaimUnderstanding | null = null;
  try {
    parsed = await tryStructured(systemPrompt, "structured-1");
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    debugLog("understandClaim: FAILED (structured-1)", errMsg);
    debugLog("understandClaim: FAILED (structured-1) details", JSON.stringify(err, Object.getOwnPropertyNames(err), 2).slice(0, 2000));
    console.error("[Analyzer] generateText failed in understandClaim (structured-1):", errMsg);
    handleApiKeyOrQuota(errMsg);
    parsed = tryRecoverFromNoObjectGeneratedError(err);
  }

  if (!parsed) {
    // Retry once with a smaller, schema-focused prompt (providers sometimes fail on long prompts + strict schemas).
    const retryPrompt = `You are a fact-checking analyst.\n\nReturn ONLY a single JSON object that EXACTLY matches the expected schema.\n- No markdown, no prose, no code fences.\n- Every required field must exist.\n- Use empty strings \"\" and empty arrays [] when unknown.\n\nCRITICAL: MULTI-SCOPE DETECTION\n- Detect whether the input mixes multiple distinct scopes (e.g., different events, methodologies, institutions, jurisdictions, timelines, or processes).\n- If there are 2+ distinct scopes, put them in distinctProceedings (one per scope) and set requiresSeparateAnalysis=true.\n- If there is only 1 scope, distinctProceedings may contain 0 or 1 item, and requiresSeparateAnalysis=false.\n\nENUM RULES\n- detectedInputType must be exactly one of: question | claim | article\n- questionIntent must be exactly one of: verification | exploration | comparison | none\n- riskTier must be exactly one of: A | B | C\n\nCLAIMS\n- Populate subClaims with 3–8 verifiable sub-claims when possible.\n- Every subClaim must include ALL required fields and use allowed enum values.\n\nNow analyze the input and output JSON only.`;
    try {
      parsed = await tryStructured(retryPrompt, "structured-2");
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      debugLog("understandClaim: FAILED (structured-2)", errMsg);
      debugLog("understandClaim: FAILED (structured-2) details", JSON.stringify(err, Object.getOwnPropertyNames(err), 2).slice(0, 2000));
      console.error("[Analyzer] generateText failed in understandClaim (structured-2):", errMsg);
      handleApiKeyOrQuota(errMsg);
      parsed = tryRecoverFromNoObjectGeneratedError(err);
    }
  }

  if (!parsed) {
    parsed = await tryJsonTextFallback();
  }

  if (!parsed) throw new Error("Failed to understand claim: structured output did not match schema");

  // =========================================================================
  // POST-PROCESSING: Use early-normalized input for input neutrality
  // Since we normalized questions to statements BEFORE the LLM call (lines 2504-2528),
  // both paths now converge. We use:
  // - originalQuestionInput (from line 2516): for UI display (questionBeingAsked)
  // - analysisInput (from line 2528): for analysis (impliedClaim)
  // =========================================================================
  const trimmedInput = input.trim();

  // v2.6.24: Track if input was originally a question for UI display
  // This prevents statements ending with "?" from being labeled as "Question"
  (parsed as any).wasOriginallyQuestion = !!originalQuestionInput;

  // If input was originally a question, mark it as such for UI purposes
  if (originalQuestionInput && parsed.detectedInputType !== "question") {
    console.log(`[Analyzer] Input Neutrality: Marking as question for UI (original was "${originalQuestionInput.substring(0, 60)}...")`);
    parsed.detectedInputType = "question";
  }

  // Set questionBeingAsked to the ORIGINAL question (for UI display)
  if (originalQuestionInput) {
    parsed.questionBeingAsked = originalQuestionInput;
    console.log(`[Analyzer] Input Neutrality: questionBeingAsked set to original question for UI`);
  } else if (!parsed.questionBeingAsked) {
    // For statements, use the input as-is
    parsed.questionBeingAsked = trimmedInput;
  }

  // Set impliedClaim to the NORMALIZED statement (for analysis consistency)
  // This ensures both "Was X fair?" and "X was fair" use the same impliedClaim
  const shouldSetImpliedClaim =
    CONFIG.deterministic ||
    !parsed.impliedClaim?.trim() ||
    parsed.impliedClaim.endsWith("?");

  if (shouldSetImpliedClaim) {
    // Use analysisInput which is already normalized (question→statement)
    parsed.impliedClaim = analysisInput;
    console.log(`[Analyzer] Input Neutrality: impliedClaim set to normalized statement: "${analysisInput.substring(0, 80)}..."`);
    // #region agent log
  if (IS_LOCAL_DEV) fetch('http://127.0.0.1:7242/ingest/6ba69d74-cd95-4a82-aebe-8b8eeb32980a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apps/web/src/lib/analyzer.ts:understandClaim:impliedClaim',message:'understandClaim impliedClaim normalization (input neutrality)',data:{detectedInputType:parsed.detectedInputType,wasQuestion:!!originalQuestionInput,from:String(parsed.impliedClaim||'').slice(0,200),to:String(analysisInput).slice(0,200),deterministic:CONFIG.deterministic},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
  }

  // Validate parsed has required fields
  if (!parsed.subClaims || !Array.isArray(parsed.subClaims)) {
    console.error(
      "[Analyzer] Invalid parsed output - missing subClaims:",
      parsed,
    );
    throw new Error("LLM output missing required fields");
  }

  // Canonicalize proceedings early so:
  // - IDs are stable (P1/P2/...) instead of model-invented IDs
  // - downstream research queries don't drift because the model changed labels/dates
  // v2.6.23: Use analysisInput (normalized statement) for consistent scope canonicalization
  // This ensures questions and statements yield identical scope detection and research queries
  parsed = canonicalizeScopes(analysisInput, parsed);
  debugLog("understandClaim: scopes after canonicalize", {
    detectedInputType: parsed.detectedInputType,
    requiresSeparateAnalysis: parsed.requiresSeparateAnalysis,
    count: parsed.distinctProceedings?.length ?? 0,
    ids: (parsed.distinctProceedings || []).map((p: any) => p.id),
  });

  // If the model under-split scopes for a statement-like claim, do a single best-effort retry
  // focused ONLY on scope detection. This helps keep "question vs statement" runs aligned.
  if (
    CONFIG.deterministic &&
    (parsed.detectedInputType === "claim" || parsed.detectedInputType === "question") &&
    (parsed.distinctProceedings?.length ?? 0) <= 1
  ) {
    // v2.6.23: Use normalized analysisInput for scope detection to maintain input neutrality.
    // When deterministic mode is enabled, questions are normalized to statements earlier (lines 2507-2528).
    // Using the same normalized form here ensures scope detection aligns with claim analysis,
    // preventing scope-to-statement misalignment and maintaining input neutrality.
    const supplementalInput = parsed.impliedClaim || analysisInput;
    const supplemental = await requestSupplementalScopes(supplementalInput, model, parsed);
    if (supplemental?.distinctProceedings && supplemental.distinctProceedings.length > 1) {
      parsed = {
        ...parsed,
        requiresSeparateAnalysis: true,
        distinctProceedings: supplemental.distinctProceedings,
      };
      // v2.6.23: Use analysisInput (normalized statement) for consistent scope canonicalization
      parsed = canonicalizeScopes(analysisInput, parsed);
      debugLog("understandClaim: supplemental scopes applied", {
        detectedInputType: parsed.detectedInputType,
        requiresSeparateAnalysis: parsed.requiresSeparateAnalysis,
        count: parsed.distinctProceedings?.length ?? 0,
        ids: (parsed.distinctProceedings || []).map((p: any) => p.id),
      });
      // #region agent log
  if (IS_LOCAL_DEV) fetch('http://127.0.0.1:7242/ingest/6ba69d74-cd95-4a82-aebe-8b8eeb32980a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apps/web/src/lib/analyzer.ts:understandClaim:supplementalProceedingsApplied',message:'Applied supplemental proceedings after under-split claim',data:{finalCount:parsed.distinctProceedings?.length ?? 0,ids:(parsed.distinctProceedings||[]).map((p:any)=>p.id)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'E'})}).catch(()=>{});
      // #endregion
    }
  }

  const isShortSimpleNonQuestion =
    parsed.detectedInputType !== "question" &&
    input.trim().length > 0 &&
    input.trim().length <= SHORT_SIMPLE_INPUT_MAX_CHARS &&
    parsed.subClaims.length <= 1 &&
    (parsed.keyFactors?.length ?? 0) <= 1;

  if (isShortSimpleNonQuestion && parsed.detectedInputType === "article") {
    parsed.detectedInputType = "claim";
    if (!parsed.questionBeingAsked) {
      parsed.questionBeingAsked = trimmedInput;
    }
    if (!parsed.impliedClaim) {
      parsed.impliedClaim = trimmedInput;
    }
  }

  // Post-processing: Re-prompt if coverage is thin (single attempt only)
  // Skip for short, simple non-question inputs.
  if (!isShortSimpleNonQuestion) {
    // #region agent log
  if (IS_LOCAL_DEV) fetch('http://127.0.0.1:7242/ingest/6ba69d74-cd95-4a82-aebe-8b8eeb32980a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apps/web/src/lib/analyzer.ts:understandClaim:beforeSupplemental',message:'Before supplemental claims check',data:{inputPreview:input.substring(0,200),subClaimsCount:parsed.subClaims.length,subClaims:parsed.subClaims.map((c:any)=>({id:c.id,text:c.text.substring(0,100),isCentral:c.isCentral,claimRole:c.claimRole})),hasOutcomeClaims:parsed.subClaims.some((c:any)=>/\b(sentence|penalty|fine|ban|ineligible|outcome|punishment|sanction)\b/i.test(c.text))},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    for (let attempt = 0; attempt < SUPPLEMENTAL_REPROMPT_MAX_ATTEMPTS; attempt++) {
      // Use analysisInput (normalized statement) for input neutrality
      const supplementalClaims = await requestSupplementalSubClaims(
        analysisInput,
        model,
        parsed
      );
      if (supplementalClaims.length === 0) break;
      parsed.subClaims.push(...supplementalClaims);
      console.log(`[Analyzer] Added ${supplementalClaims.length} supplemental claims to balance scope coverage`);
      // #region agent log
  if (IS_LOCAL_DEV) fetch('http://127.0.0.1:7242/ingest/6ba69d74-cd95-4a82-aebe-8b8eeb32980a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apps/web/src/lib/analyzer.ts:understandClaim:afterSupplemental',message:'After supplemental claims',data:{supplementalCount:supplementalClaims.length,supplementalClaims:supplementalClaims.map((c:any)=>({id:c.id,text:c.text.substring(0,100)}))},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      break;
    }
    // #region agent log
  if (IS_LOCAL_DEV) fetch('http://127.0.0.1:7242/ingest/6ba69d74-cd95-4a82-aebe-8b8eeb32980a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apps/web/src/lib/analyzer.ts:understandClaim:finalClaims',message:'Final claims after all processing',data:{totalClaims:parsed.subClaims.length,claims:parsed.subClaims.map((c:any)=>({id:c.id,text:c.text.substring(0,150),isCentral:c.isCentral,claimRole:c.claimRole,relatedProceedingId:c.relatedProceedingId})),hasOutcomeClaims:parsed.subClaims.some((c:any)=>/\b(sentence|penalty|fine|ban|ineligible|outcome|punishment|sanction)\b/i.test(c.text))},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
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
  const scopes = understanding.distinctProceedings || [];
  const hasScopes = scopes.length > 0;
  const isMultiScope = scopes.length > 1;
  const singleScopeId = scopes.length === 1 ? scopes[0].id : "";

  const normalizeText = (text: string) =>
    text.toLowerCase().replace(/\s+/g, " ").trim();

  const claimsByProc = new Map<string, ClaimUnderstanding["subClaims"]>();
  const centralCoreCounts = new Map<string, number>();
  const existingTextByProc = new Map<string, Set<string>>();
  const existingTextGlobal = new Set<string>();

  const coverageTargets = hasScopes
    ? scopes.map((s) => ({ id: s.id, name: s.name }))
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
    if (!isMultiScope) {
      procId = procId || singleScopeId;
    }

    if (isMultiScope && !procId) continue;
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

  const systemPrompt = `You are a fact-checking assistant. Add missing subClaims ONLY for the listed contexts.
 - Return ONLY new claims (do not repeat existing ones).
 - Each claim must be tied to a single scope via relatedProceedingId.${hasScopes ? "" : " Use an empty string if no scopes are listed."}
 - Use claimRole="core", checkWorthiness="high", harmPotential="high", centrality="high", isCentral=true.
 - Use dependsOn=[] unless a dependency is truly required.
 - Ensure each listed context reaches at least ${MIN_CENTRAL_CORE_CLAIMS_PER_PROCEEDING} central core claims.
 - **CRITICAL**: If specific outcomes, penalties, or consequences are mentioned (e.g., an \(N\)-year term, a monetary fine, a time-bound ban), create a SEPARATE claim evaluating whether that specific outcome was fair, proportionate, or appropriate.`;

  const userPrompt = `INPUT:\n"${input}"\n\nCONTEXTS NEEDING MORE CLAIMS:\n${missingSummary}\n\nEXISTING CLAIMS (DO NOT DUPLICATE):\n${existingClaimsSummary}`;

  let supplemental: any;
  try {
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: getDeterministicTemperature(0.2),
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
    if (!isMultiScope) {
      procId = procId || singleScopeId;
    }
    if (isMultiScope && !procId) {
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

/**
 * Best-effort: ask the model to (re)consider whether there are multiple distinct contexts/threads.
 * This is intentionally generic and only applied when the initial understanding appears under-split.
 */
async function requestSupplementalScopes(
  input: string,
  model: any,
  understanding: ClaimUnderstanding,
): Promise<Pick<ClaimUnderstanding, "distinctProceedings" | "requiresSeparateAnalysis"> | null> {
  const currentCount = Array.isArray(understanding.distinctProceedings)
    ? understanding.distinctProceedings.length
    : 0;
  if (currentCount > 1) return null;

  const systemPrompt = `You are a fact-checking assistant.

Return ONLY a single JSON object with keys:
- distinctProceedings: array
- requiresSeparateAnalysis: boolean

CRITICAL:
- Detect whether the input mixes 2+ distinct contexts/threads (e.g., different events, phases, institutions, jurisdictions, timelines, or processes).
- Only split when there are clearly 2+ distinct contexts that would benefit from separate analysis.
- If there is only 1 context, return an empty array or a 1-item array and set requiresSeparateAnalysis=false.

SCHEMA:
distinctProceedings items must include:
- id (string)
- name (string)
- shortName (string)
- court (string)
- date (string)
- status (string)
- subject (string)
- charges (array of strings)
- outcome (string)
- decisionMakers (array of { name, role, affiliation })

Use empty strings "" and empty arrays [] when unknown.`;

  const userPrompt = `INPUT:\n"${input}"\n\nCURRENT distinctProceedings COUNT: ${currentCount}\nReturn JSON only.`;

  const schema = z.object({
    requiresSeparateAnalysis: z.boolean(),
    distinctProceedings: z.array(ANALYSIS_CONTEXT_SCHEMA),
  });

  try {
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: getDeterministicTemperature(0.2),
      output: Output.object({ schema }),
    });
    const raw = extractStructuredOutput(result) as any;
    if (!raw) return null;
    const sp = schema.safeParse(raw);
    if (!sp.success) return null;

    // Only accept if it meaningfully improves multi-context detection.
    const nextCount = sp.data.distinctProceedings?.length ?? 0;
    if (nextCount <= 1 || !sp.data.requiresSeparateAnalysis) return null;

    // #region agent log
  if (IS_LOCAL_DEV) fetch('http://127.0.0.1:7242/ingest/6ba69d74-cd95-4a82-aebe-8b8eeb32980a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apps/web/src/lib/analyzer.ts:requestSupplementalScopes',message:'Supplemental proceedings accepted',data:{prevCount:currentCount,nextCount,ids:(sp.data.distinctProceedings||[]).map((p:any)=>p.id).slice(0,6)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    return {
      requiresSeparateAnalysis: sp.data.requiresSeparateAnalysis,
      distinctProceedings: sp.data.distinctProceedings,
    };
  } catch (err: any) {
    debugLog("requestSupplementalScopes: FAILED", err?.message || String(err));
    return null;
  }
}

/**
 * Extract outcome-related claims from facts discovered during research.
 * This addresses cases where specific outcomes (e.g., an N-year term) are mentioned
 * in research but weren't in the original input, so no claim was created initially.
 */
async function extractOutcomeClaimsFromFacts(
  state: ResearchState,
  model: any,
): Promise<ClaimUnderstanding["subClaims"]> {
  if (!state.understanding || state.facts.length === 0) return [];

  const understanding = state.understanding;
  const scopes = understanding.distinctProceedings || [];
  const existingClaims = understanding.subClaims || [];
  const existingClaimTexts = new Set(existingClaims.map((c) => c.text.toLowerCase().trim()));

  // Extract facts text for LLM analysis
  const factsText = state.facts
    .slice(0, 50) // Limit to first 50 facts to avoid token limits
    .map((f, idx) => `F${idx + 1}: ${f.fact}`)
    .join("\n");

  if (!factsText || factsText.length < 100) return [];

  // Check if any facts mention outcomes (quick heuristic check before LLM call)
  const outcomeKeywords = /\b(\d+\s*(?:year|month|day)\s*(?:sentence|prison|jail|ban|ineligible|suspended|fine|penalty|sanction)|sentenced|convicted|acquitted|fined|banned|ineligible)\b/i;
  if (!outcomeKeywords.test(factsText)) {
    return [];
  }

  const systemPrompt = `You are a fact-checking assistant. Extract specific outcomes, penalties, or consequences mentioned in the facts that should be evaluated as separate claims.

Return ONLY a JSON object with an "outcomes" array. Each outcome should have:
- "outcome": The specific outcome mentioned (e.g., "27-year prison sentence", "8-year ineligibility", "$1M fine")
- "relatedProceedingId": The proceeding ID this outcome relates to (or empty string if unclear)
- "claimText": A claim evaluating whether this outcome was fair/proportionate (e.g., "The 27-year prison sentence was proportionate to the crimes committed")

Only extract outcomes that:
1. Are specific and quantifiable (e.g., "27-year sentence", not just "sentenced")
2. Are NOT already covered by existing claims
3. Are relevant to evaluating fairness/proportionality

Return empty array if no such outcomes are found.`;

  const userPrompt = `FACTS DISCOVERED DURING RESEARCH:
${factsText}

EXISTING CLAIMS (DO NOT DUPLICATE):
${existingClaims.map((c) => `- ${c.id}: ${c.text}`).join("\n")}

SCOPES:
${scopes.map((s) => `- ${s.id}: ${s.name}`).join("\n")}

Extract outcomes that need separate evaluation claims.`;

  const OUTCOME_SCHEMA = z.object({
    outcomes: z.array(
      z.object({
        outcome: z.string(),
        relatedProceedingId: z.string(),
        claimText: z.string(),
      })
    ),
  });

  try {
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: getDeterministicTemperature(0.2),
      output: Output.object({ schema: OUTCOME_SCHEMA }),
    });

    const extracted = extractStructuredOutput(result);
    if (!extracted?.outcomes || !Array.isArray(extracted.outcomes)) return [];

    // Generate claim IDs and create claim objects
    let maxId = 0;
    for (const claim of existingClaims) {
      const match = /^SC(\d+)$/i.exec(claim.id || "");
      if (match) {
        const num = Number(match[1]);
        if (!Number.isNaN(num)) maxId = Math.max(maxId, num);
      }
    }

    const outcomeClaims: ClaimUnderstanding["subClaims"] = [];
    for (const outcome of extracted.outcomes) {
      // Skip if claim text is too similar to existing claims
      const normalized = outcome.claimText.toLowerCase().trim();
      if (existingClaimTexts.has(normalized)) continue;

      const newId = `SC${++maxId}`;
      outcomeClaims.push({
        id: newId,
        text: outcome.claimText,
        type: "evaluative",
        claimRole: "core",
        dependsOn: [],
        keyEntities: [],
        checkWorthiness: "high",
        harmPotential: "high",
        centrality: "high",
        isCentral: true,
        relatedProceedingId: outcome.relatedProceedingId || "",
        approximatePosition: "",
        keyFactorId: "",
      });
      existingClaimTexts.add(normalized);
    }

    return outcomeClaims;
  } catch (err: any) {
    debugLog("extractOutcomeClaimsFromFacts: FAILED", err?.message || String(err));
    return [];
  }
}

/**
 * Enrich proceedings/scopes with outcomes discovered in the extracted facts.
 * Uses LLM to extract outcomes generically (no hardcoded domain-specific patterns).
 * This addresses the issue where outcome is shown as "pending" or "unknown" in the UI
 * even though the actual outcome was found in the evidence.
 */
async function enrichScopesWithOutcomes(state: ResearchState, model: any): Promise<void> {
  if (!state.understanding?.distinctProceedings?.length) return;

  const facts = state.facts || [];
  if (facts.length === 0) return;

  for (const proc of state.understanding.distinctProceedings) {
    // Skip if already has a specific outcome (not vague placeholders)
    const currentOutcome = (proc.outcome || "").toLowerCase().trim();
    const isVagueOutcome = !currentOutcome ||
      currentOutcome === "unknown" ||
      currentOutcome === "pending" ||
      currentOutcome.includes("investigation") ||
      currentOutcome.includes("ongoing") ||
      currentOutcome.includes("not yet") ||
      currentOutcome.includes("to be determined");

    if (!isVagueOutcome) continue;

    // Get facts related to this scope
    const relevantFacts = facts.filter(f =>
      !f.relatedProceedingId || f.relatedProceedingId === proc.id
    );

    if (relevantFacts.length === 0) continue;

    const factsText = relevantFacts.map(f => `- ${f.fact}`).join("\n").slice(0, 4000);

    try {
      // Use LLM to extract outcome - generic, not domain-specific
      const result = await generateText({
        model,
        temperature: CONFIG.deterministic ? 0 : undefined,
        messages: [
          { role: "system", content: "You extract specific outcomes from evidence. Return ONLY the outcome phrase, nothing else." },
          { role: "user", content: `Given these facts about "${proc.name}" (${proc.subject || ""}):

${factsText}

What is the specific, concrete outcome or result mentioned?
- Return ONLY the outcome in a short phrase (e.g., "8-year penalty", "approved", "rejected", "settled for $X")
- If no specific outcome is mentioned, return exactly: NONE
- Do NOT return vague terms like "pending", "ongoing", "under investigation"` },
        ],
      });
      const text = result.text;

      const outcome = text.trim();
      if (outcome && outcome !== "NONE" && outcome.length < 100) {
        console.log(`[Analyzer] Enriched scope "${proc.name}" outcome: "${proc.outcome}" → "${outcome}"`);
        proc.outcome = outcome;
        // Update status if we found a concrete outcome
        if (proc.status === "pending" || proc.status === "ongoing" || proc.status === "unknown") {
          proc.status = "concluded";
        }
      }
    } catch (err: any) {
      debugLog("enrichScopesWithOutcomes: LLM call failed", err?.message || String(err));
      // Continue with other proceedings
    }
  }
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

function isQuestionLikeInput(understanding: ClaimUnderstanding): boolean {
  return (
    understanding.detectedInputType === "question" ||
    understanding.detectedInputType === "claim"
  );
}

function resolveAnalysisPromptInput(
  understanding: ClaimUnderstanding,
  state: ResearchState,
): string {
  return (
    understanding.impliedClaim ||
    understanding.questionBeingAsked ||
    understanding.mainQuestion ||
    state.originalInput ||
    state.originalText ||
    ""
  );
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
  /** If true, search should use date filtering for recency */
  recencyMatters?: boolean;
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

  // For question-like inputs, prioritize the implied claim for better search results
  const isQuestionLike = isQuestionLikeInput(understanding);
  const stopWords = new Set(["the", "a", "an", "is", "was", "were", "are", "be", "been", "being", "have", "has", "had", "do", "does", "did", "will", "would", "could", "should", "may", "might", "must", "shall", "can", "need", "dare", "ought", "used", "to", "of", "in", "for", "on", "with", "at", "by", "from", "as", "into", "through", "during", "before", "after", "above", "below", "between", "under", "again", "further", "then", "once", "here", "there", "when", "where", "why", "how", "all", "each", "few", "more", "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so", "than", "too", "very", "just", "and", "but", "if", "or", "because", "until", "while", "although", "though", "whether", "this", "that", "these", "those", "it", "its", "what", "which", "who", "whom", "whose", "based"]);

  let entityStr = "";

  // For question-like inputs, always use the implied claim as primary search basis
  if (isQuestionLike && understanding.impliedClaim) {
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

  const scopes = understanding.distinctProceedings || [];
  const scopesWithFacts = new Set(
    state.facts
      .map((f: ExtractedFact) => f.relatedProceedingId)
      .filter(Boolean),
  );

  if (
    state.facts.length >= config.minFactsRequired &&
    categories.length >= CONFIG.minCategories &&
    state.contradictionSearchPerformed &&
    (scopes.length === 0 ||
      scopes.every((p: Scope) =>
        scopesWithFacts.has(p.id),
      ))
  ) {
    // =========================================================================
    // CLAIM-LEVEL RECENCY CHECK (v2.6.22)
    // Before marking complete, check if any claims appear to be about recent events
    // but have zero supporting facts. This catches cases like DOGE (Jan-May 2025)
    // where the thesis-level recency check passed but individual claims need facts.
    // =========================================================================
    const claimsWithoutFacts = understanding.subClaims.filter((claim: any) => {
      // Check if this claim appears to be about recent events
      const claimText = claim.text || "";
      const isRecentClaim = isRecencySensitive(claimText, undefined);

      // Check if this claim has any supporting facts
      // Facts are linked via relatedClaimId or by matching claim text/entities
      const claimEntities = (claim.keyEntities || []).map((e: string) => e.toLowerCase());
      const hasFacts = state.facts.some((f: ExtractedFact) => {
        // Direct match via claim text in fact
        const factLower = f.fact.toLowerCase();
        const claimLower = claimText.toLowerCase();

        // Check if any key entity from the claim appears in the fact
        const hasEntityOverlap = claimEntities.some((entity: string) =>
          entity.length > 3 && factLower.includes(entity)
        );

        // Check for significant word overlap (at least 2 meaningful words)
        const claimWords = claimLower.split(/\s+/).filter((w: string) => w.length > 4);
        const wordOverlap = claimWords.filter((w: string) => factLower.includes(w)).length;

        return hasEntityOverlap || wordOverlap >= 2;
      });

      return isRecentClaim && !hasFacts;
    });

    // If there are recent claims without facts, don't mark complete yet - search for them
    if (claimsWithoutFacts.length > 0 && !state.recentClaimsSearched) {
      const claimToSearch = claimsWithoutFacts[0]; // Search for first ungrounded recent claim
      const claimEntities = (claimToSearch.keyEntities || []).slice(0, 4).join(" ");
      const claimTerms = (claimToSearch.text || "")
        .toLowerCase()
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter((w: string) => w.length > 3)
        .slice(0, 5)
        .join(" ");

      debugLog("Claim-level recency check: Found ungrounded recent claims", {
        count: claimsWithoutFacts.length,
        firstClaim: claimToSearch.text?.substring(0, 100),
        entities: claimEntities,
      });

      const queries = [
        `${claimEntities} ${currentYear}`.trim(),
        `${claimTerms} ${currentYear} latest`.trim(),
        `${claimEntities} recent news`.trim(),
      ].filter(q => q.length > 5);

      return {
        complete: false,
        focus: `Recent claim: ${claimToSearch.text?.substring(0, 50)}...`,
        category: "evidence",
        queries,
        recencyMatters: true,
      };
    }

    return { complete: true };
  }

  // Research each scope
  if (
    scopes.length > 0 &&
    state.iterations.length < scopes.length * 2
  ) {
    for (const scope of scopes) {
      const scopeFacts = state.facts.filter(
        (f) => f.relatedProceedingId === scope.id,
      );
      if (scopeFacts.length < 2) {
        const scopeKey = [scope.institution || scope.court, scope.shortName, scope.name]
          .filter(Boolean)
          .join(" ")
          .trim();
        // Build base queries
        const baseQueries = [
          `${entityStr} ${scopeKey}`.trim(),
          `${entityStr} ${scope.court || ""} official decision documents`.trim(),
          `${entityStr} ${scope.shortName || scope.name} evidence procedure`.trim(),
          `${entityStr} ${scopeKey} outcome`.trim(),
        ];
        // Add date-variant queries for recency-sensitive topics
        const queries = recencyMatters ? [
          ...baseQueries,
          `${entityStr} ${scopeKey} ${currentYear} latest`.trim(),
        ] : baseQueries;
        return {
          complete: false,
          focus: `${scope.name} - ${scopeKey || "scope"}`,
          targetProceedingId: scope.id,
          category: "evidence",
          queries,
          recencyMatters,
        };
      }
    }
  }

  if (
    !hasLegal &&
    understanding.legalFrameworks.length > 0 &&
    state.iterations.length === 0
  ) {
    const baseQueries = [
      `${entityStr} legal basis statute`,
      `${understanding.legalFrameworks[0]} law provisions`,
    ];
    // Add date-variant for recency-sensitive legal topics
    const queries = recencyMatters ? [
      ...baseQueries,
      `${entityStr} ${understanding.legalFrameworks[0]} ${currentYear} ruling decision`,
    ] : baseQueries;
    return {
      complete: false,
      focus: "Applicable framework",
      category: "legal_provision",
      queries,
      recencyMatters,
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
      recencyMatters,
    };
  }

  if (!state.contradictionSearchPerformed) {
    const baseQueries = [
      `${entityStr} criticism concerns`,
      `${entityStr} controversy disputed unfair`,
    ];
    // Add date-variant for recent controversies/criticism
    const queries = recencyMatters ? [
      ...baseQueries,
      `${entityStr} criticism ${currentYear}`,
    ] : baseQueries;
    return {
      complete: false,
      focus: "Criticism and opposing views",
      category: "criticism",
      isContradictionSearch: true,
      queries,
      recencyMatters,
    };
  }

  // NEW v2.6.18: Search for decision-makers and potential conflicts of interest
  if (!state.decisionMakerSearchPerformed && scopes.length > 0) {
    // Extract decision-maker names from all scopes
    const decisionMakerNames = scopes
      .flatMap((s: Scope) => s.decisionMakers?.map(dm => dm.name) || [])
      .filter((name, index, arr) => arr.indexOf(name) === index); // unique names

    if (decisionMakerNames.length > 0) {
      const baseQueries = [
        `${decisionMakerNames[0]} conflict of interest ${entityStr}`,
        `${decisionMakerNames[0]} impartiality bias ${scopes[0]?.court || ""}`,
        ...(decisionMakerNames.length > 1 ? [`${decisionMakerNames.slice(0, 2).join(" ")} role multiple trials`] : []),
      ];
      // Add date-variant for recency-sensitive conflict searches
      const queries = recencyMatters ? [
        ...baseQueries,
        `${decisionMakerNames[0]} ${currentYear} conflict bias`,
      ] : baseQueries;
      return {
        complete: false,
        focus: "Decision-maker conflicts of interest",
        category: "conflict_of_interest",
        queries,
        recencyMatters,
      };
    }

    // Fallback when the model didn't populate decisionMakers: still search generically for conflicts/independence.
    // This keeps question vs. statement runs aligned without hardcoding any domain/person names.
    const fallbackBaseQueries = [
      `${entityStr} conflict of interest decision maker`.trim(),
      `${entityStr} impartiality bias`.trim(),
      `${entityStr} recusal ethics`.trim(),
    ];
    const fallbackQueries = recencyMatters ? [
      ...fallbackBaseQueries,
      `${entityStr} conflict ${currentYear}`.trim(),
    ] : fallbackBaseQueries;
    return {
      complete: false,
      focus: "Decision-maker conflicts of interest",
      category: "conflict_of_interest",
      queries: fallbackQueries,
      recencyMatters,
    };
  }

  // NEW v2.6.18: Use generated research questions for additional searches
  // Determinism: skip this step because researchQuestions come from the model and can cause run-to-run drift.
  if (CONFIG.deterministic) {
    // no-op
  } else {
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
      const baseQueries = [
        queryTerms,
        `${entityStr} ${queryTerms.split(" ").slice(0, 3).join(" ")}`,
      ];
      // Add date-variant for recency-sensitive research questions
      const queries = recencyMatters ? [
        ...baseQueries,
        `${queryTerms} ${currentYear}`,
      ] : baseQueries;
      return {
        complete: false,
        focus: `Research: ${question.slice(0, 50)}...`,
        category: "research_question",
        queries,
        recencyMatters,
      };
    }
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

    // #region agent log
    // Log small, non-sensitive hints to debug whether numeric duration outcomes appear in fetched content.
    if (IS_LOCAL_DEV) {
      const preview = text.slice(0, Math.min(4000, text.length)).toLowerCase();
      const hasNumericDuration = /\b\d{1,3}\s*(year|years|month|months|day|days)\b/i.test(preview);
      if (hasNumericDuration) {
        fetch('http://127.0.0.1:7242/ingest/6ba69d74-cd95-4a82-aebe-8b8eeb32980a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apps/web/src/lib/analyzer.ts:fetchSource:numericDuration',message:'Fetched source contains numeric duration pattern (preview)',data:{id,url:url.slice(0,200),trackRecordScore:trackRecord,searchQuery:(searchQuery||'').slice(0,160),title:title.slice(0,120)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'F'})}).catch(()=>{});
      }
    }
    // #endregion

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
      // EvidenceScope: Captures the methodology/boundaries of the source document
      // (e.g., WTW vs TTW, EU vs US standards, different time periods)
      evidenceScope: z.object({
        name: z.string(),           // Short label (e.g., "WTW", "TTW", "EU-LCA")
        methodology: z.string(),    // Standard/method (empty string if not applicable)
        boundaries: z.string(),     // What's included/excluded (empty string if not applicable)
        geographic: z.string(),     // Geographic scope (empty string if not applicable)
        temporal: z.string(),       // Time period (empty string if not applicable)
      }).optional(),
    }),
  ),
});

async function extractFacts(
  source: FetchedSource,
  focus: string,
  model: any,
  scopes: Scope[],
  targetProceedingId?: string,
): Promise<ExtractedFact[]> {
  console.log(`[Analyzer] extractFacts called for source ${source.id}: "${source.title?.substring(0, 50)}..."`);
  console.log(`[Analyzer] extractFacts: fetchSuccess=${source.fetchSuccess}, fullText length=${source.fullText?.length ?? 0}`);

  if (!source.fetchSuccess || !source.fullText) {
    console.warn(`[Analyzer] extractFacts: Skipping ${source.id} - no content (fetchSuccess=${source.fetchSuccess}, hasText=${!!source.fullText})`);
    return [];
  }

  const scopesList =
    scopes.length > 0
      ? `\n\nKNOWN CONTEXTS:\n${scopes.map((p: Scope) => `- ${p.id}: ${p.name}`).join("\n")}`
      : "";

  // Get current date for temporal reasoning
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDay = currentDate.getDate();
  const currentDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
  const currentDateReadable = currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const systemPrompt = `Extract SPECIFIC facts. Focus: ${focus}
 ${targetProceedingId ? `Target context: ${targetProceedingId}` : ""}
Track contested claims with isContestedClaim and claimSource.
Only HIGH/MEDIUM specificity.
If the source contains facts relevant to MULTIPLE known contexts, include them (do not restrict to only the target),
and set relatedProceedingId accordingly. Do not omit key numeric outcomes (durations, amounts, counts) when present.

**CURRENT DATE**: Today is ${currentDateReadable} (${currentDateStr}). When extracting dates, compare them to this current date.

## SCOPE/CONTEXT EXTRACTION

Evidence documentation typically defines its scope/context. Extract this when present:

**Look for explicit scope definitions**:
- Methodology: "This study uses Well-to-Wheel analysis", "Based on ISO 14040 LCA"
- Boundaries: "From primary energy to vehicle motion", "Excluding manufacturing"
- Geographic: "EU market", "California regulations", "US jurisdiction"
- Temporal: "2020-2025 data", "FY2024", "as of March 2024"

**Set evidenceScope when the source defines its analytical frame**:
- name: Short label (e.g., "WTW", "TTW", "EU-LCA", "US-DOE")
- methodology: Standard referenced (empty string if none)
- boundaries: What's included/excluded (empty string if not specified)
- geographic: Geographic scope (empty string if not specified)
- temporal: Time period (empty string if not specified)

**IMPORTANT**: Different sources may use different scopes. A "40% efficiency" from a WTW study is NOT comparable to one from a TTW study. Capturing scope enables accurate comparisons.${scopesList}`;

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
      temperature: getDeterministicTemperature(0.2),
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

    // #region agent log
    const rawFactsPreview = extraction.facts
      .slice(0, 30)
      .map((f) => String(f.fact || "").slice(0, 140));
    const rawHasDuration = extraction.facts.some((f) =>
      /\b\d{1,3}\s*(year|years|month|months|day|days)\b/i.test(`${f.fact} ${f.sourceExcerpt}`),
    );
    fetch('http://127.0.0.1:7242/ingest/6ba69d74-cd95-4a82-aebe-8b8eeb32980a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apps/web/src/lib/analyzer.ts:extractFacts:rawSummary',message:'Raw extracted facts summary',data:{sourceId:source.id,trackRecordScore:source.trackRecordScore ?? null,rawCount:extraction.facts.length,rawHasDuration,rawFactsPreview},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'G'})}).catch(()=>{});
    // #endregion

    let filteredFacts = extraction.facts
      .filter((f) => f.specificity !== "low" && f.sourceExcerpt?.length >= 20);

    // Conservative safeguard: avoid treating high-impact outcomes (sentencing/conviction/prison terms)
    // as "facts" when they come from low/unknown-reliability sources.
    // These claims are easy to get wrong and can dominate the analysis.
    const track = typeof source.trackRecordScore === "number" ? source.trackRecordScore : null;
    // Only apply this safeguard when we have an explicit reliability score.
    // If no source bundle is configured, trackRecordScore is null (unknown) and we should NOT discard facts.
    if (typeof track === "number" && track < 0.6) {
      const before = filteredFacts.length;
      filteredFacts = filteredFacts.filter((f) => {
        const hay = `${f.fact}\n${f.sourceExcerpt}`.toLowerCase();
        const isHighImpactOutcome =
          hay.includes("sentenced") ||
          hay.includes("convicted") ||
          hay.includes("years in prison") ||
          hay.includes("year prison") ||
          hay.includes("months in prison") ||
          (hay.includes("prison") && hay.includes("year"));
        return !isHighImpactOutcome;
      });
      if (before !== filteredFacts.length) {
        console.warn(
          `[Analyzer] extractFacts: filtered ${before - filteredFacts.length} high-impact outcome facts from low/unknown trackRecord source ${source.id} (track=${track})`,
        );
      }
    }

    // #region agent log
    const filteredHasDuration = filteredFacts.some((f) =>
      /\b\d{1,3}\s*(year|years|month|months|day|days)\b/i.test(`${f.fact} ${f.sourceExcerpt}`),
    );
    fetch('http://127.0.0.1:7242/ingest/6ba69d74-cd95-4a82-aebe-8b8eeb32980a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apps/web/src/lib/analyzer.ts:extractFacts:filteredSummary',message:'Filtered facts summary',data:{sourceId:source.id,filteredCount:filteredFacts.length,filteredHasDuration},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'G'})}).catch(()=>{});
    // #endregion

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
    answer: z.number().min(0).max(100),
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
      answer: z.number().min(0).max(100),
      confidence: z.number().min(0).max(100),
      shortAnswer: z.string(),
      keyFactors: z.array(KEY_FACTOR_SCHEMA),
    }),
  ),
  proceedingSummary: z.string(),
  claimVerdicts: z.array(
    z.object({
      claimId: z.string(),
      verdict: z.number().min(0).max(100),
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
    answer: z.number().min(0).max(100),
    confidence: z.number().min(0).max(100),
    shortAnswer: z.string(),
    nuancedAnswer: z.string(),
    keyFactors: z.array(KEY_FACTOR_SCHEMA),
  }),
  claimVerdicts: z.array(
    z.object({
      claimId: z.string(),
      verdict: z.number().min(0).max(100),
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
      verdict: z.number().min(0).max(100),
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
    articleVerdict: z.number().min(0).max(100),
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
  const isQuestionLike = isQuestionLikeInput(understanding);
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

  if (isQuestionLike && hasMultipleProceedings) {
    const result = await generateMultiScopeVerdicts(
      state,
      understanding,
      factsFormatted,
      claimsFormatted,
      model,
      understanding.detectedInputType,
    );
    return { ...result, pseudoscienceAnalysis };
  } else if (isQuestionLike) {
    const result = await generateQuestionVerdicts(
      state,
      understanding,
      factsFormatted,
      claimsFormatted,
      model,
      understanding.detectedInputType,
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

async function generateMultiScopeVerdicts(
  state: ResearchState,
  understanding: ClaimUnderstanding,
  factsFormatted: string,
  claimsFormatted: string,
  model: any,
  analysisInputType: InputType,
): Promise<{
  claimVerdicts: ClaimVerdict[];
  articleAnalysis: ArticleAnalysis;
  questionAnswer: QuestionAnswer;
}> {
  const scopesFormatted = understanding.distinctProceedings
    .map(
      (s: Scope) =>
        `- **${s.id}**: ${s.name}\n  Institution: ${s.institution || s.court || "N/A"} | Date: ${s.temporal || s.date || "N/A"} | Status: ${s.status}\n  Subject: ${s.subject}`,
    )
    .join("\n\n");

  // Get current date for temporal reasoning
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;
  const currentDay = currentDate.getDate();
  const currentDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDay).padStart(2, '0')}`;
  const currentDateReadable = currentDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const analysisInput = resolveAnalysisPromptInput(understanding, state);
  const displayQuestion =
    understanding.questionBeingAsked ||
    understanding.mainQuestion ||
    analysisInput;
  // v2.6.21: Use neutral label to ensure input-neutral verdicts
  // Previously "QUESTION" vs "INPUT" caused LLM verdict drift
  const inputLabel = "STATEMENT";
  // v2.6.24: Use wasOriginallyQuestion to determine if this was truly a question input
  // This prevents statements ending with "?" from showing "Question:" label
  const isQuestionLike = (understanding as any).wasOriginallyQuestion ||
    (analysisInputType === "question" && understanding.questionIntent !== "none");

  const systemPrompt = `You are FactHarbor's verdict generator. Analyze MULTIPLE DISTINCT CONTEXTS/THREADS (also called SCOPES) separately.

## CRITICAL: TEMPORAL REASONING

**CURRENT DATE**: Today is ${currentDateReadable} (${currentDateStr}).

**DATE REASONING RULES**:
- When evaluating dates mentioned in claims, compare them to the CURRENT DATE above
- Do NOT assume dates are in the future without checking against the current date
- A date like "November 2025" is in the PAST if the current date is January 2026 or later
- Do NOT reject claims as "impossible" based on incorrect temporal assumptions
- If a date seems inconsistent, verify it against the current date before making judgments
- When in doubt about temporal relationships, use the evidence from sources rather than making assumptions

## SCOPE/CONTEXT-AWARE EVALUATION

Evidence may come from sources with DIFFERENT analytical scopes (e.g., WTW vs TTW, EU vs US methodology).

- **Check scope alignment**: Are facts being compared from compatible scopes?
- **Flag scope mismatches**: Different scopes are NOT directly comparable
- **Note in reasoning**: When scope affects interpretation, mention it (e.g., "Under WTW analysis...")

## CRITICAL: RATING DIRECTION

**ORIGINAL ${inputLabel} TO RATE**:
"${analysisInput}"

**YOUR TASK**: Rate the ORIGINAL ${inputLabel} above AS STATED by the user.
- If the user claims "X is better than Y" and evidence shows Y is better, rate as FALSE/LOW percentage
- If the user claims "X increased" and evidence shows X decreased, rate as FALSE/LOW percentage
- Preserve the directional/comparative aspect of the original claim
- DO NOT rate your analysis conclusion - rate whether the USER'S CLAIM matches the evidence

## SCOPES - PROVIDE SEPARATE ANSWER FOR EACH
${scopesFormatted}

## INSTRUCTIONS

1. For EACH scope (use proceedingId in the schema), provide:
   - proceedingId (must match: ${understanding.distinctProceedings.map((p: Scope) => p.id).join(", ")})
   - answer: Truth percentage (0-100) rating THE ORIGINAL USER CLAIM shown above
     * CRITICAL: Rate whether the USER'S CLAIM is true, NOT whether your analysis is correct
     * If user claims "X is MORE efficient" and evidence shows "X is LESS efficient", answer should be 0-28% (FALSE/MOSTLY FALSE)
     * Preserve the direction/comparative aspect of the original claim
   - shortAnswer: A complete sentence summarizing what the evidence shows (e.g., "Evidence indicates the methodology was scientifically valid.")
     * MUST be a descriptive sentence, NOT just a percentage or scale label
   - keyFactors: Array of factors covering ALL these aspects:
     * Standards application (were relevant rules/standards/methods applied correctly?)
     * Process integrity (were appropriate procedures followed?)
     * Evidence basis (were conclusions based on documented evidence?)
     * Decision-maker independence (any conflicts of interest or role conflicts?)
     * Outcome proportionality/impact (is the outcome proportional and consistent with similar situations?)

2. KEY FACTOR SCORING RULES - VERY IMPORTANT:
   - supports="yes": Factor supports the claim with evidence (from sources OR your background knowledge of widely-reported facts)
   - supports="no": Factor refutes the claim with counter-evidence (NOT just disputed/contested)
   - supports="neutral": Use ONLY when you genuinely have no information about this factor

   ${CONFIG.allowModelKnowledge ? `IMPORTANT: You MUST use your background knowledge! For well-known public events, established procedures/standards, and widely-reported facts, you ALREADY KNOW the relevant information - use it!
   DO NOT mark factors as "neutral" if you know the answer from your training data.
   Example: If you know a process followed standard procedures, mark it "yes" even if sources don't explicitly state it.` : "Use ONLY the provided facts and sources."}

   CRITICAL: Being "contested" or "disputed" by stakeholders = supports="yes" (if facts support it), NOT "neutral"
   Example: "Critics claim X was unfair" but X followed proper procedures = "yes", not "neutral"

3. Mark contested factors:
   - isContested: true if this factor is disputed
   - contestedBy: Be SPECIFIC about who disputes it (e.g., "supplier group A", "regulator X", "employee union")
     * Do NOT use vague terms like "some people" - specify WHICH group/organization
   - factualBasis: Does the opposition have ACTUAL DOCUMENTED COUNTER-EVIDENCE?
     * "established" = Opposition cites SPECIFIC DOCUMENTED FACTS that contradict (e.g., audits, logs, datasets, official reports)
     * "disputed" = Opposition has some factual counter-evidence but it's debatable
     * "opinion" = Opposition has NO factual counter-evidence - just claims, rhetoric, or actions
     * "unknown" = Cannot determine

   CRITICAL - factualBasis MUST be "opinion" for ALL of these:
   - Policy announcements or institutional actions without evidence
   - Statements by supporters, officials, or advocacy groups (claims are not evidence)
   - Calling something "unfair", "persecution", or "political" without citing specific documented violations
   - Public protests, position papers, or other responses without evidence

   factualBasis can ONLY be "established" or "disputed" when opposition provides:
   - Specific documents, records, logs, or audits showing actual procedural violations
   - Verifiable data or documents contradicting the findings
   - Documented evidence of specific errors, bias, or misconduct (not just allegations)

4. Calibration: Neutral contested factors don't reduce verdicts
   - Positive factors with evidence + neutral contested factors => keep the answer in the TRUE/MOSTLY-TRUE band (>=72%)
   - Only actual negative factors with documented evidence can reduce verdict

5. CLAIM VERDICT RULES (for claimVerdicts array):
   **CRITICAL**: You MUST generate verdicts for ALL claims listed in the CLAIMS section above. Every claim must have a corresponding entry in claimVerdicts.

   - For each scope, ensure ALL claims with that proceedingId (or claims that logically belong to that scope) have verdicts
   - If a claim doesn't have a relatedProceedingId, assign it to the most relevant scope based on the claim content
   - Provide a truth percentage (0-100) for each claim.
   - Use these bands to calibrate:
     * 86-100: TRUE (strong support, no credible counter-evidence)
     * 72-85: MOSTLY-TRUE (mostly supported, minor gaps)
     * 58-71: LEANING-TRUE (mixed evidence)
     * 43-57: UNVERIFIED (insufficient evidence)
     * 29-42: LEANING-FALSE (more counter-evidence than support)
     * 15-28: MOSTLY-FALSE (strong counter-evidence)
     * 0-14: FALSE (direct contradiction)

   CRITICAL: Stakeholder contestation ("critics say it was unfair") is NOT the same as counter-evidence.
   Use the TRUE/MOSTLY-TRUE band (>=72%), not the UNVERIFIED band (43-57%), if you know the facts support the claim despite stakeholder opposition.

${getKnowledgeInstruction(state.originalInput, understanding)}
${getProviderPromptHint()}`;

  const userPrompt = `## ${inputLabel}
"${analysisInput}"

## SCOPES
${scopesFormatted}

## CLAIMS
${claimsFormatted}

## FACTS
${factsFormatted}

Provide SEPARATE answers for each scope.`;

  let parsed: z.infer<typeof VERDICTS_SCHEMA_MULTI_PROCEEDING> | null = null;

  try {
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: getDeterministicTemperature(0.3),
      output: Output.object({ schema: VERDICTS_SCHEMA_MULTI_PROCEEDING }),
    });
    state.llmCalls++;

    // Handle different AI SDK versions - safely extract structured output
    const rawOutput = extractStructuredOutput(result);
    if (rawOutput) {
      parsed = rawOutput as z.infer<typeof VERDICTS_SCHEMA_MULTI_PROCEEDING>;
      debugLog("generateMultiScopeVerdicts: SUCCESS", {
        hasQuestionAnswer: !!parsed.questionAnswer,
        proceedingAnswersCount: parsed.proceedingAnswers?.length,
        claimVerdictsCount: parsed.claimVerdicts?.length,
      });
    } else {
      debugLog("generateMultiScopeVerdicts: No rawOutput returned");
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    debugLog("generateMultiScopeVerdicts: ERROR", {
      error: errMsg,
      stack: err instanceof Error ? err.stack?.split('\n').slice(0, 5).join('\n') : undefined,
    });

    // Check for OpenAI schema validation errors
    if (errMsg.includes("Invalid schema") || errMsg.includes("required")) {
      debugLog("❌ OpenAI SCHEMA VALIDATION ERROR in VERDICTS_SCHEMA_MULTI_SCOPE");
    }
    state.llmCalls++;
  }

  // Fallback if structured output failed
  if (!parsed || !parsed.proceedingAnswers) {
    debugLog("generateMultiScopeVerdicts: Using FALLBACK (parsed failed)", {
      hasParsed: !!parsed,
      hasProceedingAnswers: !!parsed?.proceedingAnswers,
    });

    const fallbackVerdicts: ClaimVerdict[] = understanding.subClaims.map(
      (claim: any) => ({
        claimId: claim.id,
        claimText: claim.text,
        verdict: 50,
        confidence: 50,
        truthPercentage: 50,
        riskTier: "B" as const,
        reasoning:
          "Unable to generate verdict due to schema validation error. Manual review recommended.",
        supportingFactIds: [],
        isCentral: claim.isCentral || false,
        startOffset: claim.startOffset,
        endOffset: claim.endOffset,
        highlightColor: getHighlightColor7Point(50),
        isContested: false,
        contestedBy: "",
        factualBasis: "unknown" as const,
      }),
    );

    const questionAnswer: QuestionAnswer = {
      question: displayQuestion,
      answer: 50,
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
          answer: 50,
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
      inputType: analysisInputType,
      isQuestion: isQuestionLike,
      questionAnswer,
      hasMultipleProceedings: true,
      proceedings: understanding.distinctProceedings,
      articleThesis: understanding.articleThesis,
      logicalFallacies: [],
      claimsAverageTruthPercentage: 50,
      claimsAverageVerdict: 50,
      articleTruthPercentage: 50,
      articleVerdict: 50,
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
    const procMeta = understanding.distinctProceedings.find(
      (p: any) => p.id === pa.proceedingId,
    );
    const procStatus = (procMeta?.status || "unknown") as string;

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

    // Debug: Log factor details for this scope
    debugLog(`Factor analysis for scope ${pa.proceedingId}`, {
      answerTruthPct: pa.answer,
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
    let answerTruthPct = normalizePercentage(pa.answer);
    let correctedConfidence = normalizePercentage(pa.confidence);

    // v2.5.1: Only evidenced negatives count at full weight
    // Contested negatives without established basis count at 25%
    // Neutral contested don't count negatively at all
    const effectiveNegatives = evidencedNegatives + (negativeFactors - evidencedNegatives) * 0.25;

    // v2.6.20: Removed factor-based boost to ensure input neutrality
    // The boost was causing inconsistent verdicts for identical inputs
    // Verdicts are now purely claim-based for transparency and consistency
    debugLog(`Scope ${pa.proceedingId}: No factor-based boost applied`, {
      answerTruthPct,
      positiveFactors,
      evidencedNegatives,
      contestedNegatives,
    });

    if (answerTruthPct < 43 && positiveFactors > effectiveNegatives) {
      correctedConfidence = Math.min(correctedConfidence, 72);
      answerTruthPct = truthFromBand("partial", correctedConfidence);
      factorAnalysis.verdictExplanation = `Corrected from <43: ${positiveFactors} positive > ${effectiveNegatives.toFixed(1)} effective negative`;
    } else if (
      answerTruthPct < 43 &&
      contestedNegatives > 0 &&
      contestedNegatives === negativeFactors
    ) {
      correctedConfidence = Math.min(correctedConfidence, 68);
      answerTruthPct = truthFromBand("partial", correctedConfidence);
      factorAnalysis.verdictExplanation = `Corrected: All ${negativeFactors} negative factors are contested`;
    }

    return {
      ...pa,
      answer: answerTruthPct,
      confidence: correctedConfidence,
      truthPercentage: answerTruthPct,
      shortAnswer: sanitizeScopeShortAnswer(String(pa.shortAnswer || ""), procStatus),
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
    debugLog(`generateMultiScopeVerdicts: Missing verdicts for ${missingClaims.length} claims`, {
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
      const fallbackConfidence = relatedProceeding?.confidence || 50;
      const fallbackVerdict = relatedProceeding
        ? (relatedProceeding.answer >= 72
          ? truthFromBand("strong", fallbackConfidence)
          : truthFromBand("uncertain", fallbackConfidence))
        : 50;

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

    // Sanitize temporal errors from reasoning
    const sanitizedReasoning = sanitizeTemporalErrors(cv.reasoning || "", new Date());

    // Calculate base truth percentage from LLM verdict
    let truthPct = calculateTruthPercentage(cv.verdict, cv.confidence);

    // v2.5.2: If the proceeding has positive factors and no evidenced negatives,
    // boost claims below 72% into the >=72 band
    if (relatedProceeding && relatedProceeding.factorAnalysis) {
      const fa = relatedProceeding.factorAnalysis;
      // Check if proceeding has positive factors and no evidenced negatives
      const proceedingIsPositive = relatedProceeding?.answer >= 72;

      // If proceeding is positive and claim is below threshold, boost it
      // This applies to claims below 72% or with mixed/uncertain evidence
      if (proceedingIsPositive && truthPct < 72) {
        const originalTruth = truthPct;
        truthPct = 72; // Minimum for MOSTLY-TRUE
        debugLog("claimVerdict: Corrected based on scope factors", {
          claimId: cv.claimId,
          scopeId: proceedingId,
          from: originalTruth,
          to: truthPct,
          truthPctBefore: originalTruth,
          truthPctAfter: truthPct,
          reason: "Scope is positive with no evidenced negatives",
        });
      }
    }

    // Derive 7-point verdict from percentage
    return {
      ...cv,
      verdict: truthPct,
      truthPercentage: truthPct,
      reasoning: sanitizedReasoning,
      claimText: claim?.text || "",
      isCentral: claim?.isCentral || false,
      keyFactorId: claim?.keyFactorId || "", // Preserve KeyFactor mapping for aggregation
      relatedProceedingId: proceedingId,
      highlightColor: getHighlightColor7Point(truthPct),
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

  const questionAnswer: QuestionAnswer = {
    question: displayQuestion,
    answer: avgTruthPct,
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
    inputType: analysisInputType,
    isQuestion: isQuestionLike,
    questionAnswer,
    hasMultipleProceedings: true,
    proceedings: understanding.distinctProceedings,
    articleThesis: understanding.impliedClaim || understanding.articleThesis,
    logicalFallacies: [],

    // Claims summary
    claimsAverageTruthPercentage: claimsAvgTruthPct,
    claimsAverageVerdict: claimsAvgTruthPct,

    // Article verdict (for questions = question answer)
    articleTruthPercentage: avgTruthPct,
    articleVerdict: avgTruthPct,
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
  analysisInputType: InputType,
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
  const analysisInput = resolveAnalysisPromptInput(understanding, state);
  const displayQuestion =
    understanding.questionBeingAsked ||
    understanding.mainQuestion ||
    analysisInput;
  // v2.6.21: Use neutral label to ensure input-neutral verdicts
  // Previously "QUESTION" vs "INPUT" caused LLM verdict drift
  const inputLabel = "STATEMENT";
  // v2.6.24: Use wasOriginallyQuestion to determine if this was truly a question input
  // This prevents statements ending with "?" from showing "Question:" label
  const isQuestionLike = (understanding as any).wasOriginallyQuestion ||
    (analysisInputType === "question" && understanding.questionIntent !== "none");

  const systemPrompt = `Answer the input based on documented evidence.

## CRITICAL: TEMPORAL REASONING

**CURRENT DATE**: Today is ${currentDateReadable} (${currentDateStr}).

**DATE REASONING RULES**:
- When evaluating dates mentioned in claims, compare them to the CURRENT DATE above
- Do NOT assume dates are in the future without checking against the current date
- Do NOT reject claims as "impossible" based on incorrect temporal assumptions
- If a date seems inconsistent, verify it against the current date before making judgments

## CRITICAL: RATING DIRECTION

**YOUR TASK**: Rate the ORIGINAL ${inputLabel} AS STATED by the user (shown below in the user prompt).
- If the user claims "X is better than Y" and evidence shows Y is better, rate as FALSE/LOW percentage
- If the user claims "X increased" and evidence shows X decreased, rate as FALSE/LOW percentage
- Preserve the directional/comparative aspect of the original claim
- DO NOT rate your analysis conclusion - rate whether the USER'S CLAIM matches the evidence

## SCOPE/CONTEXT-AWARE EVALUATION

Evidence may come from sources with DIFFERENT analytical scopes (e.g., WTW vs TTW, EU vs US methodology).

- **Check scope alignment**: Are facts being compared from compatible scopes?
- **Flag scope mismatches**: Different scopes are NOT directly comparable
- **Note in reasoning**: When scope affects interpretation, mention it

## SHORT ANSWER GUIDANCE:
- shortAnswer MUST be a complete descriptive sentence summarizing the finding
- Example: "The evidence shows proper procedures were followed."
- NEVER use just a percentage value or scale label as the shortAnswer

## KEY FACTOR SCORING RULES - VERY IMPORTANT:
- supports="yes": Factor supports the claim with evidence (from sources OR your background knowledge)
- supports="no": Factor refutes the claim with counter-evidence (NOT just disputed/contested)
- supports="neutral": Use ONLY when you genuinely have no information about this factor

${CONFIG.allowModelKnowledge ? `IMPORTANT: You MUST use your background knowledge! For well-known public events and widely-reported facts, use what you know!
DO NOT mark factors as "neutral" if you know the answer from your training data.` : "Use ONLY the provided facts and sources."}

CRITICAL: Being "contested" by stakeholders does NOT make something neutral.
Example: "Critics claim X was unfair" but X followed proper procedures = "yes", not "neutral"

## Mark contested factors:
- isContested: true if this claim is politically disputed
- contestedBy: Who disputes it (empty string if not contested)
- factualBasis: Does opposition have ACTUAL DOCUMENTED COUNTER-EVIDENCE?
  * "established" = Opposition cites SPECIFIC DOCUMENTED FACTS (audits, logs, datasets)
  * "disputed" = Opposition has some factual counter-evidence but debatable
  * "opinion" = NO factual counter-evidence (just claims, political statements, executive orders)
  * "unknown" = Cannot determine

CRITICAL - factualBasis MUST be "opinion" for:
- Policy announcements or institutional actions without evidence
- Statements by supporters, officials, or advocacy groups (claims are not evidence)
- Calling something "unfair" or "persecution" without documented violations

## CLAIM VERDICT RULES:
- Provide a truth percentage (0-100) for each claim.
- Use these bands to calibrate:
  * 86-100: TRUE (strong support, no credible counter-evidence)
  * 72-85: MOSTLY-TRUE (mostly supported, minor gaps)
  * 58-71: LEANING-TRUE (mixed evidence)
  * 43-57: UNVERIFIED (insufficient evidence)
  * 29-42: LEANING-FALSE (more counter-evidence than support)
  * 15-28: MOSTLY-FALSE (strong counter-evidence)
  * 0-14: FALSE (direct contradiction)

CRITICAL: Stakeholder contestation is NOT counter-evidence.
Use the TRUE/MOSTLY-TRUE band (>=72%) if you know the facts support the claim despite stakeholder opposition.

${getKnowledgeInstruction(state.originalInput, understanding)}
${getProviderPromptHint()}`;

  const userPrompt = `## ${inputLabel}
"${analysisInput}"

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
      temperature: getDeterministicTemperature(0.3),
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
        verdict: 50,
        confidence: 50,
        truthPercentage: 50,
        riskTier: "B" as const,
        reasoning: "Unable to generate verdict due to schema validation error.",
        supportingFactIds: [],
        isCentral: claim.isCentral || false,
        highlightColor: getHighlightColor7Point(50),
        isContested: false,
        contestedBy: "",
        factualBasis: "unknown" as const,
      }),
    );

    const questionAnswer: QuestionAnswer = {
      question: displayQuestion,
      answer: 50,
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
      inputType: analysisInputType,
      isQuestion: isQuestionLike,
      questionAnswer,
      hasMultipleProceedings: false,
      articleThesis: understanding.articleThesis,
      logicalFallacies: [],
      claimsAverageTruthPercentage: 50,
      claimsAverageVerdict: 50,
      articleTruthPercentage: 50,
      articleVerdict: 50,
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
          verdict: 50,
          confidence: 50,
          truthPercentage: 50,
          riskTier: "B" as const,
          reasoning: "No verdict returned by LLM for this claim.",
          supportingFactIds: [],
          isCentral: claim.isCentral || false,
          startOffset: claim.startOffset,
          endOffset: claim.endOffset,
          highlightColor: getHighlightColor7Point(50),
        } as ClaimVerdict;
      }

      // Sanitize temporal errors from reasoning
      const sanitizedReasoning = sanitizeTemporalErrors(cv.reasoning || "", new Date());

      const truthPct = calculateTruthPercentage(cv.verdict, cv.confidence);
        return {
        ...cv,
        claimId: claim.id,
          verdict: truthPct,
        truthPercentage: truthPct,
        reasoning: sanitizedReasoning,
        claimText: claim.text || "",
        isCentral: claim.isCentral || false,
        startOffset: claim.startOffset,
        endOffset: claim.endOffset,
        highlightColor: getHighlightColor7Point(truthPct),
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

  let answerTruthPct = normalizePercentage(parsed.questionAnswer.answer);
  let correctedConfidence = normalizePercentage(parsed.questionAnswer.confidence);

  // v2.6.20: Removed factor-based boost to ensure input neutrality
  debugLog("generateQuestionVerdicts: No factor-based boost applied", {
    answerTruthPct,
    positiveFactors,
    evidencedNegatives,
    contestedNegatives,
  });

  const questionAnswer: QuestionAnswer = {
    question: displayQuestion,
    answer: answerTruthPct,
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
    inputType: analysisInputType,
    isQuestion: isQuestionLike,
    questionAnswer,
    hasMultipleProceedings: false,
    articleThesis: understanding.impliedClaim || understanding.articleThesis,
    logicalFallacies: [],

    // Claims summary
    claimsAverageTruthPercentage: claimsAvgTruthPct,
    claimsAverageVerdict: claimsAvgTruthPct,

    // Article verdict (for questions = question answer)
    articleTruthPercentage: answerTruthPct,
    articleVerdict: answerTruthPct,
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
- Provide a truth percentage (0-100) for each claim.
- Use these bands to calibrate:
  * 86-100: TRUE (strong support, no credible counter-evidence)
  * 72-85: MOSTLY-TRUE (mostly supported, minor gaps)
  * 58-71: LEANING-TRUE (mixed evidence)
  * 43-57: UNVERIFIED (insufficient evidence)
  * 29-42: LEANING-FALSE (more counter-evidence than support)
  * 15-28: MOSTLY-FALSE (strong counter-evidence)
  * 0-14: FALSE (direct contradiction)

Use the MOSTLY-FALSE/FALSE bands (0-28%) for any claim that evidence contradicts, regardless of certainty level.

## CLAIM CONTESTATION (for each claim):
- isContested: true if this claim is politically disputed or challenged
- contestedBy: Who disputes it (e.g., "climate skeptics", "vaccine opponents") - empty string if not contested
- factualBasis: Does the opposition have ACTUAL DOCUMENTED COUNTER-EVIDENCE?
  * "established" = Opposition cites SPECIFIC DOCUMENTED FACTS (studies, data, records, audits)
  * "disputed" = Opposition has some factual counter-evidence but debatable
  * "opinion" = NO factual counter-evidence (just claims, political statements)
  * "unknown" = Cannot determine

CRITICAL - factualBasis MUST be "opinion" for:
- Public statements or rhetoric without documented evidence
- Ideological objections without factual basis
- "Some people say" or "critics claim" without specific counter-evidence

## SCOPE/CONTEXT-AWARE EVALUATION

Evidence may come from sources with DIFFERENT analytical scopes (e.g., WTW vs TTW, EU vs US methodology).

**When evaluating claims with scope-specific evidence**:
1. **Check scope alignment**: Are facts being compared from compatible scopes?
2. **Flag scope mismatches**: If Source A uses WTW and Source B uses TTW, these are NOT directly comparable
3. **Note in reasoning**: When scope affects interpretation, mention it (e.g., "Under WTW analysis...")
4. **Don't treat scope differences as contradictions**: "40% efficient (WTW)" and "60% efficient (TTW)" are BOTH correct for different scopes

**Example scope mismatch to flag**:
- Claim: "Hydrogen cars are more efficient than EVs"
- Source A (TTW scope): "Hydrogen 60% efficient"
- Source B (WTW scope): "EVs 80% efficient"
→ These use different scopes - NOT a valid comparison. Note in reasoning.

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

ARTICLE VERDICT TRUTH PERCENTAGE:
- Provide articleVerdict as a truth percentage (0-100).
- Use these bands to calibrate:
  * 86-100: TRUE (thesis strongly supported, no significant logical issues)
  * 72-85: MOSTLY-TRUE (mostly supported, minor issues)
  * 58-71: LEANING-TRUE (mixed framing or gaps)
  * 43-57: UNVERIFIED (mixed support)
  * 29-42: LEANING-FALSE (notable logical gaps or framing issues)
  * 15-28: MOSTLY-FALSE (strong counter-evidence to the thesis)
  * 0-14: FALSE (thesis is directly contradicted)

IMPORTANT: Set verdictDiffersFromClaimAverage=true if the article verdict differs from what a simple average would suggest.
Example: If 3/4 claims are true but the main conclusion is false -> set articleVerdict in the LEANING-FALSE band (29-42%).

${getKnowledgeInstruction(state.originalInput, understanding)}
${getProviderPromptHint()}`;

  // KeyFactors are now generated in understanding phase, not verdict generation
  systemPrompt += `

## KEY FACTORS
KeyFactors are handled in the understanding phase. Provide an empty keyFactors array: []`;

  if (pseudoscienceAnalysis?.isPseudoscience) {
    systemPrompt += `\n\nPSEUDOSCIENCE DETECTED: This content contains patterns associated with pseudoscience (${pseudoscienceAnalysis.categories.join(", ")}).
Claims relying on mechanisms that contradict established science (like "water memory", "molecular restructuring", etc.) should be in the MOSTLY-FALSE/FALSE bands (0-28%), not the UNVERIFIED band (43-57%).
However, do NOT place them in the FALSE band (0-14%) unless you can prove them wrong with 99%+ certainty - we can't prove a negative absolutely.`;
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
      temperature: getDeterministicTemperature(0.3),
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
      (claim: any) => ({
        claimId: claim.id,
        claimText: claim.text,
        verdict: 50,
        confidence: 50,
        truthPercentage: 50,
        riskTier: "B" as const,
        reasoning:
          "Unable to generate verdict due to schema validation error. Manual review recommended.",
        supportingFactIds: [],
        isCentral: claim.isCentral || false,
        startOffset: claim.startOffset,
        endOffset: claim.endOffset,
        highlightColor: getHighlightColor7Point(50),
        isContested: false,
        contestedBy: "",
        factualBasis: "unknown" as const,
      }),
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
      claimsAverageVerdict: 50,
      articleTruthPercentage: 50,
      articleVerdict: 50,
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
          verdict: 50,
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
          highlightColor: getHighlightColor7Point(50),
        } as ClaimVerdict;
      }

      // Sanitize temporal errors from reasoning
      const sanitizedReasoning = sanitizeTemporalErrors(cv.reasoning || "", new Date());

      let truthPct = calculateTruthPercentage(cv.verdict, cv.confidence);
      let finalConfidence = normalizePercentage(cv.confidence);
      let escalationReason: string | undefined;

      const claimPseudo = detectPseudoscience(claim.text || cv.claimId);

      // Apply pseudoscience escalation only when the claim itself matches pseudoscience patterns
      if (claimPseudo.isPseudoscience) {
        const escalation = escalatePseudoscienceVerdict(
          truthPct,
          finalConfidence,
          claimPseudo,
        );
        truthPct = escalation.truthPercentage;
        finalConfidence = escalation.confidence;
        escalationReason = escalation.escalationReason;
      }

      const evidenceBasedContestation =
        cv.isContested &&
        (cv.factualBasis === "established" || cv.factualBasis === "disputed");
      if (evidenceBasedContestation) {
        const penalty = cv.factualBasis === "established" ? 12 : 8;
        truthPct = Math.max(0, truthPct - penalty);
      }

      return {
        ...cv,
        claimId: claim.id,
        verdict: truthPct,
        truthPercentage: truthPct,
        confidence: finalConfidence,
        reasoning: sanitizedReasoning,
        claimText: claim.text || "",
        isCentral: claim.isCentral || false,
        claimRole: claim.claimRole || "core",
        dependsOn: claim.dependsOn || [],
        keyFactorId: claim.keyFactorId || "", // Preserve KeyFactor mapping for aggregation
        startOffset: claim.startOffset,
        endOffset: claim.endOffset,
        highlightColor: getHighlightColor7Point(truthPct),
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
      claimsAverageVerdict: claimsAvgTruthPct,

      // Article verdict (LLM's independent assessment, with Article Verdict Problem override)
      articleTruthPercentage: articleTruthPct,
      articleVerdict: articleTruthPct,
      articleVerdictReason: articleVerdictOverrideReason
        ? articleVerdictOverrideReason
        : verdictDiffers
          ? articleTruthPct < claimsAvgTruthPct
            ? "Article uses facts misleadingly or draws unsupported conclusions"
            : "Article's conclusion is better supported than individual claims suggest"
          : undefined,

      claimPattern,
      isPseudoscience: pseudoscienceAnalysis?.isPseudoscience,
      pseudoscienceCategories: pseudoscienceAnalysis?.categories,

      // NEW v2.6.18: Key Factors for article mode (unified with question mode)
      keyFactors: keyFactors.length > 0 ? keyFactors : undefined,
      hasContestedFactors: keyFactors.length > 0 ? hasContestedFactors : undefined,
    },
  };
}

function getHighlightColor(truthPercentage: number): "green" | "yellow" | "red" {
  const normalized = normalizePercentage(truthPercentage);
  if (normalized >= 72) return "green";
  if (normalized >= 43) return "yellow";
  return "red";
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
    title += ` (${understanding.distinctProceedings.length} contexts)`;
  }

  // Get the implied claim, filtering out placeholder values
  // v2.6.24: Use articleThesis for display (LLM-extracted summary)
  // impliedClaim is now the normalized input (for analysis consistency), not for display
  const displaySummary = understanding.articleThesis || understanding.impliedClaim;
  const isValidDisplaySummary = displaySummary &&
    !displaySummary.toLowerCase().includes("unknown") &&
    displaySummary !== "<UNKNOWN>" &&
    displaySummary.length > 10;

  const articleSummary = {
    title,
    source:
      state.inputType === "url" ? state.originalInput : "User-provided text",
    mainArgument: isValidDisplaySummary
      ? displaySummary
      : (understanding.subClaims[0]?.text || "Analysis of provided content"),
    keyFindings: understanding.subClaims.slice(0, 4).map((c: any) => c.text),
    reasoning: hasMultipleProceedings
      ? `Covers ${understanding.distinctProceedings.length} contexts: ${understanding.distinctProceedings.map((p: DistinctProceeding) => p.shortName).join(", ")}`
      : `Examined ${understanding.subClaims.length} claims`,
    conclusion:
      articleAnalysis.questionAnswer?.shortAnswer ||
      (isValidDisplaySummary ? displaySummary : understanding.subClaims[0]?.text || "See claims analysis"),
  };

  const analysisId = `FH-${Date.now().toString(36).toUpperCase()}`;

  let overallVerdict = 50;
  if (isQuestion && articleAnalysis.questionAnswer) {
    overallVerdict = normalizePercentage(articleAnalysis.questionAnswer.truthPercentage);
  } else {
    overallVerdict = normalizePercentage(articleAnalysis.articleTruthPercentage);
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
    parts.push(`Multi-context (${articleAnalysis.proceedings?.length})`);
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
    const qaConfidence = qa.confidence ?? 0;
    report += `### Answer: ${percentageToClaimVerdict(qa.truthPercentage, qaConfidence)} (${qa.truthPercentage}%)\n\n`;

    if (qa.calibrationNote)
      report += `> ${iconWarning} ${qa.calibrationNote}\n\n`;

    report += `**Short Answer:** ${qa.shortAnswer}\n\n`;

    if (hasMultipleProceedings && qa.proceedingAnswers) {
      report += `## Context Analysis\n\n`;
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
        const paConfidence = pa.confidence ?? 0;
        report += `**Answer:** ${emoji} ${percentageToClaimVerdict(pa.truthPercentage, paConfidence)} (${pa.truthPercentage}%)\n\n`;

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

    report += `### Article Verdict: ${verdictEmoji} ${percentageToArticleVerdict(articleAnalysis.articleTruthPercentage)} (${articleAnalysis.articleTruthPercentage}%)\n\n`;

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

    const cvConfidence = cv.confidence ?? 0;
    report += `**${cv.claimId}:** ${cv.claimText} ${emoji} ${percentageToClaimVerdict(cv.truthPercentage, cvConfidence)} (${cv.truthPercentage}% truth)\n\n`;
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
  jobId?: string;
};

export async function runFactHarborAnalysis(input: AnalysisInput) {
  // Clear debug log at start of each analysis
  clearDebugLog();
  debugLog("=== ANALYSIS STARTED ===");
  debugLog("Input", {
    jobId: input.jobId || "",
    inputType: input.inputType,
    inputValue: input.inputValue.substring(0, 200),
  });

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
    recentClaimsSearched: false, // NEW v2.6.22
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
  if (proceedingCount > 1) statusMsg += ` | ${proceedingCount} CONTEXTS`;
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
    // NEW v2.6.22: Track claim-level recency searches
    if (decision.focus?.startsWith("Recent claim:"))
      state.recentClaimsSearched = true;
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

    // =========================================================================
    // GROUNDED SEARCH MODE: Use Gemini's built-in Google Search
    // =========================================================================
    if (CONFIG.searchMode === "grounded" && isGroundedSearchAvailable()) {
      await emit(
        `🔍 Using Gemini Grounded Search for: "${decision.focus}"`,
        baseProgress + 1,
      );

      const groundedResult = await searchWithGrounding({
        prompt: `Find recent, factual information about: ${decision.focus}`,
        context: state.originalInput || state.originalText || "",
      });

      if (groundedResult.groundingUsed && groundedResult.sources.length > 0) {
        console.log(`[Analyzer] Grounded search found ${groundedResult.sources.length} sources`);

        // Convert grounded sources to FetchedSource format and add to state
        const groundedSources = convertToFetchedSources(groundedResult, state.sources.length + 1);
        for (const source of groundedSources) {
          state.sources.push(source as FetchedSource);
        }

        // Track the search
        state.searchQueries.push({
          query: groundedResult.searchQueries[0] || decision.focus!,
          iteration,
          focus: decision.focus!,
          resultsCount: groundedResult.sources.length,
          timestamp: new Date().toISOString(),
          searchProvider: "Gemini-Grounded",
        });

        // Extract facts from the grounded response
        if (groundedResult.groundedResponse) {
          await emit(`📊 Extracting facts from grounded response...`, baseProgress + 2);
          // Create a synthetic source for the grounded response
          const syntheticSource: FetchedSource = {
            id: `S${state.sources.length + 1}`,
            url: "gemini-grounded-search",
            title: `Grounded Search: ${decision.focus}`,
            fullText: groundedResult.groundedResponse,
            trackRecordScore: 60, // Moderate trust for AI-synthesized content
            fetchedAt: new Date().toISOString(),
            category: "grounded_search",
            fetchSuccess: true,
            searchQuery: decision.focus,
          };

          const extractedFacts = await extractFacts(
            syntheticSource,
            decision.focus!,
            model,
            state.understanding?.distinctProceedings || []
          );

          if (extractedFacts && extractedFacts.length > 0) {
            state.facts.push(...extractedFacts);
            console.log(`[Analyzer] Extracted ${extractedFacts.length} facts from grounded search`);
          }
        }

        // Continue to next iteration (skip standard search)
        state.iterations.push({
          number: iteration,
          focus: decision.focus!,
          queries: groundedResult.searchQueries,
          sourcesFound: groundedResult.sources.length,
          factsExtracted: state.facts.length,
        });
        continue;
      } else {
        console.log(`[Analyzer] Grounded search did not return results, falling back to standard search`);
        await emit(`⚠️ Grounded search unavailable, using standard search`, baseProgress + 1);
      }
    }

    // =========================================================================
    // STANDARD SEARCH MODE: Use SerpAPI / Google CSE
    // =========================================================================

    // Perform searches and track them
    const searchResults: Array<{ url: string; title: string; query: string }> =
      [];
    for (const query of decision.queries || []) {
      // Use decision-level recencyMatters (based on original input) OR per-query detection
      // This ensures date filtering is consistent across all queries in a recency-sensitive topic
      const recencyMatters = decision.recencyMatters || isRecencySensitive(query, state.understanding || undefined);
      const dateRestrict: "y" | "m" | "w" | undefined =
        CONFIG.searchDateRestrict || (recencyMatters ? "y" : undefined);

      // #region agent log
  if (IS_LOCAL_DEV) fetch('http://127.0.0.1:7242/ingest/6ba69d74-cd95-4a82-aebe-8b8eeb32980a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apps/web/src/lib/analyzer.ts:searchWithDateFilter',message:'Search with date filter',data:{query:query.substring(0,100),recencyMatters,forcedByEnv:!!CONFIG.searchDateRestrict,dateRestrict},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'D'})}).catch(()=>{});
      // #endregion

      // Get providers before search to show in event
      const searchProviders = getActiveSearchProviders().join("+");
      const dateFilterMsg = dateRestrict ? ` [filtering: past ${dateRestrict === "y" ? "year" : dateRestrict === "m" ? "month" : "week"}]` : "";
      await emit(
        `🔍 Searching [${searchProviders}]${dateFilterMsg}: "${query}"`,
        baseProgress + 1,
      );

      try {
        const searchResponse = await searchWebWithProvider({
          query,
          maxResults: config.maxSourcesPerIteration,
          dateRestrict,
          domainWhitelist: CONFIG.searchDomainWhitelist || undefined,
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
    // Preserve provider relevance ordering (avoid sorting by URL, which can discard top results).
    // De-dupe by URL while keeping first occurrence.
    const uniqueResults: Array<{ url: string; title: string; snippet?: string | null; query: string }> = [];
    const used = new Set<string>();
    for (const r of newResults as any[]) {
      const url = String(r?.url || "");
      if (!url) continue;
      if (used.has(url)) continue;
      used.add(url);
      uniqueResults.push(r);
      if (uniqueResults.length >= config.maxSourcesPerIteration) break;
    }

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

  // STEP 4.5: Post-research outcome extraction - extract outcomes from facts and create claims
  await emit(`Extracting outcomes from research [LLM: ${provider}/${modelName}]`, 62);
  const outcomeClaims = await extractOutcomeClaimsFromFacts(state, model);
  if (outcomeClaims.length > 0) {
    state.understanding!.subClaims.push(...outcomeClaims);
    console.log(`[Analyzer] Added ${outcomeClaims.length} outcome-related claims from research`);
    await emit(`Added ${outcomeClaims.length} outcome-related claims`, 63);
    // #region agent log
  if (IS_LOCAL_DEV) fetch('http://127.0.0.1:7242/ingest/6ba69d74-cd95-4a82-aebe-8b8eeb32980a',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'apps/web/src/lib/analyzer.ts:postResearchOutcomeExtraction',message:'Post-research outcome extraction',data:{outcomeClaimsCount:outcomeClaims.length,outcomeClaims:outcomeClaims.map((c:any)=>({id:c.id,text:c.text.substring(0,100),relatedProceedingId:c.relatedProceedingId}))},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'B'})}).catch(()=>{});
    // #endregion
  }

  // STEP 4.6: Enrich scopes with outcomes discovered in evidence (generic LLM-based)
  // This updates "pending"/"unknown" outcomes with actual outcomes found in facts
  await emit(`Enriching scopes with discovered outcomes [LLM: ${provider}/${modelName}]`, 64);
  await enrichScopesWithOutcomes(state, model);

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
      hasMultipleScopes: articleAnalysis.hasMultipleProceedings,  // Alias
      proceedingCount: state.understanding!.distinctProceedings.length,
      scopeCount: state.understanding!.distinctProceedings.length,  // Alias
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
    // Primary: "scopes" (unified terminology for bounded analytical frames)
    scopes: state.understanding!.distinctProceedings,
    // Backward compatibility alias
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
