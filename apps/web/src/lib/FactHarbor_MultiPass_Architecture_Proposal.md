# FactHarbor POC1 → POC2: Multi-Pass Analysis Architecture

**Problem**: Current POC1 single-pass approach produces thin analysis (~100 lines) compared to reference quality (~850 lines)

**Solution**: Implement iterative, multi-pass analysis with targeted research phases

---

## Current vs Target Architecture

### Current (POC1): Single-Pass
```
Input → 1 Web Search → 1 LLM Call → Report
        (generic)      (all-in-one)
```
**Result**: 10 sources, 2 scenarios, generic evidence, ~60% confidence

### Target (POC2): Multi-Pass
```
Input → Phase 1: Decomposition
      → Phase 2: Targeted Research (5-8 searches)
      → Phase 3: Deep Analysis
      → Phase 4: Synthesis
      → Report
```
**Result**: 20+ sources, 6+ scenarios, specific citations, differentiated confidence

---

## Proposed Multi-Pass Pipeline

### Phase 1: Claim Decomposition (LLM Call #1)
**Purpose**: Understand what we're analyzing before searching

```typescript
const decompositionPrompt = `
Analyze this claim and identify:
1. The main testable assertions (2-4)
2. Key entities/events that need research (people, trials, laws)
3. Time periods involved
4. Jurisdictions/legal frameworks applicable
5. Likely controversy points

DO NOT assess truth yet - just identify what needs to be researched.
`;

// Output:
{
  claims: [
    { id: "C1", text: "Legal basis of trials", entities: ["TSE", "STF", "Lei da Ficha Limpa", "Law 14,197/2021"] },
    { id: "C2", text: "Procedural fairness", entities: ["Justice Moraes", "due process", "sentence proportionality"] }
  ],
  researchQueries: [
    "Bolsonaro TSE trial 2023 legal basis electoral code",
    "Bolsonaro STF trial 2025 criminal charges coup",
    "Brazil Law 14197/2021 coup d'etat criminal code",
    "Bolsonaro trial criticism unfair lawfare",
    "Justice Alexandre de Moraes conflict of interest",
    "International reaction Bolsonaro conviction"
  ],
  timeframe: "2022-2025",
  jurisdictions: ["Brazilian electoral law", "Brazilian criminal law"]
}
```

### Phase 2: Targeted Research (5-8 Web Searches)

**Instead of one generic search**, execute targeted searches:

```typescript
async function conductTargetedResearch(decomposition: Decomposition): Promise<ResearchBundle> {
  const searches = [
    // 1. Official/Legal Framework
    {
      type: 'legal_framework',
      queries: [
        `Brazil ${decomposition.jurisdictions[0]} official statute`,
        `${decomposition.entities.filter(e => e.includes('Law'))} text provisions`
      ],
      priorityDomains: ['.gov.br', 'stf.jus.br', 'tse.jus.br']
    },
    
    // 2. Court Documents/Rulings
    {
      type: 'court_documents',
      queries: [
        `${decomposition.claims[0].entities.join(' ')} court ruling official`,
        `${decomposition.entities[0]} verdict decision text`
      ],
      priorityDomains: ['stf.jus.br', 'tse.jus.br', 'conjur.com.br']
    },
    
    // 3. Evidence/Facts
    {
      type: 'evidence',
      queries: [
        `${decomposition.claims[0].text} evidence documents police report`,
        `${decomposition.entities[0]} witnesses testimony`
      ],
      priorityDomains: ['reuters.com', 'apnews.com']
    },
    
    // 4. Expert Analysis
    {
      type: 'expert_opinion',
      queries: [
        `${decomposition.claims[0].text} legal expert analysis`,
        `${decomposition.claims[0].text} professor constitutional scholar`
      ],
      priorityDomains: ['lawfaremedia.org', '.edu', 'cfr.org']
    },
    
    // 5. Criticism/Opposition (MANDATORY)
    {
      type: 'criticism',
      queries: [
        `${decomposition.claims[0].text} criticism unfair problems`,
        `${decomposition.entities[0]} lawfare political persecution`,
        `${decomposition.claims[0].text} defense arguments`
      ],
      priorityDomains: ['wsj.com', 'economist.com']  // Include critical perspectives
    },
    
    // 6. International Reaction
    {
      type: 'international',
      queries: [
        `${decomposition.entities[0]} international reaction response`,
        `${decomposition.claims[0].text} UN human rights international law`
      ],
      priorityDomains: ['un.org', 'hrw.org', 'amnesty.org']
    }
  ];
  
  const results: ResearchBundle = { legal: [], evidence: [], expert: [], criticism: [], international: [] };
  
  for (const search of searches) {
    for (const query of search.queries) {
      const webResults = await searchWeb({ query, maxResults: 5, priorityDomains: search.priorityDomains });
      const fetched = await fetchSourcesParallel(webResults, { timeout: 8000 });
      results[search.type].push(...fetched);
    }
  }
  
  return deduplicateAndRank(results);
}
```

### Phase 3: Deep Analysis (LLM Call #2)

**With rich source bundle**, now do deep analysis:

```typescript
const analysisPrompt = `
You are analyzing: "${input}"

## RESEARCH BUNDLE (${sources.total} sources gathered)

### Legal Framework Sources (${sources.legal.length})
${formatSources(sources.legal)}

### Court Documents (${sources.court.length})
${formatSources(sources.court)}

### Evidence Sources (${sources.evidence.length})
${formatSources(sources.evidence)}

### Expert Analysis (${sources.expert.length})
${formatSources(sources.expert)}

### Critical Perspectives (${sources.criticism.length})
${formatSources(sources.criticism)}

### International Reaction (${sources.international.length})
${formatSources(sources.international)}

## ANALYSIS REQUIREMENTS

For each claim identified in decomposition:

1. **Create 2-3 scenarios** (not just 1)
   - Scenario A: Most favorable interpretation
   - Scenario B: Most critical interpretation  
   - Scenario C: Balanced/nuanced interpretation

2. **Cite specific provisions**
   - Quote exact article numbers (e.g., "Article 359-L")
   - Quote exact law names (e.g., "Lei da Ficha Limpa")
   - Quote specific evidence (e.g., "884-page Federal Police report")

3. **Include expert quotes**
   - Name the expert and institution
   - Quote their assessment

4. **Differentiate confidence by claim**
   - Legal basis may have different confidence than procedural fairness
   - Explain why confidence differs

5. **Separate distinct events**
   - If multiple trials/events, analyze each separately
   - TSE 2023 trial ≠ STF 2025 trial
`;
```

### Phase 4: Synthesis & Quality Enhancement (LLM Call #3)

**Final pass to ensure quality**:

```typescript
const synthesisPrompt = `
Review this analysis and enhance:

1. **Check for specific citations**
   - Every legal claim must cite specific statute/article
   - Every evidence claim must cite specific document/source
   - Replace generic phrases with specifics

2. **Expand thin sections**
   - Each scenario should have 3+ evidence items
   - Each claim should have supporting AND opposing evidence

3. **Add nuance**
   - What is CLEARLY ESTABLISHED vs LEGITIMATELY CONTESTED
   - What the analysis CAN vs CANNOT determine

4. **Quality checks**
   - All confidence scores have meaningful ranges
   - All claims have counter-evidence
   - Recommendations section included
   - Limitations acknowledged

Current analysis:
${currentAnalysis}

Enhanced analysis:
`;
```

---

## Implementation Changes

### New File: `lib/multi-pass-analyzer.ts`

```typescript
import { decomposeClaim } from './decomposition';
import { conductTargetedResearch } from './targeted-research';
import { analyzeWithSources } from './deep-analysis';
import { synthesizeReport } from './synthesis';

export async function runMultiPassAnalysis(input: AnalysisInput): Promise<Report> {
  const onEvent = input.onEvent ?? (() => {});
  
  // Phase 1: Decomposition (5-10 seconds)
  await onEvent("Phase 1: Analyzing claim structure", 10);
  const decomposition = await decomposeClaim(input.inputValue);
  
  // Phase 2: Targeted Research (15-25 seconds)
  await onEvent("Phase 2: Conducting targeted research", 25);
  const researchBundle = await conductTargetedResearch(decomposition);
  await onEvent(`Found ${researchBundle.totalSources} sources across ${researchBundle.categories} categories`, 50);
  
  // Phase 3: Deep Analysis (10-15 seconds)
  await onEvent("Phase 3: Performing deep analysis", 65);
  const analysis = await analyzeWithSources(decomposition, researchBundle);
  
  // Phase 4: Synthesis (10-15 seconds)
  await onEvent("Phase 4: Synthesizing final report", 85);
  const report = await synthesizeReport(analysis, {
    requireSpecificCitations: true,
    requireCounterEvidence: true,
    minimumScenariosPerClaim: 2,
    minimumSourcesPerScenario: 3
  });
  
  // Quality Gates
  await onEvent("Running quality gates", 95);
  const qualityResult = runQualityGates(report);
  
  return { ...report, qualityGates: qualityResult };
}
```

### New File: `lib/targeted-research.ts`

```typescript
export interface ResearchCategory {
  type: 'legal_framework' | 'court_documents' | 'evidence' | 'expert_opinion' | 'criticism' | 'international';
  queries: string[];
  priorityDomains: string[];
  minSources: number;
}

export async function conductTargetedResearch(decomposition: Decomposition): Promise<ResearchBundle> {
  const categories = buildResearchCategories(decomposition);
  
  const results: ResearchBundle = {
    legal: [],
    court: [],
    evidence: [],
    expert: [],
    criticism: [],
    international: [],
    totalSources: 0,
    categories: 0
  };
  
  // Execute searches in parallel by category
  const categoryPromises = categories.map(async (category) => {
    const categoryResults: Source[] = [];
    
    for (const query of category.queries) {
      try {
        const searchResults = await searchWeb({
          query,
          maxResults: 5,
          priorityDomains: category.priorityDomains
        });
        
        const fetched = await fetchSourcesParallel(
          searchResults.slice(0, 3),  // Top 3 per query
          { timeout: 8000 }
        );
        
        categoryResults.push(...fetched.filter(s => s.fetchStatus === 'success'));
      } catch (err) {
        console.warn(`Search failed for "${query}":`, err);
      }
    }
    
    return { type: category.type, sources: deduplicateByUrl(categoryResults) };
  });
  
  const categoryResults = await Promise.all(categoryPromises);
  
  for (const result of categoryResults) {
    results[result.type] = result.sources;
    results.totalSources += result.sources.length;
    if (result.sources.length > 0) results.categories++;
  }
  
  return results;
}

function buildResearchCategories(decomposition: Decomposition): ResearchCategory[] {
  const baseQueries = decomposition.researchQueries;
  const entities = decomposition.claims.flatMap(c => c.entities);
  
  return [
    {
      type: 'legal_framework',
      queries: [
        ...baseQueries.filter(q => q.includes('law') || q.includes('legal') || q.includes('code')),
        `${entities.filter(e => /law|code|statute/i.test(e)).join(' ')} Brazil official text`
      ],
      priorityDomains: ['.gov.br', 'planalto.gov.br', 'stf.jus.br'],
      minSources: 2
    },
    {
      type: 'court_documents',
      queries: [
        `${entities[0]} court ruling decision official`,
        `${entities[0]} verdict judgment text`
      ],
      priorityDomains: ['stf.jus.br', 'tse.jus.br', 'conjur.com.br'],
      minSources: 2
    },
    {
      type: 'evidence',
      queries: [
        `${entities[0]} evidence police report documents`,
        `${entities[0]} witnesses testimony facts`
      ],
      priorityDomains: ['reuters.com', 'apnews.com', 'bbc.com'],
      minSources: 3
    },
    {
      type: 'expert_opinion',
      queries: [
        `${entities[0]} legal expert professor analysis`,
        `${entities[0]} constitutional scholar opinion`
      ],
      priorityDomains: ['lawfaremedia.org', '.edu', 'cfr.org', 'brookings.edu'],
      minSources: 2
    },
    {
      type: 'criticism',
      queries: [
        `${entities[0]} criticism unfair lawfare political`,
        `${entities[0]} defense arguments response`,
        `${entities[0]} controversy problems concerns`
      ],
      priorityDomains: ['wsj.com', 'economist.com', 'ft.com'],
      minSources: 3  // MANDATORY - must find critical perspectives
    },
    {
      type: 'international',
      queries: [
        `${entities[0]} international reaction UN human rights`,
        `${entities[0]} foreign government response`
      ],
      priorityDomains: ['un.org', 'state.gov', 'hrw.org'],
      minSources: 2
    }
  ];
}
```

---

## Expected Output Quality Comparison

### Current POC1 Output
```markdown
## Claims and Scenarios

### Claim 1: Legal Basis Under Brazilian Law
**Verdict**: Mixed | **Confidence**: 65% (50-80%)

**Scenario S1-1: Constitutional and Legal Foundation**
- International Bar Association affirms democratic resilience
- Academic legal analysis confirms proper proceedings
- Counter: WSJ characterizes as "lawfare"
- Counter: DW examines "witch-hunt" allegations
```

### Target Multi-Pass Output
```markdown
## Claims Analysis

### 🟡 CLAIM 1: The Bolsonaro trials were based on Brazil's law

**Verdict**: STRONGLY SUPPORTED
**Confidence**: 85% (Range: 80% - 90%)

#### SCENARIO A: TSE Trial Legal Basis (June 2023)

**Legal Framework Used**:

1. **Brazilian Constitution (1988)**
   - Article 119: TSE composition and authority
   - Article 121 §3: TSE decisions unappealable

2. **Complementary Law 64/1990 ("Lei da Ficha Limpa")**
   - Article 22: Abuse of political power
   - Provides for 8-year ineligibility

3. **TSE Resolution 23.714/2022**
   - Prohibits dissemination of "notoriously untrue" facts

**Evidence Presented**:
- TSE issued 20 rebuttals to Bolsonaro's fraud claims
- Meeting used state resources (presidential palace, TV Brasil)
- 5-2 vote for ineligibility

**Expert Analysis**:
- Harvard Prof. Steven Levitsky: "Milestone of institutional resilience"
- NYC Bar Association: Condemned U.S. pressure, affirmed legal basis

#### SCENARIO B: STF Trial Legal Basis (September 2025)

**Legal Framework Used**:

1. **Brazilian Penal Code - Title XII** (Law 14,197/2021)
   - Article 359-L: Attempted coup d'état (3-12 years)
   - Article 359-M: Violent abolition of democratic rule of law (4-8 years)

**Evidence Presented**:
- 884-page Federal Police report (November 2024)
- Draft coup decree found at Anderson Torres' home
- "Operation 142" planning document
- 73 witnesses testified
- Plea bargain from Lt. Col. Mauro Cid

#### SCENARIO C: Legal Challenges and Defense Arguments

**Defense Arguments**:
1. Freedom of expression: Criticism of voting system is protected
2. No coup intent: Conversations were "informal"
3. Political persecution: Trials are politically motivated

**Court Responses**:
1. False information ≠ Free speech (TSE finding)
2. Draft decrees and operational plans show intent
3. Due process provided: full defense rights, public trial
```

---

## Performance Budget

| Phase | Current | Multi-Pass Target |
|-------|---------|-------------------|
| Decomposition | - | 5-10s |
| Research | 38s (1 search) | 20-30s (6-8 searches, parallel) |
| Analysis | 15s | 10-15s |
| Synthesis | - | 10-15s |
| **Total** | **56s** | **45-70s** |

Note: Multi-pass is slightly slower but produces 5-10x more detailed output.

---

## Migration Path

### Option A: New Endpoint (Recommended)
```
/api/fh/analyze        → Current POC1 (fast, basic)
/api/fh/analyze-deep   → New multi-pass (slower, detailed)
```

### Option B: Configuration Flag
```env
FH_ANALYSIS_MODE=basic    # Current behavior
FH_ANALYSIS_MODE=deep     # Multi-pass behavior
```

### Option C: Replace POC1
- Update `analyzer.ts` to use multi-pass
- May break existing integrations

---

## Implementation Priority

1. **Week 1**: `targeted-research.ts` - Implement categorized search
2. **Week 2**: `decomposition.ts` - Claim understanding before search
3. **Week 3**: `deep-analysis.ts` - Analysis with rich sources
4. **Week 4**: `synthesis.ts` - Quality enhancement pass
5. **Week 5**: Integration and testing

---

## Success Criteria

| Metric | Current | Target |
|--------|---------|--------|
| Report length | ~100 lines | ~500+ lines |
| Sources cited | 10 | 20+ |
| Scenarios per claim | 1 | 2-3 |
| Specific legal citations | 0 | 5+ per legal claim |
| Expert quotes | 0 | 2-3 |
| Counter-evidence items | 4 | 8+ |
| Distinct events analyzed | 1 (merged) | Separated (TSE vs STF) |
