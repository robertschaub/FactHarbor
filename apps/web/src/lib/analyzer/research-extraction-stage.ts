import { z } from "zod";
import { createHash } from "node:crypto";
import { generateText, Output } from "ai";
import { loadAndRenderSection } from "./prompt-loader";
import { 
  getModelForTask, 
  getPromptCachingOptions, 
  getStructuredOutputProviderOptions, 
  extractStructuredOutput 
} from "./llm";
import {
  formatPromptInferredGeography,
  formatPromptRelevantGeographies,
  normalizeRelevantGeographies,
} from "./jurisdiction-context";
import { recordLLMCall } from "./metrics-integration";
import { debugLogFileOnly } from "./debug";
import { 
  mapCategory, 
  mapSourceType, 
  normalizeExtractedSourceType 
} from "./pipeline-utils";
import {
  AnalysisWarning,
  AtomicClaim,
  CBResearchState,
  EvidenceItem,
  EvidenceApplicabilityCapture,
  EvidenceCaptureObserver,
  EvidenceCapturePayload,
} from "./types";
import { PipelineConfig } from "@/lib/config-schemas";

/** All diagnostic-only work, including argument construction, belongs in this callback. */
export function observeEvidenceCapture<T>(
  observer: EvidenceCaptureObserver | undefined,
  action: (capture: EvidenceCaptureObserver) => T,
): T | undefined {
  if (!observer) return undefined;
  try { return action(observer); }
  catch { try { observer.markFault(); } catch { /* Diagnostics cannot fail analysis. */ } }
}

export function evidenceCaptureFingerprint(text: string) {
  return {
    sha256: createHash("sha256").update(text, "utf8").digest("hex"),
    utf16Length: text.length,
    utf8Length: Buffer.byteLength(text, "utf8"),
  };
}

/** One per-analysis, bounded observer; no persistence or analysis decisions here. */
export function createEvidenceApplicabilityCapture(enabledBy: string): EvidenceCaptureObserver {
  const envelope: EvidenceApplicabilityCapture = {
    schemaVersion: 1, enabledBy, extractions: [], stages: [], faults: 0,
    omittedCalls: 0, omittedObservations: 0, omittedStepCounts: {}, omittedSteps: [], linkCoverage: "complete",
  };
  const bytes = (value: unknown) => Buffer.byteLength(JSON.stringify(value), "utf8");
  const callBytes: number[] = [];
  let nextCall = 0;
  let extractionBodyBytes = 0;
  let stageBodyBytes = 0;
  let stageLinkBytes = 0;
  let identityTrackingComplete = true;
  const admittedIds = new Set<string>();

  // Bound structural lists/strings, retaining counts and hashes of omitted material.
  function compact(value: unknown, entries: number, chars: number): unknown {
    if (typeof value === "string" && value.length > Math.max(96, chars)) {
      let end = chars;
      if (/^[\uDC00-\uDFFF]$/.test(value[end] ?? "")) end--;
      // The enclosing record retains its original hash. Never enlarge a string.
      const shortened = { prefix: value.slice(0, end), originalLength: value.length };
      return bytes(shortened) < bytes(value) ? shortened : value;
    }
    if (Array.isArray(value)) {
      const kept = value.slice(0, entries).map(v => compact(v, entries, chars));
      return value.length > entries
        ? { entries: kept, originalCount: value.length, ...evidenceCaptureFingerprint(JSON.stringify(value)), truncated: true }
        : kept;
    }
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, compact(v, entries, chars)]));
    }
    return value;
  }

  function links(value: unknown, limit: number): unknown {
    const serialized = JSON.stringify(value);
    if (Buffer.byteLength(serialized, "utf8") <= limit) return JSON.parse(serialized);
    envelope.linkCoverage = "partial";
    const identity = evidenceCaptureFingerprint(serialized);
    for (const size of [32, 16, 8, 4, 2, 1]) {
      const bounded = { value: compact(value, size, size * 16), ...identity, truncated: true };
      if (bytes(bounded) <= limit) return bounded;
    }
    return { ...identity, omitted: true };
  }

  function body(value: unknown, available: number): Record<string, unknown> {
    const text = typeof value === "string" ? value : JSON.stringify(value);
    const identity = evidenceCaptureFingerprint(text);
    const record = {
      representation: typeof value === "string" ? "text" : "json",
      ...identity, state: "complete", retainedUtf8Length: identity.utf8Length, content: text,
    };
    const limit = Math.min(262_144, available);
    if (limit < 256) return { ...record, state: "omitted", retainedUtf8Length: 0, content: "" };
    if (bytes(record) <= limit) return record;
    let low = 0, high = text.length;
    while (low < high) {
      const mid = Math.ceil((low + high) / 2);
      const candidate = { ...record, state: "truncated", content: text.slice(0, mid) };
      if (bytes(candidate) <= limit) low = mid; else high = mid - 1;
    }
    if (/^[\uDC00-\uDFFF]$/.test(text[low] ?? "")) low--;
    const content = text.slice(0, Math.max(0, low));
    return { ...record, state: content ? "truncated" : "omitted", content,
      retainedUtf8Length: Buffer.byteLength(content, "utf8") };
  }

  function omit(step: import("./types").EvidenceCaptureStep, callId?: number) {
    envelope.omittedObservations++;
    envelope.omittedStepCounts[step] = (envelope.omittedStepCounts[step] ?? 0) + 1;
    // Named step counts always survive. First 32 call links fit the 4 KiB reserve.
    if (envelope.omittedSteps.length < 32) envelope.omittedSteps.push(callId === undefined ? [step] : [step, callId]);
    envelope.linkCoverage = "partial";
  }

  return {
    beginExtraction() {
      const callId = nextCall++;
      if (callId >= 64) { envelope.omittedCalls++; identityTrackingComplete = false; return undefined; }
      envelope.extractions.push({ callId, steps: {
        extraction_admission: { step: "extraction_admission", links: { outcome: "not_recorded" } },
      } });
      callBytes.push(256); // container, pending admission and punctuation allowance
      return callId;
    },
    record(step, build, callId) {
      const extraction = step.startsWith("extraction_");
      const call = callId === undefined ? undefined : envelope.extractions[callId];
      if ((extraction && !call) || (!extraction && envelope.stages.length >= 256)) {
        omit(step, callId); return;
      }
      const payload: EvidenceCapturePayload = build();
      const metadata = payload.links ?? {};
      if (step === "seeded" || step === "extraction_admission") {
        const kept = (metadata.keptIds ?? metadata.ids ?? []) as string[];
        for (const id of kept) admittedIds.add(id);
        for (const id of (metadata.evictedIds ?? []) as string[]) admittedIds.delete(id);
        if (admittedIds.size > 4096 || bytes([...admittedIds]) > 65_536) {
          admittedIds.clear(); identityTrackingComplete = false;
        }
      }
      if (step === "applicability_removed") {
        for (const id of (metadata.removedIds ?? []) as string[]) admittedIds.delete(id);
      }
      if (step === "applicability_input" || step === "scope_before") {
        const current = new Set((metadata.items as Array<{ id: string } | [string, number]>).map(item => Array.isArray(item) ? item[0] : item.id));
        metadata.identityAccounting = identityTrackingComplete ? {
          unexplainedAddedIds: [...current].filter(id => !admittedIds.has(id)),
          unexplainedRemovedIds: [...admittedIds].filter(id => !current.has(id)),
        } : { complete: false };
      }
      // 10 KiB per call: protect 2 KiB admission + 1 KiB outcome from early steps.
      // The extra 128 KiB across 64 calls comes from the extraction body allowance.
      const allowance = extraction
        ? (step === "extraction_admission" ? 10240 : step === "extraction_result" ? 8192 : 7168) - callBytes[callId!]
        : 126_976 - stageLinkBytes; // 4 KiB reserved for envelope/counters
      if (allowance < 256) {
        omit(step, callId); return;
      }
      const stepLimit = step === "extraction_input" || step === "extraction_mapped" ? 2560 : 1536;
      const record: Record<string, unknown> = { step, links: links(metadata, Math.min(allowance - 128, extraction ? stepLimit : 65_536)) };
      const retainedBodies: Record<string, unknown> = {};
      for (const [name, value] of Object.entries(payload.bodies ?? {})) {
        const remaining = extraction ? 917_504 - extractionBodyBytes : 393_216 - stageBodyBytes;
        const captured = body(value, remaining - 64);
        const cost = bytes(captured) + Buffer.byteLength(JSON.stringify(name)) + 8;
        if (cost <= remaining) {
          retainedBodies[name] = captured;
          if (extraction) extractionBodyBytes += cost; else stageBodyBytes += cost;
        } else {
          // Body omission metadata uses the protected link budget.
          record.omittedBodies = [...((record.omittedBodies as unknown[]) ?? []),
            { name, ...evidenceCaptureFingerprint(typeof value === "string" ? value : JSON.stringify(value)) }];
        }
      }
      const linkCost = bytes(record) + 64;
      if (linkCost > allowance) {
        omit(step, callId); return;
      }
      if (Object.keys(retainedBodies).length) record.bodies = retainedBodies;
      if (extraction) { call!.steps[step] = record; callBytes[callId!] += linkCost; }
      else { envelope.stages.push(record as EvidenceApplicabilityCapture["stages"][number]); stageLinkBytes += linkCost; }
    },
    markFault() { envelope.faults++; envelope.linkCoverage = "partial"; },
    finish() {
      const json = JSON.stringify(envelope);
      const measuredBytes = Buffer.byteLength(json, "utf8");
      if (measuredBytes > 2_097_152) return {
        ...envelope, enabledBy: envelope.enabledBy.slice(0, 64), extractions: [], stages: [],
        overflowBytes: measuredBytes, linkCoverage: "partial",
      };
      return JSON.parse(json) as EvidenceApplicabilityCapture;
    },
  };
}

// ============================================================================
// SCHEMAS
// ============================================================================

export const RelevanceClassificationOutputSchema = z.object({
  relevantSources: z.array(z.object({
    url: z.string(),
    relevanceScore: z.number(),
    jurisdictionMatch: z.enum(["direct", "contextual", "foreign_reaction"]).catch("contextual"),
    reasoning: z.string(),
  })),
});

// Full evidence extraction schema (Stage 2 uses same EXTRACT_EVIDENCE prompt as Stage 1)
export const Stage2EvidenceItemSchema = z.object({
  statement: z.string(),
  sourceUrl: z.string().optional(), // URL of the source this evidence came from
  category: z.string(),
  claimDirection: z.enum(["supports", "contradicts", "contextual"]),
  evidenceScope: z.object({
    methodology: z.string().optional(),
    temporal: z.string().optional(),
    geographic: z.string().optional(),
    boundaries: z.string().optional(),
    analyticalDimension: z.string().optional().catch(undefined),
    additionalDimensions: z.record(z.string()).optional(),
  }),
  probativeValue: z.enum(["high", "medium", "low"]),
  sourceType: z.string().optional()
    .transform((value) => normalizeExtractedSourceType(value)),
  isDerivative: z.boolean().optional(),
  derivedFromSourceUrl: z.string().nullable().optional(),
  relevantClaimIds: z.array(z.string()),
});

export const Stage2ExtractEvidenceOutputSchema = z.object({
  evidenceItems: z.array(Stage2EvidenceItemSchema),
});

export const ApplicabilityAssessmentOutputSchema = z.object({
  // Cost (2026-06-01): `reasoning` removed — emitted post-decision but never read
  // (flow uses only evidenceIndex + applicability). See WIP 2026-06-01 §9.
  assessments: z.array(z.object({
    evidenceIndex: z.number(),
    applicability: z.enum(["direct", "contextual", "foreign_reaction"]).optional().catch(undefined),
  })),
});

// ============================================================================
// TYPES
// ============================================================================

/**
 * Evidence balance metrics for the evidence pool.
 * Measures the directional skew of evidence items.
 */
export interface EvidenceBalanceMetrics {
  supporting: number;
  contradicting: number;
  neutral: number;
  total: number;
  /** Ratio of supporting / (supporting + contradicting). 0.5 = balanced, >0.8 or <0.2 = skewed. NaN if no directional evidence. */
  balanceRatio: number;
  isSkewed: boolean;
}

// ============================================================================
// STAGE 2: CLASSIFICATION & EXTRACTION
// ============================================================================

/**
 * Classify search results for relevance to a claim using LLM (Haiku, batched).
 * Uses RELEVANCE_CLASSIFICATION UCM prompt.
 */
export async function classifyRelevance(
  claim: AtomicClaim,
  searchResults: Array<{ url: string; title: string; snippet?: string | null }>,
  pipelineConfig: PipelineConfig,
  currentDate: string,
  inferredGeography?: string | null,
  relevantGeographies?: string[] | null,
): Promise<Array<{ url: string; relevanceScore: number; originalRank: number }>> {
  const normalizedRelevantGeographies = normalizeRelevantGeographies(
    relevantGeographies,
    inferredGeography,
  );
  const rendered = await loadAndRenderSection("claimboundary", "RELEVANCE_CLASSIFICATION", {
    currentDate,
    claim: claim.statement,
    freshnessRequirement: claim.freshnessRequirement ?? "none",
    inferredGeography: formatPromptInferredGeography(normalizedRelevantGeographies),
    relevantGeographies: formatPromptRelevantGeographies(normalizedRelevantGeographies),
    searchResults: JSON.stringify(
      searchResults.map((r) => ({ url: r.url, title: r.title, snippet: r.snippet ?? "" })),
      null,
      2,
    ),
  });
  if (!rendered) {
    // Fallback: accept all results with neutral score
    return searchResults.map((r, i) => ({ url: r.url, relevanceScore: 0.5, originalRank: i }));
  }

  const model = getModelForTask("understand", undefined, pipelineConfig);
  const llmCallStartedAt = Date.now();
  let result: any;

  try {
    result = await generateText({
      model: model.model,
      messages: [
        {
          role: "system",
          content: rendered.content,
          providerOptions: getPromptCachingOptions(pipelineConfig.llmProvider),
        },
        {
          role: "user",
          content: `Classify the relevance of ${searchResults.length} search results to this claim: "${claim.statement}"`,
        },
      ],
      temperature: pipelineConfig?.relevanceClassificationTemperature ?? 0.1,
      maxOutputTokens: 8192, // Cost: runaway guard (small outputs once reasoning is brief). See WIP 2026-06-01 §9.
      output: Output.object({ schema: RelevanceClassificationOutputSchema }),
      providerOptions: getStructuredOutputProviderOptions(
        pipelineConfig.llmProvider ?? "anthropic",
      ),
    });

    const parsed = extractStructuredOutput(result);
    if (!parsed) {
      recordLLMCall({
        taskType: "research",
        provider: model.provider,
        modelName: model.modelName,
        promptTokens: result.usage?.inputTokens ?? 0,
        completionTokens: result.usage?.outputTokens ?? 0,
        totalTokens: result.usage?.totalTokens ?? 0,
        durationMs: Date.now() - llmCallStartedAt,
        success: false,
        schemaCompliant: false,
        retries: 0,
        errorMessage: "Stage 2 relevance classification returned no structured output",
        timestamp: new Date(),
      });
      return searchResults.map((r, i) => ({ url: r.url, relevanceScore: 0.5, originalRank: i }));
    }

    const validated = RelevanceClassificationOutputSchema.parse(parsed);

    // Build URL→originalRank map from the search results array order
    const urlToRank = new Map(searchResults.map((r, i) => [r.url, i]));

    // Cap foreign_reaction scores before applying the relevance threshold.
    // This ensures foreign government actions (sanctions, EOs, congressional statements)
    // are filtered out while contextual evidence (academic studies, NGO reports) passes.
    const foreignCap = pipelineConfig.foreignJurisdictionRelevanceCap ?? 0.35;
    const adjustedSources = validated.relevantSources.map((s) => {
      const rawScore = s.relevanceScore;
      const adjusted = s.jurisdictionMatch === "foreign_reaction"
        ? { ...s, relevanceScore: Math.min(s.relevanceScore, foreignCap) }
        : s;
      const originalRank = urlToRank.get(s.url) ?? searchResults.length;
      return { ...adjusted, rawScore, originalRank };
    });

    // Diagnostics: log every classified result (admin-only via debugLog)
    debugLogFileOnly(`[Stage2] Relevance classification: ${adjustedSources.length} results for "${claim.statement.slice(0, 60)}"`, adjustedSources.map((s) => ({
      rank: s.originalRank,
      url: s.url.slice(0, 80),
      raw: s.rawScore,
      adjusted: s.relevanceScore,
      jurisdiction: s.jurisdictionMatch,
      reasoning: s.reasoning.slice(0, 80),
    })));

    const relevanceThreshold = pipelineConfig.relevanceFloor ?? 0.4;
    const relevantSources = adjustedSources.filter((s) => s.relevanceScore >= relevanceThreshold);

    // Diagnostics: log discard summary
    const discarded = adjustedSources.filter((s) => s.relevanceScore < relevanceThreshold);
    if (discarded.length > 0) {
      const cappedCount = discarded.filter((s) => s.jurisdictionMatch === "foreign_reaction").length;
      const belowThreshold = discarded.length - cappedCount;
      debugLogFileOnly(`[Stage2] Discarded ${discarded.length} items: ${cappedCount} capped (foreign_reaction), ${belowThreshold} below threshold (${relevanceThreshold})`,
        discarded.map((s) => ({ url: s.url.slice(0, 80), raw: s.rawScore, adjusted: s.relevanceScore, jurisdiction: s.jurisdictionMatch })),
      );
    }

    recordLLMCall({
      taskType: "research",
      provider: model.provider,
      modelName: model.modelName,
      promptTokens: result.usage?.inputTokens ?? 0,
      completionTokens: result.usage?.outputTokens ?? 0,
      totalTokens: result.usage?.totalTokens ?? 0,
      durationMs: Date.now() - llmCallStartedAt,
      success: true,
      schemaCompliant: true,
      retries: 0,
      timestamp: new Date(),
    });

    // Filter to minimum relevance score of 0.4, return with originalRank for stable sort at call site
    return relevantSources;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    recordLLMCall({
      taskType: "research",
      provider: model.provider,
      modelName: model.modelName,
      promptTokens: result?.usage?.inputTokens ?? 0,
      completionTokens: result?.usage?.outputTokens ?? 0,
      totalTokens: result?.usage?.totalTokens ?? 0,
      durationMs: Date.now() - llmCallStartedAt,
      success: false,
      schemaCompliant: false,
      retries: 0,
      errorMessage,
      timestamp: new Date(),
    });
    debugLogFileOnly("[Stage2] Relevance classification failed, accepting all results", {
      errorMessage,
    });
    return searchResults.map((r, i) => ({ url: r.url, relevanceScore: 0.5, originalRank: i }));
  }
}

/**
 * Extract evidence from fetched sources for a target claim (Haiku, batched).
 * Uses EXTRACT_EVIDENCE UCM prompt. Returns full EvidenceItem[] with all CB fields.
 */
export async function extractResearchEvidence(
  targetClaim: AtomicClaim,
  sources: Array<{ url: string; title: string; text: string }>,
  pipelineConfig: PipelineConfig,
  currentDate: string,
  state?: CBResearchState,
  captureCallId?: number,
): Promise<EvidenceItem[]> {
  // Evidence-ID scope: when called from the orchestrator (production), the
  // shared per-analysis counter (state.nextEvidenceId) ensures IDs are unique
  // across this call and the preliminary-seeding call. When called without
  // state (tests, standalone scripts) we fall back to a local counter
  // starting at 1 — IDs are still well-formed (EV_001, EV_002, ...) but
  // scoped to this invocation only.
  const idScope: Pick<CBResearchState, "nextEvidenceId"> = state ?? { nextEvidenceId: 1 };
  if (typeof idScope.nextEvidenceId !== "number" || !Number.isFinite(idScope.nextEvidenceId)) {
    idScope.nextEvidenceId = 1;
  }
  const sourceContent = sources.map((s, i) =>
    `[Source ${i + 1}: ${s.title}]\nURL: ${s.url}\n${s.text}`
  ).join("\n\n---\n\n");
  observeEvidenceCapture(state?.evidenceCapture, capture => capture.record("extraction_input", () => ({
    links: { targetClaimId: targetClaim.id, currentDate, config: evidenceCaptureFingerprint(JSON.stringify(pipelineConfig)),
      sourceColumns: ["url", "title", "sourceId", "sentSha256", "sentUtf16Length", "sentUtf8Length", "fetchedSha256", "fetchedUtf16Length", "fetchedUtf8Length"],
      sources: sources.map(s => {
        const fetched = state?.sources.find(source => source.url === s.url);
        const sent = evidenceCaptureFingerprint(s.text);
        const full = fetched?.fullText == null ? null : evidenceCaptureFingerprint(fetched.fullText);
        return [s.url, s.title, fetched?.id ?? null, sent.sha256, sent.utf16Length, sent.utf8Length,
          full?.sha256 ?? null, full?.utf16Length ?? null, full?.utf8Length ?? null];
      }) },
    bodies: { sourceContent, targetClaim: { id: targetClaim.id, statement: targetClaim.statement } },
  }), captureCallId));
  const rendered = await loadAndRenderSection("claimboundary", "EXTRACT_EVIDENCE", {
    currentDate,
    claim: targetClaim.statement,
    sourceContent,
    sourceUrl: sources.map((s) => s.url).join(", "),
  });
  if (!rendered) {
    observeEvidenceCapture(state?.evidenceCapture, c => c.record("extraction_result", () => ({ links: { outcome: "missing_prompt" } }), captureCallId));
    return [];
  }

  const model = getModelForTask("extract_evidence", undefined, pipelineConfig);
  const userContent = `Extract evidence from these ${sources.length} sources relating to claim "${targetClaim.id}": "${targetClaim.statement}"`;
  observeEvidenceCapture(state?.evidenceCapture, c => c.record("extraction_request", () => ({ links: {
    section: "EXTRACT_EVIDENCE", promptContentHash: rendered.contentHash ?? null, rendererWarnings: rendered.warnings,
    system: evidenceCaptureFingerprint(rendered.content), user: evidenceCaptureFingerprint(userContent),
    model: model.modelName, provider: model.provider, providerOptionsProvider: pipelineConfig.llmProvider ?? "anthropic",
    temperature: pipelineConfig.extractEvidenceTemperature ?? 0.1, maxOutputTokens: 16384,
  } }), captureCallId));
  const llmCallStartedAt = Date.now();
  let result: any;

  try {
    result = await generateText({
      model: model.model,
      messages: [
        {
          role: "system",
          content: rendered.content,
          providerOptions: getPromptCachingOptions(pipelineConfig.llmProvider),
        },
        {
          role: "user",
          content: userContent,
        },
      ],
      temperature: pipelineConfig?.extractEvidenceTemperature ?? 0.1,
      maxOutputTokens: 16384, // Cost: runaway guard above measured p99 (~4.3k); catches 64k outlier. See WIP 2026-06-01 §9.
      output: Output.object({ schema: Stage2ExtractEvidenceOutputSchema }),
      providerOptions: getStructuredOutputProviderOptions(
        pipelineConfig.llmProvider ?? "anthropic",
      ),
    });

    const parsed = extractStructuredOutput(result);
    observeEvidenceCapture(state?.evidenceCapture, c => c.record("extraction_parsed", () => ({
      links: { representation: "post_sdk_pre_application_parse", available: parsed != null },
      bodies: parsed == null ? {} : { parsed },
    }), captureCallId));
    if (!parsed) {
      recordLLMCall({
        taskType: "research",
        provider: model.provider,
        modelName: model.modelName,
        promptTokens: result.usage?.inputTokens ?? 0,
        completionTokens: result.usage?.outputTokens ?? 0,
        totalTokens: result.usage?.totalTokens ?? 0,
        durationMs: Date.now() - llmCallStartedAt,
        success: false,
        schemaCompliant: false,
        retries: 0,
        errorMessage: "Stage 2 evidence extraction returned no structured output",
        timestamp: new Date(),
      });
      observeEvidenceCapture(state?.evidenceCapture, c => c.record("extraction_result", () => ({ links: {
        outcome: "no_structured_output", usage: result.usage, finishReason: result.finishReason, responseModel: result.response?.modelId,
      } }), captureCallId));
      return [];
    }

    const validated = Stage2ExtractEvidenceOutputSchema.parse(parsed);
    observeEvidenceCapture(state?.evidenceCapture, c => c.record("extraction_validated", () => ({
      links: { representation: "post_application_parse_pre_mapping", parseOutcome: "success",
        parsed: evidenceCaptureFingerprint(JSON.stringify(parsed)), validated: evidenceCaptureFingerprint(JSON.stringify(validated)) },
      bodies: JSON.stringify(parsed) === JSON.stringify(validated) ? {} : { validated },
    }), captureCallId));

    // Map to full EvidenceItem format.
    // Evidence IDs are minted from the per-analysis counter on state so they
    // stay short, sortable, and unique across both this mint site and the
    // preliminary-seeding mint site in research-orchestrator.ts. See
    // types.ts CBResearchState.nextEvidenceId for the rationale.
    let claimIdMismatchCount = 0;
    let categoryNormalizationCount = 0;
    let categoryFallbackToEvidenceCount = 0;
    let missingSourceUrlAssignmentCount = 0;
    let unmatchedSourceUrlFallbackCount = 0;
    let contextualMappedToNeutralCount = 0;

    const evidenceItems = validated.evidenceItems.map((ei) => {
      // Log when LLM returns mismatched claim IDs (admin diagnostic)
      if (ei.relevantClaimIds.length > 0 && !ei.relevantClaimIds.includes(targetClaim.id)) {
        claimIdMismatchCount++;
      }
      
      const normalizedCategoryInput = ei.category.toLowerCase().replace(/[_\s-]+/g, "_");
      const mappedCategory = mapCategory(ei.category);
      if (mappedCategory !== normalizedCategoryInput) {
        categoryNormalizationCount++;
      }
      if (
        mappedCategory === "evidence"
        && normalizedCategoryInput !== "evidence"
        && normalizedCategoryInput !== "case_study"
      ) {
        categoryFallbackToEvidenceCount++;
      }
      
      // Use LLM-attributed sourceUrl when available; fall back to first source.
      let matchedSource = sources.find((s) => s.url === ei.sourceUrl);
      if (!ei.sourceUrl) {
        missingSourceUrlAssignmentCount++;
      } else if (!matchedSource) {
        unmatchedSourceUrlFallbackCount++;
      }
      matchedSource = matchedSource ?? sources[0];

      if (ei.claimDirection === "contextual") {
        contextualMappedToNeutralCount++;
      }

      return {
        id: `EV_${String(idScope.nextEvidenceId++).padStart(3, "0")}`,
        statement: ei.statement,
        category: mappedCategory,
        specificity: ei.probativeValue === "high" ? "high" as const : "medium" as const,
        sourceId: "",
        sourceUrl: matchedSource?.url ?? "",
        sourceTitle: matchedSource?.title ?? "",
        sourceExcerpt: ei.statement,
        claimDirection: ei.claimDirection === "contextual" ? "neutral" as const : ei.claimDirection,
        evidenceScope: {
          name: ei.evidenceScope?.methodology?.slice(0, 30) || "Unspecified",
          methodology: ei.evidenceScope?.methodology,
          temporal: ei.evidenceScope?.temporal,
          geographic: ei.evidenceScope?.geographic,
          boundaries: ei.evidenceScope?.boundaries,
          analyticalDimension: ei.evidenceScope?.analyticalDimension,
          additionalDimensions: ei.evidenceScope?.additionalDimensions,
        },
        probativeValue: ei.probativeValue,
        sourceType: mapSourceType(ei.sourceType),
        // Always use targetClaim.id — extraction targets a single claim,
        // and LLM often returns wrong ID formats (e.g. "claim_01" vs "AC_01")
        relevantClaimIds: [targetClaim.id],
        isDerivative: ei.isDerivative ?? false,
        derivedFromSourceUrl: ei.derivedFromSourceUrl ?? undefined,
      } satisfies EvidenceItem;
    });

    observeEvidenceCapture(state?.evidenceCapture, c => c.record("extraction_mapped", () => {
      const urls = [...new Set(evidenceItems.flatMap((item, index) => [validated.evidenceItems[index].sourceUrl ?? null, item.sourceUrl]))];
      return { links: {
        columns: ["index", "id", "returnedUrlIndex", "resolvedUrlIndex", "assignedSourceId", "matchedSourceId", "returnedClaimIds", "assignedClaimIds"],
        urls,
        items: evidenceItems.map((item, index) => [index, item.id,
          urls.indexOf(validated.evidenceItems[index].sourceUrl ?? null), urls.indexOf(item.sourceUrl), item.sourceId,
          state?.sources.find(source => source.url === item.sourceUrl)?.id ?? null,
          validated.evidenceItems[index].relevantClaimIds, item.relevantClaimIds]),
      } };
    }, captureCallId));
    if (
      claimIdMismatchCount > 0
      || categoryNormalizationCount > 0
      || categoryFallbackToEvidenceCount > 0
      || missingSourceUrlAssignmentCount > 0
      || unmatchedSourceUrlFallbackCount > 0
      || contextualMappedToNeutralCount > 0
    ) {
      debugLogFileOnly(`[Stage2] Extraction normalizations for ${targetClaim.id}`, {
        claimIdMismatches: claimIdMismatchCount,
        categoryNormalizations: categoryNormalizationCount,
        categoryFallbackToEvidence: categoryFallbackToEvidenceCount,
        missingSourceUrlAssignments: missingSourceUrlAssignmentCount,
        unmatchedSourceUrlFallbacks: unmatchedSourceUrlFallbackCount,
        contextualMappedToNeutral: contextualMappedToNeutralCount,
      });
    }

    recordLLMCall({
      taskType: "research",
      provider: model.provider,
      modelName: model.modelName,
      promptTokens: result.usage?.inputTokens ?? 0,
      completionTokens: result.usage?.outputTokens ?? 0,
      totalTokens: result.usage?.totalTokens ?? 0,
      durationMs: Date.now() - llmCallStartedAt,
      success: true,
      schemaCompliant: true,
      retries: 0,
      timestamp: new Date(),
    });

    observeEvidenceCapture(state?.evidenceCapture, c => c.record("extraction_result", () => ({ links: {
      outcome: "success", usage: result.usage, finishReason: result.finishReason, responseModel: result.response?.modelId,
    } }), captureCallId));
    return evidenceItems;
  } catch (err) {
    observeEvidenceCapture(state?.evidenceCapture, c => c.record("extraction_result", () => ({ links: {
      outcome: "failed", error: err instanceof Error ? { name: err.name, message: err.message.slice(0, 512) } : { name: "unknown" },
      ...(err instanceof z.ZodError ? { applicationParseOutcome: "failed", schemaIssueCount: err.issues.length } : {}),
      usage: result?.usage, finishReason: result?.finishReason, responseModel: result?.response?.modelId,
    } }), captureCallId));
    const errorMessage = err instanceof Error ? err.message : String(err);
    recordLLMCall({
      taskType: "research",
      provider: model.provider,
      modelName: model.modelName,
      promptTokens: result?.usage?.inputTokens ?? 0,
      completionTokens: result?.usage?.outputTokens ?? 0,
      totalTokens: result?.usage?.totalTokens ?? 0,
      durationMs: Date.now() - llmCallStartedAt,
      success: false,
      schemaCompliant: false,
      retries: 0,
      errorMessage,
      timestamp: new Date(),
    });
    debugLogFileOnly("[Stage2] Evidence extraction failed", {
      claimId: targetClaim.id,
      errorMessage,
    });
    return [];
  }
}

/**
 * Fix 3: Post-extraction applicability assessment — safety net for jurisdiction contamination.
 *
 * Batches all evidence items into a single Haiku-tier LLM call to classify each item
 * as "direct", "contextual", or "foreign_reaction". Items classified as "foreign_reaction"
 * are filtered out by the caller.
 *
 * Called between research completion and clusterBoundaries() in the main pipeline.
 *
 * @param claims - The atomic claims being analyzed
 * @param evidenceItems - All gathered evidence items
 * @param inferredGeography - The claim's inferred jurisdiction (null = no filtering)
 * @param pipelineConfig - Pipeline configuration
 * @returns Evidence items with `applicability` field populated
 */
export async function assessEvidenceApplicability(
  claims: AtomicClaim[],
  evidenceItems: EvidenceItem[],
  inferredGeography: string | null,
  pipelineConfig: PipelineConfig,
  relevantGeographies?: string[] | null,
  warnings?: AnalysisWarning[],
  capture?: EvidenceCaptureObserver,
): Promise<EvidenceItem[]> {
  observeEvidenceCapture(capture, c => c.record("applicability_input", () => {
    const sourceTable: unknown[][] = [];
    const sourceIndexes = new Map<string, number>();
    const items = evidenceItems.map((item, index) => {
      const source = [item.sourceId, item.sourceUrl, item.sourceTitle];
      const key = JSON.stringify(source);
      if (!sourceIndexes.has(key)) { sourceIndexes.set(key, sourceTable.length); sourceTable.push(source); }
      return [item.id, index, sourceIndexes.get(key), item.isSeeded ?? false];
    });
    return { links: { itemColumns: ["id", "index", "sourceIndex", "isSeeded"], items,
      sourceColumns: ["sourceId", "sourceUrl", "sourceTitle"], sourceTable,
      config: evidenceCaptureFingerprint(JSON.stringify(pipelineConfig)) },
    bodies: { items: evidenceItems.map((item, index) => ({ index, id: item.id, statement: item.statement,
      scope: item.evidenceScope, claimIds: item.relevantClaimIds })) },
    };
  }));
  const normalizedRelevantGeographies = normalizeRelevantGeographies(
    relevantGeographies,
    inferredGeography,
  );
  // Skip if no geography or disabled
  if (normalizedRelevantGeographies.length === 0 || !(pipelineConfig.applicabilityFilterEnabled ?? true)) {
    observeEvidenceCapture(capture, c => c.record("applicability_result", () => ({ links: {
      outcome: "skipped", reason: !(pipelineConfig.applicabilityFilterEnabled ?? true) ? "disabled" : "no_geography",
    } })));
    return evidenceItems;
  }

  // Skip if no evidence
  if (evidenceItems.length === 0) {
    observeEvidenceCapture(capture, c => c.record("applicability_result", () => ({ links: { outcome: "skipped", reason: "no_evidence" } })));
    return evidenceItems;
  }

  // Prepare compact evidence summaries for LLM (minimize tokens)
  const evidenceSummaries = evidenceItems.map((item, index) => ({
    index,
    statement: item.statement.slice(0, 200),
    sourceUrl: item.sourceUrl ?? "unknown",
    sourceTitle: item.sourceTitle ?? "unknown",
    category: item.category,
  }));

  const promptVariables = {
    claims: JSON.stringify(claims.map(c => ({ id: c.id, statement: c.statement })), null, 2),
    inferredGeography: formatPromptInferredGeography(normalizedRelevantGeographies),
    relevantGeographies: formatPromptRelevantGeographies(normalizedRelevantGeographies),
    evidenceItems: JSON.stringify(evidenceSummaries, null, 2),
  };
  observeEvidenceCapture(capture, c => c.record("applicability_request", () => ({ links: { phase: "render_variables" }, bodies: { promptVariables } })));
  const rendered = await loadAndRenderSection("claimboundary", "APPLICABILITY_ASSESSMENT", promptVariables);

  if (!rendered) {
    observeEvidenceCapture(capture, c => c.record("applicability_result", () => ({ links: { outcome: "skipped", reason: "missing_prompt" } })));
    debugLogFileOnly("[Fix3] APPLICABILITY_ASSESSMENT prompt section not found — skipping applicability filter", {
      claimIds: claims.map((claim) => claim.id),
    });
    warnings?.push({
      type: "evidence_applicability_assessment_degraded",
      severity: "warning",
      message: "Evidence applicability assessment could not run because the APPLICABILITY_ASSESSMENT prompt section was unavailable. Direct citation eligibility may be under-assessed.",
      details: { claimIds: claims.map((claim) => claim.id), reason: "prompt_section_missing" },
    });
    // Fail-open on infra failure: the classifier could not RUN, so there is no
    // directness signal. Return items UNMARKED so legacy "missing = direct"
    // applies downstream — an unavailable classifier must not collapse the job.
    return evidenceItems;
  }

  const model = getModelForTask("understand", undefined, pipelineConfig);
  const userContent = "Classify each evidence item by applicability.";
  observeEvidenceCapture(capture, c => c.record("applicability_request", () => ({ links: {
    phase: "model_request", section: "APPLICABILITY_ASSESSMENT", promptContentHash: rendered.contentHash ?? null, rendererWarnings: rendered.warnings,
    system: evidenceCaptureFingerprint(rendered.content), user: evidenceCaptureFingerprint(userContent),
    model: model.modelName, provider: model.provider, providerOptionsProvider: model.provider,
    temperature: pipelineConfig.relevanceClassificationTemperature ?? 0.1, maxOutputTokens: 8192,
  } })));
  const llmCallStartedAt = Date.now();
  let result: any;

  try {
    result = await generateText({
      model: model.model,
      messages: [
        {
          role: "system",
          content: rendered.content,
          providerOptions: getPromptCachingOptions(model.provider),
        },
        { role: "user", content: userContent },
      ],
      temperature: pipelineConfig?.relevanceClassificationTemperature ?? 0.1,
      maxOutputTokens: 8192, // Cost: runaway guard. See WIP 2026-06-01 §9.
      output: Output.object({ schema: ApplicabilityAssessmentOutputSchema }),
      providerOptions: getStructuredOutputProviderOptions(
        model.provider,
      ),
    });

    const validated = extractStructuredOutput(result) as z.infer<typeof ApplicabilityAssessmentOutputSchema>;

    recordLLMCall({
      taskType: "understand",
      provider: model.provider,
      modelName: model.modelName,
      promptTokens: result.usage?.inputTokens ?? 0,
      completionTokens: result.usage?.outputTokens ?? 0,
      totalTokens: result.usage?.totalTokens ?? 0,
      durationMs: Date.now() - llmCallStartedAt,
      success: true,
      schemaCompliant: true,
      retries: 0,
      timestamp: new Date(),
    });

    // Apply classifications to evidence items
    const classificationMap = new Map<number, "direct" | "contextual" | "foreign_reaction">();
    for (const assessment of validated.assessments) {
      if (assessment.applicability) {
        classificationMap.set(assessment.evidenceIndex, assessment.applicability);
      }
    }

    // Debug: count by category
    const counts = { direct: 0, contextual: 0, foreign_reaction: 0, unclassified: 0 };
    const foreignDomains: string[] = [];

    const assessed = evidenceItems.map((item, index) => {
      const applicability = classificationMap.get(index);
      if (applicability) {
        counts[applicability]++;
      }
      if (applicability === "foreign_reaction") {
        const domain = item.sourceUrl?.match(/^https?:\/\/([^/?#]+)/)?.[1] ?? "unknown";
        foreignDomains.push(domain);
      }
      return { ...item, applicability, applicabilityAssessed: true };
    });

    // Count unclassified items not returned by the LLM. They remain usable as
    // contextual material, but they are not explicit direct evidence.
    counts.unclassified = evidenceItems.length - classificationMap.size;
    observeEvidenceCapture(capture, c => c.record("applicability_result", () => ({
      links: { outcome: "success", classificationMap: [...classificationMap], counts,
        usage: result.usage, finishReason: result.finishReason, responseModel: result.response?.modelId },
      bodies: { assessments: validated.assessments },
    })));

    debugLogFileOnly(
      `[Fix3] Applicability assessment: ${counts.direct} direct, ${counts.contextual} contextual, ` +
      `${counts.foreign_reaction} foreign_reaction, ${counts.unclassified} unclassified. ` +
      `Foreign domains: ${foreignDomains.length > 0 ? foreignDomains.length : "none"}`
    );
    debugLogFileOnly(
      `[Fix3] Applicability: ${counts.direct}D/${counts.contextual}C/${counts.foreign_reaction}F ` +
      `(${evidenceItems.length} total, geography: ${normalizedRelevantGeographies.join(",")})`
    );

    return assessed;
  } catch (err) {
    observeEvidenceCapture(capture, c => c.record("applicability_result", () => ({ links: {
      outcome: "failed", error: err instanceof Error ? { name: err.name, message: err.message.slice(0, 512) } : { name: "unknown" },
      usage: result?.usage, finishReason: result?.finishReason, responseModel: result?.response?.modelId,
    } })));
    const errorMessage = err instanceof Error ? err.message : String(err);
    recordLLMCall({
      taskType: "understand",
      provider: model.provider,
      modelName: model.modelName,
      promptTokens: result?.usage?.inputTokens ?? 0,
      completionTokens: result?.usage?.outputTokens ?? 0,
      totalTokens: result?.usage?.totalTokens ?? 0,
      durationMs: Date.now() - llmCallStartedAt,
      success: false,
      schemaCompliant: false,
      retries: 0,
      errorMessage,
      timestamp: new Date(),
    });
    // Fail-open on infra failure: keep all evidence and do NOT mark directness as
    // assessed. A failed classifier call carries no directness signal, so legacy
    // "missing = direct" treatment applies downstream — an infra failure must not
    // collapse citations/sufficiency job-wide.
    debugLogFileOnly("[Fix3] Applicability assessment failed, keeping all evidence", {
      claimIds: claims.map((claim) => claim.id),
      errorMessage,
    });
    warnings?.push({
      type: "evidence_applicability_assessment_degraded",
      severity: "warning",
      message: "Evidence applicability assessment failed. Evidence remains available as context, but direct citation eligibility could not be fully verified.",
      details: {
        claimIds: claims.map((claim) => claim.id),
        errorMessage,
      },
    });
    return evidenceItems;
  }
}

/**
 * Assess EvidenceScope quality (§8.2 step 8).
 * Deterministic structural check: complete/partial/incomplete.
 */
export function assessScopeQuality(
  item: EvidenceItem,
): "complete" | "partial" | "incomplete" {
  const scope = item.evidenceScope;
  if (!scope) return "incomplete";

  const hasMethodology = !!(scope.methodology && scope.methodology.trim().length > 0);
  const hasTemporal = !!(scope.temporal && scope.temporal.trim().length > 0);

  if (!hasMethodology || !hasTemporal) return "incomplete";

  // Check if fields are meaningful vs vague (language-neutral: length + structural markers only)
  const isVague = (s: string) =>
    s.length < 5 || /^(n\/?a|—|-|\?|\.{1,3}|\*+)$/i.test(s.trim());

  if (isVague(scope.methodology!) || isVague(scope.temporal!)) return "partial";

  return "complete";
}

/**
 * Assess directional balance of the evidence pool.
 * Returns metrics and whether the pool is skewed beyond the configured threshold.
 *
 * @param evidenceItems - All evidence items from research stage
 * @param skewThreshold - Ratio above which (or below 1-threshold) the pool is considered skewed (default 0.8)
 * @returns EvidenceBalanceMetrics
 */
export function assessEvidenceBalance(
  evidenceItems: EvidenceItem[],
  skewThreshold = 0.8,
  minDirectional = 3,
): EvidenceBalanceMetrics {
  let supporting = 0;
  let contradicting = 0;
  let neutral = 0;

  for (const item of evidenceItems) {
    switch (item.claimDirection) {
      case "supports":
        supporting++;
        break;
      case "contradicts":
        contradicting++;
        break;
      default:
        neutral++;
        break;
    }
  }

  const directional = supporting + contradicting;
  const balanceRatio = directional > 0 ? supporting / directional : NaN;
  // Use max(ratio, 1-ratio) to get majority proportion — avoids floating-point issues with 1-threshold
  const majorityRatio = isNaN(balanceRatio) ? 0 : Math.max(balanceRatio, 1 - balanceRatio);
  // Strict > so that threshold=1.0 disables detection (majorityRatio maxes at 1.0)
  const isSkewed = !isNaN(balanceRatio) && directional >= minDirectional && majorityRatio > skewThreshold;

  return {
    supporting,
    contradicting,
    neutral,
    total: evidenceItems.length,
    balanceRatio,
    isSkewed,
  };
}

// ============================================================================
// PER-SOURCE EVIDENCE CAP (Fix 2 — single-source flooding mitigation)
// ============================================================================

/** Probative value sort order: high > medium > low. */
const PROBATIVE_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

/**
 * Enforce a per-source evidence item cap by retaining the best N items
 * (by probativeValue) across both the existing pool and newly extracted items.
 *
 * Structural plumbing — not semantic filtering. Prevents any single source URL
 * from contributing more than `maxPerSource` items to the evidence pool.
 *
 * Unlike a first-come approach, a higher-quality new item can displace a
 * lower-quality existing item from the same source. Evicted existing item IDs
 * are returned so the caller can remove them from the pool.
 *
 * Within the same probativeValue tier, existing items are preferred over new
 * items (stable — no churn when quality is equal).
 *
 * @param newItems - Newly extracted items to be added this iteration
 * @param existingEvidence - Items already in the evidence pool
 * @param maxPerSource - Cap per source URL (UCM: maxEvidenceItemsPerSource)
 * @returns `kept` new items to add, `capped` count, `evictedIds` to remove from pool
 */
export function applyPerSourceCap(
  newItems: EvidenceItem[],
  existingEvidence: EvidenceItem[],
  maxPerSource: number,
): { kept: EvidenceItem[]; capped: number; evictedIds: string[] } {
  if (maxPerSource <= 0 || newItems.length === 0) {
    return { kept: newItems, capped: 0, evictedIds: [] };
  }

  // Index existing items by source URL
  const existingBySource = new Map<string, EvidenceItem[]>();
  for (const item of existingEvidence) {
    const url = item.sourceUrl ?? "";
    if (!existingBySource.has(url)) existingBySource.set(url, []);
    existingBySource.get(url)!.push(item);
  }

  // Group new items by source URL
  const newBySource = new Map<string, EvidenceItem[]>();
  for (const item of newItems) {
    const url = item.sourceUrl ?? "";
    if (!newBySource.has(url)) newBySource.set(url, []);
    newBySource.get(url)!.push(item);
  }

  const kept: EvidenceItem[] = [];
  const evictedIds: string[] = [];
  let capped = 0;

  for (const [url, newSourceItems] of newBySource) {
    const existingSourceItems = existingBySource.get(url) ?? [];
    const totalCount = existingSourceItems.length + newSourceItems.length;

    if (totalCount <= maxPerSource) {
      // Combined pool is within cap — keep all new items, no evictions
      kept.push(...newSourceItems);
      continue;
    }

    // Merge existing + new, sort by probativeValue descending.
    // Tag each item so we can tell existing from new after sorting.
    type Tagged = { item: EvidenceItem; isNew: boolean };
    const merged: Tagged[] = [
      ...existingSourceItems.map((item) => ({ item, isNew: false })),
      ...newSourceItems.map((item) => ({ item, isNew: true })),
    ];

    // Sort: best probativeValue first. Within same tier, existing before new (stable preference).
    merged.sort((a, b) => {
      const aOrder = PROBATIVE_ORDER[a.item.probativeValue ?? "low"] ?? 2;
      const bOrder = PROBATIVE_ORDER[b.item.probativeValue ?? "low"] ?? 2;
      if (aOrder !== bOrder) return aOrder - bOrder;
      // Same tier: prefer existing over new (no churn when equal quality)
      if (a.isNew !== b.isNew) return a.isNew ? 1 : -1;
      return 0;
    });

    const retained = merged.slice(0, maxPerSource);
    const dropped = merged.slice(maxPerSource);

    // Collect new items that survived into `kept`
    for (const tagged of retained) {
      if (tagged.isNew) kept.push(tagged.item);
    }

    // Collect existing items that were evicted
    for (const tagged of dropped) {
      if (!tagged.isNew) evictedIds.push(tagged.item.id);
      else capped++;
    }
  }

  return { kept, capped, evictedIds };
}
