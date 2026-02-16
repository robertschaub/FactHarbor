/**
 * Monolithic-Dynamic Prompt File Tests
 *
 * Validates the UCM-managed prompt file for the monolithic-dynamic pipeline:
 * - All required sections exist and are non-empty
 * - Variable substitution works (${currentDate}, ${TEXT_TO_ANALYZE}, ${SOURCE_SUMMARY})
 * - Provider-specific structured output sections have correct content
 * - Section names match what monolithic-dynamic.ts requests at runtime
 *
 * CI-safe: reads from disk only, no LLM or web-search calls.
 *
 * @version 2.6.42
 */

import { describe, it, expect, beforeAll } from "vitest";
import { readFile } from "fs/promises";
import path from "path";

// --------------------------------------------------------------------------
// Helpers — parse the prompt file directly (no DB, no config-loader)
// --------------------------------------------------------------------------

interface ParsedSection {
  name: string;
  content: string;
}

interface ParsedPromptFile {
  frontmatter: Record<string, unknown>;
  sections: ParsedSection[];
}

function parsePromptFile(raw: string): ParsedPromptFile {
  // Normalize line endings
  const content = raw.replace(/\r\n/g, "\n");

  // Extract frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) throw new Error("Could not parse frontmatter");

  // Simple YAML-like parsing for frontmatter (enough for tests)
  const fmLines = fmMatch[1].split("\n");
  const frontmatter: Record<string, unknown> = {};
  let currentArray: string[] | null = null;
  let currentKey: string | null = null;

  for (const line of fmLines) {
    const kvMatch = line.match(/^(\w+):\s*(.*)$/);
    if (kvMatch) {
      if (currentArray && currentKey) {
        frontmatter[currentKey] = currentArray;
        currentArray = null;
        currentKey = null;
      }
      const [, key, value] = kvMatch;
      if (value.trim() === "") {
        // Could be start of array
        currentKey = key;
        currentArray = [];
      } else {
        frontmatter[key] = value.replace(/^"(.*)"$/, "$1");
      }
    } else if (currentArray !== null) {
      const itemMatch = line.match(/^\s+-\s+"?([^"]*)"?\s*$/);
      if (itemMatch) {
        currentArray.push(itemMatch[1]);
      }
    }
  }
  if (currentArray && currentKey) {
    frontmatter[currentKey] = currentArray;
  }

  // Extract sections
  const body = fmMatch[2];
  const sections: ParsedSection[] = [];
  const lines = body.split("\n");
  let currentSection: { name: string; lines: string[] } | null = null;

  for (const line of lines) {
    const headerMatch = line.match(/^## ([A-Z][A-Z0-9_ ]+(?:\([^)]*\))?)\s*$/);
    if (headerMatch) {
      if (currentSection) {
        sections.push({
          name: currentSection.name,
          content: currentSection.lines.join("\n").trim(),
        });
      }
      currentSection = { name: headerMatch[1], lines: [] };
    } else if (currentSection) {
      if (line.trim() !== "---") {
        currentSection.lines.push(line);
      }
    }
  }
  if (currentSection) {
    sections.push({
      name: currentSection.name,
      content: currentSection.lines.join("\n").trim(),
    });
  }

  return { frontmatter, sections };
}

function renderVariables(
  content: string,
  variables: Record<string, string>,
): string {
  let out = content;
  for (const [key, value] of Object.entries(variables)) {
    out = out.replace(new RegExp(`\\$\\{${key}\\}`, "g"), value);
  }
  return out;
}

// --------------------------------------------------------------------------
// Tests
// --------------------------------------------------------------------------

describe("Monolithic-Dynamic Prompt File (UCM)", () => {
  let parsed: ParsedPromptFile;

  beforeAll(async () => {
    const filePath = path.resolve(
      __dirname,
      "../../../../../prompts/monolithic-dynamic.prompt.md",
    );
    const raw = await readFile(filePath, "utf-8");
    parsed = parsePromptFile(raw);
  });

  // ========================================================================
  // Frontmatter
  // ========================================================================

  describe("Frontmatter", () => {
    it("has correct pipeline identifier", () => {
      expect(parsed.frontmatter.pipeline).toBe("monolithic-dynamic");
    });

    it("has a version string", () => {
      expect(parsed.frontmatter.version).toBeTruthy();
      expect(typeof parsed.frontmatter.version).toBe("string");
    });

    it("declares required variables", () => {
      const variables = parsed.frontmatter.variables as string[];
      expect(variables).toContain("currentDate");
      expect(variables).toContain("TEXT_TO_ANALYZE");
      expect(variables).toContain("SOURCE_SUMMARY");
    });

    it("declares all required sections", () => {
      const required = parsed.frontmatter.requiredSections as string[];
      expect(required).toContain("DYNAMIC_PLAN");
      expect(required).toContain("DYNAMIC_ANALYSIS");
      expect(required).toContain("DYNAMIC_ANALYSIS_USER");
      expect(required).toContain("STRUCTURED_OUTPUT_ANTHROPIC");
      expect(required).toContain("STRUCTURED_OUTPUT_OPENAI");
      expect(required).toContain("STRUCTURED_OUTPUT_GOOGLE");
      expect(required).toContain("STRUCTURED_OUTPUT_MISTRAL");
    });
  });

  // ========================================================================
  // Section presence
  // ========================================================================

  describe("Required sections exist and are non-empty", () => {
    const requiredSections = [
      "DYNAMIC_PLAN",
      "DYNAMIC_ANALYSIS",
      "DYNAMIC_ANALYSIS_USER",
      "STRUCTURED_OUTPUT_ANTHROPIC",
      "STRUCTURED_OUTPUT_OPENAI",
      "STRUCTURED_OUTPUT_GOOGLE",
      "STRUCTURED_OUTPUT_MISTRAL",
    ];

    for (const name of requiredSections) {
      it(`section "${name}" exists and has content`, () => {
        const section = parsed.sections.find((s) => s.name === name);
        expect(section, `Section "${name}" not found`).toBeDefined();
        expect(
          section!.content.trim().length,
          `Section "${name}" is empty`,
        ).toBeGreaterThan(20);
      });
    }
  });

  // ========================================================================
  // Variable substitution
  // ========================================================================

  describe("Variable substitution", () => {
    it("DYNAMIC_PLAN uses ${currentDate}", () => {
      const section = parsed.sections.find((s) => s.name === "DYNAMIC_PLAN")!;
      expect(section.content).toContain("${currentDate}");
      const rendered = renderVariables(section.content, {
        currentDate: "2026-02-13",
      });
      expect(rendered).toContain("2026-02-13");
      expect(rendered).not.toContain("${currentDate}");
    });

    it("DYNAMIC_ANALYSIS uses ${currentDate}", () => {
      const section = parsed.sections.find(
        (s) => s.name === "DYNAMIC_ANALYSIS",
      )!;
      expect(section.content).toContain("${currentDate}");
      const rendered = renderVariables(section.content, {
        currentDate: "2026-02-13",
      });
      expect(rendered).toContain("2026-02-13");
      expect(rendered).not.toContain("${currentDate}");
    });

    it("DYNAMIC_ANALYSIS_USER uses ${TEXT_TO_ANALYZE} and ${SOURCE_SUMMARY}", () => {
      const section = parsed.sections.find(
        (s) => s.name === "DYNAMIC_ANALYSIS_USER",
      )!;
      expect(section.content).toContain("${TEXT_TO_ANALYZE}");
      expect(section.content).toContain("${SOURCE_SUMMARY}");
      const rendered = renderVariables(section.content, {
        TEXT_TO_ANALYZE: "Test claim text",
        SOURCE_SUMMARY: "Test source summary",
      });
      expect(rendered).toContain("Test claim text");
      expect(rendered).toContain("Test source summary");
      expect(rendered).not.toContain("${TEXT_TO_ANALYZE}");
      expect(rendered).not.toContain("${SOURCE_SUMMARY}");
    });

    it("STRUCTURED_OUTPUT_* sections have no variables (static content)", () => {
      const outputSections = parsed.sections.filter((s) =>
        s.name.startsWith("STRUCTURED_OUTPUT_"),
      );
      for (const section of outputSections) {
        expect(
          section.content,
          `${section.name} should not contain variable placeholders`,
        ).not.toMatch(/\$\{[^}]+\}/);
      }
    });
  });

  // ========================================================================
  // Provider-specific structured output content
  // ========================================================================

  describe("Structured output sections have provider-appropriate content", () => {
    it("STRUCTURED_OUTPUT_ANTHROPIC mentions Claude-specific guidance", () => {
      const section = parsed.sections.find(
        (s) => s.name === "STRUCTURED_OUTPUT_ANTHROPIC",
      )!;
      expect(section.content.toLowerCase()).toMatch(/claude/);
      expect(section.content).toMatch(/JSON/);
      expect(section.content).toMatch(/empty string/i);
    });

    it("STRUCTURED_OUTPUT_OPENAI mentions GPT-specific guidance", () => {
      const section = parsed.sections.find(
        (s) => s.name === "STRUCTURED_OUTPUT_OPENAI",
      )!;
      expect(section.content.toLowerCase()).toMatch(/gpt/);
      expect(section.content).toMatch(/JSON/);
      expect(section.content).toMatch(/required/i);
    });

    it("STRUCTURED_OUTPUT_GOOGLE mentions Gemini-specific guidance", () => {
      const section = parsed.sections.find(
        (s) => s.name === "STRUCTURED_OUTPUT_GOOGLE",
      )!;
      expect(section.content.toLowerCase()).toMatch(/gemini/);
      expect(section.content).toMatch(/JSON/);
      expect(section.content).toMatch(/length/i);
    });

    it("STRUCTURED_OUTPUT_MISTRAL mentions Mistral-specific guidance", () => {
      const section = parsed.sections.find(
        (s) => s.name === "STRUCTURED_OUTPUT_MISTRAL",
      )!;
      expect(section.content.toLowerCase()).toMatch(/mistral/);
      expect(section.content).toMatch(/JSON/);
      expect(section.content).toMatch(/checklist/i);
    });
  });

  // ========================================================================
  // Section names match runtime lookups
  // ========================================================================

  describe("Section names match monolithic-dynamic.ts runtime lookups", () => {
    // monolithic-dynamic.ts dynamically builds: `STRUCTURED_OUTPUT_${provider.toUpperCase()}`
    // where provider comes from detectProvider() → "anthropic" | "openai" | "google" | "mistral"
    const providers = ["anthropic", "openai", "google", "mistral"] as const;

    for (const provider of providers) {
      it(`STRUCTURED_OUTPUT_${provider.toUpperCase()} is discoverable`, () => {
        const sectionName = `STRUCTURED_OUTPUT_${provider.toUpperCase()}`;
        const section = parsed.sections.find((s) => s.name === sectionName);
        expect(
          section,
          `Section "${sectionName}" must exist for provider "${provider}"`,
        ).toBeDefined();
      });
    }
  });

  // ========================================================================
  // Core analysis prompt quality
  // ========================================================================

  describe("Core analysis prompt content quality", () => {
    it("DYNAMIC_PLAN contains fact-checker role and search query guidance", () => {
      const section = parsed.sections.find(
        (s) => s.name === "DYNAMIC_PLAN",
      )!;
      expect(section.content.toLowerCase()).toMatch(/fact-check/);
      expect(section.content.toLowerCase()).toMatch(/search quer/);
      expect(section.content.toLowerCase()).toMatch(/contradicting/);
    });

    it("DYNAMIC_ANALYSIS contains verdict and evidence guidance", () => {
      const section = parsed.sections.find(
        (s) => s.name === "DYNAMIC_ANALYSIS",
      )!;
      expect(section.content.toLowerCase()).toMatch(/verdict/);
      expect(section.content.toLowerCase()).toMatch(/evidence/);
      expect(section.content.toLowerCase()).toMatch(/rating direction/i);
    });

    it("DYNAMIC_PLAN mentions ClaimBoundary terminology", () => {
      const section = parsed.sections.find(
        (s) => s.name === "DYNAMIC_PLAN",
      )!;
      expect(section.content).toContain("ClaimBoundary");
    });

    it("DYNAMIC_ANALYSIS mentions multi-boundary awareness", () => {
      const section = parsed.sections.find(
        (s) => s.name === "DYNAMIC_ANALYSIS",
      )!;
      expect(section.content).toMatch(/Multi-Boundary/i);
    });
  });
});
