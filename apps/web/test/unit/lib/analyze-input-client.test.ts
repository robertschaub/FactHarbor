import { describe, expect, it } from "vitest";

import {
  getAnalyzeInputType,
  isLikelyUrl,
  normalizeAnalyzeInputValue,
  normalizeAnalyzeUrl,
} from "@/lib/analyze-input-client";

describe("analyze-input-client", () => {
  it("detects protocol-prefixed URLs", () => {
    expect(isLikelyUrl("https://example.org/report")).toBe(true);
    expect(getAnalyzeInputType("http://example.org")).toBe("url");
  });

  it("detects bare-host URLs and normalizes them to https", () => {
    expect(isLikelyUrl("www.example.org/report")).toBe(true);
    expect(normalizeAnalyzeUrl("example.org/report")).toBe("https://example.org/report");
  });

  it("treats ordinary claims as text and trims them", () => {
    expect(isLikelyUrl("Plastic recycling is pointless")).toBe(false);
    expect(normalizeAnalyzeInputValue("  Plastic recycling is pointless  ")).toEqual({
      inputType: "text",
      inputValue: "Plastic recycling is pointless",
    });
  });
});
