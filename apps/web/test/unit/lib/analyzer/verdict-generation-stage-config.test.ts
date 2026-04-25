import { describe, expect, it } from "vitest";
import { buildVerdictStageConfig } from "@/lib/analyzer/verdict-generation-stage";

describe("buildVerdictStageConfig deterministic mode", () => {
  it("disables stochastic self-consistency and uses minimum challenger sampling", () => {
    const result = buildVerdictStageConfig({
      deterministic: true,
      selfConsistencyMode: "full",
      selfConsistencyTemperature: 0.4,
      challengerTemperature: 0.3,
    } as any, {} as any);

    expect(result.selfConsistencyMode).toBe("disabled");
    expect(result.selfConsistencyTemperature).toBe(0.1);
    expect(result.challengerTemperature).toBe(0.1);
  });

  it("preserves configured stochastic controls when deterministic mode is off", () => {
    const result = buildVerdictStageConfig({
      deterministic: false,
      selfConsistencyMode: "full",
      selfConsistencyTemperature: 0.25,
      challengerTemperature: 0.45,
    } as any, {} as any);

    expect(result.selfConsistencyMode).toBe("full");
    expect(result.selfConsistencyTemperature).toBe(0.25);
    expect(result.challengerTemperature).toBe(0.45);
  });
});
