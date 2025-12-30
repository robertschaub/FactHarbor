/**
 * Claim Decomposition Module for FactHarbor Multi-Pass Analysis
 * 
 * Phase 1: Understand what we're analyzing BEFORE searching.
 * This allows targeted, relevant research instead of generic searches.
 */

import { z } from "zod";
import { generateText, Output } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";

// ============================================================================
// TYPES
// ============================================================================

export interface Decomposition {
  claims: DecomposedClaim[];
  researchQueries: string[];
  timeframe: string;
  jurisdictions: string[];
  keyEntities: string[];
  complexity: 'simple' | 'moderate' | 'complex';
  riskTier: 'A' | 'B' | 'C';
  suggestedScenarios: SuggestedScenario[];
}

export interface DecomposedClaim {
  id: string;
  text: string;
  originalPortion: string;
  type: 'legal' | 'procedural' | 'factual' | 'evaluative' | 'predictive';
  entities: string[];
  testable: boolean;
  requiresLegalFramework: boolean;
  requiresExpertOpinion: boolean;
  potentialConflicts: string[];
}

export interface SuggestedScenario {
  claimId: string;
  title: string;
  perspective: 'supporting' | 'critical' | 'balanced';
  keyQuestions: string[];
}

// ============================================================================
// SCHEMA
// ============================================================================

const DecompositionSchema = z.object({
  claims: z.array(z.object({
    id: z.string(),
    text: z.string(),
    originalPortion: z.string(),
    type: z.enum(['legal', 'procedural', 'factual', 'evaluative', 'predictive']),
    entities: z.array(z.string()),
    testable: z.boolean(),
    requiresLegalFramework: z.boolean(),
    requiresExpertOpinion: z.boolean(),
    potentialConflicts: z.array(z.string())
  })),
  researchQueries: z.array(z.string()),
  timeframe: z.string(),
  jurisdictions: z.array(z.string()),
  keyEntities: z.array(z.string()),
  complexity: z.enum(['simple', 'moderate', 'complex']),
  riskTier: z.enum(['A', 'B', 'C']),
  suggestedScenarios: z.array(z.object({
    claimId: z.string(),
    title: z.string(),
    perspective: z.enum(['supporting', 'critical', 'balanced']),
    keyQuestions: z.array(z.string())
  }))
});

// ============================================================================
// DECOMPOSITION PROMPT
// ============================================================================

const DECOMPOSITION_SYSTEM_PROMPT = `You are an expert fact-checking analyst. Your task is to decompose claims for research planning.

## YOUR ROLE
You analyze claims BEFORE any research happens. Your job is to:
1. Break down complex claims into testable components
2. Identify what needs to be researched
3. Generate targeted research queries
4. Suggest analysis scenarios

## RULES

### Claim Decomposition
- NEVER classify a complex claim as single "opinion" if any part is testable
- Separate distinct assertions (e.g., "fair AND legal" = 2 claims)
- Identify the TYPE of each claim:
  - legal: Requires legal framework analysis
  - procedural: About process/procedure
  - factual: Verifiable facts
  - evaluative: Judgment calls (still analyzable via criteria)
  - predictive: About future outcomes

### Entity Extraction
- Extract specific names, laws, courts, dates, events
- Include both what's mentioned AND what's implied
- Example: "Bolsonaro trial" implies: TSE, STF, specific laws, specific judges

### Research Query Generation
- Generate 6-10 DIVERSE queries
- Include queries for: legal framework, evidence, criticism, expert opinion
- Make queries specific enough to find relevant sources
- Include entity names and legal terms

### Scenario Planning
- For each claim, suggest 2-3 scenarios:
  - Supporting perspective
  - Critical perspective
  - Balanced/nuanced perspective

### Risk Tier Assessment
- A (High): Health, safety, elections, democracy, legal proceedings
- B (Medium): Complex policy, contested political issues
- C (Low): Established facts, low-stakes claims

## OUTPUT
Return structured JSON matching the schema. Do NOT assess truth - only plan research.`;

const DECOMPOSITION_USER_PROMPT = `Analyze this claim and plan research:

INPUT: "{input}"

Instructions:
1. Decompose into 2-4 testable sub-claims
2. Extract all relevant entities (people, laws, courts, events, dates)
3. Generate 6-10 targeted research queries covering:
   - Legal framework queries (laws, statutes, constitutional provisions)
   - Evidence queries (documents, reports, testimony)
   - Expert opinion queries (scholars, legal experts)
   - Critical perspective queries (criticism, concerns, opposition)
   - International reaction queries (foreign responses, international law)
4. Suggest 2-3 scenarios per claim
5. Assess complexity and risk tier

Remember: You are PLANNING research, not conducting it. Focus on what NEEDS to be found.`;

// ============================================================================
// MAIN DECOMPOSITION FUNCTION
// ============================================================================

export async function decomposeClaim(
  input: string,
  options?: {
    provider?: 'anthropic' | 'openai';
    onEvent?: (message: string, progress: number) => void;
  }
): Promise<Decomposition> {
  const emit = options?.onEvent ?? (() => {});
  const provider = options?.provider ?? 'anthropic';
  
  emit("Analyzing claim structure...", 5);
  
  const model = provider === 'anthropic' 
    ? anthropic("claude-sonnet-4-20250514")
    : openai("gpt-4o");
  
  try {
    const result = await generateText({
      model,
      messages: [
        { role: "system", content: DECOMPOSITION_SYSTEM_PROMPT },
        { role: "user", content: DECOMPOSITION_USER_PROMPT.replace("{input}", input) }
      ],
      temperature: 0.3,
      output: Output.object({ schema: DecompositionSchema })
    });
    
    const decomposition = result.output as Decomposition;
    
    // Validate and enhance
    const enhanced = enhanceDecomposition(decomposition, input);
    
    emit(`Identified ${enhanced.claims.length} claims, ${enhanced.keyEntities.length} entities`, 15);
    
    return enhanced;
  } catch (err) {
    console.error("Decomposition failed:", err);
    // Fallback to basic decomposition
    return createFallbackDecomposition(input);
  }
}

// ============================================================================
// ENHANCEMENT & VALIDATION
// ============================================================================

function enhanceDecomposition(decomposition: Decomposition, originalInput: string): Decomposition {
  // Ensure minimum research queries
  if (decomposition.researchQueries.length < 6) {
    const additionalQueries = generateAdditionalQueries(decomposition, originalInput);
    decomposition.researchQueries.push(...additionalQueries);
  }
  
  // Ensure critical perspective queries exist
  const hasCriticalQuery = decomposition.researchQueries.some(q => 
    /criticism|unfair|problem|concern|controversy|opposition|defense/i.test(q)
  );
  
  if (!hasCriticalQuery) {
    const mainEntity = decomposition.keyEntities[0] || originalInput.slice(0, 30);
    decomposition.researchQueries.push(
      `${mainEntity} criticism concerns problems`,
      `${mainEntity} opposition arguments defense`
    );
  }
  
  // Ensure legal queries if legal claim
  const hasLegalClaim = decomposition.claims.some(c => c.type === 'legal' || c.requiresLegalFramework);
  const hasLegalQuery = decomposition.researchQueries.some(q => 
    /law|statute|code|constitution|article|legal basis/i.test(q)
  );
  
  if (hasLegalClaim && !hasLegalQuery) {
    decomposition.researchQueries.push(
      `${decomposition.keyEntities[0]} legal basis statute law`,
      `${decomposition.jurisdictions[0] || 'Brazil'} constitution legal framework`
    );
  }
  
  // Ensure each claim has scenarios
  for (const claim of decomposition.claims) {
    const claimScenarios = decomposition.suggestedScenarios.filter(s => s.claimId === claim.id);
    if (claimScenarios.length < 2) {
      decomposition.suggestedScenarios.push(
        {
          claimId: claim.id,
          title: `Supporting: ${claim.text.slice(0, 30)}...`,
          perspective: 'supporting',
          keyQuestions: [`What evidence supports "${claim.text.slice(0, 50)}"?`]
        },
        {
          claimId: claim.id,
          title: `Critical: ${claim.text.slice(0, 30)}...`,
          perspective: 'critical',
          keyQuestions: [`What concerns exist about "${claim.text.slice(0, 50)}"?`]
        }
      );
    }
  }
  
  return decomposition;
}

function generateAdditionalQueries(decomposition: Decomposition, input: string): string[] {
  const queries: string[] = [];
  const mainEntity = decomposition.keyEntities[0] || input.slice(0, 30);
  
  // Standard query templates
  const templates = [
    `${mainEntity} legal basis analysis`,
    `${mainEntity} evidence facts documents`,
    `${mainEntity} expert opinion analysis`,
    `${mainEntity} criticism concerns`,
    `${mainEntity} international reaction`,
    `${mainEntity} court ruling decision`
  ];
  
  // Add queries not already present
  for (const template of templates) {
    const isDuplicate = decomposition.researchQueries.some(q => 
      q.toLowerCase().includes(template.split(' ').slice(1).join(' ').toLowerCase())
    );
    if (!isDuplicate) {
      queries.push(template);
    }
  }
  
  return queries.slice(0, 6 - decomposition.researchQueries.length);
}

function createFallbackDecomposition(input: string): Decomposition {
  // Basic fallback when LLM decomposition fails
  const words = input.split(/\s+/);
  const keyTerms = words.filter(w => w.length > 4).slice(0, 5);
  
  return {
    claims: [{
      id: 'C1',
      text: input,
      originalPortion: input,
      type: 'factual',
      entities: keyTerms,
      testable: true,
      requiresLegalFramework: /law|legal|court|trial|judge/i.test(input),
      requiresExpertOpinion: true,
      potentialConflicts: []
    }],
    researchQueries: [
      `${keyTerms.slice(0, 3).join(' ')} facts evidence`,
      `${keyTerms.slice(0, 3).join(' ')} legal basis`,
      `${keyTerms.slice(0, 3).join(' ')} criticism concerns`,
      `${keyTerms.slice(0, 3).join(' ')} expert analysis`,
      `${keyTerms.slice(0, 3).join(' ')} international reaction`,
      `${keyTerms.slice(0, 3).join(' ')} controversy`
    ],
    timeframe: 'recent',
    jurisdictions: [],
    keyEntities: keyTerms,
    complexity: 'moderate',
    riskTier: 'B',
    suggestedScenarios: [
      {
        claimId: 'C1',
        title: 'Supporting Evidence',
        perspective: 'supporting',
        keyQuestions: ['What evidence supports this claim?']
      },
      {
        claimId: 'C1',
        title: 'Critical Analysis',
        perspective: 'critical',
        keyQuestions: ['What concerns or criticisms exist?']
      }
    ]
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

export function formatDecompositionSummary(decomposition: Decomposition): string {
  return `
## Claim Decomposition Summary

**Complexity**: ${decomposition.complexity}
**Risk Tier**: ${decomposition.riskTier}
**Timeframe**: ${decomposition.timeframe}
**Jurisdictions**: ${decomposition.jurisdictions.join(', ') || 'Not specified'}

### Claims Identified (${decomposition.claims.length})
${decomposition.claims.map(c => `
- **${c.id}**: ${c.text}
  - Type: ${c.type}
  - Testable: ${c.testable ? 'Yes' : 'No'}
  - Entities: ${c.entities.join(', ')}
`).join('')}

### Key Entities
${decomposition.keyEntities.map(e => `- ${e}`).join('\n')}

### Research Queries Planned (${decomposition.researchQueries.length})
${decomposition.researchQueries.map((q, i) => `${i + 1}. ${q}`).join('\n')}

### Suggested Scenarios (${decomposition.suggestedScenarios.length})
${decomposition.suggestedScenarios.map(s => `
- **${s.title}** (${s.perspective})
  - Claim: ${s.claimId}
`).join('')}
`.trim();
}
