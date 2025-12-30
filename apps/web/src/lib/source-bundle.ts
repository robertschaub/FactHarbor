import fs from "node:fs";
import path from "node:path";

import { extractTextFromUrl } from "@/lib/retrieval";
import { searchWeb } from "@/lib/web-search";

type SourceInput = {
  url: string;
  title?: string;
  sourceType?: "NewsOutlet" | "AcademicJournal" | "GovernmentAgency" | "NGO" | "ThinkTank" | "Court" | "InternationalOrg" | "Other";
  trackRecordScore?: number;
  _searchType?: 'primary' | 'contradiction';
};

type SourceBundleConfig = {
  sources: SourceInput[];
};

export type SourceBundle = {
  sources: Array<{
    id: string;
    url: string;
    title: string | null;
    sourceType: SourceInput["sourceType"] | null;
    trackRecordScore: number | null;
    excerpt: string;
    fetchStatus?: 'success' | 'failed' | 'timeout';
  }>;
  meta: {
    primarySources: number;
    contradictionSources: number;
    fetchSuccesses: number;
    fetchFailures: number;
  };
};

type BuildSourceBundleOptions = {
  inputText: string;
  onEvent?: (message: string, progress: number) => void;
};

// IMPROVED: Increased from 6 to 10
const DEFAULT_MAX_SOURCES = 10;
const DEFAULT_EXCERPT_CHARS = 1200;
// NEW: Parallel fetch timeout
const PARALLEL_FETCH_TIMEOUT_MS = 8000;

// NEW: Known source credibility ratings
const KNOWN_SOURCES: Record<string, { type: SourceInput['sourceType']; score: number }> = {
  // Highest credibility (0.9-1.0)
  'reuters.com': { type: 'NewsOutlet', score: 0.95 },
  'apnews.com': { type: 'NewsOutlet', score: 0.95 },
  'who.int': { type: 'InternationalOrg', score: 0.95 },
  'cdc.gov': { type: 'GovernmentAgency', score: 0.95 },
  'nih.gov': { type: 'GovernmentAgency', score: 0.95 },
  'supremecourt.gov': { type: 'Court', score: 0.98 },
  'stf.jus.br': { type: 'Court', score: 0.95 },  // Brazil Supreme Court
  'nature.com': { type: 'AcademicJournal', score: 0.95 },
  'science.org': { type: 'AcademicJournal', score: 0.95 },
  'ec.europa.eu': { type: 'GovernmentAgency', score: 0.92 },
  'un.org': { type: 'InternationalOrg', score: 0.92 },
  
  // High credibility (0.7-0.89)
  'nytimes.com': { type: 'NewsOutlet', score: 0.85 },
  'washingtonpost.com': { type: 'NewsOutlet', score: 0.85 },
  'bbc.com': { type: 'NewsOutlet', score: 0.88 },
  'bbc.co.uk': { type: 'NewsOutlet', score: 0.88 },
  'theguardian.com': { type: 'NewsOutlet', score: 0.82 },
  'economist.com': { type: 'NewsOutlet', score: 0.85 },
  'ft.com': { type: 'NewsOutlet', score: 0.85 },
  'wsj.com': { type: 'NewsOutlet', score: 0.85 },
  'politico.com': { type: 'NewsOutlet', score: 0.78 },
  'lawfaremedia.org': { type: 'ThinkTank', score: 0.82 },
  'carnegieendowment.org': { type: 'ThinkTank', score: 0.80 },
  'verfassungsblog.de': { type: 'AcademicJournal', score: 0.78 },
  'fairobserver.com': { type: 'NewsOutlet', score: 0.72 },
  
  // Medium credibility (0.5-0.69)
  'brookings.edu': { type: 'ThinkTank', score: 0.75 },
  'cfr.org': { type: 'ThinkTank', score: 0.75 },
  'hrw.org': { type: 'NGO', score: 0.70 },
  'amnesty.org': { type: 'NGO', score: 0.70 },
  'wikipedia.org': { type: 'Other', score: 0.65 },
  
  // Lower credibility (explicitly known partisan)
  'breitbart.com': { type: 'NewsOutlet', score: 0.35 },
  'huffpost.com': { type: 'NewsOutlet', score: 0.50 },
  'foxnews.com': { type: 'NewsOutlet', score: 0.55 },
  'msnbc.com': { type: 'NewsOutlet', score: 0.55 },
};

// NEW: Assess source credibility
function assessSourceCredibility(url: string): { type: SourceInput['sourceType'] | null; score: number | null } {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    
    // Check known sources
    if (KNOWN_SOURCES[hostname]) {
      return KNOWN_SOURCES[hostname];
    }
    
    // Check for partial matches (subdomains)
    for (const [domain, info] of Object.entries(KNOWN_SOURCES)) {
      if (hostname.endsWith('.' + domain) || hostname === domain) {
        return info;
      }
    }
    
    // Heuristic assessment for unknown sources
    if (hostname.endsWith('.gov') || hostname.endsWith('.gov.br') || hostname.endsWith('.gov.uk')) {
      return { type: 'GovernmentAgency', score: 0.85 };
    }
    if (hostname.endsWith('.edu') || hostname.endsWith('.ac.uk')) {
      return { type: 'AcademicJournal', score: 0.80 };
    }
    if (hostname.endsWith('.int')) {
      return { type: 'InternationalOrg', score: 0.85 };
    }
    if (hostname.endsWith('.org')) {
      return { type: 'NGO', score: 0.60 };
    }
    
    // Unknown - default to medium-low
    return { type: null, score: 0.50 };
  } catch {
    return { type: null, score: null };
  }
}

function parseUrls(text: string): string[] {
  const matches = text.match(/\bhttps?:\/\/[^\s)]+/gi) ?? [];
  const unique = new Set(matches.map((m) => m.replace(/[),.;]+$/, "")));
  return Array.from(unique);
}

function loadSourceConfig(configPath: string): SourceBundleConfig | null {
  if (!fs.existsSync(configPath)) return null;
  const raw = fs.readFileSync(configPath, "utf-8");
  return JSON.parse(raw) as SourceBundleConfig;
}

function resolveConfigPath(): string | null {
  const custom = process.env.FH_SOURCE_BUNDLE_PATH;
  if (!custom) return null;
  if (path.isAbsolute(custom)) return custom;
  return path.resolve(process.cwd(), custom);
}

// NEW: Extract key terms for search
function extractKeyTerms(text: string, maxTerms: number = 5): string {
  return text
    .slice(0, 300)
    .replace(/[^\w\s]/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 4 && !['about', 'their', 'there', 'would', 'could', 'should', 'which', 'these', 'those'].includes(w))
    .slice(0, maxTerms)
    .join(' ');
}

export async function buildSourceBundle(opts: BuildSourceBundleOptions): Promise<SourceBundle> {
  const onEvent = opts.onEvent ?? (() => {});
  const maxSources = Math.max(1, parseInt(process.env.FH_SOURCE_BUNDLE_MAX_SOURCES ?? "", 10) || DEFAULT_MAX_SOURCES);
  const excerptChars = Math.max(200, parseInt(process.env.FH_SOURCE_BUNDLE_EXCERPT_CHARS ?? "", 10) || DEFAULT_EXCERPT_CHARS);

  const sources: SourceInput[] = [];
  let primarySourceCount = 0;
  let contradictionSourceCount = 0;
  
  const configPath = resolveConfigPath();
  if (configPath) {
    const config = loadSourceConfig(configPath);
    if (config?.sources?.length) {
      for (const s of config.sources) {
        sources.push({ ...s, _searchType: 'primary' });
      }
      primarySourceCount += config.sources.length;
    }
  }

  for (const url of parseUrls(opts.inputText)) {
    if (!sources.some((s) => s.url === url)) {
      sources.push({ url, _searchType: 'primary' });
      primarySourceCount++;
    }
  }

  const enableSearch = (process.env.FH_SEARCH_ENABLED ?? "true").toLowerCase() !== "false";
  const hasSearchKey = Boolean(process.env.SERPAPI_API_KEY || (process.env.GOOGLE_CSE_API_KEY && process.env.GOOGLE_CSE_ID));
  
  if (enableSearch && hasSearchKey) {
    const query = (process.env.FH_SEARCH_QUERY ?? opts.inputText).slice(0, 400).trim();
    const domainWhitelist = (process.env.FH_SEARCH_DOMAIN_WHITELIST ?? "")
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean);
    
    // PRIMARY SEARCH
    if (query) {
      await onEvent("Searching web", 25);
      const results = await searchWeb({
        query,
        maxResults: Math.max(1, parseInt(process.env.FH_SEARCH_MAX_RESULTS ?? "", 10) || 8),  // Increased from 6
        domainWhitelist
      });
      for (const r of results) {
        if (!sources.some((s) => s.url === r.url)) {
          sources.push({ url: r.url, title: r.title, _searchType: 'primary' });
          primarySourceCount++;
        }
      }
    }
    
    // NEW: MANDATORY CONTRADICTION SEARCH
    const enableContradictionSearch = (process.env.FH_REQUIRE_CONTRADICTION_SEARCH ?? "true").toLowerCase() !== "false";
    if (enableContradictionSearch && sources.length < maxSources) {
      await onEvent("Searching for opposing views", 28);
      
      const keyTerms = extractKeyTerms(opts.inputText);
      
      const contradictionQueries = [
        `${keyTerms} criticism problems controversy`,
        `${keyTerms} false misleading debunked`,
        `${keyTerms} fact-check disputed`
      ];
      
      for (const cQuery of contradictionQueries) {
        if (sources.length >= maxSources) break;
        
        try {
          const contraResults = await searchWeb({
            query: cQuery,
            maxResults: 3,
            domainWhitelist
          });
          
          for (const r of contraResults) {
            if (!sources.some((s) => s.url === r.url) && sources.length < maxSources) {
              sources.push({ 
                url: r.url, 
                title: r.title,
                _searchType: 'contradiction'
              });
              contradictionSourceCount++;
            }
          }
        } catch (err) {
          // Log but continue - contradiction search is best-effort
          console.warn(`Contradiction search failed for query "${cQuery}":`, err);
        }
      }
    }
  }

  const trimmed = sources.slice(0, maxSources);
  if (trimmed.length === 0) {
    return { 
      sources: [],
      meta: {
        primarySources: 0,
        contradictionSources: 0,
        fetchSuccesses: 0,
        fetchFailures: 0
      }
    };
  }

  await onEvent("Fetching sources", 30);

  // NEW: PARALLEL FETCHING with timeout
  const fetchPromises = trimmed.map(async (source, i): Promise<SourceBundle['sources'][0]> => {
    const credibility = assessSourceCredibility(source.url);
    
    try {
      const text = await Promise.race([
        extractTextFromUrl(source.url),
        new Promise<string>((_, reject) => 
          setTimeout(() => reject(new Error('timeout')), PARALLEL_FETCH_TIMEOUT_MS)
        )
      ]);
      
      const excerpt = text.slice(0, excerptChars);
      
      return {
        id: `S${i + 1}`,
        url: source.url,
        title: source.title ?? null,
        sourceType: source.sourceType ?? credibility.type ?? null,
        trackRecordScore: source.trackRecordScore ?? credibility.score ?? null,
        excerpt,
        fetchStatus: 'success'
      };
    } catch (err) {
      const isTimeout = err instanceof Error && err.message === 'timeout';
      return {
        id: `S${i + 1}`,
        url: source.url,
        title: source.title ?? null,
        sourceType: source.sourceType ?? credibility.type ?? null,
        trackRecordScore: source.trackRecordScore ?? credibility.score ?? null,
        excerpt: "",
        fetchStatus: isTimeout ? 'timeout' : 'failed'
      };
    }
  });

  const settled = await Promise.allSettled(fetchPromises);
  const results: SourceBundle['sources'] = [];
  let fetchSuccesses = 0;
  let fetchFailures = 0;
  
  for (const result of settled) {
    if (result.status === 'fulfilled') {
      results.push(result.value);
      if (result.value.fetchStatus === 'success') {
        fetchSuccesses++;
      } else {
        fetchFailures++;
      }
    }
  }

  return { 
    sources: results,
    meta: {
      primarySources: primarySourceCount,
      contradictionSources: contradictionSourceCount,
      fetchSuccesses,
      fetchFailures
    }
  };
}
