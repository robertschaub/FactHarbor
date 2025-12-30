import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { mistral } from "@ai-sdk/mistral";
import { generateText, Output } from "ai";
import { extractTextFromUrl } from "@/lib/retrieval";
import { buildSourceBundle, type SourceBundle } from "@/lib/source-bundle";

const VerdictEnum = z.enum(["supported", "refuted", "unclear", "mixed", "misleading"]);
const ClaimTypeEnum = z.enum(["factual", "opinion", "prediction", "ambiguous"]);
const RiskTierEnum = z.enum(["A", "B", "C"]);

const ConfidenceRangeSchema = z.object({
  min: z.number(),
  max: z.number()
});

const LlmVerdictSchema = z.object({
  scenarioId: z.string(),
  verdict: VerdictEnum,
  // IMPROVED: Minimum confidence 0.1 (was 0)
  confidence: z.number().min(0.1).max(1),
  confidenceRange: ConfidenceRangeSchema,
  uncertaintyFactors: z.array(z.string()),
  rationale: z.string()
});

const EvidenceSchema = z.object({
  kind: z.enum(["evidence", "counter_evidence"]),
  summary: z.string(),
  source: z.object({
    type: z.enum(["url", "text", "unknown"]),
    ref: z.string().nullable(),
    url: z.string().nullable(),
    title: z.string().nullable(),
    reliability: z.number().nullable()
  })
});

const ScenarioSchema = z.object({
  scenarioId: z.string(),
  title: z.string(),
  description: z.string(),
  evidence: z.array(EvidenceSchema),
  verdict: LlmVerdictSchema
});

const ClaimSchema = z.object({
  claimId: z.string(),
  text: z.string(),
  claimType: ClaimTypeEnum,
  riskTier: RiskTierEnum,
  scenarios: z.array(ScenarioSchema)
});

const LlmOutputSchema = z.object({
  claims: z.array(ClaimSchema),
  articleAnalysis: z.object({
    mainArgument: z.string(),
    overallVerdict: VerdictEnum,
    confidence: z.number(),
    confidenceRange: ConfidenceRangeSchema,
    uncertaintyFactors: z.array(z.string()),
    riskTier: RiskTierEnum,
    reasoning: z.string(),
    differsFromClaims: z.boolean(),
    fallacies: z.array(z.string())
  })
});

const ResultVerdictSchema = z.object({
  scenarioId: z.string(),
  verdict: VerdictEnum,
  confidence: z.number().min(0.1).max(1),  // IMPROVED: min 0.1
  confidenceRange: ConfidenceRangeSchema,
  uncertaintyFactors: z.array(z.string()),
  rationale: z.string()
});

const ResultSchema = z.object({
  meta: z.object({
    generatedUtc: z.string(),
    llmProvider: z.string(),
    llmModel: z.string(),
    inputType: z.enum(["text", "url"]),
    inputLength: z.number()
  }),
  claims: z.array(
    ClaimSchema.extend({
      scenarios: z.array(
        ScenarioSchema.extend({
          verdict: ResultVerdictSchema
        })
      )
    })
  ),
  articleAnalysis: LlmOutputSchema.shape.articleAnalysis,
  // NEW: Quality gate results
  qualityGates: z.object({
    passed: z.boolean(),
    summary: z.object({
      totalClaims: z.number(),
      passedClaims: z.number(),
      totalScenarios: z.number(),
      passedScenarios: z.number()
    }),
    failures: z.array(z.object({
      gate: z.string(),
      failures: z.array(z.string())
    }))
  }).optional()
});

type AnalysisInput = {
  inputType: "text" | "url";
  inputValue: string;
  onEvent?: (message: string, progress: number) => void;
};

// IMPROVED: Enforce minimum confidence of 0.1
const MINIMUM_CONFIDENCE = parseFloat(process.env.FH_MINIMUM_CONFIDENCE ?? "0.1");

export function clampConfidence(value: number): number {
  // Ensure minimum 0.1 - a confidence of 0 means "no opinion" which isn't a verdict
  const clamped = Math.max(MINIMUM_CONFIDENCE, Math.min(1, value));
  
  if (value < MINIMUM_CONFIDENCE) {
    console.warn(`Confidence value ${value} clamped to minimum ${MINIMUM_CONFIDENCE}`);
  }
  
  return clamped;
}

function clampRange(range: z.infer<typeof ConfidenceRangeSchema>) {
  const min = clampConfidence(range.min);
  const max = clampConfidence(range.max);
  return { min: Math.min(min, max), max: Math.max(min, max) };
}

// ============================================================================
// NEW: QUALITY GATES (POC1 Spec Compliance)
// ============================================================================

type QualityGateResult = {
  passed: boolean;
  gate: string;
  failures: string[];
};

// Gate 1: Claim Validation - ensure claims are fact-checkable
function validateGate1ClaimValidation(claim: z.infer<typeof ClaimSchema>): QualityGateResult {
  const failures: string[] = [];
  
  // Each claim must have at least one scenario
  if (claim.scenarios.length === 0) {
    failures.push(`Claim "${claim.text.slice(0, 50)}..." has no scenarios - analysis incomplete`);
  }
  
  // Opinion claims without scenarios are cop-outs
  if (claim.claimType === 'opinion' && claim.scenarios.length === 0) {
    failures.push(`Claim classified as 'opinion' with no scenarios - should decompose into testable sub-claims`);
  }
  
  // Each scenario must have at least one evidence item
  for (const scenario of claim.scenarios) {
    if (scenario.evidence.length === 0) {
      failures.push(`Scenario "${scenario.title}" has no evidence items`);
    }
  }
  
  return {
    passed: failures.length === 0,
    gate: 'Gate 1: Claim Validation',
    failures
  };
}

// Gate 4: Verdict Confidence Assessment
function validateGate4VerdictConfidence(
  scenario: z.infer<typeof ScenarioSchema>,
  claimText: string
): QualityGateResult {
  const failures: string[] = [];
  
  // Count sources with actual content (not unknown)
  const knownSources = scenario.evidence.filter(e => e.source.type !== 'unknown');
  
  // Minimum 2 sources requirement (from POC1 spec)
  if (knownSources.length < 2) {
    failures.push(`Only ${knownSources.length} known sources (minimum 2 required for publication)`);
  }
  
  // Check source quality
  const qualities = scenario.evidence
    .map(e => e.source.reliability)
    .filter((r): r is number => r !== null && r > 0);
  
  if (qualities.length > 0) {
    const avgQuality = qualities.reduce((a, b) => a + b, 0) / qualities.length;
    if (avgQuality < 0.6) {
      failures.push(`Average source quality ${avgQuality.toFixed(2)} below 0.6 threshold`);
    }
  }
  
  // Confidence must meet MEDIUM threshold (50%) for publication
  if (scenario.verdict.confidence < 0.5) {
    failures.push(`Confidence ${(scenario.verdict.confidence * 100).toFixed(0)}% below MEDIUM threshold (50%)`);
  }
  
  // Confidence range should be reasonable (not too wide)
  const rangeSpread = scenario.verdict.confidenceRange.max - scenario.verdict.confidenceRange.min;
  if (rangeSpread > 0.6) {
    failures.push(`Confidence range too wide (${(rangeSpread * 100).toFixed(0)}%) - indicates high uncertainty`);
  }
  
  // Must have uncertainty factors if confidence < 0.8
  if (scenario.verdict.confidence < 0.8 && scenario.verdict.uncertaintyFactors.length === 0) {
    failures.push(`Low confidence without stated uncertainty factors`);
  }
  
  return {
    passed: failures.length === 0,
    gate: `Gate 4: Verdict Confidence (${claimText.slice(0, 30)}...)`,
    failures
  };
}

// NEW: Check for counter-evidence (mandatory contradiction analysis)
function validateContradictionAnalysis(result: z.infer<typeof ResultSchema>): QualityGateResult {
  const failures: string[] = [];
  
  for (const claim of result.claims) {
    for (const scenario of claim.scenarios) {
      const hasCounterEvidence = scenario.evidence.some(e => e.kind === 'counter_evidence');
      if (!hasCounterEvidence) {
        failures.push(`Scenario "${scenario.title}" has no counter_evidence - mandatory contradiction analysis missing`);
      }
    }
  }
  
  return {
    passed: failures.length === 0,
    gate: 'Contradiction Analysis',
    failures
  };
}

function runQualityGates(result: z.infer<typeof ResultSchema>): {
  passed: boolean;
  results: QualityGateResult[];
  summary: {
    totalClaims: number;
    passedClaims: number;
    totalScenarios: number;
    passedScenarios: number;
  };
} {
  const gateResults: QualityGateResult[] = [];
  let passedClaims = 0;
  let passedScenarios = 0;
  const totalScenarios = result.claims.reduce((sum, c) => sum + c.scenarios.length, 0);
  
  for (const claim of result.claims) {
    const gate1 = validateGate1ClaimValidation(claim);
    gateResults.push(gate1);
    
    let claimPassed = gate1.passed;
    
    for (const scenario of claim.scenarios) {
      const gate4 = validateGate4VerdictConfidence(scenario, claim.text);
      gateResults.push(gate4);
      
      if (gate4.passed) {
        passedScenarios++;
      } else {
        claimPassed = false;
      }
    }
    
    if (claimPassed) passedClaims++;
  }
  
  // Check contradiction analysis
  const contradictionGate = validateContradictionAnalysis(result);
  gateResults.push(contradictionGate);
  
  return {
    passed: gateResults.every(r => r.passed),
    results: gateResults,
    summary: {
      totalClaims: result.claims.length,
      passedClaims,
      totalScenarios,
      passedScenarios
    }
  };
}

// ============================================================================
// END QUALITY GATES
// ============================================================================

type QualitySummary = {
  totalClaims: number;
  factualClaims: number;
  opinionClaims: number;
  predictionClaims: number;
  ambiguousClaims: number;
  scenariosTotal: number;
  evidenceTotal: number;
  counterEvidenceTotal: number;  // NEW
  unknownEvidence: number;
  sourceCount: number;
  averageConfidence: number;
  averageSourceQuality: number;  // NEW
};

function buildQualitySummary(result: z.infer<typeof ResultSchema>, sources: SourceBundle): QualitySummary {
  const totalClaims = result.claims.length;
  let factualClaims = 0;
  let opinionClaims = 0;
  let predictionClaims = 0;
  let ambiguousClaims = 0;
  let scenariosTotal = 0;
  let evidenceTotal = 0;
  let counterEvidenceTotal = 0;
  let unknownEvidence = 0;
  let confidenceSum = 0;
  let qualitySum = 0;
  let qualityCount = 0;

  for (const claim of result.claims) {
    if (claim.claimType === "factual") factualClaims += 1;
    else if (claim.claimType === "opinion") opinionClaims += 1;
    else if (claim.claimType === "prediction") predictionClaims += 1;
    else ambiguousClaims += 1;

    scenariosTotal += claim.scenarios.length;
    for (const scenario of claim.scenarios) {
      confidenceSum += scenario.verdict.confidence;
      for (const evidence of scenario.evidence) {
        evidenceTotal += 1;
        if (evidence.kind === 'counter_evidence') counterEvidenceTotal += 1;
        if (evidence.source.type === "unknown") unknownEvidence += 1;
        if (evidence.source.reliability !== null) {
          qualitySum += evidence.source.reliability;
          qualityCount += 1;
        }
      }
    }
  }

  const averageConfidence = scenariosTotal ? confidenceSum / scenariosTotal : 0;
  const averageSourceQuality = qualityCount ? qualitySum / qualityCount : 0;

  return {
    totalClaims,
    factualClaims,
    opinionClaims,
    predictionClaims,
    ambiguousClaims,
    scenariosTotal,
    evidenceTotal,
    counterEvidenceTotal,
    unknownEvidence,
    sourceCount: sources.sources.length,
    averageConfidence,
    averageSourceQuality
  };
}

function getModel(providerOverride?: string) {
  const provider = (providerOverride ?? process.env.LLM_PROVIDER ?? "openai").toLowerCase();
  if (provider === "anthropic" || provider === "claude") {
    return { provider: "anthropic", modelName: "claude-sonnet-4-20250514", model: anthropic("claude-sonnet-4-20250514") };
  }
  if (provider === "google" || provider === "gemini") {
    return { provider: "google", modelName: "gemini-1.5-flash", model: google("gemini-1.5-flash") };
  }
  if (provider === "mistral") {
    return { provider: "mistral", modelName: "mistral-large-latest", model: mistral("mistral-large-latest") };
  }
  return { provider: "openai", modelName: "gpt-4o-mini", model: openai("gpt-4o-mini") };
}

function getProviderFallbacks(): string[] {
  const raw = process.env.FH_LLM_FALLBACKS;
  if (raw && raw.trim()) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  const primary = process.env.LLM_PROVIDER ?? "openai";
  return [primary, "openai", "anthropic", "google", "mistral"];
}

// ============================================================================
// IMPROVED SYSTEM PROMPT
// ============================================================================

function buildSystemPrompt(): string {
  return `You are FactHarbor POC1 - a rigorous fact-checking analysis system.

## MANDATORY REQUIREMENTS (failure to follow = invalid output)

### 1. CLAIM DECOMPOSITION
- Complex claims MUST be split into testable sub-claims
- Example: "Trial was fair and legal" → separate claims for:
  * "Trial had legal basis" (factual, verifiable)
  * "Trial followed proper procedure" (factual, verifiable)
  * "Trial outcome was just" (evaluative, but can examine process)
- NEVER classify an entire complex input as single "opinion"
- If a claim has ANY testable component, extract and analyze it

### 2. MINIMUM OUTPUT REQUIREMENTS
- Every input MUST produce at least 1 claim
- Every claim MUST have at least 1 scenario
- Every scenario MUST have at least 1 evidence item
- Every scenario SHOULD have at least 1 counter_evidence item (mandatory contradiction analysis)

### 3. EVIDENCE RULES
- CITE the provided SOURCE BUNDLE when available
- Use source.type='url' with source.url for external sources
- Use source.type='text' with source.ref (excerpt) for input text citations
- Set source.reliability based on source credibility (0.1-1.0):
  * 0.9-1.0: Official government, peer-reviewed journals, courts
  * 0.7-0.89: Quality journalism (Reuters, AP, BBC), universities
  * 0.5-0.69: Think tanks, established NGOs
  * 0.3-0.49: Partisan sources, advocacy groups
  * 0.1-0.29: Social media, anonymous sources
- NEVER use source.type='unknown' if sources are provided

### 4. MANDATORY CONTRADICTION ANALYSIS
- For EVERY scenario, actively search for and include counter_evidence
- If sources show opposing viewpoints, include them
- If no opposing evidence exists, add counter_evidence with summary explaining why opposition is absent

### 5. CONFIDENCE SCORING
- Range: 0.1 to 1.0 (NEVER 0.0 - that indicates refusal to analyze)
- Include confidenceRange with realistic spread:
  * Narrow range (0.1 spread): Very certain, strong consensus
  * Medium range (0.2-0.3 spread): Reasonable confidence, some gaps
  * Wide range (0.4+ spread): Significant uncertainty
- ALWAYS list specific uncertaintyFactors (not generic statements)
- Examples of good uncertainty factors:
  * "Limited primary sources available"
  * "Conflicting expert opinions"
  * "Recent events may have changed situation"
  * "Source credibility varies significantly"

### 6. VERDICT SELECTION
- supported: Clear preponderance of quality evidence confirms claim
- refuted: Clear evidence contradicts the claim
- mixed: Significant evidence on both sides, cannot determine
- unclear: Insufficient evidence to make determination
- misleading: Technically true but presented in deceptive way

### 7. ARTICLE-LEVEL ANALYSIS
- mainArgument: State the core thesis in one sentence
- Compare individual claim verdicts to overall article thesis
- Set differsFromClaims=true if article conclusion doesn't follow from evidence
- List any logical fallacies detected

## OUTPUT FORMAT
Return structured JSON matching the schema exactly. Do not add explanatory text outside the JSON.`;
}

function buildUserPrompt(text: string, sourceBundleText: string): string {
  return `INPUT TEXT TO ANALYZE:
${text}

${sourceBundleText}

ANALYSIS INSTRUCTIONS:
1. Identify the main claims (aim for 2-5 claims, decompose complex ones)
2. For each claim:
   a. Determine if factual/opinion/prediction/ambiguous
   b. Assign risk tier: A (high: health/legal/elections), B (contested/complex), C (low risk)
   c. Create 1-2 focused scenarios
   d. For each scenario, list evidence AND counter_evidence from sources
   e. Provide verdict with confidence (0.1-1.0), range, and uncertainty factors

3. Provide article-level analysis:
   a. State main argument
   b. Overall verdict with confidence
   c. Note if conclusion differs from claim evidence
   d. List any fallacies

Remember:
- Decompose complex claims into testable parts
- EVERY scenario needs counter_evidence (contradiction analysis)
- Confidence MUST be 0.1-1.0, NEVER 0
- Cite sources with reliability scores`;
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

export async function runFactHarborAnalysis(input: AnalysisInput) {
  const onEvent = input.onEvent ?? (() => {});
  await onEvent("Loading input", 10);

  let text = input.inputValue;
  const reportStyle = (process.env.FH_REPORT_STYLE ?? "structured").toLowerCase();
  const allowModelKnowledge = (process.env.FH_ALLOW_MODEL_KNOWLEDGE ?? "false").toLowerCase() === "true";
  const qualityGatesEnabled = (process.env.FH_QUALITY_GATES_ENABLED ?? "true").toLowerCase() !== "false";

  if (input.inputType === "url") {
    await onEvent("Fetching URL", 20);
    text = await extractTextFromUrl(input.inputValue);
  }

  if (text.length > 200_000) {
    text = text.slice(0, 200_000);
  }

  await onEvent("Calling LLM (structured extraction)", 40);

  const sources = await buildSourceBundle({
    inputText: text,
    onEvent
  });

  // IMPROVED: Better system prompt
  const system = buildSystemPrompt();

  // Build source bundle text for prompt
  const sourceBundleText = sources.sources.length
    ? [
        "SOURCE BUNDLE (cite these in your analysis):",
        ...sources.sources.map((s) =>
          [
            `- id: ${s.id}`,
            `  url: ${s.url}`,
            `  title: ${s.title ?? "(no title)"}`,
            `  sourceType: ${s.sourceType ?? "unknown"}`,
            `  credibilityScore: ${s.trackRecordScore ?? "unknown"}`,
            `  fetchStatus: ${s.fetchStatus ?? "unknown"}`,
            s.excerpt ? `  excerpt: ${s.excerpt.slice(0, 500)}${s.excerpt.length > 500 ? '...' : ''}` : `  excerpt: (fetch failed)`
          ].join("\n")
        ),
        "",
        `Source metadata: ${sources.meta.primarySources} primary, ${sources.meta.contradictionSources} contradiction search, ${sources.meta.fetchSuccesses} fetched successfully`
      ].join("\n")
    : "SOURCE BUNDLE: (none available - rely on input text only)";

  const prompt = buildUserPrompt(text, sourceBundleText);

  const candidates = getProviderFallbacks();
  let selectedProvider = "";
  let selectedModel = "";
  let out: Awaited<ReturnType<typeof generateText>> | null = null;
  let lastError: string = "";

  for (const candidate of candidates) {
    const { provider, modelName, model } = getModel(candidate);
    try {
      out = await generateText({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: prompt }
        ],
        temperature: 0.2,
        output: Output.object({ schema: LlmOutputSchema })
      });
      selectedProvider = provider;
      selectedModel = modelName;
      break;
    } catch (err) {
      await onEvent(`LLM provider failed: ${provider}`, 45);
      lastError = err instanceof Error ? err.message : String(err);
      if (!process.env.FH_LLM_FALLBACKS && candidate === candidates[candidates.length - 1]) {
        throw new Error(`All LLM providers failed. Last error: ${lastError}`);
      }
    }
  }

  if (!out) {
    throw new Error(`All LLM providers failed. Last error: ${lastError}`);
  }

  // NEW: Validate output isn't empty/cop-out
  const totalScenarios = out.output.claims.reduce((sum, c) => sum + c.scenarios.length, 0);
  if (totalScenarios === 0) {
    throw new Error('Analysis produced no scenarios - LLM avoided analysis. Retry or check input.');
  }

  const allOpinionNoScenarios = out.output.claims.every(c => 
    c.claimType === 'opinion' && c.scenarios.length === 0
  );
  if (allOpinionNoScenarios && out.output.claims.length > 0) {
    throw new Error('All claims classified as opinion with no analysis - should decompose into testable sub-claims.');
  }

  await onEvent("Generating markdown report", 85);

  const result = {
    meta: {
      generatedUtc: new Date().toISOString(),
      llmProvider: selectedProvider,
      llmModel: selectedModel,
      inputType: input.inputType,
      inputLength: text.length
    },
    claims: out.output.claims.map((claim) => ({
      ...claim,
      scenarios: claim.scenarios.map((scenario) => ({
        ...scenario,
        verdict: {
          ...scenario.verdict,
          confidence: clampConfidence(scenario.verdict.confidence),
          confidenceRange: clampRange(scenario.verdict.confidenceRange)
        }
      }))
    })),
    articleAnalysis: {
      ...out.output.articleAnalysis,
      confidence: clampConfidence(out.output.articleAnalysis.confidence),
      confidenceRange: clampRange(out.output.articleAnalysis.confidenceRange)
    }
  };

  // NEW: Run quality gates
  let qualityGates: ReturnType<typeof runQualityGates> | null = null;
  if (qualityGatesEnabled) {
    qualityGates = runQualityGates(result);
  }

  const resultWithGates = {
    ...result,
    qualityGates: qualityGates ? {
      passed: qualityGates.passed,
      summary: qualityGates.summary,
      failures: qualityGates.results.filter(r => !r.passed)
    } : undefined
  } satisfies z.infer<typeof ResultSchema>;

  const qualitySummary = buildQualitySummary(resultWithGates, sources);

  const reportMarkdown =
    reportStyle === "rich"
      ? await renderReportWithLlm({
          model: getModel(selectedProvider).model,
          inputType: input.inputType,
          inputText: text,
          result: resultWithGates,
          allowModelKnowledge,
          qualitySummary,
          qualityGates
        })
      : renderReport(resultWithGates, qualitySummary, qualityGates);

  return {
    resultJson: resultWithGates,
    reportMarkdown
  };
}

// ============================================================================
// REPORT RENDERING
// ============================================================================

function renderReport(
  result: z.infer<typeof ResultSchema>,
  qualitySummary: QualitySummary,
  qualityGates: ReturnType<typeof runQualityGates> | null
): string {
  const lines: string[] = [];
  lines.push(`# FactHarbor POC1 Analysis`);
  lines.push(``);
  lines.push(`Generated (UTC): **${result.meta.generatedUtc}**`);
  lines.push(`Provider: **${result.meta.llmProvider}** (${result.meta.llmModel})`);
  lines.push(`Input type: **${result.meta.inputType}**`);
  lines.push(``);
  
  // Quality gates summary
  if (qualityGates) {
    const gateStatus = qualityGates.passed ? '✅ PASSED' : '⚠️ ISSUES DETECTED';
    lines.push(`## Quality Gates: ${gateStatus}`);
    lines.push(``);
    lines.push(`| Metric | Value |`);
    lines.push(`|--------|-------|`);
    lines.push(`| Claims Analyzed | ${qualityGates.summary.totalClaims} |`);
    lines.push(`| Claims Passed | ${qualityGates.summary.passedClaims} |`);
    lines.push(`| Scenarios Analyzed | ${qualityGates.summary.totalScenarios} |`);
    lines.push(`| Scenarios Passed | ${qualityGates.summary.passedScenarios} |`);
    lines.push(``);
    
    if (!qualityGates.passed) {
      lines.push(`### Quality Issues`);
      lines.push(``);
      for (const failure of qualityGates.results.filter(r => !r.passed)) {
        lines.push(`**${failure.gate}**`);
        for (const f of failure.failures) {
          lines.push(`- ${f}`);
        }
        lines.push(``);
      }
    }
  }
  
  // Analysis overview
  lines.push(`## Analysis Overview`);
  lines.push(``);
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Total Claims | ${qualitySummary.totalClaims} |`);
  lines.push(`| Factual Claims | ${qualitySummary.factualClaims} |`);
  lines.push(`| Scenarios | ${qualitySummary.scenariosTotal} |`);
  lines.push(`| Evidence Items | ${qualitySummary.evidenceTotal} |`);
  lines.push(`| Counter-Evidence | ${qualitySummary.counterEvidenceTotal} |`);
  lines.push(`| Sources Used | ${qualitySummary.sourceCount} |`);
  lines.push(`| Avg Confidence | ${(qualitySummary.averageConfidence * 100).toFixed(0)}% |`);
  lines.push(`| Avg Source Quality | ${(qualitySummary.averageSourceQuality * 100).toFixed(0)}% |`);
  lines.push(``);
  
  // Overall verdict
  lines.push(`## Overall Verdict`);
  lines.push(``);
  lines.push(
    `**${result.articleAnalysis.overallVerdict.toUpperCase()}** — Confidence: ${(result.articleAnalysis.confidence * 100).toFixed(0)}% (${(result.articleAnalysis.confidenceRange.min * 100).toFixed(0)}-${(result.articleAnalysis.confidenceRange.max * 100).toFixed(0)}%)`
  );
  lines.push(``);
  lines.push(`**Main Argument:** ${result.articleAnalysis.mainArgument}`);
  lines.push(``);
  lines.push(result.articleAnalysis.reasoning);
  
  if (result.articleAnalysis.uncertaintyFactors.length) {
    lines.push(``);
    lines.push(`**Uncertainty Factors:**`);
    for (const factor of result.articleAnalysis.uncertaintyFactors) {
      lines.push(`- ${factor}`);
    }
  }
  
  if (result.articleAnalysis.fallacies.length) {
    lines.push(``);
    lines.push(`**Detected Fallacies:**`);
    for (const fallacy of result.articleAnalysis.fallacies) {
      lines.push(`- ${fallacy}`);
    }
  }
  
  lines.push(``);
  
  // Claims
  lines.push(`## Claims Analysis`);
  lines.push(``);
  
  for (const c of result.claims) {
    const riskEmoji = c.riskTier === 'A' ? '🔴' : c.riskTier === 'B' ? '🟡' : '🟢';
    lines.push(`### ${riskEmoji} Claim: ${c.text}`);
    lines.push(``);
    lines.push(`**Type:** ${c.claimType} | **Risk Tier:** ${c.riskTier}`);
    lines.push(``);
    
    for (const s of c.scenarios) {
      lines.push(`#### Scenario: ${s.title}`);
      lines.push(``);
      lines.push(s.description);
      lines.push(``);
      
      const supporting = s.evidence.filter(e => e.kind === 'evidence');
      const opposing = s.evidence.filter(e => e.kind === 'counter_evidence');
      
      if (supporting.length) {
        lines.push(`**Supporting Evidence:**`);
        for (const e of supporting) {
          const reliability = e.source.reliability ? ` (reliability: ${(e.source.reliability * 100).toFixed(0)}%)` : '';
          lines.push(`- ✅ ${e.summary}${reliability}`);
        }
        lines.push(``);
      }
      
      if (opposing.length) {
        lines.push(`**Opposing Evidence:**`);
        for (const e of opposing) {
          const reliability = e.source.reliability ? ` (reliability: ${(e.source.reliability * 100).toFixed(0)}%)` : '';
          lines.push(`- ❌ ${e.summary}${reliability}`);
        }
        lines.push(``);
      }
      
      lines.push(
        `**Verdict:** ${s.verdict.verdict.toUpperCase()} — Confidence: ${(s.verdict.confidence * 100).toFixed(0)}% (${(s.verdict.confidenceRange.min * 100).toFixed(0)}-${(s.verdict.confidenceRange.max * 100).toFixed(0)}%)`
      );
      
      if (s.verdict.uncertaintyFactors.length) {
        lines.push(``);
        lines.push(`**Uncertainty Factors:** ${s.verdict.uncertaintyFactors.join("; ")}`);
      }
      lines.push(``);
      lines.push(`**Rationale:** ${s.verdict.rationale}`);
      lines.push(``);
    }
  }
  
  // Technical notes
  lines.push(`---`);
  lines.push(``);
  lines.push(`## Technical Notes`);
  lines.push(``);
  lines.push(`**Analysis ID:** FH-POC1-${new Date().toISOString().split('T')[0]}`);
  lines.push(`**AI System:** ${result.meta.llmProvider} (${result.meta.llmModel})`);
  lines.push(`**Input Length:** ${result.meta.inputLength} characters`);
  lines.push(``);
  lines.push(`*This analysis was fully generated by AI. Quality gates ${qualityGates?.passed ? 'passed' : 'detected issues'}.*`);
  
  return lines.join("\n");
}

async function renderReportWithLlm(opts: {
  model: ReturnType<typeof getModel>["model"];
  inputType: AnalysisInput["inputType"];
  inputText: string;
  result: z.infer<typeof ResultSchema>;
  allowModelKnowledge: boolean;
  qualitySummary: QualitySummary;
  qualityGates: ReturnType<typeof runQualityGates> | null;
}): Promise<string> {
  const system = [
    "You are a report writer for FactHarbor.",
    "Use the provided analysis JSON as the primary source of truth.",
    "Do not invent citations or named sources.",
    "If you need to add context beyond the input, label it as 'model knowledge' explicitly.",
    "Keep the report structured, scannable, and grounded in the analysis JSON.",
    "Include quality gate results if provided."
  ].join("\n");

  const prompt = [
    "Generate a markdown report with these sections:",
    "1) Title + short context line",
    "2) Quality Gates Summary (if available)",
    "3) Executive Summary (3-6 bullets)",
    "4) Analysis Overview (counts + quality metrics)",
    "5) Article-level Verdict (overall verdict + reasoning)",
    "6) Claims and Scenarios (verdicts + confidence range + risk tier + uncertainty factors)",
    "7) Evidence Summary (supporting vs counter, source quality)",
    "8) Limitations & Open Questions",
    "9) Analysis ID and Technical Notes",
    "",
    `Allow model knowledge: ${opts.allowModelKnowledge ? "yes" : "no"}`,
    `Input type: ${opts.inputType}`,
    `Input text (for quoting only):`,
    opts.inputText.slice(0, 2000),
    "",
    "Quality summary (computed):",
    JSON.stringify(opts.qualitySummary, null, 2),
    "",
    opts.qualityGates ? `Quality gates:\n${JSON.stringify(opts.qualityGates, null, 2)}` : "",
    "",
    "Analysis JSON:",
    JSON.stringify(opts.result, null, 2)
  ].join("\n");

  const out = await generateText({
    model: opts.model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: prompt }
    ],
    temperature: 0.2
  });

  return out.text.trim();
}
