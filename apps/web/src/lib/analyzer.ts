import { z } from "zod";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { generateObject } from "ai";
import { extractTextFromUrl } from "@/lib/retrieval";

const VerdictSchema = z.object({
  scenarioId: z.string(),
  verdict: z.enum(["supported", "refuted", "unclear", "mixed"]),
  confidence: z.number().min(0).max(1),
  rationale: z.string()
});

const EvidenceSchema = z.object({
  kind: z.enum(["evidence", "counter_evidence"]),
  summary: z.string(),
  source: z.object({
    type: z.enum(["url", "text", "unknown"]),
    ref: z.string().optional()
  }).optional()
});

const ScenarioSchema = z.object({
  scenarioId: z.string(),
  title: z.string(),
  description: z.string(),
  evidence: z.array(EvidenceSchema),
  verdict: VerdictSchema
});

const ClaimSchema = z.object({
  claimId: z.string(),
  text: z.string(),
  scenarios: z.array(ScenarioSchema)
});

const ResultSchema = z.object({
  meta: z.object({
    generatedUtc: z.string(),
    llmProvider: z.string(),
    llmModel: z.string().optional(),
    inputType: z.enum(["text", "url"]),
    inputLength: z.number()
  }),
  claims: z.array(ClaimSchema)
});

type AnalysisInput = {
  inputType: "text" | "url";
  inputValue: string;
  onEvent?: (message: string, progress: number) => Promise<void> | void;
};

function getModel() {
  const provider = (process.env.LLM_PROVIDER ?? "openai").toLowerCase();
  if (provider === "anthropic") return { provider: "anthropic", model: anthropic("claude-3-5-sonnet-20240620") };
  return { provider: "openai", model: openai("gpt-4o-mini") };
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

  const { provider, model } = getModel();

  const system = [
    "You are FactHarbor POC1.",
    "Task: analyze the input text according to the FactHarbor model.",
    "Return structured JSON only matching the given schema.",
    "Be conservative: do not invent citations or sources; if unknown, mark as unknown."
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
    system,
    prompt,
    schema: ResultSchema
  });

  await onEvent("Generating markdown report", 85);

  const reportMarkdown = renderReport(out.object);

  // What the .NET API stores
  return {
    resultJson: out.object,
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
