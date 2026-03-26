import { extractTextFromUrl } from "@/lib/retrieval";
import { debugLog } from "./debug";
import { classifySourceFetchFailure } from "./pipeline-utils";
import { 
  CBResearchState, 
  FetchedSource, 
  EvidenceItem, 
} from "./types";
import { PipelineConfig } from "@/lib/config-schemas";

// ============================================================================
// STAGE 2: ACQUISITION (SEARCH & FETCH)
// ============================================================================

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
  pipelineConfig?: Pick<PipelineConfig, "sourceFetchTimeoutMs" | "parallelExtractionLimit" | "sourceExtractionMaxLength" | "iterationRetryDelayMs" | "minEvidenceContentLength" | "fetchSameDomainDelayMs">,
): Promise<Array<{ url: string; title: string; text: string }>> {
  const fetched: Array<{ url: string; title: string; text: string }> = [];
  const fetchErrorByType: Record<string, number> = {};
  const failedUrls: string[] = [];
  const fetchErrorSamples: Array<{ url: string; type: string; message: string; status?: number }> = [];
  let fetchAttempted = 0;
  let fetchFailed = 0;

  // Configurable timeout — default 20 s (was 12 s). Legal/government sources load slowly.
  const fetchTimeoutMs = pipelineConfig?.sourceFetchTimeoutMs ?? 20000;
  const extractionMaxLength = pipelineConfig?.sourceExtractionMaxLength ?? 15000;
  const retryDelayMs = pipelineConfig?.iterationRetryDelayMs ?? 2000;
  const minContentLength = pipelineConfig?.minEvidenceContentLength ?? 100;
  const sameDomainDelayMs = pipelineConfig?.fetchSameDomainDelayMs ?? 500;

  // Filter out already-fetched URLs
  const toFetch = relevantSources.filter(
    (source) => !state.sources.some((s) => s.url === source.url),
  );

  // Parallel fetch with configurable concurrency limit
  const fetchConcurrency = pipelineConfig?.parallelExtractionLimit ?? 3;
  for (let i = 0; i < toFetch.length; i += fetchConcurrency) {
    const batch = toFetch.slice(i, i + fetchConcurrency);
    fetchAttempted += batch.length;
    // Stagger same-domain requests to avoid burst-loading the same server.
    const delays = computeBatchDelays(batch.map((s) => s.url), sameDomainDelayMs);
    const results = await Promise.all(
      batch.map(async (source, idx) => {
        if (delays[idx] > 0) await new Promise<void>((r) => setTimeout(r, delays[idx]));
        // First attempt
        try {
          const content = await extractTextFromUrl(source.url, {
            timeoutMs: fetchTimeoutMs,
            maxLength: extractionMaxLength,
          });
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
              return { source, content, ok: true as const };
            } catch (retryError: unknown) {
              return { source, content: null, ok: false as const, error: retryError };
            }
          }
          return { source, content: null, ok: false as const, error: firstError };
        }
      }),
    );

    for (const result of results) {
      if (!result.ok || !result.content) {
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
      };
      state.sources.push(fetchedSource);

      fetched.push({
        url: result.source.url,
        title: result.content.title || result.source.url,
        text: result.content.text.slice(0, 8000), // Cap for prompt size
      });
    }
  }

  if (fetchFailed > 0 && fetchAttempted > 0) {
    const failureRatio = fetchFailed / fetchAttempted;
    // Per-query fetch failures are routine (paywalls, 403s, 401s). Info-level only.
    // Aggregate degradation is assessed below (source_fetch_degradation).
    state.warnings.push({
      type: "source_fetch_failure",
      severity: "info",
      message:
        `Source fetch failed for ${fetchFailed}/${fetchAttempted} source(s) while researching query "${searchQuery.slice(0, 120)}"`,
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
