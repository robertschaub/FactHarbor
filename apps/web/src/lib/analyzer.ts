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
  // OpenAI json_schema output_format does not support minimum/maximum on numbers.
  confidence: z.number(),
  confidenceRange: ConfidenceRangeSchema,
  uncertaintyFactors: z.array(z.string()),
  rationale: z.string()
});

const EvidenceSchema = z.object({
  kind: z.enum(["evidence", "counter_evidence"]),
  summary: z.string(),
  source: z.object({
    type: z.enum(["url", "text", "unknown"]),
    // OpenAI json_schema response_format is strict about required keys;
    // represent "optional" fields as nullable instead.
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

// The LLM only produces the "claims" structure.
// We add meta server-side to avoid strict JSON Schema constraints on optional keys.
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
  confidence: z.number().min(0).max(1),
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
  articleAnalysis: LlmOutputSchema.shape.articleAnalysis
});

type AnalysisInput = {
  inputType: "text" | "url";
  inputValue: string;
  onEvent?: (message: string, progress: number) => void;
};

export function clampConfidence(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clampRange(range: z.infer<typeof ConfidenceRangeSchema>) {
  const min = clampConfidence(range.min);
  const max = clampConfidence(range.max);
  return { min: Math.min(min, max), max: Math.max(min, max) };
}

type QualitySummary = {
  totalClaims: number;
  factualClaims: number;
  opinionClaims: number;
  predictionClaims: number;
  ambiguousClaims: number;
  scenariosTotal: number;
  evidenceTotal: number;
  unknownEvidence: number;
  sourceCount: number;
  averageConfidence: number;
};

function buildQualitySummary(result: z.infer<typeof ResultSchema>, sources: SourceBundle): QualitySummary {
  const totalClaims = result.claims.length;
  let factualClaims = 0;
  let opinionClaims = 0;
  let predictionClaims = 0;
  let ambiguousClaims = 0;
  let scenariosTotal = 0;
  let evidenceTotal = 0;
  let unknownEvidence = 0;
  let confidenceSum = 0;

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
        if (evidence.source.type === "unknown") unknownEvidence += 1;
      }
    }
  }

  const averageConfidence = scenariosTotal ? confidenceSum / scenariosTotal : 0;

  return {
    totalClaims,
    factualClaims,
    opinionClaims,
    predictionClaims,
    ambiguousClaims,
    scenariosTotal,
    evidenceTotal,
    unknownEvidence,
    sourceCount: sources.sources.length,
    averageConfidence
  };
}

function getModel(providerOverride?: string) {
  const provider = (providerOverride ?? process.env.LLM_PROVIDER ?? "openai").toLowerCase();
  if (provider === "anthropic" || provider === "claude") {
    return { provider: "anthropic", modelName: "claude-opus-4-5-20251101", model: anthropic("claude-opus-4-5-20251101") };
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

export async function runFactHarborAnalysis(input: AnalysisInput) {
  const onEvent = input.onEvent ?? (() => {});
  await onEvent("Loading input", 10);

  let text = input.inputValue;
  const reportStyle = (process.env.FH_REPORT_STYLE ?? "structured").toLowerCase();
  const allowModelKnowledge = (process.env.FH_ALLOW_MODEL_KNOWLEDGE ?? "false").toLowerCase() === "true";

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

  const system = [
    "You are FactHarbor POC1.",
    "Task: analyze the input text according to the FactHarbor model.",
    "Return structured JSON only matching the given schema.",
    "Grounding rules (balanced): use the input as primary evidence; cautious inference is allowed only in rationale and must be labeled 'inference:'.",
    "Do not invent citations or sources. If the input does not support a point, mark it as unknown/unclear.",
    "Evidence items must quote a short excerpt from the input or sources in source.ref; do not paraphrase in source.ref.",
    "If the only support is the claim statement itself, quote that exact text as evidence in source.ref.",
    "If no excerpt exists, use source.type=unknown and ref=null with an 'insufficient evidence in input' summary.",
    "Classify each claim as factual/opinion/prediction/ambiguous.",
    "Assign a risk tier per claim: A (high risk: legal, medical, elections), B (contested policy or complex topics), C (low risk).",
    "Include an article-level analysis of whether the overall conclusion follows from the claims.",
    "Always provide confidenceRange and uncertaintyFactors for verdicts and the article analysis.",
    "When source.ref is unknown, use null."
  ].join("\n");

  const prompt = [
    "INPUT TEXT:",
    text,
    "",
    "Instructions:",
    "- Identify notable claims in the text.",
    "- For each claim, propose 1-2 scenarios that are tightly anchored to the claim (avoid generic, boilerplate scenarios).",
    "- For each scenario, list evidence and counter-evidence based on the input.",
    "- Evidence summary can paraphrase; source.ref must be a direct excerpt from the input or a provided source.",
    "- When citing a provided source, set source.type=url and include source.url and source.title when available.",
    "- If evidence is missing, include a single evidence item noting 'insufficient evidence in input' and set source.type=unknown/ref=null.",
    "- If you add inference, do it only in the rationale and prefix with 'inference:'.",
    "- Provide a verdict per scenario: supported/refuted/unclear/mixed/misleading with confidence, confidenceRange, uncertaintyFactors, and rationale.",
    "- Provide an articleAnalysis section: mainArgument, overallVerdict, confidence, confidenceRange, uncertaintyFactors, riskTier, reasoning, differsFromClaims, fallacies.",
  ].join("\n");

  const sourceBundleText = sources.sources.length
    ? [
        "SOURCE BUNDLE:",
        ...sources.sources.map((s) =>
          [
            `- id: ${s.id}`,
            `  url: ${s.url}`,
            `  title: ${s.title ?? ""}`,
            `  sourceType: ${s.sourceType ?? ""}`,
            `  trackRecordScore: ${s.trackRecordScore ?? ""}`,
            `  excerpt: ${s.excerpt}`
          ].join("\n")
        )
      ].join("\n")
    : "SOURCE BUNDLE: (none)";

  const candidates = getProviderFallbacks();
  let selectedProvider = "";
  let selectedModel = "";
  let out: Awaited<ReturnType<typeof generateText>> | null = null;

  for (const candidate of candidates) {
    const { provider, modelName, model } = getModel(candidate);
    try {
      out = await generateText({
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: [prompt, "", sourceBundleText].join("\n") }
        ],
        temperature: 0.2,
        output: Output.object({ schema: LlmOutputSchema })
      });
      selectedProvider = provider;
      selectedModel = modelName;
      break;
    } catch (err) {
      await onEvent(`LLM provider failed: ${provider}`, 45);
      const lastError = err instanceof Error ? err.message : String(err);
      if (!process.env.FH_LLM_FALLBACKS && candidate === candidates[candidates.length - 1]) {
        throw new Error(`All LLM providers failed. Last error: ${lastError}`);
      }
    }
  }

  if (!out) {
    throw new Error("All LLM providers failed.");
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
  } satisfies z.infer<typeof ResultSchema>;

  const qualitySummary = buildQualitySummary(result, sources);

  const reportMarkdown =
    reportStyle === "rich"
      ? await renderReportWithLlm({
          model: getModel(selectedProvider).model,
          inputType: input.inputType,
          inputText: text,
          result,
          allowModelKnowledge,
          qualitySummary
        })
      : renderReport(result);

  // What the .NET API stores
  return {
    resultJson: result,
    reportMarkdown
  };
}

function renderReport(result: z.infer<typeof ResultSchema>): string {
  const lines: string[] = [];
  lines.push(`# FactHarbor POC1 Analysis`);
  lines.push(``);
  lines.push(`Generated (UTC): **${result.meta.generatedUtc}**`);
  lines.push(`Provider: **${result.meta.llmProvider}**`);
  lines.push(`Input type: **${result.meta.inputType}**`);
  lines.push(``);
  lines.push(
    `**Overall verdict:** ${result.articleAnalysis.overallVerdict} (confidence ${result.articleAnalysis.confidence}, range ${result.articleAnalysis.confidenceRange.min}-${result.articleAnalysis.confidenceRange.max})`
  );
  lines.push(``);
  lines.push(result.articleAnalysis.reasoning);
  if (result.articleAnalysis.uncertaintyFactors.length) {
    lines.push(``);
    lines.push(`**Uncertainty factors:** ${result.articleAnalysis.uncertaintyFactors.join("; ")}`);
  }
  lines.push(``);
  for (const c of result.claims) {
    lines.push(`## Claim: ${c.text}`);
    lines.push(`Type: **${c.claimType}** | Risk tier: **${c.riskTier}**`);
    lines.push(``);
    for (const s of c.scenarios) {
      lines.push(`### Scenario: ${s.title}`);
      lines.push(s.description);
      lines.push(``);
      if (s.evidence.length) {
        lines.push(`**Evidence & Counter-evidence**`);
        lines.push(``);
        for (const e of s.evidence) {
          lines.push(`- **${e.kind.replace("_", " ")}**: ${e.summary}`);
        }
        lines.push(``);
      }
      lines.push(
        `**Verdict:** ${s.verdict.verdict} (confidence ${s.verdict.confidence}, range ${s.verdict.confidenceRange.min}-${s.verdict.confidenceRange.max})`
      );
      if (s.verdict.uncertaintyFactors.length) {
        lines.push(``);
        lines.push(`**Uncertainty factors:** ${s.verdict.uncertaintyFactors.join("; ")}`);
      }
      lines.push(``);
      lines.push(s.verdict.rationale);
      lines.push(``);
    }
  }
  return lines.join("\n");
}

async function renderReportWithLlm(opts: {
  model: ReturnType<typeof getModel>["model"];
  inputType: AnalysisInput["inputType"];
  inputText: string;
  result: z.infer<typeof ResultSchema>;
  allowModelKnowledge: boolean;
  qualitySummary: QualitySummary;
}): Promise<string> {
  const system = [
    "You are a report writer for FactHarbor.",
    "Use the provided analysis JSON as the primary source of truth.",
    "Do not invent citations or named sources.",
    "If you need to add context beyond the input, label it as 'model knowledge' explicitly.",
    "Keep the report structured, scannable, and grounded in the analysis JSON."
  ].join("\n");

  const prompt = [
    "Generate a markdown report with these sections:",
    "1) Title + short context line",
    "2) Executive Summary (3-6 bullets)",
    "3) Analysis Overview (counts + quality summary)",
    "4) Article-level Verdict (overall verdict + reasoning)",
    "5) Claims and Scenarios (verdicts + confidence range + risk tier + uncertainty factors)",
    "6) Evidence Summary (supporting vs counter, unknown evidence count)",
    "7) Limitations & Open Questions",
    "8) Analysis ID (simple, stable format)",
    "",
    `Allow model knowledge: ${opts.allowModelKnowledge ? "yes" : "no"}`,
    `Input type: ${opts.inputType}`,
    `Input text (for quoting only):`,
    opts.inputText,
    "",
    "Quality summary (computed):",
    JSON.stringify(opts.qualitySummary, null, 2),
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
