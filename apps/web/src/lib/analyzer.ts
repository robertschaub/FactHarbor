/**
 * FactHarbor POC1 Analyzer - Agent-Style Implementation
 * 
 * Evolution from single-pass to iterative research for reference-quality output.
 * 
 * Key features:
 * - Claim decomposition before research
 * - Iterative targeted research (legal, evidence, criticism, expert)
 * - Full article reading (not just excerpts)
 * - Specific fact extraction with citations
 * - Separate analysis of distinct events
 * - Source credibility tracking
 * 
 * Expected runtime: 2-4 minutes
 * Expected output: 500-800 lines with specific citations
 * 
 * @version 2.0.0 - Evolved from single-pass architecture
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
  // Research settings
  maxResearchIterations: 5,
  maxSourcesPerIteration: 4,
  maxTotalSources: 20,
  
  // Content settings  
  fullArticleMaxChars: 12000,
  
  // Quality thresholds
  minFactsRequired: 12,
  minCategories: 3,
  
  // Network settings
  fetchTimeoutMs: 12000,
};

// ============================================================================
// TYPES
// ============================================================================

interface ResearchState {
  originalInput: string;
  inputType: "text" | "url";
  understanding: ClaimUnderstanding | null;
  iterations: ResearchIteration[];
  facts: ExtractedFact[];
  sources: FetchedSource[];
}

interface ClaimUnderstanding {
  mainQuestion: string;
  subClaims: Array<{
    id: string;
    text: string;
    type: "legal" | "procedural" | "factual" | "evaluative";
    keyEntities: string[];
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
}

interface FetchedSource {
  id: string;
  url: string;
  title: string;
  credibility: number;
  credibilityTier: "HIGHEST" | "HIGH" | "MEDIUM" | "LOW";
  fullText: string;
  fetchedAt: string;
  category: string;
}

// ============================================================================
// CREDIBILITY SCORING
// ============================================================================

const DOMAIN_CREDIBILITY: Record<string, { score: number; tier: "HIGHEST" | "HIGH" | "MEDIUM" | "LOW" }> = {
  // HIGHEST (0.9-1.0): Courts, Government, Wire Services
  "stf.jus.br": { score: 0.98, tier: "HIGHEST" },
  "tse.jus.br": { score: 0.98, tier: "HIGHEST" },
  "planalto.gov.br": { score: 0.95, tier: "HIGHEST" },
  "supremecourt.gov": { score: 0.98, tier: "HIGHEST" },
  "congress.gov": { score: 0.95, tier: "HIGHEST" },
  "un.org": { score: 0.95, tier: "HIGHEST" },
  "who.int": { score: 0.95, tier: "HIGHEST" },
  "ec.europa.eu": { score: 0.92, tier: "HIGHEST" },
  "reuters.com": { score: 0.95, tier: "HIGHEST" },
  "apnews.com": { score: 0.95, tier: "HIGHEST" },
  "afp.com": { score: 0.92, tier: "HIGHEST" },
  
  // HIGH (0.8-0.89): Quality Journalism, Academic, Legal
  "bbc.com": { score: 0.88, tier: "HIGH" },
  "bbc.co.uk": { score: 0.88, tier: "HIGH" },
  "nytimes.com": { score: 0.85, tier: "HIGH" },
  "washingtonpost.com": { score: 0.85, tier: "HIGH" },
  "theguardian.com": { score: 0.82, tier: "HIGH" },
  "economist.com": { score: 0.88, tier: "HIGH" },
  "ft.com": { score: 0.87, tier: "HIGH" },
  "wsj.com": { score: 0.85, tier: "HIGH" },
  "aljazeera.com": { score: 0.82, tier: "HIGH" },
  "lawfaremedia.org": { score: 0.88, tier: "HIGH" },
  "time.com": { score: 0.82, tier: "HIGH" },
  "dw.com": { score: 0.80, tier: "HIGH" },
  "verfassungsblog.de": { score: 0.85, tier: "HIGH" },
  "nycbar.org": { score: 0.82, tier: "HIGH" },
  
  // MEDIUM (0.6-0.79): Think Tanks, NGOs, Regional Media
  "cfr.org": { score: 0.78, tier: "MEDIUM" },
  "brookings.edu": { score: 0.78, tier: "MEDIUM" },
  "carnegieendowment.org": { score: 0.78, tier: "MEDIUM" },
  "chathamhouse.org": { score: 0.75, tier: "MEDIUM" },
  "hrw.org": { score: 0.75, tier: "MEDIUM" },
  "amnesty.org": { score: 0.75, tier: "MEDIUM" },
  "conjur.com.br": { score: 0.75, tier: "MEDIUM" },
  "jusbrasil.com.br": { score: 0.70, tier: "MEDIUM" },
  "folha.uol.com.br": { score: 0.72, tier: "MEDIUM" },
  "estadao.com.br": { score: 0.72, tier: "MEDIUM" },
  "oglobo.globo.com": { score: 0.70, tier: "MEDIUM" },
  "politico.com": { score: 0.72, tier: "MEDIUM" },
  "thehill.com": { score: 0.68, tier: "MEDIUM" },
  
  // LOW (< 0.6): Partisan Sources
  "foxnews.com": { score: 0.55, tier: "LOW" },
  "msnbc.com": { score: 0.55, tier: "LOW" },
  "huffpost.com": { score: 0.50, tier: "LOW" },
  "breitbart.com": { score: 0.35, tier: "LOW" },
  "dailywire.com": { score: 0.40, tier: "LOW" },
};

function getCredibility(url: string): { score: number; tier: "HIGHEST" | "HIGH" | "MEDIUM" | "LOW" } {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");
    
    // Direct match
    if (DOMAIN_CREDIBILITY[hostname]) return DOMAIN_CREDIBILITY[hostname];
    
    // Subdomain match
    for (const [domain, info] of Object.entries(DOMAIN_CREDIBILITY)) {
      if (hostname.endsWith("." + domain)) return info;
    }
    
    // Heuristic assessment
    if (hostname.endsWith(".gov") || hostname.endsWith(".gov.br") || hostname.endsWith(".gov.uk")) {
      return { score: 0.85, tier: "HIGH" };
    }
    if (hostname.endsWith(".jus.br")) {
      return { score: 0.90, tier: "HIGHEST" };
    }
    if (hostname.endsWith(".edu") || hostname.endsWith(".ac.uk")) {
      return { score: 0.80, tier: "HIGH" };
    }
    if (hostname.endsWith(".int")) {
      return { score: 0.85, tier: "HIGH" };
    }
    if (hostname.endsWith(".org")) {
      return { score: 0.60, tier: "MEDIUM" };
    }
    
    return { score: 0.50, tier: "MEDIUM" };
  } catch {
    return { score: 0.40, tier: "LOW" };
  }
}

// ============================================================================
// STEP 1: UNDERSTAND THE CLAIM
// ============================================================================

const UNDERSTANDING_SCHEMA = z.object({
  mainQuestion: z.string(),
  subClaims: z.array(z.object({
    id: z.string(),
    text: z.string(),
    type: z.enum(["legal", "procedural", "factual", "evaluative"]),
    keyEntities: z.array(z.string())
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
  const systemPrompt = `You are a fact-checking analyst. Your task is to UNDERSTAND a claim BEFORE researching it.

## YOUR TASK

Analyze the claim and identify:

1. **Main Question**: What is the core question being asked?

2. **Sub-Claims**: Break into 2-4 TESTABLE components. For each:
   - ID (C1, C2, etc.)
   - Text of the sub-claim
   - Type: legal (requires legal framework) | procedural (about process) | factual (verifiable facts) | evaluative (judgment)
   - Key entities to research (people, laws, courts, events)

3. **Distinct Events**: If multiple events involved (e.g., multiple trials, different time periods), list each SEPARATELY with dates.

4. **Legal Frameworks**: What specific laws, statutes, or constitutional provisions might be relevant? NAME THEM if you know them.

5. **Research Questions**: Generate 8-12 SPECIFIC questions that need answering. Be concrete.

6. **Risk Tier**: A (health/legal/democracy/elections) | B (complex/contested policy) | C (low-stakes)

## CRITICAL RULES

- NEVER classify everything as "opinion" if ANY part is testable
- BE SPECIFIC: If this involves Brazilian law, name specific laws like "Lei da Ficha Limpa" or "Law 14,197/2021"
- SEPARATE EVENTS: If there are multiple trials/events, list each with dates
- ENTITY EXTRACTION: Include specific court names, judge names if known, law numbers

## EXAMPLE

For "Bolsonaro trial was fair and based on law":

Sub-claims:
- C1: The trials had legal basis in Brazilian law (legal)
- C2: The trials followed fair procedures (procedural)

Distinct events:
- TSE ineligibility trial (June 2023): Electoral court trial for abuse of power
- STF criminal trial (September 2025): Supreme court trial for coup attempt

Legal frameworks:
- Lei da Ficha Limpa (Complementary Law 64/1990)
- Law 14,197/2021 (coup d'état criminalization)
- Brazilian Constitution Article 142
- TSE Resolution 23.714/2022

Research questions:
- What specific charges were filed in the TSE trial?
- What statute defines the penalties for electoral abuse?
- What evidence was presented in the STF trial?
- What legal provisions criminalize coup attempts in Brazil?`;

  const result = await generateText({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Analyze this claim for research planning:\n\n"${input}"` }
    ],
    temperature: 0.3,
    output: Output.object({ schema: UNDERSTANDING_SCHEMA })
  });

  return result.output as ClaimUnderstanding;
}

// ============================================================================
// STEP 2: DECIDE NEXT RESEARCH FOCUS
// ============================================================================

interface ResearchDecision {
  complete: boolean;
  focus?: string;
  queries?: string[];
  category?: string;
}

function decideNextResearch(state: ResearchState): ResearchDecision {
  const categories = [...new Set(state.facts.map(f => f.category))];
  const understanding = state.understanding!;
  
  // Build entity string for queries
  const entities = understanding.subClaims.flatMap(c => c.keyEntities).slice(0, 4);
  const entityStr = entities.join(" ");
  
  // Check completion criteria
  const hasLegal = categories.includes("legal_provision");
  const hasEvidence = categories.includes("evidence");
  const hasCriticism = categories.includes("criticism");
  const hasExpert = categories.includes("expert_quote");
  
  // Complete if we have enough diverse facts
  if (
    state.facts.length >= CONFIG.minFactsRequired &&
    hasLegal && hasEvidence && hasCriticism &&
    state.iterations.length >= 3
  ) {
    return { complete: true };
  }
  
  // Determine what's missing and generate targeted queries
  
  // Priority 1: Legal framework
  if (!hasLegal && understanding.legalFrameworks.length > 0) {
    const legalQueries = [
      `${entityStr} legal basis statute article`,
      `${understanding.legalFrameworks[0]} Brazil law text provisions`,
      `${entityStr} criminal code penal law constitution`,
    ];
    
    // Add specific legal framework queries
    for (const framework of understanding.legalFrameworks.slice(0, 2)) {
      legalQueries.push(`${framework} Brazil official text`);
    }
    
    return {
      complete: false,
      focus: "Legal framework and specific statutes",
      category: "legal_provision",
      queries: legalQueries.slice(0, 4)
    };
  }
  
  // Priority 2: Evidence
  if (!hasEvidence) {
    return {
      complete: false,
      focus: "Evidence, documents, and specific facts",
      category: "evidence",
      queries: [
        `${entityStr} evidence police report documents`,
        `${entityStr} witnesses testimony court`,
        `${entityStr} investigation findings proof`,
        `${entityStr} federal police report verdict`
      ]
    };
  }
  
  // Priority 3: Criticism (MANDATORY)
  if (!hasCriticism) {
    return {
      complete: false,
      focus: "Criticism and opposing viewpoints",
      category: "criticism",
      queries: [
        `${entityStr} criticism unfair problems`,
        `${entityStr} lawfare political persecution`,
        `${entityStr} defense arguments concerns`,
        `${entityStr} controversy opposition critics`
      ]
    };
  }
  
  // Priority 4: Expert opinions
  if (!hasExpert) {
    return {
      complete: false,
      focus: "Expert analysis and legal opinions",
      category: "expert_quote",
      queries: [
        `${entityStr} legal expert professor analysis`,
        `${entityStr} constitutional scholar opinion`,
        `${entityStr} international law expert assessment`,
        `${entityStr} academic legal analysis`
      ]
    };
  }
  
  // Additional research based on unanswered questions
  if (state.iterations.length < CONFIG.maxResearchIterations) {
    const answeredTopics = state.facts.map(f => f.fact.toLowerCase());
    const unansweredQuestions = understanding.researchQuestions.filter(q => 
      !answeredTopics.some(a => {
        const qWords = q.toLowerCase().split(/\s+/).filter(w => w.length > 4);
        return qWords.some(w => a.includes(w));
      })
    );
    
    if (unansweredQuestions.length > 0) {
      return {
        complete: false,
        focus: "Additional research questions",
        category: "evidence",
        queries: unansweredQuestions.slice(0, 3).map(q => `${entityStr} ${q}`)
      };
    }
  }
  
  return { complete: true };
}

// ============================================================================
// STEP 3: FETCH SOURCES
// ============================================================================

async function fetchSource(url: string, id: string, category: string): Promise<FetchedSource | null> {
  const cred = getCredibility(url);
  
  try {
    const text = await Promise.race([
      extractTextFromUrl(url),
      new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), CONFIG.fetchTimeoutMs)
      )
    ]);
    
    return {
      id,
      url,
      title: extractTitle(text, url),
      credibility: cred.score,
      credibilityTier: cred.tier,
      fullText: text.slice(0, CONFIG.fullArticleMaxChars),
      fetchedAt: new Date().toISOString(),
      category
    };
  } catch (err) {
    console.warn(`Fetch failed for ${url}:`, err);
    return null;
  }
}

function extractTitle(text: string, fallback: string): string {
  const firstLine = text.split("\n")[0]?.trim();
  if (firstLine && firstLine.length > 10 && firstLine.length < 200) {
    return firstLine;
  }
  try {
    return new URL(fallback).hostname;
  } catch {
    return fallback.slice(0, 50);
  }
}

// ============================================================================
// STEP 4: EXTRACT SPECIFIC FACTS
// ============================================================================

const FACT_SCHEMA = z.object({
  facts: z.array(z.object({
    fact: z.string(),
    category: z.enum(["legal_provision", "evidence", "expert_quote", "statistic", "event", "criticism"]),
    specificity: z.enum(["high", "medium", "low"])
  }))
});

async function extractFacts(
  source: FetchedSource,
  focus: string,
  model: any
): Promise<ExtractedFact[]> {
  const systemPrompt = `You are a fact extractor for FactHarbor. Extract SPECIFIC, CITABLE facts from sources.

## RESEARCH FOCUS
${focus}

## REQUIREMENTS

Extract facts that are:
1. **SPECIFIC**: Include exact numbers, names, article numbers, dates, vote counts
2. **RELEVANT**: Related to the research focus
3. **CITABLE**: Can be directly attributed to this source

## SPECIFICITY EXAMPLES

HIGH specificity (STRONGLY PREFER):
- "Law 14,197/2021 Article 359-L establishes 3-12 years imprisonment for attempted coup d'état"
- "The Federal Police report was 884 pages and documented testimony from 73 witnesses"
- "Harvard Professor Steven Levitsky called the verdict 'a milestone of institutional resilience'"
- "The TSE voted 5-2 in favor of ineligibility until 2030"
- "The sentence was 27 years and 3 months in prison"

MEDIUM specificity (ACCEPTABLE):
- "The trial was based on Law 14,197/2021 which criminalizes coup attempts"
- "Multiple witnesses testified about the planning meetings"
- "International legal experts supported the constitutional basis"

LOW specificity (AVOID - DO NOT EXTRACT):
- "The trial followed proper procedures"
- "Experts say the process was fair"
- "Evidence was presented to the court"

## CATEGORIES

- legal_provision: Specific laws, articles, constitutional provisions
- evidence: Documents, reports, physical evidence, testimony details
- expert_quote: Named expert opinions with attribution
- statistic: Numbers, percentages, vote counts, dates
- event: Specific events with dates and details
- criticism: Critical perspectives, concerns, opposition arguments

Extract 3-6 facts. Only HIGH or MEDIUM specificity. Skip LOW specificity facts.`;

  try {
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Extract specific facts from this source.\n\nSource: ${source.title}\nURL: ${source.url}\nCredibility: ${source.credibilityTier}\n\nContent:\n${source.fullText}` }
      ],
      temperature: 0.2,
      output: Output.object({ schema: FACT_SCHEMA })
    });

    const extraction = result.output as z.infer<typeof FACT_SCHEMA>;
    
    // Filter out low specificity and map to ExtractedFact
    return extraction.facts
      .filter(f => f.specificity !== "low")
      .map((f, i) => ({
        id: `${source.id}-F${i + 1}`,
        fact: f.fact,
        category: f.category,
        specificity: f.specificity as "high" | "medium",
        sourceId: source.id,
        sourceUrl: source.url,
        sourceTitle: source.title
      }));
  } catch (err) {
    console.warn(`Fact extraction failed for ${source.url}:`, err);
    return [];
  }
}

// ============================================================================
// STEP 5: GENERATE COMPREHENSIVE REPORT
// ============================================================================

async function generateReport(
  state: ResearchState,
  model: any
): Promise<string> {
  const understanding = state.understanding!;
  
  // Organize facts by category
  const factsByCategory: Record<string, ExtractedFact[]> = {};
  for (const fact of state.facts) {
    if (!factsByCategory[fact.category]) factsByCategory[fact.category] = [];
    factsByCategory[fact.category].push(fact);
  }
  
  const categoryLabels: Record<string, string> = {
    legal_provision: "LEGAL PROVISIONS",
    evidence: "EVIDENCE & DOCUMENTS",
    expert_quote: "EXPERT OPINIONS",
    statistic: "STATISTICS & DATA",
    event: "EVENTS & TIMELINE",
    criticism: "CRITICISM & CONCERNS"
  };
  
  const factsFormatted = Object.entries(factsByCategory)
    .map(([cat, facts]) => {
      const label = categoryLabels[cat] || cat.toUpperCase();
      return `### ${label} (${facts.length} facts)\n${facts.map(f =>
        `- [${f.id}] ${f.fact}\n  Source: ${f.sourceTitle} (${f.sourceUrl})`
      ).join("\n")}`;
    })
    .join("\n\n");
  
  // Organize sources by credibility tier
  const sourcesByTier = {
    HIGHEST: state.sources.filter(s => s.credibilityTier === "HIGHEST"),
    HIGH: state.sources.filter(s => s.credibilityTier === "HIGH"),
    MEDIUM: state.sources.filter(s => s.credibilityTier === "MEDIUM"),
    LOW: state.sources.filter(s => s.credibilityTier === "LOW")
  };
  
  const avgCredibility = state.sources.length > 0
    ? (state.sources.reduce((sum, s) => sum + s.credibility, 0) / state.sources.length * 100).toFixed(1)
    : "0";

  const systemPrompt = `You are FactHarbor, generating a COMPREHENSIVE fact-checking report.

## REPORT REQUIREMENTS

### Structure
1. **Title and Context**
2. **Executive Summary** (key findings with confidence levels)
3. **Analysis Overview** (metrics, quality summary)
4. **Context Section** (if multiple events, explain each separately)
5. **Claims Analysis** (for each claim: multiple scenarios, evidence, verdict)
6. **Evidence Summary** (supporting vs counter, by credibility tier)
7. **Limitations & Open Questions**
8. **Conclusion** (what is clear, what is contested)
9. **Technical Notes** (sources, methodology)

### Critical Requirements

1. **SEPARATE DISTINCT EVENTS**: If there are multiple trials/events (e.g., TSE 2023 vs STF 2025), analyze each in its own section with:
   - Different legal frameworks
   - Different evidence
   - Different verdicts and sentences

2. **CITE SPECIFIC PROVISIONS**: Use EXACT legal provisions from the facts
   - ✅ "Under Law 14,197/2021 Article 359-L, attempted coup carries 3-12 years"
   - ❌ "The charges were based on Brazilian law"

3. **INCLUDE SPECIFIC EVIDENCE**: Quote exact figures
   - ✅ "The 884-page Federal Police report documented 73 witness testimonies"
   - ❌ "Evidence was presented"

4. **NAME EXPERTS**: Include full attribution
   - ✅ "Harvard Professor Steven Levitsky called it 'a milestone of institutional resilience'"
   - ❌ "Experts praised the verdict"

5. **DIFFERENTIATE CONFIDENCE**: Legal basis and procedural fairness may have different confidence levels

6. **INCLUDE CRITICISM**: Quote critics by name and outlet with specifics

7. **MULTIPLE SCENARIOS PER CLAIM**:
   - Scenario A: Most favorable interpretation (with supporting evidence)
   - Scenario B: Critical interpretation (with counter-evidence)
   - Scenario C: Balanced assessment

### Quality Standards
- Use the SPECIFIC facts provided - do not generalize
- Include source citations [S1], [S2], etc.
- State confidence as percentages with ranges
- Clearly separate "what is established" from "what is contested"`;

  const userPrompt = `Generate a comprehensive fact-checking report.

## ORIGINAL CLAIM
"${state.originalInput}"

## CLAIM UNDERSTANDING

**Main Question**: ${understanding.mainQuestion}

**Sub-claims**:
${understanding.subClaims.map(c => `- ${c.id}: ${c.text} (${c.type})\n  Entities: ${c.keyEntities.join(", ")}`).join("\n")}

**Distinct Events**:
${understanding.distinctEvents.length > 0 
  ? understanding.distinctEvents.map(e => `- ${e.name} (${e.date}): ${e.description}`).join("\n")
  : "- Single event/topic"}

**Legal Frameworks Identified**: ${understanding.legalFrameworks.join(", ") || "None identified"}

**Risk Tier**: ${understanding.riskTier} ${understanding.riskTier === "A" ? "(High - legal/democracy)" : understanding.riskTier === "B" ? "(Medium - complex/contested)" : "(Low)"}

## EXTRACTED FACTS (${state.facts.length} total)

${factsFormatted}

## SOURCES CONSULTED (${state.sources.length} total, ${avgCredibility}% average credibility)

**By Credibility Tier**:
- HIGHEST (${sourcesByTier.HIGHEST.length}): ${sourcesByTier.HIGHEST.map(s => `[${s.id}] ${s.title}`).join(", ") || "none"}
- HIGH (${sourcesByTier.HIGH.length}): ${sourcesByTier.HIGH.map(s => `[${s.id}] ${s.title}`).join(", ") || "none"}
- MEDIUM (${sourcesByTier.MEDIUM.length}): ${sourcesByTier.MEDIUM.map(s => `[${s.id}] ${s.title}`).join(", ") || "none"}
- LOW (${sourcesByTier.LOW.length}): ${sourcesByTier.LOW.map(s => `[${s.id}] ${s.title}`).join(", ") || "none"}

## RESEARCH ITERATIONS
${state.iterations.map(i => `- Iteration ${i.number}: ${i.focus} → ${i.sourcesFound} sources, ${i.factsExtracted} cumulative facts`).join("\n")}

---

Generate a comprehensive markdown report following all requirements above.
Use the specific facts extracted. Cite sources. Be detailed and specific.`;

  const result = await generateText({
    model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.3,
    maxTokens: 8000
  });

  return result.text;
}

// ============================================================================
// MODEL SELECTION
// ============================================================================

function getModel(providerOverride?: string) {
  const provider = (providerOverride ?? process.env.LLM_PROVIDER ?? "anthropic").toLowerCase();
  
  if (provider === "anthropic" || provider === "claude") {
    return { 
      provider: "anthropic", 
      modelName: "claude-sonnet-4-20250514", 
      model: anthropic("claude-sonnet-4-20250514") 
    };
  }
  if (provider === "google" || provider === "gemini") {
    return { 
      provider: "google", 
      modelName: "gemini-1.5-pro", 
      model: google("gemini-1.5-pro") 
    };
  }
  if (provider === "mistral") {
    return { 
      provider: "mistral", 
      modelName: "mistral-large-latest", 
      model: mistral("mistral-large-latest") 
    };
  }
  return { 
    provider: "openai", 
    modelName: "gpt-4o", 
    model: openai("gpt-4o") 
  };
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
  
  const { provider, modelName, model } = getModel();
  
  // Initialize research state
  const state: ResearchState = {
    originalInput: input.inputValue,
    inputType: input.inputType,
    understanding: null,
    iterations: [],
    facts: [],
    sources: []
  };
  
  // Handle URL input - fetch content first
  let textToAnalyze = input.inputValue;
  if (input.inputType === "url") {
    await emit("Fetching URL content", 3);
    try {
      textToAnalyze = await extractTextFromUrl(input.inputValue);
      state.originalInput = textToAnalyze.slice(0, 3000); // Store excerpt for reference
    } catch (err) {
      throw new Error(`Failed to fetch URL: ${err}`);
    }
  }
  
  // ========================================
  // STEP 1: Understand the claim
  // ========================================
  await emit("Step 1: Analyzing claim structure", 5);
  
  try {
    state.understanding = await understandClaim(textToAnalyze, model);
  } catch (err) {
    console.error("Understanding failed:", err);
    // Fallback understanding
    state.understanding = {
      mainQuestion: textToAnalyze.slice(0, 200),
      subClaims: [{ id: "C1", text: textToAnalyze.slice(0, 200), type: "factual", keyEntities: [] }],
      distinctEvents: [],
      legalFrameworks: [],
      researchQuestions: [textToAnalyze.slice(0, 100)],
      riskTier: "B"
    };
  }
  
  await emit(
    `Identified ${state.understanding.subClaims.length} sub-claims, ${state.understanding.distinctEvents.length} distinct events`, 
    10
  );
  
  // ========================================
  // STEP 2: Iterative research
  // ========================================
  let iteration = 0;
  
  while (iteration < CONFIG.maxResearchIterations) {
    iteration++;
    const baseProgress = 10 + (iteration / CONFIG.maxResearchIterations) * 65;
    
    // Decide what to research next
    const decision = decideNextResearch(state);
    
    if (decision.complete) {
      await emit(
        `Research complete: ${state.facts.length} facts from ${state.sources.length} sources`, 
        baseProgress
      );
      break;
    }
    
    await emit(`Step 2.${iteration}: Researching ${decision.focus}`, baseProgress);
    
    // Execute searches
    const searchResults: Array<{ url: string; title: string }> = [];
    for (const query of decision.queries || []) {
      try {
        const results = await searchWeb({ query, maxResults: CONFIG.maxSourcesPerIteration });
        searchResults.push(...results);
      } catch (err) {
        console.warn(`Search failed for "${query}":`, err);
      }
    }
    
    // Deduplicate and filter already-fetched URLs
    const seenUrls = new Set(state.sources.map(s => s.url));
    const newUrls = [...new Set(searchResults.map(r => r.url))]
      .filter(url => !seenUrls.has(url))
      .slice(0, CONFIG.maxSourcesPerIteration);
    
    if (newUrls.length === 0) {
      await emit(`No new sources for ${decision.focus}, continuing...`, baseProgress + 5);
      
      // Record iteration even without new sources
      state.iterations.push({
        number: iteration,
        focus: decision.focus!,
        queries: decision.queries!,
        sourcesFound: 0,
        factsExtracted: state.facts.length
      });
      continue;
    }
    
    // Fetch sources in parallel
    await emit(`Fetching ${newUrls.length} sources`, baseProgress + 3);
    
    const fetchPromises = newUrls.map((url, i) =>
      fetchSource(url, `S${state.sources.length + i + 1}`, decision.category || "general")
    );
    const fetchedSources = (await Promise.all(fetchPromises)).filter((s): s is FetchedSource => s !== null);
    state.sources.push(...fetchedSources);
    
    // Extract facts from each new source
    await emit(`Extracting facts from ${fetchedSources.length} sources`, baseProgress + 8);
    
    for (const source of fetchedSources) {
      const facts = await extractFacts(source, decision.focus!, model);
      state.facts.push(...facts);
    }
    
    // Record iteration
    state.iterations.push({
      number: iteration,
      focus: decision.focus!,
      queries: decision.queries!,
      sourcesFound: fetchedSources.length,
      factsExtracted: state.facts.length
    });
    
    await emit(
      `Iteration ${iteration}: ${fetchedSources.length} sources, ${state.facts.length} total facts`, 
      baseProgress + 12
    );
    
    // Check if we've hit the source limit
    if (state.sources.length >= CONFIG.maxTotalSources) {
      await emit(`Source limit reached (${CONFIG.maxTotalSources})`, baseProgress + 15);
      break;
    }
  }
  
  // ========================================
  // STEP 3: Generate comprehensive report
  // ========================================
  await emit("Step 3: Generating comprehensive report", 80);
  
  const reportMarkdown = await generateReport(state, model);
  
  await emit("Finalizing analysis", 95);
  
  // ========================================
  // Build quality metrics and result
  // ========================================
  const factsByCategory = state.facts.reduce((acc, f) => {
    acc[f.category] = (acc[f.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const avgCredibility = state.sources.length > 0
    ? state.sources.reduce((sum, s) => sum + s.credibility, 0) / state.sources.length
    : 0;
  
  // Quality gate assessment
  const qualityGates = {
    passed: 
      state.facts.length >= CONFIG.minFactsRequired &&
      Object.keys(factsByCategory).length >= CONFIG.minCategories &&
      factsByCategory.criticism > 0,
    summary: {
      totalFacts: state.facts.length,
      factsByCategory,
      totalSources: state.sources.length,
      sourcesByTier: {
        HIGHEST: state.sources.filter(s => s.credibilityTier === "HIGHEST").length,
        HIGH: state.sources.filter(s => s.credibilityTier === "HIGH").length,
        MEDIUM: state.sources.filter(s => s.credibilityTier === "MEDIUM").length,
        LOW: state.sources.filter(s => s.credibilityTier === "LOW").length
      },
      averageCredibility: avgCredibility,
      researchIterations: state.iterations.length
    },
    failures: [] as string[]
  };
  
  // Check specific failures
  if (state.facts.length < CONFIG.minFactsRequired) {
    qualityGates.failures.push(`Insufficient facts: ${state.facts.length} < ${CONFIG.minFactsRequired} required`);
  }
  if (Object.keys(factsByCategory).length < CONFIG.minCategories) {
    qualityGates.failures.push(`Insufficient fact categories: ${Object.keys(factsByCategory).length} < ${CONFIG.minCategories} required`);
  }
  if (!factsByCategory.legal_provision) {
    qualityGates.failures.push("Missing legal provisions - no specific statutes cited");
  }
  if (!factsByCategory.criticism) {
    qualityGates.failures.push("Missing criticism - no counter-evidence found");
  }
  if (!factsByCategory.evidence) {
    qualityGates.failures.push("Missing evidence - no specific documents/reports cited");
  }
  
  await emit("Analysis complete", 100);
  
  // Build result JSON
  const resultJson = {
    meta: {
      generatedUtc: new Date().toISOString(),
      llmProvider: provider,
      llmModel: modelName,
      inputType: input.inputType,
      inputLength: textToAnalyze.length,
      analysisTimeMs: Date.now() - startTime,
      researchIterations: state.iterations.length,
      sourcesConsulted: state.sources.length,
      factsExtracted: state.facts.length
    },
    understanding: state.understanding,
    facts: state.facts,
    sources: state.sources.map(s => ({
      id: s.id,
      url: s.url,
      title: s.title,
      credibility: s.credibility,
      credibilityTier: s.credibilityTier,
      category: s.category
    })),
    iterations: state.iterations,
    qualityGates
  };
  
  return {
    resultJson,
    reportMarkdown
  };
}

// ============================================================================
// EXPORTS FOR BACKWARD COMPATIBILITY
// ============================================================================

export function clampConfidence(value: number): number {
  return Math.max(0.1, Math.min(1, value));
}
