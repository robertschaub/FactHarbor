import React from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import FallbackReport from "@/components/FallbackReport";
import type { AnalysisWarning } from "@/lib/analyzer/types";

function warning(overrides: Partial<AnalysisWarning>): AnalysisWarning {
  return {
    type: "confidence_calibration",
    severity: "info",
    message: "test",
    ...overrides,
  };
}

describe("FallbackReport warning rendering", () => {
  it("renders provider-degrading warnings for regular users", () => {
    const html = renderToStaticMarkup(
      <FallbackReport
        summary={undefined}
        analysisWarnings={[
          warning({
            type: "llm_provider_error",
            severity: "error",
            message: "Provider outage",
          }),
        ]}
        isAdmin={false}
      />,
    );

    expect(html).toContain("LLM Provider Error");
    expect(html).toContain("Provider outage");
  });

  it("hides provider informational warnings for regular users", () => {
    const html = renderToStaticMarkup(
      <FallbackReport
        summary={undefined}
        analysisWarnings={[
          warning({
            type: "debate_provider_fallback",
            severity: "warning",
            message: "Fell back to global provider",
          }),
        ]}
        isAdmin={false}
      />,
    );

    expect(html).toBe("");
  });

  it("shows provider informational warnings for admins", () => {
    const html = renderToStaticMarkup(
      <FallbackReport
        summary={undefined}
        analysisWarnings={[
          warning({
            type: "debate_provider_fallback",
            severity: "warning",
            message: "Fell back to global provider",
          }),
        ]}
        isAdmin
      />,
    );

    expect(html).toContain("operational note");
    expect(html).toContain("Fell back to global provider");
  });
});
