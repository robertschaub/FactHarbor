/**
 * Source Reliability evidence quality assessment helpers.
 *
 * SR-internal module only. No shared analyzer type coupling.
 */

export type EvidenceProbativeValue = "high" | "medium" | "low";

export type EvidenceCategory =
  | "fact_checker_rating"
  | "press_council_ruling"
  | "academic_research"
  | "journalistic_analysis"
  | "industry_report"
  | "general_mention"
  | "opinion"
  | "self_published"
  | "other"
  | "unclassified";

export type EvidenceQualityAssessmentErrorType =
  | "timeout"
  | "provider_error"
  | "parse_error"
  | "unknown";

export type EvidenceQualityAssessmentSkippedReason =
  | "disabled"
  | "empty_evidence"
  | "budget_guard";

export interface EvidencePackItemForQuality {
  id: string;
  url: string;
  title: string;
  snippet: string | null;
  query: string;
  provider: string;
  probativeValue?: EvidenceProbativeValue;
  evidenceCategory?: EvidenceCategory;
  /** LLM-assessed: is this result about the reliability/credibility of the source? */
  relevant?: boolean;
  enrichmentVersion?: 1;
}

export interface EnrichedEvidenceItem {
  id: string;
  probativeValue: EvidenceProbativeValue;
  evidenceCategory: EvidenceCategory;
  /** Is this search result about the reliability/credibility assessment of the source? */
  relevant: boolean;
}

export interface EvidenceQualityAssessmentConfig {
  enabled: boolean;
  model: string;
  timeoutMs: number;
  maxItemsPerAssessment: number;
  minRemainingBudgetMs: number;
}

export interface EvidenceQualityAssessmentMeta {
  status: "applied" | "skipped" | "failed";
  version?: 1;
  model?: string;
  timeoutMs?: number;
  latencyMs?: number;
  assessedItemCount?: number;
  skippedReason?: EvidenceQualityAssessmentSkippedReason;
  errorType?: EvidenceQualityAssessmentErrorType;
}

export interface EvidenceQualityAssessmentResult {
  items: EvidencePackItemForQuality[];
  qualityAssessment: EvidenceQualityAssessmentMeta;
  warningMessage?: string;
}

interface AssessEvidenceQualityParams {
  domain: string;
  items: EvidencePackItemForQuality[];
  config: EvidenceQualityAssessmentConfig;
  modelName: string;
  remainingBudgetMs: number | null;
  promptTemplate: string;
  outputFormatTemplate?: string;
  classify: (prompt: string, timeoutMs: number) => Promise<string>;
}

const ENRICHMENT_VERSION = 1 as const;
const MIN_TIMEOUT_HEADROOM_MS = 500;

const EVIDENCE_CATEGORY_SET: ReadonlySet<EvidenceCategory> = new Set([
  "fact_checker_rating",
  "press_council_ruling",
  "academic_research",
  "journalistic_analysis",
  "industry_report",
  "general_mention",
  "opinion",
  "self_published",
  "other",
  "unclassified",
]);

const PROBATIVE_VALUE_SET: ReadonlySet<EvidenceProbativeValue> = new Set([
  "high",
  "medium",
  "low",
]);

type ParsedAssessmentPayload =
  | EnrichedEvidenceItem[]
  | { classifications?: EnrichedEvidenceItem[]; items?: EnrichedEvidenceItem[] };

function normalizeProbativeValue(value: unknown): EvidenceProbativeValue | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return PROBATIVE_VALUE_SET.has(normalized as EvidenceProbativeValue)
    ? (normalized as EvidenceProbativeValue)
    : null;
}

function normalizeEvidenceCategory(value: unknown): EvidenceCategory {
  if (typeof value !== "string") return "unclassified";
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");
  if (EVIDENCE_CATEGORY_SET.has(normalized as EvidenceCategory)) {
    return normalized as EvidenceCategory;
  }
  return normalized ? "other" : "unclassified";
}

function classifyAssessmentError(err: unknown): EvidenceQualityAssessmentErrorType {
  const message = err instanceof Error ? err.message : String(err ?? "");
  const normalized = message.toLowerCase();
  if (normalized.includes("timeout")) return "timeout";
  if (normalized.includes("json") || normalized.includes("parse")) return "parse_error";
  if (
    normalized.includes("api") ||
    normalized.includes("provider") ||
    normalized.includes("rate limit") ||
    normalized.includes("429")
  ) {
    return "provider_error";
  }
  return "unknown";
}

function interpolatePrompt(
  template: string,
  variables: Record<string, string>,
): string {
  return template.replace(/\$\{(\w+)\}/g, (match, variableName) => {
    if (Object.prototype.hasOwnProperty.call(variables, variableName)) {
      return variables[variableName];
    }
    return match;
  });
}

export function parseEvidenceQualityAssessmentResponse(rawText: string): EnrichedEvidenceItem[] {
  const text = (rawText ?? "").trim();
  if (!text) {
    throw new Error("Evidence quality assessment returned empty response");
  }

  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fencedMatch ? fencedMatch[1].trim() : text;

  let parsed: ParsedAssessmentPayload;
  try {
    parsed = JSON.parse(jsonText) as ParsedAssessmentPayload;
  } catch {
    throw new Error("Evidence quality assessment returned invalid JSON");
  }

  const entries = Array.isArray(parsed)
    ? parsed
    : (Array.isArray(parsed.classifications) ? parsed.classifications : parsed.items) ?? [];

  if (!Array.isArray(entries)) {
    throw new Error("Evidence quality assessment response is not an array");
  }

  const normalized: EnrichedEvidenceItem[] = [];
  for (const entry of entries) {
    const id = typeof entry?.id === "string" ? entry.id.trim() : "";
    if (!id) continue;
    normalized.push({
      id,
      probativeValue: normalizeProbativeValue(entry?.probativeValue) ?? "low",
      evidenceCategory: normalizeEvidenceCategory(entry?.evidenceCategory),
      relevant: entry?.relevant === true,
    });
  }

  return normalized;
}

export function mergeEvidenceQualityAssessment(
  items: EvidencePackItemForQuality[],
  classifications: EnrichedEvidenceItem[],
): {
  items: EvidencePackItemForQuality[];
  unknownIds: string[];
  duplicateIds: string[];
} {
  const itemIds = new Set(items.map((item) => item.id));
  const appliedById = new Map<string, EnrichedEvidenceItem>();
  const duplicateIds = new Set<string>();

  for (const classification of classifications) {
    if (appliedById.has(classification.id)) {
      duplicateIds.add(classification.id);
      continue;
    }
    appliedById.set(classification.id, classification);
  }

  const unknownIds: string[] = [];
  for (const id of appliedById.keys()) {
    if (!itemIds.has(id)) {
      unknownIds.push(id);
    }
  }

  const merged = items.map((item) => {
    const found = appliedById.get(item.id);
    if (!found) {
      return {
        ...item,
        probativeValue: "low" as const,
        evidenceCategory: "unclassified" as const,
        relevant: true, // Not assessed — assume relevant (conservative)
        enrichmentVersion: ENRICHMENT_VERSION,
      };
    }
    return {
      ...item,
      probativeValue: found.probativeValue,
      evidenceCategory: found.evidenceCategory,
      relevant: found.relevant,
      enrichmentVersion: ENRICHMENT_VERSION,
    };
  });

  return {
    items: merged,
    unknownIds,
    duplicateIds: [...duplicateIds],
  };
}

export function formatEvidenceItemsForAssessmentPrompt(
  items: EvidencePackItemForQuality[],
): string {
  return items
    .map((item) => {
      const snippet = (item.snippet ?? "").replace(/\s+/g, " ").trim();
      return [
        `${item.id}: ${item.title}`,
        `URL: ${item.url}`,
        `Snippet: ${snippet || "(none)"}`,
      ].join("\n");
    })
    .join("\n\n");
}

function formatEvidenceItemForEvaluationPrompt(item: EvidencePackItemForQuality): string {
  const snippet = (item.snippet ?? "").replace(/\s+/g, " ").trim();
  const categoryLabel = item.evidenceCategory ?? "unclassified";
  return [
    `[${item.id}] [${categoryLabel}] ${item.title}`,
    `    URL: ${item.url}`,
    snippet ? `    Excerpt: ${snippet}` : `    Excerpt: (none)`,
  ].join("\n");
}

export function formatEvidenceForEvaluationPrompt(
  items: EvidencePackItemForQuality[],
): string {
  if (items.length === 0) return "";

  const hasQualityLabels = items.some((item) => !!item.probativeValue || !!item.evidenceCategory);
  if (!hasQualityLabels) {
    return items
      .map((item) => {
        const snippet = (item.snippet ?? "").replace(/\s+/g, " ").trim();
        return [
          `[${item.id}] ${item.title}`,
          `    URL: ${item.url}`,
          snippet ? `    Excerpt: ${snippet}` : `    Excerpt: (none)`,
        ].join("\n");
      })
      .join("\n\n");
  }

  const byGroup: Record<EvidenceProbativeValue, EvidencePackItemForQuality[]> = {
    high: [],
    medium: [],
    low: [],
  };

  for (const item of items) {
    const group = item.probativeValue ?? "low";
    byGroup[group].push(item);
  }

  const sections: string[] = [];
  const orderedGroups: Array<{ key: EvidenceProbativeValue; title: string }> = [
    { key: "high", title: "HIGH PROBATIVE VALUE" },
    { key: "medium", title: "MEDIUM PROBATIVE VALUE" },
    { key: "low", title: "LOW PROBATIVE VALUE" },
  ];

  for (const group of orderedGroups) {
    if (byGroup[group.key].length === 0) continue;
    sections.push(`=== ${group.title} ===`);
    sections.push(
      byGroup[group.key].map((item) => formatEvidenceItemForEvaluationPrompt(item)).join("\n\n"),
    );
  }

  return sections.join("\n\n");
}

/**
 * Post-LLM relevance filtering: removes items the LLM marked as irrelevant,
 * but auto-passes items from known fact-checker domains.
 * Only applied when quality assessment was successfully applied.
 */
export function filterByRelevance(
  items: EvidencePackItemForQuality[],
  assessmentApplied: boolean,
  factCheckerDomains: ReadonlySet<string>,
): { filtered: EvidencePackItemForQuality[]; removedCount: number } {
  if (!assessmentApplied) {
    return { filtered: items, removedCount: 0 };
  }

  const filtered = items.filter((item) => {
    if (item.relevant !== false) return true;
    // Auto-pass known fact-checker domains even if LLM said not relevant
    try {
      const host = new URL(item.url).hostname.toLowerCase().replace(/^www\./, "");
      if (
        factCheckerDomains.has(host) ||
        [...factCheckerDomains].some((fc) => host.endsWith(`.${fc}`))
      ) {
        return true;
      }
    } catch {
      /* ignore URL parse errors */
    }
    return false;
  });

  return { filtered, removedCount: items.length - filtered.length };
}

function computeAssessmentTimeoutMs(
  configuredTimeoutMs: number,
  remainingBudgetMs: number | null,
): number | null {
  if (remainingBudgetMs === null) return configuredTimeoutMs;
  if (remainingBudgetMs <= MIN_TIMEOUT_HEADROOM_MS) return null;
  return Math.max(
    MIN_TIMEOUT_HEADROOM_MS,
    Math.min(configuredTimeoutMs, remainingBudgetMs - MIN_TIMEOUT_HEADROOM_MS),
  );
}

export async function assessEvidenceQuality(
  params: AssessEvidenceQualityParams,
): Promise<EvidenceQualityAssessmentResult> {
  const { domain, items, config, modelName, remainingBudgetMs, promptTemplate, outputFormatTemplate, classify } =
    params;

  if (!config.enabled) {
    return {
      items,
      qualityAssessment: {
        status: "skipped",
        skippedReason: "disabled",
      },
    };
  }

  if (items.length === 0) {
    return {
      items,
      qualityAssessment: {
        status: "skipped",
        skippedReason: "empty_evidence",
      },
    };
  }

  if (
    remainingBudgetMs !== null &&
    remainingBudgetMs < Math.max(0, config.minRemainingBudgetMs)
  ) {
    return {
      items,
      qualityAssessment: {
        status: "skipped",
        model: modelName,
        skippedReason: "budget_guard",
      },
    };
  }

  const itemsForAssessment = items.slice(0, Math.max(1, config.maxItemsPerAssessment));
  const timeoutMs = computeAssessmentTimeoutMs(config.timeoutMs, remainingBudgetMs);
  if (timeoutMs === null) {
    return {
      items,
      qualityAssessment: {
        status: "skipped",
        model: modelName,
        skippedReason: "budget_guard",
      },
    };
  }

  const itemsBlock = formatEvidenceItemsForAssessmentPrompt(itemsForAssessment);
  const prompt = interpolatePrompt(promptTemplate, {
    domain,
    itemsBlock,
  });
  const fullPrompt = outputFormatTemplate ? `${prompt}\n\n${outputFormatTemplate}` : prompt;

  const startedAtMs = Date.now();
  try {
    const rawResponse = await classify(fullPrompt, timeoutMs);
    const parsed = parseEvidenceQualityAssessmentResponse(rawResponse);
    const merged = mergeEvidenceQualityAssessment(items, parsed);

    return {
      items: merged.items,
      qualityAssessment: {
        status: "applied",
        version: ENRICHMENT_VERSION,
        model: modelName,
        timeoutMs,
        latencyMs: Date.now() - startedAtMs,
        assessedItemCount: itemsForAssessment.length,
      },
    };
  } catch (err) {
    const errorType = classifyAssessmentError(err);
    const warningMessage = `Evidence quality assessment failed for ${domain}; continuing with flat evidence pack`;
    return {
      items,
      qualityAssessment: {
        status: "failed",
        model: modelName,
        timeoutMs,
        latencyMs: Date.now() - startedAtMs,
        assessedItemCount: itemsForAssessment.length,
        errorType,
      },
      warningMessage,
    };
  }
}
