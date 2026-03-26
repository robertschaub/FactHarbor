import { describe, it, expect } from "vitest";
import {
  extractDomain,
  computeBatchDelays,
} from "@/lib/analyzer/research-acquisition-stage";

describe("research-acquisition-stage", () => {
  describe("extractDomain", () => {
    it("should extract hostname from a standard URL", () => {
      expect(extractDomain("https://www.example.com/page")).toBe("www.example.com");
    });

    it("should normalize to lowercase", () => {
      expect(extractDomain("https://WWW.EXAMPLE.COM/Page")).toBe("www.example.com");
    });

    it("should handle URLs with ports", () => {
      expect(extractDomain("https://example.com:8080/path")).toBe("example.com");
    });

    it("should return lowercased input for invalid URLs", () => {
      expect(extractDomain("not-a-url")).toBe("not-a-url");
    });
  });

  describe("computeBatchDelays", () => {
    it("should return zero delays for all-different domains", () => {
      const urls = [
        "https://a.com/1",
        "https://b.com/2",
        "https://c.com/3",
      ];
      expect(computeBatchDelays(urls, 500)).toEqual([0, 0, 0]);
    });

    it("should stagger same-domain requests", () => {
      const urls = [
        "https://example.com/page1",
        "https://example.com/page2",
        "https://example.com/page3",
      ];
      expect(computeBatchDelays(urls, 500)).toEqual([0, 500, 1000]);
    });

    it("should stagger only same-domain, not cross-domain", () => {
      const urls = [
        "https://a.com/1",
        "https://b.com/2",
        "https://a.com/3",
      ];
      expect(computeBatchDelays(urls, 300)).toEqual([0, 0, 300]);
    });

    it("should return all zeros when delay is 0 (disabled)", () => {
      const urls = [
        "https://a.com/1",
        "https://a.com/2",
        "https://a.com/3",
      ];
      expect(computeBatchDelays(urls, 0)).toEqual([0, 0, 0]);
    });

    it("should handle empty batch", () => {
      expect(computeBatchDelays([], 500)).toEqual([]);
    });

    it("should handle single-URL batch", () => {
      expect(computeBatchDelays(["https://a.com/1"], 500)).toEqual([0]);
    });

    it("should handle mixed domains with multiple same-domain groups", () => {
      const urls = [
        "https://a.com/1",
        "https://b.com/1",
        "https://a.com/2",
        "https://b.com/2",
        "https://c.com/1",
      ];
      expect(computeBatchDelays(urls, 200)).toEqual([0, 0, 200, 200, 0]);
    });
  });
});
