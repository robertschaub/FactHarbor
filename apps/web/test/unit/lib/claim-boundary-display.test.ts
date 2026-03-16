import { describe, expect, it } from "vitest";
import {
  getBoundaryDescriptionSegments,
  getBoundaryDisplayHeadline,
  getBoundaryDisplaySubtitle,
  getBoundaryNameSegments,
  mergeBoundaryDescriptions,
  mergeBoundaryNames,
} from "@/lib/claim-boundary-display";

describe("claim-boundary-display", () => {
  it("dedupes merged boundary names while preserving order", () => {
    expect(mergeBoundaryNames("WTW + LCA", "LCA + TTW")).toBe("WTW + LCA + TTW");
  });

  it("strips repeated Merged prefixes and dedupes description segments", () => {
    expect(
      mergeBoundaryDescriptions(
        "Merged: Merged: First note; Second note",
        "Merged: Second note; Third note",
      ),
    ).toBe("First note; Second note; Third note");
  });

  it("returns clean name and description segments for display lists", () => {
    expect(getBoundaryNameSegments("A + B + B")).toEqual(["A", "B"]);
    expect(
      getBoundaryDescriptionSegments("Merged: One note; Merged: Two note; One note"),
    ).toEqual(["One note", "Two note"]);
  });

  it("prefers shortName for the display headline and builds a subtitle from the long name", () => {
    const boundary = {
      id: "CB_03",
      shortName: "H2 production",
      name: "Hydrogen production stage efficiency analysis + Tank-to-Wheel simulation",
      description: "",
    };

    expect(getBoundaryDisplayHeadline(boundary)).toBe("H2 production");
    expect(getBoundaryDisplaySubtitle(boundary)).toBe(
      "Hydrogen production stage efficiency analysis + 1 related scope family",
    );
  });
});
