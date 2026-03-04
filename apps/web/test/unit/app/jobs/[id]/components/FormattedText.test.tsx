import React from "react";
import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ExpandableText } from "@/app/jobs/[id]/components/ExpandableText";

describe("ExpandableText / FormattedText Heuristics", () => {
  it("renders short text without paragraphs", () => {
    const html = renderToStaticMarkup(<ExpandableText text="Hello world" threshold={100} />);
    expect(html).toContain("Hello world");
    expect(html).not.toContain("<p");
  });

  it("splits by double newlines by default", () => {
    const text = "Para 1\n\nPara 2";
    const html = renderToStaticMarkup(<ExpandableText text={text} threshold={1000} />);
    expect(html).toContain("<p");
    expect(html).toContain("Para 1");
    expect(html).toContain("Para 2");
  });

  it("identifies lists with single newlines", () => {
    // 2-line list should now be identified
    const text = "- Item 1\n- Item 2";
    // threshold must be small enough for FormattedText to check heuristics if long,
    // but here we check the line count logic.
    // Actually, FormattedText triggers single-newline heuristic ONLY if length >= 400 or no double newlines.
    // Wait, let's check the code:
    // if (hasDoubleNewlines || normalized.length < 400) { paragraphs = normalized.split(/\n{2,}/); }
    // else if (hasSingleNewlines) { ... }
    
    // To trigger the single-newline heuristic, we need no double newlines and length >= 400
    const longList = Array(10).fill("- This is a list item that is quite long to reach 400 chars.").join("\n");
    const html = renderToStaticMarkup(<ExpandableText text={longList} threshold={2000} />);
    expect(html).toContain("<p");
    expect(html).toContain("This is a list item");
  });

  it("handles 2-line lists specifically (bug fix check)", () => {
    const text = "- Item 1\n- Item 2" + " ".repeat(400); // ensure length > 400
    const html = renderToStaticMarkup(<ExpandableText text={text} threshold={1000} />);
    expect(html).toContain("<p");
  });

  it("splits wall-of-text into 3-sentence paragraphs (v2.6.41)", () => {
    const sentences = [
      "This is sentence one.",
      "This is sentence two.",
      "This is sentence three.",
      "This is sentence four.",
      "This is sentence five.",
      "This is sentence six.",
      "This is sentence seven."
    ];
    const wallOfText = sentences.join(" ") + " ".repeat(500); // ensure length > 500 and no newlines
    const html = renderToStaticMarkup(<ExpandableText text={wallOfText} threshold={2000} />);
    
    // Should have 3 paragraphs (3 sentences + 3 sentences + 1 sentence)
    const pMatches = html.match(/<p/g);
    expect(pMatches?.length).toBe(3);
    expect(html).toContain("sentence seven");
  });

  it("does NOT lose data on decimals or abbreviations (regex bug fix)", () => {
    const text = "The value is 3.14. It is approximately pi. That is all." + " ".repeat(500);
    const html = renderToStaticMarkup(<ExpandableText text={text} threshold={1000} />);
    expect(html).toContain("3.14");
    expect(html).toContain("pi");
  });

  it("handles CJK punctuation in wall-of-text", () => {
    const text = "这是第一句。这是第二句。这是第三句。这是第四句。" + " ".repeat(500);
    const html = renderToStaticMarkup(<ExpandableText text={text} threshold={1000} />);
    const pMatches = html.match(/<p/g);
    expect(pMatches?.length).toBeGreaterThanOrEqual(1);
    expect(html).toContain("这是第四句");
  });

  it("highlights Reference IDs (auto-bold feature)", () => {
    const text = "See EV_12345 and CP_AC_01_0.";
    const html = renderToStaticMarkup(<ExpandableText text={text} threshold={100} />);
    expect(html).toContain("<strong");
    expect(html).toContain("EV_12345");
    expect(html).toContain("CP_AC_01_0");
  });
});
