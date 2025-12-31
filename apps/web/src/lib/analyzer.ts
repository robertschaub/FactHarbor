/**
 * FactHarbor POC1 Analyzer v2.4.4
 * 
 * FIXES:
 * - Table format in report (proper markdown tables)
 * - HTML entity encoding in titles
 * 
 * Features:
 * - v2.4.2: Multi-Proceeding + Contested Factors
 * - v2.4.3: Search Visibility + Factor Count Fix
 * - v2.4.4: Table rendering + HTML entities + Jobs page
 * 
 * @version 2.4.4
 * @date December 2025
 */

import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { mistral } from "@ai-sdk/mistral";
import { generateText, Output } from "ai";
import { extractTextFromUrl } from "@/lib/retrieval";
import { searchWeb } from "@/lib/web-search";

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  schemaVersion: "2.4.4",
  deepModeEnabled: (process.env.FH_ANALYSIS_MODE ?? "quick").toLowerCase() === "deep",
  
  quick: {
    maxResearchIterations: 2,
    maxSourcesPerIteration: 3,
    maxTotalSources: 8,
    articleMaxChars: 4000,
    minFactsRequired: 6,
  },
  deep: {
    maxResearchIterations: 5,
    maxSourcesPerIteration: 4,
    maxTotalSources: 20,
    articleMaxChars: 8000,
    minFactsRequired: 12,
  },
  
  minCategories: 2,
  fetchTimeoutMs: 10000,
};

function getActiveConfig() {
  return CONFIG.deepModeEnabled ? CONFIG.deep : CONFIG.quick;
}

// ============================================================================
// TYPES
// ============================================================================

type InputType = "question" | "claim" | "article";
type QuestionIntent = "verification" | "exploration" | "comparison";

interface DistinctProceeding {
  id: string;
  name: string;
  shortName: string;
  court?: string;
  jurisdiction?: string;
  date: string;
  subject: string;
  charges?: string[];
  outcome?: string;
  status: "concluded" | "ongoing" | "pending" | "unknown";
}

interface KeyFactor {
  factor: string;
  supports: "yes" | "no" | "neutral";
  explanation: string;
  isContested?: boolean;
  contestedBy?: string;
  contestationReason?: string;
  factualBasis?: "established" | "disputed" | "alleged" | "opinion";
}

interface FactorAnalysis {
  positiveFactors: number;
  negativeFactors: number;
  neutralFactors: number;
  contestedNegatives: number;
  verdictExplanation: string;
}

interface ProceedingAnswer {
  proceedingId: string;
  proceedingName: string;
  answer: "YES" | "NO" | "PARTIALLY" | "INSUFFICIENT-EVIDENCE";
  confidence: number;
  shortAnswer: string;
  keyFactors: KeyFactor[];
  factorAnalysis?: FactorAnalysis;
}

// NEW v2.4.3: Search tracking
interface SearchQuery {
  query: string;
  iteration: number;
  focus: string;
  resultsCount: number;
  timestamp: string;
}

interface ResearchState {
  originalInput: string;
  originalText: string;
  inputType: "text" | "url";
  understanding: ClaimUnderstanding | null;
  iterations: ResearchIteration[];
  facts: ExtractedFact[];
  sources: FetchedSource[];
  contradictionSearchPerformed: boolean;
  contradictionSourcesFound: number;
  // NEW v2.4.3: Track all searches
  searchQueries: SearchQuery[];
}

interface ClaimUnderstanding {
  detectedInputType: InputType;
  questionIntent?: QuestionIntent;
  questionBeingAsked?: string;
  impliedClaim?: string;
  
  distinctProceedings: DistinctProceeding[];
  requiresSeparateAnalysis: boolean;
  proceedingContext?: string;
  
  mainQuestion: string;
  articleThesis: string;
  subClaims: Array<{
    id: string;
    text: string;
    type: "legal" | "procedural" | "factual" | "evaluative";
    keyEntities: string[];
    isCentral: boolean;
    relatedProceedingId?: string;
    startOffset?: number;
    endOffset?: number;
  }>;
  distinctEvents: Array<{
    name: string;
    date: string;
    description: string;
  }>;
  legalFrameworks: string[];
  researchQuestions: string[];
  riskTier: "A" | "B" | "C";
}

interface ResearchIteration {
  number: number;
  focus: string;
  queries: string[];
  sourcesFound: number;
  factsExtracted: number;
}

interface ExtractedFact {
  id: string;
  fact: string;
  category: "legal_provision" | "evidence" | "expert_quote" | "statistic" | "event" | "criticism";
  specificity: "high" | "medium";
  sourceId: string;
  sourceUrl: string;
  sourceTitle: string;
  sourceExcerpt: string;
  relatedProceedingId?: string;
  isContestedClaim?: boolean;
  claimSource?: string;
}

interface FetchedSource {
  id: string;
  url: string;
  title: string;
  trackRecordScore: number | null;
  fullText: string;
  fetchedAt: string;
  category: string;
  fetchSuccess: boolean;
  searchQuery?: string;  // Which query found this
}

interface ClaimVerdict {
  claimId: string;
  claimText: string;
  isCentral: boolean;
  verdict: "WELL-SUPPORTED" | "PARTIALLY-SUPPORTED" | "UNCERTAIN" | "REFUTED";
  confidence: number;
  riskTier: "A" | "B" | "C";
  reasoning: string;
  supportingFactIds: string[];
  relatedProceedingId?: string;
  startOffset?: number;
  endOffset?: number;
  highlightColor: "green" | "yellow" | "red";
}

interface QuestionAnswer {
  question: string;
  answer: "YES" | "NO" | "PARTIALLY" | "INSUFFICIENT-EVIDENCE";
  confidence: number;
  shortAnswer: string;
  nuancedAnswer: string;
  keyFactors: KeyFactor[];
  
  hasMultipleProceedings: boolean;
  proceedingAnswers?: ProceedingAnswer[];
  proceedingSummary?: string;
  calibrationNote?: string;
  hasContestedFactors?: boolean;
}

interface ArticleAnalysis {
  inputType: InputType;
  isQuestion: boolean;
  questionAnswer?: QuestionAnswer;
  
  hasMultipleProceedings: boolean;
  proceedings?: DistinctProceeding[];
  
  articleThesis: string;
  thesisSupported: boolean;
  logicalFallacies: Array<{
    type: string;
    description: string;
    affectedClaims: string[];
  }>;
  articleVerdict: "CREDIBLE" | "MOSTLY-CREDIBLE" | "MISLEADING" | "FALSE" | "ANSWER-PROVIDED";
  articleConfidence: number;
  verdictDiffersFromClaimAverage: boolean;
  verdictDifferenceReason?: string;
  claimPattern: {
    total: number;
    supported: number;
    uncertain: number;
    refuted: number;
    centralClaimsSupported: number;
    centralClaimsTotal: number;
  };
}

interface TwoPanelSummary {
  articleSummary: {
    title: string;
    source: string;
    mainArgument: string;
    keyFindings: string[];
    reasoning: string;
    conclusion: string;
  };
  factharborAnalysis: {
    sourceCredibility: string;
    claimVerdicts: Array<{
      claim: string;
      verdict: string;
      confidence: number;
    }>;
    methodologyAssessment: string;
    overallVerdict: string;
    analysisId: string;
  };
}

// ============================================================================
// SOURCE TRACK RECORD
// ============================================================================

const SOURCE_TRACK_RECORDS: Record<string, number> = {
  "stf.jus.br": 0.95, "tse.jus.br": 0.95, "planalto.gov.br": 0.92,
  "supremecourt.gov": 0.95, "un.org": 0.92, "reuters.com": 0.90,
  "apnews.com": 0.90, "afp.com": 0.88, "bbc.com": 0.85, "bbc.co.uk": 0.85,
  "nytimes.com": 0.82, "washingtonpost.com": 0.82, "theguardian.com": 0.80,
  "economist.com": 0.85, "ft.com": 0.83, "wsj.com": 0.82, "aljazeera.com": 0.78,
  "dw.com": 0.78, "lawfaremedia.org": 0.85, "verfassungsblog.de": 0.82,
  "conjur.com.br": 0.75, "cfr.org": 0.75, "brookings.edu": 0.75,
  "hrw.org": 0.72, "amnesty.org": 0.72,
};

function getTrackRecordScore(url: string): number | null {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    if (SOURCE_TRACK_RECORDS[hostname] !== undefined) return SOURCE_TRACK_RECORDS[hostname];
    for (const [domain, score] of Object.entries(SOURCE_TRACK_RECORDS)) {
      if (hostname.endsWith("." + domain)) return score;
    }
    if (hostname.endsWith(".gov") || hostname.endsWith(".gov.br")) return 0.80;
    if (hostname.endsWith(".jus.br")) return 0.88;
    if (hostname.endsWith(".edu")) return 0.75;
    return null;
  } catch { return null; }
}

// ============================================================================
// STEP 1: UNDERSTAND
// ============================================================================

const UNDERSTANDING_SCHEMA = z.object({
  detectedInputType: z.enum(["question", "claim", "article"]),
  questionIntent: z.enum(["verification", "exploration", "comparison"]).optional(),
  questionBeingAsked: z.string().optional(),
  impliedClaim: z.string().optional(),
  
  distinctProceedings: z.array(z.object({
    id: z.string(),
    name: z.string(),
    shortName: z.string(),
    court: z.string().optional(),
    jurisdiction: z.string().optional(),
    date: z.string(),
    subject: z.string(),
    charges: z.array(z.string()).optional(),
    outcome: z.string().optional(),
    status: z.enum(["concluded", "ongoing", "pending", "unknown"])
  })),
  requiresSeparateAnalysis: z.boolean(),
  proceedingContext: z.string().optional(),
  
  mainQuestion: z.string(),
  articleThesis: z.string(),
  subClaims: z.array(z.object({
    id: z.string(),
    text: z.string(),
    type: z.enum(["legal", "procedural", "factual", "evaluative"]),
    keyEntities: z.array(z.string()),
    isCentral: z.boolean(),
    relatedProceedingId: z.string().optional(),
    approximatePosition: z.string().optional()
  })),
  distinctEvents: z.array(z.object({
    name: z.string(),
    date: z.string(),
    description: z.string()
  })),
  legalFrameworks: z.array(z.string()),
  researchQuestions: z.array(z.string()),
  riskTier: z.enum(["A", "B", "C"])
});

async function understandClaim(input: string, model: any): Promise<ClaimUnderstanding> {
  const systemPrompt = `You are a fact-checking analyst. Analyze the input with special attention to MULTIPLE DISTINCT EVENTS or PROCEEDINGS.

## CRITICAL: MULTI-EVENT DETECTION

Look for multiple court cases, temporal distinctions, or different proceedings.

### BOLSONARO EXAMPLE - MUST DETECT 2 PROCEEDINGS:

1. **TSE-2023**: TSE Electoral Ineligibility Trial
   - Court: Superior Electoral Court (TSE)
   - Date: June 2023
   - Subject: Abuse of political power and media misuse
   - Outcome: 8-year ineligibility
   - Status: concluded

2. **STF-2025**: STF Criminal Trial for Coup Attempt
   - Court: Supreme Federal Court (STF)
   - Date: 2024-2025
   - Subject: Attempted coup d'état
   - Status: concluded

Set requiresSeparateAnalysis = true when multiple proceedings detected.

## FOR QUESTIONS

- **impliedClaim**: What claim would "YES" confirm? Must be AFFIRMATIVE.
  - CORRECT: "The Bolsonaro judgment was fair and based on Brazil's law"
  - WRONG: "may or may not have been fair"`;

  const userPrompt = `Analyze for fact-checking:\n\n"${input}"`;

  const result = await generateText({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.3,
    output: Output.object({ schema: UNDERSTANDING_SCHEMA })
  });

  const parsed = result.output as z.infer<typeof UNDERSTANDING_SCHEMA>;
  
  const claimsWithPositions = parsed.subClaims.map((claim: any) => {
    const positions = findClaimPosition(input, claim.text);
    return { ...claim, startOffset: positions?.start, endOffset: positions?.end };
  });

  return { ...parsed, subClaims: claimsWithPositions };
}

function findClaimPosition(text: string, claimText: string): { start: number; end: number } | null {
  const normalizedText = text.toLowerCase();
  const normalizedClaim = claimText.toLowerCase();
  
  let index = normalizedText.indexOf(normalizedClaim);
  if (index !== -1) {
    return { start: index, end: index + claimText.length };
  }
  return null;
}

// ============================================================================
// STEP 2-4: Research with Search Tracking
// ============================================================================

interface ResearchDecision {
  complete: boolean;
  focus?: string;
  queries?: string[];
  category?: string;
  isContradictionSearch?: boolean;
  targetProceedingId?: string;
}

function decideNextResearch(state: ResearchState): ResearchDecision {
  const config = getActiveConfig();
  const categories = [...new Set(state.facts.map((f: ExtractedFact) => f.category))];
  const understanding = state.understanding!;
  
  const entities = understanding.subClaims.flatMap(c => c.keyEntities).slice(0, 4);
  const entityStr = entities.join(" ");
  
  const hasLegal = categories.includes("legal_provision");
  const hasEvidence = categories.includes("evidence");
  
  const proceedings = understanding.distinctProceedings || [];
  const proceedingsWithFacts = new Set(state.facts.map((f: ExtractedFact) => f.relatedProceedingId).filter(Boolean));
  
  if (
    state.facts.length >= config.minFactsRequired &&
    categories.length >= CONFIG.minCategories &&
    state.contradictionSearchPerformed &&
    (proceedings.length === 0 || proceedings.every((p: DistinctProceeding) => proceedingsWithFacts.has(p.id)))
  ) {
    return { complete: true };
  }
  
  // Research each proceeding
  if (proceedings.length > 0 && state.iterations.length < proceedings.length * 2) {
    for (const proc of proceedings) {
      const procFacts = state.facts.filter(f => f.relatedProceedingId === proc.id);
      if (procFacts.length < 2) {
        return {
          complete: false,
          focus: `${proc.name} - ${proc.subject}`,
          targetProceedingId: proc.id,
          category: "evidence",
          queries: [
            `${proc.court || ""} ${proc.shortName} ${proc.subject}`.trim(),
            `${entityStr} ${proc.date} ${proc.jurisdiction || "ruling"}`.trim(),
            `${proc.name} decision outcome ${proc.date}`
          ]
        };
      }
    }
  }
  
  if (!hasLegal && understanding.legalFrameworks.length > 0 && state.iterations.length === 0) {
    return {
      complete: false,
      focus: "Legal framework",
      category: "legal_provision",
      queries: [
        `${entityStr} legal basis statute`,
        `${understanding.legalFrameworks[0]} law provisions`,
      ]
    };
  }
  
  if (!hasEvidence && state.iterations.length <= 1) {
    return {
      complete: false,
      focus: "Evidence and facts",
      category: "evidence",
      queries: [
        `${entityStr} evidence documents`,
        `${entityStr} facts findings`
      ]
    };
  }
  
  if (!state.contradictionSearchPerformed) {
    return {
      complete: false,
      focus: "Criticism and opposing views",
      category: "criticism",
      isContradictionSearch: true,
      queries: [
        `${entityStr} criticism concerns`,
        `${entityStr} controversy disputed unfair`
      ]
    };
  }
  
  return { complete: true };
}

// Helper to decode HTML entities in text
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&#x27;': "'",
    '&#x2d;': '-',
    '&#x2D;': '-',
    '&nbsp;': ' ',
    '&#160;': ' ',
    '&ndash;': '–',
    '&mdash;': '—',
  };
  
  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, 'gi'), char);
  }
  // Also handle numeric entities like &#45;
  result = result.replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)));
  // Handle hex entities like &#x2d;
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
  
  return result;
}

async function fetchSource(url: string, id: string, category: string, searchQuery?: string): Promise<FetchedSource | null> {
  const config = getActiveConfig();
  const trackRecord = getTrackRecordScore(url);
  
  try {
    const text = await Promise.race([
      extractTextFromUrl(url),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), CONFIG.fetchTimeoutMs)
      )
    ]);
    
    // Decode HTML entities in title
    const rawTitle = text.split("\n")[0]?.trim().slice(0, 100) || new URL(url).hostname;
    const title = decodeHtmlEntities(rawTitle);
    
    return {
      id, url,
      title,
      trackRecordScore: trackRecord,
      fullText: text.slice(0, config.articleMaxChars),
      fetchedAt: new Date().toISOString(),
      category,
      fetchSuccess: true,
      searchQuery
    };
  } catch (err) {
    console.warn(`Fetch failed for ${url}:`, err);
    return {
      id, url,
      title: new URL(url).hostname,
      trackRecordScore: trackRecord,
      fullText: "",
      fetchedAt: new Date().toISOString(),
      category,
      fetchSuccess: false,
      searchQuery
    };
  }
}

const FACT_SCHEMA = z.object({
  facts: z.array(z.object({
    fact: z.string(),
    category: z.enum(["legal_provision", "evidence", "expert_quote", "statistic", "event", "criticism"]),
    specificity: z.enum(["high", "medium", "low"]),
    sourceExcerpt: z.string().min(20),
    relatedProceedingId: z.string().optional(),
    isContestedClaim: z.boolean().optional(),
    claimSource: z.string().optional()
  }))
});

async function extractFacts(
  source: FetchedSource, 
  focus: string, 
  model: any,
  proceedings: DistinctProceeding[],
  targetProceedingId?: string
): Promise<ExtractedFact[]> {
  if (!source.fetchSuccess || !source.fullText) return [];
  
  const proceedingsList = proceedings.length > 0 
    ? `\n\nKNOWN PROCEEDINGS:\n${proceedings.map((p: DistinctProceeding) => `- ${p.id}: ${p.name}`).join("\n")}`
    : "";
    
  const systemPrompt = `Extract SPECIFIC facts. Focus: ${focus}
${targetProceedingId ? `Target proceeding: ${targetProceedingId}` : ""}
Track contested claims with isContestedClaim and claimSource.
Only HIGH/MEDIUM specificity.${proceedingsList}`;

  try {
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Source: ${source.title}\nURL: ${source.url}\n\n${source.fullText}` }
      ],
      temperature: 0.2,
      output: Output.object({ schema: FACT_SCHEMA })
    });

    const extraction = result.output as z.infer<typeof FACT_SCHEMA>;
    return extraction.facts
      .filter(f => f.specificity !== "low" && f.sourceExcerpt?.length >= 20)
      .map((f, i) => ({
        id: `${source.id}-F${i + 1}`,
        fact: f.fact,
        category: f.category,
        specificity: f.specificity as "high" | "medium",
        sourceId: source.id,
        sourceUrl: source.url,
        sourceTitle: source.title,
        sourceExcerpt: f.sourceExcerpt,
        relatedProceedingId: f.relatedProceedingId || targetProceedingId,
        isContestedClaim: f.isContestedClaim,
        claimSource: f.claimSource
      }));
  } catch {
    return [];
  }
}

// ============================================================================
// STEP 5: GENERATE VERDICTS - FIX: Calculate factorAnalysis from actual factors
// ============================================================================

const KEY_FACTOR_SCHEMA = z.object({
  factor: z.string(),
  supports: z.enum(["yes", "no", "neutral"]),
  explanation: z.string(),
  isContested: z.boolean().optional(),
  contestedBy: z.string().optional(),
  contestationReason: z.string().optional(),
  factualBasis: z.enum(["established", "disputed", "alleged", "opinion"]).optional()
});

const VERDICTS_SCHEMA_MULTI_PROCEEDING = z.object({
  questionAnswer: z.object({
    answer: z.enum(["YES", "NO", "PARTIALLY", "INSUFFICIENT-EVIDENCE"]),
    confidence: z.number().min(0).max(100),
    shortAnswer: z.string(),
    nuancedAnswer: z.string(),
    keyFactors: z.array(KEY_FACTOR_SCHEMA),
    calibrationNote: z.string().optional()
  }),
  proceedingAnswers: z.array(z.object({
    proceedingId: z.string(),
    proceedingName: z.string(),
    answer: z.enum(["YES", "NO", "PARTIALLY", "INSUFFICIENT-EVIDENCE"]),
    confidence: z.number().min(0).max(100),
    shortAnswer: z.string(),
    keyFactors: z.array(KEY_FACTOR_SCHEMA)
  })),
  proceedingSummary: z.string(),
  claimVerdicts: z.array(z.object({
    claimId: z.string(),
    verdict: z.enum(["WELL-SUPPORTED", "PARTIALLY-SUPPORTED", "UNCERTAIN", "REFUTED"]),
    confidence: z.number().min(0).max(100),
    riskTier: z.enum(["A", "B", "C"]),
    reasoning: z.string(),
    supportingFactIds: z.array(z.string()),
    relatedProceedingId: z.string().optional()
  }))
});

const VERDICTS_SCHEMA_SIMPLE = z.object({
  questionAnswer: z.object({
    answer: z.enum(["YES", "NO", "PARTIALLY", "INSUFFICIENT-EVIDENCE"]),
    confidence: z.number().min(0).max(100),
    shortAnswer: z.string(),
    nuancedAnswer: z.string(),
    keyFactors: z.array(KEY_FACTOR_SCHEMA)
  }),
  claimVerdicts: z.array(z.object({
    claimId: z.string(),
    verdict: z.enum(["WELL-SUPPORTED", "PARTIALLY-SUPPORTED", "UNCERTAIN", "REFUTED"]),
    confidence: z.number().min(0).max(100),
    riskTier: z.enum(["A", "B", "C"]),
    reasoning: z.string(),
    supportingFactIds: z.array(z.string())
  }))
});

const VERDICTS_SCHEMA_CLAIM = z.object({
  claimVerdicts: z.array(z.object({
    claimId: z.string(),
    verdict: z.enum(["WELL-SUPPORTED", "PARTIALLY-SUPPORTED", "UNCERTAIN", "REFUTED"]),
    confidence: z.number().min(0).max(100),
    riskTier: z.enum(["A", "B", "C"]),
    reasoning: z.string(),
    supportingFactIds: z.array(z.string())
  })),
  articleAnalysis: z.object({
    thesisSupported: z.boolean(),
    logicalFallacies: z.array(z.object({
      type: z.string(),
      description: z.string(),
      affectedClaims: z.array(z.string())
    })),
    articleVerdict: z.enum(["CREDIBLE", "MOSTLY-CREDIBLE", "MISLEADING", "FALSE"]),
    articleConfidence: z.number().min(0).max(100),
    verdictDiffersFromClaimAverage: z.boolean(),
    verdictDifferenceReason: z.string().optional()
  })
});

async function generateVerdicts(
  state: ResearchState,
  model: any
): Promise<{ claimVerdicts: ClaimVerdict[]; articleAnalysis: ArticleAnalysis; questionAnswer?: QuestionAnswer }> {
  const understanding = state.understanding!;
  const isQuestion = understanding.detectedInputType === "question";
  const hasMultipleProceedings = understanding.requiresSeparateAnalysis && 
                                  understanding.distinctProceedings.length > 1;
  
  const factsFormatted = state.facts.map((f: ExtractedFact) => {
    let factLine = `[${f.id}]`;
    if (f.relatedProceedingId) factLine += ` (${f.relatedProceedingId})`;
    if (f.isContestedClaim) factLine += ` [CONTESTED by ${f.claimSource || "critics"}]`;
    factLine += ` ${f.fact} (Source: ${f.sourceTitle})`;
    return factLine;
  }).join("\n");

  const claimsFormatted = understanding.subClaims.map((c: any) =>
    `${c.id}${c.relatedProceedingId ? ` (${c.relatedProceedingId})` : ""}: "${c.text}" [${c.isCentral ? "CENTRAL" : "Supporting"}]`
  ).join("\n");

  if (isQuestion && hasMultipleProceedings) {
    return await generateMultiProceedingVerdicts(state, understanding, factsFormatted, claimsFormatted, model);
  } else if (isQuestion) {
    return await generateQuestionVerdicts(state, understanding, factsFormatted, claimsFormatted, model);
  } else {
    return await generateClaimVerdicts(state, understanding, factsFormatted, claimsFormatted, model);
  }
}

async function generateMultiProceedingVerdicts(
  state: ResearchState,
  understanding: ClaimUnderstanding,
  factsFormatted: string,
  claimsFormatted: string,
  model: any
): Promise<{ claimVerdicts: ClaimVerdict[]; articleAnalysis: ArticleAnalysis; questionAnswer: QuestionAnswer }> {
  
  const proceedingsFormatted = understanding.distinctProceedings.map((p: DistinctProceeding) =>
    `- **${p.id}**: ${p.name}\n  Court: ${p.court || "N/A"} | Date: ${p.date} | Status: ${p.status}\n  Subject: ${p.subject}`
  ).join("\n\n");

  const systemPrompt = `You are FactHarbor's verdict generator. Analyze MULTIPLE DISTINCT PROCEEDINGS separately.

## QUESTION
"${understanding.questionBeingAsked || state.originalInput}"

## PROCEEDINGS - PROVIDE SEPARATE ANSWER FOR EACH
${proceedingsFormatted}

## INSTRUCTIONS

1. For EACH proceeding, provide:
   - proceedingId (must match: ${understanding.distinctProceedings.map((p: DistinctProceeding) => p.id).join(", ")})
   - answer: YES | NO | PARTIALLY | INSUFFICIENT-EVIDENCE
   - keyFactors: Array of factors with supports (yes/no/neutral) and isContested flag

2. Mark contested factors:
   - isContested: true if this criticism is itself politically disputed
   - contestedBy: Who disputes it
   - factualBasis: "established" | "disputed" | "alleged" | "opinion"

3. Calibration: Contested negatives don't flip verdicts
   - 2+ positive (established) + 1 negative (contested) = PARTIALLY, not NO`;

  const userPrompt = `## QUESTION
"${understanding.questionBeingAsked || state.originalInput}"

## PROCEEDINGS
${proceedingsFormatted}

## CLAIMS
${claimsFormatted}

## FACTS
${factsFormatted}

Provide SEPARATE answers for each proceeding.`;

  const result = await generateText({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.3,
    output: Output.object({ schema: VERDICTS_SCHEMA_MULTI_PROCEEDING })
  });

  const parsed = result.output as z.infer<typeof VERDICTS_SCHEMA_MULTI_PROCEEDING>;
  
  // FIX v2.4.3: Calculate factorAnalysis from ACTUAL keyFactors array
  const correctedProceedingAnswers = parsed.proceedingAnswers.map((pa: any) => {
    const factors = pa.keyFactors as KeyFactor[];
    
    // Calculate from actual factors - NOT from LLM-reported numbers
    const positiveFactors = factors.filter(f => f.supports === "yes").length;
    const negativeFactors = factors.filter(f => f.supports === "no").length;
    const neutralFactors = factors.filter(f => f.supports === "neutral").length;
    const contestedNegatives = factors.filter(f => f.supports === "no" && f.isContested).length;
    
    const factorAnalysis: FactorAnalysis = {
      positiveFactors,
      negativeFactors,
      neutralFactors,
      contestedNegatives,
      verdictExplanation: `${positiveFactors} positive, ${negativeFactors} negative (${contestedNegatives} contested), ${neutralFactors} neutral`
    };
    
    // Apply calibration correction
    let correctedAnswer = pa.answer;
    let correctedConfidence = pa.confidence;
    
    const effectiveNegatives = negativeFactors - (contestedNegatives * 0.5);
    
    if (pa.answer === "NO" && positiveFactors > effectiveNegatives) {
      correctedAnswer = "PARTIALLY";
      correctedConfidence = Math.min(pa.confidence, 72);
      factorAnalysis.verdictExplanation = `Corrected from NO: ${positiveFactors} positive > ${effectiveNegatives.toFixed(1)} effective negative`;
    } else if (pa.answer === "NO" && contestedNegatives > 0 && contestedNegatives === negativeFactors) {
      correctedAnswer = "PARTIALLY";
      correctedConfidence = Math.min(pa.confidence, 68);
      factorAnalysis.verdictExplanation = `Corrected: All ${negativeFactors} negative factors are contested`;
    }
    
    return {
      ...pa,
      answer: correctedAnswer,
      confidence: correctedConfidence,
      factorAnalysis
    } as ProceedingAnswer;
  });
  
  // Recalculate overall answer
  const answers = correctedProceedingAnswers.map((pa: ProceedingAnswer) => pa.answer);
  const yesCount = answers.filter(a => a === "YES").length;
  const noCount = answers.filter(a => a === "NO").length;
  
  let overallAnswer = parsed.questionAnswer.answer;
  if (yesCount > 0 && noCount > 0) overallAnswer = "PARTIALLY";
  else if (answers.some(a => a === "PARTIALLY")) overallAnswer = "PARTIALLY";
  
  const avgConfidence = Math.round(
    correctedProceedingAnswers.reduce((sum, pa) => sum + pa.confidence, 0) / correctedProceedingAnswers.length
  );
  
  // Calculate overall factorAnalysis
  const allFactors = correctedProceedingAnswers.flatMap(pa => pa.keyFactors);
  const hasContestedFactors = allFactors.some(f => f.isContested);
  
  // Build claim verdicts
  const claimVerdicts: ClaimVerdict[] = parsed.claimVerdicts.map((cv: any) => {
    const claim = understanding.subClaims.find((c: any) => c.id === cv.claimId);
    return {
      ...cv,
      claimText: claim?.text || "",
      isCentral: claim?.isCentral || false,
      relatedProceedingId: cv.relatedProceedingId || claim?.relatedProceedingId,
      startOffset: claim?.startOffset,
      endOffset: claim?.endOffset,
      highlightColor: getHighlightColor(cv.verdict)
    };
  });
  
  const claimPattern = {
    total: claimVerdicts.length,
    supported: claimVerdicts.filter(v => v.verdict === "WELL-SUPPORTED").length,
    uncertain: claimVerdicts.filter(v => v.verdict === "PARTIALLY-SUPPORTED" || v.verdict === "UNCERTAIN").length,
    refuted: claimVerdicts.filter(v => v.verdict === "REFUTED").length,
    centralClaimsTotal: claimVerdicts.filter(v => v.isCentral).length,
    centralClaimsSupported: claimVerdicts.filter(v => v.isCentral && v.verdict === "WELL-SUPPORTED").length
  };

  const calibrationNote = hasContestedFactors 
    ? "Some negative factors are politically contested claims and given reduced weight."
    : undefined;

  const questionAnswer: QuestionAnswer = {
    question: understanding.questionBeingAsked || state.originalInput,
    answer: overallAnswer,
    confidence: avgConfidence,
    shortAnswer: parsed.questionAnswer.shortAnswer,
    nuancedAnswer: parsed.questionAnswer.nuancedAnswer,
    keyFactors: parsed.questionAnswer.keyFactors,
    hasMultipleProceedings: true,
    proceedingAnswers: correctedProceedingAnswers,
    proceedingSummary: parsed.proceedingSummary,
    calibrationNote,
    hasContestedFactors
  };

  const articleAnalysis: ArticleAnalysis = {
    inputType: "question",
    isQuestion: true,
    questionAnswer,
    hasMultipleProceedings: true,
    proceedings: understanding.distinctProceedings,
    articleThesis: understanding.impliedClaim || understanding.articleThesis,
    thesisSupported: overallAnswer === "YES",
    logicalFallacies: [],
    articleVerdict: "ANSWER-PROVIDED",
    articleConfidence: avgConfidence,
    verdictDiffersFromClaimAverage: false,
    claimPattern
  };

  return { claimVerdicts, articleAnalysis, questionAnswer };
}

async function generateQuestionVerdicts(
  state: ResearchState,
  understanding: ClaimUnderstanding,
  factsFormatted: string,
  claimsFormatted: string,
  model: any
): Promise<{ claimVerdicts: ClaimVerdict[]; articleAnalysis: ArticleAnalysis; questionAnswer: QuestionAnswer }> {
  
  const systemPrompt = `Answer the question. Mark contested factors with isContested=true.`;

  const userPrompt = `## QUESTION
"${understanding.questionBeingAsked || state.originalInput}"

## CLAIMS
${claimsFormatted}

## FACTS
${factsFormatted}`;

  const result = await generateText({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.3,
    output: Output.object({ schema: VERDICTS_SCHEMA_SIMPLE })
  });

  const parsed = result.output as z.infer<typeof VERDICTS_SCHEMA_SIMPLE>;
  
  const claimVerdicts: ClaimVerdict[] = parsed.claimVerdicts.map((cv: any) => {
    const claim = understanding.subClaims.find((c: any) => c.id === cv.claimId);
    return {
      ...cv,
      claimText: claim?.text || "",
      isCentral: claim?.isCentral || false,
      startOffset: claim?.startOffset,
      endOffset: claim?.endOffset,
      highlightColor: getHighlightColor(cv.verdict)
    };
  });
  
  const claimPattern = {
    total: claimVerdicts.length,
    supported: claimVerdicts.filter(v => v.verdict === "WELL-SUPPORTED").length,
    uncertain: claimVerdicts.filter(v => v.verdict === "PARTIALLY-SUPPORTED" || v.verdict === "UNCERTAIN").length,
    refuted: claimVerdicts.filter(v => v.verdict === "REFUTED").length,
    centralClaimsTotal: claimVerdicts.filter(v => v.isCentral).length,
    centralClaimsSupported: claimVerdicts.filter(v => v.isCentral && v.verdict === "WELL-SUPPORTED").length
  };

  const hasContestedFactors = parsed.questionAnswer.keyFactors.some((kf: any) => kf.isContested);

  const questionAnswer: QuestionAnswer = {
    question: understanding.questionBeingAsked || state.originalInput,
    ...parsed.questionAnswer,
    hasMultipleProceedings: false,
    hasContestedFactors
  };

  const articleAnalysis: ArticleAnalysis = {
    inputType: "question",
    isQuestion: true,
    questionAnswer,
    hasMultipleProceedings: false,
    articleThesis: understanding.impliedClaim || understanding.articleThesis,
    thesisSupported: parsed.questionAnswer.answer === "YES",
    logicalFallacies: [],
    articleVerdict: "ANSWER-PROVIDED",
    articleConfidence: parsed.questionAnswer.confidence,
    verdictDiffersFromClaimAverage: false,
    claimPattern
  };

  return { claimVerdicts, articleAnalysis, questionAnswer };
}

async function generateClaimVerdicts(
  state: ResearchState,
  understanding: ClaimUnderstanding,
  factsFormatted: string,
  claimsFormatted: string,
  model: any
): Promise<{ claimVerdicts: ClaimVerdict[]; articleAnalysis: ArticleAnalysis }> {
  
  const result = await generateText({
    model,
    messages: [
      { role: "system", content: `Generate verdicts for each claim and article-level verdict.` },
      { role: "user", content: `THESIS: "${understanding.articleThesis}"\n\nCLAIMS:\n${claimsFormatted}\n\nFACTS:\n${factsFormatted}` }
    ],
    temperature: 0.3,
    output: Output.object({ schema: VERDICTS_SCHEMA_CLAIM })
  });

  const parsed = result.output as z.infer<typeof VERDICTS_SCHEMA_CLAIM>;
  
  const claimVerdicts: ClaimVerdict[] = parsed.claimVerdicts.map((cv: any) => {
    const claim = understanding.subClaims.find((c: any) => c.id === cv.claimId);
    return {
      ...cv,
      claimText: claim?.text || "",
      isCentral: claim?.isCentral || false,
      startOffset: claim?.startOffset,
      endOffset: claim?.endOffset,
      highlightColor: getHighlightColor(cv.verdict)
    };
  });
  
  const claimPattern = {
    total: claimVerdicts.length,
    supported: claimVerdicts.filter(v => v.verdict === "WELL-SUPPORTED").length,
    uncertain: claimVerdicts.filter(v => v.verdict === "PARTIALLY-SUPPORTED" || v.verdict === "UNCERTAIN").length,
    refuted: claimVerdicts.filter(v => v.verdict === "REFUTED").length,
    centralClaimsTotal: claimVerdicts.filter(v => v.isCentral).length,
    centralClaimsSupported: claimVerdicts.filter(v => v.isCentral && v.verdict === "WELL-SUPPORTED").length
  };

  return {
    claimVerdicts,
    articleAnalysis: {
      inputType: understanding.detectedInputType,
      isQuestion: false,
      hasMultipleProceedings: false,
      articleThesis: understanding.articleThesis,
      ...parsed.articleAnalysis,
      claimPattern
    }
  };
}

function getHighlightColor(verdict: string): "green" | "yellow" | "red" {
  switch (verdict) {
    case "WELL-SUPPORTED": return "green";
    case "PARTIALLY-SUPPORTED":
    case "UNCERTAIN": return "yellow";
    case "REFUTED": return "red";
    default: return "yellow";
  }
}

// ============================================================================
// STEP 6-7: Summary & Report
// ============================================================================

async function generateTwoPanelSummary(
  state: ResearchState,
  claimVerdicts: ClaimVerdict[],
  articleAnalysis: ArticleAnalysis,
  model: any
): Promise<TwoPanelSummary> {
  const understanding = state.understanding!;
  const isQuestion = articleAnalysis.isQuestion;
  const hasMultipleProceedings = articleAnalysis.hasMultipleProceedings;
  
  let title = isQuestion 
    ? `Question: ${understanding.questionBeingAsked || state.originalInput}`
    : state.originalText.split("\n")[0]?.trim().slice(0, 100) || "Analyzed Content";
    
  if (hasMultipleProceedings) {
    title += ` (${understanding.distinctProceedings.length} proceedings)`;
  }
  
  const articleSummary = {
    title,
    source: state.inputType === "url" ? state.originalInput : "User-provided text",
    mainArgument: `Implied claim: ${understanding.impliedClaim || understanding.articleThesis}`,
    keyFindings: understanding.subClaims.slice(0, 4).map((c: any) => c.text),
    reasoning: hasMultipleProceedings
      ? `Covers ${understanding.distinctProceedings.length} proceedings: ${understanding.distinctProceedings.map((p: DistinctProceeding) => p.shortName).join(", ")}`
      : `Examined ${understanding.subClaims.length} claims`,
    conclusion: articleAnalysis.questionAnswer?.shortAnswer || understanding.articleThesis
  };
  
  const analysisId = `FH-${Date.now().toString(36).toUpperCase()}`;
  
  let overallVerdict: string;
  if (isQuestion && articleAnalysis.questionAnswer) {
    const qa = articleAnalysis.questionAnswer;
    overallVerdict = `${qa.answer} (${articleAnalysis.articleConfidence}%)`;
    if (hasMultipleProceedings && qa.proceedingSummary) {
      overallVerdict += `\n${qa.proceedingSummary}`;
    }
    if (qa.calibrationNote) {
      overallVerdict += `\n⚠️ ${qa.calibrationNote}`;
    }
  } else {
    overallVerdict = `${articleAnalysis.articleVerdict} (${articleAnalysis.articleConfidence}%)`;
  }
  
  const factharborAnalysis = {
    sourceCredibility: calculateOverallCredibility(state.sources),
    claimVerdicts: claimVerdicts.map((cv: ClaimVerdict) => ({
      claim: cv.claimText.slice(0, 80) + (cv.claimText.length > 80 ? "..." : ""),
      verdict: cv.verdict,
      confidence: cv.confidence
    })),
    methodologyAssessment: generateMethodologyAssessment(state, articleAnalysis),
    overallVerdict,
    analysisId
  };
  
  return { articleSummary, factharborAnalysis };
}

function calculateOverallCredibility(sources: FetchedSource[]): string {
  const withScore = sources.filter(s => s.trackRecordScore !== null && s.fetchSuccess);
  if (withScore.length === 0) return "Unknown";
  
  const avg = withScore.reduce((sum, s) => sum + (s.trackRecordScore || 0), 0) / withScore.length;
  if (avg >= 0.85) return `Very High (${(avg * 100).toFixed(0)}%)`;
  if (avg >= 0.70) return `High (${(avg * 100).toFixed(0)}%)`;
  if (avg >= 0.55) return `Medium (${(avg * 100).toFixed(0)}%)`;
  return `Low (${(avg * 100).toFixed(0)}%)`;
}

function generateMethodologyAssessment(state: ResearchState, articleAnalysis: ArticleAnalysis): string {
  const parts: string[] = [];
  parts.push("Question-answering mode");
  if (articleAnalysis.hasMultipleProceedings) parts.push(`Multi-proceeding (${articleAnalysis.proceedings?.length})`);
  if (articleAnalysis.questionAnswer?.hasContestedFactors) parts.push("Contested factors flagged");
  parts.push(`${state.searchQueries.length} searches`);
  parts.push(`${state.sources.filter(s => s.fetchSuccess).length} sources`);
  return parts.join("; ");
}

async function generateReport(
  state: ResearchState,
  claimVerdicts: ClaimVerdict[],
  articleAnalysis: ArticleAnalysis,
  twoPanelSummary: TwoPanelSummary,
  model: any
): Promise<string> {
  const understanding = state.understanding!;
  const isQuestion = articleAnalysis.isQuestion;
  const hasMultipleProceedings = articleAnalysis.hasMultipleProceedings;
  
  let report = `# FactHarbor Analysis Report\n\n`;
  report += `**Analysis ID:** ${twoPanelSummary.factharborAnalysis.analysisId}\n`;
  report += `**Schema:** ${CONFIG.schemaVersion}\n`;
  report += `**Generated:** ${new Date().toISOString()}\n\n`;
  
  // Search Summary (NEW v2.4.3)
  report += `## Research Summary\n\n`;
  report += `| Metric | Value |\n`;
  report += `| --- | --- |\n`;
  report += `| Searches performed | ${state.searchQueries.length} |\n`;
  report += `| Sources fetched | ${state.sources.length} |\n`;
  report += `| Sources successful | ${state.sources.filter((s: FetchedSource) => s.fetchSuccess).length} |\n`;
  report += `| Facts extracted | ${state.facts.length} |\n\n`;
  
  if (state.searchQueries.length > 0) {
    report += `### Search Queries\n\n`;
    for (const sq of state.searchQueries) {
      report += `- \`${sq.query}\` → ${sq.resultsCount} results (${sq.focus})\n`;
    }
    report += `\n`;
  }
  
  // Executive Summary
  report += `## Executive Summary\n\n`;
  
  if (isQuestion && articleAnalysis.questionAnswer) {
    const qa = articleAnalysis.questionAnswer;
    report += `### Question\n"${qa.question}"\n\n`;
    report += `### Answer: ${qa.answer} (${qa.confidence}%)\n\n`;
    
    if (qa.calibrationNote) report += `> ⚠️ ${qa.calibrationNote}\n\n`;
    
    report += `**Short Answer:** ${qa.shortAnswer}\n\n`;
    
    if (hasMultipleProceedings && qa.proceedingAnswers) {
      report += `## Proceedings Analysis\n\n`;
      for (const pa of qa.proceedingAnswers) {
        const proc = understanding.distinctProceedings.find((p: DistinctProceeding) => p.id === pa.proceedingId);
        const emoji = pa.answer === "YES" ? "✅" : pa.answer === "NO" ? "❌" : "⚠️";
        
        report += `### ${proc?.name || pa.proceedingName}\n\n`;
        report += `**Answer:** ${emoji} ${pa.answer} (${pa.confidence}%)\n\n`;
        
        if (pa.factorAnalysis) {
          report += `**Factors:** ${pa.factorAnalysis.positiveFactors} positive, ${pa.factorAnalysis.negativeFactors} negative (${pa.factorAnalysis.contestedNegatives} contested)\n\n`;
        }
        
        report += `${pa.shortAnswer}\n\n`;
        
        if (pa.keyFactors?.length > 0) {
          report += `**Key Factors:**\n`;
          for (const f of pa.keyFactors) {
            const icon = f.supports === "yes" ? "✅" : f.supports === "no" ? "❌" : "➖";
            report += `- ${icon} ${f.factor}${f.isContested ? " ⚠️ CONTESTED" : ""}\n`;
          }
          report += `\n`;
        }
        report += `---\n\n`;
      }
    }
  }
  
  // Claims
  report += `## Claims\n\n`;
  for (const cv of claimVerdicts) {
    const emoji = cv.verdict === "WELL-SUPPORTED" ? "🟢" : cv.verdict === "REFUTED" ? "🔴" : "🟡";
    report += `**${cv.claimId}:** ${cv.claimText}\n`;
    report += `${emoji} ${cv.verdict} (${cv.confidence}%)\n\n`;
  }
  
  // Sources
  report += `## Sources\n\n`;
  for (const s of state.sources) {
    const status = s.fetchSuccess ? "✅" : "❌";
    report += `- ${status} [${s.title}](${s.url})`;
    if (s.trackRecordScore) report += ` (${(s.trackRecordScore * 100).toFixed(0)}%)`;
    report += `\n`;
  }
  
  return report;
}

// ============================================================================
// MODEL SELECTION
// ============================================================================

function getModel(providerOverride?: string) {
  const provider = (providerOverride ?? process.env.LLM_PROVIDER ?? "anthropic").toLowerCase();
  
  if (provider === "anthropic" || provider === "claude") {
    return { provider: "anthropic", modelName: "claude-sonnet-4-20250514", model: anthropic("claude-sonnet-4-20250514") };
  }
  if (provider === "google" || provider === "gemini") {
    return { provider: "google", modelName: "gemini-1.5-pro", model: google("gemini-1.5-pro") };
  }
  if (provider === "mistral") {
    return { provider: "mistral", modelName: "mistral-large-latest", model: mistral("mistral-large-latest") };
  }
  return { provider: "openai", modelName: "gpt-4o", model: openai("gpt-4o") };
}

// ============================================================================
// MAIN ENTRY POINT
// ============================================================================

type AnalysisInput = {
  inputType: "text" | "url";
  inputValue: string;
  onEvent?: (message: string, progress: number) => void;
};

export async function runFactHarborAnalysis(input: AnalysisInput) {
  const startTime = Date.now();
  const emit = input.onEvent ?? (() => {});
  const config = getActiveConfig();
  const mode = CONFIG.deepModeEnabled ? "deep" : "quick";
  
  const { provider, modelName, model } = getModel();
  
  await emit(`Analysis mode: ${mode} (v${CONFIG.schemaVersion})`, 2);
  
  const state: ResearchState = {
    originalInput: input.inputValue,
    originalText: "",
    inputType: input.inputType,
    understanding: null,
    iterations: [],
    facts: [],
    sources: [],
    contradictionSearchPerformed: false,
    contradictionSourcesFound: 0,
    searchQueries: []  // NEW v2.4.3
  };
  
  // Handle URL
  let textToAnalyze = input.inputValue;
  if (input.inputType === "url") {
    await emit("Fetching URL content", 3);
    try {
      textToAnalyze = await extractTextFromUrl(input.inputValue);
    } catch (err) {
      throw new Error(`Failed to fetch URL: ${err}`);
    }
  }
  state.originalText = textToAnalyze;
  
  // STEP 1: Understand
  await emit("Step 1: Analyzing input", 5);
  try {
    state.understanding = await understandClaim(textToAnalyze, model);
  } catch (err) {
    console.error("Understanding failed:", err);
    state.understanding = {
      detectedInputType: "claim",
      distinctProceedings: [],
      requiresSeparateAnalysis: false,
      mainQuestion: textToAnalyze.slice(0, 200),
      articleThesis: textToAnalyze.slice(0, 200),
      subClaims: [{ id: "C1", text: textToAnalyze.slice(0, 200), type: "factual", keyEntities: [], isCentral: true }],
      distinctEvents: [],
      legalFrameworks: [],
      researchQuestions: [],
      riskTier: "B"
    };
  }
  
  const proceedingCount = state.understanding.distinctProceedings.length;
  let statusMsg = `Detected: ${state.understanding.detectedInputType.toUpperCase()} with ${state.understanding.subClaims.length} claims`;
  if (proceedingCount > 1) statusMsg += ` | ${proceedingCount} PROCEEDINGS`;
  await emit(statusMsg, 10);
  
  // STEP 2-4: Research with search tracking
  let iteration = 0;
  while (iteration < config.maxResearchIterations && state.sources.length < config.maxTotalSources) {
    iteration++;
    const baseProgress = 10 + (iteration / config.maxResearchIterations) * 50;
    
    const decision = decideNextResearch(state);
    if (decision.complete) {
      await emit(`Research complete: ${state.facts.length} facts, ${state.searchQueries.length} searches`, baseProgress);
      break;
    }
    
    let focusMsg = `Step 2.${iteration}: ${decision.focus}`;
    if (decision.targetProceedingId) focusMsg += ` [${decision.targetProceedingId}]`;
    await emit(focusMsg, baseProgress);
    
    if (decision.isContradictionSearch) state.contradictionSearchPerformed = true;
    
    // Perform searches and track them
    const searchResults: Array<{ url: string; title: string; query: string }> = [];
    for (const query of decision.queries || []) {
      await emit(`🔍 Searching: "${query}"`, baseProgress + 1);
      
      try {
        const results = await searchWeb({ query, maxResults: config.maxSourcesPerIteration });
        
        // Track the search (NEW v2.4.3)
        state.searchQueries.push({
          query,
          iteration,
          focus: decision.focus!,
          resultsCount: results.length,
          timestamp: new Date().toISOString()
        });
        
        searchResults.push(...results.map((r: any) => ({ ...r, query })));
        await emit(`  → ${results.length} results`, baseProgress + 2);
      } catch (err) {
        await emit(`  → Search failed: ${err}`, baseProgress + 2);
        state.searchQueries.push({
          query,
          iteration,
          focus: decision.focus!,
          resultsCount: 0,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    const seenUrls = new Set(state.sources.map((s: FetchedSource) => s.url));
    const newResults = searchResults.filter(r => !seenUrls.has(r.url));
    const uniqueResults = [...new Map(newResults.map((r: any) => [r.url, r])).values()].slice(0, config.maxSourcesPerIteration);
    
    if (uniqueResults.length === 0) {
      state.iterations.push({ number: iteration, focus: decision.focus!, queries: decision.queries!, sourcesFound: 0, factsExtracted: state.facts.length });
      continue;
    }
    
    await emit(`Fetching ${uniqueResults.length} sources`, baseProgress + 3);
    
    const fetchPromises = uniqueResults.map((r: any, i: number) =>
      fetchSource(r.url, `S${state.sources.length + i + 1}`, decision.category || "general", r.query)
    );
    const fetchedSources = await Promise.all(fetchPromises);
    const validSources = fetchedSources.filter((s): s is FetchedSource => s !== null);
    state.sources.push(...validSources);
    
    const successfulSources = validSources.filter(s => s.fetchSuccess);
    await emit(`  → ${successfulSources.length}/${validSources.length} fetched successfully`, baseProgress + 5);
    
    if (decision.isContradictionSearch) state.contradictionSourcesFound = successfulSources.length;
    
    await emit(`Extracting facts`, baseProgress + 8);
    for (const source of successfulSources) {
      const facts = await extractFacts(source, decision.focus!, model, state.understanding!.distinctProceedings, decision.targetProceedingId);
      state.facts.push(...facts);
    }
    
    state.iterations.push({ number: iteration, focus: decision.focus!, queries: decision.queries!, sourcesFound: successfulSources.length, factsExtracted: state.facts.length });
    await emit(`Iteration ${iteration}: ${state.facts.length} facts from ${state.sources.length} sources`, baseProgress + 12);
  }
  
  // STEP 5: Verdicts
  await emit("Step 3: Generating verdicts", 65);
  const { claimVerdicts, articleAnalysis, questionAnswer } = await generateVerdicts(state, model);
  
  // STEP 6: Summary
  await emit("Step 4: Building summary", 75);
  const twoPanelSummary = await generateTwoPanelSummary(state, claimVerdicts, articleAnalysis, model);
  
  // STEP 7: Report
  await emit("Step 5: Generating report", 85);
  const reportMarkdown = await generateReport(state, claimVerdicts, articleAnalysis, twoPanelSummary, model);
  
  await emit("Analysis complete", 100);
  
  // Result JSON with search data (NEW v2.4.3)
  const resultJson = {
    meta: {
      schemaVersion: CONFIG.schemaVersion,
      generatedUtc: new Date().toISOString(),
      analysisMode: mode,
      llmProvider: provider,
      llmModel: modelName,
      inputType: input.inputType,
      detectedInputType: state.understanding!.detectedInputType,
      isQuestion: articleAnalysis.isQuestion,
      hasMultipleProceedings: articleAnalysis.hasMultipleProceedings,
      proceedingCount: state.understanding!.distinctProceedings.length,
      hasContestedFactors: articleAnalysis.questionAnswer?.hasContestedFactors || false,
      inputLength: textToAnalyze.length,
      analysisTimeMs: Date.now() - startTime,
      analysisId: twoPanelSummary.factharborAnalysis.analysisId
    },
    questionAnswer: questionAnswer || null,
    proceedings: state.understanding!.distinctProceedings,
    twoPanelSummary,
    articleAnalysis,
    claimVerdicts,
    understanding: state.understanding,
    facts: state.facts,
    // Enhanced source data (v2.4.3)
    sources: state.sources.map((s: FetchedSource) => ({
      id: s.id, 
      url: s.url, 
      title: s.title,
      trackRecordScore: s.trackRecordScore, 
      category: s.category,
      fetchSuccess: s.fetchSuccess,
      searchQuery: s.searchQuery
    })),
    // NEW v2.4.3: Search queries
    searchQueries: state.searchQueries,
    iterations: state.iterations,
    // Research stats
    researchStats: {
      totalSearches: state.searchQueries.length,
      totalResults: state.searchQueries.reduce((sum, q) => sum + q.resultsCount, 0),
      sourcesFetched: state.sources.length,
      sourcesSuccessful: state.sources.filter(s => s.fetchSuccess).length,
      factsExtracted: state.facts.length,
      contradictionSearchPerformed: state.contradictionSearchPerformed
    },
    qualityGates: {
      passed: state.facts.length >= config.minFactsRequired && state.contradictionSearchPerformed,
      summary: {
        totalFacts: state.facts.length,
        totalSources: state.sources.length,
        searchesPerformed: state.searchQueries.length,
        contradictionSearchPerformed: state.contradictionSearchPerformed
      }
    }
  };
  
  return { resultJson, reportMarkdown };
}

export function clampConfidence(value: number): number {
  return Math.max(0.1, Math.min(1, value));
}
