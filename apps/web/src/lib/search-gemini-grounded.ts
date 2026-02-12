/**
 * FactHarbor - Gemini Grounded Search Module
 *
 * Uses Google's Gemini model with built-in Search Grounding to find
 * up-to-date information from the web. This provides access to Google's
 * live search index which is fresher than Google CSE or SerpAPI.
 *
 * @module search-gemini-grounded
 */

import { generateText } from "ai";
import { google } from "@ai-sdk/google";
import { loadAndRenderSection } from "./analyzer/prompt-loader";

export interface GroundedSearchResult {
  /** Sources discovered by Gemini's search grounding */
  sources: Array<{
    url: string;
    title: string;
    snippet: string;
  }>;
  /** Search queries that Gemini generated internally */
  searchQueries: string[];
  /** The grounded response text from Gemini */
  groundedResponse: string;
  /** Whether search grounding was actually used */
  groundingUsed: boolean;
}

export interface GroundedSearchOptions {
  /** The research focus or question to search for */
  prompt: string;
  /** Context about the topic being researched */
  context?: string;
  /** Model to use (default: gemini-2.5-flash) */
  model?: string;
}

/**
 * Search the web using Gemini's built-in Google Search grounding.
 *
 * This approach lets Gemini decide what to search for and how to interpret
 * the results, which can be more effective for recent/breaking news.
 *
 * Note: This only works when the active LLM provider is Google/Gemini. The grounding metadata
 * is extracted from the response and converted to a format compatible
 * with FactHarbor's existing source pipeline.
 */
export async function searchWithGrounding(
  options: GroundedSearchOptions
): Promise<GroundedSearchResult> {
  const { prompt, context, model: modelName = "gemini-2.5-flash" } = options;

  console.log(`[Gemini-Grounded] Starting grounded search for: "${prompt.substring(0, 80)}..."`);

  // Create Gemini model
  // Note: Search grounding (useSearchGrounding) requires @ai-sdk/google v1.0+ with the google() options parameter.
  // For now, we use the standard model and rely on Gemini's knowledge + the search prompt to get recent info.
  // Full grounding support will be available when the SDK is upgraded.
  const model = google(modelName);

  try {
    const currentDateIso = new Date().toISOString().slice(0, 10);
    const renderedPrompt = await loadAndRenderSection("orchestrated", "GROUNDED_SEARCH_REQUEST", {
      CURRENT_DATE_ISO: currentDateIso,
      CONTEXT_TEXT: context || "",
      RESEARCH_TASK: prompt,
    });
    if (!renderedPrompt?.content?.trim()) {
      throw new Error("Missing GROUNDED_SEARCH_REQUEST prompt section in orchestrated prompt profile");
    }
    const searchPrompt = renderedPrompt.content;

    const result = await generateText({
      model,
      prompt: searchPrompt,
    });

    // Extract grounding metadata from the result
    // The AI SDK exposes this in the experimental_providerMetadata or sources
    const groundingMetadata = extractGroundingMetadata(result);

    console.log(`[Gemini-Grounded] Search complete. Found ${groundingMetadata.sources.length} sources.`);
    console.log(`[Gemini-Grounded] Grounding used: ${groundingMetadata.groundingUsed}`);

    return {
      sources: groundingMetadata.sources,
      searchQueries: groundingMetadata.searchQueries,
      groundedResponse: result.text,
      groundingUsed: groundingMetadata.groundingUsed,
    };
  } catch (error) {
    console.error(`[Gemini-Grounded] Error during grounded search:`, error);
    return {
      sources: [],
      searchQueries: [],
      groundedResponse: "",
      groundingUsed: false,
    };
  }
}

/**
 * Extract grounding metadata from the AI SDK response.
 * The structure varies by SDK version, so we handle multiple formats.
 */
function extractGroundingMetadata(result: any): {
  sources: Array<{ url: string; title: string; snippet: string }>;
  searchQueries: string[];
  groundingUsed: boolean;
} {
  const sources: Array<{ url: string; title: string; snippet: string }> = [];
  const searchQueries: string[] = [];
  let groundingUsed = false;

  try {
    // Check for experimental_providerMetadata (AI SDK 4.x+)
    const providerMeta = result.experimental_providerMetadata?.google;
    if (providerMeta?.groundingMetadata) {
      groundingUsed = true;
      const metadata = providerMeta.groundingMetadata;

      // Extract search queries
      if (metadata.webSearchQueries && Array.isArray(metadata.webSearchQueries)) {
        searchQueries.push(...metadata.webSearchQueries);
      }

      // Extract grounding chunks (sources)
      if (metadata.groundingChunks && Array.isArray(metadata.groundingChunks)) {
        for (const chunk of metadata.groundingChunks) {
          if (chunk.web) {
            sources.push({
              url: chunk.web.uri || "",
              title: chunk.web.title || "",
              snippet: "", // Snippets are in groundingSupports
            });
          }
        }
      }

      // Extract snippets from groundingSupports
      if (metadata.groundingSupports && Array.isArray(metadata.groundingSupports)) {
        for (const support of metadata.groundingSupports) {
          const segment = support.segment?.text || "";
          // Link snippet to source via groundingChunkIndices
          if (support.groundingChunkIndices && support.groundingChunkIndices.length > 0) {
            const idx = support.groundingChunkIndices[0];
            if (sources[idx] && !sources[idx].snippet) {
              sources[idx].snippet = segment;
            }
          }
        }
      }
    }

    // Fallback: Check for sources directly on result (older SDK versions)
    if (!groundingUsed && result.sources && Array.isArray(result.sources)) {
      groundingUsed = true;
      for (const source of result.sources) {
        sources.push({
          url: source.url || source.uri || "",
          title: source.title || "",
          snippet: source.snippet || source.text || "",
        });
      }
    }

    // Another fallback: Check response annotations
    if (!groundingUsed && result.response?.annotations) {
      groundingUsed = true;
      for (const annotation of result.response.annotations) {
        if (annotation.source) {
          sources.push({
            url: annotation.source.url || "",
            title: annotation.source.title || "",
            snippet: annotation.text || "",
          });
        }
      }
    }
  } catch (e) {
    console.error("[Gemini-Grounded] Error extracting grounding metadata:", e);
  }

  return { sources, searchQueries, groundingUsed };
}

/**
 * Convert grounded search results to FactHarbor's FetchedSource format.
 * This allows the results to flow into the existing evidence extraction pipeline.
 */
export function convertToFetchedSources(
  result: GroundedSearchResult,
  startId: number = 1
): Array<{
  id: string;
  url: string;
  title: string;
  fullText: string;
  trackRecordScore: number;
  fetchedAt: string;
  category: string;
  fetchSuccess: boolean;
  searchQuery?: string;
}> {
  return result.sources.map((source, index) => ({
    id: `S${startId + index}`,
    url: source.url,
    title: source.title,
    fullText: source.snippet || "", // PR-B: Ground Realism - only use snippet if available, no synthetic content
    trackRecordScore: 0.5, // Default score (0-1 scale) - will be overridden by source reliability bundle
    fetchedAt: new Date().toISOString(),
    category: "grounded_search_candidate", // PR-B: Mark as candidate (URL should be fetched via pipeline)
    fetchSuccess: true,
    searchQuery: result.searchQueries[0] || undefined,
  }));
}

/**
 * Check if Gemini grounded search is available.
 * Requires llmProvider=google and a valid Google API key.
 */
export function isGroundedSearchAvailable(providerOverride?: string): boolean {
  const provider = (providerOverride || "anthropic").toLowerCase();
  const hasGoogleKey = !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  return (provider === "google" || provider === "gemini") && hasGoogleKey;
}
