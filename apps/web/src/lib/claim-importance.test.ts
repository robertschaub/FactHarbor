import { describe, expect, it } from "vitest";

import { normalizeSubClaimImportance } from "./claim-importance";

describe("normalizeSubClaimImportance", () => {
  it("forces non-core roles to centrality=low, isCentral=false, and caps harmPotential", () => {
    const c = normalizeSubClaimImportance({
      text: "An internal document exists.",
      claimRole: "source",
      harmPotential: "high",
      centrality: "high",
      isCentral: true,
    });

    expect(c.centrality).toBe("low");
    expect(c.isCentral).toBe(false);
    expect(c.harmPotential).toBe("medium");
  });

  it("derives isCentral only when both harmPotential and centrality are high (core claims)", () => {
    const c = normalizeSubClaimImportance({
      text: "X is true.",
      claimRole: "core",
      harmPotential: "high",
      centrality: "high",
      isCentral: false,
    });

    expect(c.isCentral).toBe(true);
  });

  it("demotes meta-method validity claims to centrality=low", () => {
    const c = normalizeSubClaimImportance({
      text: "The methodology used is scientifically valid and accurate.",
      claimRole: "core",
      harmPotential: "high",
      centrality: "high",
      isCentral: true,
    });

    expect(c.centrality).toBe("low");
    expect(c.isCentral).toBe(false);
  });
});

