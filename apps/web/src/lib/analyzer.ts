/**
 * FactHarbor POC1 Analyzer v2.2
 * 
 * Implements:
 * - Article Verdict Problem: Context-aware analysis with article-level verdicts
 * - UN-3: Two-Panel Summary (Article Summary + FactHarbor Analysis)
 * - UN-17: Claim positions for in-article highlighting
 * 
 * Key features:
 * - Article verdict separate from claim average
 * - Central vs supporting claim classification
 * - Logical fallacy detection
 * - Claim character positions in original text
 * - Two-panel output structure
 * 
 * @version 2.2.0
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
  schemaVersion: "2.2.0",
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
// TYPES - Extended for UN-3, UN-17, Article Verdict Problem
// ============================================================================

interface ResearchState {
  originalInput: string;
  originalText: string;  // Full original text for claim position extraction
  inputType: "text" | "url";
  understanding: ClaimUnderstanding | null;
  iterations: ResearchIteration[];
  facts: ExtractedFact[];
  sources: FetchedSource[];
  contradictionSearchPerformed: boolean;
  contradictionSourcesFound: number;
}

interface ClaimUnderstanding {
  mainQuestion: string;
  articleThesis: string;  // NEW: Main argument the article is making
  subClaims: Array<{
    id: string;
    text: string;
    type: "legal" | "procedural" | "factual" | "evaluative";
    keyEntities: string[];
    isCentral: boolean;  // NEW: Is this central to the article's argument?
    startOffset?: number;  // NEW: Position in original text
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
}

interface FetchedSource {
  id: string;
  url: string;
  title: string;
  trackRecordScore: number | null;
  fullText: string;
  fetchedAt: string;
  category: string;
}

// NEW: Claim verdict with position for highlighting (UN-17)
interface ClaimVerdict {
  claimId: string;
  claimText: string;
  isCentral: boolean;
  verdict: "WELL-SUPPORTED" | "PARTIALLY-SUPPORTED" | "UNCERTAIN" | "REFUTED";
  confidence: number;
  riskTier: "A" | "B" | "C";
  reasoning: string;
  supportingFactIds: string[];
  // UN-17: Position in original text for highlighting
  startOffset?: number;
  endOffset?: number;
  highlightColor: "green" | "yellow" | "red";
}

// NEW: Article-level analysis (Article Verdict Problem)
interface ArticleAnalysis {
  articleThesis: string;
  thesisSupported: boolean;
  logicalFallacies: Array<{
    type: string;
    description: string;
    affectedClaims: string[];
  }>;
  articleVerdict: "CREDIBLE" | "MOSTLY-CREDIBLE" | "MISLEADING" | "FALSE";
  articleConfidence: number;
  verdictDiffersFromClaimAverage: boolean;
  verdictDifferenceReason?: string;
  // Summary of claim pattern
  claimPattern: {
    total: number;
    supported: number;
    uncertain: number;
    refuted: number;
    centralClaimsSupported: number;
    centralClaimsTotal: number;
  };
}

// NEW: UN-3 Two-Panel Structure
interface TwoPanelSummary {
  // Left panel: What the article claims
  articleSummary: {
    title: string;
    source: string;
    mainArgument: string;
    keyFindings: string[];
    reasoning: string;
    conclusion: string;
  };
  // Right panel: FactHarbor's analysis
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
// SOURCE TRACK RECORD (Metadata Only)
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
// STEP 1: UNDERSTAND THE CLAIM (Enhanced for Article Verdict Problem)
// ============================================================================

const UNDERSTANDING_SCHEMA = z.object({
  mainQuestion: z.string(),
  articleThesis: z.string(),
  subClaims: z.array(z.object({
    id: z.string(),
    text: z.string(),
    type: z.enum(["legal", "procedural", "factual", "evaluative"]),
    keyEntities: z.array(z.string()),
    isCentral: z.boolean(),
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
  const systemPrompt = `You are a fact-checking analyst. Analyze the article/claim BEFORE researching.

## YOUR TASK

1. **Main Question**: What is the core question to verify?

2. **Article Thesis**: What is the MAIN ARGUMENT or CONCLUSION the article is trying to make?
   This is critical for detecting misleading articles with accurate facts but wrong conclusions.

3. **Sub-Claims**: Extract 3-6 TESTABLE factual claims. For each:
   - ID (C1, C2, etc.)
   - Text of the claim
   - Type: legal | procedural | factual | evaluative
   - Key entities
   - **isCentral**: TRUE if this claim is CENTRAL to the article's main argument
     FALSE if it's just a supporting fact
   - approximatePosition: Quote the first few words of where this appears

4. **Distinct Events**: If multiple events (e.g., multiple trials), list separately

5. **Legal Frameworks**: Name specific laws if relevant

6. **Research Questions**: 6-10 specific questions to answer

7. **Risk Tier**: A (health/legal/democracy) | B (complex/contested) | C (low-stakes)

## CRITICAL: Central vs Supporting Claims

The distinction between CENTRAL and SUPPORTING claims is essential for the Article Verdict Problem:

- **CENTRAL claim**: The main conclusion or argument. If false, the article is misleading.
  Example: "Coffee cures cancer" - this IS the article's point

- **SUPPORTING claim**: Background facts that support the central claim.
  Example: "Coffee contains antioxidants" - this supports but isn't the main point

An article with TRUE supporting claims but a FALSE central claim is MISLEADING.`;

  const result = await generateText({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Analyze this for fact-checking:\n\n"${input}"` }
    ],
    temperature: 0.3,
    output: Output.object({ schema: UNDERSTANDING_SCHEMA })
  });

  const parsed = result.output as z.infer<typeof UNDERSTANDING_SCHEMA>;
  
  // Find claim positions in original text (UN-17)
  const claimsWithPositions = parsed.subClaims.map(claim => {
    const positions = findClaimPosition(input, claim.text);
    return {
      ...claim,
      startOffset: positions?.start,
      endOffset: positions?.end
    };
  });

  return {
    ...parsed,
    subClaims: claimsWithPositions
  };
}

// UN-17: Find claim position in original text
function findClaimPosition(text: string, claimText: string): { start: number; end: number } | null {
  const normalizedText = text.toLowerCase();
  const normalizedClaim = claimText.toLowerCase();
  
  // Try exact match first
  let index = normalizedText.indexOf(normalizedClaim);
  if (index !== -1) {
    return { start: index, end: index + claimText.length };
  }
  
  // Try finding key phrases from the claim
  const keyPhrases = claimText.split(/[,.]/).map(p => p.trim()).filter(p => p.length > 10);
  for (const phrase of keyPhrases) {
    index = normalizedText.indexOf(phrase.toLowerCase());
    if (index !== -1) {
      // Find sentence boundaries around this phrase
      const sentenceStart = Math.max(0, text.lastIndexOf('.', index) + 1);
      const sentenceEnd = text.indexOf('.', index + phrase.length);
      return { 
        start: sentenceStart, 
        end: sentenceEnd !== -1 ? sentenceEnd + 1 : index + phrase.length 
      };
    }
  }
  
  return null;
}

// ============================================================================
// STEP 2-4: Research (Same as v2.1 with minor improvements)
// ============================================================================

interface ResearchDecision {
  complete: boolean;
  focus?: string;
  queries?: string[];
  category?: string;
  isContradictionSearch?: boolean;
}

function decideNextResearch(state: ResearchState): ResearchDecision {
  const config = getActiveConfig();
  const categories = [...new Set(state.facts.map(f => f.category))];
  const understanding = state.understanding!;
  
  const entities = understanding.subClaims.flatMap(c => c.keyEntities).slice(0, 4);
  const entityStr = entities.join(" ");
  
  const hasLegal = categories.includes("legal_provision");
  const hasEvidence = categories.includes("evidence");
  
  if (
    state.facts.length >= config.minFactsRequired &&
    categories.length >= CONFIG.minCategories &&
    state.contradictionSearchPerformed
  ) {
    return { complete: true };
  }
  
  if (!hasLegal && understanding.legalFrameworks.length > 0 && state.iterations.length === 0) {
    return {
      complete: false,
      focus: "Legal framework and specific statutes",
      category: "legal_provision",
      queries: [
        `${entityStr} legal basis statute article`,
        `${understanding.legalFrameworks[0]} law text provisions`,
        `${entityStr} constitution law code`,
      ].slice(0, 3)
    };
  }
  
  if (!hasEvidence && state.iterations.length <= 1) {
    return {
      complete: false,
      focus: "Evidence, documents, and specific facts",
      category: "evidence",
      queries: [
        `${entityStr} evidence documents report`,
        `${entityStr} facts findings`,
        `${entityStr} official statement`
      ]
    };
  }
  
  if (!state.contradictionSearchPerformed) {
    return {
      complete: false,
      focus: "Criticism and opposing viewpoints",
      category: "criticism",
      isContradictionSearch: true,
      queries: [
        `${entityStr} criticism concerns problems`,
        `${entityStr} controversy opposition`,
        `${entityStr} disputed contested`
      ]
    };
  }
  
  if (state.iterations.length >= config.maxResearchIterations) return { complete: true };
  if (state.sources.length >= config.maxTotalSources) return { complete: true };
  
  if (state.facts.length < config.minFactsRequired) {
    return {
      complete: false,
      focus: "Additional supporting information",
      category: "evidence",
      queries: understanding.researchQuestions.slice(0, 3).map(q => `${entityStr} ${q}`)
    };
  }
  
  return { complete: true };
}

async function fetchSource(url: string, id: string, category: string): Promise<FetchedSource | null> {
  const config = getActiveConfig();
  const trackRecord = getTrackRecordScore(url);
  
  try {
    const text = await Promise.race([
      extractTextFromUrl(url),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), CONFIG.fetchTimeoutMs)
      )
    ]);
    
    return {
      id, url,
      title: text.split("\n")[0]?.trim().slice(0, 100) || new URL(url).hostname,
      trackRecordScore: trackRecord,
      fullText: text.slice(0, config.articleMaxChars),
      fetchedAt: new Date().toISOString(),
      category
    };
  } catch (err) {
    console.warn(`Fetch failed for ${url}:`, err);
    return null;
  }
}

const FACT_SCHEMA = z.object({
  facts: z.array(z.object({
    fact: z.string(),
    category: z.enum(["legal_provision", "evidence", "expert_quote", "statistic", "event", "criticism"]),
    specificity: z.enum(["high", "medium", "low"]),
    sourceExcerpt: z.string().min(20)
  }))
});

async function extractFacts(source: FetchedSource, focus: string, model: any): Promise<ExtractedFact[]> {
  const systemPrompt = `Extract SPECIFIC facts from this source. Each fact MUST include sourceExcerpt.
Focus: ${focus}
Only HIGH/MEDIUM specificity. Skip LOW.`;

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
        sourceExcerpt: f.sourceExcerpt
      }));
  } catch (err) {
    console.warn(`Fact extraction failed:`, err);
    return [];
  }
}

// ============================================================================
// STEP 5: GENERATE CLAIM VERDICTS (Enhanced for highlighting)
// ============================================================================

const VERDICTS_SCHEMA = z.object({
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
): Promise<{ claimVerdicts: ClaimVerdict[]; articleAnalysis: ArticleAnalysis }> {
  const understanding = state.understanding!;
  
  const factsFormatted = state.facts.map(f => 
    `[${f.id}] ${f.fact} (Source: ${f.sourceTitle})`
  ).join("\n");

  const claimsFormatted = understanding.subClaims.map(c =>
    `${c.id}: "${c.text}" [${c.isCentral ? "CENTRAL" : "Supporting"}]`
  ).join("\n");

  const systemPrompt = `You are FactHarbor's verdict generator. Generate verdicts for each claim AND an article-level verdict.

## ARTICLE VERDICT PROBLEM

The article's overall credibility is NOT just the average of claim verdicts!

**Pattern 1: False Central Claim**
- 4 supporting facts are TRUE ✅✅✅✅
- 1 central conclusion is FALSE ❌
- Simple average: 80% accurate
- Reality: MISLEADING - the main point is wrong!

**Pattern 2: Accurate Facts, Wrong Conclusion**
- Facts are individually true
- But the conclusion doesn't follow (logical fallacy)
- Example: "Coffee has antioxidants" + "Antioxidants fight cancer" ≠ "Coffee cures cancer"

## LOGICAL FALLACIES TO DETECT

- **Correlation→Causation**: Assuming cause from correlation
- **Cherry-picking**: Selective use of evidence
- **False equivalence**: Treating unequal things as equal
- **Hasty generalization**: Broad conclusions from limited data
- **Appeal to authority**: Using authority instead of evidence
- **Straw man**: Misrepresenting the opposing view

## YOUR TASK

1. For each claim, provide:
   - verdict: WELL-SUPPORTED | PARTIALLY-SUPPORTED | UNCERTAIN | REFUTED
   - confidence: 0-100%
   - riskTier: A (high-stakes) | B (medium) | C (low)
   - reasoning: 1-3 sentences
   - supportingFactIds: Which facts support this verdict

2. For the article as a whole:
   - thesisSupported: Does the evidence support the main argument?
   - logicalFallacies: Any logical errors?
   - articleVerdict: CREDIBLE | MOSTLY-CREDIBLE | MISLEADING | FALSE
   - articleConfidence: 0-100%
   - verdictDiffersFromClaimAverage: true if article verdict ≠ simple average
   - verdictDifferenceReason: Explain WHY if different`;

  const userPrompt = `## ARTICLE THESIS
"${understanding.articleThesis}"

## CLAIMS TO EVALUATE
${claimsFormatted}

## AVAILABLE FACTS (${state.facts.length} total)
${factsFormatted}

Generate verdicts for each claim and the article overall.`;

  const result = await generateText({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.3,
    output: Output.object({ schema: VERDICTS_SCHEMA })
  });

  const parsed = result.output as z.infer<typeof VERDICTS_SCHEMA>;
  
  // Enrich claim verdicts with position and highlight color
  const claimVerdicts: ClaimVerdict[] = parsed.claimVerdicts.map(cv => {
    const claim = understanding.subClaims.find(c => c.id === cv.claimId);
    return {
      ...cv,
      claimText: claim?.text || "",
      isCentral: claim?.isCentral || false,
      startOffset: claim?.startOffset,
      endOffset: claim?.endOffset,
      highlightColor: getHighlightColor(cv.verdict)
    };
  });
  
  // Calculate claim pattern for article analysis
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
// STEP 6: GENERATE TWO-PANEL SUMMARY (UN-3)
// ============================================================================

async function generateTwoPanelSummary(
  state: ResearchState,
  claimVerdicts: ClaimVerdict[],
  articleAnalysis: ArticleAnalysis,
  model: any
): Promise<TwoPanelSummary> {
  const understanding = state.understanding!;
  
  // Left panel: Article Summary
  const articleSummary = {
    title: extractTitle(state.originalText),
    source: state.inputType === "url" ? state.originalInput : "User-provided text",
    mainArgument: understanding.articleThesis,
    keyFindings: understanding.subClaims.slice(0, 4).map(c => c.text),
    reasoning: `The article makes ${understanding.subClaims.length} claims to support its main argument.`,
    conclusion: understanding.articleThesis
  };
  
  // Right panel: FactHarbor Analysis
  const analysisId = `FH-${Date.now().toString(36).toUpperCase()}`;
  
  const factharborAnalysis = {
    sourceCredibility: calculateOverallCredibility(state.sources),
    claimVerdicts: claimVerdicts.map(cv => ({
      claim: cv.claimText.slice(0, 80) + (cv.claimText.length > 80 ? "..." : ""),
      verdict: cv.verdict,
      confidence: cv.confidence
    })),
    methodologyAssessment: generateMethodologyAssessment(state, articleAnalysis),
    overallVerdict: `${articleAnalysis.articleVerdict} (${articleAnalysis.articleConfidence}% confidence)`,
    analysisId
  };
  
  return { articleSummary, factharborAnalysis };
}

function extractTitle(text: string): string {
  const firstLine = text.split("\n")[0]?.trim();
  if (firstLine && firstLine.length > 5 && firstLine.length < 150) {
    return firstLine;
  }
  return "Analyzed Content";
}

function calculateOverallCredibility(sources: FetchedSource[]): string {
  const withScore = sources.filter(s => s.trackRecordScore !== null);
  if (withScore.length === 0) return "Unknown (no tracked sources)";
  
  const avg = withScore.reduce((sum, s) => sum + (s.trackRecordScore || 0), 0) / withScore.length;
  if (avg >= 0.85) return `Very High (${(avg * 100).toFixed(0)}%)`;
  if (avg >= 0.70) return `High (${(avg * 100).toFixed(0)}%)`;
  if (avg >= 0.55) return `Medium (${(avg * 100).toFixed(0)}%)`;
  return `Low (${(avg * 100).toFixed(0)}%)`;
}

function generateMethodologyAssessment(state: ResearchState, articleAnalysis: ArticleAnalysis): string {
  const parts: string[] = [];
  
  if (articleAnalysis.logicalFallacies.length > 0) {
    parts.push(`Detected ${articleAnalysis.logicalFallacies.length} logical issue(s)`);
  }
  
  if (articleAnalysis.verdictDiffersFromClaimAverage) {
    parts.push("Article verdict differs from claim average");
  }
  
  if (state.contradictionSearchPerformed && state.contradictionSourcesFound > 0) {
    parts.push("Counter-evidence considered");
  }
  
  if (parts.length === 0) {
    parts.push("Standard methodology applied");
  }
  
  return parts.join("; ");
}

// ============================================================================
// STEP 7: GENERATE COMPREHENSIVE REPORT
// ============================================================================

async function generateReport(
  state: ResearchState,
  claimVerdicts: ClaimVerdict[],
  articleAnalysis: ArticleAnalysis,
  twoPanelSummary: TwoPanelSummary,
  model: any
): Promise<string> {
  const understanding = state.understanding!;
  
  // Build markdown report
  let report = `# FactHarbor Analysis Report\n\n`;
  report += `**Analysis ID:** ${twoPanelSummary.factharborAnalysis.analysisId}\n`;
  report += `**Generated:** ${new Date().toISOString()}\n`;
  report += `**Schema Version:** ${CONFIG.schemaVersion}\n\n`;
  
  // Executive Summary with Article Verdict
  report += `## Executive Summary\n\n`;
  report += `**Article Verdict:** ${articleAnalysis.articleVerdict} (${articleAnalysis.articleConfidence}% confidence)\n\n`;
  report += `**Main Thesis:** ${articleAnalysis.articleThesis}\n\n`;
  report += `**Thesis Supported:** ${articleAnalysis.thesisSupported ? "Yes" : "No"}\n\n`;
  
  if (articleAnalysis.verdictDiffersFromClaimAverage) {
    report += `> ⚠️ **Note:** The article verdict differs from the simple average of claim verdicts.\n`;
    report += `> **Reason:** ${articleAnalysis.verdictDifferenceReason}\n\n`;
  }
  
  // Claim Pattern Summary
  const { claimPattern } = articleAnalysis;
  report += `**Claim Analysis:**\n`;
  report += `- Total claims: ${claimPattern.total}\n`;
  report += `- Well-supported: ${claimPattern.supported}\n`;
  report += `- Uncertain/Partial: ${claimPattern.uncertain}\n`;
  report += `- Refuted: ${claimPattern.refuted}\n`;
  report += `- Central claims supported: ${claimPattern.centralClaimsSupported}/${claimPattern.centralClaimsTotal}\n\n`;
  
  // Logical Fallacies (if any)
  if (articleAnalysis.logicalFallacies.length > 0) {
    report += `## ⚠️ Logical Issues Detected\n\n`;
    for (const fallacy of articleAnalysis.logicalFallacies) {
      report += `### ${fallacy.type}\n`;
      report += `${fallacy.description}\n`;
      report += `Affected claims: ${fallacy.affectedClaims.join(", ")}\n\n`;
    }
  }
  
  // Claims Analysis
  report += `## Claims Analysis\n\n`;
  for (const cv of claimVerdicts) {
    const centralTag = cv.isCentral ? "🔑 **CENTRAL CLAIM**" : "Supporting claim";
    const verdictEmoji = cv.verdict === "WELL-SUPPORTED" ? "🟢" : 
                         cv.verdict === "REFUTED" ? "🔴" : "🟡";
    
    report += `### ${cv.claimId}: ${cv.claimText}\n\n`;
    report += `${centralTag}\n\n`;
    report += `**Verdict:** ${verdictEmoji} ${cv.verdict} (${cv.confidence}% confidence)\n\n`;
    report += `**Risk Tier:** ${cv.riskTier}\n\n`;
    report += `**Reasoning:** ${cv.reasoning}\n\n`;
    if (cv.supportingFactIds.length > 0) {
      report += `**Evidence:** ${cv.supportingFactIds.join(", ")}\n\n`;
    }
    report += `---\n\n`;
  }
  
  // Two-Panel Summary (UN-3)
  report += `## Two-Panel Summary\n\n`;
  report += `### What the Article Claims\n\n`;
  report += `**Title:** ${twoPanelSummary.articleSummary.title}\n\n`;
  report += `**Main Argument:** ${twoPanelSummary.articleSummary.mainArgument}\n\n`;
  report += `**Key Findings:**\n`;
  for (const finding of twoPanelSummary.articleSummary.keyFindings) {
    report += `- ${finding}\n`;
  }
  report += `\n`;
  
  report += `### FactHarbor's Assessment\n\n`;
  report += `**Source Credibility:** ${twoPanelSummary.factharborAnalysis.sourceCredibility}\n\n`;
  report += `**Methodology:** ${twoPanelSummary.factharborAnalysis.methodologyAssessment}\n\n`;
  report += `**Overall Verdict:** ${twoPanelSummary.factharborAnalysis.overallVerdict}\n\n`;
  
  // Evidence Summary
  report += `## Evidence Summary\n\n`;
  report += `**Sources consulted:** ${state.sources.length}\n\n`;
  report += `**Facts extracted:** ${state.facts.length}\n\n`;
  report += `**Contradiction search:** ${state.contradictionSearchPerformed ? "Performed" : "Not performed"}\n\n`;
  
  // Quality Gates
  report += `## Quality Gates\n\n`;
  const gates = [
    { name: "Source Quality", passed: state.sources.length >= 3 },
    { name: "Contradiction Search", passed: state.contradictionSearchPerformed },
    { name: "Minimum Facts", passed: state.facts.length >= getActiveConfig().minFactsRequired },
    { name: "Central Claim Assessment", passed: claimPattern.centralClaimsTotal > 0 }
  ];
  
  for (const gate of gates) {
    report += `- ${gate.passed ? "✅" : "❌"} ${gate.name}\n`;
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
    contradictionSourcesFound: 0
  };
  
  // Handle URL input
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
  await emit("Step 1: Analyzing claim structure", 5);
  try {
    state.understanding = await understandClaim(textToAnalyze, model);
  } catch (err) {
    console.error("Understanding failed:", err);
    state.understanding = {
      mainQuestion: textToAnalyze.slice(0, 200),
      articleThesis: textToAnalyze.slice(0, 200),
      subClaims: [{ id: "C1", text: textToAnalyze.slice(0, 200), type: "factual", keyEntities: [], isCentral: true }],
      distinctEvents: [],
      legalFrameworks: [],
      researchQuestions: [],
      riskTier: "B"
    };
  }
  
  await emit(
    `Identified ${state.understanding.subClaims.length} claims (${state.understanding.subClaims.filter(c => c.isCentral).length} central)`, 
    10
  );
  
  // STEP 2-4: Research
  let iteration = 0;
  while (iteration < config.maxResearchIterations && state.sources.length < config.maxTotalSources) {
    iteration++;
    const baseProgress = 10 + (iteration / config.maxResearchIterations) * 50;
    
    const decision = decideNextResearch(state);
    if (decision.complete) {
      await emit(`Research complete: ${state.facts.length} facts from ${state.sources.length} sources`, baseProgress);
      break;
    }
    
    await emit(`Step 2.${iteration}: ${decision.focus}`, baseProgress);
    
    if (decision.isContradictionSearch) {
      state.contradictionSearchPerformed = true;
    }
    
    const searchResults: Array<{ url: string; title: string }> = [];
    for (const query of decision.queries || []) {
      try {
        const results = await searchWeb({ query, maxResults: config.maxSourcesPerIteration });
        searchResults.push(...results);
      } catch {}
    }
    
    const seenUrls = new Set(state.sources.map(s => s.url));
    const newUrls = [...new Set(searchResults.map(r => r.url))]
      .filter(url => !seenUrls.has(url))
      .slice(0, config.maxSourcesPerIteration);
    
    if (newUrls.length === 0) {
      state.iterations.push({
        number: iteration, focus: decision.focus!, queries: decision.queries!,
        sourcesFound: 0, factsExtracted: state.facts.length
      });
      continue;
    }
    
    await emit(`Fetching ${newUrls.length} sources`, baseProgress + 3);
    
    const fetchPromises = newUrls.map((url, i) =>
      fetchSource(url, `S${state.sources.length + i + 1}`, decision.category || "general")
    );
    const fetchedSources = (await Promise.all(fetchPromises)).filter((s): s is FetchedSource => s !== null);
    state.sources.push(...fetchedSources);
    
    if (decision.isContradictionSearch) {
      state.contradictionSourcesFound = fetchedSources.length;
    }
    
    await emit(`Extracting facts`, baseProgress + 8);
    for (const source of fetchedSources) {
      const facts = await extractFacts(source, decision.focus!, model);
      state.facts.push(...facts);
    }
    
    state.iterations.push({
      number: iteration, focus: decision.focus!, queries: decision.queries!,
      sourcesFound: fetchedSources.length, factsExtracted: state.facts.length
    });
    
    await emit(`Iteration ${iteration}: ${state.facts.length} facts`, baseProgress + 12);
  }
  
  // STEP 5: Generate verdicts
  await emit("Step 3: Generating verdicts", 65);
  const { claimVerdicts, articleAnalysis } = await generateVerdicts(state, model);
  
  // STEP 6: Two-panel summary (UN-3)
  await emit("Step 4: Building two-panel summary", 75);
  const twoPanelSummary = await generateTwoPanelSummary(state, claimVerdicts, articleAnalysis, model);
  
  // STEP 7: Generate report
  await emit("Step 5: Generating report", 85);
  const reportMarkdown = await generateReport(state, claimVerdicts, articleAnalysis, twoPanelSummary, model);
  
  await emit("Analysis complete", 100);
  
  // Build result JSON
  const resultJson = {
    meta: {
      schemaVersion: CONFIG.schemaVersion,
      generatedUtc: new Date().toISOString(),
      analysisMode: mode,
      llmProvider: provider,
      llmModel: modelName,
      inputType: input.inputType,
      inputLength: textToAnalyze.length,
      analysisTimeMs: Date.now() - startTime,
      analysisId: twoPanelSummary.factharborAnalysis.analysisId
    },
    // UN-3: Two-panel summary
    twoPanelSummary,
    // Article Verdict Problem: Article-level analysis
    articleAnalysis,
    // UN-17: Claims with positions for highlighting
    claimVerdicts,
    // Research data
    understanding: state.understanding,
    facts: state.facts,
    sources: state.sources.map(s => ({
      id: s.id, url: s.url, title: s.title,
      trackRecordScore: s.trackRecordScore, category: s.category
    })),
    iterations: state.iterations,
    // Quality gates
    qualityGates: {
      passed: state.facts.length >= config.minFactsRequired && state.contradictionSearchPerformed,
      summary: {
        totalFacts: state.facts.length,
        totalSources: state.sources.length,
        contradictionSearchPerformed: state.contradictionSearchPerformed,
        centralClaimsIdentified: state.understanding!.subClaims.filter(c => c.isCentral).length
      }
    }
  };
  
  return { resultJson, reportMarkdown };
}

export function clampConfidence(value: number): number {
  return Math.max(0.1, Math.min(1, value));
}
