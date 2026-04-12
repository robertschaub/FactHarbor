/**
 * Prompt frontmatter drift test — PR 3 (Rev B Track 4)
 *
 * Parses the YAML frontmatter of `claimboundary.prompt.md` and asserts that
 * the `requiredSections` list exactly matches the actual `## SECTION_NAME`
 * headings in the file body.
 *
 * Why: the Lead Developer review found `EXPLANATION_RUBRIC` listed in
 * frontmatter while the real section heading was `EXPLANATION_QUALITY_RUBRIC`.
 * Runtime callers used the heading name, so the frontmatter entry was a
 * silent drift that no test caught. This test prevents recurrence.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const promptPath = path.resolve(
  __dirname,
  "../../../../prompts/claimboundary.prompt.md",
);

function parsePromptFile(content: string): {
  frontmatterSections: string[];
  bodySections: string[];
} {
  // Frontmatter is the first --- ... --- block.
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (!fmMatch) {
    throw new Error("Prompt file is missing frontmatter block");
  }
  const frontmatterRaw = fmMatch[1];
  const body = content.slice(fmMatch[0].length);

  // Extract requiredSections list. Walk lines looking for the
  // `requiredSections:` key followed by `  - "NAME"` entries until we hit a
  // top-level key or end-of-frontmatter.
  const lines = frontmatterRaw.split("\n");
  const frontmatterSections: string[] = [];
  let inRequired = false;
  for (const line of lines) {
    if (/^requiredSections\s*:/.test(line)) {
      inRequired = true;
      continue;
    }
    if (inRequired) {
      // List item: `  - "NAME"` or `  - NAME`
      const item = line.match(/^\s*-\s*"?([A-Z][A-Z0-9_]+)"?\s*$/);
      if (item) {
        frontmatterSections.push(item[1]);
        continue;
      }
      // Any non-list line at indent 0 ends the list.
      if (/^[A-Za-z]/.test(line)) {
        inRequired = false;
      }
    }
  }

  // Extract `## SECTION_NAME` headings from the body.
  const bodySections: string[] = [];
  for (const line of body.split("\n")) {
    const m = line.match(/^## ([A-Z][A-Z0-9_]+)\s*$/);
    if (m) bodySections.push(m[1]);
  }

  return { frontmatterSections, bodySections };
}

describe("claimboundary.prompt.md frontmatter ↔ body section drift", () => {
  const promptContent = readFileSync(promptPath, "utf-8");
  const { frontmatterSections, bodySections } = parsePromptFile(promptContent);

  it("frontmatter requiredSections list is non-empty", () => {
    expect(frontmatterSections.length).toBeGreaterThan(0);
  });

  it("body has at least one ## SECTION heading", () => {
    expect(bodySections.length).toBeGreaterThan(0);
  });

  it("every frontmatter requiredSections entry matches a real ## heading in the body", () => {
    const bodySet = new Set(bodySections);
    const missing = frontmatterSections.filter((name) => !bodySet.has(name));
    expect(
      missing,
      `frontmatter lists section(s) that do not exist in the body: ${missing.join(", ")}. ` +
      `Either rename the frontmatter entry to match the actual ## heading, or add the missing section.`,
    ).toEqual([]);
  });

  it("every ## body heading is listed in frontmatter requiredSections", () => {
    const fmSet = new Set(frontmatterSections);
    const missing = bodySections.filter((name) => !fmSet.has(name));
    expect(
      missing,
      `body has section(s) not listed in frontmatter requiredSections: ${missing.join(", ")}. ` +
      `Add them to the requiredSections list, or remove the orphan headings.`,
    ).toEqual([]);
  });

  it("EXPLANATION_QUALITY_RUBRIC alignment regression (PR 3)", () => {
    // Specific guard: the rename direction was frontmatter → match body.
    // This locks in the correct outcome so a future cleanup does not flip
    // the heading instead.
    expect(bodySections).toContain("EXPLANATION_QUALITY_RUBRIC");
    expect(frontmatterSections).toContain("EXPLANATION_QUALITY_RUBRIC");
    expect(frontmatterSections).not.toContain("EXPLANATION_RUBRIC");
  });
});
