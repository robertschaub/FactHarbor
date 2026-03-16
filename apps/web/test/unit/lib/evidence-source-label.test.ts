import { describe, expect, it } from "vitest";

import { resolveEvidenceSourceLabel } from "@/lib/evidence-source-label";

describe("resolveEvidenceSourceLabel", () => {
  it("prefers the evidence item's explicit source title", () => {
    expect(
      resolveEvidenceSourceLabel(
        {
          sourceTitle: "Explicit Title",
          sourceUrl: "https://example.com/article",
        },
        "Matched Title",
      ),
    ).toBe("Explicit Title");
  });

  it("falls back to the matched fetched-source title when evidence title is missing", () => {
    expect(
      resolveEvidenceSourceLabel(
        {
          sourceTitle: "",
          sourceUrl: "https://example.com/article",
        },
        "Matched Title",
      ),
    ).toBe("Matched Title");
  });

  it("falls back to the normalized hostname when no title is available", () => {
    expect(
      resolveEvidenceSourceLabel({
        sourceTitle: "",
        sourceUrl: "https://www.example.com/article",
      }),
    ).toBe("example.com");
  });

  it("returns Unknown only when no title or source URL is available", () => {
    expect(
      resolveEvidenceSourceLabel({
        sourceTitle: "",
        sourceUrl: "",
      }),
    ).toBe("Unknown");
  });
});
