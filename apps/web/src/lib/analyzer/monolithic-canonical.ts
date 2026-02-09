/**
 * Monolithic Canonical Pipeline (PR 3)
 *
 * Single-context analysis that produces output conforming to the
 * canonical FactHarbor schema. Uses iterative structured output calls
 * to perform research and generate verdicts.
 *
 * Key features:
 * - Budget enforcement (maxIterations, maxSearches, timeout)
 * - Canonical schema validation
 * - Full UI compatibility with orchestrated pipeline
 * - Automatic fallback on failure
 *
 * @module analyzer/monolithic-canonical
 */

import { generateText, Output } from "ai";
import { z } from "zod";
import { getModel, getModelForTask } from "./llm";
import { CONFIG, getDeterministicTemperature } from "./config";
import { DEFAULT_PIPELINE_CONFIG, DEFAULT_SR_CONFIG } from "@/lib/config-schemas";
import {
  createBudgetTracker,
  getBudgetConfig,
  recordLLMCall,
  getBudgetStats,
} from "./budgets";
import { searchWebWithProvider } from "../web-search";
import { extractTextFromUrl } from "../retrieval";
import { percentageToClaimVerdict, getHighlightColor } from "./truth-scale";
import { filterEvidenceByProvenance } from "./provenance-validation";
import type { EvidenceItem } from "./types";
import { buildPrompt, detectProvider, isBudgetModel } from "./prompts/prompt-builder";
import { loadPromptFile, type Pipeline } from "./prompt-loader";
import { getConfig, recordConfigUsage } from "@/lib/config-storage";
import { loadPipelineConfig, loadSearchConfig, type PipelineConfig } from "@/lib/config-loader";
import { normalizeClaimText, deriveCandidateClaimTexts } from "./claim-decomposition";
import { calculateWeightedVerdictAverage } from "./aggregation";
import { detectContexts, formatDetectedContextsHint } from "./analysis-contexts";
import {
  prefetchSourceReliability,
  getTrackRecordData,
  clearPrefetchedScores,
  calculateEffectiveWeight,
  DEFAULT_UNKNOWN_SOURCE_SCORE,
  SR_CONFIG,
  setSourceReliabilityConfig,
} from "./source-reliability";
import {
  getTextAnalysisService,
  isLLMEnabled,
  type InputClassificationResult,
  type EvidenceItemInput,
  type EvidenceQualityResult,
  type VerdictValidationResult as TextAnalysisVerdictResult,
} from "./text-analysis-service";

function normalizeForContainsMatch(text: string): string {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeForLooseContainsMatch(text: string): string {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildHeuristicSubClaims(
  input: string,
  existingTexts: Set<string>,
  maxClaims = 4,
): Array<{ text: string }> {
  const candidates = deriveCandidateClaimTexts(input)
    .filter((c) => !existingTexts.has(normalizeClaimText(c)))
    .slice(0, maxClaims);

  return candidates.map((text) => ({ text }));
}

function excerptAppearsInContent(excerpt: string, content: string): boolean {
  const ex = String(excerpt || "").trim();
  if (ex.length < 24) return false; // too short to validate reliably
  const c = String(content || "");
  if (!c) return false;
  const nEx = normalizeForContainsMatch(ex);
  const nC = normalizeForContainsMatch(c);
  if (nEx && nC.includes(nEx)) return true;
  const lEx = normalizeForLooseContainsMatch(ex);
  const lC = normalizeForLooseContainsMatch(c);
  if (!lEx) return false;
  return lC.includes(lEx);
}

// ============================================================================
// TYPES
// ============================================================================

export type MonolithicAnalysisInput = {
  inputType: "text" | "url";
  inputValue: string;
  onEvent?: (message: string, progress: number) => void | Promise<void>;
  jobId?: string;
};

/** Budget configuration specific to monolithic pipeline */
interface MonolithicBudget {
  maxIterations: number;
  maxSearches: number;
  maxFetches: number;
  timeoutMs: number;
}

// Local helper types for internal processing (not extending FetchedSource to avoid required field conflicts)
interface MonolithicSource {
  id: string;
  url: string;
  title: string;
  snippet: string;
  content: string;
  fetchSuccess: boolean;
  fetchedAt: string;
  contentLength: number;
  // v2.6.35: Source Reliability
  trackRecordScore: number | null;
  trackRecordConfidence: number | null;
  trackRecordConsensus: boolean | null;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const MONOLITHIC_BUDGET: MonolithicBudget = {
  maxIterations: 5,
  maxSearches: 8,
  maxFetches: 10,
  timeoutMs: 180_000, // 3 minutes
};
const MAX_CLAIMS_FOR_VERDICTS = 4;

// ============================================================================
// SCHEMAS
// ============================================================================

const SubClaimSchema = z.object({
  id: z.string().optional(),
  text: z.string(),
  claimRole: z.enum(["attribution", "source", "timing", "core", "unknown"]).optional(),
  harmPotential: z.enum(["high", "medium", "low"]).optional().describe("High for death/injury/safety claims"),
  centrality: z.enum(["high", "medium", "low"]).optional(),
  thesisRelevance: z.enum(["direct", "tangential", "irrelevant"]).optional(),
});

const ClaimExtractionSchema = z.object({
  mainClaim: z.string().describe("The primary factual claim to verify"),
  claimType: z.enum(["factual", "opinion", "prediction", "mixed"]),
  searchQueries: z
    .array(z.string())
    .min(2)
    .max(8)
    .describe("Search queries to find evidence (include both supporting and contradicting)"),
  subClaims: z.array(SubClaimSchema).optional(),
  analysisContexts: z.array(z.object({
    id: z.string().describe("Short ID like 'CTX_A', 'CTX_B'"),
    name: z.string().describe("Human-readable name"),
    type: z.enum(["legal", "scientific", "methodological", "general"]),
  })).optional().describe("Distinct AnalysisContexts detected (preferred field)"),
  backgroundDetails: z.string().optional().describe("Article background details (NOT an AnalysisContext)"),
  requiresSeparateAnalysis: z.boolean().optional().describe("True if input involves multiple distinct AnalysisContexts that should be analyzed separately"),
});

const EvidenceExtractionSchema = z.object({
  evidenceItems: z.array(
    z.object({
      statement: z.string().optional(),
      sourceUrl: z.string().optional(),
      sourceTitle: z.string().optional(),
      sourceExcerpt: z.string().optional(),
      category: z.enum([
        "evidence",
        "direct_evidence",
        "expert_quote",
        "statistic",
        "event",
        "legal_provision",
        "criticism",
      ]).optional(),
      claimDirection: z.enum(["supports", "contradicts", "neutral"]).optional(),
      probativeValue: z.enum(["high", "medium", "low"]).optional(),
      specificity: z.enum(["high", "medium"]).optional(),
      contextId: z.string().optional(),
      evidenceScope: z.any().optional(),
      sourceAuthority: z.enum(["primary", "secondary", "opinion", "contested"]).optional(),
      evidenceBasis: z.enum(["scientific", "documented", "anecdotal", "theoretical", "pseudoscientific"]).optional(),
    })
  ).optional(),
  needsMoreResearch: z.boolean().describe("True if more searches would help"),
  suggestedQuery: z.string().optional().describe("Next search query if more research needed"),
});

const VerdictSchema = z.object({
  claim: z.string().describe("The claim being evaluated"),
  verdict: z.number().min(0).max(100).describe("Truth percentage (0=false, 50=mixed, 100=true)"),
  confidence: z.number().min(0).max(100).describe("Confidence in the verdict"),
  reasoning: z.string().describe("Detailed reasoning for the verdict (2-4 sentences)"),
  summary: z.string().describe("One-sentence summary"),
  keyEvidenceIds: z.array(z.string()).optional().describe("IDs of most important evidence items"),
  analysisContexts: z
    .array(
      z.object({
        id: z.string().describe("Unique short ID, e.g., 'CTX_TSE'"),
        name: z.string().describe("Human-readable name, e.g., 'TSE Electoral Case'"),
        subject: z.string().describe("The specific subject of this context"),
        type: z.enum(["legal", "scientific", "methodological", "general"]),
      })
    )
    .optional()
    .describe("List of distinct analytical frames detected (preferred field)"),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Safely extract structured output from AI SDK result
 */
function extractStructuredOutput(result: any): any {
  if (!result) return null;

  // Try various paths where output might be
  if (result.output?.value !== undefined) return result.output.value;
  if (result.output !== undefined && typeof result.output !== "function") return result.output;
  if (result._output !== undefined) return result._output;
  if (result.experimental_output !== undefined) return result.experimental_output;
  if (result.object !== undefined) return result.object;

  return null;
}

function normalizeAnalysisContexts(raw: any, source: string): any[] {
  if (Array.isArray(raw?.analysisContexts) && raw.analysisContexts.length > 0) {
    return raw.analysisContexts;
  }
  return [];
}

function normalizeBackgroundDetails(raw: any, source: string): string {
  return typeof raw?.backgroundDetails === "string" ? raw.backgroundDetails : "";
}

type EvidenceExtractionOutput = {
  evidenceItems: Array<Record<string, any>>;
  needsMoreResearch: boolean;
  suggestedQuery?: string;
};

function normalizeEvidenceExtraction(raw: any, source: string): EvidenceExtractionOutput {
  const rawItems = Array.isArray(raw?.evidenceItems) ? raw.evidenceItems : [];

  const evidenceItems = rawItems.map((item: any) => ({
    statement: item.statement ?? "",
    sourceUrl: item.sourceUrl ?? "",
    sourceTitle: item.sourceTitle ?? "",
    sourceExcerpt: item.sourceExcerpt ?? "",
    category: item.category ?? "evidence",
    claimDirection: item.claimDirection ?? "neutral",
    probativeValue: item.probativeValue,
    specificity: item.specificity,
    contextId: item.contextId,
    evidenceScope: item.evidenceScope,
    sourceAuthority: item.sourceAuthority,
    evidenceBasis: item.evidenceBasis,
  }));

  return {
    evidenceItems,
    needsMoreResearch: !!raw?.needsMoreResearch,
    suggestedQuery: raw?.suggestedQuery,
  };
}

function normalizeEvidenceId(id: string, source: string): string {
  if (!id || typeof id !== "string") return "";
  const normalized = id.replace(/(^|-)F(\d+)/g, "$1E$2");
  if (normalized !== id) {
    console.warn(`[${source}] Legacy F-prefix evidence ID "${id}" detected; use "${normalized}"`);
  }
  return normalized;
}

function normalizeEvidenceIdList(ids: string[], source: string): string[] {
  return ids
    .map((id) => normalizeEvidenceId(String(id ?? ""), source))
    .filter((id) => id.length > 0);
}

function normalizeKeyEvidenceIds(raw: any, source: string): string[] {
  if (Array.isArray(raw?.keyEvidenceIds) && raw.keyEvidenceIds.length > 0) {
    return normalizeEvidenceIdList(raw.keyEvidenceIds, source);
  }
  return [];
}

/**
 * Extract claim and generate search queries
 */
async function extractClaim(
  model: any,
  text: string,
  pipelineConfig: PipelineConfig | null,
  onEvent?: (msg: string, progress: number) => void | Promise<void>
): Promise<z.infer<typeof ClaimExtractionSchema>> {
  if (onEvent) await onEvent("Analyzing claim", 10);

  // v2.8: Pre-detect contexts using heuristics (shared implementation from analysis-contexts.ts)
  const preDetectedContexts = detectContexts(text);

  // v2.9: LLM Text Analysis - Classify input
  let inputClassification: InputClassificationResult | null = null;
  try {
    const textAnalysisService = getTextAnalysisService({
      pipelineConfig: pipelineConfig ?? undefined,
    });
    inputClassification = await textAnalysisService.classifyInput({
      inputText: text,
      pipeline: "monolithic-canonical",
    });
    console.log("[MonolithicCanonical] inputClassification:", {
      isComparative: inputClassification.isComparative,
      isCompound: inputClassification.isCompound,
      claimType: inputClassification.claimType,
      complexity: inputClassification.complexity,
      decomposedClaimsCount: inputClassification.decomposedClaims.length,
    });
  } catch (err) {
    console.log("[MonolithicCanonical] inputClassification failed, using inline heuristics:", err instanceof Error ? err.message : String(err));
  }

  let understandPrompt = buildPrompt({
    task: 'understand',
    provider: detectProvider(model.modelId || ''),
    modelName: model.modelId || '',
    config: {
      allowModelKnowledge: pipelineConfig?.allowModelKnowledge ?? DEFAULT_PIPELINE_CONFIG.allowModelKnowledge,
      isLLMTiering: pipelineConfig ? pipelineConfig.llmTiering : false,
      isBudgetModel: isBudgetModel(model.modelId || ''),
    },
    variables: {
      currentDate: new Date().toISOString().split('T')[0],
      isRecent: false, // TODO: Add recency detection
    },
  });

  // v2.8: Append pre-detected contexts hint to prompt (using shared formatter)
  understandPrompt += formatDetectedContextsHint(preDetectedContexts);

  const outputConfig = Output.object({ schema: ClaimExtractionSchema });

  const result = await generateText({
    model,
    messages: [
      {
        role: "system",
        content: understandPrompt,
      },
      { role: "user", content: text },
    ],
    temperature: getDeterministicTemperature(0.1, pipelineConfig ?? undefined),
    output: outputConfig as any,
  });

  const output = extractStructuredOutput(result);
  const parsed = ClaimExtractionSchema.parse(output) as z.infer<typeof ClaimExtractionSchema>;
  return {
    ...parsed,
    analysisContexts: normalizeAnalysisContexts(parsed, "MonolithicCanonical.extractClaim"),
    backgroundDetails: normalizeBackgroundDetails(parsed, "MonolithicCanonical.extractClaim"),
  } as z.infer<typeof ClaimExtractionSchema>;
}

/**
 * Extract evidence items from source content
 */
async function extractEvidence(
  model: any,
  claim: string,
  claimType: string | null,
  limitationNote: string | null,
  sourceContents: Array<{ url: string; title: string; content: string }>,
  existingEvidenceItemCount: number,
  pipelineConfig: PipelineConfig | null,
  onEvent?: (msg: string, progress: number) => void | Promise<void>
): Promise<EvidenceExtractionOutput> {
  if (onEvent) await onEvent("Extracting evidence items from sources", 40);

  const sourceSummary = sourceContents
    .map((s, i) => `[Source ${i + 1}] ${s.title}\nURL: ${s.url}\n\n${s.content.slice(0, 5000)}`)
    .join("\n\n---\n\n");

  const extractEvidencePrompt = buildPrompt({
    task: 'extract_evidence',
    provider: detectProvider(model.modelId || ''),
    modelName: model.modelId || '',
    config: {
      allowModelKnowledge: pipelineConfig?.allowModelKnowledge ?? DEFAULT_PIPELINE_CONFIG.allowModelKnowledge,
      isLLMTiering: pipelineConfig ? pipelineConfig.llmTiering : false,
      isBudgetModel: isBudgetModel(model.modelId || ''),
    },
    variables: {
      currentDate: new Date().toISOString().split('T')[0],
      originalClaim: claim,
      contextsList: 'No contexts defined yet',
    },
  });

  const outputConfig = Output.object({ schema: EvidenceExtractionSchema });

  const result = await generateText({
    model,
    messages: [
      {
        role: "system",
        content: extractEvidencePrompt,
      },
      {
        role: "user",
        content: `CLAIM TO VERIFY: ${claim}\n\nSOURCES:\n${sourceSummary}\n\nExisting evidence item count: ${existingEvidenceItemCount}.\n\nRules:\n- Extract ONLY verifiable statements that are supported by the source text.\n- The excerpt MUST be a verbatim quote (or near-verbatim) from the source content.\n- If you cannot quote the source, do NOT include that evidence item.\n- If more research would help, set needsMoreResearch=true.`,
      },
    ],
    temperature: getDeterministicTemperature(0.1, pipelineConfig ?? undefined),
    output: outputConfig as any,
  });

  const output = extractStructuredOutput(result);
  const parsed = EvidenceExtractionSchema.parse(output) as z.infer<typeof EvidenceExtractionSchema>;
  const normalized = normalizeEvidenceExtraction(parsed, "MonolithicCanonical.extractEvidence");

  // v2.9: LLM Text Analysis - Evidence Quality Assessment
  const useLLMEvidenceQuality = isLLMEnabled("evidence");
  if (useLLMEvidenceQuality && normalized.evidenceItems.length > 0) {
    try {
      const evidenceInputs: EvidenceItemInput[] = normalized.evidenceItems.map((f, idx) => ({
        evidenceId: `E${idx + 1}`,
        statement: f.statement,
        excerpt: f.sourceExcerpt,
        sourceUrl: f.sourceUrl,
        category: f.category,
      }));

      const textAnalysisService = getTextAnalysisService({
        pipelineConfig: pipelineConfig ?? undefined,
      });
      const qualityResults = await textAnalysisService.assessEvidenceQuality({
        evidenceItems: evidenceInputs,
        thesisText: claim,
      });

      // Build a map of quality assessments
      const qualityMap = new Map<string, EvidenceQualityResult>();
      for (const qr of qualityResults) {
        qualityMap.set(qr.evidenceId, qr);
      }

      // Filter out "filter" quality items
      const filteredEvidence = normalized.evidenceItems.filter((_, idx) => {
        const qr = qualityMap.get(`E${idx + 1}`);
        return !qr || qr.qualityAssessment !== "filter";
      });

      const filteredCount = normalized.evidenceItems.length - filteredEvidence.length;
      if (filteredCount > 0) {
        console.log(`[MonolithicCanonical] Evidence quality filter: removed ${filteredCount}/${normalized.evidenceItems.length} low-quality evidence items`);
      }

      return {
        ...normalized,
        evidenceItems: filteredEvidence,
      };
    } catch (err) {
      console.log("[MonolithicCanonical] Evidence quality assessment failed, using all evidence items:", err instanceof Error ? err.message : String(err));
    }
  }

  return normalized;
}

/**
 * Generate final verdict
 */
async function generateVerdict(
  model: any,
  claim: string,
  claimType: string | null,
  limitationNote: string | null,
  evidenceItems: EvidenceItem[],
  pipelineConfig: PipelineConfig | null,
  onEvent?: (msg: string, progress: number) => void | Promise<void>
): Promise<z.infer<typeof VerdictSchema>> {
  if (onEvent) await onEvent("Generating verdict", 80);

  const evidenceSummary = evidenceItems
    .map(
      (f) =>
        `[${f.id}] ${(f.claimDirection || "neutral").toUpperCase()}: ${f.statement}\n   Category: ${f.category}\n   Source: ${f.sourceTitle}`
    )
    .join("\n\n");

  const verdictPrompt = buildPrompt({
    task: 'verdict',
    provider: detectProvider(model.modelId || ''),
    modelName: model.modelId || '',
    config: {
      // Monolithic canonical is intended to be evidence-grounded; do not allow
      // training-data assertions to substitute for provenance.
      allowModelKnowledge: false,
      isLLMTiering: pipelineConfig ? pipelineConfig.llmTiering : false,
      isBudgetModel: isBudgetModel(model.modelId || ''),
    },
    variables: {
      currentDate: new Date().toISOString().split('T')[0],
      originalClaim: claim,
      contextsList: 'Single context analysis',
    },
  });

  const outputConfig = Output.object({ schema: VerdictSchema });

  const result = await generateText({
    model,
    messages: [
      {
        role: "system",
        content: verdictPrompt,
      },
      {
        role: "user",
        content: `CLAIM: ${claim}\n\nEVIDENCE (${evidenceItems.length} items):\n${evidenceSummary}\n\nRules:\n- Use ONLY the evidence items above.\n- Do NOT introduce new statements, institutions, outcomes, or dates not present in the evidence list.\n- If evidence is insufficient or conflicting, keep confidence low and explain the gap.`,
      },
    ],
    temperature: getDeterministicTemperature(0.1, pipelineConfig ?? undefined),
    output: outputConfig as any,
  });

  const output = extractStructuredOutput(result);
  let parsed = VerdictSchema.parse(output) as z.infer<typeof VerdictSchema>;
  parsed = {
    ...parsed,
    keyEvidenceIds: normalizeKeyEvidenceIds(parsed, "MonolithicCanonical.generateVerdict"),
  };

  // v2.9: LLM Text Analysis - Verdict Validation
  const useLLMVerdictValidation = isLLMEnabled("verdict");
  if (useLLMVerdictValidation) {
    try {
      const textAnalysisService = getTextAnalysisService({
        pipelineConfig: pipelineConfig ?? undefined,
      });
      const validationResults = await textAnalysisService.validateVerdicts({
        thesis: claim,
        claimVerdicts: [{
          claimId: "V1",
          claimText: parsed.claim,
          verdictPct: parsed.verdict,
          reasoning: parsed.reasoning,
        }],
        evidenceSummary: evidenceSummary.slice(0, 2000),
        mode: "full",
      });

      if (validationResults.length > 0) {
        const validation = validationResults[0];

        // Apply inversion correction if detected
        if (validation.isInverted && validation.suggestedCorrection !== null && validation.suggestedCorrection !== undefined) {
          console.log(`[MonolithicCanonical] Verdict inversion detected: ${parsed.verdict}% -> ${validation.suggestedCorrection}%`);
          parsed = {
            ...parsed,
            verdict: validation.suggestedCorrection,
            reasoning: parsed.reasoning + ` [Note: Original verdict was inverted and corrected from ${parsed.verdict}% to ${validation.suggestedCorrection}%]`,
          };
        }

        // Log validation results
        console.log("[MonolithicCanonical] Verdict validation:", {
          harmPotential: validation.harmPotential,
          isContested: validation.contestation?.isContested,
          factualBasis: validation.contestation?.factualBasis,
          isCounterClaim: validation.isCounterClaim,
        });
      }
    } catch (err) {
      console.log("[MonolithicCanonical] Verdict validation failed:", err instanceof Error ? err.message : String(err));
    }
  }

  return parsed;
}

// ============================================================================
// MAIN FUNCTION
// ============================================================================

/**
 * Run claim verification analysis using a monolithic approach with canonical schema output.
 */
export async function runMonolithicCanonical(
  input: MonolithicAnalysisInput
): Promise<{ resultJson: any; reportMarkdown: string }> {
  const startTime = Date.now();
  // We use tiered models below instead of a single getModel()
  const [pipelineResult, searchResult] = await Promise.all([
    loadPipelineConfig("default", input.jobId),
    loadSearchConfig("default", input.jobId),
  ]);
  const pipelineConfig = pipelineResult.config;
  const searchConfig = searchResult.config;
  const monolithicBudget = {
    ...MONOLITHIC_BUDGET,
    timeoutMs: pipelineConfig.monolithicCanonicalTimeoutMs ?? MONOLITHIC_BUDGET.timeoutMs,
  };
  const budgetConfig = getBudgetConfig(pipelineConfig);
  const budgetTracker = createBudgetTracker();

  let srConfig = DEFAULT_SR_CONFIG;
  try {
    const srResult = await getConfig("sr", "default", { jobId: input.jobId });
    srConfig = srResult.config;
  } catch (err) {
    console.warn(
      "[Config] Failed to load SR config, using defaults:",
      err instanceof Error ? err.message : String(err),
    );
  }

  setSourceReliabilityConfig(srConfig);

  // v2.6.35: Clear source reliability cache at start of analysis
  clearPrefetchedScores();

  // External Prompt File System: Track prompt version per job
  try {
    const pipelineName: Pipeline = "monolithic-canonical";
    const promptResult = await loadPromptFile(pipelineName);
    if (promptResult.success && promptResult.prompt) {
      if (input.jobId) {
        await recordConfigUsage(
          input.jobId,
          "prompt",
          pipelineName,
          promptResult.prompt.contentHash,
        ).catch(() => {});
      }
      console.log(`[Prompt-Tracking] Loaded monolithic-canonical prompt (hash: ${promptResult.prompt.contentHash.substring(0, 12)}...)`);
    }
  } catch (err: any) {
    console.warn(`[Prompt-Tracking] Error loading prompt file (non-fatal): ${err?.message}`);
  }

  // State tracking
  const evidenceItems: EvidenceItem[] = [];
  let droppedEvidenceCount = 0; // Track excerpt-validation rejections for diagnostics
  const sources: MonolithicSource[] = [];
  const searchQueriesWithResults: Array<{ query: string; resultsCount: number }> = [];
  let searchCount = 0;
  let fetchCount = 0;

  if (input.onEvent) {
    await input.onEvent("Starting monolithic analysis", 5);
  }

  // Prepare input text
  let textToAnalyze = input.inputValue;
  if (input.inputType === "url") {
    if (input.onEvent) {
      await input.onEvent("Fetching input URL", 8);
    }
    try {
      const urlContent = await extractTextFromUrl(input.inputValue, {
        timeoutMs: 20000,
        maxLength: 8000,
        pdfParseTimeoutMs:
          pipelineConfig?.pdfParseTimeoutMs ?? DEFAULT_PIPELINE_CONFIG.pdfParseTimeoutMs,
      });
      textToAnalyze = `URL: ${input.inputValue}\n\nTitle: ${urlContent.title}\n\nContent:\n${urlContent.text}`;
    } catch (err) {
      throw new Error(`Failed to fetch input URL: ${err}`);
    }
  }

  // Step 1: Extract claim and generate search queries
  const understandModel = getModelForTask("understand", undefined, pipelineConfig ?? undefined);
  const claimData = await extractClaim(understandModel.model, textToAnalyze, pipelineConfig, input.onEvent);
  recordLLMCall(budgetTracker, 2000); // Estimate

  const normalizedSeen = new Set<string>();
  const claimEntries: Array<{
    id: string;
    text: string;
    claimRole: "core" | "attribution" | "source" | "timing" | "unknown";
    centrality: "high" | "medium" | "low";
    thesisRelevance: "direct" | "tangential" | "irrelevant";
    harmPotential: "high" | "medium" | "low";
    isCentral: boolean;
  }> = [];

  const mainClaimText = String(claimData.mainClaim || "").trim();
  if (mainClaimText) {
    claimEntries.push({
      id: "C1",
      text: mainClaimText,
      claimRole: "core",
      centrality: "high",
      thesisRelevance: "direct",
      harmPotential: "medium",
      isCentral: true,
    });
    normalizedSeen.add(normalizeClaimText(mainClaimText));
  }

  const rawSubClaims = Array.isArray(claimData.subClaims) ? claimData.subClaims : [];
  const heuristicSubClaims =
    rawSubClaims.length >= 2
      ? []
      : buildHeuristicSubClaims(textToAnalyze, normalizedSeen, MAX_CLAIMS_FOR_VERDICTS);

  const combinedSubClaims = rawSubClaims.map((c) => {
    const claimText = String(c.text || "").trim();
    return {
      text: claimText,
      claimRole: c.claimRole || "core",
      centrality: c.centrality || "medium",
      thesisRelevance: c.thesisRelevance || "direct",
      harmPotential: c.harmPotential ?? "medium",
    };
  });
  combinedSubClaims.push(...heuristicSubClaims.map((c) => ({
    text: c.text,
    claimRole: "core" as const,
    centrality: "medium" as const,
    thesisRelevance: "direct" as const,
    harmPotential: "medium" as const,
  })));

  let subClaimIndex = 1;
  for (const sub of combinedSubClaims) {
    if (!sub.text) continue;
    const normalized = normalizeClaimText(sub.text);
    if (!normalized || normalizedSeen.has(normalized)) continue;
    const id = `C${++subClaimIndex}`;
    // If harm potential is high, also ensure centrality is high
    const effectiveCentrality = sub.harmPotential === "high" ? "high" : sub.centrality;
    claimEntries.push({
      id,
      text: sub.text,
      claimRole: sub.claimRole as any,
      centrality: effectiveCentrality as any,
      thesisRelevance: sub.thesisRelevance as any,
      harmPotential: sub.harmPotential as any,
      isCentral: effectiveCentrality === "high",
    });
    normalizedSeen.add(normalized);
  }

  const claimsForVerdicts = claimEntries.slice(0, MAX_CLAIMS_FOR_VERDICTS);

  // Use LLM-generated search queries directly
  // The LLM prompt already instructs it to generate context-aware queries when needed
  const allSearchQueries = claimData.searchQueries;

  // IMPORTANT: Do NOT hard-stop on opinion/prediction inputs.
  // Many user inputs are evaluative or predictive but still have verifiable components
  // (timelines, procedures, quoted statements, what the law says, what courts ruled, etc.).
  // We proceed with research, but we:
  // - attach an explicit limitation note
  // - cap confidence later to avoid overclaiming
  const claimType = claimData.claimType;
  const limitationNote: string | null = null;

  // Step 2: Research loop
  let iteration = 0;
  let needsMoreResearch = true;
      const extractEvidenceModel = getModelForTask("extract_evidence", undefined, pipelineConfig ?? undefined);

  while (
    needsMoreResearch &&
    iteration < monolithicBudget.maxIterations &&
    searchCount < monolithicBudget.maxSearches &&
    Date.now() - startTime < monolithicBudget.timeoutMs
  ) {
    iteration++;

    // Get queries for this iteration, avoiding duplicates
    // Track query offset to prevent re-searching previously used queries
    const queryOffset = iteration === 1 ? 0 : 3 + (iteration - 2); // iter1: 0-2, iter2: 3, iter3: 4, etc.
    const queriesToRun =
      iteration === 1
        ? allSearchQueries.slice(0, 3)
        : allSearchQueries[queryOffset]
          ? [allSearchQueries[queryOffset]]
          : [`${claimData.mainClaim} ${iteration > 2 ? "contradicting" : "supporting"} evidence`];

    // Run searches
    const searchResults: Array<{ url: string; title: string; snippet: string }> = [];

    if (!searchConfig.enabled) {
      console.warn("[Analyzer] Search disabled (UCM search.enabled=false) - skipping web search");
      break;
    }

    for (const query of queriesToRun) {
      if (searchCount >= monolithicBudget.maxSearches) break;
      // Skip if we've already searched this exact query
      if (searchQueriesWithResults.some((q) => q.query === query)) continue;

      searchCount++;

      if (input.onEvent) {
        await input.onEvent(`Searching: "${query.slice(0, 40)}..."`, 15 + iteration * 10);
      }

      try {
        const response = await searchWebWithProvider({
          query,
          maxResults: searchConfig.maxResults,
          domainWhitelist: searchConfig.domainWhitelist,
          domainBlacklist: searchConfig.domainBlacklist,
          dateRestrict: searchConfig.dateRestrict ?? undefined,
          timeoutMs: searchConfig.timeoutMs,
          config: searchConfig,
        });
        // Track query with actual results count
        searchQueriesWithResults.push({ query, resultsCount: response.results.length });
        searchResults.push(
          ...response.results.map((r) => ({
            url: r.url,
            title: r.title,
            snippet: r.snippet || "",
          }))
        );
      } catch (err) {
        // Track failed query with 0 results
        searchQueriesWithResults.push({ query, resultsCount: 0 });
        console.error(`Search failed for "${query}":`, err);
      }
    }

    const maxSourcesToFetch = Math.min(
      searchConfig.maxSourcesPerIteration,
      Math.max(0, monolithicBudget.maxFetches - sources.length),
    );

    // Fetch top URLs
    const urlsToFetch = searchResults
      .filter((r) => !sources.some((s) => s.url === r.url))
      .slice(0, maxSourcesToFetch);

    // v2.6.35: Prefetch source reliability scores before fetching
    if (SR_CONFIG.enabled && urlsToFetch.length > 0) {
      const urlsForReliability = urlsToFetch.map((r) => r.url);
      if (input.onEvent) {
        const domains = urlsForReliability.map((u) => {
          try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; }
        });
        const uniqueDomains = [...new Set(domains)];
        const preview = uniqueDomains.length <= 3
          ? uniqueDomains.join(", ")
          : `${uniqueDomains.slice(0, 3).join(", ")} +${uniqueDomains.length - 3} more`;
        await input.onEvent(`📊 Checking source reliability: ${preview}`, 22 + iteration * 10);
      }
      await prefetchSourceReliability(urlsForReliability);
    }

    const fetchedContents: Array<{ url: string; title: string; content: string }> = [];

    for (const result of urlsToFetch) {
      if (fetchCount >= monolithicBudget.maxFetches) break;

      fetchCount++;

      // Safely parse hostname for display, fallback to URL on parse error
      let displayHost = result.url;
      try {
        displayHost = new URL(result.url).hostname;
      } catch {
        // Malformed URL - use raw URL for display, will likely fail fetch below
      }

      if (input.onEvent) {
        await input.onEvent(`Fetching: ${displayHost}`, 25 + iteration * 10);
      }

      try {
        const content = await extractTextFromUrl(result.url, {
          timeoutMs: 15000,
          maxLength: 20000,
          pdfParseTimeoutMs:
            pipelineConfig?.pdfParseTimeoutMs ?? DEFAULT_PIPELINE_CONFIG.pdfParseTimeoutMs,
        });

        // v2.6.35: Get source reliability data
        const reliabilityData = getTrackRecordData(result.url);

        sources.push({
          id: `S${sources.length + 1}`,
          url: result.url,
          title: content.title || result.title,
          snippet: result.snippet,
          content: content.text,
          fetchSuccess: true,
          fetchedAt: new Date().toISOString(),
          contentLength: content.text.length,
          trackRecordScore: reliabilityData?.score ?? null,
          trackRecordConfidence: reliabilityData?.confidence ?? null,
          trackRecordConsensus: reliabilityData?.consensusAchieved ?? null,
        });

        fetchedContents.push({
          url: result.url,
          title: content.title || result.title,
          content: content.text,
        });
      } catch (err) {
        console.error(`Fetch failed for ${result.url}:`, err);
      }
    }

    // Extract evidence items from fetched content
    if (fetchedContents.length > 0) {
      try {
        const extraction = await extractEvidence(
          extractEvidenceModel.model,
          claimData.mainClaim,
          claimType,
          limitationNote,
          fetchedContents,
          evidenceItems.length,
          pipelineConfig,
          input.onEvent
        );
        recordLLMCall(budgetTracker, 3000); // Estimate

        // Add new evidence items with IDs
        const urlToSourceId = new Map(sources.map((s) => [s.url, s.id]));
        const urlToContent = new Map(sources.map((s) => [s.url, s.content]));
        for (const f of extraction.evidenceItems) {
          const content = urlToContent.get(f.sourceUrl) || "";
          const newEvidenceItem = {
            id: `E${evidenceItems.length + 1}`,
            statement: f.statement,
            sourceId: urlToSourceId.get(f.sourceUrl) || `S-${f.sourceUrl.substring(0, 10)}`,
            sourceUrl: f.sourceUrl,
            sourceTitle: f.sourceTitle,
            sourceExcerpt: f.sourceExcerpt,
            category: f.category,
            claimDirection: f.claimDirection,
            probativeValue: f.probativeValue,  // v2.8: LLM assessment of evidence quality
            evidenceScope: f.evidenceScope,
            sourceAuthority: f.sourceAuthority,
            evidenceBasis: f.evidenceBasis,
            specificity: "medium" as const,
          };

          if (!excerptAppearsInContent(f.sourceExcerpt, content)) {
            console.warn(
              `[MonolithicCanonical] Dropping evidence item with non-verifiable excerpt (not found in fetched content): ${f.sourceUrl}`,
            );
            droppedEvidenceCount++;
            continue;
          }
          evidenceItems.push(newEvidenceItem);
        }

        needsMoreResearch = extraction.needsMoreResearch && evidenceItems.length < 8;
      } catch (err) {
        console.error("Evidence extraction failed:", err);
        needsMoreResearch = false;
      }
    } else {
      needsMoreResearch = false;
    }
  }

  // Step 3: Generate verdict
  if (evidenceItems.length === 0) {
    if (droppedEvidenceCount > 0) {
      console.warn(
        `[MonolithicCanonical] All extracted evidence was rejected by excerpt validation (${droppedEvidenceCount} items). Returning insufficient-evidence fallback.`
      );
    }

    // No verifiable evidence - return a safe, low-confidence result
    const fallbackClaimVerdicts = claimsForVerdicts.map((claim) => ({
      claimId: claim.id,
      claimText: claim.text,
      contextId: "CTX_MAIN",
      isCentral: claim.isCentral,
      centrality: claim.centrality,
      harmPotential: claim.harmPotential,
      verdict: 50,
      truthPercentage: 50,
      confidence: 30,
      riskTier: "C",
      reasoning: "Insufficient verifiable evidence to assess this claim.",
      supportingEvidenceIds: [],
      highlightColor: getHighlightColor(50),
      // v2.8: No contestation detected for fallback (insufficient evidence)
      isContested: false,
      factualBasis: "unknown" as const,
    }));
    const resultJson = buildResultJson({
      input,
      startTime,
      provider: understandModel.provider,
      modelName: understandModel.modelName,
      searchProvider: searchConfig.provider,
      budgetTracker,
      budgetConfig,
      monolithicBudget,
      claim: claimData.mainClaim,
      claimType,
      evidenceItems: [],
      sources,
      searchQueriesWithResults,
      verdict: 50,
      confidence: 30,
      reasoning: "No verifiable evidence items could be extracted from sources within budget.",
      summary: "Insufficient verifiable evidence",
      claimVerdicts: fallbackClaimVerdicts,
    });
    const reportMarkdown = generateReportMarkdown(resultJson, null);
    return { resultJson, reportMarkdown };
  }

  // Harden with Provenance Validation
  const provenanceResult = filterEvidenceByProvenance(evidenceItems);
  const validatedEvidenceItems = provenanceResult.validEvidenceItems;

  if (validatedEvidenceItems.length === 0) {
    throw new Error("Evidence items failed provenance validation. Falling back to orchestrated pipeline.");
  }

  const verdictModel = getModelForTask("verdict", undefined, pipelineConfig ?? undefined);
  const verdictResults: Array<{
    entry: typeof claimsForVerdicts[number];
    verdictData: z.infer<typeof VerdictSchema>;
  }> = [];

  for (const entry of claimsForVerdicts) {
    const verdictData = await generateVerdict(
      verdictModel.model,
      entry.text,
      claimType,
      limitationNote,
      validatedEvidenceItems,
      pipelineConfig,
      input.onEvent
    );
    verdictResults.push({ entry, verdictData });
    recordLLMCall(budgetTracker, 2000); // Estimate
  }

  const verdictData = verdictResults[0]?.verdictData;
  if (!verdictData) {
    throw new Error("Failed to generate verdict for primary claim.");
  }

  // Build result
  // v2.6.35: Calculate average source reliability weight for evidence weighting
  let avgSourceReliabilityWeight = DEFAULT_UNKNOWN_SOURCE_SCORE; // Default for unknown sources
  if (SR_CONFIG.enabled && sources.length > 0) {
    const reliabilityWeights = sources.map((s) => {
      if (s.trackRecordScore !== null) {
        return calculateEffectiveWeight({
          score: s.trackRecordScore,
          confidence: s.trackRecordConfidence ?? 0.7,
          consensusAchieved: s.trackRecordConsensus ?? false,
        });
      }
      // Unknown source: use default with low confidence
      return calculateEffectiveWeight({
        score: DEFAULT_UNKNOWN_SOURCE_SCORE,
        confidence: 0.5,
        consensusAchieved: false,
      });
    });
    avgSourceReliabilityWeight = reliabilityWeights.reduce((a, b) => a + b, 0) / reliabilityWeights.length;
    console.log(`[MonolithicCanonical] Source reliability avg weight: ${(avgSourceReliabilityWeight * 100).toFixed(1)}% from ${sources.length} sources`);
  }

  const claimVerdicts = verdictResults.map((result) => {
    const v = result.verdictData;
    // v2.6.35: Apply source reliability weighting to verdict
    let adjustedVerdict = v.verdict;
    let adjustedConfidence = v.confidence;
    if (SR_CONFIG.enabled) {
      // Pull verdict toward neutral (50) based on source reliability
      adjustedVerdict = Math.round(50 + (v.verdict - 50) * avgSourceReliabilityWeight);
      // Scale confidence by reliability
      adjustedConfidence = Math.round(v.confidence * (0.5 + avgSourceReliabilityWeight / 2));
    }

    return {
      claimId: result.entry.id,
      claimText: result.entry.text,
      contextId: "CTX_MAIN",
      isCentral: result.entry.isCentral,
      centrality: result.entry.centrality,
      harmPotential: result.entry.harmPotential,
      verdict: adjustedVerdict,
      truthPercentage: adjustedVerdict,
      confidence: adjustedConfidence,
      riskTier: adjustedConfidence >= 70 ? "A" : adjustedConfidence >= 40 ? "B" : "C",
      reasoning: v.reasoning,
      supportingEvidenceIds: validatedEvidenceItems.map((f) => f.id),
      highlightColor: getHighlightColor(adjustedVerdict),
      // v2.8: Contestation info for weighted aggregation (LLM-only)
      isContested: false,
      factualBasis: "unknown" as const,
      // v2.6.35: Source reliability metadata
      evidenceWeight: avgSourceReliabilityWeight,
    };
  });

  // Calculate aggregated verdict using weighted average of all claims
  // Central claims (high centrality) and high harm potential claims have more influence
  // v2.8: Contested claims with factual counter-evidence get reduced weight
  const aggregatedVerdict = calculateWeightedVerdictAverage(
    claimVerdicts.map((cv) => ({
      truthPercentage: cv.verdict,
      centrality: cv.centrality as "high" | "medium" | "low",
      confidence: cv.confidence,
      harmPotential: cv.harmPotential as "high" | "medium" | "low",
      thesisRelevance: "direct" as const, // All canonical claims are direct
      isContested: cv.isContested,
      factualBasis: cv.factualBasis,
    }))
  );

  // Aggregated confidence: weighted average of claim confidences
  const totalConfidenceWeight = claimVerdicts.reduce((sum, cv) => {
    const centralityWeight = cv.centrality === "high" ? 3 : cv.centrality === "medium" ? 2 : 1;
    return sum + centralityWeight;
  }, 0);
  const aggregatedConfidence = totalConfidenceWeight > 0
    ? Math.round(
        claimVerdicts.reduce((sum, cv) => {
          const centralityWeight = cv.centrality === "high" ? 3 : cv.centrality === "medium" ? 2 : 1;
          return sum + cv.confidence * centralityWeight;
        }, 0) / totalConfidenceWeight
      )
    : verdictData.confidence;

  // Use most critical claim's reasoning for the overall summary
  // Priority: HIGH harmPotential + FALSE verdict (most critical to address) > HIGH harmPotential > HIGH centrality > first
  const primaryClaimVerdict =
    claimVerdicts.find((cv) => cv.harmPotential === "high" && cv.centrality === "high" && cv.verdict < 43) ||
    claimVerdicts.find((cv) => cv.harmPotential === "high" && cv.centrality === "high") ||
    claimVerdicts.find((cv) => cv.centrality === "high") ||
    claimVerdicts[0];

  const resultJson = buildResultJson({
    input,
    startTime,
    provider: verdictModel.provider,
    modelName: verdictModel.modelName,
    searchProvider: searchConfig.provider,
    budgetTracker,
    budgetConfig,
    monolithicBudget,
    claim: claimData.mainClaim,
    claimType,
    evidenceItems: validatedEvidenceItems,
    sources,
    searchQueriesWithResults,
    verdict: aggregatedVerdict,
    confidence: aggregatedConfidence,
    reasoning: primaryClaimVerdict?.reasoning || verdictData.reasoning,
    summary: verdictData.summary,
    verdictData, // Pass the LLM response to include analysisContexts
    claimVerdicts,
  });

  const reportMarkdown = generateReportMarkdown(resultJson, verdictData);

  if (input.onEvent) {
    await input.onEvent("Analysis complete", 100);
  }

  return { resultJson, reportMarkdown };
}

// ============================================================================
// SCOPE INFERENCE
// ============================================================================

/**
 * Infers which context an evidence item belongs to based on content matching.
 * Returns the most relevant context ID, or the first context as default.
 */
function inferContextForEvidenceItem(
  evidenceItem: EvidenceItem,
  contexts: Array<{ id: string; name: string; subject: string }>
): string {
  if (contexts.length <= 1) {
    return contexts[0]?.id || "CTX_MAIN";
  }

  // Combine evidence content for matching
  const evidenceContent = `${evidenceItem.statement} ${evidenceItem.sourceTitle || ""} ${evidenceItem.sourceExcerpt || ""}`.toLowerCase();

  // Score each context by keyword matches
  let bestContext = contexts[0];
  let bestScore = 0;

  for (const context of contexts) {
    let score = 0;

    // Extract keywords from context name and subject
    const contextKeywords = `${context.name} ${context.subject}`.toLowerCase().split(/\s+/);

    for (const keyword of contextKeywords) {
      // Skip common words
      if (keyword.length < 3 || ["the", "and", "for", "with", "from"].includes(keyword)) {
        continue;
      }
      if (evidenceContent.includes(keyword)) {
        score += keyword.length; // Weight by keyword length
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestContext = context;
    }
  }

  return bestContext.id;
}

// ============================================================================
// RESULT BUILDING
// ============================================================================

function buildResultJson(params: {
  input: MonolithicAnalysisInput;
  startTime: number;
  provider: string;
  modelName: string;
  searchProvider: string;
  budgetTracker: any;
  budgetConfig: any;
  monolithicBudget: MonolithicBudget;
  claim: string;
  claimType: string;
  evidenceItems: EvidenceItem[];
  sources: MonolithicSource[];
  searchQueriesWithResults: Array<{ query: string; resultsCount: number }>;
  verdict: number;
  confidence: number;
  reasoning: string;
  summary: string;
  verdictData?: any;
  claimVerdicts?: Array<{
    claimId: string;
    claimText: string;
    contextId: string;
    isCentral: boolean;
    centrality: string;
    harmPotential?: string;
    verdict: number;
    truthPercentage: number;
    confidence: number;
    riskTier: string;
    reasoning: string;
    supportingEvidenceIds: string[];
    highlightColor: string;
  }>;
}): any {
  const {
    input,
    startTime,
    provider,
    modelName,
    searchProvider,
    budgetTracker,
    budgetConfig,
    monolithicBudget,
    claim,
    claimType,
    evidenceItems,
    sources,
    searchQueriesWithResults,
    verdict,
    confidence,
    reasoning,
    summary,
  } = params;

  const analysisTimeMs = Date.now() - startTime;
  const budgetStats = getBudgetStats(budgetTracker, budgetConfig);
  // Use canonical truth scale for consistent verdicts across pipelines
  const verdictLabel = percentageToClaimVerdict(verdict, confidence);
  const highlightColor = getHighlightColor(verdict);

  // Map LLM-detected contexts if available, otherwise fallback to CTX_MAIN
  const normalizedContexts = normalizeAnalysisContexts(
    params.verdictData ?? {},
    "MonolithicCanonical.buildResultJson",
  );
  const finalContexts =
    normalizedContexts.length > 0
      ? normalizedContexts.map((s: any) => ({
          id: s.id,
          name: s.name,
          shortName: s.name.substring(0, 10),
          subject: s.subject,
          temporal: "",
          status: "concluded",
          outcome: summary,
          metadata: { claimType, type: s.type },
        }))
      : [
          {
            id: "CTX_MAIN",
            name: "Main Analysis",
            shortName: "Main",
            subject: claim,
            temporal: "",
            status: "concluded",
            outcome: summary,
            metadata: { claimType },
          },
        ];

  const claimsOutput =
    params.claimVerdicts && params.claimVerdicts.length > 0
      ? params.claimVerdicts
      : [
          {
            claimId: "C1",
            claimText: claim,
            contextId: finalContexts[0]?.id || "CTX_MAIN",
            isCentral: true,
            centrality: "high",
            harmPotential: "medium",
            verdict,
            truthPercentage: verdict,
            confidence,
            riskTier: confidence >= 70 ? "A" : confidence >= 40 ? "B" : "C",
            reasoning,
            supportingEvidenceIds: evidenceItems.map((item) => item.id),
            highlightColor,
            // v2.8: Default contestation for fallback
            isContested: false,
            factualBasis: "unknown",
          },
        ];

  return {
    _schemaVersion: "2.7.0",
    meta: {
      schemaVersion: CONFIG.schemaVersion,
      generatedUtc: new Date().toISOString(),
      analysisMode: "monolithic",
      pipelineVariant: "monolithic_canonical",
      llmProvider: provider,
      llmModel: modelName,
      searchProvider,
      inputType: input.inputType,
      detectedInputType: input.inputType,
      hasMultipleContexts: finalContexts.length > 1,
      contextCount: finalContexts.length,
      isPseudoscience: false,
      inputLength: input.inputValue.length,
      analysisTimeMs,
      analysisId: input.jobId || `mono-${Date.now()}`,
      monolithicStats: {
        searches: searchQueriesWithResults.length,
        maxSearches: monolithicBudget.maxSearches,
        fetches: sources.length,
        maxFetches: monolithicBudget.maxFetches,
        evidenceItemsExtracted: evidenceItems.length,
      },
      budgetStats: {
        tokensUsed: budgetStats.tokensUsed,
        tokensPercent: budgetStats.tokensPercent,
        llmCalls: budgetStats.llmCalls,
        budgetExceeded: budgetStats.budgetExceeded,
      },
    },
    verdictSummary: {
      // Orchestrated/UI-compatible fields (preferred)
      answer: verdict,
      confidence,
      truthPercentage: verdict,
      // Backward/alternate naming still used in some places/tests
      overallVerdict: verdict,
      overallConfidence: confidence,
      verdictLabel,
      summary,
      hasContestedFactors: false,
    },
    analysisContexts: finalContexts,
    twoPanelSummary: {
      factharborAnalysis: {
        analysisId: input.jobId || `mono-${Date.now()}`,
        version: CONFIG.schemaVersion,
        confidence,
        centralClaimSummary: claim,
        factCheckSummary: reasoning,
        keyFindings: evidenceItems.slice(0, 5).map((item) => item.statement),
        overallVerdict: verdict,
      },
    },
    claimVerdicts: claimsOutput,
    // Build URL-to-ID mapping for proper evidence-source relationships
    sources: sources.map((s) => ({
      id: s.id,
      url: s.url,
      title: s.title,
      snippet: s.snippet,
      fetchedAt: s.fetchedAt,
    })),
    // Create lookup after sources are defined (using closure over sources array)
    // Associate evidence items with contexts using content-based matching
    evidenceItems: evidenceItems.map((item) => ({
      id: item.id,
      statement: item.statement,
      category: item.category,
      specificity: item.specificity,
      sourceId: item.sourceId,
      sourceUrl: item.sourceUrl,
      sourceTitle: item.sourceTitle,
      sourceExcerpt: item.sourceExcerpt,
      claimDirection: item.claimDirection,
      contextId: inferContextForEvidenceItem(item, finalContexts),
    })),
    searchQueries: searchQueriesWithResults.map((q, i) => ({
      id: `Q${i + 1}`,
      query: q.query,
      resultsCount: q.resultsCount,
    })),
  };
}

// ============================================================================
// REPORT GENERATION
// ============================================================================

function generateReportMarkdown(result: any, verdictData: any): string {
  const verdict = result.verdictSummary;
  const evidenceItems = result.evidenceItems ?? [];
  const sources = result.sources || [];

  let report = `# FactHarbor Analysis Report

## Verdict: ${verdict.verdictLabel}

**Truth Score:** ${verdict.overallVerdict}%
**Confidence:** ${verdict.overallConfidence}%

### Summary

${verdict.summary}

${verdictData?.reasoning ? `### Reasoning\n\n${verdictData.reasoning}` : ""}

## Evidence (${evidenceItems.length} items)

`;

  for (const item of evidenceItems) {
    const direction =
      item.claimDirection === "supports"
        ? "✅"
        : item.claimDirection === "contradicts"
          ? "❌"
          : "➖";
    report += `${direction} **${item.category}**: ${item.statement}\n`;
    report += `   _Source: [${item.sourceTitle}](${item.sourceUrl})_\n\n`;
  }

  report += `## Sources (${sources.length})\n\n`;

  for (const source of sources) {
    report += `- [${source.title}](${source.url})\n`;
  }

  report += `\n---\n_Generated by FactHarbor Monolithic Pipeline v${result.meta.schemaVersion}_\n`;
  report += `_Analysis time: ${(result.meta.analysisTimeMs / 1000).toFixed(1)}s_\n`;

  return report;
}
