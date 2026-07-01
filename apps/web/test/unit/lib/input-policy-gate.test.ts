import { describe, expect, it } from "vitest";
import { normalizePolicyGateResponse } from "@/lib/input-policy-gate";

describe("normalizePolicyGateResponse", () => {
  it("preserves structurally valid snake_case reason codes", () => {
    expect(normalizePolicyGateResponse({
      decision: "reject",
      reasonCode: "custom_policy_reason",
      messageKey: "policy_violation",
      confidence: 0.8,
    })).toEqual({
      decision: "reject",
      reasonCode: "custom_policy_reason",
      messageKey: "policy_violation",
      confidence: 0.8,
    });
  });

  it("keeps message keys inside the UI-safe enum", () => {
    expect(normalizePolicyGateResponse({
      decision: "reject",
      reasonCode: "prompt_injection",
      messageKey: "internal_prompt_detail",
      confidence: 0.7,
    })).toMatchObject({
      decision: "reject",
      reasonCode: "prompt_injection",
      messageKey: "policy_violation",
    });
  });

  it("fails open on invalid decisions and malformed reason codes", () => {
    expect(normalizePolicyGateResponse({
      decision: "block",
      reasonCode: "not valid",
      messageKey: "policy_violation",
      confidence: 2,
    })).toEqual({
      decision: "allow",
      reasonCode: "unknown",
      messageKey: "legitimate_claim",
      confidence: 1,
    });
  });

  it("defaults missing confidence without returning unknown message keys", () => {
    expect(normalizePolicyGateResponse({
      decision: "review",
      reasonCode: "ambiguous_submission",
      messageKey: "unexpected",
    })).toEqual({
      decision: "review",
      reasonCode: "ambiguous_submission",
      messageKey: "legitimate_claim",
      confidence: 0.5,
    });
  });
});
