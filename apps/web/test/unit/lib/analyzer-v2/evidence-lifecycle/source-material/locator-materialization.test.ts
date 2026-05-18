import { describe, expect, it } from "vitest";
import {
  materializeSourceCandidatePageId,
  materializeSourceCandidatePageKey,
  materializeSourceCandidatePreviewText,
} from "@/lib/analyzer-v2/evidence-lifecycle/source-material/locator-materialization";

describe("Analyzer V2 W3-A locator materialization", () => {
  it("hashes bounded Wikimedia page keys without exposing raw locator text", () => {
    const result = materializeSourceCandidatePageKey("Switzerland_asylum_statistics");
    const serialized = JSON.stringify(result);

    expect(result.status).toBe("accepted_bounded");
    expect(result.pageKeyHash).toMatch(/^[a-f0-9]{64}$/);
    expect(serialized).not.toContain("Switzerland_asylum_statistics");
  });

  it("fails closed for unsafe page keys and page ids", () => {
    for (const value of [
      "",
      " padded ",
      "https://example.invalid/page",
      "../secret",
      "Page/With/Path",
      "token_value",
      "sk_test_value",
      "unknown",
    ]) {
      expect(materializeSourceCandidatePageKey(value)).toMatchObject({
        status: "rejected_structural",
        pageKeyHash: null,
      });
    }

    expect(materializeSourceCandidatePageId("12345")).toMatch(/^[a-f0-9]{64}$/);
    expect(materializeSourceCandidatePageId("https://example.invalid/123")).toBeNull();
  });

  it("strips markup, bounds preview text, hashes retained values, and rejects locator-like text", () => {
    const accepted = materializeSourceCandidatePreviewText(
      "A <span class=\"searchmatch\">bounded</span> excerpt with detail",
      { maxChars: 17, maxBytes: 80 },
    );
    const rejected = materializeSourceCandidatePreviewText(
      "see https://example.invalid?secret=sk_test",
      { maxChars: 100, maxBytes: 200 },
    );

    expect(accepted).toMatchObject({
      state: "truncated_bounded",
      value: "A bounded excerpt",
      markupStripped: true,
      truncated: true,
    });
    expect(accepted.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(rejected).toMatchObject({
      state: "rejected_structural",
      value: null,
      hash: null,
    });
    expect(JSON.stringify(accepted)).not.toContain("<span");
    expect(JSON.stringify(rejected)).not.toContain("example.invalid");
    expect(JSON.stringify(rejected)).not.toContain("sk_test");
  });
});
