import { describe, it, expect } from "vitest";
import { groupEvidenceByMethodology } from "@/app/jobs/[id]/utils/methodologyGrouping";

const makeEvidenceItem = (id: string, methodology?: string) => ({
  id,
  evidenceScope: methodology ? { methodology } : undefined,
});

describe("groupEvidenceByMethodology", () => {
  it("returns null when fewer than 3 methodologies", () => {
    const evidenceItems = [
      makeEvidenceItem("E1", "WTW"),
      makeEvidenceItem("E2", "WTW"),
      makeEvidenceItem("E3", "LCA"),
    ];
    expect(groupEvidenceByMethodology(evidenceItems)).toBeNull();
  });

  it("groups evidence items when 3+ methodologies exist", () => {
    const evidenceItems = [
      makeEvidenceItem("E1", "WTW"),
      makeEvidenceItem("E2", "WTW"),
      makeEvidenceItem("E3", "TTW"),
      makeEvidenceItem("E4", "LCA"),
    ];
    const groups = groupEvidenceByMethodology(evidenceItems);
    expect(groups).not.toBeNull();
    expect(groups!.length).toBe(3);
  });

  it("places evidence items without methodology into General group", () => {
    const evidenceItems = [
      makeEvidenceItem("E1", "WTW"),
      makeEvidenceItem("E2", "TTW"),
      makeEvidenceItem("E3", "LCA"),
      makeEvidenceItem("E4"),
    ];
    const groups = groupEvidenceByMethodology(evidenceItems);
    expect(groups).not.toBeNull();
    const hasGeneral = groups!.some((g) => g.label === "General");
    expect(hasGeneral).toBe(true);
  });
});
