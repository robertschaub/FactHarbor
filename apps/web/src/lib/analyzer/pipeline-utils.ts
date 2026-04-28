/**
 * ClaimBoundary Pipeline Utilities
 *
 * Leaf helpers extracted from claimboundary-pipeline.ts.
 * These functions are structural utilities used by multiple stages and/or tests.
 */

import type {
  AtomicClaim,
  CBClaimVerdict,
  ClaimVerdict7Point,
  EvidenceItem,
  SourceType,
} from "./types";
import { isJobAborted } from "@/lib/job-abort";

export const JOB_ABORT_ERROR_NAME = "JobAbortError";

export function isJobAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === JOB_ABORT_ERROR_NAME;
}

/**
 * Checks if a job has been aborted via the abort-job endpoint.
 * Throws an error if the job was cancelled.
 */
export function checkAbortSignal(jobId: string | undefined): void {
  if (jobId && isJobAborted(jobId)) {
    const error = new Error(`Job ${jobId} was cancelled`);
    error.name = JOB_ABORT_ERROR_NAME;
    throw error;
  }
}

/**
 * Detect whether the input is a statement or a question/article.
 * Exported for unit testing.
 */
export function detectInputType(input: string): "claim" | "article" {
  const trimmed = input.trim();
  if (trimmed.length < 200) return "claim";
  return "article";
}

/**
 * Select top N sources by relevance score (desc), with original search rank as tie-break (asc).
 */
export function selectTopSources<T extends { relevanceScore: number; originalRank: number }>(
  sources: T[],
  topN: number,
): T[] {
  return [...sources]
    .sort((a, b) => b.relevanceScore - a.relevanceScore || a.originalRank - b.originalRank)
    .slice(0, topN);
}

export function classifySourceFetchFailure(
  error: unknown,
): { type: string; status?: number; message: string } {
  const fallback = { type: "unknown", message: "Unknown fetch failure" };
  if (!error) return fallback;

  const status =
    typeof (error as any)?.status === "number"
      ? (error as any).status
      : typeof (error as any)?.statusCode === "number"
        ? (error as any).statusCode
        : undefined;
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if ((error as any)?.name === "AbortError" || normalized.includes("timeout")) {
    return { type: "timeout", status, message };
  }
  if (status === 401 || normalized.includes("http 401")) {
    return { type: "http_401", status: 401, message };
  }
  if (status === 403 || normalized.includes("http 403")) {
    return { type: "http_403", status: 403, message };
  }
  if (status === 404 || normalized.includes("http 404")) {
    return { type: "http_404", status: 404, message };
  }
  if (status === 429 || normalized.includes("http 429")) {
    return { type: "http_429", status: 429, message };
  }
  if ((typeof status === "number" && status >= 500) || normalized.includes("http 5")) {
    return { type: "http_5xx", status, message };
  }
  if (
    normalized.includes("invalid pdf")
    || normalized.includes("failed to extract pdf text")
    || normalized.includes("extracted pdf text is empty")
  ) {
    return { type: "pdf_parse_failure", status, message };
  }
  if (normalized.includes("econnrefused")) {
    return { type: "connection_refused", status, message };
  }
  if (
    normalized.includes("enotfound") ||
    normalized.includes("eai_again") ||
    normalized.includes("econnreset") ||
    normalized.includes("fetch failed") ||
    normalized.includes("network")
  ) {
    return { type: "network", status, message };
  }

  return { type: "unknown", status, message };
}

/**
 * Map LLM category strings to EvidenceItem.category enum values.
 */
export function mapCategory(category: string): EvidenceItem["category"] {
  const normalized = category.toLowerCase().replace(/[_\s-]+/g, "_");
  const validCategories: Record<string, EvidenceItem["category"]> = {
    legal_provision: "legal_provision",
    evidence: "evidence",
    direct_evidence: "direct_evidence",
    expert_quote: "expert_quote",
    expert_testimony: "expert_quote",
    statistic: "statistic",
    statistical_data: "statistic",
    event: "event",
    criticism: "criticism",
    case_study: "evidence",
  };
  return validCategories[normalized] ?? "evidence";
}

/**
 * Normalize source URL to a distinct-domain key for sufficiency checks.
 */
export function extractDomain(sourceUrl?: string): string | null {
  if (!sourceUrl || typeof sourceUrl !== "string") return null;
  try {
    const hostname = new URL(sourceUrl).hostname.trim().toLowerCase();
    if (!hostname) return null;
    return hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Map LLM sourceType strings to SourceType enum values.
 */
export function mapSourceType(sourceType?: string): SourceType {
  if (!sourceType) return "other";
  const normalized = sourceType.toLowerCase().replace(/[_\s-]+/g, "_");
  const fuzzy = sourceType
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
  const validTypes: Record<string, SourceType> = {
    peer_reviewed_study: "peer_reviewed_study",
    fact_check_report: "fact_check_report",
    government_report: "government_report",
    legal_document: "legal_document",
    news_primary: "news_primary",
    news_secondary: "news_secondary",
    expert_statement: "expert_statement",
    organization_report: "organization_report",
  };
  if (validTypes[normalized]) {
    return validTypes[normalized];
  }

  if (/(fact[\s_-]*check|debunk|verification report)/.test(fuzzy)) {
    return "fact_check_report";
  }

  if (/(peer[\s_-]*review|systematic review|meta[\s_-]*analysis|journal|scientific study|scientific paper|clinical trial|cohort study)/.test(fuzzy)) {
    return "peer_reviewed_study";
  }

  if (/(legal|law|statute|regulation|ordinance|constitution|court|tribunal|judg|case law|decree|fedlex)/.test(fuzzy)) {
    return "legal_document";
  }

  if (/(government|official|ministry|department|agency|bureau|administration|administrative|federal|state secretariat|secretariat|public authority|registry|register|statistics office|statistical office|national statistics|migration statistics|census|statistik|statistique|statistica|estadistica|verwaltung)/.test(fuzzy)) {
    return "government_report";
  }

  if (/(expert|professor|researcher|scientist|specialist|economist|analyst)/.test(fuzzy)) {
    return "expert_statement";
  }

  if (/(organisation|organization|ngo|nonprofit|non-profit|association|foundation|institute|think tank|observatory|watch|commission|report)/.test(fuzzy)) {
    return "organization_report";
  }

  if (/(newswire|press agency|press release|official statement|briefing|transcript|wire service)/.test(fuzzy)) {
    return "news_primary";
  }

  if (/(newspaper|news|magazine|media|broadcast|article)/.test(fuzzy)) {
    return "news_secondary";
  }

  return "other";
}

export function normalizeExtractedSourceType(sourceType?: string): SourceType | undefined {
  return mapSourceType(sourceType);
}

export function createErrorFingerprint(error: unknown): string {
  const raw = error instanceof Error
    ? `${error.name}:${error.message}:${error.stack ?? ""}`
    : String(error);
  return raw.replace(/\s+/g, " ").slice(0, 320);
}

export function createUnverifiedFallbackVerdict(
  claim: AtomicClaim,
  verdictReason: string,
  reasoning: string,
): CBClaimVerdict {
  return {
    id: `CV_${claim.id}`,
    claimId: claim.id,
    truthPercentage: 50,
    verdictReason,
    verdict: "UNVERIFIED" as ClaimVerdict7Point,
    confidence: 0,
    confidenceTier: "INSUFFICIENT" as const,
    reasoning,
    harmPotential: claim.harmPotential,
    thesisRelevance: claim.thesisRelevance,
    isContested: false,
    supportingEvidenceIds: [],
    contradictingEvidenceIds: [],
    boundaryFindings: [],
    consistencyResult: { claimId: claim.id, percentages: [50], average: 50, spread: 0, stable: true, assessed: false },
    challengeResponses: [],
    triangulationScore: { boundaryCount: 0, supporting: 0, contradicting: 0, level: "weak" as const, factor: 1.0 },
  };
}
