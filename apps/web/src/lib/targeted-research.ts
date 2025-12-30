/**
 * Targeted Research Module for FactHarbor Multi-Pass Analysis
 * 
 * Instead of one generic search, conducts multiple targeted searches
 * across different categories to gather comprehensive evidence.
 */

import { searchWeb, type WebSearchResult } from './web-search';
import { extractTextFromUrl } from './retrieval';

// ============================================================================
// TYPES
// ============================================================================

export interface Decomposition {
  claims: Array<{
    id: string;
    text: string;
    entities: string[];
    type: 'legal' | 'procedural' | 'factual' | 'evaluative';
  }>;
  researchQueries: string[];
  timeframe: string;
  jurisdictions: string[];
  keyEntities: string[];
}

export interface Source {
  id: string;
  url: string;
  title: string | null;
  category: ResearchCategoryType;
  credibilityScore: number;
  excerpt: string;
  fetchStatus: 'success' | 'failed' | 'timeout';
  fetchedAt: Date;
}

export type ResearchCategoryType = 
  | 'legal_framework'
  | 'court_documents' 
  | 'evidence'
  | 'expert_opinion'
  | 'criticism'
  | 'international';

export interface ResearchCategory {
  type: ResearchCategoryType;
  queries: string[];
  priorityDomains: string[];
  minSources: number;
  description: string;
}

export interface ResearchBundle {
  legal_framework: Source[];
  court_documents: Source[];
  evidence: Source[];
  expert_opinion: Source[];
  criticism: Source[];
  international: Source[];
  meta: {
    totalSources: number;
    categoriesPopulated: number;
    searchesExecuted: number;
    fetchSuccesses: number;
    fetchFailures: number;
    timeMs: number;
  };
}

// ============================================================================
// CREDIBILITY SCORING
// ============================================================================

const DOMAIN_CREDIBILITY: Record<string, number> = {
  // Highest (0.9-1.0): Official government, courts
  'stf.jus.br': 0.98,
  'tse.jus.br': 0.98,
  'planalto.gov.br': 0.95,
  'supremecourt.gov': 0.98,
  'un.org': 0.95,
  'who.int': 0.95,
  
  // High (0.8-0.89): Quality journalism, universities
  'reuters.com': 0.92,
  'apnews.com': 0.92,
  'bbc.com': 0.88,
  'bbc.co.uk': 0.88,
  'nytimes.com': 0.85,
  'washingtonpost.com': 0.85,
  'theguardian.com': 0.82,
  'economist.com': 0.88,
  'ft.com': 0.85,
  'wsj.com': 0.85,
  'aljazeera.com': 0.80,
  'time.com': 0.82,
  
  // Academic/Legal (0.75-0.85)
  'lawfaremedia.org': 0.85,
  'verfassungsblog.de': 0.82,
  'conjur.com.br': 0.80,
  'harvard.edu': 0.90,
  'yale.edu': 0.90,
  'stanford.edu': 0.90,
  
  // Think tanks (0.7-0.8)
  'cfr.org': 0.78,
  'brookings.edu': 0.78,
  'carnegieendowment.org': 0.78,
  'hrw.org': 0.75,
  'amnesty.org': 0.75,
  
  // Medium (0.5-0.7)
  'politico.com': 0.72,
  'dw.com': 0.75,
  'fairobserver.com': 0.68,
  'folha.uol.com.br': 0.72,
  'globo.com': 0.70,
  
  // Lower (known partisan)
  'foxnews.com': 0.55,
  'msnbc.com': 0.55,
  'breitbart.com': 0.35,
};

function getCredibilityScore(url: string): number {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    
    // Direct match
    if (DOMAIN_CREDIBILITY[hostname]) {
      return DOMAIN_CREDIBILITY[hostname];
    }
    
    // Partial match (subdomains)
    for (const [domain, score] of Object.entries(DOMAIN_CREDIBILITY)) {
      if (hostname.endsWith('.' + domain) || hostname === domain) {
        return score;
      }
    }
    
    // Heuristics for unknown domains
    if (hostname.endsWith('.gov') || hostname.endsWith('.gov.br')) return 0.85;
    if (hostname.endsWith('.edu') || hostname.endsWith('.ac.uk')) return 0.80;
    if (hostname.endsWith('.int')) return 0.85;
    if (hostname.endsWith('.org')) return 0.60;
    if (hostname.endsWith('.jus.br')) return 0.90;
    
    return 0.50; // Unknown default
  } catch {
    return 0.40;
  }
}

// ============================================================================
// RESEARCH CATEGORY BUILDER
// ============================================================================

export function buildResearchCategories(decomposition: Decomposition): ResearchCategory[] {
  const entities = decomposition.keyEntities;
  const mainSubject = entities[0] || decomposition.claims[0]?.text.slice(0, 50) || '';
  const legalEntities = entities.filter(e => /law|code|statute|article|constitution/i.test(e));
  
  return [
    {
      type: 'legal_framework',
      description: 'Official legal statutes, constitutional provisions, and regulatory frameworks',
      queries: [
        `${mainSubject} legal basis statute law official`,
        `${legalEntities.slice(0, 2).join(' ')} Brazil constitution article`,
        `${mainSubject} criminal code penal law provisions`,
        ...decomposition.researchQueries.filter(q => /law|legal|statute|code|constitution/i.test(q))
      ].slice(0, 4),
      priorityDomains: ['.gov.br', 'planalto.gov.br', 'stf.jus.br', 'tse.jus.br'],
      minSources: 2
    },
    {
      type: 'court_documents',
      description: 'Court rulings, judicial decisions, and official case documents',
      queries: [
        `${mainSubject} court ruling decision verdict`,
        `${mainSubject} tribunal judgment official`,
        `${mainSubject} STF TSE decision`
      ],
      priorityDomains: ['stf.jus.br', 'tse.jus.br', 'conjur.com.br'],
      minSources: 2
    },
    {
      type: 'evidence',
      description: 'Factual evidence, police reports, witness testimony, documentary proof',
      queries: [
        `${mainSubject} evidence police report documents`,
        `${mainSubject} witnesses testimony facts`,
        `${mainSubject} investigation findings proof`,
        `${mainSubject} federal police report`
      ],
      priorityDomains: ['reuters.com', 'apnews.com', 'bbc.com', 'aljazeera.com'],
      minSources: 3
    },
    {
      type: 'expert_opinion',
      description: 'Legal scholars, constitutional experts, academic analysis',
      queries: [
        `${mainSubject} legal expert professor analysis`,
        `${mainSubject} constitutional scholar opinion`,
        `${mainSubject} academic legal analysis`,
        `${mainSubject} law professor assessment`
      ],
      priorityDomains: ['lawfaremedia.org', '.edu', 'cfr.org', 'brookings.edu', 'verfassungsblog.de'],
      minSources: 2
    },
    {
      type: 'criticism',
      description: 'Critical perspectives, opposition arguments, concerns about process',
      queries: [
        `${mainSubject} criticism unfair problems concerns`,
        `${mainSubject} lawfare political persecution`,
        `${mainSubject} defense arguments response`,
        `${mainSubject} controversy disputed concerns`,
        `${mainSubject} opposition criticism unfair`
      ],
      priorityDomains: ['wsj.com', 'economist.com', 'ft.com'],
      minSources: 3  // MANDATORY - must find critical perspectives
    },
    {
      type: 'international',
      description: 'International reactions, foreign government responses, human rights assessments',
      queries: [
        `${mainSubject} international reaction response`,
        `${mainSubject} UN human rights assessment`,
        `${mainSubject} foreign government response`,
        `${mainSubject} international law expert`
      ],
      priorityDomains: ['un.org', 'state.gov', 'hrw.org', 'amnesty.org'],
      minSources: 2
    }
  ];
}

// ============================================================================
// PARALLEL FETCHING
// ============================================================================

const FETCH_TIMEOUT_MS = 8000;
const MAX_EXCERPT_CHARS = 1500;

async function fetchSourceWithTimeout(
  url: string, 
  category: ResearchCategoryType,
  index: number
): Promise<Source> {
  const credibility = getCredibilityScore(url);
  
  try {
    const text = await Promise.race([
      extractTextFromUrl(url),
      new Promise<string>((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), FETCH_TIMEOUT_MS)
      )
    ]);
    
    return {
      id: `${category.toUpperCase()}-${index}`,
      url,
      title: extractTitle(text) || url,
      category,
      credibilityScore: credibility,
      excerpt: text.slice(0, MAX_EXCERPT_CHARS),
      fetchStatus: 'success',
      fetchedAt: new Date()
    };
  } catch (err) {
    return {
      id: `${category.toUpperCase()}-${index}`,
      url,
      title: null,
      category,
      credibilityScore: credibility,
      excerpt: '',
      fetchStatus: err instanceof Error && err.message === 'timeout' ? 'timeout' : 'failed',
      fetchedAt: new Date()
    };
  }
}

function extractTitle(text: string): string | null {
  // Try to extract title from beginning of text
  const firstLine = text.split('\n')[0]?.trim();
  if (firstLine && firstLine.length < 200 && firstLine.length > 10) {
    return firstLine;
  }
  return null;
}

// ============================================================================
// MAIN RESEARCH FUNCTION
// ============================================================================

export async function conductTargetedResearch(
  decomposition: Decomposition,
  onEvent?: (message: string, progress: number) => void
): Promise<ResearchBundle> {
  const startTime = Date.now();
  const emit = onEvent ?? (() => {});
  
  const categories = buildResearchCategories(decomposition);
  
  const bundle: ResearchBundle = {
    legal_framework: [],
    court_documents: [],
    evidence: [],
    expert_opinion: [],
    criticism: [],
    international: [],
    meta: {
      totalSources: 0,
      categoriesPopulated: 0,
      searchesExecuted: 0,
      fetchSuccesses: 0,
      fetchFailures: 0,
      timeMs: 0
    }
  };
  
  // Process each category
  for (let catIndex = 0; catIndex < categories.length; catIndex++) {
    const category = categories[catIndex];
    const progress = 25 + (catIndex / categories.length) * 40;
    emit(`Researching: ${category.description.slice(0, 50)}...`, progress);
    
    const categoryUrls = new Set<string>();
    
    // Execute searches for this category
    for (const query of category.queries) {
      try {
        bundle.meta.searchesExecuted++;
        
        const results = await searchWeb({
          query,
          maxResults: 5
        });
        
        // Add unique URLs (prioritize those matching priority domains)
        const sorted = results.sort((a, b) => {
          const aMatch = category.priorityDomains.some(d => a.url.includes(d));
          const bMatch = category.priorityDomains.some(d => b.url.includes(d));
          if (aMatch && !bMatch) return -1;
          if (!aMatch && bMatch) return 1;
          return 0;
        });
        
        for (const result of sorted.slice(0, 3)) {
          if (!categoryUrls.has(result.url)) {
            categoryUrls.add(result.url);
          }
        }
      } catch (err) {
        console.warn(`Search failed for "${query}":`, err);
      }
    }
    
    // Fetch sources in parallel
    const fetchPromises = Array.from(categoryUrls).slice(0, 5).map((url, idx) => 
      fetchSourceWithTimeout(url, category.type, idx + 1)
    );
    
    const fetchedSources = await Promise.all(fetchPromises);
    
    // Filter successful fetches
    const successfulSources = fetchedSources.filter(s => s.fetchStatus === 'success');
    bundle[category.type] = successfulSources;
    
    bundle.meta.fetchSuccesses += successfulSources.length;
    bundle.meta.fetchFailures += fetchedSources.length - successfulSources.length;
    
    if (successfulSources.length > 0) {
      bundle.meta.categoriesPopulated++;
    }
    
    bundle.meta.totalSources += successfulSources.length;
  }
  
  bundle.meta.timeMs = Date.now() - startTime;
  
  emit(`Research complete: ${bundle.meta.totalSources} sources across ${bundle.meta.categoriesPopulated} categories`, 65);
  
  return bundle;
}

// ============================================================================
// UTILITIES
// ============================================================================

export function formatResearchBundleForPrompt(bundle: ResearchBundle): string {
  const sections: string[] = [];
  
  const categoryLabels: Record<ResearchCategoryType, string> = {
    legal_framework: '📜 Legal Framework',
    court_documents: '⚖️ Court Documents',
    evidence: '📋 Evidence & Facts',
    expert_opinion: '🎓 Expert Analysis',
    criticism: '⚠️ Critical Perspectives',
    international: '🌍 International Reaction'
  };
  
  for (const [type, sources] of Object.entries(bundle) as [ResearchCategoryType, Source[]][]) {
    if (type === 'meta' || !Array.isArray(sources) || sources.length === 0) continue;
    
    const label = categoryLabels[type] || type;
    sections.push(`\n### ${label} (${sources.length} sources)\n`);
    
    for (const source of sources) {
      sections.push(`
**[${source.id}]** ${source.title || source.url}
- URL: ${source.url}
- Credibility: ${(source.credibilityScore * 100).toFixed(0)}%
- Excerpt: ${source.excerpt.slice(0, 800)}${source.excerpt.length > 800 ? '...' : ''}
`);
    }
  }
  
  sections.push(`
---
**Research Summary**
- Total Sources: ${bundle.meta.totalSources}
- Categories Populated: ${bundle.meta.categoriesPopulated}/6
- Searches Executed: ${bundle.meta.searchesExecuted}
- Research Time: ${(bundle.meta.timeMs / 1000).toFixed(1)}s
`);
  
  return sections.join('\n');
}

export function getSourcesByCredibility(bundle: ResearchBundle): {
  highest: Source[];
  high: Source[];
  medium: Source[];
  low: Source[];
} {
  const allSources = [
    ...bundle.legal_framework,
    ...bundle.court_documents,
    ...bundle.evidence,
    ...bundle.expert_opinion,
    ...bundle.criticism,
    ...bundle.international
  ];
  
  return {
    highest: allSources.filter(s => s.credibilityScore >= 0.9),
    high: allSources.filter(s => s.credibilityScore >= 0.75 && s.credibilityScore < 0.9),
    medium: allSources.filter(s => s.credibilityScore >= 0.5 && s.credibilityScore < 0.75),
    low: allSources.filter(s => s.credibilityScore < 0.5)
  };
}
