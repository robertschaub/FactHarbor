import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { extractTextFromUrl } from "@/lib/retrieval";

const LlmVerdictSchema = z.object({
  scenarioId: z.string(),
  verdict: z.enum(["supported", "refuted", "unclear", "mixed"]),
  // OpenAI json_schema output_format does not support minimum/maximum on numbers.
  confidence: z.number(),
  rationale: z.string()
});

const EvidenceSchema = z.object({
  kind: z.enum(["evidence", "counter_evidence"]),
  summary: z.string(),
  source: z.object({
    type: z.enum(["url", "text", "unknown"]),
    // OpenAI json_schema response_format is strict about required keys;
    // represent "optional" fields as nullable instead.
    ref: z.string().nullable()
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
  scenarios: z.array(ScenarioSchema)
});

// The LLM only produces the "claims" structure.
// We add meta server-side to avoid strict JSON Schema constraints on optional keys.
const LlmOutputSchema = z.object({
  claims: z.array(ClaimSchema)
});

const ResultVerdictSchema = z.object({
  scenarioId: z.string(),
  verdict: z.enum(["supported", "refuted", "unclear", "mixed"]),
  confidence: z.number().min(0).max(1),
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
  )
});

type AnalysisInput = {
  inputType: "text" | "url";
  inputValue: string;
  onEvent?: (message: string, progress: number) => void;
};

function getModel() {
  const provider = (process.env.LLM_PROVIDER ?? "openai").toLowerCase();
  if (provider === "anthropic" || provider === "claude") {
    return { provider: "anthropic", modelName: "claude-opus-4-5-20251101", model: anthropic("claude-opus-4-5-20251101") };
  }
  return { provider: "openai", modelName: "gpt-4o-mini", model: openai("gpt-4o-mini") };
}

export async function runFactHarborAnalysis(input: AnalysisInput) {
  const onEvent = input.onEvent ?? (() => {});
  await onEvent("Loading input", 10);

  let text = input.inputValue;

  if (input.inputType === "url") {
    await onEvent("Fetching URL", 20);
    text = await extractTextFromUrl(input.inputValue);
  }

  if (text.length > 200_000) {
    text = text.slice(0, 200_000);
  }

  await onEvent("Calling LLM (structured extraction)", 40);

  const { provider, modelName, model } = getModel();

  const system = [
    "You are FactHarbor POC1.",
    "Task: analyze the input text according to the FactHarbor model.",
    "Return structured JSON only matching the given schema.",
    "Be conservative: do not invent citations or sources; if unknown, mark as unknown.",
    "When source.ref is unknown, use null."
  ].join("\n");

  const prompt = [
    "INPUT TEXT:",
    text,
    "",
    "Instructions:",
    "- Identify notable claims in the text.",
    "- For each claim, propose 2-5 relevant scenarios (interpretations/contexts).",
    "- For each scenario, list evidence and counter-evidence (based on the input; if insufficient, say so).",
    "- Provide a verdict per scenario: supported/refuted/unclear/mixed with confidence and rationale.",
  ].join("\n");

  const out = await generateObject({
    model,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: prompt }
    ],
    schema: LlmOutputSchema
  });

  await onEvent("Generating markdown report", 85);

  const result = {
    meta: {
      generatedUtc: new Date().toISOString(),
      llmProvider: provider,
      llmModel: modelName,
      inputType: input.inputType,
      inputLength: text.length
    },
    claims: out.object.claims.map((claim) => ({
      ...claim,
      scenarios: claim.scenarios.map((scenario) => ({
        ...scenario,
        verdict: {
          ...scenario.verdict,
          confidence: Math.max(0, Math.min(1, scenario.verdict.confidence))
        }
      }))
    }))
  } satisfies z.infer<typeof ResultSchema>;

  const reportMarkdown = renderReport(result);

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
  for (const c of result.claims) {
    lines.push(`## Claim: ${c.text}`);
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
      lines.push(`**Verdict:** ${s.verdict.verdict} (confidence ${s.verdict.confidence})`);
      lines.push(``);
      lines.push(s.verdict.rationale);
      lines.push(``);
    }
  }
  return lines.join("\n");
}
