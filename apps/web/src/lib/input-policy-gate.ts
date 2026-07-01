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

export const POLICY_DECISIONS = ["allow", "reject", "review"] as const;
export type PolicyDecision = typeof POLICY_DECISIONS[number];

export const POLICY_MESSAGE_KEYS = [
  "legitimate_claim",
  "invalid_input",
  "policy_violation",
  // System fallback only; the LLM prompt should not emit this key.
  "gate_unavailable",
] as const;
export type PolicyMessageKey = typeof POLICY_MESSAGE_KEYS[number];

export interface PolicyGateResult {
  decision: PolicyDecision;
  reasonCode: string;
  messageKey: PolicyMessageKey;
  confidence: number;
  /** Set when the gate failed and fell back to allow (fail-open). */
  error?: string;
}

const VALID_DECISIONS = new Set<string>(POLICY_DECISIONS);
const VALID_MESSAGE_KEYS = new Set<string>(POLICY_MESSAGE_KEYS);
const REASON_CODE_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;

function escapeXmlText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function normalizeDecision(value: unknown): { decision: PolicyDecision; valid: boolean } {
  return typeof value === "string" && VALID_DECISIONS.has(value)
    ? { decision: value as PolicyDecision, valid: true }
    : { decision: "allow", valid: false };
}

function normalizeReasonCode(value: unknown): string {
  if (typeof value !== "string") return "unknown";
  const normalized = value.trim();
  return REASON_CODE_PATTERN.test(normalized) ? normalized : "unknown";
}

function fallbackMessageKey(decision: PolicyDecision): PolicyMessageKey {
  return decision === "reject" ? "policy_violation" : "legitimate_claim";
}

function normalizeMessageKey(value: unknown, decision: PolicyDecision): PolicyMessageKey {
  if (typeof value === "string" && VALID_MESSAGE_KEYS.has(value)) {
    return value as PolicyMessageKey;
  }
  return fallbackMessageKey(decision);
}

function normalizeConfidence(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : 0.5;
}

export function normalizePolicyGateResponse(parsed: unknown): PolicyGateResult {
  const record = asRecord(parsed);
  const { decision, valid: decisionValid } = normalizeDecision(record.decision);
  return {
    decision,
    reasonCode: normalizeReasonCode(record.reasonCode),
    messageKey: decisionValid
      ? normalizeMessageKey(record.messageKey, decision)
      : fallbackMessageKey(decision),
    confidence: normalizeConfidence(record.confidence),
  };
}

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
      console.warn("[InputGate] POLICY_DEGRADED: Prompt config not found — failing open");
      return {
        decision: "allow",
        reasonCode: "gate_unavailable",
        messageKey: "gate_unavailable",
        confidence: 0,
        error: "Prompt config not found",
      };
    }

    // L3: Input length cap to prevent token exhaustion and stay within Haiku efficiency limits
    const gateInput = inputValue.length > 4000 ? inputValue.slice(0, 4000) : inputValue;

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
          content: `<user_input input_type="${inputType}">\n${escapeXmlText(gateInput)}\n</user_input>`,
        },
      ],
      maxOutputTokens: 200,
    });

    const text = result.text.trim();

    // Parse structured JSON response
    let parsed: unknown;
    try {
      const cleaned = text
        .replace(/^```json\s*/i, "")
        .replace(/```\s*$/i, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.warn("[InputGate] POLICY_DEGRADED: Failed to parse gate response — failing open");
      return {
        decision: "allow",
        reasonCode: "parse_failure",
        messageKey: "gate_unavailable",
        confidence: 0,
        error: "Could not parse gate response",
      };
    }

    const normalized = normalizePolicyGateResponse(parsed);

    // L2: Log metadata only AFTER validation to ensure high signal
    console.log(
      `[InputGate] decision=${normalized.decision} reasonCode=${normalized.reasonCode} inputType=${inputType} confidence=${normalized.confidence}`,
    );

    return normalized;
  } catch (err: any) {
    console.error("[InputGate] POLICY_DEGRADED: Gate error — failing open:", err?.message);
    return {
      decision: "allow",
      reasonCode: "gate_error",
      messageKey: "gate_unavailable",
      confidence: 0,
      error: err?.message || "Unknown gate error",
    };
  }
}
