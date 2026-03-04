import { describe, expect, it } from "vitest";
import { getTextParagraphs } from "@/app/jobs/[id]/utils/getTextParagraphs";

describe("getTextParagraphs", () => {
  it("splits standard text on double newlines", () => {
    const text = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.";
    expect(getTextParagraphs(text)).toEqual([
      "First paragraph.",
      "Second paragraph.",
      "Third paragraph.",
    ]);
  });

  it("splits long single-newline list text into paragraph lines", () => {
    const lines = Array.from({ length: 12 }, (_, i) =>
      `${i + 1}) This is a list entry with enough content to trigger the heuristic split.`,
    );
    const text = lines.join("\n");
    const paragraphs = getTextParagraphs(text);

    expect(text.length).toBeGreaterThan(400);
    expect(paragraphs).toEqual(lines);
  });

  it("splits an intentional two-line list when each line is long", () => {
    const lines = [
      "1) This first list entry is intentionally very long to exceed threshold and preserve newline intent in formatting output for reports.",
      "2) This second list entry is also intentionally long so a two-line list is not collapsed into a single wall of prose.",
    ];
    const text = `${lines[0]} ${"extra ".repeat(40)}\n${lines[1]} ${"extra ".repeat(40)}`;
    const paragraphs = getTextParagraphs(text);

    expect(text.length).toBeGreaterThan(400);
    expect(paragraphs).toEqual(text.split("\n"));
  });

  it("does not split long wrapped single-newline prose when newline intent is weak", () => {
    const lines = Array.from({ length: 10 }, () =>
      "this is wrapped prose without sentence punctuation and without clear list semantics",
    );
    const text = lines.join("\n");
    const paragraphs = getTextParagraphs(text);

    expect(text.length).toBeGreaterThan(400);
    expect(paragraphs).toEqual([text]);
  });

  it("chunks long wall-of-text into approximately three-sentence paragraphs", () => {
    const text = [
      "Sentence one is clear.",
      "Sentence two is also clear.",
      "Sentence three keeps the flow.",
      "Sentence four starts a new chunk.",
      "Sentence five continues the chunk.",
      "Sentence six closes it out.",
      "Sentence seven remains in a final chunk.",
    ].join(" ");
    const padded = `${text} ${text} ${text}`;
    const paragraphs = getTextParagraphs(padded);

    expect(padded.length).toBeGreaterThan(500);
    expect(paragraphs.length).toBeGreaterThan(1);
    expect(paragraphs[0]).toContain("Sentence one is clear.");
  });

  it("supports CJK punctuation in wall-of-text splitting", () => {
    const sentence = "这是一个用于验证段落切分逻辑的测试句子。";
    const text = Array.from({ length: 30 }, () => sentence).join("");
    const paragraphs = getTextParagraphs(text);

    expect(text.length).toBeGreaterThan(500);
    expect(paragraphs.length).toBeGreaterThan(1);
    expect(paragraphs[0]).toContain("。");
  });

  it("does not drop leading punctuation in wall-of-text splitting", () => {
    const sentence = "...Leading value 3.14 remains. U.S.A. abbreviation stays.";
    const text = Array.from({ length: 20 }, () => sentence).join(" ");
    const paragraphs = getTextParagraphs(text);
    const flattened = paragraphs.join("\n");

    expect(text.length).toBeGreaterThan(500);
    expect(flattened).toContain("...Leading value 3.14 remains.");
    expect(flattened).toContain("U.S.A.");
  });
});
