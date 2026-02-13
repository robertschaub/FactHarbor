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
import { getModelForTask, extractStructuredOutput, getStructuredOutputProviderOptions, getPromptCachingOptions } from "./llm";
import { getDeterministicTemperature } from "./config";
import { DEFAULT_PIPELINE_CONFIG, type PipelineConfig } from "../config-schemas";
import { loadAndRenderSection } from "./prompt-loader";

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

async function renderOrchestratedSection(
  sectionName: string,
  variables: Record<string, string>,
): Promise<string> {
  const rendered = await loadAndRenderSection("orchestrated", sectionName, variables);
  if (!rendered?.content?.trim()) {
    throw new Error(`Missing or empty orchestrated prompt section: ${sectionName}`);
  }
  return rendered.content;
}

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
  const isAnthropic = (config.llmProvider ?? DEFAULT_PIPELINE_CONFIG.llmProvider ?? "anthropic").toLowerCase() === "anthropic";
  const outputSchema = isAnthropic
    ? ContextDetectionOutputSchemaAnthropic
    : ContextDetectionOutputSchema;

  try {
    const systemPrompt = await renderOrchestratedSection("ANALYSIS_CONTEXT_DETECTION_SYSTEM", {
      SEED_HINT: seedHint,
    });
    const userPrompt = await renderOrchestratedSection("ANALYSIS_CONTEXT_DETECTION_USER", {
      INPUT_TEXT: text,
    });

    const result = await generateText({
      model: modelInfo.model,
      messages: [
        { role: "system", content: systemPrompt, providerOptions: getPromptCachingOptions(config.llmProvider) },
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
 * Returns missing scores on LLM failure (callers apply explicit defaults).
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
    const prompt = await renderOrchestratedSection("ANALYSIS_CONTEXT_SIMILARITY_BATCH_USER", {
      PAIR_TEXTS: pairTexts,
    });

    const result = await generateText({
      model: modelInfo.model,
      messages: [{
        role: "user",
        content: prompt,
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
  } catch (err) {
    console.warn("[assessContextNameSimilarityBatch] LLM call failed; leaving scores unset", err);
  }
  return new Map();
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
    // Detect generic names using structural signals only (no language-specific token lists).
    const nameLower = rawName.toLowerCase();
    const idLower = String(p?.id || "").toLowerCase();
    const typeLower = String(typeLabel || "").toLowerCase();
    const isGenericName =
      rawName.length === 0 ||
      nameLower === idLower ||
      (typeLower.length > 0 && nameLower === typeLower);
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
