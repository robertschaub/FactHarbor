import { describe, expect, it } from "vitest";

import { EvidenceDeduplicator } from "@/lib/analyzer/evidence-deduplication";
import {
  classifyStructuralSourceFamily,
  normalizeUrlForEvidence,
} from "@/lib/analyzer/url-normalization";

describe("evidence URL normalization", () => {
  it("removes tracking params and fragments while preserving non-tracking query params", () => {
    expect(
      normalizeUrlForEvidence("https://www.Example.com/path/?utm_source=x&ref=y&foo=Bar#section"),
    ).toBe("https://example.com/path?foo=bar");
  });

  it("removes trailing slashes except for the bare origin path", () => {
    expect(normalizeUrlForEvidence("https://example.com/report/")).toBe("https://example.com/report");
    expect(normalizeUrlForEvidence("https://example.com/")).toBe("https://example.com/");
  });

  it("keeps EvidenceDeduplicator aligned with the shared normalizer", () => {
    const deduplicator = new EvidenceDeduplicator();
    const input = "https://www.Example.com/path/?utm_campaign=a&source=b&id=ABC#details";

    expect(deduplicator.normalizeUrl(input)).toBe(normalizeUrlForEvidence(input));
  });

  it("classifies source family from structural MIME or URL extension data", () => {
    expect(classifyStructuralSourceFamily({ url: "https://example.com/file.pdf" })).toBe("document");
    expect(classifyStructuralSourceFamily({ contentType: "text/csv; charset=utf-8" })).toBe("data");
    expect(classifyStructuralSourceFamily({ category: "text/html" })).toBe("html");
    expect(classifyStructuralSourceFamily({ url: "https://example.com/source" })).toBe("unknown");
  });
});
