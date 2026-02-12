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
  inferContextTypeLabel,
  inferToAcronym,
  contextTypeRank,
} from "./config";
import { z } from "zod";
import { generateText, Output } from "ai";
import { getModelForTask, extractStructuredOutput, getStructuredOutputProviderOptions } from "./llm";
import { getDeterministicTemperature } from "./config";
import { DEFAULT_PIPELINE_CONFIG, type PipelineConfig } from "../config-schemas";

// ============================================================================
// TYPES
// ============================================================================

/**
 * Detected AnalysisContext from context detection (heuristic or LLM).
 * This represents a top-level bounded analytical frame.
 */
export interface DetectedAnalysisContext {
  id: string;
  name: string;
  type: string;
  metadata?: Record<string, any>;
}

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
      typeLabel: z.string().optional(),
      metadata: z.record(z.any()).optional(),
    }),
  ),
  requiresSeparateAnalysis: z.boolean(),
  rationale: z.string(),
});

// Anthropic output_format currently rejects numeric bounds and additionalProperties=true.
const ContextDetectionOutputSchemaAnthropic = z.object({
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
      confidence: z.number(),
      reasoning: z.string(),
      typeLabel: z.string().optional(),
      metadata: z.object({}).optional(),
    }),
  ),
  requiresSeparateAnalysis: z.boolean(),
  rationale: z.string(),
});

export type ContextDetectionOutput = z.infer<typeof ContextDetectionOutputSchema>;

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Reserved context ID for evidence items that don't map to any detected context.
 * Exported for use in tests and other modules.
 */
export const UNASSIGNED_CONTEXT_ID = "CTX_UNASSIGNED";

// ============================================================================
// HEURISTIC CONTEXT PRE-DETECTION (v2.8)
// ============================================================================

/**
 * Detect potential analysis contexts from input text using heuristic patterns.
 * Returns suggested contexts to guide LLM, or null if no patterns match.
 *
 * Currently relies on LLM for context detection - heuristic pre-detection
 * is deferred to prompt guidance.
 *
 * @param text - Input text to analyze for context patterns
 * @returns null (LLM handles context detection)
 */
export function detectContextsHeuristic(_text: string, _config?: PipelineConfig): DetectedAnalysisContext[] | null {
  // Context detection is handled by the LLM in the UNDERSTAND phase
  // via prompt guidance in orchestrated-understand.ts
  return null;
}

/**
 * Detect analysis contexts using an LLM with semantic understanding.
 * Falls back to heuristic seeds on error or invalid output.
 */
export async function detectContextsLLM(
  text: string,
  heuristicSeeds: DetectedAnalysisContext[] | null,
  config: PipelineConfig,
): Promise<DetectedAnalysisContext[]> {
  const modelInfo = getModelForTask("understand", undefined, config);

  const seedHint = heuristicSeeds?.length
    ? `\n\nHEURISTIC SEED CONTEXTS (optional hints):\n${heuristicSeeds
        .map((s) => `- ${s.id}: ${s.name} (${s.type})`)
        .join("\n")}`
    : "";

  const systemPrompt = `You identify distinct AnalysisContexts for a claim.\n\nCRITICAL TERMINOLOGY:\n- Use "AnalysisContext" to mean top-level bounded analytical frames.\n- Use "EvidenceScope" only for per-source metadata (methodology/boundaries/time/geo).\n- Avoid the bare word "context" unless you explicitly mean AnalysisContext.\n\nINCOMPATIBILITY TEST: Split contexts ONLY if combining them would be MISLEADING because they evaluate fundamentally different things.\n\nWHEN TO SPLIT (only when clearly supported):\n- Different formal authorities (distinct institutional decision-makers)\n- Different measurement boundaries or system definitions\n- Different regulatory regimes or time periods that change the analytical frame\n\nDO NOT SPLIT ON:\n- Pro vs con viewpoints\n- Different evidence types\n- Incidental geographic/temporal mentions\n- Public perception or meta commentary\n- Third-party reactions/responses to X (when evaluating X itself)\n\nOUTPUT REQUIREMENTS:\n- Provide contexts as JSON array under 'contexts'.\n- Each context must include id, name, type, typeLabel, confidence (0-1), reasoning, metadata.\n- typeLabel: a short category label (e.g., "Electoral", "Scientific", "Regulatory", "General").\n- Use neutral, generic names tied to the input (no domain-specific hardcoding).${seedHint}`;

  const userPrompt = `Detect distinct AnalysisContexts for:\n\n${text}`;
  const isAnthropic = (config.llmProvider ?? DEFAULT_PIPELINE_CONFIG.llmProvider ?? "anthropic").toLowerCase() === "anthropic";
  const outputSchema = isAnthropic
    ? ContextDetectionOutputSchemaAnthropic
    : ContextDetectionOutputSchema;

  try {
    const result = await generateText({
      model: modelInfo.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: getDeterministicTemperature(0.2, config),
      output: Output.object({ schema: outputSchema }),
      providerOptions: getStructuredOutputProviderOptions(config.llmProvider ?? "anthropic"),
    });

    const output = extractStructuredOutput(result) as ContextDetectionOutput | null;
    if (!output || !Array.isArray(output.contexts)) {
      return heuristicSeeds || [];
    }

    // Normalize confidence values (Anthropic schema omits .min/.max bounds)
    for (const c of output.contexts) {
      c.confidence = Math.max(0, Math.min(1, c.confidence ?? 0));
    }

    const minConfidence =
      config.contextDetectionMinConfidence ?? 0.7;
    const maxContexts =
      config.contextDetectionMaxContexts ?? 5;

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
export async function detectContextsHybrid(
  text: string,
  config: PipelineConfig,
): Promise<DetectedAnalysisContext[] | null> {
  const detectionEnabled =
    config.contextDetectionEnabled;
  if (detectionEnabled === false) return null;

  const method =
    config.contextDetectionMethod ?? "heuristic";
  const heuristic = detectContextsHeuristic(text, config);

  if (method === "heuristic") return heuristic;

  const llmSeeds = method === "hybrid" ? heuristic : null;
  const llmContexts = await detectContextsLLM(text, llmSeeds, config);

  if (method === "llm") return llmContexts;

  return await mergeAndDeduplicateContexts(heuristic, llmContexts, config);
}

async function mergeAndDeduplicateContexts(
  heuristic: DetectedAnalysisContext[] | null,
  llmContexts: DetectedAnalysisContext[],
  config: PipelineConfig,
): Promise<DetectedAnalysisContext[]> {
  const merged = new Map<string, DetectedAnalysisContext>();

  for (const context of heuristic || []) {
    merged.set(context.id, {
      ...context,
      metadata: { ...(context.metadata || {}), detectionMethod: "heuristic" },
    });
  }

  for (const context of llmContexts) {
    merged.set(context.id, context);
  }

  const threshold =
    config.contextDedupThreshold ??
    0.85;
  const deduplicated: DetectedAnalysisContext[] = [];

  // LLM-powered context name deduplication
  const mergedContexts = Array.from(merged.values());
  const dedupPairs: Array<{ id: string; textA: string; textB: string }> = [];
  for (let i = 0; i < mergedContexts.length; i++) {
    for (let j = 0; j < i; j++) {
      dedupPairs.push({
        id: `cd-${i}-${j}`,
        textA: mergedContexts[i].name,
        textB: mergedContexts[j].name,
      });
    }
  }
  const dedupScores = await assessContextNameSimilarityBatch(dedupPairs);
  for (const context of mergedContexts) {
    const idx = mergedContexts.indexOf(context);
    const isDuplicate = deduplicated.some((existing) => {
      const existIdx = mergedContexts.indexOf(existing);
      const pairId = idx > existIdx ? `cd-${idx}-${existIdx}` : `cd-${existIdx}-${idx}`;
      return (dedupScores.get(pairId) ?? 0) >= threshold;
    });
    if (!isDuplicate) deduplicated.push(context);
  }

  return deduplicated.sort((a, b) => {
    const aConf = (a.metadata?.confidence as number) ?? 0.5;
    const bConf = (b.metadata?.confidence as number) ?? 0.5;
    return bConf - aConf;
  });
}

/**
 * LLM-powered context name similarity assessment (batch).
 * Falls back to Jaccard similarity on LLM failure.
 */
async function assessContextNameSimilarityBatch(
  pairs: Array<{ id: string; textA: string; textB: string }>,
): Promise<Map<string, number>> {
  if (pairs.length === 0) return new Map();

  const modelInfo = getModelForTask("extract_evidence"); // Haiku tier
  try {
    const pairTexts = pairs
      .map((p, i) => `[${i}] A: "${p.textA.slice(0, 200)}" | B: "${p.textB.slice(0, 200)}"`)
      .join("\n");

    const result = await generateText({
      model: modelInfo.model,
      messages: [{
        role: "user",
        content: `Rate the semantic similarity of each analysis context name pair below on a scale from 0.0 (completely different topics) to 1.0 (same topic, possibly paraphrased).

Pairs:
${pairTexts}

Return ONLY a JSON array of numbers (0.0 to 1.0), one per pair. No explanation.`,
      }],
      temperature: 0,
    });

    let text = result.text.trim();
    text = text.replace(/^```json?\s*/i, "").replace(/```\s*$/i, "");
    const scores = JSON.parse(text);

    if (Array.isArray(scores) && scores.length === pairs.length) {
      const map = new Map<string, number>();
      for (let i = 0; i < pairs.length; i++) {
        const score = typeof scores[i] === "number" ? Math.max(0, Math.min(1, scores[i])) : 0;
        map.set(pairs[i].id, score);
      }
      return map;
    }
  } catch {
    // LLM call failed — structural fallback
  }

  // Structural fallback: Jaccard similarity
  const normalize = (s: string) =>
    (s || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length > 2);
  const map = new Map<string, number>();
  for (const pair of pairs) {
    const words1 = new Set(normalize(pair.textA));
    const words2 = new Set(normalize(pair.textB));
    if (words1.size === 0 || words2.size === 0) { map.set(pair.id, 0); continue; }
    const intersection = new Set([...words1].filter((w) => words2.has(w)));
    const union = new Set([...words1, ...words2]);
    map.set(pair.id, union.size === 0 ? 0 : intersection.size / union.size);
  }
  return map;
}

/**
 * Backward-compatible synchronous wrapper for deterministic seed logic.
 */
export function detectContexts(text: string, _config?: PipelineConfig): DetectedAnalysisContext[] | null {
  return detectContextsHeuristic(text);
}

/**
 * Format detected contexts as a hint string for LLM prompts.
 *
 * @param contexts - Array of detected contexts
 * @param detailed - If true, include metadata and MUST instruction
 * @returns Formatted string for prompt injection (empty string if no contexts)
 */
export function formatDetectedContextsHint(contexts: DetectedAnalysisContext[] | null, detailed: boolean = false): string {
  if (!contexts || contexts.length === 0) return '';

  const lines = contexts.map(c =>
    detailed
      ? `- ${c.id}: ${c.name} (${c.type}) ${JSON.stringify(c.metadata || {})}`
      : `- ${c.id}: ${c.name} (${c.type})`
  );

  const instruction = detailed
    ? `\n\nIMPORTANT: These are SEED AnalysisContexts detected by heuristic patterns. You MUST output at least these contexts in your analysisContexts array, and you MUST preserve their IDs as listed (you may refine names/metadata or add additional contexts if warranted).`
    : '';

  return `\n\nPRE-DETECTED CONTEXTS (use as seed${detailed ? ' AnalysisContexts' : ''}, refine based on evidence):\n${lines.join('\n')}${instruction}`;
}

// ============================================================================
// INPUT CANONICALIZATION FOR CONTEXT DETECTION (v2.8.2)
// ============================================================================

/**
 * Canonicalize input text for context detection to ensure consistent context
 * identification regardless of input phrasing (question vs statement).
 *
 * This addresses the input neutrality issue where:
 * - "Was the legal proceeding fair?" detected 3 contexts
 * - "The legal proceeding was fair" detected 4 contexts
 *
 * The function normalizes both phrasings to the same canonical form for
 * context detection purposes.
 *
 * @param input - Raw or pre-normalized input text
 * @returns Canonical form for context detection
 */
export function canonicalizeInputForContextDetection(input: string, pipelineConfig?: PipelineConfig): string {
  void pipelineConfig;
  let text = String(input || "")
    .trim()
    .replace(/[?!.]+$/, "")
    .replace(/\s+/g, " ")
    .trim();

  // Normalize case for consistency (lowercase for comparison)
  const contextKey = text.toLowerCase();

  console.log(`[Context Canonicalization] Input: "${input.substring(0, 60)}..."`);
  console.log(`[Context Canonicalization] Canonical: "${contextKey.substring(0, 60)}..."`);

  return contextKey;
}

/**
 * Extract core semantic entities from text for context matching.
 * These are the key nouns/proper nouns that define what the input is about.
 *
 * CRITICAL: This function MUST receive the original-case text (before lowercasing)
 * to properly detect proper nouns via capitalization patterns.
 */
function extractCoreEntities(text: string): string[] {
  // Look for proper nouns (capitalized words that aren't sentence-start)
  // Matches single words (Einstein) and multi-word names (Angela Merkel)
  const properNouns = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];

  // Deduplicate and normalize to lowercase
  return [...new Set(properNouns.map(n => n.toLowerCase()))];
}

/**
 * Generate a context detection hint based on the original input text.
 * This helps guide the LLM to detect consistent contexts regardless of phrasing.
 *
 * IMPORTANT: Pass the ORIGINAL text (not lowercased) so proper nouns are detected.
 */
export function generateContextDetectionHint(originalInput: string): string {
  const entities = extractCoreEntities(originalInput);

  if (entities.length === 0) {
    return '';
  }

  // Build a hint that emphasizes what contexts to look for
  const hint = `
CONTEXT DETECTION HINT (for input neutrality):
Focus on detecting contexts related to these core entities: ${entities.join(', ')}.
Do NOT detect contexts based on:
- Whether the input is phrased as a question or statement
- Public perception/opinion contexts (unless explicitly mentioned in input)
- Meta-level contexts about "trust" or "confidence" in institutions (unless core topic)
Focus on concrete, factual contexts (legal proceedings, regulatory reviews, methodological frameworks).
`;
  return hint;
}

// ============================================================================
// DETERMINISTIC CONTEXT ID GENERATION
// ============================================================================

/**
 * Simple deterministic hash function for context IDs.
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
 * Generate a deterministic context ID from context properties.
 * Format: {INST}_{hash} or CTX_{hash}
 *
 * Examples:
 * - TSE_a3f2 (has institution code)
 * - WTW_d9e8 (methodology acronym)
 * - CTX_f7a29b3c (no clear institution)
 *
 * @param context - AnalysisContext object with name, description, metadata
 * @param inst - Institution code (if detected)
 * @param idx - Index for fallback (only used if no other identifier available)
 * @returns Deterministic context ID
 */
function generateDeterministicContextId(
  context: any,
  inst: string | null,
  idx: number
): string {
  // Create stable input for hashing
  const hashInput = JSON.stringify({
    name: String(context.name || "").toLowerCase().trim(),
    description: String(context.description || "").toLowerCase().trim().slice(0, 100),
    court: String(context.metadata?.court || "").toLowerCase().trim(),
    institution: String(context.metadata?.institution || "").toLowerCase().trim(),
    subject: String(context.subject || "").toLowerCase().trim().slice(0, 100),
  });

  // Generate 8-char hash
  const fullHash = simpleHash(hashInput);
  const shortHash = fullHash.slice(0, 4); // Use first 4 chars for readability

  // Return hybrid format: preserve institution code + short hash for uniqueness
  if (inst && inst.length > 0) {
    return `${inst}_${shortHash}`;
  }

  // Fallback: CTX_{hash}
  return `CTX_${fullHash}`;
}

/**
 * Canonicalize contexts in an understanding object.
 * Thin wrapper around canonicalizeContextsWithRemap that discards the ID remap.
 */
export function canonicalizeContexts(
  input: string,
  understanding: any,
): any {
  return canonicalizeContextsWithRemap(input, understanding).understanding;
}

export function canonicalizeContextsWithRemap(
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
    const al = inferContextTypeLabel(a);
    const bl = inferContextTypeLabel(b);
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
  // Trust the LLM's status if it produced a non-unknown value.
  // Previously used hardcoded legal keywords (sentenced, convicted, acquitted, etc.)
  // which violated AGENTS.md "No hardcoded keywords" rule.

  const canonicalContexts = sorted.map((p: any, idx: number) => {
    const typeLabel = inferContextTypeLabel(p);
    const inst = detectInstitutionCode(p);
    // Generate deterministic ID (PR 3: Pipeline Redesign)
    let newId = generateDeterministicContextId(p, inst, idx);
    // Handle collisions (extremely rare with hash-based IDs)
    if (usedIds.has(newId)) newId = `${newId}_${idx + 1}`;
    usedIds.add(newId);
    idRemap.set(p.id, newId);
    const rawName = String(p?.name || "").trim();
    const rawShort = String(p?.shortName || "").trim();
    const inferredShortFromName = extractAllCapsToken(rawName);
    const toAcronym = inferToAcronym(rawName);
    // Detect generic names using the LLM-provided typeLabel instead of hardcoded domain terms.
    // A name is generic if it's empty, just "General", or matches "<typeLabel> context/proceeding".
    const nameLower = rawName.toLowerCase();
    const isGenericName =
      rawName.length === 0 ||
      /^general$/i.test(rawName) ||
      (typeLabel && nameLower === `${typeLabel.toLowerCase()} context`) ||
      (typeLabel && nameLower === `${typeLabel.toLowerCase()} proceeding`) ||
      /^\w+\s+(context|proceeding|analysis|assessment)$/i.test(rawName);
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
      status: (p.status && p.status !== "unknown") ? p.status : "unknown",
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

export function ensureAtLeastOneContext(
  understanding: any,
): any {
  if (!understanding) return understanding;
  const contexts = Array.isArray(understanding.analysisContexts)
    ? understanding.analysisContexts
    : [];
  if (contexts.length > 0) return understanding;
  // Generate a deterministic ID even for the fallback context
  const fallbackContext = {
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
        ...fallbackContext,
        id: generateDeterministicContextId(fallbackContext, null, 0),
      },
    ],
    requiresSeparateAnalysis: false,
  };
}

// ============================================================================
// CONTEXT HELPERS
// ============================================================================
