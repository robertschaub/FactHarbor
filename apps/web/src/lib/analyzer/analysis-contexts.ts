/**
 * AnalysisContext canonicalization helpers.
 *
 * Extracted from the monolithic `analyzer.ts` to keep responsibilities separated.
 *
 * @module analyzer/analysis-contexts
 */

import {
  detectInstitutionCode,
  extractAllCapsToken,
  inferScopeTypeLabel,
  inferToAcronym,
  contextTypeRank,
} from "./config";
import { z } from "zod";
import { generateText, Output } from "ai";
import { getModelForTask, extractStructuredOutput } from "./llm";
import { getDeterministicTemperature } from "./config";
import { getAggregationPatterns, matchesAnyPattern } from "./lexicon-utils";
import type { PipelineConfig } from "../config-schemas";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Detected AnalysisContext from scope detection (heuristic or LLM).
 * This represents a top-level bounded analytical frame.
 *
 * TERMINOLOGY: "Scope" in this file historically referred to AnalysisContext.
 * This module name now reflects AnalysisContext for clarity. See types.ts:98-126 for definitions.
 */
export interface DetectedAnalysisContext {
  id: string;
  name: string;
  type: string;
  metadata?: Record<string, any>;
}

/**
 * @deprecated Use DetectedAnalysisContext instead.
 * "Scope" here refers to AnalysisContext (top-level analytical frame), NOT EvidenceScope.
 */
export type DetectedScope = DetectedAnalysisContext;

/**
 * Schema for AnalysisContext detection output from LLM.
 */
export const ContextDetectionOutputSchema = z.object({
  contexts: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum([
        "methodological",
        "legal",
        "scientific",
        "general",
        "regulatory",
        "temporal",
        "geographic",
      ]),
      confidence: z.number().min(0).max(1),
      reasoning: z.string(),
      metadata: z.record(z.any()).optional(),
    }),
  ),
  requiresSeparateAnalysis: z.boolean(),
  rationale: z.string(),
});

/** @deprecated Use ContextDetectionOutputSchema instead */
export const ScopeDetectionOutputSchema = ContextDetectionOutputSchema;

export type ContextDetectionOutput = z.infer<typeof ContextDetectionOutputSchema>;

/** @deprecated Use ContextDetectionOutput instead */
export type ScopeDetectionOutput = ContextDetectionOutput;

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Reserved scope ID for facts that don't map to any detected scope.
 * Exported for use in tests and other modules.
 */
export const UNSCOPED_ID = "CTX_UNSCOPED";

// ============================================================================
// HEURISTIC SCOPE PRE-DETECTION (v2.8)
// ============================================================================

/**
 * Module-level compiled patterns (cached, initialized with defaults)
 * Can be reset via setScopeHeuristicsLexicon() for testing
 */
let _patterns = getAggregationPatterns();

/**
 * Reset scope heuristic patterns to defaults.
 */
export function setScopeHeuristicsLexicon(): void {
  _patterns = getAggregationPatterns();
}

/**
 * Get current patterns (for testing)
 */
export function getScopeHeuristicsPatternsConfig() {
  return _patterns;
}

/**
 * Detect potential analysis contexts from input text using heuristic patterns.
 * Returns suggested scopes to guide LLM, or null if no patterns match.
 *
 * v2.8: Code-level scope pre-detection for comparison claims, legal/trial fairness, etc.
 *
 * This function is GENERIC BY DESIGN - it uses abstract patterns, not domain-specific keywords.
 *
 * @param text - Input text to analyze for scope patterns
 * @returns Array of detected scopes or null if no patterns match
 */
export function detectScopesHeuristic(text: string, config?: PipelineConfig): DetectedScope[] | null {
  const scopes: DetectedScope[] = [];

  // Pattern 1: Comparison claims (efficiency, performance, impact)
  const hasComparison = matchesAnyPattern(text, _patterns.scopeComparisonPatterns);
  const hasEfficiencyKeywords = matchesAnyPattern(text, _patterns.scopeEfficiencyKeywords);

  if (hasComparison && hasEfficiencyKeywords) {
    scopes.push(
      {
        id: "SCOPE_PRODUCTION",
        name: "Production/Creation Phase Analysis",
        type: "methodological",
        metadata: { phase: "production", boundaries: "upstream" }
      },
      {
        id: "SCOPE_USAGE",
        name: "Usage/Operation Phase Analysis",
        type: "methodological",
        metadata: { phase: "usage", boundaries: "downstream" }
      }
    );
  }

  // Pattern 2: Legal/trial fairness claims
  const hasLegalFairness = matchesAnyPattern(text, _patterns.scopeLegalFairnessPatterns);
  const hasLegalProcess = matchesAnyPattern(text, _patterns.scopeLegalProcessKeywords);
  const fairnessCue = /\b(fair|unfair|appropriate|proper|just|legitimate)\b/i;

  if (hasLegalFairness || (hasLegalProcess && fairnessCue.test(text))) {
    scopes.push(
      {
        id: "SCOPE_LEGAL_PROC",
        name: "Legal Procedures and Compliance",
        type: "legal",
        metadata: { focus: "procedural compliance" }
      },
      {
        id: "SCOPE_OUTCOMES",
        name: "Outcomes and Consequences",
        type: "general",
        metadata: { focus: "results and impact" }
      }
    );

    if (matchesAnyPattern(text, _patterns.scopeInternationalCuePatterns)) {
      scopes.push({
        id: "SCOPE_INTL_PERSPECTIVE",
        name: "International Perspectives and Criticism",
        type: "general",
        metadata: { focus: "external assessment" }
      });
    }
  }

  // Pattern 3: Environmental/health comparisons
  const hasEnvHealth = matchesAnyPattern(text, _patterns.scopeEnvHealthPatterns);
  if (hasComparison && hasEnvHealth) {
    scopes.push(
      {
        id: "SCOPE_DIRECT",
        name: "Direct/Immediate Effects",
        type: "scientific",
        metadata: { timeframe: "immediate" }
      },
      {
        id: "SCOPE_LIFECYCLE",
        name: "Full Lifecycle Assessment",
        type: "scientific",
        metadata: { timeframe: "complete" }
      }
    );
  }

  return scopes.length > 0 ? scopes : null;
}

/**
 * Detect analysis contexts using an LLM with semantic understanding.
 * Falls back to heuristic seeds on error or invalid output.
 */
export async function detectScopesLLM(
  text: string,
  heuristicSeeds: DetectedScope[] | null,
  config: PipelineConfig,
): Promise<DetectedScope[]> {
  const modelInfo = getModelForTask("understand", undefined, config);

  const seedHint = heuristicSeeds?.length
    ? `\n\nHEURISTIC SEED CONTEXTS (optional hints):\n${heuristicSeeds
        .map((s) => `- ${s.id}: ${s.name} (${s.type})`)
        .join("\n")}`
    : "";

  const entities = extractCoreEntities(text);
  const entityHint = entities.length
    ? `\n\nCORE ENTITIES: ${entities.join(", ")}`
    : "";

  const systemPrompt = `You identify distinct AnalysisContexts for a claim.\n\nCRITICAL TERMINOLOGY:\n- Use "AnalysisContext" to mean top-level bounded analytical frames.\n- Use "EvidenceScope" only for per-source metadata (methodology/boundaries/time/geo).\n- Do NOT use the word "scope" when referring to AnalysisContexts.\n\nINCOMPATIBILITY TEST: Split contexts ONLY if combining them would be MISLEADING because they evaluate fundamentally different things.\n\nWHEN TO SPLIT (only when clearly supported):\n- Different formal authorities (distinct institutional decision-makers)\n- Different measurement boundaries or system definitions\n- Different regulatory regimes or time periods that change the analytical frame\n\nDO NOT SPLIT ON:\n- Pro vs con viewpoints\n- Different evidence types\n- Incidental geographic/temporal mentions\n- Public perception or meta commentary\n\nOUTPUT REQUIREMENTS:\n- Provide contexts as JSON array under 'contexts'.\n- Each context must include id, name, type, confidence (0-1), reasoning, metadata.\n- Use neutral, generic names tied to the input (no domain-specific hardcoding).${seedHint}${entityHint}`;

  const userPrompt = `Detect distinct AnalysisContexts for:\n\n${text}`;

  try {
    const result = await generateText({
      model: modelInfo.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: getDeterministicTemperature(0.2, config),
      output: Output.object({ schema: ScopeDetectionOutputSchema }),
    });

    const output = extractStructuredOutput(result) as ScopeDetectionOutput | null;
    if (!output || !Array.isArray(output.contexts)) {
      return heuristicSeeds || [];
    }

    const minConfidence =
      config.contextDetectionMinConfidence ??
      config.scopeDetectionMinConfidence ??
      0.7;
    const maxContexts =
      config.contextDetectionMaxContexts ??
      config.scopeDetectionMaxContexts ??
      5;

    return output.contexts
      .filter((c) => c.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, maxContexts)
      .map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        metadata: {
          ...(c.metadata || {}),
          confidence: c.confidence,
          detectionMethod: "llm",
          reasoning: c.reasoning,
        },
      }));
  } catch (error) {
    console.error("LLM context detection failed:", error);
    return heuristicSeeds || [];
  }
}

/**
 * Hybrid detection: heuristic seeds + LLM refinement.
 */
export async function detectScopesHybrid(
  text: string,
  config: PipelineConfig,
): Promise<DetectedScope[] | null> {
  const detectionEnabled =
    config.contextDetectionEnabled ?? config.scopeDetectionEnabled;
  if (detectionEnabled === false) return null;

  const method =
    config.contextDetectionMethod ??
    config.scopeDetectionMethod ??
    "heuristic";
  const heuristic = detectScopesHeuristic(text, config);

  if (method === "heuristic") return heuristic;

  const llmSeeds = method === "hybrid" ? heuristic : null;
  const llmContexts = await detectScopesLLM(text, llmSeeds, config);

  if (method === "llm") return llmContexts;

  return mergeAndDeduplicateScopes(heuristic, llmContexts, config);
}

function mergeAndDeduplicateScopes(
  heuristic: DetectedScope[] | null,
  llmContexts: DetectedScope[],
  config: PipelineConfig,
): DetectedScope[] {
  const merged = new Map<string, DetectedScope>();

  for (const scope of heuristic || []) {
    merged.set(scope.id, {
      ...scope,
      metadata: { ...(scope.metadata || {}), detectionMethod: "heuristic" },
    });
  }

  for (const scope of llmContexts) {
    merged.set(scope.id, scope);
  }

  const threshold =
    config.contextDedupThreshold ??
    config.scopeDedupThreshold ??
    0.85;
  const deduplicated: DetectedScope[] = [];

  for (const scope of merged.values()) {
    const isDuplicate = deduplicated.some(
      (existing) => calculateTextSimilarity(scope.name, existing.name) >= threshold,
    );
    if (!isDuplicate) deduplicated.push(scope);
  }

  return deduplicated.sort((a, b) => {
    const aConf = (a.metadata?.confidence as number) ?? 0.5;
    const bConf = (b.metadata?.confidence as number) ?? 0.5;
    return bConf - aConf;
  });
}

function calculateTextSimilarity(text1: string, text2: string): number {
  const normalize = (s: string) =>
    (s || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2);

  const words1 = new Set(normalize(text1));
  const words2 = new Set(normalize(text2));

  if (words1.size === 0 && words2.size === 0) return 1;
  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return union.size === 0 ? 0 : intersection.size / union.size;
}

/**
 * Backward-compatible synchronous wrapper for deterministic seed logic.
 */
export function detectScopes(text: string): DetectedScope[] | null {
  return detectScopesHeuristic(text);
}

/**
 * Format detected scopes as a hint string for LLM prompts.
 *
 * @param scopes - Array of detected scopes
 * @param detailed - If true, include metadata and MUST instruction
 * @returns Formatted string for prompt injection (empty string if no scopes)
 */
export function formatDetectedScopesHint(scopes: DetectedScope[] | null, detailed: boolean = false): string {
  if (!scopes || scopes.length === 0) return '';

  const lines = scopes.map(s =>
    detailed
      ? `- ${s.id}: ${s.name} (${s.type}) ${JSON.stringify(s.metadata || {})}`
      : `- ${s.id}: ${s.name} (${s.type})`
  );

  const instruction = detailed
    ? `\n\nIMPORTANT: These are SEED AnalysisContexts detected by heuristic patterns. You MUST output at least these contexts in your analysisContexts array, and you MUST preserve their IDs as listed (you may refine names/metadata or add additional contexts if warranted).`
    : '';

  return `\n\nPRE-DETECTED CONTEXTS (use as seed${detailed ? ' AnalysisContexts' : ''}, refine based on evidence):\n${lines.join('\n')}${instruction}`;
}

// ============================================================================
// INPUT CANONICALIZATION FOR SCOPE DETECTION (v2.8.2)
// ============================================================================

/**
 * Canonicalize input text for scope detection to ensure consistent scope
 * identification regardless of input phrasing (question vs statement).
 *
 * This addresses the input neutrality issue where:
 * - "Was the legal proceeding fair?" detected 3 scopes
 * - "The legal proceeding was fair" detected 4 scopes
 *
 * The function normalizes both phrasings to the same canonical form for
 * scope detection purposes.
 *
 * @param input - Raw or pre-normalized input text
 * @returns Canonical form for scope detection
 */
export function canonicalizeInputForScopeDetection(input: string): string {
  let text = input.trim();

  // 1. Remove question marks and trailing punctuation
  text = text.replace(/[?!.]+$/, '').trim();

  // 2. Normalize auxiliary verb questions to statements
  // Uses the same robust approach as normalizeYesNoQuestionToStatement in analyzer.ts
  const auxMatch = text.match(
    /^(was|were|is|are|did|do|does|has|have|had|can|could|will|would|should|may|might)\s+(.+)$/i
  );
  if (auxMatch) {
    const aux = auxMatch[1].toLowerCase();
    const rest = auxMatch[2].trim();

    if (rest) {
      // Try to split on clear subject boundaries first (parentheses, comma)
      const lastParen = rest.lastIndexOf(")");
      if (lastParen > 0 && lastParen < rest.length - 1) {
        const subject = rest.slice(0, lastParen + 1).trim();
        const predicate = rest.slice(lastParen + 1).trim();
        text = `${subject} ${aux} ${predicate}`.replace(/\s+/g, " ").trim();
      } else {
        const commaIdx = rest.indexOf(",");
        if (commaIdx > 0 && commaIdx < rest.length - 1) {
          const subject = rest.slice(0, commaIdx).trim();
          const predicate = rest.slice(commaIdx + 1).trim();
          text = `${subject} ${aux} ${predicate}`.replace(/\s+/g, " ").trim();
        } else {
          // Heuristic: split before common predicate starters (adjectives, verbs)
          const starterMatch = _patterns.scopePredicateStarters
            .map((pattern) => rest.match(pattern))
            .find((match) => match && typeof match.index === "number");

          if (starterMatch && typeof starterMatch.index === "number" && starterMatch.index > 0) {
            const subject = rest.slice(0, starterMatch.index).trim();
            const predicate = rest.slice(starterMatch.index).trim();
            if (subject && predicate) {
              text = `${subject} ${aux} ${predicate}`.replace(/\s+/g, " ").trim();
            }
          } else {
            // Safe fallback: use grammatical form that preserves meaning
            // "Did the court follow procedures?" → "It is the case that the court follow procedures"
            const copulas = new Set(["is", "are", "was", "were"]);
            text = copulas.has(aux)
              ? `it ${aux} the case that ${rest}`
              : `it is the case that ${rest}`;
          }
        }
      }
    }
  }

  // 3. Remove filler words that don't affect scope detection
  const fillerRe = new RegExp(
    _patterns.scopeFillerWords.map((p) => p.source).join("|"),
    "gi",
  );
  text = text.replace(fillerRe, " ").replace(/\s+/g, " ").trim();

  // 4. Extract core semantic entities BEFORE lowercasing
  // This preserves proper nouns for entity detection
  const coreEntities = extractCoreEntities(text);

  // 5. Normalize case for consistency (lowercase for comparison)
  const scopeKey = text.toLowerCase();

  console.log(`[Scope Canonicalization] Input: "${input.substring(0, 60)}..."`);
  console.log(`[Scope Canonicalization] Canonical: "${scopeKey.substring(0, 60)}..."`);
  console.log(`[Scope Canonicalization] Core entities: ${coreEntities.join(', ')}`);

  return scopeKey;
}

/**
 * Extract core semantic entities from text for scope matching.
 * These are the key nouns/proper nouns that define what the input is about.
 *
 * CRITICAL: This function MUST receive the original-case text (before lowercasing)
 * to properly detect proper nouns via capitalization patterns.
 *
 * Generic by Design: Uses regex patterns, not hardcoded keyword lists.
 */
function extractCoreEntities(text: string): string[] {
  const entities: string[] = [];

  // Look for proper nouns (capitalized words that aren't sentence-start)
  // Matches single words (Einstein) and multi-word names (Angela Merkel)
  const properNouns = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
  entities.push(...properNouns.map(n => n.toLowerCase()));

  // Look for legal/institutional terms (case-insensitive)
  const legalTerms = _patterns.scopeLegalTerms.filter((pattern) => pattern.test(text)).map((p) => {
    const match = text.match(p);
    return match ? match[0] : "";
  }).filter(Boolean);
  entities.push(...legalTerms.map((t) => t.toLowerCase()));

  const jurisdictions = _patterns.scopeJurisdictionIndicators.filter((pattern) => pattern.test(text)).map((p) => {
    const match = text.match(p);
    return match ? match[0] : "";
  }).filter(Boolean);
  entities.push(...jurisdictions.map((j) => j.toLowerCase()));

  // Deduplicate
  return [...new Set(entities)];
}

/**
 * Generate a scope detection hint based on the original input text.
 * This helps guide the LLM to detect consistent scopes regardless of phrasing.
 *
 * IMPORTANT: Pass the ORIGINAL text (not lowercased) so proper nouns are detected.
 */
export function generateScopeDetectionHint(originalInput: string): string {
  const entities = extractCoreEntities(originalInput);

  if (entities.length === 0) {
    return '';
  }

  // Build a hint that emphasizes what scopes to look for
  const hint = `
SCOPE DETECTION HINT (for input neutrality):
Focus on detecting scopes related to these core entities: ${entities.join(', ')}.
Do NOT detect scopes based on:
- Whether the input is phrased as a question or statement
- Public perception/opinion scopes (unless explicitly mentioned in input)
- Meta-level scopes about "trust" or "confidence" in institutions (unless core topic)
Focus on concrete, factual scopes (legal proceedings, regulatory reviews, methodological frameworks).
`;
  return hint;
}

// ============================================================================
// DETERMINISTIC SCOPE ID GENERATION
// ============================================================================

/**
 * Simple deterministic hash function for scope IDs.
 * Returns a consistent 8-character hex string for the same input.
 *
 * @param str - Input string to hash
 * @returns 8-character hex hash
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to positive hex string
  const hexHash = (hash >>> 0).toString(16).padStart(8, '0');
  return hexHash;
}

/**
 * Generate a deterministic scope ID from scope properties.
 * Format: {INST}_{hash} or SCOPE_{hash}
 *
 * Examples:
 * - TSE_a3f2 (has institution code)
 * - WTW_d9e8 (methodology acronym)
 * - SCOPE_f7a29b3c (no clear institution)
 *
 * @param scope - Scope object with name, description, metadata
 * @param inst - Institution code (if detected)
 * @param idx - Index for fallback (only used if no other identifier available)
 * @returns Deterministic scope ID
 */
function generateDeterministicScopeId(
  scope: any,
  inst: string | null,
  idx: number
): string {
  // Create stable input for hashing
  const hashInput = JSON.stringify({
    name: String(scope.name || "").toLowerCase().trim(),
    description: String(scope.description || "").toLowerCase().trim().slice(0, 100),
    court: String(scope.metadata?.court || "").toLowerCase().trim(),
    institution: String(scope.metadata?.institution || "").toLowerCase().trim(),
    subject: String(scope.subject || "").toLowerCase().trim().slice(0, 100),
  });

  // Generate 8-char hash
  const fullHash = simpleHash(hashInput);
  const shortHash = fullHash.slice(0, 4); // Use first 4 chars for readability

  // Return hybrid format: preserve institution code + short hash for uniqueness
  if (inst && inst.length > 0) {
    return `${inst}_${shortHash}`;
  }

  // Fallback: SCOPE_{hash}
  return `SCOPE_${fullHash}`;
}

export function canonicalizeScopes(
  input: string,
  understanding: any,
): any {
  if (!understanding) return understanding;
  const contexts = Array.isArray(understanding.analysisContexts)
    ? understanding.analysisContexts
    : [];
  if (contexts.length === 0) return understanding;

  // Stable ordering to prevent run-to-run drift in labeling and downstream selection.
  // Use a lightweight, mostly-provider-invariant key: inferred type + institution code + court string.
  const sorted = [...contexts].sort((a: any, b: any) => {
    const al = inferScopeTypeLabel(a);
    const bl = inferScopeTypeLabel(b);
    const ar = contextTypeRank(al);
    const br = contextTypeRank(bl);
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

  const canonicalContexts = sorted.map((p: any, idx: number) => {
    const typeLabel = inferScopeTypeLabel(p);
    const inst = detectInstitutionCode(p);
    // Generate deterministic ID (PR 3: Pipeline Redesign)
    let newId = generateDeterministicScopeId(p, inst, idx);
    // Handle collisions (extremely rare with hash-based IDs)
    if (usedIds.has(newId)) newId = `${newId}_${idx + 1}`;
    usedIds.add(newId);
    idRemap.set(p.id, newId);
    const rawName = String(p?.name || "").trim();
    const rawShort = String(p?.shortName || "").trim();
    const inferredShortFromName = extractAllCapsToken(rawName);
    const toAcronym = inferToAcronym(rawName);

    // Preserve meaningful scope names from the model/evidence. Only synthesize a fallback
    // when the name is missing or obviously generic.
    const isGenericName =
      rawName.length === 0 ||
      /^(general|analytical|methodological|criminal|civil|regulatory|electoral)\s+(proceeding|context|scope)$/i.test(
        rawName,
      ) ||
      /^general$/i.test(rawName);

    const subj = String(p?.subject || "").trim();
    const fallbackName = subj
      ? subj.substring(0, 120)
      : inst
        ? `${typeLabel} context (${inst})`
        : `${typeLabel} context`;
    const name = isGenericName ? fallbackName : rawName;

    // Prefer institution codes for legal scopes; otherwise infer an acronym from the name.
    const shortName =
      (rawShort && rawShort.length <= 12 ? rawShort : "") ||
      (inst ? inst : toAcronym || inferredShortFromName) ||
      `CTX${idx + 1}`;
    return {
      ...p,
      id: newId,
      // Keep human-friendly labels, but avoid overwriting meaningful model-provided names.
      name,
      shortName,
      // Avoid presenting unanchored specifics as facts.
      date: hasExplicitYear ? p.date : "",
      status: hasExplicitStatusAnchor ? p.status : "unknown",
    };
  });

  const remappedClaims = (understanding.subClaims || []).map((c: any) => {
    const rp = c.contextId;
    return {
      ...c,
      contextId: rp && idRemap.has(rp) ? idRemap.get(rp) : rp,
    };
  });

  return {
    ...understanding,
    analysisContexts: canonicalContexts,
    subClaims: remappedClaims,
  };
}

export function canonicalizeScopesWithRemap(
  input: string,
  understanding: any,
): { understanding: any; idRemap: Map<string, string> } {
  if (!understanding) return { understanding, idRemap: new Map() };
  const contexts = Array.isArray(understanding.analysisContexts)
    ? understanding.analysisContexts
    : [];
  if (contexts.length === 0) return { understanding, idRemap: new Map() };

  // Stable ordering to prevent run-to-run drift in labeling and downstream selection.
  const sorted = [...contexts].sort((a: any, b: any) => {
    const al = inferScopeTypeLabel(a);
    const bl = inferScopeTypeLabel(b);
    const ar = contextTypeRank(al);
    const br = contextTypeRank(bl);
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

  const canonicalContexts = sorted.map((p: any, idx: number) => {
    const typeLabel = inferScopeTypeLabel(p);
    const inst = detectInstitutionCode(p);
    // Generate deterministic ID (PR 3: Pipeline Redesign)
    let newId = generateDeterministicScopeId(p, inst, idx);
    // Handle collisions (extremely rare with hash-based IDs)
    if (usedIds.has(newId)) newId = `${newId}_${idx + 1}`;
    usedIds.add(newId);
    idRemap.set(p.id, newId);
    const rawName = String(p?.name || "").trim();
    const rawShort = String(p?.shortName || "").trim();
    const inferredShortFromName = extractAllCapsToken(rawName);
    const toAcronym = inferToAcronym(rawName);
    const isGenericName =
      rawName.length === 0 ||
      /^(general|analytical|methodological|criminal|civil|regulatory|electoral)\s+(proceeding|context|scope)$/i.test(
        rawName,
      ) ||
      /^general$/i.test(rawName);
    const subj = String(p?.subject || "").trim();
    const fallbackName = subj
      ? subj.substring(0, 120)
      : inst
        ? `${typeLabel} context (${inst})`
        : `${typeLabel} context`;
    const name = isGenericName ? fallbackName : rawName;
    const shortName =
      (rawShort && rawShort.length <= 12 ? rawShort : "") ||
      (inst ? inst : toAcronym || inferredShortFromName) ||
      `CTX${idx + 1}`;
    return {
      ...p,
      id: newId,
      name,
      shortName,
      date: hasExplicitYear ? p.date : "",
      status: hasExplicitStatusAnchor ? p.status : "unknown",
    };
  });

  const remappedClaims = (understanding.subClaims || []).map((c: any) => {
    const rp = c.contextId;
    return {
      ...c,
      contextId: rp && idRemap.has(rp) ? idRemap.get(rp) : rp,
    };
  });

  return {
    understanding: {
      ...understanding,
      analysisContexts: canonicalContexts,
      subClaims: remappedClaims,
    },
    idRemap,
  };
}

export function ensureAtLeastOneScope(
  understanding: any,
): any {
  if (!understanding) return understanding;
  const contexts = Array.isArray(understanding.analysisContexts)
    ? understanding.analysisContexts
    : [];
  if (contexts.length > 0) return understanding;
  // Generate a deterministic ID even for the fallback scope
  const fallbackScope = {
    name: understanding.impliedClaim
      ? understanding.impliedClaim.substring(0, 100)
      : "General context",
    shortName: "GEN",
    subject: understanding.impliedClaim || "",
    temporal: "",
    status: "unknown",
    outcome: "unknown",
    metadata: {},
  };

  return {
    ...understanding,
    analysisContexts: [
      {
        ...fallbackScope,
        id: generateDeterministicScopeId(fallbackScope, null, 0),
      },
    ],
    requiresSeparateAnalysis: false,
  };
}

// ============================================================================
// FUNCTION ALIASES (Phase 1: Backward Compatibility)
// ============================================================================
// These aliases maintain backward compatibility while transitioning to
// correct terminology. "Scope" in these function names refers to
// AnalysisContext, NOT EvidenceScope. See types.ts:98-126 for definitions.

/** Primary name for setting context heuristics lexicon */
export const setContextHeuristicsLexicon = setScopeHeuristicsLexicon;

/** Primary name for getting context heuristics patterns config */
export const getContextHeuristicsPatternsConfig = getScopeHeuristicsPatternsConfig;

/** Primary name for heuristic context detection */
export const detectContextsHeuristic = detectScopesHeuristic;

/** Primary name for LLM context detection */
export const detectContextsLLM = detectScopesLLM;

/** Primary name for hybrid context detection */
export const detectContextsHybrid = detectScopesHybrid;

/** Primary name for synchronous context detection */
export const detectContexts = detectScopes;

/** Primary name for formatting detected contexts hint */
export const formatDetectedContextsHint = formatDetectedScopesHint;

/** Primary name for canonicalizing input for context detection */
export const canonicalizeInputForContextDetection = canonicalizeInputForScopeDetection;

/** Primary name for generating context detection hint */
export const generateContextDetectionHint = generateScopeDetectionHint;

/** Primary name for canonicalizing contexts */
export const canonicalizeContexts = canonicalizeScopes;

/** Primary name for canonicalizing contexts with ID remap */
export const canonicalizeContextsWithRemap = canonicalizeScopesWithRemap;

/** Primary name for ensuring at least one context */
export const ensureAtLeastOneContext = ensureAtLeastOneScope;

// Note: generateDeterministicScopeId is an internal helper function (not exported)
// so no alias is needed for it.
