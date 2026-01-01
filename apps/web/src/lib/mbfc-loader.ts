/**
 * FactHarbor MBFC Source Bundle Loader
 * 
 * Fetches source reliability ratings from Media Bias/Fact Check API (via RapidAPI)
 * and generates a source bundle JSON file for use with FH_SOURCE_BUNDLE_PATH.
 * 
 * Usage:
 *   npx ts-node mbfc-loader.ts [output-path]
 * 
 * Environment variables:
 *   RAPIDAPI_KEY - Your RapidAPI key (required)
 *   MBFC_OUTPUT_PATH - Output path for bundle (default: ./source-bundle.json)
 * 
 * @version 1.0.0
 * @see https://rapidapi.com/mbfcnews/api/media-bias-fact-check-ratings-api2
 */

import * as fs from "fs";
import * as path from "path";

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  rapidApiHost: "media-bias-fact-check-ratings-api2.p.rapidapi.com",
  rapidApiKey: process.env.RAPIDAPI_KEY || "",
  outputPath: process.env.MBFC_OUTPUT_PATH || "./source-bundle.json",
  
  // MBFC factual reporting levels mapped to reliability scores
  // Higher = more reliable for factual reporting
  factualScores: {
    "very high": 0.95,
    "high": 0.85,
    "mostly factual": 0.75,
    "mixed": 0.50,
    "low": 0.30,
    "very low": 0.15,
  } as Record<string, number>,
  
  // MBFC credibility levels (additional factor)
  credibilityScores: {
    "high credibility": 1.0,
    "medium credibility": 0.85,
    "low credibility": 0.60,
    "n/a": 0.75,
  } as Record<string, number>,
  
  // Penalty for questionable categories
  categoryPenalties: {
    "conspiracy-pseudoscience": 0.30,
    "questionable": 0.40,
    "satire": 0.50,  // Satire is intentionally not factual
    "fake-news": 0.10,
  } as Record<string, number>,
};

// ============================================================================
// TYPES
// ============================================================================

interface MBFCSource {
  name: string;
  url: string;
  domain?: string;
  bias?: string;
  factual_reporting?: string;
  credibility?: string;
  category?: string;
  mbfc_url?: string;
}

interface SourceBundle {
  version: string;
  generated: string;
  sourceCount: number;
  provider: string;
  providerUrl: string;
  sources: Record<string, number>;
  metadata: Record<string, SourceMetadata>;
}

interface SourceMetadata {
  name: string;
  bias?: string;
  factual?: string;
  credibility?: string;
  category?: string;
  mbfcUrl?: string;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Fetch all sources from MBFC API
 */
async function fetchMBFCSources(): Promise<MBFCSource[]> {
  if (!CONFIG.rapidApiKey) {
    throw new Error("RAPIDAPI_KEY environment variable is required");
  }
  
  console.log("[MBFC Loader] Fetching sources from MBFC API...");
  
  const response = await fetch(`https://${CONFIG.rapidApiHost}/sources`, {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": CONFIG.rapidApiKey,
      "X-RapidAPI-Host": CONFIG.rapidApiHost,
    },
  });
  
  if (!response.ok) {
    throw new Error(`MBFC API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // API might return { sources: [...] } or just [...]
  const sources = Array.isArray(data) ? data : data.sources || [];
  
  console.log(`[MBFC Loader] Fetched ${sources.length} sources`);
  return sources;
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    // Try to extract domain directly if URL parsing fails
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/\s]+)/i);
    return match ? match[1].toLowerCase() : null;
  }
}

/**
 * Calculate reliability score for a source
 */
function calculateScore(source: MBFCSource): number | null {
  const factual = source.factual_reporting?.toLowerCase();
  const credibility = source.credibility?.toLowerCase();
  const category = source.category?.toLowerCase();
  
  // Must have factual reporting to calculate score
  if (!factual || CONFIG.factualScores[factual] === undefined) {
    return null;
  }
  
  let score = CONFIG.factualScores[factual];
  
  // Apply credibility modifier (slight adjustment)
  if (credibility && CONFIG.credibilityScores[credibility] !== undefined) {
    const credMod = CONFIG.credibilityScores[credibility];
    // Blend: 80% factual, 20% credibility
    score = score * 0.8 + (score * credMod) * 0.2;
  }
  
  // Apply category penalty
  if (category) {
    for (const [cat, penalty] of Object.entries(CONFIG.categoryPenalties)) {
      if (category.includes(cat)) {
        score = score * penalty;
        break;
      }
    }
  }
  
  // Clamp to [0.05, 0.99]
  return Math.max(0.05, Math.min(0.99, Math.round(score * 100) / 100));
}

/**
 * Build source bundle from MBFC data
 */
function buildBundle(sources: MBFCSource[]): SourceBundle {
  const bundle: SourceBundle = {
    version: "1.0.0",
    generated: new Date().toISOString(),
    sourceCount: 0,
    provider: "Media Bias/Fact Check",
    providerUrl: "https://mediabiasfactcheck.com",
    sources: {},
    metadata: {},
  };
  
  let processed = 0;
  let skipped = 0;
  
  for (const source of sources) {
    const domain = source.domain || extractDomain(source.url || "");
    if (!domain) {
      skipped++;
      continue;
    }
    
    const score = calculateScore(source);
    if (score === null) {
      skipped++;
      continue;
    }
    
    // Add to bundle
    bundle.sources[domain] = score;
    bundle.metadata[domain] = {
      name: source.name,
      bias: source.bias,
      factual: source.factual_reporting,
      credibility: source.credibility,
      category: source.category,
      mbfcUrl: source.mbfc_url,
    };
    
    processed++;
  }
  
  bundle.sourceCount = processed;
  
  console.log(`[MBFC Loader] Processed: ${processed}, Skipped: ${skipped}`);
  
  return bundle;
}

/**
 * Save bundle to file
 */
function saveBundle(bundle: SourceBundle, outputPath: string): void {
  const resolvedPath = path.resolve(outputPath);
  const dir = path.dirname(resolvedPath);
  
  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // Write bundle
  fs.writeFileSync(resolvedPath, JSON.stringify(bundle, null, 2), "utf-8");
  
  console.log(`[MBFC Loader] Bundle saved to: ${resolvedPath}`);
  console.log(`[MBFC Loader] Sources: ${bundle.sourceCount}`);
}

/**
 * Create a minimal bundle for testing (without API)
 */
function createTestBundle(): SourceBundle {
  console.log("[MBFC Loader] Creating test bundle (no API key provided)...");
  
  // Sample data based on known MBFC ratings
  const testSources: Record<string, { score: number; factual: string; bias: string }> = {
    // Wire services - Very High factual
    "reuters.com": { score: 0.95, factual: "very high", bias: "least biased" },
    "apnews.com": { score: 0.95, factual: "very high", bias: "least biased" },
    "afp.com": { score: 0.92, factual: "very high", bias: "least biased" },
    
    // Major news - High factual
    "bbc.com": { score: 0.85, factual: "high", bias: "left-center" },
    "bbc.co.uk": { score: 0.85, factual: "high", bias: "left-center" },
    "npr.org": { score: 0.85, factual: "high", bias: "left-center" },
    "pbs.org": { score: 0.85, factual: "high", bias: "left-center" },
    "economist.com": { score: 0.85, factual: "high", bias: "least biased" },
    
    // Quality newspapers - High/Mostly factual
    "nytimes.com": { score: 0.82, factual: "high", bias: "left-center" },
    "washingtonpost.com": { score: 0.82, factual: "high", bias: "left-center" },
    "wsj.com": { score: 0.82, factual: "high", bias: "right-center" },
    "theguardian.com": { score: 0.80, factual: "mostly factual", bias: "left-center" },
    "ft.com": { score: 0.85, factual: "high", bias: "least biased" },
    
    // International
    "dw.com": { score: 0.85, factual: "high", bias: "left-center" },
    "aljazeera.com": { score: 0.75, factual: "mostly factual", bias: "left-center" },
    "france24.com": { score: 0.85, factual: "high", bias: "left-center" },
    
    // Fact-checkers
    "snopes.com": { score: 0.85, factual: "high", bias: "least biased" },
    "politifact.com": { score: 0.85, factual: "high", bias: "least biased" },
    "factcheck.org": { score: 0.90, factual: "very high", bias: "least biased" },
    
    // Science/Academic
    "nature.com": { score: 0.95, factual: "very high", bias: "pro-science" },
    "sciencemag.org": { score: 0.95, factual: "very high", bias: "pro-science" },
    "scientificamerican.com": { score: 0.85, factual: "high", bias: "pro-science" },
    
    // Think tanks (various perspectives)
    "brookings.edu": { score: 0.75, factual: "high", bias: "left-center" },
    "heritage.org": { score: 0.70, factual: "mostly factual", bias: "right" },
    "cato.org": { score: 0.75, factual: "high", bias: "right-center" },
    "cfr.org": { score: 0.85, factual: "high", bias: "least biased" },
    
    // Mixed factual (lower scores)
    "cnn.com": { score: 0.70, factual: "mostly factual", bias: "left" },
    "msnbc.com": { score: 0.55, factual: "mixed", bias: "left" },
    
    // Low factual / Questionable
    "foxnews.com": { score: 0.30, factual: "low", bias: "right" },
    "infowars.com": { score: 0.10, factual: "very low", bias: "conspiracy" },
    "breitbart.com": { score: 0.35, factual: "mixed", bias: "extreme right" },
    "dailykos.com": { score: 0.50, factual: "mixed", bias: "left" },
    
    // Satire
    "theonion.com": { score: 0.50, factual: "n/a", bias: "satire" },
    "babylonbee.com": { score: 0.50, factual: "n/a", bias: "satire" },
  };
  
  const bundle: SourceBundle = {
    version: "1.0.0-test",
    generated: new Date().toISOString(),
    sourceCount: Object.keys(testSources).length,
    provider: "Media Bias/Fact Check (Test Data)",
    providerUrl: "https://mediabiasfactcheck.com",
    sources: {},
    metadata: {},
  };
  
  for (const [domain, data] of Object.entries(testSources)) {
    bundle.sources[domain] = data.score;
    bundle.metadata[domain] = {
      name: domain,
      factual: data.factual,
      bias: data.bias,
    };
  }
  
  return bundle;
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const outputPath = process.argv[2] || CONFIG.outputPath;
  
  console.log("=".repeat(60));
  console.log("FactHarbor MBFC Source Bundle Loader");
  console.log("=".repeat(60));
  
  let bundle: SourceBundle;
  
  if (CONFIG.rapidApiKey) {
    // Fetch from API
    const sources = await fetchMBFCSources();
    bundle = buildBundle(sources);
  } else {
    // Create test bundle
    console.log("[MBFC Loader] No RAPIDAPI_KEY found, creating test bundle...");
    bundle = createTestBundle();
  }
  
  saveBundle(bundle, outputPath);
  
  console.log("=".repeat(60));
  console.log("Done! Set FH_SOURCE_BUNDLE_PATH to use this bundle.");
  console.log(`Example: FH_SOURCE_BUNDLE_PATH=${path.resolve(outputPath)}`);
  console.log("=".repeat(60));
}

// Run if executed directly
main().catch((err) => {
  console.error("[MBFC Loader] Error:", err);
  process.exit(1);
});
