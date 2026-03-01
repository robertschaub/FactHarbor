/**
 * Input Policy Gate
 *
 * Lightweight LLM-powered gate that classifies incoming submissions as
 * allow / reject / review before they reach the analysis pipeline.
 *
 * Architecture:
 *  - Structural validation is the responsibility of AnalyzeController.cs (C# API)
 *  - This gate handles semantic policy enforcement (multilingual, no keyword lists)
 *  - Prompt is UCM-managed (apps/web/prompts/input-policy-gate.prompt.md)
 *  - Model: Anthropic Haiku (lightweight classification task)
 *  - Fallback: fail-open (allow) on gate errors to avoid blocking legitimate requests
 *
 * Privacy contract:
 *  - Logs decision metadata (decision, reasonCode, inputType) only
 *  - Does NOT log raw input text for rejected submissions
 */

import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { loadPromptConfig } from "@/lib/config-loader";
import { ANTHROPIC_MODELS } from "@/lib/analyzer/model-tiering";

const GATE_PROMPT_PROFILE = "input-policy-gate";

export type PolicyDecision = "allow" | "reject" | "review";

export interface PolicyGateResult {
  decision: PolicyDecision;
  reasonCode: string;
  messageKey: string;
  confidence: number;
  /** Set when the gate failed and fell back to allow (fail-open). */
  error?: string;
}

const VALID_REASON_CODES = new Set([
  "legitimate_claim",
  "prompt_injection",
  "no_factual_content",
  "jailbreak_attempt",
  "harmful_content",
  "spam_seo",
  "personal_data_extraction",
]);

const VALID_MESSAGE_KEYS = new Set([
  "legitimate_claim",
  "invalid_input",
  "policy_violation",
  "gate_unavailable",
]);

/**
 * Evaluate an input submission against the content policy.
 *
 * Returns the gate decision. On any LLM or config error, falls back to
 * "allow" (fail-open) and sets result.error with the failure reason so
 * callers can log it without exposing internals to the user.
 *
 * @param inputValue - The raw input text or URL submitted by the user
 * @param inputType  - Whether the input is "text" (a claim/question) or "url"
 */
export async function evaluateInputPolicy(
  inputValue: string,
  inputType: "text" | "url",
): Promise<PolicyGateResult> {
  try {
    const config = await loadPromptConfig(GATE_PROMPT_PROFILE);
    if (!config) {
      console.warn("[InputGate] Prompt config not found — failing open");
      return {
        decision: "allow",
        reasonCode: "gate_unavailable",
        messageKey: "gate_unavailable",
        confidence: 0,
        error: "Prompt config not found",
      };
    }

    // Substitute UCM-managed prompt variables
    const prompt = config.content
      .replace(/\$\{INPUT_TEXT\}/g, "<provided in separate user_input message>")
      .replace(/\$\{INPUT_TYPE\}/g, inputType);

    const result = await generateText({
      model: anthropic(ANTHROPIC_MODELS.budget.modelId),
      messages: [
        { role: "system", content: prompt },
        {
          role: "user",
          content: `<user_input input_type="${inputType}">\n${inputValue}\n</user_input>`,
        },
      ],
      maxOutputTokens: 200,
    });

    const text = result.text.trim();

    // Parse structured JSON response
    let parsed: { decision: string; reasonCode: string; messageKey: string; confidence: number };
    try {
      const cleaned = text
        .replace(/^```json\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.warn("[InputGate] Failed to parse gate response — failing open");
      return {
        decision: "allow",
        reasonCode: "parse_failure",
        messageKey: "gate_unavailable",
        confidence: 0,
        error: "Could not parse gate response",
      };
    }

    // Validate decision value — fall back to allow if unexpected
    const validDecisions: PolicyDecision[] = ["allow", "reject", "review"];
    const decision: PolicyDecision = validDecisions.includes(parsed.decision as PolicyDecision)
      ? (parsed.decision as PolicyDecision)
      : "allow";

    // Log metadata only — not the raw input text
    console.log(
      `[InputGate] decision=${decision} reasonCode=${parsed.reasonCode} inputType=${inputType} confidence=${parsed.confidence}`,
    );

    const reasonCode = VALID_REASON_CODES.has(parsed.reasonCode)
      ? parsed.reasonCode
      : "unknown";

    const messageKey = VALID_MESSAGE_KEYS.has(parsed.messageKey)
      ? parsed.messageKey
      : "unknown";

    const confidenceRaw = typeof parsed.confidence === "number" ? parsed.confidence : 0.5;
    const confidence = Math.max(0, Math.min(1, confidenceRaw));

    return {
      decision,
      reasonCode,
      messageKey,
      confidence,
    };
  } catch (err: any) {
    console.error("[InputGate] Gate error — failing open:", err?.message);
    return {
      decision: "allow",
      reasonCode: "gate_error",
      messageKey: "gate_unavailable",
      confidence: 0,
      error: err?.message || "Unknown gate error",
    };
  }
}
