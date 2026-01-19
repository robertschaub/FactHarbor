import { describe, it, expect } from "vitest";
import { groupFactsByMethodology } from "./methodologyGrouping";

const makeFact = (id: string, methodology?: string) => ({
  id,
  evidenceScope: methodology ? { methodology } : undefined,
});

describe("groupFactsByMethodology", () => {
  it("returns null when fewer than 3 methodologies", () => {
    const facts = [
      makeFact("F1", "WTW"),
      makeFact("F2", "WTW"),
      makeFact("F3", "LCA"),
    ];
    expect(groupFactsByMethodology(facts)).toBeNull();
  });

  it("groups facts when 3+ methodologies exist", () => {
    const facts = [
      makeFact("F1", "WTW"),
      makeFact("F2", "WTW"),
      makeFact("F3", "TTW"),
      makeFact("F4", "LCA"),
    ];
    const groups = groupFactsByMethodology(facts);
    expect(groups).not.toBeNull();
    expect(groups!.length).toBe(3);
  });

  it("places facts without methodology into General group", () => {
    const facts = [
      makeFact("F1", "WTW"),
      makeFact("F2", "TTW"),
      makeFact("F3", "LCA"),
      makeFact("F4"),
    ];
    const groups = groupFactsByMethodology(facts);
    expect(groups).not.toBeNull();
    const hasGeneral = groups!.some((g) => g.label === "General");
    expect(hasGeneral).toBe(true);
  });
});
