import { extractTextFromUrl } from "@/lib/retrieval";
import { debugLog } from "./debug";
import { classifySourceFetchFailure, selectTopSources } from "./pipeline-utils";
import { 
  CBResearchState, 
  FetchedSource, 
  EvidenceItem, 
} from "./types";
import { PipelineConfig } from "@/lib/config-schemas";

const MAX_DISCOVERED_FOLLOW_UPS_PER_SOURCE = 3;
const MAX_DISCOVERY_DEPTH = 3;

interface DiscoveredSourceCandidate {
  url: string;
  title: string;
  snippet?: string | null;
}

interface DiscoveredSourceClassificationResult {
  url: string;
  relevanceScore: number;
  originalRank: number;
}

interface FetchSourcesOptions {
  classifyDiscoveredSources?: (
    discoveredSources: DiscoveredSourceCandidate[],
  ) => Promise<DiscoveredSourceClassificationResult[]>;
}

function isDocumentLikeDiscoveredUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname.toLowerCase();
    return pathname.endsWith(".pdf")
      || pathname.includes(".pdf.")
      || pathname.endsWith(".csv")
      || pathname.endsWith(".json")
      || pathname.endsWith(".xml")
      || pathname.endsWith(".xls")
      || pathname.endsWith(".xlsx");
  } catch {
    const normalized = url.toLowerCase();
    return normalized.endsWith(".pdf")
      || normalized.includes(".pdf.")
      || normalized.endsWith(".csv")
      || normalized.endsWith(".json")
      || normalized.endsWith(".xml")
      || normalized.endsWith(".xls")
      || normalized.endsWith(".xlsx");
  }
}

function prioritizeDiscoveredFollowUps(urls: string[]): string[] {
  if (urls.length <= 1) return urls;

  const documentUrls: string[] = [];
  const navigationUrls: string[] = [];

  for (const url of urls) {
    if (isDocumentLikeDiscoveredUrl(url)) {
      documentUrls.push(url);
      continue;
    }
    navigationUrls.push(url);
  }

  return [...documentUrls, ...navigationUrls];
}

// ============================================================================
// STAGE 2: ACQUISITION (SEARCH & FETCH)
// ============================================================================

/** Map error classification types to human-readable labels for admin/operator diagnostics. */
export function humanizeErrorType(type: string): string {
  switch (type) {
    case "http_403": return "paywall/blocked";
    case "http_401": return "paywall";
    case "http_404": return "dead link";
    case "timeout": return "timeout";
    case "network": return "network error";
    case "pdf_parse_failure": return "PDF parse error";
    case "http_429": return "rate limited";
    case "http_5xx": return "server error";
    default: return type;
  }
}

function updateDomainBlockingStreak(
  domainFailureCounts: Map<string, number>,
  domain: string,
  outcomeType: string,
): void {
  if (outcomeType === "http_401" || outcomeType === "http_403") {
    domainFailureCounts.set(domain, (domainFailureCounts.get(domain) ?? 0) + 1);
    return;
  }
  domainFailureCounts.set(domain, 0);
}

/** Extract normalized hostname from a URL for same-domain grouping. */
export function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Compute per-URL stagger delays within a batch to avoid firing all same-domain
 * requests simultaneously. Different domains get zero delay; the Nth request to
 * the same domain within a batch gets (N-1) * delayMs milliseconds of stagger.
 */
export function computeBatchDelays(
  urls: string[],
  sameDomainDelayMs: number,
): number[] {
  if (sameDomainDelayMs <= 0) return urls.map(() => 0);
  const domainCount = new Map<string, number>();
  return urls.map((url) => {
    const domain = extractDomain(url);
    const nth = domainCount.get(domain) ?? 0;
    domainCount.set(domain, nth + 1);
    return nth * sameDomainDelayMs;
  });
}

/**
 * Fetch sources and add to state.sources[].
 * Returns successfully fetched sources with their extracted text.
 */
export async function fetchSources(
  relevantSources: Array<{ url: string; relevanceScore?: number }>,
  searchQuery: string,
  state: CBResearchState,
  pipelineConfig?: Pick<PipelineConfig, "sourceFetchTimeoutMs" | "parallelExtractionLimit" | "sourceExtractionMaxLength" | "iterationRetryDelayMs" | "minEvidenceContentLength" | "fetchSameDomainDelayMs" | "fetchDomainSkipThreshold">,
  options?: FetchSourcesOptions,
): Promise<Array<{ url: string; title: string; text: string }>> {
  type FetchCandidate = { url: string; relevanceScore?: number; depth: number };
  type PendingDiscoveredCandidate = FetchCandidate & {
    title: string;
    snippet?: string | null;
    parentUrl: string;
    pendingRank: number;
  };
  const fetched: Array<{ url: string; title: string; text: string }> = [];
  const fetchErrorByType: Record<string, number> = {};
  const failedUrls: string[] = [];
  const fetchErrorSamples: Array<{ url: string; type: string; message: string; status?: number }> = [];
  let fetchAttempted = 0;
  let fetchFailed = 0;
  let fetchSkippedByDomainShortCircuit = 0;
  let discoveredFollowUpRejected = 0;

  // Configurable timeout — default 20 s (was 12 s). Legal/government sources load slowly.
  const fetchTimeoutMs = pipelineConfig?.sourceFetchTimeoutMs ?? 20000;
  const extractionMaxLength = pipelineConfig?.sourceExtractionMaxLength ?? 15000;
  const retryDelayMs = pipelineConfig?.iterationRetryDelayMs ?? 2000;
  const minContentLength = pipelineConfig?.minEvidenceContentLength ?? 100;
  const sameDomainDelayMs = pipelineConfig?.fetchSameDomainDelayMs ?? 500;

  // Domain-level short-circuit: after N consecutive 401/403 failures from the same
  // domain, best-effort skip later same-domain URLs within this fetchSources() call.
  // 0 = disabled. Only triggers on 401/403 (domain-level blocking), NOT on 404/timeout/etc.
  const domainSkipThreshold = pipelineConfig?.fetchDomainSkipThreshold ?? 2;
  const domainFailureCounts = new Map<string, number>();

  const existingSourcesByUrl = new Map(
    state.sources.map((source) => [source.url, source] as const),
  );
  const toFetch: FetchCandidate[] = [];
  const deduplicatedRelevantSources = new Map<string, { url: string; relevanceScore?: number }>();
  let duplicateRelevantSourceCount = 0;
  let reusedSourceCount = 0;

  for (const source of relevantSources) {
    const existingRelevantSource = deduplicatedRelevantSources.get(source.url);
    if (existingRelevantSource) {
      duplicateRelevantSourceCount++;
      const existingScore =
        typeof existingRelevantSource.relevanceScore === "number"
          ? existingRelevantSource.relevanceScore
          : Number.NEGATIVE_INFINITY;
      const incomingScore =
        typeof source.relevanceScore === "number"
          ? source.relevanceScore
          : Number.NEGATIVE_INFINITY;
      if (incomingScore > existingScore) {
        deduplicatedRelevantSources.set(source.url, {
          url: source.url,
          relevanceScore: source.relevanceScore,
        });
      }
      continue;
    }
    deduplicatedRelevantSources.set(source.url, {
      url: source.url,
      relevanceScore: source.relevanceScore,
    });
  }

  for (const source of deduplicatedRelevantSources.values()) {
    const existingSource = existingSourcesByUrl.get(source.url);
    if (existingSource) {
      const hasCachedBody =
        typeof existingSource.fullText === "string"
        && existingSource.fullText.length > 0;
      if (
        existingSource.category !== "text/html"
        && hasCachedBody
      ) {
        fetched.push({
          url: existingSource.url,
          title: existingSource.title || existingSource.url,
          text: existingSource.fullText.slice(0, 8000),
        });
        reusedSourceCount++;
        continue;
      }

      toFetch.push({ ...source, depth: 0 });
      continue;
    }

    toFetch.push({ ...source, depth: 0 });
  }

  if (reusedSourceCount > 0) {
    debugLog(
      `[Acquisition] Reusing ${reusedSourceCount} already-fetched document/data source(s) for query "${searchQuery.slice(0, 120)}"`,
    );
  }
  if (duplicateRelevantSourceCount > 0) {
    debugLog(
      `[Acquisition] Deduplicated ${duplicateRelevantSourceCount} duplicate relevant source URL(s) before fetch`,
    );
  }
  const queuedUrls = new Set<string>([
    ...state.sources.map((source) => source.url),
    ...toFetch.map((source) => source.url),
  ]);
  let discoveredFollowUpCount = 0;

  function formatDiscoveredSourceTitle(url: string): string {
    try {
      const parsed = new URL(url);
      const leaf = parsed.pathname.split("/").filter(Boolean).pop() ?? parsed.hostname;
      const decodedLeaf = decodeURIComponent(leaf);
      const normalized = decodedLeaf
        .replace(/\.[a-z0-9]+$/i, "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      return normalized || parsed.hostname;
    } catch {
      return url;
    }
  }

  function formatDiscoveredSourceSnippet(
    parentTitle: string | undefined,
    parentUrl: string,
  ): string {
    const parentLabel = parentTitle && parentTitle.trim().length > 0
      ? parentTitle.trim()
      : parentUrl;
    return `Discovered from already relevant same-family page: ${parentLabel}`;
  }

  function collectDiscoveredFollowUps(
    urls: string[] | undefined,
    parentDepth: number,
    parentUrl: string,
    parentTitle: string | undefined,
    parentRelevanceScore: number | undefined,
    pendingDiscovered: PendingDiscoveredCandidate[],
    pendingUrls: Set<string>,
  ): void {
    if (!urls || urls.length === 0) return;
    if (parentDepth >= MAX_DISCOVERY_DEPTH) return;

    // The per-parent discovery frontier is capped before LLM relevance scoring.
    // Prefer direct document/data artifacts first so the freshest official source-native
    // evidence is not dropped behind feed/listing hops that can be explored later.
    const prioritizedUrls = prioritizeDiscoveredFollowUps(urls);
    let queuedForParent = 0;
    for (const url of prioritizedUrls) {
      if (queuedForParent >= MAX_DISCOVERED_FOLLOW_UPS_PER_SOURCE) break;
      if (queuedUrls.has(url) || pendingUrls.has(url)) continue;
      pendingUrls.add(url);
      pendingDiscovered.push({
        url,
        title: formatDiscoveredSourceTitle(url),
        snippet: formatDiscoveredSourceSnippet(parentTitle, parentUrl),
        relevanceScore: parentRelevanceScore,
        depth: parentDepth + 1,
        parentUrl,
        pendingRank: pendingDiscovered.length,
      });
      queuedForParent++;
    }
  }

  // Parallel fetch with configurable concurrency limit
  const fetchConcurrency = pipelineConfig?.parallelExtractionLimit ?? 3;

  const runFetchPass = async (
    candidates: FetchCandidate[],
  ): Promise<FetchCandidate[]> => {
    const nextFrontier: FetchCandidate[] = [];
    const pendingDiscovered: PendingDiscoveredCandidate[] = [];
    const pendingDiscoveredUrls = new Set<string>();
    for (let i = 0; i < candidates.length; i += fetchConcurrency) {
      const batch = candidates.slice(i, i + fetchConcurrency);
      // Stagger same-domain requests to avoid burst-loading the same server.
      const delays = computeBatchDelays(batch.map((s) => s.url), sameDomainDelayMs);
      const results = await Promise.all(
        batch.map(async (source, idx) => {
          if (delays[idx] > 0) await new Promise<void>((r) => setTimeout(r, delays[idx]));
          // Domain short-circuit: check if this domain has already been blocked enough times.
          // Best-effort — concurrent in-flight requests may not be skipped, but delayed
          // siblings and later batches within this call will be.
          if (domainSkipThreshold > 0) {
            const domain = extractDomain(source.url);
            const failures = domainFailureCounts.get(domain) ?? 0;
            if (failures >= domainSkipThreshold) {
              debugLog(`[Acquisition] Skipping ${source.url} — domain ${domain} blocked (${failures} consecutive 401/403)`);
              fetchSkippedByDomainShortCircuit++;
              return { source, content: null, ok: false as const, error: new Error(`domain_short_circuited: ${domain}`), skipped: true as const };
            }
          }

          fetchAttempted++;
          const domain = extractDomain(source.url);
          // First attempt
          try {
            const content = await extractTextFromUrl(source.url, {
              timeoutMs: fetchTimeoutMs,
              maxLength: extractionMaxLength,
            });
            updateDomainBlockingStreak(domainFailureCounts, domain, "success");
            return { source, content, ok: true as const };
          } catch (firstError: unknown) {
            // Retry once on transient errors (timeout / network / server-side 5xx).
            // Deterministic failures (401/403/404) are not retried — they won't resolve.
            const classified = classifySourceFetchFailure(firstError);
            if (["timeout", "network", "http_5xx"].includes(classified.type)) {
              if (retryDelayMs > 0) {
                await new Promise<void>((r) => setTimeout(r, retryDelayMs));
              }
              try {
                const content = await extractTextFromUrl(source.url, {
                  // Retry timeout: always >= first attempt, cap at schema max (60 s).
                  timeoutMs: Math.max(fetchTimeoutMs, Math.min(Math.round(fetchTimeoutMs * 1.5), 60000)),
                  maxLength: extractionMaxLength,
                });
                updateDomainBlockingStreak(domainFailureCounts, domain, "success");
                return { source, content, ok: true as const };
              } catch (retryError: unknown) {
                const retryClassified = classifySourceFetchFailure(retryError);
                updateDomainBlockingStreak(domainFailureCounts, domain, retryClassified.type);
                return { source, content: null, ok: false as const, error: retryError };
              }
            }
            updateDomainBlockingStreak(domainFailureCounts, domain, classified.type);
            return { source, content: null, ok: false as const, error: firstError };
          }
        }),
      );

      for (const result of results) {
        if (!result.ok || !result.content) {
          // Skipped items (domain short-circuit) don't count as fetch attempts or failures
          if ("skipped" in result && result.skipped) continue;
          fetchFailed++;
          const classified = classifySourceFetchFailure(result.error);
          fetchErrorByType[classified.type] = (fetchErrorByType[classified.type] ?? 0) + 1;
          if (!failedUrls.includes(result.source.url)) {
            failedUrls.push(result.source.url);
          }
          if (fetchErrorSamples.length < 10) {
            fetchErrorSamples.push({
              url: result.source.url,
              type: classified.type,
              status: classified.status,
              message: classified.message.slice(0, 240),
            });
          }
          continue;
        }
        if (result.content.text.length < minContentLength) continue;

        const existingSource = existingSourcesByUrl.get(result.source.url);
        if (existingSource) {
          existingSource.title = result.content.title || result.source.url;
          existingSource.fullText = result.content.text;
          existingSource.fetchedAt = new Date().toISOString();
          existingSource.category = result.content.contentType || "text/html";
          existingSource.fetchSuccess = true;
          existingSource.searchQuery = searchQuery;
          existingSource.relevanceScore = result.source.relevanceScore ?? null;
        } else {
          const fetchedSource: FetchedSource = {
            id: `S_${String(state.sources.length + 1).padStart(3, "0")}`,
            url: result.source.url,
            title: result.content.title || result.source.url,
            trackRecordScore: null, // Backfilled after SR prefetch (Step 4)
            fullText: result.content.text,
            fetchedAt: new Date().toISOString(),
            category: result.content.contentType || "text/html",
            fetchSuccess: true,
            searchQuery,
            relevanceScore: result.source.relevanceScore ?? null,
          };
          state.sources.push(fetchedSource);
          existingSourcesByUrl.set(fetchedSource.url, fetchedSource);
        }

        fetched.push({
          url: result.source.url,
          title: result.content.title || result.source.url,
          text: result.content.text.slice(0, 8000), // Cap for prompt size
        });

        collectDiscoveredFollowUps(
          result.content.discoveredFollowUpUrls ?? result.content.discoveredDocumentUrls,
          result.source.depth,
          result.source.url,
          result.content.title || result.source.url,
          result.source.relevanceScore,
          pendingDiscovered,
          pendingDiscoveredUrls,
        );
      }
    }

    if (pendingDiscovered.length === 0) {
      return nextFrontier;
    }

    const classifiedDiscovered = options?.classifyDiscoveredSources
      ? await options.classifyDiscoveredSources(
        pendingDiscovered.map((candidate) => ({
          url: candidate.url,
          title: candidate.title,
          snippet: candidate.snippet,
        })),
      )
      : null;

    if (!classifiedDiscovered) {
      for (const candidate of pendingDiscovered) {
        if (queuedUrls.has(candidate.url)) continue;
        queuedUrls.add(candidate.url);
        nextFrontier.push({
          url: candidate.url,
          depth: candidate.depth,
        });
        discoveredFollowUpCount++;
      }
      return nextFrontier;
    }

    const classifiedByUrl = new Map(
      classifiedDiscovered.map((candidate) => [candidate.url, candidate] as const),
    );
    // URL-derived titles/snippets are often too weak for the first discovered document
    // in an otherwise already-relevant same-family source path. Preserve that top-priority
    // artifact per parent so fetch-time extraction can inspect the real content.
    const guaranteedDocumentByParent = new Map<string, string>();
    for (const candidate of pendingDiscovered) {
      if (!isDocumentLikeDiscoveredUrl(candidate.url)) continue;
      if (!guaranteedDocumentByParent.has(candidate.parentUrl)) {
        guaranteedDocumentByParent.set(candidate.parentUrl, candidate.url);
      }
    }
    const discoveredByParent = new Map<
      string,
      Array<{ url: string; relevanceScore: number; originalRank: number; depth: number }>
    >();

    for (const candidate of pendingDiscovered) {
      const classified = classifiedByUrl.get(candidate.url);
      const isGuaranteedDocument = guaranteedDocumentByParent.get(candidate.parentUrl) === candidate.url;
      if (!classified && !isGuaranteedDocument) continue;

      const existing = discoveredByParent.get(candidate.parentUrl) ?? [];
      existing.push({
        url: candidate.url,
        relevanceScore: classified?.relevanceScore ?? candidate.relevanceScore ?? 0.5,
        originalRank: classified?.originalRank ?? candidate.pendingRank,
        depth: candidate.depth,
      });
      discoveredByParent.set(candidate.parentUrl, existing);
    }

    let acceptedDiscoveredCount = 0;
    for (const discoveredGroup of discoveredByParent.values()) {
      const selectedDiscovered = selectTopSources(
        discoveredGroup,
        MAX_DISCOVERED_FOLLOW_UPS_PER_SOURCE,
      );
      for (const candidate of selectedDiscovered) {
        if (queuedUrls.has(candidate.url)) continue;
        queuedUrls.add(candidate.url);
        nextFrontier.push({
          url: candidate.url,
          relevanceScore: candidate.relevanceScore,
          depth: candidate.depth,
        });
        discoveredFollowUpCount++;
        acceptedDiscoveredCount++;
      }
    }

    discoveredFollowUpRejected += Math.max(
      pendingDiscovered.length - acceptedDiscoveredCount,
      0,
    );

    return nextFrontier;
  };

  let frontier = toFetch;
  while (frontier.length > 0) {
    const nextFrontier = await runFetchPass(frontier);
    frontier = nextFrontier;
  }

  if (discoveredFollowUpCount > 0) {
    debugLog(`[Acquisition] Followed ${discoveredFollowUpCount} same-family artifact/feed URL(s) discovered from relevant HTML pages`);
  }
  if (discoveredFollowUpRejected > 0) {
    debugLog(`[Acquisition] Relevance gate rejected ${discoveredFollowUpRejected} discovered same-family follow-up URL(s) before fetch`);
  }

  if (fetchFailed > 0 && fetchAttempted > 0) {
    const failureRatio = fetchFailed / fetchAttempted;
    // Per-query fetch failures are routine (paywalls, 403s, 401s). Info-level only.
    // Aggregate degradation is assessed below (source_fetch_degradation).
    const errorTypeSummary = Object.entries(fetchErrorByType)
      .map(([type, count]) => `${count}\u00D7 ${humanizeErrorType(type)}`)
      .join(", ");
    state.warnings.push({
      type: "source_fetch_failure",
      severity: "info",
      message:
        `Source fetch failed for ${fetchFailed}/${fetchAttempted} source(s) while researching query "${searchQuery.slice(0, 120)}"` +
        (errorTypeSummary ? ` (${errorTypeSummary})` : ""),
      details: {
        stage: "research_fetch",
        query: searchQuery,
        attempted: fetchAttempted,
        failed: fetchFailed,
        failureRatio,
        errorByType: fetchErrorByType,
        failedUrls: failedUrls.slice(0, 20),
        errorSamples: fetchErrorSamples,
        occurrences: fetchFailed,
        ...(fetchSkippedByDomainShortCircuit > 0 ? { skippedByDomainShortCircuit: fetchSkippedByDomainShortCircuit } : {}),
      },
    });

    if (failureRatio >= 0.4 && fetchAttempted >= 3) {
      // Analytical reality: real-world sources are inaccessible (paywalls, 404s, timeouts).
      // Nothing the system can do — this is a fact about the world, not a system failure.
      // Info-level for admin visibility. If total evidence is insufficient, downstream
      // warnings (insufficient_evidence) will surface that to the user.
      state.warnings.push({
        type: "source_fetch_degradation",
        severity: "info",
        message:
          `Source fetch degradation detected (${Math.round(failureRatio * 100)}% failures, ${fetchFailed}/${fetchAttempted})`,
        details: {
          stage: "research_fetch",
          query: searchQuery,
          attempted: fetchAttempted,
          failed: fetchFailed,
          failureRatio,
          occurrences: 1,
        },
      });
    }
  }

  return fetched;
}

/**
 * Backfill missing EvidenceItem source metadata by matching sourceUrl against fetched sources.
 * Some evidence items are created before their canonical FetchedSource exists.
 *
 * Returns the number of evidence items updated.
 */
export function reconcileEvidenceSourceIds(
  evidenceItems: EvidenceItem[],
  sources: FetchedSource[],
): number {
  if (evidenceItems.length === 0 || sources.length === 0) return 0;

  const sourceByUrl = new Map(
    sources.map((source) => [source.url, source] as const),
  );

  let updatedCount = 0;
  for (const item of evidenceItems) {
    const matchedSource = sourceByUrl.get(item.sourceUrl);
    if (!matchedSource) continue;

    let updated = false;
    if (!item.sourceId) {
      item.sourceId = matchedSource.id;
      updated = true;
    }

    if (!item.sourceTitle && matchedSource.title) {
      item.sourceTitle = matchedSource.title;
      updated = true;
    }

    if (updated) updatedCount++;
  }

  return updatedCount;
}
